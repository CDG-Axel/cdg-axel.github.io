// ============================================================
//  i18n — translations
// ============================================================

const i18n = {
    'btn-new-season': {
        en: '🔄 New season',
        ru: '🔄 Новый сезон',
        de: '🔄 Neue Saison',
    },
    'btn-stats-all': {
        en: '📊 Season statistics',
        ru: '📊 Статистика по сезонам',
        de: '📊 Saisonstatistik',
    },
    'menu-export-file': {
        en: '💾 Download JSON file',
        ru: '💾 Скачать JSON-файл',
        de: '💾 JSON-Datei herunterladen',
    },
    'menu-export-clip': {
        en: '📋 Copy to clipboard',
        ru: '📋 Копировать в буфер',
        de: '📋 In Zwischenablage kopieren',
    },
    'menu-import-file': {
        en: '📂 Load JSON file',
        ru: '📂 Загрузить JSON-файл',
        de: '📂 JSON-Datei laden',
    },
    'menu-import-clip': {
        en: '📋 Paste from clipboard',
        ru: '📋 Вставить из буфера',
        de: '📋 Aus Zwischenablage einfügen',
    },
    'app-title': {
        en: 'Card Exchange',
        ru: 'Обмен картами',
        de: 'Kartentausch',
    },
    'th-player': {
        en: 'Player',
        ru: 'Игрок',
        de: 'Spieler',
    },
    'th-received': {
        en: 'Received',
        ru: 'Получено',
        de: 'Erhalten',
    },
    'th-sent': {
        en: 'Sent',
        ru: 'Отдано',
        de: 'Gesendet',
    },
    'th-recv-total': {
        en: 'Total',
        ru: 'Всего',
        de: 'Gesamt',
    },
    'th-recv-new': {
        en: 'New',
        ru: 'Новых',
        de: 'Neu',
    },
    'th-balance': {
        en: 'Balance ★',
        ru: 'Баланс ★',
        de: 'Bilanz ★',
    },
    'th-note': {
        en: 'Note',
        ru: 'Примечание',
        de: 'Notiz',
    },
    'btn-add-row': {
        en: '＋ Add player',
        ru: '＋ Добавить игрока',
        de: '＋ Spieler hinzufügen',
    },
    'panel-toggle-new': {
        en: 'New card',
        ru: 'Новая карта',
        de: 'Neue Karte',
    },
    'panel-recv': {
        en: 'Received:',
        ru: 'Получено:',
        de: 'Erhalten:',
    },
    'panel-sent': {
        en: 'Sent:',
        ru: 'Отдано:',
        de: 'Gesendet:',
    },
    'edit-rn-label': {
        en: 'Received new',
        ru: 'Получено новых',
        de: 'Erhalten neu',
    },
    'edit-rd-label': {
        en: 'Received doubles',
        ru: 'Получено дублей',
        de: 'Erhalten doppelt',
    },
    'edit-st-label': {
        en: 'Gifted',
        ru: 'Подарено',
        de: 'Verschenkt',
    },
    'edit-recv-label': {
        en: 'Received —',
        ru: 'Получено карт —',
        de: 'Erhalten —',
    },
    'edit-sent-label': {
        en: 'Gifted —',
        ru: 'Подарено карт —',
        de: 'Verschenkt —',
    },
    'edit-balance-label': {
        en: 'Balance —',
        ru: 'Баланс —',
        de: 'Bilanz —',
    },
    'btn-edit-save': {
        en: 'Save',
        ru: 'Сохранить',
        de: 'Speichern',
    },
    'stats-rn-label': {
        en: 'Received new',
        ru: 'Получено новых',
        de: 'Erhalten neu',
    },
    'stats-rd-label': {
        en: 'Received doubles',
        ru: 'Получено дублей',
        de: 'Erhalten doppelt',
    },
    'stats-st-label': {
        en: 'Gifted',
        ru: 'Подарено',
        de: 'Verschenkt',
    },
    'stats-recv-label': {
        en: 'Received —',
        ru: 'Получено карт —',
        de: 'Erhalten —',
    },
    'stats-sent-label': {
        en: 'Gifted —',
        ru: 'Подарено карт —',
        de: 'Verschenkt —',
    },
    'stats-balance-label': {
        en: 'Balance —',
        ru: 'Баланс —',
        de: 'Bilanz —',
    },
    'paste-modal-title': {
        en: 'Paste data',
        ru: 'Вставить данные',
        de: 'Daten einfügen',
    },
    'paste-modal-hint': {
        en: 'Paste clipboard contents below (Ctrl+V / ⌘+V) and click Import.',
        ru: 'Вставьте скопированные данные в поле ниже (Ctrl+V / ⌘+V) и нажмите «Импортировать».',
        de: 'Fügen Sie die kopierten Daten unten ein (Ctrl+V / ⌘+V) und klicken Sie auf Importieren.',
    },
    'btn-paste-import': {
        en: 'Import',
        ru: 'Импортировать',
        de: 'Importieren',
    },
    'confirm_cancel': {
        en: 'Cancel',
        ru: 'Отмена',
        de: 'Abbrechen',
    },
};

