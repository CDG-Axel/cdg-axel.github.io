/**
 * Модуль A: физическая (кинематическая) модель разгона очереди автомобилей
 * на одной полосе перекрёстка и расчёт того, сколько машин успевает проехать
 * стоп-линию за заданное время зелёного сигнала (+ время жёлтого).
 *
 * КЛЮЧЕВЫЕ ДОПУЩЕНИЯ (v1):
 *  - Полосы одной группы (например, 2 полосы главной дороги) разгружаются
 *    независимо и параллельно — взаимовлияния между полосами нет.
 *  - Между машинами в очереди НЕ моделируется ограничение "не мочь обогнать/
 *    догнать впереди идущую" (кроме структурного случая, когда впереди стоящая
 *    машина не успевает проехать вообще — тогда все машины позади неё в этом
 *    цикле тоже не проезжают, т.к. подпирают её в очереди).
 *  - Трамваи в этом модуле не моделируются: их проезд не является "очередью,
 *    которая разгоняется" — это отдельная сущность с расписанием, которая
 *    учитывается на уровне модуля B / стратегии фаз.
 *  - Манёвры поворота не штрафуются отдельно (нет доп. задержки на поворот).
 *
 * ЛОГИКА ПОДСЧЁТА "ПРОЕХАВШЕЙ" МАШИНЫ:
 *  - Если передний бампер машины пересекает стоп-линию до конца зелёного (N) —
 *    машина точно посчитана.
 *  - Если к моменту N машина ещё не пересекла линию, проверяется "дилемма-зона":
 *    может ли машина безопасно остановиться до линии (с учётом времени реакции
 *    и комфортного замедления)? Если НЕ может — она обязана продолжить движение
 *    и пересечь линию до конца жёлтого (N + 5с), и тогда тоже считается проехавшей.
 *    Если может — она останавливается и в этом цикле не считается (уходит в
 *    очередь следующего цикла — это уже забота модуля B).
 *
 * Все "разбросы" параметров (длина, ускорение, замедление, реакция) заданы
 * как равномерное распределение ±% от базового значения. Максимальная скорость
 * каждого водителя случайна в диапазоне [лимit, лимit + нештрафуемый порог] —
 * это отражает то, что разные водители по-разному трактуют "порог".
 *
 * ПРИНЦИПЫ МОДУЛЯ:
 *  - Нет ввода-вывода, нет собственных данных и значений по умолчанию: все
 *    параметры приходят аргументами (из конфигурации перекрёстка).
 *  - Не зависит от других модулей и от Node, поэтому подходит и для браузера.
 *  - Входные данные проверяются (validateParams и проверки в публичных
 *    функциях): при ошибке бросается Error со списком проблем.
 */

// ---------------------------------------------------------------------------
// Входные данные: состав параметров и проверка
// ---------------------------------------------------------------------------
//
// Параметры машин (params) задаются снаружи, значений по умолчанию нет.
// Правила для значений:
//   positive    — число больше 0
//   nonNegative — число не меньше 0
//   fraction    — число от 0 (включительно) до 1 (не включая): разброс ±доля

const PARAM_RULES = {
  reactionTimeS: 'positive',             // время реакции водителя, с
  reactionTimeDeviation: 'fraction',     // разброс реакции (0.35 = ±35%)
  accelerationMs2: 'positive',           // ускорение разгона, м/с²
  accelerationDeviation: 'fraction',
  decelerationMs2: 'positive',           // комфортное (не паническое) замедление, м/с²
  decelerationDeviation: 'fraction',
  carLengthM: 'positive',                // длина машины, м
  carLengthDeviation: 'fraction',
  standingGapFraction: 'nonNegative',    // зазор между стоящими машинами, доля длины машины
  stopLineOffsetM: 'nonNegative',        // отступ первой машины от стоп-линии/перехода, м
  stopLineOffsetDeviation: 'fraction',
  nonPunishableThresholdKmh: 'nonNegative', // макс. скорость водителя = лимит + uniform(0, порог), км/ч
  yellowDurationS: 'positive',           // длительность жёлтого сигнала, с
};

