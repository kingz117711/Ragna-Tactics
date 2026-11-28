import { MAPS } from './data.js';

// Planned entries describe playable concepts. Only MAPS supplies the simulation.
const destination = (id, min, max, type, note, name = MAPS[id]?.name) => ({ id, name, min, max, type, note });
export const ATLAS_REGIONS = [
  {
    id: 'heartlands', name: 'Crown Heartlands', color: '#acd496', terrain: 'Meadows, riverbanks and roadside ruins',
    destinations: [
      destination('meadow', 1, 4, 'Field', 'Novice hunting around the guild camp.'),
      destination('forest', 4, 8, 'Field', 'Willow groves with tougher early hunts.'),
      destination('kingfisher', 7, 12, 'Field', 'Reed beds and shallow crossings with ranged mobs.', 'Kingfisher Reach'),
      destination('arena', 12, 24, 'Boss', 'Baphomet. Group up and watch for Dark Cross.'),
      destination('amber-abbey', 22, 32, 'Dungeon', 'Abbey courtyards lead to tighter underground encounters.', 'Amber Abbey'),
    ],
  },
  {
    id: 'bamboo-ridge', name: 'Bamboo Ridge', color: '#9ccab7', terrain: 'Wooded cliffs and lantern-lit trails',
    destinations: [
      destination('payon', 12, 18, 'Dungeon', 'Undead mobs and skeleton archers. Bring holy attacks.'),
      destination('lantern-steps', 17, 25, 'Field', 'Terraced trails with open turnouts for separate parties.', 'Lantern Steps'),
      destination('foxglove', 26, 36, 'Field', 'Foggy groves with roaming packs and ambushes.', 'Foxglove Basin'),
      destination('jade-catacombs', 34, 44, 'Dungeon', 'Burial chambers built around holy damage and cleansing.', 'Jade Catacombs'),
      destination('echo-pavilion', 42, 52, 'Boss', 'A shrine guardian that mirrors the party’s positioning.', 'Echo Pavilion'),
    ],
  },
  {
    id: 'sunscar', name: 'Sunscar Basin', color: '#e9b476', terrain: 'Caravan roads, salt flats and sandstone vaults',
    destinations: [
      destination('morroc', 8, 14, 'Field', 'Scorpions and Peco Pecos drop early socket cards.'),
      destination('lair', 18, 30, 'Boss', 'Phreeoni. Gather for Sand Pact and spread for Sinkhole.'),
      destination('saltglass', 29, 40, 'Field', 'Wide salt flats suited to fast, separated farming teams.', 'Saltglass Flats'),
      destination('buried-aqueduct', 39, 50, 'Dungeon', 'Flood channels and chambers with mixed elements.', 'Buried Aqueduct'),
      destination('suncleft', 49, 62, 'Boss', 'Break a sentinel’s defenses before its heat wave.', 'Suncleft Vault'),
    ],
  },
  {
    id: 'tideward', name: 'Tideward Coast', color: '#95cedd', terrain: 'Harbors, shipwrecks and tidal caves',
    destinations: [
      destination('brinewatch', 54, 65, 'Field', 'A harbor approach with clustered and solo hunts.', 'Brinewatch Strand'),
      destination('wreckwater', 64, 74, 'Field', 'Broken ship decks with patrols and ranged pirates.', 'Wreckwater Shoals'),
      destination('pearl-works', 73, 85, 'Dungeon', 'A drowned refinery with water-element packs.', 'Drowned Pearlworks'),
      destination('stormbell', 84, 95, 'Boss', 'A sea beast that forces parties between safe islands.', 'Stormbell Reef'),
    ],
  },
  {
    id: 'frostline', name: 'Frostline Highlands', color: '#bacaf0', terrain: 'Snowbound passes and ancient observatories',
    destinations: [
      destination('whitepine', 88, 100, 'Field', 'A snowy tree line with fast-moving beast packs.', 'Whitepine Pass'),
      destination('rimeworks', 99, 108, 'Dungeon', 'Icebound workshops with slowing constructs.', 'Rimeworks'),
      destination('aurora', 107, 118, 'Field', 'An exposed shelf with roaming elite mobs.', 'Aurora Shelf'),
      destination('starfall', 117, 127, 'Boss', 'An observatory guardian with rotating danger lanes.', 'Starfall Observatory'),
    ],
  },
  {
    id: 'ashen', name: 'Ashen Verge', color: '#dda0ae', terrain: 'Volcanic plateaus and ruins above the clouds',
    destinations: [
      destination('emberstep', 121, 131, 'Field', 'Obsidian ridges split into several high-level hunting routes.', 'Emberstep Plateau'),
      destination('hollowkiln', 130, 139, 'Dungeon', 'Foundry corridors with fire resistance and add control.', 'Hollowkiln Foundry'),
      destination('skygrave', 138, 146, 'Field', 'Floating ruins with elite hunting pockets.', 'Skygrave Terraces'),
      destination('cinder-crown', 145, 150, 'Boss', 'A final raid built around safe zones, timed interrupts and party roles.', 'Cinder Crown'),
    ],
  },
];
export const ATLAS_LEVELS = [[1, 20], [21, 40], [41, 60], [61, 80], [81, 100], [101, 125], [126, 150]];
export const ATLAS_SIZE = ATLAS_REGIONS.reduce((count, region) => count + region.destinations.length, 0);

export function filterAtlas(level, playableOnly) {
  return ATLAS_REGIONS.map(region => ({
    ...region,
    destinations: region.destinations.filter(map =>
      (!level || map.min <= level[1] && map.max >= level[0]) && (!playableOnly || Object.hasOwn(MAPS, map.id))),
  })).filter(region => region.destinations.length);
}
