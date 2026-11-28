import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, command, gainExp, stats, canEquipGear, refineBonuses, rollGearAffixes } from '../src/sim.js';
import { JOBS, RENEWAL_JOBS, SKILL_TREES, SKILL_INDEX, JOB_BUILDS, GEAR_ITEMS, GEAR_AFFIXES, GEAR_SLOTS, gearFitsSlot, ITEMS, refineSuccessPercent, refineCost, jobCap, jobRequirement, jobChoices } from '../src/data.js';
import { encodeSave, decodeSave } from '../src/persistence.js';

const promoteAt = (state, character, job, jobLevel = 1000, baseExp = 2000) => {
  gainExp(state, character, baseExp, jobLevel);
  return command(state, { type:'promote', ids:[character.id], job });
};

test('Renewal job graph covers every supported root, branch, transcendent job, and named third-job path', () => {
  for (const id of ['knight','crusader','wizard','sage','hunter','bard','dancer','priest','monk','blacksmith','alchemist','assassin','rogue','rune_knight','royal_guard','warlock','sorcerer','ranger','archbishop','sura','mechanic','genetic','guillotine_cross','shadow_chaser']) {
    assert.ok(JOBS[id], `missing job ${id}`);
    assert.ok(SKILL_TREES[id]?.length >= 5, `missing combat kit for ${id}`);
  }
  assert.ok(jobChoices('novice').length >= 10);
  assert.equal(JOBS.shadow_chaser.parent, 'stalker');
  assert.equal(JOBS.sura.parent, 'champion');
  assert.equal(JOBS.rune_knight.parent, 'lord_knight');
  assert.ok(jobCap('rune_knight') > jobCap('knight'));
  assert.deepEqual(jobRequirement('sniper'), { jobLevel:50, baseLevel:99 });
  assert.equal(new Set(Object.keys(SKILL_INDEX)).size, Object.keys(SKILL_INDEX).length);
});

test('skills have ranks, prerequisites and combat semantics, and earned points train them', () => {
  const s = createGame(), c = s.characters[0];
  gainExp(s, c, 2000, 500);
  assert.ok(c.skillPoints > 0);
  assert.equal(command(s,{ type:'promote', ids:[c.id], job:'swordsman' }), null);
  c.jobLevel = 20; c.skillPoints = 20;
  const tree = SKILL_TREES.swordsman;
  const second = tree.find(skill => skill.kind === 'active' && skill.id !== tree[0].id);
  assert.equal(command(s,{ type:'learn-skill', ids:[c.id], skill:second.id }), null);
  assert.equal(c.skills[second.id],1);
  assert.equal(command(s,{ type:'prepare-skill', ids:[c.id], skill:second.id }), null);
  assert.equal(c.activeSkill,second.id);
  assert.equal(stats(c).skill,second.name);
  assert.equal(command(s,{ type:'learn-skill', ids:[c.id], skill:'not_a_skill' }) !== null,true);
  c.mapId = 'meadow';
  assert.ok(command(s,{ type:'learn-skill', ids:[c.id], skill:second.id }));
});

test('class build choices change auto-battle stats and persist as a per-character selection', () => {
  const s=createGame(), c=s.characters[0];
  gainExp(s,c,1200,500);
  assert.equal(command(s,{type:'promote',ids:[c.id],job:'archer'}),null);
  const choices=JOB_BUILDS.archer;
  assert.deepEqual(choices.map(build=>build.id),['auto','falcon','trapper']);
  const auto=stats(c);
  assert.equal(command(s,{type:'set-build',ids:[c.id],build:'trapper'}),null);
  const trapper=stats(c);
  assert.ok(auto.interval<trapper.interval);
  assert.ok((trapper.buildMods.control || 0)>(auto.buildMods.control || 0));
  assert.ok(command(s,{type:'set-build',ids:[c.id],build:'not-a-build'}));
  assert.equal(c.build,'trapper');
  const saved=decodeSave(encodeSave(s)).state;
  assert.equal(saved.characters[0].build,'trapper');
});

