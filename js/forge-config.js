import { addHandlers, loadFromStorage, saveToStorage, stringify } from './hp_common.js';

const lsPrefix = 'hp_frg_';
let verifiedContent;
let saveModal;

function getConfig() {
    const conf_str = loadFromStorage(lsPrefix + 'config');
    const config = JSON.parse(conf_str);
    config.pages.forEach(page => page.elements.forEach(element => element.idx = undefined));
    for (let [item_id, recipe] of Object.entries(config.recipes)) { 
        recipe.craft_price = undefined;
        recipe.result_craft_time = undefined;
        recipe.buy_price = undefined;
        recipe.sell_price = undefined;
        recipe.components.forEach(component => {
            component.buy_price = undefined;
            component.sell_price = undefined;
            component.craft_price = undefined;
            component.result_craft_time = undefined;
            component.result_price = undefined;
            component.percent = undefined;
        });
    }
    document.getElementById('edConfigJson').value = stringify(config, 4);
}

function clickCancel() {
    window.location.assign('forge.html');
}

function clickSave() {
    if (verifiedContent === undefined) return;
    saveToStorage(lsPrefix + 'config', verifiedContent);
    window.location.assign('forge.html');
}

function clickConfirm() {
    try {
        const config = JSON.parse(document.getElementById('edConfigJson').value);
        verifiedContent = JSON.stringify(config);
        document.getElementById('pnlError').classList.add('d-none');
        saveModal.show();
    } catch (error) {
        document.getElementById('spErrorText').textContent = error;
        document.getElementById('pnlError').classList.remove('d-none');
    }
}

function init() {
    saveModal = new bootstrap.Modal(document.getElementById('saveChanges'));
    addHandlers({
        'click-cancel': clickCancel,
        'click-confirm': clickConfirm,
        'click-save': clickSave
    });
    getConfig();
}

init();