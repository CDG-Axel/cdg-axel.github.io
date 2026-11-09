/**
 * Запуск модели перекрёстка в Node. Здесь живёт всё, что связано с вводом-
 * выводом и сборкой данных: чтение конфигурации, построение таблиц модуля A,
 * кеш расчётных данных в файлах, отчёт. Расчётные модули (cr_capacity.js,
 * cr_cycle.js) ничего не читают и не пишут и не вызывают друг друга.
 *
 * На верхнем уровне только импорты и глобальные переменные (пути к файлам),
 * весь код находится в функциях.
 *
 * Источник исходных данных один: crossroad_config.json.
 * Расчётные данные кешируются в отдельных файлах (cr_tables.json) и не
 * содержат исходных данных.
 *
 * Правило кеша для каждой функции вида getXxx(config, rebuild):
 *   - rebuild = false: пытаемся прочитать данные из файла;
 *   - не получилось или rebuild = true: считаем, сохраняем в файл;
 *   - возвращаем данные.
 * После изменения конфигурации или расчётных модулей вызывайте с rebuild = true.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { buildDischargeTable } from './cr_capacity.js';
import { evaluatePlan, findMinimalPlan, validateCycleConfig } from './cr_cycle.js';

// Файлы лежат рядом с модулем, независимо от текущей папки запуска.
const CONFIG_PATH = new URL('./crossroad_config.json', import.meta.url);
const TABLES_PATH = new URL('./cr_tables.json', import.meta.url);

// ---------------------------------------------------------------------------
// Файлы и кеш
// ---------------------------------------------------------------------------

async function readJsonOrNull(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null; // нет файла или он повреждён: кеша нет
  }
}

async function writeJson(path, data) {
  await writeFile(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * Общее правило кеша: прочитать из файла, а если не вышло или rebuild,
 * то вычислить, сохранить и вернуть.
 */
async function cached(path, rebuild, compute) {
  if (!rebuild) {
    const data = await readJsonOrNull(path);
    if (data !== null) {
      return data;
    }
  }
  const data = await compute();
  await writeJson(path, data);
  return data;
}

// ---------------------------------------------------------------------------
// Исходные данные
// ---------------------------------------------------------------------------

/** Читает и проверяет конфигурацию перекрёстка. */
export async function loadConfig() {
  const config = JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
  return validateCycleConfig(config);
}

// ---------------------------------------------------------------------------
// Таблицы пропускной способности (модуль A)
// ---------------------------------------------------------------------------

/**
 * Считает таблицы по всем группам полос из конфигурации. Возвращает
 * { "<id группы>": [ { greenDurationS, mean, min, max, p5, p95 }, ... ] }.
 * Параметры проверяет сам модуль A.
 */
function computeCapacityTables(config) {
  const params = { ...config.vehicle, yellowDurationS: config.signal.yellowS };
  const options = {
    minGreenS: config.signal.greenMinS,
    maxGreenS: config.signal.greenMaxS,
    trials: config.tables?.trials,
    seed: config.tables?.seed,
  };

  const tables = {};
  for (const [id, laneGroup] of Object.entries(config.laneGroups)) {
    tables[id] = buildDischargeTable(laneGroup, params, options);
  }
  return tables;
}

/**
 * Таблицы пропускной способности: из файла или, если его нет либо rebuild,
 * пересчитанные и сохранённые.
 */
export async function getCapacityTables(config, rebuild = false) {
  return cached(TABLES_PATH, rebuild, () => computeCapacityTables(config));
}

// ---------------------------------------------------------------------------
// Проверки и форматирование отчёта
// ---------------------------------------------------------------------------

/** Среднее число машин в таблице не должно убывать с ростом зелёного. */
export function isTableMonotonic(table) {
  for (let i = 1; i < table.length; i++) {
    if (table[i].mean < table[i - 1].mean - 1e-9) {
      return false;
    }
  }
  return true;
}

function fmt(value, digits = 1) {
  return value.toFixed(digits);
}

function formatEvaluation(evaluation) {
  const head =
    'Фаза'.padEnd(12) +
    'Зелёный'.padStart(9) +
    'В цикле'.padStart(9) +
    'Машин/цикл (p5–p95)'.padStart(24) +
    'Машин/час'.padStart(11) +
    'Эфф. зелёный'.padStart(14) +
    'Ожидание'.padStart(10);

  const lines = [`Длина цикла: ${fmt(evaluation.cycleS, 0)} с`, head];
  for (const p of evaluation.phases) {
    const perCycle = `${fmt(p.vehiclesPerCycle.mean)} (${p.vehiclesPerCycle.p5}–${p.vehiclesPerCycle.p95})`;
    lines.push(
      p.id.padEnd(12) +
        `${fmt(p.greenS, 0)} с`.padStart(9) +
        `${fmt(p.phaseLengthS, 0)} с`.padStart(9) +
        perCycle.padStart(24) +
        fmt(p.vehiclesPerHour.mean, 0).padStart(11) +
        `${fmt(p.effectiveGreenS)} с`.padStart(14) +
        `${fmt(p.meanWaitS)} с`.padStart(10)
    );
  }
  lines.push(
    `Итого: ${fmt(evaluation.total.vehiclesPerHour, 0)} машин/час, ` +
      `среднее ожидание при насыщенном потоке ${fmt(evaluation.total.meanWaitS)} с`
  );
  return lines.join('\n');
}

function formatMinimalPlan(result) {
  if (!result.feasible) {
    return (
      `Требуемая пропускная способность недостижима: фаза "${result.limitingPhaseId}" ` +
      `должна пропускать ${fmt(result.requiredVehiclesPerCycle)} машин за цикл ${fmt(result.cycleS, 0)} с, ` +
      `а при максимальном зелёном успевает ${fmt(result.maxVehiclesPerCycle)}.`
    );
  }
  const greens = Object.entries(result.greens)
    .map(([id, g]) => `${id}=${g} с`)
    .join(', ');
  return (
    `Минимальный план (${result.statistic}): ${greens}, цикл ${fmt(result.cycleS, 0)} с\n` +
    formatEvaluation(result.evaluation)
  );
}

// ---------------------------------------------------------------------------
// Точка входа
// ---------------------------------------------------------------------------

/**
 * Считает текущий план светофора из конфигурации и печатает отчёт.
 * Если в конфигурации есть demandVehPerHour, дополнительно ищет минимальный
 * план под этот спрос.
 *
 * @param {{rebuild?: boolean}} [options] - rebuild: пересчитать таблицы, не
 *   используя кеш
 */
export async function main({ rebuild = false } = {}) {
  const config = await loadConfig();
  const tables = await getCapacityTables(config, rebuild);

  console.log(`Перекрёсток: ${config.name ?? '(без названия)'}`);
  for (const [id, table] of Object.entries(tables)) {
    const mark = isTableMonotonic(table) ? '✓ монотонна' : '⚠ немонотонна';
    console.log(`  таблица ${id}: ${table.length} значений, ${mark}`);
  }

  const evaluation = evaluatePlan(config, tables);
  console.log('\nТекущий план:');
  console.log(formatEvaluation(evaluation));

  let minimalPlan = null;
  if (config.demandVehPerHour) {
    minimalPlan = findMinimalPlan(config, tables, config.demandVehPerHour);
    console.log('\nМинимальный план под заданный спрос:');
    console.log(formatMinimalPlan(minimalPlan));
  }

  return { config, tables, evaluation, minimalPlan };
}

await main({ rebuild: true });