import {loadFromStorage, saveToStorage, createElement, addElement, addHandlers} from "./hp_common.js";

const lang = 'ru-RU'; // страница на русском языке, пусть даты и числа тоже будут с русской локалью
const lsPrefix = 'hp_inv_';
const msPerDay = 24 * 60 * 60 * 1000;
const isInvestment = type => type === 'investment';
const WARNING_DAYS = 30; // порог "скоро заканчивается"

const intl = new Intl.NumberFormat(lang, {minimumFractionDigits: 0, maximumFractionDigits: 1});

/**
 * @typedef {{ name: string, sum: number, income?: number,
 *             type: 'monthly'|'investment',
 *             start_date: Date, end_date?: Date }} IncomeSource
 * @type {{ incomes: IncomeSource[], updatedAt: number }}
 */
let config = resetCfg(); // демо; в storage не пишется, пока пользователь ничего не изменит

let lastDeleted = null; // Последний удалённый источник для функции "Вернуть"
let editingIndex = -1;  // индекс в config.incomes, -1 для добавления
let renderedDay = null; // дата (todayUTC), для которой отрисована страница: со сменой даты она устаревает

const dateFields = new Set(['start_date', 'end_date']);

function dateReviver(key, value) {
    if (dateFields.has(key) && typeof value === 'string') {
        const date = new Date(value);
        if (isNaN(date.getTime())) throw new Error('Некорректная дата'); // битые данные не должны проходить молча
        return date;
    }
    return value;
}

// Парсит JSON и проверяет только то, без чего расчёты и отрисовка упадут. Любая проблема — исключение
function parseAndValidateJson(text) {
    const data = JSON.parse(text, dateReviver);
    for (const s of data.incomes) {
        // dateReviver превращает в Date только строки, поэтому тип проверяем явно
        const bad = typeof s.sum !== 'number'
            || !(s.start_date instanceof Date)
            || (s.end_date !== undefined && !(s.end_date instanceof Date))
            || (isInvestment(s.type) && (typeof s.income !== 'number' || !s.end_date));
        if (bad) throw new Error('Некорректный источник');
    }
    return data;
}

function dateReplacer(key, value) {
    return dateFields.has(key) ? value.split('T')[0] : value;
}

// Сегодня по местному календарю в том же представлении, что и даты источников (полночь UTC)
function todayUTC() {
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

// Дата со сдвигом на monthOffset месяцев и числом day (day = 0 — последний день предыдущего месяца)
function dateUTC(date, monthOffset, day) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + monthOffset, day));
}

function activityColor(source, now) {
    if (source.start_date > now) return 'gray';
    if (!source.end_date) return '';
    if (source.end_date <= now) return 'red'; // последний день — уже красный: пора действовать
    if (source.end_date - now < WARNING_DAYS * msPerDay) return 'yellow';
    return '';
}

function calcMonthData(source, monthStart, now) {
    const monthEnd = dateUTC(monthStart, 1, 0);
    const daysInMonth = monthEnd.getUTCDate();
    let income, activeDays = 0;
    let style;

    // Банки не начисляют процент за день открытия — realStart сдвигает точку отсчёта на +1 день
    const realStart = isInvestment(source.type)
        ? new Date(source.start_date.getTime() + msPerDay)
        : source.start_date;

    if (realStart <= monthEnd && (!source.end_date || source.end_date >= monthStart)) {
        const activeStart = realStart > monthStart ? realStart : monthStart;
        const activeEnd = (!source.end_date || source.end_date > monthEnd) ? monthEnd : source.end_date;
        activeDays = Math.floor((activeEnd - activeStart) / msPerDay) + 1;

        // Начало и длина бара в процентах ячейки; минимальную ширину в пикселях
        // и расширение у границ месяца считает CSS (.income-bar)
        const barSt = (activeStart.getUTCDate() - 1) / daysInMonth * 100;
        const barW = activeEnd.getUTCDate() / daysInMonth * 100 - barSt;
        if (barW < 100) {
            style = `--st: ${+barSt.toFixed(3)}; --w: ${+barW.toFixed(3)}`;
        }
    }

    if (isInvestment(source.type)) {
        const totalDays = Math.floor((source.end_date - realStart) / msPerDay) + 1;
        // totalDays <= 0 — вырожденная инвестиция (окончание = началу): дней начисления нет, дохода нет
        income = totalDays > 0 ? source.income * activeDays / totalDays / 1000 : 0;
    } else {
        income = source.sum * (activeDays / daysInMonth) / 1000;
    }

    const column = createElement('td');
    if (activeDays > 0) {
        const color = activityColor(source, now);
        const attrs = style ? {style} : {};
        column.appendChild(createElement('div', ['income-bar', color], attrs, intl.format(income)));
    }

    return {income, column};
}

