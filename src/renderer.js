import { MAPS, MONSTERS } from './data.js';
import { stats } from './sim.js';
export const project = (x, y) => ({ x: (x - y) * 22, y: (x + y) * 11 });
export const unproject = (x, y) => ({ x: (x / 22 + y / 11) / 2, y: (y / 11 - x / 22) / 2 });
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
function polygon(ctx, points, fill, stroke) {
  ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
function ellipse(ctx, x, y, rx, ry, color, stroke) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (color) { ctx.fillStyle = color; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
function skillFx(ctx, x, y, effect, age) {
  const palette = effect.element === 'fire' ? ['#ffb458','#f06248'] : effect.element === 'water' ? ['#a9eaff','#4ea4e7'] :
    effect.element === 'wind' ? ['#d9f4a3','#77d3c0'] : effect.element === 'holy' ? ['#fff1b0','#f4d67d'] :
    effect.fx.includes('heal') || effect.fx === 'partyHeal' ? ['#d6f5b2','#8edca7'] :
    effect.fx.includes('poison') || effect.fx === 'venom' ? ['#b5ef79','#609d62'] : ['#f8dc9a','#dfa867'];
  const pulse = 1 - Math.min(1, age);
  const radius = 14 + age * 42;
  ctx.save(); ctx.translate(x, y - 6); ctx.globalAlpha = pulse * 0.84; ctx.lineWidth = 1.6;
  ctx.strokeStyle = palette[0]; ctx.fillStyle = palette[1];
  if (['area','areaControl','areaHoly','partyHeal'].includes(effect.fx)) {
    ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.42, radius * 0.72, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, radius * 0.86, radius * 0.44, 0, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 6; i++) { const a = Math.PI * 2 * i / 6 + age * 1.2; ellipse(ctx, Math.cos(a) * radius, Math.sin(a) * radius * 0.5, 2.2, 1.6, palette[i % 2]); }
  } else if (['heal','guard','buffAtk','buffDef','buffTempo'].includes(effect.fx)) {
    ellipse(ctx, 0, 0, 10 + age * 13, 5 + age * 7, null, palette[0]);
    ctx.fillRect(-2, -10 - age * 4, 4, 18 + age * 8); ctx.fillRect(-8 - age * 4, -2, 16 + age * 8, 4);
  } else if (['poison','venom'].includes(effect.fx)) {
    for (let i = 0; i < 5; i++) { const a = age * 4 + i * Math.PI * 0.4; ellipse(ctx, Math.cos(a) * (5 + i * 2), -8 - i * 3 + Math.sin(a) * 4, 2 + i * 0.4, 2.8 + i * 0.4, palette[i % 2]); }
  } else if (effect.fx === 'falcon' || effect.fx === 'summon') {
    ctx.beginPath(); ctx.moveTo(-radius, -radius * .25); ctx.quadraticCurveTo(-radius * .25, -radius * .9, 0, 0); ctx.quadraticCurveTo(radius * .25, -radius * .9, radius, -radius * .25); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, radius * .36, Math.PI, Math.PI * 2); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(-radius, -radius * .28); ctx.lineTo(radius, radius * .12); ctx.moveTo(-radius * .55, radius * .34); ctx.lineTo(radius * .65, -radius * .36); ctx.stroke();
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + age * 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5); ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius * .5); ctx.stroke(); }
  }
  ctx.restore();
}
export class Renderer {
  constructor(canvas, sprites) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.sprites = sprites;
    this.camera = { x: 0, y: 0, zoom: 0.8 }; this.mapId = 'meadow'; this.terrain = new Map(); this.hits = []; this.animations = new Map();
    this.width = 1000; this.height = 650; this.followId = null; this.grid = false;
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(canvas);
  }
  resize() {
    const r = this.canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    this.width = r.width; this.height = r.height; this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr);
    this.dpr = dpr;
    if (!this.initialized && r.width > 0) { this.fit(); this.initialized = true; }
  }
  fit() { this.camera = { x: 0, y: 0, zoom: clamp(Math.min(this.width / 1510, (this.height - 100) / 800), 0.35, 1.15) }; this.followId = null; }
  screen(p) { const q = project(p.x, p.y); return { x: this.width / 2 + (q.x - this.camera.x) * this.camera.zoom, y: this.height / 2 + 20 + (q.y - this.camera.y) * this.camera.zoom }; }
  world(x, y) { return unproject((x - this.width / 2) / this.camera.zoom + this.camera.x, (y - this.height / 2 - 20) / this.camera.zoom + this.camera.y); }
  zoom(delta, x = this.width / 2, y = this.height / 2) {
    const before = this.world(x, y); this.camera.zoom = clamp(this.camera.zoom * delta, 0.35, 1.8);
    const after = this.world(x, y), a = project(before.x, before.y), b = project(after.x, after.y);
    this.camera.x += a.x - b.x; this.camera.y += a.y - b.y;
  }
  pan(dx, dy) { this.followId = null; this.camera.x = clamp(this.camera.x - dx / this.camera.zoom, -700, 700); this.camera.y = clamp(this.camera.y - dy / this.camera.zoom, -450, 450); }
  hit(x, y) { return [...this.hits].reverse().find(h => Math.hypot(x - h.x, (y - h.y) * 0.8) < h.radius); }
  background(mapId) {
    if (this.terrain.has(mapId)) return this.terrain.get(mapId);
    const cv = document.createElement('canvas'); cv.width = 1800; cv.height = 1100;
    const ctx = cv.getContext('2d'); ctx.translate(900, 550);
    let seed = mapId === 'meadow' ? 182 : mapId === 'forest' ? 492 : 739;
    const rng = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const cave = mapId === 'payon', arena = mapId === 'arena', forest = mapId === 'forest', dunes = ['morroc', 'lair'].includes(mapId);
    const boundary = [project(-16, -16), project(16, -16), project(16, 16), project(-16, 16)];
    polygon(ctx, boundary.map(p => ({ x: p.x, y: p.y + 18 })), '#182e28');
    polygon(ctx, boundary, cave ? '#504859' : dunes ? '#be9967' : arena ? '#555b5a' : forest ? '#436352' : '#6b8959', '#8aa47855');
    ctx.save(); ctx.beginPath(); boundary.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.clip();
    for (let i = 0; i < 7500; i++) {
      const x = (rng() - 0.5) * 32, y = (rng() - 0.5) * 32, p = project(x, y), r = rng();
      ctx.globalAlpha = 0.06 + rng() * 0.12;
      ellipse(ctx, p.x, p.y, 4 + rng() * 19, 2 + rng() * 9, cave ? (r > 0.5 ? '#92809a' : '#25222e') : arena ? (r > 0.5 ? '#bbc0ae' : '#1b2532') : (r > 0.5 ? '#c3d58e' : '#203e32'));
    }
    ctx.globalAlpha = 1;
    // A walkable, decorative road. Terrain has no hidden collision in this milestone.
    const road = [-17, -12, -5, 3, 10, 17].map((y, i) => project(Math.sin(i * 0.8) * 3, y));
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [width, color] of [[102, '#263e2830'], [74, cave ? '#655d71' : arena ? '#707272' : forest ? '#8d9271' : '#b7b18a'], [55, cave ? '#797180' : arena ? '#7d7e77' : forest ? '#9da07d' : '#c4bd96']]) {
      ctx.beginPath(); road.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
    }
    for (let i = 0; i < 1000; i++) {
      const x = (rng() - 0.5) * 31, y = (rng() - 0.5) * 31, p = project(x, y);
      if (Math.abs(x) < 3.5) continue;
      if (dunes || cave) {
        ctx.lineWidth = cave ? 1.5 : 2; ctx.strokeStyle = cave ? '#aca5bb44' : '#e2bb8455'; ctx.beginPath(); ctx.moveTo(p.x - 6, p.y);
        ctx.quadraticCurveTo(p.x, p.y - 3, p.x + 9, p.y); ctx.stroke();
      } else if (arena) {
        ctx.fillStyle = '#a1a69a45'; ctx.fillRect(p.x, p.y, 3 + rng() * 7, 1 + rng() * 3);
      } else {
        ctx.strokeStyle = rng() > 0.4 ? '#b7ca8160' : '#254e3590'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x - 3, p.y); ctx.lineTo(p.x - 5, p.y - 5); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 1, p.y - 7); ctx.moveTo(p.x + 3, p.y); ctx.lineTo(p.x + 6, p.y - 3); ctx.stroke();
        if (rng() > 0.91) ellipse(ctx, p.x, p.y - 3, 2.5, 1.7, rng() > 0.5 ? '#ebdab0' : '#c8a7b3');
      }
    }
    if (cave) {
      const mouth = project(-3,-13);
      ellipse(ctx,mouth.x,mouth.y,50,26,'#61566b'); ellipse(ctx,mouth.x,mouth.y+2,32,17,'#262531');
      for (const [x,y] of [[-4,-11],[5,-4],[-4,4],[5,12]]) {
        const p = project(x,y), glow = ctx.createRadialGradient(p.x,p.y,1,p.x,p.y,65);
        glow.addColorStop(0,'#ffc87380'); glow.addColorStop(1,'#ffc87300');
        ellipse(ctx,p.x,p.y,65,34,glow); ellipse(ctx,p.x,p.y-4,4,6,'#f7c56c');
      }
    }
    if (mapId === 'lair') {
      for (let i = 6; i > 0; i--) {
        const radius = 34 + i * 32;
        ellipse(ctx, 0, 6, radius, radius / 2, i % 2 ? '#956e49' : '#a57d54', '#c49464');
      }
      ellipse(ctx, 0, 6, 54, 27, '#78573c');
    }
    if (arena) {
      ellipse(ctx, 0, 0, 210, 105, '#5e6268', '#a1a0a066'); ellipse(ctx, 0, 0, 184, 92, null, '#b4a57c77');
      for (let i = 0; i < 12; i++) {
        const angle = i / 12 * Math.PI * 2, x = Math.cos(angle) * 188, y = Math.sin(angle) * 94;
        ctx.fillStyle = '#b1aa8955'; ctx.fillRect(x - 4, y - 2, 8, 4);
      }
    }
    ctx.restore(); ctx.lineWidth = 1;
    // Perimeter scenery stays outside the playable boundary.
    for (let i = 0; i < 80; i++) {
      const edge = i % 4, t = rng() * 33 - 16.5, p = project(edge < 2 ? (edge ? 16.8 : -16.8) : t, edge < 2 ? t : (edge === 2 ? -16.8 : 16.8));
      if (dunes || cave) {
        const h = 8 + rng() * 24;
        polygon(ctx, [{x:p.x-h,y:p.y},{x:p.x-3,y:p.y-h},{x:p.x+h,y:p.y-3},{x:p.x+8,y:p.y+4}], cave ? '#484254' : '#946d50', cave ? '#756981' : '#ab8161');
      } else if (arena) {
        const h = 12 + rng() * 36;
        polygon(ctx, [{ x: p.x - 8, y: p.y }, { x: p.x - 8, y: p.y - h }, { x: p.x + 4, y: p.y - h - 4 }, { x: p.x + 12, y: p.y - h }, { x: p.x + 12, y: p.y - 2 }], '#767d75', '#a6ac8c30');
      } else {
        const h = 30 + rng() * (forest ? 70 : 45);
        ellipse(ctx, p.x + 8, p.y + 2, h * 0.7, h * 0.25, '#1a332751');
        ctx.fillStyle = '#625c43'; ctx.fillRect(p.x - 3, p.y - h * 0.55, 7, h * 0.55);
        ellipse(ctx, p.x, p.y - h * 0.65, h * 0.48, h * 0.44, forest ? '#284b3e' : '#3e6443');
        ellipse(ctx, p.x - h * 0.15, p.y - h * 0.85, h * 0.35, h * 0.3, forest ? '#3c614c' : '#577e4e');
        ellipse(ctx, p.x - h * 0.22, p.y - h * 0.95, h * 0.2, h * 0.15, forest ? '#5a7954' : '#7c9b60');
      }
    }
    this.terrain.set(mapId, cv); return cv;
  }
  draw(s, selected, hovered, frameRemainder = 0, huntPreview = null) {
    const ctx = this.ctx, z = this.camera.zoom, map = s.maps[this.mapId];
    if (this.followId) { const c = s.characters.find(c => c.id === this.followId && c.mapId === this.mapId); if (c) { const p = project(c.x, c.y); this.camera.x += (p.x - this.camera.x) * 0.08; this.camera.y += (p.y - this.camera.y) * 0.08; } }
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const bg = ctx.createRadialGradient(this.width / 2, this.height / 2, 30, this.width / 2, this.height / 2, this.width * 0.75);
    bg.addColorStop(0, this.mapId === 'arena' ? '#253039' : '#233b32'); bg.addColorStop(1, '#101f22');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, this.width, this.height);
    ctx.save(); ctx.translate(this.width / 2 - this.camera.x * z, this.height / 2 + 20 - this.camera.y * z); ctx.scale(z, z);
    ctx.drawImage(this.background(this.mapId), -900, -550);
    if (this.grid) {
      ctx.strokeStyle = '#e7efd318'; ctx.lineWidth = 1 / z;
      for (let i = -16; i <= 16; i += 2) for (const points of [[project(i, -16), project(i, 16)], [project(-16, i), project(16, i)]]) { ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y); ctx.lineTo(points[1].x, points[1].y); ctx.stroke(); }
    }
    for (const c of s.characters.filter(c => c.mapId === this.mapId && selected.has(c.id))) {
      const p = project(c.x, c.y);
      if (c.farmRadius && c.order === 'farm') {
        const h = project(c.home.x, c.home.y);
        ellipse(ctx, h.x, h.y, c.farmRadius * Math.SQRT2 * 22, c.farmRadius * Math.SQRT2 * 11, '#bfdfa212', '#d3e6b394');
      }
      if (c.destination) { const t = project(c.destination.x, c.destination.y); ctx.setLineDash([5, 7]); ctx.strokeStyle = '#e8ca88aa'; ctx.lineWidth = 1.5 / z; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(t.x, t.y); ctx.stroke(); ctx.setLineDash([]); ellipse(ctx, t.x, t.y, 13, 6, '#e8ca8830', '#e8ca88'); }
      if (c.order === 'hold') { const h = project(c.home.x, c.home.y); ellipse(ctx, h.x, h.y, 95, 47, '#e8ca8808', '#e8ca8860'); }
    }
    if (huntPreview && Math.abs(huntPreview.x) <= 15 && Math.abs(huntPreview.y) <= 15) {
      const h = project(huntPreview.x, huntPreview.y), radius = huntPreview.radius * Math.SQRT2;
      ctx.save(); ctx.lineWidth = 1.5 / z; ctx.setLineDash([6 / z, 4 / z]);
      ellipse(ctx, h.x, h.y, radius * 22, radius * 11, '#efd38c18', '#ffdf92');
      ctx.restore();
    }
    const telegraph = map.telegraph;
    if (telegraph) {
      const p = project(telegraph.x, telegraph.y), pulse = 0.24 + Math.sin(s.time * 10) * 0.08;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(22 * Math.SQRT2, 11 * Math.SQRT2);
      ctx.beginPath();
      ctx.arc(0, 0, telegraph.radius, 0, Math.PI * 2);
      if (telegraph.innerRadius) {
        ctx.moveTo(telegraph.innerRadius, 0);
        ctx.arc(0, 0, telegraph.innerRadius, 0, Math.PI * 2, true);
      }
      ctx.fillStyle = telegraph.markedId ? 'rgba(111,205,224,.35)' : `rgba(246,96,78,${pulse + 0.12})`;
      ctx.fill('evenodd');
      ctx.lineWidth = 0.1 / z;
      ctx.strokeStyle = telegraph.markedId ? '#c5f6ff' : '#ffd3ab';
      ctx.stroke();
      ctx.restore();
    }
    const heroes = s.characters.filter(c => c.mapId === this.mapId && c.hp > 0);
    const entities = [...heroes.map(c => ({ unit: c, hero: true })), ...map.monsters.filter(m => m.hp > 0).map(m => ({ unit: m, hero: false }))];
    entities.sort((a, b) => a.unit.x + a.unit.y - b.unit.x - b.unit.y);
    this.hits = [];
    for (const { unit: c, hero } of entities) {
      const p = project(c.x, c.y), screen = this.screen(c), isSelected = hero && selected.has(c.id);
      ctx.save(); ctx.translate(p.x, p.y);
      ellipse(ctx, 0, 1, hero ? 18 : (!hero && MAPS[this.mapId].boss && c.kind === MAPS[this.mapId].monster) ? 48 : 18, hero ? 8 : (!hero && MAPS[this.mapId].boss && c.kind === MAPS[this.mapId].monster) ? 20 : 8, '#0c201e45');
      if (isSelected || hovered === c.id) { ctx.lineWidth = 2 / z; ellipse(ctx, 0, 0, hero ? 23 : 28, hero ? 10 : 12, isSelected ? '#e4cc8720' : '#e9866f18', hero ? '#edd79b' : '#e9866f'); }
      const route = c.stance + c.direction, previous = this.animations.get(c.id);
      if (!previous || previous.route !== route) this.animations.set(c.id, { route, started: s.time });
      const ms = Math.max(0, s.time + frameRemainder - this.animations.get(c.id).started) * 1000;
      if (hero) this.sprites.hero(ctx, c, ms); else this.sprites.monster(ctx, c, ms);
      const barY = hero ? -80 : (!hero && MAPS[this.mapId].boss && c.kind === MAPS[this.mapId].monster) ? -115 : c.kind === 'willow' ? -83 : -44;
      if (hero || hovered === c.id || c.hp < MONSTERS[c.kind].hp) {
        const width = hero ? 43 : (!hero && MAPS[this.mapId].boss && c.kind === MAPS[this.mapId].monster) ? 82 : 36;
        ctx.fillStyle = '#132525'; ctx.fillRect(-width / 2 - 1, barY - 1, width + 2, 6);
        ctx.fillStyle = hero ? '#afc790' : '#d48b77'; ctx.fillRect(-width / 2, barY, width * Math.max(0, c.hp / (hero ? stats(c).hp : MONSTERS[c.kind].hp)), 4);
      }
      if (hero || hovered === c.id) {
        ctx.font = `${11 / Math.max(z, 0.65)}px 'Segoe UI', sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = hero ? '#fff4d7' : '#ead3bd'; ctx.shadowColor = '#102421'; ctx.shadowBlur = 5; ctx.fillText(hero ? c.name : MONSTERS[c.kind].name, 0, barY - 7); ctx.shadowBlur = 0;
        if (hero && c.partyId) { ctx.fillStyle = '#e0c48b'; ctx.fillRect(-3, 10, 6, 3); }
      }
      ctx.restore();
      this.hits.push({ id: c.id, hero, x: screen.x, y: screen.y - (hero ? 25 : 15) * z, radius: Math.max(14, (hero ? 28 : (!hero && MAPS[this.mapId].boss && c.kind === MAPS[this.mapId].monster) ? 65 : 25) * z) });
    }
    for (const e of s.effects) {
      if (e.mapId && e.mapId !== this.mapId) continue;
      const p = project(e.x, e.y);
      if (e.fx) skillFx(ctx, p.x, p.y, e, (1.1 - e.life) / 1.1);
      ctx.save(); ctx.globalAlpha = Math.min(1, e.life * 2); ctx.font = `600 ${e.kind === 'skill' ? 12 : 15}px 'Segoe UI', sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = e.kind === 'heal' ? '#c8e9a5' : e.kind === 'loot' ? '#f2d38d' : e.kind === 'danger' ? '#ff9b86' : '#fff0c7';
      ctx.shadowColor = '#102421'; ctx.shadowBlur = 4; ctx.fillText(e.text, p.x, p.y - 50 - (1.1 - e.life) * 28); ctx.restore();
    }
    ctx.restore();
  }
}
