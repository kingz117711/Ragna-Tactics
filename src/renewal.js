// Renewal-era job paths and compact, data-driven skill kits. Names and archetypes
// follow the official Renewal class guide; effect magnitudes are tuned for this idle RPG.
const paths = [
  ['swordsman','Swordsman','novice',1,'frontline','sword'],
  ['mage','Mage','novice',1,'ranged','magic'],
  ['archer','Archer','novice',1,'ranged','archer'],
  ['acolyte','Acolyte','novice',1,'support','support'],
  ['merchant','Merchant','novice',1,'frontline','merchant'],
  ['thief','Thief','novice',1,'frontline','thief'],
  ['taekwon','Taekwon Kid','novice',1,'frontline','monk'],
  ['ninja','Ninja','novice',1,'ranged','ninja'],
  ['gunslinger','Gunslinger','novice',1,'ranged','gunslinger'],
  ['summoner','Summoner','novice',1,'support','summoner'],

  ['knight','Knight','swordsman',2,'frontline','sword'], ['crusader','Crusader','swordsman',2,'frontline','tank'],
  ['wizard','Wizard','mage',2,'ranged','magic'], ['sage','Sage','mage',2,'ranged','sage'],
  ['hunter','Hunter','archer',2,'ranged','archer'], ['bard','Bard','archer',2,'support','song'], ['dancer','Dancer','archer',2,'support','song'],
  ['priest','Priest','acolyte',2,'support','support'], ['monk','Monk','acolyte',2,'frontline','monk'],
  ['blacksmith','Blacksmith','merchant',2,'frontline','merchant'], ['alchemist','Alchemist','merchant',2,'support','alchemist'],
  ['assassin','Assassin','thief',2,'frontline','thief'], ['rogue','Rogue','thief',2,'frontline','rogue'],
  ['star_gladiator','Star Gladiator','taekwon',2,'frontline','monk'], ['soul_linker','Soul Linker','taekwon',2,'support','support'],
  ['kagerou','Kagerou','ninja',2,'ranged','ninja'], ['oboro','Oboro','ninja',2,'ranged','ninja'],
  ['rebellion','Rebellion','gunslinger',2,'ranged','gunslinger'], ['spirit_handler','Spirit Handler','summoner',2,'support','summoner'],

  ['lord_knight','Lord Knight','knight',3,'frontline','sword'], ['paladin','Paladin','crusader',3,'frontline','tank'],
  ['high_wizard','High Wizard','wizard',3,'ranged','magic'], ['professor','Professor','sage',3,'support','sage'],
  ['sniper','Sniper','hunter',3,'ranged','archer'], ['clown','Clown','bard',3,'support','song'], ['gypsy','Gypsy','dancer',3,'support','song'],
  ['high_priest','High Priest','priest',3,'support','support'], ['champion','Champion','monk',3,'frontline','monk'],
  ['whitesmith','Whitesmith','blacksmith',3,'frontline','merchant'], ['creator','Creator','alchemist',3,'support','alchemist'],
  ['assassin_cross','Assassin Cross','assassin',3,'frontline','thief'], ['stalker','Stalker','rogue',3,'frontline','rogue'],
  ['star_emperor','Star Emperor','star_gladiator',3,'frontline','monk'], ['soul_reaper','Soul Reaper','soul_linker',3,'support','support'],
  ['night_watch','Night Watch','rebellion',3,'ranged','gunslinger'],

  ['rune_knight','Rune Knight','lord_knight',4,'frontline','sword'], ['royal_guard','Royal Guard','paladin',4,'frontline','tank'],
  ['warlock','Warlock','high_wizard',4,'ranged','magic'], ['sorcerer','Sorcerer','professor',4,'support','sage'],
  ['ranger','Ranger','sniper',4,'ranged','archer'], ['minstrel','Minstrel','clown',4,'support','song'], ['wanderer','Wanderer','gypsy',4,'support','song'],
  ['archbishop','Archbishop','high_priest',4,'support','support'], ['sura','Sura','champion',4,'frontline','monk'],
  ['mechanic','Mechanic','whitesmith',4,'frontline','merchant'], ['genetic','Genetic','creator',4,'support','alchemist'],
  ['guillotine_cross','Guillotine Cross','assassin_cross',4,'frontline','thief'], ['shadow_chaser','Shadow Chaser','stalker',4,'frontline','rogue'],
  ['rebellion_advanced','Rebellion','night_watch',4,'ranged','gunslinger'], ['spirit_handler_advanced','Spirit Handler','spirit_handler',4,'support','summoner'],
];

