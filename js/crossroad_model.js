import { buildDischargeTable, EXAMPLE_LANE_GROUPS, DEFAULT_PARAMS } from './intersectionCapacity.js';

function printSample(label, table) {
  console.log(`\n=== ${label} ===`);
  console.log('N(с)\tmean\tp5\tp95\tmin\tmax');
  const sampleNs = [15, 20, 25, 30, 40, 55, 65, 75];
  for (const row of table) {
    if (sampleNs.includes(row.greenDurationS)) {
      console.log(
        `${row.greenDurationS}\t${row.mean.toFixed(2)}\t${row.p5}\t${row.p95}\t${row.min}\t${row.max}`
      );
    }
  }
}

const t0 = Date.now();

const mainTable = buildDischargeTable(EXAMPLE_LANE_GROUPS.mainRoadDirection, DEFAULT_PARAMS, { trials: 1000 });
const minorTable = buildDischargeTable(EXAMPLE_LANE_GROUPS.minorRoadDirection, DEFAULT_PARAMS, { trials: 1000 });

const elapsed = Date.now() - t0;

printSample('Главная дорога (2 полосы, 60 км/ч)', mainTable);
printSample('Второстепенная дорога (1 полоса, 40 км/ч)', minorTable);

console.log(`\nВремя расчёта обеих таблиц (2 x 61 значений N x 1000 прогонов): ${elapsed} мс`);

// Проверка монотонности (M(N) не должно убывать с ростом N)
function checkMonotonic(table, label) {
  for (let i = 1; i < table.length; i++) {
    if (table[i].mean < table[i - 1].mean - 1e-9) {
      console.log(`⚠ ${label}: немонотонность на N=${table[i].greenDurationS}`);
      return;
    }
  }
  console.log(`✓ ${label}: mean(N) монотонно не убывает`);
}
checkMonotonic(mainTable, 'Главная дорога');
checkMonotonic(minorTable, 'Второстепенная дорога');
