// ============================================================
//  Card Exchange Tracker — hs-exchange.js
// ============================================================

const STORAGE_KEY = 'cardTracker_v3';
const STARS = 5;

// ── State ────────────────────────────────────────────────────
let state = {
    lang:         'ru',
    isNewCard:    false,
    activePlayer: null,  // normalized key
    lastAction:   null,  // { playerKey, group, starIndex, delta }

    current: {
        name:       'Сезон 1',
        start_date: new Date().toISOString(),
        players:    {},
        // { normKey: { name, received_new[], received_double[], sent[], note } }
    },

    history: [],
    // [ { name, start_date, end_date, players: { normKey: { name, received_new[], received_double[], sent[] } } } ]
};

// ── Helpers ──────────────────────────────────────────────────
const norm   = s => (s || '').trim().toLowerCase();
const zeroes = () => Array(STARS).fill(0);

function newPlayerData(name = '') {
    return { name, received_new: zeroes(), received_double: zeroes(), sent: zeroes(), note: '' };
}

function calcStars(arr) {
    return arr.reduce((sum, n, i) => sum + n * (i + 1), 0);
}

function arrAdd(base, delta) {
    return base.map((v, i) => v + (delta[i] || 0));
}

function playerTotals(d) {
    const received_new    = d.received_new    || zeroes();
    const received_double = d.received_double || zeroes();
    const sent            = d.sent            || zeroes();
    const recv_total      = received_new.map((v, i) => v + received_double[i]);
    return {
        recv_new:         received_new,
        recv_dbl:         received_double,
        recv_total,
        sent,
        recv_new_count:   received_new.reduce((a, b) => a + b, 0),
        recv_dbl_count:   received_double.reduce((a, b) => a + b, 0),
        recv_total_count: recv_total.reduce((a, b) => a + b, 0),
        sent_count:       sent.reduce((a, b) => a + b, 0),
        recv_stars:       calcStars(recv_total),
        sent_stars:       calcStars(sent),
        balance:          calcStars(recv_total) - calcStars(sent),
    };
}

function aggregatePlayers(playersDict) {
    const out = { received_new: zeroes(), received_double: zeroes(), sent: zeroes() };
    for (const p of Object.values(playersDict)) {
        out.received_new    = arrAdd(out.received_new,    p.received_new    || zeroes());
        out.received_double = arrAdd(out.received_double, p.received_double || zeroes());
        out.sent            = arrAdd(out.sent,            p.sent            || zeroes());
    }
    return out;
}

// Sorted player entries by balance descending
function sortedPlayers() {
    return Object.entries(state.current.players)
        .map(([key, p]) => ({ key, p, bal: playerTotals(p).balance }))
        .sort((a, b) => b.bal - a.bal);
}

function formatDate(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString();
}

// ── DOM helpers ───────────────────────────────────────────────
function createElement(tagName, classList = [], attributes = {}, text = undefined) {
    const el = document.createElement(tagName);
    for (const cls of classList) if (cls) el.classList.add(cls);
    for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, String(value));
    if (text !== undefined) el.appendChild(document.createTextNode(text));
    return el;
}

function appendElement(parent, tagName, classList = [], attributes = {}, text = undefined) {
    const el = createElement(tagName, classList, attributes, text);
    parent.appendChild(el);
    return el;
}

function addHandler(id, type, listener) {
    document.getElementById(id).addEventListener(type, listener);
}

// ── Persistence ───────────────────────────────────────────────
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) Object.assign(state, JSON.parse(raw));
    } catch (e) { console.warn('Load error', e); }
}

// ── Render ────────────────────────────────────────────────────
function render() { renderTable(); renderPanel(); }

