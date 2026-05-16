(function () {
    'use strict';

    // Auto-update: if version changed, reload to pick up new scripts
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

    // ── Message channel with ISOLATED world ──
    let proxyApplied = false;
    let initDataOk = false;
    let currentScore = 0;
    let targetScore = 0;
    var cmdReceiveCount = 0;
    var lastCmdAction = '';
    let autoStopOnTarget = true;
    let lastPageDebug = null;

    // ── Console capture ──
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
        if (action === 'navigateToPage') {
            var pageName = e.data.value || '';
            console.log(PREFIX + ' Navigating to: ' + pageName);
            var navBtns = document.querySelectorAll('button, [role=button], [class*="tab"], [class*="nav"]');
            for (var ni = 0; ni < navBtns.length; ni++) {
                var nb = navBtns[ni];
                if (nb.offsetParent !== null && nb.textContent.trim().toLowerCase() === pageName.toLowerCase()) {
                    var nr = nb.getBoundingClientRect();
                    if (nr.width > 0) { fireAllEventsAt(nb, nr.left + nr.width / 2, nr.top + nr.height / 2, 'nav:' + pageName); try { nb.click(); } catch (e) {} }
                    break;
                }
            }
            setTimeout(function () { window.__spacejump?.dumpPage(); dispatchStatus(); }, 2000);
            return;
        }
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
                // Re-apply proxy so WebApp.initData returns the new value
                applyProxy();
                dispatchStatus();
            }
            return;
        }
    });

    // ── Viewport override (LANDSCAPE) ──
    try { Object.defineProperty(Window.prototype, 'innerWidth', { get: () => 844, configurable: true }); } catch (e) { console.warn(PREFIX, 'innerWidth failed', e); }
    try { Object.defineProperty(Window.prototype, 'innerHeight', { get: () => 390, configurable: true }); } catch (e) { console.warn(PREFIX, 'innerHeight failed', e); }

    // ── Touch support spoof ──
    try { Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, writable: false, configurable: true }); } catch (e) { console.warn(PREFIX, 'maxTouchPoints failed', e); }
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
    // Convert mouse events to touch events for the game
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

    // ── InitData (auto-extract from URL hash, then localStorage) ──
    let savedInitData = null;

    // 1. Auto-extract from page URL (telegram web opens game with #tgWebAppData=...)
    try {
        const hash = location.hash;
        if (hash) {
            const hp = new URLSearchParams(hash.slice(1));
            const fromHash = hp.get('tgWebAppData');
            if (fromHash) {
                savedInitData = decodeURIComponent(fromHash).replace(/^\?/, '');
                console.log(`${PREFIX} initData auto-extracted from URL hash`);
            }
        }
    } catch (e) { console.warn(PREFIX, 'hash parse error', e); }

    // 2. Fallback: localStorage (previous session)
    if (!savedInitData) {
        try { savedInitData = localStorage.getItem('sj_initData'); } catch {}
    }

    // Save for next session
    if (savedInitData) try { localStorage.setItem('sj_initData', savedInitData); } catch {}
    initDataOk = !!(savedInitData && savedInitData.length > 50);
    if (savedInitData) {
        console.log(`${PREFIX} initData has query_id:`, savedInitData.includes('query_id'));
        console.log(`${PREFIX} initData has hash:`, savedInitData.includes('hash='));
    } else {
        console.warn(`${PREFIX} No initData found. Use panel to paste it.`);
    }

    // ── WebApp Proxy handler ──
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

    // ── Apply proxy to Telegram.WebApp ──
    function applyProxy() {
        const tg = window.Telegram;
        if (!tg || !tg.WebApp) return false;

        const original = tg.WebApp;

        // Strategy A: direct replacement
        try {
            tg.WebApp = new Proxy(original, webAppHandler);
            console.log(`${PREFIX} Proxy applied (direct assignment)`);
            proxyApplied = true;
            return true;
        } catch (e) {
            console.warn(`${PREFIX} Direct assignment failed:`, e.message);
        }

        // Strategy B: defineProperty getter on Telegram.WebApp
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

    // ── Immediate attempt + polling ──
    if (!applyProxy()) {
        console.log(`${PREFIX} Telegram.WebApp not ready yet, polling...`);
        let tries = 0;
        const iv = setInterval(() => {
            tries++;
            if (tries > 500) { clearInterval(iv); console.warn(`${PREFIX} Polling timeout`); return; }
            if (applyProxy()) { clearInterval(iv); dispatchStatus(); }
        }, 10);
    } else {
        dispatchStatus();
    }

    // ── Fetch interceptor ──
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

    // ── Score detection via fillText hook ──
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
                                console.log(`${PREFIX} Target score ${targetScore} reached! Stopping auto-play.`);
                                window.__spacejump?.disableAutoPlay();
                            }
                        }
                    }
                }
                return origFillText.apply(this, arguments);
            };
            console.log(`${PREFIX} fillText hooked for score detection`);
        } catch (e) {
            console.warn(`${PREFIX} fillText hook failed:`, e.message);
        }
    })();

    // ── DOM score fallback ──
    setInterval(function () {
        try {
            const candidates = document.querySelectorAll('.score, #score, [class*="score"], [id*="score"], [class*="current"], [data-score]');
            for (const el of candidates) {
                const raw = el.textContent.trim();
                const num = parseInt(raw.replace(/[^0-9]/g, ''), 10);
                if (!isNaN(num) && num > 0 && num < 9999999 && num > currentScore) {
                    currentScore = num;
                    console.log(`${PREFIX} Score (DOM): ${currentScore}`);
                    dispatchStatus();
                    if (autoStopOnTarget && targetScore > 0 && currentScore >= targetScore) {
                        window.__spacejump?.disableAutoPlay();
                    }
                }
            }
        } catch (e) {}
    }, 2000);

    // ── Helpers ──
    function rng() { return (Math.random() - 0.5) * 6; }

    // ── Auto-play (phase pipeline, inspired by Blum farmer) ──
    let autoPlayInterval = null;
    let autoPlayEnabled = false;
    let autoPlayTargetFound = false;
    let autoPlayClickCount = 0;
    let gameReady = false;

    function isGameLoaded() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay && overlay.style.opacity !== '0' && window.getComputedStyle(overlay).opacity !== '0') return false;
        const container = document.getElementById('appContainer');
        if (container && container.children.length === 0) return false;
        return true;
    }

    let gameLoadedLogged = false;

    // ── Find ALL clickable elements in the game ──
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

        const container = document.getElementById('appContainer');
        if (container && container.children.length > 0 && !elements.some(e => e.el === container)) {
            const rect = container.getBoundingClientRect();
            elements.push({ el: container, x: rect.left + rect.width/2, y: rect.top + rect.height/2, label: 'appContainer' });
        }

        return elements;
    }

    // ── Log game UI snapshot ──
    function logGameSnapshot() {
        const container = document.getElementById('appContainer');
        if (!container) return;
        const html = container.innerHTML;
        if (html === lastGameHTML) return;
        lastGameHTML = html;
        console.log(`${PREFIX} === GAME UI SNAPSHOT ===`);
        console.log(`${PREFIX} ${html.slice(0, 2000)}`);
        console.log(`${PREFIX} === END SNAPSHOT ===`);
        const elements = findClickableElements();
        console.log(`${PREFIX} Found ${elements.length} clickable elements:`);
        elements.forEach(function(e) {
            console.log(`  ${e.label} @ (${Math.round(e.x)},${Math.round(e.y)})`);
        });
    }

    let lastElements = [];
    let gamePhaseStartCount = 0;
    let gamePhase = 'unknown';
    let claimCount = 0;
    let lastPhaseChangeTick = 0;

    // ── Phase pipeline (start → gameplay → finish → restart) ──
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
        document.querySelectorAll('#mainPageGameFinish button, #mainPageGameFinish [role="button"], ' +
            '#mainPageGameFinish [class*="btn"], #mainPageGameFinish [onclick], ' +
            '#appContainer button, #modal-root button').forEach(function(el) {
            if (el.offsetParent === null) return;
            var t = (el.textContent || '').trim().toLowerCase();
            for (var ci = 0; ci < claimTexts.length; ci++) {
                if (t.includes(claimTexts[ci])) {
                    var r = el.getBoundingClientRect();
                    if (r.width > 0) {
                        fireAllEventsAt(el, r.left + r.width/2, r.top + r.height/2, 'claim:' + claimTexts[ci]);
                        try { el.click(); } catch(e) {}
                        found = true;
                        console.log(PREFIX + ' Claimed reward via "' + el.textContent.trim().slice(0,30) + '"');
                    }
                    break;
                }
            }
        });
        if (!found) {
            document.querySelectorAll('#mainPageGameFinish *, #appContainer *').forEach(function(el) {
                if (el.offsetParent === null || el.children.length > 0) return;
                var t = (el.textContent || '').trim().toLowerCase();
                for (var ci = 0; ci < claimTexts.length; ci++) {
                    if (t.includes(claimTexts[ci])) {
                        var r = el.getBoundingClientRect();
                        if (r.width > 10 && r.height > 10) {
                            fireAllEventsAt(el, r.left + r.width/2, r.top + r.height/2, 'claim-text');
                            try { el.click(); } catch(e) {}
                            found = true;
                        }
                        break;
                    }
                }
            });
        }
        return found;
    }

    // ── Phase tick counter & stuck detection ──
    var phaseTicksInPhase = 0;
    var phaseTickLimit = 2000;

    function clickAllVisible() {
        var all = document.querySelectorAll('button, [role="button"], [onclick], .btn, .button, #mainPageGameStart, #mainPageGameFinish, #mainPageGameProcess');
        for (var i = 0; i < all.length; i++) {
            try { if (all[i].offsetParent !== null) { all[i].click(); } } catch(e) {}
        }
    }

    function doPhaseStart() {
        phaseTicksInPhase++;
        gamePhaseStartCount++;
        // Click all buttons directly first
        clickAllVisible();
        // Then find + click Start/Play/Restart specifically
        var els = ['[class*="start" i]', '[id*="start" i]', '[class*="play" i]', '[class*="restart" i]', '[id*="restart" i]',
                   '#startButton', '#playButton', '#restartButton', '#btnStart', '#btnPlay'];
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
        // Fallback: click all known elements
        var els2 = findClickableElements();
        for (var i = 0; i < els2.length; i++) {
            fireAllEventsAt(els2[i].el, els2[i].x, els2[i].y, els2[i].label);
            try { els2[i].el.click(); } catch(e) {}
        }
        if (phaseTicksInPhase % 20 === 0) {
            console.log(PREFIX + ' [START] clicking elements x' + phaseTicksInPhase);
        }
    }

    function doPhaseGameplay() {
        // Tap the canvas or touch overlay
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
            // Also send keyboard space
            try {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32, bubbles: true }));
                document.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', keyCode: 32, bubbles: true }));
            } catch(e) {}
        }
        // Click any buttons that appear mid-game
        var allBtns = document.querySelectorAll('#appContainer button, #appContainer [role="button"]');
        for (var i = 0; i < allBtns.length; i++) {
            try { if (allBtns[i].offsetParent !== null) allBtns[i].click(); } catch(e) {}
        }
    }

    function doPhaseFinish() {
        // Claim rewards, then restart
        clickAllVisible();
        var claimed = claimRewards();
        if (claimed) claimCount++;
        // Click all buttons on finish screen to trigger restart
        var els = document.querySelectorAll('#mainPageGameFinish button, #mainPageGameFinish [role="button"], ' +
            '#mainPageGameFinish [class*="btn"], #mainPageGameFinish *');
        for (var i = 0; i < els.length; i++) {
            try {
                if (els[i].offsetParent !== null) {
                    var r = els[i].getBoundingClientRect();
                    if (r.width > 0) fireAllEventsAt(els[i], r.left + r.width/2, r.top + r.height/2, 'finish');
                    try { els[i].click(); } catch(e) {}
                }
            } catch(e) {}
        }
        // Also find any "restart" text element
        var restartEls = document.querySelectorAll('[class*="restart" i], [id*="restart" i], [class*="again" i], [class*="replay" i]');
        for (var i = 0; i < restartEls.length; i++) {
            try {
                if (restartEls[i].offsetParent !== null) {
                    var r = restartEls[i].getBoundingClientRect();
                    if (r.width > 0) fireAllEventsAt(restartEls[i], r.left + r.width/2, r.top + r.height/2, 'restart');
                    try { restartEls[i].click(); } catch(e) {}
                }
            } catch(e) {}
        }
        if (phaseTicksInPhase % 5 === 0) {
            console.log(PREFIX + ' [FINISH] claimed=' + claimed + ' total=' + claimCount + ' score=' + currentScore);
        }
    }

    // ── Main pipeline tick ──
    function pipelineTick() {
        if (!autoPlayTargetFound) {
            autoPlayTargetFound = true;
            console.log(PREFIX + ' Auto-play pipeline starting...');
            logGameSnapshot();
        }
        autoPlayClickCount++;

        // Dispatch keyboard Enter globally
        try {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
            document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        } catch(e) {}

        var currentPhase = detectGamePhase();

        // Phase transition
        if (currentPhase !== gamePhase) {
            console.log(PREFIX + ' Phase: ' + gamePhase + '→' + currentPhase + ' (score=' + currentScore + ' tick=' + autoPlayClickCount + ')');
            gamePhase = currentPhase;
            phaseTicksInPhase = 0;
            lastPhaseChangeTick = autoPlayClickCount;
            if (gamePhase === PHASE.START) {
                var prevScore = currentScore;
                currentScore = 0;
                gamePhaseStartCount = 0;
                console.log(PREFIX + ' Start screen (prevScore=' + prevScore + ')');
            }
            if (gamePhase === PHASE.GAMEPLAY) {
                console.log(PREFIX + ' Gameplay started!');
            }
            if (gamePhase === PHASE.FINISH) {
                console.log(PREFIX + ' Finish screen!');
            }
        }

        // Execute phase handler
        try {
            if (currentPhase === PHASE.START) { doPhaseStart(); }
            else if (currentPhase === PHASE.GAMEPLAY) { doPhaseGameplay(); }
            else if (currentPhase === PHASE.FINISH) { doPhaseFinish(); }
        } catch(e) {
            console.warn(PREFIX + ' Phase error:', e.message);
        }

        // Dismiss modals periodically
        try {
            document.querySelectorAll('[class*="modal"] button, #modal-root button, [class*="overlay"] button, [class*="backdrop"]').forEach(function(el) {
                if (el.offsetParent !== null) { try { el.click(); } catch(e) {} }
            });
        } catch(e) {}

        if (autoPlayClickCount % 100 === 0) {
            console.log(PREFIX + ' Stats: tick=' + autoPlayClickCount + ' phase=' + gamePhase + ' score=' + currentScore + ' claims=' + claimCount + ' phaseTick=' + phaseTicksInPhase);
        }
    }

    function fireAllEventsAt(target, x, y, label) {
        var jx = x + rng(), jy = y + rng();
        // Touch events
        if (typeof Touch !== 'undefined' && typeof TouchEvent !== 'undefined') {
            try {
                const touch = new Touch({ identifier: Date.now() % 99999 + 1, target: target, clientX: jx, clientY: jy, screenX: jx + window.screenX || 0, screenY: jy + window.screenY || 0, pageX: jx, pageY: jy });
                target.dispatchEvent(new TouchEvent('touchstart', { cancelable: true, bubbles: true, touches: [touch], targetTouches: [touch], changedTouches: [touch] }));
                target.dispatchEvent(new TouchEvent('touchend', { cancelable: true, bubbles: true, touches: [], targetTouches: [], changedTouches: [touch] }));
            } catch(e) {}
        }
        // Pointer events (try both touch and mouse pointerType)
        try {
            target.dispatchEvent(new PointerEvent('pointerdown', { cancelable: true, bubbles: true, clientX: jx, clientY: jy, pointerType: 'touch', pointerId: 1, width: 10, height: 10, pressure: 0.5 }));
            target.dispatchEvent(new PointerEvent('pointerup', { cancelable: true, bubbles: true, clientX: jx, clientY: jy, pointerType: 'touch', pointerId: 1, width: 10, height: 10, pressure: 0 }));
        } catch(e) {}
        try {
            target.dispatchEvent(new PointerEvent('pointerdown', { cancelable: true, bubbles: true, clientX: jx, clientY: jy, pointerType: 'mouse', pointerId: 2 }));
            target.dispatchEvent(new PointerEvent('pointerup', { cancelable: true, bubbles: true, clientX: jx, clientY: jy, pointerType: 'mouse', pointerId: 2 }));
        } catch(e) {}
        // Mouse events
        try {
            target.dispatchEvent(new MouseEvent('mousedown', { cancelable: true, bubbles: true, clientX: jx, clientY: jy, button: 0 }));
            target.dispatchEvent(new MouseEvent('mousemove', { cancelable: true, bubbles: true, clientX: jx + 1, clientY: jy + 1 }));
            target.dispatchEvent(new MouseEvent('mouseup', { cancelable: true, bubbles: true, clientX: jx, clientY: jy, button: 0 }));
            target.dispatchEvent(new MouseEvent('click', { cancelable: true, bubbles: true, clientX: jx, clientY: jy, button: 0 }));
        } catch(e) {}
    }

    // Dismiss any visible modals
    function dismissModals() {
        try {
            document.querySelectorAll('[class*="modal"] button, #modal-root button, ' +
                '[class*="overlay"] button, [class*="backdrop"]').forEach(function(el) {
                if (el.offsetParent !== null) {
                    const r = el.getBoundingClientRect();
                    fireAllEventsAt(el, r.left + r.width/2, r.top + r.height/2, 'dismiss');
                    try { el.click(); } catch(e) {}
                }
            });
            const modalRoot = document.getElementById('modal-root');
            if (modalRoot && modalRoot.children.length > 0) {
                const r = modalRoot.getBoundingClientRect();
                fireAllEventsAt(modalRoot, r.left + r.width/2, r.top + r.height/2, 'modal-root');
            }
        } catch(e) {}
    }

    // Dismiss mode selection menu (game start / restart screen)
    function dismissModeMenu() {
        try {
            var targets = [];
            document.querySelectorAll('[class*="mode" i], [class*="select" i], [class*="difficulty" i], ' +
                '[class*="menu" i], [class*="popup" i], [class*="dialog" i], [class*="start" i]').forEach(function(el) {
                if (el.offsetParent !== null && el.textContent.trim().length > 0) targets.push(el);
            });
            if (targets.length) {
                var labels = ['start', 'play', 'go', 'confirm', 'select', 'mode', 'easy', 'classic', 'hard', 'ok'];
                targets.forEach(function(el) {
                    var t = el.textContent.toLowerCase().trim();
                    if (labels.some(function(l) { return t.includes(l); })) {
                        var r = el.getBoundingClientRect();
                        fireAllEventsAt(el, r.left + r.width/2, r.top + r.height/2, 'mode-dismiss');
                        try { el.click(); } catch(e) {}
                    }
                });
            }
        } catch(e) {}
    }

    // Watch for game DOM changes (deferred until body exists)
    function setupDOMObserver() {
        var target = document.getElementById('appContainer') || document.body;
        if (!target) { setTimeout(setupDOMObserver, 200); return; }
        try {
            var observer = new MutationObserver(function(mutations) {
                for (var mi = 0; mi < mutations.length; mi++) {
                    var m = mutations[mi];
                    for (var ni = 0; ni < m.addedNodes.length; ni++) {
                        var n = m.addedNodes[ni];
                        if (n.nodeType === 1) {
                            var el = n;
                            var tag = el.tagName.toLowerCase();
                            var cls = (el.className || '').toString().slice(0, 60);
                            var id = el.id || '';
                            var html = n.innerHTML ? (n.innerHTML.length > 200 ? n.innerHTML.slice(0, 200) + '...' : n.innerHTML) : '';
                            console.log(PREFIX + ' DOM added: <' + tag + (id ? '#' + id : '') + (cls ? '.' + cls.replace(/ /g, '.') : '') + '> ' + html);
                        }
                    }
                }
            });
            observer.observe(target, { childList: true, subtree: true });
            console.log(PREFIX + ' DOM observer installed on #' + (target.id || 'body'));
        } catch(e) { console.warn(PREFIX + ' observer error', e); }
    }
    setupDOMObserver();

    // Periodic diagnostics + snapshot
    let diagCount = 0;
    setInterval(function() {
        diagCount++;
        const loaded = isGameLoaded();
        const container = document.getElementById('appContainer');
        const cc = container ? container.children.length : -1;
        const overlay = document.getElementById('loadingOverlay');
        const ov = overlay ? window.getComputedStyle(overlay).opacity : '?';
        var canvas = document.getElementById('gameCanvas');
        var pe = canvas ? window.getComputedStyle(canvas).pointerEvents : '?';
        // Snapshot the game UI periodically for first few iterations
        if (cc > 0 && diagCount <= 7) {
            logGameSnapshot();
        }
        const elements = autoPlayEnabled ? findClickableElements() : [];
        console.log(`${PREFIX} Diag #${diagCount}: loaded=${loaded} #appContainer.children=${cc} overlay.opacity=${ov} clickables=${elements.length} autoPlay=${autoPlayEnabled?'ON':'OFF'} clicks=${autoPlayClickCount} score=${currentScore} phase=${gamePhase} claims=${claimCount}`);
    }, 3000);

    let modalDismissInterval = null;

    window.__spacejump = {
        enableAutoPlay() {
            if (autoPlayInterval) return;
            window.__spacejump.dumpPage();
            dismissModeMenu();
            gamePhase = 'unknown';
            gamePhaseStartCount = 0;
            claimCount = 0;
            autoPlayEnabled = true;
            autoPlayTargetFound = false;
            autoPlayClickCount = 0;
            currentScore = 0;
            gameReady = false;
            gameLoadedLogged = false;
            autoPlayInterval = setInterval(tapTarget, 150);
            if (!modalDismissInterval) modalDismissInterval = setInterval(dismissModals, 2000);
            console.log(`%c${PREFIX} Auto-play ENABLED (150ms interval)`, 'color:#0f0;font-weight:bold');
            dispatchStatus();
        },
        disableAutoPlay() {
            if (autoPlayInterval) {
                clearInterval(autoPlayInterval);
                autoPlayInterval = null;
            }
            if (modalDismissInterval) {
                clearInterval(modalDismissInterval);
                modalDismissInterval = null;
            }
            autoPlayEnabled = false;
            console.log(`%c${PREFIX} Auto-play DISABLED (${autoPlayClickCount} clicks sent)`, 'color:#ff0');
            dispatchStatus();
        },
        toggleAutoPlay() {
            if (autoPlayEnabled) window.__spacejump.disableAutoPlay();
            else window.__spacejump.enableAutoPlay();
        },
        getAutoPlayStatus() { return autoPlayEnabled; },
        getScore() { return currentScore; },
        setTargetScore(n) { targetScore = parseInt(n) || 0; dispatchStatus(); },
        getTargetScore() { return targetScore; },
        getConsoleLogs() { return consoleLogs.slice(); },
        dumpPage() {
            try {
                var autoReloaded = false;
                try { autoReloaded = sessionStorage.getItem('sj_autoReloaded') === '1'; } catch(e) {}
                var isoReloaded = false;
                try { isoReloaded = localStorage.getItem('sj_autoReloadedIso') === '1'; } catch(e) {}
                lastPageDebug = {
                    buttons: [], modeEls: [], text: [], bodyChildren: 0, visibleBodyChildren: 0,
                    url: location.href, title: document.title, errorPages: [],
                    autoPlayEnabled: autoPlayEnabled,
                    cmdReceiveCount: cmdReceiveCount,
                    lastCmdAction: lastCmdAction,
                    sj_autoReloaded: autoReloaded ? 'yes' : 'no',
                    sj_autoReloadedIso: isoReloaded ? 'yes' : 'no',
                    gamePhase: gamePhase,
                    clickCount: autoPlayClickCount,
                    claimCount: claimCount,
                };
                console.log(`%c${PREFIX} === PAGE DEBUG ===`, 'color:#0ff;font-weight:bold');
                console.log(`%c${PREFIX} URL: ${location.href}`, 'color:#aaa');
                console.log(`${PREFIX} Title: ${document.title}`);
                if (document.body) {
                    var c = document.body.children;
                    lastPageDebug.bodyChildren = c.length;
                    var info = Array.from(c).slice(0,15).map(function(e){return e.tagName+(e.id?'#'+e.id:'')+(e.className&&typeof e.className=='string'?'.'+e.className.slice(0,30):'')}).join(', ');
                    console.log(`${PREFIX} Body children (${c.length}): ` + info);
                    var v = [];
                    for (var i=0;i<c.length;i++){var e=c[i];if(e.offsetParent!==null||e===document.body)v.push(e.tagName+(e.id?'#'+e.id:''))}
                    lastPageDebug.visibleBodyChildren = v.length;
                    console.log(`${PREFIX} Visible children (${v.length}): ` + v.join(', '));
                }
                var btns = Array.from(document.querySelectorAll('button, [role=button], .btn, a, [onclick], [class*=button i]'));
                var visBtns = btns.filter(function(e){return e.offsetParent!==null&&e.textContent.trim().length>0});
                console.log(`${PREFIX} All visible buttons (${visBtns.length}):`);
                lastPageDebug.buttons = visBtns.slice(0,25).map(function(e){return e.textContent.trim().slice(0,40)});
                visBtns.slice(0,25).forEach(function(e,i){
                    console.log(`  ${i+1}. <${e.tagName}> "${e.textContent.trim().slice(0,40)}" cls="${(e.className||'').slice(0,30)}"`);
                });
                var modeEls = Array.from(document.querySelectorAll('[class*=mode i], [id*=mode i], [class*=game i], [id*=game i], [class*=select i], [id*=select i], [class*=level i], [id*=level i], [class*=menu i], [id*=menu i]'));
                if (modeEls.length) {
                    console.log(`${PREFIX} Mode/Game/Select elements (${modeEls.length}):`);
                    lastPageDebug.modeEls = modeEls.slice(0,15).map(function(e){return{tag:e.tagName,id:e.id||'',cls:(e.className||'').slice(0,40),text:(e.textContent||'').trim().slice(0,40),vis:e.offsetParent!==null}});
                    modeEls.slice(0,15).forEach(function(e,i){
                        console.log(`  ${i+1}. <${e.tagName}>${e.id?'#'+e.id:''}${e.className&&typeof e.className=='string'?'.cls:'+e.className.slice(0,40):''} text="${(e.textContent||'').trim().slice(0,40)}" ${e.offsetParent!==null?'[VISIBLE]':'[HIDDEN]'}`);
                    });
                }
                var textWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
                var textNodes = [], tnode;
                while (tnode = textWalker.nextNode()) {
                    var t = tnode.textContent.trim();
                    if (t.length > 2) textNodes.push(t.slice(0,60));
                }
                var bridgeStatus = '[BRIDGE] auto=' + (autoPlayEnabled ? 'ON' : 'OFF') + ' cmds=' + cmdReceiveCount + ' last=' + lastCmdAction + ' reloaded=' + (autoReloaded ? 'Y' : 'N');
                lastPageDebug._bridge = bridgeStatus;
                textNodes.push(bridgeStatus);
                lastPageDebug.text = textNodes.slice(0,30);
                console.log(`${PREFIX} Visible text (${textNodes.length} nodes): ` + textNodes.slice(0,30).join(' | '));
                var tele = window.Telegram?.WebApp;
                lastPageDebug.telegram = tele?'YES':'NO';
                console.log(`${PREFIX} Telegram: ${tele?'YES':'NO'}`+(tele&&tele.initData?' initData:'+tele.initData.length:'')+(tele&&tele.version?' v'+tele.version:''));
                if(tele&&tele.MainButton)console.log(`${PREFIX} MainButton: ${tele.MainButton.text||'none'} ${tele.MainButton.isVisible?'[visible]':''}`);
                console.log(`${PREFIX} Body style: display=${document.body.style.display||'auto'} vis=${document.body.style.visibility||'visible'} op=${document.body.style.opacity||'1'}`);
                console.log(`%c${PREFIX} === END DEBUG ===`, 'color:#0ff;font-weight:bold');
                dispatchStatus();
                document.documentElement.setAttribute('data-spacejump-flush', Date.now().toString());
            } catch(e) {
                console.log(`${PREFIX} dumpPage error: ${e.message}`);
            }
        },
    };

    // ── localStorage command polling (reliable fallback bridge) ──
    setInterval(function() {
        try {
            var raw = localStorage.getItem('sj_cmd');
            if (raw) {
                localStorage.removeItem('sj_cmd');
                var cmd = JSON.parse(raw);
                if (cmd && cmd.action) {
                    console.log(PREFIX + ' CMD from localStorage: ' + cmd.action);
                    // Dispatch to the message handler logic
                    var action = cmd.action;
                    if (action === 'getStatus') { dispatchStatus(); }
                    else if (action === 'toggleAutoPlay') { window.__spacejump?.toggleAutoPlay(); dispatchStatus(); }
                    else if (action === 'enableAutoPlay') { window.__spacejump?.enableAutoPlay(); dispatchStatus(); }
                    else if (action === 'disableAutoPlay') { window.__spacejump?.disableAutoPlay(); dispatchStatus(); }
                    else if (action === 'dumpPage') { window.__spacejump?.dumpPage(); }
                    else if (action === 'navigateToPage') {
                        var pageName = cmd.value || '';
                        var navBtns = document.querySelectorAll('button, [role=button], [class*="tab"], [class*="nav"]');
                        for (var ni = 0; ni < navBtns.length; ni++) {
                            var nb = navBtns[ni];
                            if (nb.offsetParent !== null && nb.textContent.trim().toLowerCase() === pageName.toLowerCase()) {
                                var nr = nb.getBoundingClientRect();
                                if (nr.width > 0) { fireAllEventsAt(nb, nr.left + nr.width / 2, nr.top + nr.height / 2, 'nav:' + pageName); try { nb.click(); } catch (e) {} }
                                break;
                            }
                        }
                        setTimeout(function () { window.__spacejump?.dumpPage(); dispatchStatus(); }, 2000);
                    }
                }
            }
        } catch(e) {}
    }, 500);

    // ── Frequent status flush ──
    setInterval(dispatchStatus, 300);

    // ── Auto-reload recovery: check if reloaded for auto-play ──
    try {
        if (sessionStorage.getItem('sj_autoReloaded') === '1') {
            sessionStorage.removeItem('sj_autoReloaded');
            console.log(PREFIX + ' Auto-reload detected, enabling auto-play...');
            setTimeout(function() {
                window.__spacejump?.enableAutoPlay();
            }, 1000);
        }
    } catch(e) {}

    // ── Initial status ──
    dispatchStatus();
    console.log(`%c${PREFIX} v2.2 loaded (phase tracking + rewards + log overlay)`, 'color:#0f0;font-weight:bold');
    console.log(`${PREFIX} URL:`, location.href);
    console.log(`${PREFIX} initData present:`, !!savedInitData);
    console.log(`${PREFIX} initData length:`, savedInitData ? savedInitData.length : 0);
    console.log(`${PREFIX} Has Telegram.WebApp:`, !!(window.Telegram && window.Telegram.WebApp));
    console.log(`${PREFIX} Proxy applied:`, proxyApplied);
    console.log(`${PREFIX} Clickable elements:`, findClickableElements().length);
    console.log(`${PREFIX} Use window.__spacejump.toggleAutoPlay() or the floating panel`);
})();
