// ============================================================
//  Card Exchange Tracker — app.js
// ============================================================

const STORAGE_KEY = 'cardTracker_v1';

// ── State ────────────────────────────────────────────────────
let state = {
    currentSeason: 'Сезон 1',
    players: [],          // { name, recv:{total,new_,stars}, sent:{total,new_,stars}, note }
    history: {},          // { normalizedName: [ {season, recv, sent} ] }
    isNewCard: false,
    activeRow: null,      // index of focused row
};

// ── Helpers ──────────────────────────────────────────────────
const norm = s => (s || '').trim().toLowerCase();

function genEmpty() {
    return { total: 0, new_: 0, stars: 0 };
}

function newPlayer(name = '') {
    return { name, recv: genEmpty(), sent: genEmpty(), note: '' };
}

function historyTotals(normName) {
    const seasons = state.history[normName] || [];
    const r = genEmpty(), s = genEmpty();
    for (const h of seasons) {
        r.total += h.recv.total; r.new_ += h.recv.new_; r.stars += h.recv.stars;
        s.total += h.sent.total; s.new_ += h.sent.new_; s.stars += h.sent.stars;
    }
    return { recv: r, sent: s, seasons };
}

// ── Persistence ───────────────────────────────────────────────
function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const loaded = JSON.parse(raw);
            Object.assign(state, loaded);
        }
    } catch (e) {
        console.warn('Load error', e);
    }
}

// ── Render ────────────────────────────────────────────────────
function render() {
    renderTable();
    renderPanel();
}

function renderTable() {
    const tbody = document.getElementById('tbody');
    tbody.innerHTML = '';

    state.players.forEach((p, i) => {
        const bal = (p.recv.stars || 0) - (p.sent.stars || 0);
        const balClass = bal > 0 ? 'pos' : bal < 0 ? 'neg' : '';
        const isActive = state.activeRow === i;
        const tr = document.createElement('tr');
        if (isActive) tr.classList.add('active-row');

        tr.innerHTML = `
      <td class="td-name">
        <div class="name-cell">
          <input class="inp inp-name" data-row="${i}" data-field="name"
                 value="${esc(p.name)}" placeholder="Игрок" autocomplete="off"
                 inputmode="text" enterkeyhint="done">
          <button class="btn-info" data-row="${i}" title="История игрока">ℹ</button>
          <button class="btn-del" data-row="${i}" title="Удалить строку">✕</button>
        </div>
      </td>
      <td><input class="inp inp-num" data-row="${i}" data-group="recv" data-field="total"
           value="${p.recv.total||''}" placeholder="0" inputmode="numeric"></td>
      <td><input class="inp inp-num" data-row="${i}" data-group="recv" data-field="new_"
           value="${p.recv.new_||''}" placeholder="0" inputmode="numeric"></td>
      <td><input class="inp inp-num" data-row="${i}" data-group="recv" data-field="stars"
           value="${p.recv.stars||''}" placeholder="0" inputmode="numeric"></td>
      <td><input class="inp inp-num" data-row="${i}" data-group="sent" data-field="total"
           value="${p.sent.total||''}" placeholder="0" inputmode="numeric"></td>
      <td><input class="inp inp-num" data-row="${i}" data-group="sent" data-field="new_"
           value="${p.sent.new_||''}" placeholder="0" inputmode="numeric"></td>
      <td><input class="inp inp-num" data-row="${i}" data-group="sent" data-field="stars"
           value="${p.sent.stars||''}" placeholder="0" inputmode="numeric"></td>
      <td class="td-bal ${balClass}">${bal}</td>
      <td><input class="inp inp-note" data-row="${i}" data-field="note"
           value="${esc(p.note)}" placeholder="…" inputmode="text"></td>
    `;
        tbody.appendChild(tr);
    });

    // Re-attach events
    tbody.querySelectorAll('.inp-name').forEach(el => {
        el.addEventListener('focus', onNameFocus);
        el.addEventListener('blur', onNameBlur);
        el.addEventListener('keydown', onNameKeydown);
    });
    tbody.querySelectorAll('.inp-num').forEach(el => {
        el.addEventListener('focus', onNumFocus);
        el.addEventListener('blur', onNumBlur);
        el.addEventListener('keydown', onNumKeydown);
    });
    tbody.querySelectorAll('.inp-note').forEach(el => {
        el.addEventListener('focus', e => setActiveRow(+e.target.dataset.row));
        el.addEventListener('blur', onNoteBlur);
        el.addEventListener('keydown', e => { if(e.key==='Enter') e.target.blur(); });
    });
    tbody.querySelectorAll('.btn-del').forEach(el => {
        el.addEventListener('click', e => deleteRow(+e.currentTarget.dataset.row));
    });
    tbody.querySelectorAll('.btn-info').forEach(el => {
        el.addEventListener('click', e => showHistory(+e.currentTarget.dataset.row));
    });
}

