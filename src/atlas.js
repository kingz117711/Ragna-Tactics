import { MAPS } from './data.js';

// Planned entries describe playable concepts. Only MAPS supplies the simulation.
const destination = (id, min, max, type, note, name = MAPS[id]?.name) => ({ id, name, min, max, type, note });
export const ATLAS_REGIONS = [
  {
    id: 'prontera', name: 'Prontera, Izlude & Mt. Mjolnir', color: '#acd496', terrain: 'Open fields, waterways and mines',
    destinations: [
      destination('meadow', 1, 4, 'Field', 'Novice hunting around the guild camp.'),
      destination('prontera-culvert', 5, 12, 'Dungeon', 'Short hunting loops along underground waterways.', 'Prontera Culvert'),
      destination('arena', 12, 24, 'Boss', 'Baphomet. Group up and watch for Dark Cross.'),
      destination('byalan-dungeon', 22, 32, 'Dungeon', 'An undersea field with water-element packs and clear retreat routes.', 'Byalan Dungeon'),
      destination('mjolnir-dead-pit', 30, 41, 'Dungeon', 'Mining tunnels with narrow entrances and broad hunting chambers.', 'Mjolnir Dead Pit'),
    ],
  },
  {
    id: 'payon-alberta', name: 'Payon & Alberta', color: '#9ccab7', terrain: 'Wooded slopes, shipwrecks and island dungeons',
    destinations: [
      destination('forest', 4, 8, 'Field', 'Willow groves with tougher early hunts.'),
      destination('payon', 12, 18, 'Dungeon', 'Undead mobs and skeleton archers. Bring holy attacks.'),
      destination('sunken-ship', 17, 27, 'Dungeon', 'Shipwreck decks and cargo holds with distinct hunting routes.', 'Sunken Ship'),
      destination('turtle-island', 34, 45, 'Dungeon', 'An island approach and dense packs for a coordinated party.', 'Turtle Island'),
    ],
  },
  {
    id: 'morroc', name: 'Morroc & Sograt Desert', color: '#e9b476', terrain: 'Caravan roads, burrows and sandstone tombs',
    destinations: [
      destination('morroc', 8, 14, 'Field', 'Scorpions and Peco Pecos drop early socket cards.'),
      destination('lair', 18, 30, 'Boss', 'Phreeoni. Gather for Sand Pact and spread for Sinkhole.'),
      destination('ant-hell', 28, 40, 'Dungeon', 'Burrow chambers for separated teams and quick regrouping.', 'Ant Hell'),
      destination('pyramid-dungeon', 39, 50, 'Dungeon', 'Undead hunting pockets connected by sandstone corridors.', 'Pyramid Dungeon'),
      destination('sphinx', 49, 62, 'Dungeon', 'Dense temple encounters with mixed elements and ranged threats.', 'Sphinx'),
    ],
  },
  {
    id: 'geffen-aldebaran', name: 'Geffen & Al De Baran', color: '#95cedd', terrain: 'Orc settlements, towers and castle ruins',
    destinations: [
      destination('geffen-dungeon', 42, 54, 'Dungeon', 'Dark chambers built around elemental preparation and add control.', 'Geffen Dungeon'),
      destination('orc-village', 54, 65, 'Field', 'A village approach with clustered and solo hunts.', 'Orc Village'),
      destination('orc-dungeon', 64, 75, 'Dungeon', 'Tight passages with dense packs and clear fallback points.', 'Orc Dungeon'),
      destination('clock-tower', 73, 85, 'Dungeon', 'Multi-level halls with mechanical enemies and ambushes.', 'Clock Tower'),
      destination('glast-heim', 84, 97, 'Dungeon', 'Castle ruins with distinct routes for solo and party hunting.', 'Glast Heim'),
    ],
  },
  {
    id: 'juno-hugel', name: 'Juno & Hugel', color: '#bacaf0', terrain: 'Volcanic caverns, dragon lairs and high towers',
    destinations: [
      destination('juno-field', 88, 100, 'Field', 'An exposed approach with roaming elite mobs.', 'Juno Field'),
      destination('magma-dungeon', 99, 113, 'Dungeon', 'Lava chambers built around fire resistance and positioning.', 'Magma Dungeon'),
      destination('abyss-lake', 112, 127, 'Dungeon', 'Dragon lairs with room for flank routes and party regrouping.', 'Abyss Lake'),
      destination('thanatos-tower', 125, 139, 'Boss', 'A tower expedition built around rotating danger lanes.', 'Thanatos Tower'),
    ],
  },
  {
    id: 'rachel-lighthalzen', name: 'Rachel & Lighthalzen', color: '#dda0ae', terrain: 'Ice caves, sanctuaries and research chambers',
    destinations: [
      destination('ice-dungeon', 99, 113, 'Dungeon', 'Ice caverns with slowing enemies and visible safe routes.', 'Ice Dungeon'),
      destination('rachel-sanctuary', 108, 125, 'Dungeon', 'Temple wings with mixed ranged and melee hunting pockets.', 'Rachel Sanctuary'),
      destination('biolabs-2f', 125, 142, 'Dungeon', 'Research chambers with elite enemies that fill different combat roles.', 'Biolabs 2F'),
      destination('biolabs-3f', 140, 150, 'Boss', 'A late-game party encounter with safe zones and timed interrupts.', 'Biolabs 3F'),
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