function renderTable() {
    const tbody = document.getElementById('tbody');
    tbody.innerHTML = '';

    for (const { key, p } of sortedPlayers()) {
        const t        = playerTotals(p);
        const isActive = state.activePlayer === key;
        const tr       = createElement('tr', isActive ? ['active-row'] : []);

        // Name cell
        const tdName   = appendElement(tr, 'td', ['td-name']);
        const nameCell = appendElement(tdName, 'div', ['name-cell']);
        const nameInput = createElement('input', ['inp', 'inp-name'], {
            'data-key': key, value: p.name, placeholder: 'Игрок',
            autocomplete: 'off', inputmode: 'text', enterkeyhint: 'done',
        });
        nameCell.appendChild(nameInput);
        nameCell.appendChild(createElement('button', ['btn-icon', 'btn-info'], { 'data-key': key, title: 'Статистика' }, 'ℹ'));
        nameCell.appendChild(createElement('button', ['btn-icon', 'btn-edit'], { 'data-key': key, title: 'Редактировать' }, '✎'));
        nameCell.appendChild(createElement('button', ['btn-icon', 'btn-del'],  { 'data-key': key, title: 'Удалить' }, '✕'));

        // Received: total, new, stars
        appendElement(tr, 'td', ['td-num', 'td-recv'], {}, String(t.recv_total_count));
        appendElement(tr, 'td', ['td-num', 'td-recv'], {}, String(t.recv_new_count));
        appendElement(tr, 'td', ['td-num', 'td-recv', 'td-stars'], {}, String(t.recv_stars));

        // Sent: total, stars
        appendElement(tr, 'td', ['td-num', 'td-sent'], {}, String(t.sent_count));
        appendElement(tr, 'td', ['td-num', 'td-sent', 'td-stars'], {}, String(t.sent_stars));

        // Balance
        const bc = t.balance > 0 ? 'pos' : t.balance < 0 ? 'neg' : '';
        appendElement(tr, 'td', ['td-num', 'td-bal', bc], {}, String(t.balance));

        // Note
        const tdNote = appendElement(tr, 'td', ['td-note']);
        tdNote.appendChild(createElement('input', ['inp', 'inp-note'], {
            'data-key': key, value: p.note || '', placeholder: '…', inputmode: 'text',
        }));

        tbody.appendChild(tr);

        // Events
        nameInput.addEventListener('focus',   () => setActivePlayer(key));
        nameInput.addEventListener('blur',    onNameBlur);
        nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });

        tdNote.querySelector('.inp-note').addEventListener('focus', () => setActivePlayer(key));
        tdNote.querySelector('.inp-note').addEventListener('blur',  onNoteBlur);
        tdNote.querySelector('.inp-note').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });

        tr.addEventListener('click', () => setActivePlayer(key));
        tdName.querySelector('.btn-info').addEventListener('click', e => { e.stopPropagation(); openStatsModal(key); });
        tdName.querySelector('.btn-edit').addEventListener('click', e => { e.stopPropagation(); openEditModal(key); });
        tdName.querySelector('.btn-del').addEventListener('click',  e => { e.stopPropagation(); deletePlayer(key); });
    }

    renderTotalsRow(tbody);
}

function renderTotalsRow(tbody) {
    if (Object.keys(state.current.players).length === 0) return;
    const t  = playerTotals(aggregatePlayers(state.current.players));
    const tr = createElement('tr', ['totals-row']);

    appendElement(tr, 'td', ['td-name', 'totals-label'], {}, 'Итого');
    appendElement(tr, 'td', ['td-num', 'td-recv'], {}, String(t.recv_total_count));
    appendElement(tr, 'td', ['td-num', 'td-recv'], {}, String(t.recv_new_count));
    appendElement(tr, 'td', ['td-num', 'td-recv', 'td-stars'], {}, String(t.recv_stars));
    appendElement(tr, 'td', ['td-num', 'td-sent'], {}, String(t.sent_count));
    appendElement(tr, 'td', ['td-num', 'td-sent', 'td-stars'], {}, String(t.sent_stars));
    const bc = t.balance > 0 ? 'pos' : t.balance < 0 ? 'neg' : '';
    appendElement(tr, 'td', ['td-num', 'td-bal', bc], {}, String(t.balance));
    appendElement(tr, 'td', ['td-note']);
    tbody.appendChild(tr);
}

