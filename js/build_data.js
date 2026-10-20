import fs from "node:fs";
import path from "node:path";

/* ===== Настройки ===== */
const DATA_DIR = "c:/downloads";               // каталог с выгрузками и результатом
const INPUT_FILES = ["Array params.csv", "Single Params 2025.csv", "Single Params 2100.csv", "Total Pop.csv"];
const OUTPUT_FILE = "countries_data.json";     // если файл уже есть, он обновляется, а не создаётся заново
const VARIANT_ID = 4;                          // 4 = Median
const BASE_YEAR = 2025, END_YEAR = 2100;
const SEX = { 1: "male", 2: "female", 3: "both" };
// IndicatorId: 46 пирамида, 79 m, 81 q, 49 население, 19 TFR, 61 e0, 18 MAC, 58 SRB, 66 NMR

/* Все поля страны. Единичные значения идут первыми; затухания c в Data Portal нет: по умолчанию 0 (линейное изменение), при необходимости правятся вручную */
function newCountry(name) {
    const nulls = n => Array(n).fill(null), years = END_YEAR - BASE_YEAR + 1;
    return {
        name,
        tfr_2025: null, tfr_2100: null, tfr_c: 0,
        e0m_2100: null, e0m_c: 0, e0f_2100: null, e0f_c: 0,
        mac: null, srb: null, nmr: null,
        pyramid: { male: nulls(21), female: nulls(21) },
        mortality: { male: { m: nulls(22), q: nulls(22) }, female: { m: nulls(22), q: nulls(22) } },
        population: nulls(years)                   // оба пола, с BASE_YEAR по END_YEAR
    };
}

/* Разбор CSV: деление по запятым вне кавычек (в именах вроде "m(x,n)" есть запятые) */
function readCsv(file) {
    const text = fs.readFileSync(path.join(DATA_DIR, file), "utf8").replace(/^\uFEFF/, "");   // файлы с BOM
    const [head, ...lines] = text.split(/\r?\n/).filter(Boolean);
    const split = l => l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(s => s.replace(/^"|"$/g, ""));
    const col = Object.fromEntries(split(head).map((h, i) => [h, i]));
    return lines.map(split).map(f => ({
        id: +f[col.IndicatorId], variant: +f[col.VariantId], iso3: f[col.Iso3], name: f[col.Location],
        sex: SEX[f[col.SexId]], year: +f[col.Time], age: +f[col.AgeStart], value: parseFloat(f[col.Value])
    }));
}

/* Кладёт одно значение на своё место */
function apply(c, r) {
    const { id, sex, year, age, value: v } = r, base = year === BASE_YEAR, step5 = age % 5 === 0;
    if (id === 46 && base && step5 && c.pyramid[sex]) c.pyramid[sex][Math.min(age / 5, 20)] = v;
    else if ((id === 79 || id === 81) && base && (age < 2 || step5) && c.mortality[sex])
        c.mortality[sex][id === 79 ? "m" : "q"][age < 2 ? age : age / 5 + 1] = v;
    else if (id === 49 && sex === "both" && year >= BASE_YEAR && year <= END_YEAR) c.population[year - BASE_YEAR] = v;
    else if (id === 19 && base) c.tfr_2025 = v;
    else if (id === 19 && year === END_YEAR) c.tfr_2100 = v;
    else if (id === 61 && year === END_YEAR && c.mortality[sex]) c[sex === "male" ? "e0m_2100" : "e0f_2100"] = v;
    else if (id === 18 && base) c.mac = v;
    else if (id === 58 && base) c.srb = Math.round(v * 1e6) / 1e4;   // на портале «на 1 девочку» (1,068), у нас «на 100 девочек» (106,8)
    else if (id === 66 && base) c.nmr = v;
}

/* Что ещё не заполнено */
function report(countries) {
    const nulls = x => Array.isArray(x) ? x.filter(v => v === null).length
        : x && typeof x === "object" ? Object.values(x).reduce((s, v) => s + nulls(v), 0) : +(x === null);
    for (const [iso3, c] of Object.entries(countries)) {
        const miss = Object.entries(c).filter(([, v]) => nulls(v)).map(([k, v]) => `${k}${typeof v === "object" ? " ×" + nulls(v) : ""}`);
        console.log(`${iso3} ${c.name}: ` + (miss.length ? "не заполнено → " + miss.join(", ") : "всё заполнено"));
    }
}

function main() {
    const outFile = path.join(DATA_DIR, OUTPUT_FILE);
    const data = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, "utf8"))
        : { source: "UN WPP 2024, Data Portal, Median", countries: {} };
    // добавляем в уже существующие страны поля, появившиеся в схеме позже
    for (const [k, c] of Object.entries(data.countries)) data.countries[k] = Object.assign(newCountry(c.name), c);
    for (const file of INPUT_FILES) {
        for (const r of readCsv(file)) {
            if (r.variant !== VARIANT_ID || !Number.isFinite(r.value)) continue;
            apply(data.countries[r.iso3] ??= newCountry(r.name), r);
        }
    }
    // массивы чисел — в одну строку, чтобы файл читался глазами
    fs.writeFileSync(outFile, JSON.stringify(data, null, 1).replace(/\[[^\[\]{}]*\]/g, m => m.replace(/\s+/g, " ")));
    console.log("Записано: " + outFile);
    report(data.countries);
}

main();
