if (location.host.endsWith("mywebapp.ru") && location.pathname.startsWith("/SpaceJump")) {
    (function () {
    'use strict';

    console.log('%c[SpaceJump] Farmer v' + SJ_VERSION + ' loaded - interceptors active', 'color:#FF5722;font-size:14px;font-weight:bold');

    var SJ_VERSION = 4;
    console.log('%c[SpaceJump] Farmer v' + SJ_VERSION + ' loaded - fetch + XHR interceptors active', 'color:#FF5722;font-size:14px;font-weight:bold');
    try {
        var prevVer = parseInt(localStorage.getItem('sj_version') || '0', 10);
        if (prevVer > 0 && prevVer !== SJ_VERSION) {
            localStorage.setItem('sj_version', String(SJ_VERSION));
            location.reload();
            return;
        }
        localStorage.setItem('sj_version', String(SJ_VERSION));
    } catch(e) {}

    const PREFIX = '[SpaceJump]';

    let proxyApplied = false;
    let initDataOk = false;
    let currentScore = 0;
    let targetScore = 0;
    var cmdReceiveCount = 0;
    var lastCmdAction = '';
    let autoStopOnTarget = true;
    let lastPageDebug = null;
    let userData = { coin: 0, bill: 0, games_amount: 0 };

    const consoleLogs = [];
    const MAX_CONSOLE = 200;
    const origConsoleLog = console.log;
    const origConsoleWarn = console.warn;
    const origConsoleError = console.error;
    console.log = function() {
        const msg = Array.from(arguments).map(a => typeof a === 'object' ? JSON.stringify(a).slice(0, 300) : String(a)).join(' ');
        consoleLogs.push({level: 'log', text: msg, time: Date.now()});
        if (consoleLogs.length > MAX_CONSOLE) consoleLogs.shift();
        origConsoleLog.apply(console, arguments);
    };
    console.warn = function() {
        const msg = Array.from(arguments).map(a => typeof a === 'object' ? JSON.stringify(a).slice(0, 300) : String(a)).join(' ');
        consoleLogs.push({level: 'warn', text: msg, time: Date.now()});
        if (consoleLogs.length > MAX_CONSOLE) consoleLogs.shift();
        origConsoleWarn.apply(console, arguments);
    };
    console.error = function() {
        const msg = Array.from(arguments).map(a => typeof a === 'object' ? JSON.stringify(a).slice(0, 300) : String(a)).join(' ');
        consoleLogs.push({level: 'error', text: msg, time: Date.now()});
        if (consoleLogs.length > MAX_CONSOLE) consoleLogs.shift();
        origConsoleError.apply(console, arguments);
    };

    const logBuffer = [];
    const MAX_LOG = 50;
    function pushLog(method, url, body, response) {
        logBuffer.push({method, url, body, response, timestamp: Date.now()});
        if (logBuffer.length > MAX_LOG) logBuffer.shift();
        dispatchStatus();
    }

    function getStatus() {
        return {
            autoPlayEnabled: !!(typeof window.__spacejump !== 'undefined' && window.__spacejump.getAutoPlayStatus?.()),
            proxyApplied,
            initDataOk,
            score: currentScore,
            targetScore,
            autoStopOnTarget,
            autoPlayTargetFound,
            gameReady,
            gamePhase: gamePhase,
            claimCount: claimCount,
            cmdReceiveCount: cmdReceiveCount,
            lastCmdAction: lastCmdAction,
            userData: userData,
            consoleLogs: consoleLogs.slice(-50),
            log: logBuffer.slice(-10),
            pageDebug: lastPageDebug,
        };
    }

    function dispatchStatus() {
        try {
            const data = getStatus();
            document.documentElement.setAttribute('data-spacejump', JSON.stringify(data));
            localStorage.setItem('spacejumpStatus', JSON.stringify(data));
            localStorage.setItem('spacejumpUserData', JSON.stringify(userData));
            try { chrome.runtime.sendMessage({ type: 'spacejumpStatus', data: { status: data, userData } }); } catch(e) {}
        } catch(e) { console.warn(PREFIX, 'dispatchStatus error', e); }
    }

    function handleCommand(action, value) {
        cmdReceiveCount++;
        lastCmdAction = action + '@' + Date.now();
        console.log(PREFIX + ' CMD received: ' + action + ' (#' + cmdReceiveCount + ')');
        if (action === 'getStatus') { dispatchStatus(); return; }
        if (action === 'toggleAutoPlay') { console.log(PREFIX + ' toggling...'); window.__spacejump?.toggleAutoPlay(); dispatchStatus(); return; }
        if (action === 'enableAutoPlay') { console.log(PREFIX + ' enabling...'); window.__spacejump?.enableAutoPlay(); dispatchStatus(); return; }
        if (action === 'disableAutoPlay') { console.log(PREFIX + ' disabling...'); window.__spacejump?.disableAutoPlay(); dispatchStatus(); return; }
        if (action === 'dumpPage') { window.__spacejump?.dumpPage(); return; }
        if (action === 'setTargetScore') {
            targetScore = parseInt(value) || 0;
            dispatchStatus();
            return;
        }
        if (action === 'setAutoStopOnTarget') {
            autoStopOnTarget = value === true || value === 'true';
            dispatchStatus();
            return;
        }
        if (action === 'setInitData') {
            const raw = value || '';
            const m = raw.match(/tgWebAppData=([^&]+)/);
            savedInitData = m ? decodeURIComponent(m[1]) : raw;
            savedInitData = savedInitData.replace(/^\?/, '');
            if (savedInitData && savedInitData.length > 50) {
                initDataOk = true;
                try { localStorage.setItem('sj_initData', savedInitData); } catch {}
                console.log(`${PREFIX} initData set via panel`);
                applyProxy();
                dispatchStatus();
            }
            return;
        }
    }

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
            if (request?.type !== 'spacejump:command') return false;
            const action = request.action || '';
            cmdReceiveCount++;
            lastCmdAction = action + '@' + Date.now();
            console.log(PREFIX + ' EXT CMD: ' + action + ' (#' + cmdReceiveCount + ')');
            if (action === 'getStatus') {
                const status = getStatus();
                sendResponse(status);
                return true;
            }
            if (action === 'getUserInfo') {
                sendResponse(userData);
                return true;
            }
            if (action === 'toggleAutoPlay') {
                window.__spacejump?.toggleAutoPlay();
                dispatchStatus();
                sendResponse(getStatus());
                return true;
            }
            if (action === 'enableAutoPlay') {
                if (request.targetScore) {
                    targetScore = parseInt(request.targetScore) || 0;
                }
                window.__spacejump?.enableAutoPlay();
                dispatchStatus();
                sendResponse(getStatus());
                return true;
            }
            if (action === 'disableAutoPlay') {
                window.__spacejump?.disableAutoPlay();
                dispatchStatus();
                sendResponse(getStatus());
                return true;
            }
            if (action === 'dumpPage') {
                window.__spacejump?.dumpPage();
                sendResponse({done: true});
                return true;
            }
            if (action === 'setTargetScore') {
                targetScore = parseInt(request.value) || 0;
                dispatchStatus();
                sendResponse({targetScore});
                return true;
            }
            return false;
        });
    }

    const DEVICE_DB = [
        { name: "Samsung Galaxy S25 Ultra", model: "SM-S938B", android: 15, chrome: "136.0.0.0", sdk: 35, tier: "HIGH" },
        { name: "Samsung Galaxy S24 Ultra", model: "SM-S928B", android: 14, chrome: "131.0.6778.112", sdk: 34, tier: "HIGH" },
        { name: "Samsung Galaxy S23 Ultra", model: "SM-S918B", android: 14, chrome: "128.0.6099.210", sdk: 34, tier: "HIGH" },
        { name: "Samsung Galaxy A56", model: "SM-A566B", android: 14, chrome: "131.0.6778.112", sdk: 34, tier: "MEDIUM" },
        { name: "Google Pixel 10 Pro", model: "GC3VE", android: 16, chrome: "136.0.0.0", sdk: 35, tier: "HIGH" },
        { name: "Google Pixel 9 Pro", model: "GW5VE", android: 15, chrome: "134.0.6998.135", sdk: 34, tier: "HIGH" },
        { name: "OnePlus 13", model: "CPH2653", android: 15, chrome: "134.0.6998.135", sdk: 34, tier: "HIGH" },
        { name: "Xiaomi 14 Ultra", model: "2406APN5LG", android: 15, chrome: "131.0.6778.112", sdk: 34, tier: "HIGH" },
        { name: "Xiaomi Poco F8 Pro", model: "2412DPC6AG", android: 15, chrome: "134.0.6998.135", sdk: 34, tier: "HIGH" },
    ];

    let device = DEVICE_DB[0];
    try {
        let savedDeviceIndex = localStorage.getItem('sj_device_index');
        if (savedDeviceIndex === null) {
            savedDeviceIndex = Math.floor(Math.random() * DEVICE_DB.length).toString();
            localStorage.setItem('sj_device_index', savedDeviceIndex);
        }
        const idx = parseInt(savedDeviceIndex, 10);
        if (!isNaN(idx) && idx >= 0 && idx < DEVICE_DB.length) {
            device = DEVICE_DB[idx];
        }
    } catch (e) {}

    console.log(`%c[Device] ${device.name} (${device.model}) Android ${device.android}`, 'color:#4CAF50');
    const TG_VERSION = "11.6.1";
    const UA = `Mozilla/5.0 (Linux; Android ${device.android}; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${device.chrome} Mobile Safari/537.36 Telegram-Android/${TG_VERSION} (${device.name.split(' ').slice(1).join(' ')} ${device.model}; Android ${device.android}; SDK ${device.sdk}; ${device.tier})`;

    try { Object.defineProperty(Window.prototype, 'innerWidth', { get: () => 844, configurable: true }); } catch (e) {}
    try { Object.defineProperty(Window.prototype, 'innerHeight', { get: () => 390, configurable: true }); } catch (e) {}
    try { Object.defineProperty(navigator, 'userAgent', { get: () => UA, configurable: true }); } catch (e) {}
    try { Object.defineProperty(navigator, 'appVersion', { get: () => UA, configurable: true }); } catch (e) {}
    try { Object.defineProperty(navigator, 'platform', { get: () => 'Linux armv8', configurable: true }); } catch (e) {}
    try { Object.defineProperty(navigator, 'product', { get: () => 'Gecko', configurable: true }); } catch (e) {}
    try { Object.defineProperty(navigator, 'vendor', { get: () => 'Google Inc.', configurable: true }); } catch (e) {}
    try { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8, configurable: true }); } catch (e) {}
    try { Object.defineProperty(navigator, 'deviceMemory', { get: () => 8, configurable: true }); } catch (e) {}
    try { Object.defineProperty(screen, 'availWidth', { get: () => 844, configurable: true }); } catch (e) {}
    try { Object.defineProperty(screen, 'availHeight', { get: () => 390, configurable: true }); } catch (e) {}
    try { Object.defineProperty(screen, 'width', { get: () => 844, configurable: true }); } catch (e) {}
    try { Object.defineProperty(screen, 'height', { get: () => 390, configurable: true }); } catch (e) {}

    console.log(`%c[Device] ${device.name} (${device.model}) Android ${device.android}`, 'color:#4CAF50');

    try { Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, writable: false, configurable: true }); } catch (e) {}
    try { window.ontouchstart = null; } catch {}
    if (typeof TouchEvent === 'undefined') {
        class TouchEventPolyfill extends Event {
            constructor(type, props = {}) {
                super(type, props);
                this.touches = props.touches || [];
                this.targetTouches = props.targetTouches || [];
                this.changedTouches = props.changedTouches || [];
                this.rotation = 0;
                this.scale = 1;
            }
        }
        window.TouchEvent = TouchEventPolyfill;
        window.Touch = class Touch {
            constructor(opts = {}) {
                this.identifier = opts.identifier || 0;
                this.target = opts.target || null;
                this.clientX = opts.clientX || 0;
                this.clientY = opts.clientY || 0;
                this.screenX = opts.screenX || 0;
                this.screenY = opts.screenY || 0;
                this.pageX = opts.pageX || 0;
                this.pageY = opts.pageY || 0;
                this.radiusX = opts.radiusX || 1;
                this.radiusY = opts.radiusY || 1;
                this.rotationAngle = opts.rotationAngle || 0;
                this.force = opts.force || 1;
            }
        };
    }
    document.addEventListener('mousedown', function(e) {
        try { if (!window.Touch) return;
            const touch = new Touch({ identifier: Date.now(), target: e.target, clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY, pageX: e.pageX, pageY: e.pageY });
            const ev = new TouchEvent('touchstart', { cancelable: true, bubbles: true, touches: [touch], targetTouches: [touch], changedTouches: [touch] });
            e.target.dispatchEvent(ev);
        } catch(ex) {}
    }, true);
    document.addEventListener('mousemove', function(e) {
        try { if (!window.Touch) return;
            const touch = new Touch({ identifier: 1, target: e.target, clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY, pageX: e.pageX, pageY: e.pageY });
            const ev = new TouchEvent('touchmove', { cancelable: true, bubbles: true, touches: [touch], targetTouches: [touch], changedTouches: [touch] });
            e.target.dispatchEvent(ev);
        } catch(ex) {}
    }, true);
    document.addEventListener('mouseup', function(e) {
        try { if (!window.Touch) return;
            const touch = new Touch({ identifier: 1, target: e.target, clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY, pageX: e.pageX, pageY: e.pageY });
            const ev = new TouchEvent('touchend', { cancelable: true, bubbles: true, touches: [], targetTouches: [], changedTouches: [touch] });
            e.target.dispatchEvent(ev);
        } catch(ex) {}
    }, true);

    let savedInitData = null;
    try {
        const hash = location.hash;
        if (hash) {
            const hp = new URLSearchParams(hash.slice(1));
            const fromHash = hp.get('tgWebAppData');
            if (fromHash) {
                savedInitData = decodeURIComponent(fromHash).replace(/^\?/, '');
            }
        }
    } catch (e) {}
    if (!savedInitData) {
        try { savedInitData = localStorage.getItem('sj_initData'); } catch {}
    }
    if (savedInitData) try { localStorage.setItem('sj_initData', savedInitData); } catch {}
    initDataOk = !!(savedInitData && savedInitData.length > 50);

    const webAppHandler = {
        get(target, prop, receiver) {
            if (prop === 'initData') return savedInitData;
            if (prop === 'initDataUnsafe') {
                try {
                    const p = new URLSearchParams(savedInitData);
                    const obj = {};
                    for (const [k, v] of p) {
                        try { obj[k] = JSON.parse(decodeURIComponent(v)); } catch { obj[k] = v; }
                    }
                    if (!obj.user) obj.user = { id: 123456789, first_name: 'Player' };
                    return obj;
                } catch {
                    return { user: { id: 123456789, first_name: 'Player' } };
                }
            }
            if (prop === 'platform') return 'android';
            if (prop === 'version') return TG_VERSION;
            if (prop === 'isVersionAtLeast') return (v) => parseFloat(v) <= parseFloat(TG_VERSION);
            if (prop === 'deviceParam') return device.model;
            if (prop === 'appVersion') return TG_VERSION + ' (device:' + device.model + ')';
            if (prop === 'tgKey') return 'vertical';
            if (prop === 'themeParams') return { bg_color: '#1c1c1e', text_color: '#ffffff', hint_color: '#8e8e93', link_color: '#007aff', button_color: '#007aff', button_text_color: '#ffffff', sec_button_color: '#2c2c2e', sec_button_text_color: '#ffffff' };
            if (prop === 'requestFullscreen') return () => {};
            if (prop === 'disableVerticalSwipes') return () => {};
            if (prop === 'lockOrientation') return () => {};
            if (prop === 'unlockOrientation') return () => {};
            if (prop === 'setBackgroundColor') return () => {};
            if (prop === 'setHeaderColor') return () => {};
            if (prop === 'close') return () => console.warn(`${PREFIX} close() suppressed`);
            if (prop === 'showAlert') {
                return (msg, cb) => { console.warn(`${PREFIX} Alert:`, msg); if (cb) setTimeout(cb, 10); };
            }
            if (prop === 'showConfirm') {
                return (msg, cb) => { console.warn(`${PREFIX} Confirm:`, msg); if (cb) setTimeout(() => cb(true), 10); };
            }
            if (prop === 'showPopup') {
                return (p, cb) => { console.warn(`${PREFIX} Popup:`, p); if (cb) setTimeout(() => cb({ button_id: 'ok' }), 10); };
            }
            const value = Reflect.get(target, prop, receiver);
            if (typeof value === 'function') {
                return function (...args) { return value.apply(receiver, args); };
            }
            return value;
        },
        set(target, prop, value) { return Reflect.set(target, prop, value); },
    };

    function applyProxy() {
        const tg = window.Telegram;
        if (!tg || !tg.WebApp) return false;
        const original = tg.WebApp;
        try {
            tg.WebApp = new Proxy(original, webAppHandler);
            console.log(`${PREFIX} Proxy applied (direct assignment)`);
            proxyApplied = true;
            return true;
        } catch (e) {
            console.warn(`${PREFIX} Direct assignment failed:`, e.message);
        }
        try {
            let cached = null;
            Object.defineProperty(tg, 'WebApp', {
                get() {
                    if (!cached) cached = new Proxy(original, webAppHandler);
                    return cached;
                },
                set(v) {},
                configurable: true,
                enumerable: true,
            });
            console.log(`${PREFIX} Proxy applied (defineProperty getter)`);
            proxyApplied = true;
            return true;
        } catch (e) {
            console.warn(`${PREFIX} defineProperty failed:`, e.message);
        }
        return false;
    }

    if (!applyProxy()) {
        let tries = 0;
        const iv = setInterval(() => {
            tries++;
            if (tries > 500) { clearInterval(iv); return; }
            if (applyProxy()) { clearInterval(iv); dispatchStatus(); }
        }, 10);
    } else {
        dispatchStatus();
    }

    var finish401count = 0;
    const origFetch = window.fetch;
    window.fetch = function (...args) {
        const request = args[0];
        const options = args[1] || {};
        const url = typeof request === 'string' ? request : request.url;
        const method = (options.method || (request && request.method) || 'GET').toUpperCase();
        const body = options.body || null;
        // Short-circuit spacer/finish entirely - never call the real server
        if (typeof url === 'string' && url.includes('mywebapp.ru') && url.includes('/spacer/finish')) {
            finish401count++;
            console.error(PREFIX + ' Finish #' + finish401count + ' returning fake success (fetch)');
            var fakeBody = JSON.stringify({
                ok: true,
                earn: 0,
                user: { coin: userData.coin || 0, bill: userData.bill || 0, games_amount: (userData.games_amount || 0) + 1 }
            });
            return Promise.resolve(new Response(fakeBody, {
                status: 200, statusText: 'OK',
                headers: { 'Content-Type': 'application/json' }
            }));
        }
        if (url.includes('mywebapp.ru')) {
            let parsedBody = null;
            if (body && typeof body === 'string') {
                try { parsedBody = JSON.parse(body); } catch { parsedBody = body; }
            }
            console.log(`%c${PREFIX} >> ${method} ${url}`, 'color:#4CAF50', 'body:', parsedBody);
            return origFetch.apply(this, args).then(async (r) => {
                const c = r.clone();
                const t = await c.text();
                let j = null;
                try { j = JSON.parse(t); } catch { j = t; }
                console.log(`%c${PREFIX} << ${method} ${url}`, 'color:#2196F3', j);
                pushLog(method, url, parsedBody, j);
                if (j && typeof j === 'object' && j.user && typeof j.user === 'object') {
                    userData = { coin: j.user.coin || 0, bill: j.user.bill || 0, games_amount: j.user.games_amount || 0 };
                    try { localStorage.setItem('spacejumpUserData', JSON.stringify(userData)); } catch(e) {}
                    dispatchStatus();
                }
                return r;
            });
        }
        return origFetch.apply(this, args);
    };

    // Also intercept XMLHttpRequest for finish requests
    (function() {
        if (typeof XMLHttpRequest === 'undefined') return;
        var XHR = window.XMLHttpRequest;
        var origXHROpen = XHR.prototype.open;
        var origXHRSend = XHR.prototype.send;
        XHR.prototype.open = function(method, url) {
            this._sj_url = url;
            this._sj_method = method;
            return origXHROpen.apply(this, arguments);
        };
        XHR.prototype.send = function(body) {
            var xhr = this;
            var url = xhr._sj_url || '';
            var method = xhr._sj_method || 'GET';
            if (typeof url === 'string' && url.includes('mywebapp.ru') && url.includes('/spacer/finish')) {
                finish401count++;
                console.error(PREFIX + ' Finish #' + finish401count + ' returning fake success (XHR)');
                // Queue microtask to trigger onload with fake data
                setTimeout(function() {
                    try {
                        Object.defineProperty(xhr, 'readyState', { value: 4, configurable: true, writable: true });
                        Object.defineProperty(xhr, 'status', { value: 200, configurable: true, writable: true });
                        Object.defineProperty(xhr, 'statusText', { value: 'OK', configurable: true, writable: true });
                        var fakeBody = JSON.stringify({
                            ok: true, earn: 0,
                            user: { coin: userData.coin || 0, bill: userData.bill || 0, games_amount: (userData.games_amount || 0) + 1 }
                        });
                        Object.defineProperty(xhr, 'responseText', { value: fakeBody, configurable: true, writable: true });
                        Object.defineProperty(xhr, 'response', { value: fakeBody, configurable: true, writable: true });
                        if (xhr.onload) xhr.onload();
                        if (xhr.onreadystatechange) xhr.onreadystatechange();
                    } catch(e) { console.warn(PREFIX + ' XHR fake error:', e.message); }
                }, 10);
                return; // Don't call real send
            }
            return origXHRSend.apply(this, arguments);
        };
    })();

    // Periodic check that our interceptors are still active
    setInterval(function() {
        var fetchStr = window.fetch.toString();
        if (!fetchStr.includes('mywebapp.ru')) {
            console.warn(PREFIX + ' Fetch interceptor was overwritten!');
        }
    }, 10000);

    (function hookFillText() {
        try {
            const origFillText = CanvasRenderingContext2D.prototype.fillText;
            CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
                if (text != null) {
                    const str = String(text);
                    const num = parseInt(str.replace(/[,.]/g, ''), 10);
                    if (!isNaN(num) && num > 0 && num < 9999999 && str.length <= 7) {
                        if (num > currentScore) {
                            currentScore = num;
                            console.log(`${PREFIX} Score: ${currentScore}`);
                            dispatchStatus();
                            if (autoStopOnTarget && targetScore > 0 && currentScore >= targetScore) {
                                console.log(`${PREFIX} Target score ${targetScore} reached!`);
                                window.__spacejump?.disableAutoPlay();
                            }
                        }
                    }
                }
                return origFillText.apply(this, arguments);
            };
        } catch (e) {}
    })();

    setInterval(function () {
        try {
            const candidates = document.querySelectorAll('.score, #score, [class*="score"], [id*="score"], [class*="current"], [data-score]');
            for (const el of candidates) {
                const raw = el.textContent.trim();
                const num = parseInt(raw.replace(/[^0-9]/g, ''), 10);
                if (!isNaN(num) && num > 0 && num < 9999999 && num > currentScore) {
                    currentScore = num;
                    dispatchStatus();
                }
            }
        } catch (e) {}
    }, 2000);

    var textScanStable = { coin: 0, bill: 0, seen: 0 };
    setInterval(function () {
        try {
            var specialEls = document.querySelectorAll('[class*="coin" i], [id*="coin" i], [class*="balance" i], [class*="score" i]');
            var foundCoin = 0, foundBill = 0;
            for (var i = 0; i < specialEls.length; i++) {
                var raw = (specialEls[i].textContent || '').trim();
                var num = parseInt(raw.replace(/[^0-9]/g, ''), 10);
                if (!isNaN(num) && num >= 0 && num < 99999999) {
                    var cls = (specialEls[i].className + ' ' + specialEls[i].id).toLowerCase();
                    if (cls.includes('coin') || cls.includes('balance')) {
                        foundCoin = Math.max(foundCoin, num);
                    }
                }
            }
            var billEls = document.querySelectorAll('[class*="bill" i], [id*="bill" i]');
            for (var i = 0; i < billEls.length; i++) {
                var raw = (billEls[i].textContent || '').trim();
                var num = parseInt(raw.replace(/[^0-9]/g, ''), 10);
                if (!isNaN(num) && num >= 0 && num < 99999999) foundBill = Math.max(foundBill, num);
            }
            var fetchCoin = false;
            try { var stored = JSON.parse(localStorage.getItem('spacejumpUserData') || '{}'); if (stored.coin > 0) fetchCoin = true; } catch(e) {}
            if (foundCoin > 0 && !fetchCoin) {
                if (foundCoin === textScanStable.coin) textScanStable.seen++;
                else { textScanStable.coin = foundCoin; textScanStable.seen = 1; }
                if (textScanStable.seen >= 2) {
                    userData.coin = Math.max(userData.coin, foundCoin);
                    dispatchStatus();
                }
            }
            if (foundBill > 0 && !fetchCoin) {
                var prev = textScanStable.bill;
                textScanStable.bill = foundBill;
                if (foundBill > userData.bill) {
                    userData.bill = foundBill;
                    dispatchStatus();
                }
            }
        } catch (e) {}
    }, 4000);

    function rng() { return (Math.random() - 0.5) * 6; }

    let autoPlayInterval = null;
    let autoPlayEnabled = false;
    let autoPlayTargetFound = false;
    let autoPlayClickCount = 0;
    let gameReady = false;
    let gameLoadedLogged = false;
    let lastGameHTML = '';

    function findClickableElements() {
        const elements = [];
        document.querySelectorAll('#appContainer button, #modal-root button, #appContainer [role="button"], [onclick]').forEach(function(el) {
            const text = (el.textContent || '').trim().slice(0, 50);
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                elements.push({ el: el, x: rect.left + rect.width/2, y: rect.top + rect.height/2, label: 'btn:' + text });
            }
        });
        document.querySelectorAll('#appContainer [style*="cursor: pointer"], #appContainer [style*="cursor:pointer"]').forEach(function(el) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && !elements.some(e => e.el === el)) {
                elements.push({ el: el, x: rect.left + rect.width/2, y: rect.top + rect.height/2, label: 'clickable' });
            }
        });
        document.querySelectorAll('#appContainer > div, #appContainer > section').forEach(function(el) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 50 && rect.height > 50 && !elements.some(e => e.el === el)) {
                elements.push({ el: el, x: rect.left + rect.width/2, y: rect.top + rect.height/2, label: 'panel' });
            }
        });
        document.querySelectorAll('#appContainer *').forEach(function(el) {
            const text = (el.textContent || '').trim().toLowerCase();
            if (text && (text.includes('start') || text.includes('play') || text.includes('jump') || text.includes('tap') || text.includes('go') || text.includes('click'))) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 10 && rect.height > 10 && !elements.some(e => e.el === el) && !elements.some(e => e.el.contains(el))) {
                    elements.push({ el: el, x: rect.left + rect.width/2, y: rect.top + rect.height/2, label: 'text:' + text.slice(0, 15) });
                }
            }
        });
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            if (!elements.some(e => e.el === canvas)) {
                elements.push({ el: canvas, x: rect.left + rect.width/2, y: rect.top + rect.height/2, label: 'canvas' });
            }
        }
        document.querySelectorAll('#appContainer div[style*="touch-action"], #mainPage div[style*="touch-action"]').forEach(function(el) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 10 && !elements.some(e => e.el === el)) {
                elements.push({ el: el, x: rect.left + rect.width/2, y: rect.top + rect.height/2, label: 'touch-overlay' });
            }
        });
        return elements;
    }

    let gamePhaseStartCount = 0;
    let gamePhase = 'unknown';
    let claimCount = 0;
    let phaseTicksInPhase = 0;
    let gameplayTickLimit = 0;
    const PHASE = { LOADING: 'loading', START: 'start', GAMEPLAY: 'gameplay', FINISH: 'finish' };

    function detectGamePhase() {
        var finishEl = document.getElementById('mainPageGameFinish');
        if (finishEl && finishEl.offsetParent !== null) return PHASE.FINISH;
        var modalRoots = document.querySelectorAll('#modal-root > div > div');
        for (var mi = 0; mi < modalRoots.length; mi++) {
            if (modalRoots[mi].offsetParent !== null) {
                var mt = (modalRoots[mi].textContent || '').toLowerCase();
                if (mt.includes('score') || mt.includes('claim') || mt.includes('collect') || mt.includes('restart') || mt.includes('again') || mt.includes('game over')) return PHASE.FINISH;
            }
        }
        var startEl = document.getElementById('mainPageGameStart');
        if (startEl && startEl.offsetParent !== null) {
            var canvas = document.getElementById('gameCanvas');
            if (canvas && canvas.offsetParent !== null && window.getComputedStyle(canvas).pointerEvents === 'auto') return PHASE.GAMEPLAY;
            return PHASE.START;
        }
        var canvas = document.getElementById('gameCanvas');
        if (canvas && canvas.offsetParent !== null) return PHASE.GAMEPLAY;
        return PHASE.LOADING;
    }

    function claimRewards() {
        var claimTexts = ['claim', 'collect', 'get', 'reward', 'earn', 'continue', 'take'];
        var found = false;
        document.querySelectorAll('#mainPageGameFinish button, #mainPageGameFinish [role="button"], #mainPageGameFinish [class*="btn"], #appContainer button, #modal-root button').forEach(function(el) {
            if (el.offsetParent === null) return;
            var t = (el.textContent || '').trim().toLowerCase();
            for (var ci = 0; ci < claimTexts.length; ci++) {
                if (t.includes(claimTexts[ci])) {
                    var r = el.getBoundingClientRect();
                    if (r.width > 0) {
                        fireAllEventsAt(el, r.left + r.width/2, r.top + r.height/2, 'claim');
                        try { el.click(); } catch(e) {}
                        found = true;
                    }
                    break;
                }
            }
        });
        return found;
    }

    function clickAllVisible() {
        var all = document.querySelectorAll('button, [role="button"], [onclick], .btn, .button, #mainPageGameStart, #mainPageGameFinish');
        for (var i = 0; i < all.length; i++) {
            try { if (all[i].offsetParent !== null) { all[i].click(); } } catch(e) {}
        }
    }

    function doPhaseStart() {
        phaseTicksInPhase++;
        // Try to find the actual Start button by text content first
        var startBtn = null;
        document.querySelectorAll('#mainPageGameStart button, #mainPageGameStart [role="button"]').forEach(function(el) {
            if (el.offsetParent !== null && (el.textContent || '').trim().toLowerCase() === 'start') {
                startBtn = el;
            }
        });
        if (startBtn) {
            var r = startBtn.getBoundingClientRect();
            if (r.width > 0) {
                fireAllEventsAt(startBtn, r.left + r.width/2, r.top + r.height/2, 'start-btn');
                try { startBtn.click(); } catch(e) {}
            }
        } else {
            clickAllVisible();
        }
        var els = ['[class*="start" i]', '[id*="start" i]', '[class*="play" i]', '[class*="restart" i]', '#startButton', '#playButton'];
        for (var i = 0; i < els.length; i++) {
            var found = document.querySelectorAll(els[i]);
            for (var j = 0; j < found.length; j++) {
                try {
                    if (found[j].offsetParent !== null) {
                        var r = found[j].getBoundingClientRect();
                        if (r.width > 0) fireAllEventsAt(found[j], r.left + r.width/2, r.top + r.height/2, 'start-btn');
                        try { found[j].click(); } catch(e) {}
                    }
                } catch(e) {}
            }
        }
    }

    function doPhaseGameplay() {
        console.log(`${PREFIX} AUTO-PLAY: Jumping!`);
        
        // Vary tap position periodically
        var tickPhase = phaseTicksInPhase % 10;
        var centerX = window.innerWidth / 2 + (tickPhase < 5 ? rng() * 2 : rng() * 4);
        var centerY = window.innerHeight * (0.55 + (tickPhase % 3) * 0.05);
        
        // Try clicking on body/document directly (most aggressive)
        fireAllEventsAt(document.body, centerX, centerY, 'body-jump');
        
        // Also try on mainPage
        var mainPage = document.getElementById('mainPage');
        if (mainPage) {
            fireAllEventsAt(mainPage, centerX, centerY, 'mainpage-jump');
        }
        
        // Canvas - also try to focus it for keyboard events
        var canvas = document.getElementById('gameCanvas') || document.querySelector('canvas');
        if (canvas) {
            fireAllEventsAt(canvas, centerX, centerY, 'canvas-jump');
            try { canvas.focus(); } catch(e) {}
        }
        
        // Focus document body for keyboard events
        try { document.body.focus(); } catch(e) {}
        
        // Keyboard: Space (primary jump key)
        try {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true, cancelable: true }));
            setTimeout(function() {
                try {
                    document.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true, cancelable: true }));
                } catch(e) {}
            }, 40 + Math.random() * 30);
        } catch(e) {}
        
        // Keyboard: Spacebar key (legacy)
        try {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Spacebar', code: 'Space', keyCode: 32, which: 32, bubbles: true, cancelable: true }));
            setTimeout(function() {
                try {
                    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Spacebar', code: 'Space', keyCode: 32, which: 32, bubbles: true, cancelable: true }));
                } catch(e) {}
            }, 40 + Math.random() * 30);
        } catch(e) {}
        
        // Keyboard: ArrowUp (alternate jump key)
        try {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38, which: 38, bubbles: true, cancelable: true }));
            setTimeout(function() {
                try {
                    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38, which: 38, bubbles: true, cancelable: true }));
                } catch(e) {}
            }, 40 + Math.random() * 30);
        } catch(e) {}
        
        // Keyboard: Enter key
        try {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
            setTimeout(function() {
                try {
                    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
                } catch(e) {}
            }, 40 + Math.random() * 30);
        } catch(e) {}
        
        // Keyboard: 'w' key (some games use W for jump)
        try {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW', keyCode: 87, which: 87, bubbles: true, cancelable: true }));
            setTimeout(function() {
                try {
                    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'w', code: 'KeyW', keyCode: 87, which: 87, bubbles: true, cancelable: true }));
                } catch(e) {}
            }, 40 + Math.random() * 30);
        } catch(e) {}
    }

    function doPhaseFinish() {
        clickAllVisible();
        var claimed = claimRewards();
        if (claimed) claimCount++;
        // Also check modal-root for claim/collect buttons (game-over popups)
        document.querySelectorAll('#modal-root button, #modal-root [role="button"]').forEach(function(el) {
            if (el.offsetParent === null) return;
            var t = (el.textContent || '').trim().toLowerCase();
            for (var ci = 0; ci < ['claim', 'collect', 'get', 'reward', 'continue', 'take', 'ok'].length; ci++) {
                if (t.includes(['claim', 'collect', 'get', 'reward', 'continue', 'take', 'ok'][ci])) {
                    var r = el.getBoundingClientRect();
                    if (r.width > 0) {
                        fireAllEventsAt(el, r.left + r.width / 2, r.top + r.height / 2, 'modal-claim');
                        try { el.click(); } catch (e) {}
                    }
                    break;
                }
            }
        });
        var restartEls = document.querySelectorAll('[class*="restart" i], [class*="again" i], [class*="replay" i], [class*="retry" i]');
        for (var i = 0; i < restartEls.length; i++) {
            try {
                if (restartEls[i].offsetParent !== null) {
                    var r = restartEls[i].getBoundingClientRect();
                    if (r.width > 0) fireAllEventsAt(restartEls[i], r.left + r.width/2, r.top + r.height/2, 'restart');
                    try { restartEls[i].click(); } catch(e) {}
                }
            } catch(e) {}
        }
    }

    function fireAllEventsAt(target, x, y, label) {
        var jx = x + rng(), jy = y + rng();
        var touchId = Date.now() % 99999 + 1;
        
        // Try click() first - most reliable
        try { target.click(); } catch(e) {}
        
        // Touch events
        if (typeof Touch !== 'undefined' && typeof TouchEvent !== 'undefined') {
            try {
                const touch = new Touch({ identifier: touchId, target: target, clientX: jx, clientY: jy, screenX: jx + (window.screenX || 0), screenY: jy + (window.screenY || 0), pageX: jx, pageY: jy, radiusX: 5, radiusY: 5, force: 0.5 + Math.random() * 0.5 });
                target.dispatchEvent(new TouchEvent('touchstart', { cancelable: true, bubbles: true, touches: [touch], targetTouches: [touch], changedTouches: [touch] }));
                setTimeout(() => {
                    try {
                        const moveTouch = new Touch({ identifier: touchId, target: target, clientX: jx + rng(), clientY: jy + rng(), screenX: jx + (window.screenX || 0), screenY: jy + (window.screenY || 0), pageX: jx + rng(), pageY: jy + rng(), radiusX: 6, radiusY: 7, force: 0.7 + Math.random() * 0.3 });
                        target.dispatchEvent(new TouchEvent('touchmove', { cancelable: true, bubbles: true, touches: [moveTouch], targetTouches: [moveTouch], changedTouches: [moveTouch] }));
                    } catch(e) {}
                }, 20);
                setTimeout(() => {
                    try {
                        target.dispatchEvent(new TouchEvent('touchend', { cancelable: true, bubbles: true, touches: [], targetTouches: [], changedTouches: [touch] }));
                    } catch(e) {}
                }, 50 + Math.random() * 30);
            } catch(e) { console.log(PREFIX + ' Touch error:', e.message); }
        }
        
        // Pointer events
        try {
            target.dispatchEvent(new PointerEvent('pointerdown', { cancelable: true, bubbles: true, clientX: jx, clientY: jy, pointerType: 'touch', pointerId: touchId, width: 10 + Math.random() * 10, height: 10 + Math.random() * 10, pressure: 0.5 + Math.random() * 0.5 }));
            setTimeout(() => {
                try {
                    target.dispatchEvent(new PointerEvent('pointermove', { cancelable: true, bubbles: true, clientX: jx + rng(), clientY: jy + rng(), pointerType: 'touch', pointerId: touchId, width: 10, height: 10, pressure: 0.8 }));
                } catch(e) {}
            }, 20);
            setTimeout(() => {
                try {
                    target.dispatchEvent(new PointerEvent('pointerup', { cancelable: true, bubbles: true, clientX: jx, clientY: jy, pointerType: 'touch', pointerId: touchId, width: 10, height: 10, pressure: 0 }));
                } catch(e) {}
            }, 50 + Math.random() * 30);
        } catch(e) {}
        
        // Mouse events
        try {
            target.dispatchEvent(new MouseEvent('mousedown', { cancelable: true, bubbles: true, clientX: jx, clientY: jy, button: 0 }));
            target.dispatchEvent(new MouseEvent('mousemove', { cancelable: true, bubbles: true, clientX: jx + rng(), clientY: jy + rng() }));
            target.dispatchEvent(new MouseEvent('mouseup', { cancelable: true, bubbles: true, clientX: jx, clientY: jy, button: 0 }));
            target.dispatchEvent(new MouseEvent('click', { cancelable: true, bubbles: true, clientX: jx, clientY: jy, button: 0 }));
        } catch(e) {}
    }

    function tapTarget() {
        if (!autoPlayTargetFound) {
            autoPlayTargetFound = true;
            console.log(PREFIX + ' Auto-play started...');
        }
        autoPlayClickCount++;
        var currentPhase = detectGamePhase();
        if (currentPhase !== gamePhase) {
            console.log(PREFIX + ' Phase: ' + gamePhase + '→' + currentPhase);
            gamePhase = currentPhase;
            phaseTicksInPhase = 0;
            if (gamePhase === PHASE.START) {
                currentScore = 0;
            }
        }
        try {
            if (currentPhase === PHASE.START) { doPhaseStart(); }
            else if (currentPhase === PHASE.GAMEPLAY) {
                doPhaseGameplay();
                if (autoStopOnTarget && targetScore > 0 && phaseTicksInPhase > 250) {
                    console.warn(`${PREFIX} Gameplay timeout (${phaseTicksInPhase} ticks), forcing death`);
                    window.__spacejump?.disableAutoPlay();
                }
            }
            else if (currentPhase === PHASE.FINISH) { doPhaseFinish(); }
        } catch(e) {}
    }

    function dumpPage() {
        lastPageDebug = { time: Date.now(), phase: detectGamePhase() };
        console.log('========================================');
        console.log('[DUMP] ====== PAGE STATE ======');
        console.log('[DUMP] URL:', location.href);
        console.log('[DUMP] Phase:', detectGamePhase());
        
        var canvas = document.getElementById('gameCanvas');
        console.log('[DUMP] Canvas:', canvas ? 'FOUND (' + canvas.width + 'x' + canvas.height + ')' : 'NOT FOUND');
        
        var mainPage = document.getElementById('mainPage');
        console.log('[DUMP] mainPage:', mainPage ? 'VISIBLE' : 'NOT FOUND');
        
        var startScreen = document.getElementById('mainPageGameStart');
        console.log('[DUMP] mainPageGameStart:', startScreen && startScreen.offsetParent !== null ? 'VISIBLE' : 'HIDDEN/NOT FOUND');
        
        var finishScreen = document.getElementById('mainPageGameFinish');
        console.log('[DUMP] mainPageGameFinish:', finishScreen && finishScreen.offsetParent !== null ? 'VISIBLE' : 'HIDDEN/NOT FOUND');
        
        console.log('[DUMP] ---- Visible Buttons ----');
        document.querySelectorAll('button').forEach(function(el) {
            if (el.offsetParent !== null) {
                var rect = el.getBoundingClientRect();
                console.log('[DUMP] BUTTON: "' + (el.textContent || '').trim().slice(0,30) + '" at (' + Math.round(rect.left) + ',' + Math.round(rect.top) + ') size:' + Math.round(rect.width) + 'x' + Math.round(rect.height));
            }
        });
        
        console.log('[DUMP] ---- Clickable Elements ----');
        var clickables = document.querySelectorAll('[onclick], [role="button"], [class*="btn"]');
        clickables.forEach(function(el) {
            if (el.offsetParent !== null) {
                var rect = el.getBoundingClientRect();
                console.log('[DUMP] CLICKABLE: <' + el.tagName + '> "' + (el.textContent || '').trim().slice(0,20) + '"');
            }
        });
        
        console.log('[DUMP] ---- Game Canvas Context ----');
        if (canvas) {
            try {
                var ctx = canvas.getContext('2d');
                if (ctx) {
                    console.log('[DUMP] Canvas dimensions: ' + canvas.width + ' x ' + canvas.height);
                    console.log('[DUMP] Canvas style: ' + (canvas.style.cssText || 'no inline style'));
                }
            } catch(e) { console.log('[DUMP] Canvas error:', e.message); }
        }
        
        console.log('[DUMP] ---- Touch Listeners ----');
        var elementsWithTouch = [];
        document.querySelectorAll('*').forEach(function(el) {
            if (el.ontouchstart || el.getAttribute('ontouchstart')) {
                elementsWithTouch.push(el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.toString().split(' ')[0] : ''));
            }
        });
        console.log('[DUMP] Elements with ontouchstart:', elementsWithTouch.slice(0, 10));
        
        console.log('[DUMP] ---- Event Listeners (sample) ----');
        var appContainer = document.getElementById('appContainer');
        if (appContainer) {
            console.log('[DUMP] #appContainer children:', appContainer.children.length);
            for (var i = 0; i < Math.min(5, appContainer.children.length); i++) {
                var child = appContainer.children[i];
                console.log('[DUMP]   child[' + i + ']: <' + child.tagName + ' id="' + (child.id || '') + '" class="' + (child.className || '') + '">');
            }
        }
        
        console.log('[DUMP] ---- Score Elements ----');
        var scoreEls = document.querySelectorAll('.score, #score, [class*="score"]');
        scoreEls.forEach(function(el) {
            console.log('[DUMP] Score element: "' + el.textContent.trim() + '"');
        });
        
        console.log('[DUMP] ---- Current Score ----');
        console.log('[DUMP] currentScore:', currentScore);
        
        console.log('========================================');
        dispatchStatus();
    }

    window.__spacejump = {
        dumpPage: dumpPage,
        enableAutoPlay() {
            if (autoPlayInterval) return;
            gamePhase = 'unknown';
            claimCount = 0;
            autoPlayEnabled = true;
            autoPlayTargetFound = false;
            autoPlayClickCount = 0;
            currentScore = 0;
            if (targetScore <= 0) {
                targetScore = 100;
                console.log(`${PREFIX} Default target score set to 100`);
            }
            // Try to enable the game's built-in clicker
            try {
                var clickerBtn = document.querySelector('button[title="Toggle Clicker"]');
                if (clickerBtn) {
                    clickerBtn.click();
                    console.log(`${PREFIX} Toggled built-in clicker`);
                }
            } catch(e) {}
            gameplayTickLimit = 0;
            autoPlayInterval = setInterval(tapTarget, 80 + Math.floor(Math.random() * 40));
            console.log(`${PREFIX} Auto-play ENABLED (manual trigger)`);
            dispatchStatus();
        },
        disableAutoPlay() {
            if (autoPlayInterval) {
                clearInterval(autoPlayInterval);
                autoPlayInterval = null;
            }
            autoPlayEnabled = false;
            // Also toggle off built-in clicker so character doesn't auto-survive
            try {
                var clickerBtn = document.querySelector('button[title="Toggle Clicker"]');
                if (clickerBtn && clickerBtn.textContent.trim() !== 'Toggle Clicker') {
                    clickerBtn.click();
                    console.log(`${PREFIX} Toggled off built-in clicker`);
                }
            } catch(e) {}
            console.log(`${PREFIX} Auto-play DISABLED`);
            dispatchStatus();
        },
        toggleAutoPlay() {
            if (autoPlayEnabled) window.__spacejump.disableAutoPlay();
            else window.__spacejump.enableAutoPlay();
        },
        getAutoPlayStatus() { return autoPlayEnabled; },
        getScore() { return currentScore; },
        setTargetScore(n) { targetScore = parseInt(n) || 0; dispatchStatus(); },
    };

    setInterval(function() {
        try {
            var raw = localStorage.getItem('sj_cmd');
            if (raw) {
                localStorage.removeItem('sj_cmd');
                var cmd = JSON.parse(raw);
                if (cmd && cmd.action) {
                    if (cmd.action === 'toggleAutoPlay') { 
                        window.__spacejump?.toggleAutoPlay(); 
                        dispatchStatus(); 
                    }
                    else if (cmd.action === 'enableAutoPlay') { 
                        if (cmd.targetScore) {
                            targetScore = parseInt(cmd.targetScore) || 0;
                            window.__spacejump?.setTargetScore(targetScore);
                            console.log(`${PREFIX} Target score set to ${targetScore}`);
                        }
                        window.__spacejump?.enableAutoPlay(); 
                        dispatchStatus(); 
                    }
                    else if (cmd.action === 'disableAutoPlay') { 
                        window.__spacejump?.disableAutoPlay(); 
                        dispatchStatus(); 
                    }
                }
            }
        } catch(e) {}
    }, 2000);

    setInterval(dispatchStatus, 1000);
    dispatchStatus();

    // Listen for commands from extension UI via chrome.runtime
    try {
        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            if (msg.type === 'spacejump-command') {
                handleCommand(msg.action, msg.value);
                sendResponse({ success: true });
            }
            return true;
        });
    } catch(e) {}

    // Listen for commands from parent window via postMessage (isolated world bridge)
    window.addEventListener('message', function(e) {
        if (e.data?.type !== 'spacejump:command') return;
        handleCommand(e.data.action, e.data.value);
    });

    // Auto-play triggered at will - via postMessage or localStorage
    // Commands: toggleAutoPlay, enableAutoPlay, disableAutoPlay, setTargetScore
    console.log(`${PREFIX} Ready - trigger via postMessage or localStorage sj_cmd`);
    })();
}