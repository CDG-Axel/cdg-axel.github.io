const USE_STATIC_CONTENT = false;

import { loadFromStorage, saveToStorage, createElement, addElement } from "./hp_common.js";

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
    const now = new Date('2026-01-21'); // на время тестирования
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
    const sources = config.incomes.map(source => {
        const row = createElement('tr', ['timeline-row']);
        const nameCell = createElement('td');
        const period = `C ${source.start_date.toLocaleDateString(lang)} ` +
            (source.end_date? `по ${source.end_date.toLocaleDateString(lang)}`: '(бессрочно)');
        nameCell.append(
            document.createTextNode(source.name),
            createElement('br'),
            createElement('span', ['source-desc'], {}, period)
        );
        row.append(nameCell, createElement('td', [], {}, intl.format(source.sum)));
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

function updateConfig(confStr) {
    config = JSON.parse(confStr, dateReviver);
    saveConfig();
    generatePage();
}

function resetCfg() {
    fetch('json/investment_def.json').then(res => res.text()).then(updateConfig);
}

function init() {
    if (USE_STATIC_CONTENT) {
        document.querySelectorAll('.test-static').forEach(el => el.classList.remove('d-none'));
        return;
    }
    const confStr = loadFromStorage(lsPrefix + 'config');
    if (confStr && false) updateConfig(confStr); // на время тестирования игнорируем storage
    else resetCfg();
}

init();