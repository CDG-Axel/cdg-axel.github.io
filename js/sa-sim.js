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
let minPoints;
let maxPoints;
let timeStart;
const elCount = chances.length;
const maxProb = 200000;
const lsPrefix = 'sa_sim_';
let intervals = new Array(elCount);
let tierDrop = new Array(elCount);
let fullProb = new Array(maxProb);
let isRussian = false;

let elSum = 0;
let lastEl = 0;
for (let i = 0; i < elCount; i++) {
    elSum += chances[i];
    intervals[i] = elSum / 100;
    let fillCnt = Math.floor(elSum * maxProb / 100);
    for (; lastEl < fillCnt; lastEl++) fullProb[lastEl] = i;
}

function esc(parts, ...params){
    return parts[0] + params.map((p, i) => 
        String(p).replace(/(&|<|>|"|')/g, s=>({"<": "&lt;", ">": "&gt", '"':"&quot;","'":"&#039;"})[s]) + parts[i+1]).join('');
}

function init() {
    document.getElementById('resTableBody').innerHTML = tiers.map((tier, i) =>
        esc`<tr><th scope="row">${tier}</th><td>${chances[i]}</td><td>${points[i]}</td><td id="avRes${i}">-</td></tr>`
    ).join('')

    if (typeof (Storage) !== 'undefined') {
	    let etp = localStorage.getItem(lsPrefix + 'edTargetPoints');
	    let eft = localStorage.getItem(lsPrefix + 'edFirstTier');
	    let esc = localStorage.getItem(lsPrefix + 'edSimulationCount');
	    if (etp != null) { document.getElementById('edTargetPoints').value = etp; }
	    if (eft != null) { document.getElementById('edFirstTier').value = eft; }
	    if (esc != null) { document.getElementById('edSimulationCount').value = esc; }
	}

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
    if (params) runSimulation();
}

function storeLocal(element) {
	if (typeof (Storage) !== 'undefined') localStorage.setItem(lsPrefix + element.id, element.value);
}

function updateValues() {
    let runLab  = isRussian ? 'Запуск симуляции' : 'Start simulation';
    let waitLab = isRussian ? 'Осталось симуляций: ' : 'Simulations left: ';
    let resLab  = isRussian ? 'Необходимо звездных алмазов (среднее/мин/макс): ' : 'Starry gems needed (average/min/max): ';
    let curTime = ((Date.now() - timeStart) / 1000).toFixed(1);
    document.getElementById('lbResHelp').innerHTML = isRussian ? 'Время расчёта: ' + curTime + ' сек' : 'Calculation time: ' + curTime + ' sec';
    document.getElementById('startBtn').innerHTML = simRunning ? waitLab + (simulationCount - simNum) : runLab;
    document.getElementById('lbSimRes').innerHTML = resLab +
        100 * Math.round(totalPoints / simNum) + '/' + minPoints * 100 + '/' + maxPoints * 100;
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
            totalPoints += needed;
        }
		setTimeout(simulationBlock, 1);
	} else simRunning = false;
	updateValues();
}

function runSimulation(isRus = false) {
	if (!simRunning) {
        simRunning = true;
        isRussian = isRus;

        targetPoints = parseInt(document.getElementById('edTargetPoints').value);
        firstTier = parseInt(document.getElementById('edFirstTier').value);
        simulationCount = parseInt(document.getElementById('edSimulationCount').value);

        simNum = 0;
        totalPoints = 0;
        minPoints = 100000;
        maxPoints = 0;
        tierDrop.fill(0);
        timeStart = Date.now();

		setTimeout(simulationBlock, 1);
	} else simRunning = false;
}
