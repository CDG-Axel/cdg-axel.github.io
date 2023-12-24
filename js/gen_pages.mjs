import { readFile, writeFile } from 'node:fs/promises'

const crData = {
    title: {
        home: {'en': "Idle Heroes utilities by CDG.Axel", 'ru': "Утилиты для игры Idle Heroes от CDG.Axel"},
        sawa: {'en': "Soul-Awakening - Idle Heroes", 'ru': "Пробуждение души - Idle Jeroes"},
        sexp: {'en': "Star Expedition - Idle Heroes", 'ru': "Звездная Экспедиция - Idle Jeroes"}
    },
    description: {
        home: {
            'en': "Idle Heroes utilities by CDG.Axel. Soul-Awakening simulation and Star Expedition calculator", 
            'ru': "Утилиты для игры Idle Heroes от CDG.Axel. Симулятор Пробуждения души и калькулятор Звездной Экспедиции"
        },
        sawa: {'en': "Soul-Awakening simulation for Idle Heroes", 'ru': "Симулятор Пробуждения души для Idle Heroes"},
        sexp: {'en': "Star Expedition calculator for Idle Heroes", 'ru': "Калькулятор Звездной Экспедиции для Idle Heroes"}
    },
}

const menuData = {
    mHome: {'en': "#", 'ru': "#"},
    mSAwa: {'en': "Awakening", 'ru': "Пробуждение"},
    mSExp: {'en': "Star Exp", 'ru': "Экспедиция"},
    mLang: {'en': "Language", 'ru': "Язык"},
    mBrowserLang: {'en': "Browser language", 'ru': "Язык браузера"}
}

const pageMap = {
    home: { path: "home", template: "templates/home.html" },
    sawa: { path: "soul-awakening", template: "templates/sawa.html" },
    sexp: { path: "star-expedition", template: "templates/sexp.html"}
}

const langMap = {
    en: "",
    ru: "-ru"
}

// start generation
const MAIN_FN = 'templates/main.html';
let filePath = new URL('../' + MAIN_FN, import.meta.url);
const mainTempl = await readFile(filePath, { encoding: 'utf8' });
for (let part in pageMap) 
    for (let lang in langMap) {
        const fileName = pageMap[part].path + langMap[lang];
        filePath = new URL('../' + fileName, import.meta.url);
        console.log('Generating', fileName + '...');
        let content = mainTempl;
        for (let tag in crData) content = content.replace('%%' + tag + '%%', crData[tag][part][lang]);
        for (let item in menuData) content = content.replace('%%' + item + '%%', menuData[item][lang]);
        await writeFile(filePath, content);
}
