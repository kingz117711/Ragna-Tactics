// Skill flourishes. One archetype per visual idea — ring, arc, beam, rain,
// field — and a table that maps every catalog flourish id onto the archetype and
// colour that reads most like its Ragnarok Online counterpart.
//
// Everything here is pure drawing: the renderer owns the canvas transform, the
// preview tool reuses the same paths, and nothing touches the simulation.

export const FX_COLORS = {
  physical: '#ffe1a3', steel: '#c9e2ff', blade: '#ffd6ab', fire: '#ff8f45',
  ember: '#ffb35c', ice: '#a5dcff', water: '#8ecdff', wind: '#b6e8ff',
  earth: '#d8b783', holy: '#ffefb0', ghost: '#c3a8ff', poison: '#a6e066',
  dark: '#a98cff', blood: '#ff8181', gold: '#ffd264', green: '#9ff08a',
};

// Every flourish id the catalog can use, grouped by the shape it draws.
const BY_ARCHETYPE = {
  ring: ['burst', 'spark', 'impactRing', 'provoke', 'holyNova', 'quake', 'aura', 'hitMark', 'soulBlast', 'ghostBlast', 'spiritOrb', 'bladeDance', 'cartAura'],
  arc: ['slash', 'blade', 'sonicBlow', 'meteorAssault', 'crossImpact', 'rollingCutter', 'tigerKnuckle', 'jointBeat', 'headCrush', 'hammerSmash', 'hammerFall', 'impact', 'spinKick', 'roundhouse', 'guard'],
  thrust: ['pierce', 'spearThrust', 'spearSweep', 'spearBrandish', 'spiralPierce', 'bowlingBash', 'focusedArrow', 'arrowRepel', 'spearRain', 'hundredSpear', 'accelStrike', 'backstab', 'investigate', 'palm', 'tornadoKick', 'rapidShot', 'arrowVulcan', 'triangleShot', 'arrowVolley', 'slingingArrow', 'pistolShot', 'kunai', 'shuriken'],
  bolt: ['bolt', 'lightningBolt', 'jupitel', 'chainLightning', 'spellBreak', 'dispell', 'thunder'],
  boltRain: ['arrowRain', 'arrowStorm', 'rainstorm', 'meteor', 'comet', 'desperado', 'vermilion', 'meteorCross', 'mine', 'landMine', 'claymoreTrap', 'trapBurst', 'feintBomb', 'manhole'],
  beam: ['holyLight', 'judex', 'magnus', 'highSanctuary', 'sanctuary', 'coluceo', 'soulDrain', 'psychicWave', 'soulLink', 'soulBreaker', 'asura', 'gateOfHell', 'deathMark'],
  pillar: ['firePillar', 'fireWall', 'ignitionBreak', 'dragonBreath', 'meltDown', 'bloodSpray', 'napalmVulcan', 'ghostBurst', 'fireBlossom', 'solarWrath', 'holyAura', 'endow', 'arcaneCircle', 'rune', 'runeStrike', 'starMark', 'blessing', 'gloria', 'gospel', 'basilica', 'braverySong', 'idunApple', 'purringHeal', 'soul'], 
  nova: ['frost', 'frostDiver', 'frostNova', 'iceBolt', 'iceWeave', 'diamondDust', 'stormGust', 'cold', 'blizzard'],
  vortex: ['gale', 'tornado', 'windWalk', 'trueSight', 'cartSweep', 'cartTermination', 'spell', 'storm'],
  nova_soft: ['heal', 'highSanctuary', 'potionToss', 'prayer', 'kyrie', 'assumptio', 'devotion', 'chemicalProtection', 'mirrorShield', 'devotionLink'],
  field: ['ankleSnare', 'skidTrap', 'magneticEarth', 'earthDrive', 'venom', 'envenom', 'poison', 'enchantPoison', 'deadlyPoison', 'venomStrike', 'acidSpray', 'acidDemonstration', 'acidBomb', 'grimtooth', 'feint', 'soundWave', 'uglyDance', 'vigourDance', 'sorrowDance', 'tarot', 'gypsyKiss', 'sandThrow', 'raid', 'smoke', 'stripArmor', 'fullStrip', 'shadowCloak', 'concentration', 'focus', 'haste', 'deadlyFocus', 'maximize', 'powerThrust', 'adrenaline', 'berserkAura', 'furyAura', 'chi', 'trifecta', 'chainCombo', 'asuraStrike'],
  shield: ['guard', 'kyrieShield', 'shieldCharge', 'shieldBoomerang', 'smite', 'sacrifice', 'devotionShield'],
  claw: ['beastBite', 'wargStrike', 'falconAssault', 'blitzBeat', 'claw'],
  mote: ['soulBlastMotes', 'motes', 'blessingMotes', 'aspersio', 'lexDivina', 'cheer', 'sparkle'],
};