function renderPanel() {
    const key    = state.activePlayer;
    const player = key ? state.current.players[key] : null;
    document.getElementById('panel-player').textContent =
        player ? (player.name || '(без имени)') : 'Выберите игрока';
    const disabled = !player;
    document.querySelectorAll('.star-btn').forEach(b => b.disabled = disabled);
    document.getElementById('toggle-new').disabled = disabled;
    document.getElementById('btn-undo').disabled   = disabled || !state.lastAction;
}

// ── Active player ─────────────────────────────────────────────
function setActivePlayer(key) {
    state.activePlayer = key;
    document.querySelectorAll('#tbody tr').forEach(tr => {
        const inp = tr.querySelector('.inp-name');
        tr.classList.toggle('active-row', inp ? inp.dataset.key === key : false);
    });
    renderPanel();
}

// ── Name handling ─────────────────────────────────────────────
async function onNameBlur(e) {
    const oldKey  = e.target.dataset.key;
    const newName = e.target.value.trim();
    const p       = state.current.players[oldKey];
    if (!p) return;
    const oldName = p.name.trim();
    if (newName === oldName) return;

    if (!newName) { e.target.value = oldName; return; }

    const newKey = norm(newName);

    if (newKey === oldKey) {
        // Same key, just casing change
        p.name = newName;
        // Update name in all history seasons too
        for (const season of state.history) {
            if (season.players[oldKey]) season.players[oldKey].name = newName;
        }
        save(); render(); return;
    }

    // Different key — check if newKey already exists anywhere
    const existsInCurrent = !!state.current.players[newKey];
    const existsInHistory = state.history.some(s => !!s.players[newKey]);

    if (existsInCurrent || existsInHistory) {
        const ok = await showConfirm(
            `Игрок «${newName}» уже есть в данных. Объединить?`,
            'Да, объединить', 'Нет, изменить имя'
        );
        if (!ok) { e.target.value = oldName; setTimeout(() => e.target.focus(), 50); return; }
    }

    renamePlayerKey(oldKey, newKey, newName);
    save(); render();
}

function renamePlayerKey(oldKey, newKey, newName) {
    // Current season
    const p = state.current.players[oldKey];
    if (state.current.players[newKey]) {
        // Merge into existing
        const target = state.current.players[newKey];
        target.received_new    = arrAdd(target.received_new,    p.received_new);
        target.received_double = arrAdd(target.received_double, p.received_double);
        target.sent            = arrAdd(target.sent,            p.sent);
        target.note            = target.note || p.note;
    } else {
        state.current.players[newKey] = { ...p, name: newName };
    }
    delete state.current.players[oldKey];

    if (state.activePlayer === oldKey) state.activePlayer = newKey;
    if (state.lastAction?.playerKey === oldKey) state.lastAction.playerKey = newKey;

    // History
    for (const season of state.history) {
        const hp = season.players[oldKey];
        if (!hp) continue;
        if (season.players[newKey]) {
            const ht = season.players[newKey];
            ht.received_new    = arrAdd(ht.received_new,    hp.received_new);
            ht.received_double = arrAdd(ht.received_double, hp.received_double);
            ht.sent            = arrAdd(ht.sent,            hp.sent);
        } else {
            season.players[newKey] = { ...hp, name: newName };
        }
        delete season.players[oldKey];
    }
}

function onNoteBlur(e) {
    const key = e.target.dataset.key;
    if (state.current.players[key]) state.current.players[key].note = e.target.value;
    save();
}

// ── Add new player ────────────────────────────────────────────
async function addRow() {
    // Create with empty name — user will type it
    const tempKey = '__new__' + Date.now();
    state.current.players[tempKey] = newPlayerData('');
    state.activePlayer = tempKey;
    save(); render();
    setTimeout(() => {
        const inputs = document.querySelectorAll('.inp-name');
        // Focus the one with data-key = tempKey
        for (const inp of inputs) {
            if (inp.dataset.key === tempKey) { inp.focus(); break; }
        }
    }, 50);
}

// Special handling: when a temp-key player gets a name, re-key it
// This is handled in onNameBlur via renamePlayerKey