const RULE_TEXT = {
  positive: 'число больше 0',
  nonNegative: 'число не меньше 0',
  fraction: 'число от 0 до 1 (не включая 1)',
};

const MAX_QUEUE_PER_LANE = 120; // защитный предел длины очереди (реалистично нужно куда меньше)

function isNumber(x) {
  return typeof x === 'number' && Number.isFinite(x);
}

function satisfiesRule(value, rule) {
  if (!isNumber(value)) return false;
  if (rule === 'positive') return value > 0;
  if (rule === 'nonNegative') return value >= 0;
  return value >= 0 && value < 1;
}

/**
 * Проверяет параметры машин: присутствуют все нужные, значения допустимы,
 * лишних ключей нет (так ловятся опечатки). Бросает Error со списком проблем.
 */
export function validateParams(params) {
  if (params === null || typeof params !== 'object') {
    throw new Error('Параметры машин: ожидается объект');
  }
  const errors = [];
  for (const [key, rule] of Object.entries(PARAM_RULES)) {
    if (!satisfiesRule(params[key], rule)) {
      errors.push(`${key}: ${RULE_TEXT[rule]}`);
    }
  }
  for (const key of Object.keys(params)) {
    if (!Object.prototype.hasOwnProperty.call(PARAM_RULES, key)) {
      errors.push(`${key}: неизвестный параметр`);
    }
  }
  if (errors.length > 0) {
    throw new Error('Некорректные параметры машин:\n - ' + errors.join('\n - '));
  }
}

function validateInputs(laneGroup, params, options) {
  validateParams(params);
  const errors = [];
  if (!isNumber(laneGroup?.speedLimitKmh) || laneGroup.speedLimitKmh <= 0) {
    errors.push('laneGroup.speedLimitKmh: число больше 0');
  }
  if (!Number.isInteger(laneGroup?.lanes) || laneGroup.lanes <= 0) {
    errors.push('laneGroup.lanes: целое число больше 0');
  }
  if (!Number.isInteger(options?.trials) || options.trials <= 0) {
    errors.push('options.trials: целое число больше 0');
  }
  const seed = options?.seed;
  if (seed !== undefined && seed !== null && !Number.isInteger(seed)) {
    errors.push('options.seed: целое число, null или не задан');
  }
  if (errors.length > 0) {
    throw new Error('Некорректные входные данные модуля A:\n - ' + errors.join('\n - '));
  }
}

// ---------------------------------------------------------------------------
// Вспомогательные функции
// ---------------------------------------------------------------------------

function kmhToMs(kmh) {
  return kmh / 3.6;
}

/** Простой детерминированный PRNG (mulberry32) — удобно для воспроизводимости тестов. */
export function createSeededRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function uniformDeviate(base, deviationFraction, rng) {
  const delta = base * deviationFraction;
  return base - delta + rng() * 2 * delta;
}

function uniformRange(min, max, rng) {
  return min + rng() * (max - min);
}

/** Генерирует случайные физические параметры одной машины. */
function generateVehicle(laneGroup, params, rng) {
  const maxSpeedKmh =
    laneGroup.speedLimitKmh + uniformRange(0, params.nonPunishableThresholdKmh, rng);

  return {
    lengthM: uniformDeviate(params.carLengthM, params.carLengthDeviation, rng),
    accelerationMs2: uniformDeviate(params.accelerationMs2, params.accelerationDeviation, rng),
    decelerationMs2: uniformDeviate(params.decelerationMs2, params.decelerationDeviation, rng),
    reactionTimeS: uniformDeviate(params.reactionTimeS, params.reactionTimeDeviation, rng),
    stopLineOffsetM: uniformDeviate(params.stopLineOffsetM, params.stopLineOffsetDeviation, rng),
    maxSpeedMs: kmhToMs(maxSpeedKmh),
  };
}

