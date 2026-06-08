/* =====================================================================
   Identity Card 2026  -  NUI controller
   ===================================================================== */
(function () {
    'use strict';

    const app = document.getElementById('app');

    // cached element refs
    const el = {
        brand:    document.getElementById('brand'),
        subBrand: document.getElementById('subBrand'),
        avatar:   document.getElementById('avatar'),
        avatarIcon: document.getElementById('avatarIcon'),
        name:     document.getElementById('pName'),
        id:       document.getElementById('pId'),
        job:      document.getElementById('pJob'),
        grade:    document.getElementById('pGrade'),
        cash:     document.getElementById('pCash'),
        bank:     document.getElementById('pBank'),
        wage:     document.getElementById('pWage'),
        weekly:   document.getElementById('pWeekly'),
        session:  document.getElementById('pSession'),
        ping:     document.getElementById('pPing'),
        rings:    document.getElementById('rings'),
        voice:    document.getElementById('voice'),
        online:   document.getElementById('onlineList'),
        onlineTotal: document.getElementById('onlineTotal'),
        achGrid:  document.getElementById('achGrid'),
        achCount: document.getElementById('achCount'),
        achWrap:  document.getElementById('achWrap'),
        stats2:   document.getElementById('stats2'),
        toast:        document.getElementById('toast'),
        toastEmoji:   document.getElementById('toastEmoji'),
        toastLabel:   document.getElementById('toastLabel'),
        phoneRow: document.getElementById('pPhoneRow'),
        phone:    document.getElementById('pPhone'),
        society:        document.getElementById('society'),
        societyEmoji:   document.getElementById('societyEmoji'),
        societyTitle:   document.getElementById('societyTitle'),
        societyBoss:    document.getElementById('societyBoss'),
        societyName:    document.getElementById('societyName'),
        societyMembers: document.getElementById('societyMembers'),
        societyGrade:   document.getElementById('societyGrade'),
        societyBalance: document.getElementById('societyBalance'),
        societyBalanceRow: document.getElementById('societyBalanceRow'),
    };

    // ---- ring geometry ------------------------------------------------
    const RING_R = 24;
    const RING_C = 2 * Math.PI * RING_R; // circumference

    // which rings exist + their semantic colors (default + colorblind-safe)
    const RINGS = [
        { key: 'health', label: 'HP',     color: '#22c55e', cb: '#009E73' },
        { key: 'armor',  label: 'ARMOR',  color: '#3b82f6', cb: '#0072B2' },
        { key: 'hunger', label: 'HUNGER', color: '#f59e0b', cb: '#E69F00' },
        { key: 'thirst', label: 'THIRST', color: '#38bdf8', cb: '#56B4E9' },
    ];
    const ringNodes = {}; // key -> { wrap, fg, text }

    // ---- UI preferences (overridden by the 'config' NUI message) ------
    const uiPrefs = {
        animate: true,
        countUp: 650,
        autoScale: true,
        uiScale: 1.0,
        minScale: 0.75,
        maxScale: 1.35,
        reducedMotion: false,
        colorblind: false,
        sounds: { enabled: true, volume: 0.35, open: true, close: true, achievement: true },
    };

    function buildRings() {
        const ns = 'http://www.w3.org/2000/svg';
        RINGS.forEach(function (r) {
            const wrap = document.createElement('div');
            wrap.className = 'ring';
            wrap.dataset.key = r.key;

            const svg = document.createElementNS(ns, 'svg');
            svg.setAttribute('class', 'ring__svg');
            svg.setAttribute('viewBox', '0 0 58 58');
            // explicit intrinsic size so the ring can NEVER balloon even if
            // the stylesheet is late/missing in the CEF browser.
            svg.setAttribute('width', '58');
            svg.setAttribute('height', '58');

            const bg = document.createElementNS(ns, 'circle');
            bg.setAttribute('class', 'ring__bg');
            bg.setAttribute('cx', '29');
            bg.setAttribute('cy', '29');
            bg.setAttribute('r', String(RING_R));

            const fg = document.createElementNS(ns, 'circle');
            fg.setAttribute('class', 'ring__fg');
            fg.setAttribute('cx', '29');
            fg.setAttribute('cy', '29');
            fg.setAttribute('r', String(RING_R));
            fg.setAttribute('stroke', r.color);
            fg.setAttribute('stroke-dasharray', String(RING_C));
            fg.setAttribute('stroke-dashoffset', String(RING_C));

            const text = document.createElementNS(ns, 'text');
            text.setAttribute('class', 'ring__pct');
            text.setAttribute('x', '29');
            text.setAttribute('y', '29');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'central');
            text.textContent = '0';

            svg.appendChild(bg);
            svg.appendChild(fg);
            svg.appendChild(text);

            const label = document.createElement('span');
            label.className = 'ring__label';
            label.textContent = r.label;

            wrap.appendChild(svg);
            wrap.appendChild(label);
            el.rings.appendChild(wrap);

            ringNodes[r.key] = { wrap: wrap, fg: fg, text: text };
        });
    }

    function setRing(key, value) {
        const node = ringNodes[key];
        if (!node) return;

        if (value === undefined || value === null) {
            node.wrap.style.display = 'none';
            return;
        }
        node.wrap.style.display = 'flex';

        let pct = Math.max(0, Math.min(100, Math.round(value)));
        node.fg.setAttribute('stroke-dashoffset', String(RING_C * (1 - pct / 100)));
        node.text.textContent = String(pct);
    }

    // ---- formatting ---------------------------------------------------
    function formatMoney(value) {
        const v = Math.floor(Number(value) || 0);
        const s = v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return s + '$';
    }

    function hexToRgba(hex, a) {
        hex = String(hex || '#e5e7eb').replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
    }

    function setAccent(color) {
        const root = document.documentElement;
        root.style.setProperty('--accent', color);
        root.style.setProperty('--accent-soft', hexToRgba(color, 0.16));
    }

    // ---- accessibility: ring palette ----------------------------------
    function applyRingPalette(useCb) {
        RINGS.forEach(function (r) {
            const node = ringNodes[r.key];
            if (node) node.fg.setAttribute('stroke', useCb ? r.cb : r.color);
        });
    }

    // ---- responsive scaling -------------------------------------------
    function applyScale() {
        let scale = uiPrefs.uiScale || 1.0;
        if (uiPrefs.autoScale) {
            // fit relative to a 1080p reference, clamped
            const fit = (window.innerHeight || 1080) / 1080;
            scale = fit * (uiPrefs.uiScale || 1.0);
        }
        if (!isFinite(scale) || scale <= 0) scale = 1.0;
        scale = Math.max(uiPrefs.minScale || 0.6, Math.min(uiPrefs.maxScale || 1.6, scale));
        document.documentElement.style.setProperty('--ui-scale', scale.toFixed(3));
    }
    window.addEventListener('resize', applyScale);

    // ---- reduced motion -----------------------------------------------
    function prefersReducedMotionOS() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    function applyReducedMotion(forced) {
        const on = forced || prefersReducedMotionOS();
        app.classList.toggle('reduced-motion', !!on);
        return on;
    }

    // ---- sound design (asset-free, synthesized via WebAudio) ----------
    const Sound = (function () {
        let ctx = null;
        function ac() {
            if (!ctx) {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (AC) ctx = new AC();
            }
            if (ctx && ctx.state === 'suspended') ctx.resume();
            return ctx;
        }
        // a soft, short tone with an eased envelope
        function tone(freq, dur, type, peak) {
            if (!uiPrefs.sounds || !uiPrefs.sounds.enabled) return;
            if (uiPrefs.reducedMotion) return; // treat as part of "motion"
            const c = ac();
            if (!c) return;
            const vol = (uiPrefs.sounds.volume != null ? uiPrefs.sounds.volume : 0.35);
            const t0 = c.currentTime;
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = type || 'sine';
            osc.frequency.setValueAtTime(freq, t0);
            gain.gain.setValueAtTime(0.0001, t0);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, (peak || 0.2) * vol), t0 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            osc.connect(gain).connect(c.destination);
            osc.start(t0);
            osc.stop(t0 + dur + 0.02);
        }
        return {
            open:  function () { if (uiPrefs.sounds.open)  { tone(420, 0.16, 'sine', 0.18); setTimeout(function(){ tone(660, 0.12, 'sine', 0.14); }, 45); } },
            close: function () { if (uiPrefs.sounds.close) { tone(360, 0.14, 'sine', 0.16); } },
            chime: function () { if (uiPrefs.sounds.achievement) { tone(740, 0.14, 'sine', 0.20); setTimeout(function(){ tone(988, 0.20, 'sine', 0.18); }, 90); } },
            unlock: function () {},
        };
    })();

    // ---- animated count-up --------------------------------------------
    // setNum(node, value, formatter): tweens from the node's last numeric
    // value to the new one. Respects uiPrefs.animate / reduced motion.
    const numState = new WeakMap();
    function setNum(node, value, formatter) {
        const target = Number(value) || 0;
        const fmt = formatter || function (n) { return String(Math.round(n)); };

        if (!uiPrefs.animate || uiPrefs.reducedMotion) {
            numState.set(node, target);
            node.textContent = fmt(target);
            return;
        }

        const from = numState.has(node) ? numState.get(node) : target;
        numState.set(node, target);
        if (from === target) { node.textContent = fmt(target); return; }

        const dur = uiPrefs.countUp || 650;
        const start = performance.now();
        function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
        function frame(now) {
            const t = Math.min(1, (now - start) / dur);
            const v = from + (target - from) * easeOutCubic(t);
            node.textContent = fmt(v);
            if (t < 1) requestAnimationFrame(frame);
            else node.textContent = fmt(target);
        }
        requestAnimationFrame(frame);
    }

    // ---- apply config pushed from Lua ---------------------------------
    function applyConfig(cfg) {
        if (!cfg) return;
        if (cfg.animate       !== undefined) uiPrefs.animate = !!cfg.animate;
        if (cfg.countUp       !== undefined) uiPrefs.countUp = cfg.countUp;
        if (cfg.autoScale     !== undefined) uiPrefs.autoScale = !!cfg.autoScale;
        if (cfg.uiScale       !== undefined) uiPrefs.uiScale = cfg.uiScale;
        if (cfg.minScale      !== undefined) uiPrefs.minScale = cfg.minScale;
        if (cfg.maxScale      !== undefined) uiPrefs.maxScale = cfg.maxScale;
        if (cfg.colorblind    !== undefined) uiPrefs.colorblind = !!cfg.colorblind;
        if (cfg.sounds)                      uiPrefs.sounds = Object.assign(uiPrefs.sounds, cfg.sounds);
        if (cfg.reducedMotion !== undefined) uiPrefs.reducedMotion = !!cfg.reducedMotion;

        applyScale();
        applyRingPalette(uiPrefs.colorblind);
        uiPrefs.reducedMotion = applyReducedMotion(cfg.reducedMotion === true);
    }

    // ---- renderers ----------------------------------------------------
    function renderPlayer(p) {
        if (!p) return;

        if (p.brand)    el.brand.textContent = p.brand;
        if (p.subBrand) el.subBrand.textContent = p.subBrand;
        if (p.emoji)    el.avatarIcon.textContent = p.emoji;

        el.name.textContent  = p.name && p.name.length ? p.name : '—';
        el.id.textContent    = p.id != null ? p.id : '—';
        el.job.textContent   = p.job || '—';
        el.grade.textContent = p.grade && p.grade.length ? p.grade : '—';

        // V3: phone (only show the row when a number is available)
        if (p.phone) {
            el.phoneRow.style.display = '';
            el.phone.textContent = p.phone;
        } else {
            el.phoneRow.style.display = 'none';
        }

        setNum(el.cash, p.cash, formatMoney);
        setNum(el.bank, p.bank, formatMoney);
        el.session.textContent = p.session || '0h 00m';

        if (p.groupKey) app.dataset.group = p.groupKey;
        if (p.accent)   setAccent(p.accent);

        setRing('health', p.health);
        setRing('armor',  p.armor);
        setRing('hunger', p.hunger);
        setRing('thirst', p.thirst);

        // V2 ---------------------------------------------------------
        setPed(p.pedReady);

        if (p.wagePerHour !== undefined && p.wagePerHour !== null) {
            el.stats2.style.display = '';
            setNum(el.wage, p.wagePerHour, formatMoney);
            el.weekly.textContent = p.weekly || '0h 00m';
        } else {
            el.stats2.style.display = 'none';
        }

        renderAchievements(p.achievements);
        app.classList.remove('card-loading');
    }

    function setPed(ready) {
        if (!el.avatar) return;
        el.avatar.classList.toggle('ped-active', !!ready);
    }

    function renderAchievements(list) {
        if (!list || !list.length) {
            el.achWrap.style.display = 'none';
            return;
        }
        el.achWrap.style.display = '';

        let got = 0;
        el.achGrid.innerHTML = '';
        list.forEach(function (a) {
            if (a.unlocked) got++;
            const cell = document.createElement('div');
            cell.className = 'ach' + (a.unlocked ? ' unlocked' : '');
            cell.textContent = a.emoji || '🏆';
            cell.setAttribute('data-tip', (a.label || '') + (a.desc ? ' — ' + a.desc : ''));
            el.achGrid.appendChild(cell);
        });
        el.achCount.textContent = got + '/' + list.length;
    }

    let toastTimer = null;
    function showToast(data) {
        if (!el.toast) return;
        el.toastEmoji.textContent = data.emoji || '🏆';
        el.toastLabel.textContent = data.label || 'Unlocked';
        el.toast.classList.add('show');
        Sound.chime();
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            el.toast.classList.remove('show');
        }, 3800);
    }

    function renderOnline(data) {
        if (!data) return;
        el.onlineTotal.classList.remove('sk-text');
        setNum(el.onlineTotal, data.total != null ? data.total : 0);
        el.ping.textContent = (data.ping != null ? data.ping : 0) + 'ms';

        el.online.innerHTML = '';
        (data.groups || []).forEach(function (g, i) {
            const li = document.createElement('li');
            li.className = 'online__row';
            li.style.setProperty('--row-color', g.color);
            li.style.animationDelay = (i * 0.05) + 's';

            const emoji = document.createElement('span');
            emoji.className = 'online__emoji';
            emoji.textContent = g.emoji || '•';

            const label = document.createElement('span');
            label.className = 'online__label';
            label.textContent = g.label;

            const count = document.createElement('span');
            count.className = 'online__count';
            count.textContent = g.count;

            li.appendChild(emoji);
            li.appendChild(label);
            li.appendChild(count);
            el.online.appendChild(li);
        });
    }

    function setVoice(talking) {
        el.voice.classList.toggle('talking', !!talking);
    }

    // ---- skeleton / shimmer loading -----------------------------------
    function showOnlineSkeleton(rows) {
        el.online.innerHTML = '';
        const n = rows || 4;
        for (let i = 0; i < n; i++) {
            const li = document.createElement('li');
            li.className = 'online__row online__row--skeleton';
            li.innerHTML =
                '<span class="sk sk--dot"></span>' +
                '<span class="sk sk--label"></span>' +
                '<span class="sk sk--count"></span>';
            el.online.appendChild(li);
        }
        el.onlineTotal.classList.add('sk-text');
    }

    // ---- V3: faction / business panel ---------------------------------
    function renderSociety(data) {
        if (!data || !data.show) {
            el.society.style.display = 'none';
            return;
        }
        el.society.style.display = '';

        el.societyEmoji.textContent = data.emoji || '🛡';
        el.societyTitle.textContent = data.title || 'FACTION';
        el.societyName.textContent  = data.jobLabel || '—';
        el.societyMembers.textContent = data.members != null ? data.members : 0;
        el.societyGrade.textContent = data.grade || '—';
        el.societyBoss.style.display = data.isBoss ? '' : 'none';

        if (data.balance !== undefined && data.balance !== null) {
            el.societyBalanceRow.style.display = '';
            setNum(el.societyBalance, data.balance, formatMoney);
        } else if (data.balanceHidden) {
            el.societyBalanceRow.style.display = '';
            el.societyBalance.textContent = '••••••';
        } else {
            el.societyBalanceRow.style.display = 'none';
        }

        // subtle entrance (skipped under reduced motion via CSS)
        el.society.classList.remove('society--in');
        void el.society.offsetWidth; // restart animation
        el.society.classList.add('society--in');
    }

    function setVisible(visible) {
        app.classList.toggle('visible', !!visible);
        if (visible) {
            app.classList.add('card-loading');
            showOnlineSkeleton();
            Sound.open();
        } else {
            setVoice(false);
            Sound.close();
        }
    }

    // ---- message bus --------------------------------------------------
    window.addEventListener('message', function (event) {
        const msg = event.data || {};
        switch (msg.action) {
            case 'visibility':  setVisible(msg.visible); break;
            case 'update':      renderPlayer(msg.player); break;
            case 'online':      renderOnline(msg); break;
            case 'voice':       setVoice(msg.talking); break;
            case 'ped':         setPed(msg.ready); break;
            case 'achievement': showToast(msg); break;
            case 'society':     renderSociety(msg); break;
            case 'config':      applyConfig(msg); break;
        }
    });

    // ---- boot ---------------------------------------------------------
    buildRings();
    applyScale();
    applyReducedMotion(false);
    applyRingPalette(false);

    // browser-preview helper (ignored inside FiveM): ?preview=1
    if (location.search.indexOf('preview') !== -1) {
        applyConfig({ animate: true, autoScale: true, uiScale: 1.0,
            sounds: { enabled: true, volume: 0.3 } });
        window.__ach = [
                { id: 'rookie',     label: 'Rookie',      emoji: '🆕', desc: 'Spend 1 hour this week',     unlocked: true },
                { id: 'marathon',   label: 'Marathoner',  emoji: '🔥', desc: 'Play a 3h+ session',         unlocked: true },
                { id: 'grinder',    label: 'Grinder',     emoji: '⏰', desc: 'Play 10 hours this week',     unlocked: true },
                { id: 'saver',      label: 'Saver',       emoji: '🪙', desc: 'Hold 100k in the bank',       unlocked: true },
                { id: 'millionaire',label: 'Millionaire', emoji: '💰', desc: 'Reach 1,000,000 in the bank', unlocked: true },
                { id: 'lifesaver',  label: 'Lifesaver',   emoji: '🚑', desc: 'Serve as EMS',                unlocked: false },
                { id: 'on_duty',    label: 'On Duty',     emoji: '👮', desc: 'Serve as Police',             unlocked: false },
                { id: 'wrench',     label: 'Wrench Hand', emoji: '🔧', desc: 'Work as a Mechanic',          unlocked: true },
        ];
        renderPlayer({
            brand: 'HEXNEY', subBrand: 'CITIZEN', name: 'John Doe', id: 17,
            job: 'Mechanic', grade: 'Senior', groupKey: 'mechanic',
            accent: '#f59e0b', emoji: '🔧', cash: 125000, bank: 2550000,
            health: 88, armor: 60, hunger: 74, thirst: 52, session: '3h 12m',
            pedReady: false, weekly: '12h 30m', wagePerHour: 18500,
            phone: '555-0182',
            achievements: window.__ach,
        });
        renderOnline({
            total: 90, ping: 28,
            groups: [
                { key: 'police',   label: 'Police',   emoji: '👮', color: '#3b82f6', count: 6 },
                { key: 'ems',      label: 'EMS',      emoji: '🚑', color: '#ef4444', count: 2 },
                { key: 'mechanic', label: 'Mechanic', emoji: '🔧', color: '#f59e0b', count: 4 },
                { key: 'civil',    label: 'Civilian', emoji: '🧑', color: '#e5e7eb', count: 78 },
            ],
        });
        renderSociety({
            show: true, kind: 'business', title: 'BUSINESS', emoji: '🏢',
            jobLabel: 'Los Santos Customs', grade: 'Senior', members: 4,
            balance: 842500, isBoss: true,
        });
        setVisible(true);

        // showcase loop for clean GIF/MP4 capture: animates the count-up,
        // refreshes the online panel, and pops an achievement toast.
        let tick = 0;
        setInterval(function () {
            tick++;
            const cash = 125000 + (tick % 4) * 47250;
            const bank = 2550000 + (tick % 3) * 318000;
            renderPlayer({
                brand: 'HEXNEY', subBrand: 'CITIZEN', name: 'John Doe', id: 17,
                job: 'Mechanic', grade: 'Senior', groupKey: 'mechanic',
                accent: '#f59e0b', emoji: '🔧', cash: cash, bank: bank,
                health: 80 + (tick % 5) * 4, armor: 50 + (tick % 6) * 8,
                hunger: 60 + (tick % 4) * 9, thirst: 45 + (tick % 5) * 10,
                session: '3h ' + (10 + tick % 50) + 'm',
                pedReady: false, weekly: '12h 30m', wagePerHour: 16000 + (tick % 4) * 2200,
                phone: '555-0182',
                achievements: window.__ach,
            });
            renderOnline({
                total: 86 + (tick % 9), ping: 22 + (tick % 12),
                groups: [
                    { key: 'police',   label: 'Police',   emoji: '👮', color: '#3b82f6', count: 5 + (tick % 3) },
                    { key: 'ems',      label: 'EMS',      emoji: '🚑', color: '#ef4444', count: 2 + (tick % 2) },
                    { key: 'mechanic', label: 'Mechanic', emoji: '🔧', color: '#f59e0b', count: 4 },
                    { key: 'civil',    label: 'Civilian', emoji: '🧑', color: '#e5e7eb', count: 75 + (tick % 6) },
                ],
            });
            renderSociety({
                show: true, kind: 'business', title: 'BUSINESS', emoji: '🏢',
                jobLabel: 'Los Santos Customs', grade: 'Senior',
                members: 4 + (tick % 2), balance: 842500 + (tick % 5) * 51000, isBoss: true,
            });
            if (tick % 3 === 0) {
                showToast({ emoji: '🔥', label: 'Marathoner' });
            }
        }, 2600);
    }
})();
