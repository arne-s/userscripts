// ==UserScript==
// @name         Hetzner TablePlus Connection
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Button that copies a TablePlus import URL for the current MySQL database (konsoleH)
// @author       Arne Stulp
// @match        *://konsoleh.hetzner.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hetzner.com
// @grant        GM_setClipboard
// @grant        GM_notification
// @run-at       document-end
// @noframes
// ==/UserScript==

(function () {
  'use strict';
  const LOG = (...a) => console.log('[TP-URL]', ...a);

  // Guard: alleen op de MySQL settings-pagina
  const usp = new URLSearchParams(location.search);
  if (!(location.pathname.endsWith('/database.php') &&
        usp.get('type') === 'mysql' &&
        (usp.get('action') || 'settings').startsWith('settings'))) {
    return;
  }

  // Mini-banner zodat je ziet dat het script actief is
  (function banner(){
    const el = document.createElement('div');
    el.textContent = 'Tampermonkey: TablePlus Connection actief';
    el.style.cssText = 'position:fixed;z-index:99999;top:0;left:0;right:0;background:#e8f0ff;border-bottom:1px solid #b9cdfa;color:#0b3d91;padding:6px 10px;font:12px/1.4 system-ui,Arial;';
    document.documentElement.appendChild(el);
    setTimeout(()=> el.remove(), 1500);
  })();

  const byId = (id) => document.getElementById(id);
  const val = (id) => (byId(id)?.value || '').trim();

  function inferEnvironment(dbName) {
    const n = (dbName || '').toLowerCase();
    if (n.includes('prod')) return { env: 'production', color: '6D0000' }; // rood
    if (n.includes('staging') || n.includes('stage')) return { env: 'staging', color: 'AA7941' }; // oranje
    if (n.includes('test') || n.includes('dev')) return { env: 'development', color: '3A6EA5' }; // blauw-ish
    return { env: 'local', color: '686B6F' }; // grijs
  }

  // 🔧 Gewijzigd: bouw querystring handmatig met encodeURIComponent, zodat spaties %20 worden (niet +)
  function buildTablePlusUrl({ db, user, password, host, name }) {
    const encUser = encodeURIComponent(user);
    const encPass = encodeURIComponent(password);
    const encDb   = encodeURIComponent(db);

    const { env, color } = inferEnvironment(db);

    const params = {
      statusColor: color,
      enviroment: env, // (bewust met “o”, TablePlus leest dit zo)
      name: name,
      tLSMode: '0',
      usePrivateKey: 'false',
      safeModeLevel: '0',
      advancedSafeModeLevel: '0',
      driverVersion: '0'
    };

    const qs = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');

    return `mysql://${encUser}:${encPass}@${host}/${encDb}?${qs}`;
  }

  function onClick(e) {
    e?.preventDefault?.();

    const db   = val('db_name');
    const user = val('db_login');
    const pass = val('db_pass_full');
    const host = val('db_server_name');

    if (!db || !user || !pass || !host) {
      alert('Kon één of meer velden niet vinden (db/user/pass/host). Is de pagina aangepast?');
      LOG({ db, user, passPresent: !!pass, host });
      return;
    }

    const defaultName = `${db} [hetzner]`;
    const name = prompt('Choose name for connection', defaultName);
    if (!name) return alert('Invalid name');

    const url = buildTablePlusUrl({ db, user, password: pass, host, name });
    GM_setClipboard(url);

    try {
      GM_notification?.({ title: 'TablePlus', text: 'URL copied to clipboard', timeout: 2500 });
    } catch (_) {}

    console.info('TablePlus URL copied:', url);
  }

  function findMysqlSettingsPart() {
    const anchor = byId('db_connection_string');
    if (!anchor) return null;
    let el = anchor;
    while (el && el !== document.body) {
      if (el.classList?.contains('contentpart')) return el;
      el = el.parentElement;
    }
    return null;
  }

  function injectButton() {
    if (byId('generateConnection')) return byId('generateConnection');

    const part = findMysqlSettingsPart();
    if (!part) return null;

    const h2 = part.querySelector('h2');

    const nav = document.createElement('ul');
    nav.className = 'nav nav-pills mb-3';

    const li = document.createElement('li');
    li.className = 'nav-item';

    const a = document.createElement('a');
    a.id = 'generateConnection';
    a.className = 'nav-link';
    a.href = '#';
    a.innerHTML = `<i class="bi bi-plus-circle me-1"></i> Create TablePlus URL`;

    li.appendChild(a);
    nav.appendChild(li);

    if (h2) h2.insertAdjacentElement('afterend', nav);
    else part.prepend(nav);

    a.addEventListener('click', onClick, false);
    LOG('Button injected');
    return a;
  }

  // Init + retries + observer
  let btn = injectButton();
  if (!btn) {
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      if (!byId('generateConnection')) btn = injectButton();
      if (btn || tries >= 12) clearInterval(iv);
    }, 250);
  }

  const content = document.querySelector('#content') || document.body;
  const mo = new MutationObserver(() => {
    if (!byId('generateConnection')) injectButton();
  });
  mo.observe(content, { childList: true, subtree: true });
})();