// ── Quick Panel ───────────────────────────────────────────────
function quickAdd(direction, starIndex) {
    const key = state.activePlayer;
    if (!key) return;
    const p = state.current.players[key];
    if (!p) return;
    const group = direction === 'recv'
        ? (state.isNewCard ? 'received_new' : 'received_double')
        : 'sent';
    p[group][starIndex]++;
    state.lastAction = { playerKey: key, group, starIndex, delta: 1 };
    save(); render();
    flashPlayerRow(key);
}

function undoLast() {
    if (!state.lastAction) return;
    const { playerKey, group, starIndex, delta } = state.lastAction;
    const p = state.current.players[playerKey];
    if (p) p[group][starIndex] = Math.max(0, p[group][starIndex] - delta);
    state.lastAction = null;
    save(); render();
}

function flashPlayerRow(key) {
    document.querySelectorAll('#tbody tr').forEach(tr => {
        const inp = tr.querySelector('.inp-name');
        if (inp && inp.dataset.key === key) {
            tr.classList.add('flash');
            setTimeout(() => tr.classList.remove('flash'), 300);
        }
    });
}

// ── Delete player ─────────────────────────────────────────────
async function deletePlayer(key) {
    const name = state.current.players[key]?.name || '(без имени)';
    const ok = await showConfirm(
        `Удалить игрока «${name}»?\n\nИстория за все сезоны сохранится.`,
        'Удалить', 'Отмена'
    );
    if (!ok) return;
    delete state.current.players[key];
    if (state.activePlayer === key) state.activePlayer = null;
    if (state.lastAction?.playerKey === key) state.lastAction = null;
    save(); render();
}

// ── New Season ────────────────────────────────────────────────
async function newSeason() {
    const ok = await showConfirm(
        `Начать новый сезон?\n\nДанные «${state.current.name}» сохранятся в историю, счётчики обнулятся. Игроки останутся.`,
        'Начать новый сезон', 'Отмена'
    );
    if (!ok) return;

    const now = new Date().toISOString();

    // Archive current season
    const archived = {
        name:       state.current.name,
        start_date: state.current.start_date,
        end_date:   now,
        players:    {},
    };
    for (const [key, p] of Object.entries(state.current.players)) {
        archived.players[key] = {
            name:            p.name,
            received_new:    [...p.received_new],
            received_double: [...p.received_double],
            sent:            [...p.sent],
        };
    }
    state.history.push(archived);

    // Increment season name
    const m = state.current.name.match(/^(.*?)(\d+)$/);
    const newName = m ? m[1] + (parseInt(m[2]) + 1) : state.current.name + ' 2';

    // Reset current season, keep players
    for (const p of Object.values(state.current.players)) {
        p.received_new    = zeroes();
        p.received_double = zeroes();
        p.sent            = zeroes();
        p.note            = '';
    }
    state.current.name       = newName;
    state.current.start_date = now;
    state.activePlayer  = null;
    state.lastAction    = null;

    save(); render();
    document.getElementById('season-label').textContent = state.current.name;
    openStatsModal(null, archived.name);
}

// ── Edit Modal ────────────────────────────────────────────────
let editTarget = null; // player key

function openEditModal(key) {
    editTarget = key;
    const p = state.current.players[key];
    document.getElementById('edit-title').textContent = p.name || '(без имени)';
    for (let s = 0; s < STARS; s++) {
        document.getElementById(`edit-rn-${s}`).value = p.received_new[s]    || 0;
        document.getElementById(`edit-rd-${s}`).value = p.received_double[s] || 0;
        document.getElementById(`edit-st-${s}`).value = p.sent[s]            || 0;
    }
    updateEditSummary();
    openModal('modal-edit');
}