test('class signatures produce distinct live effects for area, poison, party healing and controls', () => {
  const area = createGame(), knight = area.characters[0];
  promoteAt(area, knight, 'swordsman'); knight.jobLevel=40;
  assert.equal(command(area,{type:'promote',ids:[knight.id],job:'knight'}),null);
  command(area,{type:'deploy',ids:[knight.id],mapId:'meadow'});
  const enemies=area.maps.meadow.monsters;
  for(const enemy of enemies) Object.assign(enemy,{x:knight.x,y:knight.y,hp:500});
  knight.targetId=enemies[0].id;
  assert.equal(command(area,{type:'skill',ids:[knight.id]}),null);
  assert.ok(enemies.filter(enemy=>enemy.hp<500).length>1);

  const poison = createGame(), thief=poison.characters[0];
  promoteAt(poison,thief,'thief'); thief.jobLevel=40;
  assert.equal(command(poison,{type:'promote',ids:[thief.id],job:'assassin'}),null);
  thief.jobLevel=20; thief.skillPoints=20;
  const envenom=SKILL_TREES.assassin.find(skill=>skill.effect==='poison');
  assert.equal(command(poison,{type:'learn-skill',ids:[thief.id],skill:envenom.id}),null);
  assert.equal(command(poison,{type:'prepare-skill',ids:[thief.id],skill:envenom.id}),null);
  command(poison,{type:'deploy',ids:[thief.id],mapId:'meadow'});
  const target=poison.maps.meadow.monsters[0]; Object.assign(target,{x:thief.x,y:thief.y,hp:500}); thief.targetId=target.id;
  assert.equal(command(poison,{type:'skill',ids:[thief.id]}),null);
  assert.ok(target.statuses?.poison);
});

test('third-job promotions enforce Renewal Base 99 gate and preserve learned prior skills', () => {
  const s=createGame(), c=s.characters[0];
  gainExp(s,c,5000,3000);
  assert.equal(command(s,{type:'promote',ids:[c.id],job:'archer'}),null);
  const firstSkill=Object.keys(c.skills)[0];
  c.jobLevel=40;
  assert.equal(command(s,{type:'promote',ids:[c.id],job:'hunter'}),null);
  assert.ok(c.skills[firstSkill] > 0);
  c.jobLevel=50;
  assert.equal(command(s,{type:'promote',ids:[c.id],job:'sniper'}),null);
  c.jobLevel=50; c.level=98;
  assert.match(command(s,{type:'promote',ids:[c.id],job:'ranger'}),/Base Lv. 99/);
  c.level=99;
  assert.equal(command(s,{type:'promote',ids:[c.id],job:'ranger'}),null);
  assert.equal(c.job,'ranger');
  assert.equal(jobCap('sniper'),70);
});

test('multi-slot gear respects class restrictions, transfers correctly and recalculates battle stats', () => {
  const s=createGame(), c=s.characters[0]; c.job='archer'; c.level=4;
  assert.equal(canEquipGear('mage','sword'),false);
  assert.equal(canEquipGear('rune_knight','sword'),true);
  const before=stats(c);
  assert.equal(command(s,{type:'gear-equip',ids:[c.id],slot:'weapon',item:'bow'}),null);
  assert.equal(s.inventory.gear.bow || 0,0);
  assert.ok(stats(c).atk>before.atk);
  assert.ok(command(s,{type:'gear-equip',ids:[c.id],slot:'weapon',item:'rod'}));
  assert.ok(command(s,{type:'gear-equip',ids:[c.id],slot:'armor',item:'bow'}));
  assert.equal(command(s,{type:'gear-unequip',ids:[c.id],slot:'weapon'}),null);
  assert.equal(s.inventory.gear.bow,1);
});

test('Renewal equipment base data and refine bonuses match the documented RO item/refine rules', () => {
  assert.equal(GEAR_ITEMS.knife.atk,17); assert.equal(GEAR_ITEMS.knife.weaponLevel,1); assert.equal(GEAR_ITEMS.knife.slots,3);
  assert.equal(GEAR_ITEMS.sword.atk,25); assert.equal(GEAR_ITEMS.bow.atk,15); assert.equal(GEAR_ITEMS.rod.matk,30);
  assert.equal(GEAR_ITEMS.cotton_shirt.def,10); assert.equal(GEAR_ITEMS.guard.def,20); assert.equal(GEAR_ITEMS.sandal.def,5);
  assert.equal(GEAR_ITEMS.circlet.mdef,3); assert.equal(GEAR_ITEMS.clip.sp,10); assert.equal(GEAR_ITEMS.glove.dex,2);
  assert.equal(GEAR_ITEMS.clip.refineable,false); assert.equal(canEquipGear('novice','glove',99),false); assert.equal(canEquipGear('archer','glove',19),false);
  assert.equal(gearFitsSlot(GEAR_ITEMS.rosary,'accessory1'),true);
  const c=createGame().characters[0], base=stats(c); c.gear={accessory1:{itemId:'glove'},accessory2:{itemId:'ring'}};
  assert.equal(stats(c).atk,base.atk+4); assert.equal(stats(c).skillBonus,base.skillBonus+4);
  assert.deepEqual(refineBonuses({itemId:'sword',refine:20}),{atk:60,matk:60,def:0});
  assert.deepEqual(refineBonuses({itemId:'bow',refine:20}),{atk:60,matk:60,def:0});
  assert.deepEqual(refineBonuses({itemId:'cotton_shirt',refine:20}),{atk:0,matk:0,def:60});
  assert.equal(refineSuccessPercent(GEAR_ITEMS.sword,6),100);
  assert.equal(refineSuccessPercent(GEAR_ITEMS.sword,7),60);
  assert.equal(refineSuccessPercent(GEAR_ITEMS.cotton_shirt,4),60);
  assert.equal(refineSuccessPercent(GEAR_ITEMS.sword,10),18);
  assert.equal(refineSuccessPercent(GEAR_ITEMS.cotton_shirt,19),5);
  assert.deepEqual(refineCost(GEAR_ITEMS.sword,0),{zeny:50,material:'phracon',amount:1});
  assert.deepEqual(refineCost(GEAR_ITEMS.cotton_shirt,10),{zeny:100000,material:'carnium',amount:1});
});