// id → archetype lookup. Later groups win on collision, and the explicit
// table below resolves the few ids that appear in more than one mood.
const ARCHETYPE_OF = new Map();
for (const [archetype, ids] of Object.entries(BY_ARCHETYPE)) for (const id of ids) if (!ARCHETYPE_OF.has(id)) ARCHETYPE_OF.set(id, archetype);
// Collisions get their most recognisable shape.
const OVERRIDES = {
  guard: 'shield', holyAura: 'nova_soft', aura: 'nova_soft', impact: 'ring',
  spearRain: 'boltRain', fireWall: 'field', cartSweep: 'arc', spell: 'pillar',
  storm: 'boltRain', cold: 'nova', blizzard: 'nova', heal: 'mote',
  sanctuary: 'nova_soft', highSanctuary: 'nova_soft', magnet: 'field',
  shadowCloak: 'field', concentrate: 'ring', focus: 'ring', envenom: 'claw',
  grimtooth: 'claw', venom: 'field', shuriken: 'thrust', bola: 'thrust',
};
for (const [id, archetype] of Object.entries(OVERRIDES)) ARCHETYPE_OF.set(id, archetype);

// Colour groups: the visual family each flourish belongs to.
const COLOR_OF = (() => {
  const map = new Map();
  const group = (color, ids) => { for (const id of ids) if (!map.has(id)) map.set(id, color); };
  group('fire', ['fireBolt', 'fireBall', 'firePillar', 'fireWall', 'ignitionBreak', 'dragonBreath', 'meltDown', 'meteor', 'comet', 'fireBlossom', 'solarWrath', 'endow', 'meteorAssault', 'meteorCross', 'cartCannon', 'emberBurst']);
  group('ice', ['iceBolt', 'frostDiver', 'frostNova', 'stormGust', 'diamondDust', 'iceWeave', 'coldBolt', 'frost']);
  group('wind', ['lightningBolt', 'jupitel', 'chainLightning', 'vermilion', 'windWalk', 'trueSight', 'spellBreak', 'dispell', 'gale', 'tornado']);
  group('holy', ['holyLight', 'grandCross', 'magnus', 'sanctuary', 'highSanctuary', 'judex', 'blessing', 'kyrie', 'gloria', 'devotion', 'gospel', 'assumptio', 'basilica', 'coluceo', 'lexDivina', 'aspersio', 'smite', 'sacrifice', 'shieldBoomerang', 'holyNova', 'holyAura']);
  group('ghost', ['soulStrike', 'soulBlast', 'ghostBlast', 'napalmVulcan', 'psychicWave', 'soulBreaker', 'soulDrain', 'soulLink', 'gateOfHell', 'deathMark', 'arcaneCircle', 'rune', 'runeStrike', 'tarot']);
  group('poison', ['envenom', 'venom', 'grimtooth', 'enchantPoison', 'deadlyPoison', 'acidSpray', 'acidDemonstration', 'acidBomb', 'venomStrike']);
  group('earth', ['earthDrive', 'magneticEarth', 'madoGear', 'cartCannon', 'claymoreTrap', 'landMine', 'ankleSnare', 'skidTrap']);
  group('blood', ['bloodSpray', 'headCrush', 'crossImpact', 'rollingCutter', 'wargStrike']);
  group('green', ['heal', 'sanctuary', 'potionToss', 'purringHeal', 'coluceo', 'idunApple', 'firstAid']);
  group('gold', ['coinStrike', 'starMark', 'gypsyKiss', 'cartTermination', 'maximize', 'adrenaline', 'berserkAura']);
  // Physical flourishes keep the warm weapon palette; support flourishes lean on
  // the same three colours as their RO counterparts (green, cream, gold).
  group('physical', ['slash', 'burst', 'spark', 'provoke', 'impact', 'impactRing', 'hitMark', 'slashArc', 'kiss', 'card', 'shout', 'song', 'note', 'dance', 'bag', 'coin', 'hammer', 'axe', 'mace', 'spear', 'spike']);
  group('steel', ['pierce', 'arrowVolley', 'arrowRain', 'arrowRepel', 'shuriken', 'kunai', 'pistolShot', 'rapidShot', 'desperado', 'mine', 'trapBurst']);
  group('green', ['heal', 'sanctuary', 'potionToss', 'purringHeal', 'coluceo', 'idunApple', 'blessing', 'gloria', 'gospel', 'basilica', 'aspersio', 'firstAid', 'regen']);
  group('gold', ['gloria', 'gospel', 'devotion', 'starMark', 'cartTermination', 'trueSight', 'concentration', 'focus', 'haste', 'maximize', 'berserkAura', 'adrenaline', 'powerThrust']);
  group('holy', ['guard', 'aura', 'kyrie', 'assumptio', 'devotion', 'smite', 'shout', 'cheer']);
  group('wind', ['gale', 'tornado', 'quake', 'wind', 'bolt', 'holy', 'arrowStorm', 'focusedArrow', 'sky']);
  group('physical', ['spearThrust', 'spearSweep', 'spearBrandish', 'spiralPierce', 'bowlingBash', 'jointBeat', 'hundredSpear', 'shieldCharge', 'hammerSmash', 'hammerFall', 'powerThrust', 'cartSweep', 'cartTermination', 'shieldBoomerang', 'smite', 'trifecta', 'chainCombo', 'investigate', 'palm', 'spinKick', 'roundhouse', 'tornadoKick', 'sonicBlow', 'meteorAssault', 'meteorCross', 'crossImpact', 'rollingCutter', 'backstab', 'triangleShot', 'arrowVulcan', 'slingingArrow', 'gypsyKiss', 'holyNova', 'soulBreaker', 'tigerKnuckle', 'beastBite', 'wargStrike', 'pistolShot', 'rapidShot', 'desperado', 'shuriken', 'kunai', 'guard', 'aura', 'spark', 'burst', 'slash', 'pierce']);
  group('steel', ['blitzBeat', 'falconAssault', 'arrowRain', 'arrowRepel', 'mine', 'trapBurst', 'claw', 'feather']);
  group('dark', ['shadowCloak', 'manhole', 'feintBomb', 'asura', 'furyAura', 'ghostBurst', 'soulDrain', 'gateOfHell', 'stripArmor', 'fullStrip', 'raid', 'deathMark']);
  group('earth', ['sandThrow', 'earthDrive', 'magneticEarth', 'summonFlora', 'cartAura', 'chemicalProtection']);
  group('wind', ['soundWave', 'braverySong', 'uglyDance', 'vigourDance', 'rainstorm', 'sorrowDance', 'bladeDance', 'tarot', 'note', 'song']);
  group('green', ['chemicalProtection', 'summonFlora', 'purringHeal', 'idunApple']);
  group('gold', ['braverySong', 'vigourDance', 'tarot', 'gypsyKiss', 'cartAura', 'deadlyFocus', 'accelStrike']);
  group('steel', ['mirrorShield', 'accelStrike']);
  group('ghost', ['totemCall', 'spiritOrb']);
  group('physical', ['spinKick', 'roundhouse', 'tornadoKick', 'counterKick', 'flyingKick']);
  group('fire', ['solarWrath', 'novaKick']);
  group('holy', ['starMark', 'holyNova']);
  group('ghost', ['eske', 'soulCollect']);
  group('green', ['spiritMend', 'silvervine']);
  return map;
})();