function updateEditSummary() {
    const rn = [], rd = [], st = [];
    for (let s = 0; s < STARS; s++) {
        rn.push(parseInt(document.getElementById(`edit-rn-${s}`).value, 10) || 0);
        rd.push(parseInt(document.getElementById(`edit-rd-${s}`).value, 10) || 0);
        st.push(parseInt(document.getElementById(`edit-st-${s}`).value, 10) || 0);
    }
    const rt  = rn.map((v, i) => v + rd[i]);
    const rs  = calcStars(rt), ss = calcStars(st), bal = rs - ss;
    const rnc = rn.reduce((a, b) => a + b, 0);
    const rdc = rd.reduce((a, b) => a + b, 0);
    const rtc = rt.reduce((a, b) => a + b, 0);
    const stc = st.reduce((a, b) => a + b, 0);

    document.getElementById('edit-recv-summary').textContent =
        `${rtc} (новых — ${rnc}, дублей — ${rdc}) = ${rs}★`;
    document.getElementById('edit-sent-summary').textContent =
        `${stc} = ${ss}★`;

    const balEl = document.getElementById('edit-balance');
    balEl.textContent = (bal > 0 ? '+' : '') + bal + '★';
    balEl.className = 'edit-bal-val ' + (bal > 0 ? 'pos' : bal < 0 ? 'neg' : '');
}

function saveEdit() {
    if (!editTarget) return;
    const p = state.current.players[editTarget];
    if (!p) return;
    for (let s = 0; s < STARS; s++) {
        p.received_new[s]    = Math.max(0, parseInt(document.getElementById(`edit-rn-${s}`).value, 10) || 0);
        p.received_double[s] = Math.max(0, parseInt(document.getElementById(`edit-rd-${s}`).value, 10) || 0);
        p.sent[s]            = Math.max(0, parseInt(document.getElementById(`edit-st-${s}`).value, 10) || 0);
    }
    state.lastAction = null;
    save(); render();
    closeModal('modal-edit');
}

// ── Stats Modal ───────────────────────────────────────────────
let statsPlayerKey = null; // null = all players

function openStatsModal(playerKey, preselectSeason = null) {
    statsPlayerKey = playerKey;
    document.getElementById('stats-title').textContent =
        playerKey ? (state.current.players[playerKey]?.name || '(без имени)') : 'Все игроки';
    buildSeasonList(preselectSeason);
    openModal('modal-stats');
}

function buildSeasonList(preselectSeason) {
    const list = document.getElementById('stats-season-list');
    list.innerHTML = '';

    // Current season
    const liCurr = createElement('li', ['stats-season-item'], { 'data-season': '__current__' });
    liCurr.appendChild(document.createTextNode(state.current.name + ' (текущий)'));
    list.appendChild(liCurr);
    liCurr.addEventListener('click', () => selectStatsSeason('__current__'));

    // Past seasons sorted by start_date descending
    const pastSeasons = [...state.history].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    for (const s of pastSeasons) {
        const li = createElement('li', ['stats-season-item'], { 'data-season': s.name });
        li.appendChild(document.createTextNode(s.name));
        list.appendChild(li);
        li.addEventListener('click', () => selectStatsSeason(s.name));
    }

    // All time
    if (state.history.length > 0) {
        const liAll = createElement('li', ['stats-season-item'], { 'data-season': '__all__' });
        liAll.appendChild(document.createTextNode('За всё время'));
        list.appendChild(liAll);
        liAll.addEventListener('click', () => selectStatsSeason('__all__'));
    }

    selectStatsSeason(preselectSeason || '__current__');
}

function selectStatsSeason(seasonKey) {
    document.querySelectorAll('.stats-season-item').forEach(li =>
        li.classList.toggle('selected', li.dataset.season === seasonKey)
    );

    // Update date in modal title
    let datePart = '';
    if (seasonKey === '__current__') {
        const d = formatDate(state.current.start_date);
        if (d) datePart = ` (с ${d})`;
    } else if (seasonKey !== '__all__') {
        const s = state.history.find(h => h.name === seasonKey);
        if (s) {
            const d1 = formatDate(s.start_date), d2 = formatDate(s.end_date);
            if (d1 && d2) datePart = ` (${d1} — ${d2})`;
            else if (d1)  datePart = ` (с ${d1})`;
        }
    }
    const baseTitle = statsPlayerKey
        ? (state.current.players[statsPlayerKey]?.name || '(без имени)')
        : 'Все игроки';
    document.getElementById('stats-title').textContent = baseTitle + datePart;

    renderStatsDetail(playerTotals(getStatsData(seasonKey)));
}

