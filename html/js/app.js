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

    // which rings exist + their semantic colors
    const RINGS = [
        { key: 'health', label: 'HP',     color: '#22c55e' },
        { key: 'armor',  label: 'ARMOR',  color: '#3b82f6' },
        { key: 'hunger', label: 'HUNGER', color: '#f59e0b' },
        { key: 'thirst', label: 'THIRST', color: '#38bdf8' },
    ];
    const ringNodes = {}; // key -> { wrap, fg, text }

    function buildRings() {
        const ns = 'http://www.w3.org/2000/svg';
        RINGS.forEach(function (r) {
            const wrap = document.createElement('div');
            wrap.className = 'ring';
            wrap.dataset.key = r.key;

            const svg = document.createElementNS(ns, 'svg');
            svg.setAttribute('class', 'ring__svg');
            svg.setAttribute('viewBox', '0 0 58 58');

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

        el.cash.textContent    = formatMoney(p.cash);
        el.bank.textContent    = formatMoney(p.bank);
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
            el.wage.textContent   = formatMoney(p.wagePerHour);
            el.weekly.textContent = p.weekly || '0h 00m';
        } else {
            el.stats2.style.display = 'none';
        }

        renderAchievements(p.achievements);
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
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            el.toast.classList.remove('show');
        }, 3800);
    }

    function renderOnline(data) {
        if (!data) return;
        el.onlineTotal.textContent = data.total != null ? data.total : 0;
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
            el.societyBalance.textContent = formatMoney(data.balance);
        } else if (data.balanceHidden) {
            el.societyBalanceRow.style.display = '';
            el.societyBalance.textContent = '••••••';
        } else {
            el.societyBalanceRow.style.display = 'none';
        }
    }

    function setVisible(visible) {
        app.classList.toggle('visible', !!visible);
        if (!visible) setVoice(false);
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
        }
    });

    // ---- boot ---------------------------------------------------------
    buildRings();

    // browser-preview helper (ignored inside FiveM): ?preview=1
    if (location.search.indexOf('preview') !== -1) {
        renderPlayer({
            brand: 'HEXNEY', subBrand: 'CITIZEN', name: 'John Doe', id: 17,
            job: 'Mechanic', grade: 'Senior', groupKey: 'mechanic',
            accent: '#f59e0b', emoji: '🔧', cash: 125000, bank: 2550000,
            health: 88, armor: 60, hunger: 74, thirst: 52, session: '3h 12m',
            pedReady: false, weekly: '12h 30m', wagePerHour: 18500,
            phone: '555-0182',
            achievements: [
                { id: 'rookie',     label: 'Rookie',      emoji: '🆕', desc: 'Spend 1 hour this week',     unlocked: true },
                { id: 'marathon',   label: 'Marathoner',  emoji: '🔥', desc: 'Play a 3h+ session',         unlocked: true },
                { id: 'grinder',    label: 'Grinder',     emoji: '⏰', desc: 'Play 10 hours this week',     unlocked: true },
                { id: 'saver',      label: 'Saver',       emoji: '🪙', desc: 'Hold 100k in the bank',       unlocked: true },
                { id: 'millionaire',label: 'Millionaire', emoji: '💰', desc: 'Reach 1,000,000 in the bank', unlocked: true },
                { id: 'lifesaver',  label: 'Lifesaver',   emoji: '🚑', desc: 'Serve as EMS',                unlocked: false },
                { id: 'on_duty',    label: 'On Duty',     emoji: '👮', desc: 'Serve as Police',             unlocked: false },
                { id: 'wrench',     label: 'Wrench Hand', emoji: '🔧', desc: 'Work as a Mechanic',          unlocked: true },
            ],
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
    }
})();