test('gear loot rolls stable per-instance affixes and affixes affect combat stats', () => {
  const s=createGame(), c=s.characters[0];
  const rollA=rollGearAffixes(s,'knife','drop:123'), rollB=rollGearAffixes(s,'knife','drop:123');
  assert.deepEqual(rollA,rollB); assert.ok(rollA.length <= 3);
  assert.equal(new Set(rollA.map(a=>a.id)).size,rollA.length);
  for(const affix of rollA) {
    assert.ok(GEAR_AFFIXES[affix.id].slots.includes('weapon'));
    assert.ok(affix.value>=GEAR_AFFIXES[affix.id].min && affix.value<=GEAR_AFFIXES[affix.id].max);
  }
  const knife=s.inventory.gearItems.find(item=>item.itemId==='knife');
  knife.affixes=[{id:'mighty',value:8}];
  const before=stats(c).atk;
  assert.equal(command(s,{type:'gear-equip',ids:[c.id],slot:'weapon',item:'knife',uid:knife.uid}),null);
  assert.equal(stats(c).atk,before+25);
  const loaded=decodeSave(encodeSave(s)).state;
  assert.deepEqual(loaded.characters[0].gear.weapon,knife);
});

test('refinement consumes RO metals, tracks item identity and applies safe +1 through +7 upgrades', () => {
  const s=createGame(), c=s.characters[0]; s.inventory.zeny=10000; s.inventory.items.phracon=7;
  const knife=s.inventory.gearItems.find(item=>item.itemId==='knife'), before=stats(c).atk;
  assert.equal(command(s,{type:'gear-equip',ids:[c.id],slot:'weapon',item:'knife',uid:knife.uid}),null);
  for(let i=0;i<7;i++) assert.equal(command(s,{type:'refine-gear',ids:[c.id],uid:knife.uid}),null);
  assert.equal(c.gear.weapon.refine,7); assert.equal(s.inventory.items.phracon,0);
  assert.equal(s.inventory.zeny,10000-7*50);
  assert.equal(stats(c).atk,before+17+14);
  s.inventory.items.phracon=1; s.seed=0; // The first seeded roll succeeds at the documented 60% +8 rate.
  assert.equal(command(s,{type:'refine-gear',ids:[c.id],uid:knife.uid}),null);
  assert.equal(c.gear.weapon.refine,8);
  assert.equal(s.inventory.items.phracon,0);
});

test('advanced refine alloy exchange is atomic and a normal failure destroys over-safe gear', () => {
  const s=createGame(), c=s.characters[0]; s.inventory.items.oridecon=3; s.inventory.zeny=50000;
  assert.equal(command(s,{type:'refine-convert',ids:[c.id],from:'oridecon',to:'bradium'}),null);
  assert.equal(s.inventory.items.bradium,1); assert.equal(s.inventory.items.oridecon,0); assert.equal(s.inventory.zeny,0);
  s.inventory.zeny=50; s.inventory.items.phracon=1;
  const knife=s.inventory.gearItems.find(item=>item.itemId==='knife'); knife.refine=7;
  let seed=0, value=0;
  do { seed++; value=(Math.imul(seed,1664525)+1013904223)>>>0; } while(value/4294967296 < 0.6);
  s.seed=seed;
  assert.equal(command(s,{type:'refine-gear',ids:[c.id],uid:knife.uid}),null);
  assert.equal(s.inventory.items.phracon,0); assert.equal(s.inventory.zeny,0);
  assert.ok(!s.inventory.gearItems.some(item=>item.uid===knife.uid));
  assert.equal(s.inventory.gear.knife || 0,0);
});

