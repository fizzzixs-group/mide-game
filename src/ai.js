/* ============================================================
   AVITO FLIP — диалоги.
   Правило: числа и решения считает движок, LLM только озвучивает.
   ============================================================ */
(function (root) {
  'use strict';

  const D = root.DATA;

  const AI = {
    key: '',
    model: 'deepseek-chat',
    lastError: '',
    stats: { calls: 0, ok: 0, fail: 0 }
  };

  const isHttp = typeof location !== 'undefined' && /^https?:/.test(location.protocol);

  AI.setKey = function (k) {
    AI.key = (k || '').trim();
    AI.lastError = '';
  };

  AI.available = function () {
    return !!AI.key && isHttp;
  };

  function shortError(e) {
    const s = String(e || '');
    if (/401|Authentication|invalid/i.test(s)) return 'ключ не принят';
    if (/402|insufficient|balance/i.test(s)) return 'на ключе закончились деньги';
    if (/429|rate limit/i.test(s)) return 'слишком много запросов подряд';
    if (/AbortError|timeout|таймаут/i.test(s)) return 'таймаут ответа';
    if (/Failed to fetch|NetworkError|ECONN|ENOTFOUND/i.test(s)) return 'нет связи с сервером';
    return s.replace(/^HTTP \d+:\s*/, '').replace(/[{}"]/g, '').slice(0, 60);
  }

  AI.chat = async function (messages, opts) {
    opts = opts || {};
    if (!AI.available()) return { ok: false, error: 'no_key' };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeout || 12000);
    AI.stats.calls++;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: AI.key,
          model: AI.model,
          messages: messages,
          temperature: opts.temperature != null ? opts.temperature : 0.95,
          max_tokens: opts.maxTokens || 140
        }),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!res.ok) {
        const txt = await res.text();
        AI.stats.fail++;
        AI.lastErrorRaw = 'HTTP ' + res.status + ': ' + txt.slice(0, 200);
        AI.lastError = shortError(txt) || ('HTTP ' + res.status);
        return { ok: false, error: AI.lastError };
      }
      const data = await res.json();
      if (!data || !data.content) {
        AI.stats.fail++;
        AI.lastError = 'пустой ответ';
        return { ok: false, error: AI.lastError };
      }
      AI.stats.ok++;
      AI.lastError = '';
      return { ok: true, content: String(data.content).trim() };
    } catch (e) {
      clearTimeout(timer);
      AI.stats.fail++;
      AI.lastErrorRaw = String(e && e.message || e);
      AI.lastError = e && e.name === 'AbortError' ? 'таймаут ответа' : shortError(AI.lastErrorRaw);
      return { ok: false, error: AI.lastError };
    }
  };

  /* ---------- контекст продавца ---------- */
  function sellerSystem(ctx) {
    const l = ctx.listing;
    const m = root.Engine.MODELS_BY_ID[l.modelId];
    const defects = l.defects.filter(d => d.disclosed)
      .map(d => D.DEFECTS[d.key].name.toLowerCase()).join(', ') || 'явных проблем нет';
    const agreed = l.neg && l.neg.agreedPrice;
    return [
      'Ты — ' + l.seller.name + ', продаёшь телефон на Авито в ' + l.city + '.',
      'Твой типаж: ' + l.seller.typeName + '.',
      'Телефон: ' + m.name + ' ' + l.storage + ' ГБ, ' + l.color + ', состояние ' + (l.cosmetic > 0.8 ? 'хорошее' : l.cosmetic > 0.6 ? 'среднее' : 'потрёпанное') + '.',
      'Что уже известно покупателю: ' + defects + '.',
      agreed ? 'Вы уже договорились на ' + agreed + ' ₽ — это финальная цена сделки.' : 'Ты просишь ' + l.ask + ' ₽.',
      'У тебя есть внутренний предел, ниже которого ты не пойдёшь, но ты НИКОГДА его не называешь и не намекаешь, сколько ещё готов уступить.',
      'Называй только ту сумму, которая указана в задании ниже. Других чисел не произноси.',
      'Пиши как живой человек в мессенджере: 1–2 коротких предложения, разговорно, по-русски.',
      'Без эмодзи, без списков, без markdown, без обращений «уважаемый покупатель».',
      'Не выдумывай фактов о телефоне (комплектацию, гарантию, ремонты), которых нет в данных.',
      ''
    ].join('\n');
  }

  /* ---------- контекст покупателя ---------- */
  function buyerSystem(ctx) {
    const b = ctx.buyer;
    const l = ctx.listing;
    const m = root.Engine.MODELS_BY_ID[l.modelId];
    const persona = D.BUYERS.find(x => x.id === b.personaId) || { open: '' };
    const agreed = b.agreedPrice;
    return [
      'Ты — ' + b.personaName + ' на Авито. Ты хочешь купить ' + m.name + ' ' + l.storage + ' ГБ.',
      'Твой характер: ' + b.kind + '. Ты ' + (b.polite > 0.7 ? 'вежливый' : b.polite > 0.4 ? 'нейтральный' : 'резкий и грубоватый') + '.',
      agreed ? 'Вы уже договорились на ' + agreed + ' ₽ — это финальная цена сделки.' : 'Продавец просит ' + l.ask + ' ₽. Сейчас ты предлагаешь ' + b.offer + ' ₽.',
      'Твой максимум — секрет: ты можешь сказать, что дорого, но не называй точную сумму, которую готов заплатить.',
      'Называй только ту сумму, которая указана в задании ниже.',
      'Ты ' + (b.knows > 0.7 ? 'хорошо знаешь рынок и цены' : b.knows > 0.4 ? 'примерно знаешь цены' : 'плохо разбираешься в ценах') + '.',
      'Пиши как живой человек в мессенджере: 1–2 коротких предложения, разговорно, по-русски.',
      'Без эмодзи, без списков, без markdown.',
      ''
    ].join('\n');
  }

  /* ---------- что делать ---------- */
  function sellerAction(intent, ctx) {
    const l = ctx.listing;
    switch (intent.kind) {
      case 'accept': return 'Ты согласился продать за ' + intent.price + ' ₽. Подтверди договорённость и предложи встретиться. Назови только эту сумму.';
      case 'counter': return 'Покупатель дал мало. Назови ровно ' + intent.price + ' ₽ и скажи, что это уже с уступкой. Других сумм не называй, про свой предел не говори.';
      case 'reject': return intent.lowball
        ? 'Покупатель предложил совсем мало. Откажи резко и назови ровно ' + intent.price + ' ₽. Других сумм не называй.'
        : 'Покупатель дал мало. Откажи и назови ровно ' + intent.price + ' ₽. Других сумм не называй.';
      case 'defect': return 'Ты признаёшь проблему: ' + D.DEFECTS[intent.defect].name.toLowerCase() + '. Скажи об этом и назови новую цену — ровно ' + l.ask + ' ₽. Других сумм не называй.';
      case 'info': return 'Ответь на вопрос покупателя про ' + (intent.subject === 'battery' ? 'аккумулятор' : intent.subject === 'documents' ? 'документы и коробку' : 'состояние') + '. Коротко, без упоминания цены.';
      case 'meet': return 'Ты согласен встретиться у метро ' + intent.metro + '. Скажи, что удобно сегодня, и уточни время. Цену не обсуждай.';
      case 'leave': return 'Ты устал от торга и уходишь из чата. Скажи это по-своему.';
      case 'shipping_only': return 'Ты не в Москве, личная встреча невозможна. Предложи отправить Авито Доставкой.';
      case 'talk': return 'Ответь на последнее сообщение покупателя в своём характере. Если он спросит цену — назови ровно ' + ((l.neg && l.neg.agreedPrice) || l.ask) + ' ₽, других чисел не произноси.';
      default: return 'Ответь коротко и по делу.';
    }
  }

  function buyerAction(intent, ctx) {
    const b = ctx.buyer;
    switch (intent.kind) {
      case 'accept': return 'Ты согласился купить за ' + intent.price + ' ₽. Подтверди и предложи встретиться. Назови только эту сумму.';
      case 'counter': return 'Ты не согласен с ценой продавца. Откажись и назови ровно ' + intent.price + ' ₽. Других сумм не называй.';
      case 'reject_price': return 'Цена продавца для тебя слишком высокая. Откажись и напомни свою — ровно ' + intent.price + ' ₽.';
      case 'too_expensive': return 'Тебе это дорого, ты столько не потянешь. Скажи это, но НЕ называй сумму, которую можешь заплатить.';
      case 'disclosed': return 'Продавец сам рассказал про дефект: ' + D.DEFECTS[intent.defect].name.toLowerCase() + '. Отреагируй и назови новую цену — ровно ' + intent.price + ' ₽.';
      case 'meet': return 'Ты согласен на встречу. Скажи, куда и когда подъедешь.';
      case 'leave': return 'Ты уходишь из чата. Скажи это коротко.';
      case 'not_buying': return 'Ты сомневаешься и не готов брать. Ответь уклончиво.';
      case 'nothing_to_disclose': return 'Продавец предлагает рассказать о дефектах, а тебе и так всё нормально. Ответь.';
      case 'talk': return 'Ответь на последнее сообщение продавца в своём характере. Если он спросит цену — можешь назвать только ' + (b.agreedPrice || b.offer) + ' ₽, других чисел не произноси.';
      default: return 'Ответь коротко и по делу.';
    }
  }

  function historyToMessages(chat, limit) {
    const out = [];
    const src = (chat || []).filter(m => m.who === 'me' || m.who === 'them').slice(-(limit || 8));
    for (const m of src) out.push({ role: m.who === 'me' ? 'user' : 'assistant', content: m.text });
    return out;
  }

  /* ---------- оффлайн-шаблоны ---------- */
  const TONE = {
    neutral: {
      accept: ['Ок, по рукам. {price} ₽, встречаемся.', 'Договорились, {price} ₽. Когда удобно?', 'Ладно, согласен. {price} ₽ и всё.'],
      counter: ['Нет, за столько не отдам. {price} ₽ — и это минимум.', 'Не пойдёт. Я рассчитывал на {price} ₽.', '{price} ₽, иначе не интересно.'],
      reject: ['Не, это слишком мало. {price} ₽.', 'За такие деньги не продам. Ближе к {price} ₽.', 'Ну нет, за это я не отдам. {price} ₽.'],
      defect: ['Да, есть такое. Тогда {price} ₽.', 'Не скрываю: {price} ₽ с учётом этого.']
    },
    anxious: {
      accept: ['Хорошо, забирайте за {price} ₽, мне срочно нужно.', 'Ладно, {price} ₽, только сегодня.', 'Согласен. {price} ₽, я спешу.'],
      counter: ['Мне бы {price} ₽, правда нужно срочно.', 'Меньше {price} ₽ не смогу, деньги нужны.', '{price} ₽, пожалуйста, я тороплюсь.'],
      reject: ['Нет, так не пойдёт. Мне нужно хотя бы {price} ₽.', 'Слишком мало, у меня {price} ₽ в объявлении.']
    },
    rude: {
      accept: ['Ну ладно, забирай за {price} ₽.', 'Хрен с тобой, {price} ₽.', 'Договорились, {price} ₽.'],
      counter: ['Чё ты мне тут? {price} ₽ и точка.', 'Не смеши. {price} ₽.', 'Я сказал {price} ₽.'],
      reject: ['Ты чё, совсем? {price} ₽.', 'За копейки хочешь? {price} ₽.', 'Иди на рынок, там дешевле. {price} ₽.']
    },
    cold: {
      accept: ['Хорошо. {price} ₽.', 'Договорились. {price} ₽.'],
      counter: ['Нет. {price} ₽.', 'Цена {price} ₽.', '{price} ₽.'],
      reject: ['Нет. {price} ₽.', 'Не подходит. {price} ₽.']
    },
    pro: {
      accept: ['Ок, {price} ₽, забираю.', 'По рукам, {price} ₽.', 'Договорились. {price} ₽, наличные?'],
      counter: ['Мне нужно {price} ₽, это уже с учётом рынка.', 'По рынку {price} ₽, ниже некуда.', '{price} ₽ — честная цена.'],
      reject: ['Не, {price} ₽, и я знаю, сколько это стоит.', 'Слишком низко. {price} ₽.']
    },
    kind: {
      accept: ['Конечно, забирайте за {price} ₽. Спасибо!', 'Хорошо, {price} ₽. Пусть телефон радует.', 'Да, {price} ₽ — и он ваш.'],
      counter: ['Понимаю вас, но {price} ₽ — это уже уступка.', 'Хотелось бы {price} ₽, честно.', '{price} ₽, и я ещё чехол отдам.']
    }
  };

  const BUY_TPL = {
    normal: {
      accept: ['Беру! {price} ₽, договорились.', 'Хорошо, {price} ₽ меня устраивает. Когда можно посмотреть?'],
      counter: ['Мне бы подешевле. {price} ₽?', 'За {price} ₽ возьму.', 'Давайте хоть до {price} ₽ скинемся.'],
      reject_price: ['Дороговато для меня. Я по {price} ₽ готов.', 'За такую цену не возьму, вот {price} ₽.'],
      too_expensive: ['Это выше моего бюджета, извините.', 'Дорого для меня, столько нет.'],
      open: ['Здравствуйте! Телефон ещё актуален?']
    },
    kid: {
      accept: ['да ладно, беру за {price}. только денег у меня впритык', 'ок, {price}, уговорил'],
      counter: ['а можно {price}? у меня просто больше нет', 'ну {price}, пожалуйста 🙏', 'могу {price}, больше не наскребу'],
      reject_price: ['да ну, дорого. {price} могу'],
      too_expensive: ['у меня столько нет, я школьник'],
      open: ['здарова, а можно дешевле? у меня немного денег']
    },
    rude: {
      accept: ['Ладно, {price}, забираю.', 'По рукам, {price} ₽.'],
      counter: ['За такое {price} ₽ и то много.', 'Давай {price} ₽ и расходимся.', '{price} ₽, не больше.'],
      reject_price: ['Ты чё, за такой хлам столько? {price} ₽.'],
      too_expensive: ['Столько у меня нет.', 'Не потяну такую цену.'],
      open: ['Чё так дорого? За такой хлам столько просишь?']
    },
    pro: {
      accept: ['Беру за {price} ₽.', 'Ок, {price} ₽, забираю.'],
      counter: ['{price} ₽ — по рынку. Больше не дам.', 'Мой максимум {price} ₽.'],
      reject_price: ['Цена неадекватная. {price} ₽, и я в деле.'],
      too_expensive: ['Не вписываюсь в такую цену.'],
      open: ['Здравствуйте. По цене сразу: сколько реально отдадите?']
    },
    kind: {
      accept: ['Спасибо, за {price} ₽ беру!', 'Хорошо, {price} ₽, договорились.'],
      counter: ['Может, {price} ₽? Очень хочется.', 'Я бы взял за {price} ₽.'],
      reject_price: ['Извините, для меня дорого. Я думал про {price} ₽.'],
      too_expensive: ['Извините, для меня это дорого.'],
      open: ['Здравствуйте! Телефон ещё продаётся?']
    },
    cold: {
      accept: ['Беру. {price} ₽.'],
      counter: ['{price} ₽.'],
      reject_price: ['Дорого. {price} ₽.'],
      too_expensive: ['Дорого.'],
      open: ['Цена?']
    }
  };

  function tpl(list, key, vars) {
    const arr = list[key];
    let s;
    if (Array.isArray(arr)) s = arr[Math.floor(Math.random() * arr.length)];
    else s = arr || 'Хорошо.';
    return String(s).replace(/\{(\w+)\}/g, (_, k) => vars[k] != null ? vars[k] : '');
  }

  function sellerTone(typeId) {
    return ({ normal: 'neutral', desperate: 'anxious', greedy: 'rude', firm: 'cold', pro: 'pro', clueless: 'kind' })[typeId] || 'neutral';
  }

  function defName(key) { return D.DEFECTS[key] ? D.DEFECTS[key].name.toLowerCase() : ''; }

  AI.sellerLocal = function (intent, ctx) {
    const l = ctx.listing;
    const tone = TONE[sellerTone(l.seller.typeId)] || TONE.neutral;
    const vars = { price: fmt(intent.price || l.ask), metro: l.metro || 'метро' };
    switch (intent.kind) {
      case 'accept': return tpl(tone, 'accept', vars);
      case 'counter': return tpl(tone, 'counter', vars);
      case 'reject': return tpl(tone, 'reject', vars);
      case 'defect': return tpl(tone, 'defect', vars) + ' ' + defName(intent.defect) + '.';
      case 'info':
        if (intent.subject === 'battery') return 'Батарея держит нормально, день точно ходит.';
        if (intent.subject === 'documents') return 'Коробка и чек есть, всё официально.';
        return 'Да всё нормально, проверяйте при встрече.';
      case 'meet': return 'Да, давайте у метро ' + l.metro + '. Могу сегодня после шести.';
      case 'leave': return ['Ну ладно, как хотите.', 'Не интересно — до свидания.', 'Ок, если передумаете — пишите.'][Math.floor(Math.random() * 3)];
      case 'shipping_only': return 'Я не в Москве, могу только Авито Доставкой отправить.';
      case 'talk': return 'Да, слушаю.';
      default: return 'Да, всё в силе.';
    }
  };

  AI.buyerLocal = function (intent, ctx) {
    const b = ctx.buyer;
    const set = BUY_TPL[b.kind] || BUY_TPL.normal;
    const vars = { price: fmt(intent.price || b.offer), budget: fmt(intent.budget || b.budget) };
    switch (intent.kind) {
      case 'accept': return tpl(set, 'accept', vars);
      case 'counter': return tpl(set, 'counter', vars);
      case 'reject_price': return tpl(set, 'reject_price', vars);
      case 'too_expensive': return tpl(set, 'too_expensive', vars);
      case 'disclosed': return 'А, понятно. Тогда ' + fmt(intent.price) + ' ₽.';
      case 'meet': return 'Ок, подъеду. Скиньте адрес.';
      case 'leave': return 'Ладно, не интересно.';
      case 'not_buying': return 'Пока подумаю.';
      case 'nothing_to_disclose': return 'Да мне и так нормально.';
      case 'talk': return 'Понял вас.';
      default: return 'Хорошо.';
    }
  };

  function fmt(n) {
    return new Intl.NumberFormat('ru-RU').format(Math.round(n || 0));
  }

  /* ---------- публичный вызов ---------- */
  AI.sellerReply = async function (ctx) {
    if (!AI.available()) return { text: AI.sellerLocal(ctx.intent, ctx), via: 'local' };
    const messages = [{ role: 'system', content: sellerSystem(ctx) + '\n' + sellerAction(ctx.intent, ctx) }]
      .concat(historyToMessages(ctx.chat, 8));
    messages.push({ role: 'system', content: 'Ответь одной короткой репликой продавца.' });
    const r = await AI.chat(messages, { temperature: 0.95 });
    if (!r.ok) return { text: AI.sellerLocal(ctx.intent, ctx), via: 'local', error: r.error };
    return { text: clean(r.content), via: 'llm' };
  };

  AI.buyerReply = async function (ctx) {
    if (!AI.available()) return { text: AI.buyerLocal(ctx.intent, ctx), via: 'local' };
    const messages = [{ role: 'system', content: buyerSystem(ctx) + '\n' + buyerAction(ctx.intent, ctx) }]
      .concat(historyToMessages(ctx.chat, 8));
    messages.push({ role: 'system', content: 'Ответь одной короткой репликой покупателя.' });
    const r = await AI.chat(messages, { temperature: 0.95 });
    if (!r.ok) return { text: AI.buyerLocal(ctx.intent, ctx), via: 'local', error: r.error };
    return { text: clean(r.content), via: 'llm' };
  };

  // приветствие в чате
  AI.opening = function (ctx) {
    if (ctx.kind === 'buy') {
      return 'Здравствуйте, да, актуально. Смотрите, всё как в описании.';
    }
    const b = ctx.buyer;
    const set = BUY_TPL[b.kind] || BUY_TPL.normal;
    return tpl(set, 'open', { budget: fmt(b.budget), price: fmt(b.offer) });
  };

  function clean(s) {
    return String(s)
      .replace(/^["«»\s]+|["«»\s]+$/g, '')
      .replace(/\*\*/g, '')
      .replace(/^[-•]\s+/gm, '')
      .trim();
  }

  root.AI = AI;
  if (typeof module !== 'undefined' && module.exports) module.exports = AI;
})(typeof window !== 'undefined' ? window : globalThis);
