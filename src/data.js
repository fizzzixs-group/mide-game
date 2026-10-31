/* ============================================================
   AVITO FLIP — данные: модели, дефекты, запчасти, персонажи
   ============================================================ */
(function (root) {
  'use strict';

  /* ---------- ТИРЫ ---------- */
  // 1 — бюджет (<10к), 2 — средний (10–25к), 3 — флагман (25–60к), 4 — фолд/топ (>60к)
  const TIER_NAMES = { 1: 'бюджет', 2: 'средний', 3: 'флагман', 4: 'топ' };

  /* ---------- ДЕФЕКТЫ ---------- */
  // visible — видно сразу на фото/в объявлении
  // check   — какой проверкой вскрывается на встрече
  // priceMult — насколько дефект роняет рыночную цену (доля)
  // repair  — ключ ремонта (null = не чинится)
  const DEFECTS = {
    battery: {
      name: 'Изношен аккумулятор', short: 'Батарея',
      visible: false, check: 'battery', priceMult: 0.14, repair: 'battery',
      phrases: [
        'аккумулятор уже подустал, к вечеру садится',
        'батарею меняли давно, держит так себе',
        'по батарее скажу честно — износ есть'
      ]
    },
    screen_crack: {
      name: 'Трещина на экране', short: 'Экран',
      visible: true, check: 'screen', priceMult: 0.26, repair: 'screen_glass',
      phrases: [
        'на экране есть трещинка, на работу не влияет',
        'стекло треснуло, но сенсор рабочий',
        'экран с коцкой в углу, специально фоткал'
      ]
    },
    screen_dead: {
      name: 'Полосы и битые пиксели', short: 'Экран',
      visible: true, check: 'screen', priceMult: 0.38, repair: 'screen_full',
      phrases: [
        'по экрану есть полосы, дисплей под замену',
        'экран битый, половина не реагирует',
        'появились полосы после падения'
      ]
    },
    back: {
      name: 'Треснула задняя крышка', short: 'Корпус',
      visible: true, check: 'frame', priceMult: 0.09, repair: 'back',
      phrases: [
        'сзади стекло треснуло, в чехле не видно',
        'задняя крышка с трещиной'
      ]
    },
    frame: {
      name: 'Потёртости и вмятины', short: 'Косметика',
      visible: true, check: 'frame', priceMult: 0.07, repair: null, cosmetic: true,
      phrases: [
        'по корпусу есть потёртости, телефон не в идеале',
        'есть вмятинка на рамке',
        'косметика б/у, всё честно'
      ]
    },
    camera: {
      name: 'Проблема с камерой', short: 'Камера',
      visible: false, check: 'camera', priceMult: 0.17, repair: 'camera',
      phrases: [
        'камера иногда не фокусится',
        'на основной камере пятно, надо менять модуль'
      ]
    },
    faceid: {
      name: 'Не работает Face ID', short: 'Face ID',
      visible: false, check: 'faceid', priceMult: 0.2, repair: 'faceid',
      phrases: [
        'Face ID не работает после ремонта',
        'разблокировка по лицу не пашет, только код'
      ]
    },
    speaker: {
      name: 'Хрипит динамик', short: 'Динамик',
      visible: false, check: 'speaker', priceMult: 0.08, repair: 'speaker',
      phrases: [
        'динамик хрипит на громкости',
        'разговорный динамик тихий'
      ]
    },
    charging: {
      name: 'Плохо заряжается', short: 'Зарядка',
      visible: false, check: 'charging', priceMult: 0.13, repair: 'charging',
      phrases: [
        'разъём зарядки разболтан, надо шевелить кабель',
        'заряжается только в одном положении'
      ]
    },
    water: {
      name: 'Следы влаги', short: 'Влага',
      visible: false, check: 'water', priceMult: 0.28, repair: 'water',
      phrases: [
        'телефон был в воде, но работает',
        'влагозащита сработала не до конца, есть следы'
      ]
    },
    icloud: {
      name: 'Привязан к чужому iCloud', short: 'iCloud',
      visible: false, check: 'icloud', priceMult: 0.55, repair: null,
      phrases: [
        'аккаунт мой, но пароль я забыл, сбросить не могу',
        'iCloud висит, снять не получится'
      ]
    },
    imei: {
      name: 'IMEI в чёрном списке', short: 'IMEI',
      visible: false, check: 'imei', priceMult: 0.7, repair: null,
      phrases: [
        'телефон привезён, документов нет',
        'IMEI я не проверял, брал с рук'
      ]
    }
  };

  const DEFECT_KEYS = Object.keys(DEFECTS);

  /* ---------- РЕМОНТ: цена запчасти по тиру ---------- */
  const REPAIR_COST = {
    battery: [0, 900, 1600, 2900, 3500],
    screen_glass: [0, 1400, 2800, 5500, 9000],
    screen_full: [0, 2200, 4500, 11000, 26000],
    back: [0, 800, 1500, 3000, 4000],
    camera: [0, 1200, 2200, 4500, 6000],
    faceid: [0, 2000, 3000, 4500, 5000],
    speaker: [0, 600, 900, 1400, 1600],
    charging: [0, 700, 1200, 2200, 2500],
    water: [0, 1500, 2500, 5000, 7000]
  };

  const REPAIR_NAMES = {
    battery: 'Замена аккумулятора',
    screen_glass: 'Замена стекла экрана',
    screen_full: 'Замена дисплея',
    back: 'Замена задней крышки',
    camera: 'Ремонт камеры',
    faceid: 'Ремонт Face ID',
    speaker: 'Замена динамика',
    charging: 'Ремонт разъёма зарядки',
    water: 'Чистка после влаги'
  };

  // Качество запчасти: множитель цены и шанс, что дефект «вернётся» после продажи
  const PART_QUALITY = {
    original: { name: 'Оригинал', mult: 1.0, risk: 0, desc: 'Дорого, но без сюрпризов' },
    analog: { name: 'Аналог', mult: 0.55, risk: 0.12, desc: 'Дешевле, бывает брак' },
    used: { name: 'Б/у деталь', mult: 0.34, risk: 0.26, desc: 'Дёшево и рискованно' }
  };

  /* ---------- МОДЕЛИ ---------- */
  // base — рыночная цена за базовую память в хорошем состоянии (Москва)
  // quirks — множители вероятности дефекта конкретно для этой модели
  const MODELS = [
    // ---------- APPLE ----------
    { id: 'ip8', brand: 'Apple', name: 'iPhone 8', tier: 1, base: 6500, storages: [64, 256], pop: 5, quirks: { battery: 2.0 }, note: 'легенда, живёт у всех' },
    { id: 'ipxr', brand: 'Apple', name: 'iPhone XR', tier: 2, base: 12000, storages: [64, 128, 256], pop: 9, quirks: { battery: 1.7, faceid: 1.2 }, note: 'рабочая лошадка' },
    { id: 'ip11', brand: 'Apple', name: 'iPhone 11', tier: 2, base: 17000, storages: [64, 128, 256], pop: 14, quirks: { battery: 1.6, back: 1.1 }, note: 'самый популярный б/у айфон' },
    { id: 'ip11pro', brand: 'Apple', name: 'iPhone 11 Pro', tier: 2, base: 22000, storages: [64, 256, 512], pop: 7, quirks: { battery: 1.8, camera: 1.2 }, note: 'три камеры, маленький' },
    { id: 'ip12', brand: 'Apple', name: 'iPhone 12', tier: 2, base: 24000, storages: [64, 128, 256], pop: 10, quirks: { battery: 1.5 }, note: 'первый с 5G' },
    { id: 'ip12pm', brand: 'Apple', name: 'iPhone 12 Pro Max', tier: 3, base: 35000, storages: [128, 256, 512], pop: 6, quirks: { battery: 1.5, camera: 1.1 }, note: 'большой и тяжёлый' },
    { id: 'ip13', brand: 'Apple', name: 'iPhone 13', tier: 3, base: 32000, storages: [128, 256, 512], pop: 12, quirks: { battery: 1.2 }, note: 'народный флагман' },
    { id: 'ip13pro', brand: 'Apple', name: 'iPhone 13 Pro', tier: 3, base: 42000, storages: [128, 256, 512, 1024], pop: 8, quirks: { screen_crack: 1.1 }, note: '120 Гц' },
    { id: 'ip13pm', brand: 'Apple', name: 'iPhone 13 Pro Max', tier: 3, base: 47000, storages: [128, 256, 512], pop: 7, quirks: {}, note: 'долго держит заряд' },
    { id: 'ip14', brand: 'Apple', name: 'iPhone 14', tier: 3, base: 40000, storages: [128, 256, 512], pop: 8, quirks: { battery: 1.3 }, note: 'почти как 13' },
    { id: 'ip14pro', brand: 'Apple', name: 'iPhone 14 Pro', tier: 3, base: 55000, storages: [128, 256, 512, 1024], pop: 7, quirks: { back: 1.2 }, note: 'динамический остров' },
    { id: 'ip15', brand: 'Apple', name: 'iPhone 15', tier: 3, base: 50000, storages: [128, 256, 512], pop: 6, quirks: {}, note: 'Type-C' },
    { id: 'ip15pm', brand: 'Apple', name: 'iPhone 15 Pro Max', tier: 4, base: 85000, storages: [256, 512, 1024], pop: 5, quirks: { frame: 1.4 }, note: 'титан, царапается' },
    { id: 'ipse2020', brand: 'Apple', name: 'iPhone SE 2020', tier: 1, base: 9000, storages: [64, 128, 256], pop: 6, quirks: { battery: 2.2 }, note: 'маленький, батарея слабая' },
    { id: 'ipse2022', brand: 'Apple', name: 'iPhone SE 2022', tier: 2, base: 14000, storages: [64, 128, 256], pop: 4, quirks: { battery: 1.6 }, note: 'тот же корпус, новый чип' },

    // ---------- SAMSUNG ----------
    { id: 'a12', brand: 'Samsung', name: 'Galaxy A12', tier: 1, base: 5000, storages: [32, 64, 128], pop: 6, quirks: { charging: 1.4, back: 1.3 }, note: 'рабочая лошадка бюджета' },
    { id: 'a32', brand: 'Samsung', name: 'Galaxy A32', tier: 1, base: 8000, storages: [64, 128], pop: 5, quirks: { back: 1.4 }, note: 'пластик, но экран AMOLED' },
    { id: 'a52', brand: 'Samsung', name: 'Galaxy A52', tier: 2, base: 11000, storages: [128, 256], pop: 7, quirks: { back: 1.5, water: 1.2 }, note: 'влагостойкий середняк' },
    { id: 'a54', brand: 'Samsung', name: 'Galaxy A54', tier: 2, base: 17000, storages: [128, 256], pop: 6, quirks: {}, note: 'свежий середняк' },
    { id: 's20', brand: 'Samsung', name: 'Galaxy S20', tier: 2, base: 13000, storages: [128, 256], pop: 4, quirks: { battery: 1.6, screen_dead: 1.3 }, note: 'старый флагман' },
    { id: 's21', brand: 'Samsung', name: 'Galaxy S21', tier: 3, base: 18000, storages: [128, 256], pop: 5, quirks: { battery: 1.3 }, note: 'пластиковая спинка' },
    { id: 's21u', brand: 'Samsung', name: 'Galaxy S21 Ultra', tier: 3, base: 25000, storages: [128, 256, 512], pop: 4, quirks: { camera: 1.3 }, note: 'зум 10x' },
    { id: 's22', brand: 'Samsung', name: 'Galaxy S22', tier: 3, base: 25000, storages: [128, 256], pop: 4, quirks: { battery: 1.7 }, note: 'маленький и греется' },
    { id: 's23', brand: 'Samsung', name: 'Galaxy S23', tier: 3, base: 35000, storages: [128, 256, 512], pop: 4, quirks: {}, note: 'компактный флагман' },
    { id: 's23u', brand: 'Samsung', name: 'Galaxy S23 Ultra', tier: 4, base: 55000, storages: [256, 512, 1024], pop: 4, quirks: { screen_dead: 1.2 }, note: 'со стилусом' },
    { id: 's24u', brand: 'Samsung', name: 'Galaxy S24 Ultra', tier: 4, base: 75000, storages: [256, 512, 1024], pop: 3, quirks: {}, note: 'титан' },
    { id: 'note20u', brand: 'Samsung', name: 'Galaxy Note 20 Ultra', tier: 3, base: 22000, storages: [128, 256, 512], pop: 3, quirks: { battery: 1.7, screen_dead: 1.2 }, note: 'последняя нота' },
    { id: 'zflip3', brand: 'Samsung', name: 'Galaxy Z Flip 3', tier: 3, base: 22000, storages: [128, 256], pop: 4, fold: true, quirks: { screen_crack: 2.6, screen_dead: 1.6, frame: 1.6, battery: 1.5 }, note: 'складка и шлейф — боль' },
    { id: 'zflip4', brand: 'Samsung', name: 'Galaxy Z Flip 4', tier: 3, base: 30000, storages: [128, 256, 512], pop: 4, fold: true, quirks: { screen_crack: 2.4, screen_dead: 1.5, battery: 1.4 }, note: 'красивый, но хрупкий' },
    { id: 'zflip5', brand: 'Samsung', name: 'Galaxy Z Flip 5', tier: 4, base: 45000, storages: [256, 512], pop: 3, fold: true, quirks: { screen_crack: 2.0, screen_dead: 1.4 }, note: 'большой внешний экран' },
    { id: 'zfold3', brand: 'Samsung', name: 'Galaxy Z Fold 3', tier: 3, base: 35000, storages: [256, 512], pop: 3, fold: true, quirks: { screen_crack: 2.2, screen_dead: 1.8, battery: 1.4 }, note: 'планшет в кармане' },
    { id: 'zfold4', brand: 'Samsung', name: 'Galaxy Z Fold 4', tier: 4, base: 50000, storages: [256, 512, 1024], pop: 3, fold: true, quirks: { screen_crack: 2.0, screen_dead: 1.6 }, note: 'дорогой в ремонте' },

    // ---------- XIAOMI / REDMI / POCO ----------
    { id: 'r9a', brand: 'Xiaomi', name: 'Redmi 9A', tier: 1, base: 4000, storages: [32, 64, 128], pop: 7, quirks: { charging: 1.6, battery: 1.5 }, note: 'телефон для звонков' },
    { id: 'rn10', brand: 'Xiaomi', name: 'Redmi Note 10', tier: 1, base: 7000, storages: [64, 128], pop: 6, quirks: { battery: 1.4 }, note: 'AMOLED за копейки' },
    { id: 'rn12', brand: 'Xiaomi', name: 'Redmi Note 12', tier: 2, base: 11000, storages: [128, 256], pop: 5, quirks: { charging: 1.2 }, note: 'быстрая зарядка' },
    { id: 'mi12', brand: 'Xiaomi', name: 'Xiaomi 12', tier: 2, base: 22000, storages: [128, 256], pop: 3, quirks: { battery: 1.5 }, note: 'компактный, греется' },
    { id: 'mi13', brand: 'Xiaomi', name: 'Xiaomi 13', tier: 3, base: 35000, storages: [256, 512], pop: 2, quirks: {}, note: 'лейка' },
    { id: 'px3pro', brand: 'POCO', name: 'POCO X3 Pro', tier: 1, base: 9000, storages: [128, 256], pop: 5, quirks: { battery: 1.4, water: 1.4 }, note: 'народный игровой' },
    { id: 'px5', brand: 'POCO', name: 'POCO X5', tier: 2, base: 12000, storages: [128, 256], pop: 4, quirks: {}, note: 'сбалансированный' },
    { id: 'pf5', brand: 'POCO', name: 'POCO F5', tier: 2, base: 20000, storages: [256, 512], pop: 3, quirks: {}, note: 'мощный за свои деньги' },

    // ---------- HUAWEI / HONOR ----------
    { id: 'p30pro', brand: 'Huawei', name: 'P30 Pro', tier: 2, base: 12000, storages: [128, 256, 512], pop: 4, quirks: { battery: 1.5, screen_dead: 1.2 }, note: 'легендарная камера' },
    { id: 'p40', brand: 'Huawei', name: 'P40', tier: 2, base: 15000, storages: [128, 256], pop: 2, quirks: { battery: 1.3 }, note: 'без гугла' },
    { id: 'nova9', brand: 'Huawei', name: 'Nova 9', tier: 2, base: 11000, storages: [128, 256], pop: 3, quirks: { back: 1.3 }, note: 'тонкий и лёгкий' },
    { id: 'h8x', brand: 'Honor', name: 'Honor 8X', tier: 1, base: 5000, storages: [64, 128], pop: 3, quirks: { battery: 1.8 }, note: 'старичок, но живой' },
    { id: 'h50', brand: 'Honor', name: 'Honor 50', tier: 2, base: 13000, storages: [128, 256], pop: 3, quirks: {}, note: 'флагманский дизайн' },
    { id: 'magic5', brand: 'Honor', name: 'Honor Magic 5', tier: 3, base: 35000, storages: [256, 512], pop: 2, quirks: {}, note: 'недооценённый' },

    // ---------- ПРОЧИЕ ----------
    { id: 'pixel6', brand: 'Google', name: 'Pixel 6', tier: 2, base: 18000, storages: [128, 256], pop: 3, quirks: { battery: 1.3, charging: 1.5 }, note: 'чистый андроид' },
    { id: 'pixel7pro', brand: 'Google', name: 'Pixel 7 Pro', tier: 3, base: 32000, storages: [128, 256, 512], pop: 2, quirks: { screen_dead: 1.3 }, note: 'лучшая камера' },
    { id: 'op9', brand: 'OnePlus', name: 'OnePlus 9', tier: 2, base: 18000, storages: [128, 256], pop: 2, quirks: { battery: 1.4 }, note: 'быстрый, но греется' },
    { id: 'op11', brand: 'OnePlus', name: 'OnePlus 11', tier: 3, base: 38000, storages: [256, 512], pop: 2, quirks: {}, note: 'топ за свои деньги' },
    { id: 'nothing1', brand: 'Nothing', name: 'Nothing Phone (1)', tier: 2, base: 20000, storages: [128, 256], pop: 2, quirks: { back: 1.6 }, note: 'прозрачный, хайповый' },
    { id: 'realme8', brand: 'Realme', name: 'Realme 8', tier: 1, base: 8000, storages: [64, 128], pop: 3, quirks: { charging: 1.3 }, note: 'молодёжный бюджет' },
    { id: 'reno8', brand: 'OPPO', name: 'Reno 8', tier: 2, base: 14000, storages: [128, 256], pop: 2, quirks: { back: 1.4 }, note: 'камера и быстрая зарядка' },
    { id: 'vivo27', brand: 'vivo', name: 'V27', tier: 2, base: 16000, storages: [128, 256], pop: 2, quirks: {}, note: 'селфи-телефон' },
    { id: 'xperia10iv', brand: 'Sony', name: 'Xperia 10 IV', tier: 2, base: 17000, storages: [128, 256], pop: 1, quirks: { battery: 1.2 }, note: 'для аудиофилов' },
    { id: 'rog6', brand: 'ASUS', name: 'ROG Phone 6', tier: 3, base: 30000, storages: [256, 512], pop: 1, quirks: { frame: 1.4 }, note: 'игровой, с кулерами' }
  ];

  /* ---------- ПРОДАВЦЫ (когда покупаешь ты) ---------- */
  // knows — насколько продавец разбирается в телефонах и ценах (0..100)
  const SELLER_TYPES = [
    {
      id: 'normal', name: 'Обычный', w: 34, floor: [0.78, 0.9], patience: 6, honest: 0.55, knows: [38, 68],
      tone: 'neutral', note: 'адекватный, торгуется в разумных пределах'
    },
    {
      id: 'desperate', name: 'Срочно нужны деньги', w: 18, floor: [0.58, 0.72], patience: 5, honest: 0.6, knows: [20, 55],
      tone: 'anxious', note: 'готов уступить, лишь бы быстрее'
    },
    {
      id: 'greedy', name: 'Жадный', w: 16, floor: [0.88, 0.97], patience: 4, honest: 0.4, knows: [45, 78],
      tone: 'rude', note: 'считает каждую копейку'
    },
    {
      id: 'firm', name: 'Цена окончательная', w: 12, floor: [0.96, 1.0], patience: 3, honest: 0.5, knows: [60, 88],
      tone: 'cold', note: 'торга не будет'
    },
    {
      id: 'pro', name: 'Перекуп', w: 12, floor: [0.82, 0.9], patience: 6, honest: 0.25, knows: [85, 99],
      tone: 'pro', note: 'знает рынок, прячет дефекты'
    },
    {
      id: 'clueless', name: 'Не разбирается', w: 8, floor: [0.55, 0.7], patience: 6, honest: 0.7, knows: [6, 28],
      tone: 'kind', note: 'продаёт телефон внука и не знает цен'
    }
  ];

  /* ---------- ПОКУПАТЕЛИ (когда продаёшь ты) ---------- */
  // budget — доля рынка, которую готов заплатить максимум
  // haggle — насколько давит на цену (0..1)
  // knows — знание рынка (0..1): сильнее режет за дефекты
  // skill — шанс заметить скрытый дефект на встрече
  // polite — вежливость; грубость игрока может его выбесить
  // noshow — шанс не прийти на встречу
  const BUYERS = [
    { id: 'normal', name: 'Обычный покупатель', w: 13, budget: [0.9, 1.0], haggle: 0.4, knows: 0.5, skill: 0.3, polite: 0.8, patience: 6, noshow: 0.05, kind: 'normal', open: 'Здравствуйте! Телефон ещё актуален?' },
    { id: 'ded', name: 'Добрый дед', w: 5, budget: [0.95, 1.05], haggle: 0.15, knows: 0.15, skill: 0.1, polite: 0.95, patience: 8, noshow: 0.03, kind: 'kind', open: 'Внучек, здравствуй. А эта штука ещё продаётся?' },
    { id: 'kid', name: 'Школьник', w: 9, budget: [0.6, 0.82], haggle: 0.75, knows: 0.25, skill: 0.2, polite: 0.4, patience: 9, noshow: 0.12, kind: 'kid', open: 'здарова, а можно дешевле? у меня 3000 всего' },
    { id: 'rude', name: 'Быдло-давила', w: 7, budget: [0.75, 0.9], haggle: 0.85, knows: 0.35, skill: 0.3, polite: 0.1, patience: 5, noshow: 0.15, kind: 'rude', open: 'Чё так дорого? За такой хлам столько просишь?' },
    { id: 'shark', name: 'Профи-перекуп', w: 5, budget: [0.72, 0.86], haggle: 0.7, knows: 0.95, skill: 0.85, polite: 0.6, patience: 5, noshow: 0.04, kind: 'pro', open: 'Здравствуйте. По цене сразу: сколько реально отдадите?' },
    { id: 'wholesale', name: 'Оптовик', w: 2, budget: [0.65, 0.78], haggle: 0.6, knows: 0.8, skill: 0.6, polite: 0.5, patience: 4, noshow: 0.05, kind: 'pro', open: 'Беру потоком. Сколько таких у вас?' },
    { id: 'mom', name: 'Мама в декрете', w: 6, budget: [0.85, 0.95], haggle: 0.5, knows: 0.4, skill: 0.3, polite: 0.9, patience: 7, noshow: 0.08, kind: 'normal', open: 'Здравствуйте, а ребёнку подойдёт? И торг уместен?' },
    { id: 'student', name: 'Студент', w: 7, budget: [0.75, 0.88], haggle: 0.6, knows: 0.55, skill: 0.4, polite: 0.7, patience: 6, noshow: 0.1, kind: 'normal', open: 'Привет, а стипуха только в субботу. Поторгуемся?' },
    { id: 'shift', name: 'Вахтовик', w: 3, budget: [0.9, 1.0], haggle: 0.2, knows: 0.3, skill: 0.2, polite: 0.6, patience: 4, noshow: 0.06, kind: 'normal', open: 'Здорово. Наличкой, сегодня, где встречаемся?' },
    { id: 'collector', name: 'Коллекционер', w: 2, budget: [1.0, 1.15], haggle: 0.1, knows: 0.9, skill: 0.5, polite: 0.9, patience: 8, noshow: 0.02, kind: 'kind', open: 'Добрый день. Ищу именно эту модель в коллекцию. Состояние важно.' },
    { id: 'doubt', name: 'Сомневающийся', w: 6, budget: [0.85, 0.95], haggle: 0.45, knows: 0.45, skill: 0.35, polite: 0.85, patience: 12, noshow: 0.18, kind: 'normal', open: 'Здравствуйте. А можно ещё фото? И почему продаёте?' },
    { id: 'silent', name: 'Молчун', w: 3, budget: [0.9, 0.98], haggle: 0.25, knows: 0.5, skill: 0.4, polite: 0.5, patience: 4, noshow: 0.05, kind: 'cold', open: 'Цена?' },
    { id: 'today', name: 'Только сегодня', w: 3, budget: [0.8, 0.9], haggle: 0.5, knows: 0.6, skill: 0.4, polite: 0.5, patience: 3, noshow: 0.07, kind: 'cold', open: 'Беру сегодня, если скинете. Время до вечера.' },
    { id: 'suspicious', name: 'Подозрительный', w: 4, budget: [0.85, 0.95], haggle: 0.35, knows: 0.6, skill: 0.55, polite: 0.7, patience: 7, noshow: 0.09, kind: 'normal', open: 'Здравствуйте. А чек и коробка есть? Телефон не ворованный?' },
    { id: 'techie', name: 'Айтишник', w: 4, budget: [0.88, 0.98], haggle: 0.45, knows: 0.9, skill: 0.8, polite: 0.8, patience: 7, noshow: 0.03, kind: 'normal', open: 'Привет. Какой износ АКБ, какая прошивка, IMEI чистый?' },
    { id: 'granny', name: 'Бабушка', w: 3, budget: [0.9, 1.0], haggle: 0.3, knows: 0.1, skill: 0.05, polite: 0.95, patience: 9, noshow: 0.1, kind: 'kind', open: 'Здравствуйте, а этой штукой звонить можно? Внук сказал купить.' },
    { id: 'foreigner', name: 'Приезжий', w: 3, budget: [0.85, 0.95], haggle: 0.4, knows: 0.4, skill: 0.25, polite: 0.8, patience: 6, noshow: 0.08, kind: 'normal', open: 'Здравствуйте, извините, я плохо говорю. Телефон работает?' },
    { id: 'pawnshop', name: 'Скупщик', w: 2, budget: [0.68, 0.8], haggle: 0.6, knows: 0.85, skill: 0.7, polite: 0.6, patience: 4, noshow: 0.03, kind: 'pro', open: 'Сколько хотите? Я беру на реализацию, цена ниже рынка.' },
    { id: 'blogger', name: 'Блогер', w: 2, budget: [0.95, 1.08], haggle: 0.55, knows: 0.5, skill: 0.35, polite: 0.7, patience: 5, noshow: 0.1, kind: 'normal', open: 'Йоу! Нужен телефон для контента, снимите немного — и я ваш.' },
    { id: 'lawyer', name: 'Хитрый юрист', w: 2, budget: [0.9, 1.0], haggle: 0.4, knows: 0.8, skill: 0.6, polite: 0.85, patience: 9, noshow: 0.05, kind: 'pro', open: 'Добрый день. Гарантию дадите? По закону у меня 14 дней на возврат.' },
    { id: 'romantic', name: 'Романтик', w: 3, budget: [0.95, 1.1], haggle: 0.2, knows: 0.3, skill: 0.2, polite: 0.9, patience: 7, noshow: 0.06, kind: 'kind', open: 'Это же та самая модель! Я её давно хотел. Она в порядке?' },
    { id: 'nervous', name: 'Нервный', w: 3, budget: [0.85, 0.95], haggle: 0.3, knows: 0.4, skill: 0.3, polite: 0.8, patience: 5, noshow: 0.2, kind: 'normal', open: 'Здравствуйте, а можно Авито Доставкой? Я встречаться боюсь.' },
    { id: 'fan', name: 'Фанат модели', w: 3, budget: [0.9, 1.02], haggle: 0.35, knows: 0.95, skill: 0.5, polite: 0.7, patience: 8, noshow: 0.04, kind: 'normal', open: 'О, у вас именно этот! А батарея родная? А рамка не гнутая?' }
  ];

  /* ---------- ИМЕНА И ГОРОДА ---------- */
  const SELLER_NAMES = ['Алексей', 'Дмитрий', 'Сергей', 'Андрей', 'Иван', 'Максим', 'Роман', 'Никита', 'Егор', 'Артём',
    'Михаил', 'Павел', 'Кирилл', 'Денис', 'Антон', 'Илья', 'Владимир', 'Олег', 'Виктор', 'Григорий',
    'Анна', 'Елена', 'Ольга', 'Мария', 'Наталья', 'Светлана', 'Ирина', 'Татьяна', 'Юлия', 'Екатерина'];

  const CITIES = ['Москва', 'Москва', 'Москва', 'Москва', 'Москва', 'Москва', 'Москва', 'Москва',
    'Химки', 'Мытищи', 'Балашиха', 'Красногорск', 'Одинцово', 'Люберцы', 'Реутов', 'Домодедово',
    'Санкт-Петербург', 'Казань', 'Екатеринбург', 'Новосибирск', 'Тула', 'Владимир'];

  const METRO = ['Тверская', 'Арбатская', 'Курская', 'Павелецкая', 'Динамо', 'Белорусская',
    'Таганская', 'Китай-город', 'Чистые пруды', 'Маяковская', 'Проспект Мира', 'Сокол',
    'Бауманская', 'Электрозаводская', 'Автозаводская', 'Юго-Западная', 'Раменки', 'Ховрино'];

  const COLORS = ['чёрный', 'белый', 'серый', 'титановый', 'синий', 'зелёный', 'красный', 'розовый', 'фиолетовый'];

  /* ---------- ОСМОТР НА ВСТРЕЧЕ ---------- */
  const svg = (p) => '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  const ICONS = {
    screen: svg('<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8.5 21h7M12 17.4V21"/>'),
    battery: svg('<rect x="2" y="8" width="17" height="9" rx="2.5"/><path d="M22 11.2v2.6"/><path d="M5.6 11.2h5.2v2.6H5.6z" fill="currentColor" stroke="none"/>'),
    camera: svg('<rect x="3" y="7" width="18" height="13.5" rx="3.2"/><circle cx="12" cy="13.7" r="3.3"/><path d="M8.7 7l1.1-2.3h4.4L15.3 7"/>'),
    faceid: svg('<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M9 9.2v2.1M15 9.2v2.1M8.8 15.2c.8.9 1.9 1.4 3.2 1.4s2.4-.5 3.2-1.4"/>'),
    speaker: svg('<path d="M4 9.4h3.3L11.8 5.2v13.6L7.3 14.6H4z"/><path d="M15.4 9.2a4.2 4.2 0 010 5.6"/><path d="M18 6.8a7.8 7.8 0 010 10.4"/>'),
    charging: svg('<path d="M13.2 2.5L5.4 13.4h5.1L9.6 21.5l8-11.3h-5.1z"/>'),
    frame: svg('<rect x="6" y="2.6" width="12" height="18.8" rx="3.2"/><path d="M9.6 18.4h4.8"/>'),
    water: svg('<path d="M12 3.2s5.6 6.3 5.6 10.1a5.6 5.6 0 11-11.2 0C6.4 9.5 12 3.2 12 3.2z"/>'),
    cloud: svg('<rect x="4.6" y="10.2" width="14.8" height="10" rx="2.6"/><path d="M8.2 10.2V7.6a3.8 3.8 0 017.6 0v2.6"/>'),
    imei: svg('<circle cx="12" cy="12" r="8.8"/><path d="M5.8 5.8l12.4 12.4"/>')
  };

  const CHECKS = [
    { id: 'screen', name: 'Экран', icon: ICONS.screen, desc: 'Битые пиксели, сенсор, полосы', base: 0.85 },
    { id: 'battery', name: 'Аккумулятор', icon: ICONS.battery, desc: 'Здоровье, вздутие, циклы', base: 0.55 },
    { id: 'camera', name: 'Камеры', icon: ICONS.camera, desc: 'Фокус, пятна, все модули', base: 0.6 },
    { id: 'faceid', name: 'Face ID / сканер', icon: ICONS.faceid, desc: 'Разблокировка лицом или пальцем', base: 0.55 },
    { id: 'speaker', name: 'Динамики и микрофон', icon: ICONS.speaker, desc: 'Хрип, тишина в разговоре', base: 0.6 },
    { id: 'charging', name: 'Разъём зарядки', icon: ICONS.charging, desc: 'Держит ли кабель, греется ли', base: 0.6 },
    { id: 'frame', name: 'Корпус и стёкла', icon: ICONS.frame, desc: 'Рамка, крышка, трещины', base: 0.9 },
    { id: 'water', name: 'Следы влаги', icon: ICONS.water, desc: 'Индикаторы, окислы', base: 0.45 },
    { id: 'icloud', name: 'Аккаунты и блокировки', icon: ICONS.cloud, desc: 'iCloud, Google, пароль', base: 0.5, appleOnly: true },
    { id: 'imei', name: 'IMEI и чёрный список', icon: ICONS.imei, desc: 'Проверка базы, 100 ₽', base: 0.7, paid: 100 }
  ];

  /* ---------- АРТИКУЛЫ И ВНЕШНИЙ ВИД ---------- */
  // [номер модели, тип блока камер, тип выреза экрана]
  // cam: single | dual_v | dual_d | triple | pill3 | bar2 | rect2 | rect3 | circle3 | quad
  // notch: notch | chin | hole | drop | none | bezels
  const MODEL_EXTRA = {
    ip8: ['A1905', 'single', 'chin'],
    ipxr: ['A2105', 'single', 'notch'],
    ip11: ['A2221', 'dual_v', 'notch'],
    ip11pro: ['A2215', 'triple', 'notch'],
    ip12: ['A2402', 'dual_d', 'notch'],
    ip12pm: ['A2342', 'triple', 'notch'],
    ip13: ['A2633', 'dual_d', 'notch'],
    ip13pro: ['A2638', 'triple', 'notch'],
    ip13pm: ['A2643', 'triple', 'notch'],
    ip14: ['A2882', 'dual_d', 'notch'],
    ip14pro: ['A2890', 'triple', 'notch'],
    ip15: ['A3090', 'dual_d', 'notch'],
    ip15pm: ['A3108', 'triple', 'notch'],
    ipse2020: ['A2296', 'single', 'chin'],
    ipse2022: ['A2783', 'single', 'chin'],

    a12: ['SM-A125F', 'pill3', 'hole'],
    a32: ['SM-A325F', 'pill3', 'hole'],
    a52: ['SM-A525F', 'pill3', 'hole'],
    a54: ['SM-A546B', 'pill3', 'hole'],
    s20: ['SM-G980F', 'pill3', 'hole'],
    s21: ['SM-G991B', 'pill3', 'hole'],
    s21u: ['SM-G998B', 'pill3', 'hole'],
    s22: ['SM-S901B', 'pill3', 'hole'],
    s23: ['SM-S911B', 'pill3', 'hole'],
    s23u: ['SM-S918B', 'pill3', 'hole'],
    s24u: ['SM-S928B', 'pill3', 'hole'],
    note20u: ['SM-N986B', 'pill3', 'hole'],
    zflip3: ['SM-F711B', 'bar2', 'hole'],
    zflip4: ['SM-F721B', 'bar2', 'hole'],
    zflip5: ['SM-F731B', 'bar2', 'hole'],
    zfold3: ['SM-F926B', 'pill3', 'hole'],
    zfold4: ['SM-F936B', 'pill3', 'hole'],

    r9a: ['M2006C3LG', 'rect2', 'drop'],
    rn10: ['M2101K7AG', 'rect2', 'hole'],
    rn12: ['22111317G', 'rect2', 'hole'],
    mi12: ['2201123G', 'rect3', 'hole'],
    mi13: ['2211133G', 'rect3', 'hole'],
    px3pro: ['M2102J20SG', 'rect2', 'hole'],
    px5: ['22111317PG', 'rect2', 'hole'],
    pf5: ['23049PCD8G', 'rect2', 'hole'],

    p30pro: ['VOG-L29', 'bar2', 'drop'],
    p40: ['ANA-NX9', 'rect3', 'hole'],
    nova9: ['NAM-LX9', 'pill3', 'hole'],

    h8x: ['JSN-L21', 'rect2', 'notch'],
    h50: ['NTH-NX9', 'pill3', 'hole'],
    magic5: ['PGT-N19', 'circle3', 'hole'],

    pixel6: ['GB7N6', 'bar2', 'hole'],
    pixel7pro: ['GE2AE', 'bar2', 'hole'],
    op9: ['LE2113', 'rect2', 'hole'],
    op11: ['CPH2447', 'circle3', 'hole'],
    nothing1: ['A063', 'dual_v', 'hole'],
    realme8: ['RMX3085', 'rect2', 'hole'],
    reno8: ['CPH2359', 'pill3', 'hole'],
    vivo27: ['V2231', 'pill3', 'hole'],
    xperia10iv: ['XQ-CC54', 'pill3', 'bezels'],
    rog6: ['AI2201', 'rect2', 'hole']
  };

  for (const m of MODELS) {
    const e = MODEL_EXTRA[m.id];
    if (e) { m.code = e[0]; m.cam = e[1]; m.notch = e[2]; }
    else { m.code = ''; m.cam = 'rect2'; m.notch = 'hole'; }
  }

  /* ---------- НОВЫЕ МОДЕЛИ 2024–2026 ---------- */
  // [id, бренд, название, тир, цена, памяти, популярность, артикул, камера, складной]
  const NEW_MODELS = [
    // Apple
    ['ip16', 'Apple', 'iPhone 16', 3, 60000, [128, 256, 512], 8, 'A3081', 'dual_d'],
    ['ip16plus', 'Apple', 'iPhone 16 Plus', 3, 67000, [128, 256, 512], 5, 'A3082', 'dual_d'],
    ['ip16pro', 'Apple', 'iPhone 16 Pro', 4, 80000, [128, 256, 512, 1024], 7, 'A3293', 'triple'],
    ['ip16pm', 'Apple', 'iPhone 16 Pro Max', 4, 95000, [256, 512, 1024], 6, 'A3296', 'triple'],
    ['ip16e', 'Apple', 'iPhone 16e', 2, 42000, [128, 256, 512], 6, 'A3410', 'single'],
    ['ip17', 'Apple', 'iPhone 17', 3, 72000, [128, 256, 512], 6, 'A3256', 'dual_d'],
    ['ip17air', 'Apple', 'iPhone 17 Air', 3, 78000, [256, 512, 1024], 5, 'A3260', 'single'],
    ['ip17pro', 'Apple', 'iPhone 17 Pro', 4, 98000, [256, 512, 1024], 6, 'A3255', 'triple'],
    ['ip17pm', 'Apple', 'iPhone 17 Pro Max', 4, 112000, [256, 512, 1024], 5, 'A3257', 'triple'],
    ['ip18', 'Apple', 'iPhone 18', 3, 85000, [128, 256, 512], 5, 'A3300', 'dual_d'],
    ['ip18pro', 'Apple', 'iPhone 18 Pro', 4, 112000, [256, 512, 1024], 5, 'A3302', 'triple'],
    ['ip18pm', 'Apple', 'iPhone 18 Pro Max', 4, 132000, [256, 512, 1024], 4, 'A3304', 'triple'],
    ['ipfold', 'Apple', 'iPhone Fold', 4, 300000, [256, 512, 1024], 3, 'A3350', 'dual_v', 1],

    // Samsung
    ['s24fe', 'Samsung', 'Galaxy S24 FE', 2, 40000, [128, 256], 5, 'SM-S721B', 'pill3'],
    ['s25', 'Samsung', 'Galaxy S25', 3, 52000, [128, 256, 512], 5, 'SM-S931B', 'pill3'],
    ['s25plus', 'Samsung', 'Galaxy S25+', 3, 62000, [256, 512], 4, 'SM-S936B', 'pill3'],
    ['s25u', 'Samsung', 'Galaxy S25 Ultra', 4, 82000, [256, 512, 1024], 5, 'SM-S938B', 'pill3'],
    ['s25edge', 'Samsung', 'Galaxy S25 Edge', 3, 68000, [256, 512], 3, 'SM-S937B', 'pill3'],
    ['s26', 'Samsung', 'Galaxy S26', 3, 68000, [128, 256, 512], 4, 'SM-S942B', 'pill3'],
    ['s26plus', 'Samsung', 'Galaxy S26+', 3, 78000, [256, 512], 3, 'SM-S947B', 'pill3'],
    ['s26u', 'Samsung', 'Galaxy S26 Ultra', 4, 98000, [256, 512, 1024], 4, 'SM-S948B', 'pill3'],
    ['zflip6', 'Samsung', 'Galaxy Z Flip 6', 3, 42000, [256, 512], 5, 'SM-F741B', 'bar2', 1],
    ['zflip7', 'Samsung', 'Galaxy Z Flip 7', 3, 58000, [256, 512], 5, 'SM-F766B', 'bar2', 1],
    ['zfold6', 'Samsung', 'Galaxy Z Fold 6', 4, 70000, [256, 512, 1024], 4, 'SM-F956B', 'pill3', 1],
    ['zfold7', 'Samsung', 'Galaxy Z Fold 7', 4, 92000, [256, 512, 1024], 4, 'SM-F966B', 'pill3', 1],
    ['a56', 'Samsung', 'Galaxy A56', 2, 24000, [128, 256], 6, 'SM-A566B', 'pill3'],
    ['a36', 'Samsung', 'Galaxy A36', 2, 17000, [128, 256], 5, 'SM-A366B', 'pill3'],
    ['a26', 'Samsung', 'Galaxy A26', 1, 13000, [128, 256], 5, 'SM-A266B', 'pill3'],
    ['a57', 'Samsung', 'Galaxy A57', 2, 29000, [128, 256], 4, 'SM-A576B', 'pill3'],

    // Google
    ['pixel8a', 'Google', 'Pixel 8a', 2, 22000, [128, 256], 4, 'GKV4X', 'bar2'],
    ['pixel9', 'Google', 'Pixel 9', 3, 32000, [128, 256], 4, 'GR1YH', 'bar2'],
    ['pixel9pro', 'Google', 'Pixel 9 Pro', 3, 45000, [128, 256, 512], 3, 'GR83Y', 'bar2'],
    ['pixel9pf', 'Google', 'Pixel 9 Pro Fold', 4, 68000, [256, 512], 3, 'GGH2Z', 'bar2', 1],
    ['pixel10', 'Google', 'Pixel 10', 3, 42000, [128, 256], 4, 'GLBW0', 'bar2'],
    ['pixel10pro', 'Google', 'Pixel 10 Pro', 4, 55000, [128, 256, 512], 3, 'GZP1Y', 'bar2'],
    ['pixel10xl', 'Google', 'Pixel 10 Pro XL', 4, 65000, [256, 512], 2, 'GZP2X', 'bar2'],
    ['pixel10pf', 'Google', 'Pixel 10 Pro Fold', 4, 90000, [256, 512, 1024], 2, 'GZP3Z', 'bar2', 1],
    ['pixel10a', 'Google', 'Pixel 10a', 2, 28000, [128, 256], 4, 'GLP1A', 'bar2'],

    // Xiaomi / Redmi / POCO
    ['mi14t', 'Xiaomi', 'Xiaomi 14T', 2, 32000, [256, 512], 4, '24069PC21G', 'rect3'],
    ['mi14tp', 'Xiaomi', 'Xiaomi 14T Pro', 3, 42000, [256, 512, 1024], 3, '24069PC28G', 'rect3'],
    ['mi15', 'Xiaomi', 'Xiaomi 15', 3, 52000, [256, 512], 3, '24129PN74G', 'rect3'],
    ['mi15u', 'Xiaomi', 'Xiaomi 15 Ultra', 4, 78000, [256, 512, 1024], 2, '24129PN74U', 'circle3'],
    ['mi16', 'Xiaomi', 'Xiaomi 16', 3, 62000, [256, 512], 3, '25113PN0EG', 'rect3'],
    ['mi16u', 'Xiaomi', 'Xiaomi 16 Ultra', 4, 88000, [256, 512, 1024], 2, '25113PN0EU', 'circle3'],
    ['rn14', 'Xiaomi', 'Redmi Note 14', 1, 14000, [128, 256], 6, '24094RAD4G', 'rect2'],
    ['rn14p', 'Xiaomi', 'Redmi Note 14 Pro', 2, 19000, [128, 256, 512], 5, '24094RAD4P', 'rect2'],
    ['rn15', 'Xiaomi', 'Redmi Note 15', 2, 17000, [128, 256], 5, '25094RAD4G', 'rect2'],
    ['rn15p', 'Xiaomi', 'Redmi Note 15 Pro', 2, 23000, [256, 512], 4, '25094RAD4P', 'rect2'],
    ['redmi15', 'Xiaomi', 'Redmi 15', 1, 9000, [64, 128, 256], 6, '25082RNC1G', 'rect2'],
    ['redmia5', 'Xiaomi', 'Redmi A5', 1, 5500, [32, 64, 128], 5, '25028RN03G', 'single'],
    ['pocox7', 'POCO', 'POCO X7', 2, 18000, [128, 256], 5, '24048PC04G', 'rect2'],
    ['pocox7p', 'POCO', 'POCO X7 Pro', 2, 23000, [256, 512], 4, '24048PC04P', 'rect3'],
    ['pocof7', 'POCO', 'POCO F7', 2, 30000, [256, 512], 4, '25053PC47G', 'rect3'],
    ['pocof7p', 'POCO', 'POCO F7 Pro', 3, 38000, [256, 512], 3, '25053PC47P', 'rect3'],
    ['pocof8', 'POCO', 'POCO F8', 3, 34000, [256, 512], 3, '25103PC47G', 'rect3'],
    ['mixflip2', 'Xiaomi', 'Xiaomi Mix Flip 2', 4, 55000, [256, 512], 3, '25019PNF3G', 'dual_v', 1],

    // OnePlus / Nothing
    ['op13', 'OnePlus', 'OnePlus 13', 3, 55000, [256, 512], 3, 'CPH2649', 'circle3'],
    ['op13r', 'OnePlus', 'OnePlus 13R', 2, 32000, [256, 512], 3, 'CPH2645', 'rect2'],
    ['op15', 'OnePlus', 'OnePlus 15', 3, 68000, [256, 512, 1024], 2, 'CPH2745', 'circle3'],
    ['nord4', 'OnePlus', 'OnePlus Nord 4', 2, 22000, [256, 512], 3, 'CPH2619', 'rect2'],
    ['np2a', 'Nothing', 'Nothing Phone (2a)', 2, 16000, [128, 256], 4, 'A142', 'dual_v'],
    ['np3', 'Nothing', 'Nothing Phone (3)', 3, 42000, [256, 512], 3, 'A059P', 'dual_v'],
    ['np3a', 'Nothing', 'Nothing Phone (3a)', 2, 22000, [128, 256], 4, 'A059', 'dual_v'],
    ['cmf2', 'Nothing', 'CMF Phone 2', 1, 11000, [128, 256], 3, 'A015', 'dual_v'],

    // Honor / Huawei
    ['hm7p', 'Honor', 'Honor Magic 7 Pro', 3, 55000, [256, 512], 3, 'BKQ-N49', 'circle3'],
    ['hm8p', 'Honor', 'Honor Magic 8 Pro', 4, 72000, [256, 512, 1024], 2, 'BKQ-N59', 'circle3'],
    ['h200', 'Honor', 'Honor 200', 2, 19000, [128, 256, 512], 4, 'ELI-NX9', 'pill3'],
    ['h400', 'Honor', 'Honor 400', 2, 24000, [256, 512], 4, 'WDY-NX9', 'pill3'],
    ['mv3', 'Honor', 'Honor Magic V3', 4, 85000, [256, 512], 2, 'FMA-N29', 'pill3', 1],
    ['mv5', 'Honor', 'Honor Magic V5', 4, 105000, [256, 512, 1024], 2, 'FMA-N59', 'pill3', 1],
    ['pura70', 'Huawei', 'Huawei Pura 70', 3, 38000, [256, 512], 3, 'ADY-LX9', 'rect3'],
    ['pura80', 'Huawei', 'Huawei Pura 80', 3, 48000, [256, 512], 2, 'HED-LX9', 'rect3'],
    ['mate70', 'Huawei', 'Huawei Mate 70', 4, 62000, [256, 512, 1024], 2, 'CLS-LX9', 'circle3'],
    ['matex6', 'Huawei', 'Huawei Mate X6', 4, 115000, [256, 512], 2, 'ICL-LX9', 'pill3', 1],
    ['nova13', 'Huawei', 'Huawei Nova 13', 2, 19000, [256, 512], 4, 'BKY-LX9', 'pill3'],

    // vivo / OPPO / Realme
    ['x200p', 'vivo', 'vivo X200 Pro', 3, 58000, [256, 512], 3, 'V2419', 'circle3'],
    ['x200u', 'vivo', 'vivo X200 Ultra', 4, 72000, [256, 512, 1024], 2, 'V2465', 'circle3'],
    ['xf3p', 'vivo', 'vivo X Fold 3 Pro', 4, 75000, [256, 512], 2, 'V2307', 'pill3', 1],
    ['v40', 'vivo', 'vivo V40', 2, 24000, [256, 512], 4, 'V2403', 'pill3'],
    ['y29', 'vivo', 'vivo Y29', 1, 9000, [128, 256], 4, 'V2331', 'rect2'],
    ['fx8p', 'OPPO', 'OPPO Find X8 Pro', 3, 62000, [256, 512], 3, 'CPH2659', 'circle3'],
    ['fx8', 'OPPO', 'OPPO Find X8', 3, 48000, [256, 512], 3, 'CPH2651', 'circle3'],
    ['reno12', 'OPPO', 'OPPO Reno 12', 2, 21000, [256, 512], 4, 'CPH2625', 'pill3'],
    ['fn5', 'OPPO', 'OPPO Find N5', 4, 115000, [256, 512], 2, 'CPH2697', 'pill3', 1],
    ['gt7p', 'Realme', 'Realme GT7 Pro', 3, 38000, [256, 512], 3, 'RMX5011', 'circle3'],
    ['gt7', 'Realme', 'Realme GT7', 2, 28000, [256, 512], 4, 'RMX5051', 'rect2'],
    ['r14p', 'Realme', 'Realme 14 Pro', 2, 18000, [256, 512], 4, 'RMX5056', 'pill3'],
    ['p3u', 'Realme', 'Realme P3 Ultra', 2, 23000, [256, 512], 3, 'RMX5053', 'pill3'],

    // ASUS / Sony / Motorola / прочие
    ['rog9', 'ASUS', 'ROG Phone 9', 3, 58000, [256, 512], 2, 'AI2501', 'rect2'],
    ['rog9p', 'ASUS', 'ROG Phone 9 Pro', 4, 72000, [256, 512, 1024], 2, 'AI2501P', 'rect2'],
    ['xp1vii', 'Sony', 'Xperia 1 VII', 3, 68000, [256, 512], 2, 'XQ-EC72', 'pill3'],
    ['xp10vii', 'Sony', 'Xperia 10 VII', 2, 28000, [128, 256], 3, 'XQ-CC72', 'pill3'],
    ['razr60u', 'Motorola', 'Motorola Razr 60 Ultra', 3, 56000, [256, 512], 3, 'XT2453', 'dual_v', 1],
    ['razr50', 'Motorola', 'Motorola Razr 50', 2, 32000, [256, 512], 3, 'XT2453-2', 'dual_v', 1],
    ['edge60p', 'Motorola', 'Motorola Edge 60 Pro', 2, 28000, [256, 512], 3, 'XT2507', 'circle3'],
    ['motog85', 'Motorola', 'Moto G85', 1, 14000, [128, 256], 4, 'XT2427', 'rect2'],
    ['phantomv2', 'Tecno', 'Tecno Phantom V Fold 2', 3, 42000, [256, 512], 2, 'AE10', 'pill3', 1],
    ['camon40', 'Tecno', 'Tecno Camon 40', 1, 11000, [128, 256], 3, 'CLA6', 'rect2'],
    ['note50', 'Infinix', 'Infinix Note 50', 1, 11000, [128, 256], 3, 'X6851', 'rect2'],
    ['zeroflip', 'Infinix', 'Infinix Zero Flip', 2, 28000, [256, 512], 2, 'X6861', 'rect2', 1]
  ];

  for (const row of NEW_MODELS) {
    const [id, brand, name, tier, base, storages, pop, code, cam, fold] = row;
    MODELS.push({
      id: id, brand: brand, name: name, tier: tier, base: base, storages: storages, pop: pop,
      fold: !!fold, code: code, cam: cam, notch: brand === 'Apple' ? 'notch' : 'hole',
      note: TIER_NAMES[tier],
      quirks: fold ? { screen_crack: 2.4, screen_dead: 1.5, battery: 1.2 } : (tier >= 3 ? { battery: 1.2 } : {})
    });
  }

  root.DATA = {
    TIER_NAMES, DEFECTS, DEFECT_KEYS, REPAIR_COST, REPAIR_NAMES, PART_QUALITY,
    MODELS, SELLER_TYPES, BUYERS, SELLER_NAMES, CITIES, METRO, COLORS, CHECKS
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.DATA;
})(typeof window !== 'undefined' ? window : globalThis);
