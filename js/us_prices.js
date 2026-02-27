import {createElement} from "./hp_common.js";

let products = [];

function sortProducts() {
    products.sort((a, b) => a.value - b.value);
}

function getSearchValue() {
    const raw = document.getElementById('search-input').value.trim();
    const num = parseFloat(raw);
    return isNaN(num) ? null : num;
}

function updateBadge() {
    const el = document.getElementById('count-badge');
    if (el) el.textContent = products.length + ' items';
}

function buildRow(item) {
    const tr = createElement('tr', []);
    tr._item = item; // direct reference, no index needed

    const tdText = createElement('td', [], {}, item.text);
    const tdValue = createElement('td', ['td-value', 'text-end', 'fw-semibold', 'text-primary', 'font-monospace'], {}, '$' + item.value.toFixed(2));

    const tdBtn = createElement('td', ['text-center'], {});
    const delBtn = createElement('button', ['btn', 'btn-outline-danger', 'btn-sm', 'py-0'], {}, '✕');
    delBtn.addEventListener('click', () => deleteRow(tr));
    tdBtn.appendChild(delBtn);

    tr.append(tdText, tdValue, tdBtn);
    return tr;
}

function applyHighlight() {
    const threshold = getSearchValue();
    const rows = document.querySelectorAll('#products-tbody tr');
    rows.forEach(tr => {
        if (threshold !== null && tr._item.value > threshold) {
            tr.classList.add('highlight');
        } else {
            tr.classList.remove('highlight');
        }
    });
}

function rebuildTable() {
    const tbody = document.getElementById('products-tbody');
    tbody.innerHTML = '';
    products.forEach((item) => {
        tbody.appendChild(buildRow(item));
    });
    applyHighlight();
    updateBadge();
}

function deleteRow(tr) {
    const idx = products.indexOf(tr._item);
    if (idx !== -1) products.splice(idx, 1);
    tr.remove();
    updateBadge();
}

function addRow() {
    const text = document.getElementById('new-text').value.trim();
    const value = parseFloat(document.getElementById('new-value').value);
    if (!text || isNaN(value)) {
        alert('Введите название и цену товара.');
        return;
    }
    const newItem = { text, value };
    // insert in sorted order
    let insertPos = products.findIndex(p => p.value > value);
    if (insertPos === -1) insertPos = products.length;
    products.splice(insertPos, 0, newItem);

    // rebuild table to keep indices consistent
    rebuildTable();

    document.getElementById('new-text').value = '';
    document.getElementById('new-value').value = '';
}

async function init() {
    const response = await fetch('json/us_products_1000.json');
    products = await response.json();
    sortProducts();
    rebuildTable();

    document.getElementById('search-input').addEventListener('input', applyHighlight);
    document.getElementById('add-btn').addEventListener('click', addRow);
    updateBadge();
}

init();