function getStatsData(seasonKey) {
    if (seasonKey === '__current__') {
        return statsPlayerKey
            ? (state.current.players[statsPlayerKey] || newPlayerData())
            : aggregatePlayers(state.current.players);
    }
    if (seasonKey === '__all__') {
        const allDicts = [state.current.players, ...state.history.map(s => s.players)];
        const merged = {};
        for (const dict of allDicts) {
            for (const [key, p] of Object.entries(dict)) {
                if (!merged[key]) merged[key] = { received_new: zeroes(), received_double: zeroes(), sent: zeroes() };
                merged[key].received_new    = arrAdd(merged[key].received_new,    p.received_new    || zeroes());
                merged[key].received_double = arrAdd(merged[key].received_double, p.received_double || zeroes());
                merged[key].sent            = arrAdd(merged[key].sent,            p.sent            || zeroes());
            }
        }
        return statsPlayerKey ? (merged[statsPlayerKey] || newPlayerData()) : aggregatePlayers(merged);
    }
    // Specific past season
    const s = state.history.find(h => h.name === seasonKey);
    if (!s) return newPlayerData();
    return statsPlayerKey
        ? (s.players[statsPlayerKey] || newPlayerData())
        : aggregatePlayers(s.players);
}

function renderStatsDetail(t) {
    for (let s = 0; s < STARS; s++) {
        document.getElementById(`sd-rn-${s}`).textContent = t.recv_new[s];
        document.getElementById(`sd-rd-${s}`).textContent = t.recv_dbl[s];
        document.getElementById(`sd-st-${s}`).textContent = t.sent[s];
    }
    document.getElementById('sd-recv-summary').textContent =
        `${t.recv_total_count} (новых — ${t.recv_new_count}, дублей — ${t.recv_dbl_count}) = ${t.recv_stars}★`;
    document.getElementById('sd-sent-summary').textContent =
        `${t.sent_count} = ${t.sent_stars}★`;
    const balEl = document.getElementById('sd-balance');
    balEl.textContent = (t.balance > 0 ? '+' : '') + t.balance + '★';
    balEl.className = 'sd-bal-val ' + (t.balance > 0 ? 'pos' : t.balance < 0 ? 'neg' : '');
}

// ── Import / Export ───────────────────────────────────────────
function exportData() { return JSON.stringify({ version: 3, ...state }, null, 2); }

function importData(json) {
    try {
        const data = JSON.parse(json);
        if (!data.current || !data.history) throw new Error('Неверный формат');
        state.current     = data.current;
        state.history     = data.history;
        state.lang        = data.lang        || 'ru';
        state.isNewCard   = data.isNewCard   || false;
        state.activePlayer = null;
        state.lastAction  = null;
        save(); render();
        document.getElementById('season-label').textContent = state.current.name;
        document.getElementById('toggle-new').checked = state.isNewCard;
        return true;
    } catch (e) { alert('Ошибка импорта: ' + e.message); return false; }
}

function downloadFile() {
    const a = createElement('a', [], {
        href:     URL.createObjectURL(new Blob([exportData()], { type: 'application/json' })),
        download: 'hs-exchange.json',
    });
    a.click(); closeMenu();
}

async function copyToClipboard() {
    try { await navigator.clipboard.writeText(exportData()); showToast('Скопировано в буфер обмена'); }
    catch (e) { showToast('Не удалось скопировать: ' + e.message); }
    closeMenu();
}

async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        if (importData(text)) showToast('Данные загружены из буфера');
    } catch { openModal('modal-paste'); }
    closeMenu();
}

function triggerFileImport() { document.getElementById('file-input').click(); closeMenu(); }

function onFileImport(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { if (importData(ev.target.result)) showToast('Данные загружены'); };
    reader.readAsText(file); e.target.value = '';
}

function importFromTextarea() {
    const text = document.getElementById('paste-area').value.trim();
    if (!text) { showToast('Поле пустое — вставьте данные'); return; }
    if (importData(text)) { showToast('Данные загружены'); closeModal('modal-paste'); }
}

