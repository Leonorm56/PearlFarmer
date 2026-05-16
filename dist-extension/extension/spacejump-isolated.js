(function () {
    'use strict';

    function init() {
        const STATUS_ATTR = 'data-spacejump';

        function readStatus() {
            try {
                const raw = document.documentElement.getAttribute(STATUS_ATTR);
                return raw ? JSON.parse(raw) : null;
            } catch { return null; }
        }

        function sendCommand(action, value) {
            window.postMessage({type: 'spacejump:command', action, value}, '*');
            // Also write to localStorage as reliable fallback (MAIN world polls this)
            try { localStorage.setItem('sj_cmd', JSON.stringify({action: action, value: value, ts: Date.now()})); } catch(e) {}
        }

        // ── Forward page status to chrome.storage for farmer panel ──
        function writeToStorage() {
            const status = readStatus();
            if (!status) return;
            try {
                chrome.storage.local.set({
                    'spacejump-status': {
                        autoPlayEnabled: status.autoPlayEnabled,
                        score: status.score,
                        targetScore: status.targetScore,
                        proxyApplied: status.proxyApplied,
                        initDataOk: status.initDataOk,
                        gameReady: status.gameReady,
                        autoPlayTargetFound: status.autoPlayTargetFound,
                        gamePhase: status.gamePhase || 'unknown',
                        claimCount: status.claimCount || 0,
                        cmdReceiveCount: status.cmdReceiveCount || 0,
                        lastCmdAction: status.lastCmdAction || '',
                        pageDebug: status.pageDebug || null,
                        consoleLogs: (status.consoleLogs || []).slice(-25),
                        timestamp: Date.now()
                    });
                });
            } catch(e) {}
        }

        // ── Auto-reload mechanism ──
        // On first enableAutoPlay signal, reload the page so fresh scripts run.
        // The command persists in storage across reload; on next load we process it.
        var hasReloadedForAuto = false;
        try { hasReloadedForAuto = localStorage.getItem('sj_autoReloadedIso') === '1'; } catch(e) {}
        if (hasReloadedForAuto) try { localStorage.removeItem('sj_autoReloadedIso'); } catch(e) {}

        function setAutoPending() {
            try { sessionStorage.setItem('sj_autoReloaded', '1'); } catch(e) {}
            try { localStorage.setItem('sj_autoReloadedIso', '1'); } catch(e) {}
        }

        // ── Listen for commands from farmer via chrome.storage ──
        var lastCmdKey = '';

        function processCommand(cmd) {
            if (!cmd || !cmd.action) return;
            var key = cmd.action + '|' + (cmd.value != null ? JSON.stringify(cmd.value) : '');
            if (key === lastCmdKey) return; // deduplicate
            lastCmdKey = key;

            // For enableAutoPlay: reload the page first so fresh scripts run
            if (cmd.action === 'enableAutoPlay' && !hasReloadedForAuto) {
                hasReloadedForAuto = true;
                setAutoPending();
                // Keep command in storage so it's picked up after reload
                // Write a fresh timestamp so the init check finds it
                chrome.storage.local.set({'spacejump-command': cmd});
                location.reload();
                return;
            }

            sendCommand(cmd.action, cmd.value);
            chrome.storage.local.remove('spacejump-command');
        }

        // On init, check for pending command from before the reload
        chrome.storage.local.get('spacejump-command', function(result) {
            if (result && result['spacejump-command']) {
                processCommand(result['spacejump-command']);
            }
        });

        chrome.storage.onChanged.addListener(function(changes, area) {
            if (area === 'local' && changes['spacejump-command']) {
                const cmd = changes['spacejump-command'].newValue;
                processCommand(cmd);
                setTimeout(writeToStorage, 800);
            }
        });

        // Polling fallback: check for pending command every 2s
        setInterval(function() {
            chrome.storage.local.get('spacejump-command', function(result) {
                if (result && result['spacejump-command']) {
                    processCommand(result['spacejump-command']);
                }
            });
        }, 2000);

        // ── Watch for flush signal from MAIN world (reliable DOM bridge) ──
        var flushObserver = new MutationObserver(function() {
            var val = document.documentElement.getAttribute('data-spacejump-flush');
            if (val) {
                // Read the current status which includes pageDebug
                var status = readStatus();
                if (status && status.pageDebug) {
                    chrome.storage.local.set({'spacejump-page-debug': status.pageDebug});
                }
                writeToStorage();
                document.documentElement.removeAttribute('data-spacejump-flush');
            }
        });
        flushObserver.observe(document.documentElement, {attributes: true, attributeFilter: ['data-spacejump-flush']});

        setInterval(writeToStorage, 2000);
        writeToStorage();
        sendCommand('getStatus');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