function pluralDays(n) {
    const l2 = n % 100;
    if (l2 >= 11 && l2 <= 14) return 'дней';
    const ld = n % 10;
    return ld === 1 ? 'день' : ld >= 2 && ld <= 4 ? 'дня' : 'дней';
}

function createSource(source, idx) {
    // Класс timeline-row.monthly для визуального выделения ежемесячных источников
    const row = createElement('tr', ['timeline-row', isInvestment(source.type) ? '' : 'monthly']);
    const nameCell = createElement('td');
    const from = source.start_date.toLocaleDateString(lang, {timeZone: 'UTC'});
    const add  = isInvestment(source.type) ? 0 : 1; // для инвестиций первый день не считается
    const days = source.end_date ? Math.round(add + (source.end_date - source.start_date) / msPerDay) : 0;
    const end  = source.end_date
        ? `по ${source.end_date.toLocaleDateString(lang, {timeZone: 'UTC'})}, ${days} ${pluralDays(days)}`
        : '(бессрочно)';
    const period = `С ${from} ${end}`;

    const wrapper = createElement('div', ['source-cell']);
    const textBlock = createElement('div');
    textBlock.append(
        document.createTextNode(source.name),
        createElement('br'),
        createElement('span', ['source-desc'], {}, period)
    );
    const editBtn = createElement('button', ['edit-btn'], {title: 'Редактировать / удалить', 'aria-label': `Редактировать источник ${source.name}`, 'data-idx': idx}, '✎');
    editBtn.addEventListener('click', () => openModal(idx));

    wrapper.append(textBlock, editBtn);
    nameCell.appendChild(wrapper);

    const sumCell = createElement('td');
    sumCell.appendChild(document.createTextNode(intl.format(source.sum)));
    if (source.income) {
        sumCell.append(
            createElement('br'),
            createElement('span', ['source-desc'], {}, '+ ' + intl.format(source.income))
        );
    }
    row.append(nameCell, sumCell);
    return row;
}

function generatePage() {
    const now = todayUTC();
    renderedDay = now;
    const attrScope = {scope: 'col'};

    const months = createElement('tr', ['timeline-month']);
    months.append(
        createElement('th', [], attrScope, 'Источник'),
        createElement('th', [], attrScope, 'Сумма')
    );

    const years = createElement('tr', ['timeline-year']);
    years.appendChild(createElement('td', [], {colspan: 2}));

    // Строка разбита на две ячейки: метка + суммы по investment-источникам.
    //     Monthly-источники не суммируются — у них нет вложенной суммы и дохода.
    const investSources = config.incomes.filter(s => isInvestment(s.type));
    const totalInvestSum    = investSources.reduce((acc, s) => acc + s.sum, 0);
    const totalInvestIncome = investSources.reduce((acc, s) => acc + (s.income ?? 0), 0);

    const investCell = createElement('td');
    investCell.appendChild(document.createTextNode(intl.format(totalInvestSum)));
    if (totalInvestIncome > 0) {
        investCell.append(
            createElement('br'),
            createElement('span', ['source-desc'], {}, '+ ' + intl.format(totalInvestIncome))
        );
    }

    const sums = createElement('tr', ['monthly-sum']);
    sums.append(createElement('td', [], {}, 'Итого'), investCell);

    const monthsPerYear = {};
    const sources = config.incomes.map(createSource);

    for (let i = -1; i <= 5; i++) {
        const monthStart = dateUTC(now, i, 1);
        const year = monthStart.getUTCFullYear();
        monthsPerYear[year] = (monthsPerYear[year] || 0) + 1;

        const monthLabel = monthStart.toLocaleDateString(lang, {month: 'short', timeZone: 'UTC'});
        months.appendChild(createElement('th', [], attrScope,
            monthLabel.at(0).toUpperCase() + monthLabel.slice(1, 3)));

        let monthlyTotal = 0;
        config.incomes.forEach((source, idx) => {
            const {income, column} = calcMonthData(source, monthStart, now);
            monthlyTotal += income;
            sources[idx].appendChild(column);
        });

        addElement(sums, 'td', intl.format(monthlyTotal));
        if (i === 0) document.getElementById('pIncomeCur').textContent = intl.format(monthlyTotal);
        if (i === 3) document.getElementById('pIncome3m').textContent  = intl.format(monthlyTotal);
    }

    for (const [year, colspan] of Object.entries(monthsPerYear)) {
        years.appendChild(createElement('td', [], {colspan}, year));
    }

    document.getElementById('tlHeader').replaceChildren(months, years, sums);
    document.getElementById('tlBody').replaceChildren(...sources);

    const troubles = document.getElementById('pTroubles');
    const troubledSources = config.incomes.filter(s =>
        s.end_date && s.end_date - now < WARNING_DAYS * msPerDay
    );
    troubles.replaceChildren(
        ...troubledSources.flatMap(s => [createElement('br'), document.createTextNode(s.name)])
    );
}