const kits = {
  sword: [
    ['Bash','Heavy single-target strike','attack',2.1,0,0],
    ['Bowling Bash','Chain a blow through nearby foes','area',1.55,2.8,0],
    ['Spear Boomerang','Ranged weapon strike','ranged',1.8,0,0],
    ['Aura Blade','Sharpen the party’s attack','buffAtk',0,0,0],
    ['Two-Hand Quicken','Accelerate basic attacks','passive',0,0,0,'atkSpeed'],
  ],
  tank: [
    ['Shield Charge','Shield-first impact that interrupts','control',1.55,0,1],
    ['Grand Cross','Holy cross damages a small area','areaHoly',1.7,2.5,0],
    ['Devotion','Protect the most injured ally','guard',0,0,0],
    ['Defender','Brace against incoming attacks','buffDef',0,0,0],
    ['Shield Mastery','Improve shield defense','passive',0,0,0,'def'],
  ],
  magic: [
    ['Fire Bolt','Focused elemental bolt','magic',2.25,0,0],
    ['Storm Gust','Freeze and scatter clustered foes','areaControl',1.55,3.2,1],
    ['Meteor Storm','Heavy fire area spell','area',1.85,3.8,0],
    ['Jupitel Thunder','Wind spell with interrupt chance','control',1.9,0,1],
    ['Magic Power','Increase spell potency','passive',0,0,0,'magic'],
  ],
  sage: [
    ['Cold Bolt','Elemental bolt with a slow','magicControl',1.9,0,1],
    ['Land Protector','Reduce damage to the party','buffDef',0,0,0],
    ['Dispel','Strip enemy momentum and interrupt','control',1.2,0,1],
    ['Psychic Wave','Elemental area pulse','area',1.65,2.7,0],
    ['Study','Improve spell efficiency','passive',0,0,0,'sp'],
  ],
  archer: [
    ['Double Strafe','Two precise shots at one target','ranged',2.4,0,0],
    ['Arrow Shower','Spread damage across a cluster','area',1.55,3,0],
    ['Blitz Beat','Falcon strike with armor-piercing force','falcon',1.9,2.4,0],
    ['Ankle Snare','Trap and interrupt one target','control',1.1,0,2],
    ['Vulture’s Eye','Extend effective bow range','passive',0,0,0,'range'],
  ],
  support: [
    ['Heal','Restore the most injured ally','heal',0,0,0],
    ['Blessing','Raise party attack and accuracy','buffAtk',0,0,0],
    ['Sanctuary','Restore the party and damage undead','partyHeal',1.15,2.8,0],
    ['Lex Aeterna','Expose a target to a burst follow-up','vulnerability',0,0,0],
    ['Divine Protection','Improve party resilience','passive',0,0,0,'def'],
  ],
  monk: [
    ['Raging Trifecta Blow','Fast combo with a chance to stagger','combo',1.85,0,1],
    ['Occult Impaction','Punish high-defense targets','pierce',2.5,0,0],
    ['Asura Strike','Spend extra SP for a decisive finisher','finisher',3.1,0,0],
    ['Mental Strength','Brace and draw enemy pressure','buffDef',0,0,0],
    ['Spirit Training','Improve SP recovery','passive',0,0,0,'sp'],
  ],
  merchant: [
    ['Mammonite','Heavy coin-fueled strike','attack',2.6,0,0],
    ['Cart Revolution','Wide cart sweep','area',1.75,3,0],
    ['Hammer Fall','Stagger enemies in a small area','areaControl',1.25,2.3,1],
    ['Adrenaline Rush','Increase party attack tempo','buffAtk',0,0,0],
    ['Weapon Research','Improve weapon damage','passive',0,0,0,'atk'],
  ],
  alchemist: [
    ['Acid Demonstration','Corrosive ranged burst','pierce',2.15,0,0],
    ['Fire Expansion','Splash an alchemical mixture','area',1.65,2.7,0],
    ['Aid Potion','Restore an ally and improve potion value','heal',0,0,0],
    ['Plant Cultivation','Summon a plant to pressure enemies','summon',1.5,0,0],
    ['Pharmacy','Improve potion and SP efficiency','passive',0,0,0,'heal'],
  ],
  thief: [
    ['Envenom','Poison a priority target','poison',1.7,0,0],
    ['Sonic Blow','Rapid single-target burst','burst',2.7,0,0],
    ['Grimtooth','Strike several enemies from concealment','area',1.8,2.4,0],
    ['Enchant Poison','Add venom to repeated attacks','venom',0,0,0],
    ['Katar Mastery','Improve critical attacks','passive',0,0,0,'crit'],
  ],
  rogue: [
    ['Back Stab','Exploit an opening with a precise strike','burst',2.25,0,0],
    ['Raid','Disrupt a cluster and lower their tempo','areaControl',1.35,2.5,1],
    ['Strip Weapon','Weaken a dangerous target','vulnerability',0,0,0],
    ['Triangle Shot','Ranged trick attack','ranged',1.9,0,0],
    ['Gank','Improve material finds','passive',0,0,0,'loot'],
  ],
  song: [
    ['Arrow Vulcan','A focused volley','ranged',2.2,0,0],
    ['Bragi’s Poem','Reduce party skill downtime','buffTempo',0,0,0],
    ['A Poem of Bragi','Sustain the team’s tempo','buffTempo',0,0,0],
    ['Dissonance','Damage and disrupt nearby enemies','areaControl',1.3,2.5,1],
    ['Musical Lessons','Improve support skill strength','passive',0,0,0,'heal'],
  ],
  ninja: [
    ['Throw Huuma Shuriken','Piercing ranged area attack','area',1.7,2.4,0],
    ['Flaming Petals','Fire spell that scorches a target','magic',2.15,0,0],
    ['Cicada Skin Shed','Dodge pressure and restore tempo','buffDef',0,0,0],
    ['Lightning Spear of Ice','Fast water-element strike','magicControl',1.85,0,1],
    ['Ninja Training','Improve SP economy','passive',0,0,0,'sp'],
  ],
  gunslinger: [
    ['Tracking','A long-range precision shot','ranged',2.4,0,0],
    ['Desperado','Rapid close-range fan of bullets','area',1.65,2.5,0],
    ['Spread Attack','Suppress a group','areaControl',1.4,3,1],
    ['Bull’s Eye','Focus fire on a marked target','burst',2.65,0,0],
    ['Single Action','Improve firearm attack tempo','passive',0,0,0,'atkSpeed'],
  ],
  summoner: [
    ['Lunatic Carrot Beat','Companion-assisted single target strike','summon',1.85,0,0],
    ['Picky Peck','Quick ranged companion attack','ranged',1.6,0,0],
    ['Fresh Shrimp','Restore party vitality','partyHeal',0.8,2.5,0],
    ['Silvervine Stem Spear','Focused nature magic','magic',2.0,0,0],
    ['Catnip Powdering','Weaken a clustered enemy group','areaControl',1.2,2.5,1],
  ],
};

