// Ragnarok-style skill catalog. Every row is authored for the job that learns it
// in Ragnarok Online; availability walks the job ancestry, so a Lord Knight can
// train Swordsman, Knight and Lord Knight skills. Ranks unlock at job levels and
// most skills list their real RO prerequisites.
//
// `shape` is the combat behaviour the simulation runs:
//   strike  one target            area    cluster around a point
//   heal    wounded allies        buff    party-wide buff
//   summon  timed companion       ground  placed field effect
//   passive flat stat bonus
// `fx` is the visual: see FX_LIBRARY in renderer.js. Builds group the skills a
// player would actually combine (Sniper: trap / auto-attack / falcon).
import { defineSkill } from './skillcore.js';

const raw = {
  // ==========================================================================
  // First jobs
  // ==========================================================================
  // Novice
  basic_skill: defineSkill('basic_skill', { name: 'Basic Skill', job: 'novice', maxRank: 9, unlock: [1, 2, 3, 4, 5, 6, 7, 8, 9], shape: 'passive', passive: { hit: 0.002, skill: 1 }, icon: 'book', desc: 'Everyday guildcraft: a steadier hand with every weapon.' }),
  first_aid: defineSkill('first_aid', { name: 'First Aid', job: 'novice', maxRank: 1, sp: 5, cd: 8, shape: 'heal', power: 30, radius: 0.1, fx: 'heal', icon: 'heal', desc: 'Restore your own HP with field dressings.' }),
  novice_sword: defineSkill('novice_sword', { name: 'Novice Swordplay', job: 'novice', maxRank: 5, unlock: [2, 5, 8, 11, 14], sp: 8, cd: 5, power: 1.4, powerPer: 0.14, shape: 'strike', fx: 'slash', icon: 'sword', desc: 'The first swing every adventurer learns.' }),
  novice_guard: defineSkill('novice_guard', { name: 'Novice Guard', job: 'novice', maxRank: 5, unlock: [3, 6, 9, 12, 15], sp: 6, cd: 10, shape: 'buff', power: 0.04, powerPer: 0.006, radius: 2.5, fx: 'guard', icon: 'shield', desc: 'A steady stance that turns aside a blow.' }),
  play_dead: defineSkill('play_dead', { name: 'Play Dead', job: 'novice', maxRank: 1, sp: 5, cd: 20, shape: 'buff', fx: 'aura', icon: 'skull', desc: 'Feign death so monsters lose interest.' }),

  // Swordsman
  sword_mastery: defineSkill('sword_mastery', { name: 'Sword Mastery', job: 'swordsman', maxRank: 10, unlock: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18], shape: 'passive', passive: { atk: 3 }, icon: 'sword', desc: 'Sharpen every sword you swing.' }),
  bash: defineSkill('bash', { name: 'Bash', job: 'swordsman', maxRank: 10, unlock: [1, 2, 3, 4, 5, 6, 8, 10, 12, 14], sp: 8, spPer: 0.5, cd: 3.5, power: 1.5, powerPer: 0.15, shape: 'strike', fx: 'slash', icon: 'bash', desc: 'A heavy two-handed blow that staggers the target.' }),
  magnum_break: defineSkill('magnum_break', { name: 'Magnum Break', job: 'swordsman', maxRank: 10, unlock: [5, 7, 9, 11, 13, 15, 17, 19, 21, 23], prereq: [['bash', 1]], sp: 12, spPer: 1, cd: 6, power: 1.2, powerPer: 0.1, shape: 'area', radius: 2.8, element: 'fire', status: 'burning', statusTime: 3, fx: 'firePillar', icon: 'fire', desc: 'Wrap yourself in fire and scorch everything around you.' }),
  provoke: defineSkill('provoke', { name: 'Provoke', job: 'swordsman', maxRank: 10, unlock: [3, 5, 7, 9, 11, 13, 15, 17, 19, 21], prereq: [['bash', 1]], sp: 6, cd: 7, shape: 'taunt', radius: 5, fx: 'provoke', icon: 'shout', desc: 'Enrage a foe into attacking you instead of your party.' }),
  sm_bash_guard: defineSkill('sm_bash_guard', { name: 'Weapon Block', job: 'swordsman', maxRank: 5, unlock: [6, 10, 14, 18, 22], sp: 8, cd: 12, shape: 'buff', power: 0.05, powerPer: 0.008, radius: 3, fx: 'guard', icon: 'shield', desc: 'Turn a blow aside and answer it.' }),
  endure: defineSkill('endure', { name: 'Endure', job: 'swordsman', maxRank: 10, unlock: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], prereq: [['provoke', 5]], sp: 8, cd: 14, shape: 'buff', power: 0.05, powerPer: 0.005, radius: 3.5, fx: 'guard', icon: 'shield', desc: 'Brace the party: incoming hits stop flinching them.' }),

  // Mage
  increase_sp_recovery: defineSkill('increase_sp_recovery', { name: 'Increase SP Recovery', job: 'mage', maxRank: 10, unlock: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], shape: 'passive', passive: { sp: 6, regen: 0.02 }, icon: 'sp', desc: 'Meditation that keeps your SP flowing.' }),
  fire_bolt: defineSkill('fire_bolt', { name: 'Fire Bolt', job: 'mage', maxRank: 10, unlock: [1, 2, 3, 4, 5, 6, 8, 10, 12, 14], sp: 12, spPer: 1, cd: 4.5, power: 1.6, powerPer: 0.18, hits: 3, shape: 'strike', element: 'fire', status: 'burning', statusTime: 3, fx: 'fireBolt', icon: 'fireBolt', desc: 'Hurl a fan of burning bolts. Extra ranks add hits.' }),
  cold_bolt: defineSkill('cold_bolt', { name: 'Cold Bolt', job: 'mage', maxRank: 10, unlock: [1, 2, 3, 4, 5, 6, 8, 10, 12, 14], sp: 12, spPer: 1, cd: 4.5, power: 1.6, powerPer: 0.18, hits: 3, shape: 'strike', element: 'water', status: 'slow', statusTime: 3, fx: 'iceBolt', icon: 'iceBolt', desc: 'Spin up shards of ice that slow the target.' }),
  lightning_bolt: defineSkill('lightning_bolt', { name: 'Lightning Bolt', job: 'mage', maxRank: 10, unlock: [1, 2, 3, 4, 5, 6, 8, 10, 12, 14], sp: 12, spPer: 1, cd: 4.5, power: 1.6, powerPer: 0.18, hits: 3, shape: 'strike', element: 'wind', status: 'stun', statusTime: 1.2, fx: 'lightningBolt', icon: 'bolt', desc: 'Call lightning down on a single foe.' }),
  napalm_beat: defineSkill('napalm_beat', { name: 'Napalm Beat', job: 'mage', maxRank: 10, unlock: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], prereq: [['increase_sp_recovery', 1]], sp: 9, spPer: 0.5, cd: 3, power: 1.1, powerPer: 0.08, shape: 'strike', element: 'ghost', fx: 'ghostBlast', icon: 'skull', desc: 'A ghastly pulse that ignores armour.' }),
  soul_strike: defineSkill('soul_strike', { name: 'Soul Strike', job: 'mage', maxRank: 10, unlock: [4, 6, 8, 10, 12, 14, 16, 18, 20, 22], prereq: [['napalm_beat', 4]], sp: 11, spPer: 1, cd: 4, power: 1.3, powerPer: 0.12, hits: 2, shape: 'strike', element: 'ghost', fx: 'soulBlast', icon: 'soul', desc: 'Hammer the target with restless spirits.' }),
  frost_diver: defineSkill('frost_diver', { name: 'Frost Diver', job: 'mage', maxRank: 10, unlock: [7, 9, 11, 13, 15, 17, 19, 21, 23, 25], prereq: [['cold_bolt', 5]], sp: 14, spPer: 1, cd: 5.5, power: 1.8, powerPer: 0.2, shape: 'strike', element: 'water', status: 'freeze', statusTime: 2.4, fx: 'frostDiver', icon: 'ice', desc: 'Freeze a foe solid in a block of ice.' }),
  fire_ball: defineSkill('fire_ball', { name: 'Fire Ball', job: 'mage', maxRank: 10, unlock: [5, 7, 9, 11, 13, 15, 17, 19, 21, 23], prereq: [['fire_bolt', 4]], sp: 13, cd: 5, power: 1.4, powerPer: 0.14, shape: 'area', radius: 2.6, element: 'fire', status: 'burning', statusTime: 3, fx: 'fireBall', icon: 'fireBall', desc: 'Lob a fireball that bursts over a cluster.' }),
  stone_spike: defineSkill('stone_spike', { name: 'Stone Spike', job: 'mage', maxRank: 5, unlock: [12, 16, 20, 24, 28], sp: 16, cd: 7, power: 1.5, powerPer: 0.16, shape: 'area', radius: 2.8, element: 'earth', status: 'stun', statusTime: 1.4, fx: 'quake', icon: 'earth', desc: 'Spikes of rock burst out of the ground.' }),
  sight: defineSkill('sight', { name: 'Sight', job: 'mage', maxRank: 1, unlock: [1], sp: 8, cd: 12, shape: 'buff', power: 0.06, radius: 4, fx: 'aura', icon: 'eye', desc: 'Reveal hidden things and steady your aim.' }),
  fire_wall: defineSkill('fire_wall', { name: 'Fire Wall', job: 'mage', maxRank: 10, unlock: [9, 11, 13, 15, 17, 19, 21, 23, 25, 27], prereq: [['fire_ball', 5]], sp: 18, cd: 9, shape: 'ground', radius: 3, element: 'fire', status: 'burning', statusTime: 4, power: 1.2, fx: 'fireWall', icon: 'fireWall', desc: 'Raise a wall of flame that scorches anything crossing it.' }),

  // Archer
  owls_eye: defineSkill('owls_eye', { name: "Owl's Eye", job: 'archer', maxRank: 10, unlock: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18], shape: 'passive', passive: { dex: 1 }, icon: 'eye', desc: 'Train your sight until every shot lands true.' }),
  vultures_eye: defineSkill('vultures_eye', { name: "Vulture's Eye", job: 'archer', maxRank: 10, unlock: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18], shape: 'passive', passive: { range: 0.12 }, icon: 'eye', desc: 'Extend the reach of your bow.' }),
  double_strafe: defineSkill('double_strafe', { name: 'Double Strafe', job: 'archer', maxRank: 10, unlock: [1, 2, 3, 4, 5, 6, 8, 10, 12, 14], sp: 8, spPer: 1, cd: 3.5, power: 1.5, powerPer: 0.17, hits: 2, shape: 'strike', fx: 'arrowVolley', icon: 'arrow', desc: 'Two arrows loosed in the same breath.' }),
  arrow_shower: defineSkill('arrow_shower', { name: 'Arrow Shower', job: 'archer', maxRank: 10, unlock: [4, 6, 8, 10, 12, 14, 16, 18, 20, 22], sp: 12, spPer: 1, cd: 6, power: 1.1, powerPer: 0.1, shape: 'area', radius: 2.6, fx: 'arrowRain', icon: 'arrowRain', desc: 'Rain arrows over the target area.' }),
  improve_concentration: defineSkill('improve_concentration', { name: 'Improve Concentration', job: 'archer', maxRank: 10, unlock: [3, 5, 7, 9, 11, 13, 15, 17, 19, 21], sp: 12, cd: 14, shape: 'buff', power: 0.04, powerPer: 0.008, radius: 3.5, fx: 'concentration', icon: 'focus', desc: 'Steady breathing sharpens aim and damage.' }),
  ac_owl: defineSkill('ac_owl', { name: 'Sharp Shooting', job: 'archer', maxRank: 5, unlock: [10, 14, 18, 22, 26], sp: 14, cd: 7, power: 2, powerPer: 0.22, shape: 'strike', fx: 'focusedArrow', icon: 'eye', desc: 'One shot taken with a held breath.' }),
  charge_arrow: defineSkill('charge_arrow', { name: 'Charge Arrow', job: 'archer', maxRank: 1, unlock: [8], sp: 10, cd: 7, power: 1.9, shape: 'strike', status: 'stun', statusTime: 1.4, fx: 'arrowVolley', icon: 'arrow', desc: 'An arrow with enough force to knock a foe back.' }),

  // Acolyte
  divine_protection: defineSkill('divine_protection', { name: 'Divine Protection', job: 'acolyte', maxRank: 10, unlock: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], shape: 'passive', passive: { def: 1.5 }, icon: 'shield', desc: 'Faith turns aside the blows of the unholy.' }),
  heal: defineSkill('heal', { name: 'Heal', job: 'acolyte', maxRank: 10, unlock: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18], sp: 10, spPer: 2, cd: 4, shape: 'heal', power: 40, powerPer: 14, radius: 6, fx: 'heal', icon: 'heal', desc: 'Mend the most wounded ally in reach.' }),
  blessing: defineSkill('blessing', { name: 'Blessing', job: 'acolyte', maxRank: 10, unlock: [4, 6, 8, 10, 12, 14, 16, 18, 20, 22], sp: 11, cd: 12, shape: 'buff', power: 0.05, powerPer: 0.008, radius: 4.5, fx: 'blessing', icon: 'blessing', desc: 'Bless the party with steadier hands and sharper strikes.' }),
  cure: defineSkill('cure', { name: 'Cure', job: 'acolyte', maxRank: 1, unlock: [2], sp: 8, cd: 10, shape: 'buff', radius: 4, fx: 'aura', icon: 'leaf', desc: 'Cleanse poison and silence from a companion.' }),
  aqua_benedicta: defineSkill('aqua_benedicta', { name: 'Aqua Benedicta', job: 'acolyte', maxRank: 1, unlock: [4], sp: 8, cd: 10, shape: 'heal', power: 26, powerPer: 0, radius: 4, fx: 'aspersio', icon: 'water', desc: 'Bless a flask of water into holy medicine.' }),
  angelus: defineSkill('angelus', { name: 'Angelus', job: 'acolyte', maxRank: 1, unlock: [6], sp: 10, cd: 14, shape: 'buff', power: 0.04, radius: 4.5, fx: 'holyAura', icon: 'wing', desc: 'A chorus of angels hardens the party’s defence.' }),
  holy_light: defineSkill('holy_light', { name: 'Holy Light', job: 'acolyte', maxRank: 10, unlock: [7, 9, 11, 13, 15, 17, 19, 21, 23, 25], prereq: [['heal', 1]], sp: 11, spPer: 1, cd: 5, power: 1.5, powerPer: 0.16, shape: 'strike', element: 'holy', fx: 'holyLight', icon: 'holy', desc: 'A lance of holy light that burns the undead badly.' }),

  // Merchant
  enlarge_weight_limit: defineSkill('enlarge_weight_limit', { name: 'Enlarge Weight Limit', job: 'merchant', maxRank: 10, unlock: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], shape: 'passive', passive: { def: 1, hp: 6 }, icon: 'bag', desc: 'Carry more and take more of a beating.' }),
  mammonite: defineSkill('mammonite', { name: 'Mammonite', job: 'merchant', maxRank: 10, unlock: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18], sp: 8, cd: 4.5, power: 1.9, powerPer: 0.18, shape: 'strike', fx: 'coinStrike', icon: 'coin', desc: 'A coin-driven strike that hits far above its weight.' }),
  discount: defineSkill('discount', { name: 'Discount', job: 'merchant', maxRank: 10, unlock: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20], shape: 'passive', passive: { skill: 1 }, icon: 'bag', desc: 'Haggle every purchase down a little further.' }),
  pushcart: defineSkill('pushcart', { name: 'Pushcart', job: 'merchant', maxRank: 1, unlock: [5], sp: 10, cd: 12, shape: 'buff', power: 0.05, radius: 3.5, fx: 'cartAura', icon: 'cart', desc: 'Ready your cart for battle.' }),
  mc_loud: defineSkill('mc_loud', { name: 'Crazy Uproar', job: 'merchant', maxRank: 5, unlock: [4, 8, 12, 16, 20], sp: 10, cd: 14, shape: 'buff', power: 0.06, powerPer: 0.01, radius: 4, fx: 'provoke', icon: 'shout', desc: 'A shout that fires up every ally nearby.' }),
  cart_revolution: defineSkill('cart_revolution', { name: 'Cart Revolution', job: 'merchant', maxRank: 10, unlock: [8, 10, 12, 14, 16, 18, 20, 22, 24, 26], prereq: [['pushcart', 1], ['mammonite', 5]], sp: 12, cd: 6, power: 1.3, powerPer: 0.12, shape: 'area', radius: 3, status: 'stun', statusTime: 1.2, fx: 'cartSweep', icon: 'cart', desc: 'Swing the pushcart through everything in front of you.' }),

  // Thief
  steal: defineSkill('steal', { name: 'Steal', job: 'thief', maxRank: 10, unlock: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], shape: 'passive', passive: { crit: 0.004 }, icon: 'hand', desc: 'Light fingers mean better loot.' }),
  envenom: defineSkill('envenom', { name: 'Envenom', job: 'thief', maxRank: 10, unlock: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18], sp: 8, spPer: 0.5, cd: 3.5, power: 1.4, powerPer: 0.16, shape: 'strike', status: 'poison', statusTime: 4, statusPower: 3, fx: 'venomStrike', icon: 'poison', desc: 'A poisoned cut that keeps working after the strike.' }),
  th_throw_stone: defineSkill('th_throw_stone', { name: 'Throw Stone', job: 'thief', maxRank: 7, unlock: [1, 4, 7, 10, 13, 16, 19], sp: 5, cd: 4, power: 1.1, powerPer: 0.1, shape: 'strike', status: 'stun', statusTime: 1.2, fx: 'sandThrow', icon: 'sand', desc: 'A rock, a good arm, and a very surprised monster.' }),
  detoxify: defineSkill('detoxify', { name: 'Detoxify', job: 'thief', maxRank: 1, unlock: [3], sp: 8, cd: 10, shape: 'buff', radius: 3, fx: 'aura', icon: 'leaf', desc: 'Purge poison from yourself and nearby allies.' }),
  double_attack: defineSkill('double_attack', { name: 'Double Attack', job: 'thief', maxRank: 10, unlock: [3, 5, 7, 9, 11, 13, 15, 17, 19, 21], prereq: [['envenom', 3]], shape: 'passive', passive: { crit: 0.006, atk: 2 }, icon: 'doubleSlash', desc: 'Swing twice before the enemy can blink.' }),
  hiding: defineSkill('hiding', { name: 'Hiding', job: 'thief', maxRank: 10, unlock: [5, 7, 9, 11, 13, 15, 17, 19, 21, 23], sp: 6, cd: 16, shape: 'buff', power: 0.03, powerPer: 0.004, radius: 2.5, fx: 'shadowCloak', icon: 'shadow', desc: 'Slip out of sight and strike again from cover.' }),
  sand_attack: defineSkill('sand_attack', { name: 'Sand Attack', job: 'thief', maxRank: 10, unlock: [7, 9, 11, 13, 15, 17, 19, 21, 23, 25], prereq: [['envenom', 5]], sp: 9, cd: 4, power: 1.2, powerPer: 0.1, shape: 'strike', status: 'blind', statusTime: 3.2, fx: 'sandThrow', icon: 'sand', desc: 'Throw grit in your target’s eyes.' }),

  // ==========================================================================
  // Second jobs
  // ==========================================================================
  // Knight
  spear_mastery: defineSkill('spear_mastery', { name: 'Spear Mastery', job: 'knight', maxRank: 10, unlock: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18], shape: 'passive', passive: { atk: 3 }, icon: 'spear', desc: 'Every spear you hold strikes harder.' }),
  pierce: defineSkill('pierce', { name: 'Pierce', job: 'knight', maxRank: 10, unlock: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], sp: 10, spPer: 0.5, cd: 4, power: 1.9, powerPer: 0.16, shape: 'strike', fx: 'spearThrust', icon: 'spear', desc: 'A focused thrust that punches clean through a single foe.' }),
  spear_stab: defineSkill('spear_stab', { name: 'Spear Stab', job: 'knight', maxRank: 10, unlock: [3, 5, 7, 9, 11, 13, 15, 17, 19, 21], prereq: [['pierce', 5]], sp: 12, cd: 5, power: 1.5, powerPer: 0.14, shape: 'area', radius: 3.2, status: 'stun', statusTime: 1.4, fx: 'spearSweep', icon: 'spearSweep', desc: 'Wide spear sweep that knocks a line of foes back.' }),
  brandish_spear: defineSkill('brandish_spear', { name: 'Brandish Spear', job: 'knight', maxRank: 10, unlock: [8, 10, 12, 14, 16, 18, 20, 22, 24, 26], prereq: [['spear_stab', 5]], sp: 14, cd: 6, power: 1.6, powerPer: 0.14, shape: 'area', radius: 3.5, fx: 'spearBrandish', icon: 'spearSweep', desc: 'Broad spear sweep that drags everything nearby onto the knight.' }),
  riding: defineSkill('riding', { name: 'Peco Peco Riding', job: 'knight', maxRank: 1, unlock: [4], shape: 'passive', passive: { speed: 0.15 }, icon: 'mount', desc: 'Fight from the saddle for speed and reach.' }),
  two_hand_quicken: defineSkill('two_hand_quicken', { name: 'Two-Hand Quicken', job: 'knight', maxRank: 10, unlock: [6, 8, 10, 12, 14, 16, 18, 20, 22, 24], shape: 'passive', passive: { speed: 0.02 }, icon: 'sword', desc: 'Loosen the grip and swing faster.' }),
  counter_attack: defineSkill('counter_attack', { name: 'Counter Attack', job: 'knight', maxRank: 5, unlock: [2, 5, 9, 13, 17], prereq: [['sword_mastery', 1]], sp: 8, cd: 10, shape: 'buff', power: 0.06, powerPer: 0.01, radius: 2.5, fx: 'guard', icon: 'shield', desc: 'Catch the next blow and answer it.' }),
  bowling_bash: defineSkill('bowling_bash', { name: 'Bowling Bash', job: 'knight', maxRank: 10, unlock: [12, 14, 16, 18, 20, 22, 24, 26, 28, 30], prereq: [['two_hand_quicken', 5], ['counter_attack', 3]], sp: 15, cd: 7, power: 1.4, powerPer: 0.16, shape: 'area', radius: 3.4, status: 'stun', statusTime: 1.6, fx: 'bowlingBash', icon: 'impact', desc: 'Bowl through a line of enemies like tenpins.' }),

  // Lord Knight
  spiral_pierce: defineSkill('spiral_pierce', { name: 'Spiral Pierce', job: 'lordKnight', maxRank: 5, unlock: [1, 8, 16, 24, 32], prereq: [['spear_mastery', 10], ['pierce', 5]], sp: 18, cd: 9, power: 2.2, powerPer: 0.3, shape: 'strike', status: 'stun', statusTime: 2, fx: 'spiralPierce', icon: 'spiral', desc: 'A corkscrewing thrust that staggers everything in reach.' }),
  head_crush: defineSkill('head_crush', { name: 'Head Crush', job: 'lordKnight', maxRank: 5, unlock: [3, 10, 18, 26, 34], sp: 14, cd: 6, power: 1.5, powerPer: 0.15, shape: 'strike', status: 'bleeding', statusTime: 4, statusPower: 4, fx: 'headCrush', icon: 'impact', desc: 'A crushing overhead that leaves the foe bleeding.' }),
  joint_beat: defineSkill('joint_beat', { name: 'Joint Beat', job: 'lordKnight', maxRank: 10, unlock: [5, 9, 13, 17, 21, 25, 29, 33, 37, 41], sp: 14, cd: 5, power: 1.2, powerPer: 0.1, shape: 'strike', status: 'slow', statusTime: 4, fx: 'jointBeat', icon: 'bone', desc: 'Strike the joints to cripple movement and attack speed.' }),
  berserk: defineSkill('berserk', { name: 'Berserk', job: 'lordKnight', maxRank: 1, unlock: [40], sp: 30, cd: 40, shape: 'buff', power: 0.25, radius: 3, fx: 'berserkAura', icon: 'rage', desc: 'Trade defence for overwhelming attack power.' }),
  parry: defineSkill('parry', { name: 'Parry', job: 'lordKnight', maxRank: 10, unlock: [10, 14, 18, 22, 26, 30, 34, 38, 42, 46], shape: 'passive', passive: { def: 2 }, icon: 'shield', desc: 'Turn aside blades with the flat of your own.' }),
  concentration_knight: defineSkill('concentration_knight', { name: 'Concentration', job: 'lordKnight', maxRank: 5, unlock: [20, 24, 28, 32, 36], sp: 16, cd: 18, shape: 'buff', power: 0.12, powerPer: 0.02, radius: 3, fx: 'focus', icon: 'focus', desc: 'Focus the will to cut through any guard.' }),

  // Rune Knight
  dragon_training: defineSkill('dragon_training', { name: 'Dragon Training', job: 'runeKnight', maxRank: 10, unlock: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], shape: 'passive', passive: { hp: 40, def: 2 }, icon: 'dragon', desc: 'Bond with a dragon until it fights beside you.' }),
  dragon_breath: defineSkill('dragon_breath', { name: 'Dragon Breath', job: 'runeKnight', maxRank: 10, unlock: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20], prereq: [['dragon_training', 1]], sp: 30, cd: 10, power: 1.8, powerPer: 0.2, shape: 'area', radius: 4.2, element: 'fire', status: 'burning', statusTime: 4, fx: 'dragonBreath', icon: 'dragon', desc: 'Exhale a cone of draconic fire that ignores defence.' }),
  rune_mastery: defineSkill('rune_mastery', { name: 'Rune Mastery', job: 'runeKnight', maxRank: 10, unlock: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], sp: 14, cd: 8, power: 1.7, powerPer: 0.18, shape: 'strike', element: 'holy', fx: 'runeStrike', icon: 'rune', desc: 'Carve a rune and detonate it on a foe.' }),
  hundred_spear: defineSkill('hundred_spear', { name: 'Hundred Spears', job: 'runeKnight', maxRank: 5, unlock: [10, 15, 20, 25, 30], prereq: [['rune_mastery', 5]], sp: 22, cd: 9, power: 1.3, powerPer: 0.12, hits: 4, shape: 'strike', fx: 'hundredSpear', icon: 'spearRain', desc: 'Spears rain from the sky in a relentless barrage.' }),
  ignition_break: defineSkill('ignition_break', { name: 'Ignition Break', job: 'runeKnight', maxRank: 5, unlock: [18, 22, 26, 30, 34], sp: 24, cd: 8, power: 1.7, powerPer: 0.22, shape: 'area', radius: 3.8, element: 'fire', fx: 'ignitionBreak', icon: 'explosion', desc: 'Slam the ground and ignite everything around you.' }),

  // Crusader
  faith: defineSkill('faith', { name: 'Faith', job: 'crusader', maxRank: 10, unlock: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], shape: 'passive', passive: { hp: 22, def: 1 }, icon: 'cross', desc: 'Deep faith bolsters health and defence.' }),
  shield_charge: defineSkill('shield_charge', { name: 'Shield Charge', job: 'crusader', maxRank: 5, unlock: [1, 4, 8, 12, 16], sp: 12, cd: 6, power: 1.7, powerPer: 0.2, shape: 'strike', status: 'stun', statusTime: 1.6, fx: 'shieldCharge', icon: 'shield', desc: 'Slam a foe with your shield and leave it reeling.' }),
  smite: defineSkill('smite', { name: 'Smite', job: 'crusader', maxRank: 10, unlock: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20], prereq: [['faith', 1]], sp: 12, cd: 5, power: 1.5, powerPer: 0.14, shape: 'strike', element: 'holy', fx: 'smite', icon: 'holy', desc: 'A holy blow that punishes the undead.' }),
  heal_crusader: defineSkill('heal_crusader', { name: 'Heal', job: 'crusader', maxRank: 10, unlock: [3, 5, 7, 9, 11, 13, 15, 17, 19, 21], sp: 14, spPer: 2, cd: 5, shape: 'heal', power: 34, powerPer: 10, radius: 5, fx: 'heal', icon: 'heal', desc: 'Channel faith into a burst of healing.' }),
  divine_protection_crusader: defineSkill('divine_protection_crusader', { name: 'Divine Protection', job: 'crusader', maxRank: 10, unlock: [5, 7, 9, 11, 13, 15, 17, 19, 21, 23], sp: 12, cd: 14, shape: 'buff', power: 0.04, powerPer: 0.008, radius: 4.5, fx: 'holyAura', icon: 'shield', desc: 'A holy ward shields the party from harm.' }),
  grand_cross: defineSkill('grand_cross', { name: 'Grand Cross', job: 'crusader', maxRank: 10, unlock: [10, 12, 14, 16, 18, 20, 22, 24, 26, 28], prereq: [['faith', 5], ['holy_light', 1]], sp: 20, cd: 8, power: 1.5, powerPer: 0.18, shape: 'area', radius: 3.6, element: 'holy', fx: 'grandCross', icon: 'cross', desc: 'A colossal cross of light erupts around you.' }),

  // Paladin / Royal Guard
  sacrifice_paladin: defineSkill('sacrifice_paladin', { name: 'Sacrifice', job: 'paladin', maxRank: 5, unlock: [1, 6, 12, 18, 24], prereq: [['faith', 5]], sp: 20, cd: 9, power: 1.8, powerPer: 0.25, shape: 'area', radius: 3, element: 'holy', fx: 'sacrifice', icon: 'holy', desc: 'Spend your own vigour to sear nearby foes with holy light.' }),
  devotion: defineSkill('devotion', { name: 'Devotion', job: 'paladin', maxRank: 5, unlock: [5, 10, 16, 22, 28], sp: 18, cd: 18, shape: 'buff', power: 0.08, powerPer: 0.01, radius: 5, fx: 'devotion', icon: 'shield', desc: 'Take the damage meant for a comrade.' }),
  gospel: defineSkill('gospel', { name: 'Gospel', job: 'paladin', maxRank: 10, unlock: [12, 16, 20, 24, 28, 32, 36, 40, 44, 48], sp: 24, cd: 25, shape: 'buff', power: 0.1, powerPer: 0.015, radius: 5.5, fx: 'gospel', icon: 'holy', desc: 'A scripture that blesses allies and vexes the unholy.' }),
  shield_spell: defineSkill('shield_spell', { name: 'Shield Spell', job: 'royalGuard', maxRank: 5, unlock: [1, 6, 12, 18, 24], sp: 20, cd: 9, power: 1.4, powerPer: 0.16, shape: 'area', radius: 3.4, element: 'holy', status: 'stun', statusTime: 1.4, fx: 'shieldBoomerang', icon: 'shield', desc: 'Hurl your shield and let it rebound through a crowd.' }),
  earth_drive: defineSkill('earth_drive', { name: 'Earth Drive', job: 'royalGuard', maxRank: 5, unlock: [10, 15, 20, 25, 30], sp: 26, cd: 11, power: 1.6, powerPer: 0.2, shape: 'area', radius: 4, element: 'earth', status: 'stun', statusTime: 1.6, fx: 'earthDrive', icon: 'quake', desc: 'Rip the ground open beneath the enemy line.' }),

  // Priest
  mace_mastery: defineSkill('mace_mastery', { name: 'Mace Mastery', job: 'priest', maxRank: 10, unlock: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], shape: 'passive', passive: { atk: 2, hit: 0.003 }, icon: 'mace', desc: 'A priest’s mace is still a weapon.' }),
  kyrie_eleison: defineSkill('kyrie_eleison', { name: 'Kyrie Eleison', job: 'priest', maxRank: 10, unlock: [1, 5, 9, 13, 17, 21, 25, 29, 33, 37], sp: 14, cd: 16, shape: 'buff', power: 0.06, powerPer: 0.01, radius: 4, fx: 'kyrie', icon: 'shield', desc: 'A shield of prayer that catches incoming blows.' }),
  blessing_priest: defineSkill('blessing_priest', { name: 'Blessing', job: 'priest', maxRank: 10, unlock: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20], sp: 12, cd: 12, shape: 'buff', power: 0.06, powerPer: 0.01, radius: 5, fx: 'blessing', icon: 'blessing', desc: 'A deeper blessing for every ally.' }),
  increase_agi: defineSkill('increase_agi', { name: 'Increase AGI', job: 'priest', maxRank: 10, unlock: [3, 5, 7, 9, 11, 13, 15, 17, 19, 21], sp: 12, cd: 14, shape: 'buff', power: 0.03, powerPer: 0.006, radius: 4.5, fx: 'haste', icon: 'haste', desc: 'Quickens the party’s feet and hands.' }),
  lex_divina: defineSkill('lex_divina', { name: 'Lex Divina', job: 'priest', maxRank: 10, unlock: [5, 8, 11, 14, 17, 20, 23, 26, 29, 32], sp: 14, cd: 8, power: 1.4, powerPer: 0.12, shape: 'strike', element: 'holy', status: 'silence', statusTime: 3, fx: 'lexDivina', icon: 'rune', desc: 'Silence a foe and mark it for judgement.' }),
  gloria: defineSkill('gloria', { name: 'Gloria', job: 'priest', maxRank: 5, unlock: [10, 15, 20, 25, 30], sp: 20, cd: 20, shape: 'buff', power: 0.08, powerPer: 0.012, radius: 5, fx: 'gloria', icon: 'wing', desc: 'A chorus of praise that lifts the whole party.' }),
  sanctuary: defineSkill('sanctuary', { name: 'Sanctuary', job: 'priest', maxRank: 10, unlock: [7, 10, 13, 16, 19, 22, 25, 28, 31, 34], prereq: [['heal', 5]], sp: 20, spPer: 2, cd: 8, shape: 'heal', power: 46, powerPer: 12, radius: 7, fx: 'sanctuary', icon: 'sanctuary', desc: 'Consecrate the ground, healing every wounded ally on it.' }),
  magnus_exorcismus: defineSkill('magnus_exorcismus', { name: 'Magnus Exorcismus', job: 'priest', maxRank: 10, unlock: [12, 15, 18, 21, 24, 27, 30, 33, 36, 39], prereq: [['lex_divina', 5], ['sanctuary', 3]], sp: 28, cd: 10, power: 1.4, powerPer: 0.16, shape: 'area', radius: 4.5, element: 'holy', fx: 'magnus', icon: 'holy', desc: 'A pillar of faith scorches the undead around you.' }),
  aspen: defineSkill('aspen', { name: 'Aspersio', job: 'priest', maxRank: 5, unlock: [10, 14, 18, 22, 26], sp: 14, cd: 16, shape: 'buff', power: 0.1, powerPer: 0.02, radius: 4, element: 'holy', fx: 'aspersio', icon: 'water', desc: 'Holy water blesses every weapon with sacred force.' }),

  // High Priest / Arch Bishop
  high_sanctuary: defineSkill('high_sanctuary', { name: 'High Sanctuary', job: 'highPriest', maxRank: 5, unlock: [1, 8, 16, 24, 32], prereq: [['sanctuary', 5]], sp: 26, cd: 9, shape: 'heal', power: 54, powerPer: 16, radius: 8, fx: 'highSanctuary', icon: 'sanctuary', desc: 'A grand sanctuary that also restores SP.' }),
  meditatio: defineSkill('meditatio', { name: 'Meditatio', job: 'highPriest', maxRank: 10, unlock: [2, 6, 10, 14, 18, 22, 26, 30, 34, 38], shape: 'passive', passive: { sp: 12, matk: 4 }, icon: 'meditate', desc: 'Deep meditation empowers every spell.' }),
  assumptio: defineSkill('assumptio', { name: 'Assumptio', job: 'highPriest', maxRank: 5, unlock: [5, 12, 19, 26, 33], sp: 18, cd: 20, shape: 'buff', power: 0.07, powerPer: 0.012, radius: 4.5, fx: 'assumptio', icon: 'wing', desc: 'Halve the damage your allies take.' }),
  basilica: defineSkill('basilica', { name: 'Basilica', job: 'archBishop', maxRank: 5, unlock: [1, 10, 20, 30, 40], sp: 30, cd: 30, shape: 'buff', power: 0.1, powerPer: 0.02, radius: 5.5, fx: 'basilica', icon: 'church', desc: 'Raise a holy sanctuary that shields all who stand inside.' }),
  coluceo_heal: defineSkill('coluceo_heal', { name: 'Coluceo Heal', job: 'archBishop', maxRank: 5, unlock: [5, 12, 20, 28, 36], sp: 24, cd: 8, shape: 'heal', power: 60, powerPer: 18, radius: 7, fx: 'coluceo', icon: 'heal', desc: 'A chained heal that reaches every ally in turn.' }),
  judex: defineSkill('judex', { name: 'Judex', job: 'archBishop', maxRank: 5, unlock: [10, 16, 22, 28, 34], sp: 26, cd: 8, power: 1.9, powerPer: 0.24, shape: 'area', radius: 3.6, element: 'holy', fx: 'judex', icon: 'judgement', desc: 'Divine judgement falls on a cluster of enemies.' }),

  // Wizard
  spell_mastery: defineSkill('spell_mastery', { name: 'Spell Mastery', job: 'wizard', maxRank: 10, unlock: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], shape: 'passive', passive: { matk: 5 }, icon: 'book', desc: 'Study sharpens every spell you cast.' }),
  jupitel_thunder: defineSkill('jupitel_thunder', { name: 'Jupitel Thunder', job: 'wizard', maxRank: 10, unlock: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28], prereq: [['lightning_bolt', 5]], sp: 16, cd: 6, power: 1.8, powerPer: 0.2, shape: 'strike', element: 'wind', status: 'stun', statusTime: 1.6, fx: 'jupitel', icon: 'bolt', desc: 'Lightning jumps from the sky and leaves foes twitching.' }),
  frost_nova: defineSkill('frost_nova', { name: 'Frost Nova', job: 'wizard', maxRank: 10, unlock: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30], prereq: [['cold_bolt', 3]], sp: 15, cd: 6, power: 1.2, powerPer: 0.12, shape: 'area', radius: 3.4, element: 'water', status: 'freeze', statusTime: 2.2, fx: 'frostNova', icon: 'ice', desc: 'A ring of frost bursts outward and freezes all it touches.' }),
  storm_gust: defineSkill('storm_gust', { name: 'Storm Gust', job: 'wizard', maxRank: 10, unlock: [10, 13, 16, 19, 22, 25, 28, 31, 34, 37], prereq: [['jupitel_thunder', 3], ['frost_diver', 1]], sp: 22, cd: 9, power: 1.3, powerPer: 0.14, shape: 'area', radius: 4, element: 'water', status: 'freeze', statusTime: 2.4, fx: 'stormGust', icon: 'blizzard', desc: 'Freeze a wide cluster in a lattice of ice.' }),
  lord_of_vermilion: defineSkill('lord_of_vermilion', { name: 'Lord of Vermilion', job: 'wizard', maxRank: 10, unlock: [16, 19, 22, 25, 28, 31, 34, 37, 40, 43], prereq: [['jupitel_thunder', 5]], sp: 26, cd: 11, power: 1.25, powerPer: 0.13, shape: 'area', radius: 5, element: 'wind', fx: 'vermilion', icon: 'storm', desc: 'A storm of violet lightning rakes the whole field.' }),
  meteor_storm: defineSkill('meteor_storm', { name: 'Meteor Storm', job: 'wizard', maxRank: 10, unlock: [18, 21, 24, 27, 30, 33, 36, 39, 42, 45], prereq: [['fire_ball', 5]], sp: 30, cd: 14, power: 1.5, powerPer: 0.16, shape: 'area', radius: 4.6, element: 'fire', status: 'burning', statusTime: 4, fx: 'meteor', icon: 'meteor', desc: 'Call meteors down on a burning battlefield.' }),

  // High Wizard / Warlock
  amplify_magic_power: defineSkill('amplify_magic_power', { name: 'Amplify Magic Power', job: 'highWizard', maxRank: 10, unlock: [1, 5, 9, 13, 17, 21, 25, 29, 33, 37], shape: 'passive', passive: { matk: 8 }, icon: 'spark', desc: 'Amplify the raw force of your magic.' }),
  napalm_vulcan: defineSkill('napalm_vulcan', { name: 'Napalm Vulcan', job: 'highWizard', maxRank: 5, unlock: [1, 6, 12, 18, 24], sp: 24, cd: 6, power: 1.1, powerPer: 0.14, hits: 4, shape: 'area', radius: 3.2, element: 'ghost', fx: 'ghostBurst', icon: 'skull', desc: 'Ghostly explosions ripple through a crowd.' }),
  mystical_amplification: defineSkill('mystical_amplification', { name: 'Mystical Amplification', job: 'highWizard', maxRank: 5, unlock: [4, 10, 16, 22, 28], sp: 22, cd: 18, shape: 'buff', power: 0.15, powerPer: 0.02, radius: 3, fx: 'arcaneCircle', icon: 'arcane', desc: 'Draw a circle that doubles spell damage for its duration.' }),
  comet: defineSkill('comet', { name: 'Comet', job: 'warlock', maxRank: 5, unlock: [1, 10, 20, 30, 40], sp: 40, cd: 20, power: 2.2, powerPer: 0.3, shape: 'area', radius: 5, element: 'fire', fx: 'comet', icon: 'comet', desc: 'A comet falls and burns the ground it strikes.' }),
  chain_lightning: defineSkill('chain_lightning', { name: 'Chain Lightning', job: 'warlock', maxRank: 5, unlock: [5, 12, 19, 26, 33], sp: 28, cd: 9, power: 1.6, powerPer: 0.18, shape: 'area', radius: 4, element: 'wind', status: 'stun', statusTime: 1.3, fx: 'chainLightning', icon: 'chain', desc: 'Lightning leaps from foe to foe in a widening chain.' }),

  // Sage
  advanced_book: defineSkill('advanced_book', { name: 'Advanced Book', job: 'sage', maxRank: 10, unlock: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], shape: 'passive', passive: { matk: 4, sp: 8 }, icon: 'book', desc: 'Every page read adds to your power.' }),
  cast_cancel: defineSkill('cast_cancel', { name: 'Cast Cancel', job: 'sage', maxRank: 5, unlock: [1, 5, 10, 15, 20], sp: 10, cd: 12, shape: 'buff', radius: 3, fx: 'aura', icon: 'cancel', desc: 'Snap your fingers and stop an enemy’s cast.' }),
  dispell: defineSkill('dispell', { name: 'Dispell', job: 'sage', maxRank: 5, unlock: [3, 8, 13, 18, 23], sp: 14, cd: 8, power: 1.5, powerPer: 0.15, shape: 'strike', element: 'wind', fx: 'dispell', icon: 'wind', desc: 'Strip a foe’s enchantments and stagger its guard.' }),
  spell_breaker: defineSkill('spell_breaker', { name: 'Spell Breaker', job: 'sage', maxRank: 10, unlock: [5, 9, 13, 17, 21, 25, 29, 33, 37, 41], sp: 14, cd: 7, power: 1.3, powerPer: 0.12, shape: 'area', radius: 3.2, status: 'silence', statusTime: 3, fx: 'spellBreak', icon: 'cancel', desc: 'Shatter a caster cluster and silence the survivors.' }),
  endow_blade: defineSkill('endow_blade', { name: 'Endow Blade', job: 'sage', maxRank: 5, unlock: [7, 12, 17, 22, 27], sp: 18, cd: 14, shape: 'buff', power: 0.1, powerPer: 0.02, radius: 4, element: 'fire', fx: 'endow', icon: 'fire', desc: 'Charge every ally’s weapon with elemental force.' }),
  magnetic_earth: defineSkill('magnetic_earth', { name: 'Magnetic Earth', job: 'sage', maxRank: 5, unlock: [10, 15, 20, 25, 30], sp: 20, cd: 12, power: 1.1, powerPer: 0.12, shape: 'area', radius: 4, element: 'earth', status: 'slow', statusTime: 4, fx: 'magneticEarth', icon: 'earth', desc: 'Drag enemies to the ground and pin them there.' }),

  // Professor / Sorcerer
  double_casting: defineSkill('double_casting', { name: 'Double Casting', job: 'professor', maxRank: 5, unlock: [1, 6, 12, 18, 24], sp: 22, cd: 16, shape: 'buff', power: 0.1, powerPer: 0.02, radius: 3, fx: 'arcaneCircle', icon: 'arcane', desc: 'Every spell is cast twice.' }),
  soul_change: defineSkill('soul_change', { name: 'Soul Change', job: 'professor', maxRank: 5, unlock: [4, 10, 16, 22, 28], sp: 20, cd: 15, power: 1.4, powerPer: 0.18, shape: 'area', radius: 3, element: 'ghost', fx: 'soulDrain', icon: 'soul', desc: 'Drain a foe’s spirit and feed the party.' }),
  diamond_dust: defineSkill('diamond_dust', { name: 'Diamond Dust', job: 'sorcerer', maxRank: 5, unlock: [1, 8, 15, 22, 29], sp: 30, cd: 12, power: 1.6, powerPer: 0.2, shape: 'area', radius: 4.4, element: 'water', status: 'freeze', statusTime: 2.4, fx: 'diamondDust', icon: 'ice', desc: 'A whirling storm of razor ice.' }),
  psychic_wave: defineSkill('psychic_wave', { name: 'Psychic Wave', job: 'sorcerer', maxRank: 5, unlock: [8, 15, 22, 29, 36], sp: 28, cd: 10, power: 1.7, powerPer: 0.22, shape: 'area', radius: 4, element: 'ghost', fx: 'psychicWave', icon: 'psychic', desc: 'A rolling wave of psychic force.' }),

  // Hunter
  beast_bane: defineSkill('beast_bane', { name: 'Beast Bane', job: 'hunter', maxRank: 10, unlock: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], shape: 'passive', passive: { atk: 3 }, icon: 'fang', desc: 'Know exactly where beasts are softest.' }),
  falconry_mastery: defineSkill('falconry_mastery', { name: 'Falconry Mastery', job: 'hunter', maxRank: 1, unlock: [1], shape: 'passive', passive: { crit: 0.01 }, icon: 'falcon', desc: 'A falcon bonds to you and fights from the air.' }),
  blitz_beat: defineSkill('blitz_beat', { name: 'Blitz Beat', job: 'hunter', maxRank: 10, unlock: [3, 5, 7, 9, 11, 13, 15, 17, 19, 21], prereq: [['falconry_mastery', 1]], sp: 12, cd: 5, power: 1.2, powerPer: 0.12, shape: 'area', radius: 3.8, fx: 'blitzBeat', icon: 'falcon', desc: 'Your falcon dives, raking the target and its neighbours.' }),
  steel_crow: defineSkill('steel_crow', { name: 'Steel Crow', job: 'hunter', maxRank: 10, unlock: [5, 8, 11, 14, 17, 20, 23, 26, 29, 32], prereq: [['blitz_beat', 5]], shape: 'passive', passive: { atk: 4 }, icon: 'falcon', desc: 'Sharpen the falcon’s talons until they cut steel.' }),
  ankle_snare: defineSkill('ankle_snare', { name: 'Ankle Snare', job: 'hunter', maxRank: 5, unlock: [2, 6, 10, 14, 18], sp: 12, cd: 8, power: 1.1, powerPer: 0.1, shape: 'ground', radius: 1.6, status: 'immobilize', statusTime: 4, fx: 'ankleSnare', icon: 'trap', desc: 'A hidden snare pins a target to the spot.' }),
  skid_trap: defineSkill('skid_trap', { name: 'Skid Trap', job: 'hunter', maxRank: 5, unlock: [2, 6, 10, 14, 18], sp: 10, cd: 8, power: 1, powerPer: 0.08, shape: 'ground', radius: 1.6, status: 'slow', statusTime: 3, fx: 'skidTrap', icon: 'trap', desc: 'Greased ground sends a charging monster skidding away.' }),
  land_mine: defineSkill('land_mine', { name: 'Land Mine', job: 'hunter', maxRank: 5, unlock: [6, 10, 14, 18, 22], prereq: [['ankle_snare', 1]], sp: 14, cd: 7, power: 1.7, powerPer: 0.2, shape: 'area', radius: 2.2, element: 'earth', status: 'stun', statusTime: 1.4, fx: 'landMine', icon: 'mine', desc: 'A buried charge that erupts when stepped on.' }),
  claymore_trap: defineSkill('claymore_trap', { name: 'Claymore Trap', job: 'hunter', maxRank: 5, unlock: [10, 14, 18, 22, 26], prereq: [['land_mine', 1]], sp: 16, cd: 8, power: 1.9, powerPer: 0.24, shape: 'area', radius: 2.6, element: 'fire', fx: 'claymoreTrap', icon: 'mine', desc: 'A mine that detonates in a searing fireball.' }),
  arrow_repel: defineSkill('arrow_repel', { name: 'Arrow Repel', job: 'hunter', maxRank: 5, unlock: [8, 12, 16, 20, 24], sp: 12, cd: 7, power: 1.6, powerPer: 0.18, shape: 'strike', status: 'stun', statusTime: 1.6, fx: 'arrowRepel', icon: 'arrow', desc: 'Knock a foe off its feet with a blunt arrow.' }),

  // Sniper / Ranger
  true_sight: defineSkill('true_sight', { name: 'True Sight', job: 'sniper', maxRank: 10, unlock: [1, 5, 9, 13, 17, 21, 25, 29, 33, 37], sp: 20, cd: 16, shape: 'buff', power: 0.06, powerPer: 0.012, radius: 4, fx: 'trueSight', icon: 'eye', desc: 'See the truth of every target: damage, hit and crit rise.' }),
  falcon_assault: defineSkill('falcon_assault', { name: 'Falcon Assault', job: 'sniper', maxRank: 5, unlock: [1, 8, 16, 24, 32], prereq: [['blitz_beat', 5], ['steel_crow', 3]], sp: 22, cd: 8, power: 2.4, powerPer: 0.3, shape: 'strike', fx: 'falconAssault', icon: 'falcon', desc: 'The falcon strikes one target with everything it has.' }),
  focused_arrow_strike: defineSkill('focused_arrow_strike', { name: 'Focused Arrow Strike', job: 'sniper', maxRank: 5, unlock: [4, 11, 18, 25, 32], prereq: [['improve_concentration', 10], ['double_strafe', 5]], sp: 20, cd: 7, power: 2.1, powerPer: 0.28, shape: 'strike', fx: 'focusedArrow', icon: 'arrowRain', desc: 'One perfect shot that pierces a line of enemies.' }),
  wind_walk: defineSkill('wind_walk', { name: 'Wind Walker', job: 'sniper', maxRank: 10, unlock: [3, 8, 13, 18, 23, 28, 33, 38, 43, 48], sp: 18, cd: 20, shape: 'buff', power: 0.05, powerPer: 0.008, radius: 5, fx: 'windWalk', icon: 'wind', desc: 'The party moves like the wind.' }),
  arrow_storm: defineSkill('arrow_storm', { name: 'Arrow Storm', job: 'ranger', maxRank: 5, unlock: [1, 10, 20, 30, 40], sp: 28, cd: 10, power: 1.6, powerPer: 0.2, shape: 'area', radius: 4.4, fx: 'arrowStorm', icon: 'arrowRain', desc: 'A storm of arrows falls on the whole field.' }),
  warg_strike: defineSkill('warg_strike', { name: 'Warg Strike', job: 'ranger', maxRank: 5, unlock: [6, 13, 20, 27, 34], sp: 24, cd: 8, power: 1.9, powerPer: 0.22, shape: 'strike', status: 'bleeding', statusTime: 4, fx: 'wargStrike', icon: 'warg', desc: 'Your warg lunges and tears at a single foe.' }),

  // Blacksmith
  weaponry_research: defineSkill('weaponry_research', { name: 'Weaponry Research', job: 'blacksmith', maxRank: 10, unlock: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], shape: 'passive', passive: { atk: 3, hit: 0.004 }, icon: 'hammer', desc: 'Study every weapon until you know its weaknesses.' }),
  smith_hammer: defineSkill('smith_hammer', { name: 'Smith Hammer', job: 'blacksmith', maxRank: 10, unlock: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], sp: 10, cd: 4, power: 1.7, powerPer: 0.15, shape: 'strike', status: 'stun', statusTime: 1.2, fx: 'hammerSmash', icon: 'hammer', desc: 'Swing the forge hammer with both hands.' }),
  hammer_fall: defineSkill('hammer_fall', { name: 'Hammer Fall', job: 'blacksmith', maxRank: 10, unlock: [5, 8, 11, 14, 17, 20, 23, 26, 29, 32], prereq: [['smith_hammer', 5]], sp: 14, cd: 6, power: 1.4, powerPer: 0.14, shape: 'area', radius: 3, status: 'stun', statusTime: 1.6, fx: 'hammerFall', icon: 'hammer', desc: 'Bring the hammer down and stagger a whole cluster.' }),
  power_thrust: defineSkill('power_thrust', { name: 'Power Thrust', job: 'blacksmith', maxRank: 10, unlock: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29], sp: 12, cd: 10, shape: 'buff', power: 0.08, powerPer: 0.01, radius: 3.5, fx: 'powerThrust', icon: 'hammer', desc: 'A forged strike that punches through armour.' }),
  adrenaline_rush: defineSkill('adrenaline_rush', { name: 'Adrenaline Rush', job: 'blacksmith', maxRank: 5, unlock: [10, 15, 20, 25, 30], sp: 18, cd: 18, shape: 'buff', power: 0.08, powerPer: 0.015, radius: 4, fx: 'adrenaline', icon: 'rage', desc: 'Push the party past their limits.' }),
  weapon_perfection: defineSkill('weapon_perfection', { name: 'Weapon Perfection', job: 'blacksmith', maxRank: 5, unlock: [8, 13, 18, 23, 28], sp: 16, cd: 16, shape: 'buff', power: 0.06, powerPer: 0.01, radius: 4, fx: 'spark', icon: 'spark', desc: 'Keeps every weapon in the party striking true.' }),
  maximize_power: defineSkill('maximize_power', { name: 'Maximize Power', job: 'whitesmith', maxRank: 5, unlock: [1, 8, 16, 24, 32], sp: 20, cd: 14, shape: 'buff', power: 0.12, powerPer: 0.02, radius: 3.5, fx: 'maximize', icon: 'rage', desc: 'Every blow is a maximum-damage blow.' }),
  cart_termination: defineSkill('cart_termination', { name: 'Cart Termination', job: 'whitesmith', maxRank: 10, unlock: [4, 10, 16, 22, 28, 34, 40, 46, 52, 58], sp: 24, cd: 9, power: 2, powerPer: 0.24, shape: 'area', radius: 3.2, status: 'stun', statusTime: 2, fx: 'cartTermination', icon: 'cart', desc: 'Drive the cart through the enemy at full speed.' }),
  melt_down: defineSkill('melt_down', { name: 'Melt Down', job: 'whitesmith', maxRank: 10, unlock: [6, 12, 18, 24, 30, 36, 42, 48, 54, 60], sp: 18, cd: 10, power: 1.4, powerPer: 0.12, shape: 'strike', element: 'fire', status: 'burning', statusTime: 4, fx: 'meltDown', icon: 'fire', desc: 'Melt a foe’s armour away with forge heat.' }),
  axe_mastery: defineSkill('axe_mastery', { name: 'Axe Mastery', job: 'mechanic', maxRank: 10, unlock: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28], shape: 'passive', passive: { atk: 4 }, icon: 'axe', desc: 'Every axe you lift bites deeper.' }),
  mado_gear: defineSkill('mado_gear', { name: 'Mado Gear', job: 'mechanic', maxRank: 5, unlock: [1, 10, 20, 30, 40], sp: 32, cd: 16, power: 1.8, powerPer: 0.22, shape: 'area', radius: 4, element: 'earth', fx: 'madoGear', icon: 'mech', desc: 'Pilot a mado suit and fire its cannons.' }),

  // Assassin
  katar_mastery: defineSkill('katar_mastery', { name: 'Katar Mastery', job: 'assassin', maxRank: 10, unlock: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], shape: 'passive', passive: { atk: 3, crit: 0.005 }, icon: 'katar', desc: 'Katar technique that finds every gap.' }),
  sonic_blow: defineSkill('sonic_blow', { name: 'Sonic Blow', job: 'assassin', maxRank: 10, unlock: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28], sp: 14, spPer: 1, cd: 5, power: 1.8, powerPer: 0.2, hits: 2, shape: 'strike', fx: 'sonicBlow', icon: 'sonic', desc: 'Six strikes so fast the air cracks.' }),
  grimtooth: defineSkill('grimtooth', { name: 'Grimtooth', job: 'assassin', maxRank: 10, unlock: [5, 8, 11, 14, 17, 20, 23, 26, 29, 32], prereq: [['sonic_blow', 5]], sp: 16, cd: 7, power: 1.3, powerPer: 0.12, shape: 'area', radius: 3, status: 'poison', statusTime: 4, fx: 'grimtooth', icon: 'poison', desc: 'Drag a poisoned blade through everything nearby.' }),
  cloaking: defineSkill('cloaking', { name: 'Cloaking', job: 'assassin', maxRank: 10, unlock: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30], sp: 12, cd: 15, shape: 'buff', power: 0.04, powerPer: 0.006, radius: 2.5, fx: 'shadowCloak', icon: 'shadow', desc: 'Vanish from sight until you strike.' }),
  enchant_poison: defineSkill('enchant_poison', { name: 'Enchant Poison', job: 'assassin', maxRank: 10, unlock: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29], sp: 12, cd: 12, shape: 'buff', power: 0.06, powerPer: 0.008, radius: 3, element: 'poison', fx: 'enchantPoison', icon: 'poison', desc: 'Coat every weapon with poison.' }),
  meteor_assault: defineSkill('meteor_assault', { name: 'Meteor Assault', job: 'assassin', maxRank: 10, unlock: [10, 13, 16, 19, 22, 25, 28, 31, 34, 37], sp: 18, cd: 6, power: 1.5, powerPer: 0.16, shape: 'strike', fx: 'meteorAssault', icon: 'impact', desc: 'A flying knee that lands like a meteor.' }),
  soul_destroyer: defineSkill('soul_destroyer', { name: 'Soul Destroyer', job: 'assassinCross', maxRank: 10, unlock: [1, 6, 11, 16, 21, 26, 31, 36, 41, 46], sp: 22, cd: 8, power: 2, powerPer: 0.24, shape: 'strike', fx: 'soulBreaker', icon: 'soul', desc: 'A finishing strike that punishes a faltering enemy.' }),
  meteor_assault_cross: defineSkill('meteor_assault_cross', { name: 'Meteor Assault', job: 'assassinCross', maxRank: 10, unlock: [3, 8, 13, 18, 23, 28, 33, 38, 43, 48], sp: 20, cd: 6, power: 1.6, powerPer: 0.18, shape: 'area', radius: 3, fx: 'meteorCross', icon: 'impact', desc: 'A spinning assault that scatters a crowd.' }),
  edp: defineSkill('edp', { name: 'Enchant Deadly Poison', job: 'assassinCross', maxRank: 5, unlock: [10, 18, 26, 34, 42], sp: 26, cd: 20, shape: 'buff', power: 0.16, powerPer: 0.03, radius: 3, element: 'poison', fx: 'deadlyPoison', icon: 'poison', desc: 'Poison so potent it eats through anything.' }),
  cross_impact: defineSkill('cross_impact', { name: 'Cross Impact', job: 'guillotineCross', maxRank: 5, unlock: [1, 10, 20, 30, 40], sp: 32, cd: 12, power: 2.6, powerPer: 0.35, shape: 'strike', status: 'bleeding', statusTime: 4, fx: 'crossImpact', icon: 'slash', desc: 'Two blades cross in a single blinding impact.' }),
  rolling_cutter: defineSkill('rolling_cutter', { name: 'Rolling Cutter', job: 'guillotineCross', maxRank: 5, unlock: [5, 12, 19, 26, 33], sp: 28, cd: 9, power: 1.5, powerPer: 0.18, shape: 'area', radius: 3.4, status: 'bleeding', statusTime: 3, fx: 'rollingCutter', icon: 'spin', desc: 'Spin through the enemy line, blades extended.' }),

  // Rogue
  steal_coin: defineSkill('steal_coin', { name: 'Steal Coin', job: 'rogue', maxRank: 10, unlock: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], sp: 8, cd: 7, power: 1.5, powerPer: 0.14, shape: 'strike', fx: 'coinStrike', icon: 'coin', desc: 'Cut the purse strings while you cut the target.' }),
  back_stab: defineSkill('back_stab', { name: 'Back Stab', job: 'rogue', maxRank: 10, unlock: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29], sp: 12, cd: 6, power: 1.8, powerPer: 0.2, shape: 'strike', status: 'stun', statusTime: 1.2, fx: 'backstab', icon: 'dagger', desc: 'Step behind a target and drive the blade home.' }),
  raid: defineSkill('raid', { name: 'Raid', job: 'rogue', maxRank: 10, unlock: [6, 9, 12, 15, 18, 21, 24, 27, 30, 33], sp: 14, cd: 8, power: 1.4, powerPer: 0.14, shape: 'area', radius: 3, status: 'blind', statusTime: 3.4, fx: 'raid', icon: 'smoke', desc: 'Blind a whole crowd with a burst of smoke.' }),
  tunnel_drive: defineSkill('tunnel_drive', { name: 'Tunnel Drive', job: 'rogue', maxRank: 5, unlock: [4, 9, 14, 19, 24], shape: 'passive', passive: { speed: 0.02 }, icon: 'boots', desc: 'Move quietly and quickly.' }),
  strip_armor: defineSkill('strip_armor', { name: 'Strip Armor', job: 'rogue', maxRank: 5, unlock: [10, 15, 20, 25, 30], sp: 16, cd: 9, power: 1.5, powerPer: 0.16, shape: 'strike', status: 'curse', statusTime: 3.5, fx: 'stripArmor', icon: 'broken', desc: 'Loosen a foe’s straps and leave it exposed.' }),
  triangle_shot: defineSkill('triangle_shot', { name: 'Triangle Shot', job: 'stalker', maxRank: 10, unlock: [1, 6, 11, 16, 21, 26, 31, 36, 41, 46], sp: 18, cd: 6, power: 1.7, powerPer: 0.18, hits: 3, shape: 'strike', fx: 'triangleShot', icon: 'arrow', desc: 'Three arrows in a tight triangle.' }),
  full_strip: defineSkill('full_strip', { name: 'Full Strip', job: 'stalker', maxRank: 5, unlock: [10, 18, 26, 34, 42], sp: 22, cd: 14, power: 1.6, powerPer: 0.2, shape: 'strike', status: 'curse', statusTime: 4, fx: 'fullStrip', icon: 'broken', desc: 'Strip every piece of gear a foe wears.' }),
  manhole: defineSkill('manhole', { name: 'Manhole', job: 'shadowChaser', maxRank: 5, unlock: [1, 10, 20, 30, 40], sp: 28, cd: 14, power: 1.8, powerPer: 0.22, shape: 'strike', status: 'stun', statusTime: 2.4, fx: 'manhole', icon: 'shadow', desc: 'Drop a foe down a manhole and out of the fight.' }),
  feint_bomb: defineSkill('feint_bomb', { name: 'Feint Bomb', job: 'shadowChaser', maxRank: 5, unlock: [6, 13, 20, 27, 34], sp: 26, cd: 10, power: 1.9, powerPer: 0.24, shape: 'area', radius: 3.6, fx: 'feintBomb', icon: 'smoke', desc: 'Leave a decoy and detonate it behind the enemy.' }),

  // Monk
  iron_fists: defineSkill('iron_fists', { name: 'Iron Fists', job: 'monk', maxRank: 10, unlock: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], shape: 'passive', passive: { atk: 3 }, icon: 'fist', desc: 'Train bare hands until they strike like iron.' }),
  raging_trifecta: defineSkill('raging_trifecta', { name: 'Raging Trifecta Blow', job: 'monk', maxRank: 10, unlock: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28], sp: 12, cd: 5, power: 1.5, powerPer: 0.16, hits: 3, shape: 'strike', fx: 'trifecta', icon: 'fist', desc: 'A three-hit combination that ends in a heavy blow.' }),
  dodge: defineSkill('dodge', { name: 'Dodge', job: 'monk', maxRank: 10, unlock: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29], shape: 'passive', passive: { flee: 0.006, speed: 0.01 }, icon: 'wind', desc: 'Slip aside from blows before they land.' }),
  investigate: defineSkill('investigate', { name: 'Investigate', job: 'monk', maxRank: 10, unlock: [5, 8, 11, 14, 17, 20, 23, 26, 29, 32], sp: 14, cd: 6, power: 1.7, powerPer: 0.18, shape: 'strike', fx: 'investigate', icon: 'palm', desc: 'Read a foe’s defence and strike its centre.' }),
  chain_combo: defineSkill('chain_combo', { name: 'Chain Combo', job: 'monk', maxRank: 5, unlock: [12, 17, 22, 27, 32], sp: 16, cd: 6, power: 1.6, powerPer: 0.2, hits: 2, shape: 'strike', status: 'stun', statusTime: 1.2, fx: 'chainCombo', icon: 'chain', desc: 'Follow one blow with another before the foe recovers.' }),
  asura_strike: defineSkill('asura_strike', { name: 'Asura Strike', job: 'champion', maxRank: 5, unlock: [1, 10, 20, 30, 40], sp: 40, cd: 14, power: 3.2, powerPer: 0.45, shape: 'strike', status: 'stun', statusTime: 1.6, fx: 'asura', icon: 'asura', desc: 'Every drop of spirit spent in one world-shaking punch.' }),
  fury: defineSkill('fury', { name: 'Fury', job: 'champion', maxRank: 5, unlock: [5, 12, 19, 26, 33], sp: 22, cd: 18, shape: 'buff', power: 0.14, powerPer: 0.025, radius: 3.5, fx: 'furyAura', icon: 'chi', desc: 'Gather spirit spheres until your fists glow.' }),
  tiger_knuckle: defineSkill('tiger_knuckle', { name: 'Tiger Knuckle Fist', job: 'sura', maxRank: 5, unlock: [1, 10, 20, 30, 40], sp: 30, cd: 12, power: 2.2, powerPer: 0.3, shape: 'strike', fx: 'tigerKnuckle', icon: 'fist', desc: 'A dragon-fist strike that drains the target.' }),
  gate_of_hell: defineSkill('gate_of_hell', { name: 'Gate of Hell', job: 'sura', maxRank: 5, unlock: [8, 16, 24, 32, 40], sp: 34, cd: 14, power: 1.9, powerPer: 0.24, shape: 'area', radius: 4.2, element: 'ghost', fx: 'gateOfHell', icon: 'hell', desc: 'Open a gate to the underworld beneath your foes.' }),

  // Bard
  musical_lesson: defineSkill('musical_lesson', { name: 'Musical Lesson', job: 'bard', maxRank: 10, unlock: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], shape: 'passive', passive: { matk: 3, sp: 6 }, icon: 'note', desc: 'Practice until every note carries power.' }),
  arrow_vulcan: defineSkill('arrow_vulcan', { name: 'Arrow Vulcan', job: 'bard', maxRank: 10, unlock: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28], sp: 16, cd: 6, power: 1.8, powerPer: 0.18, hits: 3, shape: 'strike', fx: 'arrowVulcan', icon: 'arrow', desc: 'A rapid volley driven by song.' }),
  dissonance: defineSkill('dissonance', { name: 'Dissonance', job: 'bard', maxRank: 10, unlock: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30], sp: 14, cd: 6, power: 1.3, powerPer: 0.12, shape: 'area', radius: 3.4, element: 'ghost', fx: 'soundWave', icon: 'note', desc: 'A discordant blast that rattles a whole crowd.' }),
  song_of_bravery: defineSkill('song_of_bravery', { name: 'Song of Bravery', job: 'bard', maxRank: 10, unlock: [6, 10, 14, 18, 22, 26, 30, 34, 38, 42], sp: 18, cd: 18, shape: 'buff', power: 0.07, powerPer: 0.012, radius: 5, fx: 'braverySong', icon: 'song', desc: 'A rousing chorus lifts the attack of every ally nearby.' }),
  apple_of_idun: defineSkill('apple_of_idun', { name: 'Apple of Idun', job: 'bard', maxRank: 10, unlock: [10, 14, 18, 22, 26, 30, 34, 38, 42, 46], sp: 20, cd: 20, shape: 'heal', power: 30, powerPer: 9, radius: 6, fx: 'idunApple', icon: 'apple', desc: 'An old song that restores the party’s health.' }),
  clown_arrow: defineSkill('clown_arrow', { name: 'Arrow Vulcan', job: 'clown', maxRank: 10, unlock: [1, 6, 11, 16, 21, 26, 31, 36, 41, 46], sp: 18, cd: 6, power: 2, powerPer: 0.22, hits: 3, shape: 'strike', fx: 'arrowVulcan', icon: 'arrow', desc: 'A perfected volley that never misses.' }),
  tarot_card: defineSkill('tarot_card', { name: 'Tarot Card of Fate', job: 'clown', maxRank: 5, unlock: [8, 16, 24, 32, 40], sp: 24, cd: 12, power: 1.7, powerPer: 0.22, shape: 'area', radius: 3.6, status: 'curse', statusTime: 4, fx: 'tarot', icon: 'card', desc: 'Draw a card and let fate strike the enemy.' }),
  severe_rainstorm: defineSkill('severe_rainstorm', { name: 'Severe Rainstorm', job: 'minstrel', maxRank: 5, unlock: [1, 10, 20, 30, 40], sp: 32, cd: 12, power: 1.8, powerPer: 0.24, shape: 'area', radius: 4.4, fx: 'rainstorm', icon: 'storm', desc: 'Call down a storm of arrows and rain on the field.' }),

  // Dancer
  dance_lesson: defineSkill('dance_lesson', { name: 'Dance Lesson', job: 'dancer', maxRank: 10, unlock: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], shape: 'passive', passive: { matk: 3, sp: 6 }, icon: 'note', desc: 'Practice until every step carries power.' }),
  slinging_arrow: defineSkill('slinging_arrow', { name: 'Slinging Arrow', job: 'dancer', maxRank: 10, unlock: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28], sp: 14, cd: 6, power: 1.6, powerPer: 0.16, shape: 'strike', status: 'blind', statusTime: 3, fx: 'slingingArrow', icon: 'arrow', desc: 'A whirling kick-shot that leaves the foe blinking.' }),
  ugly_dance: defineSkill('ugly_dance', { name: 'Ugly Dance', job: 'dancer', maxRank: 10, unlock: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30], sp: 16, cd: 8, power: 1.2, powerPer: 0.12, shape: 'area', radius: 3.4, status: 'silence', statusTime: 3, fx: 'uglyDance', icon: 'note', desc: 'A maddening dance that silences casters.' }),
  dance_of_vigour: defineSkill('dance_of_vigour', { name: 'Dance of Vigour', job: 'dancer', maxRank: 10, unlock: [6, 10, 14, 18, 22, 26, 30, 34, 38, 42], sp: 18, cd: 18, shape: 'buff', power: 0.06, powerPer: 0.01, radius: 5, fx: 'vigourDance', icon: 'dance', desc: 'A spinning dance that renews the party’s fighting spirit.' }),
  focus_deadly: defineSkill('focus_deadly', { name: 'Focus Deadly', job: 'dancer', maxRank: 10, unlock: [10, 14, 18, 22, 26, 30, 34, 38, 42, 46], sp: 16, cd: 16, shape: 'buff', power: 0.06, powerPer: 0.012, radius: 4.5, fx: 'deadlyFocus', icon: 'eye', desc: 'A dance that raises the party’s critical rate.' }),
  gypsy_card: defineSkill('gypsy_card', { name: 'Gypsy’s Kiss', job: 'gypsy', maxRank: 10, unlock: [1, 6, 11, 16, 21, 26, 31, 36, 41, 46], sp: 20, cd: 7, power: 1.9, powerPer: 0.2, shape: 'strike', status: 'stun', statusTime: 1.8, fx: 'gypsyKiss', icon: 'kiss', desc: 'A kiss that knocks a foe senseless.' }),
  sorrow_dance: defineSkill('sorrow_dance', { name: 'Sorrow Dance', job: 'wanderer', maxRank: 5, unlock: [1, 10, 20, 30, 40], sp: 30, cd: 12, power: 1.7, powerPer: 0.2, shape: 'area', radius: 4.2, status: 'curse', statusTime: 4, fx: 'sorrowDance', icon: 'dance', desc: 'A lament that saps the enemy’s will to fight.' }),

  // Alchemist
  learning_potion: defineSkill('learning_potion', { name: 'Learning Potion', job: 'alchemist', maxRank: 10, unlock: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], shape: 'passive', passive: { hp: 18 }, icon: 'flask', desc: 'Every potion you brew works a little better.' }),
  acid_terror: defineSkill('acid_terror', { name: 'Acid Terror', job: 'alchemist', maxRank: 10, unlock: [1, 5, 9, 13, 17, 21, 25, 29, 33, 37], sp: 16, cd: 6, power: 1.6, powerPer: 0.18, shape: 'strike', status: 'poison', statusTime: 4, fx: 'acidSpray', icon: 'flask', desc: 'Hurl acid that eats through armour and flesh.' }),
  potion_pitcher: defineSkill('potion_pitcher', { name: 'Potion Pitcher', job: 'alchemist', maxRank: 5, unlock: [2, 7, 12, 17, 22], sp: 12, cd: 7, shape: 'heal', power: 40, powerPer: 14, radius: 6, fx: 'potionToss', icon: 'potion', desc: 'Toss a healing flask to the ally who needs it most.' }),
  demonstration: defineSkill('demonstration', { name: 'Demonstration', job: 'alchemist', maxRank: 10, unlock: [6, 10, 14, 18, 22, 26, 30, 34, 38, 42], sp: 18, cd: 8, power: 1.3, powerPer: 0.14, shape: 'area', radius: 3.2, element: 'fire', status: 'burning', statusTime: 4, fx: 'acidDemonstration', icon: 'flask', desc: 'A volatile flask that floods a wide area with fire.' }),
  summon_flora: defineSkill('summon_flora', { name: 'Summon Flora', job: 'alchemist', maxRank: 5, unlock: [8, 14, 20, 26, 32], sp: 20, cd: 14, shape: 'summon', radius: 2, fx: 'summonFlora', summon: 'flora', icon: 'plant', desc: 'Grow a homunculus that fights beside you.' }),
  creator_acid: defineSkill('creator_acid', { name: 'Acid Demonstration', job: 'creator', maxRank: 10, unlock: [1, 6, 11, 16, 21, 26, 31, 36, 41, 46], sp: 24, cd: 8, power: 2, powerPer: 0.24, shape: 'strike', status: 'poison', statusTime: 5, fx: 'acidBomb', icon: 'flask', desc: 'A concentrated acid bomb that melts armour.' }),
  full_chemical_protection: defineSkill('full_chemical_protection', { name: 'Full Chemical Protection', job: 'creator', maxRank: 5, unlock: [8, 16, 24, 32, 40], sp: 26, cd: 16, shape: 'buff', power: 0.1, powerPer: 0.02, radius: 4.5, fx: 'chemicalProtection', icon: 'shield', desc: 'Protect the party’s gear from breakage.' }),
  cart_cannon: defineSkill('cart_cannon', { name: 'Cart Cannon', job: 'genetic', maxRank: 5, unlock: [1, 10, 20, 30, 40], sp: 34, cd: 12, power: 2.1, powerPer: 0.26, shape: 'area', radius: 4, element: 'fire', fx: 'cartCannon', icon: 'cart', desc: 'Fire the cart’s cannon at the enemy line.' }),

  // ==========================================================================
  // Expanded lines
  // ==========================================================================
  tk_kick: defineSkill('tk_kick', { name: 'Taekwon Kick', job: 'taekwon', maxRank: 10, unlock: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28], sp: 12, cd: 4.5, power: 1.7, powerPer: 0.16, shape: 'strike', fx: 'spinKick', icon: 'kick', desc: 'A whirling kick that lands from an unexpected angle.' }),
  tk_tornado: defineSkill('tk_tornado', { name: 'Tornado Kick', job: 'taekwon', maxRank: 10, unlock: [5, 8, 11, 14, 17, 20, 23, 26, 29, 32], sp: 14, cd: 6, power: 1.4, powerPer: 0.14, shape: 'area', radius: 3, fx: 'tornadoKick', icon: 'kick', desc: 'Spin through the enemy line with both legs.' }),
  tk_roundhouse: defineSkill('tk_roundhouse', { name: 'Roundhouse Kick', job: 'taekwon', maxRank: 10, unlock: [8, 12, 16, 20, 24, 28, 32, 36, 40, 44], sp: 16, cd: 7, power: 1.6, powerPer: 0.18, shape: 'strike', status: 'stun', statusTime: 1.4, fx: 'roundhouse', icon: 'kick', desc: 'A full-body spin that ends in the jaw.' }),
  star_mark: defineSkill('star_mark', { name: 'Star Mark', job: 'starGladiator', maxRank: 5, unlock: [1, 8, 16, 24, 32], sp: 22, cd: 12, power: 1.9, powerPer: 0.22, shape: 'strike', element: 'holy', fx: 'starMark', icon: 'star', desc: 'Mark a foe with the stars and burn it down.' }),
  solar_wrath: defineSkill('solar_wrath', { name: 'Solar Wrath', job: 'starGladiator', maxRank: 5, unlock: [6, 14, 22, 30, 38], sp: 24, cd: 12, power: 1.7, powerPer: 0.22, shape: 'area', radius: 3.6, element: 'fire', fx: 'solarWrath', icon: 'sun', desc: 'The sun’s fury falls on a wide arc.' }),
  ninja_shuriken: defineSkill('ninja_shuriken', { name: 'Throw Shuriken', job: 'ninja', maxRank: 10, unlock: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28], sp: 10, cd: 3.5, power: 1.5, powerPer: 0.15, shape: 'strike', fx: 'shuriken', icon: 'shuriken', desc: 'A spinning blade thrown from the shadows.' }),
  ninja_kunai: defineSkill('ninja_kunai', { name: 'Throw Kunai', job: 'ninja', maxRank: 10, unlock: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30], sp: 12, cd: 4, power: 1.7, powerPer: 0.17, shape: 'strike', status: 'bleeding', statusTime: 4, fx: 'kunai', icon: 'kunai', desc: 'A heavy blade that leaves a deep wound.' }),
  ninja_fire: defineSkill('ninja_fire', { name: 'Crimson Fire Blossom', job: 'ninja', maxRank: 10, unlock: [8, 12, 16, 20, 24, 28, 32, 36, 40, 44], sp: 20, cd: 7, power: 1.4, powerPer: 0.16, shape: 'area', radius: 3.6, element: 'fire', status: 'burning', statusTime: 4, fx: 'fireBlossom', icon: 'fire', desc: 'A blossom of fire blooms among the enemy.' }),
  ninja_ice: defineSkill('ninja_ice', { name: 'Frost Weave', job: 'kagerou', maxRank: 5, unlock: [1, 10, 20, 30, 40], sp: 26, cd: 10, power: 1.7, powerPer: 0.2, shape: 'area', radius: 4, element: 'water', status: 'freeze', statusTime: 2.4, fx: 'iceWeave', icon: 'ice', desc: 'Weave ice through the enemy formation.' }),
  gunslinger_pistol: defineSkill('gunslinger_pistol', { name: 'Single Action', job: 'gunslinger', maxRank: 10, unlock: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28], sp: 12, cd: 3.5, power: 1.7, powerPer: 0.16, shape: 'strike', fx: 'pistolShot', icon: 'pistol', desc: 'One clean shot, straight to the mark.' }),
  gunslinger_rapid: defineSkill('gunslinger_rapid', { name: 'Rapid Shower', job: 'gunslinger', maxRank: 10, unlock: [5, 8, 11, 14, 17, 20, 23, 26, 29, 32], sp: 16, cd: 6, power: 1.2, powerPer: 0.12, hits: 4, shape: 'area', radius: 2.6, fx: 'rapidShot', icon: 'bullets', desc: 'Empty the cylinders into a crowd.' }),
  gunslinger_desperado: defineSkill('gunslinger_desperado', { name: 'Desperado', job: 'rebellion', maxRank: 5, unlock: [1, 10, 20, 30, 40], sp: 30, cd: 12, power: 1.9, powerPer: 0.24, shape: 'area', radius: 4.2, status: 'bleeding', statusTime: 4, fx: 'desperado', icon: 'bullets', desc: 'Fire in every direction at once.' }),
  doram_bite: defineSkill('doram_bite', { name: 'Pickypet Bite', job: 'doram', maxRank: 10, unlock: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28], sp: 12, cd: 4, power: 1.6, powerPer: 0.16, shape: 'strike', fx: 'beastBite', icon: 'paw', desc: 'Your animal companion bites hard.' }),
  doram_heal: defineSkill('doram_heal', { name: 'Purring Heal', job: 'doram', maxRank: 10, unlock: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30], sp: 14, cd: 5, shape: 'heal', power: 38, powerPer: 12, radius: 6, fx: 'purringHeal', icon: 'paw', desc: 'A soothing purr that mends the party.' }),
  // --- Second wave: distinctive skills that fill out the thin lines ----------
  // Super Novice keeps the Novice kit but borrows the first-job basics.
  sn_bolt: defineSkill('sn_bolt', { name: 'Bolt of Choice', job: 'superNovice', maxRank: 10, unlock: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28], sp: 12, cd: 5, power: 1.6, powerPer: 0.16, shape: 'strike', element: 'fire', fx: 'fireBolt', icon: 'fireBolt', desc: 'A Super Novice’s borrowed bolt: every element, badly.' }),
  sn_magnum: defineSkill('sn_magnum', { name: 'Novice Magnum', job: 'superNovice', maxRank: 5, unlock: [5, 10, 15, 20, 25], sp: 14, cd: 7, power: 1.2, powerPer: 0.12, shape: 'area', radius: 3, element: 'fire', status: 'burning', statusTime: 3, fx: 'firePillar', icon: 'fire', desc: 'Borrowed swordplay with borrowed fire.' }),
  sn_heal: defineSkill('sn_heal', { name: 'Novice Aid', job: 'superNovice', maxRank: 10, unlock: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29], sp: 10, cd: 5, shape: 'heal', power: 34, powerPer: 9, radius: 5, fx: 'heal', icon: 'heal', desc: 'Field medicine for yourself and anyone nearby.' }),
  // Gunslinger
  gun_coin: defineSkill('gun_coin', { name: 'Coin Flip', job: 'gunslinger', maxRank: 10, unlock: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], shape: 'passive', passive: { crit: 0.005, atk: 2 }, icon: 'coin', desc: 'Call it right and the next shot hits twice as hard.' }),
  gun_tracking: defineSkill('gun_tracking', { name: 'Tracking', job: 'gunslinger', maxRank: 5, unlock: [8, 13, 18, 23, 28], sp: 16, cd: 8, power: 1.8, powerPer: 0.2, shape: 'strike', status: 'blind', statusTime: 4, fx: 'pistolShot', icon: 'eye', desc: 'Mark a target and never lose it.' }),
  gun_fullbuster: defineSkill('gun_fullbuster', { name: 'Full Buster', job: 'gunslinger', maxRank: 5, unlock: [10, 16, 22, 28, 34], sp: 20, cd: 9, power: 2.2, powerPer: 0.28, shape: 'area', radius: 2.8, status: 'stun', statusTime: 1.4, fx: 'rapidShot', icon: 'bullets', desc: 'Empty the entire magazine into one spot.' }),
  // Ninja
  ninja_kagebunshin: defineSkill('ninja_kagebunshin', { name: 'Shadow Clone', job: 'ninja', maxRank: 5, unlock: [10, 15, 20, 25, 30], sp: 20, cd: 16, shape: 'buff', power: 0.08, powerPer: 0.015, radius: 4, fx: 'shadowCloak', icon: 'shadow', desc: 'A clone fights in your place.' }),
  ninja_lightning: defineSkill('ninja_lightning', { name: 'Lightning Spear', job: 'ninja', maxRank: 10, unlock: [6, 10, 14, 18, 22, 26, 30, 34, 38, 42], sp: 16, cd: 6, power: 1.7, powerPer: 0.18, shape: 'area', radius: 3.2, element: 'wind', status: 'stun', statusTime: 1.2, fx: 'jupitel', icon: 'bolt', desc: 'A spear of lightning thrown through the enemy line.' }),
  kagerou_shuriken: defineSkill('kagerou_shuriken', { name: 'Shadow Shuriken', job: 'kagerou', maxRank: 5, unlock: [5, 12, 19, 26, 33], sp: 24, cd: 8, power: 1.8, powerPer: 0.22, shape: 'area', radius: 3.4, status: 'bleeding', statusTime: 4, fx: 'shuriken', icon: 'shuriken', desc: 'A storm of blades from every shadow.' }),
  oboro_dance: defineSkill('oboro_dance', { name: 'Veil Dance', job: 'oboro', maxRank: 5, unlock: [5, 12, 19, 26, 33], sp: 22, cd: 9, power: 1.6, powerPer: 0.2, shape: 'area', radius: 3.6, element: 'water', status: 'slow', statusTime: 4, fx: 'iceWeave', icon: 'dance', desc: 'A dance that blurs the enemy’s sight.' }),
  // Taekwon / Star Gladiator
  tk_counter: defineSkill('tk_counter', { name: 'Counter Kick', job: 'taekwon', maxRank: 7, unlock: [3, 7, 11, 15, 19, 23, 27], sp: 10, cd: 4, power: 1.5, powerPer: 0.15, shape: 'strike', status: 'stun', statusTime: 1.2, fx: 'spinKick', icon: 'kick', desc: 'Catch a charge with a rising heel.' }),
  tk_flying: defineSkill('tk_flying', { name: 'Flying Kick', job: 'taekwon', maxRank: 7, unlock: [7, 11, 15, 19, 23, 27, 31], sp: 14, cd: 6, power: 1.9, powerPer: 0.2, shape: 'area', radius: 2.6, status: 'stun', statusTime: 1.6, fx: 'tornadoKick', icon: 'kick', desc: 'A leaping kick that sends the pack flying.' }),
  sg_nova: defineSkill('sg_nova', { name: 'Nova Kick', job: 'starGladiator', maxRank: 5, unlock: [10, 18, 26, 34, 42], sp: 24, cd: 11, power: 2, powerPer: 0.26, shape: 'area', radius: 3, element: 'fire', status: 'burning', statusTime: 4, fx: 'solarWrath', icon: 'sun', desc: 'A supernova in the shape of a heel.' }),
  se_union: defineSkill('se_union', { name: 'Union of Stars', job: 'starEmperor', maxRank: 5, unlock: [8, 16, 24, 32, 40], sp: 28, cd: 14, power: 1.9, powerPer: 0.24, shape: 'area', radius: 4, element: 'holy', fx: 'starMark', icon: 'star', desc: 'Three constellations strike at once.' }),
  // Soul Linker / Reaper
  sl_eske: defineSkill('sl_eske', { name: 'Eske', job: 'soulLinker', maxRank: 7, unlock: [1, 5, 9, 13, 17, 21, 25], sp: 14, cd: 6, power: 1.7, powerPer: 0.18, shape: 'strike', element: 'ghost', fx: 'soulBlast', icon: 'soul', desc: 'Link a foe’s soul to your own strike.' }),
  sl_kaina: defineSkill('sl_kaina', { name: 'Kaina', job: 'soulLinker', maxRank: 5, unlock: [6, 12, 18, 24, 30], sp: 18, cd: 12, shape: 'buff', power: 0.09, powerPer: 0.015, radius: 4.5, fx: 'soulLink', icon: 'link', desc: 'Link the party so their strength is shared.' }),
  sr_soulcollect: defineSkill('sr_soulcollect', { name: 'Soul Collect', job: 'soulReaper', maxRank: 5, unlock: [1, 8, 16, 24, 32], sp: 24, cd: 9, power: 1.8, powerPer: 0.22, shape: 'area', radius: 3.6, element: 'ghost', fx: 'soulDrain', icon: 'soul', desc: 'Harvest the spirits of everything nearby.' }),
  // Doram
  doram_tail: defineSkill('doram_tail', { name: 'Tail Swing', job: 'doram', maxRank: 10, unlock: [5, 8, 11, 14, 17, 20, 23, 26, 29, 32], sp: 14, cd: 6, power: 1.4, powerPer: 0.14, shape: 'area', radius: 3, status: 'stun', statusTime: 1.2, fx: 'beastBite', icon: 'paw', desc: 'A heavy tail sweep that knocks a crowd over.' }),
  doram_silvervine: defineSkill('doram_silvervine', { name: 'Silvervine', job: 'doram', maxRank: 5, unlock: [10, 16, 22, 28, 34], sp: 20, cd: 14, shape: 'buff', power: 0.1, powerPer: 0.02, radius: 5, fx: 'purringHeal', icon: 'paw', desc: 'Silvervine lifts the whole party’s spirits.' }),
  sh_beast: defineSkill('sh_beast', { name: 'Spirit Beast', job: 'spiritHandler', maxRank: 5, unlock: [1, 8, 16, 24, 32], sp: 26, cd: 10, power: 2, powerPer: 0.24, shape: 'area', radius: 3.4, element: 'earth', fx: 'beastBite', icon: 'paw', desc: 'A spirit-bound beast charges the line.' }),
  sh_mend: defineSkill('sh_mend', { name: 'Spirit Mend', job: 'spiritHandler', maxRank: 10, unlock: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30], sp: 16, cd: 6, shape: 'heal', power: 42, powerPer: 13, radius: 6, fx: 'purringHeal', icon: 'heal', desc: 'Spirits stitch the party back together.' }),
  soul_link: defineSkill('soul_link', { name: 'Soul Link', job: 'soulLinker', maxRank: 5, unlock: [1, 8, 16, 24, 32], sp: 20, cd: 14, shape: 'buff', power: 0.1, powerPer: 0.02, radius: 4.5, fx: 'soulLink', icon: 'soul', desc: 'Link souls to share strength across the party.' }),
};

