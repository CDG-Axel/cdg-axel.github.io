// ============================================================
//  Card Exchange Tracker — hs-exchange.js
// ============================================================

const STORAGE_KEY = 'cardTracker_v2';
const STARS = 5;

// ── State ────────────────────────────────────────────────────
let state = {
    currentSeason: 'Сезон 1',
    players: [],
    history: {},
    isNewCard: false,
    activeRow: null,
    lastAction: null,
};

// ── Helpers ──────────────────────────────────────────────────
const norm   = s => (s || '').trim().toLowerCase();
const zeroes = () => Array(STARS).fill(0);

function newPlayer(name = '') {
    return { name, received_new: zeroes(), received_double: zeroes(), sent: zeroes(), note: '' };
}

function calcStars(arr) {
    return arr.reduce((sum, n, i) => sum + n * (i + 1), 0);
}

function arrAdd(base, delta) {
    return base.map((v, i) => v + (delta[i] || 0));
}

function playerTotals(d) {
    const recv_new   = d.received_new   || zeroes();
    const recv_dbl   = d.received_double || zeroes();
    const recv_total = recv_new.map((v, i) => v + recv_dbl[i]);
    const sent       = d.sent || zeroes();
    return {
        recv_new, recv_dbl, recv_total, sent,
        recv_new_count:   recv_new.reduce((a, b) => a + b, 0),
        recv_dbl_count:   recv_dbl.reduce((a, b) => a + b, 0),
        recv_total_count: recv_total.reduce((a, b) => a + b, 0),
        sent_count:       sent.reduce((a, b) => a + b, 0),
        recv_stars:       calcStars(recv_total),
        sent_stars:       calcStars(sent),
        balance:          calcStars(recv_total) - calcStars(sent),
    };
}

function aggregateRecords(records) {
    const out = { received_new: zeroes(), received_double: zeroes(), sent: zeroes() };
    for (const r of records) {
        out.received_new    = arrAdd(out.received_new,    r.received_new    || zeroes());
        out.received_double = arrAdd(out.received_double, r.received_double || zeroes());
        out.sent            = arrAdd(out.sent,            r.sent            || zeroes());
    }
    return out;
}

function mergeSeasonArrays(base, incoming) {
    const result = base.map(s => ({
        season:          s.season,
        received_new:    [...s.received_new],
        received_double: [...s.received_double],
        sent:            [...s.sent],
    }));
    for (const s of incoming) {
        const ex = result.find(r => r.season === s.season);
        if (ex) {
            ex.received_new    = arrAdd(ex.received_new,    s.received_new);
            ex.received_double = arrAdd(ex.received_double, s.received_double);
            ex.sent            = arrAdd(ex.sent,            s.sent);
        } else {
            result.push({
                season:          s.season,
                received_new:    [...s.received_new],
                received_double: [...s.received_double],
                sent:            [...s.sent],
            });
        }
    }
    return result;
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

    state.players.forEach((p, i) => {
        const t = playerTotals(p);
        const tr = createElement('tr', state.activeRow === i ? ['active-row'] : []);

        // Name cell
        const tdName   = appendElement(tr, 'td', ['td-name']);
        const nameCell = appendElement(tdName, 'div', ['name-cell']);
        const nameInput = createElement('input', ['inp', 'inp-name'], {
            'data-row': i, value: p.name, placeholder: 'Игрок',
            autocomplete: 'off', inputmode: 'text', enterkeyhint: 'done',
        });
        nameCell.appendChild(nameInput);
        nameCell.appendChild(createElement('button', ['btn-icon', 'btn-info'], { 'data-row': i, title: 'Статистика' }, 'ℹ'));
        nameCell.appendChild(createElement('button', ['btn-icon', 'btn-edit'], { 'data-row': i, title: 'Редактировать' }, '✎'));
        nameCell.appendChild(createElement('button', ['btn-icon', 'btn-del'],  { 'data-row': i, title: 'Удалить' }, '✕'));

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
            'data-row': i, value: p.note, placeholder: '…', inputmode: 'text',
        }));

        tbody.appendChild(tr);

        // Events
        nameInput.addEventListener('focus',   onNameFocus);
        nameInput.addEventListener('blur',    onNameBlur);
        nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });

        tdNote.querySelector('.inp-note').addEventListener('focus', () => setActiveRow(i));
        tdNote.querySelector('.inp-note').addEventListener('blur',  onNoteBlur);
        tdNote.querySelector('.inp-note').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });

        tr.addEventListener('click', () => setActiveRow(i));
        tdName.querySelector('.btn-info').addEventListener('click', e => { e.stopPropagation(); openStatsModal(i); });
        tdName.querySelector('.btn-edit').addEventListener('click', e => { e.stopPropagation(); openEditModal(i); });
        tdName.querySelector('.btn-del').addEventListener('click',  e => { e.stopPropagation(); deleteRow(i); });
    });

    renderTotalsRow(tbody);
}

