import { readFile, writeFile } from 'node:fs/promises'

const pageMap = {
    html_lang: {en: "en", ru: "ru", de: "de"},
    mLang:     {en: "Language", ru: "Язык", de: "Sprache"},
    langName:    {en: "English", ru: "Русский", de: "Deutsch"},
    mBrowserLang: {en: "Browser language", ru: "Язык браузера", de: "Browsersprache"},
    mLight:    {en: "Light", ru: "Светлая", de: "Hell"},
    mDark:     {en: "Dark", ru: "Темная", de: "Dunkel"},
    mAuto:     {en: "Auto", ru: "Авто", de: "Automatisch"},
    cAbout:  {
        en: "<br>Created by CDG.Axel (C)2023<br><br>Resourses:", 
        ru: "<br>Разработка - CDG.Axel (C)2023<br><br>Полезные ресурсы:",
        de: "<br>Erstellt von CDG.Axel (C)2023<br><br>Nützliche Links:"
    },
    cBotName:   {en: "Soul-Awakening telegram bot", ru: "Телеграм-бот пробуждения души", de: "Telegram-Bot für Glorreiche Erweckungssaison"},
    cCommunity: {en: "The largest Idle Heroes community", ru: "Крупнейшее русскоязычное комьюнити по игре Idle Heroes", de: "Die größte Idle Heroes-Community"},
    cYouTube:   {en: "AkuDemon's youtube channel", ru: "Ютюб-канал AkuDemon", de: "AkuDemon's YouTube-Kanal"},
    cSaHeader:  {en: "Idle Heroes Soul-Awakening simulator", ru: "Idle heroes - Сеанс пробуждения души", de: "Idle heroes - Glorreiche Erweckungssaison simulation"},
    lTargetPoints: {en: "Target points", ru: "Количество очков", de: "Zielpunkte"},
    lFirstTier: {en: "Save copies", ru: "Сохранять копии", de: "Kopien speichern"},
    lSimulationCount: {en: "Simulation count", ru: "Количество симуляций", de: "Anzahl der Simulationen"},
    startBtn: {en: "Start simulation", ru: "Запуск симуляции", de: "Simulation starten"},
    cSimRes: {en: "Starry gems (Avg/Min/Max):", ru: "Звездные алмазы (средн/мин/макс):", de: "Sterndiamant (Ø/Min/Max):"},
    cResCopies: {en: "Copies needed:", ru: "Требуется копий:", de: "Benötigte Kopien:"},
    cResHelp: {en: "Calculation time:", ru: "Время расчёта:", de: "Berechnungszeit:"},
    cSimLink: {en: "This simulation link - ", ru: "Ссылка на эту симуляцию - ", de: "Dieser Simulationslink - "},
    lCopyLink: {en: "click", ru: "клик", de: "klick"},
    cTCol1: {en: "Tier", ru: "Тир", de: "Rang"},
    cTCol2: {en: "Chance", ru: "Шанс", de: "Chance"},
    cTCol3: {en: "Points", ru: "Очков", de: "Punkte"},
    cTCol4: {en: "Average", ru: "Среднее", de: "Durchschnitt"},
    cSaHowToUse:  {en: "How to use it", ru: "Инструкция по использованию симулятора", de: "Anweisungen zur Verwendung des Simulators" },
    cSaHowFull: {
        en: `<ul><li>Simulate a soul awakening session 'Simulation count' times.
            A minimum of 10,000 simulations is required for accurate results.</li>
            <li>Each simulation continues until 'Target points' reached.
            For instance, 200 points are needed for a guaranteed B-tier.</li>
            <li>Any copies with a tier lower than 'Save copies' are retired, and
            the required number of starry gems is decreased by the value of the retired copies.</li>
            <li>The average quantity of each tear dropped is displayed in the last column of the table.</li></ul>
            During the simulation, you can view the results, and it becomes more accurate with more simulations.`,
        ru: `<ul>
            <li>Симулирует пробуждение души 'Количество симуляций' раз.
            Для более точных результатов желательно не менее 10,000 симуляций.</li>
            <li>Каждая симуляция длится, пока не будет набрано требуемое 'Количество очков'.
            Для примера, 200 очков требуется для получения гарантированного B- тира.
            Если хотите узнать, сколько требуется алмазов, например, для топ-10, введите в поле 'Количество очков'
            значение больше, чем у места 10 в рейтинге (лучше с запасом).</li>
            <li>Все копии рангом ниже 'Сохранять копии' будут считаться разобранным,
            а требуемое количество звездных алмазов будет уменьшено на значение, полученное от их разбора.</li>
            <li>Среднее количество копий каждого тира показано в последней колонке таблицы.</li></ul>
            Вы можете смотреть результаты в процессе симуляции, но чем она дольше длится, тем точнее результат.`,
        de: `<ul><li>Simulieren Sie eine Glorreiche Erweckungssaison 'Simulationsanzahl'-mal.
            Für genaue Ergebnisse sind mindestens 10.000 Simulationen erforderlich.</li>
            <li>Jede Simulation läuft weiter, bis 'Zielpunkte' erreicht sind. 
            Zum Beispiel sind 200 Punkte für eine garantierte B-Stufe erforderlich</li>
            <li>Alle Kopien mit einer Stufe niedriger als 'Kopien speichern' werden ausgemustert, 
            und die benötigte Anzahl an Sterndiamant wird um den Wert der ausgemusterten Kopien verringert</li>
            <li>Die durchschnittliche Menge jeder Träne, die fallengelassen wird, wird in der letzten Spalte der Tabelle angezeigt.</li></ul>
            Während der Simulation können Sie die Ergebnisse anzeigen, und sie werden genauer, je mehr Simulationen durchgeführt werden.`
    },
    cSeHeader:    {en: "Idle Heroes - Star Expedition calculator", ru: "Idle Heroes - Калькулятор Звездной экспедиции", de: "Idle Heroes - Sternexpedition Rechner"},
    cSeHowToUse:  {en: "How to use it", ru: "Инструкция по использованию калькулятора", de: "Anleitung zur Verwendung des Rechners"},
    lbBossNumber: {en: "Boss number", ru: "Босс номер", de: "Boss Nummer"},
    lbPercentHp:  {en: "Percent HP", ru: "Процент ХП", de: "Prozent TP"},
    lTotalHP:     {en: "Total HP:", ru: "Всего ХП:", de: "Gesamt-TP:"},
    lRemainingHP: {en: "Remaining HP", ru: "Осталось ХП:", de: "Verbleibende TP"},
    lGuildPoints: {en: "Guild Points:", ru: "Очки гильдии:", de: "Gildenpunkte: "},
    error:        {en: "Error!", ru: "Ошибка!", de: "Fehler!"},
    endBillion:   {en: " B", ru: " Млрд", de: " Mrd"},
    endTrillion:  {en: " T", ru: " Т", de: " B"},
    cSeHowFull: {
        en: `Used to calculate remaining boss HP.
            <ul><li>Boss Number - number between 200 and 101.</li>
            <li>HP Percentage - current % of HP remaining.</li></ul>`,
        ru: `Используется для расчёта оставшегося ХП у босса.
            <ul><li>Номер босса - число от 200 до 101.</li>
            <li>Процент ХП - текущее ХП босса в процентах.</li></ul>`,
        de: `Verwendet, um verbleibende Boss-TP zu berechnen.
            <ul><li>Bossnummer - eine Zahl zwischen 200 und 101.</li>
            <li>TP-Prozentsatz - aktueller Prozentsatz der verbleibenden TP.</li></ul>`
    },

};

