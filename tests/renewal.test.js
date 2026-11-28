import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, command, stats, canEquipGear, refineBonuses, rollGearAffixes } from '../src/sim.js';
import { GEAR_ITEMS, GEAR_AFFIXES, gearFitsSlot, refineSuccessPercent, refineCost } from '../src/data.js';
import { encodeSave, decodeSave } from '../src/persistence.js';

test('Renewal equipment records expose database base stats and gear attributes affect combat stats', () => {
  assert.equal(GEAR_ITEMS.knife.atk,17); assert.equal(GEAR_ITEMS.knife.weaponLevel,1); assert.equal(GEAR_ITEMS.knife.slots,3);
  assert.equal(GEAR_ITEMS.sword.atk,25); assert.equal(GEAR_ITEMS.bow.atk,15); assert.equal(GEAR_ITEMS.rod.matk,30);
  assert.equal(GEAR_ITEMS.cotton_shirt.def,10); assert.equal(GEAR_ITEMS.guard.def,20); assert.equal(GEAR_ITEMS.sandal.def,5);
  assert.equal(GEAR_ITEMS.circlet.mdef,3); assert.equal(GEAR_ITEMS.clip.sp,10); assert.equal(GEAR_ITEMS.glove.dex,2);
  assert.equal(canEquipGear('mage','sword'),false); assert.equal(canEquipGear('runeKnight','sword'),true);
  assert.equal(canEquipGear('novice','glove',99),false); assert.equal(canEquipGear('archer','glove',19),false);
  assert.equal(gearFitsSlot(GEAR_ITEMS.rosary,'accessory1'),true);
  const c=createGame().characters[0],base=stats(c);
  c.gear={accessory1:{uid:'test-glove',itemId:'glove',refine:0,affixes:[]},accessory2:{uid:'test-ring',itemId:'ring',refine:0,affixes:[]}};
  assert.equal(stats(c).atk,base.atk+4); assert.equal(stats(c).skillBonus,base.skillBonus+4);
});

test('refinement effects, rates, costs and +1 through +20 cap follow the documented model', () => {
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

test('equipping transfers unique gear instances, and affixes are seeded, bounded, and combat-active', () => {
  const s=createGame(1234),c=s.characters[0],knife=s.inventory.gearItems.find(v=>v.itemId==='knife');
  const other=createGame(1234);
  assert.deepEqual(rollGearAffixes(s,'knife'),rollGearAffixes(other,'knife'));
  const rolled=rollGearAffixes(other,'knife');
  assert.ok(rolled.length>=1&&rolled.length<=3);
  assert.equal(new Set(rolled.map(a=>a.id)).size,rolled.length);
  for(const affix of rolled){assert.ok(GEAR_AFFIXES[affix.id].slots.includes('weapon'));assert.ok(affix.value>=GEAR_AFFIXES[affix.id].min&&affix.value<=GEAR_AFFIXES[affix.id].max);}
  knife.affixes=[{id:'mighty',value:8}];
  const before=stats(c).atk;
  assert.equal(command(s,{type:'gear-equip',ids:[c.id],slot:'weapon',item:'knife',uid:knife.uid}),null);
  assert.equal(stats(c).atk,before+25);
  assert.equal(s.inventory.gear.knife||0,0);
  assert.equal(command(s,{type:'gear-unequip',ids:[c.id],slot:'weapon'}),null);
  assert.equal(s.inventory.gear.knife,1);
  const loaded=decodeSave(encodeSave(s)).state;
  assert.deepEqual(loaded.characters[0].gear,c.gear);
});

test('refining consumes real ores, preserves identity, and blocks unsafe class or item-slot equips', () => {
  const s=createGame(),c=s.characters[0],knife=s.inventory.gearItems.find(v=>v.itemId==='knife');
  s.inventory.zeny=10000;s.inventory.items.phracon=7;
  assert.equal(command(s,{type:'gear-equip',ids:[c.id],slot:'weapon',item:'knife',uid:knife.uid}),null);
  for(let i=0;i<7;i++)assert.equal(command(s,{type:'refine-gear',ids:[c.id],uid:knife.uid}),null);
  assert.equal(c.gear.weapon.refine,7);assert.equal(s.inventory.items.phracon,0);assert.equal(s.inventory.zeny,9650);
  s.inventory.items.phracon=1;s.seed=0;
  assert.equal(command(s,{type:'refine-gear',ids:[c.id],uid:knife.uid}),null);
  assert.equal(c.gear.weapon.refine,8);
  assert.ok(command(s,{type:'gear-equip',ids:[c.id],slot:'armor',item:'knife',uid:knife.uid}));
  assert.ok(command(s,{type:'gear-equip',ids:[c.id],slot:'weapon',item:'bow',uid:'missing'}));
});

test('refine ore exchange is atomic and over-safe failures destroy the affected instance', () => {
  const s=createGame(),c=s.characters[0];s.inventory.items.oridecon=3;s.inventory.zeny=50000;
  assert.equal(command(s,{type:'refine-convert',ids:[c.id],from:'oridecon',to:'bradium'}),null);
  assert.equal(s.inventory.items.bradium,1);assert.equal(s.inventory.items.oridecon,0);assert.equal(s.inventory.zeny,0);
  s.inventory.zeny=50;s.inventory.items.phracon=1;
  const knife=s.inventory.gearItems.find(v=>v.itemId==='knife');knife.refine=7;
  let seed=0,value=0;do{seed++;value=(Math.imul(seed,1664525)+1013904223)>>>0;}while(value/4294967296<0.6);
  s.seed=seed;
  assert.equal(command(s,{type:'refine-gear',ids:[c.id],uid:knife.uid}),null);
  assert.equal(s.inventory.items.phracon,0);assert.equal(s.inventory.zeny,0);
  assert.ok(!s.inventory.gearItems.some(v=>v.uid===knife.uid));assert.equal(s.inventory.gear.knife||0,0);
});

test('save validation migrates legacy gear strings and rejects malformed affixes or refine levels', () => {
  const envelope=JSON.parse(encodeSave(createGame()));
  envelope.state.characters[0].gear={weapon:'knife'};
  delete envelope.state.inventory.gearItems;
  const migrated=decodeSave(JSON.stringify(envelope)).state;
  assert.equal(migrated.characters[0].gear.weapon.itemId,'knife');
  assert.equal(migrated.characters[0].gear.weapon.refine,0);
  assert.deepEqual(decodeSave(encodeSave(migrated)).state,migrated);
  const badAffix=JSON.parse(encodeSave(createGame()));
  badAffix.state.inventory.gearItems.find(v=>v.itemId==='knife').affixes=[{id:'mighty',value:999}];
  assert.throws(()=>decodeSave(JSON.stringify(badAffix)),/invalid/i);
  const badRefine=JSON.parse(encodeSave(createGame()));
  badRefine.state.inventory.gearItems.find(v=>v.itemId==='knife').refine=21;
  assert.throws(()=>decodeSave(JSON.stringify(badRefine)),/invalid/i);
});
