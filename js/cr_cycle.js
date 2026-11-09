/**
 * Модуль B: расчёт цикла светофора по конфигурации перекрёстка и таблицам
 * пропускной способности.
 *
 * ПРИНЦИПЫ МОДУЛЯ:
 *  - Нет ввода-вывода, нет собственных данных и значений по умолчанию.
 *  - Не импортирует другие модули и не зависит от Node (годится для браузера).
 *  - Таблицы пропускной способности приходят аргументом как обычные данные:
 *    их строит и хранит вызывающий код (см. crossroad_model.js).
 *
 * ---------------------------------------------------------------------------
 * КОНФИГУРАЦИЯ (разделы, которые использует этот модуль)
 * ---------------------------------------------------------------------------
 * {
 *   "signal": {
 *     "yellowS": 5,       // жёлтый после каждого зелёного, с
 *     "greenMinS": 15,    // минимальный зелёный, с (целое)
 *     "greenMaxS": 75     // максимальный зелёный, с (целое)
 *   },
 *   "laneGroups": { "<id>": { ... } },   // группы полос (содержимое проверяет
 *                                        // и использует модуль A)
 *   "phases": [           // фазы в порядке следования в цикле
 *     { "id": "...", "name": "...", "laneGroup": "<id группы>",
 *       "greenS": 55,           // зелёный, с
 *       "allRedAfterS": 0 }     // общий красный после жёлтого этой фазы, с
 *   ],
 *   "optimization": { "greenStepS": 5 },       // необязательно
 *   "demandVehPerHour": { "<id фазы>": 900 }   // необязательно: требуемая
 *                                              // пропускная способность, маш/ч
 * }
 *
 * ТАБЛИЦЫ (аргумент tables)
 * { "<id группы>": [ { greenDurationS, mean, min, max, p5, p95 }, ... ] }
 * Строки идут подряд с шагом 1 с. Диапазон должен покрывать
 * signal.greenMinS..greenMaxS.
 *
 * ---------------------------------------------------------------------------
 * МОДЕЛЬ ОЖИДАНИЯ
 * ---------------------------------------------------------------------------
 * Предельный (насыщенный) поток: за цикл подъезжает ровно столько машин,
 * сколько фаза успевает пропустить, то есть M(g) из таблицы. Прибытие
 * равномерное. Из таблицы оцениваем поток насыщения s (наклон M(N) на верхней
 * половине таблицы) и эффективный зелёный g_e = M(g) / s. Тогда среднее
 * ожидание по всем машинам фазы (формула равномерной задержки Вебстера при
 * степени насыщения x = 1) равно эффективному красному пополам:
 *     d = (C - g_e) / 2,   C = длина цикла.
 * Пропускная способность за час = M(g) * 3600 / C.
 */

const STATISTICS = ['mean', 'p5', 'p95'];

// ---------------------------------------------------------------------------
// Проверка конфигурации
// ---------------------------------------------------------------------------

function isPositiveNumber(x) {
  return typeof x === 'number' && Number.isFinite(x) && x > 0;
}

