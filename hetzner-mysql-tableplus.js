// ==UserScript==
// @name         Hetzner TablePlus Connection
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Created a button that copies an URL for importing MySQL connections into TablePlus
// @author       Arne Stulp
// @match        https://konsoleh.hetzner.com/database.php?type=mysql&action=settings*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hetzner.com
// @grant        GM_setClipboard
// ==/UserScript==

'use strict';

// Inject button
document.querySelector('#content .contentpart')
    .insertAdjacentHTML('afterbegin','<div class="contentmenu"><a id="generateConnection">Create TablePlus URL</a></div>');

// Add event listener
document.getElementById('generateConnection').addEventListener ("click", function() {

    // Grab credentials
    const connection = document.getElementById('connection_string').innerHTML.split(' ');
    const db = connection[10];
    const user = connection[12];
    const password = connection[13].split('-p')[1];
    const hostname = connection[15];

    let statusColor = '007F3D'; // green
    let environment = 'local';

    if (db.indexOf('staging') > -1) {
        statusColor = 'AA7941'; // orange
        environment = 'staging';
    }

    if (db.indexOf('prod') > -1) {
        statusColor = '6D0000'; // red
        environment = 'production';
    }

    // Ask name for fav
    const name = prompt('Choose name for connection', db + ' [hetzner]');

    if (name.length === 0) {
        alert('Invalid name');
        return false;
    }

    // Create shell command string
    const str = 'mysql://'+user
    +':'+password+'@'+hostname+'/'
    +db+'?statusColor='+statusColor
    +'&enviroment='+environment+'&name='+encodeURIComponent(name)
    +'&tLSMode=0&usePrivateKey=false&safeModeLevel=0&advancedSafeModeLevel=0&driverVersion=0';

    // Save to clipboard
    GM_setClipboard (str);

} , false);

