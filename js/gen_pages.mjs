import { readFile, writeFile } from 'node:fs/promises'

const pageMap = {
    html_lang:  {en: "en", ru: "ru", de: "de"},
    mLang:      {en: "Language", ru: "Язык", de: "Sprache"},
    langName:   {en: "English", ru: "Русский", de: "Deutsch"},
    mLight:     {en: "Light", ru: "Светлая", de: "Hell"},
    mDark:      {en: "Dark", ru: "Темная", de: "Dunkel"},
    mAuto:      {en: "Auto", ru: "Авто", de: "Automatisch"},
    cHomeHeader:{
        en: "<br>Created by CDG.Axel ©2023<br><br>Resources:",
        ru: "<br>Разработка - CDG.Axel ©2023<br><br>Полезные ресурсы:",
        de: "<br>Erstellt von CDG.Axel ©2023<br><br>Nützliche Links:"
    },
    cHomeFooter:{
        en: `You can <a href="https://github.com/CDG-Axel/cdg-axel.github.io" target="_blank">contribute to this project</a>
            by adding or fixing translations.<br>It would be very cool if you could explain how guild points are calculated 
            in Star Expedition. At the moment, the calculation of these points is quite approximate, especially for bosses 200-160.`,
        ru: `Вы можете <a href="https://github.com/CDG-Axel/cdg-axel.github.io" target="_blank">помочь проекту</a>
            с переводом на другие языки или исправлением ошибок перевода.<br>Очень круто, если вы объясните, как считаются очки гильдии 
            в Звезной Экспедиции. На текущий момент расчет этих очков весьма приблизительный, особенно на боссах 200-160.`,
        de: `Sie können <a href="https://github.com/CDG-Axel/cdg-axel.github.io" target="_blank">zu diesem Projekt beitragen,</a>
            indem Sie Übersetzungen hinzufügen oder korrigieren.<br>Es wäre sehr hilfreich, wenn Sie erklären könnten, wie die Gilden punkte
            in der Sternexpedition berechnet werden. Derzeit ist die Berechnung dieser Punkte ziemlich ungefähr, insbesondere bei Bossen von 200 bis 160.`
    },
    cBotName:   {en: "Soul-Awakening telegram bot", ru: "Телеграм-бот пробуждения души", de: "Telegram-Bot für Glorreiche Erweckungssaison"},
    cCommunity: {en: "The largest Idle Heroes community", ru: "Крупнейшее русскоязычное комьюнити по игре Idle Heroes", de: "Die größte Idle Heroes-Community"},
    cYouTube:   {en: "AkuDemon's youtube channel", ru: "Ютюб-канал AkuDemon", de: "AkuDemon's YouTube-Kanal"},
    cSaHeader:  {en: "Idle Heroes Soul-Awakening simulator", ru: "Idle Heroes - Сеанс пробуждения души", de: "Idle Heroes: Glorreiche Erweckungssaison simulation"},
    lTargetPts: {en: "Target points", ru: "Количество очков", de: "Zielpunkte"},
    lFirstTier: {en: "Save copies", ru: "Сохранять копии", de: "Kopien speichern"},
    lSimCount:  {en: "Simulation count", ru: "Количество симуляций", de: "Anzahl der Simulationen"},
    startBtn:   {en: "Start simulation", ru: "Запуск симуляции", de: "Simulation starten"},
    cSimRes:    {en: "Starry gems (Avg/Min/Max):", ru: "Звездные алмазы (средн/мин/макс):", de: "Sterndiamant (Ø/Min/Max):"},
    cResCopies: {en: "Copies needed:", ru: "Требуется копий:", de: "Benötigte Kopien:"},
    cResHelp:   {en: "Calculation time:", ru: "Время расчёта:", de: "Berechnungszeit:"},
    cSimLink:   {en: "This simulation link - ", ru: "Ссылка на эту симуляцию - ", de: "Dieser Simulationslink - "},
    lCopyLink:  {en: "click", ru: "клик", de: "klick"},
    cLinkTitle: {
        en: "You can share the current simulation with this link", 
        ru: "Вы можете поделиться данной симуляцией с помощью ссылки", 
        de: "Sie können die aktuelle Simulation mit diesem Link teilen"
    },
    cTCol1:     {en: "Tier", ru: "Тир", de: "Rang"},
    cTCol2:     {en: "Chance", ru: "Шанс", de: "Chance"},
    cTCol3:     {en: "Points", ru: "Очков", de: "Punkte"},
    cTCol4:     {en: "Average", ru: "Среднее", de: "Durchschnitt"},
    cSaHowToUse:{en: "How to use it", ru: "Инструкция по использованию симулятора", de: "Anweisungen zur Verwendung des Simulators" },
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
    lGuildPoints: {en: "Killed Bosses HP / Guild Points:", ru: "Суммарное ХП убитых боссов / Очки гильдии:", de: "Erschlagene Bosse TP / Gilden punkte: "},
    error:        {en: "Error!", ru: "Ошибка!", de: "Fehler!"},
    endBillion:   {en: " B", ru: " Млрд", de: " Mrd"},
    endTrillion:  {en: " T", ru: " Т", de: " B"},
    cSeHowFull:   {
        en: `Used to calculate remaining boss HP.
            <ul><li>Boss Number - number between 200 and 101.</li>
            <li>HP Percentage - current % of HP remaining.</li>
            <li>Killed Bosses HP - The sum of the guild's damage considering previously killed bosses.</li>
            <li>Guild Points - Approximate amount of points the guild should have on the selected boss.</li></ul>`,
        ru: `Используется для расчёта оставшегося ХП у босса.
            <ul><li>Номер босса - число от 200 до 101.</li>
            <li>Процент ХП - текущее ХП босса в процентах.</li>
            <li>Суммарное ХП убитых боссов - Сумма урона гильдии с учетом ранее убитых боссов</li>
            <li>Очки гильдии - Приблизительное количество очков, которые должны быть у гильдии на выбранном боссе.</li></ul>`,
        de: `Verwendet, um verbleibende Boss-TP zu berechnen.
            <ul><li>Boss nummer - eine Zahl zwischen 200 und 101.</li>
            <li>TP-Prozentsatz - aktueller Prozentsatz der verbleibenden TP.</li>
            <li>Erschlagene Bosse TP - die Summe des Gilden schadens unter Berücksichtigung zuvor besiegter Bosse.</li>
            <li>Gilden punkte - ungefähre Anzahl der Punkte, die die Gilde auf dem ausgewählten Boss haben sollte.</li></ul>`
    },
};