function renderPanel() {
    const player = state.activeRow !== null ? state.players[state.activeRow] : null;
    const label = document.getElementById('panel-player');
    label.textContent = player ? player.name || '(без имени)' : 'Выберите игрока';

    const btns = document.querySelectorAll('.star-btn');
    btns.forEach(btn => btn.disabled = !player);

    document.getElementById('toggle-new').disabled = !player;
}

function esc(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Active row ────────────────────────────────────────────────
function setActiveRow(i) {
    state.activeRow = i;
    document.querySelectorAll('#tbody tr').forEach((tr, idx) => {
        tr.classList.toggle('active-row', idx === i);
    });
    renderPanel();
}

// ── Name field logic ──────────────────────────────────────────
let namePrevValue = '';

function onNameFocus(e) {
    const i = +e.target.dataset.row;
    setActiveRow(i);
    namePrevValue = e.target.value;
}

function onNameKeydown(e) {
    if (e.key === 'Enter') e.target.blur();
}

async function onNameBlur(e) {
    const i = +e.target.dataset.row;
    const newName = e.target.value.trim();
    const oldName = (state.players[i].name || '').trim();

    if (newName === oldName) return;

    // Rename existing player
    if (oldName) {
        await handleRename(i, oldName, newName, e.target);
    } else {
        // Brand new name entry
        await handleNewName(i, newName, e.target);
    }
}

async function handleNewName(i, newName, inputEl) {
    if (!newName) return;
    const normNew = norm(newName);
    const histExists = state.history[normNew] && state.history[normNew].length > 0;

    if (histExists) {
        const totals = historyTotals(normNew);
        const confirmed = await showConfirm(
            `В истории найден игрок «${newName}».\nЭто тот же человек?`,
            'Да, тот же', 'Нет, другой'
        );
        if (!confirmed) {
            // Return focus so user can retype
            inputEl.value = '';
            state.players[i].name = '';
            setTimeout(() => inputEl.focus(), 50);
            return;
        }
    }

    state.players[i].name = newName;
    save();
    render();
}

// Merge two season arrays, summing entries that share the same season name
function mergeSeasonArrays(base, incoming) {
    const result = base.map(s => ({
        season: s.season,
        recv: { ...s.recv },
        sent: { ...s.sent },
    }));
    for (const s of incoming) {
        const existing = result.find(r => r.season === s.season);
        if (existing) {
            existing.recv.total  += s.recv.total  || 0;
            existing.recv.new_   += s.recv.new_   || 0;
            existing.recv.stars  += s.recv.stars  || 0;
            existing.sent.total  += s.sent.total  || 0;
            existing.sent.new_   += s.sent.new_   || 0;
            existing.sent.stars  += s.sent.stars  || 0;
        } else {
            result.push({ season: s.season, recv: { ...s.recv }, sent: { ...s.sent } });
        }
    }
    return result;
}

async function handleRename(i, oldName, newName, inputEl) {
    if (!newName) {
        // Revert
        inputEl.value = oldName;
        return;
    }

    const normOld = norm(oldName);
    const normNew = norm(newName);

    if (normOld === normNew) {
        // Just casing/spacing change — update name directly
        state.players[i].name = newName;
        // Rename key in history
        if (state.history[normOld] && normOld !== normNew) {
            state.history[normNew] = state.history[normOld];
            delete state.history[normOld];
        }
        save(); render(); return;
    }

    const histExists = state.history[normNew] && state.history[normNew].length > 0;

    if (histExists) {
        const confirmed = await showConfirm(
            `Игрок «${newName}» уже есть в истории. Объединить данные?`,
            'Да, объединить', 'Нет, изменить имя'
        );
        if (!confirmed) {
            inputEl.value = oldName;
            state.players[i].name = oldName;
            setTimeout(() => inputEl.focus(), 50);
            return;
        }
        // Merge: combine season data, summing entries with the same season name
        if (state.history[normOld]) {
            state.history[normNew] = mergeSeasonArrays(
                state.history[normNew] || [],
                state.history[normOld]
            );
            delete state.history[normOld];
        }
    } else {
        // Rename history key
        if (state.history[normOld]) {
            state.history[normNew] = state.history[normOld];
            delete state.history[normOld];
        }
    }

    state.players[i].name = newName;
    save(); render();
}

// ── Numeric fields ────────────────────────────────────────────
function onNumFocus(e) {
    setActiveRow(+e.target.dataset.row);
}

function onNumKeydown(e) {
    if (e.key === 'Enter') e.target.blur();
}

function onNumBlur(e) {
    const i = +e.target.dataset.row;
    const group = e.target.dataset.group; // recv | sent
    const field = e.target.dataset.field; // total | new_ | stars
    const val = parseInt(e.target.value, 10);
    state.players[i][group][field] = isNaN(val) ? 0 : Math.max(0, val);
    e.target.value = state.players[i][group][field] || '';
    save(); render();
}

function onNoteBlur(e) {
    const i = +e.target.dataset.row;
    state.players[i].note = e.target.value;
    save();
}

// ── Quick Panel ───────────────────────────────────────────────
function quickAdd(direction, stars) {
    if (state.activeRow === null) return;
    const p = state.players[state.activeRow];
    const group = direction === 'recv' ? p.recv : p.sent;
    const isNew = state.isNewCard;

    group.total = (group.total || 0) + 1;
    if (isNew) group.new_ = (group.new_ || 0) + 1;
    group.stars = (group.stars || 0) + stars;

    save(); render();

    // Keep focus on panel
    flashRow(state.activeRow);
}

function flashRow(i) {
    const rows = document.querySelectorAll('#tbody tr');
    if (rows[i]) {
        rows[i].classList.add('flash');
        setTimeout(() => rows[i].classList.remove('flash'), 300);
    }
}

// ── Delete row ────────────────────────────────────────────────
async function deleteRow(i) {
    const name = state.players[i].name || '(без имени)';
    const confirmed = await showConfirm(
        `Удалить игрока «${name}»?\n\nИстория за все сезоны сохранится.`,
        'Удалить', 'Отмена'
    );
    if (!confirmed) return;
    if (state.activeRow === i) state.activeRow = null;
    else if (state.activeRow > i) state.activeRow--;
    state.players.splice(i, 1);
    save(); render();
}

// ── Add row ───────────────────────────────────────────────────
function addRow() {
    state.players.push(newPlayer());
    save(); render();
    // Focus new name field
    setTimeout(() => {
        const inputs = document.querySelectorAll('.inp-name');
        if (inputs.length) inputs[inputs.length - 1].focus();
    }, 50);
}

// ── New Season ────────────────────────────────────────────────
async function newSeason() {
    const confirmed = await showConfirm(
        `Начать новый сезон?\n\nДанные текущего сезона «${state.currentSeason}» будут сохранены в историю, а счётчики обнулятся. Игроки останутся.`,
        'Начать новый сезон', 'Отмена'
    );
    if (!confirmed) return;

    // Archive current season for each player
    for (const p of state.players) {
        if (!p.name) continue;
        const key = norm(p.name);
        if (!state.history[key]) state.history[key] = [];
        state.history[key].push({
            season: state.currentSeason,
            recv: { ...p.recv },
            sent: { ...p.sent },
        });
        p.recv = genEmpty();
        p.sent = genEmpty();
        p.note = '';
    }

    // Increment season name
    const match = state.currentSeason.match(/^(.*?)(\d+)$/);
    if (match) {
        state.currentSeason = match[1] + (parseInt(match[2]) + 1);
    } else {
        state.currentSeason = state.currentSeason + ' 2';
    }

    state.activeRow = null;
    save(); render();
    document.getElementById('season-label').textContent = state.currentSeason;
}

// ── History Modal ─────────────────────────────────────────────
function showHistory(i) {
    const p = state.players[i];
    const name = p.name || '(без имени)';
    const key = norm(name);
    const { recv: tr, sent: ts, seasons } = historyTotals(key);

    // Current season contribution
    const cr = p.recv, cs = p.sent;
    const allRecv = { total: tr.total + cr.total, new_: tr.new_ + cr.new_, stars: tr.stars + cr.stars };
    const allSent = { total: ts.total + cs.total, new_: ts.new_ + cs.new_, stars: ts.stars + cs.stars };
    const allBal = allRecv.stars - allSent.stars;

    let seasonsHtml = '';
    if (seasons.length) {
        seasonsHtml = seasons.map(s => {
            const b = s.recv.stars - s.sent.stars;
            const bc = b > 0 ? 'pos' : b < 0 ? 'neg' : '';
            return `
        <div class="hist-season">
          <div class="hist-season-name">${esc(s.season)}</div>
          <div class="hist-grid">
            <span class="hist-label">Получено:</span>
            <span>${s.recv.total} карт / ${s.recv.new_} новых / ${s.recv.stars}★</span>
            <span class="hist-label">Отдано:</span>
            <span>${s.sent.total} карт / ${s.sent.new_} новых / ${s.sent.stars}★</span>
            <span class="hist-label">Баланс:</span>
            <span class="${bc}">${b > 0 ? '+' : ''}${b}★</span>
          </div>
        </div>`;
        }).join('');
    } else {
        seasonsHtml = '<div class="hist-empty">Прошлых сезонов нет</div>';
    }

    const currentBal = cr.stars - cs.stars;
    const currentBc = currentBal > 0 ? 'pos' : currentBal < 0 ? 'neg' : '';
    const allBc = allBal > 0 ? 'pos' : allBal < 0 ? 'neg' : '';

    document.getElementById('modal-title').textContent = name;
    document.getElementById('modal-body').innerHTML = `
    <div class="hist-section-title">Текущий сезон: ${esc(state.currentSeason)}</div>
    <div class="hist-grid">
      <span class="hist-label">Получено:</span>
      <span>${cr.total} карт / ${cr.new_} новых / ${cr.stars}★</span>
      <span class="hist-label">Отдано:</span>
      <span>${cs.total} карт / ${cs.new_} новых / ${cs.stars}★</span>
      <span class="hist-label">Баланс:</span>
      <span class="${currentBc}">${currentBal > 0 ? '+' : ''}${currentBal}★</span>
    </div>
    <div class="hist-divider"></div>
    <div class="hist-section-title">Прошлые сезоны</div>
    ${seasonsHtml}
    <div class="hist-divider"></div>
    <div class="hist-section-title">Итого за всё время</div>
    <div class="hist-grid">
      <span class="hist-label">Получено:</span>
      <span>${allRecv.total} карт / ${allRecv.new_} новых / ${allRecv.stars}★</span>
      <span class="hist-label">Отдано:</span>
      <span>${allSent.total} карт / ${allSent.new_} новых / ${allSent.stars}★</span>
      <span class="hist-label">Баланс:</span>
      <span class="${allBc}">${allBal > 0 ? '+' : ''}${allBal}★</span>
    </div>
  `;
    openModal('modal-history');
}

// ── Import / Export ───────────────────────────────────────────
function exportData() {
    return JSON.stringify({ version: 1, ...state }, null, 2);
}

function importData(json) {
    try {
        const data = JSON.parse(json);
        if (!data.players || !data.history) throw new Error('Неверный формат');
        state.currentSeason = data.currentSeason || 'Сезон 1';
        state.players = data.players;
        state.history = data.history;
        state.activeRow = null;
        save(); render();
        document.getElementById('season-label').textContent = state.currentSeason;
        return true;
    } catch (e) {
        alert('Ошибка импорта: ' + e.message);
        return false;
    }
}

function downloadFile() {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'card-tracker.json';
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

function triggerFileImport() {
    document.getElementById('file-input').click();
    closeMenu();
}

function onFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        if (importData(ev.target.result)) showToast('Данные загружены');
    };
    reader.readAsText(file);
    e.target.value = '';
}

