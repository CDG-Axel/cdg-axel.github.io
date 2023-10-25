let simNum;
let simRunning = false;
let targetPoints;
let firstTier;
let simulationCount;


const totalSims = 100000;
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


function runSimulation() {
	if (!(simRunning)) {
		simRunning = true;

		targetPoints = parseInt(document.getElementById('edTargetPoints').value);
        firstTier = parseInt(document.getElementById('edFirstTier').value);
        simulationCount = parseInt(document.getElementById('edSimulationCount').value);

		setTimeout(simulationBlock, 1);
	}
}

function simulationStep() {

}

function simulationBlock() {
	if (simNum < simulationCount) {
	    // one block is 1000 simulation steps
		for (let i = 0; i < 1000; i++) {
			simNum++;
			simulationStep();
		}
        // update and schedule next block
        updateValues();
		setTimeout(simulationBlock, 1);
	} else {
		simRunning = false;
	}
}


function updateValues() {
//	let expValue = 0;
//    document.getElementById('value' + i).innerHTML = 0;
//
//	for (let i = 1; i <= 8; i++) {
//	    document.getElementById('value' + i).innerHTML = expValue;
//	}
//
//		// update results and expected values
//		let percent;
//		for (let i = 0; i < 9; i++) {
//			percent = 100.0 * arrResults[i] / totalSims;
//			arrBins[i].innerHTML = percent.toFixed(3) + '%&nbsp;';
//
//			if (Math.round(percent) < 1) {
//				arrBins[i].style.width = '1%';
//			} else {
//				arrBins[i].style.width = Math.round(percent) + '%';
//			}
//		}
}


window.init = init;
window.storeLocal = storeLocal;
window.updateValues = updateValues;
window.runSimulation = runSimulation;
