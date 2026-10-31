/* ============================================================
   AVITO FLIP — интерфейс: состояние, лента, склад, объявления
   ============================================================ */
(function (root) {
  'use strict';

  const D = root.DATA;
  const E = root.Engine;

  const SAVE_KEY = 'mide.save.v1';
  const OLD_SAVE_KEY = 'avitoFlip.save.v2';
  const KEY_KEY = 'mide.key';
  const OLD_KEY_KEY = 'avitoFlip.key';

  const COLOR_HUE = { 'чёрный': 210, 'белый': 45, 'серый': 210, 'титановый': 35, 'синий': 215, 'зелёный': 145, 'красный': 0, 'розовый': 330, 'фиолетовый': 270 };
  const COLOR_SAT = { 'чёрный': 12, 'белый': 8, 'серый': 8, 'титановый': 18, 'синий': 60, 'зелёный': 45, 'красный': 62, 'розовый': 55, 'фиолетовый': 55 };

  function $(sel) { return document.querySelector(sel); }
  function el(tag, cls, txt) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const nf = new Intl.NumberFormat('ru-RU');
  function money(n) { return nf.format(Math.round(n || 0)) + ' ₽'; }

  // плавный счётчик баланса
  function tickNumber(node, from, to, dur) {
    const t0 = performance.now();
    function frame(t) {
      const k = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      node.textContent = money(from + (to - from) * eased);
      if (k < 1) requestAnimationFrame(frame);
      else node.textContent = money(to);
    }
    requestAnimationFrame(frame);
  }
  function moneyShort(n) {
    n = Math.round(n || 0);
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + ' млн';
    if (n >= 1000) return Math.round(n / 1000) + 'к';
    return String(n);
  }

  let _svgUid = 0;

  // рисуем конкретный аппарат: свой блок камер, свой вырез, складные шире
  function phoneSVG(model, color) {
    const hue = COLOR_HUE[color] != null ? COLOR_HUE[color] : 215;
    const sat = COLOR_SAT[color] != null ? COLOR_SAT[color] : 45;
    const uid = 'pg' + (++_svgUid);
    const fold = !!model.fold;
    const cam = model.cam || 'rect2';
    const notch = model.notch || 'hole';

    const bx = fold ? 3 : 11, bw = fold ? 94 : 78;
    const by = 4, bh = 142, rx = 15;

    const c1 = 'hsl(' + hue + ' ' + sat + '% 77%)';
    const c2 = 'hsl(' + hue + ' ' + sat + '% 48%)';
    const c3 = 'hsl(' + hue + ' ' + sat + '% 33%)';
    const lensF = '#07090c';
    const modF = 'hsl(' + hue + ' ' + Math.min(sat + 4, 60) + '% 21%)';
    const modS = 'rgba(255,255,255,.17)';

    // блок камер
    const cx = bx + 6, cy = by + 7;
    let camSvg = '';
    const lens = (x, y, r) => '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 3.4) + '" fill="' + lensF + '" stroke="rgba(150,195,255,.4)" stroke-width=".7"/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="' + (r ? r * 0.45 : 1.5) + '" fill="#24507d"/>';

    if (cam === 'single') {
      camSvg = lens(cx + 6, cy + 7, 4.4) + '<circle cx="' + (cx + 16) + '" cy="' + (cy + 4) + '" r="2" fill="#f2e7c9" opacity=".75"/>';
    } else if (cam === 'dual_v') {
      camSvg = '<rect x="' + cx + '" y="' + cy + '" width="15" height="24" rx="5" fill="' + modF + '" stroke="' + modS + '" stroke-width=".6"/>' +
        lens(cx + 7.5, cy + 7) + lens(cx + 7.5, cy + 17) +
        '<circle cx="' + (cx + 12.5) + '" cy="' + (cy + 12) + '" r="1.4" fill="#f2e7c9" opacity=".7"/>';
    } else if (cam === 'dual_d') {
      camSvg = '<rect x="' + cx + '" y="' + cy + '" width="23" height="23" rx="6.5" fill="' + modF + '" stroke="' + modS + '" stroke-width=".6"/>' +
        lens(cx + 7, cy + 7) + lens(cx + 16, cy + 16) +
        '<circle cx="' + (cx + 17) + '" cy="' + (cy + 6.5) + '" r="1.5" fill="#f2e7c9" opacity=".7"/>';
    } else if (cam === 'triple') {
      camSvg = '<rect x="' + cx + '" y="' + cy + '" width="24" height="24" rx="7" fill="' + modF + '" stroke="' + modS + '" stroke-width=".6"/>' +
        lens(cx + 7, cy + 7) + lens(cx + 17, cy + 7) + lens(cx + 7, cy + 17) +
        '<circle cx="' + (cx + 17.5) + '" cy="' + (cy + 17.5) + '" r="1.6" fill="#f2e7c9" opacity=".75"/>';
    } else if (cam === 'pill3') {
      camSvg = '<rect x="' + cx + '" y="' + cy + '" width="11.5" height="29" rx="5.75" fill="' + modF + '" stroke="' + modS + '" stroke-width=".6"/>' +
        lens(cx + 5.7, cy + 6, 3) + lens(cx + 5.7, cy + 14.5, 3) + lens(cx + 5.7, cy + 23, 3);
    } else if (cam === 'bar2') {
      camSvg = '<rect x="' + (bx + (bw - 36) / 2) + '" y="' + cy + '" width="36" height="12" rx="6" fill="' + modF + '" stroke="' + modS + '" stroke-width=".6"/>' +
        lens(bx + (bw - 36) / 2 + 8, cy + 6, 3.4) + lens(bx + (bw - 36) / 2 + 27, cy + 6, 3.4) +
        '<circle cx="' + (bx + (bw - 36) / 2 + 17.5) + '" cy="' + (cy + 6) + '" r="1.3" fill="#f2e7c9" opacity=".65"/>';
    } else if (cam === 'rect3') {
      camSvg = '<rect x="' + cx + '" y="' + cy + '" width="25" height="21" rx="6" fill="' + modF + '" stroke="' + modS + '" stroke-width=".6"/>' +
        lens(cx + 7, cy + 6.5, 3.2) + lens(cx + 17.5, cy + 6.5, 3.2) + lens(cx + 7, cy + 15.5, 3.2) +
        '<circle cx="' + (cx + 17.5) + '" cy="' + (cy + 15.5) + '" r="1.4" fill="#f2e7c9" opacity=".7"/>';
    } else if (cam === 'circle3') {
      camSvg = '<circle cx="' + (cx + 11) + '" cy="' + (cy + 11) + '" r="12.5" fill="' + modF + '" stroke="' + modS + '" stroke-width=".6"/>' +
        lens(cx + 11, cy + 5, 3.2) + lens(cx + 5, cy + 15, 3.2) + lens(cx + 17, cy + 15, 3.2);
    } else {
      camSvg = '<rect x="' + cx + '" y="' + cy + '" width="24" height="15" rx="5" fill="' + modF + '" stroke="' + modS + '" stroke-width=".6"/>' +
        lens(cx + 6.5, cy + 7.5, 3) + lens(cx + 17.5, cy + 7.5, 3) +
        '<circle cx="' + (cx + 12) + '" cy="' + (cy + 3.5) + '" r="1.2" fill="#f2e7c9" opacity=".6"/>';
    }

    const logo = model.brand === 'Apple'
      ? '<circle cx="50" cy="' + (by + bh * 0.55) + '" r="7.5" fill="rgba(255,255,255,.16)" stroke="rgba(255,255,255,.3)" stroke-width=".9"/>'
      : '<rect x="42" y="' + (by + bh - 16) + '" width="16" height="2.4" rx="1.2" fill="rgba(255,255,255,.18)"/>';

    return '<svg class="psvg" viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs>' +
      '<linearGradient id="' + uid + 'b" x1="0" y1="0" x2=".85" y2="1">' +
      '<stop offset="0" stop-color="' + c1 + '"/><stop offset=".48" stop-color="' + c2 + '"/><stop offset="1" stop-color="' + c3 + '"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + uid + 'h" x1="0" y1="0" x2=".2" y2="1">' +
      '<stop offset="0" stop-color="#ffffff" stop-opacity=".28"/><stop offset=".5" stop-color="#ffffff" stop-opacity="0"/>' +
      '</linearGradient>' +
      '<clipPath id="' + uid + 'c"><rect x="' + bx + '" y="' + by + '" width="' + bw + '" height="' + bh + '" rx="' + rx + '"/></clipPath>' +
      '</defs>' +
      '<rect x="' + bx + '" y="' + by + '" width="' + bw + '" height="' + bh + '" rx="' + rx + '" fill="url(#' + uid + 'b)" stroke="rgba(0,0,0,.28)" stroke-width=".9"/>' +
      '<g clip-path="url(#' + uid + 'c)">' +
      '<rect x="' + bx + '" y="' + by + '" width="' + bw + '" height="' + (bh * 0.62) + '" fill="url(#' + uid + 'h)"/>' +
      '</g>' +
      '<rect x="' + (bx + 1.4) + '" y="' + (by + 1.4) + '" width="' + (bw - 2.8) + '" height="' + (bh - 2.8) + '" rx="' + (rx - 1.2) + '" fill="none" stroke="rgba(255,255,255,.26)" stroke-width=".9"/>' +
      camSvg +
      logo +
      (fold
        ? '<line x1="49" y1="' + (by + 2) + '" x2="49" y2="' + (by + bh - 2) + '" stroke="rgba(0,0,0,.4)" stroke-width="1.4"/>' +
          '<line x1="51" y1="' + (by + 2) + '" x2="51" y2="' + (by + bh - 2) + '" stroke="rgba(255,255,255,.2)" stroke-width="1.2"/>'
        : '') +
      '</svg>';
  }

  function thumbHTML(model, color) {
    return '<div class="svg-wrap">' + phoneSVG(model, color) + '</div>';
  }

  const App = {
    state: null,
    view: 'feed',
    filter: 'all',
    search: '',
    feedLimit: 200,
    busy: false,
    cur: null,
    _saveT: null,

    init() {
      try {
        const k = localStorage.getItem(KEY_KEY) || localStorage.getItem(OLD_KEY_KEY);
        if (k) root.AI.setKey(k);
      } catch (e) { }
      this.load();
      const fresh = !this.state;
      if (!this.state) this.state = E.newGame('casual');
      this.bind();
      this.render();
      if (fresh || !this.state.mode) this.modeModal(fresh);
      else if (!this.state.tutorialDone) this.showIntro();
    },

    /* ---------- панель отладки ---------- */
    debugPanel() {
      const s = this.state;
      this.modal(
        '<h3>Панель отладки</h3>' +
        '<div class="sub">Ctrl+Shift+P. Для теста: можно поправить баланс и день.</div>' +
        '<div class="field"><label>Баланс</label><div class="price-input"><input id="db-bal" type="number" value="' + Math.round(s.balance) + '"><span>₽</span></div>' +
        '<div class="presets">' +
        '<button class="preset" data-add="10000">+10 000</button>' +
        '<button class="preset" data-add="100000">+100 000</button>' +
        '<button class="preset" data-add="1000000">+1 000 000</button></div></div>' +
        '<div class="field"><label>День</label><div class="price-input"><input id="db-day" type="number" value="' + s.day + '"></div></div>' +
        '<div class="btn-row mt12"><button class="btn ghost" id="db-close">Закрыть</button>' +
        '<button class="btn primary" id="db-ok">Применить</button></div>'
      );
      document.querySelectorAll('#modal .preset').forEach(b => {
        b.onclick = () => {
          const inp = $('#db-bal');
          inp.value = Math.round(Number(inp.value || 0) + Number(b.dataset.add));
        };
      });
      $('#db-close').onclick = () => App.closeModal();
      $('#db-ok').onclick = () => {
        const bal = parseInt($('#db-bal').value, 10);
        const day = parseInt($('#db-day').value, 10);
        if (!isNaN(bal)) App.state.balance = bal;
        if (!isNaN(day) && day > 0) App.state.day = day;
        App.save();
        App.render();
        App.closeModal();
        App.toast('Баланс: ' + money(App.state.balance), 'good');
      };
    },

    /* ---------- выбор режима ---------- */
    modeModal(isFirst) {
      const modes = E.MODES;
      this.modal(
        '<h3>' + (isFirst ? 'С чего начнём?' : 'Сменить режим') + '</h3>' +
        '<div class="sub">' + (isFirst ? 'Выбери, каким будет твой Авито.' : 'Смена режима начнёт новую игру.') + '</div>' +
        Object.keys(modes).map(k => {
          const m = modes[k];
          return '<button class="mode-card" data-mode="' + m.id + '">' +
            '<div class="mt"><b>' + m.name + '</b><span>' + m.note + '</span></div></button>';
        }).join('') +
        (isFirst ? '' : '<button class="btn ghost mt12" id="mm-cancel">Отмена</button>')
      );
      document.querySelectorAll('.mode-card').forEach(b => {
        b.onclick = () => App.startGame(b.dataset.mode);
      });
      if ($('#mm-cancel')) $('#mm-cancel').onclick = () => {
        App.state.mode = App.state.mode || 'casual';
        App.save();
        App.closeModal();
      };
    },

    startGame(mode) {
      this.state = E.newGame(mode);
      this.cur = null;
      this.closeAll();
      this.closeModal();
      this.save();
      this.render();
      this.go('feed');
      this.toast(mode === 'risky'
        ? 'Интересный режим: каждое утро что-то происходит'
        : 'Казуальный режим: спокойная перекупка', 'good');
    },

    /* ---------- сохранение ---------- */
    save() {
      clearTimeout(this._saveT);
      this._saveT = setTimeout(() => {
        try {
          localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
          localStorage.removeItem(OLD_SAVE_KEY);
        } catch (e) { }
      }, 120);
    },
    load() {
      try {
        const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(OLD_SAVE_KEY);
        if (!raw) return;
        const s = JSON.parse(raw);
        if (s && s.version === 1 && Array.isArray(s.listings)) this.state = s;
      } catch (e) { }
    },
    reset() {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
      this.state = E.newGame(this.state ? this.state.mode : 'casual');
      this.closeAll();
      this.go('feed');
      this.render();
      this.toast('Новая игра. 5 000 ₽ и Москва в придачу', 'good');
    },

    /* ---------- события ---------- */
    bind() {
      document.addEventListener('click', (ev) => {
        const t = ev.target.closest('[data-act]');
        if (!t) return;
        const act = t.dataset.act;
        const id = t.dataset.id;
        const fn = this.actions[act];
        if (fn) { ev.preventDefault(); fn.call(this, id, t, ev); }
      });
      const content = $('#content');
      if (content) content.addEventListener('scroll', () => { this._scrollTop = content.scrollTop; }, { passive: true });
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyP') {
          e.preventDefault();
          this.debugPanel();
        } else if ((e.ctrlKey || e.metaKey) && e.altKey && e.code === 'KeyP') {
          e.preventDefault();
          this.debugPanel();
        }
      });
    },

    actions: {
      'tab'(v) { App.go(v); },
      'filter'(f) { App.setFilter(f); },
      'more'() { App.feedLimit = (App.feedLimit || 200) + 100; App.renderFeed(); },
      'go-stock'() { App.go('stock'); },
      'open-listing'(id) { App.openListing(id); },
      'open-settings'() { App.openSettings(); },
      'hide-ai-banner'() { App.state.hideAiBanner = true; App.save(); App.renderFeed(); },
      'next-day'() { App.nextDay(); },
      'work'() {
        App.state.balance += 1500;
        E.pushLog(App.state, { text: 'Подработка: разгрузил коробки, +1 500 ₽', tone: 'good' });
        E.advanceDay(App.state);
        App.save();
        App.render();
        App.toast('+1 500 ₽. Хватит на самый дешёвый лот', 'good');
      },
      'close-ov'(name) { App.closeOv(name); },
      'buy-from-card'(id) { App.openListing(id); },
      'intro-ok'() { App.closeIntro(); },
      'open-phone'(id) { App.openPhone(id); },
      'open-sell'(id) { App.openSellChatByListing(id); }
    },

    go(view) {
      this.view = view;
      if (view === 'feed') this._feedFresh = true;
      document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === view));
      this.renderView();
      const c = $('#content');
      if (c) c.scrollTop = 0;
    },

    setFilter(f) {
      this.filter = f;
      this.feedLimit = 200;
      this._feedFresh = true;
      this.renderFeed();
    },

    nextDay() {
      const events = E.advanceDay(this.state);
      this._feedFresh = true;
      this.save();
      this.render();
      this.go('feed');
      const ev = this.state.lastEvent;
      if (ev && ev.day === this.state.day) setTimeout(() => this.eventModal(ev), 320);
      if (events.length && !(ev && ev.day === this.state.day)) {
        for (const e of events) this.toast(e.text, e.tone === 'bad' ? 'bad' : '');
      } else if (!events.length) {
        this.toast('День ' + this.state.day + '. Авито обновил ленту', '');
      }
    },

    eventModal(ev) {
      this.modal(
        '<div class="ev-head ' + (ev.good ? 'good' : 'bad') + '">' + (ev.good ? '✓' : '!') + '</div>' +
        '<h3>' + esc(ev.title) + '</h3>' +
        '<div class="sub">' + esc(ev.text) + '</div>' +
        '<div class="ev-result ' + (ev.good ? 'pos' : 'neg') + '">' + esc(ev.result) + '</div>' +
        '<button class="btn primary mt12" id="ev-ok">Понял</button>'
      );
      $('#ev-ok').onclick = () => {
        App.state.lastEvent = null;
        App.save();
        App.closeModal();
      };
    },

    /* ---------- тосты ---------- */
    toast(text, kind) {
      const wrap = $('#toasts');
      if (!wrap) return;
      const t = el('div', 'toast ' + (kind || ''), text);
      wrap.appendChild(t);
      setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, 2400);
    },

    flash(text, kind) {
      const f = $('#flash');
      if (!f) return;
      f.innerHTML = '<div class="num" style="color:' + (kind === 'bad' ? 'var(--red)' : 'var(--green)') + '">' + esc(text) + '</div>';
      setTimeout(() => { f.innerHTML = ''; }, 950);
    },

    /* ---------- рендер ---------- */
    render() {
      this.renderHeader();
      this.renderTabs();
      this.renderView();
    },

    renderView() {
      if (this.view === 'feed') this.renderFeed();
      else if (this.view === 'stock') this.renderStock();
      else if (this.view === 'listings') this.renderListings();
      else if (this.view === 'log') this.renderLog();
    },

    renderHeader() {
      const b = $('#balance');
      const target = this.state.balance;
      const prev = b.dataset.v === undefined ? null : Number(b.dataset.v);
      if (prev !== null && prev !== target) {
        tickNumber(b, prev, target, 420);
        b.classList.remove('flash-up', 'flash-down');
        void b.offsetWidth;
        b.classList.add(target > prev ? 'flash-up' : 'flash-down');
      } else if (prev === null) {
        b.textContent = money(target);
      }
      b.dataset.v = target;
      $('#pill-day').textContent = 'День ' + this.state.day;
      $('#pill-rep').textContent = '★ ' + Math.round(this.state.rep);
      $('#pill-skill').textContent = 'осмотр ' + Math.round(this.state.skill);
      const gear = $('#btn-settings');
      if (gear) gear.classList.toggle('ai-on', root.AI.available());
    },

    renderTabs() {
      const s = this.state;
      const stockBadge = $('#tab-badge-stock');
      const listBadge = $('#tab-badge-list');
      const unread = s.myListings.reduce((n, l) => n + (l.buyers || []).filter(b => b.stage === 'chat' && !b.seen).length, 0);
      stockBadge.textContent = s.phones.length || '';
      stockBadge.classList.toggle('gone', !s.phones.length);
      listBadge.textContent = unread || '';
      listBadge.classList.toggle('gone', !unread);
    },

    /* ---------- лента ---------- */
    filteredListings() {
      const f = this.filter;
      const q = (this.search || '').trim().toLowerCase();
      let list = this.state.listings.filter(l => l.status === 'active');
      if (f === 'apple') list = list.filter(l => E.MODELS_BY_ID[l.modelId].brand === 'Apple');
      else if (f === 'samsung') list = list.filter(l => E.MODELS_BY_ID[l.modelId].brand === 'Samsung');
      else if (f === 'xiaomi') list = list.filter(l => ['Xiaomi', 'POCO'].includes(E.MODELS_BY_ID[l.modelId].brand));
      else if (f === 'fold') list = list.filter(l => E.MODELS_BY_ID[l.modelId].fold);
      else if (f === 'cheap') list = list.filter(l => l.ask <= 12000);
      else if (f === 'hot') list = list.filter(l => l.ask < l.value * 0.92);
      if (q) {
        list = list.filter(l => {
          const m = E.MODELS_BY_ID[l.modelId];
          return (m.name + ' ' + m.brand + ' ' + m.code + ' ' + l.storage).toLowerCase().includes(q);
        });
      }
      return list;
    },

    renderFeed() {
      const box = $('#view-feed');
      const all = this.filteredListings();
      const limit = this.feedLimit || 200;
      const list = all.slice(0, limit);
      const animate = !!this._feedFresh;
      this._feedFresh = false;
      let html = '';

      if (!root.AI.available() && !this.state.hideAiBanner) {
        html += '<div class="ai-banner">' +
          '<div class="txt"><b>Диалоги на шаблонах.</b> Подключи ключ DeepSeek — продавцы и покупатели заговорят по-настоящему.</div>' +
          '<button data-act="open-settings">Включить</button>' +
          '<button class="x" data-act="hide-ai-banner">✕</button>' +
          '</div>';
      }

      if (!this.state.stats.bought) {
        html += '<div class="stock-item" style="border-color:#cfe9fb;background:linear-gradient(160deg,#f2faff,#fff)">' +
          '<div style="font-size:12.5px;font-weight:800;margin-bottom:4px">Как это работает</div>' +
          '<div style="font-size:11.5px;color:#5b6472;line-height:1.5">Найди телефон дешевле рынка → торгуйся в чате → приезжай на встречу и проверь его → почини → выставь заново и продай дороже.</div>' +
          '<div class="btn-row mt8"><button class="btn sm primary" data-act="intro-ok">Понял, погнали</button></div>' +
          '</div>';
      }

      if (this.state.balance < 2000 && !this.state.phones.length) {
        html += '<div class="stock-item" style="border-color:#f0d9a8;background:#fffdf6">' +
          '<div style="font-size:12.5px;font-weight:800;margin-bottom:4px">Деньги кончились</div>' +
          '<div style="font-size:11.5px;color:#5b6472;line-height:1.5">Ни телефона, ни налички. Подработай денёк — на самый дешёвый лот хватит.</div>' +
          '<div class="btn-row mt8"><button class="btn sm" style="background:#fff3d6;color:#8a6500" data-act="work">Подработка · +1 500 ₽</button></div>' +
          '</div>';
      }

      html += '<div class="filters">' +
        chip('all', 'Все', this.filter) + chip('hot', 'Выгодные', this.filter) +
        chip('apple', 'Apple', this.filter) + chip('samsung', 'Samsung', this.filter) +
        chip('xiaomi', 'Xiaomi', this.filter) + chip('fold', 'Складные', this.filter) +
        chip('cheap', 'До 12к', this.filter) +
        '</div>';

      html += '<div class="search-row"><input id="feed-search" type="text" placeholder="Поиск: iPhone, Galaxy, POCO…" value="' + esc(this.search || '') + '"></div>';

      html += '<div class="section-title">Свежие объявления <span class="hint">' + all.length + ' шт' + (all.length > list.length ? ' · показано ' + list.length : '') + '</span></div>';
      html += '<div class="cards" id="feed-cards">';
      if (!list.length) {
        html += '<div class="empty"><b>Пусто</b><p>Тут пока ничего нет. Смени фильтр или пролистни день.</p></div>';
      } else {
        list.forEach((l, i) => { html += this.cardHTML(l, animate ? i : -1); });
        if (all.length > list.length) {
          html += '<button class="btn ghost" data-act="more">Показать ещё ' + Math.min(60, all.length - list.length) + '</button>';
        }
      }
      html += '</div>';
      box.innerHTML = html;
      const s = $('#feed-search');
      if (s) {
        let t = null;
        s.addEventListener('input', () => {
          clearTimeout(t);
          t = setTimeout(() => {
            App.search = s.value;
            App.feedLimit = 200;
            App._feedFresh = true;
            App.renderFeed();
            const inp = $('#feed-search');
            if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
          }, 260);
        });
      }
    },

    cardHTML(l, idx) {
      const m = E.MODELS_BY_ID[l.modelId];
      const mkt = E.advertisedValue(l);
      const discount = 1 - l.ask / Math.max(1, mkt);
      let badge = '';
      if (discount > 0.08) badge = '<span class="badge deal">−' + Math.round(discount * 100) + '%</span>';
      else if (l.defects.some(d => ['icloud', 'imei', 'water'].includes(d.key) && d.disclosed)) badge = '<span class="badge risky">риск</span>';
      else if (m.fold) badge = '<span class="badge fold">складной</span>';
      const city = l.isMoscow ? l.city + ', ' + l.metro : l.city;
      const cls = idx >= 0 ? 'card anim' : 'card';
      const style = idx >= 0 ? ' style="--i:' + Math.min(idx, 12) + '"' : '';
      return '<div class="' + cls + '"' + style + ' data-act="open-listing" data-id="' + l.id + '">' +
        '<div class="thumb">' + thumbHTML(m, l.color) + '</div>' +
        '<div class="card-body">' +
        '<div class="card-price">' + money(l.ask) + '</div>' +
        '<div class="card-mkt">рынок ≈ ' + money(mkt) + '</div>' +
        '<div class="card-title">' + esc(m.name) + ' ' + l.storage + ' ГБ</div>' +
        '<div class="card-desc">' + esc(l.desc) + '</div>' +
        '<div class="card-meta"><span class="city">' + esc(city) + '</span>' + badge + '</div>' +
        '</div></div>';
    },

    /* ---------- склад ---------- */
    renderStock() {
      const box = $('#view-stock');
      const phones = this.state.phones.filter(p => !p.sold);
      let html = '<div class="section-title">Мой склад <span class="hint">' + phones.length + ' шт</span></div>';
      if (!phones.length) {
        html += '<div class="empty"><b>Склад пуст</b><p>Купи первый телефон в ленте — лучше всего с дефектом, который дёшево чинится.</p></div>';
        box.innerHTML = html;
        return;
      }
      for (const p of phones) {
        const m = E.MODELS_BY_ID[p.modelId];
        const val = E.playerValue(p);
        const known = p.defects.filter(d => d.found || d.disclosed);
        const unknownCount = p.defects.length - known.length;
        html += '<div class="stock-item" data-act="open-phone" data-id="' + p.id + '">' +
          '<div class="stock-top"><div class="thumb">' + thumbHTML(m, p.color) + '</div>' +
          '<div class="stock-info">' +
          '<div class="nm">' + esc(m.name) + ' ' + p.storage + ' ГБ</div>' +
          '<div class="sub">куплен за ' + money(p.boughtFor) + ' · день ' + p.boughtDay + '</div>' +
          '<div class="val">Сейчас стоит ≈ ' + money(val) + '</div>' +
          '<div class="stock-defects">';
        if (!known.length && !unknownCount) html += '<span class="dtag ok">всё чисто</span>';
        for (const d of known) html += '<span class="dtag bad">' + esc(D.DEFECTS[d.key].short) + '</span>';
        if (unknownCount) html += '<span class="dtag warn">? не проверено</span>';
        html += '</div></div></div>';
        html += '<div class="stock-actions">' +
          '<button class="btn sm" data-act="open-phone" data-id="' + p.id + '">Открыть</button>' +
          '</div></div>';
      }
      box.innerHTML = html;
    },

    /* ---------- мои объявления ---------- */
    renderListings() {
      const box = $('#view-listings');
      const ls = this.state.myListings;
      let html = '<div class="section-title">Мои объявления <span class="hint">' + ls.length + '</span></div>';
      if (!ls.length) {
        html += '<div class="empty"><b>Ничего не выставлено</b><p>Заходи в склад, выбирай телефон и жми «Выставить на Авито».</p></div>';
        box.innerHTML = html;
        return;
      }
      for (const l of ls) {
        const m = E.MODELS_BY_ID[l.modelId];
        const buyers = (l.buyers || []).filter(b => b.stage !== 'lost' && b.stage !== 'done');
        const unread = buyers.filter(b => !b.seen).length;
        const last = buyers[buyers.length - 1];
        html += '<div class="stock-item" data-act="open-sell" data-id="' + l.id + '">' +
          '<div class="stock-top"><div class="thumb">' + thumbHTML(m, l.color) + '</div>' +
          '<div class="stock-info">' +
          '<div class="nm">' + esc(m.name) + ' ' + l.storage + ' ГБ</div>' +
          '<div class="sub">' + money(l.ask) + ' · 👁 ' + l.views + ' · ' + buyers.length + ' пишут</div>' +
          '<div class="stock-defects" style="margin-top:6px">' +
          (l.defects.length ? l.defects.map(d => '<span class="dtag bad">' + esc(D.DEFECTS[d.key].short) + '</span>').join('') : '<span class="dtag ok">без дефектов</span>') +
          '</div></div>' +
          (unread ? '<div style="align-self:flex-start;background:var(--red);color:#fff;border-radius:99px;min-width:20px;height:20px;display:grid;place-items:center;font-size:10px;font-weight:800">' + unread + '</div>' : '') +
          '</div>' +
          (last ? '<div class="tiny muted" style="margin-top:7px">Последний: ' + esc(last.personaName) + ' — ' + (last.stage === 'meeting' ? 'ждёт встречи' : 'торгуется') + '</div>' : '') +
          '</div>';
      }
      box.innerHTML = html;
    },

    /* ---------- журнал ---------- */
    renderLog() {
      const box = $('#view-log');
      const s = this.state;
      const GOAL = 500000;
      const pct = Math.min(100, s.balance / GOAL * 100);
      const mp = E.mainPhone(s);

      // профиль
      let html = '<div class="profile">' +
        '<div class="avatar" style="width:46px;height:46px;font-size:17px">Т</div>' +
        '<div class="pf"><div class="pn">Ты, перекуп</div>' +
        '<div class="ps">★ ' + Math.round(s.rep) + ' · куплено ' + s.stats.bought + ' · продано ' + s.stats.sold + ' · ' + esc(E.modeOf(s).name.toLowerCase()) + '</div></div></div>';

      if (mp) {
        const m = E.MODELS_BY_ID[mp.modelId];
        html += '<div class="main-phone">' + App.phoneSVG(m, mp.color) +
          '<div class="mpi"><div class="tiny muted">Мой телефон</div>' +
          '<div class="mpn">' + esc(m.name) + ' ' + mp.storage + ' ГБ</div>' +
          '<div class="mps">' + esc(mp.color) + ' · ' + money(E.playerValue(mp)) + '</div></div>' +
          '<button class="btn sm ghost" data-act="go-stock" style="width:auto">Сменить</button></div>';
      } else {
        html += '<div class="main-phone"><div class="mpi"><div class="mpn">Основного телефона нет</div>' +
          '<div class="tiny muted">Выбери аппарат на складе — и ходи с ним</div></div>' +
          '<button class="btn sm primary" data-act="go-stock" style="width:auto">Выбрать</button></div>';
      }

      html += '<div class="goal">' +
        '<div class="k">Цель перекупа</div>' +
        '<div class="v">' + money(s.balance) + ' из ' + money(GOAL) + '</div>' +
        '<div class="bar"><i style="width:' + pct.toFixed(1) + '%"></i></div>' +
        '<div class="sub">' + (pct >= 100
          ? 'Готово. Ты легенда Авито — можно начинать заново.'
          : 'Осталось ' + money(GOAL - s.balance) + ' · ' + Math.round(pct) + '%') + '</div>' +
        '</div>';
      html += '<div class="section-title">Статистика</div><div class="stat-grid">' +
        stat('Баланс', money(s.balance), s.balance >= 5000 ? 'green' : 'red') +
        stat('Общий профит', (s.stats.profit >= 0 ? '+' : '') + money(s.stats.profit), s.stats.profit >= 0 ? 'green' : 'red') +
        stat('Куплено / продано', s.stats.bought + ' / ' + s.stats.sold, '') +
        stat('Лучшая сделка', s.stats.bestDeal ? '+' + money(s.stats.bestDeal) : '—', 'green') +
        '</div>';

      // история сделок
      const deals = s.deals || [];
      html += '<div class="section-title mt16">Сделки <span class="hint">' + deals.length + '</span></div>';
      if (!deals.length) html += '<div class="empty"><p>Ещё ни одной сделки.</p></div>';
      for (const d of deals.slice(0, 40)) {
        const m = E.MODELS_BY_ID[d.modelId];
        const buy = d.type === 'buy';
        const sell = d.type === 'sell';
        html += '<div class="txn">' +
          '<div class="txn-l"><span class="txn-day">Д' + d.day + '</span><span class="txn-name">' +
          (buy ? 'Купил ' : sell ? 'Продал ' : 'Сдал ') + esc(m.name) + ' ' + (d.storage || '') + ' ГБ</span></div>' +
          '<div class="txn-sum ' + (buy ? 'neg' : 'pos') + '">' + (buy ? '−' : '+') + money(d.price) + '</div>' +
          (sell
            ? '<div class="txn-sub">куплен за ' + money(d.boughtFor) + (d.repair ? ' · ремонт ' + money(d.repair) : '') + '</div>' +
              '<div class="txn-profit ' + (d.profit >= 0 ? 'pos' : 'neg') + '">' + (d.profit >= 0 ? '+' : '') + money(d.profit) + '</div>'
            : '') +
          '</div>';
      }

      html += '<div class="section-title mt16">События</div>';
      if (!s.log.length) html += '<div class="empty"><p>Пока тихо.</p></div>';
      for (const e of s.log) {
        html += '<div class="log-item ' + (e.tone || '') + '"><div class="day">Д' + e.day + '</div><div>' + esc(e.text) + '</div></div>';
      }
      box.innerHTML = html;
    }
  };

  function chip(id, label, cur) {
    return '<button class="chip' + (cur === id ? ' on' : '') + '" data-act="filter" data-id="' + id + '">' + label + '</button>';
  }
  function stat(k, v, cls) {
    return '<div class="stat"><div class="k">' + k + '</div><div class="v ' + cls + '">' + v + '</div></div>';
  }

  /* ---------- интро и настройки ---------- */
  App.showIntro = function () {
    App.toast('Ты в Москве. 5 000 ₽. Погнали перекупать', '');
    App.state.tutorialDone = true;
    App.save();
  };
  App.closeIntro = function () {
    App.state.tutorialDone = true;
    App.save();
    App.renderFeed();
  };

  App.closeOv = function (name) {
    const ov = document.getElementById('ov-' + name);
    if (ov) ov.classList.remove('open');
  };
  App.closeAll = function () {
    document.querySelectorAll('.overlay').forEach(o => o.classList.remove('open'));
    document.querySelectorAll('.modal-wrap').forEach(o => o.classList.remove('open'));
  };

  App.openSettings = function () {
    const ov = $('#ov-settings');
    const s = this.state;
    ov.innerHTML =
      '<div class="ov-head"><button class="back" data-act="close-ov" data-id="settings">←</button>' +
      '<div class="ov-title"><b>Настройки</b><span>Диалоги, сохранение, сброс</span></div></div>' +
      '<div class="detail">' +
      '<div class="stock-item">' +
      '<div class="row"><div class="txt"><b>Живые диалоги (DeepSeek)</b><span>Характер и цифры считает игра, нейросеть только формулирует реплики. Без ключа работает оффлайн-режим.</span></div>' +
      '<div class="switch' + (root.AI.available() ? ' on' : '') + '" id="sw-ai"></div></div>' +
      '<div class="field mt12"><label>API-ключ DeepSeek</label>' +
      '<input class="key-input" id="inp-key" type="password" placeholder="sk-..." value="' + esc(root.AI.key) + '">' +
      '<div class="key-status" id="key-status">' + (root.AI.available() ? 'ключ сохранён' : 'ключ не задан — диалоги на шаблонах') + '</div></div>' +
      '<div class="btn-row"><button class="btn sm primary" id="btn-key-save">Сохранить</button>' +
      '<button class="btn sm ghost" id="btn-key-test">Проверить</button></div>' +
      '<div class="hint-line">Ключ хранится только в этом браузере и уходит на локальный прокси, который запускается файлом start.bat. В исходниках игры его нет.</div>' +
      (location.protocol === 'file:'
        ? '<div class="warn-line">Игра открыта как файл — браузер заблокирует запросы к API. Запусти <b>start.bat</b>, чтобы включить живые диалоги.</div>'
        : '') +
      '</div>' +
      '<div class="stock-item mt12">' +
      '<div class="row"><div class="txt"><b>Режим: ' + esc(E.modeOf(s).name) + '</b><span>' + esc(E.modeOf(s).note) + '</span></div>' +
      '<button class="btn sm ghost" id="btn-mode" style="width:auto">Сменить</button></div>' +
      '</div>' +
      '<div class="stock-item mt12">' +
      '<div class="row"><div class="txt"><b>Прогресс</b><span>День ' + s.day + ', профит ' + money(s.stats.profit) + ', сделок ' + s.stats.sold + '</span></div></div>' +
      '<div class="btn-row mt8"><button class="btn sm ghost" id="btn-export">Скопировать сейв</button>' +
      '<button class="btn sm danger" id="btn-reset">Начать заново</button></div>' +
      '</div>' +
      '<div class="tiny muted mt12" style="text-align:center">v0.2 · Москва · ' + D.MODELS.length + ' моделей в каталоге, из них ' + D.MODELS.filter(m => m.fold).length + ' складных</div>' +
      '</div>';
    ov.classList.add('open');

    $('#btn-key-save').onclick = () => {
      const k = $('#inp-key').value.trim();
      root.AI.setKey(k);
      try { localStorage.setItem(KEY_KEY, k); } catch (e) { }
      $('#key-status').textContent = k ? 'ключ сохранён' : 'ключ очищен';
      $('#key-status').className = 'key-status ' + (k ? 'ok' : '');
      $('#sw-ai').classList.toggle('on', root.AI.available());
      App.state.hideAiBanner = false;
      App.render();
      App.toast(k ? 'Ключ сохранён, диалоги оживут' : 'Ключ убран, работаем на шаблонах', k ? 'good' : '');
    };
    $('#sw-ai').onclick = () => {
      if (root.AI.available()) {
        root.AI.setKey('');
        try { localStorage.removeItem(KEY_KEY); } catch (e) { }
        $('#inp-key').value = '';
        $('#key-status').textContent = 'ключ убран — диалоги на шаблонах';
        $('#key-status').className = 'key-status';
        $('#sw-ai').classList.remove('on');
        App.render();
      } else {
        $('#inp-key').focus();
        App.toast('Вставь ключ DeepSeek и нажми «Сохранить»', '');
      }
    };
    $('#btn-key-test').onclick = async () => {
      const k = $('#inp-key').value.trim();
      root.AI.setKey(k);
      const st = $('#key-status');
      st.textContent = 'проверяю...';
      st.className = 'key-status';
      const r = await root.AI.chat([{ role: 'user', content: 'Ответь одним словом: привет' }], { maxTokens: 10, timeout: 15000 });
      if (r.ok) {
        st.textContent = 'работает: «' + r.content.slice(0, 40) + '»';
        st.className = 'key-status ok';
        try { localStorage.setItem(KEY_KEY, k); } catch (e) { }
        $('#sw-ai').classList.add('on');
      } else {
        st.textContent = 'ошибка: ' + (r.error || 'неизвестно');
        st.className = 'key-status bad';
      }
    };
    $('#btn-reset').onclick = () => {
      if (confirm('Начать заново? Прогресс сбросится.')) { App.closeOv('settings'); App.modeModal(false); }
    };
    if ($('#btn-mode')) $('#btn-mode').onclick = () => { App.closeOv('settings'); App.modeModal(false); };
    $('#btn-export').onclick = () => {
      const txt = JSON.stringify(App.state);
      navigator.clipboard && navigator.clipboard.writeText(txt);
      App.toast('Сейв скопирован в буфер', 'good');
    };
  };

  root.App = App;
  App.phoneSVG = phoneSVG;
  document.addEventListener('DOMContentLoaded', () => App.init());
})(window);
