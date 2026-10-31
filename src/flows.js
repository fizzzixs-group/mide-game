/* ============================================================
   AVITO FLIP — сценарии: объявление, чат, встреча, ремонт, продажа
   ============================================================ */
(function (root) {
  'use strict';

  const D = root.DATA;
  const E = root.Engine;
  const AI = root.AI;
  const App = root.App;

  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => new Intl.NumberFormat('ru-RU').format(Math.round(n || 0)) + ' ₽';
  const delay = ms => new Promise(r => setTimeout(r, ms));

  App.cur = null;
  App.busy = false;

  /* ============================================================
     ОБЩЕЕ: сообщения
     ============================================================ */
  function pushMsg(chat, who, text, kind) {
    chat.push({ who: who, text: text, kind: kind || null, t: Date.now() });
    return chat[chat.length - 1];
  }

  function msgHTML(m) {
    if (m.who === 'sys') return '<div class="msg sys ' + (m.kind || '') + '">' + esc(m.text) + '</div>';
    return '<div class="msg ' + (m.who === 'me' ? 'me' : 'them') + '">' + esc(m.text) + '</div>';
  }

  function renderChatBox() {
    const box = $('#chat-box');
    if (!box) return;
    const chat = App.cur.chat;
    box.innerHTML = chat.map(msgHTML).join('');
    box.scrollTop = box.scrollHeight;
  }

  function addTyping() {
    const box = $('#chat-box');
    if (!box) return null;
    const n = document.createElement('div');
    n.className = 'msg them typing-wrap';
    n.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    box.appendChild(n);
    box.scrollTop = box.scrollHeight;
    return n;
  }
  function removeTyping(n) { if (n && n.parentNode) n.remove(); }

  async function withTyping(fn) {
    const t = addTyping();
    let res;
    try { res = await fn(); } catch (e) { res = null; }
    await delay(220);
    removeTyping(t);
    return res;
  }

  /* ============================================================
     ЭКРАН ОБЪЯВЛЕНИЯ
     ============================================================ */
  App.openListing = function (id) {
    const l = this.state.listings.find(x => x.id === id);
    if (!l) return;
    this.cur = { kind: 'buy', listing: l };
    const m = E.MODELS_BY_ID[l.modelId];
    const ov = $('#ov-listing');
    const city = l.isMoscow ? l.city + ', м. ' + l.metro : l.city;

    const facts = [
      '<span class="pill blue">' + l.storage + ' ГБ</span>',
      '<span class="pill">' + esc(l.color) + '</span>',
      '<span class="pill">' + esc(D.TIER_NAMES[m.tier]) + '</span>',
      m.code ? '<span class="pill" style="font-family:ui-monospace,monospace">' + esc(m.code) + '</span>' : '',
      m.fold ? '<span class="pill" style="background:#f1ecff;color:#7c5cff">складной</span>' : '',
      '<span class="pill">' + esc(l.seller.typeName) + '</span>'
    ].join('');

    const mkt = E.advertisedValue(l);
    const diff = mkt - l.ask;
    const mktLine = '<div class="mkt-line"><span>Рынок для такого состояния ≈ <b>' + money(mkt) + '</b></span>' +
      (diff > 0
        ? '<b class="pos">выгода ' + money(diff) + ' (−' + Math.round(diff / mkt * 100) + '%)</b>'
        : diff < 0
          ? '<b class="neg">переплата ' + money(-diff) + '</b>'
          : '<b>ровно по рынку</b>') + '</div>';

    const shownDefects = l.defects.filter(d => d.disclosed);
    let defHTML = '';
    if (shownDefects.length) {
      for (const d of shownDefects) defHTML += '<div class="defect-line">⚠ ' + esc(D.DEFECTS[d.key].name) + '</div>';
    } else {
      defHTML = '<div class="defect-line ok">✓ Продавец пишет, что проблем нет</div>';
    }

    ov.innerHTML =
      '<div class="ov-head"><button class="back" data-act="close-ov" data-id="listing">←</button>' +
      '<div class="ov-title"><b>' + esc(m.name) + ' ' + l.storage + ' ГБ</b><span>' + esc(city) + '</span></div></div>' +
      '<div class="detail">' +
      '<div class="photo-big">' + App.phoneSVG(m, l.color) +
      '<div class="cap">' + l.photos + ' фото</div></div>' +
      '<div class="price-row"><div class="price-big">' + money(l.ask) + '</div>' +
      '<div class="price-sub">' + (diff > 0 ? 'дешевле рынка' : diff < 0 ? 'дороже рынка' : 'по рынку') + '</div></div>' +
      mktLine +
      '<h3>' + esc(m.name) + ' ' + l.storage + ' ГБ, ' + esc(l.color) + '</h3>' +
      '<p class="desc">' + esc(l.desc) + '</p>' +
      '<div class="facts">' + facts + '</div>' +
      defHTML +
      '<div class="seller-card"><div class="avatar">' + esc(l.seller.name.charAt(0)) + '</div>' +
      '<div style="flex:1;min-width:0"><div class="nm">' + esc(l.seller.name) + '</div>' +
      '<div class="sub">' + esc(l.seller.typeName) + ' · на Авито с 2019 · 4,8 ★</div></div></div>' +
      '<div class="knows-row"><span>Разбирается в технике</span>' +
      '<div class="knows-bar"><i class="' + App.iqClass(l.seller.knows || 50) + '" style="width:' + (l.seller.knows || 50) + '%"></i></div>' +
      '<b class="' + App.iqClass(l.seller.knows || 50) + '">' + (l.seller.knows || 50) + '</b></div>' +
      (l.isMoscow
        ? '<div class="hint-line">Личная встреча: можно проверить телефон перед покупкой.</div>'
        : '<div class="warn-line">Продавец не в Москве. Только Авито Доставка — проверить до оплаты не получится.</div>') +
      '<div class="stock-item mt12" style="padding:10px;background:#fafbfd">' +
      '<div style="font-size:11px;font-weight:750;margin-bottom:3px">Что смотреть на встрече</div>' +
      '<div class="tiny muted" style="line-height:1.5">Экран, аккумулятор, камеры, Face ID, динамики, разъём и IMEI. Каждая находка — повод сбить цену. Но всё не проверишь: что-то может вылезти позже.</div>' +
      '</div>' +
      '<div style="height:12px"></div></div>' +
      '<div class="ov-foot"><button class="btn primary" id="btn-write">Написать продавцу</button></div>';
    ov.classList.add('open');

    $('#btn-write').onclick = () => App.openBuyChat(l);
  };

  App.phoneHue = function (color) {
    const map = { 'чёрный': [210, 12], 'белый': [45, 8], 'серый': [210, 8], 'титановый': [35, 18], 'синий': [215, 60], 'зелёный': [145, 45], 'красный': [0, 62], 'розовый': [330, 55], 'фиолетовый': [270, 55] };
    const v = map[color] || [215, 45];
    return { h: v[0], s: v[1] };
  };

  /* ============================================================
     ЧАТ С ПРОДАВЦОМ (покупка)
     ============================================================ */
  App.openBuyChat = function (l) {
    if (!l.chat) {
      l.chat = [];
      pushMsg(l.chat, 'sys', 'Вы пишете продавцу по объявлению');
      pushMsg(l.chat, 'them', AI.opening({ kind: 'buy', listing: l }));
    }
    this.cur = { kind: 'buy', listing: l, chat: l.chat };
    this.renderBuyChat();
    $('#ov-chat').classList.add('open');
  };

  App.renderBuyChat = function () {
    const l = this.cur.listing;
    const ov = $('#ov-chat');
    ov.innerHTML =
      '<div class="ov-head"><button class="back" id="chat-back">←</button>' +
      '<div class="avatar" style="background:linear-gradient(140deg,#5f8cff,#8f5cff)">' + esc(l.seller.name.charAt(0)) + '</div>' +
      '<div class="ov-title"><b>' + esc(l.seller.name) + '</b><span>' + esc(l.seller.typeName) + ' · ' + App.iqInline(l.seller.knows || 50) + '</span></div>' +
      '<div class="ov-price" id="chat-price">' + money(l.neg.agreedPrice || l.ask) + '</div></div>' +
      '<div class="chat-wrap" id="chat-box"></div>' +
      '<div class="composer"><div class="quick" id="quick"></div>' +
      '<div class="input-row"><input id="chat-input" type="text" placeholder="Написать сообщение...">' +
      '<button class="send-btn" id="chat-send">➤</button></div></div>';
    $('#chat-back').onclick = () => { App.closeOv('chat'); };
    $('#chat-send').onclick = () => App.sendBuyText();
    $('#chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') App.sendBuyText(); });
    this.renderBuyQuick();
    renderChatBox();
  };

  App.renderBuyQuick = function () {
    const l = this.cur.listing;
    const q = $('#quick');
    if (!q) return;
    const lost = l.neg.stage === 'lost' || l.neg.stage === 'done';
    if (lost) {
      q.innerHTML = '<button class="qbtn" data-q="back">Вернуться в ленту</button>';
      return;
    }
    if (l.neg.stage === 'meeting') {
      q.innerHTML = '<button class="qbtn primary" data-q="meet-again">На встречу</button>' +
        '<button class="qbtn danger" data-q="leave">Уйти</button>';
      q.querySelector('[data-q="meet-again"]').onclick = () => App.openMeetingBuy();
      q.querySelector('[data-q="leave"]').onclick = () => App.buyAction({ type: 'leave' });
      return;
    }
    let html = '';
    if (l.neg.stage === 'agreed') {
      html += '<button class="qbtn primary" data-q="meet">' + (l.isMoscow ? 'Встретиться' : 'Заказать доставку') + '</button>';
      html += '<button class="qbtn" data-q="offer">Сбить ещё</button>';
    } else {
      html += '<button class="qbtn" data-q="defects">Есть дефекты?</button>';
      html += '<button class="qbtn" data-q="battery">Про батарею</button>';
      html += '<button class="qbtn" data-q="docs">Документы?</button>';
      html += '<button class="qbtn primary" data-q="offer">Назвать цену</button>';
      html += '<button class="qbtn" data-q="meet">' + (l.isMoscow ? 'Встретиться' : 'Доставка?') + '</button>';
    }
    html += '<button class="qbtn danger" data-q="leave">Уйти</button>';
    q.innerHTML = html;
    q.querySelectorAll('[data-q]').forEach(b => {
      b.onclick = () => App.buyQuick(b.dataset.q);
    });
  };

  // достаём цену из свободного текста: «5650 и по рукам», «за 11к», «15 000»
  function parsePrice(t) {
    const s = String(t || '').toLowerCase().replace(/\u00a0/g, ' ').replace(/[₽$]/g, ' ');
    let m = s.match(/(\d+(?:[.,]\d+)?)\s*(к|k|тыс)/);
    if (m) {
      const v = Math.round(parseFloat(m[1].replace(',', '.')) * 1000);
      if (v >= 500 && v <= 2000000) return v;
    }
    m = s.match(/(\d[\d\s]{2,})/);
    if (m) {
      const v = parseInt(m[1].replace(/\s+/g, ''), 10);
      if (v >= 500 && v <= 2000000) return v;
    }
    return null;
  }
  App.parsePrice = parsePrice;

  App.sendBuyText = function () {
    const inp = $('#chat-input');
    const txt = (inp.value || '').trim();
    if (!txt) return;
    inp.value = '';
    const price = parsePrice(txt);
    if (price) this.buyAction({ type: 'offer', price: price }, txt);
    else this.buyAction({ type: 'talk' }, txt);
  };

  App.buyQuick = function (q) {
    const l = this.cur.listing;
    if (q === 'back') { this.closeOv('chat'); this.go('feed'); return; }
    if (q === 'offer') { this.offerModal('buy'); return; }
    if (q === 'defects') { this.buyAction({ type: 'ask', topic: 'defect' }); return; }
    if (q === 'battery') { this.buyAction({ type: 'ask', topic: 'battery' }); return; }
    if (q === 'docs') { this.buyAction({ type: 'ask', topic: 'documents' }); return; }
    if (q === 'meet') {
      if (!l.isMoscow && l.neg.stage === 'agreed') { this.shippingModal(l); return; }
      this.buyAction({ type: 'meet' });
      return;
    }
    if (q === 'leave') { this.buyAction({ type: 'leave' }); return; }
  };

  const BUY_DEFAULT_TEXT = {
    defect: ['А с телефоном всё нормально? Есть какие-то нюансы?', 'Скажите честно, какие есть проблемы?'],
    battery: ['А как батарея? Сколько держит?', 'По аккумулятору как? Не менялся?'],
    documents: ['Коробка и документы есть?', 'Чек сохранился?'],
    meet: ['Давайте встретимся, я посмотрю.', 'Могу подъехать сегодня. Где удобно?'],
    leave: ['Ладно, спасибо, не интересно.', 'Понял, буду думать.', 'Дорого для меня, извините.'],
    talk: ['Понял вас.', 'Хорошо.']
  };

  App.buyAction = async function (action, text) {
    if (this.busy) return;
    const l = this.cur.listing;
    if (!l || !l.chat) return;
    if (l.neg.stage === 'lost') return;

    let playerText = text;
    if (!playerText) {
      if (action.type === 'offer') playerText = 'Предлагаю ' + money(action.price) + '.';
      else if (action.type === 'ask') playerText = E.pick(BUY_DEFAULT_TEXT[action.topic] || BUY_DEFAULT_TEXT.defect);
      else if (action.type === 'meet') playerText = E.pick(BUY_DEFAULT_TEXT.meet);
      else if (action.type === 'leave') playerText = E.pick(BUY_DEFAULT_TEXT.leave);
      else playerText = 'Хорошо.';
    }

    this.busy = true;
    pushMsg(l.chat, 'me', playerText);
    renderChatBox();

    const res = E.negotiateBuy(this.state, l, action);

    if (action.type === 'leave') {
      pushMsg(l.chat, 'sys', 'Вы вышли из чата', 'bad');
      l.neg.stage = 'lost';
      this.finishTurn();
      return;
    }

    for (const intent of res.intents) {
      if (intent.kind === 'meet') {
        pushMsg(l.chat, 'sys', 'Продавец ждёт вас у метро ' + l.metro + '. Можно ехать на встречу', 'good');
        renderChatBox();
        this.busy = false;
        this.renderBuyQuick();
        this.save();
        setTimeout(() => {
          if (App.cur && App.cur.listing === l) App.openMeetingBuy();
        }, 650);
        return;
      }
      if (intent.kind === 'shipping_only') {
        pushMsg(l.chat, 'sys', 'Личная встреча невозможна — только Авито Доставка. Проверить телефон нельзя', 'bad');
        const out = await withTyping(() => AI.sellerReply({ listing: l, intent: intent, chat: l.chat }));
        if (out && out.text) pushMsg(l.chat, 'them', out.text);
        pushMsg(l.chat, 'sys', 'Продавец не в Москве. Можно только Авито Доставкой — сначала договорись о цене', '');
        renderChatBox();
        this.renderBuyQuick();
        this.busy = false;
        this.save();
        return;
      }

      const out = await withTyping(() => AI.sellerReply({ listing: l, intent: intent, chat: l.chat }));
      pushMsg(l.chat, 'them', (out && out.text) || '...');
      if (out && out.via === 'local' && AI.available() && !this._warnedAI) {
        this._warnedAI = true;
        const err = AI.lastError || 'нет ответа';
        pushMsg(l.chat, 'sys', 'Нейросеть не ответила (' + err + '). Отвечаю шаблонами — проверь ключ в настройках', 'bad');
        this.toast('ИИ не ответил: ' + err, 'warn');
      }
      renderChatBox();

      if (intent.kind === 'accept') {
        pushMsg(l.chat, 'sys', 'Договорились: ' + money(intent.price) + '. Теперь встреча и проверка', 'good');
        renderChatBox();
      }
      if (intent.kind === 'defect') {
        pushMsg(l.chat, 'sys', 'Дефект: ' + D.DEFECTS[intent.defect].name + '. Цена снижена до ' + money(l.ask), '');
        renderChatBox();
      }
      if (intent.kind === 'leave') {
        pushMsg(l.chat, 'sys', 'Продавец вышел из чата и больше не отвечает', 'bad');
        l.neg.stage = 'lost';
      }
    }

    const p = $('#chat-price');
    if (p) p.textContent = money(l.neg.agreedPrice || l.ask);
    this.finishTurn();
  };

  App.finishTurn = function () {
    this.busy = false;
    this.renderBuyQuick();
    this.save();
    this.render();
  };

  /* ---------- насколько человек разбирается ---------- */
  App.iqClass = (k) => k >= 75 ? 'iq-hi' : k >= 45 ? 'iq-mid' : 'iq-lo';
  App.iqInline = function (k, prefix) {
    const v = Math.max(0, Math.min(100, Math.round(k)));
    return '<span class="' + App.iqClass(v) + ' iq-text">' + (prefix || 'ум') + ' <b>' + v + '</b>/100</span>';
  };

  /* ============================================================
     МОДАЛКА ЦЕНЫ
     ============================================================ */
  App.modal = function (html) {
    const w = $('#modal');
    w.innerHTML = '<div class="modal">' + html + '</div>';
    w.classList.add('open');
    w.onclick = (e) => { if (e.target === w) App.closeModal(); };
  };
  App.closeModal = function () {
    const w = $('#modal');
    w.classList.remove('open');
    w.innerHTML = '';
  };

  App.offerModal = function (mode) {
    const l = this.cur.listing;
    let cur, sub, presets, title;
    if (mode === 'buy') {
      cur = l.neg.agreedPrice || Math.min(l.ask, l.neg.anchor || l.ask);
      title = 'Назвать цену';
      sub = 'Продавец просит ' + money(l.ask) + '. Слишком низкое предложение его обидит.';
      presets = [{ k: 0.95, t: '−5%' }, { k: 0.88, t: '−12%' }, { k: 0.8, t: '−20%' }, { k: 0.7, t: '−30%' }];
    } else {
      const b = this.cur.buyer;
      cur = l.ask;
      title = 'Ваша цена покупателю';
      sub = 'Он предлагает ' + money(b.offer) + '. Ваша цена в объявлении — ' + money(l.ask) + '.';
      presets = [{ k: 1, t: 'как в объявлении' }, { k: 0.95, t: '−5%' }, { k: 0.9, t: '−10%' }];
    }

    let html = '<h3>' + title + '</h3><div class="sub">' + sub + '</div>' +
      '<div class="field"><div class="price-input"><input id="pm-input" type="number" inputmode="numeric" value="' + Math.round(cur) + '"><span>₽</span></div>' +
      '<div class="presets">';
    for (const p of presets) {
      const val = Math.round(cur * p.k / 100) * 100;
      html += '<button class="preset" data-val="' + val + '">' + p.t + ' · ' + money(val) + '</button>';
    }
    html += '</div></div>' +
      '<div class="btn-row"><button class="btn ghost" id="pm-cancel">Отмена</button>' +
      '<button class="btn primary" id="pm-ok">Отправить</button></div>';
    this.modal(html);

    $('#pm-cancel').onclick = () => App.closeModal();
    document.querySelectorAll('#modal .preset').forEach(b => {
      b.onclick = () => { $('#pm-input').value = b.dataset.val; };
    });
    $('#pm-ok').onclick = () => {
      const v = parseInt($('#pm-input').value, 10);
      if (!v || v <= 0) return;
      App.closeModal();
      if (mode === 'buy') App.buyAction({ type: 'offer', price: v });
      else App.sellOffer(v);
    };
  };

  /* ============================================================
     ВСТРЕЧА ПРИ ПОКУПКЕ
     ============================================================ */
  App.openMeetingBuy = function () {
    const l = this.cur.listing;
    if (!l.isMoscow) { this.toast('Продавец не в Москве — только доставка', 'bad'); return; }
    E.startMeeting(this.state, l);
    const ov = $('#ov-meet');
    const ovh = $('#ov-meet-body');

    ovh.innerHTML =
      '<div class="meet-head"><div class="place">' + (l.isMoscow ? 'Москва · м. ' + esc(l.metro) : esc(l.city)) + '</div>' +
      '<h2>' + esc(E.MODELS_BY_ID[l.modelId].name) + ' ' + l.storage + ' ГБ</h2>' +
      '<p>' + esc(l.seller.name) + ' · ' + App.iqInline(l.seller.knows || 50) + ' — достаёт телефон из рюкзака</p></div>' +
      '<div class="checks" id="checks"></div>' +
      '<div class="meet-summary" id="meet-summary"></div>' +
      '<div class="meet-actions" id="meet-actions"></div>';

    const checks = D.CHECKS.filter(c => !c.appleOnly || E.MODELS_BY_ID[l.modelId].brand === 'Apple');
    let chtml = '';
    for (const c of checks) {
      chtml += '<button class="check" data-check="' + c.id + '">' +
        (c.paid ? '<span class="fee">' + c.paid + ' ₽</span>' : '') +
        '<div class="ci">' + c.icon + '</div><div class="cn">' + c.name + '</div>' +
        '<div class="cd">' + esc(c.desc) + '</div><div class="res" id="res-' + c.id + '"></div></button>';
    }
    $('#checks').innerHTML = chtml;
    document.querySelectorAll('[data-check]').forEach(b => {
      b.onclick = () => App.doCheck(b.dataset.check, b);
    });

    this.meetUpdate();
    ov.classList.add('open');
  };

  App.doCheck = function (checkId, btn) {
    const l = this.cur.listing;
    const mt = l.meeting;
    if (!mt || mt.checks[checkId]) return;
    const found = E.runCheck(this.state, l, checkId);
    if (found.length && found[0] && found[0].error === 'no_money') {
      this.toast('Не хватает денег на проверку', 'bad');
      return;
    }
    const res = $('#res-' + checkId);
    if (found.length) {
      res.className = 'res bad';
      res.textContent = '⚠ ' + found.map(k => D.DEFECTS[k].short).join(', ');
      btn.classList.add('shake');
      setTimeout(() => btn.classList.remove('shake'), 400);
      this.toast('Продавец: «ну да, есть такое»', 'warn');
    } else {
      res.className = 'res ok';
      res.textContent = '✓ чисто';
    }
    btn.classList.add('done');
    App.renderHeader();
    this.save();
    this.meetUpdate();
  };

  App.meetUpdate = function () {
    const l = this.cur.listing;
    const mt = l.meeting || { found: [] };
    const cur = Math.min(l.neg.agreedPrice || l.ask, l.ask);
    const foundNames = (mt.found || []).map(k => D.DEFECTS[k].name.toLowerCase());

    let summary = '';
    if (foundNames.length) {
      summary = '<b style="color:#b03035">Нашли проблемы:</b> ' + esc(foundNames.join(', ')) + '.<br>' +
        '<span class="muted tiny">Продавец согласился отдать за ' + money(cur) + '.</span>';
    } else {
      summary = '<b>Пока всё выглядит нормально.</b><br><span class="muted tiny">Но непроверенное может вылезти позже. Проверки ничего не стоят, кроме IMEI.</span>';
    }
    summary += '<div class="mt8" style="font-weight:800;font-size:14px">Цена сейчас: ' + money(cur) + '</div>';
    $('#meet-summary').innerHTML = summary;

    const canBuy = this.state.balance >= Math.min(cur, l.sellerMin);
    $('#meet-actions').innerHTML =
      '<button class="btn success" id="btn-buy">Купить за ' + money(cur) + '</button>' +
      '<div class="btn-row"><button class="btn" id="btn-haggle">Сбить цену</button>' +
      '<button class="btn ghost" id="btn-walk">Уйти</button></div>';

    $('#btn-buy').onclick = () => App.doBuy(cur);
    $('#btn-haggle').onclick = () => App.haggleMeeting();
    $('#btn-walk').onclick = () => {
      App.closeOv('meet');
      App.toast('Вы ушли. Объявление осталось в ленте', '');
    };
  };

  App.tryBuyAt = function (price) {
    const l = this.cur.listing;
    const base = l.sellerMin;
    if (price >= base) {
      return this.doBuy(price);
    }
    const r = E.meetingHaggle(this.state, l, price);
    if (r.kind === 'accept') return this.doBuy(r.price);
    if (r.kind === 'counter') {
      l.ask = r.price;
      l.neg.anchor = r.price;
      this.toast('Продавец: «' + money(r.price) + ', ниже никак»', 'warn');
      this.meetUpdate();
    }
    if (r.kind === 'leave') {
      this.toast('Продавец забрал телефон и ушёл', 'bad');
      l.neg.stage = 'lost';
      this.closeOv('meet');
      this.closeOv('chat');
      this.go('feed');
    }
    if (r.kind === 'reject') {
      this.toast('Продавец: «за столько не отдам»', 'bad');
    }
  };

  App.haggleMeeting = function () {
    const l = this.cur.listing;
    const cur = l.neg.agreedPrice || l.ask;
    this.modal(
      '<h3>Сбить цену</h3><div class="sub">Вы уже видели телефон. Ссылайтесь на найденные дефекты. Продавец просит ' + money(cur) + '.</div>' +
      '<div class="field"><div class="price-input"><input id="hg-input" type="number" value="' + Math.round(cur * 0.88) + '"><span>₽</span></div>' +
      '<div class="presets"><button class="preset" data-k="0.9">−10%</button><button class="preset" data-k="0.8">−20%</button><button class="preset" data-k="0.7">−30%</button></div></div>' +
      '<div class="btn-row"><button class="btn ghost" id="hg-cancel">Отмена</button><button class="btn primary" id="hg-ok">Предложить</button></div>'
    );
    $('#hg-cancel').onclick = () => App.closeModal();
    document.querySelectorAll('#modal .preset').forEach(b => {
      b.onclick = () => { $('#hg-input').value = Math.round(cur * Number(b.dataset.k) / 100) * 100; };
    });
    $('#hg-ok').onclick = () => {
      const v = parseInt($('#hg-input').value, 10);
      if (!v) return;
      App.closeModal();
      App.tryBuyAt(v);
    };
  };

  App.doBuy = function (price) {
    const l = this.cur.listing;
    const r = E.buyPhone(this.state, l, price);
    if (!r.ok) {
      if (r.error === 'no_money') this.toast('Не хватает денег', 'bad');
      return;
    }
    this.state.skill = Math.min(100, (this.state.skill || 0) + 3);
    this.flash('−' + money(price), 'bad');
    this.toast('Куплен ' + E.MODELS_BY_ID[l.modelId].name + '. Теперь в склад → починить → продать', 'good');
    this.closeOv('meet');
    this.closeOv('chat');
    this.closeOv('listing');
    this.cur = null;
    this.save();
    this.render();
    this.go('stock');
  };

  App.shippingModal = function (l) {
    const price = (l.neg && l.neg.agreedPrice) ? l.neg.agreedPrice : l.ask;
    const m = E.MODELS_BY_ID[l.modelId];
    const enough = this.state.balance >= price;
    this.modal(
      '<h3>Купить с Авито Доставкой</h3>' +
      '<div class="sub">' + esc(m.name) + ' ' + l.storage + ' ГБ из ' + esc(l.city) + '. Оплата сразу, проверить до получения нельзя — дефекты могут остаться сюрпризом.</div>' +
      '<div class="stock-item" style="padding:12px"><div class="tiny muted">К оплате</div>' +
      '<div style="font-size:24px;font-weight:900;letter-spacing:-1px">' + money(price) + '</div>' +
      '<div class="tiny muted" style="margin-top:4px">На руках: ' + money(this.state.balance) + '</div></div>' +
      (enough ? '' : '<div class="warn-line">Не хватает денег</div>') +
      '<div class="btn-row mt12"><button class="btn ghost" id="sh-cancel">Отмена</button>' +
      '<button class="btn primary" id="sh-ok"' + (enough ? '' : ' disabled') + '>Оплатить</button></div>'
    );
    $('#sh-cancel').onclick = () => App.closeModal();
    if (enough) $('#sh-ok').onclick = () => { App.closeModal(); App.buyShipping(l); };
  };

  App.buyShipping = function (l) {
    const price = (l.neg && l.neg.agreedPrice) ? l.neg.agreedPrice : l.ask;
    const r = E.buyPhone(this.state, l, price);
    if (!r.ok) { this.toast('Не хватает денег', 'bad'); return; }
    for (const d of r.phone.defects) { d.found = false; }
    r.phone.viaShipping = true;
    E.pushLog(this.state, {
      text: 'Авито Доставка: ' + E.MODELS_BY_ID[l.modelId].name + ' куплен вслепую за ' + money(price),
      tone: ''
    });
    this.flash('−' + money(price), 'bad');
    this.toast('Посылка в пути. Что внутри — узнаешь только на складе', '');
    this.closeOv('meet');
    this.closeOv('chat');
    this.closeOv('listing');
    this.cur = null;
    this.save();
    this.render();
    this.go('stock');
  };

  /* ============================================================
     СКЛАД: КАРТОЧКА ТЕЛЕФОНА, РЕМОНТ, ВЫСТАВЛЕНИЕ
     ============================================================ */
  App.openPhone = function (id) {
    const p = this.state.phones.find(x => x.id === id);
    if (!p) return;
    this.cur = { kind: 'phone', phone: p };
    this.renderPhone();
    $('#ov-phone').classList.add('open');
  };

  App.renderPhone = function () {
    const p = this.cur.phone;
    const m = E.MODELS_BY_ID[p.modelId];
    const val = E.playerValue(p);
    const opts = E.repairOptions(p);
    const unrepairable = p.defects.filter(d => D.DEFECTS[d.key].repair === null && !D.DEFECTS[d.key].cosmetic);
    const unknown = p.defects.filter(d => !d.found && !d.disclosed);

    let defectHTML = '';
    if (!p.defects.length) {
      defectHTML = '<div class="defect-line ok">✓ Дефектов нет — можно выставлять</div>';
    }
    for (const d of p.defects) {
      const def = D.DEFECTS[d.key];
      const known = d.found || d.disclosed;
      defectHTML += '<div class="defect-line' + (known ? '' : ' warn') + '">' +
        (known ? '⚠ ' : '? ') + esc(def.name) + (known ? '' : ' <span class="tiny">(не проверено)</span>') + '</div>';
    }

    let repairHTML = '';
    for (const o of opts) {
      const tmp = { modelId: p.modelId, storage: p.storage, cosmetic: p.cosmetic, defects: p.defects.filter(d => d.key !== o.key) };
      const gain = E.playerValue(tmp) - val;
      repairHTML += '<div class="stock-item" style="padding:9px;margin-top:8px">' +
        '<div style="font-size:11.5px;font-weight:750;margin-bottom:6px">' + esc(o.name) + '</div>' +
        '<div class="btn-row">' +
        '<button class="btn sm" data-rep="' + o.key + '" data-q="original">Ориг · ' + money(o.prices.original) + '</button>' +
        '<button class="btn sm" data-rep="' + o.key + '" data-q="analog">Аналог · ' + money(o.prices.analog) + '</button>' +
        '<button class="btn sm" data-rep="' + o.key + '" data-q="used">Б/у · ' + money(o.prices.used) + '</button>' +
        '</div>' +
        '<div class="tiny ' + (gain > o.prices.original ? 'pos' : 'muted') + '" style="margin-top:6px">' +
        'Телефон подорожает на ' + money(gain) +
        (gain > o.prices.original ? ' — оригинал окупится' : gain > o.prices.analog ? ' — выгоден только аналог' : ' — ремонт не отобьётся') +
        '</div></div>';
    }

    const spend = p.boughtFor + (p.repaired || []).reduce((s, r) => s + r.cost, 0);
    const pot = E.suggestPrice(p) - spend;

    const ov = $('#ov-phone');
    ov.innerHTML =
      '<div class="ov-head"><button class="back" data-act="close-ov" data-id="phone">←</button>' +
      '<div class="ov-title"><b>' + esc(m.name) + ' ' + p.storage + ' ГБ</b><span>куплен за ' + money(p.boughtFor) + '</span></div></div>' +
      '<div class="detail">' +
      '<div class="photo-big photo-phone">' + App.phoneSVG(m, p.color) + '</div>' +
      '<div class="price-row"><div class="price-big">' + money(val) + '</div><div class="price-sub">столько он стоит по-вашему</div></div>' +
      '<div class="facts"><span class="pill blue">' + p.storage + ' ГБ</span><span class="pill">' + esc(p.color) + '</span>' +
      (m.code ? '<span class="pill" style="font-family:ui-monospace,monospace">' + esc(m.code) + '</span>' : '') +
      (p.listed ? '<span class="pill amber">на продаже</span>' : '') + '</div>' +
      '<div class="section-title mt16">Состояние</div>' + defectHTML +
      (unknown.length ? '<div class="hint-line">Вопросы помечены «?» — вы их не проверяли. Покупатель может найти сам.</div>' : '') +
      (repairHTML ? '<div class="section-title mt16">Ремонт</div>' + repairHTML : '') +
      (unrepairable.length ? '<div class="warn-line">' + esc(unrepairable.map(d => D.DEFECTS[d.key].name).join(', ')) + ' — не чинится. Такой телефон берут только на запчасти.</div>' : '') +
      '<div class="stock-item mt12" style="padding:10px">' +
      '<div class="tiny muted">Потрачено: ' + money(spend) + ' · при продаже по рынку: <b class="' + (pot >= 0 ? 'pos' : 'neg') + '">' + (pot >= 0 ? '+' : '') + money(pot) + '</b></div>' +
      '</div>' +
      '<div class="meet-actions mt12">' +
      '<button class="btn"' + (this.state.mainPhoneId === p.id ? ' disabled' : '') + ' id="btn-main">' +
      (this.state.mainPhoneId === p.id ? '★ Твой основной телефон' : 'Сделать моим телефоном') + '</button>' +
      (p.listed
        ? '<button class="btn" id="btn-unlist">Снять с продажи</button>'
        : '<button class="btn primary" id="btn-list">Выставить на Авито за ' + money(E.suggestPrice(p)) + '</button>') +
      '<button class="btn danger" id="btn-scrap">Сдать на запчасти (' + money(Math.round(E.phoneValue(p) * 0.18)) + ')</button>' +
      '</div><div style="height:16px"></div></div>';

    document.querySelectorAll('[data-rep]').forEach(b => {
      b.onclick = () => App.doRepair(b.dataset.rep, b.dataset.q);
    });
    if ($('#btn-list')) $('#btn-list').onclick = () => App.listModal(p);
    if ($('#btn-main')) $('#btn-main').onclick = () => App.makeMain(p);
    if ($('#btn-unlist')) $('#btn-unlist').onclick = () => App.unlist(p);
    if ($('#btn-scrap')) $('#btn-scrap').onclick = () => App.doScrap(p);
  };

  App.makeMain = function (p) {
    const r = E.setMainPhone(this.state, p.id);
    if (!r.ok) return;
    this.toast('Теперь ты ходишь с ' + E.MODELS_BY_ID[p.modelId].name + '. Репутация +2', 'good');
    this.save();
    this.render();
    this.renderPhone();
  };

  App.doRepair = function (key, quality) {
    const p = this.cur.phone;
    const r = E.repairPhone(this.state, p, key, quality);
    if (!r.ok) {
      if (r.error === 'no_money') this.toast('Не хватает денег на ремонт', 'bad');
      return;
    }
    this.flash('−' + money(r.cost), 'bad');
    this.toast('Готово: ' + D.DEFECTS[key].short.toLowerCase() + ' починен', 'good');
    this.save();
    this.renderHeader();
    this.renderPhone();
    this.render();
  };

  App.doScrap = function (p) {
    const r = E.scrapPhone(this.state, p);
    this.toast('Сдал на запчасти: +' + money(r.value), '');
    this.closeOv('phone');
    this.save();
    this.render();
  };

  App.unlist = function (p) {
    p.listed = false;
    this.state.myListings = this.state.myListings.filter(l => l.phoneId !== p.id);
    this.save();
    this.renderPhone();
    this.render();
  };

  App.listModal = function (p) {
    const sugg = E.suggestPrice(p);
    const known = p.defects.filter(d => d.found || d.disclosed);
    const unknown = p.defects.filter(d => !d.found && !d.disclosed);
    let defList = '';
    for (const d of known) defList += '<div class="defect-line">⚠ ' + esc(D.DEFECTS[d.key].name) + '</div>';

    this.modal(
      '<h3>Выставить на Авито</h3>' +
      '<div class="sub">' + esc(E.MODELS_BY_ID[p.modelId].name) + ' ' + p.storage + ' ГБ. По вашей оценке: ' + money(E.playerValue(p)) + '</div>' +
      '<div class="field"><label>Цена</label><div class="price-input"><input id="ls-input" type="number" value="' + sugg + '"><span>₽</span></div>' +
      '<div class="presets">' +
      '<button class="preset" data-v="' + Math.round(sugg * 0.95) + '">−5%</button>' +
      '<button class="preset" data-v="' + Math.round(sugg * 1.05) + '">+5%</button>' +
      '<button class="preset" data-v="' + Math.round(sugg * 1.12) + '">+12%</button>' +
      '</div></div>' +
      (known.length
        ? '<div class="field"><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="ls-honest" checked style="width:16px;height:16px;accent-color:#0aa2f5"> Указать дефекты в объявлении</label>' +
        '<div class="hint-line">Если скрыть — можно продать дороже, но покупатель может найти сам и вернуть телефон.</div></div>' + defList
        : '<div class="hint-line">Дефектов нет — отличный лот.</div>') +
      (unknown.length
        ? '<div class="warn-line">Ты не проверял телефон до конца — осталось ' + unknown.length + ' подозрение(й). Если покупатель найдёт дефект, он может вернуть телефон и забрать деньги.</div>'
        : '') +
      '<div class="btn-row mt12"><button class="btn ghost" id="ls-cancel">Отмена</button>' +
      '<button class="btn primary" id="ls-ok">Опубликовать</button></div>'
    );
    $('#ls-cancel').onclick = () => App.closeModal();
    document.querySelectorAll('#modal .preset').forEach(b => {
      b.onclick = () => { $('#ls-input').value = b.dataset.v; };
    });
    $('#ls-ok').onclick = () => {
      const price = parseInt($('#ls-input').value, 10);
      if (!price || price < 500) { App.toast('Цена слишком низкая', 'bad'); return; }
      const honest = $('#ls-honest') ? $('#ls-honest').checked : true;
      App.closeModal();
      App.publish(p, price, honest);
    };
  };

  App.publish = function (p, price, honest) {
    if (!honest) {
      for (const d of p.defects) { d.disclosed = false; }
    } else {
      for (const d of p.defects) { if (d.found) d.disclosed = true; }
    }
    const r = E.listPhone(this.state, p, price, honest);
    if (!r.ok) return;
    this.toast('Объявление опубликовано. Сейчас начнут писать', 'good');
    // первый покупатель приходит почти сразу
    setTimeout(() => {
      E.buyerAppears(this.state, r.listing);
      if (Math.random() < 0.5) E.buyerAppears(this.state, r.listing);
      this.save();
      this.renderTabs();
      if (this.view === 'listings') this.renderListings();
      this.toast('Новое сообщение по объявлению', '');
    }, 1600);
    this.closeOv('phone');
    this.save();
    this.render();
    this.go('listings');
  };

  /* ============================================================
     ЧАТ ПРОДАЖИ
     ============================================================ */
  App.openSellChatByListing = function (listingId) {
    const l = this.state.myListings.find(x => x.id === listingId);
    if (!l) return;
    if (!l.buyers || !l.buyers.length) {
      E.buyerAppears(this.state, l);
    }
    const b = l.buyers.find(x => x.stage !== 'lost' && x.stage !== 'done') || l.buyers[l.buyers.length - 1];
    App.openSellChat(l, b);
  };

  App.openSellChat = function (l, b) {
    if (!b.chat) {
      b.chat = [];
      pushMsg(b.chat, 'sys', 'Покупатель пишет по вашему объявлению');
      pushMsg(b.chat, 'them', AI.opening({ kind: 'sell', buyer: b, listing: l }));
    }
    b.seen = true;
    this.cur = { kind: 'sell', listing: l, buyer: b, chat: b.chat };
    this.closeOv('phone');
    this.renderSellChat();
    $('#ov-chat').classList.add('open');
    this.renderTabs();
    this.save();
  };

  App.renderSellChat = function () {
    const l = this.cur.listing;
    const b = this.cur.buyer;
    const m = E.MODELS_BY_ID[l.modelId];
    const ov = $('#ov-chat');
    const others = l.buyers.filter(x => x !== b && x.stage !== 'lost' && x.stage !== 'done');
    ov.innerHTML =
      '<div class="ov-head"><button class="back" id="chat-back">←</button>' +
      '<div class="avatar" style="background:linear-gradient(140deg,#ff8a5c,#ff5c8a)">' + esc(b.personaName.charAt(0)) + '</div>' +
      '<div class="ov-title"><b>' + esc(b.personaName) + '</b><span>' + esc(m.name) + ' · ' + App.iqInline(Math.round((b.knows || 0.5) * 100)) + '</span></div>' +
      '<div class="ov-price">' + money(l.ask) + '</div>' +
      (others.length ? '<button class="back" id="chat-next" title="другой покупатель">⇄</button>' : '') +
      '</div>' +
      '<div class="chat-wrap" id="chat-box"></div>' +
      '<div class="composer"><div class="quick" id="quick"></div>' +
      '<div class="input-row"><input id="chat-input" type="text" placeholder="Написать покупателю...">' +
      '<button class="send-btn" id="chat-send">➤</button></div></div>';
    $('#chat-back').onclick = () => App.closeOv('chat');
    $('#chat-send').onclick = () => App.sendSellText();
    $('#chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') App.sendSellText(); });
    if ($('#chat-next')) {
      $('#chat-next').onclick = () => {
        const nxt = l.buyers.find(x => x !== b && x.stage !== 'lost' && x.stage !== 'done');
        if (nxt) { nxt.seen = true; App.openSellChat(l, nxt); }
      };
    }
    this.renderSellQuick();
    renderChatBox();
  };

  App.renderSellQuick = function () {
    const b = this.cur.buyer;
    const q = $('#quick');
    if (!q) return;
    if (b.stage === 'lost' || b.stage === 'done') {
      q.innerHTML = '<button class="qbtn" data-q="back">К объявлениям</button>';
      q.querySelector('[data-q=back]').onclick = () => { App.closeOv('chat'); App.go('listings'); };
      return;
    }
    let html = '';
    if (b.stage === 'agreed') {
      html += '<button class="qbtn primary" data-q="meet">Назначить встречу</button>';
    } else {
      html += '<button class="qbtn primary" data-q="accept">Принять ' + money(b.offer) + '</button>';
      html += '<button class="qbtn" data-q="offer">Назвать цену</button>';
      html += '<button class="qbtn" data-q="disclose">Про дефект</button>';
      html += '<button class="qbtn" data-q="meet">На встречу</button>';
    }
    html += '<button class="qbtn danger" data-q="leave">Отказать</button>';
    q.innerHTML = html;
    q.querySelectorAll('[data-q]').forEach(x => {
      x.onclick = () => {
        const a = x.dataset.q;
        if (a === 'accept') App.sellAction({ type: 'accept' });
        else if (a === 'offer') App.offerModal('sell');
        else if (a === 'disclose') App.sellAction({ type: 'disclose' });
        else if (a === 'meet') App.sellAction({ type: 'meet' });
        else if (a === 'leave') App.sellRefuse();
      };
    });
  };

  App.sellRefuse = function () {
    const b = this.cur.buyer;
    pushMsg(b.chat, 'me', 'Извините, не готов отдавать за эти деньги.');
    pushMsg(b.chat, 'sys', 'Вы отказали покупателю', 'bad');
    b.stage = 'lost';
    renderChatBox();
    this.renderSellQuick();
    this.save();
    this.renderTabs();
  };

  App.sendSellText = function () {
    const inp = $('#chat-input');
    const txt = (inp.value || '').trim();
    if (!txt) return;
    inp.value = '';
    const price = parsePrice(txt);
    if (price) this.sellAction({ type: 'offer', price: price }, txt);
    else this.sellAction({ type: 'talk' }, txt);
  };

  App.sellOffer = function (v) {
    this.sellAction({ type: 'offer', price: v });
  };

  const SELL_DEFAULT_TEXT = {
    accept: 'Хорошо, договорились.',
    offer: 'Моя цена — ',
    meet: 'Давайте встретимся, покажу телефон.',
    disclose: 'Сразу скажу про один нюанс.'
  };

  App.sellAction = async function (action, text) {
    if (this.busy) return;
    const b = this.cur.buyer;
    if (!b || b.stage === 'lost') return;

    let playerText = text;
    if (!playerText) {
      if (action.type === 'accept') playerText = 'Хорошо, договорились за ' + money(b.offer) + '.';
      else if (action.type === 'offer') playerText = 'Моя цена — ' + money(action.price) + '.';
      else if (action.type === 'meet') playerText = SELL_DEFAULT_TEXT.meet;
      else if (action.type === 'disclose') playerText = SELL_DEFAULT_TEXT.disclose;
      else playerText = 'Хорошо.';
    }

    this.busy = true;
    pushMsg(b.chat, 'me', playerText);
    renderChatBox();

    const res = E.negotiateSell(this.state, this.cur.listing, b, action);

    for (const intent of res.intents) {
      if (intent.kind === 'meet') {
        pushMsg(b.chat, 'sys', 'Покупатель выехал на встречу', 'good');
        renderChatBox();
        b.stage = 'meeting';
        this.busy = false;
        this.renderHeader();
        setTimeout(() => App.openMeetingSell(), 500);
        return;
      }
      const out = await withTyping(() => AI.buyerReply({ buyer: b, listing: this.cur.listing, intent: intent, chat: b.chat }));
      pushMsg(b.chat, 'them', (out && out.text) || '...');
      if (out && out.via === 'local' && AI.available() && !this._warnedAI) {
        this._warnedAI = true;
        pushMsg(b.chat, 'sys', 'Нейросеть не ответила (' + (AI.lastError || 'нет ответа') + '). Отвечаю шаблонами', 'bad');
      }
      renderChatBox();

      if (intent.kind === 'accept') {
        pushMsg(b.chat, 'sys', 'Покупатель согласен на ' + money(intent.price) + '. Назначайте встречу', 'good');
        renderChatBox();
      }
      if (intent.kind === 'leave') {
        pushMsg(b.chat, 'sys', 'Покупатель закрыл чат', 'bad');
        b.stage = 'lost';
      }
      if (intent.kind === 'disclosed') {
        pushMsg(b.chat, 'sys', 'Дефект указан. Покупатель теперь предлагает ' + money(intent.price), '');
        renderChatBox();
      }
    }
    this.busy = false;
    const pr = document.querySelector('#ov-chat .ov-price');
    if (pr) pr.textContent = money(this.cur.listing.ask);
    this.renderSellQuick();
    this.save();
    this.render();
  };

  /* ============================================================
     ВСТРЕЧА ПРИ ПРОДАЖЕ
     ============================================================ */
  App.openMeetingSell = function () {
    const l = this.cur.listing;
    const b = this.cur.buyer;
    this.closeOv('phone');
    const phone = this.state.phones.find(p => p.id === l.phoneId);
    if (!phone) { this.closeOv('chat'); return; }

    const price = b.agreedPrice || b.offer;
    const found = E.buyerInspects(this.state, l, b);

    const ov = $('#ov-meet');
    const ovh = $('#ov-meet-body');
    ovh.innerHTML =
      '<div class="meet-head"><div class="place">Москва · у метро</div>' +
      '<h2>' + esc(b.personaName) + '</h2>' +
      '<p>' + App.iqInline(Math.round((b.knows || 0.5) * 100)) + ' — «дайте посмотреть…»</p></div>' +
      '<div class="checks" id="checks"></div>' +
      '<div class="meet-summary" id="meet-summary">Проверяет…</div>' +
      '<div class="meet-actions" id="meet-actions"></div>';

    const items = ['Экран', 'Аккумулятор', 'Камеры', 'Корпус', 'Аккаунты'];
    let chtml = '';
    items.forEach((n, i) => {
      chtml += '<div class="check" id="mc-' + i + '"><div class="cn">' + n + '</div><div class="res"></div></div>';
    });
    $('#checks').innerHTML = chtml;
    $('#meet-actions').innerHTML = '<button class="btn ghost" disabled>Осматривает…</button>';
    ov.classList.add('open');

    let i = 0;
    const tick = setInterval(() => {
      const node = $('#mc-' + i);
      if (node) {
        node.classList.add('done');
        node.querySelector('.res').textContent = '✓';
        node.querySelector('.res').className = 'res ok';
      }
      i++;
      if (i >= items.length) {
        clearInterval(tick);
        App.finishSellMeeting(l, b, phone, price, found);
      }
    }, 420);
  };

  App.finishSellMeeting = function (l, b, phone, price, found) {
    const sum = $('#meet-summary');
    const acts = $('#meet-actions');

    if (found.length) {
      const drop = Math.round(E.cleanMarket(E.MODELS_BY_ID[phone.modelId], phone.storage) *
        found.reduce((s, k) => s + D.DEFECTS[k].priceMult, 0) * 0.85 / 100) * 100;
      const newPrice = Math.max(300, price - drop);
      sum.innerHTML = '<b style="color:#b03035">Он нашёл: ' + esc(found.map(k => D.DEFECTS[k].name.toLowerCase()).join(', ')) + '</b>' +
        '<br><span class="tiny muted">«Вы говорили, что всё идеально. Либо скидывайте, либо я пошёл»</span>' +
        '<div class="mt8" style="font-weight:800;font-size:14px">Предлагает ' + money(newPrice) + '</div>';
      acts.innerHTML =
        '<button class="btn success" id="sm-agree">Согласиться за ' + money(newPrice) + '</button>' +
        '<button class="btn ghost" id="sm-refuse">Отказаться</button>';
      $('#sm-agree').onclick = () => App.finishSale(l, b, phone, newPrice, true);
      $('#sm-refuse').onclick = () => {
        this.state.rep = Math.max(0, this.state.rep - 3);
        this.toast('Покупатель ушёл. Рейтинг −3', 'bad');
        this.closeOv('meet');
        this.closeOv('chat');
        this.save();
        this.render();
      };
    } else {
      sum.innerHTML = '<b style="color:#12a150">Всё проверил, доволен.</b>' +
        '<br><span class="tiny muted">«Беру. Держите деньги»</span>' +
        '<div class="mt8" style="font-weight:800;font-size:14px">К оплате: ' + money(price) + '</div>';
      acts.innerHTML = '<button class="btn success" id="sm-done">Забрать ' + money(price) + '</button>';
      $('#sm-done').onclick = () => App.finishSale(l, b, phone, price, false);
    }
  };

  App.finishSale = function (l, b, phone, price, discounted) {
    const before = this.state.balance;
    const r = E.completeSale(this.state, l, price);
    if (!r.ok) { this.toast('Что-то пошло не так', 'bad'); return; }
    b.stage = 'done';
    this.state.skill = Math.min(100, (this.state.skill || 0) + 2);
    this.closeOv('meet');
    this.closeOv('chat');

    const profit = r.profit;
    this.flash((profit >= 0 ? '+' : '') + money(profit), profit >= 0 ? 'good' : 'bad');
    this.toast(profit >= 0
      ? 'Продано! Профит ' + money(profit)
      : 'Продано, но в минус: ' + money(profit), profit >= 0 ? 'good' : 'bad');

    this.save();
    this.render();
    this.go('listings');
  };

  /* ============================================================
     небольшие правки поведения
     ============================================================ */
  // кнопка «Вернуться в ленту» в исчерпанном чате
  document.addEventListener('click', (e) => {
    const q = e.target.closest('[data-q="back"]');
    if (q && App.cur && App.cur.kind === 'buy') {
      App.closeOv('chat');
      App.go('feed');
    }
  });

  root.Flows = true;
})(window);
