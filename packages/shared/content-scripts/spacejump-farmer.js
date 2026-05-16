if (location.host === "mywebapp.ru" && location.pathname.startsWith("/SpaceJump")) {
    (function () {
    'use strict';

    var SJ_VERSION = 4;
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
            consoleLogs: consoleLogs.slice(-50),
            log: logBuffer.slice(-10),
            pageDebug: lastPageDebug,
        };
    }

    function dispatchStatus() {
        try {
            const data = getStatus();
            document.documentElement.setAttribute('data-spacejump', JSON.stringify(data));
        } catch(e) { console.warn(PREFIX, 'dispatchStatus error', e); }
    }

    window.addEventListener('message', function(e) {
        if (e.source !== window || e.data?.type !== 'spacejump:command') return;
        const action = e.data.action;
        cmdReceiveCount++;
        lastCmdAction = action + '@' + Date.now();
        console.log(PREFIX + ' CMD received: ' + action + ' (#' + cmdReceiveCount + ')');
        if (action === 'getStatus') { dispatchStatus(); return; }
        if (action === 'toggleAutoPlay') { console.log(PREFIX + ' toggling...'); window.__spacejump?.toggleAutoPlay(); dispatchStatus(); return; }
        if (action === 'enableAutoPlay') { console.log(PREFIX + ' enabling...'); window.__spacejump?.enableAutoPlay(); dispatchStatus(); return; }
        if (action === 'disableAutoPlay') { console.log(PREFIX + ' disabling...'); window.__spacejump?.disableAutoPlay(); dispatchStatus(); return; }
        if (action === 'dumpPage') { window.__spacejump?.dumpPage(); return; }
        if (action === 'setTargetScore') {
            targetScore = parseInt(e.data.value) || 0;
            dispatchStatus();
            return;
        }
        if (action === 'setAutoStopOnTarget') {
            autoStopOnTarget = e.data.value === true || e.data.value === 'true';
            dispatchStatus();
            return;
        }
        if (action === 'setInitData') {
            const raw = e.data.value || '';
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
    });

    try { Object.defineProperty(Window.prototype, 'innerWidth', { get: () => 844, configurable: true }); } catch (e) {}
    try { Object.defineProperty(Window.prototype, 'innerHeight', { get: () => 390, configurable: true }); } catch (e) {}

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
            if (prop === 'version') return '9.5';
            if (prop === 'isVersionAtLeast') return (v) => parseFloat(v) <= 9.5;
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

    const origFetch = window.fetch;
    window.fetch = function (...args) {
        const request = args[0];
        const options = args[1] || {};
        const url = typeof request === 'string' ? request : request.url;
        const method = (options.method || (request && request.method) || 'GET').toUpperCase();
        const body = options.body || null;
        if (url.includes('jump.mywebapp.ru')) {
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
                return r;
            });
        }
        return origFetch.apply(this, args);
    };

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
    const PHASE = { LOADING: 'loading', START: 'start', GAMEPLAY: 'gameplay', FINISH: 'finish' };

    function detectGamePhase() {
        var finishEl = document.getElementById('mainPageGameFinish');
        if (finishEl && finishEl.offsetParent !== null) return PHASE.FINISH;
        var startEl = document.getElementById('mainPageGameStart');
        if (startEl && startEl.offsetParent !== null) return PHASE.START;
        var canvas = document.getElementById('gameCanvas');
        if (canvas && canvas.offsetParent !== null && window.getComputedStyle(canvas).pointerEvents === 'auto') return PHASE.GAMEPLAY;
        if (canvas && canvas.offsetParent !== null) return PHASE.START;
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
        clickAllVisible();
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
        var target = null;
        var elements = findClickableElements();
        for (var i = 0; i < elements.length; i++) {
            if (elements[i].label === 'touch-overlay' || elements[i].label === 'canvas') {
                target = elements[i];
                break;
            }
        }
        if (!target) {
            var overlay = document.querySelector('#mainPage div[style*="touch-action"], #gameCanvas');
            if (overlay) {
                var r = overlay.getBoundingClientRect();
                if (r.width > 0) target = { el: overlay, x: r.left + r.width/2, y: r.top + r.height/2 };
            }
        }
        if (target) {
            fireAllEventsAt(target.el, target.x, target.y, 'jump');
            try {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32, bubbles: true }));
                document.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', keyCode: 32, bubbles: true }));
            } catch(e) {}
        }
    }

    function doPhaseFinish() {
        clickAllVisible();
        var claimed = claimRewards();
        if (claimed) claimCount++;
        var restartEls = document.querySelectorAll('[class*="restart" i], [class*="again" i], [class*="replay" i]');
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
        if (typeof Touch !== 'undefined' && typeof TouchEvent !== 'undefined') {
            try {
                const touch = new Touch({ identifier: Date.now() % 99999 + 1, target: target, clientX: jx, clientY: jy, screenX: jx, screenY: jy, pageX: jx, pageY: jy });
                target.dispatchEvent(new TouchEvent('touchstart', { cancelable: true, bubbles: true, touches: [touch], targetTouches: [touch], changedTouches: [touch] }));
                target.dispatchEvent(new TouchEvent('touchend', { cancelable: true, bubbles: true, touches: [], targetTouches: [], changedTouches: [touch] }));
            } catch(e) {}
        }
        try {
            target.dispatchEvent(new PointerEvent('pointerdown', { cancelable: true, bubbles: true, clientX: jx, clientY: jy, pointerType: 'touch', pointerId: 1 }));
            target.dispatchEvent(new PointerEvent('pointerup', { cancelable: true, bubbles: true, clientX: jx, clientY: jy, pointerType: 'touch', pointerId: 1 }));
        } catch(e) {}
        try {
            target.dispatchEvent(new MouseEvent('mousedown', { cancelable: true, bubbles: true, clientX: jx, clientY: jy, button: 0 }));
            target.dispatchEvent(new MouseEvent('mouseup', { cancelable: true, bubbles: true, clientX: jx, clientY: jy, button: 0 }));
            target.dispatchEvent(new MouseEvent('click', { cancelable: true, bubbles: true, clientX: jx, clientY: jy, button: 0 }));
        } catch(e) {}
    }

    function tapTarget() {
        if (!autoPlayTargetFound) {
            autoPlayTargetFound = true;
            console.log(PREFIX + ' Auto-play pipeline starting...');
        }
        autoPlayClickCount++;
        try {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
            document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        } catch(e) {}
        var currentPhase = detectGamePhase();
        if (currentPhase !== gamePhase) {
            console.log(PREFIX + ' Phase: ' + gamePhase + '→' + currentPhase + ' (score=' + currentScore + ')');
            gamePhase = currentPhase;
            phaseTicksInPhase = 0;
            if (gamePhase === PHASE.START) {
                currentScore = 0;
            }
        }
        try {
            if (currentPhase === PHASE.START) { doPhaseStart(); }
            else if (currentPhase === PHASE.GAMEPLAY) { doPhaseGameplay(); }
            else if (currentPhase === PHASE.FINISH) { doPhaseFinish(); }
        } catch(e) {}
    }

    window.__spacejump = {
        enableAutoPlay() {
            if (autoPlayInterval) return;
            gamePhase = 'unknown';
            claimCount = 0;
            autoPlayEnabled = true;
            autoPlayTargetFound = false;
            autoPlayClickCount = 0;
            currentScore = 0;
            autoPlayInterval = setInterval(tapTarget, 150);
            console.log(`${PREFIX} Auto-play ENABLED`);
            dispatchStatus();
        },
        disableAutoPlay() {
            if (autoPlayInterval) {
                clearInterval(autoPlayInterval);
                autoPlayInterval = null;
            }
            autoPlayEnabled = false;
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
                    if (action === 'toggleAutoPlay') { window.__spacejump?.toggleAutoPlay(); }
                    else if (action === 'enableAutoPlay') { window.__spacejump?.enableAutoPlay(); }
                    else if (action === 'disableAutoPlay') { window.__spacejump?.disableAutoPlay(); }
                }
            }
        } catch(e) {}
    }, 500);

    setInterval(dispatchStatus, 300);
    dispatchStatus();
    console.log(`${PREFIX} v4 loaded`);
    })();
}