// ---------------------------------------------------------------------------
// Ядро: симуляция разгона очереди на ОДНОЙ полосе
// ---------------------------------------------------------------------------

/**
 * Симулирует разгон очереди машин на одной полосе за один "прогон" (одна
 * случайная реализация очереди) и возвращает число машин, успевших проехать
 * стоп-линию за greenDurationS секунд зелёного + жёлтый (params.yellowDurationS).
 *
 * @param {number} greenDurationS - длительность зелёного сигнала, с
 * @param {{speedLimitKmh:number}} laneGroup - параметры полосы (скоростной лимит)
 * @param {object} params - физические параметры машин (состав: см. PARAM_RULES)
 * @param {function} rng - функция-генератор случайных чисел в [0,1)
 * @returns {number} количество проехавших машин (целое)
 */
export function simulateSingleLane(greenDurationS, laneGroup, params, rng) {
  const horizon = greenDurationS + params.yellowDurationS;

  let cumulativeStartDelay = 0; // время начала движения текущей машины от начала зелёного
  let prevFrontPos = 0;
  let prevLength = 0;
  let count = 0;

  for (let i = 0; i < MAX_QUEUE_PER_LANE; i++) {
    const v = generateVehicle(laneGroup, params, rng);

    // Каскадная реакция: машина реагирует на трогание идущей впереди
    // (первая — на сам сигнал светофора).
    cumulativeStartDelay += v.reactionTimeS;
    const startDelay = cumulativeStartDelay;

    // Позиция переднего бампера относительно стоп-линии (линия = 0) в момент t=0.
    let frontPos;
    if (i === 0) {
      frontPos = -v.stopLineOffsetM; // первая машина стоит с отступом от линии/перехода
    } else {
      // зазор выбирает едущий сзади, исходя из своей длины
      const gapStopped = params.standingGapFraction * v.lengthM;
      frontPos = prevFrontPos - prevLength - gapStopped;
    }

    const tAcc = v.maxSpeedMs / v.accelerationMs2; // время выхода на макс. скорость
    const xAtAcc = frontPos + 0.5 * v.accelerationMs2 * tAcc * tAcc;

    // Момент (относительно startDelay) пересечения линии передним бампером.
    let tCrossRel;
    if (frontPos >= 0) {
      tCrossRel = 0;
    } else if (xAtAcc >= 0) {
      // пересечение ещё в фазе разгона
      tCrossRel = Math.sqrt((-2 * frontPos) / v.accelerationMs2);
    } else {
      // пересечение в фазе равномерного движения
      tCrossRel = tAcc + -xAtAcc / v.maxSpeedMs;
    }
    const crossTimeAbs = startDelay + tCrossRel;

    let passed = false;

    if (crossTimeAbs <= greenDurationS) {
      passed = true;
    } else {
      const tauAtGreenEnd = greenDurationS - startDelay;
      if (tauAtGreenEnd > 0) {
        let vAtGreenEnd, xAtGreenEnd;
        if (tauAtGreenEnd <= tAcc) {
          vAtGreenEnd = v.accelerationMs2 * tauAtGreenEnd;
          xAtGreenEnd = frontPos + 0.5 * v.accelerationMs2 * tauAtGreenEnd * tauAtGreenEnd;
        } else {
          vAtGreenEnd = v.maxSpeedMs;
          xAtGreenEnd = xAtAcc + v.maxSpeedMs * (tauAtGreenEnd - tAcc);
        }

        if (xAtGreenEnd < 0) {
          const remaining = -xAtGreenEnd;
          const stopDistance =
            vAtGreenEnd * v.reactionTimeS + (vAtGreenEnd * vAtGreenEnd) / (2 * v.decelerationMs2);

          // Не может безопасно остановиться -> обязана доехать. Считаем
          // проехавшей, только если реально успевает до конца жёлтого.
          if (remaining <= stopDistance && crossTimeAbs <= horizon) {
            passed = true;
          }
        }
      }
      // если tauAtGreenEnd <= 0 — машина ещё не начала движение, точно не проехала
    }

    if (!passed) {
      // Машина не проехала -> физически стоит в очереди и блокирует всех
      // позади себя (обгон невозможен). Дальше считать нет смысла.
      break;
    }

    count++;
    prevFrontPos = frontPos;
    prevLength = v.lengthM;
  }

  return count;
}