// Per-family build presets. A build is a rotation: the skills the AI prioritises
// and the stats the player should lean on. Sniper is the reference three-build
// class (trap / auto-attack / falcon); every family gets at least two.
export const SKILL_BUILDS = {
  novice: [
    { id: 'novice-swing', name: 'Swing It Out', style: 'frontline', rotation: 'single-threat', skills: ['novice_sword', 'novice_guard'], lean: 'STR · VIT', blurb: 'Swordplay first: swing, guard, swing again.' },
    { id: 'novice-firstaid', name: 'Self-Reliant', style: 'support', rotation: 'sustain', skills: ['first_aid', 'novice_guard'], lean: 'VIT · INT', blurb: 'Patch yourself up and keep walking.' },
  ],
  swordsman: [
    { id: 'sword-vanguard', name: 'Vanguard', style: 'frontline', rotation: 'single-threat', skills: ['magnum_break', 'bash'], lean: 'STR · VIT', blurb: 'Open with Magnum Break, then hammer the biggest threat.' },
    { id: 'sword-guard', name: 'Field Guard', style: 'tank', rotation: 'guard-taunt', skills: ['provoke', 'endure'], lean: 'VIT · STR', blurb: 'Provoke everything and Endure the retaliation.' },
  ],
  mage: [
    { id: 'mage-bolts', name: 'Bolt Caster', style: 'ranged', rotation: 'elemental-chain', skills: ['fire_bolt', 'cold_bolt', 'lightning_bolt'], lean: 'INT · DEX', blurb: 'Rotate the three bolts to hit every elemental weakness.' },
    { id: 'mage-control', name: 'Frost Initiate', style: 'control', rotation: 'freeze-control', skills: ['frost_diver', 'fire_wall'], lean: 'INT · VIT', blurb: 'Freeze the pack, then wall them in with fire.' },
  ],
  archer: [
    { id: 'archer-volley', name: 'Arrow Volley', style: 'ranged', rotation: 'arrow-volley', skills: ['double_strafe', 'arrow_shower'], lean: 'DEX · AGI', blurb: 'Double Strafe on cooldown with Arrow Shower for packs.' },
    { id: 'archer-scout', name: 'Field Scout', style: 'ranged', rotation: 'focus-fire', skills: ['double_strafe'], lean: 'DEX · LUK', blurb: 'Concentrate, then delete one target at a time.' },
  ],
  acolyte: [
    { id: 'acolyte-healer', name: 'Field Healer', style: 'support', rotation: 'heal-buff-cleanse', skills: ['heal', 'blessing'], lean: 'INT · DEX', blurb: 'Heal first, bless on the way back.' },
    { id: 'acolyte-striker', name: 'Holy Striker', style: 'ranged', rotation: 'holy-exorcism', skills: ['holy_light', 'heal'], lean: 'INT · DEX', blurb: 'Holy Light the undead, patch the party between pulls.' },
  ],
  merchant: [
    { id: 'merchant-brawler', name: 'Cart Brawler', style: 'frontline', rotation: 'smith-cleave', skills: ['cart_revolution', 'mammonite'], lean: 'STR · VIT', blurb: 'Mammonite single targets, Cart Revolution for packs.' },
    { id: 'merchant-supply', name: 'Supply Keeper', style: 'support', rotation: 'party-enchant', skills: ['pushcart', 'mammonite'], lean: 'VIT · STR', blurb: 'Keep the cart up and the party supplied.' },
  ],
  thief: [
    { id: 'thief-poison', name: 'Quickblade', style: 'frontline', rotation: 'rapid-poison', skills: ['envenom', 'sand_attack'], lean: 'AGI · STR', blurb: 'Poison, blind, and let the damage-over-time finish it.' },
    { id: 'thief-trickster', name: 'Field Trickster', style: 'control', rotation: 'debuff-control', skills: ['sand_attack', 'hiding'], lean: 'AGI · LUK', blurb: 'Blind the pack and pick them apart from the shadows.' },
  ],
  knight: [
    { id: 'knight-lancer', name: 'Spear Lancer', style: 'tank', rotation: 'spear-line', skills: ['brandish_spear', 'pierce'], lean: 'STR · VIT', blurb: 'Brandish to gather, Pierce to punish.' },
    { id: 'knight-berserker', name: 'Berserker', style: 'frontline', rotation: 'bowling-bash', skills: ['bowling_bash', 'concentration_knight'], lean: 'STR · AGI', blurb: 'Concentrate, then Bowling Bash through the line.' },
  ],
  lordKnight: [
    { id: 'lk-lancer', name: 'Spiral Lancer', style: 'tank', rotation: 'spear-line', skills: ['spiral_pierce', 'brandish_spear'], lean: 'STR · VIT', blurb: 'Spiral Pierce the priority target while drawing aggro.' },
    { id: 'lk-berserker', name: 'Berserk Charge', style: 'frontline', rotation: 'berserk-rush', skills: ['berserk', 'joint_beat'], lean: 'STR · AGI', blurb: 'Berserk, then cripple everything with Joint Beat.' },
  ],
  runeKnight: [
    { id: 'rk-breath', name: 'Dragon Breath', style: 'tank', rotation: 'dragon-breath', skills: ['dragon_breath', 'ignition_break'], lean: 'VIT · STR', blurb: 'Breathe fire across the field and ignite the survivors.' },
    { id: 'rk-spear', name: 'Hundred Spears', style: 'frontline', rotation: 'rune-spear', skills: ['hundred_spear', 'rune_mastery'], lean: 'STR · DEX', blurb: 'Rune, then rain spears until nothing stands.' },
  ],
  crusader: [
    { id: 'crusader-holy', name: 'Holy Guardian', style: 'tank', rotation: 'holy-cleave', skills: ['grand_cross', 'divine_protection_crusader'], lean: 'VIT · INT', blurb: 'Grand Cross the pack and shield the party.' },
    { id: 'crusader-shield', name: 'Shield Basher', style: 'tank', rotation: 'shield-charge', skills: ['shield_charge', 'smite'], lean: 'VIT · STR', blurb: 'Charge in, smite, repeat.' },
  ],
  paladin: [
    { id: 'paladin-guardian', name: 'Guardian', style: 'tank', rotation: 'holy-cleave', skills: ['gospel', 'sacrifice_paladin'], lean: 'VIT · INT', blurb: 'Gospel up, soak damage, punish with Sacrifice.' },
    { id: 'paladin-devotion', name: 'Devoted Shield', style: 'support', rotation: 'devotion', skills: ['devotion', 'shield_charge'], lean: 'VIT · STR', blurb: 'Devotion on the carry, then body-block everything.' },
  ],
  royalGuard: [
    { id: 'rg-shield', name: 'Shield Force', style: 'tank', rotation: 'shield-charge', skills: ['shield_spell', 'earth_drive'], lean: 'VIT · STR', blurb: 'Shield Spell the crowd, Earth Drive the survivors.' },
    { id: 'rg-guardian', name: 'Royal Guardian', style: 'support', rotation: 'devotion', skills: ['devotion', 'earth_drive'], lean: 'VIT · INT', blurb: 'A wall of devotion with the ground itself as a weapon.' },
  ],
  priest: [
    { id: 'priest-healer', name: 'Field Healer', style: 'support', rotation: 'heal-buff-cleanse', skills: ['sanctuary', 'blessing_priest', 'increase_agi'], lean: 'INT · DEX', blurb: 'Sanctuary for the party, buffs between pulls.' },
    { id: 'priest-exorcist', name: 'Exorcist', style: 'ranged', rotation: 'holy-cleave', skills: ['magnus_exorcismus', 'lex_divina'], lean: 'INT · VIT', blurb: 'Lex Divina, then Magnus the undead into dust.' },
    { id: 'priest-support', name: 'Battle Priest', style: 'support', rotation: 'party-enchant', skills: ['aspen', 'kyrie_eleison'], lean: 'INT · DEX', blurb: 'Aspersio the weapons, Kyrie the front line.' },
  ],
  highPriest: [
    { id: 'hp-healer', name: 'High Healer', style: 'support', rotation: 'heal-buff-cleanse', skills: ['high_sanctuary', 'assumptio'], lean: 'INT · DEX', blurb: 'High Sanctuary plus Assumptio keeps anything alive.' },
    { id: 'hp-exorcist', name: 'Holy Exorcist', style: 'ranged', rotation: 'holy-cleave', skills: ['magnus_exorcismus', 'meditatio'], lean: 'INT · VIT', blurb: 'Max Meditatio, then Magnus every pack.' },
  ],
  archBishop: [
    { id: 'ab-healer', name: 'Basilica', style: 'support', rotation: 'heal-buff-cleanse', skills: ['basilica', 'coluceo_heal'], lean: 'INT · DEX', blurb: 'Basilica the party and chain-heal through it.' },
    { id: 'ab-judgement', name: 'Judgement', style: 'ranged', rotation: 'holy-cleave', skills: ['judex', 'coluceo_heal'], lean: 'INT · VIT', blurb: 'Judex the pack, Coluceo the party.' },
  ],
  wizard: [
    { id: 'wizard-area', name: 'Elemental AoE', style: 'ranged', rotation: 'elemental-aoe', skills: ['storm_gust', 'lord_of_vermilion', 'meteor_storm'], lean: 'INT · DEX', blurb: 'Rotate the three big AoE spells and never let the field cool.' },
    { id: 'wizard-burst', name: 'Frost Burst', style: 'control', rotation: 'freeze-control', skills: ['frost_nova', 'storm_gust'], lean: 'INT · VIT', blurb: 'Nova to freeze, Storm Gust to finish.' },
    { id: 'wizard-bolt', name: 'Bolt Spam', style: 'ranged', rotation: 'elemental-chain', skills: ['fire_ball', 'jupitel_thunder'], lean: 'INT · DEX', blurb: 'Fast single-target casts for low HP targets.' },
  ],
  highWizard: [
    { id: 'hw-area', name: 'Arcane Artillery', style: 'ranged', rotation: 'elemental-aoe', skills: ['meteor_storm', 'lord_of_vermilion'], lean: 'INT · DEX', blurb: 'Amplify, then drop meteors on everything.' },
    { id: 'hw-ghost', name: 'Ghost Flurry', style: 'ranged', rotation: 'elemental-chain', skills: ['napalm_vulcan'], lean: 'INT · VIT', blurb: 'Ghost damage that nothing resists.' },
  ],
  warlock: [
    { id: 'wl-comet', name: 'Comet Fall', style: 'ranged', rotation: 'elemental-aoe', skills: ['comet', 'chain_lightning'], lean: 'INT · DEX', blurb: 'Comet into Chain Lightning for a field wipe.' },
    { id: 'wl-artillery', name: 'Storm Battery', style: 'ranged', rotation: 'elemental-aoe', skills: ['chain_lightning', 'meteor_storm'], lean: 'INT · VIT', blurb: 'Endless elemental pressure.' },
  ],
  sage: [
    { id: 'sage-control', name: 'Spell Breaker', style: 'control', rotation: 'debuff-control', skills: ['spell_breaker', 'dispell'], lean: 'INT · DEX', blurb: 'Silence and dispel, then clean up.' },
    { id: 'sage-endow', name: 'Endow Support', style: 'support', rotation: 'party-enchant', skills: ['endow_blade', 'magnetic_earth'], lean: 'INT · VIT', blurb: 'Endow the weapons, pin the enemy.' },
  ],
  professor: [
    { id: 'prof-double', name: 'Double Casting', style: 'ranged', rotation: 'elemental-aoe', skills: ['double_casting', 'soul_change'], lean: 'INT · DEX', blurb: 'Double Cast everything and drain souls for SP.' },
    { id: 'prof-control', name: 'Field Professor', style: 'control', rotation: 'debuff-control', skills: ['spell_breaker', 'double_casting'], lean: 'INT · VIT', blurb: 'Silence the casters and freeze the rest.' },
  ],
  sorcerer: [
    { id: 'sorc-ice', name: 'Diamond Dust', style: 'ranged', rotation: 'freeze-control', skills: ['diamond_dust', 'psychic_wave'], lean: 'INT · DEX', blurb: 'Freeze with Diamond Dust, detonate with Psychic Wave.' },
    { id: 'sorc-psychic', name: 'Psychic Wave', style: 'ranged', rotation: 'elemental-aoe', skills: ['psychic_wave', 'diamond_dust'], lean: 'INT · VIT', blurb: 'Ghost-typed pressure that ignores most defences.' },
  ],
  hunter: [
    { id: 'hunter-falcon', name: 'Falcon', style: 'ranged', rotation: 'falcon-proc', skills: ['blitz_beat', 'steel_crow'], lean: 'DEX · LUK', blurb: 'Blitz Beat on cooldown; the falcon does the rest.' },
    { id: 'hunter-trapper', name: 'Trapper', style: 'control', rotation: 'trap-zone', skills: ['ankle_snare', 'land_mine', 'claymore_trap'], lean: 'DEX · INT', blurb: 'Snare the pack, then blow it up with mines.' },
    { id: 'hunter-bow', name: 'Bow Volley', style: 'ranged', rotation: 'arrow-volley', skills: ['arrow_shower', 'arrow_repel'], lean: 'DEX · AGI', blurb: 'Straight arrow pressure with knockback for safety.' },
  ],
  sniper: [
    { id: 'sniper-trap', name: 'Trap Master', style: 'control', rotation: 'trap-zone', skills: ['ankle_snare', 'land_mine', 'claymore_trap'], lean: 'DEX · INT', blurb: 'Zone the field with snares and mines, then detonate.' },
    { id: 'sniper-auto', name: 'Auto-Attack', style: 'ranged', rotation: 'rapid-crit', skills: ['focused_arrow_strike', 'true_sight'], lean: 'DEX · AGI · LUK', blurb: 'True Sight up, then crit everything with Focused Arrow Strike.' },
    { id: 'sniper-falcon', name: 'Falcon', style: 'ranged', rotation: 'falcon-proc', skills: ['falcon_assault', 'blitz_beat'], lean: 'DEX · LUK', blurb: 'Falcon Assault the priority target, Blitz the pack.' },
  ],
  ranger: [
    { id: 'ranger-storm', name: 'Arrow Storm', style: 'ranged', rotation: 'arrow-volley', skills: ['arrow_storm', 'wind_walk'], lean: 'DEX · AGI', blurb: 'Arrow Storm the field with Wind Walker up.' },
    { id: 'ranger-warg', name: 'Warg', style: 'ranged', rotation: 'warg-focus', skills: ['warg_strike', 'arrow_storm'], lean: 'DEX · LUK', blurb: 'Send the warg in and finish what it starts.' },
  ],
  blacksmith: [
    { id: 'smith-forge', name: 'Forge Breaker', style: 'frontline', rotation: 'smith-cleave', skills: ['hammer_fall', 'power_thrust'], lean: 'STR · DEX', blurb: 'Hammer Fall the pack, Power Thrust the big one.' },
    { id: 'smith-support', name: 'Forge Support', style: 'support', rotation: 'party-enchant', skills: ['adrenaline_rush', 'weapon_perfection'], lean: 'STR · VIT', blurb: 'Adrenaline the party and keep weapons perfect.' },
  ],
  whitesmith: [
    { id: 'ws-cart', name: 'Cart Termination', style: 'frontline', rotation: 'smith-cleave', skills: ['cart_termination', 'maximize_power'], lean: 'STR · VIT', blurb: 'Maximize, then Cart Termination the whole line.' },
    { id: 'ws-melt', name: 'Melt Down', style: 'frontline', rotation: 'rapid-crit', skills: ['melt_down', 'maximize_power'], lean: 'STR · DEX', blurb: 'Strip the armour, then hit what is left.' },
  ],
  mechanic: [
    { id: 'mech-mado', name: 'Mado Pilot', style: 'tank', rotation: 'mech-artillery', skills: ['mado_gear', 'axe_mastery'], lean: 'STR · VIT', blurb: 'Climb in and shell the field.' },
    { id: 'mech-axe', name: 'Axe Breaker', style: 'frontline', rotation: 'smith-cleave', skills: ['axe_mastery', 'cart_termination'], lean: 'STR · AGI', blurb: 'Axe mastery plus cart speed.' },
  ],
  assassin: [
    { id: 'assassin-crit', name: 'Katar Crit', style: 'frontline', rotation: 'rapid-crit', skills: ['katar_mastery', 'meteor_assault'], lean: 'AGI · LUK', blurb: 'Crit with the katar and finish with Meteor Assault.' },
    { id: 'assassin-poison', name: 'Poison Cloak', style: 'frontline', rotation: 'rapid-poison', skills: ['enchant_poison', 'grimtooth'], lean: 'AGI · STR', blurb: 'Cloak in, Enchant Poison, Grimtooth the crowd.' },
    { id: 'assassin-burst', name: 'Sonic Burst', style: 'frontline', rotation: 'hp-burst', skills: ['sonic_blow'], lean: 'STR · AGI', blurb: 'Sonic Blow anything under half health.' },
  ],
  assassinCross: [
    { id: 'ac-soul', name: 'Soul Destroyer', style: 'frontline', rotation: 'hp-burst', skills: ['soul_destroyer', 'edp'], lean: 'STR · AGI', blurb: 'EDP, then Soul Destroyer for the execute.' },
    { id: 'ac-meteor', name: 'Meteor Cross', style: 'frontline', rotation: 'rapid-crit', skills: ['meteor_assault_cross', 'edp'], lean: 'AGI · LUK', blurb: 'Spin through the pack with poisoned blades.' },
  ],
  guillotineCross: [
    { id: 'gc-impact', name: 'Cross Impact', style: 'frontline', rotation: 'hp-burst', skills: ['cross_impact', 'rolling_cutter'], lean: 'STR · AGI', blurb: 'Rolling Cutter in, Cross Impact out.' },
    { id: 'gc-crit', name: 'Katar Storm', style: 'frontline', rotation: 'rapid-crit', skills: ['rolling_cutter', 'cross_impact'], lean: 'AGI · LUK', blurb: 'Bleed everything, crit the survivors.' },
  ],
  rogue: [
    { id: 'rogue-bow', name: 'Bow Trickster', style: 'ranged', rotation: 'arrow-volley', skills: ['steal_coin', 'raid'], lean: 'DEX · AGI', blurb: 'Raid the pack blind, then out-range it.' },
    { id: 'rogue-strip', name: 'Strip Artist', style: 'control', rotation: 'debuff-control', skills: ['strip_armor', 'back_stab'], lean: 'AGI · DEX', blurb: 'Strip the gear and backstab what is left.' },
  ],
  stalker: [
    { id: 'stalker-bow', name: 'Triangle Shot', style: 'ranged', rotation: 'arrow-volley', skills: ['triangle_shot', 'full_strip'], lean: 'DEX · AGI', blurb: 'Full Strip, then Triangle Shot from range.' },
    { id: 'stalker-copy', name: 'Copied Trickster', style: 'control', rotation: 'copied-spell', skills: ['full_strip', 'raid'], lean: 'AGI · DEX', blurb: 'Strip everything and control the field.' },
  ],
  shadowChaser: [
    { id: 'sc-manhole', name: 'Manhole Trick', style: 'control', rotation: 'debuff-control', skills: ['manhole', 'feint_bomb'], lean: 'DEX · AGI', blurb: 'Remove a target from the fight, bomb the rest.' },
    { id: 'sc-bow', name: 'Shadow Volley', style: 'ranged', rotation: 'arrow-volley', skills: ['feint_bomb', 'manhole'], lean: 'DEX · LUK', blurb: 'Decoys and arrows from every angle.' },
  ],
  monk: [
    { id: 'monk-combo', name: 'Combo', style: 'frontline', rotation: 'animal-combo', skills: ['chain_combo', 'raging_trifecta'], lean: 'STR · AGI', blurb: 'Trifecta into Chain Combo for constant pressure.' },
    { id: 'monk-breaker', name: 'Spirit Breaker', style: 'frontline', rotation: 'hp-burst', skills: ['investigate', 'raging_trifecta'], lean: 'STR · VIT', blurb: 'Investigate the defence, then break it.' },
  ],
  champion: [
    { id: 'champ-asura', name: 'Asura', style: 'frontline', rotation: 'spirit-finisher', skills: ['asura_strike', 'fury'], lean: 'STR · VIT', blurb: 'Fury up, Asura down. Nothing survives twice.' },
    { id: 'champ-combo', name: 'Chain Master', style: 'frontline', rotation: 'animal-combo', skills: ['chain_combo', 'fury'], lean: 'STR · AGI', blurb: 'Endless combos with spirit on tap.' },
  ],
  sura: [
    { id: 'sura-tiger', name: 'Tiger Knuckle', style: 'frontline', rotation: 'spirit-finisher', skills: ['tiger_knuckle', 'gate_of_hell'], lean: 'STR · VIT', blurb: 'Drain with Tiger Knuckle, finish with Gate of Hell.' },
    { id: 'sura-tank', name: 'Spirit Tank', style: 'tank', rotation: 'guard-taunt', skills: ['gate_of_hell', 'tiger_knuckle'], lean: 'VIT · STR', blurb: 'Hold the line and open hell on the crowd.' },
  ],
  bard: [
    { id: 'bard-song', name: 'Song Support', style: 'support', rotation: 'party-enchant', skills: ['song_of_bravery', 'apple_of_idun'], lean: 'INT · DEX', blurb: 'Songs up, arrows out, party alive.' },
    { id: 'bard-arrow', name: 'Arrow Bard', style: 'ranged', rotation: 'arrow-volley', skills: ['arrow_vulcan', 'dissonance'], lean: 'DEX · INT', blurb: 'Arrow Vulcan pressure with Dissonance for packs.' },
  ],
  clown: [
    { id: 'clown-song', name: 'Grand Concert', style: 'support', rotation: 'party-enchant', skills: ['song_of_bravery', 'tarot_card'], lean: 'INT · DEX', blurb: 'Buff the party, let the tarot ruin the enemy.' },
    { id: 'clown-arrow', name: 'Arrow Virtuoso', style: 'ranged', rotation: 'arrow-volley', skills: ['clown_arrow', 'tarot_card'], lean: 'DEX · LUK', blurb: 'Perfect volleys and a card trick for emergencies.' },
  ],
  minstrel: [
    { id: 'minstrel-storm', name: 'Rainstorm', style: 'ranged', rotation: 'arrow-volley', skills: ['severe_rainstorm', 'clown_arrow'], lean: 'DEX · INT', blurb: 'Rain arrows on everything, song on the way back.' },
    { id: 'minstrel-song', name: 'Minstrel', style: 'support', rotation: 'party-enchant', skills: ['song_of_bravery', 'severe_rainstorm'], lean: 'INT · DEX', blurb: 'A concert the party survives because of.' },
  ],
  dancer: [
    { id: 'dancer-dance', name: 'Dance Support', style: 'support', rotation: 'party-enchant', skills: ['dance_of_vigour', 'focus_deadly'], lean: 'INT · DEX', blurb: 'Dance buffs for days.' },
    { id: 'dancer-arrow', name: 'Arrow Dancer', style: 'ranged', rotation: 'arrow-volley', skills: ['slinging_arrow', 'ugly_dance'], lean: 'DEX · INT', blurb: 'Silence the casters and shoot the rest.' },
  ],
  gypsy: [
    { id: 'gypsy-kiss', name: 'Gypsy Kiss', style: 'ranged', rotation: 'arrow-volley', skills: ['gypsy_card', 'focus_deadly'], lean: 'DEX · LUK', blurb: 'Kiss-stun the priority target and fan the crowd.' },
    { id: 'gypsy-dance', name: 'Dance Support', style: 'support', rotation: 'party-enchant', skills: ['dance_of_vigour', 'focus_deadly'], lean: 'INT · DEX', blurb: 'Support the party from the middle of the fight.' },
  ],
  wanderer: [
    { id: 'wanderer-sorrow', name: 'Sorrow', style: 'control', rotation: 'debuff-control', skills: ['sorrow_dance', 'gypsy_card'], lean: 'INT · DEX', blurb: 'Curse everything, then finish with kisses.' },
    { id: 'wanderer-dance', name: 'Wanderer', style: 'support', rotation: 'party-enchant', skills: ['dance_of_vigour', 'sorrow_dance'], lean: 'INT · VIT', blurb: 'Debuff and buff at the same time.' },
  ],
  alchemist: [
    { id: 'alch-acid', name: 'Acid Bomber', style: 'ranged', rotation: 'rapid-poison', skills: ['acid_terror', 'demonstration'], lean: 'INT · DEX', blurb: 'Acid Terror the target, Demonstration the pack.' },
    { id: 'alch-support', name: 'Field Chemist', style: 'support', rotation: 'heal-buff-cleanse', skills: ['potion_pitcher', 'summon_flora'], lean: 'INT · VIT', blurb: 'Pitcher heals with a homunculus in the fight.' },
  ],
  creator: [
    { id: 'creator-bomb', name: 'Acid Bomb', style: 'ranged', rotation: 'hp-burst', skills: ['creator_acid', 'full_chemical_protection'], lean: 'INT · DEX', blurb: 'Acid bombs that melt anything.' },
    { id: 'creator-support', name: 'Chemical Guard', style: 'support', rotation: 'party-enchant', skills: ['full_chemical_protection', 'potion_pitcher'], lean: 'INT · VIT', blurb: 'Keep the party’s gear intact and their HP up.' },
  ],
  genetic: [
    { id: 'genetic-cannon', name: 'Cart Cannon', style: 'ranged', rotation: 'mech-artillery', skills: ['cart_cannon', 'creator_acid'], lean: 'INT · DEX', blurb: 'Cart Cannon the field, acid the leftovers.' },
    { id: 'genetic-support', name: 'Genetic Support', style: 'support', rotation: 'heal-buff-cleanse', skills: ['potion_pitcher', 'cart_cannon'], lean: 'INT · VIT', blurb: 'Support alchemy with artillery backup.' },
  ],
  superNovice: [
    { id: 'sn-generalist', name: 'Generalist', style: 'frontline', rotation: 'single-threat', skills: ['bash', 'fire_bolt'], lean: 'STR · INT', blurb: 'A little of everything, all at once.' },
    { id: 'sn-survivor', name: 'Survivor', style: 'support', rotation: 'heal-buff-cleanse', skills: ['heal', 'first_aid'], lean: 'VIT · INT', blurb: 'Impossible to kill, hard to ignore.' },
  ],
  taekwon: [
    { id: 'tk-kicks', name: 'Kick Rush', style: 'frontline', rotation: 'rapid-crit', skills: ['tk_kick', 'tk_tornado'], lean: 'STR · AGI', blurb: 'Kicks that never stop coming.' },
    { id: 'tk-spin', name: 'Spin Master', style: 'frontline', rotation: 'single-threat', skills: ['tk_tornado', 'tk_roundhouse'], lean: 'AGI · STR', blurb: 'Spin the crowd and stun the rest.' },
  ],
  starGladiator: [
    { id: 'sg-solar', name: 'Solar', style: 'frontline', rotation: 'rapid-crit', skills: ['solar_wrath', 'star_mark'], lean: 'STR · AGI', blurb: 'Sun-marked kicks with solar fire.' },
    { id: 'sg-mark', name: 'Star Mark', style: 'frontline', rotation: 'hp-burst', skills: ['star_mark', 'solar_wrath'], lean: 'AGI · VIT', blurb: 'Mark the target, then finish it with the stars.' },
  ],
  starEmperor: [
    { id: 'se-stellar', name: 'Stellar', style: 'frontline', rotation: 'rapid-crit', skills: ['star_mark', 'solar_wrath'], lean: 'STR · AGI', blurb: 'Explosive kick chains under three constellations.' },
    { id: 'se-burst', name: 'Nova Kick', style: 'frontline', rotation: 'hp-burst', skills: ['solar_wrath', 'star_mark'], lean: 'AGI · LUK', blurb: 'One perfect kick to end it.' },
  ],
  ninja: [
    { id: 'ninja-shuriken', name: 'Shuriken', style: 'ranged', rotation: 'arrow-volley', skills: ['ninja_shuriken', 'ninja_kunai'], lean: 'DEX · AGI', blurb: 'Blades from nowhere, never in the same place twice.' },
    { id: 'ninja-element', name: 'Ninjutsu', style: 'ranged', rotation: 'elemental-aoe', skills: ['ninja_fire', 'ninja_kunai'], lean: 'DEX · INT', blurb: 'Elemental ninjutsu with blade support.' },
  ],
  kagerou: [
    { id: 'kagerou-ice', name: 'Frost Weave', style: 'ranged', rotation: 'freeze-control', skills: ['ninja_ice', 'ninja_shuriken'], lean: 'DEX · INT', blurb: 'Freeze the field, then pick it apart.' },
    { id: 'kagerou-blade', name: 'Shadow Blade', style: 'ranged', rotation: 'arrow-volley', skills: ['ninja_kunai', 'ninja_ice'], lean: 'DEX · AGI', blurb: 'Physical shadow pressure with ice control.' },
  ],
  oboro: [
    { id: 'oboro-illusion', name: 'Illusion', style: 'ranged', rotation: 'debuff-control', skills: ['ninja_ice', 'ninja_fire'], lean: 'INT · DEX', blurb: 'Illusions and elemental traps.' },
    { id: 'oboro-blade', name: 'Oboro Blade', style: 'ranged', rotation: 'arrow-volley', skills: ['ninja_shuriken', 'ninja_fire'], lean: 'DEX · AGI', blurb: 'Fast blades with fire ninjutsu.' },
  ],
  gunslinger: [
    { id: 'gun-pistol', name: 'Quickdraw', style: 'ranged', rotation: 'rapid-crit', skills: ['gunslinger_pistol', 'gunslinger_rapid'], lean: 'DEX · LUK', blurb: 'Single Action into Rapid Shower.' },
    { id: 'gun-spray', name: 'Spray', style: 'ranged', rotation: 'arrow-volley', skills: ['gunslinger_rapid', 'gunslinger_pistol'], lean: 'DEX · AGI', blurb: 'Hold the trigger and sweep.' },
  ],
  rebellion: [
    { id: 'reb-desperado', name: 'Desperado', style: 'ranged', rotation: 'arrow-volley', skills: ['gunslinger_desperado', 'gunslinger_rapid'], lean: 'DEX · LUK', blurb: 'Fire everywhere, hit everything.' },
    { id: 'reb-rifle', name: 'Rifleman', style: 'ranged', rotation: 'rapid-crit', skills: ['gunslinger_pistol', 'gunslinger_desperado'], lean: 'DEX · AGI', blurb: 'Precision shots with a desperate backup.' },
  ],
  soulLinker: [
    { id: 'sl-link', name: 'Soul Link', style: 'support', rotation: 'party-enchant', skills: ['soul_link'], lean: 'INT · DEX', blurb: 'Link the party and share the power.' },
    { id: 'sl-strike', name: 'Soul Strike', style: 'ranged', rotation: 'elemental-chain', skills: ['soul_link', 'holy_light'], lean: 'INT · VIT', blurb: 'Support links with holy pressure.' },
  ],
  soulReaper: [
    { id: 'sr-curse', name: 'Soul Curse', style: 'support', rotation: 'debuff-control', skills: ['soul_link', 'soul_change'], lean: 'INT · DEX', blurb: 'Curse the enemy, link the party.' },
    { id: 'sr-drain', name: 'Soul Drain', style: 'ranged', rotation: 'elemental-aoe', skills: ['soul_change', 'soul_link'], lean: 'INT · VIT', blurb: 'Drain souls to keep the party fighting.' },
  ],
  doram: [
    { id: 'doram-pet', name: 'Pet Bond', style: 'support', rotation: 'heal-buff-cleanse', skills: ['doram_heal', 'doram_bite'], lean: 'INT · DEX', blurb: 'Heal with a purr, bite with a friend.' },
    { id: 'doram-bite', name: 'Beast Bite', style: 'frontline', rotation: 'single-threat', skills: ['doram_bite', 'doram_heal'], lean: 'DEX · VIT', blurb: 'Animal fury with self-sustain.' },
  ],
  spiritHandler: [
    { id: 'sh-spirit', name: 'Spirit Handler', style: 'support', rotation: 'party-enchant', skills: ['soul_link', 'doram_heal'], lean: 'INT · DEX', blurb: 'Spirits that heal and empower.' },
    { id: 'sh-beast', name: 'Spirit Beast', style: 'frontline', rotation: 'single-threat', skills: ['doram_bite', 'doram_heal'], lean: 'DEX · VIT', blurb: 'A beast fuelled by spirits.' },
  ],
};

export const SKILLS = raw;
