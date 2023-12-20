const esc = (parts, ...params) => {
    return parts[0] + params.map((p, i) => 
        String(p).replace(/(&|<|>|"|')/g, s=>({"<": "&lt;", ">": "&gt", '"':"&quot;","'":"&#039;"})[s]) + parts[i+1]).join('');
}

const langData = {
    cMenuHome:  {'en': "#", 'ru': "#"},
    cMenuAwak:  {'en': "Awakening", 'ru': "Пробуждение"},
    cMenuSe:    {'en': "Star Exp", 'ru': "Экспедиция"},
    cMenuLang:  {'en': "Language", 'ru': "Язык"},
    cMenuBrowserLang: {'en': "Browser language", 'ru': "Язык браузера"},
    cAbout:  {
        'en': esc`<br>Performed by CDG.Axel (C)2023<br><br>Resourses:`, 
        'ru': esc`<br>Разработка - CDG.Axel (C)2023<br><br>Полезные ресурсы:`
    },
    cCommunity: {'en': "Largest IH community", 'ru': "Крупнейшее русскоязычное комьюнити по игре"},
    cYouTube:   {'en': "AkuDemon youtube channel", 'ru': "Ютюб-канал AkuDemon"},
    cSaHeader:  {'en': "Idle heroes Soul - Awakening simulator", 'ru': "Idle heroes - Сеанс пробуждения души"},
    lTargetPoints: {'en': "Target points", 'ru': "Количество очков"},
    lFirstTier: {'en': "Save copies from tier", 'ru': "Сохранять копии, начиная с"},
    lSimulationCount: {'en': "Simulation count", 'ru': "Количество симуляций"},
    startBtn: {'en': "Start simulation", 'ru': "Запуск симуляции"},
    cSimRes: {'en': "Starry gems needed (average/min/max): ", 'ru': "Необходимо звездных алмазов (среднее/мин/макс): "},
    cResCopies: {'en': "Copies needed: ", 'ru': "Требуется копий: "},
    cResHelp: {'en': "Calculation time: ", 'ru': "Время расчёта:"},
    cSimLink: {'en': "This simulation link - ", 'ru': "Ссылка на эту симуляцию - "},
    lCopyLink: {'en': "click", 'ru': "клик"},
    cTCol1: {'en': "Tier", 'ru': "Тир"},
    cTCol2: {'en': "Chance", 'ru': "Шанс"},
    cTCol3: {'en': "Points", 'ru': "Очков"},
    cTCol4: {'en': "Average", 'ru': "Среднее"},
    c: {'en': "", 'ru': ""},
    cSaHowToUse:  {'en': "How to use it", 'ru': "Инструкция по использованию симулятора" },
    cSaHowFull: {
        'en': esc`<ul><li>Simulate a soul awakening session 'Simulation count' times.
            A minimum of 10,000 simulations is required for accurate results.</li>
            <li>Each simulation continues until 'Target points' reached.
            For instance, 200 points are needed for a guaranteed B-tier.</li>
            <li>Any copies with a tier lower than 'Save copies from tier' are retired, and
            the required number of starry gems is decreased by the value of the retired copies.</li>
            <li>The average quantity of each tear dropped is displayed in the last column of the table.</li></ul>
            During the simulation, you can view the results, and it becomes more accurate with more simulations.`,
        'ru': esc`<ul>
            <li>Симулирует пробуждение души 'Количество симуляций' раз.
            Для более точных результатов желательно не менее 10,000 симуляций.</li>
            <li>Каждая симуляция длится, пока не будет набрано требуемое 'Количество очков'.
            Для примера, 200 очков требуется для получения гарантированного B- тира.
            Если хотите узнать, сколько требуется алмазов, например, для топ-10, введите в поле 'Количество очков'
            значение больше, чем у места 10 в рейтинге (лучше с запасом).</li>
            <li>Все копии рангом ниже 'Сохранять копии, начиная с' будут считаться разобранным,
            а требуемое количество звездных алмазов будет уменьшено на значение, полученное от их разбора.</li>
            <li>Среднее количество копий каждого тира показано в последней колонке таблицы.</li></ul>
            Вы можете смотреть результаты в процессе симуляции, но чем она дольше длится, тем точнее результат.`
    },
    cSeHeader:    {'en': "Idle Heroes Star Expedition", 'ru': "Idle Heroes - Звездная экспедиция"},
    cSeHowToUse:  {'en': "How to use it", 'ru': "Инструкция по использованию калькулятора" },
    lbBossNumber: {'en': "Boss number", 'ru': "Босс номер"},
    lbPercentHp:  {'en': "Percent HP", 'ru': "Процент ХП"},
    lTotalHP:     {'en': "Total HP:", 'ru': "Всего ХП:"},
    lRemainingHP: {'en': "Remaining HP", 'ru': "Осталось ХП:"},
    lGuildPoints: {'en': "Guild Points:", 'ru': "Очки гильдии:"},
    error: {'en': "error!", 'ru': "ошибка!"},
    endBillion:   {'en': " B", 'ru': " Млрд"},
    endTrillion:  {'en': " T", 'ru': " Т"},
    l: {'en': "#", 'ru': "#"},
    cSeHowFull: {
        'en': esc`Used to calculate remaining boss HP.
            <ul><li>Boss Number - number between 200 and 101</li>
            <li>HP Percentage - current % of HP remaining</li></ul>`,
        'ru': esc`Используется для расчёта оставшегося ХП у босса.
            <ul><li>Номер босса - число от 200 до 101</li>
            <li>Процент ХП - текущее ХП босса в процентах</li></ul>`
    },
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
}
let bossTotalHp = {}
let sum = 0;
for (let i = 200; i > 101; i--) bossTotalHp[i] = sum += bossHp[i]

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

function switchLanguage(lang) {
	if (typeof (Storage) !== 'undefined') localStorage.setItem(lsPrefix + 'language', lang);
    if (lang == '--') lang = navigator.language || navigator.userLanguage; 
    language = lang.slice(0, 2);

    for (id in langData) {
        const ctrl = document.getElementById(id);
        if (ctrl) ctrl.innerHTML = getLangString(id);
    }
    calcOctopus();
}

function getStorageItem(item) {
    return typeof (Storage) !== 'undefined'? localStorage.getItem(item) : null;
}


function init() {
    let value;
    language = getStorageItem(lsPrefix + 'language') ?? '--';

    const table = document.getElementById('resTableBody');
    if (table) table.innerHTML = tiers.map((tier, i) =>
        esc`<tr><th scope="row">${tier}</th><td>${chances[i]}</td><td>${points[i]}</td><td id="avRes${i}">-</td></tr>`
    ).join('')

    value = getStorageItem(lsPrefix + 'edTargetPoints');
    if (value) document.getElementById('edTargetPoints').value = value;
    value = getStorageItem(lsPrefix + 'edFirstTier');
    if (value) document.getElementById('edFirstTier').value = value;
    value = getStorageItem(lsPrefix + 'edSimulationCount');
    if (value) document.getElementById('edSimulationCount').value = value;
    value = getStorageItem(lsPrefix + 'edBossNumber');
    if (value) document.getElementById('edBossNumber').value = document.getElementById('rnBossNumber').value = value;
    value = getStorageItem(lsPrefix + 'edPercentHp');
    if (value) document.getElementById('edPercentHp').value = document.getElementById('rnPercentHp').value = value;

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
    switchLanguage(language);
    updateLink();
    if (params) {
        const el = document.getElementById('cMenuAwak');
        if (el) {
            const tab = new bootstrap.Tab(el);
            tab?.show();
        }
        runSimulation();
    }
}

function updateLink() {
    targetPoints = parseInt(document.getElementById('edTargetPoints').value);
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
	if (typeof (Storage) !== 'undefined') localStorage.setItem(lsPrefix + element.id, value);
    if (element.id == "edTargetPoints" || element.id == "edFirstTier") updateLink();
    if (element.id == "edBossNumber" || element.id == "edPercentHp") calcOctopus();
}

function updateSaValues() {
    let runLab  = language == 'ru' ? 'Запуск симуляции' : 'Start simulation';
    let waitLab = language == 'ru' ? 'Осталось симуляций: ' : 'Simulations left: ';
    let curTime = ((Date.now() - timeStart) / 1000).toFixed(1);
    document.getElementById('lbResHelp').innerHTML = curTime;
    document.getElementById('startBtn').innerHTML = simRunning ? waitLab + (simulationCount - simNum) : runLab;
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

function copyClipboard() {
    if (navigator.clipboard) navigator.clipboard.writeText(document.getElementById('lCopyLink').href);
}

function runSimulation(isRus = false) {
	if (!simRunning) {
        simRunning = true;
        if (isRus) language = 'ru';

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
    const bossNum = Number(document.getElementById('rnBossNumber').value);
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