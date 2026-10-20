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
 */

// ---------------------------------------------------------------------------
// Константы по умолчанию (можно переопределять через параметр params в функциях)
// ---------------------------------------------------------------------------

export const DEFAULT_PARAMS = {
    reactionTimeS: 1.3,          // время реакции водителя, с
    reactionTimeDeviation: 0.35, // ±35%

    accelerationMs2: 2.5,        // ускорение разгона, м/с²
    accelerationDeviation: 0.25, // ±25%

    decelerationMs2: 3.5,        // комфортное (не паническое) замедление, м/с²
    decelerationDeviation: 0.25, // ±25%

    carLengthM: 4.5,             // длина машины, м
    carLengthDeviation: 0.15,    // ±15%

    stopLineOffsetM: 1.0,        // отступ первой машины от стоп-линии/перехода, м
    stopLineOffsetDeviation: 0.3,// ±30% (разные водители тормозят по-разному)

    nonPunishableThresholdKmh: 20, // ненаказуемое превышение, км/ч
    // фактическая макс. скорость водителя = speedLimitKmh + uniform(0, порог)

    yellowDurationS: 5,          // длительность жёлтого сигнала, с
};

// Примеры групп полос для конкретного перекрёстка из задачи.
// speedLimitKmh — ограничение скорости на этом направлении.
// lanes — число полос в этом направлении (для этой фазы).
export const EXAMPLE_LANE_GROUPS = {
    mainRoadDirection: { speedLimitKmh: 60, lanes: 2 }, // любая из двух сторон главной дороги
    minorRoadDirection: { speedLimitKmh: 40, lanes: 1 }, // пересекающая дорога (без учёта трамвая)
};

const MAX_QUEUE_PER_LANE = 120; // защитный предел (реалистично нужно куда меньше)

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
 * @param {object} params - физические константы (см. DEFAULT_PARAMS)
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
            const gapStopped = (2 / 3) * v.lengthM; // зазор выбирает едущий сзади, исходя из своей длины
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
    const len = sortedArr.length - 1;
    const idx = Math.min(len, Math.max(0, Math.round(p / 100 * len)));
    return sortedArr[idx];
}

/**
 * Прогоняет K независимых симуляций для заданной длительности зелёного и
 * возвращает статистику (среднее, min, max, перцентили).
 */
export function computeDischargeStats(greenDurationS, laneGroup, params = DEFAULT_PARAMS, options = {}) {
    const trials = options.trials ?? 1000;
    const rngFactory = options.rngFactory ?? Math.random;

    const results = new Array(trials);
    for (let k = 0; k < trials; k++) {
        const rng = options.seeded ? createSeededRng(options.seedBase ? options.seedBase + k : k + 1) : rngFactory;
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
 */
export function buildDischargeTable(laneGroup, params = DEFAULT_PARAMS, options = {}) {
    const minGreenS = options.minGreenS ?? 15;
    const maxGreenS = options.maxGreenS ?? 75;

    const table = [];
    for (let n = minGreenS; n <= maxGreenS; n++) {
        table.push(computeDischargeStats(n, laneGroup, params, options));
    }
    return table;
}
