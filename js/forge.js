import { setStatus, addHandlers, loadFromStorage, saveToStorage, createElement, createTooltip,
    addColumn, formatNumber, snakeToFlu, shortThousands, setShortThousands } from './hp_common.js';
import { bazaarDownload, bazaarUpdate } from './bazaar.mjs'

let config = { pages: [], recipes: {} };
let prices = { last_updated: 0, products: {} };
let currentInterval;
let selectedMenu;
let tooltipList = [];

const lsPrefix = 'hp_frg_';
const collapse_time = 80;
const collapseState = { itemsCount: 0 };

function findPage(menuName = selectedMenu) {
    for (let page of config.pages) {
        if (page.name === menuName) return page;     
    }
}

function findElement(searchElement, page) {
    for (let element of page.elements) {
        if (searchElement.id === element.id) return element;
    }
}

function calcRecipe(recipeId) {
    const recipe = config.recipes[recipeId];
    if (recipe.craft_price !== undefined) return;
    recipe.craft_price = recipe['craft_coins'] ?? 0;
    recipe.result_craft_time = recipe['craft_time'];
    if (recipe.result_craft_time !== undefined) recipe.result_craft_time *= (config['time_multiplier'] ?? 1) / 3600;
    recipe.buy_price = prices.products[recipeId]?.buy_price;
    recipe.sell_price = prices.products[recipeId]?.sell_price;
    for (const component of recipe['components']) {
        component.buy_price = prices.products[component.id]?.buy_price;
        component.sell_price = prices.products[component.id]?.sell_price ?? component['ah_price'];
        const source = component.source ?? 'sell';
        const compRecipe = config.recipes[component.id];
        if (compRecipe !== undefined) {
            if (compRecipe.craft_price === undefined) calcRecipe(component.id);
            component.craft_price = compRecipe.craft_price;
            component.result_craft_time = (source === 'craft' && compRecipe.result_craft_time !== undefined) ? compRecipe.result_craft_time * component.count : undefined;
        }
        component.result_price = (component[source + '_price'] ?? 0) * component.count;

        recipe.craft_price += component.result_price;
        if (recipe.result_craft_time !== undefined) recipe.result_craft_time += component.result_craft_time ?? 0;
    }
    recipe.craft_price /= (recipe.count ?? 1);
    for (const component of recipe['components'])
        component.percent = recipe.craft_price === 0 ? undefined : 100 * component.result_price / recipe.craft_price / (recipe.count ?? 1);
}

function updateCraft() {
    Object.values(config.recipes).forEach(elem => elem.craft_price = undefined);
    Object.keys(config.recipes).forEach(recipeId => calcRecipe(recipeId));
}

function getColoredDifference(greater, lower) {
    const success = greater > lower;
    return `<span class="${success? 'text-success': 'text-danger'}">${success? '+': ''}${formatNumber(greater-lower)}</span>`;
}

function getTooltip(recipe) {
    const profit = recipe.result_craft_time !== undefined? 
        formatNumber((recipe.buy_price - recipe.craft_price)/recipe.result_craft_time): 'only applied to forge';
    return `<b>Profit</b><br/>Sell order: ${getColoredDifference(recipe.buy_price, recipe.craft_price)}<br/>
    Instasell: ${getColoredDifference(recipe.sell_price, recipe.craft_price)}<br/>Per hour: ${profit}`;
}

function drawElem(elem, attrName) {
    const recipe = config.recipes[elem.getAttribute(attrName)] ?? {};
    const page = findPage();
    if (page.type === 'dashboard') {
        elem.childNodes[1].textContent = formatNumber(recipe.sell_price);
        elem.childNodes[2].textContent = formatNumber(recipe.buy_price);
        elem.childNodes[3].textContent = formatNumber(recipe.craft_price);
        const profit = recipe.buy_price !== undefined ? recipe.buy_price - recipe.craft_price: undefined;
        const profEl = elem.childNodes[4];
        profEl.classList.add(profit > 0? 'table-success': 'table-danger');
        profEl.classList.remove(profit > 0? 'table-danger': 'table-success');
        profEl.textContent = formatNumber(profit);
        elem.childNodes[5].textContent = formatNumber(profit !== undefined && recipe.result_craft_time !== undefined ? profit / recipe.result_craft_time: undefined);
    } else {
        elem.childNodes[3].textContent = formatNumber(recipe.sell_price);
        elem.childNodes[4].textContent = formatNumber(recipe.buy_price);
        const tooltipElem = elem.childNodes[7];
        tooltipElem.textContent = formatNumber(recipe.craft_price);
        if (recipe.buy_price !== undefined) {
            tooltipElem.setAttribute('data-bs-title', getTooltip(recipe));
            tooltipList.push(new bootstrap.Tooltip(tooltipElem));
        }
        elem.childNodes[8].textContent = formatNumber(recipe.result_craft_time, false);
        for (const component of recipe['components']) {
            elem = elem.nextSibling;
            elem.childNodes[3].textContent = formatNumber(component.sell_price);
            elem.childNodes[4].textContent = formatNumber(component.buy_price);
            elem.childNodes[5].textContent = formatNumber(component.craft_price);
            elem.childNodes[6].firstChild.value = component.source ?? 'sell';
            elem.childNodes[7].textContent = formatNumber(component.result_price);
            elem.childNodes[8].textContent = formatNumber(component.result_craft_time, false);
            elem.childNodes[9].textContent = formatNumber(component.percent, false);
        }
    }
}