function sortIncomes() {
    config.incomes.sort((a, b) => {
        if (!a.end_date && !b.end_date) return 0;
        if (!a.end_date) return 1;
        if (!b.end_date) return -1;
        return a.end_date - b.end_date;
    });
}

// updateDate = false — перерисовка без сохранения: загруженное из storage и демо-данные в storage не пишутся,
// пока пользователь что-то не изменит (демо при этом всегда остаётся с актуальными датами)
function onConfigUpdate(updateDate = true) {
    sortIncomes();
    if (updateDate) {
        config.updatedAt = Date.now();
        if (!saveToStorage(lsPrefix + 'config', JSON.stringify(config, dateReplacer))) {
            showToast('Не удалось сохранить данные в браузере', true);
        }
    }
    generatePage();
}

// Подменяет config версией из storage, если она новее. Возвращает true, если config заменён
function loadConfigFromStorage() {
    const confStr = loadFromStorage(lsPrefix + 'config');
    if (!confStr) return false;
    let changed = false;
    try {
        const incoming = parseAndValidateJson(confStr);
        incoming.updatedAt ??= 1; // старый конфиг без даты: новее демо (0), старее любой реальной правки
        if (incoming.updatedAt > config.updatedAt) {
            config = incoming;
            setLastDeleted(); // удалённый источник относился к прежнему набору
            changed = true;
        }
    } catch {
        showToast('Не удалось прочитать сохранённые данные', true);
    }
    return changed;
}

// Возвращает демо-набор для первого запуска. Даты считаются от сегодняшнего дня,
// чтобы примеры (все цвета, разные типы, неполные месяцы) были актуальны в любой момент
function resetCfg() {
    const today = todayUTC();
    const dateShift = (date, days) => new Date(date.getTime() + days * msPerDay);

    const salary     = {name: 'Зарплата',                    type: 'monthly',    sum: 90000};
    const rent       = {name: 'Аренда квартиры',             type: 'monthly',    sum: 30000};
    const deposit    = {name: 'Депозит (Альфа-банк, 13.5%)', type: 'investment', sum: 600000, income: 27000};
    const stocks     = {name: 'Акции (Walmart)',             type: 'investment', sum: 70000,  income: 12000};
    const newDeposit = {name: 'Новый депозит (ВТБ)',         type: 'investment', sum: 200000, income: 8000};

    salary.start_date = dateShift(today, -730);              // бессрочный, давно начался
    rent.start_date = dateShift(today, -45);                 // начался в середине месяца
    rent.end_date = dateShift(today, 20);                    // скоро закончится (жёлтый)
    deposit.start_date = dateShift(today, -20);              // активный
    deposit.end_date = dateShift(today, 110);
    stocks.start_date = dateShift(today, -200);              // начался раньше видимых месяцев
    stocks.end_date = dateShift(today, -5);                  // уже закончился (красный)
    newDeposit.start_date = dateShift(today, 10);            // ещё не начался (серый)
    newDeposit.end_date = dateShift(today, 100);

    // updatedAt = 0: любой реальный конфиг (из storage) новее демо
    return {updatedAt: 0, incomes: [salary, rent, deposit, stocks, newDeposit]};
}

