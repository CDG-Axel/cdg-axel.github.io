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
    cHowToUse:  {'en': "How to use it", 'ru': "Инструкция по использованию симулятора" },
    cHowFullText: {
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
};

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
let language;
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

function switchLanguage(lang) {
	if (typeof (Storage) !== 'undefined') localStorage.setItem(lsPrefix + 'language', lang);
    if (lang == '--') lang = navigator.language || navigator.userLanguage; 
    language = lang.slice(0, 2);

    for (let [id, val] of Object.entries(langData)) {
        const ctrl = document.getElementById(id);
        if (ctrl) ctrl.innerHTML = val[language] ?? val.en;
    }
}

function getStorageItem(item) {
    return typeof (Storage) !== 'undefined'? localStorage.getItem(item) : null;
}


function init() {
    language = getStorageItem(lsPrefix + 'language') ?? '--';
    switchLanguage(language);

    const table = document.getElementById('resTableBody');
    if (table) table.innerHTML = tiers.map((tier, i) =>
        esc`<tr><th scope="row">${tier}</th><td>${chances[i]}</td><td>${points[i]}</td><td id="avRes${i}">-</td></tr>`
    ).join('')

    let etp = getStorageItem(lsPrefix + 'edTargetPoints');
    let eft = getStorageItem(lsPrefix + 'edFirstTier');
    let scn = getStorageItem(lsPrefix + 'edSimulationCount');
    if (etp != null) { document.getElementById('edTargetPoints').value = etp; }
    if (eft != null) { document.getElementById('edFirstTier').value = eft; }
    if (scn != null) { document.getElementById('edSimulationCount').value = scn; }

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
	if (typeof (Storage) !== 'undefined') localStorage.setItem(lsPrefix + element.id, element.value);
    updateLink();
}

function updateValues() {
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
	updateValues();
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