// ── Modals ────────────────────────────────────────────────────
function openModal(id) {
    document.getElementById(id).classList.add('open');
    document.getElementById('overlay').classList.add('open');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
    if (!document.querySelector('.modal.open'))
        document.getElementById('overlay').classList.remove('open');
}

function closeAllModals() {
    document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
    document.getElementById('overlay').classList.remove('open');
}

function showConfirm(message, okText, cancelText) {
    return new Promise(resolve => {
        document.getElementById('confirm-msg').innerHTML = message.replace(/\n/g, '<br>');
        document.getElementById('confirm-ok').textContent     = okText;
        document.getElementById('confirm-cancel').textContent = cancelText;
        openModal('modal-confirm');
        function onOk()     { cleanup(); resolve(true);  }
        function onCancel() { cleanup(); resolve(false); }
        function cleanup()  {
            document.getElementById('confirm-ok').removeEventListener('click', onOk);
            document.getElementById('confirm-cancel').removeEventListener('click', onCancel);
            closeModal('modal-confirm');
        }
        document.getElementById('confirm-ok').addEventListener('click', onOk);
        document.getElementById('confirm-cancel').addEventListener('click', onCancel);
    });
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

// ── Menu ──────────────────────────────────────────────────────
function toggleMenu() { document.getElementById('menu-dropdown').classList.toggle('open'); }
function closeMenu()  { document.getElementById('menu-dropdown').classList.remove('open'); }

// ── Season label ──────────────────────────────────────────────
function editSeason() {
    document.getElementById('season-label').style.display = 'none';
    const inp = document.getElementById('season-input');
    inp.style.display = 'inline-block';
    inp.value = state.current.name;
    inp.focus(); inp.select();
}

function onSeasonBlur() {
    const inp = document.getElementById('season-input');
    const val = inp.value.trim();
    if (val) state.current.name = val;
    document.getElementById('season-label').textContent = state.current.name;
    document.getElementById('season-label').style.display = '';
    inp.style.display = 'none';
    save();
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    load();
    document.getElementById('season-label').textContent = state.current.name;
    document.getElementById('toggle-new').checked = state.isNewCard;

    const handlers = [
        ['btn-add-row',      'click', addRow],
        ['btn-new-season',   'click', () => { closeMenu(); newSeason(); }],
        ['btn-stats-all',    'click', () => { closeMenu(); openStatsModal(null); }],
        ['btn-menu',         'click', e => { e.stopPropagation(); toggleMenu(); }],
        ['menu-export-file', 'click', downloadFile],
        ['menu-export-clip', 'click', copyToClipboard],
        ['menu-import-file', 'click', triggerFileImport],
        ['menu-import-clip', 'click', pasteFromClipboard],
        ['file-input',       'change', onFileImport],
        ['toggle-new',       'change', e => { state.isNewCard = e.target.checked; save(); }],
        ['btn-undo',         'click', undoLast],
        ['season-label',     'click', editSeason],
        ['season-input',     'blur',  onSeasonBlur],
        ['season-input',     'keydown', e => { if (e.key === 'Enter') e.target.blur(); }],
        ['btn-edit-save',    'click', saveEdit],
        ['btn-paste-import', 'click', importFromTextarea],
    ];
    handlers.forEach(([id, type, fn]) => addHandler(id, type, fn));

    document.querySelectorAll('.star-btn').forEach(btn =>
        btn.addEventListener('click', () => quickAdd(btn.dataset.dir, +btn.dataset.stars - 1))
    );

    document.querySelectorAll('.edit-inp').forEach(inp => {
        inp.addEventListener('input', updateEditSummary);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
    });

    document.querySelectorAll('[data-closes]').forEach(btn =>
        btn.addEventListener('click', () => closeModal(btn.dataset.closes))
    );

    document.getElementById('overlay').addEventListener('click', () => {
        if (document.getElementById('modal-confirm').classList.contains('open')) return;
        closeAllModals();
    });

    document.addEventListener('click', e => {
        if (!e.target.closest('#menu-dropdown') && !e.target.closest('#btn-menu')) closeMenu();
    });

    render();
});