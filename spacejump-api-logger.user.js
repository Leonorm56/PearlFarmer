// ==UserScript==
// @name         SpaceJump API Logger
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Intercept and log all API calls from SpaceJump web app
// @author       You
// @match        https://mywebapp.ru/SpaceJump/*
// @icon         https://mywebapp.ru/favicon.ico
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const PREFIX = '[SpaceJump API]';

    function log(method, url, reqHeaders, reqBody, status, resBody) {
        console.groupCollapsed(
            `${PREFIX} %c${method} %c${url}`,
            'color: #4CAF50; font-weight: bold',
            'color: #2196F3; font-weight: bold'
        );
        console.log('Request Headers:', reqHeaders);
        if (reqBody) console.log('Request Body:', reqBody);
        console.log('Response Status:', status);
        if (resBody) console.log('Response Body:', resBody);
        console.groupEnd();
    }

    // Intercept fetch
    const origFetch = window.fetch;
    window.fetch = async function (...args) {
        const request = args[0];
        const options = args[1] || {};
        const url = typeof request === 'string' ? request : request.url;
        const method = (options.method || (request && request.method) || 'GET').toUpperCase();
        const headers = options.headers || (request && request.headers) || {};
        const body = options.body || (request && request.body) || null;

        // Only log calls to our API server
        if (url.includes('jump.mywebapp.ru')) {
            let parsedBody = null;
            if (body && typeof body === 'string') {
                try { parsedBody = JSON.parse(body) } catch { parsedBody = body }
            }

            try {
                const response = await origFetch.apply(this, args);
                const clone = response.clone();
                const resText = await clone.text();
                let resJson = null;
                try { resJson = JSON.parse(resText) } catch { resJson = resText }

                log(method, url, headers, parsedBody, response.status, resJson);
                return response;
            } catch (err) {
                console.error(`${PREFIX} Fetch error:`, err);
                throw err;
            }
        }

        return origFetch.apply(this, args);
    };

    // Intercept XMLHttpRequest
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    const xhrMap = new WeakMap();

    XMLHttpRequest.prototype.open = function (method, url) {
        xhrMap.set(this, { method, url, headers: {} });
        return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
        const info = xhrMap.get(this);
        if (info) info.headers[name] = value;
        return this;
    };

    XMLHttpRequest.prototype.send = function (body) {
        const info = xhrMap.get(this);
        if (info && info.url && info.url.includes('jump.mywebapp.ru')) {
            this.addEventListener('load', function () {
                let resBody = null;
                try { resBody = JSON.parse(this.responseText) } catch { resBody = this.responseText }
                let parsedBody = null;
                if (body && typeof body === 'string') {
                    try { parsedBody = JSON.parse(body) } catch { parsedBody = body }
                }
                log(info.method, info.url, info.headers, parsedBody, this.status, resBody);
            });
        }
        return origSend.apply(this, arguments);
    };

    // Log Telegram init data on page load
    window.addEventListener('load', () => {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            console.log(`${PREFIX} Telegram WebApp detected`);
            console.log(`${PREFIX} initData:`, tg.initData);
            console.log(`${PREFIX} initDataUnsafe:`, tg.initDataUnsafe);
            console.log(`${PREFIX} platform:`, tg.platform);
            console.log(`${PREFIX} version:`, tg.version);
        }
        const deviceId = localStorage.getItem('device_id') || document.cookie.match(/device_id=([^;]+)/)?.[1];
        if (deviceId) console.log(`${PREFIX} device_id:`, deviceId);
    });
})();
