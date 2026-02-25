const USE_STATIC_CONTENT = false;

import {loadFromStorage, saveToStorage, createElement, addElement, addHandlers} from "./hp_common.js";

const lang = 'ru-RU'; // на время тестирования вместо navigator.language;
const lsPrefix = 'hp_inv_';
const msPerDay = 24 * 60 * 60 * 1000;
const WARNING_DAYS = 30; // порог "скоро заканчивается"

const intl = new Intl.NumberFormat(lang,{minimumFractionDigits: 0, maximumFractionDigits: 1});

/**
 * @typedef {{ name: string, sum: number, income?: number,
 *             type: 'monthly'|'investment',
 *             start_date: Date, end_date?: Date }} IncomeSource
 * @type {{ incomes: IncomeSource[] }}
 */
let config = { incomes: []};

let lastDeleted = null; // Последний удалённый источник для функции "Вернуть"
let editingIndex = -1; // индекс в config.incomes, -1 для добавления

const dateFields = new Set(['start_date', 'end_date']);

function dateReviver(key, value) {
    if (dateFields.has(key) && typeof value === 'string') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? undefined : date; // защита от битых дат
    }
    return value;
}

function dateReplacer(key, value) {
    return dateFields.has(key) ? value.split('T')[0] : value;
}

function saveConfig() {
    saveToStorage(lsPrefix + 'config', JSON.stringify(config, dateReplacer));
}

function calcMonthData(source, monthStart, now) {
    const monthEnd = new Date(monthStart.getFullYear(), 1 + monthStart.getMonth(), 0);
    const daysInMonth = monthEnd.getDate();
    let income, activeDays = 0;
    let style;

    if (source.start_date < monthEnd && (!source.end_date || source.end_date > monthStart)) {
        const activeStart = source.start_date > monthStart ? source.start_date : monthStart;
        const activeEnd = !source.end_date || source.end_date > monthEnd ? monthEnd : source.end_date;
        activeDays = Math.floor((activeEnd - activeStart) / (1000 * 60 * 60 * 24)) + 1;

        // Ограничения 70/30 гарантируют минимальную видимую ширину бара при коротких периодах
        let barSt = Math.min(70, Math.round((activeStart.getDate() - 1) / daysInMonth * 100));
        let barEd = Math.max(30, Math.round(activeEnd.getDate() / daysInMonth * 100));
        if (barEd - barSt < 100) {
            style = (barSt ? `left: ${barSt}%; `: '') + `width: ${barEd - barSt}%`;
        }
    }

    if (source.type === 'monthly') {
        income = source.sum * (activeDays / daysInMonth) / 1000;
    } else {
        const totalDays = Math.floor(1 + (source.end_date - source.start_date) / msPerDay);
        income = source.income * activeDays / totalDays / 1000;
    }

    const column = createElement('td');
    if (activeDays > 0) {
        let color = '';
        if (source.start_date > now) {
            color = 'gray';
        } else if (source.end_date) {
            if (source.end_date < now) color = 'red';
            else if (source.end_date - now < WARNING_DAYS * msPerDay) color = 'yellow';
        }
        const attrs = style? {style} : {};
        column.appendChild(createElement('div', ['income-bar', color], attrs, intl.format(income)));
    }

    return {income, column};
}

function generatePage() {
    const now = new Date();
    const attrScope = {scope: "col"};

    const months = createElement('tr', ['timeline-month']);
    months.append(
        createElement('th', [], attrScope, 'Источник'),
        createElement('th', [], attrScope, 'Сумма')
    );

    const years = createElement('tr', ['timeline-year']);
    years.appendChild(createElement('th', [], {"colspan": 2}));

    const sums = createElement('tr', ['monthly-sum']);
    sums.appendChild(createElement('th', [], {"colspan": 2}, 'Сумма по месяцам'));

    const monthsPerYear = {};
    const sources = config.incomes.map((source, idx) => {
        const row = createElement('tr', ['timeline-row']);
        const nameCell = createElement('td');
        const period = `C ${source.start_date.toLocaleDateString(lang)} ` +
            (source.end_date? `по ${source.end_date.toLocaleDateString(lang)}`: '(бессрочно)');

        const wrapper = createElement('div', ['d-flex', 'justify-content-between', 'align-items-center']);
        const textBlock = createElement('div');
        textBlock.append(
            document.createTextNode(source.name),
            createElement('br'),
            createElement('span', ['source-desc'], {}, period)
        );
        const editBtn = createElement('button', ['btn', 'flex-shrink-0', 'px-1'], {title: 'Редактировать / удалить  '}, '✎');
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
    });

    for (let i = -1; i <= 5; i++) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const year = monthStart.getFullYear();
        monthsPerYear[year] = (monthsPerYear[year] || 0) + 1;

        const monthLabel = monthStart.toLocaleDateString(lang, {month: 'short'});
        months.appendChild(createElement('th', [], attrScope,
            monthLabel.at(0).toUpperCase() + monthLabel.slice(1, 3)));

        let monthlyTotal = 0;
        config.incomes.forEach((source, idx) => {
            const { income, column } = calcMonthData(source, monthStart, now);
            monthlyTotal += income;
            sources[idx].appendChild(column);
        });

        addElement(sums, 'td', intl.format(monthlyTotal));
        if (i === 0) document.getElementById('pIncomeCur').textContent = intl.format(monthlyTotal);
        if (i === 3) document.getElementById('pIncome3m').textContent = intl.format(monthlyTotal);
    }

    for (const [year, colspan] of Object.entries(monthsPerYear)) {
        years.appendChild(createElement('td', [], {colspan}, year));
    }

    document.getElementById('tlHeader').replaceChildren(months, years, sums);
    document.getElementById('tlBody').replaceChildren(...sources);

    const troubles = document.getElementById('pTroubles');
    const troubledSources = config.incomes.filter(s =>
        s.end_date && (s.end_date < now || s.end_date - now < WARNING_DAYS * msPerDay)
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

function onConfigUpdate() {
    sortIncomes();
    saveConfig();
    generatePage();
}

function updateConfig(confStr) {
    config = JSON.parse(confStr, dateReviver);
    onConfigUpdate();
}

function resetCfg() {
    fetch('json/investment_def.json').then(res => res.text()).then(updateConfig);
}

/* ---- меню ---- */

function exportConfig() {
    const json = JSON.stringify(config, dateReplacer, 2);
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    anchor.download = 'investment_config.json';
    anchor.click();
    URL.revokeObjectURL(anchor.href);
}

function importConfig() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', () => input.files[0].text().then(updateConfig));
    input.click();
}