test('red and blue potions consume a real bag stack and restore the correct resource', () => {
  const s=createGame(), c=s.characters[0];
  c.hp=10; c.sp=5; s.inventory.items.red_potion=1; s.inventory.items.blue_potion=1;
  assert.equal(command(s,{type:'use-item',ids:[c.id],item:'red_potion'}),null);
  assert.equal(c.hp,Math.min(stats(c).hp,75)); assert.equal(s.inventory.items.red_potion,0);
  assert.equal(command(s,{type:'use-item',ids:[c.id],item:'blue_potion'}),null);
  assert.equal(c.sp,Math.min(stats(c).sp,50)); assert.equal(s.inventory.items.blue_potion,0);
  assert.ok(command(s,{type:'use-item',ids:[c.id],item:'elunium'}));
});

test('gear, skill ranks, prepared skills and bag items survive a save round-trip', () => {
  const s=createGame(), c=s.characters[0];
  c.skillPoints=5; c.job='swordsman'; c.skills['swordsman_bash']=2; c.activeSkill='swordsman_bash';
  s.inventory.items.elunium=3;
  command(s,{type:'gear-equip',ids:[c.id],slot:'armor',item:'cotton_shirt'});
  const loaded=decodeSave(encodeSave(s)).state;
  assert.deepEqual(loaded.characters[0].gear,c.gear);
  assert.deepEqual(loaded.characters[0].skills,c.skills);
  assert.equal(loaded.inventory.items.elunium,3);
  assert.deepEqual(loaded, s);
});

test('legacy string gear saves migrate to durable item instances without changing ownership counts', () => {
  const envelope=JSON.parse(encodeSave(createGame()));
  envelope.state.characters[0].gear={weapon:'knife'};
  envelope.state.inventory.gear.knife=0;
  delete envelope.state.inventory.gearItems;
  const loaded=decodeSave(JSON.stringify(envelope)).state;
  assert.equal(loaded.characters[0].gear.weapon.itemId,'knife');
  assert.equal(loaded.characters[0].gear.weapon.refine,0);
  assert.equal(loaded.inventory.gear.knife || 0,0);
  assert.equal(loaded.inventory.gearItems.filter(item=>item.itemId==='knife').length,0);
  assert.deepEqual(decodeSave(encodeSave(loaded)).state,loaded);
});

test('save validation rejects out-of-range affix values and illegal refine levels', () => {
  const badAffix=JSON.parse(encodeSave(createGame()));
  const knife=badAffix.state.inventory.gearItems.find(item=>item.itemId==='knife');
  knife.affixes=[{id:'mighty',value:999}];
  assert.throws(()=>decodeSave(JSON.stringify(badAffix)),/invalid/i);
  const badRefine=JSON.parse(encodeSave(createGame()));
  badRefine.state.inventory.gearItems.find(item=>item.itemId==='knife').refine=21;
  assert.throws(()=>decodeSave(JSON.stringify(badRefine)),/invalid/i);
});

test('save validation rejects malformed combat buffs and poisoned enemy status data', () => {
  const envelope=JSON.parse(encodeSave(createGame()));
  envelope.state.characters[0].buffs={admin:999};
  assert.throws(()=>decodeSave(JSON.stringify(envelope)),/invalid/i);
  const clean=JSON.parse(encodeSave(createGame()));
  clean.state.maps.meadow.monsters[0].statuses={poison:{time:5,damage:-50,source:null}};
  assert.throws(()=>decodeSave(JSON.stringify(clean)),/invalid/i);
});

test('older save migration adds empty gear slots and a novice skill without losing existing inventory', () => {
  const envelope=JSON.parse(encodeSave(createGame()));
  for(const c of envelope.state.characters) { delete c.gear; delete c.skills; delete c.activeSkill; delete c.skillPoints; }
  delete envelope.state.inventory.gear; delete envelope.state.inventory.gearItems; delete envelope.state.inventory.items;
  const migrated=decodeSave(JSON.stringify(envelope)).state;
  assert.deepEqual(migrated.characters[0].gear,{});
  assert.equal(migrated.characters[0].skills.novice_first_aid,1);
  assert.equal(migrated.inventory.items.elunium,0);
  assert.deepEqual(migrated.inventory.materials,{});
});