export function flourishArchetype(fx) { return ARCHETYPE_OF.get(fx) || 'ring'; }
// The colour-group key for a flourish ('fire', 'holy', 'poison', ...).
export function flourishColor(fx, fallback = 'physical') { return COLOR_OF.get(fx) || fallback; }
// The actual hex to stroke with: group key → palette → safe default.
export function flourishHex(fx, fallback = '#ffe7b4') {
  return FX_COLORS[flourishColor(fx)] || FX_COLORS[fx] || fallback;
}

// ---------------------------------------------------------------------------
// Path helpers. All coordinates are in the renderer's already-squashed ground
// space, so a circle is an ellipse in screen pixels.
// ---------------------------------------------------------------------------
const TAU = Math.PI * 2;
const spikyRing = (ctx, r, spikes, phase, len) => {
  for (let i = 0; i < spikes; i++) {
    const a = phase + i / spikes * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.lineTo(Math.cos(a) * (r + len), Math.sin(a) * (r + len));
    ctx.stroke();
  }
};
const jitter = (seed) => { let h = seed; return () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; }; };

// Every stroke is laid down twice — a wide, dim underlay and the bright core —
// which is what gives RO skill effects their neon-on-fog glow without any
// shadowBlur (far too slow per frame once a raid is casting).
const glowCanvas = ctx => new Proxy({}, {
  get(target, prop) {
    if (prop === 'stroke') return () => {
      const a = ctx.globalAlpha, w = ctx.lineWidth;
      ctx.globalAlpha = Math.min(1, a * 0.32); ctx.lineWidth = w * 3.4; ctx.stroke();
      ctx.globalAlpha = a; ctx.lineWidth = w; ctx.stroke();
    };
    if (prop === 'fill') return () => {
      const a = ctx.globalAlpha;
      ctx.globalAlpha = Math.min(1, a * 0.45); ctx.fill();
      ctx.globalAlpha = a; ctx.fill();
    };
    const value = ctx[prop];
    return typeof value === 'function' ? value.bind(ctx) : value;
  },
  set(target, prop, value) { ctx[prop] = value; return true; },
});

