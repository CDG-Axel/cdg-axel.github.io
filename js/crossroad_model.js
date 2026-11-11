/**
 * Запуск модели перекрёстка в Node. Здесь живёт всё, что связано с вводом-
 * выводом и сборкой данных: чтение конфигурации, построение таблиц модуля A,
 * кеш расчётных данных в файлах, отчёт. Расчётные модули (cr_capacity.js,
 * cr_cycle.js) ничего не читают и не пишут, ничего не проверяют и не вызывают
 * друг друга. Конфигурация проверяется один раз после загрузки
 * (cr_validation.js).
 *
 * На верхнем уровне импорты, глобальные переменные (пути к файлам) и единственный
 * вызов main() в самом низу файла; весь остальной код находится в функциях.
 * Импорт этого модуля запускает расчёт с пересчётом таблиц.
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
import { evaluatePlan, findMinimalPlan } from './cr_cycle.js';
import { validateConfig } from './cr_validation.js';

// JSON-файлы лежат в папке ../json относительно этого модуля (папка должна
// существовать), независимо от текущей папки запуска.
const CONFIG_PATH = new URL('../json/crossroad_config.json', import.meta.url);
const TABLES_PATH = new URL('../json/cr_tables.json', import.meta.url);

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

/** Читает конфигурацию перекрёстка и проверяет её (cr_validation.js). */
export async function loadConfig() {
  const config = JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
  return validateConfig(config);
}

// ---------------------------------------------------------------------------
// Таблицы пропускной способности (модуль A)
// ---------------------------------------------------------------------------

/**
 * Считает таблицы по каждой группе полос из конфигурации (полосы, скорость и
 * диапазон зелёного берутся из группы). Возвращает
 * { "<id группы>": [ { greenDurationS, mean, min, max, p5, p95 }, ... ] }.
 */
function computeCapacityTables(config) {
  const tables = {};
  for (const [id, laneGroup] of Object.entries(config.laneGroups)) {
    tables[id] = buildDischargeTable(laneGroup, config.vehicle, {
      minGreenS: laneGroup.greenMinS,
      maxGreenS: laneGroup.greenMaxS,
      trials: config.tables?.trials,
      seed: config.tables?.seed,
    });
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
  const tabs = [12, 9, 9, 24, 11, 14, 10];
  const head = ['Фаза', 'Зелёный', 'В цикле', 'Машин/цикл (p5–p95)', 'Машин/час', 'Эфф. зелёный', 'Ожидание'];
  const padded = arr => arr.map((v, i) => v[i? 'padStart': 'padEnd'](tabs[i])).join('');

  const lines = [padded(head)];
  for (const p of evaluation.phases) {
    lines.push(padded([
      p.id,
      `${fmt(p.greenS, 0)} с`,
      `${fmt(p.phaseLengthS, 0)} с`,
      `${fmt(p.vehiclesPerCycle.mean)} (${p.vehiclesPerCycle.p5}–${p.vehiclesPerCycle.p95})`,
      fmt(p.vehiclesPerHour.mean, 0),
      `${fmt(p.effectiveGreenS)} с`,
      `${fmt(p.meanWaitS)} с`
    ]));
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
  return `Длина цикла: ${fmt(result.cycleS, 0)} с\n` + formatEvaluation(result.evaluation);
}

// ---------------------------------------------------------------------------
// Точка входа
// ---------------------------------------------------------------------------

/**
 * Считает текущий план светофора из конфигурации и печатает отчёт, затем для
 * каждого профиля из optimizationProfiles ищет минимальный план под его цели.
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
  console.log(`\nТекущий план (длина цикла: ${fmt(evaluation.cycleS, 0)} с):`);
  console.log(formatEvaluation(evaluation));

  const plans = {};
  for (const [name, targets] of Object.entries(config.optimizationProfiles)) {
    plans[name] = findMinimalPlan(config, tables, targets);
    const goals = Object.entries(targets).map(([id, v]) => `${id}=${v}`).join(', ');
    console.log(`\nПрофиль ${name} (цели, маш/ч: ${goals}):`);
    console.log(formatMinimalPlan(plans[name]));
  }

  return { config, tables, evaluation, plans };
}

// ---------------------------------------------------------------------------
// Запуск
// ---------------------------------------------------------------------------

await main({ rebuild: true });