function renderTotalsRow(tbody) {
    if (state.players.length === 0) return;
    const t = playerTotals(aggregateRecords(state.players));
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
    const player = state.activeRow !== null ? state.players[state.activeRow] : null;
    document.getElementById('panel-player').textContent =
        player ? (player.name || '(без имени)') : 'Выберите игрока';
    const disabled = !player;
    document.querySelectorAll('.star-btn').forEach(b => b.disabled = disabled);
    document.getElementById('toggle-new').disabled = disabled;
    document.getElementById('btn-undo').disabled   = disabled || !state.lastAction;
}

// ── Active row ────────────────────────────────────────────────
function setActiveRow(i) {
    state.activeRow = i;
    document.querySelectorAll('#tbody tr').forEach((tr, idx) =>
        tr.classList.toggle('active-row', idx === i)
    );
    renderPanel();
}

// ── Name handling ─────────────────────────────────────────────
function onNameFocus(e) { setActiveRow(+e.target.dataset.row); }

async function onNameBlur(e) {
    const i       = +e.target.dataset.row;
    const newName = e.target.value.trim();
    const oldName = (state.players[i].name || '').trim();
    if (newName === oldName) return;
    if (oldName) await handleRename(i, oldName, newName, e.target);
    else         await handleNewName(i, newName, e.target);
}

async function handleNewName(i, newName, inputEl) {
    if (!newName) return;
    if ((state.history[norm(newName)] || []).length > 0) {
        const ok = await showConfirm(
            `В истории найден игрок «${newName}».\nЭто тот же человек?`,
            'Да, тот же', 'Нет, другой'
        );
        if (!ok) {
            inputEl.value = '';
            state.players[i].name = '';
            setTimeout(() => inputEl.focus(), 50);
            return;
        }
    }
    state.players[i].name = newName;
    save(); render();
}

async function handleRename(i, oldName, newName, inputEl) {
    if (!newName) { inputEl.value = oldName; return; }
    const normOld = norm(oldName), normNew = norm(newName);
    if (normOld === normNew) { state.players[i].name = newName; save(); render(); return; }

    if ((state.history[normNew] || []).length > 0) {
        const ok = await showConfirm(
            `Игрок «${newName}» уже есть в истории. Объединить данные?`,
            'Да, объединить', 'Нет, изменить имя'
        );
        if (!ok) {
            inputEl.value = oldName;
            state.players[i].name = oldName;
            setTimeout(() => inputEl.focus(), 50);
            return;
        }
        if (state.history[normOld]) {
            state.history[normNew] = mergeSeasonArrays(state.history[normNew] || [], state.history[normOld]);
            delete state.history[normOld];
        }
    } else {
        if (state.history[normOld]) {
            state.history[normNew] = state.history[normOld];
            delete state.history[normOld];
        }
    }
    state.players[i].name = newName;
    save(); render();
}

function onNoteBlur(e) {
    state.players[+e.target.dataset.row].note = e.target.value;
    save();
}

// ── Quick Panel ───────────────────────────────────────────────
function quickAdd(direction, starIndex) {
    if (state.activeRow === null) return;
    const p = state.players[state.activeRow];
    const group = direction === 'recv'
        ? (state.isNewCard ? 'received_new' : 'received_double')
        : 'sent';
    p[group][starIndex]++;
    state.lastAction = { playerIndex: state.activeRow, group, starIndex, delta: 1 };
    save(); render();
    flashRow(state.activeRow);
}

function undoLast() {
    if (!state.lastAction) return;
    const { playerIndex, group, starIndex, delta } = state.lastAction;
    const p = state.players[playerIndex];
    if (p) p[group][starIndex] = Math.max(0, p[group][starIndex] - delta);
    state.lastAction = null;
    save(); render();
}

function flashRow(i) {
    const rows = document.querySelectorAll('#tbody tr');
    if (rows[i]) {
        rows[i].classList.add('flash');
        setTimeout(() => rows[i].classList.remove('flash'), 300);
    }
}

// ── Delete / Add row ──────────────────────────────────────────
async function deleteRow(i) {
    const name = state.players[i].name || '(без имени)';
    const ok = await showConfirm(
        `Удалить игрока «${name}»?\n\nИстория за все сезоны сохранится.`,
        'Удалить', 'Отмена'
    );
    if (!ok) return;
    if (state.activeRow === i) state.activeRow = null;
    else if (state.activeRow > i) state.activeRow--;
    if (state.lastAction?.playerIndex === i) state.lastAction = null;
    state.players.splice(i, 1);
    save(); render();
}