/* ---- модальная форма ---- */

const sForm = {
    modal: new bootstrap.Modal(document.getElementById('sourceModal')),
    form: document.getElementById('sourceForm'),
    title: document.getElementById('sourceModalTitle'),

    name: document.getElementById('fName'),
    type: document.getElementById('fType'),
    sum: document.getElementById('fSum'),
    income: document.getElementById('fIncome'),
    start: document.getElementById('fStart'),
    end: document.getElementById('fEnd'),
    incomeGroup: document.getElementById('fIncomeGroup'),
    sumLabel: document.getElementById('fSumLabel'),
    endLabel: document.getElementById('fEndLabel'),
    endFeedback: document.getElementById('fEndFeedback'),
    bDelete: document.getElementById('btnDelete')
};

function toInputDate(date) {
    return date ? date.toISOString().split('T')[0] : '';
}

function updateFieldsByType() {
    const isInvestment = sForm.type.value === 'investment';
    sForm.incomeGroup.style.display  = isInvestment ? '' : 'none';
    sForm.income.required            = isInvestment;
    sForm.end.required               = isInvestment;
    sForm.sumLabel.textContent       = isInvestment ? 'Вложенная сумма, руб.' : 'Сумма в месяц, руб.';
    sForm.endLabel.textContent       = isInvestment ? 'Дата окончания *' : 'Дата окончания';
    sForm.endFeedback.textContent    = isInvestment ? 'Укажите дату окончания' : 'Дата окончания раньше даты начала';
}

function validateDates() {
    if (sForm.end.value && sForm.start.value && sForm.end.value <= sForm.start.value) {
        sForm.end.setCustomValidity('Дата окончания должна быть позже даты начала');
    } else {
        sForm.end.setCustomValidity('');
    }
}

function openModal(idx = -1) {
    editingIndex = idx;
    sForm.form.classList.remove('was-validated');
    sForm.end.setCustomValidity('');

    if (idx === -1) {
        sForm.form.reset();
        sForm.title.textContent = 'Новый источник дохода';
        sForm.bDelete.style.display = 'none';
    } else {
        const s = config.incomes[idx];
        sForm.name.value = s.name;
        sForm.type.value = s.type;
        sForm.sum.value = s.sum;
        sForm.income.value = s.income ?? '';
        sForm.start.value = toInputDate(s.start_date);
        sForm.end.value = toInputDate(s.end_date);
        sForm.title.textContent = 'Редактирование источника';
        sForm.bDelete.style.display = '';
    }
    updateFieldsByType();
    sForm.modal.show();
}

function saveSource() {
    validateDates();
    sForm.form.classList.add('was-validated');
    if (!sForm.form.checkValidity()) return;

    const source = {
        name: sForm.name.value.trim(),
        type: sForm.type.value,
        sum: Number(sForm.sum.value),
        start_date: new Date(sForm.start.value),
        ...(sForm.income.value && { income: Number(sForm.income.value) }),
        ...(sForm.end.value && { end_date: new Date(sForm.end.value) })
    };

    if (editingIndex === -1) {
        config.incomes.push(source);
    } else {
        config.incomes[editingIndex] = source;
    }

    onConfigUpdate();
    sForm.modal.hide();
}

function deleteSource() {
    lastDeleted = config.incomes.splice(editingIndex, 1)[0];
    document.getElementById('btnRestore').disabled = false;
    onConfigUpdate();
    sForm.modal.hide();
}

function restoreSource() {
    if (!lastDeleted) return;
    config.incomes.push(lastDeleted);
    lastDeleted = null;
    document.getElementById('btnRestore').disabled = true;
    onConfigUpdate();
}

/* ---- конец кода для модальной формы ---- */

function init() {
    if (USE_STATIC_CONTENT) {
        document.querySelectorAll('.test-static').forEach(el => el.classList.remove('d-none'));
        return;
    }
    addHandlers({
        'click-add': () => openModal(),
        'click-restore': restoreSource,
        'change-type': updateFieldsByType,
        'change-dates': validateDates,
        'click-save': saveSource,
        'click-delete': deleteSource,
        'click-export': exportConfig,
        'click-import': importConfig
    });
    const confStr = loadFromStorage(lsPrefix + 'config');
    if (confStr) updateConfig(confStr);
    else resetCfg();
}

init();