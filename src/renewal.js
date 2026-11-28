// Ragnarok Online Renewal class-tree and idle-build reference data.
// This data is intentionally separated from combat implementation so each skill
// can be added to deterministic auto-battle in small, testable slices.
export const RENEWAL_JOBS = {
  crusader: { parent: 'swordsman', family: 'crusader', tier: 'second', name: 'Crusader', native: 14, role: 'frontline', identity: 'shield-lancer', description: 'Shield counterattacks, spear pressure, and party protection.' },
  sage: { parent: 'mage', family: 'sage', tier: 'second', name: 'Sage', native: 16, role: 'ranged', identity: 'elemental-controller', description: 'Elemental endows, dispels, and field control.' },
  bard: { parent: 'archer', family: 'bard', tier: 'second', name: 'Bard', native: 19, role: 'support', identity: 'song-support', description: 'Party songs and ranged arrow damage.' },
  dancer: { parent: 'archer', family: 'dancer', tier: 'second', name: 'Dancer', native: 20, role: 'support', identity: 'dance-support', description: 'Party dances and ranged control.' },
  monk: { parent: 'acolyte', family: 'monk', tier: 'second', name: 'Monk', native: 15, role: 'frontline', identity: 'combo-fighter', description: 'Spirit spheres, chained strikes, and a devastating finisher.' },
  alchemist: { parent: 'merchant', family: 'alchemist', tier: 'second', name: 'Alchemist', native: 18, role: 'support', identity: 'homunculus-alchemist', description: 'Potion support, a Homunculus companion, and reagent attacks.' },
  rogue: { parent: 'thief', family: 'rogue', tier: 'second', name: 'Rogue', native: 17, role: 'ranged', identity: 'bow-trickster', description: 'Steal, strip, and switch between bow pressure and dirty tricks.' },

  paladin: { parent: 'crusader', family: 'crusader', tier: 'transcendent', name: 'Paladin', native: 4015, role: 'frontline', identity: 'shield-lancer' },
  professor: { parent: 'sage', family: 'sage', tier: 'transcendent', name: 'Professor', native: 4017, role: 'support', identity: 'elemental-controller' },
  clown: { parent: 'bard', family: 'bard', tier: 'transcendent', name: 'Clown', native: 4020, role: 'support', identity: 'song-support' },
  gypsy: { parent: 'dancer', family: 'dancer', tier: 'transcendent', name: 'Gypsy', native: 4021, role: 'support', identity: 'dance-support' },
  champion: { parent: 'monk', family: 'monk', tier: 'transcendent', name: 'Champion', native: 4016, role: 'frontline', identity: 'combo-fighter' },
  creator: { parent: 'alchemist', family: 'alchemist', tier: 'transcendent', name: 'Creator', native: 4019, role: 'support', identity: 'homunculus-alchemist' },
  stalker: { parent: 'rogue', family: 'rogue', tier: 'transcendent', name: 'Stalker', native: 4018, role: 'ranged', identity: 'bow-trickster' },

  runeKnight: { parent: 'lordKnight', family: 'knight', tier: 'third', name: 'Rune Knight', native: 4054, role: 'frontline', identity: 'rune-lancer', description: 'Rune-powered melee burst, spear chains, and a dragon-breath option.' },
  royalGuard: { parent: 'paladin', family: 'crusader', tier: 'third', name: 'Royal Guard', native: 4060, role: 'frontline', identity: 'shield-guardian', description: 'A durable shield tank that protects allies and punishes attackers.' },
  warlock: { parent: 'highWizard', family: 'wizard', tier: 'third', name: 'Warlock', native: 4055, role: 'ranged', identity: 'spell-artillery', description: 'Long-cast elemental artillery, chaining spells, and control.' },
  sorcerer: { parent: 'professor', family: 'sage', tier: 'third', name: 'Sorcerer', native: 4061, role: 'support', identity: 'elemental-summoner', description: 'Elemental spirits, party enchantments, and disabling magic.' },
  ranger: { parent: 'sniper', family: 'hunter', tier: 'third', name: 'Ranger', native: 4056, role: 'ranged', identity: 'warg-archer', description: 'Bow volleys, traps, and Warg-assisted attacks.' },
  minstrel: { parent: 'clown', family: 'bard', tier: 'third', name: 'Minstrel', native: 4062, role: 'support', identity: 'song-support', description: 'Sustained party songs paired with ranged damage.' },
  wanderer: { parent: 'gypsy', family: 'dancer', tier: 'third', name: 'Wanderer', native: 4063, role: 'support', identity: 'dance-support', description: 'Team dances, control effects, and ranged attacks.' },
  mechanic: { parent: 'whitesmith', family: 'blacksmith', tier: 'third', name: 'Mechanic', native: 4058, role: 'frontline', identity: 'mado-engineer', description: 'Mech armor, deployable turrets, and heavy machinery attacks.' },
  genetic: { parent: 'creator', family: 'alchemist', tier: 'third', name: 'Genetic', native: 4064, role: 'ranged', identity: 'homunculus-alchemist', description: 'Homunculus S, plant summons, cart attacks, and volatile reagents.' },
  guillotineCross: { parent: 'assassinCross', family: 'assassin', tier: 'third', name: 'Guillotine Cross', native: 4059, role: 'frontline', identity: 'poison-assassin', description: 'Poison preparation, rapid katar chains, and execution bursts.' },
  shadowChaser: { parent: 'stalker', family: 'rogue', tier: 'third', name: 'Shadow Chaser', native: 4065, role: 'ranged', identity: 'copy-trickster', description: 'Copied skills, autocasts, bow pressure, and disabling masquerades.' },
  archBishop: { parent: 'highPriest', family: 'priest', tier: 'third', name: 'Arch Bishop', native: 4057, role: 'support', identity: 'battle-priest', description: 'Party-wide healing and buffs, with a distinct Holy-magic build.' },
  sura: { parent: 'champion', family: 'monk', tier: 'third', name: 'Sura', native: 4066, role: 'frontline', identity: 'spirit-martial-artist', description: 'Spirit-sphere combos, HP-fueled finishers, or a frontline tank.' },

  superNovice: { parent: 'novice', family: 'superNovice', tier: 'expanded', name: 'Super Novice', native: 23, role: 'frontline', identity: 'versatile-novice', description: 'A flexible novice who borrows skills from several first-job paths.' },
  gunslinger: { parent: 'novice', family: 'gunslinger', tier: 'expanded', name: 'Gunslinger', native: 24, role: 'ranged', identity: 'firearm-specialist', description: 'Firearms, ammo choices, and fast ranged burst.' },
  ninja: { parent: 'novice', family: 'ninja', tier: 'expanded', name: 'Ninja', native: 25, role: 'ranged', identity: 'ninja-elementalist', description: 'Ninjutsu, shuriken barrages, and evasive shadow arts.' },
  taekwon: { parent: 'novice', family: 'taekwon', tier: 'expanded', name: 'Taekwon', native: 4046, role: 'frontline', identity: 'stance-striker', description: 'Stance-based kicks and momentum-driven melee.' },
  starGladiator: { parent: 'taekwon', family: 'starGladiator', tier: 'expandedSecond', name: 'Star Gladiator', native: 4047, role: 'frontline', identity: 'solar-lunar-stellar', description: 'Solar, Lunar, and Stellar marks fuel focused kick combat.' },
  soulLinker: { parent: 'taekwon', family: 'soulLinker', tier: 'expandedSecond', name: 'Soul Linker', native: 4049, role: 'support', identity: 'spirit-support', description: 'Soul links empower allies and specialized class tactics.' },
  kagerou: { parent: 'ninja', family: 'ninja', tier: 'expandedThird', name: 'Kagerou', native: 4211, role: 'ranged', identity: 'ninja-elementalist', description: 'Ninjutsu and physical shadow techniques.' },
  oboro: { parent: 'ninja', family: 'ninja', tier: 'expandedThird', name: 'Oboro', native: 4212, role: 'ranged', identity: 'ninja-elementalist', description: 'Ninjutsu and illusion techniques.' },
  rebellion: { parent: 'gunslinger', family: 'gunslinger', tier: 'expandedThird', name: 'Rebellion', native: 4215, role: 'ranged', identity: 'firearm-specialist', description: 'Weapon-mode swapping, ammunition, and broad firearm combos.' },
  starEmperor: { parent: 'starGladiator', family: 'starGladiator', tier: 'expandedThird', name: 'Star Emperor', native: 4239, role: 'frontline', identity: 'solar-lunar-stellar', description: 'Solar, Lunar, and Stellar maps unleash explosive kick chains.' },
  soulReaper: { parent: 'soulLinker', family: 'soulLinker', tier: 'expandedThird', name: 'Soul Reaper', native: 4240, role: 'support', identity: 'spirit-support', description: 'Soul energy, links, and curse-based magical support.' },
  doram: { parent: 'novice', family: 'doram', tier: 'expanded', name: 'Summoner (Doram)', native: 4218, role: 'support', identity: 'summoner', description: 'A small Summoner who blends animal magic, healing, and summoned power.' },
  spiritHandler: { parent: 'doram', family: 'doram', tier: 'expandedSecond', name: 'Spirit Handler', native: 4308, role: 'support', identity: 'summoner', description: 'An advanced Doram supporting allies with powerful animal spirits.' },
};