function drawPage() {
    tooltipList.forEach(tooltip => tooltip.hide());
    tooltipList.length = 0;
    const attrName = findPage()?.type === 'dashboard' ? 'dashboard-id' : 'hypixel-id';
    const recipeElems = document.querySelectorAll(`*[${attrName}]`);
    recipeElems.forEach(elem => drawElem(elem, attrName));
}

function updateMarket(data) {
    if (!data.success) return marketSchedule({ message: 'Error loading market data' });
    marketSchedule();
    bazaarUpdate(data, prices);
    setStatus('Last updated: ' + new Date(data.time_updated).toLocaleString(navigator.language) + ` (load time: ${data.load_time/1000} sec)`);
    updateCraft();
    drawPage();
}

function downloadMarket() {
    bazaarDownload().catch(marketSchedule).then(updateMarket);
}

function marketSchedule(error) {
    const updatedUnsuccessfully = error !== undefined;
    if (updatedUnsuccessfully) setStatus(error.message);
    if (currentInterval) clearInterval(currentInterval);
    currentInterval = setInterval(downloadMarket, updatedUnsuccessfully? 20000: 65000 );
}

function saveConfig() {
    saveToStorage(lsPrefix + 'config', JSON.stringify(config));
}

function sourceChange(event) {
    const row = this.parentElement.parentElement;
    const [recipe_id, idx] = row.getAttribute('component-link').split(',');
    const recipe = config.recipes[recipe_id];
    const component = recipe['components'][idx];
    component.source = this.value;
    updateCraft();
    saveConfig();
    drawPage();
}

function collapseTick() {
    if (collapseState.itemsCount === 0) return;
    if (!collapseState.collapse) {
        collapseState.item.classList.remove('d-none');
        collapseState.item = collapseState.item.nextSibling;
    } else {
        collapseState.item.classList.add('d-none');
        collapseState.item = collapseState.item.previousSibling;
    }
    if (--collapseState.itemsCount > 0) setTimeout(collapseTick, collapseState.interval);
}

function rowClick(event) {
    if (event.target?.getAttribute('data-bs-toggle') === 'tooltip') return;
    if (collapseState.itemsCount > 0) return;
    const item_id = this.getAttribute('hypixel-id');
    const idx = this.getAttribute('index');
    collapseState.itemsCount = config.recipes[item_id]['components'].length;
    collapseState.interval = collapse_time / collapseState.itemsCount;
    collapseState.item = this.nextSibling;
    collapseState.collapse = !(this.getAttribute('collapsed') === 'true');
    this.setAttribute('collapsed', collapseState.collapse);
    findPage().elements[idx].collapsed = collapseState.collapse;
    saveConfig();
    if (collapseState.collapse) {
        for (let i = 0; i < collapseState.itemsCount - 1; i++) {
            collapseState.item = collapseState.item.nextSibling;
        }
    }
    setTimeout(collapseTick, collapseState.interval);
}

function createRow(page_elem, component = undefined, index = 0) {
    const item = config.recipes[page_elem.id];
    const header = component === undefined;
    const newRow = createElement('tr', [header? 'table-info': (page_elem.collapsed ? 'd-none' : '')], 
        header? {"hypixel-id": page_elem.id, "collapsed": page_elem.collapsed ?? 'false', "index": page_elem.idx} : 
        {"component-link": page_elem.id + ',' + index});
    if (header) newRow.addEventListener('click', rowClick);
    const name = header? (item?.name ?? page_elem.id): component.id;
    newRow.appendChild(createElement('th', ["text-start"], {}, config.translate?.[name] ?? snakeToFlu(name)));
    addColumn(newRow, header && item?.['craft_time'] !== undefined ? formatNumber(item?.['craft_time'] / 3600, false) : undefined);
    addColumn(newRow, header? item.count : component.count);
    addColumn(newRow, undefined, ['table-secondary']);
    addColumn(newRow, undefined, ['table-secondary']);
    addColumn(newRow, undefined, ['table-secondary']);
    const srcCol = createElement('td');
    if (component !== undefined) {
        const select = createElement('select', ['form-select', 'py-0', 'pe-0']);
        select.appendChild(createElement('option', [], {}, 'sell'));
        select.appendChild(createElement('option', [], {}, 'buy'));
        const disabled = config.recipes[component.id] === undefined ? { disabled : '' } : {} ;
        select.appendChild(createElement('option', [], disabled, 'craft'));
        select.appendChild(createElement('option', [], {}, 'own'));
        select.addEventListener('change', sourceChange);
        srcCol.appendChild(select);
    }
    newRow.appendChild(srcCol);
    if (header) {
        newRow.appendChild(createTooltip('td', ' '));
    } else {
        addColumn(newRow, undefined);
    }
    addColumn(newRow, undefined);
    addColumn(newRow, undefined);
    return newRow;
}