/* ---- меню ---- */

function exportConfig() {
    const json = JSON.stringify(config, dateReplacer, 2);
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(new Blob([json], {type: 'application/json'}));
    anchor.download = 'investment_config.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 0);
}

function applyImportedConfig(text) {
    try {
        config = parseAndValidateJson(text); // при ошибке парсинга или проверки текущий config не изменится
        setLastDeleted(); // удалённый источник относился к прежнему набору
        onConfigUpdate(true);
        showToast('Настройки импортированы');
    } catch {
        showToast('Не удалось прочитать настройки', true);
    }
}

function importConfig(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = ''; // сброс, чтобы повторный импорт того же файла снова вызвал change
    file.text().then(applyImportedConfig)
        .catch(() => showToast('Не удалось прочитать файл', true));
}

function exportClipboard() {
    const json = JSON.stringify(config, dateReplacer); // без форматирования — для передачи в мессенджере
    navigator.clipboard.writeText(json).then(() => showToast('Настройки скопированы в буфер обмена'))
        .catch(() => showToast('Не удалось скопировать в буфер обмена', true));
}

function importClipboard() {
    navigator.clipboard.readText().then(applyImportedConfig)
        .catch(() => showToast('Не удалось прочитать буфер обмена', true));
}

const btnRestore   = document.getElementById('btnRestore');
const menuDropdown = document.getElementById('menuDropdown');

// Запоминает удалённый источник для кнопки "Вернуть"; без аргумента — сбрасывает
function setLastDeleted(source = null) {
    lastDeleted = source;
    btnRestore.disabled = !source;
}

/* ---- модальная форма ---- */

const sForm = {
    dialog:      document.getElementById('sourceModal'),
    form:        document.getElementById('sourceForm'),
    title:       document.getElementById('sourceModalTitle'),
    name:        document.getElementById('fName'),
    type:        document.getElementById('fType'),
    sum:         document.getElementById('fSum'),
    income:      document.getElementById('fIncome'),
    start:       document.getElementById('edStart'),
    end:         document.getElementById('edEnd'),
    incomeGroup: document.getElementById('fIncomeGroup'),
    sumLabel:    document.getElementById('fSumLabel'),
    endLabel:    document.getElementById('edEndLabel'),
    endFeedback: document.getElementById('edEndFeedback'),
    bDelete:     document.getElementById('btnDelete')
};

function toInputDate(date) {
    return date ? date.toISOString().split('T')[0] : '';
}

function updateFieldsByType() {
    const inv = isInvestment(sForm.type.value);
    sForm.incomeGroup.style.display = inv ? '' : 'none';
    sForm.income.required           = inv;
    sForm.end.required              = inv;
    sForm.sumLabel.textContent      = inv ? 'Вложенная сумма, руб.' : 'Сумма в месяц, руб.';
    sForm.endLabel.textContent      = inv ? 'Дата окончания *' : 'Дата окончания';
}

function validateDates() {
    sForm.endFeedback.textContent = sForm.end.value
        ? 'Дата окончания раньше даты начала'
        : 'Укажите дату окончания';
    const notValid = sForm.end.value && sForm.start.value && sForm.end.value < sForm.start.value;
    sForm.end.setCustomValidity(notValid ? sForm.endFeedback.textContent : '');
}

function openModal(idx = -1) {
    editingIndex = idx;
    keyboardOpened = document.activeElement.matches(':focus-visible');
    sForm.form.classList.remove('was-validated');
    sForm.end.setCustomValidity('');

    if (idx === -1) {
        sForm.form.reset();
        sForm.title.textContent     = 'Новый источник дохода';
        sForm.bDelete.style.display = 'none';
    } else {
        const s = config.incomes[idx];
        sForm.name.value   = s.name;
        sForm.type.value   = s.type;
        sForm.sum.value    = s.sum;
        sForm.income.value = s.income ?? '';
        sForm.start.value  = toInputDate(s.start_date);
        sForm.end.value    = toInputDate(s.end_date);
        sForm.title.textContent = 'Редактирование источника';
        sForm.bDelete.style.display = '';
    }
    updateFieldsByType();
    sForm.dialog.showModal();
    if (keyboardOpened) sForm.name.focus();
}

