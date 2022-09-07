// ==UserScript==
// @name         Hetzner SSH Favorite
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://konsoleh.hetzner.com/logindata.php
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hetzner.com
// @grant        GM_setClipboard
// ==/UserScript==

'use strict';

// Inject button
document.querySelector('#content>div').insertAdjacentHTML('afterbegin', '<div class="contentmenu"><a id="generatefav">Create Favorite</a></div>');

// Add event listener
document.getElementById('generatefav').addEventListener ("click", function() {

    // Grab credentials
    const password = document.querySelector('#sshpass+a').getAttribute('onclick').split("innerHTML='")[1].split("'")[0];
    const username = document.getElementById('logindata_domain_login').innerHTML;
    const hostname = document.getElementById('logindata_server_name').innerHTML;
    const port = document.getElementById('logindata_ssh_port').innerHTML;

    // Ask name for fav
    const fav = prompt('Choose name for favorite', username);

    if (!fav) {
       alert('Invalid name');
       return false;
    }

    // Create shell command string
    const str = 'echo "\\nHost '+fav+'\\n\\tHostName '+hostname+'\\n\\tUser '+username+'\\n\\tPort '+port+'" >> ~/.ssh/config && ssh-copy-id '+fav;

    // Save to clipboard
    GM_setClipboard (str);

    prompt('Command is copied to clipboard. Use password below for confirmation', password);

} , false);

