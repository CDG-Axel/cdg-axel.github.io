function esc(parts, ...params) {
    return parts[0] + params.map((p, i) => 
        String(p).replace(/(&|<|>|"|')/g, s=>({"<": "&lt;", ">": "&gt", '"':"&quot;","'":"&#039;"})[s]) + parts[i+1]).join('');
}

const langData = {
    simStart:    {en: "Start simulation", ru: "Запуск симуляции", de: "Simulation starten"},
    simLeft:     {en: "Simulations left: ", ru: "Осталось симуляций: ", de: "Simulationen übrig: "},
    error:       {en: "Error!", ru: "Ошибка!", de: "Fehler!"},
    endBillion:  {en: " B", ru: " Млрд", de: " Mrd"},
    endTrillion: {en: " T", ru: " Т", de: " B"},
    autoLang:    {
        en: 'Is your native language English, perhaps? <a href="/home.html">Switch!</a>',
        ru: 'Возможно ваш родной язык русский? <a href="/ru/home.html">Переключить!</a>', 
        de: 'Vielleicht ist Deutsch deine Muttersprache? <a href="/de/home.html">Wechseln!</a>'
    }
};


const bossHp = {
    200: 10.00,
    199: 39.99,
    198: 87.38,
    197: 126.71,
    196: 158.38,
    195: 174.22,
    194: 182.93,
    193: 192.08,
    192: 201.68,
    191: 211.77,
    190: 222.36,
    189: 233.48,
    188: 245.15,
    187: 257.41,
    186: 270.28,
    185: 289.20,
    184: 309.44,
    183: 331.10,
    182: 354.28,
    181: 379.08,
    180: 409.40,
    179: 442.16,
    178: 477.53,
    177: 515.73,
    176: 556.99,
    175: 601.55,
    174: 649.67,
    173: 701.65,
    172: 757.78,
    171: 818.40,
    170: 883.87,
    169: 972.26,
    168: 1069.49,
    167: 1176.43,
    166: 1294.08,
    165: 1423.49,
    164: 1565.83,
    163: 1722.42,
    162: 1894.66,
    161: 2084.12,
    160: 2188.33,
    159: 2297.75,
    158: 2412.63,
    157: 2533.27,
    156: 2659.93,
    155: 2792.93,
    154: 2932.57,
    153: 3079.20,
    152: 3233.16,
    151: 3394.82,
    150: 3564.56,
    149: 3742.79,
    148: 3929.93,
    147: 4126.42,
    146: 4332.75,
    145: 4549.38,
    144: 4776.85,
    143: 5015.69,
    142: 5266.48,
    141: 5529.80,
    140: 6082.78,
    139: 6691.06,
    138: 7360.17,
    137: 8096.18,
    136: 8905.80,
    135: 10063.56,
    134: 11371.82,
    133: 12850.16,
    132: 14520.68,
    131: 16408.37,
    130: 19690.04,
    129: 23628.05,
    128: 28353.65,
    127: 34024.39,
    126: 40829.26,
    125: 48995.12,
    124: 58794.14,
    123: 70482.00,
    122: 84578.40,
    121: 101494.00,
    120: 121793.00,
    119: 182689.00,
    118: 274034.00,
    117: 411051.00,
    116: 616577.00,
    115: 924865.00,
    114: 1387300.00,
    113: 2080900.00,
    112: 3121400.00,
    111: 4682100.00,
    110: 7023200.00,
    109: 14046400.00,
    108: 28092800.00,
    107: 56185600.00,
    106: 112371000.00,
    105: 224742000.00,
    104: 449485000.00,
    103: 898969000.00,
    102: 1797938000.00,
    101: 3595876000.00
};
let bossTotalHp = {};
let sum = 0;
for (let i = 200; i > 101; i--) bossTotalHp[i] = sum += bossHp[i];

let language;
// Soul-awakening simulation data
let simNum;
let simRunning = false;
let targetPoints;
let firstTier;
let simulationCount;
let tiers = ["E-", "E", "E+", "D-", "D", "D+", "C-", "C", "C+", "B-", "B", "B+", "A-", "A", "A+", "S"]
let chances = [4.3, 19.8, 28.8, 20, 9.2, 4.8, 4.4, 4.3, 2.13, 1.62, .55, .0745, .015, .0065, .0025, .0015];
let points = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
let gems = [10, 15, 20, 30, 50, 70, 100, 150, 200, 300, 600, 1800, 8000, 15000, 25000, 50000];
let totalPoints;
let copiesNeeded;
let minPoints;
let maxPoints;
let timeStart;
const elCount = chances.length;
const maxProb = 200000;
const lsPrefix = 'sa_sim_';
let intervals = new Array(elCount);
let tierDrop = new Array(elCount);
let fullProb = new Array(maxProb);

let elSum = 0;
let lastEl = 0;
for (let i = 0; i < elCount; i++) {
    elSum += chances[i];
    intervals[i] = elSum / 100;
    let fillCnt = Math.floor(elSum * maxProb / 100);
    for (; lastEl < fillCnt; lastEl++) fullProb[lastEl] = i;
}

function getLangString(type) {
    return langData[type][language] ?? langData[type].en ?? type;
}

function loadCtrlValue(ctrlName) {
    const ctrl = document.getElementById(ctrlName);
    if (ctrl) {
        const value = localStorage?.getItem?.(lsPrefix + ctrlName) ?? null;
        if (value) ctrl.value = value;
    }
}

function nativeLang() {
    const autoLang = (navigator.language || navigator.userLanguage)?.slice(0, 2);
    const autoText = langData.autoLang[autoLang];
    if (autoLang !== document.documentElement.lang && autoText) document.getElementById('eNativeLang').innerHTML = autoText;
}

function init() {
    language = document.documentElement.lang;

    const table = document.getElementById('resTableBody');
    if (table) table.innerHTML = tiers.map((tier, i) =>
        esc`<tr><th scope="row">${tier}</th><td>${chances[i]}</td><td>${points[i]}</td><td id="avRes${i}">-</td></tr>`
    ).join('');

    loadCtrlValue('edTargetPoints');
    loadCtrlValue('edFirstTier');
    loadCtrlValue('edSimulationCount');
    loadCtrlValue('edBossNumber');
    loadCtrlValue('edPercentHp');

    let ctrl;
    if (ctrl = document.getElementById('edBossNumber')) document.getElementById('rnBossNumber').value = ctrl.value;
    if (ctrl = document.getElementById('edPercentHp')) document.getElementById('rnPercentHp').value = ctrl.value;

    let params = window.location.search.replace('?', '');
    params.split('&').forEach((param) => {
        let [name, value] = param.split('=');
        if (name == 'target') document.getElementById('edTargetPoints').value = value;
        if (name == 'save') {
            options = document.getElementById('edFirstTier').options;
            for (let i = 0; i < options.length; i++) 
                if (options[i].text == value) document.getElementById('edFirstTier').value = i;
        }
    })
    
    updateLink();
    calcOctopus();
    if (params) runSimulation();
}

function updateLink() {
    let tp = document.getElementById('edTargetPoints');
    if (!tp) return;
    targetPoints = parseInt(tp.value);
    firstTier = parseInt(document.getElementById('edFirstTier').value);
    let text = window.location.href.split('?')[0] + "?target=" + targetPoints + "&save=" + tiers[firstTier];
    document.getElementById('lCopyLink').href = text;
}

function dataChanged(element) {
    // cross-change values
    const value = element.value;
    if (element.id == 'edBossNumber') document.getElementById('rnBossNumber').value = value;
    if (element.id == 'edPercentHp')  document.getElementById('rnPercentHp').value = value;
    if (element.id == 'rnBossNumber') (element = document.getElementById('edBossNumber')).value = value;
    if (element.id == 'rnPercentHp')  (element = document.getElementById('edPercentHp')).value = value;
    // store data and update link in changed
	localStorage?.setItem?.(lsPrefix + element.id, value);
    if (element.id == "edTargetPoints" || element.id == "edFirstTier") updateLink();
    if (element.id == "edBossNumber" || element.id == "edPercentHp") calcOctopus();
}

function updateSaValues() {
    let curTime = ((Date.now() - timeStart) / 1000).toFixed(1);
    document.getElementById('lbResHelp').innerHTML = curTime;
    document.getElementById('startBtn').innerHTML = simRunning ? getLangString('simLeft') + (simulationCount - simNum) : getLangString('simStart');
    document.getElementById('lbSimRes').innerHTML = 100 * Math.round(totalPoints / simNum) + '/' + minPoints * 100 + '/' + maxPoints * 100;
    document.getElementById('lbResCopies').innerHTML = Math.round(copiesNeeded / simNum);
    for (let i = 0; i < elCount; i++) document.getElementById('avRes' + i).innerHTML = (tierDrop[i] / simNum).toFixed(1);
}

function simulationBlock() {
	if (simRunning && simNum < simulationCount) {
	    // one block is 1000 simulation steps
        const simLimit = Math.min(simNum + 1000, simulationCount);
		for (; simNum < simLimit; simNum++) {
            let collected = dices = bonus = 0;
            while (collected < targetPoints) {
                let idx = fullProb[Math.floor(maxProb * Math.random())];
                collected += points[idx];
                dices += 1;
                tierDrop[idx] += 1;
                if (idx < firstTier) bonus += gems[idx];
            }
            
            let needed = dices - Math.trunc(bonus / 100);
            if (needed < minPoints) minPoints = needed;
            if (needed > maxPoints) maxPoints = needed;
            copiesNeeded += dices;
            totalPoints += needed;
        }
		setTimeout(simulationBlock, 1);
	} else simRunning = false;
	updateSaValues();
}

function runSimulation() {
	if (!simRunning) {
        simRunning = true;

        simulationCount = parseInt(document.getElementById('edSimulationCount').value);

        simNum = 0;
        totalPoints = 0;
        copiesNeeded = 0;
        minPoints = 100000;
        maxPoints = 0;
        tierDrop.fill(0);
        timeStart = Date.now();

		setTimeout(simulationBlock, 1);
	} else simRunning = false;
}

function numToIh(value, isPoints=false) {
    if (isPoints) return value.toFixed(3);
    if (value > 1_000_000) {
        let exp = 9;
        while (value > 10 && exp++) value /= 10;
        return value.toFixed(3) + 'E+' + exp;
    } else if (value > 1000) return (value / 1000).toFixed(3) + getLangString('endTrillion');
    else return value.toFixed(3) + getLangString('endBillion');
}

function calcOctopus() {
    const ctrl = document.getElementById('rnBossNumber');
    if (!ctrl) return;
    const bossNum = Number(ctrl.value);
    const percHp  = Number(document.getElementById('rnPercentHp').value);
    let totHp, remHp, gPts;
    if (bossNum && bossHp) {
        totHp = bossHp[bossNum];
        remHp = totHp * percHp / 100;
        gPts  = numToIh((bossTotalHp[bossNum] - remHp) * 0.00072);
        remHp = numToIh(remHp);
        totHp = numToIh(totHp);
    } else totHp = remHp = gPts = getLangString('error');
    document.getElementById('resTotalHP').innerHTML = totHp;
    document.getElementById('resRemainingHP').innerHTML = remHp;
    document.getElementById('resGuildPoints').innerHTML = gPts;
}