function formPage() {
    const page = findPage();
    if (page === undefined) return;

    const elements = [];
    if (page.type === 'dashboard') {
        for (const element of page.elements) {
            const newRow = createElement('tr', [], {"dashboard-id": element.id} );
            elements.push(newRow);
            const item = config.recipes[element.id];
            newRow.appendChild(createElement('th', ['text-start'], {}, snakeToFlu(item?.name ?? element.id)));
            addColumn(newRow, undefined, ['table-secondary']);
            addColumn(newRow, undefined, ['table-secondary']);
            addColumn(newRow, undefined, ['table-secondary']);
            addColumn(newRow, undefined, ['table-success']);
            addColumn(newRow, undefined);
        }
        document.getElementById('tDashboard').replaceChildren(...elements);
    } else {
        page.elements.forEach((element, idx) => {
            const item = config.recipes[element.id];
            if (item !== undefined) {
                element.idx = idx;
                elements.push(createRow(element));
                item['components'].forEach((component, idx) => elements.push(createRow(element, component, idx)));
            }
        });
        document.getElementById('tForge').replaceChildren(...elements);
    }
}

function restoreConfig(response) {
    // restore collapsed and source values
    for (let page of response.pages) {
        const oldPage = findPage(page.name);
        if (oldPage !== undefined) {
            for (let element of page.elements) {
                const oldElement = findElement(element, oldPage);
                if (oldElement !== undefined) {
                    element.collapsed = oldElement.collapsed;
                }
            }
        }
    }
    for (const [item_id, recipe] of Object.entries(response.recipes)) {
        const oldRecipe = config.recipes[item_id];
        if (oldRecipe !== undefined) {
            recipe['components'].forEach((component, idx) => component.source = oldRecipe['components'][idx]?.source);
        }
    }
    return response;
}

function updateConfig(response) {
    config = response; // restoreConfig(response);
    saveConfig();
    // form navigation
    if (findPage() === undefined) selectedMenu = config.pages.length > 0? config.pages[0].name: '';
    const elements = [];
    for (const page of config.pages) {
        const newRow = createElement('li', ["nav-item"], { role: "presentation" });
        elements.push(newRow);
        const isActive = selectedMenu === page.name;
        const target = 'pills-' + (page.type ?? 'forge');
        const newBtn = createElement('button', ['nav-link', isActive? 'active' : ''], {
            "data-bs-toggle": "pill",
            "type": "button",
            "aria-selected": isActive,
            "role": "tab",
            "data-bs-target": "#" + target,
            "aria-controls": target
        }, page.name);
        newRow.appendChild(newBtn);
    }
    document.getElementById('nForgeMenu').replaceChildren(...elements);
    if (findPage()?.type === 'dashboard') {
        document.getElementById('pills-forge').classList.remove('show', 'active');
        document.getElementById('pills-dashboard').classList.add('show', 'active');
    }
    formPage();
    downloadMarket();
}

function reloadCfg() {
    fetch('json/forge.json').then(res => res.json().then(updateConfig));
}

function clickNav(item) {
    selectedMenu = item.delegateTarget.textContent;
    saveToStorage(lsPrefix + 'selected_menu', selectedMenu);
    formPage();
    drawPage();
}

function clickThousands() {
    setShortThousands(document.getElementById('chkThousands').checked);
    saveToStorage(lsPrefix + "shortThousands", shortThousands);
    drawPage();
}

function init() {
    addHandlers({
        'click-reloadcfg': reloadCfg,
        'click-navigation': clickNav,
        'change-thousands': clickThousands
    });
    selectedMenu = loadFromStorage(lsPrefix + "selected_menu");
    setShortThousands('true' === (loadFromStorage(lsPrefix + "shortThousands") ?? shortThousands.toString()));
    document.getElementById('chkThousands').checked = shortThousands;
    const conf_str = loadFromStorage(lsPrefix + 'config');
    if (conf_str) updateConfig(JSON.parse(conf_str));
    else reloadCfg();
}

init();