"""Minimal reader/painter for Ragnarok Online client .spr / .act files.

Only what this project needs: index-coloured and RGBA sprite images, per-action
frames of positioned layers, the head attach point the client pins a head to,
and a painter that composites one frame exactly the way the client does.

Format notes (all little-endian):
  .spr  'SP' u16 version u16 indexedCount [u16 rgbaCount if version >= 0x200]
        then per image u16 w, u16 h and either raw indexed bytes or (>= 0x201)
        a u16 byte length followed by RLE runs (0x00 <n> = n transparent pixels).
        256-colour palette (RGB, 3 bytes each) lives in the last 1024 bytes.
        RGBA images follow: u16 w, u16 h, w*h*4 bytes stored ABGR and flipped.
  .act  'AC' u16 version u16 actionCount (10 reserved bytes)
        per action u32 frameCount
        per frame 4 * (4 * i32) ranges, u32 layerCount,
        per layer i32 x, i32 y, i32 sprIndex, u32 mirrored,
        (>=0x200) 4 colour bytes, f32 scaleX, (>=0x204) f32 scaleY,
        i32 rotation, i32 type, (>=0x205) 8 reserved bytes,
        (>=0x200) i32 event id, (>=0x203) i32 anchorCount + anchorCount*16 bytes.
        Tail (>=0x201): i32 soundCount + 40 bytes each; (>=0x202) f32 delay each.

Nothing here redraws or recolours art; it only decodes and composites.
"""
import struct

from PIL import Image


def read_spr(data):
    """Return (indexed_images, rgba_images) as RGBA PIL images."""
    assert data[:2] == b'SP', 'not a .spr file'
    version, count = struct.unpack_from('<HH', data, 2)
    at = 6
    rgba_count = 0
    if version >= 0x200:
        rgba_count = struct.unpack_from('<H', data, at)[0]
        at += 2
    palette = None
    if version >= 0x101:
        tail = data[-1024:]
        palette = [(tail[i * 4], tail[i * 4 + 1], tail[i * 4 + 2]) for i in range(256)]
    images = []
    for _ in range(count):
        w, h = struct.unpack_from('<HH', data, at)
        at += 4
        if version >= 0x201:
            run = struct.unpack_from('<H', data, at)[0]
            at += 2
            end = at + run
            pixels = bytearray()
            while at < end:
                value = data[at]
                at += 1
                if value == 0:
                    run_length = data[at]
                    at += 1
                    pixels.extend(b'\0' * (run_length if run_length else 1))
                else:
                    pixels.append(value)
            pixels = bytes(pixels[:w * h]).ljust(w * h, b'\0')
        else:
            pixels = data[at:at + w * h]
            at += w * h
        image = Image.new('RGBA', (w, h))
        if palette:
            colours = {0: (0, 0, 0, 0)}
            for value in set(pixels):
                if value:
                    colours[value] = palette[value] + (255,)
            image.putdata([colours[value] for value in pixels])
        images.append(image)
    rgba_images = []
    for _ in range(rgba_count):
        w, h = struct.unpack_from('<HH', data, at)
        at += 4
        raw = data[at:at + w * h * 4]
        at += w * h * 4
        image = Image.new('RGBA', (w, h))
        image.putdata([(raw[i * 4 + 3], raw[i * 4 + 2], raw[i * 4 + 1], raw[i * 4]) for i in range(w * h)])
        rgba_images.append(image.transpose(Image.FLIP_TOP_BOTTOM))
    return images, rgba_images


def read_act(data):
    """Return {'version', 'actions': [[{'layers', 'anchors', 'event'}...]], 'delays': [float]}."""
    assert data[:2] == b'AC', 'not a .act file'
    version, count = struct.unpack_from('<HH', data, 2)
    at = 16
    actions = []
    for _ in range(count):
        frames_in_action = struct.unpack_from('<I', data, at)[0]
        at += 4
        frames = []
        for _ in range(frames_in_action):
            at += 32
            layers_in_frame = struct.unpack_from('<I', data, at)[0]
            at += 4
            layers = []
            for _ in range(layers_in_frame):
                x, y, index, mirrored = struct.unpack_from('<iiiI', data, at)
                at += 16
                layer = {'x': x, 'y': y, 'spr': index, 'mirror': bool(mirrored),
                         'sx': 1.0, 'sy': 1.0, 'angle': 0, 'type': 0, 'color': (255, 255, 255, 255)}
                if version >= 0x200:
                    layer['color'] = tuple(data[at:at + 4])
                    at += 4
                    layer['sx'] = struct.unpack_from('<f', data, at)[0]
                    at += 4
                    if version >= 0x204:
                        layer['sy'] = struct.unpack_from('<f', data, at)[0]
                        at += 4
                    else:
                        layer['sy'] = layer['sx']
                    layer['angle'], layer['type'] = struct.unpack_from('<ii', data, at)
                    at += 8
                    if version >= 0x205:
                        at += 8
                layers.append(layer)
            event = -1
            if version >= 0x200:
                event = struct.unpack_from('<i', data, at)[0]
                at += 4
            anchors = []
            if version >= 0x203:
                anchor_count = struct.unpack_from('<i', data, at)[0]
                at += 4
                for _ in range(anchor_count):
                    _, ax, ay, _ = struct.unpack_from('<iiii', data, at)
                    at += 16
                    anchors.append((ax, ay))
            frames.append({'layers': layers, 'anchors': anchors, 'event': event})
        actions.append(frames)
    delays = [4.0] * count
    if version >= 0x201:
        sounds = struct.unpack_from('<i', data, at)[0]
        at += 4 + 40 * sounds
        if version >= 0x202:
            delays = list(struct.unpack_from('<%df' % count, data, at))
    return {'version': version, 'actions': actions, 'delays': delays}


def anchor_of(frame):
    """The client's head attach point for one frame (0, 0 when the file has none)."""
    return frame['anchors'][0] if frame['anchors'] else (0, 0)


def paint(frame, indexed, rgba, size, origin, shift=(0, 0)):
    """Composite one ACT frame. A mirrored layer centres the way the client rounds."""
    canvas = Image.new('RGBA', size)
    for layer in frame['layers']:
        source = rgba if layer['type'] == 1 else indexed
        if layer['spr'] < 0 or layer['spr'] >= len(source):
            continue
        image = source[layer['spr']]
        if layer['mirror']:
            image = image.transpose(Image.FLIP_LEFT_RIGHT)
        if abs(layer['sx'] - 1) > 1e-6 or abs(layer['sy'] - 1) > 1e-6:
            image = image.resize((max(1, round(image.width * abs(layer['sx']))),
                                  max(1, round(image.height * abs(layer['sy'])))), Image.NEAREST)
        if layer['angle']:
            image = image.rotate(-layer['angle'], expand=True, resample=Image.NEAREST)
        half = image.width // 2 if layer['mirror'] else (image.width + 1) // 2
        x = origin[0] + shift[0] + layer['x'] - half
        y = origin[1] + shift[1] + layer['y'] - (image.height + 1) // 2
        canvas.alpha_composite(image, (max(0, x), max(0, y))) if (x >= 0 and y >= 0 and
            x + image.width <= size[0] and y + image.height <= size[1]) else canvas.paste(image, (x, y), image)
    return canvas