function saveSource(e) {
    e.preventDefault();
    validateDates();
    sForm.form.classList.add('was-validated');
    if (!sForm.form.checkValidity()) return;

    const source = {
        name:       sForm.name.value.trim(),
        type:       sForm.type.value,
        sum:        Number(sForm.sum.value),
        start_date: new Date(sForm.start.value),
        ...(isInvestment(sForm.type.value) && {income: Number(sForm.income.value)}),
        ...(sForm.end.value    && {end_date: new Date(sForm.end.value)})
    };

    if (editingIndex === -1) config.incomes.push(source);
    else config.incomes[editingIndex] = source;

    onConfigUpdate();
    sForm.dialog.close();
    if (keyboardOpened) {
        const idx = config.incomes.indexOf(source);
        document.querySelector(`.edit-btn[data-idx="${idx}"]`)?.focus();
    }
}

function deleteSource() {
    setLastDeleted(config.incomes.splice(editingIndex, 1)[0]);
    onConfigUpdate();
    sForm.dialog.close();
}

function restoreSource() {
    if (!lastDeleted) return;
    config.incomes.push(lastDeleted);
    setLastDeleted();
    onConfigUpdate();
}

function showToast(message, isError = false) {
    const el = document.getElementById('appToast');
    el.textContent = message;
    el.classList.toggle('toast--error', isError);
    el.classList.remove('toast--visible');
    void el.offsetWidth; // reflow для перезапуска анимации
    el.classList.add('toast--visible');
}

/* ---- работа с клавиатурой ---- */

let keyboardOpened = false; // диалог открыт с клавиатуры
let menuKeyboard = false;   // меню управляется с клавиатуры

function closeMenu() {
    menuDropdown.open = false;
    if (menuKeyboard) menuDropdown.querySelector('summary').focus();
}

function onDialogClose() {
    if (!keyboardOpened) document.activeElement?.blur();
}

function onMenuClick(e) {
    menuKeyboard = e.detail === 0; // у click от Enter/Space detail равен 0
    if (e.target.closest('button')) closeMenu();
}

function onKeyDown(e) {
    if (menuDropdown.open) {
        if (e.key === 'Escape') {
            closeMenu();
            if (!menuKeyboard) document.activeElement.blur(); // мышь + ESC: иначе браузер покажет обводку
        } else menuKeyboard = true;
    }
}

/* ---- синхронизация вкладок ---- */

function onVisibilityChange() {
    if (document.visibilityState !== 'visible') return;
    if (loadConfigFromStorage()) {
        onConfigUpdate(false);
        if (sForm.dialog.open) {
            sForm.dialog.close();
            showToast('Данные обновлены из другой вкладки');
        }
    } else if (todayUTC() > renderedDay) {
        generatePage(); // данные те же, но сменились сутки: пересчитать месяцы и цвета
    }
}

/* ---- инициализация ---- */

function init() {
    addHandlers({
        'click-add':     () => openModal(),
        'submit-save':   saveSource,
        'click-delete':  deleteSource,
        'click-restore': restoreSource,
        'change-type':   updateFieldsByType,
        'change-dates':  validateDates,
        'close-modal':   onDialogClose,
        'click-export':  exportConfig,
        'click-import':  () => document.getElementById('importInput').click(),
        'click-modal-close': () => sForm.dialog.close(),
        'animationend-toast': e => e.currentTarget.classList.remove('toast--visible'),
        'click-dropdown': onMenuClick,
        'change-import':  importConfig,
        'click-exp-clip': exportClipboard,
        'click-imp-clip': importClipboard
    });
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('click', e => {
        if (!menuDropdown.contains(e.target)) menuDropdown.open = false;
    });
    document.addEventListener('keydown', onKeyDown);
    loadConfigFromStorage();
    onConfigUpdate(false); // отрисовка нужна и для демо, когда в storage пусто
}

init();