async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        if (importData(text)) showToast('Данные загружены из буфера');
    } catch (e) {
        // Fallback: show textarea
        openModal('modal-paste');
    }
    closeMenu();
}

function importFromTextarea() {
    const text = document.getElementById('paste-area').value;
    if (importData(text)) {
        showToast('Данные загружены');
        closeModal('modal-paste');
    }
}

// ── Modal helpers ─────────────────────────────────────────────
function openModal(id) {
    document.getElementById(id).classList.add('open');
    document.getElementById('overlay').classList.add('open');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
    // Close overlay if no modals open
    if (!document.querySelector('.modal.open')) {
        document.getElementById('overlay').classList.remove('open');
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
    document.getElementById('overlay').classList.remove('open');
}

// ── Confirm dialog ────────────────────────────────────────────
function showConfirm(message, okText, cancelText) {
    return new Promise(resolve => {
        document.getElementById('confirm-msg').innerHTML = message.replace(/\n/g, '<br>');
        document.getElementById('confirm-ok').textContent = okText;
        document.getElementById('confirm-cancel').textContent = cancelText;
        openModal('modal-confirm');

        function onOk() { cleanup(); resolve(true); }
        function onCancel() { cleanup(); resolve(false); }
        function cleanup() {
            document.getElementById('confirm-ok').removeEventListener('click', onOk);
            document.getElementById('confirm-cancel').removeEventListener('click', onCancel);
            closeModal('modal-confirm');
        }

        document.getElementById('confirm-ok').addEventListener('click', onOk);
        document.getElementById('confirm-cancel').addEventListener('click', onCancel);
    });
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

// ── Menu ──────────────────────────────────────────────────────
function toggleMenu() {
    document.getElementById('menu-dropdown').classList.toggle('open');
}
function closeMenu() {
    document.getElementById('menu-dropdown').classList.remove('open');
}

// ── Season label edit ─────────────────────────────────────────
function editSeason() {
    const label = document.getElementById('season-label');
    const input = document.getElementById('season-input');
    label.style.display = 'none';
    input.style.display = 'inline-block';
    input.value = state.currentSeason;
    input.focus();
    input.select();
}

function onSeasonBlur() {
    const input = document.getElementById('season-input');
    const val = input.value.trim();
    if (val) state.currentSeason = val;
    document.getElementById('season-label').textContent = state.currentSeason;
    document.getElementById('season-label').style.display = '';
    input.style.display = 'none';
    save();
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    load();

    document.getElementById('season-label').textContent = state.currentSeason;

    // Add row button
    document.getElementById('btn-add-row').addEventListener('click', addRow);

    // New season
    document.getElementById('btn-new-season').addEventListener('click', () => {
        closeMenu(); newSeason();
    });

    // Menu
    document.getElementById('btn-menu').addEventListener('click', e => {
        e.stopPropagation(); toggleMenu();
    });
    document.addEventListener('click', e => {
        if (!e.target.closest('#menu-dropdown') && !e.target.closest('#btn-menu')) closeMenu();
    });

    // Menu items
    document.getElementById('menu-export-file').addEventListener('click', downloadFile);
    document.getElementById('menu-export-clip').addEventListener('click', copyToClipboard);
    document.getElementById('menu-import-file').addEventListener('click', triggerFileImport);
    document.getElementById('menu-import-clip').addEventListener('click', pasteFromClipboard);
    document.getElementById('file-input').addEventListener('change', onFileImport);

    // Paste modal
    document.getElementById('btn-paste-import').addEventListener('click', importFromTextarea);
    document.getElementById('btn-paste-cancel').addEventListener('click', () => closeModal('modal-paste'));

    // History modal close
    document.getElementById('btn-history-close').addEventListener('click', () => closeModal('modal-history'));

    // Overlay
    document.getElementById('overlay').addEventListener('click', closeAllModals);

    // Quick panel toggle
    document.getElementById('toggle-new').addEventListener('change', e => {
        state.isNewCard = e.target.checked;
    });

    // Star buttons
    document.querySelectorAll('.star-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const dir = btn.dataset.dir;
            const stars = +btn.dataset.stars;
            quickAdd(dir, stars);
        });
    });

    // Season label click to edit
    document.getElementById('season-label').addEventListener('click', editSeason);
    document.getElementById('season-input').addEventListener('blur', onSeasonBlur);
    document.getElementById('season-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') e.target.blur();
    });

    render();
});