/**
 * Симулирует ОДИН прогон для всей группы полос (например, 2 полосы главной
 * дороги) — суммирует независимые прогоны по каждой полосе.
 */
export function simulatePhaseOnce(greenDurationS, laneGroup, params, rng) {
  let total = 0;
  for (let lane = 0; lane < laneGroup.lanes; lane++) {
    total += simulateSingleLane(greenDurationS, laneGroup, params, rng);
  }
  return total;
}

// ---------------------------------------------------------------------------
// Монте-Карло агрегация и построение таблицы N -> M
// ---------------------------------------------------------------------------

function percentile(sortedArr, p) {
  const idx = Math.min(sortedArr.length - 1, Math.max(0, Math.round((p / 100) * (sortedArr.length - 1))));
  return sortedArr[idx];
}

/**
 * Прогоняет K независимых симуляций для заданной длительности зелёного и
 * возвращает статистику (среднее, min, max, перцентили).
 *
 * @param {number} greenDurationS - длительность зелёного, с
 * @param {{speedLimitKmh:number, lanes:number}} laneGroup - группа полос
 * @param {object} params - физические параметры машин (см. PARAM_RULES)
 * @param {{trials:number, seed?:number|null}} options - число прогонов и
 *   необязательный seed: с целым seed результат воспроизводим, иначе Math.random
 */
export function computeDischargeStats(greenDurationS, laneGroup, params, options) {
  validateInputs(laneGroup, params, options);
  const { trials, seed } = options;

  const results = new Array(trials);
  for (let k = 0; k < trials; k++) {
    const rng = Number.isInteger(seed) ? createSeededRng(seed + k) : Math.random;
    results[k] = simulatePhaseOnce(greenDurationS, laneGroup, params, rng);
  }

  results.sort((a, b) => a - b);
  const sum = results.reduce((s, v) => s + v, 0);

  return {
    greenDurationS,
    mean: sum / trials,
    min: results[0],
    max: results[trials - 1],
    p5: percentile(results, 5),
    p95: percentile(results, 95),
  };
}

/**
 * Строит полную таблицу N -> статистика пропускной способности для
 * заданной группы полос, N от minGreenS до maxGreenS с шагом 1 секунда.
 * Возвращает массив строк { greenDurationS, mean, min, max, p5, p95 }.
 *
 * @param {{speedLimitKmh:number, lanes:number}} laneGroup - группа полос
 * @param {object} params - физические параметры машин (см. PARAM_RULES)
 * @param {{minGreenS:number, maxGreenS:number, trials:number, seed?:number|null}} options
 */
export function buildDischargeTable(laneGroup, params, options) {
  validateInputs(laneGroup, params, options);
  const { minGreenS, maxGreenS } = options;
  if (
    !Number.isInteger(minGreenS) ||
    !Number.isInteger(maxGreenS) ||
    minGreenS < 1 ||
    maxGreenS < minGreenS
  ) {
    throw new Error('Диапазон зелёного: minGreenS и maxGreenS целые секунды, 1 <= minGreenS <= maxGreenS');
  }

  const table = [];
  for (let n = minGreenS; n <= maxGreenS; n++) {
    table.push(computeDischargeStats(n, laneGroup, params, options));
  }
  return table;
}
