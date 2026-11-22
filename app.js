/* ==========================================================
   KIRPINTI — client-side junk journal
   Defter (journal) = birden çok sayfa (sheet).
   Sayfa içindeki öğeler mantıksal birimde (genişlik = 1000) saklanır.
   Video çıktısı: sayfalar sayfa-çevirme geçişiyle, en fazla 60 sn.
   ========================================================== */
(() => {
  'use strict';

  /* ---------- Sabitler ---------- */
  const PW = 1000, PH = 1333;
  const KEYS = { pages: 'kirpinti:pages', profile: 'kirpinti:profile', stickers: 'kirpinti:stickers' };
  const LEGACY_PAGES = 'kolaj-defteri:v1';
  const DB_NAME = 'kirpinti';
  const MAX_SHEETS = 20;
  const MAX_VIDEO_SEC = 60;
  const TURN_SEC = 1.0;
  const INKS = ['#2b1a14', '#1AA9FF', '#e5484d', '#2f9e6e', '#f6eedc'];
  const WIDTHS = [6, 14, 30];
  const FONTS = [
    { f: 'Caveat', n: 'Caveat' },
    { f: 'Kalam', n: 'Kalam' },
    { f: 'Patrick Hand', n: 'Patrick' },
    { f: 'Shadows Into Light', n: 'Shadows' },
    { f: 'Dancing Script', n: 'Dancing' },
    { f: 'Special Elite', n: 'Daktilo' },
    { f: 'Courier Prime', n: 'Yazı makinesi' },
  ];
  const PAPERS = [
    { id: 'cream', name: 'Krem',      base: '#f4ead8', ink: 'rgba(59,42,32,0)' },
    { id: 'dots',  name: 'Noktalı',   base: '#f4ead8', ink: 'rgba(59,42,32,.28)', pat: 'dots' },
    { id: 'lines', name: 'Çizgili',   base: '#f6efe0', ink: 'rgba(59,42,32,.18)', pat: 'lines' },
    { id: 'grid',  name: 'Kareli',    base: '#f1e6d0', ink: 'rgba(59,42,32,.14)', pat: 'grid' },
    { id: 'kraft', name: 'Kraft',     base: '#d9bf95', ink: 'rgba(59,42,32,0)', tex: true },
    { id: 'parch', name: 'Parşömen',  base: '#e8d2a0', ink: 'rgba(90,60,30,.16)', tex: true, pat: 'lines' },
    { id: 'night', name: 'Gece moru', base: '#2e1438', ink: 'rgba(246,238,220,.22)', pat: 'dots' },
  ];

  const NOISE_SVG =
    "<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>" +
    "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/>" +
    "<feColorMatrix values='0 0 0 0 .36  0 0 0 0 .24  0 0 0 0 .14  0 0 0 .55 0'/></filter>" +
    "<rect width='100%' height='100%' filter='url(%23n)'/></svg>";
  const NOISE_SRC = 'data:image/svg+xml,' + encodeURIComponent(NOISE_SVG);

  const svgUri = (vb, inner) =>
    'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}</svg>`);
  const sticker = (name, vb, inner) => {
    const [, , w, h] = vb.split(' ').map(Number);
    return { name, ar: h / w, src: svgUri(vb, inner) };
  };
  const STICKERS = [
    sticker('Bilet', '0 0 240 120',
      `<path d="M4 4H236V46a14 14 0 0 0 0 28V116H4V74a14 14 0 0 0 0-28Z" fill="#f3e4bf" stroke="#4b1d5e" stroke-width="3"/>
       <path d="M26 24H180M26 96H150" stroke="#4b1d5e" stroke-width="3" stroke-dasharray="6 5"/>
       <text x="26" y="72" font-family="Georgia,serif" font-size="30" font-weight="bold" fill="#4b1d5e">BİLET</text>
       <circle cx="200" cy="60" r="20" fill="none" stroke="#b9606e" stroke-width="3"/>`),
    sticker('Bant', '0 0 240 60',
      `<path d="M8 6L14 0H226L232 6V54L226 60H14L8 54Z" fill="#b78fc4" opacity=".7"/>`),
    sticker('Yıldız', '0 0 100 100',
      `<polygon points="50,4 61,36 96,36 67,57 78,90 50,70 22,90 33,57 4,36 39,36" fill="#d9a441" stroke="#7a4a14" stroke-width="2.5"/>`),
    sticker('Kalp', '0 0 100 90',
      `<path d="M50 88C10 60 2 36 14 20 26 4 46 8 50 26 54 8 74 4 86 20 98 36 90 60 50 88Z" fill="#b9606e"/>`),
    sticker('Damga', '0 0 120 120',
      `<circle cx="60" cy="60" r="52" fill="none" stroke="#4b1d5e" stroke-width="4"/>
       <circle cx="60" cy="60" r="42" fill="none" stroke="#4b1d5e" stroke-width="2" stroke-dasharray="3 4"/>
       <text x="60" y="67" text-anchor="middle" font-family="Georgia,serif" font-size="16" letter-spacing="2" fill="#4b1d5e">KIRPINTI</text>`),
    sticker('Çiçek', '0 0 120 120',
      `<g fill="#e7b8bf"><circle cx="60" cy="30" r="24"/><circle cx="90" cy="60" r="24"/><circle cx="60" cy="90" r="24"/><circle cx="30" cy="60" r="24"/></g>
       <circle cx="60" cy="60" r="16" fill="#d9a441"/>`),
    sticker('Yaprak', '0 0 120 80',
      `<path d="M6 74Q60-6 114 8Q92 84 6 74Z" fill="#7d9162"/>
       <path d="M10 72L100 16" stroke="#3f5a33" stroke-width="2"/>`),
    sticker('Zarf', '0 0 160 110',
      `<rect x="4" y="4" width="152" height="102" fill="#f6eedc" stroke="#4b1d5e" stroke-width="3"/>
       <path d="M4 4L80 66L156 4" fill="none" stroke="#4b1d5e" stroke-width="3"/>`),
    sticker('Dantel', '0 0 120 120',
      `<circle cx="60" cy="60" r="56" fill="#f6eedc" stroke="#4b1d5e" stroke-width="3" stroke-dasharray="3 4"/>
       <circle cx="60" cy="60" r="44" fill="none" stroke="#b9606e" stroke-width="2"/>`),
  ];

  /* ---------- Yardımcılar ---------- */
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const el = (tag, cls = '', text = null) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== null) n.textContent = text;
    return n;
  };
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const paperOf = s => PAPERS.find(x => x.id === s.paper) || PAPERS[0];
  const initials = name => (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const fileName = title => (title || 'kirpinti-defter').replace(/[^\p{L}\p{N}\-]+/gu, '-');
  const newSheet = (paper = 'cream') => ({ id: uid(), paper, elements: [] });

  const stage = $('#stage');
  const drawCanvas = $('#drawCanvas');
  const stageWrap = $('#stageWrap');
  const fileInput = $('#fileInput');
  const videoInput = $('#videoInput');
  const stickerInput = $('#stickerInput');
  const sheet = $('#sheet');
  const sheetBody = $('#sheetBody');

  /* ---------- Durum ---------- */
  let profile = null;
  let journals = [];        // defterler
  let customStickers = [];
  let curJ = null;          // açık defter
  let curIdx = 0;           // açık sayfanın sırası
  let cur = null;           // açık sayfa (öğeleri ve kağıdı burada)
  let selId = null;
  let S = 1;
  let drag = null;
  let draw = null;
  let saveTimer = 0;
  let toastTimer = 0;
  let exporting = false;
  let wiping = false;

  /* ---------- Depolama ---------- */
  const readJSON = (key, fallback) => {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v ?? fallback;
    } catch { return fallback; }
  };
  const writeJSON = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { toast('Depolama dolu. Bazı fotoğrafları ya da çıkartmaları silmeyi deneyin.'); return false; }
  };
  const persist = () => (wiping ? true : writeJSON(KEYS.pages, journals));
  const saveProfile = () => writeJSON(KEYS.profile, profile);
  const saveStickers = () => writeJSON(KEYS.stickers, customStickers);
  function touch() {
    if (curJ) curJ.updated = Date.now();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 350);
  }

  /* Eski tek sayfalık kayıtları yeni (defter) biçimine çevir */
  function migrate(list) {
    return (list || []).map(p => p.sheets ? p : {
      id: p.id,
      title: p.title || '',
      created: p.created || Date.now(),
      updated: p.updated || Date.now(),
      thumb: p.thumb || null,
      sheets: [{ id: uid(), paper: p.paper || 'cream', elements: p.elements || [] }],
    });
  }

  /* IndexedDB: video dosyaları */
  let dbPromise = null;
  function openDB() {
    if (!dbPromise) {
      dbPromise = new Promise((res, rej) => {
        const r = indexedDB.open(DB_NAME, 1);
        r.onupgradeneeded = () => r.result.createObjectStore('blobs');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    }
    return dbPromise;
  }
  async function idb(mode, fn) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction('blobs', mode);
      const req = fn(tx.objectStore('blobs'));
      tx.oncomplete = () => res(req ? req.result : undefined);
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error);
    });
  }
  const blobPut = (id, blob) => idb('readwrite', s => s.put(blob, id));
  const blobGet = id => idb('readonly', s => s.get(id));
  const blobDel = id => idb('readwrite', s => s.delete(id));
  const blobKeys = () => idb('readonly', s => s.getAllKeys());

  const urlCache = new Map();
  async function blobUrl(id) {
    if (!urlCache.has(id)) {
      const b = await blobGet(id);
      if (!b) return null;
      urlCache.set(id, URL.createObjectURL(b));
    }
    return urlCache.get(id);
  }

  async function gcBlobs() {
    try {
      const used = new Set();
      journals.forEach(j => j.sheets.forEach(s => s.elements.forEach(e => e.blobId && used.add(e.blobId))));
      for (const k of await blobKeys()) {
        if (!used.has(k)) await blobDel(k);
      }
    } catch { /* temizlik başarısızsa önemli değil */ }
  }

  /* ---------- Bildirim ---------- */
  function toast(msg, ms = 2600) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  /* Özel onay penceresi: true = onayla, false = vazgeç */
  function askConfirm({ title, text, ok = 'Tamam', danger = false }) {
    const d = $('#dialog');
    const okBtn = $('#dlgOk');
    const cancelBtn = $('#dlgCancel');
    $('#dlgTitle').textContent = title;
    $('#dlgText').textContent = text;
    okBtn.textContent = ok;
    okBtn.className = danger ? 'btn-danger' : 'btn-primary small';
    d.classList.remove('hidden');
    return new Promise(resolve => {
      const done = value => {
        d.classList.add('hidden');
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        d.onclick = null;
        resolve(value);
      };
      okBtn.onclick = () => done(true);
      cancelBtn.onclick = () => done(false);
      d.onclick = ev => { if (ev.target === d) done(false); };
    });
  }

  /* Video oluşturuluyor penceresi: kapatılamaz, ilerleme çubuğu günceller */
  function showBusy(on, pct = 0) {
    $('#busy').classList.toggle('hidden', !on);
    $('#busyBar').style.width = Math.max(0, Math.min(100, pct)) + '%';
  }

  /* ---------- Tema ---------- */
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  function applyTheme() {
    const pref = profile?.theme || 'system';
    const dark = pref === 'dark' || (pref === 'system' && systemDark.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }
  systemDark.addEventListener('change', applyTheme);

  /* ---------- Görünüm ---------- */
  function showView(name) {
    $$('.view').forEach(v => v.classList.toggle('active', v.id === name));
  }

  function renderAvatarBtn() {
    if (profile) $('#btnProfile').textContent = initials(profile.name);
  }

  /* ---------- Kurulum ---------- */
  /* ---------- Şifre (PBKDF2-SHA256, yalnızca bu cihazda) ---------- */
  let locked = false;
  let authMode = 'create';   // create | migrate | unlock
  let hiddenAt = 0;
  const enc = new TextEncoder();
  const toB64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const fromB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  async function hashPw(pw, saltB64) {
    const salt = saltB64 ? fromB64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, key, 256);
    return { salt: toB64(salt), hash: toB64(bits) };
  }

  async function verifyPw(pw, rec) {
    return (await hashPw(pw, rec.salt)).hash === rec.hash;
  }

  function setAuthError(msg) {
    const e = $('#authError');
    e.textContent = msg;
    e.classList.toggle('hidden', !msg);
  }

  function shakeAuth() {
    const f = $('#setupForm');
    f.classList.remove('shake');
    void f.offsetWidth;
    f.classList.add('shake');
  }

  function showAuth(mode) {
    authMode = mode;
    const create = mode === 'create' || mode === 'migrate';
    $('#setupTagline').textContent =
      mode === 'unlock' ? `Hoş geldin, ${profile.name}` :
      mode === 'migrate' ? 'Verilerinizi korumak için bir şifre belirleyin' :
      'Parçalardan bir defter.';
    $('#nameBlock').classList.toggle('hidden', mode !== 'create');
    $('#pw2Block').classList.toggle('hidden', !create);
    $('#authPw').value = '';
    $('#authPw2').value = '';
    $('#authPw').setAttribute('autocomplete', create ? 'new-password' : 'current-password');
    $('#authSubmit').textContent = { create: 'Başla', migrate: 'Kaydet', unlock: 'Aç' }[mode];
    $('#authForgot').classList.toggle('hidden', mode !== 'unlock');
    $('#authFine').textContent = create
      ? 'Hesap bu cihazda yerel olarak saklanır. Şifrenizi unutursanız verilere ancak tüm verileri silerek yeniden erişebilirsiniz.'
      : '';
    setAuthError('');
    showView('setup');
  }

  async function onAuthSubmit(ev) {
    ev.preventDefault();
    const pw = $('#authPw').value;
    const pw2 = $('#authPw2').value;
    setAuthError('');
    try {
      if (authMode === 'unlock') {
        if (await verifyPw(pw, profile.pw)) {
          locked = false;
          showGallery();
        } else {
          setAuthError('Şifre yanlış.');
          shakeAuth();
        }
        return;
      }
      if (pw.length < 4) return setAuthError('Şifre en az 4 karakter olmalı.');
      if (pw !== pw2) return setAuthError('Şifreler eşleşmiyor.');

      if (authMode === 'create') {
        const name = $('#setupName').value.trim();
        if (!name) return setAuthError('Adınızı yazın.');
        profile = { name, theme: 'system', created: Date.now(), pw: await hashPw(pw) };
      } else {
        profile.pw = await hashPw(pw);
      }
      saveProfile();
      applyTheme();
      locked = false;
      showGallery();
      toast('Şifre kaydedildi');
    } catch {
      setAuthError('Şifre oluşturulamadı. Bu özellik güvenli bağlantı (https) gerektirir.');
    }
  }

  function lockApp() {
    if (!profile?.pw || locked || exporting) return;
    persist();
    locked = true;
    curJ = null;
    cur = null;
    selId = null;
    draw = null;
    stage.classList.remove('drawing');
    closeSheet();
    showAuth('unlock');
  }

  $('#setupForm').addEventListener('submit', onAuthSubmit);
  $('#authForgot').addEventListener('click', () => $('#btnWipe').click());

  $('#pwForm').addEventListener('submit', async ev => {
    ev.preventDefault();
    const oldPw = $('#oldPw').value;
    const n1 = $('#newPw').value;
    const n2 = $('#newPw2').value;
    try {
      if (!(await verifyPw(oldPw, profile.pw))) return toast('Eski şifre yanlış.');
      if (n1.length < 4) return toast('Yeni şifre en az 4 karakter olmalı.');
      if (n1 !== n2) return toast('Yeni şifreler eşleşmiyor.');
      profile.pw = await hashPw(n1);
      saveProfile();
      ev.target.reset();
      toast('Şifre değiştirildi');
    } catch {
      toast('Şifre değiştirilemedi. Güvenli bağlantı (https) gerekir.');
    }
  });

  /* ---------- Uygulamayı yükleme (PWA) ---------- */
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', ev => {
    ev.preventDefault();
    installPrompt = ev;
    $('#btnInstall').hidden = false;
  });
  $('#btnInstall').addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    $('#btnInstall').hidden = true;
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    $('#btnInstall').hidden = true;
    toast('Kırpıntı telefonunuza yüklendi');
  });
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (isIOS && !isStandalone) $('#iosHint').hidden = false;

  /* ---------- Profil ---------- */
  function openProfile() {
    renderProfile();
    showView('profile');
  }

  function renderProfile() {
    $('#profAvatar').textContent = initials(profile.name);
    $('#profName').textContent = profile.name;
    $('#profStats').textContent = `${journals.length} defter · ${customStickers.length} kendi çıkartman`;
    $('#nameInput').value = profile.name;
    $$('#themeSeg [data-theme]').forEach(b =>
      b.classList.toggle('on', b.dataset.theme === (profile.theme || 'system')));
    renderAvatarBtn();
  }

  $('#btnProfile').addEventListener('click', openProfile);
  $('#btnProfileBack').addEventListener('click', showGallery);

  $('#nameForm').addEventListener('submit', ev => {
    ev.preventDefault();
    const name = $('#nameInput').value.trim();
    if (!name) return;
    profile.name = name;
    saveProfile();
    renderProfile();
    toast('Profil güncellendi');
  });

  $('#themeSeg').addEventListener('click', ev => {
    const b = ev.target.closest('[data-theme]');
    if (!b) return;
    profile.theme = b.dataset.theme;
    saveProfile();
    applyTheme();
    renderProfile();
  });

  $('#btnWipe').addEventListener('click', async () => {
    const ok = await askConfirm({
      title: 'Her şey silinsin mi?',
      text: 'Defterler, videolar, kendi çıkartmaların ve profilin silinecek. Bu işlem geri alınamaz.',
      ok: 'Hepsini sil',
      danger: true,
    });
    if (!ok) return;

    wiping = true;
    clearTimeout(saveTimer);
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    localStorage.removeItem(LEGACY_PAGES);
    journals = [];
    customStickers = [];
    profile = null;
    urlCache.forEach(url => URL.revokeObjectURL(url));
    urlCache.clear();

    try {
      const db = dbPromise ? await dbPromise : null;
      if (db) db.close();
    } catch { /* bağlantı yoksa sorun değil */ }
    dbPromise = null;
    await new Promise(res => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = req.onerror = req.onblocked = () => res();
    });

    location.reload();
  });

  /* ---------- Galeri ---------- */
  function showGallery() {
    curJ = null; cur = null; selId = null; draw = null;
    stage.classList.remove('drawing');
    closeSheet();
    renderAvatarBtn();
    renderGallery();
    showView('gallery');
  }

  function renderGallery() {
    const grid = $('#pageGrid');
    grid.innerHTML = '';
    $('#emptyMsg').classList.toggle('hidden', journals.length > 0);

    journals
      .slice()
      .sort((a, b) => b.updated - a.updated)
      .forEach(j => {
        const card = el('article', 'card');
        const thumb = el('div', 'thumb');
        thumb.style.backgroundColor = paperOf(j.sheets[0]).base;
        if (j.thumb) {
          const img = new Image();
          img.src = j.thumb;
          img.alt = '';
          thumb.appendChild(img);
        }
        const body = el('div', 'card-body');
        const date = new Date(j.updated).toLocaleDateString('tr-TR', {
          day: 'numeric', month: 'long', year: 'numeric',
        });
        const count = j.sheets.length > 1 ? ` · ${j.sheets.length} sayfa` : '';
        body.append(el('h3', '', j.title || 'İsimsiz defter'), el('time', '', date + count));
        const actions = el('div', 'card-actions');
        const bPng = el('button', '', 'PNG');
        bPng.dataset.act = 'png';
        const bDel = el('button', 'danger', 'Sil');
        bDel.dataset.act = 'del';
        actions.append(bPng, bDel);
        card.append(thumb, body, actions);

        card.addEventListener('click', ev => {
          const act = ev.target.closest('button')?.dataset.act;
          if (act === 'png') return exportPng(j.sheets[0], j.title);
          if (act === 'del') return removeJournal(j);
          openJournal(j);
        });
        grid.appendChild(card);
      });
  }

  async function removeJournal(j) {
    const ok = await askConfirm({
      title: 'Defter silinsin mi?',
      text: `"${j.title || 'İsimsiz defter'}" ve içindeki tüm sayfalar kalıcı olarak silinecek.`,
      ok: 'Sil',
      danger: true,
    });
    if (!ok) return;
    journals = journals.filter(x => x !== j);
    persist();
    await gcBlobs();
    renderGallery();
  }

  $('#btnNew').addEventListener('click', () => {
    const j = {
      id: uid(), title: '', created: Date.now(), updated: Date.now(),
      thumb: null, sheets: [newSheet()],
    };
    journals.push(j);
    persist();
    openJournal(j);
  });

  /* ---------- Editör: defter, sayfa, sekmeler ---------- */
  function openJournal(j) {
    curJ = j;
    curIdx = 0;
    cur = j.sheets[0];
    selId = null;
    draw = null;
    stage.classList.remove('drawing');
    $('#drawBar').classList.add('hidden');
    $('#toolbar').classList.remove('hidden');
    $('#pageTitle').value = j.title || '';
    renderTabs();
    showView('editor');
    updateSelBar();
    requestAnimationFrame(layout);
  }

  function renderTabs() {
    const box = $('#tabs');
    box.innerHTML = '';
    curJ.sheets.forEach((s, i) => {
      const b = el('button', 'tab' + (i === curIdx ? ' on' : ''), String(i + 1));
      b.setAttribute('aria-label', `Sayfa ${i + 1}`);
      b.setAttribute('aria-current', i === curIdx ? 'page' : 'false');
      b.addEventListener('click', () => switchSheet(i));
      box.appendChild(b);
    });
    const add = el('button', 'tab tab-add', '+');
    add.setAttribute('aria-label', 'Sayfa ekle');
    add.addEventListener('click', addSheet);
    box.appendChild(add);
    if (curJ.sheets.length > 1) {
      const del = el('button', 'tab tab-del', 'Sayfayı sil');
      del.addEventListener('click', removeSheet);
      box.appendChild(del);
    }
    box.querySelector('.tab.on')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }

  function switchSheet(i) {
    if (!curJ || draw || i < 0 || i >= curJ.sheets.length || i === curIdx) return;
    curIdx = i;
    cur = curJ.sheets[i];
    selId = null;
    renderStage();
    updateSelBar();
    renderTabs();
  }

  function addSheet() {
    if (!curJ || draw) return;
    if (curJ.sheets.length >= MAX_SHEETS) return toast(`Bir defterde en fazla ${MAX_SHEETS} sayfa olabilir.`);
    curJ.sheets.push(newSheet(cur.paper));
    curJ.updated = Date.now();
    touch();
    switchSheet(curJ.sheets.length - 1);
  }

  async function removeSheet() {
    if (!curJ || curJ.sheets.length < 2 || draw) return;
    const ok = await askConfirm({
      title: 'Sayfa silinsin mi?',
      text: `Sayfa ${curIdx + 1} ve içindeki tüm öğeler silinecek.`,
      ok: 'Sil',
      danger: true,
    });
    if (!ok) return;
    curJ.sheets.splice(curIdx, 1);
    curIdx = Math.min(curIdx, curJ.sheets.length - 1);
    cur = curJ.sheets[curIdx];
    selId = null;
    touch();
    renderStage();
    updateSelBar();
    renderTabs();
    persist();
    gcBlobs();
  }

  async function leaveEditor() {
    if (!curJ) return;
    if (draw) exitDraw();
    clearTimeout(saveTimer);
    await refreshThumb(curJ);
    persist();
    showGallery();
  }

  async function refreshThumb(j) {
    try {
      const c = await renderPage(j.sheets[0], 240);
      j.thumb = c.toDataURL('image/jpeg', 0.8);
    } catch { /* küçük resim isteğe bağlı */ }
  }

  $('#btnBack').addEventListener('click', leaveEditor);

  $('#btnSave').addEventListener('click', async () => {
    if (!curJ) return;
    await refreshThumb(curJ);
    persist();
    toast('Kaydedildi');
  });

  $('#btnExport').addEventListener('click', exportSheetPanel);

  $('#pageTitle').addEventListener('input', ev => {
    if (!curJ) return;
    curJ.title = ev.target.value.trim();
    touch();
  });

  /* ---------- Sahne düzeni ---------- */
  function layout() {
    if (!cur) return;
    const aw = stageWrap.clientWidth - 24;
    const ah = stageWrap.clientHeight - 24;
    const w = Math.max(160, Math.min(aw, ah * PW / PH));
    S = w / PW;
    stage.style.width = w + 'px';
    stage.style.height = (w * PH / PW) + 'px';
    stage.style.setProperty('--s', S + 'px');
    renderStage();
    if (draw) sizeDrawCanvas();
  }

  window.addEventListener('resize', () => {
    if (cur && $('#editor').classList.contains('active')) layout();
  });

  function renderStage() {
    if (!cur) return;
    const P = paperOf(cur);
    stage.style.backgroundColor = P.base;
    stage.style.setProperty('--ink', P.ink);
    stage.classList.toggle('tex', !!P.tex);
    stage.classList.remove('pat-dots', 'pat-lines', 'pat-grid');
    if (P.pat) stage.classList.add('pat-' + P.pat);

    stage.querySelectorAll('.el').forEach(n => n.remove());
    cur.elements.forEach(e => stage.insertBefore(makeNode(e), drawCanvas));
  }

  function makeNode(e) {
    const n = el('div', `el el-${e.kind}` + (e.id === selId ? ' sel' : ''));
    n.dataset.id = e.id;

    if (e.kind === 'text') {
      n.textContent = e.text;
      n.style.fontFamily = `"${e.font}", cursive`;
      n.style.fontSize = (e.size * S) + 'px';
      n.style.color = e.color;
    } else {
      const img = new Image();
      img.src = e.kind === 'video' ? e.poster : e.src;
      img.alt = '';
      img.draggable = false;
      n.appendChild(img);
      if (e.kind === 'video') n.appendChild(el('span', 'play-badge', '▶'));
    }

    if (e.id === selId) {
      n.insertAdjacentHTML('beforeend',
        '<span class="h h-rot" data-h="rot" aria-label="Döndür"></span>' +
        '<span class="h h-res" data-h="res" aria-label="Boyutlandır"></span>');
    }
    placeNode(n, e);
    return n;
  }

  function placeNode(n, e) {
    n.style.left = (e.x * S) + 'px';
    n.style.top = (e.y * S) + 'px';
    n.style.width = (e.w * S) + 'px';
    if (e.kind !== 'text') n.style.height = (e.w * e.ar * S) + 'px';
    n.style.transform = `rotate(${e.r}deg)`;
  }

  function bringToFront(item) {
    cur.elements = cur.elements.filter(x => x !== item).concat(item);
  }

  /* ---------- Dokunma / sürükleme ---------- */
  function pt(ev) {
    const r = stage.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / S, y: (ev.clientY - r.top) / S };
  }

  stage.addEventListener('pointerdown', ev => {
    if (!cur || draw) return;
    const node = ev.target.closest('.el');
    if (!node) {
      if (selId) { selId = null; renderStage(); updateSelBar(); }
      return;
    }
    const id = node.dataset.id;
    const item = cur.elements.find(x => x.id === id);
    if (!item) return;

    const handle = ev.target.closest('[data-h]');
    const wasSel = selId === id;
    if (!wasSel) {
      selId = id;
      bringToFront(item);
      renderStage();
      updateSelBar();
    }
    const n = stage.querySelector(`.el[data-id="${id}"]`);
    const q = pt(ev);
    const hgt = item.kind === 'text' ? n.offsetHeight / S : item.w * item.ar;
    const cx = item.x + item.w / 2;
    const cy = item.y + hgt / 2;

    drag = {
      mode: handle ? handle.dataset.h : 'move',
      item, node: n, wasSel,
      sx: q.x, sy: q.y,
      o: { x: item.x, y: item.y, w: item.w, r: item.r },
      cx, cy,
      a0: Math.atan2(q.y - cy, q.x - cx) * 180 / Math.PI,
      moved: false,
    };
    stage.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  });

  stage.addEventListener('pointermove', ev => {
    if (!drag) return;
    const d = drag, it = d.item;
    const q = pt(ev);
    const dx = q.x - d.sx, dy = q.y - d.sy;
    if (Math.abs(dx) + Math.abs(dy) > 1.5) d.moved = true;

    if (d.mode === 'move') {
      it.x = d.o.x + dx;
      it.y = d.o.y + dy;
    } else if (d.mode === 'res') {
      const rad = d.o.r * Math.PI / 180;
      const proj = dx * Math.cos(rad) + dy * Math.sin(rad);
      it.w = Math.max(30, d.o.w + proj);
    } else if (d.mode === 'rot') {
      const a = Math.atan2(q.y - d.cy, q.x - d.cx) * 180 / Math.PI;
      it.r = d.o.r + (a - d.a0);
    }
    placeNode(d.node, it);
  });

  const endDrag = () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (d.mode === 'move' && !d.moved && d.wasSel && d.item.kind === 'text') {
      openTextEditor(d.item);
      return;
    }
    touch();
    updateSelBar();
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  /* ---------- Seçim barı ---------- */
  function updateSelBar() {
    const it = cur && cur.elements.find(x => x.id === selId);
    $('#selBar').classList.toggle('hidden', !it);
    $('#selEdit').classList.toggle('hidden', !(it && it.kind === 'text'));
  }

  $('#selBar').addEventListener('click', ev => {
    const b = ev.target.closest('[data-sel]');
    if (!b || !cur) return;
    const it = cur.elements.find(x => x.id === selId);
    switch (b.dataset.sel) {
      case 'edit':
        if (it) openTextEditor(it);
        break;
      case 'dup':
        if (it) {
          const c = { ...it, id: uid(), x: it.x + 36, y: it.y + 36 };
          cur.elements.push(c);
          selId = c.id;
          renderStage(); updateSelBar(); touch();
        }
        break;
      case 'del':
        if (it) {
          cur.elements = cur.elements.filter(x => x !== it);
          selId = null;
          renderStage(); updateSelBar(); touch();
          persist();
          gcBlobs();
        }
        break;
      case 'close':
        selId = null;
        renderStage(); updateSelBar();
        break;
    }
  });

  /* ---------- Öğe ekleme ---------- */
  function addEl(data) {
    const e = { id: uid(), r: 0, ...data };
    cur.elements.push(e);
    selId = e.id;
    renderStage();
    updateSelBar();
    touch();
  }

  function readImage(file, max = 900, type = 'image/jpeg', quality = 0.86) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * k));
        c.height = Math.max(1, Math.round(img.height * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve({ src: c.toDataURL(type, quality), ar: c.height / c.width });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img')); };
      img.src = url;
    });
  }

  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0];
    fileInput.value = '';
    if (!f || !cur) return;
    try {
      const img = await readImage(f);
      const w = 380;
      addEl({
        kind: 'photo', src: img.src, ar: img.ar, w,
        x: PW / 2 - w / 2, y: PH / 2 - w * img.ar / 2, r: rnd(-3, 3),
      });
    } catch {
      toast('Fotoğraf okunamadı.');
    }
  });

  videoInput.addEventListener('change', async () => {
    const f = videoInput.files[0];
    videoInput.value = '';
    if (!f || !cur) return;
    const url = URL.createObjectURL(f);
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.src = url;
    try {
      await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = rej; });
      const k = Math.min(1, 480 / Math.max(v.videoWidth, v.videoHeight));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(v.videoWidth * k));
      c.height = Math.max(1, Math.round(v.videoHeight * k));
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      const blobId = uid();
      await blobPut(blobId, f);
      const w = 380;
      const ar = v.videoHeight / v.videoWidth;
      addEl({
        kind: 'video', blobId,
        poster: c.toDataURL('image/jpeg', 0.8),
        ar,
        duration: Number.isFinite(v.duration) ? v.duration : 3,
        w, x: PW / 2 - w / 2, y: PH / 2 - w * ar / 2, r: rnd(-2, 2),
      });
    } catch {
      toast('Video okunamadı. MP4 veya WebM deneyin.');
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  stickerInput.addEventListener('change', async () => {
    const f = stickerInput.files[0];
    stickerInput.value = '';
    if (!f) return;
    try {
      const img = await readImage(f, 512, 'image/png');
      const name = f.name.replace(/\.[^.]+$/, '').slice(0, 20) || 'Çıkartma';
      customStickers.push({ id: uid(), name, src: img.src, ar: img.ar });
      saveStickers();
      toast('Çıkartma eklendi');
      stickerSheet();
    } catch {
      toast('Çıkartma okunamadı.');
    }
  });

  /* ---------- Araç çubuğu ---------- */
  $('#toolbar').addEventListener('click', ev => {
    const b = ev.target.closest('[data-tool]');
    if (!b || !cur) return;
    switch (b.dataset.tool) {
      case 'photo': fileInput.click(); break;
      case 'video': videoInput.click(); break;
      case 'sticker': stickerSheet(); break;
      case 'text': openTextEditor(null); break;
      case 'draw': enterDraw(); break;
      case 'paper': paperSheet(); break;
    }
  });

  /* ---------- Alt paneller ---------- */
  function openSheet(title, node) {
    $('#sheetTitle').textContent = title;
    sheetBody.replaceChildren(node);
    sheet.classList.remove('hidden');
  }
  function closeSheet() {
    sheet.classList.add('hidden');
    sheetBody.replaceChildren();
  }
  sheet.addEventListener('click', ev => {
    if (ev.target === sheet || ev.target.closest('#sheetClose')) closeSheet();
  });

  function placeSticker(s) {
    closeSheet();
    const w = 260;
    addEl({
      kind: 'sticker', src: s.src, ar: s.ar, w,
      x: PW / 2 - w / 2, y: PH / 2 - w * s.ar / 2, r: rnd(-6, 6),
    });
  }

  function stickerSheet() {
    const g = el('div', 'grid-stickers');

    const add = el('button', 'sticker-pick add');
    add.append(el('span', 'plus', '+'), el('span', '', 'Kendi çıkartman'));
    add.addEventListener('click', () => stickerInput.click());
    g.appendChild(add);

    customStickers.forEach(s => {
      const wrap = el('div', 'sticker-wrap');
      const pick = el('button', 'sticker-pick');
      const img = new Image();
      img.src = s.src;
      img.alt = '';
      pick.append(img, el('span', '', s.name));
      pick.addEventListener('click', () => placeSticker(s));

      const x = el('button', 'x', '×');
      x.setAttribute('aria-label', 'Çıkartmayı sil');
      x.addEventListener('click', () => {
        customStickers = customStickers.filter(c => c !== s);
        saveStickers();
        stickerSheet();
      });
      wrap.append(pick, x);
      g.appendChild(wrap);
    });

    STICKERS.forEach(s => {
      const b = el('button', 'sticker-pick');
      const img = new Image();
      img.src = s.src;
      img.alt = '';
      b.append(img, el('span', '', s.name));
      b.addEventListener('click', () => placeSticker(s));
      g.appendChild(b);
    });

    openSheet('Sticker', g);
  }

  function paperSheet() {
    const g = el('div', 'grid-papers');
    PAPERS.forEach(P => {
      const b = el('button', 'paper-pick' + (paperOf(cur).id === P.id ? ' on' : ''));
      const sw = el('span', 'swatch-page');
      sw.style.backgroundColor = P.base;
      b.append(sw, el('span', '', P.name));
      b.addEventListener('click', () => {
        cur.paper = P.id;
        closeSheet();
        renderStage();
        touch();
      });
      g.appendChild(b);
    });
    openSheet('Arka plan', g);
  }

  function exportSheetPanel() {
    if (!curJ || exporting) return;
    const g = el('div', 'export-list');
    const mk = (label, hint, fn) => {
      const b = el('button', 'export-opt');
      b.append(el('strong', '', label), el('span', '', hint));
      b.addEventListener('click', () => { closeSheet(); fn(); });
      return b;
    };
    g.append(
      mk('PNG görsel', `Açık olan sayfa (${curIdx + 1}.)`, () => exportPng(cur, curJ.title)),
      mk('Video (MP4 / WebM)',
        `Tüm sayfalar, sayfa çevirme geçişiyle. En fazla ${MAX_VIDEO_SEC} sn.`,
        () => exportVideo(curJ)),
    );
    openSheet('Dışa aktar', g);
  }

  function openTextEditor(item) {
    const st = item
      ? { text: item.text, font: item.font, color: item.color, size: item.size }
      : { text: '', font: FONTS[0].f, color: INKS[1], size: 64 };

    const form = el('div', 'text-form');
    form.innerHTML = `
      <textarea rows="3" placeholder="Bir şeyler yazın…"></textarea>
      <div class="field-label">Yazı tipi</div>
      <div class="chips fonts"></div>
      <div class="field-label">Renk</div>
      <div class="chips colors"></div>
      <div class="field-label">Boyut</div>
      <input type="range" min="28" max="120" step="2" aria-label="Yazı boyutu">
      <div class="sheet-actions">
        <button class="btn-ghost" data-a="cancel" type="button">Vazgeç</button>
        <button class="btn-primary small" data-a="ok" type="button">Tamam</button>
      </div>`;

    const ta = $('textarea', form);
    const range = $('input[type="range"]', form);
    ta.value = st.text;
    range.value = st.size;

    const refresh = () => {
      ta.style.fontFamily = `"${st.font}", cursive`;
      ta.style.color = st.color;
      $$('.fonts .chip', form).forEach((b, i) => b.classList.toggle('on', FONTS[i].f === st.font));
      $$('.colors .color-dot', form).forEach((b, i) => b.classList.toggle('on', INKS[i] === st.color));
    };

    FONTS.forEach(f => {
      const b = el('button', 'chip', f.n);
      b.type = 'button';
      b.style.fontFamily = `"${f.f}", cursive`;
      b.addEventListener('click', () => { st.font = f.f; refresh(); });
      $('.fonts', form).appendChild(b);
    });

    INKS.forEach(c => {
      const b = el('button', 'color-dot');
      b.type = 'button';
      b.style.background = c;
      b.setAttribute('aria-label', 'Renk ' + c);
      b.addEventListener('click', () => { st.color = c; refresh(); });
      $('.colors', form).appendChild(b);
    });

    range.addEventListener('input', () => { st.size = +range.value; });
    $('[data-a="cancel"]', form).addEventListener('click', closeSheet);
    $('[data-a="ok"]', form).addEventListener('click', () => {
      const text = ta.value.trim();
      if (!text) {
        if (item) {
          cur.elements = cur.elements.filter(x => x !== item);
          if (selId === item.id) selId = null;
        }
      } else if (item) {
        Object.assign(item, { text, font: st.font, color: st.color, size: st.size });
      } else {
        addEl({
          kind: 'text', text, font: st.font, color: st.color, size: st.size,
          x: PW / 2 - 300, y: PH / 2 - 80, w: 600,
        });
      }
      closeSheet();
      renderStage();
      updateSelBar();
      touch();
    });

    refresh();
    openSheet(item ? 'Metni düzenle' : 'Metin ekle', form);
    ta.focus();
  }

  /* ---------- Çizim modu ---------- */
  function strokePath(ctx, s) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = s.c;
    ctx.lineWidth = s.w;
    ctx.beginPath();
    s.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (s.pts.length === 1) ctx.lineTo(s.pts[0][0] + 0.01, s.pts[0][1]);
    ctx.stroke();
  }

  function sizeDrawCanvas() {
    const dpr = window.devicePixelRatio || 1;
    drawCanvas.width = Math.round(stage.clientWidth * dpr);
    drawCanvas.height = Math.round(stage.clientHeight * dpr);
    paintDraw();
  }

  function paintDraw() {
    if (!draw) return;
    const dpr = window.devicePixelRatio || 1;
    const ctx = drawCanvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    ctx.setTransform(dpr * S, 0, 0, dpr * S, 0, 0);
    draw.strokes.forEach(s => strokePath(ctx, s));
  }

  function enterDraw() {
    selId = null;
    updateSelBar();
    draw = { strokes: [], cur: null, color: INKS[1], width: WIDTHS[1] };
    stage.classList.add('drawing');
    drawCanvas.classList.remove('hidden');
    $('#toolbar').classList.add('hidden');
    $('#drawBar').classList.remove('hidden');
    renderStage();
    sizeDrawCanvas();
    syncDrawBar();
  }

  function exitDraw() {
    draw = null;
    stage.classList.remove('drawing');
    drawCanvas.classList.add('hidden');
    $('#toolbar').classList.remove('hidden');
    $('#drawBar').classList.add('hidden');
    updateSelBar();
  }

  function syncDrawBar() {
    $$('#drawColors [data-c]').forEach(b => b.classList.toggle('on', !!draw && b.dataset.c === draw.color));
    $$('#drawWidths [data-w]').forEach(b => b.classList.toggle('on', !!draw && +b.dataset.w === draw.width));
  }

  function buildDrawBar() {
    const cBox = $('#drawColors'), wBox = $('#drawWidths');
    INKS.forEach(c => {
      const b = el('button', 'color-dot sm');
      b.style.background = c;
      b.dataset.c = c;
      b.setAttribute('aria-label', 'Kalem rengi');
      cBox.appendChild(b);
    });
    WIDTHS.forEach(w => {
      const b = el('button', 'w-btn');
      b.dataset.w = w;
      b.setAttribute('aria-label', 'Kalem kalınlığı');
      const dot = el('i');
      dot.style.width = dot.style.height = (w / 2 + 2) + 'px';
      b.appendChild(dot);
      wBox.appendChild(b);
    });
    cBox.addEventListener('click', ev => {
      const b = ev.target.closest('[data-c]');
      if (b && draw) { draw.color = b.dataset.c; syncDrawBar(); }
    });
    wBox.addEventListener('click', ev => {
      const b = ev.target.closest('[data-w]');
      if (b && draw) { draw.width = +b.dataset.w; syncDrawBar(); }
    });
    $('#drawUndo').addEventListener('click', () => {
      if (draw) { draw.strokes.pop(); paintDraw(); }
    });
    $('#drawCancel').addEventListener('click', exitDraw);
    $('#drawDone').addEventListener('click', finishDraw);
  }

  drawCanvas.addEventListener('pointerdown', ev => {
    if (!draw) return;
    drawCanvas.setPointerCapture(ev.pointerId);
    const p = pt(ev);
    draw.cur = { c: draw.color, w: draw.width, pts: [[p.x, p.y]] };
    draw.strokes.push(draw.cur);
    paintDraw();
    ev.preventDefault();
  });
  drawCanvas.addEventListener('pointermove', ev => {
    if (!draw || !draw.cur) return;
    const p = pt(ev);
    draw.cur.pts.push([p.x, p.y]);
    paintDraw();
  });
  const endStroke = () => { if (draw) draw.cur = null; };
  drawCanvas.addEventListener('pointerup', endStroke);
  drawCanvas.addEventListener('pointercancel', endStroke);

  function finishDraw() {
    if (!draw) return;
    const strokes = draw.strokes;
    if (!strokes.length) return exitDraw();

    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    strokes.forEach(s => {
      const pad = s.w / 2 + 2;
      s.pts.forEach(([x, y]) => {
        x0 = Math.min(x0, x - pad); y0 = Math.min(y0, y - pad);
        x1 = Math.max(x1, x + pad); y1 = Math.max(y1, y + pad);
      });
    });
    const bw = Math.max(1, x1 - x0), bh = Math.max(1, y1 - y0);
    const k = 2;
    const c = document.createElement('canvas');
    c.width = Math.ceil(bw * k);
    c.height = Math.ceil(bh * k);
    const ctx = c.getContext('2d');
    ctx.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
    strokes.forEach(s => strokePath(ctx, s));

    exitDraw();
    addEl({ kind: 'drawing', src: c.toDataURL('image/png'), ar: bh / bw, x: x0, y: y0, w: bw });
  }

  /* ---------- Çıktı: ortak çizim ---------- */
  function loadImg(src) {
    return new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = src;
    });
  }

  function wrapText(ctx, text, maxW) {
    const out = [];
    text.split('\n').forEach(par => {
      let line = '';
      for (const word of par.split(' ')) {
        const test = line ? line + ' ' + word : word;
        if (line && ctx.measureText(test).width > maxW) {
          out.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      out.push(line);
    });
    return out;
  }

  /* Bir sayfanın görsellerini ve yazı tiplerini önceden yükle */
  async function prepareAssets(s) {
    const m = new Map();
    m.set('__noise', await loadImg(NOISE_SRC));
    await Promise.all(s.elements.map(async e => {
      const url = e.kind === 'text' ? null : (e.kind === 'video' ? e.poster : e.src);
      if (url) m.set(e.id, await loadImg(url));
    }));
    const fonts = [...new Set(s.elements.filter(e => e.kind === 'text').map(e => e.font))];
    await Promise.all(fonts.map(f => document.fonts.load(`48px "${f}"`).catch(() => {})));
    return m;
  }

  /* Bir sayfayı ctx'e çiz. videos: canlı video elemanları (yoksa afiş kullanılır). */
  function drawPage(ctx, s, k, assets, videos) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const P = paperOf(s);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = P.base;
    ctx.fillRect(0, 0, W, H);

    if (P.tex && assets.get('__noise')) {
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = ctx.createPattern(assets.get('__noise'), 'repeat');
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = P.ink;
    if (P.pat === 'dots') {
      for (let y = 20; y < PH; y += 40) {
        for (let x = 20; x < PW; x += 40) {
          ctx.beginPath();
          ctx.arc(x * k, y * k, 1.5 * k, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (P.pat === 'lines') {
      for (let y = 36; y < PH; y += 44) ctx.fillRect(0, y * k, W, Math.max(1, k));
    } else if (P.pat === 'grid') {
      for (let x = 0; x <= PW; x += 40) ctx.fillRect(x * k, 0, Math.max(1, k), H);
      for (let y = 0; y <= PH; y += 40) ctx.fillRect(0, y * k, W, Math.max(1, k));
    }

    for (const e of s.elements) {
      ctx.save();
      if (e.kind === 'text') {
        const size = e.size * k;
        const lh = size * 1.2;
        const w = e.w * k;
        ctx.font = `${size}px "${e.font}", cursive`;
        ctx.fillStyle = e.color;
        ctx.textBaseline = 'top';
        const lines = wrapText(ctx, e.text, w);
        const h = lines.length * lh;
        ctx.translate(e.x * k + w / 2, e.y * k + h / 2);
        ctx.rotate(e.r * Math.PI / 180);
        lines.forEach((ln, i) => ctx.fillText(ln, -w / 2, -h / 2 + i * lh));
      } else {
        let src = assets.get(e.id);
        const v = videos && videos.get(e.id);
        if (v && v.readyState >= 2) src = v;
        if (src) {
          const w = e.w * k;
          const h = w * e.ar;
          ctx.translate(e.x * k + w / 2, e.y * k + h / 2);
          ctx.rotate(e.r * Math.PI / 180);
          if (e.kind === 'photo' || e.kind === 'video') {
            ctx.shadowColor = 'rgba(40,20,10,.28)';
            ctx.shadowBlur = 14 * k;
            ctx.shadowOffsetY = 6 * k;
          }
          ctx.drawImage(src, -w / 2, -h / 2, w, h);
        }
      }
      ctx.restore();
    }
    ctx.restore();
  }

  async function renderPage(s, outW) {
    const k = outW / PW;
    const c = document.createElement('canvas');
    c.width = Math.round(outW);
    c.height = Math.round(PH * k);
    const assets = await prepareAssets(s);
    drawPage(c.getContext('2d'), s, k, assets, null);
    return c;
  }

  /* Sayfa çevirme karesi: from (eski) sayfa kıvrılıp sola doğru kalkar, to (yeni) altta belirir.
     Sol kenar ciltleme noktasıdır. Serbest kenar hafifçe öne kalkar (perspektif hissi). */
  function drawTurn(ctx, fromC, toC, p) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;   // easeInOutCubic
    const th = e * Math.PI;
    const c = Math.cos(th), s = Math.sin(th);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(toC, 0, 0, W, H);                       // altta yeni sayfa

    if (c > 0.001) {
      const STEP = 3;
      const sw = STEP / c;                                // kaynak genişliği (sayfanın bir dilimi)
      for (let x = 0; x < c * W; x += STEP) {
        const u = x / c;                                  // kaynak x
        const lift = 1 + 0.12 * s * (u / W);              // serbest kenar öne geliyor
        const dh = H * lift;
        ctx.drawImage(fromC, u, 0, sw, H, x, (H - dh) / 2, STEP, dh);
      }
      // kıvrımın altındaki gölge
      const gw = W * 0.22 * s;
      const g = ctx.createLinearGradient(c * W, 0, c * W + gw, 0);
      g.addColorStop(0, `rgba(0,0,0,${0.35 * s})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(c * W, 0, gw, H);
    }

    // ciltleme kenarı gölgesi
    const sp = ctx.createLinearGradient(0, 0, W * 0.05, 0);
    sp.addColorStop(0, 'rgba(0,0,0,.22)');
    sp.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sp;
    ctx.fillRect(0, 0, W * 0.05, H);
  }

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  async function exportPng(s, title) {
    try {
      const c = await renderPage(s, 1400);
      c.toBlob(blob => {
        if (!blob) return toast('PNG oluşturulamadı.');
        download(blob, fileName(title) + '.png');
        toast('PNG indirildi');
      }, 'image/png');
    } catch {
      toast('PNG oluşturulamadı.');
    }
  }

  /* Video: tüm sayfalar sırayla, aralarında kitap sayfası çevirme geçişi.
     Toplam süre en fazla 60 sn. Videolar sayfası açıkken kendi döngüsünde oynar. */
  async function exportVideo(j) {
    if (exporting) return;
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
      return toast('Bu tarayıcı video kaydını desteklemiyor.');
    }
    const mime = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      .find(t => MediaRecorder.isTypeSupported(t));
    if (!mime) return toast('Bu tarayıcı video formatı üretemiyor.');

    exporting = true;
    showBusy(true, 0);
    try {
      const W = 720, k = W / PW, H = Math.round(PH * k);
      const sheets = j.sheets;
      toast('Video hazırlanıyor, lütfen bekleyin…', 4000);

      // Varlıklar ve sayfa başına videolar
      const sheetAssets = [], sheetVideos = [];
      for (const s of sheets) {
        sheetAssets.push(await prepareAssets(s));
        const vm = new Map();
        for (const e of s.elements) {
          if (e.kind !== 'video') continue;
          const url = await blobUrl(e.blobId);
          if (!url) continue;
          const v = document.createElement('video');
          v.src = url;
          v.muted = true;
          v.loop = true;
          v.playsInline = true;
          await new Promise(res => { v.onloadeddata = res; v.onerror = res; v.load(); });
          vm.set(e.id, v);
        }
        sheetVideos.push(vm);
      }

      // Zaman çizelgesi: sayfa bekleme süreleri + çevirme geçişleri, toplam <= 60 sn
      const holds = sheets.map((s, i) => {
        const vids = [...sheetVideos[i].values()];
        if (!vids.length) return 4;
        const m = Math.max(...vids.map(v => Number.isFinite(v.duration) ? v.duration : 3));
        return Math.min(30, Math.max(3, m));
      });
      const turnsTotal = Math.max(0, sheets.length - 1) * TURN_SEC;
      const holdSum = holds.reduce((a, b) => a + b, 0);
      if (holdSum + turnsTotal > MAX_VIDEO_SEC) {
        const f = (MAX_VIDEO_SEC - turnsTotal) / holdSum;
        holds.forEach((h, i) => { holds[i] = h * f; });
      }

      const segs = [];
      let t = 0;
      sheets.forEach((_, i) => {
        segs.push({ type: 'hold', i, start: t, end: t + holds[i] });
        t += holds[i];
        if (i < sheets.length - 1) {
          segs.push({ type: 'turn', from: i, to: i + 1, start: t, end: t + TURN_SEC });
          t += TURN_SEC;
        }
      });
      const total = t;
      toast(`Video hazırlanıyor (${Math.round(total)} sn)…`, 3000);

      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      const tmpA = document.createElement('canvas');
      const tmpB = document.createElement('canvas');
      tmpA.width = tmpB.width = W;
      tmpA.height = tmpB.height = H;
      const ctxA = tmpA.getContext('2d'), ctxB = tmpB.getContext('2d');

      const stream = canvas.captureStream(30);
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4000000 });
      const chunks = [];
      rec.ondataavailable = ev => { if (ev.data.size) chunks.push(ev.data); };
      const stopped = new Promise(res => { rec.onstop = res; });
      rec.start(250);

      let activeSheet = -1;
      const playSheet = i => {
        if (activeSheet === i) return;
        activeSheet = i;
        sheetVideos.forEach((vm, idx) => vm.forEach(v => {
          if (idx === i) { v.currentTime = 0; v.play().catch(() => {}); }
          else v.pause();
        }));
      };

      await new Promise(done => {
        const t0 = performance.now();
        const tick = () => {
          const now = (performance.now() - t0) / 1000;
          showBusy(true, (now / total) * 100);
          if (now >= total) return done();
          const seg = segs.find(sg => now >= sg.start && now < sg.end) || segs[segs.length - 1];
          if (seg.type === 'hold') {
            playSheet(seg.i);
            drawPage(ctx, sheets[seg.i], k, sheetAssets[seg.i], sheetVideos[seg.i]);
          } else {
            drawPage(ctxA, sheets[seg.from], k, sheetAssets[seg.from], sheetVideos[seg.from]);
            drawPage(ctxB, sheets[seg.to], k, sheetAssets[seg.to], sheetVideos[seg.to]);
            drawTurn(ctx, tmpA, tmpB, (now - seg.start) / TURN_SEC);
          }
          requestAnimationFrame(tick);
        };
        tick();
      });

      rec.stop();
      sheetVideos.forEach(vm => vm.forEach(v => v.pause()));
      await stopped;
      const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
      download(new Blob(chunks, { type: mime.split(';')[0] }), `${fileName(j.title)}.${ext}`);
      toast('Video indirildi');
    } catch {
      toast('Video oluşturulamadı.');
    } finally {
      showBusy(false);
      exporting = false;
    }
  }

  /* ---------- Yaşam döngüsü ---------- */
  window.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      clearTimeout(saveTimer);
      persist();
    } else if (hiddenAt && Date.now() - hiddenAt > 5 * 60 * 1000) {
      hiddenAt = 0;
      lockApp();
    }
  });

  /* ---------- Başlat ---------- */
  document.documentElement.style.setProperty('--noise', `url("${NOISE_SRC}")`);
  profile = readJSON(KEYS.profile, null);
  journals = migrate(readJSON(KEYS.pages, null) ?? readJSON(LEGACY_PAGES, []));
  customStickers = readJSON(KEYS.stickers, []);
  applyTheme();
  buildDrawBar();

  renderAvatarBtn();
  if (!profile) {
    showAuth('create');
  } else if (!profile.pw) {
    showAuth('migrate');          // eski sürümden gelen hesap: şifre belirlemeli
  } else {
    locked = true;
    showAuth('unlock');
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* çevrimdışı önbellek isteğe bağlı */ });
  }
})();