const specialKits = {
  lord_knight: [['Spear Dynamo','A charging spear combo','combo',2.0,0,0],['Spiral Pierce','Drill through a priority target','pierce',2.4,0,0],['Berserk','Trade defense for a sustained assault','buffAtk',0,0,0],['Parrying','Deflect incoming pressure','buffDef',0,0,0],['Frenzy Mastery','Improve attack tempo','passive',0,0,0,'atkSpeed']],
  paladin: [['Shield Chain','A shield combo with reliable impact','combo',1.9,0,0],['Sacrifice','Protect the party by taking a share of hits','guard',0,0,0],['Gospel','Strengthen nearby allies','buffAtk',0,0,0],['Pressure','Disrupt an enemy’s casting rhythm','control',1.35,0,2],['Faith','Increase defensive endurance','passive',0,0,0,'def']],
  warlock: [['Crimson Rock','Explosive fire magic','area',2.15,3.2,0],['Comet','A delayed high-impact area spell','area',2.7,4,0],['Jack Frost','Water magic that interrupts a group','areaControl',1.65,3.5,2],['Chain Lightning','Wind spell that jumps through foes','area',1.8,3.2,0],['Intensive Telekinesis','Amplify spell output','passive',0,0,0,'magic']],
  sorcerer: [['Psychic Wave','Elemental field attack','area',1.9,3.3,0],['Diamond Dust','Water-element area pressure','areaControl',1.55,3,1],['Striking','Increase the party’s attack power','buffAtk',0,0,0],['Varetyr Spear','Wind spear with a stagger','control',2.0,0,1],['Spirit Control','Improve SP recovery','passive',0,0,0,'sp']],
  ranger: [['Arrow Storm','A wide arrow barrage','area',2.0,4,0],['Fear Breeze','Increase the tempo of bow fire','buffTempo',0,0,0],['Ankle Snare','Immobilize a priority target','control',1.1,0,2],['Warg Strike','Send a wolf companion at a target','falcon',2.2,2.3,0],['Trap Research','Improve trap damage and range','passive',0,0,0,'range']],
  archbishop: [['Coluseo Heal','Restore all nearby party members','partyHeal',1.3,8,0],['Clementia','Bless nearby allies with attack power','buffAtk',0,0,0],['High Heal','A powerful single-target recovery','heal',0,0,0],['Oratio','Expose nearby enemies to holy damage','vulnerability',0,3,0],['Expiatio','Improve holy strike potency','passive',0,0,0,'heal']],
  sura: [['Dragon Combo','Chain rapid blows into a stun chance','combo',2.0,0,1],['Cursed Circle','Immobilize a group of foes','areaControl',1.0,3,3],['Earth Shaker','A ground shockwave with a wide hit area','areaControl',1.8,3.5,2],['Gates of Hell','Spend SP for a decisive low-HP finisher','finisher',3.5,0,0],['Gentle Touch','Master pressure-point combat','passive',0,0,0,'atk']],
  mechanic: [['Knuckle Boost','A long-range rocket punch','ranged',2.1,0,0],['Arm Cannon','Blast an area with a cannon','area',1.9,3.4,0],['Flame Launcher','Set an area alight','area',1.55,3,0],['Madogear License','Deploy a powered combat rig','buffDef',0,0,0],['Remodel Mainframe','Improve mechanized attack power','passive',0,0,0,'atk']],
  genetic: [['Acid Demonstration','Corrosive single-target burst','pierce',2.4,0,0],['Cart Cannon','Fire a heavy cart shell','area',1.8,3,0],['Hell Plant','Summon plants to pressure enemies','summon',1.75,2.5,0],['Spore Explosion','Delay, then burst a clustered area','areaControl',1.55,3,1],['Special Pharmacy','Improve healing and SP economy','passive',0,0,0,'heal']],
  assassin: [['Sonic Blow','Rapid single-target burst','burst',2.8,0,0],['Envenom','Poison a priority target','poison',1.7,0,0],['Grimtooth','Strike several enemies from concealment','area',1.8,2.4,0],['Enchant Poison','Add venom to repeated attacks','venom',0,0,0],['Katar Mastery','Improve critical attacks','passive',0,0,0,'crit']],
  guillotine_cross: [['Cross Impact','Seven rapid hits on one target','burst',2.9,0,0],['Rolling Cutter','Spin through nearby enemies','area',1.7,2.8,0],['Cross Ripper Slasher','Release accumulated spinning force','finisher',3.0,0,0],['Poisonous Weapon','Coat attacks with venom','venom',0,0,0],['Katar Mastery','Sharpen critical strikes','passive',0,0,0,'crit']],
  shadow_chaser: [['Masquerade','Weaken a priority target','vulnerability',0,0,0],['Triangle Shot','A fast ranged shot','ranged',2.2,0,0],['Manhole','Trap an enemy out of action','control',1.0,0,3],['Shadow Formation','Redirect pressure from an ally','guard',0,0,0],['Plagiarism','Adapt enemy techniques','passive',0,0,0,'atk']],
  night_watch: [['Spiral Shooting','A focused multi-round burst','burst',2.7,0,0],['Wild Fire','Suppress a wide area','area',1.8,3.3,0],['Only One Bullet','A long-range precision finisher','finisher',3.3,0,0],['Mass Spiral','Pierce the toughest target','pierce',2.3,0,0],['Firearm Mastery','Improve gun handling','passive',0,0,0,'atkSpeed']],
};
export const RENEWAL_JOBS = Object.fromEntries(paths.map(([id,name,parent,tier,role,kit]) => [id, { id,name,parent,tier,role,kit }]));
export const SKILL_TREES = Object.fromEntries(paths.map(([jobId,,parent,tier,,kit]) => {
  const template = specialKits[jobId] || kits[kit];
  const nodes = template.map(([name,description,effect,power,splash,control,passive]) => ({
    id: `${jobId}_${name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')}`,
    name, description, effect, power, splash, control, passive: passive || null,
    maxLevel: passive ? 10 : 5,
    jobLevel: passive ? 1 : 1 + template.indexOf(template.find(item => item[0] === name)) * 4,
    requires: passive ? [{ skill: `${jobId}_${template[0][0].toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')}`, level: 3 }] : [],
    kind: passive ? 'passive' : 'active',
    spCost: passive ? 0 : [8, 12, 15, 18, 22][template.indexOf(template.find(item => item[0] === name))],
    cooldown: passive ? 0 : [5, 7, 9, 11, 15][template.indexOf(template.find(item => item[0] === name))],
    rankPower: power,
    range: ['ranged','magic','magicControl','area','areaControl','areaHoly'].includes(effect) ? 8 : 3,
    branch: tier >= 4 ? 'Renewal' : tier === 3 ? 'Transcendent' : tier === 2 ? 'Second Job' : 'First Job',
    parentJob: parent,
  }));
  return [jobId, nodes];
}));
const overrides = {
  mage: ['Fire Bolt','magic',2.4,3,0], knight: ['Brandish Spear','area',2.1,3.5,0],
  wizard: ['Storm Gust','areaControl',1.55,4,2], hunter: ['Blitz Beat','falcon',1.9,4,0],
  priest: ['Sanctuary','partyHeal',1.15,8,0], blacksmith: ['Hammer Fall','areaControl',1.25,2.5,2],
  assassin: ['Sonic Blow','burst',2.8,0,0],
};
for (const [job, [name,effect,power,splash,control]] of Object.entries(overrides)) {
  const node = SKILL_TREES[job][0];
  const oldId = node.id;
  node.name = name; node.effect = effect; node.rankPower = power; node.splash = splash; node.control = control;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
  node.id = `${job}_${slug}`;
  for (const skill of SKILL_TREES[job]) for (const req of skill.requires) if (req.skill === oldId) req.skill = node.id;
}
SKILL_TREES.novice = [
  { id:'novice_first_aid', name:'First Aid', description:'The Novice restores their own HP.', effect:'heal', power:0, splash:0, control:0, passive:null, maxLevel:5, jobLevel:1, requires:[], kind:'active', spCost:8, cooldown:10, rankPower:0.45, range:3, branch:'Basic Job' },
  { id:'novice_basic_training', name:'Basic Training', description:'A little more attack and defense from practice.', effect:'passive', power:0, splash:0, control:0, passive:'atk', maxLevel:5, jobLevel:3, requires:[{skill:'novice_first_aid',level:2}], kind:'passive', spCost:0, cooldown:0, rankPower:0, range:0, branch:'Basic Job' },
];
export const SKILL_INDEX = Object.fromEntries(Object.values(SKILL_TREES).flat().map(skill => [skill.id, skill]));
const buildLibrary = {
  sword:[['balanced','Vanguard','Even attack and survivability.',{}],['spear','Spear Master','Longer reach and stronger single-target skills.',{range:0.8,skillPower:0.08}],['breaker','Line Breaker','Favor area attacks and enemy interruption.',{skillPower:0.12,control:0.25}]],
  tank:[['guardian','Guardian','Prioritize defense and party protection.',{def:3,heal:0.08}],['crusader','Holy Knight','Turn holy skills into reliable damage.',{skillPower:0.14}],['protector','Protector','Stronger control and protection windows.',{control:0.3,def:1}]],
  magic:[['elemental','Elementalist','Elemental weaknesses hit harder.',{skillPower:0.18}],['storm','Storm Caster','Trade single-target power for area control.',{skillPower:0.1,control:0.3}],['artillery','Spell Artillery','Maximize burst at a slower skill cadence.',{skillPower:0.24,speed:-0.05}]],
  sage:[['disruptor','Disruptor','Interrupt dangerous enemy actions.',{control:0.35}],['fieldmage','Field Mage','Improve elemental area pressure.',{skillPower:0.16}],['enchanter','Enchanter','Increase party support uptime.',{heal:0.08,speed:0.06}]],
  archer:[['auto','Auto Attack','Fast, dependable basic bow attacks.',{speed:0.18,crit:0.03}],['falcon','Falcon','Empower companion strikes and critical follow-ups.',{skillPower:0.17,crit:0.02}],['trapper','Trapper','Stronger traps and longer control windows.',{skillPower:0.1,control:0.35}]],
  support:[['healer','Healer','Increase direct and group healing.',{heal:0.22}],['buffer','Battle Support','Improve buffs and sustain the party.',{heal:0.1,speed:0.08}],['exorcist','Exorcist','Increase holy damage against undead.',{skillPower:0.2}]],
  monk:[['combo','Combo Artist','Fast combo pressure with reliable control.',{speed:0.1,control:0.12}],['spirit','Spirit Breaker','More SP-efficient ranged and spirit attacks.',{skillPower:0.12,sp:0.12}],['asura','Asura Striker','High-risk, high-burst finishers.',{skillPower:0.28,def:-1}]],
  merchant:[['weaponmaster','Weaponmaster','Stronger weapon skills and auto-attacks.',{atk:0.12}],['cart','Cart Fighter','Wider area attacks and stagger.',{skillPower:0.1,control:0.16}],['forge','Field Smith','Improve party tempo and durability.',{def:1,speed:0.08}]],
  alchemist:[['acid','Acidist','Focus corrosive single-target damage.',{skillPower:0.2}],['bombardier','Bombardier','Improve area and plant pressure.',{skillPower:0.14,control:0.12}],['chemist','Field Chemist','Improve potion healing and SP economy.',{heal:0.2,sp:0.08}]],
  thief:[['critical','Critical','Faster attacks with stronger critical chance.',{speed:0.12,crit:0.04}],['poison','Poisoner','Improve venom damage and uptime.',{skillPower:0.14,control:0.1}],['assassin','Assassin','Trade defense for burst finishers.',{skillPower:0.2,def:-1}]],
  rogue:[['bow','Bow Rogue','Long-range pressure and safer positioning.',{range:0.7,skillPower:0.08}],['control','Shadow Control','Increase debuff and trap duration.',{control:0.3}],['stalker','Stalker','Balanced concealment and burst.',{speed:0.08,crit:0.02}]],
  song:[['chorus','Chorus','Improve party-wide buff uptime.',{heal:0.12,speed:0.08}],['soloist','Soloist','Stronger ranged damage while separated.',{skillPower:0.17}],['debuffer','Discord','More control and enemy disruption.',{control:0.25,skillPower:0.06}]],
  ninja:[['spellblade','Spellblade','Elemental ninjutsu and ranged power.',{skillPower:0.16}],['shuriken','Shuriken','Improve physical ranged volleys.',{range:0.5,atk:0.08}],['evasion','Evasion','Favor survivability and counter tempo.',{def:2,speed:0.06}]],
  gunslinger:[['marksman','Marksman','Precision shots and critical damage.',{range:0.6,crit:0.03}],['guns','Guns Akimbo','Rapid fire and area suppression.',{speed:0.14,skillPower:0.06}],['artillery','Heavy Ordnance','Slower, heavier burst and interrupts.',{skillPower:0.2,control:0.12,speed:-0.04}]],
  summoner:[['paw','Paw Offense','Improve companion strikes and area magic.',{skillPower:0.14}],['sprout','Sprout Support','Improve healing and recovery.',{heal:0.18}],['whisker','Whisker Control','Increase enemy debuff duration.',{control:0.25,range:0.2}]],
};
export const JOB_BUILDS = Object.fromEntries(paths.map(([id,, , , ,kit]) => [id, (buildLibrary[kit] || []).map(([key,name,description,mods]) => ({ id:key,name,description,mods }))]));
export const JOB_PROGRESSION = paths.map(([id,name,parent,tier,role,kit]) => ({ id,name,parent,tier,role,kit }));
export function jobCap(jobId) { return (RENEWAL_JOBS[jobId]?.tier || 1) >= 3 ? 70 : 50; }
export function jobRequirement(jobId) {
  const tier = RENEWAL_JOBS[jobId]?.tier || (jobId === 'novice' ? 0 : 1);
  if (tier === 0) return { jobLevel: 10, baseLevel: 1 };
  if (tier === 1) return { jobLevel: 40, baseLevel: 1 };
  if (tier === 2) return { jobLevel: 50, baseLevel: 1 };
  return { jobLevel: 50, baseLevel: 99 };
}