const pageData = {
    home: { 
        path: "home.html",
        template: "templates/home.html",
        menu: { en: "#" },
        title: {en: "Idle Heroes utilities by CDG.Axel", ru: "Утилиты для игры Idle Heroes от CDG.Axel", de: "Idle Heroes-Dienstprogramme von CDG.Axel"},
        description: {
            en: "Idle Heroes utilities by CDG.Axel. Soul-Awakening Session simulation and Star Expedition calculator", 
            ru: "Утилиты для игры Idle Heroes от CDG.Axel. Симулятор Сеанса пробуждения души и калькулятор Звездной Экспедиции",
            de: "Idle Heroes-Dienstprogramme von CDG.Axel. Glorreiche Erweckungssaison simulation und Sternexpeditionsrechner"
        }
    },
    sawa: { 
        path: "soul-awakening.html", 
        template: "templates/sawa.html",
        menu: {en: "Awakening", ru: "Пробуждение", de: "Erweckung"},
        title: {en: "Soul-Awakening - Idle Heroes", ru: "Пробуждение души - Idle Heroes", de: "Erweckungssaison – Idle Heroes"},
        description: {
            en: "Soul-Awakening simulation for Idle Heroes", 
            ru: "Симулятор Пробуждения души для Idle Heroes", 
            de: "Glorreiche Erweckungssaison für Idle Heroes"
        }
    },
    sexp: { 
        path: "star-expedition.html", 
        template: "templates/sexp.html",
        menu: {en: "Star Exp", ru: "Экспедиция", "de": "Expedition"},
        title: {en: "Star Expedition - Idle Heroes", ru: "Звездная Экспедиция - Idle Heroes", de: "Sternexpedition – Idle Heroes"},
        description: {
            en: "Star Expedition calculator for Idle Heroes", 
            ru: "Калькулятор Звездной Экспедиции для Idle Heroes", 
            de: "Sternexpedition Rechner für Idle Heroes"}
    }
};

