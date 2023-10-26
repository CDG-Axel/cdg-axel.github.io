let simNum;
let simRunning = false;
let targetPoints;
let firstTier;
let simulationCount;
let chances = [4.3, 19.8, 28.8, 20, 9.2, 4.8, 4.4, 4.3, 2.13, 1.62, .55, .0745, .015, .0065, .0025, .0015];
let points = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
let gems = [10, 15, 20, 30, 50, 70, 100, 150, 200, 300, 600, 1800, 8000, 15000, 25000, 50000];
let totalPoints;
let minPoints;
let maxPoints;
const elCount = chances.length;
let intervals = new Array(elCount);
let tierDrop = new Array(elCount);


const lsPrefix = 'sa_sim_';


function init() {
	// check local storage
	if (typeof (Storage) !== 'undefined') {
		if (localStorage.getItem(lsPrefix + 'edTargetPoints') !== null) {
			document.getElementById('edTargetPoints').value = localStorage.getItem(lsPrefix + 'edTargetPoints');
			document.getElementById('edFirstTier').value = localStorage.getItem(lsPrefix + 'edFirstTier');
			document.getElementById('edSimulationCount').value = localStorage.getItem(lsPrefix + 'edSimulationCount');
		} else {
			localStorage.setItem(lsPrefix + 'edTargetPoints', 200);
			localStorage.setItem(lsPrefix + 'edFirstTier', 9);
			localStorage.setItem(lsPrefix + '', 10000);
		}
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
	if (simNum < simulationCount) {
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

function runSimulation() {
	if (!simRunning) {
		simRunning = true;

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
	}
}

function updateValues() {
    document.getElementById('startBtn').innerHTML =
        simRunning ? 'Please wait: ' + (simulationCount - simNum) : 'Start calculation';
    document.getElementById('edResAvg').value = 100 * Math.round(totalPoints / simNum);
    document.getElementById('edResMin').value = minPoints * 100;
    document.getElementById('edResMax').value = maxPoints * 100;
    for (let i = 0; i < elCount; i++) {
        document.getElementById('avRes' + i).innerHTML = (tierDrop[i] / simNum).toFixed(1);
    }
}


window.init = init;
window.storeLocal = storeLocal;
window.updateValues = updateValues;
window.runSimulation = runSimulation;