const strings = {
    select_player: {
        en: 'Select player',
        ru: 'Выберите игрока',
        de: 'Spieler auswählen',
    },
    no_name: {
        en: '(no name)',
        ru: '(без имени)',
        de: '(kein Name)',
    },
    totals_label: {
        en: 'Total',
        ru: 'Итого',
        de: 'Gesamt',
    },
    all_time: {
        en: 'All time',
        ru: 'За всё время',
        de: 'Gesamte Zeit',
    },
    current_suffix: {
        en: ' (current)',
        ru: ' (текущий)',
        de: ' (aktuell)',
    },
    since_date: {
        en: 'since ',
        ru: 'с ',
        de: 'seit ',
    },
    all_players: {
        en: 'All players',
        ru: 'Все игроки',
        de: 'Alle Spieler',
    },
    confirm_cancel: {
        en: 'Cancel',
        ru: 'Отмена',
        de: 'Abbrechen',
    },
    confirm_delete_ok: {
        en: 'Delete',
        ru: 'Удалить',
        de: 'Löschen',
    },
    confirm_merge_ok: {
        en: 'Yes, merge',
        ru: 'Да, объединить',
        de: 'Ja, zusammenführen',
    },
    confirm_same_ok: {
        en: 'Yes, same player',
        ru: 'Да, тот же',
        de: 'Ja, derselbe',
    },
    confirm_other: {
        en: 'No, change name',
        ru: 'Нет, другой',
        de: 'Nein, anderer',
    },
    confirm_new_season_ok: {
        en: 'Start new season',
        ru: 'Начать новый сезон',
        de: 'Neue Saison starten',
    },
    confirm_delete_msg: {
        en: 'Delete player "{name}"?\n\nHistory for all seasons will be kept.',
        ru: 'Удалить игрока «{name}»?\n\nИстория за все сезоны сохранится.',
        de: 'Spieler „{name}" löschen?\n\nDie Historie aller Saisons bleibt erhalten.',
    },
    confirm_merge_msg: {
        en: 'Player "{name}" already exists in data. Merge?',
        ru: 'Игрок «{name}» уже есть в данных. Объединить?',
        de: 'Spieler „{name}" existiert bereits. Zusammenführen?',
    },
    confirm_same_msg: {
        en: 'Player "{name}" found in history.\nIs this the same person?',
        ru: 'В истории найден игрок «{name}».\nЭто тот же человек?',
        de: 'Spieler „{name}" in der Historie gefunden.\nIst das dieselbe Person?',
    },
    confirm_new_season_msg: {
        en: 'Start new season?\n\n"{name}" data will be saved to history, counters reset. Players remain.',
        ru: 'Начать новый сезон?\n\nДанные «{name}» сохранятся в историю, счётчики обнулятся. Игроки останутся.',
        de: 'Neue Saison starten?\n\nDaten von „{name}" werden gespeichert, Zähler zurückgesetzt. Spieler bleiben.',
    },
    toast_copied: {
        en: 'Copied to clipboard',
        ru: 'Скопировано в буфер обмена',
        de: 'In Zwischenablage kopiert',
    },
    toast_copy_error: {
        en: 'Could not copy: {msg}',
        ru: 'Не удалось скопировать: {msg}',
        de: 'Kopieren fehlgeschlagen: {msg}',
    },
    toast_imported: {
        en: 'Data loaded',
        ru: 'Данные загружены',
        de: 'Daten geladen',
    },
    toast_imported_clip: {
        en: 'Data loaded from clipboard',
        ru: 'Данные загружены из буфера',
        de: 'Daten aus Zwischenablage geladen',
    },
    toast_empty_paste: {
        en: 'Field is empty — paste data first',
        ru: 'Поле пустое — вставьте данные',
        de: 'Feld ist leer — Daten einfügen',
    },
    import_error_format: {
        en: 'Import error: invalid format',
        ru: 'Ошибка импорта: неверный формат',
        de: 'Importfehler: ungültiges Format',
    },
    import_error_prefix: {
        en: 'Import error: ',
        ru: 'Ошибка импорта: ',
        de: 'Importfehler: ',
    },
    recv_summary: {
        en: '{total} (new — {new}, doubles — {dbl}) = {stars}★',
        ru: '{total} (новых — {new}, дублей — {dbl}) = {stars}★',
        de: '{total} (neu — {new}, doppelt — {dbl}) = {stars}★',
    },
    sent_summary: {
        en: '{total} = {stars}★',
        ru: '{total} = {stars}★',
        de: '{total} = {stars}★',
    },
};