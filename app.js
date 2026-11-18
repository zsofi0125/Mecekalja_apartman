/**
 * ==============================================================================
 * Mecsekalja Apartman · Application Logic & UI Controller
 * ==============================================================================
 */

(function () {
    'use strict';

    // --------------------------------------------------------------------------
    // 1. State Management
    // --------------------------------------------------------------------------
    let td = new Date();
    td.setHours(0, 0, 0, 0);

    let vm = new Date(td.getFullYear(), td.getMonth(), 1);
    let sel = new Date(td);
    let ft = 'all';
    let ko = false;

    // --------------------------------------------------------------------------
    // 2. Helper Utilities
    // --------------------------------------------------------------------------
    const $ = id => document.getElementById(id);

    const iso = d =>
        d.getFullYear() +
        '-' +
        String(d.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(d.getDate()).padStart(2, '0');

    // --------------------------------------------------------------------------
    // 3. Language Controller
    // --------------------------------------------------------------------------
    function setL(l) {
        document.documentElement.lang = l;

        // Update all text nodes with data-i attributes
        document.querySelectorAll('[data-i]').forEach(e => {
            if (T[l] && T[l][e.dataset.i] !== undefined) {
                e.textContent = T[l][e.dataset.i];
            }
        });

        // Update top bar preview label
        const pv = $('pv');
        if (pv && T[l]) {
            pv.textContent = T[l].pv;
        }

        // Toggle active status on language selector buttons
        document.querySelectorAll('[data-l]').forEach(b => {
            b.classList.toggle('on', b.dataset.l === l);
        });

        // Re-render calendar & events widget with new language strings
        rc();
    }

    // Expose setL globally if needed
    window.setL = setL;

    // --------------------------------------------------------------------------
    // 4. Calendar & Events Widget Renderer
    // --------------------------------------------------------------------------
    function rc() {
        const l = document.documentElement.lang || 'hu';
        const u = U[l] || U.hu;
        const lc = LC[l] || LC.hu;
        const ix = 'en hu de'.split(' ').indexOf(l);

        // Section headings
        const h2e = $('h2e');
        const pe = $('pe');
        if (h2e) h2e.textContent = u.h;
        if (pe) pe.textContent = u.p;

        // Category filter chips
        const chips = $('chips');
        if (chips) {
            chips.innerHTML =
                ['all', ...Object.keys(u.t)]
                    .map(
                        k =>
                            `<button data-f="${k}" class="${ft === k ? 'on' : ''}">${k === 'all' ? u.all : u.t[k]}</button>`
                    )
                    .join('') +
                `<button data-k="1" class="${ko ? 'on' : ''}">👶 ${u.kid}</button>`;
        }

        // Calendar grid calculations
        const first = (vm.getDay() + 6) % 7;
        const n = new Date(vm.getFullYear(), vm.getMonth() + 1, 0).getDate();
        const cur = new Date(td.getFullYear(), td.getMonth(), 1);

        let g = Array.from(
            { length: 7 },
            (_, i) => `<i>${new Date(2024, 0, 1 + i).toLocaleDateString(lc, { weekday: 'short' })}</i>`
        ).join('') + '<span></span>'.repeat(first);

        for (let d = 1; d <= n; d++) {
            const x = new Date(vm.getFullYear(), vm.getMonth(), d);
            g += `<button data-d="${iso(x)}" ${x < td ? 'disabled' : ''} class="${+x == +td ? 'td ' : ''}${+x == +sel ? 'sl' : ''}">${d}</button>`;
        }

        const cal = $('cal');
        if (cal) {
            cal.innerHTML = `
                <div class="ch">
                    <button data-m="-1" ${vm <= cur ? 'disabled' : ''} aria-label="‹">‹</button>
                    <b>${vm.toLocaleDateString(lc, { month: 'long', year: 'numeric' })}</b>
                    <button data-m="1" aria-label="›">›</button>
                </div>
                <div class="cg">${g}</div>
            `;
        }

        // Program and Event filtering for selected date
        const mo = sel.getMonth() + 1;
        const k = iso(sel);

        let base = P.filter(p => p.m.includes(mo)).concat(EVENTS.filter(e => hit(e, k)));
        const doy = Math.floor((sel - new Date(sel.getFullYear(), 0, 0)) / 864e5);
        const pk = base.length ? base[doy % base.length] : null;

        let list = base.filter(p => (ft === 'all' || p.t === ft) && (!ko || p.kid));
        if (pk && list.includes(pk)) {
            list = [pk, ...list.filter(p => p !== pk)];
        }

        const dp = $('dp');
        if (dp) {
            dp.innerHTML =
                `<h3>${sel.toLocaleDateString(lc, { weekday: 'long', day: 'numeric', month: 'long' })}</h3>` +
                (list.length
                    ? list
                          .map(
                              p => `
                        <div class="pg ${p === pk ? 'pk' : ''}">
                            <div style="flex:1">
                                ${p === pk ? `<span class="pk-l">★ ${u.pick}</span>` : ''}
                                <strong>${p.d ? '📅 ' : ''}${
                                  p.u
                                      ? `<a href="${p.u}" target="_blank" rel="noopener">${p.n[ix] || p.n[0]}</a>`
                                      : p.n[ix] || p.n[0]
                              }</strong>
                                <div class="bd2">
                                    <em>${u.t[p.t]}</em>
                                    <em>📍 ~${p.km} ${u.km}</em>
                                    <em class="${p.kid ? 'k' : 'n'}">${p.kid ? '👶 ' + u.ok : X[l].no}</em>
                                </div>
                            </div>
                        </div>`
                          )
                          .join('')
                    : `<p>${u.none}</p>`) +
                `<p class="nt">${u.note} ${X[l].src}</p>`;
        }
    }

    // Expose rc globally if needed
    window.rc = rc;

    // --------------------------------------------------------------------------
    // 5. Event Listeners & Initialization
    // --------------------------------------------------------------------------
    function init() {
        // Language switcher clicks
        document.querySelectorAll('[data-l]').forEach(b => {
            b.addEventListener('click', () => setL(b.dataset.l));
        });

        // Device simulation bar (Desktop / Mobile preview toggle)
        const st = $('st');
        const bd = $('bd');
        const bm = $('bm');
        const galWrap = document.querySelector('.gal-wrap');
        let initCarouselLoop = null;

        if (galWrap) {
            const items = galWrap.querySelectorAll('.gal-item');
            let isJumping = false;
            let scrollTimer = null;

            function goToSlide(index, smooth = false) {
                if (!items[index]) return;
                galWrap.scrollTo({
                    left: items[index].offsetLeft,
                    behavior: smooth ? 'smooth' : 'instant'
                });
            }

            function checkInfiniteLoop() {
                if (isJumping) return;
                // Only run when in mobile scrollable view
                if (galWrap.scrollWidth <= galWrap.clientWidth) return;
                if (items.length < 6) return;

                const sl = galWrap.scrollLeft;
                const tolerance = 15; // px

                // Snapped to first clone (Clone of Slide 4) -> instantly jump to real Slide 4 (index 4)
                if (sl <= items[0].offsetLeft + tolerance) {
                    isJumping = true;
                    galWrap.style.scrollSnapType = 'none';
                    goToSlide(4, false);
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            galWrap.style.scrollSnapType = 'x mandatory';
                            isJumping = false;
                        });
                    });
                }
                // Snapped to last clone (Clone of Slide 1) -> instantly jump to real Slide 1 (index 1)
                else if (sl >= items[5].offsetLeft - tolerance) {
                    isJumping = true;
                    galWrap.style.scrollSnapType = 'none';
                    goToSlide(1, false);
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            galWrap.style.scrollSnapType = 'x mandatory';
                            isJumping = false;
                        });
                    });
                }
            }

            initCarouselLoop = function () {
                if (galWrap.scrollWidth > galWrap.clientWidth && items[1]) {
                    goToSlide(1, false);
                }
            };

            galWrap.addEventListener('scrollend', checkInfiniteLoop);
            galWrap.addEventListener('scroll', () => {
                clearTimeout(scrollTimer);
                scrollTimer = setTimeout(checkInfiniteLoop, 80);
            }, { passive: true });

            requestAnimationFrame(() => {
                initCarouselLoop();
            });

            window.addEventListener('resize', () => {
                clearTimeout(scrollTimer);
                scrollTimer = setTimeout(initCarouselLoop, 150);
            });
        }

        if (bd && bm && st) {
            bd.addEventListener('click', () => {
                st.classList.remove('m');
                bd.classList.add('on');
                bm.classList.remove('on');
                if (galWrap) {
                    galWrap.scrollLeft = 0;
                }
            });

            bm.addEventListener('click', () => {
                st.classList.add('m');
                bm.classList.add('on');
                bd.classList.remove('on');
                if (initCarouselLoop) {
                    requestAnimationFrame(() => {
                        initCarouselLoop();
                    });
                }
            });
        }

        // Calendar and filter clicks delegated on #events section
        const eventsSec = $('events');
        if (eventsSec) {
            eventsSec.addEventListener('click', e => {
                const b = e.target.closest('button');
                if (!b) return;

                if (b.dataset.f) {
                    ft = b.dataset.f;
                } else if (b.dataset.k) {
                    ko = !ko;
                } else if (b.dataset.m) {
                    vm = new Date(vm.getFullYear(), vm.getMonth() + +b.dataset.m, 1);
                } else if (b.dataset.d) {
                    const [y, m, d] = b.dataset.d.split('-');
                    sel = new Date(+y, m - 1, +d);
                }

                rc();
            });
        }

        // Initialize with Hungarian language as default
        setL('hu');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
