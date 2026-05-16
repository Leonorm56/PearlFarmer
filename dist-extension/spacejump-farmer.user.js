// ==UserScript==
// @name         SpaceJump Farmer + Android Spoof
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  Spoof Android Telegram WebApp, auto-play SpaceJump
// @author       You
// @match        https://mywebapp.ru/SpaceJump/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const PREFIX = '[SpaceJump]';

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

    // ── InitData (auto-extract from URL hash, then localStorage, then prompt) ──
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

    // 3. Last resort: prompt user
    if (!savedInitData || savedInitData.length < 50) {
        const draft = savedInitData || '';
        const ans = prompt(
            'SpaceJump: Paste ENTIRE URL from WebView address bar\n(must contain tgWebAppData=...)',
            draft
        );
        if (ans && ans.length > 50) {
            const m = ans.match(/tgWebAppData=([^&]+)/);
            savedInitData = m ? decodeURIComponent(m[1]) : ans;
            savedInitData = savedInitData.replace(/^\?/, '');
        } else {
            if (ans) alert('Link too short or missing tgWebAppData');
            console.warn(`${PREFIX} abort`);
            return;
        }
    }

    // Save for next session
    try { localStorage.setItem('sj_initData', savedInitData); } catch {}
    console.log(`${PREFIX} initData has query_id:`, savedInitData.includes('query_id'));
    console.log(`${PREFIX} initData has hash:`, savedInitData.includes('hash='));

    // ── WebApp Proxy handler ──
    const webAppHandler = {
        get(target, prop, receiver) {
            // Override these non-configurable SDK getters
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

            // Methods that crash in browser (SDK checks closure vars, not this.version)
            if (prop === 'requestFullscreen') return () => {};
            if (prop === 'disableVerticalSwipes') return () => {};
            if (prop === 'lockOrientation') return () => {};
            if (prop === 'unlockOrientation') return () => {};
            if (prop === 'setBackgroundColor') return () => {};
            if (prop === 'setHeaderColor') return () => {};

            // Prevent close() from killing the page
            if (prop === 'close') return () => console.warn(`${PREFIX} close() suppressed`);

            // Browser-safe UI methods
            if (prop === 'showAlert') {
                return (msg, cb) => { console.warn(`${PREFIX} Alert:`, msg); if (cb) setTimeout(cb, 10); };
            }
            if (prop === 'showConfirm') {
                return (msg, cb) => { console.warn(`${PREFIX} Confirm:`, msg); if (cb) setTimeout(() => cb(true), 10); };
            }
            if (prop === 'showPopup') {
                return (p, cb) => { console.warn(`${PREFIX} Popup:`, p); if (cb) setTimeout(() => cb({ button_id: 'ok' }), 10); };
            }

            // Forward everything else — methods called with `this` = proxy
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

        // Strategy A: direct replacement (works if WebApp is writable data prop)
        try {
            tg.WebApp = new Proxy(original, webAppHandler);
            console.log(`${PREFIX} Proxy applied (direct assignment)`);
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
                set(v) { /* ignore writes */ },
                configurable: true,
                enumerable: true,
            });
            console.log(`${PREFIX} Proxy applied (defineProperty getter)`);
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
            if (tries > 500) { clearInterval(iv); console.warn(`${PREFIX} Polling timeout`); return; } // 5s
            if (applyProxy()) clearInterval(iv);
        }, 10);
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
                return r;
            });
        }
        return origFetch.apply(this, args);
    };

    window.sj = { initData: savedInitData };
    console.log(`%c${PREFIX} v1.8 ready`, 'color:#0f0;font-weight:bold');
})();