const ROLES = {
  knight: 'frontline', crusader: 'frontline', wizard: 'ranged', sage: 'support', hunter: 'ranged', bard: 'support', dancer: 'support',
  priest: 'support', monk: 'frontline', blacksmith: 'frontline', alchemist: 'support', assassin: 'frontline', rogue: 'ranged',
};
const BASE_STATS = { knight: [250, 25, 8], crusader: [245, 22, 12], wizard: [135, 29, 2], sage: [155, 21, 4], hunter: [155, 22, 3], bard: [145, 20, 4], dancer: [145, 20, 4], priest: [175, 16, 4], monk: [195, 25, 6], blacksmith: [210, 23, 6], alchemist: [200, 20, 7], assassin: [165, 23, 4], rogue: [165, 20, 4] };
export const BUILD_FAMILIES = {
  swordsman: [
    { id: 'swordsman-vanguard', name: 'Vanguard', style: 'frontline', skills: ['Bash', 'Provoke', 'Endure'], rotation: 'single-threat', resource: 'sp' },
    { id: 'swordsman-guard', name: 'Field Guard', style: 'tank', skills: ['Bash', 'Provoke', 'Endure'], rotation: 'guard-taunt', resource: 'guard' },
  ],
  mage: [
    { id: 'mage-bolts', name: 'Bolt Caster', style: 'ranged', skills: ['Fire Bolt', 'Cold Bolt', 'Lightning Bolt'], rotation: 'elemental-chain', resource: 'sp', castTime: 0.55 },
    { id: 'mage-control', name: 'Frost Initiate', style: 'control', skills: ['Cold Bolt', 'Frost Diver', 'Safety Wall'], rotation: 'freeze-control', resource: 'sp', castTime: 0.8 },
  ],
  archer: [
    { id: 'archer-volley', name: 'Arrow Volley', style: 'ranged', skills: ['Double Strafe', 'Arrow Shower', 'Improve Concentration'], rotation: 'rapid-crit', resource: 'arrows' },
    { id: 'archer-trapper', name: 'Field Trapper', style: 'control', skills: ['Ankle Snare', 'Land Mine', 'Remove Trap'], rotation: 'trap-zone', resource: 'traps' },
  ],
  acolyte: [
    { id: 'acolyte-healer', name: 'Field Healer', style: 'support', skills: ['Heal', 'Blessing', 'Increase AGI'], rotation: 'heal-buff-cleanse', resource: 'sp' },
    { id: 'acolyte-striker', name: 'Holy Striker', style: 'ranged', skills: ['Holy Light', 'Demon Bane', 'Divine Protection'], rotation: 'holy-exorcism', resource: 'sp' },
  ],
  merchant: [
    { id: 'merchant-brawler', name: 'Cart Brawler', style: 'frontline', skills: ['Mammonite', 'Cart Revolution', 'Pushcart'], rotation: 'smith-cleave', resource: 'zeny' },
    { id: 'merchant-support', name: 'Supply Keeper', style: 'support', skills: ['Crazy Uproar', 'Discount', 'Overcharge'], rotation: 'party-enchant', resource: 'supplies' },
  ],
  thief: [
    { id: 'thief-assassin', name: 'Quickblade', style: 'frontline', skills: ['Double Attack', 'Envenom', 'Hiding'], rotation: 'rapid-poison', resource: 'poison' },
    { id: 'thief-trickster', name: 'Field Trickster', style: 'control', skills: ['Steal', 'Sand Attack', 'Throw Stone'], rotation: 'debuff-control', resource: 'tricks' },
  ],
  knight: [
    { id: 'knight-spear', name: 'Spear Vanguard', style: 'frontline', skills: ['Pierce', 'Brandish Spear', 'Spear Boomerang', 'Spiral Pierce', 'Sonic Wave', 'Hundred Spears'], rotation: 'aoe-threat', resource: 'runes' },
    { id: 'knight-dragon', name: 'Dragon Breath', style: 'ranged', skills: ['Dragon Training', 'Dragon Breath', 'Dragon Howling', 'Rune Mastery'], rotation: 'elemental-cone', resource: 'runes' },
  ],
  crusader: [
    { id: 'crusader-shield', name: 'Shield Guardian', style: 'tank', skills: ['Defender', 'Reflect Shield', 'Sacrifice', 'Shield Chain', 'Earth Drive', 'King’s Grace'], rotation: 'guard-taunt', resource: 'guard' },
    { id: 'crusader-spear', name: 'Holy Spear', style: 'frontline', skills: ['Spear Quicken', 'Grand Cross', 'Overbrand', 'Cannon Spear', 'Genesis Ray'], rotation: 'holy-cleave', resource: 'sp' },
  ],
  wizard: [
    { id: 'wizard-storm', name: 'Elemental Storm', style: 'ranged', skills: ['Storm Gust', 'Meteor Storm', 'Lord of Vermilion', 'Crimson Rock', 'Chain Lightning', 'Comet'], rotation: 'elemental-aoe', resource: 'sp', castTime: 1.1 },
    { id: 'wizard-control', name: 'Frost Controller', style: 'control', skills: ['Safety Wall', 'Quagmire', 'Storm Gust', 'Jack Frost', 'Frost Misty', 'Marsh of Abyss'], rotation: 'freeze-control', resource: 'sp', castTime: 0.9 },
  ],
  sage: [
    { id: 'sage-elemental', name: 'Elemental Sage', style: 'ranged', skills: ['Fire Bolt', 'Cold Bolt', 'Lightning Bolt', 'Dispell', 'Psychic Wave', 'Diamond Dust'], rotation: 'elemental-chain', resource: 'sp' },
    { id: 'sage-enchanter', name: 'Party Enchanter', style: 'support', skills: ['Endow Quake', 'Endow Tsunami', 'Endow Tornado', 'Dispel', 'Striking', 'Warmer'], rotation: 'party-enchant', resource: 'sp' },
  ],
  hunter: [
    { id: 'sniper-auto', name: 'Auto-Attack Sniper', style: 'ranged', skills: ['Improve Concentration', 'Falcon Eyes', 'Double Strafe', 'Focused Arrow Strike', 'Wind Walker'], rotation: 'rapid-crit', resource: 'arrows' },
    { id: 'sniper-falcon', name: 'Falcon Sniper', style: 'ranged', skills: ['Falconry Mastery', 'Blitz Beat', 'Steel Crow', 'Falcon Assault', 'Falcon Eyes'], rotation: 'falcon-proc', resource: 'falcon' },
    { id: 'sniper-traps', name: 'Trap Sniper', style: 'control', skills: ['Ankle Snare', 'Freezing Trap', 'Claymore Trap', 'Land Mine', 'Shockwave Trap', 'Trap Research', 'Detonator'], rotation: 'trap-zone', resource: 'traps' },
    { id: 'ranger-warg', name: 'Warg Ranger', style: 'ranged', skills: ['Warg Mastery', 'Warg Strike', 'Fear Breeze', 'Aimed Bolt', 'Camouflage'], rotation: 'warg-focus', resource: 'warg' },
    { id: 'ranger-arrowstorm', name: 'Arrow Storm Ranger', style: 'ranged', skills: ['Arrow Storm', 'Aimed Bolt', 'Focused Arrow Strike', 'Fear Breeze'], rotation: 'arrow-volley', resource: 'arrows' },
    { id: 'ranger-trapper', name: 'Ranger Trapper', style: 'control', skills: ['Trap Research', 'Bomb Cluster', 'Fire Trap', 'Ice Trap', 'Detonator'], rotation: 'trap-zone', resource: 'traps' },
  ],
  bard: [
    { id: 'bard-minstrel', name: 'Maestro Songkeeper', style: 'support', skills: ['Poem of Bragi', 'Apple of Idun', 'Assassin Cross of Sunset', 'Song of Mana', 'Echo Song'], rotation: 'party-songs', resource: 'songs' },
    { id: 'bard-arrows', name: 'Arrow Minstrel', style: 'ranged', skills: ['Arrow Vulcan', 'Severe Rainstorm', 'Metallic Sound', 'Great Echo'], rotation: 'ranged-volley', resource: 'arrows' },
  ],
  dancer: [
    { id: 'dancer-wanderer', name: 'Wanderer Dancer', style: 'support', skills: ['Service for You', 'Fortune’s Kiss', 'Slow Grace', 'Swing Dance', 'Lerad’s Dew'], rotation: 'party-dances', resource: 'songs' },
    { id: 'dancer-whip', name: 'Whip Artist', style: 'ranged', skills: ['Slinging Arrow', 'Severe Rainstorm', 'Metallic Sound', 'Deep Sleep Lullaby'], rotation: 'ranged-control', resource: 'arrows' },
  ],
  priest: [
    { id: 'priest-support', name: 'Acolyte Support', style: 'support', skills: ['Heal', 'Blessing', 'Increase AGI', 'Kyrie Eleison', 'Clementia', 'Coluseo Heal', 'Praefatio', 'Clearance'], rotation: 'heal-buff-cleanse', resource: 'sp' },
    { id: 'priest-exorcist', name: 'Holy Exorcist', style: 'ranged', skills: ['Turn Undead', 'Magnus Exorcismus', 'Judex', 'Adoramus', 'Oratio'], rotation: 'holy-exorcism', resource: 'sp' },
  ],
  monk: [
    { id: 'monk-combo', name: 'Combo Monk', style: 'frontline', skills: ['Triple Attack', 'Combo Finish', 'Raging Trifecta Blow', 'Raging Quadruple Blow', 'Dragon Combo', 'Fallen Empire', 'Flash Combo'], rotation: 'combo-chain', resource: 'spheres' },
    { id: 'monk-asura', name: 'Asura Striker', style: 'frontline', skills: ['Call Spirits', 'Absorb Spirits', 'Fury', 'Asura Strike', 'Gates of Hell'], rotation: 'spirit-finisher', resource: 'spheres' },
    { id: 'sura-gates', name: 'Gates of Hell', style: 'frontline', skills: ['Rising Dragon', 'Cursed Circle', 'Gates of Hell', 'Tiger Cannon', 'Gentle Touch: Convert'], rotation: 'hp-burst', resource: 'spheres' },
    { id: 'sura-tank', name: 'Frontline Sura', style: 'tank', skills: ['Rising Dragon', 'Gentle Touch: Revitalize', 'Gentle Touch: Energy Gain', 'Mental Strength', 'Crescent Elbow', 'Cursed Circle'], rotation: 'mitigation-taunt', resource: 'spheres' },
    { id: 'sura-combo', name: 'Sky Blow Combo', style: 'frontline', skills: ['Dragon Combo', 'Fallen Empire', 'Sky Blow', 'Flash Combo', 'Tiger Cannon'], rotation: 'combo-chain', resource: 'spheres' },
  ],
  blacksmith: [
    { id: 'smith-forge', name: 'Battle Blacksmith', style: 'frontline', skills: ['Weapon Perfection', 'Adrenaline Rush', 'Power-Thrust', 'Hammer Fall', 'Cart Termination', 'Axe Tornado'], rotation: 'smith-cleave', resource: 'sp' },
    { id: 'mechanic-mado', name: 'Mado Engineer', style: 'frontline', skills: ['Mado Gear License', 'Arm Cannon', 'Flame Launcher', 'Cold Slower', 'Magnetic Field', 'FAW Silver Sniper'], rotation: 'mech-artillery', resource: 'fuel' },
  ],
  alchemist: [
    { id: 'alchemist-homunculus', name: 'Homunculus Tactician', style: 'support', skills: ['Call Homunculus', 'Potion Pitcher', 'Cart Boost', 'Homunculus S', 'Blood Sucker', 'Hell Plant'], rotation: 'companion-support', resource: 'reagents' },
    { id: 'genetic-cart', name: 'Cart Cannon Genetic', style: 'ranged', skills: ['Cart Boost', 'Cart Cannon', 'Cart Tornado', 'Crazy Weed', 'Spore Explosion'], rotation: 'cart-artillery', resource: 'cart' },
  ],
  assassin: [
    { id: 'assassin-katar', name: 'Katar Crit', style: 'frontline', skills: ['Katar Mastery', 'Enchant Poison', 'Sonic Blow', 'Rolling Cutter', 'Cross Ripper Slasher'], rotation: 'rapid-poison', resource: 'poison' },
    { id: 'assassin-poison', name: 'Poison Executioner', style: 'frontline', skills: ['Create New Poison', 'Research New Poison', 'Poisoning Weapon', 'Cross Impact', 'Dark Claw', 'Counter Slash'], rotation: 'poison-execute', resource: 'poison' },
  ],
  rogue: [
    { id: 'rogue-bow', name: 'Bow Stalker', style: 'ranged', skills: ['Double Strafe', 'Snatcher', 'Divest Weapon', 'Triangle Shot', 'Fatal Menace'], rotation: 'bow-kite', resource: 'arrows' },
    { id: 'rogue-copy', name: 'Copycat Chaser', style: 'ranged', skills: ['Plagiarism', 'Reproduce', 'Preserve', 'Shadow Spell', 'Feint Bomb'], rotation: 'copied-spell', resource: 'copied-skill' },
    { id: 'rogue-control', name: 'Masquerade Controller', style: 'control', skills: ['Manhole', 'Chaos Panic', 'Masquerade: Ignorance', 'Masquerade: Weakness', 'Masquerade: Laziness', 'Maelstrom'], rotation: 'debuff-control', resource: 'paint' },
  ],
  gunslinger: [
    { id: 'gunslinger-rifle', name: 'Rifle Deadeye', style: 'ranged', skills: ['Tracking', 'Piercing Shot', 'Disarm', 'Headshot'], rotation: 'precision-shot', resource: 'ammunition' },
    { id: 'gunslinger-gatling', name: 'Gatling Suppression', style: 'ranged', skills: ['Rapid Shower', 'Desperado', 'Gatling Fever', 'Round Trip'], rotation: 'rapid-fire', resource: 'ammunition' },
    { id: 'gunslinger-grenade', name: 'Grenade Launcher', style: 'ranged', skills: ['Ground Drift', 'Full Buster', 'Spread Attack', 'Fire Rain'], rotation: 'explosive-volley', resource: 'ammunition' },
  ],
  ninja: [
    { id: 'ninja-magic', name: 'Ninjutsu Adept', style: 'ranged', skills: ['Flame Bolt', 'Lightning Jolt', 'Freezing Spear', 'Ninja Aura', 'Cross of Flash'], rotation: 'elemental-chain', resource: 'ninja-sp' },
    { id: 'ninja-physical', name: 'Shadow Shuriken', style: 'ranged', skills: ['Throw Shuriken', 'Throw Kunai', 'Throw Huuma Shuriken', 'Cicada Skin Shed', '16th Night'], rotation: 'shuriken-volley', resource: 'shuriken' },
  ],
  taekwon: [
    { id: 'taekwon-kick', name: 'Stance Kicker', style: 'frontline', skills: ['Running', 'Tornado Kick', 'Heel Drop', 'Roundhouse Kick', 'Counter Kick'], rotation: 'stance-combo', resource: 'stance' },
  ],
  superNovice: [
    { id: 'supernovice-mix', name: 'Expanded Novice', style: 'hybrid', skills: ['Fire Bolt', 'Heal', 'Increase AGI', 'Double Strafe', 'Envenom', 'Sight'], rotation: 'mixed-toolkit', resource: 'sp' },
  ],
  starGladiator: [
    { id: 'star-emperor-kicks', name: 'Stellar Kickboxer', style: 'frontline', skills: ['Tornado Kick', 'Roundhouse Kick', 'Solar Burst', 'Stellar Heat'], rotation: 'stance-combo', resource: 'stance' },
    { id: 'star-emperor-map', name: 'Celestial Mapper', style: 'control', skills: ['Solar, Lunar, and Stellar Maps', 'Star Burst', 'Universe Stance'], rotation: 'elemental-aoe', resource: 'celestial-marks' },
  ],
  soulLinker: [
    { id: 'soul-linker-support', name: 'Soul Support', style: 'support', skills: ['Kaahi', 'Kaupe', 'Kaite', 'Soul Link'], rotation: 'heal-buff-cleanse', resource: 'soul-energy' },
    { id: 'soul-linker-spirit', name: 'Spirit Caster', style: 'ranged', skills: ['Esma', 'Estin', 'Estun', 'Soul Expansion'], rotation: 'elemental-chain', resource: 'soul-energy' },
  ],
  doram: [
    { id: 'doram-paw', name: 'Paw-Gression', style: 'frontline', skills: ['Picky Peck', 'Lunatic Carrot Beat', 'Power of Land', 'Scar of Tarou'], rotation: 'animal-combo', resource: 'summons' },
    { id: 'doram-heal', name: 'Picky Peck Support', style: 'support', skills: ['Power of Sea', 'Bunch of Shrimp', 'Silvervine Root Twist', 'Fresh Shrimp', 'Doram Party Buff'], rotation: 'heal-buff-cleanse', resource: 'summons' },
  ],
};

export const STATUS_EFFECTS = {
  poison: { label: 'Poison', family: 'damage-over-time', refresh: 'strongest', control: false },
  bleeding: { label: 'Bleeding', family: 'damage-over-time', refresh: 'strongest', control: false },
  stun: { label: 'Stun', family: 'hard-control', refresh: 'longest', control: true },
  freeze: { label: 'Frozen', family: 'hard-control', refresh: 'longest', control: true },
  stone: { label: 'Stone Curse', family: 'hard-control', refresh: 'longest', control: true },
  silence: { label: 'Silence', family: 'skill-lock', refresh: 'longest', control: true },
  blind: { label: 'Blind', family: 'accuracy-down', refresh: 'longest', control: true },
  slow: { label: 'Quagmire', family: 'speed-down', refresh: 'longest', control: true },
  fear: { label: 'Fear', family: 'accuracy-down', refresh: 'longest', control: true },
  curse: { label: 'Curse', family: 'stat-down', refresh: 'longest', control: true },
  burning: { label: 'Burning', family: 'damage-over-time', refresh: 'strongest', control: false },
};
