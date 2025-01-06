const lang = (navigator.language || navigator.userLanguage);
const intl = new Intl.NumberFormat(lang,{minimumFractionDigits: 1, maximumFractionDigits: 1});

const capitalize = word => word.slice(0, 1).toUpperCase() + word.slice(1);
export const snakeToFlu = word => word.split('_').map(capitalize).join(' ');
export const loadFromStorage = name => localStorage?.getItem?.(name);
export const saveToStorage = (name, value) => localStorage?.setItem?.(name, value);
export let shortThousands = isMobileDevice();
export const setShortThousands = value => shortThousands = value;

export function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function formatNumber(number, doShortThousands = undefined) {
    const postfix = (doShortThousands ?? shortThousands) ? 'k' : '';
    return number === undefined ? '' : intl.format((doShortThousands ?? shortThousands) ? number/1000 : number) + postfix;
};

export function setStatus(text) {
    const status = document.getElementById('cStatus'); 
    status.replaceChildren(document.createTextNode(text));
}

export function addHandlers(handlers) {
    for (let [kind, handler] of Object.entries(handlers)) {
        const elements = document.querySelectorAll(`*[evnt-${kind}]`);
        console.log(kind, elements);
        const [eventType] = kind.split('-',1);
        elements.forEach(element => element.addEventListener(eventType, handler));
    }
}

export function escapeHtml(unsafe) {
    return unsafe.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

export function createElement(tagName, classList = [], attributes = {}, text = undefined) { 
    const newElem = document.createElement(tagName);
    for (let cls of classList) if (cls !== '') newElem.classList.add(cls);
    for (let [name, value] of Object.entries(attributes)) newElem.setAttribute(name, value);
    if (text !== undefined) newElem.appendChild(document.createTextNode(text));
    return newElem;
}

export function createTooltip(tagName, tooltip, classList = [], text = undefined, customClass = undefined) {
    return createElement(tagName, classList, {
        'data-bs-toggle': 'tooltip', 
        'data-bs-html': true, 
        'data-bs-custom-class': customClass,
        'data-bs-title': tooltip
    }, text);
}

export function addColumn(row, text, classList = []) {
    row.appendChild(createElement('td', classList, {}, text));
}
