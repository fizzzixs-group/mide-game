/* ============================================================
   AVITO FLIP — движок. Никакого DOM: чистая логика, чтобы
   можно было тестировать в Node.
   ============================================================ */
(function (root) {
  'use strict';

  const D = root.DATA;

  /* ---------- utils ---------- */
  let _seed = (Date.now() ^ 0x9e3779b9) >>> 0;
  function seed(n) { _seed = (n >>> 0) || 1; }
  function rnd() {
    _seed |= 0; _seed = (_seed + 0x6D2B79F5) | 0;
    let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const rndRange = (a, b) => a + rnd() * (b - a);
  const rndInt = (a, b) => Math.floor(rndRange(a, b + 1));
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const chance = (p) => rnd() < p;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const round10 = (v) => Math.round(v / 10) * 10;
  const round100 = (v) => Math.round(v / 100) * 100;

  function weighted(arr, key) {
    key = key || 'w';
    let total = 0;
    for (const it of arr) total += it[key];
    let r = rnd() * total;
    for (const it of arr) { r -= it[key]; if (r <= 0) return it; }
    return arr[arr.length - 1];
  }

  const MODELS_BY_ID = {};
  for (const m of D.MODELS) MODELS_BY_ID[m.id] = m;

  /* ---------- цены ---------- */
  const STORAGE_MULT = { 16: 0.78, 32: 0.86, 64: 0.93, 128: 1, 256: 1.13, 512: 1.26, 1024: 1.37 };

  function storageRel(model, storage) {
    const base = model.storages[0];
    return (STORAGE_MULT[storage] || 1) / (STORAGE_MULT[base] || 1);
  }

  function cleanMarket(model, storage) {
    return round100(model.base * storageRel(model, storage));
  }

  function cosmeticMult(c) { return 0.9 + 0.1 * clamp(c, 0, 1); }

  function defectPenalty(defects) {
    let p = 0;
    for (const d of defects) p += D.DEFECTS[d.key].priceMult;
    return clamp(p, 0, 0.86);
  }

  // честная цена телефона «как есть»
  function phoneValue(phone) {
    const model = MODELS_BY_ID[phone.modelId];
    return round100(cleanMarket(model, phone.storage) * cosmeticMult(phone.cosmetic) * (1 - defectPenalty(phone.defects)));
  }

  // сколько за него даст покупатель, который верит только известному
  function perceivedValue(phone, knownDefects) {
    const model = MODELS_BY_ID[phone.modelId];
    const defs = knownDefects || phone.defects;
    return round100(cleanMarket(model, phone.storage) * cosmeticMult(phone.cosmetic) * (1 - defectPenalty(defs)));
  }

  // что игрок сам знает про телефон
  function knownDefects(phone) {
    return phone.defects.filter(d => d.found || d.disclosed);
  }

  // цена «по мнению игрока»: скрытые дефекты он не учитывает
  function playerValue(phone) {
    return perceivedValue(phone, knownDefects(phone));
  }

  // честная цена лота с учётом только того, что написано в объявлении
  function advertisedValue(listing) {
    return perceivedValue(listing, listing.defects.filter(d => d.disclosed));
  }

  /* ---------- генерация объявлений ---------- */
  const DEFECT_BASE = {
    battery: 0.26, screen_crack: 0.15, screen_dead: 0.07, back: 0.10, frame: 0.27,
    camera: 0.08, faceid: 0.085, speaker: 0.075, charging: 0.10, water: 0.045,
    icloud: 0.04, imei: 0.022
  };

  let _lid = 0;
  function nextId(prefix) { _lid++; return prefix + '_' + Date.now().toString(36) + '_' + _lid; }

  function rollDefects(model, cosmetic) {
    const out = [];
    const neglect = 1.45 - cosmetic;           // убитый телефон ломается чаще
    const foldBonus = model.fold ? 1.35 : 1;
    // ухоженный аппарат может быть вообще без проблем
    if (chance(0.10 + cosmetic * 0.14)) return out;
    for (const key of D.DEFECT_KEYS) {
      if (out.length >= 3) break;
      const def = D.DEFECTS[key];
      if (key === 'icloud' && model.brand !== 'Apple') continue;
      if (key === 'faceid' && model.brand !== 'Apple') continue;
      const q = (model.quirks && model.quirks[key]) || 1;
      let p = DEFECT_BASE[key] * q * neglect * foldBonus;
      if (key === 'screen_crack' || key === 'screen_dead') { if (key === 'screen_dead' && out.some(x => x.key === 'screen_crack')) continue; }
      if (key === 'frame' && out.some(x => x.key === 'screen_crack')) p *= 0.6;
      if (chance(p)) out.push({ key: key, hidden: !def.visible });
    }
    return out;
  }

  function makeDescription(listing) {
    const m = MODELS_BY_ID[listing.modelId];
    const cond = listing.cosmetic > 0.86 ? 'состояние отличное, почти как новый'
      : listing.cosmetic > 0.7 ? 'состояние хорошее, есть следы использования'
        : listing.cosmetic > 0.5 ? 'состояние рабочее, потёртости есть'
          : 'состояние так себе, всё видно на фото';
    const parts = [];
    parts.push(m.name + ' ' + listing.storage + ' ГБ, ' + listing.color + '. ' + cond.charAt(0).toUpperCase() + cond.slice(1) + '.');
    const disclosed = listing.defects.filter(d => d.disclosed).map(d => D.DEFECTS[d.key]);
    for (const d of disclosed) {
      const ph = pick(d.phrases);
      parts.push(ph.charAt(0).toUpperCase() + ph.slice(1) + '.');
    }
    const extras = ['Срочно, уезжаю.', 'Продаю, потому что купил новый.', 'Телефон в чехле и с плёнкой всё время.',
      'Есть коробка и зарядка.', 'Коробки нет, зарядка есть.', 'Небольшой торг у капота.',
      'Всё работает, проверяйте при встрече.', 'Продаю по семейным обстоятельствам.', 'Документы есть, покупал официально.'];
    parts.push(pick(extras));
    return parts.join(' ');
  }

  function generateListing(state, avoid) {
    let model = weighted(D.MODELS, 'pop');
    if (avoid && avoid.size) {
      for (let i = 0; i < 8 && avoid.has(model.id); i++) model = weighted(D.MODELS, 'pop');
    }
    const storage = pick(model.storages);
    const cosmetic = clamp(rndRange(0.35, 1), 0.2, 1);
    const rawDefects = rollDefects(model, cosmetic);

    const sellerType = weighted(D.SELLER_TYPES, 'w');
    const isMoscow = chance(0.82);
    const city = isMoscow ? 'Москва' : pick(D.CITIES.filter(c => c !== 'Москва'));
    const metro = pick(D.METRO);

    const defects = rawDefects.map(d => ({
      key: d.key,
      disclosed: chance(D.DEFECTS[d.key].visible ? 0.85 : sellerType.honest * 0.7)
    }));
    // «идеальное состояние» иногда пишут даже про битый телефон
    const listing = {
      id: nextId('L'),
      kind: 'buy',
      modelId: model.id,
      storage: storage,
      color: pick(D.COLORS),
      cosmetic: cosmetic,
      defects: defects,
      city: city,
      isMoscow: isMoscow,
      metro: isMoscow ? metro : null,
      photos: rndInt(1, 6),
      createdAt: state.day,
      expires: state.day + rndInt(2, 4),
      seller: {
        name: pick(D.SELLER_NAMES),
        typeId: sellerType.id,
        typeName: sellerType.name,
        patience: sellerType.patience + rndInt(-1, 2),
        honest: sellerType.honest,
        knows: clamp(rndInt(sellerType.knows[0], sellerType.knows[1]), 0, 100)
      },
      neg: { stage: 'chat', patience: Math.max(2, sellerType.patience + rndInt(-1, 2)), lastAsk: 0 },      viewed: false,
      status: 'active'
    };

    const clean = cleanMarket(model, storage);
    const value = phoneValue(listing);
    // жадность продавца: насколько выше рынка он хочет
    const greed = sellerType.id === 'greedy' ? 0.14 : sellerType.id === 'firm' ? 0.1
      : sellerType.id === 'desperate' ? -0.04 : sellerType.id === 'clueless' ? -0.02 : 0.05;
    listing.ask = round100(value * (1 + greed + rndRange(-0.04, 0.09)));

    // «горящая» цена — повод рискнуть
    if (chance(0.07)) listing.ask = round100(value * rndRange(0.62, 0.78));

    const floors = {
      normal: [0.62, 0.74], desperate: [0.48, 0.58], greedy: [0.74, 0.86],
      firm: [0.9, 0.97], pro: [0.64, 0.74], clueless: [0.45, 0.58]
    }[sellerType.id] || [0.62, 0.74];
    listing.sellerMin = round100(value * rndRange(floors[0], floors[1]));
    listing.sellerMin = Math.min(listing.sellerMin, listing.ask);
    listing.sellerFloor = round100(value * 0.42);
    listing.neg.anchor = round100(listing.sellerMin * 1.03); // абсолютный предел уступки
    listing.value = value;
    listing.cleanValue = clean;
    listing.desc = makeDescription(listing);
    return listing;
  }

  function refreshFeed(state, count) {
    state.listings = (state.listings || []).filter(l => l.status === 'active' && l.expires >= state.day);
    const counts = {};
    for (const l of state.listings) counts[l.modelId] = (counts[l.modelId] || 0) + 1;
    const need = (count || 200) - state.listings.length;
    for (let i = 0; i < need; i++) {
      const avoid = new Set(Object.keys(counts).filter(k => counts[k] >= 2));
      const l = generateListing(state, avoid);
      counts[l.modelId] = (counts[l.modelId] || 0) + 1;
      state.listings.push(l);
    }
    state.listings.sort((a, b) => b.createdAt - a.createdAt || rnd() - 0.5);
  }

  /* ---------- торг при покупке ---------- */
  function sellerTextKey(intent) { return intent; }

  // action: {type:'offer', price} | {type:'ask', topic:'defect'|'battery'|'documents'|'price'}
  //         | {type:'meet'} | {type:'leave'} | {type:'accept', price}
  function negotiateBuy(state, listing, action) {
    const neg = listing.neg;
    const out = { intents: [], events: [] };
    if (neg.stage === 'done' || neg.stage === 'lost') return out;

    if (neg.patience <= 0) {
      neg.stage = 'lost';
      out.intents.push({ kind: 'leave', reason: 'patience' });
      return out;
    }

    if (action.type === 'offer') {
      const p = Math.round(action.price);
      if (p <= 0) return out;
      neg.lastOffer = p;

      // «якорь» — цена, которую продавец называет вслух. Он всегда выше
      // настоящего пола, а соглашается чуть ниже якоря. Так игрок никогда
      // не узнаёт точный минимум и не ловит противоречий в диалоге.
      const anchor = neg.anchor || round100(listing.sellerMin * 1.03);
      const iq = clamp((listing.seller.knows == null ? 50 : listing.seller.knows) / 100, 0, 1);
      // чем глупее продавец, тем легче его сбить: он отдаёт почти сразу
      const acceptAt = 0.82 + iq * 0.13;
      const counterAt = 0.60 + iq * 0.16;

      if (p >= Math.round(anchor * acceptAt)) {
        neg.stage = 'agreed';
        neg.agreedPrice = p;
        listing.ask = p;
        out.intents.push({ kind: 'accept', price: p });
        return out;
      }

      if (p >= Math.round(anchor * counterAt)) {
        neg.patience -= 1;
        listing.ask = Math.min(listing.ask, anchor);
        out.intents.push({ kind: 'counter', price: anchor });
      } else {
        const insult = p < anchor * 0.55;
        neg.patience -= insult ? 2 : 1;
        const stubborn = (listing.seller.knows || 50) / 100;
        if (insult && listing.seller.typeId !== 'desperate' && chance(0.35 + stubborn * 0.3)) neg.patience = 0;
        if (neg.patience <= 0) {
          neg.stage = 'lost';
          out.intents.push({ kind: 'leave', reason: insult ? 'offended' : 'patience' });
        } else {
          listing.ask = Math.min(listing.ask, anchor);
          out.intents.push({ kind: 'reject', price: anchor, lowball: insult });
        }
      }
      return out;
    }

    if (action.type === 'ask') {
      neg.patience -= 1;
      const hidden = listing.defects.filter(d => !d.disclosed);
      if (action.topic === 'battery') {
        const b = hidden.find(d => d.key === 'battery');
        if (b && chance(listing.seller.honest + 0.25)) {
          b.disclosed = true;
          listing.desc = makeDescription(listing);
          adjustSellerPrice(listing);
          out.intents.push({ kind: 'defect', defect: 'battery' });
        } else {
          out.intents.push({ kind: 'info', subject: 'battery' });
        }
        return out;
      }
      if (action.topic === 'defect') {
        if (hidden.length && chance(listing.seller.honest * 0.8)) {
          const d = pick(hidden);
          d.disclosed = true;
          listing.desc = makeDescription(listing);
          adjustSellerPrice(listing);
          out.intents.push({ kind: 'defect', defect: d.key });
        } else {
          out.intents.push({ kind: 'info', subject: 'clean' });
        }
        return out;
      }
      if (action.topic === 'documents') {
        out.intents.push({ kind: 'info', subject: 'documents' });
        return out;
      }
      out.intents.push({ kind: 'info', subject: 'clean' });
      return out;
    }

    if (action.type === 'meet') {
      if (!listing.isMoscow) {
        out.intents.push({ kind: 'shipping_only' });
        return out;
      }
      neg.stage = 'meeting';
      out.intents.push({ kind: 'meet', metro: listing.metro });
      return out;
    }

    if (action.type === 'accept') {
      neg.stage = 'agreed';
      neg.agreedPrice = Math.round(action.price || neg.counterPrice || listing.ask);
      out.intents.push({ kind: 'accept', price: neg.agreedPrice });
      return out;
    }

    if (action.type === 'talk') {
      if (chance(0.45)) neg.patience -= 1;
      if (neg.patience <= 0) {
        neg.stage = 'lost';
        out.intents.push({ kind: 'leave', reason: 'patience' });
        return out;
      }
      out.intents.push({ kind: 'talk' });
      return out;
    }

    return out;
  }

  // продавец узнал про дефект — снижает хотелку
  function adjustSellerPrice(listing) {
    const val = phoneValue(listing);
    const ratio = val / Math.max(1, listing.value);
    listing.ask = round100(listing.ask * ratio);
    listing.sellerMin = round100(listing.sellerMin * ratio);
    listing.neg.anchor = round100(listing.sellerMin * 1.03);
    listing.value = val;
  }

  /* ---------- встреча и осмотр ---------- */
  function startMeeting(state, listing) {
    listing.meeting = {
      checks: {},
      found: [],
      stage: 'inspect',
      startedAt: Date.now()
    };
    listing.neg.stage = 'meeting';
    return listing.meeting;
  }

  // возвращает найденные при проверке дефекты
  function runCheck(state, listing, checkId) {
    const mt = listing.meeting;
    if (!mt || mt.checks[checkId]) return [];
    mt.checks[checkId] = true;
    const check = D.CHECKS.find(c => c.id === checkId);
    if (!check) return [];
    if (check.paid) {
      if (state.balance < check.paid) return [{ error: 'no_money' }];
      state.balance -= check.paid;
    }
    const skill = state.skill || 0;
    const found = [];
    for (const d of listing.defects) {
      const def = D.DEFECTS[d.key];
      if (def.check !== checkId) continue;
      if (d.found) continue;
      // шанс заметить: база проверки + скилл
      let p = check.base * (0.45 + skill / 130);
      if (def.visible) p = 0.98;
      if (chance(clamp(p, 0.12, 0.98))) {
        d.found = true;
        d.disclosed = true;
        found.push(d.key);
      }
    }
    for (const k of found) if (!mt.found.includes(k)) mt.found.push(k);
    if (found.length) {
      adjustSellerPrice(listing);
    }
    return found;
  }

  // игрок давит на цену на встрече
  function meetingHaggle(state, listing, price) {
    const neg = listing.neg;
    const anchor = neg.anchor || round100(listing.sellerMin * 1.03);
    const floor = listing.sellerFloor;
    const p = Math.round(price);
    const iq = clamp((listing.seller.knows == null ? 50 : listing.seller.knows) / 100, 0, 1);
    if (p >= Math.round(anchor * (0.82 + iq * 0.13))) {
      neg.stage = 'agreed'; neg.agreedPrice = p;
      return { kind: 'accept', price: p };
    }
    if (p >= Math.max(floor, Math.round(anchor * (0.60 + iq * 0.16)))) {
      neg.patience -= 1;
      if (neg.patience <= 0) { neg.stage = 'lost'; return { kind: 'leave', reason: 'patience' }; }
      listing.ask = Math.min(listing.ask, anchor);
      return { kind: 'counter', price: anchor };
    }
    if (p < floor || neg.patience <= 1) {
      if (chance(0.3)) { neg.stage = 'lost'; return { kind: 'leave', reason: 'lowball' }; }
    }
    neg.patience -= 2;
    listing.ask = Math.min(listing.ask, anchor);
    return { kind: 'reject', price: anchor };
  }

  /* ---------- история сделок ---------- */
  function addDeal(state, deal) {
    state.deals = state.deals || [];
    state.deals.unshift(deal);
    if (state.deals.length > 120) state.deals.length = 120;
  }

  /* ---------- основной телефон ---------- */
  function mainPhone(state) {
    if (!state.mainPhoneId) return null;
    return (state.phones || []).find(p => p.id === state.mainPhoneId) || null;
  }

  function setMainPhone(state, phoneId) {
    const p = (state.phones || []).find(x => x.id === phoneId);
    if (!p) return { ok: false };
    const first = state.mainPhoneId !== phoneId;
    state.mainPhoneId = phoneId;
    if (first) state.rep = clamp(state.rep + 2, 0, 100);
    return { ok: true, first: first, phone: p };
  }

  function repValue(phone) {
    return phoneValue(phone);
  }

  /* ---------- покупка ---------- */
  function buyPhone(state, listing, price) {
    if (state.balance < price) return { ok: false, error: 'no_money' };
    const model = MODELS_BY_ID[listing.modelId];
    state.balance -= price;
    const phone = {
      id: nextId('P'),
      modelId: model.id,
      storage: listing.storage,
      color: listing.color,
      cosmetic: listing.cosmetic,
      tier: model.tier,
      defects: listing.defects.map(d => ({ key: d.key, found: !!d.found, disclosed: !!d.disclosed })),
      boughtFor: price,
      boughtDay: state.day,
      repaired: [],
      listed: false,
      sold: false
    };
    state.phones.push(phone);
    state.stats.bought++;
    state.stats.spent += price;
    addDeal(state, {
      type: 'buy', day: state.day, modelId: model.id, storage: listing.storage,
      color: listing.color, price: price
    });
    listing.status = 'bought';
    state.listings = state.listings.filter(l => l.id !== listing.id);
    for (const d of phone.defects) {
      if (D.DEFECTS[d.key].repair === null && !D.DEFECTS[d.key].cosmetic) {
        pushLog(state, { text: model.name + ': ' + D.DEFECTS[d.key].name + ' — ремонту не подлежит', tone: 'bad' });
      }
    }
    return { ok: true, phone: phone };
  }

  /* ---------- ремонт ---------- */
  function repairOptions(phone) {
    return phone.defects
      .filter(d => D.DEFECTS[d.key].repair !== null)
      .map(d => {
        const tier = MODELS_BY_ID[phone.modelId].tier;
        const base = D.REPAIR_COST[D.DEFECTS[d.key].repair][tier];
        return {
          key: d.key,
          name: D.REPAIR_NAMES[D.DEFECTS[d.key].repair],
          prices: {
            original: round10(base * D.PART_QUALITY.original.mult),
            analog: round10(base * D.PART_QUALITY.analog.mult),
            used: round10(base * D.PART_QUALITY.used.mult)
          }
        };
      });
  }

  function repairPhone(state, phone, defectKey, quality) {
    const opt = repairOptions(phone).find(o => o.key === defectKey);
    if (!opt) return { ok: false, error: 'no_repair' };
    const cost = round10(opt.prices[quality] * effect(state, 'repair'));
    if (state.balance < cost) return { ok: false, error: 'no_money' };
    state.balance -= cost;
    state.stats.repairsCost = (state.stats.repairsCost || 0) + cost;
    phone.defects = phone.defects.filter(d => d.key !== defectKey);
    phone.repaired.push({ key: defectKey, quality: quality, cost: cost, day: state.day });    // аналог и б/у могут «вылезти» после продажи
    const risk = D.PART_QUALITY[quality].risk;
    if (risk > 0 && chance(risk)) {
      phone.pendingRisk = { key: defectKey, chance: risk };
    }
    return { ok: true, cost: cost };
  }

  function scrapPhone(state, phone) {
    const val = round100(phoneValue(phone) * 0.18 * effect(state, 'scrap'));
    state.balance += val;
    state.stats.scrapped = (state.stats.scrapped || 0) + 1;
    if (state.mainPhoneId === phone.id) state.mainPhoneId = null;
    addDeal(state, {
      type: 'scrap', day: state.day, modelId: phone.modelId, storage: phone.storage, color: phone.color,
      price: val
    });
    state.phones = state.phones.filter(p => p.id !== phone.id);
    return { ok: true, value: val };
  }

  /* ---------- свои объявления ---------- */
  function suggestPrice(phone) {
    return Math.max(500, round100(playerValue(phone) * 0.97));
  }

  function listPhone(state, phone, price, disclose) {
    if (state.balance < 0) return { ok: false };
    const model = MODELS_BY_ID[phone.modelId];
    phone.listed = true;
    phone.listPrice = Math.round(price);
    const listing = {
      id: nextId('S'),
      kind: 'sell',
      phoneId: phone.id,
      modelId: phone.modelId,
      storage: phone.storage,
      color: phone.color,
      defects: (disclose === false ? [] : phone.defects.filter(d => d.disclosed || d.found))
        .map(d => ({ key: d.key, disclosed: true })),
      city: 'Москва',
      isMoscow: true,
      ask: phone.listPrice,
      createdAt: state.day,
      views: rndInt(12, 60),
      buyers: [],
      status: 'active',
      desc: model.name + ' ' + phone.storage + ' ГБ, ' + phone.color + '. ' + model.note + '.'
    };
    state.myListings.push(listing);
    return { ok: true, listing: listing };
  }

  function buyerAppears(state, listing) {
    const phone = state.phones.find(p => p.id === listing.phoneId);
    if (!phone) return null;
    const persona = weighted(D.BUYERS, 'w');
    const known = phone.defects.filter(d => d.disclosed || d.found);
    const perceived = perceivedValue(phone, known);
    const budget = round100(perceived * rndRange(persona.budget[0], persona.budget[1]) * (0.97 + (state.rep || 50) / 2000) * effect(state, 'buyer'));
    const b = {
      id: nextId('B'),
      personaId: persona.id,
      personaName: persona.name,
      kind: persona.kind,
      polite: persona.polite,
      patience: persona.patience,
      skill: persona.skill,
      knows: persona.knows,
      haggle: persona.haggle,
      noshow: persona.noshow,
      budget: budget,
      price: listing.ask,
      offer: 0,
      stage: 'chat',
      msgs: 0
    };
    b.offer = Math.max(300, round100(Math.min(
      listing.ask * (0.68 + (1 - clamp(persona.knows, 0, 1)) * 0.22 + rndRange(-0.03, 0.05)),
      budget * rndRange(0.9, 1.0)
    )));
    listing.buyers.push(b);
    return b;
  }

  function negotiateSell(state, listing, buyer, action) {
    const out = { intents: [], events: [] };
    if (buyer.stage === 'done' || buyer.stage === 'lost') return out;
    if (buyer.patience <= 0) { buyer.stage = 'lost'; out.intents.push({ kind: 'leave' }); return out; }

    const syncPrice = (p) => {
      listing.ask = Math.round(p);
      const ph = state.phones.find(x => x.id === listing.phoneId);
      if (ph) ph.listPrice = listing.ask;
    };

    if (action.type === 'offer') {
      // игрок называет цену
      const p = Math.round(action.price);
      buyer.price = p;
      syncPrice(p);
      if (p > buyer.budget) {
        buyer.patience -= 1;
        out.intents.push({ kind: 'too_expensive', budget: buyer.budget });
        return out;
      }
      if (p <= buyer.offer) {
        buyer.stage = 'agreed';
        buyer.agreedPrice = p;
        syncPrice(p);
        out.intents.push({ kind: 'accept', price: p });
        return out;
      }
      const over = p - buyer.offer;
      const iq = clamp(buyer.knows == null ? 0.5 : buyer.knows, 0, 1);
      // покупатель потупее соглашается почти сразу, умный торгуется до конца
      if (over <= buyer.budget * (0.04 + (1 - iq) * 0.10)) {
        buyer.stage = 'agreed';
        buyer.agreedPrice = p;
        syncPrice(p);
        out.intents.push({ kind: 'accept', price: p });
        return out;
      }
      if (over > buyer.budget * (0.10 + (1 - iq) * 0.30) && buyer.kind !== 'kind') {
        buyer.patience -= 1;
        out.intents.push({ kind: 'reject_price', price: buyer.offer });
        return out;
      }
      const mid = round100((p + buyer.offer) / 2);
      buyer.offer = Math.min(buyer.budget, mid);
      syncPrice(buyer.offer);
      buyer.patience -= 1;
      out.intents.push({ kind: 'counter', price: buyer.offer });
      return out;
    }

    if (action.type === 'accept') {
      buyer.stage = 'agreed';
      buyer.agreedPrice = buyer.offer;
      syncPrice(buyer.offer);
      out.intents.push({ kind: 'accept', price: buyer.offer });
      return out;
    }

    if (action.type === 'meet') {
      buyer.stage = 'meeting';
      out.intents.push({ kind: 'meet' });
      return out;
    }

    if (action.type === 'disclose') {
      const phone = state.phones.find(p => p.id === listing.phoneId);
      const hidden = phone.defects.filter(d => !d.disclosed && !d.found);
      if (hidden.length) {
        const d = hidden[0];
        d.disclosed = true;
        listing.defects.push({ key: d.key, disclosed: true });
        const drop = round100(D.DEFECTS[d.key].priceMult * cleanMarket(MODELS_BY_ID[phone.modelId], phone.storage) * 0.9);
        buyer.budget = Math.max(300, buyer.budget - drop);
        buyer.offer = Math.max(300, buyer.offer - drop);
        out.intents.push({ kind: 'disclosed', defect: d.key, price: buyer.offer });
        return out;
      }
      out.intents.push({ kind: 'nothing_to_disclose' });
      return out;
    }

    if (action.type === 'talk') {
      if (chance(0.4)) buyer.patience -= 1;
      if (buyer.patience <= 0) { buyer.stage = 'lost'; out.intents.push({ kind: 'leave' }); return out; }
      out.intents.push({ kind: 'talk' });
      return out;
    }

    if (action.type === 'push') {
      // «да ладно, бери, хорошая цена»
      buyer.patience -= 1;
      const p = action.price || listing.ask;
      if (buyer.patience <= 0) { buyer.stage = 'lost'; out.intents.push({ kind: 'leave' }); return out; }
      if (p <= buyer.budget && chance(0.35 + (buyer.kind === 'kind' ? 0.2 : 0))) {
        buyer.stage = 'agreed'; buyer.agreedPrice = p;
        out.intents.push({ kind: 'accept', price: p });
      } else {
        out.intents.push({ kind: 'not_buying' });
      }
      return out;
    }
    return out;
  }

  /* ---------- сделка на встрече ---------- */
  function buyerInspects(state, listing, buyer) {
    const phone = state.phones.find(p => p.id === listing.phoneId);
    const hidden = phone.defects.filter(d => !d.disclosed);
    const found = [];
    for (const d of hidden) {
      const p = buyer.skill * (D.DEFECTS[d.key].visible ? 1.4 : 1.0);
      if (chance(clamp(p, 0, 0.95))) {
        d.found = true;   // увидел, но в объявлении дефекта не было
        found.push(d.key);
      }
    }
    return found;
  }

  function completeSale(state, listing, price) {
    const phone = state.phones.find(p => p.id === listing.phoneId);
    if (!phone) return { ok: false };
    state.balance += price;
    state.stats.sold++;
    state.stats.earned += price;
    phone.sold = true;
    phone.soldFor = price;
    listing.status = 'sold';
    state.myListings = state.myListings.filter(l => l.id !== listing.id);
    state.phones = state.phones.filter(p => p.id !== phone.id);

    const profit = price - phone.boughtFor - (phone.repaired || []).reduce((s, r) => s + r.cost, 0);
    state.stats.profit += profit;
    addDeal(state, {
      type: 'sell', day: state.day, modelId: phone.modelId, storage: phone.storage, color: phone.color,
      price: price, boughtFor: phone.boughtFor, repair: (phone.repaired || []).reduce((s, r) => s + r.cost, 0),
      profit: profit
    });
    if (state.mainPhoneId === phone.id) state.mainPhoneId = null;
    if (profit > (state.stats.bestDeal || -1e9)) {
      state.stats.bestDeal = profit;
      state.stats.bestModel = MODELS_BY_ID[phone.modelId].name;
    }

    // репутация: скрыл дефект — либо попался, либо покупатель узнает позже
    const unseen = phone.defects.filter(d => !d.disclosed && !d.found);
    const caught = phone.defects.filter(d => !d.disclosed && d.found);
    if (unseen.length) {
      state.rep = clamp(state.rep - 2, 0, 100);
      const worst = unseen[0];
      // возврат — не приговор: серьёзный скрытый дефект всплывает чаще, мелочь почти никогда
      const risk = clamp(D.DEFECTS[worst.key].priceMult * 0.45 * modeOf(state).returnMult, 0.03, 0.34);
      if (chance(risk)) {
        state.pendingReturns.push({
          day: state.day + 1,
          phone: phone,
          price: price,
          listingId: listing.id,
          defect: worst.key
        });
      }
    } else if (caught.length) {
      state.rep = clamp(state.rep - 1, 0, 100);
    } else {
      state.rep = clamp(state.rep + 1.5, 0, 100);
    }

    // если запчасть была «аналог» с риском — лотерея
    if (phone.pendingRisk && chance(phone.pendingRisk.chance)) {
      pushLog(state, { text: 'Из-за дешёвой запчасти покупатель вернёт ' + MODELS_BY_ID[phone.modelId].name, tone: 'bad' });
    }

    return { ok: true, profit: profit };
  }

  /* ---------- дни и события ---------- */
  function pushLog(state, ev) {
    ev.day = state.day;
    ev.id = nextId('E');
    state.log.unshift(ev);
    if (state.log.length > 80) state.log.length = 80;
  }

  function advanceDay(state) {
    const events = [];
    state.day++;

    // возвраты
    const still = [];
    for (const r of state.pendingReturns) {
      if (r.day <= state.day) {
        state.balance -= r.price;
        state.rep = clamp(state.rep - 8, 0, 100);
        r.phone.sold = false;
        r.phone.defects = r.phone.defects.filter(d => d.key !== r.defect);
        if (!r.phone.defects.some(d => d.key === r.defect)) {
          r.phone.defects.push({ key: r.defect, found: true, disclosed: true });
        }
        r.phone.listed = false;
        state.phones.push(r.phone);
        events.push({ type: 'return', text: 'Возврат: ' + MODELS_BY_ID[r.phone.modelId].name + ' — покупатель нашёл «' + D.DEFECTS[r.defect].name.toLowerCase() + '» и вернул. −' + r.price + ' ₽', tone: 'bad' });
      } else still.push(r);
    }
    state.pendingReturns = still;

    // истечение объявлений
    state.listings = state.listings.filter(l => l.status === 'active' && l.expires >= state.day);
    refreshFeed(state, 200);

    // событие режима «Интересный»
    if (modeOf(state).eventChance && chance(modeOf(state).eventChance)) {
      const ev = rollEvent(state);
      events.push({ type: 'event', text: ev.title + ': ' + state.lastEvent.result, tone: ev.good ? 'good' : 'bad' });
    }

    // новые покупатели на свои объявления — каждый день по несколько сообщений
    let msgCount = 0;
    for (const l of state.myListings) {
      l.views += rndInt(6, 26);
      const active = (l.buyers || []).filter(b => b.stage !== 'lost' && b.stage !== 'done').length;
      if (active >= 7) continue;
      const n = active >= 4 ? 1 : rndInt(1, 3);
      for (let i = 0; i < n; i++) { buyerAppears(state, l); msgCount++; }
    }
    if (msgCount) events.push({ type: 'messages', text: 'Новые сообщения по объявлениям: ' + msgCount, tone: '' });

    for (const e of events) pushLog(state, e);
    return events;
  }

  /* ---------- РЕЖИМЫ ---------- */
  const MODES = {
    casual: {
      id: 'casual', name: 'Казуальный', icon: '🌿',
      note: 'Спокойный перекуп: лента, торг, встречи. Без событий и внезапных сюрпризов.',
      eventChance: 0, returnMult: 1
    },
    risky: {
      id: 'risky', name: 'Интересный', icon: '🎲',
      note: 'Каждый день что-то происходит: ажиотаж, скидки мастеров, конкуренты, горящие лоты, мошенники.',
      eventChance: 0.62, returnMult: 1.3
    }
  };

  function modeOf(state) { return MODES[state.mode] || MODES.casual; }

  // активный бонус/штраф от события
  function effect(state, key) {
    const e = state.effects && state.effects[key];
    if (!e || e.until < state.day) return 1;
    return e.v;
  }

  function setEffect(state, key, v, days) {
    state.effects = state.effects || {};
    state.effects[key] = { v: v, until: state.day + (days || 2) };
  }

  /* ---------- СОБЫТИЯ ---------- */
  const EVENTS = [
    {
      id: 'repair', w: 12, good: true, title: 'Мастер даёт скидку',
      text: 'Знакомый мастер в соседнем дворе берёт за ремонт на 35% меньше.',
      apply(state) { setEffect(state, 'repair', 0.65, 2); return 'ремонт дешевле на 35% (2 дня)'; }
    },
    {
      id: 'demand', w: 12, good: true, title: 'Ажиотаж на рынке',
      text: 'Спрос вырос, покупатели готовы платить больше.',
      apply(state) { setEffect(state, 'buyer', 1.12, 2); return 'покупатели платят +12% (2 дня)'; }
    },
    {
      id: 'scrap', w: 7, good: true, title: 'Ломбард скупает дорого',
      text: 'Скупщик на запчасти поднял цены.',
      apply(state) { setEffect(state, 'scrap', 1.9, 2); return 'сдача на запчасти дороже в 1,9 раза (2 дня)'; }
    },
    {
      id: 'viral', w: 9, good: true, title: 'Объявление залетело',
      text: 'Твоё объявление попало в подборку и набрало просмотры.',
      apply(state) {
        if (!state.myListings.length) { state.balance += 1500; return 'нечего продвигать — зато дали 1 500 ₽ бонусом'; }
        const l = state.myListings[Math.floor(rnd() * state.myListings.length)];
        l.views += 120;
        E_buyer(state, l); E_buyer(state, l);
        return '+' + 2 + ' новых покупателя на «' + MODELS_BY_ID[l.modelId].name + '»';
      }
    },
    {
      id: 'hotlot', w: 10, good: true, title: 'Горящий лот',
      text: 'На Авито выскочило объявление, которое отдают почти задаром.',
      apply(state) {
        const l = generateListing(state);
        l.ask = round100(l.value * rndRange(0.5, 0.62));
        l.sellerMin = round100(l.ask * 0.9);
        l.neg.anchor = round100(l.sellerMin * 1.03);
        l.desc = makeDescription(l) + ' Срочно, уезжаю, отдам первому.';
        state.listings.unshift(l);
        return 'в ленте появился лот за ' + l.ask + ' ₽';
      }
    },
    {
      id: 'bonus', w: 8, good: true, title: 'Неожиданные деньги',
      text: 'Вернули старый долг.',
      apply(state) { const s = rndInt(1500, 3500); state.balance += s; return '+' + s + ' ₽'; }
    },
    {
      id: 'competitor', w: 10, good: false, title: 'Перекуп скупил лоты',
      text: 'Конкурент прочёсывает ленту и забирает всё интересное.',
      apply(state) {
        const before = state.listings.length;
        state.listings = state.listings.filter(() => chance(0.62));
        return 'из ленты пропало ' + (before - state.listings.length) + ' объявлений';
      }
    },
    {
      id: 'fine', w: 8, good: false, title: 'Авито списал деньги',
      text: 'Списание за продвижение объявлений.',
      apply(state) {
        const s = Math.min(state.balance, rndInt(800, 2200));
        state.balance -= s;
        return '−' + s + ' ₽';
      }
    },
    {
      id: 'thief', w: 6, good: false, title: 'Купил краденый',
      text: 'Один из аппаратов на складе оказался с «сюрпризом» — IMEI в чёрном списке.',
      apply(state) {
        if (!state.phones.length) { state.balance = Math.max(0, state.balance - 700); return 'склад пуст — отделался штрафом 700 ₽'; }
        const p = state.phones[Math.floor(rnd() * state.phones.length)];
        if (!p.defects.some(d => d.key === 'imei')) p.defects.push({ key: 'imei', found: false, disclosed: false });
        return MODELS_BY_ID[p.modelId].name + ' оказался проблемным';
      }
    },
    {
      id: 'quiet', w: 10, good: true, title: 'Тихий день',
      text: 'На Авито всё спокойно.',
      apply(state) { return 'без последствий'; }
    }
  ];

  function E_buyer(state, listing) { buyerAppears(state, listing); }

  function rollEvent(state) {
    const ev = weighted(EVENTS, 'w');
    const res = ev.apply(state);
    state.lastEvent = { day: state.day, title: ev.title, text: ev.text, result: res, good: ev.good };
    return ev;
  }

  function newGame(mode) {
    const state = {
      version: 1,
      mode: mode || 'casual',
      balance: 5000,
      day: 1,
      rep: 50,
      skill: 10,
      effects: {},
      lastEvent: null,
      deals: [],
      mainPhoneId: null,
      phones: [],
      listings: [],
      myListings: [],
      pendingReturns: [],
      log: [],
      stats: { bought: 0, sold: 0, spent: 0, earned: 0, profit: 0, repairsCost: 0, scrapped: 0, bestDeal: 0, bestModel: null },
      tutorialDone: false
    };
    refreshFeed(state, 200);
    // на старте обязательно должны быть лоты, которые по карману с 5 000 ₽
    const cheapOnes = [];
    const seen = {};
    for (const l of state.listings) seen[l.modelId] = (seen[l.modelId] || 0) + 1;
    let guard = 0;
    while (cheapOnes.length < 6 && guard++ < 900) {
      const avoid = new Set(Object.keys(seen).filter(k => seen[k] >= 2));
      const l = generateListing(state, avoid);
      if (l.ask <= 6500) {
        cheapOnes.push(l);
        seen[l.modelId] = (seen[l.modelId] || 0) + 1;
      }
    }
    // раскидываем дешёвые лоты по верху ленты, чтобы они не шли подряд,
    // но 3 из них гарантированно видны на первом экране
    const first = cheapOnes.slice(0, 3).concat(state.listings.slice(0, 2));
    for (let i = first.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = first[i]; first[i] = first[j]; first[j] = t;
    }
    state.listings = first.concat(cheapOnes.slice(3), state.listings.slice(2));
    pushLog(state, { text: 'Старт: 5 000 ₽ на руках. Москва, Авито, вперёд.', tone: 'info' });
    return state;
  }

  root.Engine = {
    seed, rnd, rndRange, rndInt, pick, chance, clamp, round10, round100, weighted,
    MODELS_BY_ID, storageRel, cleanMarket, cosmeticMult, defectPenalty,
    phoneValue, perceivedValue, knownDefects, playerValue, advertisedValue, generateListing, refreshFeed, makeDescription,
    negotiateBuy, startMeeting, runCheck, meetingHaggle, buyPhone,
    repairOptions, repairPhone, scrapPhone, suggestPrice, listPhone, buyerAppears,
    negotiateSell, buyerInspects, completeSale, advanceDay, pushLog, newGame,
    MODES, modeOf, effect, rollEvent, EVENTS,
    addDeal, mainPhone, setMainPhone, repValue
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Engine;
})(typeof window !== 'undefined' ? window : globalThis);