function isPositiveInteger(x) {
  return Number.isInteger(x) && x > 0;
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Проверяет разделы конфигурации, которые использует этот модуль, и бросает
 * Error со списком всех найденных проблем. Возвращает конфигурацию.
 */
export function validateCycleConfig(config) {
  if (config === null || typeof config !== 'object') {
    throw new Error('Конфигурация перекрёстка: ожидается объект');
  }
  const errors = [];

  const signal = config.signal ?? {};
  if (!isPositiveNumber(signal.yellowS)) {
    errors.push('signal.yellowS: положительное число (секунды жёлтого)');
  }
  if (!isPositiveInteger(signal.greenMinS)) {
    errors.push('signal.greenMinS: положительное целое число секунд');
  }
  if (!isPositiveInteger(signal.greenMaxS) || signal.greenMaxS < signal.greenMinS) {
    errors.push('signal.greenMaxS: целое число секунд, не меньше greenMinS');
  }

  const groups = config.laneGroups;
  const hasGroups = groups !== null && typeof groups === 'object' && Object.keys(groups).length > 0;
  if (!hasGroups) {
    errors.push('laneGroups: нужен объект хотя бы с одной группой полос');
  }

  const phaseIds = new Set();
  if (!Array.isArray(config.phases) || config.phases.length === 0) {
    errors.push('phases: нужен непустой массив фаз');
  } else {
    config.phases.forEach((phase, i) => {
      const where = `phases[${i}]`;
      if (typeof phase?.id !== 'string' || phase.id === '') {
        errors.push(`${where}.id: непустая строка`);
      } else if (phaseIds.has(phase.id)) {
        errors.push(`${where}.id: "${phase.id}" повторяется`);
      } else {
        phaseIds.add(phase.id);
      }
      if (!hasGroups || !hasOwn(groups, phase?.laneGroup)) {
        errors.push(`${where}.laneGroup: "${phase?.laneGroup}" нет среди laneGroups`);
      }
      if (
        !Number.isFinite(phase?.greenS) ||
        phase.greenS < signal.greenMinS ||
        phase.greenS > signal.greenMaxS
      ) {
        errors.push(`${where}.greenS: число в диапазоне signal.greenMinS..greenMaxS`);
      }
      if (!Number.isFinite(phase?.allRedAfterS) || phase.allRedAfterS < 0) {
        errors.push(`${where}.allRedAfterS: неотрицательное число`);
      }
    });
  }

  if (
    config.optimization?.greenStepS !== undefined &&
    !isPositiveInteger(config.optimization.greenStepS)
  ) {
    errors.push('optimization.greenStepS: положительное целое число');
  }

  for (const [id, value] of Object.entries(config.demandVehPerHour ?? {})) {
    if (!phaseIds.has(id)) {
      errors.push(`demandVehPerHour.${id}: такой фазы нет`);
    } else if (!Number.isFinite(value) || value < 0) {
      errors.push(`demandVehPerHour.${id}: неотрицательное число`);
    }
  }

  if (errors.length > 0) {
    throw new Error('Некорректная конфигурация перекрёстка:\n - ' + errors.join('\n - '));
  }
  return config;
}

// ---------------------------------------------------------------------------
// Работа с таблицами
// ---------------------------------------------------------------------------

function tableFor(tables, groupId) {
  const table = tables?.[groupId];
  if (!Array.isArray(table) || table.length === 0) {
    throw new Error(`В таблицах нет данных для группы полос "${groupId}"`);
  }
  return table;
}

/**
 * Число машин за зелёный greenS по таблице. statistic: 'mean' | 'p5' | 'p95'.
 * Для нецелых greenS значение интерполируется линейно.
 */
export function lookupVehicles(table, greenS, statistic = 'mean') {
  if (!STATISTICS.includes(statistic)) {
    throw new Error(`Неизвестная статистика "${statistic}" (допустимо: ${STATISTICS.join(', ')})`);
  }
  const first = table[0].greenDurationS;
  const last = table[table.length - 1].greenDurationS;
  if (!(greenS >= first && greenS <= last)) {
    throw new RangeError(`Зелёный ${greenS} с вне диапазона таблицы ${first}..${last} с`);
  }
  const lo = Math.floor(greenS);
  const hi = Math.ceil(greenS);
  const rowLo = table[lo - first];
  if (rowLo?.greenDurationS !== lo) {
    throw new Error('Таблица должна идти подряд с шагом 1 с');
  }
  if (lo === hi) {
    return rowLo[statistic];
  }
  const rowHi = table[hi - first];
  return rowLo[statistic] + (rowHi[statistic] - rowLo[statistic]) * (greenS - lo);
}

/**
 * Оценивает поток насыщения и потери на старте по таблице: линейная регрессия
 * mean(N) на верхней половине таблицы, где разгон уже закончился.
 * mean(N) ≈ s * (N - startLoss).
 */
export function fitSaturation(table) {
  const points = table.slice(Math.floor(table.length / 2));
  const n = points.length;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const row of points) {
    const x = row.greenDurationS;
    const y = row.mean;
    sx += x;
    sy += y;
    sxx += x * x;
    sxy += x * y;
  }
  const denom = n * sxx - sx * sx;
  if (n < 2 || denom === 0) {
    throw new Error('Недостаточно точек таблицы для оценки потока насыщения');
  }
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  if (!(slope > 0)) {
    throw new Error('Поток насыщения по таблице не положителен: проверьте таблицу и диапазон зелёного');
  }
  return { saturationFlowVehPerS: slope, startLossS: -intercept / slope };
}

// ---------------------------------------------------------------------------
// Расчёт плана светофора
// ---------------------------------------------------------------------------

function resolveGreens(config, greensOverride) {
  const ids = new Set(config.phases.map((p) => p.id));
  for (const id of Object.keys(greensOverride)) {
    if (!ids.has(id)) {
      throw new Error(`Неизвестная фаза в greensOverride: "${id}"`);
    }
  }
  return Object.fromEntries(config.phases.map((p) => [p.id, greensOverride[p.id] ?? p.greenS]));
}

/** Длина цикла: сумма (зелёный + жёлтый + all-red) по всем фазам. */
export function cycleLengthS(config, greens) {
  let total = 0;
  for (const phase of config.phases) {
    total += greens[phase.id] + config.signal.yellowS + phase.allRedAfterS;
  }
  return total;
}

/**
 * Считает показатели плана светофора при предельном (насыщенном) потоке.
 *
 * @param {object} config - конфигурация перекрёстка
 * @param {object} tables - таблицы пропускной способности по группам полос
 * @param {object} [greensOverride] - { idФазы: зелёный_с }: оценить другой план,
 *   не меняя конфигурацию; фазы, которых здесь нет, берутся из конфигурации
 * @returns {{cycleS:number, phases:object[], total:object}}
 */