function addRow() {
    state.players.push(newPlayer());
    save(); render();
    setTimeout(() => {
        const inputs = document.querySelectorAll('.inp-name');
        if (inputs.length) inputs[inputs.length - 1].focus();
    }, 50);
}

// ── New Season ────────────────────────────────────────────────
async function newSeason() {
    const ok = await showConfirm(
        `Начать новый сезон?\n\nДанные «${state.currentSeason}» сохранятся в историю, счётчики обнулятся. Игроки останутся.`,
        'Начать новый сезон', 'Отмена'
    );
    if (!ok) return;

    const finishedSeason = state.currentSeason;
    for (const p of state.players) {
        if (!p.name) continue;
        const key = norm(p.name);
        if (!state.history[key]) state.history[key] = [];
        state.history[key].push({
            season:          finishedSeason,
            received_new:    [...p.received_new],
            received_double: [...p.received_double],
            sent:            [...p.sent],
        });
        p.received_new    = zeroes();
        p.received_double = zeroes();
        p.sent            = zeroes();
        p.note            = '';
    }
    const m = state.currentSeason.match(/^(.*?)(\d+)$/);
    state.currentSeason = m ? m[1] + (parseInt(m[2]) + 1) : state.currentSeason + ' 2';
    state.activeRow  = null;
    state.lastAction = null;
    save(); render();
    document.getElementById('season-label').textContent = state.currentSeason;
    openStatsModal(null, finishedSeason);
}

// ── Edit Modal ────────────────────────────────────────────────
let editTarget = null;

function openEditModal(i) {
    editTarget = i;
    const p = state.players[i];
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
        `${stc} (новых — ${rnc}) = ${ss}★`;

    const balEl = document.getElementById('edit-balance');
    balEl.textContent = (bal > 0 ? '+' : '') + bal + '★';
    balEl.className = 'edit-bal-val ' + (bal > 0 ? 'pos' : bal < 0 ? 'neg' : '');
}

function saveEdit() {
    if (editTarget === null) return;
    const p = state.players[editTarget];
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
let statsMode = null;

function openStatsModal(playerIndex, preselectSeason = null) {
    statsMode = playerIndex;
    document.getElementById('stats-title').textContent =
        playerIndex !== null ? (state.players[playerIndex]?.name || '(без имени)') : 'Все игроки';
    buildSeasonList(preselectSeason);
    openModal('modal-stats');
}

function buildSeasonList(preselectSeason) {
    const list = document.getElementById('stats-season-list');
    list.innerHTML = '';

    const seasonNames = getSeasonNames();

    const liCurr = createElement('li', ['stats-season-item'],
        { 'data-season': 'current' }, state.currentSeason + ' (текущий)');
    list.appendChild(liCurr);
    liCurr.addEventListener('click', () => selectStatsSeason('current'));

    for (const sname of seasonNames) {
        const li = createElement('li', ['stats-season-item'], { 'data-season': sname }, sname);
        list.appendChild(li);
        li.addEventListener('click', () => selectStatsSeason(sname));
    }

    if (seasonNames.length > 0) {
        const liAll = createElement('li', ['stats-season-item'], { 'data-season': 'all' }, 'За всё время');
        list.appendChild(liAll);
        liAll.addEventListener('click', () => selectStatsSeason('all'));
    }

    selectStatsSeason(preselectSeason || 'current');
}

function getSeasonNames() {
    const names = new Set();
    if (statsMode !== null) {
        const p = state.players[statsMode];
        for (const h of (state.history[norm(p?.name || '')] || [])) names.add(h.season);
    } else {
        for (const seasons of Object.values(state.history))
            for (const h of seasons) names.add(h.season);
    }
    return [...names];
}

function selectStatsSeason(seasonKey) {
    document.querySelectorAll('.stats-season-item').forEach(li =>
        li.classList.toggle('selected', li.dataset.season === seasonKey)
    );

    let data;
    if (seasonKey === 'current') {
        data = statsMode !== null
            ? state.players[statsMode]
            : aggregateRecords(state.players.filter(p => p.name));
    } else if (seasonKey === 'all') {
        if (statsMode !== null) {
            const p = state.players[statsMode];
            data = aggregateRecords([...(state.history[norm(p?.name || '')] || []), p]);
        } else {
            const all = [];
            for (const seasons of Object.values(state.history)) all.push(...seasons);
            for (const p of state.players) if (p.name) all.push(p);
            data = aggregateRecords(all);
        }
    } else {
        if (statsMode !== null) {
            const p   = state.players[statsMode];
            const rec = (state.history[norm(p?.name || '')] || []).find(h => h.season === seasonKey);
            data = rec || { received_new: zeroes(), received_double: zeroes(), sent: zeroes() };
        } else {
            const recs = [];
            for (const seasons of Object.values(state.history)) {
                const r = seasons.find(h => h.season === seasonKey);
                if (r) recs.push(r);
            }
            data = aggregateRecords(recs);
        }
    }

    renderStatsDetail(playerTotals(data));
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
function exportData() { return JSON.stringify({ version: 2, ...state }, null, 2); }

function importData(json) {
    try {
        const data = JSON.parse(json);
        if (!data.players || !data.history) throw new Error('Неверный формат');
        state.currentSeason = data.currentSeason || 'Сезон 1';
        state.players       = data.players;
        state.history       = data.history;
        state.activeRow     = null;
        state.lastAction    = null;
        save(); render();
        document.getElementById('season-label').textContent = state.currentSeason;
        return true;
    } catch (e) { alert('Ошибка импорта: ' + e.message); return false; }
}

function downloadFile() {
    const a = createElement('a', [], {
        href:     URL.createObjectURL(new Blob([exportData()], { type: 'application/json' })),
        download: 'hs-exchange.json',
    });
    a.click();
    closeMenu();
}

async function copyToClipboard() {
    try {
        await navigator.clipboard.writeText(exportData());
        showToast('Скопировано в буфер обмена');
    } catch (e) {
        showToast('Не удалось скопировать: ' + e.message);
    }
    closeMenu();
}

async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        if (importData(text)) showToast('Данные загружены из буфера');
    } catch {
        openModal('modal-paste');
    }
    closeMenu();
}

