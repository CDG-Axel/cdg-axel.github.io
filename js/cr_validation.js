/**
 * Проверка конфигурации перекрёстка (crossroad_config.json).
 *
 * Вызывается один раз из главного модуля после загрузки JSON. Расчётные
 * модули входные данные не проверяют: они получают уже проверенную
 * конфигурацию. Модуль не читает файлы и не импортирует другие модули.
 *
 * validateConfig собирает все найденные проблемы и бросает один Error.
 */

// Параметры машин (раздел vehicle). Задаются все, значений по умолчанию нет.
//   positive    - число больше 0
//   nonNegative - число не меньше 0
//   fraction    - число от 0 (включительно) до 1 (не включая): разброс +-доля
const VEHICLE_RULES = {
  reactionTimeS: 'positive',
  reactionTimeDeviation: 'fraction',
  accelerationMs2: 'positive',
  accelerationDeviation: 'fraction',
  decelerationMs2: 'positive',
  decelerationDeviation: 'fraction',
  carLengthM: 'positive',
  carLengthDeviation: 'fraction',
  standingGapFraction: 'nonNegative',
  stopLineOffsetM: 'nonNegative',
  stopLineOffsetDeviation: 'fraction',
  nonPunishableThresholdKmh: 'nonNegative',
};

const NUMBER_RULES = {
  positive: [(x) => x > 0, 'число больше 0'],
  nonNegative: [(x) => x >= 0, 'число не меньше 0'],
  fraction: [(x) => x >= 0 && x < 1, 'число от 0 до 1 (не включая 1)'],
};

function checkNumber(errors, path, value, rule) {
  const [test, text] = NUMBER_RULES[rule];
  if (typeof value !== 'number' || !Number.isFinite(value) || !test(value)) {
    errors.push(`${path}: ${text}`);
  }
}

function checkInteger(errors, path, value, min = 1) {
  if (!Number.isInteger(value) || value < min) {
    errors.push(`${path}: целое число не меньше ${min}`);
  }
}

function isObject(x) {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

/**
 * Проверяет конфигурацию и бросает Error со списком всех проблем.
 * Возвращает конфигурацию, чтобы вызов можно было вставлять в цепочку.
 */
export function validateConfig(config) {
  if (!isObject(config)) {
    throw new Error('Конфигурация перекрёстка: ожидается объект');
  }
  const errors = [];

  // vehicle: все параметры обязательны, лишних ключей нет (так ловятся опечатки)
  const vehicle = config.vehicle ?? {};
  for (const [key, rule] of Object.entries(VEHICLE_RULES)) {
    checkNumber(errors, `vehicle.${key}`, vehicle[key], rule);
  }
  for (const key of Object.keys(vehicle)) {
    if (!Object.hasOwn(VEHICLE_RULES, key)) {
      errors.push(`vehicle.${key}: неизвестный параметр`);
    }
  }

  // laneGroups
  const groups = config.laneGroups;
  if (!isObject(groups) || Object.keys(groups).length === 0) {
    errors.push('laneGroups: нужен объект хотя бы с одной группой полос');
  } else {
    for (const [id, group] of Object.entries(groups)) {
      checkNumber(errors, `laneGroups.${id}.speedLimitKmh`, group?.speedLimitKmh, 'positive');
      checkInteger(errors, `laneGroups.${id}.lanes`, group?.lanes);
      checkInteger(errors, `laneGroups.${id}.greenMinS`, group?.greenMinS);
      checkInteger(errors, `laneGroups.${id}.greenMaxS`, group?.greenMaxS, group?.greenMinS ?? 1);
    }
  }

  // phases
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
      if (!isObject(groups) || !Object.hasOwn(groups, phase?.laneGroup)) {
        errors.push(`${where}.laneGroup: "${phase?.laneGroup}" нет среди laneGroups`);
      }
      const group = isObject(groups) ? groups[phase?.laneGroup] : undefined;
      if (!(phase?.greenS >= group?.greenMinS && phase.greenS <= group?.greenMaxS)) {
        errors.push(`${where}.greenS: число в диапазоне greenMinS..greenMaxS своей группы полос`);
      }
      checkNumber(errors, `${where}.yellowS`, phase?.yellowS, 'positive');
      checkNumber(errors, `${where}.allRedAfterS`, phase?.allRedAfterS, 'nonNegative');
    });
  }

  // tables
  checkInteger(errors, 'tables.trials', config.tables?.trials);
  const seed = config.tables?.seed;
  if (seed !== undefined && seed !== null && !Number.isInteger(seed)) {
    errors.push('tables.seed: целое число, null или не задан');
  }

  // optimization
  checkInteger(errors, 'optimization.greenStepS', config.optimization?.greenStepS);

  // optimizationProfiles: профиль = цели пропускной способности (машин/час)
  // для каждой фазы, ровно по одной на фазу
  const profiles = config.optimizationProfiles;
  if (!isObject(profiles) || Object.keys(profiles).length === 0) {
    errors.push('optimizationProfiles: нужен объект хотя бы с одним профилем');
  } else {
    for (const [name, targets] of Object.entries(profiles)) {
      const where = `optimizationProfiles.${name}`;
      if (!isObject(targets)) {
        errors.push(`${where}: нужен объект { id фазы: машин/час }`);
        continue;
      }
      for (const id of phaseIds) {
        checkNumber(errors, `${where}.${id}`, targets[id], 'nonNegative');
      }
      for (const id of Object.keys(targets)) {
        if (!phaseIds.has(id)) {
          errors.push(`${where}.${id}: такой фазы нет`);
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error('Некорректная конфигурация перекрёстка:\n - ' + errors.join('\n - '));
  }
  return config;
}
