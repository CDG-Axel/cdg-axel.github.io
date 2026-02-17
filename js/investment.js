const USE_STATIC_CONTENT = true;

import {addHandlers, loadFromStorage, saveToStorage} from "./hp_common.js";

const lsPrefix = 'hp_inv_';
let config = { incomes: [] };

function saveConfig() {
    saveToStorage(lsPrefix + 'config', JSON.stringify(config));
}

function updateConfig(response) {
    config = response;
    saveConfig();
}

function reloadCfg() {
    fetch('json/investment_def.json').then(res => res.json().then(updateConfig));
}

function init() {
    if (USE_STATIC_CONTENT) {
        document.querySelectorAll('.test-static').forEach(el => el.classList.remove('d-none'));
        // return;
    }
    const conf_str = loadFromStorage(lsPrefix + 'config');
    if (conf_str && false) updateConfig(JSON.parse(conf_str));
    else reloadCfg();
}

init();