const tabData = {
    home: { 
        path: "home.html",
        template: "templates/home.html",
        menu: { en: "#" },
        title: { en: "Idle Heroes utilities by CDG.Axel", ru: "Утилиты для игры Idle Heroes от CDG.Axel", de: "Idle Heroes-Dienstprogramme von CDG.Axel" },
        description: {
            en: "Idle Heroes utilities by CDG.Axel. Soul-Awakening Session simulation and Star Expedition calculator", 
            ru: "Утилиты для игры Idle Heroes от CDG.Axel. Симулятор Сеанса пробуждения души и калькулятор Звездной Экспедиции",
            de: "Idle Heroes-Dienstprogramme von CDG.Axel. Glorreiche Erweckungssaison simulation und Sternexpeditionsrechner"
        }
    },
    soul_aw: {
        path: "soul-awakening.html", 
        template: "templates/soul_aw.html",
        menu: { en: "Awakening", ru: "Пробуждение", de: "Erweckung" },
        title: { en: "Soul-Awakening - Idle Heroes", ru: "Пробуждение души - Idle Heroes", de: "Erweckungssaison – Idle Heroes" },
        description: {
            en: "Soul-Awakening simulation for Idle Heroes", 
            ru: "Симулятор Пробуждения души для Idle Heroes", 
            de: "Glorreiche Erweckungssaison für Idle Heroes"
        }
    },
    star_exp: {
        path: "star-expedition.html", 
        template: "templates/star_exp.html",
        menu: { en: "Star Exp", ru: "Экспедиция", "de": "Expedition" },
        title: { en: "Star Expedition - Idle Heroes", ru: "Звездная Экспедиция - Idle Heroes", de: "Sternexpedition – Idle Heroes" },
        description: {
            en: "Star Expedition calculator for Idle Heroes", 
            ru: "Калькулятор Звездной Экспедиции для Idle Heroes", 
            de: "Sternexpedition Rechner für Idle Heroes"
        }
    }
};

const langMap = { en: "/", ru: "/ru/", de: "/de/" };
const getLangString = (node, lang) => node[lang] ?? node['en'];

// start generation
let filePath = new URL('../templates/main_template.html', import.meta.url);
const mainTemplate = await readFile(filePath, { encoding: 'utf8' });
for (let tab in tabData) 
    for (let lang in langMap) {
        const fileName = langMap[lang] + tabData[tab].path;
        console.log('Generating', fileName + '...');
        let content = mainTemplate;
        content = content.replace('%%title%%', getLangString(tabData[tab].title, lang));
        content = content.replace('%%description%%', getLangString(tabData[tab].description, lang));
        // replace menu data
        for (let item in pageMap) content = content.replace('%%' + item + '%%', getLangString(pageMap[item], lang));
        // form navigation
        let navPart = "";
        for (let item in tabData) {
            const current = item === tab? ' aria-current="page"': '';
            const active = item === tab? ' active': '';
            const link = langMap[lang] + tabData[item].path;
            const text = getLangString(tabData[item].menu, lang);
            navPart += `<li class="nav-item"><a class="nav-link${active}"${current} href="${link}">${text}</a></li>\n`
        }
        content = content.replace('%%nav-part%%', navPart);
        navPart = "";
        for (let ml in langMap) {
            const ref = langMap[ml] + tabData[tab].path;
            const langText = getLangString(pageMap['langName'], ml);
            navPart += `<li><a class="dropdown-item" href="${ref}">${langText}</a></li>\n`
        }
        content = content.replace('%%lang-nav%%', navPart);

        filePath = new URL('../' + tabData[tab].template, import.meta.url);
        let tabContent = await readFile(filePath, { encoding: 'utf8' });
        for (let item in pageMap) tabContent = tabContent.replace('%%' + item + '%%', getLangString(pageMap[item], lang));

        content = content.replace('%%tab-content%%', tabContent);

        filePath = new URL('..' + fileName, import.meta.url);
        await writeFile(filePath, content);
}
