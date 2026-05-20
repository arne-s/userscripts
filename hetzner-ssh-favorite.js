// ==UserScript==
// @name         Hetzner SSH Favorite (2026-05)
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Generate SSH config + ssh-copy-id command from Hetzner konsoleH
// @author       Arne Stulp
// @match        *://konsoleh.hetzner.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hetzner.com
// @grant        GM_setClipboard
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    const LOG = (...args) => console.log('[SSH Fav]', ...args);

    if (!location.pathname.endsWith('/logindata.php')) {
        return;
    }

    // ------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------

    function normalize(text) {
        return (text || '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    // ------------------------------------------------------------
    // Hostname
    // ------------------------------------------------------------

    function getHostname() {

        // Nieuwe layout: breadcrumb
        const breadcrumbLinks = Array.from(
            document.querySelectorAll('.breadcrumb a')
        );

        for (const a of breadcrumbLinks) {

            const txt = a.textContent.trim();

            if (
                txt.includes('.') &&
                (
                    txt.includes('your-server.de') ||
                    txt.includes('.nl') ||
                    txt.includes('.com') ||
                    txt.includes('.net')
                )
            ) {
                return txt;
            }
        }

        // fallback
        const bodyText = document.body.innerText;

        const match = bodyText.match(
            /\b[a-zA-Z0-9.-]+\.(your-server\.de|nl|com|net|org)\b/
        );

        return match ? match[0] : '';
    }

    // ------------------------------------------------------------
    // Generic field reader
    // ------------------------------------------------------------

    function getFieldValue(labelNames) {

        const labels = Array.from(
            document.querySelectorAll('label')
        );

        const label = labels.find(l => {

            const txt = normalize(l.textContent);

            return labelNames.some(name =>
                txt.includes(normalize(name))
            );
        });

        if (!label) {
            return '';
        }

        const container =
            label.closest('.row') ||
            label.closest('.mb-3') ||
            label.closest('.form-group') ||
            label.parentElement;

        if (!container) {
            return '';
        }

        // input values
        const inputs = Array.from(
            container.querySelectorAll('input')
        );

        for (const input of inputs) {

            const value = input.value?.trim();

            if (value) {
                return value;
            }
        }

        // plaintext fallback
        const els = Array.from(
            container.querySelectorAll('div, span')
        );

        for (const el of els) {

            const txt = el.textContent?.trim();

            if (
                txt &&
                txt !== label.textContent.trim() &&
                txt.length < 200
            ) {
                return txt;
            }
        }

        return '';
    }

    // ------------------------------------------------------------
    // Username
    // ------------------------------------------------------------

    function getUsername() {

        return (
            getFieldValue([
                'User',
                'Username',
                'Login'
            ])
        );
    }

    // ------------------------------------------------------------
    // Port
    // ------------------------------------------------------------

    function getPort() {

        const port = getFieldValue(['Port']);

        if (port) {
            return port;
        }

        const bodyText = document.body.innerText;

        const match = bodyText.match(/\b(22|2[0-9]{2,4})\b/);

        return match ? match[1] : '22';
    }

    // ------------------------------------------------------------
    // Password
    // ------------------------------------------------------------

function getPassword() {

    // --------------------------------------------------------
    // Nieuwe Hetzner layout:
    // button.ctc[data-ctc-value]
    // --------------------------------------------------------

    const ctcBtn = document.querySelector(
        '.ctc[data-ctc-value]'
    );

    if (ctcBtn) {

        const value =
            ctcBtn.getAttribute('data-ctc-value');

        if (value?.trim()) {
            return value.trim();
        }
    }

    // --------------------------------------------------------
    // Oude onclick eye variant
    // --------------------------------------------------------

    const eye = document.querySelector(
        'a[onclick*="logindata_ssh_password"]'
    );

    if (eye) {

        const onclick =
            eye.getAttribute('onclick') || '';

        const match =
            onclick.match(/value='([^']+)'/);

        if (match) {
            return match[1];
        }
    }

    // --------------------------------------------------------
    // Revealed password fallback
    // --------------------------------------------------------

    const input = document.querySelector(
        '#logindata_ssh_password'
    );

    if (
        input?.value &&
        input.value !== '***********'
    ) {
        return input.value.trim();
    }

    return '';
}


    // ------------------------------------------------------------
    // SSH command
    // ------------------------------------------------------------

    function buildCommand(alias, host, user, port) {

        const safePort =
            (port.match(/\d+/) || ['22'])[0];

        const cfg =
`Host ${alias}
    HostName ${host}
    User ${user}
    Port ${safePort}`;

        return `printf '\\n${cfg.replace(/\n/g, '\\n')}' >> ~/.ssh/config && ssh-copy-id ${alias}`;
    }

    // ------------------------------------------------------------
    // Click handler
    // ------------------------------------------------------------

    function onClick(e) {

        e.preventDefault();

        const hostname = getHostname();
        const username = getUsername();
        const port = getPort();
        const password = getPassword();

        LOG({
            hostname,
            username,
            port,
            password
        });

        if (!hostname || !username) {

            alert(
                'Kon hostname of username niet detecteren.'
            );

            return;
        }

        const alias = prompt(
            'Naam voor SSH alias:',
            username
        );

        if (!alias) {
            return;
        }

        const command = buildCommand(
            alias,
            hostname,
            username,
            port
        );

        GM_setClipboard(command);

        if (password) {

            prompt(
                'Command gekopieerd.\nWachtwoord voor ssh-copy-id:',
                password
            );

        } else {

            alert(
                'Command gekopieerd naar clipboard.'
            );
        }
    }

    // ------------------------------------------------------------
    // Inject button
    // ------------------------------------------------------------

    function injectButton() {

        if (document.getElementById('generatefav')) {
            return;
        }

        const headers = Array.from(
            document.querySelectorAll(
                'h1,h2,h3,h4,.card-title'
            )
        );

        const sshHeader = headers.find(h =>
            normalize(h.textContent) === 'ssh login'
        );

        if (!sshHeader) {
            LOG('SSH header not found');
            return;
        }

        const btn = document.createElement('button');

        btn.id = 'generatefav';
        btn.type = 'button';

        btn.className = 'btn btn-primary btn-sm';

        btn.style.margin = '12px 0';

        btn.innerHTML = `
            <i class="bi bi-plus-circle me-1"></i>
            Create Favorite
        `;

        btn.addEventListener('click', onClick);

        sshHeader.insertAdjacentElement('afterend', btn);

        LOG('Button injected');
    }

    // ------------------------------------------------------------
    // Init
    // ------------------------------------------------------------

    injectButton();

    const observer = new MutationObserver(() => {
        injectButton();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
