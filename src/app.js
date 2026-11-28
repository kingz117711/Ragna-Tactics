import { FIELD_SKILLS, fieldSkillAvailable, jobLineage, combatJob, REFINEMENT, ORE_INFO, gearVariant, AFFINITIES, ELEMENTS, spellElement, BOUNTIES, ATTRIBUTES, ATTRIBUTE_CAP, CARDS, FORGE, promotionLevel, promotionRequirement, classBuilds, selectedBuild, jobChoices, HUNT_RADII, DEFAULT_HUNT_RADIUS, MAPS, JOBS, MONSTERS, EQUIPMENT, GEAR_ITEMS, GEAR_AFFIXES, GEAR_SLOTS, gearFitsSlot, ITEMS, refineCost, refineSuccessPercent, refineSafeLimit, TACTICS, TARGET_PREFS, JOB_ROLES, ROLE_LABELS, STEP, baseNeed, jobNeed } from './data.js';
import { availablePoints, forgePrice, command, tick, stats, rosterLimit, engaged, effectiveTactics, isLeader, canEquipGear } from './sim.js';
import { SAVE_KEY, loadGame, saveGame, encodeSave, decodeSave } from './persistence.js';
import { Sprites } from './sprites.js';
import { Renderer } from './renderer.js';
import { acknowledgePoint } from './feedback.js';