const langMap = { en: "/", ru: "/ru/", de: "/de/" };

function getLangString(node, lang) {
    return node[lang] ?? node['en'];
}

// start generation
const MAIN_FN = 'templates/main_template.html';
let filePath = new URL('../' + MAIN_FN, import.meta.url);
const mainTempl = await readFile(filePath, { encoding: 'utf8' });
for (let page in pageData) 
    for (let lang in langMap) {
        const fileName = langMap[lang] + pageData[page].path;
        console.log('Generating', fileName + '...');
        let content = mainTempl;
        content = content.replace('%%title%%', getLangString(pageData[page].title, lang));
        content = content.replace('%%description%%', getLangString(pageData[page].description, lang));
        // replace menu data
        for (let item in pageMap) content = content.replace('%%' + item + '%%', getLangString(pageMap[item], lang));
        // form navigation
        let navpart = "";
        for (let menu in pageData) {
            const current = menu == page? 'aria-current="page" ': '';
            const active = menu == page? ' active': '';
            const link = langMap[lang] + pageData[menu].path;
            const text = getLangString(pageData[menu]['menu'], lang);
            navpart += `<li class="nav-item"><a class="nav-link px-2${active}" ${current}href="${link}">${text}</a></li>\n`
        }
        content = content.replace('%%nav-part%%', navpart);
        navpart = "";
        for (let ml in langMap) {
            const ref = langMap[ml] + pageData[page].path;
            const langText = getLangString(pageMap['langName'], ml);
            navpart += `<li><a class="dropdown-item" href="${ref}">${langText}</a></li>\n`
        }
        content = content.replace('%%lang-nav%%', navpart);

        filePath = new URL('../' + pageData[page].template, import.meta.url);
        let tabContent = await readFile(filePath, { encoding: 'utf8' });
        for (let item in pageMap) tabContent = tabContent.replace('%%' + item + '%%', getLangString(pageMap[item], lang));

        content = content.replace('%%tab-content%%', tabContent);

        filePath = new URL('..' + fileName, import.meta.url);
        await writeFile(filePath, content);
}