// Draw one flourish. `t` is 0→1 lifetime progress, `grow` the eased radius,
// `r` the current radius in ground units, `alpha` the fade, `s` the zoom scale.
export function traceFlourish(canvas, fx, t, grow, r, alpha, s, color) {
  const ctx = glowCanvas(canvas);
  const archetype = flourishArchetype(fx);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = 2 / s;
  const line = w => { ctx.lineWidth = w / s; };
  // Every flourish opens with a hot core flash so the cast reads instantly even
  // when the outline is busy: a soft disc plus a bright centre.
  const flash = Math.pow(1 - t, 1.6);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 0.28 * flash));
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.62, r * 0.62, 0, 0, TAU); ctx.fill();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 0.75 * flash));
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.18, r * 0.18, 0, 0, TAU); ctx.fill();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  // Line weights follow the radius so a big cast keeps the same visual density.
  const knee = Math.max(1, r / 22);

  if (archetype === 'ring' || archetype === 'nova_soft') {
    line(3 * knee);
    ctx.beginPath(); ctx.ellipse(0, 0, r, r, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha *= 0.6;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.62, r * 0.62, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    line(2);
    spikyRing(ctx, r, archetype === 'nova_soft' ? 6 : 8, grow * 1.6, r * 0.3);
    if (archetype === 'nova_soft') {
      // Soft motes rising out of the ring.
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU + 0.5;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7 - grow * 9, 2.6, 0, TAU); ctx.fill();
      }
    }
    return;
  }
  if (archetype === 'arc') {
    line(3.4 * knee);
    // Two crescent sweeps crossing at the centre read as a weapon arc.
    ctx.beginPath(); ctx.arc(0, 0, r * 0.94, -1.15 + grow * 0.35, 1.15 + grow * 0.35); ctx.stroke();
    ctx.globalAlpha *= 0.75;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.94, Math.PI - 1.15 + grow * 0.35, Math.PI + 1.15 + grow * 0.35); ctx.stroke();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    line(1.8 * knee);
    ctx.beginPath(); ctx.moveTo(-r * 0.92, -r * 0.22); ctx.lineTo(r * 0.92, r * 0.22); ctx.stroke();
    return;
  }
  if (archetype === 'thrust') {
    line(3 * knee);
    // A long spear line with a trailing gash and a leading point.
    const reach = r * (0.7 + grow * 0.5);
    ctx.beginPath(); ctx.moveTo(-reach, 0); ctx.lineTo(reach, 0); ctx.stroke();
    line(2);
    ctx.beginPath(); ctx.moveTo(reach * 0.86, -r * 0.16); ctx.lineTo(reach, 0); ctx.lineTo(reach * 0.86, r * 0.16); ctx.stroke();
    ctx.globalAlpha *= 0.55;
    ctx.beginPath(); ctx.moveTo(-reach * 1.1, -r * 0.1); ctx.lineTo(reach * 0.7, -r * 0.1); ctx.stroke();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.beginPath(); ctx.arc(reach, 0, 3.2, 0, TAU); ctx.fill();
    return;
  }
  if (archetype === 'bolt') {
    line(3 * knee);
    // A forked bolt dropping from above the target, plus a ground ring.
    ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 1.75);
    for (let i = 0; i < 5; i++) {
      const x = (i % 2 ? 1 : -1) * r * (0.42 + (i % 3) * 0.08);
      ctx.lineTo(x, -r * 1.75 + (i + 1) * r * 0.35);
    }
    ctx.lineTo(0, 0); ctx.stroke();
    ctx.globalAlpha *= 0.7;
    ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 1.1); ctx.lineTo(-r * 0.9, -r * 0.4); ctx.stroke();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.55, r * 0.55, 0, 0, TAU); ctx.stroke();
    return;
  }
  if (archetype === 'boltRain') {
    line(2.6 * knee);
    // Streaks falling into a ring; the fall depth is driven by the lifetime.
    const streak = r * 0.9;
    for (let i = 0; i < 9; i++) {
      const seed = i * 97 + 13, rnd = jitter(seed);
      const a = rnd() * TAU, d = r * (0.25 + rnd() * 0.8);
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      const drop = (rnd() * 0.5 + 0.5) * (1 - t) * streak;
      ctx.beginPath(); ctx.moveTo(x, y - drop - streak * 0.5); ctx.lineTo(x, y - drop); ctx.stroke();
    }
    ctx.globalAlpha *= 0.7;
    ctx.beginPath(); ctx.ellipse(0, 0, r, r, 0, 0, TAU); ctx.stroke();
    return;
  }
  if (archetype === 'beam') {
    line(3.2 * knee);
    // A vertical shaft of light with a halo where it lands.
    ctx.beginPath(); ctx.moveTo(0, -r * 2.4); ctx.lineTo(0, r * 0.1); ctx.stroke();
    ctx.globalAlpha *= 0.5;
    line(7 * knee);
    ctx.beginPath(); ctx.moveTo(0, -r * 2.1); ctx.lineTo(0, 0); ctx.stroke();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    line(2);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.85, r * 0.85, 0, 0, TAU); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU + grow;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95 + 1); ctx.lineTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * 1.25 + 1); ctx.stroke();
    }
    return;
  }
  if (archetype === 'pillar') {
    line(2.6 * knee);
    // Ring of flame/energy with tongues licking upward.
    ctx.beginPath(); ctx.ellipse(0, 0, r, r, 0, 0, TAU); ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU + 0.3;
      const x = Math.cos(a) * r * 0.8, y = Math.sin(a) * r * 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x * 1.1, y - r * 0.35, x * 0.7, y - r * (0.55 + grow * 0.4));
      ctx.stroke();
    }
    ctx.globalAlpha *= 0.55;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.5, r * 0.5, 0, 0, TAU); ctx.fill();
    return;
  }
  if (archetype === 'nova') {
    line(2.8 * knee);
    // A crystal burst: a ring of six shards flying outward.
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.55, r * 0.55, 0, 0, TAU); ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU - Math.PI / 2;
      const inner = r * (0.55 + grow * 0.5), outer = inner + r * 0.36;
      const cx = Math.cos(a), sy = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(cx * inner, sy * inner);
      ctx.lineTo(cx * outer - sy * r * 0.1, sy * outer + cx * r * 0.1);
      ctx.lineTo(cx * (outer + r * 0.16), sy * (outer + r * 0.16));
      ctx.lineTo(cx * outer + sy * r * 0.1, sy * outer - cx * r * 0.1);
      ctx.closePath(); ctx.stroke();
    }
    return;
  }
  if (archetype === 'vortex') {
    line(2.8 * knee);
    // Off-radius spirals so the rotation is unmistakable.
    for (let i = 0; i < 3; i++) {
      const rad = r * (0.42 + i * 0.32);
      ctx.beginPath(); ctx.arc(0, 0, rad, i * 1.9 + grow * 2.4, i * 1.9 + 2.7 + grow * 2.4); ctx.stroke();
    }
    line(1.8 * knee);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.22, -r * 1.05); ctx.stroke();
    return;
  }
  if (archetype === 'field') {
    line(2.2 * knee);
    // A dashed ground circle with a cross-hatch: traps and standing effects.
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TAU;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 0.95, 0, a, a + 0.32); ctx.stroke();
    }
    ctx.globalAlpha *= 0.5;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.45, r * 0.45, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.6); ctx.lineTo(r * 0.6, r * 0.6); ctx.stroke();
    return;
  }
  if (archetype === 'shield') {
    line(3 * knee);
    // Shield outline: flat top, tapered point, with a centre boss.
    ctx.beginPath();
    ctx.moveTo(-r * 0.66, -r * 0.72); ctx.lineTo(r * 0.66, -r * 0.72); ctx.lineTo(r * 0.66, r * 0.1);
    ctx.lineTo(0, r * 0.96); ctx.lineTo(-r * 0.66, r * 0.1); ctx.closePath(); ctx.stroke();
    ctx.globalAlpha *= 0.6;
    ctx.beginPath(); ctx.ellipse(0, -r * 0.1, r * 0.28, r * 0.28, 0, 0, TAU); ctx.fill();
    return;
  }
  if (archetype === 'claw') {
    line(3 * knee);
    // Three parallel gashes sweeping across the target.
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, -r * 0.55 + i * r * 0.42);
      ctx.quadraticCurveTo(0, -r * 0.15 + i * r * 0.42 + grow * r * 0.15, r * 0.85, -r * 0.75 + i * r * 0.42);
      ctx.stroke();
    }
    return;
  }
  if (archetype === 'mote') {
    line(2.4 * knee);
    // Rising motes over a soft disc.
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.7, r * 0.7, 0, 0, TAU); ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU + 0.4;
      const rise = grow * 14;
      ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55 - rise, 2.8, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha *= 0.55;
    ctx.beginPath(); ctx.moveTo(0, -r * 1.15); ctx.lineTo(0, -r * 0.45); ctx.stroke();
    return;
  }
  // Unknown ids still read as a deliberate burst rather than nothing.
  line(2.6 * knee);
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.8, r * 0.8, 0, 0, TAU); ctx.stroke();
  ctx.globalAlpha *= 0.6;
  spikyRing(ctx, r * 0.8, 6, grow, r * 0.25);
}