const $ = id => document.getElementById(id);
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const number = value => Math.floor(value).toLocaleString();
const duration = seconds => seconds >= 3600 ? `${(seconds / 3600).toFixed(1)}h` : `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
let state, renderer, sprites, ready = false, writable = false, settling = false, selected = new Set(['c1', 'c2']);
let hovered = null, orderMode = null, coachDismissed = false, saveError = false, hiddenAt = null;
let previewPointer = null;
const radiusControl = $('hunt-radius');
for (const radius of HUNT_RADII) radiusControl.add(new Option(String(radius), String(radius)));
radiusControl.value = String(DEFAULT_HUNT_RADIUS);
let pendingJob = null, statDraft = {};
let workspacePage = 'gear', workspaceSlot = 'weapon', workspaceOpen = false, inspectedId;
let multiSelect = false, tacticsExpanded = false;
let toastTimer, accumulator = 0, lastTime = performance.now(), lastUI = 0, lastMinimap = 0, lastSave = performance.now(), inspectorKey = '';
const modal = $('modal');
function html(id, content) { if ($(id).innerHTML !== content) $(id).innerHTML = content; }
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500); }
function showModal(title, content, eyebrow = 'GUILD MANAGEMENT') {
  modal.classList.remove('character-dialog', 'monitor-dialog');
  $('modal-title').textContent = title; $('modal-eyebrow').textContent = eyebrow; $('modal-body').innerHTML = content;
  if (!modal.open) modal.showModal();
}
function error(message) { const el = $('modal-error'); if (modal.open && el) el.textContent = message; else toast(message); }
function closeModal() { modal.close(); }
const modalError = '<div id="modal-error" class="modal-error" role="alert"></div>';
function issue(cmd, { close = false, quiet = false } = {}) {
  if (!writable || settling) return false;
  const ids = cmd.ids || [...selected];
  const message = command(state, { individual:ids.length === 1, ...cmd, ids });
  if (message) { error(message); return false; }
  // Accepted movement/hunt orders pulse at their actual world destination —
  // deliberately distinct from the button press animation.
  if (cmd.point && ['move', 'rally'].includes(cmd.type)) renderer.pulseOrder(cmd.mapId || renderer.mapId, cmd.point, cmd.type);
  if (close) closeModal();
  if (!quiet) toast({ party: 'Party formed. Select several members for group orders.', split: 'Selected adventurers are now independent.', resume: 'Farming assignments resumed.', hold: 'Holding position. Nearby enemies will be engaged.', retreat: 'Retreating to the camp exit.', recover: 'Rested and ready for the next expedition.', resupply: 'Potion supplies replenished.', promote: 'Job advancement complete. Your adventurer is ready for a new path.', recruit: 'A new Novice joined the guild.' }[cmd.type] || 'Orders received.');
  persist(); renderUI(); renderWorkspace(); return true;
}
function persist() {
  if (!writable || !state || settling) return;
  // Closing a hidden tab must retain its last simulated checkpoint time.
  try { saveGame(localStorage, state, hiddenAt || Date.now()); saveError = false; $('save-status').textContent = 'Saved on this device'; $('save-dot').style.background = ''; }
  catch { if (!saveError) toast('Saving is unavailable. Export your guild from Settings to keep your progress.'); saveError = true; $('save-status').textContent = 'Save unavailable — export your guild'; $('save-dot').style.background = '#dfa18d'; }
}
function switchMap(id) {
  if (!MAPS[id]) return;
  renderer.mapId = id; renderer.fit(); orderMode = null; renderUI();
}
function selectedCharacters() { return state.characters.filter(c => selected.has(c.id)); }
function setSelection(id, multiple = false) {
  if (!multiple) selected = new Set([id]); else if (selected.has(id)) selected.delete(id); else selected.add(id);
  inspectorKey = ''; renderUI(); renderWorkspace();
}
function renderUI() {
  if (!state || !renderer) return;
  const mapId = renderer.mapId, map = MAPS[mapId], units = selectedCharacters();
  const bounty = BOUNTIES[state.bounty?.id];
  $('bounty-button').textContent = bounty ? (state.bounty.kills === bounty.count ? 'Claim bounty ↗' : `Bounty · ${state.bounty.kills}/${bounty.count}`) : 'Bounties ↗';
  if (modal.open && $('active-bounty-progress') && bounty) {
    $('active-bounty-progress').textContent = state.bounty.kills + ' / ' + bounty.count;
    $('claim-bounty').disabled = state.bounty.kills < bounty.count;
  }
  renderFieldConsole(units.length === 1 ? units[0] : null);
  const characterButton = $('character-sheet');
  characterButton.hidden = units.length !== 1;
  if (units.length === 1) characterButton.textContent = 'Manage ' + units[0].name + ' ↗';
  $('location-count').textContent = Object.keys(MAPS).length + ' locations';
  if (modal.open && $('monitor-content')) updateMonitor();
  if (modal.open && $('character-vitals')) updateCharacterVitals();
  $('zeny').textContent = number(state.inventory.zeny);
  $('map-name').textContent = map.name; $('map-subtitle').textContent = map.subtitle; $('map-tier').textContent = map.tier;
  html('map-list', Object.values(MAPS).map((m, i) => {
    const count = state.characters.filter(c => c.mapId === m.id).length;
    return `<button class="map-card ${m.id === mapId ? 'active' : ''}" data-map="${m.id}" aria-current="${m.id === mapId ? 'location' : 'false'}"><img class="map-creature" src="${sprites.monsterPortrait(m.monster)}" alt=""><div class="map-card-top"><span class="map-type">${m.boss ? 'BOSS EXPEDITION' : 'FARMING GROUNDS'}</span></div><strong>${m.name}</strong><div class="map-card-bottom"><span>${count ? `${count} adventurer${count > 1 ? 's' : ''} active` : m.boss ? 'Awaiting a worthy party' : 'Ready to explore'}</span><span class="arrow">${count ? '●' : '↗'}</span></div></button>`;
  }).join(''));
  const present = state.characters.filter(c => c.mapId === mapId).length;
  $('map-population').textContent = `${present} adventurer${present === 1 ? '' : 's'} · ${state.maps[mapId].monsters.filter(m => m.hp > 0).length} enemies in the field`;
  $('zoom-label').textContent = Math.round(renderer.camera.zoom * 100) + '%';
  // The minimap description doubles as the accessible live view of the camera.
  const cam = renderer.world(renderer.width / 2, renderer.height / 2);
  const here = state.characters.filter(c => c.mapId === mapId).map(c => `${c.name} ${Math.round(c.x)},${Math.round(c.y)}`).join(' · ');
  $('minimap').setAttribute('aria-label', `Minimap of ${map.name}. Camera centred at ${Math.round(cam.x)}, ${Math.round(cam.y)}. ${here || 'No adventurers on this field.'} Click to move the view.`);
  $('first-expedition').hidden = coachDismissed || state.characters.some(c => c.kills || c.mapId) || state.time > 180;
  $('selection-title').textContent = units.length === 1 ? units[0].name : `${units.length} adventurers selected`;
  $('selection-description').textContent = units.length === 1 ? 'Individual field orders' : units.length ? 'Group field orders' : 'Select an adventurer in your roster';
  $('order-hint').hidden = !orderMode;
  const activeOrders = units.map(c => c.order);
  const pressed = { move: orderMode === 'move', rally: orderMode === 'rally', hold: !!units.length && activeOrders.every(v => v === 'hold'),
    resume: !!units.length && activeOrders.every(v => v === 'farm'), retreat: !!units.length && activeOrders.every(v => v === 'retreat') };
  for (const [action, value] of Object.entries(pressed)) document.querySelector(`[data-action="${action}"]`).setAttribute('aria-pressed', String(value));
  $('hunt-tools').hidden = orderMode !== 'rally';
  $('order-instruction').textContent = orderMode === 'rally' ? 'Tap the centre of your hunting area · Esc to cancel' : 'Choose a destination · Esc to cancel';
  $('battlefield').style.cursor = orderMode ? 'crosshair' : hovered ? 'pointer' : 'grab';
  $('roster-count').textContent = `${state.characters.length} / 5`;
  const focusedPartyMember = document.activeElement?.matches('.party-member') ? document.activeElement.dataset.character : null;
  html('party-overview', state.parties.length ? state.parties.map(p => {
    const members = state.characters.filter(c => c.partyId === p.id), leader = members.find(c => c.id === p.leaderId);
    return `<div class="party-summary"><strong>${esc(p.name)}</strong><span>Leader: ${esc(leader?.name || '—')}</span><div>${members.map(c => `<button class="party-member ${selected.has(c.id) ? 'active' : ''}" data-character="${c.id}" aria-pressed="${selected.has(c.id)}" title="${esc(c.name)} · ${ROLE_LABELS[JOB_ROLES[c.job]]}">${esc(c.name)} · ${JOBS[c.job].name}</button>`).join('')}</div></div>`;
  }).join('') : '<div class="party-empty">No linked parties · select two or more adventurers to form one.</div>');
  if (focusedPartyMember) $('party-overview').querySelector(`[data-character="${focusedPartyMember}"]`)?.focus({ preventScroll: true });
  renderExpeditionGoals();
  const eligible = state.characters.filter(c => c.jobLevel >= promotionLevel(c.job) && c.level >= promotionRequirement(c.job).baseLevel);
  $('job-notice').hidden = eligible.length === 0;
  $('job-names').textContent = eligible.map(c => c.name).join(', ');
  const cards = state.characters.map(c => {
    const st = stats(c), mapName = c.mapId ? MAPS[c.mapId].name : 'Guild camp';
    return `<button class="character-card ${selected.has(c.id) ? 'selected' : ''} ${c.status === 'down' ? 'defeated' : c.hp / st.hp <= 0.3 ? 'low-health' : ''}" data-character="${c.id}" aria-pressed="${selected.has(c.id)}" aria-label="${esc(c.name)}, ${JOBS[c.job].name}, level ${c.level}, ${mapName}"><div class="portrait"><img src="${sprites.portrait(c)}" alt="" draggable="false"></div><div><div class="character-name">${esc(c.name)}<span>Lv. ${c.level}</span></div><div class="character-job">${JOBS[c.job].name} · Job ${c.jobLevel}${c.partyId ? ' · Linked' : ''}</div><div class="hp-track" title="HP ${Math.ceil(c.hp)} / ${st.hp}"><i style="width:${Math.max(0, Math.min(100, c.hp / st.hp * 100))}%"></i></div><div class="character-location"><span>${mapName}</span><span class="status ${c.status === 'down' ? 'status-danger' : c.hp / st.hp <= 0.3 ? 'status-warning' : ''}">${c.status === 'camp' ? 'Resting' : c.status === 'down' ? 'Defeated' : c.status[0].toUpperCase() + c.status.slice(1)}</span></div></div></button>`;
  }).join('');
  // Keep outer buttons stable so keyboard focus survives HP updates.
  if (!pointer?.down) {
    const template = document.createElement('template'); template.innerHTML = cards;
    for (const desired of [...template.content.children]) {
      const existing = $('roster').querySelector(`[data-character="${desired.dataset.character}"]`);
      if (!existing) $('roster').append(desired);
      else {
        existing.className = desired.className;
        existing.setAttribute('aria-pressed', desired.getAttribute('aria-pressed'));
        existing.setAttribute('aria-label', desired.getAttribute('aria-label'));
        if (existing.innerHTML !== desired.innerHTML) existing.innerHTML = desired.innerHTML;
      }
    }
    for (const card of $('roster').querySelectorAll('[data-character]')) if (!state.characters.some(c => c.id === card.dataset.character)) card.remove();
  }
  const limit = rosterLimit(state), unlocked = state.characters.length < limit;
  $('recruit-label').textContent = unlocked ? 'Recruit a new Novice' : state.characters.length === 5 ? 'Your roster is complete' : 'Unlock your next adventurer';
  html('milestones', [
    [state.milestones.bossKills >= 1, 'Defeat the sanctuary boss', 'Unlock adventurer slot 3'],
    [state.milestones.forestKills >= 35, `Willow Wood · ${Math.min(35, state.milestones.forestKills)}/35 kills`, 'Unlock another roster slot'],
    [state.milestones.bossKills >= 3, `Sanctuary clears · ${Math.min(3, state.milestones.bossKills)}/3`, 'Complete your five-person guild'],
  ].map(([done, title, subtitle]) => `<div class="milestone ${done ? 'complete' : ''}"><span class="diamond">${done ? '◆' : '◇'}</span><div><b>${title}</b><br>${subtitle}</div></div>`).join(''));
  renderInspector(units);
  html('journal', state.journal.slice(0, 12).map(e => `<div class="journal-entry"><time>${Math.floor(e.time / 60).toString().padStart(2, '0')}:${Math.floor(e.time % 60).toString().padStart(2, '0')}</time><span>${esc(e.message)}</span></div>`).join(''));
  const encounter = state.maps[mapId], bossKind = MAPS[mapId].monster;
  const boss = MAPS[mapId].boss && encounter.monsters.find(m => m.kind === bossKind);
  $('boss-status').hidden = !boss || !state.characters.some(c => c.mapId === mapId);
  if (!$('boss-status').hidden) html('boss-status', `<div class="boss-name">${boss.hp > 0 ? MONSTERS[bossKind].name : 'Expedition cleared'}</div><div class="progress"><i style="width:${Math.max(0,boss.hp) / MONSTERS[bossKind].hp * 100}%"></i></div><p>${encounter.telegraph ? castWarning(encounter.telegraph) : boss.hp > 0 ? `${number(boss.hp)} / ${number(MONSTERS[bossKind].hp)} HP · Real-time encounter` : 'Your reward is waiting in shared storage.'}</p>`);
}
function castWarning(cast) {
  const warning = cast.markedId ? 'Sand Pact · gather around ' + (state.characters.find(c => c.id === cast.markedId)?.name || 'the marked ally') + ' to share damage' : renderer.mapId === 'lair' ? 'Sinkhole · leave the red circle' : cast.innerRadius ? 'Sanctuary Ring · move inside the centre or beyond the ring' : 'Dark Cross · leave the marked ground';
  return warning + ' · ' + Math.max(0, cast.remaining).toFixed(1) + 's';
}
function tacticsMarkup(c) {
  const t = effectiveTactics(c);
  const range = (key, label, min, max, step, help) => `<label class="tactics-setting"><span>${label}<output>${Math.round(t[key] * 100)}%</output></span><input type="range" data-tactics-key="${key}" min="${min}" max="${max}" step="${step}" value="${Math.round(t[key] * 100)}" aria-label="${label}"><small>${help}</small></label>`;
  return `<details class="tactics-details" ${tacticsExpanded ? 'open' : ''}><summary>Fine-tune tactics</summary><label class="tactics-toggle"><input type="checkbox" data-tactics-key="autoSkill" ${t.autoSkill ? 'checked' : ''}> Automatically use skills when useful</label>${range('healAt', 'Heal allies below', 20, 95, 5, 'Acolytes heal party members; Novices heal themselves.')}${range('potionAt', 'Use potion below', 0, 80, 5, 'Consumes one potion; restores 65 HP.')}${range('retreatAt', 'Retreat below', 0, 70, 1, 'Automatically return to camp at this HP; set to 0% to disable.')}
    <label class="form-label">Choose targets<select id="target-pref-select">${Object.entries(TARGET_PREFS).map(([key, label]) => `<option value="${key}" ${t.targetPref === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label></details>`;
}
function renderInspector(units) {
  const previousDetails = $('inspector').querySelector('.tactics-details');
  if (previousDetails) tacticsExpanded = previousDetails.open;
  if ($('inspector').contains(document.activeElement) && ['SELECT', 'INPUT'].includes(document.activeElement.tagName)) return;
  let content;
  if (units.length !== 1) {
    const potions = units.reduce((n, c) => n + c.potions, 0);
    content = `<div class="inspector-title">${units.length ? 'Better, together.' : 'Choose your adventurer.'}</div><p>${units.length ? 'Link your adventurers into a party to share targets, support each other, and earn shared EXP. Or deploy separately to cover more ground.' : 'Select a portrait to inspect equipment, tactics, and progression.'}</p>${units.length ? `<div class="detail-row"><span>Selected supplies</span><strong>${potions} potions</strong></div><label class="form-label">Tactics<select id="tactic-select"><option value="" disabled selected>Apply to selection…</option>${Object.entries(TACTICS).map(([key, t]) => `<option value="${key}">${t.name}</option>`).join('')}</select></label><p>Job changes become available at Novice Job Lv. 10. Every character chooses their own path.</p>` : ''}`;
  } else {
    const c = units[0], st = stats(c);
    content = `<div class="inspector-title">${JOBS[c.job].name} <span class="tiny muted">${JOBS[c.job].role}</span></div><div class="detail-row"><span>Base Lv. ${c.level}</span><strong>${number(c.exp)} / ${baseNeed(c.level)} EXP</strong></div><div class="progress"><i style="width:${Math.min(100, c.exp / baseNeed(c.level) * 100)}%"></i></div><div class="detail-row"><span>Job Lv. ${c.jobLevel} / ${JOBS[c.job].jobLevelCap || (c.job === 'novice' ? 10 : 50)}</span><strong>${c.jobLevel >= promotionLevel(c.job) ? 'Job change ready' : `${number(c.jobExp)} / ${jobNeed(c.jobLevel)}`}</strong></div><div class="progress"><i style="width:${Math.min(100, c.jobExp / jobNeed(c.jobLevel) * 100)}%"></i></div><div class="detail-row"><span>HP / SP</span><strong>${Math.ceil(c.hp)}/${st.hp} · ${Math.floor(c.sp)}/${st.sp}</strong></div><div class="detail-row"><span>ATK / DEF · Potions</span><strong>${st.atk} / ${st.def} · ${c.potions}</strong></div><div class="detail-row"><span>Combat role</span><strong>${ROLE_LABELS[JOB_ROLES[c.job]]}${c.partyId ? ` · ${isLeader(state, c) ? 'Party leader' : 'Follower'}` : ''}</strong></div><label class="form-label">Starting preset<select id="tactic-select">${Object.entries(TACTICS).map(([key, t]) => `<option value="${key}" ${c.tactic === key ? 'selected' : ''}>${t.name}</option>`).join('')}</select></label>${tacticsMarkup(c)}<label class="form-label">Farming objective<select id="assignment-select">${[['balanced', 'Balanced farming'], ['experience', 'Training · +15% Base EXP'], ['materials', 'Gathering · double materials']].map(([key, label]) => `<option value="${key}" ${c.assignment === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label><div class="detail-row"><span>Assignment · status</span><strong>${c.mapId ? `${MAPS[c.mapId].name} · ${c.status}` : c.status === 'down' ? 'Defeated · camp' : 'Guild camp'}</strong></div><div class="detail-actions">${(st.element || JOB_ROLES[c.job] === 'support') ? '<button data-action="spellbook">Spellbook</button>' : ''}<button data-action="attributes">Stats · ${availablePoints(c)} pts</button><button data-action="equipment">Equipment</button>${classBuilds(c.job).length > 1 ? '<button data-action="builds">Build</button>' : ''}<button data-action="advance">Job path</button><button data-action="rename">Rename</button>${c.partyId && !isLeader(state, c) ? '<button data-action="leader" title="Make this adventurer the party leader">Lead party</button>' : ''}</div><p><span style="color:var(--gold)">${st.skill}</span> · ${st.cost} SP · ${c.cast ? `Casting · ${c.cast.remaining.toFixed(1)}s` : c.cooldown > 0 ? c.cooldown.toFixed(1) + 's cooldown' : 'Ready'} · Hit ${Math.round(st.hit * 100)}% · Flee ${Math.round(st.flee * 100)}%<br>${st.element ? ELEMENTS[st.element].name + ' magic · strong against ' + (ELEMENTS[ELEMENTS[st.element].beats]?.name || 'Undead') : st.description || JOBS[c.job].description}</p>`;
  }
  if (content !== inspectorKey) { html('inspector', content); inspectorKey = content; }
}
function deployment() {
  const units = selectedCharacters();
  if (!units.length) return toast('Select one or more adventurers first.');
  showModal('Where will you venture?', `<p>Deploy ${units.map(c => esc(c.name)).join(', ')} instantly. Linked party members travel together. Viewing a map does not move your characters.</p><form id="deployment-form"><div class="modal-grid">${Object.values(MAPS).map(m => `<label class="choice-card"><input type="radio" name="destination" value="${m.id}" ${m.id === renderer.mapId ? 'checked' : ''}><span class="tiny"> ${m.tier}</span><strong>${m.name}</strong><p>${m.id === 'meadow' ? 'Poring and Fabre. A gentle start for Novices.' : m.id === 'forest' ? 'Willow. Tougher enemies, better EXP, and Resin.' : m.id === 'payon' ? 'Zombies close slowly while Archer Skeletons fire from range. Prepare Holy magic.' : m.id === 'morroc' ? 'Scorpions strike hard. Peco Pecos quickly close distance. Both drop socket cards.' : m.id === 'lair' ? 'Phreeoni. Gather for Sand Pact, scatter for Sinkhole. Guaranteed MVP card.' : 'Baphomet. Bring at least two first-job adventurers. Manual dodging recommended.'}</p></label>`).join('')}</div>${modalError}<div class="modal-footer"><span>In combat? Retreat to camp before redeploying.</span><button type="submit" class="primary">Begin expedition <span>↗</span></button></div></form>`, 'PLAN AN EXPEDITION');
  $('deployment-form').onsubmit = event => { event.preventDefault(); const mapId = new FormData(event.currentTarget).get('destination'); if (issue({ type: 'deploy', mapId }, { close: true, quiet: true })) { coachDismissed = true; switchMap(mapId); toast('Expedition started. Your adventurers will farm automatically.'); } };
}
function camp() {
  showModal('Back at the guild camp.', `<p>Recover and change jobs here. Deployed adventurers must retreat before they can use camp services.</p>${state.characters.map(c => `<div class="camp-unit"><img src="${sprites.portrait(c)}" alt=""><div><strong>${esc(c.name)} · ${JOBS[c.job].name}</strong><p>${c.mapId ? `At ${MAPS[c.mapId].name}${engaged(state, c) ? ' · In combat' : ''}` : c.status === 'down' ? 'Defeated · recovery needed' : `At camp · ${c.potions} potions`}</p></div><button data-camp-unit="${c.id}" data-service="${c.mapId ? 'retreat' : c.status !== 'down' && c.jobLevel >= promotionLevel(c.job) && c.level >= promotionRequirement(c.job).baseLevel ? 'advance' : 'recover'}">${c.mapId ? 'Recall' : c.status !== 'down' && c.jobLevel >= promotionLevel(c.job) && c.level >= promotionRequirement(c.job).baseLevel ? 'Choose job' : 'Recover'}</button></div>`).join('')}<div class="camp-actions"><button data-modal-action="recover-all">Recover at camp</button><button data-modal-action="supply-all">Refill camp potions · 2z each</button></div><p style="margin-top:15px">Recovery is free in this foundation. Refills bring each character to ten potions. Each potion restores 65 HP automatically below 45% HP.</p>${modalError}`);
}
const characterPages = [
  ['overview', 'Overview'], ['gear', 'Equipment'], ['skills', 'Skills'], ['stats', 'Stats'], ['job', 'Job path'],
];
function showCharacterModal(page, c, title, content) {
  const nav = characterPages.map(([id,label]) =>
    `<button data-character-page="${id}" data-id="${c.id}" ${id === page ? 'aria-current="page"' : ''}>${label}</button>`
  ).join('');
  showModal(title, `<nav class="sheet-tabs" aria-label="Character pages">${nav}</nav><div class="sheet-page">${content}</div>`, c.name + ' · ' + JOBS[c.job].name);
  modal.classList.add('character-dialog');
  modal.scrollTop = 0;
}
function updateCharacterVitals() {
  const c = selectedCharacters()[0], st = stats(c);
  const vitals = { health:`${Math.ceil(c.hp)} / ${st.hp}`, spirit:`${Math.floor(c.sp)} / ${st.sp}`,
    level:`${c.level} / ${c.jobLevel}`, field:c.mapId ? MAPS[c.mapId].name : 'Guild camp', status:worldActivity(c), potions:c.potions };
  for (const node of $('character-vitals').querySelectorAll('[data-vital]')) {
    node.textContent = vitals[node.dataset.vital];
  }
}
function characterOverview(c) {
  const info = [['health','HP'],['spirit','SP'],['level','Base / Job Lv.'],['field','Location'],['status','Activity'],['potions','Potions']];
  showCharacterModal('overview',c,c.name,`<header class="sheet-profile"><img src="${sprites.portrait(c)}" alt=""><div><strong>${JOBS[c.job].name}</strong><p>${jobLineage(c.job).join(' → ')}</p></div><button data-world-character="${c.id}">Locate ↗</button></header>
    <dl id="character-vitals" class="sheet-vitals">${info.map(([id,label])=>`<div><dt>${label}</dt><dd data-vital="${id}"></dd></div>`).join('')}</dl>`);
  updateCharacterVitals();
}
function characterSkills(c) {
  const st = stats(c), build = selectedBuild(c.job,c.buildId);
  const elemental = st.element || JOB_ROLES[c.job] === 'support';
  showCharacterModal('skills',c,'Skills and builds',`<section class="sheet-profile"><div><span class="eyebrow">ACTIVE SKILL</span><h3>${esc(st.skill)}</h3><p>${st.cost} SP · ${st.cooldown}s cooldown</p></div></section>
    <label class="tactics-toggle sheet-skill-toggle"><input type="checkbox" id="sheet-auto-skill" data-tactics-key="autoSkill" ${effectiveTactics(c).autoSkill ? 'checked' : ''}> Automatically use this adventurer’s skill</label>
    <h3>Combat build</h3><p>${build ? esc(build.name) + ' · ' + esc(build.style) : 'This job uses its signature skill.'}</p>
    <div class="detail-actions">${classBuilds(c.job).length > 1 ? '<button data-action="builds">Choose combat build</button>' : ''}${elemental ? '<button data-action="spellbook">Prepare spell</button>' : ''}</div>`);
}
function openCharacterPage(page, id) {
  const c = state.characters.find(unit => unit.id === id);
  if (!c) return;
  setSelection(c.id);
  if (page === 'gear') equipment();
  else if (page === 'skills') characterSkills(c);
  else if (page === 'stats') attributes();
  else if (page === 'job') advanceJob(c.id);
  else characterOverview(c);
  modal.querySelector('[aria-current="page"]')?.focus({preventScroll:true});
}
const workspacePages = [['gear','Gear'],['skills','Skills'],['stats','Stats'],['jobs','Job']];
function setWorkspace(open) {
  workspaceOpen = open;
  $('adventurer-panel').hidden = !open;
  $('adventurer-workspace').setAttribute('aria-expanded',String(open));
  if (open) {
    const c = selectedCharacters()[0];
    if (selected.size !== 1) setSelection(c?.id || state.characters[0].id);
    renderWorkspace();
    $('workspace-tabs').querySelector('[aria-current]')?.focus({preventScroll:true});
  }
}
function workshopStats(before,after) {
  return [['atk','ATK'],['matk','MATK'],['def','DEF'],['hp','HP'],['sp','SP'],['range','Range']].map(([id,label])=>{
    const delta = Math.round((after[id] - before[id])*100)/100;
    return delta ? `<span class="${delta > 0 ? 'gain' : 'loss'}">${label} ${delta > 0 ? '+' : ''}${delta}</span>` : '';
  }).join('') || '<span>No change in these stats</span>';
}
function workspaceGear(c) {
  const current = c.gear?.[workspaceSlot], before = stats(c);
  const slotButton = ([id,label]) => {
    const instance = c.gear?.[id];
    return `<button data-workspace-slot="${id}" aria-pressed="${workspaceSlot === id}"><small>${label}</small><strong>${instance ? esc(gearInstanceTitle(instance)) : 'Empty'}</strong></button>`;
  };
  const slots = Object.entries(GEAR_SLOTS);
  const paperDoll = `<div class="workspace-gear"><div>${slots.slice(0,4).map(slotButton).join('')}</div>
    <figure class="workspace-doll"><img alt="" src="${sprites.portrait(c)}"><figcaption>${JOBS[c.job].name}</figcaption></figure>
    <div>${slots.slice(4).map(slotButton).join('')}</div></div>`;
  const candidates = state.inventory.gearItems.filter(instance=>gearFitsSlot(GEAR_ITEMS[instance.itemId],workspaceSlot) && canEquipGear(c.job,instance.itemId,c.level));
  const capacity = current ? GEAR_ITEMS[current.itemId].slots : 0;
  const cards = current?.cards || [];
  const socketControls = capacity ? `<h3>Cards · ${cards.length}/${capacity}</h3>
    ${cards.map((id,index)=>`<article class="workspace-item"><span>${CARDS[id].name} · ${CARDS[id].description}</span><button data-workspace-unsocket="${index}" ${c.mapId ? 'disabled' : ''}>Remove</button></article>`).join('')}
    ${cards.length < capacity ? Object.entries(CARDS).filter(([id])=>state.inventory.cards[id]>0).map(([id,card])=>`<article class="workspace-item"><span>${card.name} · ${card.description}</span><button data-workspace-socket="${id}" ${c.mapId ? 'disabled' : ''}>Socket</button></article>`).join('') || '<p>No loose cards in shared storage.</p>' : ''}` : '';
  return `${paperDoll}<div class="workspace-section"><h3>${GEAR_SLOTS[workspaceSlot]}</h3>
    <p>Equipped · ${current ? esc(gearInstanceTitle(current)) : 'Empty'}${current ? ` <button data-workspace-unequip ${c.mapId ? 'disabled' : ''}>Unequip</button>` : ''}</p>
    ${c.mapId ? '<p>Return to camp to change equipment.</p>' : ''}
    ${candidates.length ? candidates.map(instance=>`<article class="workspace-item"><div><strong>${esc(gearInstanceTitle(instance))}</strong><div class="gear-delta">${workshopStats(before,stats({...c,gear:{...c.gear,[workspaceSlot]:instance}}))}</div></div><button data-workspace-equip="${esc(instance.uid)}" ${c.mapId ? 'disabled' : ''}>Equip</button></article>`).join('') : '<p>No eligible replacements in your bag.</p>'}
    ${socketControls}<button data-workspace-detail="equipment">Refining and relics ↗</button></div>`;
}
function workspaceSkills(c) {
  const st = stats(c), atCamp = !c.mapId && c.status !== 'down';
  const available = Object.entries(FIELD_SKILLS).filter(([id])=>fieldSkillAvailable(c.job,id));
  const slots = [0,1].map(index=>{
    const slot = c.techniques?.slots[index];
    const options = available.filter(([id])=>c.techniques?.ranks[id]).map(([id,skill])=>`<option value="${id}" ${slot?.id===id ? 'selected' : ''}>${skill.name}</option>`).join('');
    return `<div class="workspace-slot"><label>Key ${index+2}<select data-workspace-skill-slot="${index}" ${!atCamp ? 'disabled' : ''}><option value="">Empty</option>${options}</select></label>
      <label><input type="checkbox" data-workspace-skill-auto="${index}" ${slot?.auto ? 'checked' : ''} ${atCamp && slot ? '' : 'disabled'}> Auto-cast</label></div>`;
  }).join('');
  const rows = available.map(([id,skill])=>{
    const rank = c.techniques?.ranks[id] || 0, level = skill.levels[rank];
    return `<article class="workspace-item"><div><strong>${skill.name} · Rank ${rank}/3</strong><p>${skill.text}</p><small>${skill.sp} SP · ${skill.time}s cooldown</small></div><button data-workspace-train="${id}" ${atCamp && level && c.jobLevel>=level ? '' : 'disabled'}>${!level ? 'Max rank' : c.jobLevel < level ? 'Job Lv. '+level : 'Learn rank '+(rank+1)}</button></article>`;
  }).join('');
  return `<div class="workspace-section"><h3>Skill bar</h3><p><kbd>1</kbd> ${esc(st.skill)} · Signature</p>${slots}
    <label class="workspace-auto"><input type="checkbox" id="workspace-auto" ${effectiveTactics(c).autoSkill ? 'checked' : ''}> Allow automatic skills</label>
    <p>Learn ranks and assign hotbar slots at camp.</p>${rows || '<p>Choose your first job to unlock class techniques.</p>'}
    <button data-workspace-detail="skills">Combat builds and spells ↗</button></div>`;
}
function workspaceStats(c) {
  const before = stats(c), planned = {...c.attributes}, atCamp = !c.mapId && c.status !== 'down';
  for (const [key,value] of Object.entries(statDraft)) planned[key] = (planned[key] || 0) + value;
  const remaining = availablePoints({...c,attributes:planned});
  const after = stats({...c,attributes:planned});
  return `<div class="workspace-section"><div class="workspace-meter-list">${[['Max HP',after.hp],['Max SP',after.sp],['ATK',after.atk],['MATK',after.matk],['DEF',after.def],['Hit',Math.round(after.hit*100)+'%']].map(([label,value])=>`<div><small>${label}</small><strong>${value}</strong></div>`).join('')}</div>
    <h3>${remaining} stat points available</h3>${atCamp ? '' : '<p>Return to camp to train attributes.</p>'}
    ${Object.entries(ATTRIBUTES).map(([id,attr])=>`<div class="workspace-item"><div><strong>${id.toUpperCase()} · ${planned[id] || 0}</strong><p>${esc(attr.effect)}</p></div><div class="workspace-stepper">
      <button data-workspace-stat="${id}" data-delta="-1" aria-label="Remove pending ${id.toUpperCase()}" ${atCamp && statDraft[id] ? '' : 'disabled'}>−</button>
      <button data-workspace-stat="${id}" data-delta="1" aria-label="Add ${id.toUpperCase()}" ${atCamp && remaining && (planned[id] || 0) < ATTRIBUTE_CAP ? '' : 'disabled'}>+</button></div></div>`).join('')}
    <div class="gear-delta">${workshopStats(before,after)}</div><button data-workspace-apply-stats ${atCamp && Object.keys(statDraft).length ? '' : 'disabled'}>Apply stat points</button></div>`;
}
function workspaceJobs(c) {
  const gate = promotionRequirement(c.job);
  const choices = jobChoices(c.job);
  const eligible = !c.mapId && c.status !== 'down' && c.jobLevel >= gate.jobLevel && c.level >= gate.baseLevel;
  return `<div class="workspace-section"><p>${jobLineage(c.job).join(' → ')}</p>${choices.length ? `<p>Next advancement at Job Lv. ${gate.jobLevel}${gate.baseLevel > 1 ? ' and Base Lv. '+gate.baseLevel : ''}. Return to camp to advance.</p>
    <div class="workspace-paths">${choices.map(([id,job])=>`<button data-workspace-job="${id}" aria-pressed="${pendingJob === id}" ${eligible ? '' : 'disabled'}><img alt="" src="${sprites.portrait({...c,job:id})}"><strong>${job.name}</strong></button>`).join('')}</div><p>${pendingJob && eligible ? esc(JOBS[pendingJob].description) : 'Select a path to preview its role.'}</p><button data-workspace-promote ${pendingJob && eligible ? '' : 'disabled'}>Confirm job change</button>` : '<p>This adventurer has reached the end of this job path.</p>'}</div>`;
}
function renderWorkspace() {
  if (!workspaceOpen) return;
  const c = selectedCharacters()[0];
  if (!c || selected.size !== 1) { setWorkspace(false); return; }
  if (inspectedId !== c.id) { statDraft = {}; pendingJob = null; inspectedId = c.id; $('workspace-content').scrollTop = 0; }
  $('workspace-name').textContent = c.name;
  $('workspace-job').textContent = JOBS[c.job].name + ' · Base ' + c.level + ' · Job ' + c.jobLevel;
  if ($('workspace-portrait').getAttribute('src') !== sprites.portrait(c)) $('workspace-portrait').src = sprites.portrait(c);
  html('workspace-tabs',workspacePages.map(([id,label])=>`<button data-workspace-page="${id}" ${id===workspacePage ? 'aria-current="page"' : ''}>${label}</button>`).join(''));
  html('workspace-content',({gear:workspaceGear,skills:workspaceSkills,stats:workspaceStats,jobs:workspaceJobs})[workspacePage](c));
}
function renderFieldConsole(c) {
  const deployed = c?.mapId && c.hp > 0;
  $('field-console').hidden = !deployed;
  if (!deployed) return;
  const onField = c.mapId === renderer.mapId;
  $('field-hotbar').hidden = !onField;
  if (!onField) {
    html('individual-orders',`<span><strong>${esc(c.name)}</strong><small>${worldActivity(c)}</small></span><button data-world-character="${c.id}">Locate in ${MAPS[c.mapId].name} ↗</button>`);
    return;
  }
  const st = stats(c), map = MAPS[c.mapId];
  const allies = state.characters.filter(a=>c.partyId && a.partyId===c.partyId && a.id!==c.id && a.mapId===c.mapId && a.hp>0 && a.order!=='retreat');
  if (!$('individual-orders').contains(document.activeElement)) {
    html('individual-orders',`<span><strong>${esc(c.name)}</strong><small>${worldActivity(c)} · ${effectiveTactics(c).autoSkill ? 'Auto skills' : 'Manual skills'}</small></span>
      ${allies.length ? `<label><select id="field-support" aria-label="Support party member"><option value="">Support ally</option>${allies.map(a=>`<option value="${a.id}" ${c.supportId===a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label>` : ''}
      ${map.boss ? '<button data-individual-order="boss">Attack boss</button>' : '<button data-individual-order="solo">Farm solo</button>'}`);
  }
  const hotbar = $('field-hotbar');
  const signature = {name:st.skill,sp:st.cost,timer:c.cooldown};
  const skills = [signature,...[0,1].map(index=>{
    const entry = c.techniques?.slots[index];
    return entry ? {...FIELD_SKILLS[entry.id],timer:c.techniques.timers[entry.id] || 0,auto:entry.auto} : null;
  })];
  for (const [index,skill] of skills.entries()) {
    let button = hotbar.children[index];
    if (!button) {
      button = document.createElement('button');
      button.dataset.hotbar = index;
      hotbar.append(button);
    }
    const label = skill ? `${skill.name} · ${skill.sp} SP${skill.auto ? ' · Auto' : ''}` : 'Empty slot';
    const readout = skill?.timer > 0 ? `${Math.ceil(skill.timer)}s` : skill ? `${skill.sp} SP${skill.auto ? ' · Auto' : ''}` : 'Empty';
    const markup = `<kbd>${index+1}</kbd><strong>${esc(skill?.name || 'Unassigned')}</strong><small>${readout}</small>`;
    if (button.innerHTML !== markup) button.innerHTML = markup;
    button.setAttribute('aria-label',label); button.title = label;
    button.disabled = !skill || skill.timer > 0 || c.sp < skill.sp || !!c.cast || ['move','retreat'].includes(c.order);
  }
}
function castHotbar(index) {
  const c = selectedCharacters()[0];
  const button = $('field-hotbar').children[index];
  if (selected.size === 1 && c.mapId === renderer.mapId && button && !button.disabled) {
    issue({type:'technique-cast',ids:[c.id],slot:index,mapId:renderer.mapId},{quiet:true});
  }
}
function advanceJob(id = [...selected][0]) {
  const c = state.characters.find(v => v.id === id);
  if (!c) return;
  selected = new Set([c.id]);
  const choices = jobChoices(c.job), gate = promotionLevel(c.job), first = c.job === 'novice';
  if (!choices.length) {
    showCharacterModal('job', c, JOBS[c.job].name, `<div class="milestone-note">${jobLineage(c.job).join(' → ')}</div><h3>${JOBS[c.job].skill}</h3><p>${JOBS[c.job].description}</p>`, 'TRANSCENDENT JOB');
    return;
  }
  showCharacterModal('job', c, first ? 'Choose a new beginning.' : 'Advance your calling.', `<p>${esc(c.name)} · ${JOBS[c.job].name} · Job Lv. ${c.jobLevel} / ${gate}</p><p>Return to camp at Job Lv. ${gate}${promotionRequirement(c.job).baseLevel > 1 ? ` and Base Lv. ${promotionRequirement(c.job).baseLevel}` : ''} to advance. Keep your equipment. Your new job begins at Job Lv. 1.</p><form id="job-form"><div class="modal-grid">${choices.map(([key, job]) => `<label class="choice-card"><input type="radio" name="job" value="${key}" required><img class="job-preview" src="${sprites.portrait({ ...c, job: key })}" alt=""><span class="tiny"> ${job.role}</span><strong>${job.name}</strong><p>${job.description}</p></label>`).join('')}</div>${modalError}<div class="modal-footer"><span>Each adventurer chooses independently.</span><button type="submit" class="primary" ${c.jobLevel < gate || c.level < promotionRequirement(c.job).baseLevel || c.mapId || c.status === 'down' ? 'disabled' : ''}>Choose job <span>✧</span></button></div></form>`, first ? 'NOVICE → FIRST JOB' : (JOBS[c.job].parent ? 'SECOND JOB → TRANSCENDENT' : 'FIRST JOB → SECOND JOB'));
  $('job-form').onsubmit = event => { event.preventDefault(); const job = new FormData(event.currentTarget).get('job'); issue({ type: 'promote', job, ids: [c.id] }, { close: true }); };
}
function recruit() {
  if (state.characters.length >= rosterLimit(state)) {
    showModal('Make room for another story.', `<p>Your guild begins with two adventurers and can grow to five. Complete these milestones to unlock additional roster slots.</p><div class="milestone-note">${state.milestones.bossKills >= 1 ? '✓' : '◇'} Clear the sanctuary boss once.<br>${state.milestones.forestKills >= 35 ? '✓' : '◇'} Defeat 35 enemies in Willow Wood (${state.milestones.forestKills}/35).<br>${state.milestones.bossKills >= 3 ? '✓' : '◇'} Clear the sanctuary boss three times (${state.milestones.bossKills}/3).</div><p style="margin-top:17px">Each completed milestone unlocks one slot. Every new adventurer arrives as a Lv. 1 Novice.</p>`, 'GUILD GROWTH'); return;
  }
  showModal('A new adventurer arrives.', `<p>A fresh start, a new role, another possibility for your party. Your recruit begins as a Novice.</p><form id="recruit-form"><label class="form-label" for="recruit-name">Adventurer name</label><input id="recruit-name" name="name" type="text" maxlength="20" placeholder="Give them a name" required><label class="form-label" for="recruit-sex">Appearance</label><select name="sex" id="recruit-sex"><option value="m">Male</option><option value="f">Female</option></select>${modalError}<div class="modal-footer"><span>Free recruitment · ${state.characters.length + 1}/${rosterLimit(state)} unlocked slots</span><button class="primary">Welcome to the guild <span>+</span></button></div></form>`);
  $('recruit-form').onsubmit = event => { event.preventDefault(); const data = new FormData(event.currentTarget); if (issue({ type: 'recruit', name: data.get('name'), sex: data.get('sex') }, { close: true })) selected = new Set([state.characters.at(-1).id]); renderUI(); };
}
function attributes() {
  const c = selectedCharacters()[0], draft = {};
  if (!c || selected.size !== 1) return;
  showCharacterModal('stats', c, c.name + '’s attributes', `<p>Earn two points per Base level. Spend them at camp. Job changes preserve your build.</p>
    <div class="attribute-rows">${Object.entries(ATTRIBUTES).map(([id, stat]) => `<div class="inventory-row"><div><strong>${id.toUpperCase()} · ${stat.name}</strong><p>${stat.effect}</p></div><div class="stat-stepper"><button data-stat="${id}" data-step="-1" aria-label="Decrease ${stat.name}">−</button><output id="stat-${id}"></output><button data-stat="${id}" data-step="1" aria-label="Increase ${stat.name}">+</button></div></div>`).join('')}</div>
    <p id="stat-preview" aria-live="polite"></p><div class="modal-footer"><strong id="stat-remaining"></strong><button id="train-stats" class="primary">Train attributes</button></div>${modalError}`, 'CHARACTER BUILD');
  const refresh = () => {
    const planned = { ...c.attributes };
    for (const [id, amount] of Object.entries(draft)) planned[id] = (planned[id] || 0) + amount;
    const future = { ...c, attributes: planned }, remaining = availablePoints(future), st = stats(future);
    for (const button of $('modal-body').querySelectorAll('[data-stat]')) {
      const id = button.dataset.stat, val = planned[id] || 0;
      $('stat-' + id).value = val;
      button.disabled = !!c.mapId || (button.dataset.step === '-1' ? !draft[id] : !remaining || val >= ATTRIBUTE_CAP);
    }
    $('stat-remaining').textContent = remaining + ' points available';
    $('stat-preview').textContent = `${st.hp} HP · ${st.sp} SP · ${st.atk} ATK · ${st.def} DEF · ${st.interval.toFixed(2)}s / attack · +${st.skillBonus} skill · ${Math.round(st.crit*100)}% crit`;
    $('train-stats').disabled = !!c.mapId || !Object.keys(draft).length;
  };
  for (const button of $('modal-body').querySelectorAll('[data-stat]')) button.onclick = () => {
    const id = button.dataset.stat;
    draft[id] = (draft[id] || 0) + Number(button.dataset.step);
    if (!draft[id]) delete draft[id];
    refresh();
  };
  $('train-stats').onclick = () => {
    if (issue({type:'allocate', ids:[c.id], points:draft}, {close:true, quiet:true})) toast(c.name + ' trained at camp.');
  };
  refresh();
}
function equipment() {
  const c = selectedCharacters()[0]; if (!c || selected.size !== 1) return toast('Select one adventurer to manage equipment.');
  const items = Object.keys(EQUIPMENT).map(id => ({ id, card: null, rank:0, count: state.inventory.equipment[id] || 0 }));
  for (const [key, count] of Object.entries(state.inventory.socketed)) {
    if (count > 0) { const {item:id,card,rank} = gearVariant(key); items.push({id,card,rank,count}); }
  }
  const equipped = c.card ? CARDS[c.card].name : 'Empty socket';
  const stock = items.map(({ id, card, rank, count }) => {
    const worn = c.equipment === id && (c.card || null) === card && (c.refine || 0) === rank;
    return `<div class="inventory-row"><div>${rank ? '+' + rank + ' ' : ''}${EQUIPMENT[id].name}${card ? ' · ' + CARDS[card].name : ''}<p>${EQUIPMENT[id].description}</p></div><button data-equip="${id}" data-rank="${rank}" data-card="${card || ''}" ${c.mapId || worn || (id !== 'training' && !count) ? 'disabled' : ''}>${worn ? 'Equipped' : id === 'training' ? 'Equip' : 'Equip · ' + count}</button></div>`;
  }).join('');
  const rank = c.refine || 0, cost = REFINEMENT[rank+1];
  const material = cost && (cost.material || EQUIPMENT[c.equipment].refineMaterial);
  const ore = material ? state.inventory.materials[material] || 0 : 0;
  const workshop = c.equipment === 'training' ? '<p>Equip field gear to unlock refinement.</p>' : cost
    ? `<div class="inventory-row"><div><strong>Refine to +${rank+1}</strong><p>+2 ATK · +1 DEF · ${ore}/${cost.ore} ${material} · ${cost.zeny} Zeny</p><p>${rank < 3 ? 'Emveretarcon comes from Payon undead.' : `${material} drops in Payon Cave; weapon gear uses Oridecon and defensive gear uses Elunium.`}</p></div><button data-refine="${rank+1}" ${c.mapId || ore < cost.ore || state.inventory.zeny < cost.zeny ? 'disabled' : ''}>Refine</button></div>` : '<p>Maximum refinement · +10 ATK and +5 DEF</p>';
  showCharacterModal('gear', c, `${c.name}’s equipment`, `<p>Change legacy relic equipment and sockets at camp. Renewal equipment instances have their own slots, refine level, and affixes.</p>${stock}<h3>${rank ? '+' + rank + ' ' : ''}${EQUIPMENT[c.equipment].name} · ${c.equipment === 'training' ? 'No socket' : equipped}</h3>${workshop}${cardRows(c)}${c.card ? `<button data-socket="" ${c.mapId ? 'disabled' : ''}>Remove card</button>` : ''}<h3>Renewal equipment</h3>${gearLoadout(c)}${modalError}`);
}
function gearInstanceTitle(instance) {
  const item=GEAR_ITEMS[instance.itemId],prefix=instance.refine?`+${instance.refine} `:'';
  const affixes=(instance.affixes||[]).map(a=>GEAR_AFFIXES[a.id]?.name).filter(Boolean).join(' ');
  return `${prefix}${affixes?affixes+' ':''}${item.name}`;
}
function gearBaseDetails(item) {
  const fields=item.slot==='weapon'?[`ATK ${item.atk||0}`,item.matk?`MATK ${item.matk}`:'',`Weapon Lv.${item.weaponLevel}`,`Range ${item.range||1}`,`${item.slots} slot${item.slots===1?'':'s'}`]:[`DEF ${item.def||0}`,`Armor Lv.${item.armorLevel}`,`${item.slots} slot${item.slots===1?'':'s'}`];
  for(const [key,label] of [['str','STR'],['agi','AGI'],['vit','VIT'],['int','INT'],['dex','DEX'],['luk','LUK'],['mdef','MDEF'],['sp','SP']])if(item[key])fields.push(`${label} +${item[key]}`);
  if(item.blindRes)fields.push(`Blind Resist ${item.blindRes}%`);
  fields.push(`Weight ${item.weight}`,`Buy ${number(item.buy)}z`);if(item.equipLevel)fields.push(`Base Lv.${item.equipLevel}+`);fields.push(item.refineable?'Refineable':'Not refineable');return fields.filter(Boolean).join(' · ');
}
function gearAffixText(instance) {return(instance.affixes||[]).map(a=>`${GEAR_AFFIXES[a.id]?.name} +${a.value} ${GEAR_AFFIXES[a.id]?.stat?.toUpperCase()}`).join(' · ');}
function refineAction(instance,disabled=false) {
  const item=GEAR_ITEMS[instance.itemId];if(!item?.refineable||instance.refine>=20)return '<small class="gear-refine-cap">Not refineable</small>';
  const cost=refineCost(item,instance.refine),chance=refineSuccessPercent(item,instance.refine);
  return `<button class="refine-button" data-refine-gear="${esc(instance.uid)}" ${disabled?'disabled':''}>Refine +${instance.refine+1} · ${chance}%</button><small class="gear-refine-cost">${cost.amount} ${esc(ITEMS[cost.material].name)} · ${number(cost.zeny)}z${instance.refine+1>refineSafeLimit(item)?' · failure can break item':''}</small>`;
}
function gearLoadout(c) {
  c.gear ||= {};
  return `<div class="gear-sheet">${Object.entries(GEAR_SLOTS).map(([slot,label])=>{
    const equipped=c.gear[slot],item=equipped?GEAR_ITEMS[equipped.itemId]:null;
    const bag=(state.inventory.gearItems||[]).filter(instance=>gearFitsSlot(GEAR_ITEMS[instance.itemId],slot)&&canEquipGear(c.job,instance.itemId,c.level));
    const rows=bag.map(instance=>{const base=GEAR_ITEMS[instance.itemId],worn=equipped?.uid===instance.uid;return `<div class="gear-choice"><span class="gear-ro-id">${base.roId}</span><div><strong>${esc(gearInstanceTitle(instance))}</strong><small>${esc(gearBaseDetails(base))}${gearAffixText(instance)?` · ${esc(gearAffixText(instance))}`:''}</small>${refineAction(instance,c.mapId||worn)}</div><button data-gear-equip="${instance.itemId}" data-gear-uid="${esc(instance.uid)}" data-slot="${slot}" ${c.mapId||worn?'disabled':''}>${worn?'Worn':'Equip'}</button></div>`;}).join('');
    return `<section class="gear-slot"><div class="gear-slot-heading"><span class="eyebrow">${esc(label)}</span><strong>${equipped?esc(gearInstanceTitle(equipped)):'Empty'}</strong>${item?`<span class="gear-stat-line">${esc(gearBaseDetails(item))}${gearAffixText(equipped)?` · ${esc(gearAffixText(equipped))}`:''}</span>${refineAction(equipped,c.mapId)}<button class="text-button" data-gear-unequip="${slot}" ${c.mapId?'disabled':''}>Unequip</button>`:''}</div><div class="gear-choices">${rows||'<p class="muted">No eligible item instances in the bag.</p>'}</div></section>`;
  }).join('')}</div>`;
}
function cardRows(character) {
  return Object.entries(CARDS).map(([id, card]) => {
    const count = state.inventory.cards[id] || 0;
    return `<div class="inventory-row monster-card"><img src="${sprites.monsterPortrait(id)}" alt=""><div><strong>${card.name}</strong><p>${card.description} · ${id === 'phreeoni' ? 'Sandsea Hollow MVP' : id === 'skeleton' ? 'Payon Cave' : 'Morroc Dunes'} · ${count} loose</p></div>${character ? `<button data-socket="${id}" ${!count || character.mapId || character.card === id || character.equipment === 'training' ? 'disabled' : ''}>Socket</button>` : ''}</div>`;
  }).join('');
}
const EXPEDITION_GOALS = [
  'Deploy both starting Novices',
  'Reach Novice Job Lv. 10 with both',
  'Choose both first jobs at camp',
  'Form a party and carry 5+ potions each',
  'Challenge and defeat Baphomet',
  'Recruit the third Novice',
];
function renderExpeditionGoals() {
  const step = Math.max(0, Math.min(6, state.milestones.expeditionStep || 0));
  const rows = EXPEDITION_GOALS.map((label, index) => `<li class="${index < step ? 'complete' : index === step ? 'current' : ''}"><span>${index < step ? '✓' : index + 1}</span>${label}</li>`).join('');
  const action = ['Deploy starting pair', 'Continue farming', 'Choose a first job', 'Prepare party & supplies', 'Challenge Baphomet', 'Recruit a Novice'][step];
  // Attribute must serialize exactly as innerHTML reads it back, otherwise the
  // 500ms re-render detaches the button under a pending click.
  html('expedition-goals', `<div class="goals-heading"><span class="eyebrow">EXPEDITION GOALS</span><span>${step}/6</span></div><ol>${rows}</ol>${step < 6 ? `<button class="goal-next" data-goal-next="">${action} <span>↗</span></button>` : '<p class="goals-complete">Your first expedition is complete.</p>'}`);
}
function takeGoalAction() {
  const step = Math.max(0, Math.min(6, state.milestones.expeditionStep || 0));
  const starters = state.characters.filter(c => ['c1', 'c2'].includes(c.id));
  if (step === 0) { selected = new Set(['c1', 'c2']); deployment(); }
  else if (step === 1) {
    const deployed = starters.find(c => c.mapId);
    if (deployed) { selected = new Set(starters.map(c => c.id)); switchMap(deployed.mapId); }
    else { selected = new Set(['c1', 'c2']); deployment(); }
  } else if (step === 2) {
    const ready = starters.find(c => c.job === 'novice' && c.jobLevel >= 10);
    if (ready && !ready.mapId) advanceJob(ready.id); else camp();
  } else if (step === 3) {
    const party = state.parties.find(p => state.characters.filter(c => c.partyId === p.id).length >= 2);
    if (party && state.characters.filter(c => c.partyId === party.id).every(c => c.potions >= 5)) { selected = new Set([party.leaderId]); camp(); }
    else if (starters.every(c => !c.mapId) && !starters.some(c => engaged(state, c))) { selected = new Set(starters.map(c => c.id)); if (!issue({ type: 'party' })) camp(); }
    else { selected = new Set(starters.map(c => c.id)); camp(); }
  } else if (step === 4) {
    const party = state.parties.find(p => state.characters.filter(c => c.partyId === p.id).length >= 2);
    selected = new Set([party?.leaderId || starters[0]?.id].filter(Boolean)); switchMap('arena'); deployment();
  } else if (step === 5) recruit();
}
function worldActivity(c) {
  return ({ down: 'Defeated', retreating: 'Retreating', fighting: 'Fighting', moving: 'Repositioning', holding: 'Holding', searching: 'Hunting', farming: 'Farming', camp: 'At camp' })[c.status] || c.status;
}
function assignmentName(c) {
  return ({ balanced: 'Balanced', experience: 'Training', materials: 'Gathering' })[c.assignment] || c.assignment;
}
const monitorViews = [['fields','By field'],['roster','By adventurer'],['alerts','Needs attention']];
function characterAlerts(c) {
  const alerts = [];
  if (c.status === 'down') alerts.push('Defeated · recover at camp');
  if (c.mapId && c.hp / stats(c).hp <= 0.3) alerts.push('Low health');
  if (c.mapId && c.potions <= 2) alerts.push(c.potions ? 'Supplies running low' : 'No potions remaining');
  if (c.jobLevel >= promotionLevel(c.job)) alerts.push('Job advancement available');
  return alerts;
}
function monitorUnit(c) {
  return `<article class="monitor-unit" data-monitor-unit="${c.id}">
    <div class="monitor-unit-head"><img src="${sprites.portrait(c)}" alt=""><div><strong>${esc(c.name)}</strong><small data-monitor-job></small></div></div>
    <div class="monitor-unit-state"><span data-monitor-location></span><span data-monitor-status></span></div>
    <div class="monitor-unit-meters"><span data-monitor-hp></span><span data-monitor-sp></span><span data-monitor-potions></span><span data-monitor-kills></span></div>
    <p class="monitor-warnings" data-monitor-warnings></p>
    <div class="detail-actions"><button data-world-character="${c.id}">Locate</button><button data-character-page="overview" data-id="${c.id}">Manage</button></div>
  </article>`;
}
function updateMonitor() {
  const content = $('monitor-content'), view = content.dataset.view;
  const alertCount = state.characters.filter(c => characterAlerts(c).length).length;
  $('monitor-deployed').textContent = state.characters.filter(c => c.mapId).length;
  $('monitor-active').textContent = new Set(state.characters.map(c => c.mapId).filter(Boolean)).size;
  $('monitor-alerts').textContent = alertCount;
  if ($('monitor-clear')) $('monitor-clear').hidden = alertCount > 0;
  for (const row of content.querySelectorAll('[data-monitor-unit]')) {
    const c = state.characters.find(unit => unit.id === row.dataset.monitorUnit), st = stats(c), warnings = characterAlerts(c);
    const group = row.closest('[data-monitor-field]');
    if (view === 'fields' && group?.dataset.monitorField !== (c.mapId || 'camp')) {
      content.querySelector(`[data-monitor-field="${c.mapId || 'camp'}"]`).append(row);
    }
    row.hidden = view === 'alerts' && !warnings.length;
    if (row.hidden) continue;
    const party = state.parties.find(p => p.id === c.partyId);
    const readouts = { job:`${JOBS[c.job].name} · Lv. ${c.level}`,
      location:c.mapId ? MAPS[c.mapId].name : 'Guild camp',
      status:[worldActivity(c), c.mapId ? assignmentName(c) : null, party ? party.name : 'Independent'].filter(Boolean).join(' · '),
      hp:`HP ${Math.ceil(c.hp)}/${st.hp}`, sp:`SP ${Math.floor(c.sp)}/${st.sp}`,
      potions:`${c.potions} potions`, kills:`${number(c.kills)} kills`, warnings:warnings.join(' · ') };
    for (const [key,value] of Object.entries(readouts)) {
      const node = row.querySelector('[data-monitor-' + key + ']');
      if (node.textContent !== value) node.textContent = value;
    }
  }
  for (const group of content.querySelectorAll('[data-monitor-field]')) {
    group.querySelector('.world-empty').hidden = !!group.querySelector('[data-monitor-unit]:not([hidden])');
  }
}
function worldOverview(view = 'fields') {
  const tabs = monitorViews.map(([id,label])=>`<button data-monitor-view="${id}" ${id === view ? 'aria-current="page"' : ''}>${label}</button>`).join('');
  const units = state.characters.map(monitorUnit).join('');
  const groups = view === 'fields' ? [...Object.values(MAPS), {id:'camp',name:'Guild camp'}].map(map =>
    `<section class="world-map-group" data-monitor-field="${map.id}"><div class="world-map-heading"><strong>${map.name}</strong>${map.id !== 'camp' ? `<button data-world-map="${map.id}">View map ↗</button>` : ''}</div><p class="world-empty">No adventurers here</p></section>`
  ).join('') + units : units;
  showModal('World overview',`<div class="monitor-summary"><div><strong id="monitor-deployed"></strong> Deployed</div><div><strong id="monitor-active"></strong> Active maps</div><div><strong id="monitor-alerts"></strong> Need attention</div></div>
    <nav class="sheet-tabs" aria-label="Monitoring views">${tabs}</nav>
    <div id="monitor-content" class="world-overview" data-view="${view}">${view === 'alerts' ? '<p id="monitor-clear">No alerts for your guild.</p>' : ''}${groups}</div>`, 'LIVE EXPEDITIONS');
  modal.classList.add('monitor-dialog'); modal.scrollTop = 0;
  updateMonitor();
  modal.querySelector('[aria-current="page"]')?.focus({preventScroll:true});
}
function spellbook() {
  const c = selectedCharacters()[0], current = spellElement(c) || 'support';
  const support = JOB_ROLES[c.job] === 'support' ? `<div class="inventory-row"><div><strong>${JOBS[c.job].skill}</strong><p>Restore party HP</p></div><button data-attune="support" ${current === 'support' || c.mapId ? 'disabled' : ''}>${current === 'support' ? 'Prepared' : 'Prepare'}</button></div>` : '';
  const rows = support + Object.entries(ELEMENTS).filter(([,e]) => e[combatJob(c.job)]).map(([id, e]) => `<div class="inventory-row"><div><strong>${e[combatJob(c.job)]}</strong><p>${e.name} magic · strong against ${ELEMENTS[e.beats]?.name || 'Undead'}</p></div><button data-attune="${id}" ${current === id || c.mapId ? 'disabled' : ''}>${current === id ? 'Prepared' : 'Prepare'}</button></div>`).join('');
  showCharacterModal('skills', c, c.name + '’s spellbook', `<p>Prepare one spell at camp for manual casts and automatic farming. Weakness adds 50% spell damage. Matching the enemy element reduces it by 25%.</p>${rows}${modalError}`,'ELEMENTAL MAGIC');
}
function buildBook() {
  const c = selectedCharacters()[0];
  if (!c || selected.size !== 1) return toast('Select one adventurer to configure a build.');
  const current = selectedBuild(c.job, c.buildId);
  const rows = classBuilds(c.job).map(build => `<section class="build-option ${current?.id === build.id ? 'active' : ''}"><div><span class="eyebrow">${build.style.toUpperCase()} · ${build.rotation}</span><h3>${build.name}</h3><p>Signature: ${build.skills.at(-1)} · ${build.resource}</p><p>${build.skills.join(' · ')}</p></div><button data-build="${build.id}" ${current?.id === build.id || c.mapId || c.status === 'down' ? 'disabled' : ''}>${current?.id === build.id ? 'Active build' : 'Prepare build'}</button></section>`).join('');
  showCharacterModal('skills', c, c.name + '’s combat build', `<p>Builds set the automatic skill rotation and combat behavior. Change builds at camp; your choice is saved with this adventurer.</p>${rows || '<p>This class has no combat build options yet.</p>'}${modalError}`, 'CLASS TRAINING');
}
function fieldGuide() {
  const habitats = { zombie:'payon', skeleton:'payon', poring:'meadow', fabre:'meadow', willow:'forest', scorpion:'morroc', peco:'morroc', baphomet:'arena', phreeoni:'lair' };
  const rows = Object.entries(habitats).map(([id,mapId]) => {
    const mob = MONSTERS[id], element = AFFINITIES[id], weak = Object.values(ELEMENTS).find(e => e.beats === element);
    return `<section class="bounty-entry"><img alt="" src="${sprites.monsterPortrait(id)}"><div><span class="eyebrow">${MAPS[mapId].name}</span><h3>${mob.name}</h3><p>${ELEMENTS[element]?.name || (element === 'undead' ? 'Undead' : 'Neutral')} · ${weak ? 'Weak to ' + weak.name : 'Standard spell damage'} · ${mob.hp} HP</p><p>${mob.material}${CARDS[id] ? ' · ' + CARDS[id].name + ' (' + CARDS[id].description + ')' : ''}</p><button data-guide-map="${mapId}">View field ↗</button></div></section>`;
  }).join('');
  showModal('Monster field guide',rows,'GUILD ARCHIVES');
}
function bountyBoard() {
  const active = state.bounty;
  const rows = Object.entries(BOUNTIES).map(([id, bounty]) => {
    const current = active?.id === id;
    const controls = current
      ? `<strong id="active-bounty-progress">${active.kills} / ${bounty.count}</strong><button id="claim-bounty" data-bounty="claim" data-id="${id}" ${active.kills < bounty.count ? 'disabled' : ''}>Claim reward</button><button data-bounty="abandon" data-id="${id}">Abandon</button>`
      : `<button data-bounty="accept" data-id="${id}" ${active ? 'disabled' : ''}>Accept hunt</button>`;
    return `<section class="bounty-entry"><img src="${sprites.monsterPortrait(bounty.target)}" alt=""><div><span class="eyebrow">${MAPS[bounty.map].name}</span><h3>${bounty.name}</h3><p>Defeat ${bounty.count} × ${MONSTERS[bounty.target].name}</p><p>${bounty.zeny} Zeny + ${EQUIPMENT[bounty.item].name}</p><div class="detail-actions">${controls}</div></div></section>`;
  }).join('');
  showModal('Guild bounty board', `<p>Choose one hunt for your guild. Kills from any team count after acceptance, including while you are away.</p>${rows}${modalError}`,'HUNTING CONTRACTS');
}
function storage() {
  const recipes = Object.entries(FORGE).map(([id, recipe]) => {
    const price = forgePrice(state, id), ingredients = Object.entries(recipe.materials);
    const ready = state.inventory.zeny >= price && ingredients.every(([key, qty]) => (state.inventory.materials[key] || 0) >= qty);
    const costs = ingredients.map(([key, qty]) => `${key} ${state.inventory.materials[key] || 0}/${qty}`).join(' · ');
    return `<div class="inventory-row"><div><strong>${EQUIPMENT[id].name}</strong><p>${costs} · ${price} Zeny</p></div><button data-forge="${id}" ${ready ? '' : 'disabled'}>Forge</button></div>`;
  }).join('');
  showModal('The fruits of your adventures.', `<p>All expedition loot arrives in shared storage. Equipment is assigned individually at camp.</p><h3>Materials</h3>${Object.entries(state.inventory.materials).length ? Object.entries(state.inventory.materials).map(([name, count]) => `<div class="inventory-row">${esc(name)}<span>${number(count)}</span></div>`).join('') : '<p>No materials yet. Your first expedition is waiting.</p>'}<h3>Equipment</h3>${Object.entries(state.inventory.equipment).map(([id, count]) => `<div class="inventory-row"><div>${EQUIPMENT[id].name}<p>${EQUIPMENT[id].description}</p></div><span>${count} stored</span></div>`).join('')}<p style="margin-top:17px">Field enemies have a small chance to drop equipment. Baphomet always drops a Sanctuary relic. Crafted gear can be equipped at camp.</p><h3>Monster cards</h3>${cardRows()}<h3>Prontera forge</h3><p>A Blacksmith resting at camp halves the Zeny fee. Guild funds · ${number(state.inventory.zeny)} Zeny</p>${recipes}${modalError}`, 'SHARED STORAGE');
}
function bag() {
  const storedGear = Object.entries(state.inventory.equipment).filter(([id, count]) => id !== 'training' && count > 0)
    .map(([id, count]) => `<div class="inventory-row"><div><strong>${EQUIPMENT[id].name}</strong><p>${EQUIPMENT[id].description}</p></div><span>×${number(count)}</span></div>`).join('');
  const refinedGear = Object.entries(state.inventory.socketed).filter(([, count]) => count > 0).map(([key, count]) => {
    const { item, card, rank } = gearVariant(key);
    return `<div class="inventory-row"><div><strong>${rank ? '+' + rank + ' ' : ''}${EQUIPMENT[item].name}${card ? ' · ' + CARDS[card].name : ''}</strong><p>${EQUIPMENT[item].description}</p></div><span>×${number(count)}</span></div>`;
  }).join('');
  const gearInstances=(state.inventory.gearItems||[]).map(instance=>`<div class="inventory-row"><div><strong>${esc(gearInstanceTitle(instance))}</strong><p>${esc(GEAR_SLOTS[GEAR_ITEMS[instance.itemId].slot])} · RO #${GEAR_ITEMS[instance.itemId].roId}${gearAffixText(instance)?` · ${esc(gearAffixText(instance))}`:''}</p></div>${refineAction(instance,selectedCharacters().length!==1||selectedCharacters()[0].mapId)}</div>`).join('')||'<p>No slot equipment stored.</p>';
  const refineOres=['phracon','emveretarcon','oridecon','elunium','bradium','carnium'].map(id=>`<div class="inventory-row"><div><strong>${ITEMS[id].name}</strong></div><span>×${number(state.inventory.items[id]||0)}</span></div>`).join('');
  const refineExchanges=[['oridecon','bradium'],['elunium','carnium']].map(([from,to])=>`<div class="inventory-row"><div><strong>${ITEMS[to].name}</strong><p>3 ${ITEMS[from].name} + 50,000 Zeny</p></div><button data-refine-convert="${from}" data-refine-to="${to}" ${selectedCharacters().length!==1||selectedCharacters()[0].mapId||(state.inventory.items[from]||0)<3||state.inventory.zeny<50000?'disabled':''}>Exchange</button></div>`).join('');
  const materialNames = new Set([...Object.keys(state.inventory.materials), ...Object.keys(ORE_INFO)]);
  const materials = [...materialNames].sort((a, b) => a.localeCompare(b)).map(name =>
    `<div class="inventory-row"><div><strong>${esc(name)}</strong><p>${ORE_INFO[name]?.description || 'Field crafting material.'}</p></div><span>×${number(state.inventory.materials[name] || 0)}</span></div>`).join('');
  const potions = state.characters.map(c => {
    const refill = Math.max(0, 10 - c.potions) * 2;
    return `<div class="inventory-row"><div><strong>Red Potion · ${esc(c.name)}</strong><p>${number(c.potions)} carried · auto-use restores 65 HP.</p></div><button data-bag-restock="${c.id}" ${c.mapId || !refill || state.inventory.zeny < refill ? 'disabled' : ''}>${refill ? `Restock · ${refill}z` : 'Full'}</button></div>`;
  }).join('');
  const selected = selectedCharacters();
  showModal('Guild bag', `<div class="bag-summary"><div><span>Guild funds</span><strong>${number(state.inventory.zeny)} Zeny</strong></div><div><span>Adventurers</span><strong>${state.characters.length} / 5</strong></div></div><div class="bag-grid"><section class="bag-section"><h3>Equipment</h3>${storedGear || refinedGear ? storedGear + refinedGear : '<p>No spare equipment stored.</p>'}<button class="bag-open-equipment" data-bag-equipment ${selected.length !== 1 ? 'disabled' : ''}>Manage selected adventurer’s gear</button><h4>Renewal equipment instances</h4>${gearInstances}</section><section class="bag-section"><h3>Materials &amp; ores</h3>${materials}<h4>Refinement ores</h4>${refineOres}<h4>Advanced ore exchange</h4>${refineExchanges}</section><section class="bag-section"><h3>Consumables · Red Potions</h3><p>Restock at camp; characters use potions automatically according to their tactics.</p>${potions}</section><section class="bag-section"><h3>Monster cards</h3>${cardRows()}</section></div>${modalError}`, 'INVENTORY');
}
function rename() {
  const c = selectedCharacters()[0]; if (!c || selected.size !== 1) return toast('Choose one adventurer to rename.');
  showModal('A name for their story.', `<form id="rename-form"><label for="rename-name" class="form-label">Adventurer name</label><input type="text" id="rename-name" name="name" maxlength="20" required value="${esc(c.name)}">${modalError}<div class="modal-footer"><button class="primary">Save name</button></div></form>`);
  $('rename-form').onsubmit = e => { e.preventDefault(); issue({ type: 'rename', name: new FormData(e.currentTarget).get('name') }, { close: true }); };
}
function download(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function settings() {
  showModal('Your adventure, at your pace.', `<p>Your guild saves automatically on this device. Export a copy to keep a backup or move to another browser. Single-player progress is local; multiplayer will arrive in a later phase.</p><div class="settings-actions"><button data-modal-action="export">Export guild</button><button data-modal-action="import">Import guild</button><button data-modal-action="save">Save now</button></div><h3>Field commands</h3><div class="help-grid"><span><b>Click portrait / character</b> · Select</span><span><b>Shift + click</b> · Select several</span><span><b>Double-click portrait</b> · Follow on map</span><span><b>Right-click ground / M</b> · Move</span><span><b>Click enemy</b> · Focus target</span><span><b>H / R</b> · Hold / Resume farming</span><span><b>Q / T</b> · Skill / Retreat</span><span><b>1–3</b> · Selected adventurer’s hotbar</span><span><b>Scroll / + / −</b> · Zoom</span><span><b>Drag ground</b> · Pan camera</span><span><b>F / Esc</b> · Fit map / Cancel order</span></div><h3>While you’re away</h3><p>All deployed farming teams continue for up to four hours, using their actual combat rules, supplies, and tactics. Defeated characters stop earning. Boss expeditions return to camp without an offline boss reward. Keep just one game tab open.</p><p>Party members share one EXP pool with a 12% group bonus. Training assignments earn 15% more Base EXP; gathering assignments collect double materials. No permanent death.</p><div class="milestone-note">First milestone: grow two Novices into first jobs, assemble a party, and defeat Baphomet to unlock another adventurer.</div><h3>Start over</h3><button class="danger-button" data-modal-action="reset" style="padding:10px 15px">Start a new guild…</button>`, 'SETTINGS & FIELD GUIDE');
}
function offlineReport(report) {
  showModal('Welcome back, guild leader.', `<p>Your adventurers kept their assignments while you were away.${report.capped ? ' The four-hour limit was applied.' : ''} Boss expeditions require active play and returned to camp.</p><div class="report-stats"><div class="report-stat"><strong>${duration(report.seconds)}</strong><span>FARMING TIME</span></div><div class="report-stat"><strong>${number(report.kills)}</strong><span>ENEMIES DEFEATED</span></div><div class="report-stat"><strong>${number(report.zeny)}</strong><span>ZENY EARNED</span></div></div>${report.loot.length ? `<h3>Loot brought back</h3>${report.loot.map(drop => `<div class="inventory-row">${esc(drop.name)}<span>×${number(drop.count)}</span></div>`).join('')}` : ''}${report.characters.map(c => `<div class="inventory-row"><div>${esc(c.name)}<p>${c.levels ? `+${c.levels} Base levels · ` : ''}${c.jobLevels ? `+${c.jobLevels} Job levels · ` : ''}${c.potions} potions used</p></div><span>${c.status === 'down' ? 'Needs recovery' : c.status === 'camp' ? 'At camp' : 'On assignment'}</span></div>`).join('')}<div class="modal-footer"><button class="primary" id="continue-adventure">Continue adventure <span>↗</span></button></div>`, 'EXPEDITION REPORT');
  $('continue-adventure').onclick = closeModal;
}
async function settle(elapsed, { activeTab = false } = {}) {
  if (elapsed < 2) return;
  settling = true; ready = false;
  if (!activeTab) { $('loading').hidden = false; $('loading-text').textContent = 'Your adventurers are reporting in…'; }
  const worker = new Worker('/src/offline-worker.js', { type: 'module' });
  try {
    const result = await new Promise((resolve, reject) => {
      worker.onmessage = ({ data }) => data.error ? reject(new Error(data.error)) : resolve(data);
      worker.onerror = () => reject(new Error('Expedition catch-up could not be calculated. Your saved checkpoint is unchanged.'));
      worker.postMessage({ state, elapsed, mode: activeTab ? 'active-tab' : 'offline' });
    });
    state = result.state; settling = false; persist();
    if (!activeTab && elapsed >= 30) offlineReport(result.report);
    if (activeTab && result.capped) toast('Background catch-up reached the four-hour safety limit.');
  } finally { worker.terminate(); settling = false; ready = true; lastTime = performance.now(); accumulator = 0; $('loading').hidden = true; }
}

document.addEventListener('click', event => {
  if (!state || !ready) return;
  const ws = event.target.closest('#adventurer-panel button');
  if (ws && ws.id !== 'workspace-close') {
    const c=selectedCharacters()[0], data=ws.dataset;
    if (data.workspacePage) {
      workspacePage=data.workspacePage; renderWorkspace(); $('workspace-content').scrollTop=0;
      $('workspace-tabs').querySelector('[aria-current]')?.focus({preventScroll:true});
    } else if (data.workspaceSlot) {
      workspaceSlot=data.workspaceSlot; renderWorkspace();
      $('workspace-content').querySelector(`[data-workspace-slot="${workspaceSlot}"]`)?.focus({preventScroll:true});
    } else if ('workspaceUnequip' in data) issue({type:'gear-unequip',slot:workspaceSlot,ids:[c.id]},{quiet:true});
    else if (data.workspaceEquip) {
      const instance=state.inventory.gearItems.find(i=>i.uid===data.workspaceEquip);
      if(instance) issue({type:'gear-equip',slot:workspaceSlot,item:instance.itemId,uid:instance.uid,ids:[c.id]},{quiet:true});
    } else if (data.workspaceSocket || data.workspaceUnsocket !== undefined) {
      const instance=c.gear?.[workspaceSlot];
      if(instance) issue({type:'gear-card',uid:instance.uid,card:data.workspaceSocket || null,index:Number(data.workspaceUnsocket),ids:[c.id]},{quiet:true});
    } else if (data.workspaceStat) {
      const key=data.workspaceStat;
      statDraft[key]=(statDraft[key] || 0) + Number(data.delta);
      if (!statDraft[key]) delete statDraft[key];
      renderWorkspace();
      const control=$('workspace-content').querySelector(`[data-workspace-stat="${key}"][data-delta="${data.delta}"]`);
      if (control && !control.disabled) control.focus({preventScroll:true});
    } else if ('workspaceApplyStats' in data) {
      const points=statDraft;
      statDraft={};
      if (!issue({type:'allocate',ids:[c.id],points},{quiet:true})) { statDraft=points; renderWorkspace(); }
    } else if (data.workspaceJob) {
      pendingJob=data.workspaceJob; renderWorkspace();
    } else if ('workspacePromote' in data) {
      const job=pendingJob;
      pendingJob=null;
      issue({type:'promote',ids:[c.id],job});
    } else if (data.workspaceTrain) issue({type:'technique-train',skillId:data.workspaceTrain,ids:[c.id]},{quiet:true});
    else if (data.workspaceDetail) ({equipment,skills:()=>characterSkills(c),attributes,advance:()=>advanceJob(c.id)})[data.workspaceDetail]();
    return;
  }
  const fieldOrderButton = event.target.closest('[data-individual-order]');
  if (fieldOrderButton) {
    const order=fieldOrderButton.dataset.individualOrder;
    if (issue({type:'field-order',mapId:renderer.mapId,order},{quiet:true})) toast(order === 'solo' ? 'Solo farming started.' : 'Focusing the boss.');
    return;
  }
  const hotbarButton = event.target.closest('[data-hotbar]');
  if (hotbarButton) { castHotbar(Number(hotbarButton.dataset.hotbar)); return; }
  const monitorView = event.target.closest('[data-monitor-view]');
  if (monitorView) { worldOverview(monitorView.dataset.monitorView); return; }
  const sheetPage = event.target.closest('[data-character-page]');
  if (sheetPage) { openCharacterPage(sheetPage.dataset.characterPage,sheetPage.dataset.id); return; }
  const map = event.target.closest('[data-map]'); if (map) { switchMap(map.dataset.map); return; }
  const card = event.target.closest('[data-character]'); if (card) { setSelection(card.dataset.character, event.shiftKey || multiSelect); return; }
  if (event.target.closest('[data-goal-next]')) { takeGoalAction(); return; }
  const worldMap = event.target.closest('[data-world-map]'); if (worldMap) { closeModal(); switchMap(worldMap.dataset.worldMap); return; }
  const worldCharacter = event.target.closest('[data-world-character]'); if (worldCharacter) {
    const c = state.characters.find(v => v.id === worldCharacter.dataset.worldCharacter);
    if (c) { selected = new Set([c.id]); closeModal(); if (c.mapId) { switchMap(c.mapId); renderer.followId = c.id; } else renderUI(); }
    return;
  }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action) {
    if (action === 'deploy') deployment(); else if (action === 'camp') camp(); else if (action === 'advance') advanceJob();
    else if (action === 'spellbook') spellbook(); else if (action === 'builds') buildBook(); else if (action === 'attributes') attributes(); else if (action === 'equipment') equipment(); else if (action === 'rename') rename(); else if (action === 'leader') issue({ type: 'leader' });
    else if (action === 'move' || action === 'rally') {
      if (action === 'rally' && MAPS[renderer.mapId].boss) return toast('Choose a farming field to mark a hunting area.');
      $('toast').hidden = true;
      orderMode = orderMode === action ? null : action;
      renderUI();
    }
    else issue({ type: action });
  }
  const service = event.target.closest('[data-camp-unit]');
  if (service) { selected = new Set([service.dataset.campUnit]); if (service.dataset.service === 'advance') advanceJob(); else { issue({ type: service.dataset.service }); camp(); } }
  const refine = event.target.closest('[data-refine]');
  if (refine && issue({ type:'refine',rank:Number(refine.dataset.refine) },{quiet:true})) equipment();
  const socket = event.target.closest('[data-socket]');
  if (socket && issue({ type: 'socket', card: socket.dataset.socket || null }, { quiet: true })) equipment();
  const attune = event.target.closest('[data-attune]');
  if (attune && issue({ type:'attune',element:attune.dataset.attune },{quiet:true})) spellbook();
  const build = event.target.closest('[data-build]');
  if (build && issue({ type:'build', buildId:build.dataset.build },{quiet:true})) buildBook();
  const field = event.target.closest('[data-guide-map]');
  if (field) { closeModal(); switchMap(field.dataset.guideMap); }
  const bounty = event.target.closest('[data-bounty]');
  if (bounty && issue({type:'bounty-' + bounty.dataset.bounty,id:bounty.dataset.id},{quiet:true})) bountyBoard();
  const forge = event.target.closest('[data-forge]');
  if (forge && issue({ type: 'forge', item: forge.dataset.forge }, { quiet: true })) { storage(); toast('Forged equipment added to shared storage.'); }
  const gearEquip=event.target.closest('[data-gear-equip]');if(gearEquip&&issue({type:'gear-equip',slot:gearEquip.dataset.slot,item:gearEquip.dataset.gearEquip,uid:gearEquip.dataset.gearUid},{quiet:true}))equipment();
  const gearUnequip=event.target.closest('[data-gear-unequip]');if(gearUnequip&&issue({type:'gear-unequip',slot:gearUnequip.dataset.gearUnequip},{quiet:true}))equipment();
  const gearRefine=event.target.closest('[data-refine-gear]');if(gearRefine&&issue({type:'refine-gear',uid:gearRefine.dataset.refineGear},{quiet:true})){modal.querySelector('.gear-sheet')?equipment():bag();}
  const refineConvert=event.target.closest('[data-refine-convert]');if(refineConvert&&issue({type:'refine-convert',from:refineConvert.dataset.refineConvert,to:refineConvert.dataset.refineTo},{quiet:true}))bag();
  const equip = event.target.closest('[data-equip]'); if (equip && issue({ type: 'equip', item: equip.dataset.equip, card: equip.dataset.card || null, rank:Number(equip.dataset.rank) })) equipment();
  const bagRestock = event.target.closest('[data-bag-restock]');
  if (bagRestock) {
    const id = bagRestock.dataset.bagRestock; selected = new Set([id]);
    if (issue({ type: 'resupply', ids: [id] }, { quiet: true })) bag();
    return;
  }
  if (event.target.closest('[data-bag-equipment]')) { closeModal(); equipment(); return; }
  const modalAction = event.target.closest('[data-modal-action]')?.dataset.modalAction;
  if (modalAction === 'recover-all') { const ids = state.characters.filter(c => !c.mapId).map(c => c.id); if (issue({ type: 'recover', ids })) camp(); }
  if (modalAction === 'supply-all') { const ids = state.characters.filter(c => !c.mapId).map(c => c.id); if (issue({ type: 'resupply', ids })) camp(); }
  if (modalAction === 'export') { persist(); download(encodeSave(state), 'ragna-tactics-guild.json'); }
  if (modalAction === 'import') $('import-file').click();
  if (modalAction === 'save') { persist(); toast(saveError ? 'Save unavailable. Export a backup instead.' : 'Your guild is saved on this device.'); }
  if (modalAction === 'reset') showModal('Begin another story?', '<p>This replaces the guild saved on this device. Export your current guild first if you want to keep it.</p><div class="modal-footer"><button data-modal-action="export">Export current guild</button><button data-modal-action="reset-confirm" class="danger-button">Replace with a new guild</button></div>');
  if (modalAction === 'reset-confirm') { localStorage.removeItem(SAVE_KEY); location.reload(); }
});
document.addEventListener('change', event => {
  const control = event.target;
  const slot = control.dataset.workspaceSkillSlot ?? control.dataset.workspaceSkillAuto;
  if (slot !== undefined) {
    const c=selectedCharacters()[0], index=Number(slot), old=c.techniques?.slots[index];
    const toggling=control.type==='checkbox';
    issue({type:'technique-slot',ids:[c.id],slot:index,skillId:toggling ? old?.id || null : control.value || null,auto:toggling ? control.checked : old?.auto || false},{quiet:true});
  } else if (control.id === 'workspace-auto') {
    issue({type:'tactic-config',key:'autoSkill',value:control.checked},{quiet:true});
  } else if (control.id === 'field-support' && control.value) {
    const ally=control.value;
    control.blur();
    if (issue({type:'field-order',mapId:renderer.mapId,order:'support',allyId:ally},{quiet:true})) toast('Support order assigned.');
  } else if (control.id === 'tactic-select') { issue({ type: 'tactic', tactic: control.value }, { quiet: true }); control.blur(); renderUI(); }
  else if (control.id === 'assignment-select') { issue({ type: 'assignment', assignment: control.value }, { quiet: true }); control.blur(); renderUI(); }
  else if (control.id === 'target-pref-select') { issue({ type: 'tactic-config', key: 'targetPref', value: control.value }, { quiet: true }); control.blur(); renderUI(); }
  else {
    const key = control.dataset.tacticsKey;
    if (key) {
      const value = key === 'autoSkill' ? control.checked : Number(control.value) / 100;
      const accepted = issue({ type: 'tactic-config', key, value }, { quiet: true });
      if (control.id === 'sheet-auto-skill') {
        if (!accepted) control.checked = !value;
      } else {
        control.blur(); renderUI();
      }
    }
  }
});
document.addEventListener('toggle', event => {
  if (event.target.matches?.('.tactics-details')) tacticsExpanded = event.target.open;
}, true);
document.addEventListener('focusout', event => {
  if ($('inspector').contains(event.target) && !$('inspector').contains(event.relatedTarget)) queueMicrotask(renderUI);
});
document.addEventListener('input', event => {
  const key = event.target.dataset.tacticsKey;
  if (key && key !== 'autoSkill') event.target.parentElement.querySelector('output').value = event.target.value + '%';
});
$('roster').addEventListener('dblclick', event => {
  const id = event.target.closest('[data-character]')?.dataset.character, c = state.characters.find(c => c.id === id);
  if (c?.mapId) { switchMap(c.mapId); renderer.followId = c.id; selected = new Set([c.id]); renderUI(); } else if (c) toast(c.name + ' is at the guild camp.');
});
$('select-all').onclick = () => { selected = new Set(state.characters.map(c => c.id)); renderUI(); };
$('multi-select').onclick = () => { multiSelect = !multiSelect; $('multi-select').setAttribute('aria-pressed', multiSelect); $('multi-select').textContent = multiSelect ? 'Multi ✓' : 'Multi'; };
$('first-deploy').onclick = () => { selected = new Set(state.characters.map(c => c.id)); deployment(); };
$('dismiss-coach').onclick = () => { coachDismissed = true; renderUI(); };
$('adventurer-workspace').onclick = () => setWorkspace(!workspaceOpen);
$('workspace-close').onclick = () => { setWorkspace(false); $('adventurer-workspace').focus(); };
$('character-sheet').onclick = () => openCharacterPage('overview', selectedCharacters()[0]?.id);
$('recruit-button').onclick = recruit; $('settings-button').onclick = settings; $('bag-button').onclick = bag; $('guide-button').onclick = fieldGuide; $('bounty-button').onclick = bountyBoard; $('storage-button').onclick = storage; $('world-button').onclick = () => worldOverview();
$('modal-close').onclick = closeModal;
$('save-button').onclick = () => { persist(); toast(saveError ? 'Export your guild to preserve progress.' : 'Guild saved.'); };
$('zoom-in').onclick = () => { renderer.zoom(1.18); renderUI(); }; $('zoom-out').onclick = () => { renderer.zoom(1 / 1.18); renderUI(); };
$('fit-camera').onclick = () => { renderer.fit(); renderUI(); };
$('grid-button').onclick = () => { renderer.grid = !renderer.grid; $('grid-button').setAttribute('aria-pressed', renderer.grid); };
$('import-file').onchange = async event => {
  const file = event.target.files[0]; event.target.value = ''; if (!file) return;
  try {
    if (file.size > 2_000_000) throw new Error('This file is too large to be a guild save.');
    const loaded = decodeSave(await file.text());
    showModal('Restore this guild?', `<p>This replaces your current guild with ${loaded.state.characters.length} adventurers and ${number(loaded.state.inventory.zeny)} Zeny. Export your current guild first to keep a copy.</p><div class="modal-footer"><button data-modal-action="export">Export current guild</button><button class="primary" id="confirm-import">Restore guild</button></div>`);
    $('confirm-import').onclick = async () => { closeModal(); state = loaded.state; selected = new Set(state.characters.slice(0, 2).map(c => c.id)); await settle(loaded.elapsed); persist(); renderUI(); toast('Guild restored.'); };
  } catch (err) { toast(err.message); }
};
let pointer = null;
const canvas = $('battlefield');
canvas.addEventListener('contextmenu', event => event.preventDefault());
canvas.addEventListener('pointerdown', event => {
  if (!ready) return;
  pointer = { down: true, id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, button: event.button, moved: false, shift: event.shiftKey };
  canvas.setPointerCapture(event.pointerId); canvas.focus({ preventScroll: true });
});
canvas.addEventListener('pointermove', event => {
  if (!ready) return;
  const r = canvas.getBoundingClientRect(), x = event.clientX - r.left, y = event.clientY - r.top;
  previewPointer = { x, y };
  hovered = renderer.hit(x, y)?.id || null;
  if (pointer?.down && pointer.id === event.pointerId && pointer.button === 0) {
    if (Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 5) pointer.moved = true;
    if (pointer.moved) renderer.pan(event.clientX - pointer.x, event.clientY - pointer.y);
    pointer.x = event.clientX; pointer.y = event.clientY;
  }
});
canvas.addEventListener('pointerup', event => {
  if (!pointer || !ready) return;
  const press = pointer; pointer = null;
  if (press.moved) return;
  const r = canvas.getBoundingClientRect(), x = event.clientX - r.left, y = event.clientY - r.top, hit = renderer.hit(x, y);
  if (orderMode || event.button === 2) {
    const p = renderer.world(x, y), ids = state.characters.filter(c => selected.has(c.id) && c.mapId === renderer.mapId).map(c => c.id);
    if (issue({ type: orderMode || 'move', radius: Number(radiusControl.value), mapId: renderer.mapId, point: p, ids }, { quiet: true })) {
      acknowledgePoint(event);
      orderMode = null;
    }
  } else if (hit?.hero) setSelection(hit.id, press.shift || multiSelect);
  else if (hit) { const ids = state.characters.filter(c => selected.has(c.id) && c.mapId === renderer.mapId).map(c => c.id); if (issue({ type: 'focus', targetId: hit.id, ids }, { quiet: true })) acknowledgePoint(event); }
  renderUI();
});
canvas.addEventListener('pointerleave', () => { previewPointer = null; });
$('hunt-here').onclick = () => {
  const unit = selectedCharacters().find(c => c.mapId === renderer.mapId);
  if (!unit) return toast('Select an adventurer on this field.');
  if (issue({ type: 'rally', mapId: renderer.mapId, ids: selectedCharacters().filter(c => c.mapId === renderer.mapId).map(c => c.id),
    radius: Number(radiusControl.value), point: { x: unit.x, y: unit.y } })) {
    orderMode = null; renderUI(); document.querySelector('[data-action="rally"]').focus();
  }
};
// Minimap: click or drag to jump the camera to a world point.
$('expand-minimap').onclick = () => {
  const map = MAPS[renderer.mapId];
  const rows = state.characters.map((c,index)=>`<button data-world-character="${c.id}"><strong>${index+1} · ${esc(c.name)}</strong><small>${c.mapId ? MAPS[c.mapId].name : 'Guild camp'}</small></button>`).join('');
  showModal(map.name,`<canvas id="expanded-minimap" width="640" height="400" aria-label="Current map overview"></canvas><div class="atlas-roster">${rows}</div>`,'MAP NAVIGATION');
  const overview = $('expanded-minimap');
  renderer.drawMinimap(overview,state,selected);
  overview.onclick = event => {
    navigateMinimap(overview,event);
    closeModal();
  };
};
const minimap = $('minimap');
let minimapDragging = false;
const navigateMinimap = (canvas,event) => {
  if (!ready) return;
  const r = canvas.getBoundingClientRect();
  const world = renderer.minimapToWorld(canvas,
    (event.clientX - r.left) * (canvas.width / r.width),
    (event.clientY - r.top) * (canvas.height / r.height));
  renderer.centerOn(world);
  renderUI();
};
minimap.addEventListener('pointerdown', event => { if (!ready) return; minimapDragging = true; minimap.setPointerCapture(event.pointerId); navigateMinimap(minimap,event); });
minimap.addEventListener('pointermove', event => { if (minimapDragging) navigateMinimap(minimap,event); });
minimap.addEventListener('pointerup', () => { minimapDragging = false; });
minimap.addEventListener('pointercancel', () => { minimapDragging = false; });
$('find-unit').onclick = () => {
  const onMap = state.characters.filter(c => c.mapId === renderer.mapId);
  if (!onMap.length) return toast('No adventurers are on this field.');
  const index = onMap.findIndex(c => selected.has(c.id));
  const next = onMap[(index + 1) % onMap.length];
  selected = new Set([next.id]); inspectorKey = '';
  renderer.centerOn(next); renderer.followId = next.id;
  renderUI();
};
$('detail-toggle').onclick = () => {
  document.body.classList.toggle('detail-open');
  $('detail-toggle').setAttribute('aria-expanded', String(document.body.classList.contains('detail-open')));
};
$('stack-close').onclick = () => {
  document.body.classList.remove('detail-open');
  $('detail-toggle').setAttribute('aria-expanded', 'false');
};
canvas.addEventListener('pointercancel', () => { pointer = null; });
canvas.addEventListener('wheel', event => { if (!ready) return; event.preventDefault(); const r = canvas.getBoundingClientRect(); renderer.zoom(Math.exp(-event.deltaY * 0.001), event.clientX - r.left, event.clientY - r.top); renderUI(); }, { passive: false });
document.addEventListener('keydown', event => {
  if (!ready || modal.open || event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return;
  const key = event.key.toLowerCase();
  if (['1','2','3'].includes(key)) { if (!event.repeat) castHotbar(Number(key)-1); }
  else if (key === 'escape') { if (workspaceOpen) setWorkspace(false); else orderMode = null; }
  else if (key === 'm') orderMode = 'move';
  else if (key === 'f') renderer.fit();
  else if (key === 'g') $('find-unit').click();
  else if (key === '+' || key === '=') renderer.zoom(1.15);
  else if (key === '-') renderer.zoom(1 / 1.15);
  else if ({ h: 'hold', r: 'resume', q: 'skill', t: 'retreat' }[key]) issue({ type: { h: 'hold', r: 'resume', q: 'skill', t: 'retreat' }[key] });
  else return;
  event.preventDefault(); renderUI();
});
document.addEventListener('visibilitychange', async () => {
  if (!state || !writable || settling) return;
  if (document.hidden) { hiddenAt = Date.now(); persist(); }
  else if (hiddenAt) { const elapsed = (Date.now() - hiddenAt) / 1000; hiddenAt = null; try { await settle(elapsed, { activeTab: true }); renderUI(); } catch (err) { toast(err.message); } lastTime = performance.now(); }
});
window.addEventListener('pagehide', persist);
function frame(now) {
  requestAnimationFrame(frame);
  if (!ready || !state || document.hidden || settling) { lastTime = now; return; }
  accumulator += Math.min((now - lastTime) / 1000, 0.5); lastTime = now;
  while (accumulator >= STEP) { tick(state); accumulator -= STEP; }
  const preview = orderMode === 'rally' && previewPointer ? renderer.world(previewPointer.x, previewPointer.y) : null;
  renderer.draw(state, selected, hovered, accumulator, preview && { ...preview, radius: Number(radiusControl.value) });
  if (now - lastMinimap >= 100) {
    renderer.drawMinimap($('minimap'), state, selected);
    if (modal.open && $('expanded-minimap')) renderer.drawMinimap($('expanded-minimap'),state,selected);
    lastMinimap = now;
  }
  if (now - lastUI > 500) { renderUI(); lastUI = now; }
  if (now - lastSave > 5000) { persist(); lastSave = now; }
}
function failure(message, recoverable = false) {
  $('loading').hidden = false; $('loading-text').textContent = message;
  if (recoverable) {
    const div = document.createElement('div'); div.className = 'recovery-actions';
    const exportButton = document.createElement('button'); exportButton.textContent = 'Export unreadable save'; exportButton.onclick = () => download(localStorage.getItem(SAVE_KEY) || '', 'ragna-tactics-recovery.json');
    const reset = document.createElement('button'); reset.textContent = 'Start a new guild'; reset.onclick = () => { if (confirm('Replace the unreadable local save? Export it first if you want to keep it.')) { localStorage.removeItem(SAVE_KEY); location.reload(); } };
    div.append(exportButton, reset); $('loading').append(div);
  }
}
async function acquireWriter() {
  if (!navigator.locks) throw new Error('This browser cannot safely coordinate guild saves. Open the game in a current Chrome, Edge, Firefox, or Safari browser on localhost or HTTPS.');
  return new Promise(resolve => {
    navigator.locks.request('ragna-tactics:guild-writer', { ifAvailable: true }, async lock => {
      if (!lock) { resolve(false); return; }
      resolve(true);
      await new Promise(() => {}); // Browser releases the lock when this tab closes.
    }).catch(() => resolve(false));
  });
}
async function start() {
  try {
    writable = await acquireWriter();
    if (!writable) { failure('Your guild is already open in another tab. Close that tab, then reload this one to continue.'); return; }
    sprites = new Sprites(); await sprites.init(); renderer = new Renderer(canvas, sprites);
    let loaded;
    try { loaded = loadGame(localStorage); } catch (err) { failure(err.message, true); return; }
    state = loaded.state; await settle(loaded.elapsed);
    ready = true; $('loading').hidden = true; renderUI(); persist();
    if (loaded.warning) toast(loaded.warning);
    lastTime = performance.now(); requestAnimationFrame(frame);
  } catch (err) { ready = false; failure(err.message + ' Reload to try again.'); console.error(err); }
}
start();