function triggerFileImport() { document.getElementById('file-input').click(); closeMenu(); }

function onFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { if (importData(ev.target.result)) showToast('Данные загружены'); };
    reader.readAsText(file);
    e.target.value = '';
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
    t.textContent = msg;
    t.classList.add('show');
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
    inp.value = state.currentSeason;
    inp.focus(); inp.select();
}

function onSeasonBlur() {
    const inp = document.getElementById('season-input');
    const val = inp.value.trim();
    if (val) state.currentSeason = val;
    document.getElementById('season-label').textContent = state.currentSeason;
    document.getElementById('season-label').style.display = '';
    inp.style.display = 'none';
    save();
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    load();
    document.getElementById('season-label').textContent = state.currentSeason;
    document.getElementById('toggle-new').checked = state.isNewCard;

    // Bulk handlers
    const handlers = [
        ['btn-add-row',       'click', addRow],
        ['btn-new-season',    'click', () => { closeMenu(); newSeason(); }],
        ['btn-stats-all',     'click', () => { closeMenu(); openStatsModal(null); }],
        ['btn-menu',          'click', e => { e.stopPropagation(); toggleMenu(); }],
        ['menu-export-file',  'click', downloadFile],
        ['menu-export-clip',  'click', copyToClipboard],
        ['menu-import-file',  'click', triggerFileImport],
        ['menu-import-clip',  'click', pasteFromClipboard],
        ['file-input',        'change', onFileImport],
        ['toggle-new',        'change', e => { state.isNewCard = e.target.checked; save(); }],
        ['btn-undo',          'click', undoLast],
        ['season-label',      'click', editSeason],
        ['season-input',      'blur',  onSeasonBlur],
        ['season-input',      'keydown', e => { if (e.key === 'Enter') e.target.blur(); }],
        ['btn-edit-save',     'click', saveEdit],
        ['btn-paste-import',  'click', importFromTextarea],
    ];
    handlers.forEach(([id, type, fn]) => addHandler(id, type, fn));

    // Star buttons
    document.querySelectorAll('.star-btn').forEach(btn =>
        btn.addEventListener('click', () => quickAdd(btn.dataset.dir, +btn.dataset.stars - 1))
    );

    // Edit inputs live summary
    document.querySelectorAll('.edit-inp').forEach(inp => {
        inp.addEventListener('input', updateEditSummary);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
    });

    // Close buttons via data-closes attribute
    document.querySelectorAll('[data-closes]').forEach(btn =>
        btn.addEventListener('click', () => closeModal(btn.dataset.closes))
    );

    // Overlay closes modals (except confirm)
    document.getElementById('overlay').addEventListener('click', () => {
        if (document.getElementById('modal-confirm').classList.contains('open')) return;
        closeAllModals();
    });

    // Close menu on outside click
    document.addEventListener('click', e => {
        if (!e.target.closest('#menu-dropdown') && !e.target.closest('#btn-menu')) closeMenu();
    });

    render();
});