export function evaluatePlan(config, tables, greensOverride = {}) {
  validateCycleConfig(config);

  const greens = resolveGreens(config, greensOverride);
  const cycleS = cycleLengthS(config, greens);
  const cyclesPerHour = 3600 / cycleS;
  const yellowS = config.signal.yellowS;

  const phases = config.phases.map((phase) => {
    const table = tableFor(tables, phase.laneGroup);
    const greenS = greens[phase.id];

    const perCycle = {
      mean: lookupVehicles(table, greenS, 'mean'),
      p5: lookupVehicles(table, greenS, 'p5'),
      p95: lookupVehicles(table, greenS, 'p95'),
    };
    const { saturationFlowVehPerS, startLossS } = fitSaturation(table);
    const effectiveGreenS = perCycle.mean / saturationFlowVehPerS;
    const effectiveRedS = Math.max(0, cycleS - effectiveGreenS);

    return {
      id: phase.id,
      name: phase.name ?? phase.id,
      laneGroup: phase.laneGroup,
      greenS,
      yellowS,
      allRedAfterS: phase.allRedAfterS,
      phaseLengthS: greenS + yellowS + phase.allRedAfterS,
      vehiclesPerCycle: perCycle,
      vehiclesPerHour: {
        mean: perCycle.mean * cyclesPerHour,
        p5: perCycle.p5 * cyclesPerHour,
        p95: perCycle.p95 * cyclesPerHour,
      },
      saturationFlowVehPerHour: saturationFlowVehPerS * 3600,
      startLossS,
      effectiveGreenS,
      effectiveRedS,
      meanWaitS: effectiveRedS / 2,
    };
  });

  // Итоги только по среднему: сумма перцентилей фаз не равна перцентилю суммы.
  const totalPerCycle = phases.reduce((sum, p) => sum + p.vehiclesPerCycle.mean, 0);
  const weightedWait = phases.reduce((sum, p) => sum + p.vehiclesPerCycle.mean * p.meanWaitS, 0);

  return {
    cycleS,
    phases,
    total: {
      vehiclesPerCycle: totalPerCycle,
      vehiclesPerHour: totalPerCycle * cyclesPerHour,
      meanWaitS: totalPerCycle > 0 ? weightedWait / totalPerCycle : 0,
    },
  };
}

/**
 * Обратная задача: найти самые короткие зелёные, при которых каждая фаза
 * пропускает требуемое число машин в час.
 *
 * Требуемое число машин за цикл зависит от длины цикла, а длина цикла от
 * зелёных, поэтому решаем итерацией от минимальных зелёных. Зелёные только
 * растут, так что итерация даёт наименьший из подходящих планов на сетке
 * допустимых значений либо показывает, что требование невыполнимо.
 *
 * @param {object} config - конфигурация перекрёстка
 * @param {object} tables - таблицы пропускной способности по группам полос
 * @param {object} demandVehPerHour - { idФазы: машин/час }; фаза без записи
 *   считается без требований и получает минимальный зелёный
 * @param {object} [options] - { statistic: 'mean' | 'p5' | 'p95' (по умолчанию
 *   'mean'), greenStepS: шаг сетки (иначе optimization.greenStepS из конфигурации) }
 */
export function findMinimalPlan(config, tables, demandVehPerHour, options = {}) {
  validateCycleConfig(config);

  const demand = demandVehPerHour ?? {};
  const phaseIds = new Set(config.phases.map((p) => p.id));
  for (const [id, value] of Object.entries(demand)) {
    if (!phaseIds.has(id)) {
      throw new Error(`Спрос задан для неизвестной фазы "${id}"`);
    }
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Спрос для фазы "${id}" должен быть неотрицательным числом`);
    }
  }

  const statistic = options.statistic ?? 'mean';
  const stepS = options.greenStepS ?? config.optimization?.greenStepS;
  if (!isPositiveInteger(stepS)) {
    throw new Error('Не задан шаг сетки: optimization.greenStepS в конфигурации или options.greenStepS');
  }

  const { greenMinS, greenMaxS } = config.signal;
  const grid = [];
  for (let g = greenMinS; g <= greenMaxS; g += stepS) {
    grid.push(g);
  }

  let greens = Object.fromEntries(config.phases.map((p) => [p.id, grid[0]]));
  const maxIterations = grid.length * config.phases.length + 2;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const cycleS = cycleLengthS(config, greens);
    const next = {};

    for (const phase of config.phases) {
      const table = tableFor(tables, phase.laneGroup);
      const requiredPerCycle = ((demand[phase.id] ?? 0) * cycleS) / 3600;
      const green = grid.find((g) => lookupVehicles(table, g, statistic) >= requiredPerCycle);
      if (green === undefined) {
        return {
          feasible: false,
          statistic,
          limitingPhaseId: phase.id,
          requiredVehiclesPerCycle: requiredPerCycle,
          maxVehiclesPerCycle: lookupVehicles(table, grid[grid.length - 1], statistic),
          cycleS,
          greens,
        };
      }
      next[phase.id] = green;
    }

    if (config.phases.every((p) => next[p.id] === greens[p.id])) {
      return {
        feasible: true,
        statistic,
        greens,
        cycleS,
        evaluation: evaluatePlan(config, tables, greens),
      };
    }
    greens = next;
  }

  throw new Error('Поиск минимального плана не завершился: проверьте конфигурацию');
}
