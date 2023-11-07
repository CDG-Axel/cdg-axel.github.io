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
const elCount = chances.length;
let intervals = new Array(elCount);
let tierDrop = new Array(elCount);
let isRussian = false;


const lsPrefix = 'sa_sim_';

function esc(unsafe) {
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

function generateTable() {
    document.getElementById('resTableBody').innerHTML = tiers.map(
        (tier, i) =>
        `<tr><th scope="row">${esc(tier)}</th><td>${chances[i]}</td><td>${points[i]}</td><td id="avRes${i}">-</td></tr>`
    ).join('')
}

function init() {
	// check local storage
	generateTable();
	if (typeof (Storage) !== 'undefined') {
	    let etp = localStorage.getItem(lsPrefix + 'edTargetPoints');
	    let eft = localStorage.getItem(lsPrefix + 'edFirstTier');
	    let esc = localStorage.getItem(lsPrefix + 'edSimulationCount');
	    if (etp != null) { document.getElementById('edTargetPoints').value = etp; }
	    if (eft != null) { document.getElementById('edFirstTier').value = eft; }
	    if (esc != null) { document.getElementById('edSimulationCount').value = esc; }
	}
}


function storeLocal(i) {
	if (typeof (Storage) !== 'undefined') {
		localStorage.setItem(lsPrefix + i.id, i.value);
	}
}


function binSearch(value) {
    let left = 0;
    let right = intervals.length;

    while (left + 1 < right) {
        let mid = Math.floor((left + right)/2);
        if (value > intervals[mid]) {
            left = mid;
        }
        else {
            right = mid;
        }
    }

    return value < intervals[left] ? left : right;
}

function simulationStep() {
    let collected = 0;
    let dices = 0;
    let bonus = 0;
    while (collected < targetPoints) {
        let idx = binSearch(Math.random());
        collected += points[idx];
        dices += 1;
        tierDrop[idx] += 1;
        if (idx < firstTier) {
            bonus += gems[idx];
        }
    }

    let needed = dices - Math.trunc(bonus / 100);
    minPoints = minPoints < needed ? minPoints : needed;
    maxPoints = maxPoints > needed ? maxPoints : needed;
    totalPoints += needed;
}

function simulationBlock() {
	if (simRunning && simNum < simulationCount) {
	    // one block is 100 simulation steps
		for (let i = 0; i < 100; i++) {
			simNum++;
			simulationStep();
		}
		setTimeout(simulationBlock, 1);
	} else {
		simRunning = false;
	}
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

        let elSum = 0;
        for (let i = 0; i < elCount; i++) {
            elSum += chances[i];
            intervals[i] = elSum / 100;
            tierDrop[i] = 0;
        }

		setTimeout(simulationBlock, 1);
	} else { simRunning = false; }
}

function updateValues() {
    let resLab = isRussian ? 'Необходимо звездных алмазов (среднее/мин/макс): ' : 'Starry gems needed (average/min/max): ';
    let waitLab = isRussian ? 'Осталось симуляций: ' : 'Simulations left: ';
    let runLab = isRussian ? 'Запуск симуляции' : 'Start simulation';
    document.getElementById('startBtn').innerHTML = simRunning ? waitLab + (simulationCount - simNum) : runLab;
    document.getElementById('lbSimResults').innerHTML = resLab +
        100 * Math.round(totalPoints / simNum) + '/' + minPoints * 100 + '/' + maxPoints * 100;
    for (let i = 0; i < elCount; i++) {
        document.getElementById('avRes' + i).innerHTML = (tierDrop[i] / simNum).toFixed(1);
    }
}

window.init = init;
window.storeLocal = storeLocal;
window.updateValues = updateValues;
window.runSimulation = runSimulation;
