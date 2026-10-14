/* КаньонТур — interactions and scroll motion. Vanilla JS, no dependencies. */
(() => {
  'use strict';

  const doc = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const mq = (q) => window.matchMedia(q);
  const reduce = mq('(prefers-reduced-motion: reduce)');
  const fine = mq('(hover: hover) and (pointer: fine)');
  const desk = mq('(min-width: 1024px)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const motion = () => !reduce.matches;
  let vw = window.innerWidth;
  let vh = window.innerHeight;

  /* ------------------------------------------------------------ frame loop */
  const loops = new Set();
  const state = { y: window.scrollY, delta: 0, vel: 0 };
  let lastY = state.y;
  const tick = () => {
    state.y = window.scrollY;
    state.delta = state.y - lastY;
    lastY = state.y;
    state.vel = lerp(state.vel, state.delta, 0.18);
    loops.forEach((fn) => fn(state));
    requestAnimationFrame(tick);
  };

  /** Runs fn on every frame while el is near the viewport. */
  const whileVisible = (el, fn, margin = '20%') => {
    let on = false;
    const run = (s) => fn(s);
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !on) { on = true; loops.add(run); fn(state); }
      if (!e.isIntersecting && on) { on = false; loops.delete(run); }
    }, { rootMargin: `${margin} 0px` }).observe(el);
  };

  const onResize = new Set();
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      vw = window.innerWidth; vh = window.innerHeight;
      onResize.forEach((fn) => fn());
    }, 120);
  });

  /* ------------------------------------------------------------ intro */
  function intro() {
    let done = false;
    const first = !doc.classList.contains('is-repeat');
    const ready = () => {
      if (done) return;
      done = true;
      doc.classList.add('is-loaded');
      setTimeout(() => doc.classList.add('is-ready'), first ? 380 : 30);
      try { sessionStorage.setItem('ct-seen', '1'); } catch { /* private mode */ }
    };
    if (!first) return ready();
    const t0 = performance.now();
    const go = () => setTimeout(ready, Math.max(0, 1150 - (performance.now() - t0)));
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
    setTimeout(ready, 3200);
  }

  /* ------------------------------------------------------------ header */
  function header() {
    const hdr = $('[data-hdr]');
    if (!hdr) return;
    const zones = () => $$('main [data-theme="dark"], main [data-hdr-dark], footer [data-theme="dark"]');
    let list = zones();
    onResize.add(() => { list = zones(); });
    let acc = 0;
    loops.add(({ y, delta }) => {
      hdr.classList.toggle('is-scrolled', y > 60);
      if (doc.classList.contains('menu-open')) return;
      acc = Math.sign(delta) === Math.sign(acc) ? acc + delta : delta;
      if (y > 320 && acc > 24) hdr.classList.add('is-hidden');
      else if (acc < -12 || y < 120) hdr.classList.remove('is-hidden');
      if (!delta && hdr.dataset.on) return;
      const probe = 44;
      const dark = list.some((z) => {
        const r = z.getBoundingClientRect();
        return r.top <= probe && r.bottom >= probe && r.left < vw * 0.5 && r.right > 0;
      });
      const v = dark ? 'dark' : 'light';
      if (hdr.dataset.on !== v) hdr.dataset.on = v;
    });
  }

  /* ------------------------------------------------------------ dialogs (menu, booking) */
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';
  function trapFocus(panel, e) {
    if (e.key !== 'Tab') return;
    const items = $$(FOCUSABLE, panel).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function makeDialog(root, { lockClass, onOpen, onClose }) {
    let lastFocus = null;
    let timer;
    const panel = root.querySelector('[role="dialog"]');
    const api = {
      isOpen: () => root.classList.contains('is-open'),
      open(opts) {
        clearTimeout(timer);
        lastFocus = document.activeElement;
        root.hidden = false;
        doc.classList.add(lockClass);
        onOpen && onOpen(opts);
        requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-open')));
        setTimeout(() => {
          const f = panel.querySelector('[data-autofocus]') || panel.querySelector(FOCUSABLE);
          f && f.focus({ preventScroll: true });
        }, 60);
      },
      close() {
        if (!api.isOpen()) return;
        root.classList.remove('is-open');
        doc.classList.remove(lockClass);
        onClose && onClose();
        timer = setTimeout(() => { root.hidden = true; }, 650);
        lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
      },
    };
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); api.close(); }
      trapFocus(panel, e);
    });
    return api;
  }

  function menu() {
    const root = $('[data-menu]');
    if (!root) return;
    const toggles = $$('[data-menu-toggle]');
    const dlg = makeDialog(root, {
      lockClass: 'menu-open',
      onOpen: () => toggles.forEach((t) => t.setAttribute('aria-expanded', 'true')),
      onClose: () => toggles.forEach((t) => t.setAttribute('aria-expanded', 'false')),
    });
    toggles.forEach((t) => t.addEventListener('click', () => (dlg.isOpen() ? dlg.close() : dlg.open())));
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-menu-close]')) dlg.close();
      const link = e.target.closest('[data-menu-link]');
      if (link) dlg.close();
    });
    window.__menu = dlg;
  }

  /* ------------------------------------------------------------ reveal on scroll */
  function reveal() {
    $$('[data-stagger]').forEach((g) => Array.from(g.children).forEach((c, i) => c.style.setProperty('--i', i)));
    const els = $$('[data-reveal], [data-rise], [data-stagger]');
    if (!('IntersectionObserver' in window)) return els.forEach((el) => el.classList.add('is-in'));
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------ statement: words light up while scrolling */
  function words() {
    $$('[data-words]').forEach((el) => {
      const ws = $$('.sw', el);
      let shown = -1;
      whileVisible(el, () => {
        const r = el.getBoundingClientRect();
        const p = clamp((vh * 0.88 - r.top) / (r.height + vh * 0.25));
        const n = Math.round(p * ws.length * 1.08);
        if (n === shown) return;
        shown = n;
        ws.forEach((w, i) => w.classList.toggle('on', i < n));
      });
    });
  }

  /* ------------------------------------------------------------ marquees react to scroll speed */
  function marquees() {
    $$('[data-marquee]').forEach((m) => {
      const track = m.firstElementChild;
      const item = track.firstElementChild;
      const fill = () => {
        while (track.children.length < 6 && track.scrollWidth < vw * 2 + item.offsetWidth) track.appendChild(item.cloneNode(true));
      };
      fill();
      onResize.add(fill);
      const base = 0.55 * (parseFloat(m.dataset.speed) || 1);
      let x = 0, dir = -1;
      whileVisible(m, ({ vel }) => {
        if (!motion()) return;
        if (Math.abs(vel) > 0.5) dir = vel > 0 ? -1 : 1;
        x += dir * (base + Math.min(Math.abs(vel) * 0.35, 14));
        const w = item.offsetWidth;
        if (x <= -w) x += w;
        if (x > 0) x -= w;
        track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      }, '10%');
    });
  }

  /* ------------------------------------------------------------ horizontal rail pinned while scrolling (desktop) */
  function hscroll() {
    $$('[data-hscroll]').forEach((sec) => {
      const sticky = sec.firstElementChild;
      const track = $('[data-hscroll-track]', sec);
      const bar = $('[data-hscroll-bar]', sec);
      let dist = 0;
      const setup = () => {
        const pin = desk.matches && motion();
        sec.classList.toggle('is-pinned', pin);
        track.style.transform = '';
        if (!pin) { sec.style.height = ''; return; }
        dist = Math.max(0, track.scrollWidth - vw);
        sec.style.height = `${dist + vh}px`;
      };
      setup();
      onResize.add(setup);
      desk.addEventListener('change', setup);
      whileVisible(sec, () => {
        if (!sec.classList.contains('is-pinned')) return;
        const r = sec.getBoundingClientRect();
        const p = clamp(-r.top / Math.max(1, r.height - vh));
        track.style.transform = `translate3d(${(-p * dist).toFixed(1)}px,0,0)`;
        bar && bar.style.setProperty('--hp', p.toFixed(4));
      }, '0%');
      track.addEventListener('scroll', () => {
        if (sec.classList.contains('is-pinned') || !bar) return;
        bar.style.setProperty('--hp', (track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth)).toFixed(4));
      }, { passive: true });
    });
  }

  /* ------------------------------------------------------------ parallax */
  function parallax() {
    $$('[data-parallax], [data-parallax-inner]').forEach((el) => {
      const inner = el.hasAttribute('data-parallax-inner');
      const speed = parseFloat(inner ? el.dataset.parallaxInner : el.dataset.parallax) || 0.1;
      const target = inner ? el.querySelector('img') : el;
      whileVisible(el, () => {
        if (!desk.matches || !motion()) { target.style.transform = ''; return; }
        const r = el.getBoundingClientRect();
        const off = (r.top + r.height / 2 - vh / 2) * -speed;
        target.style.transform = `translate3d(0,${off.toFixed(1)}px,0)`;
      });
    });
  }

  /* ------------------------------------------------------------ film frame grows to full width */
  function expand() {
    $$('[data-expand]').forEach((el) => {
      const frame = el.firstElementChild;
      whileVisible(el, () => {
        if (!motion()) return;
        const r = frame.getBoundingClientRect();
        el.style.setProperty('--p', clamp((vh - r.top) / (vh * 0.85)).toFixed(4));
      });
      frame.addEventListener('click', (e) => {
        if (e.target.closest('[data-video], [data-lightbox-open]')) return;
        const b = $('[data-video], [data-lightbox-open]', frame);
        b && b.click();
      });
    });
  }

  /* ------------------------------------------------------------ hero: floating photo cards, trail */
  function hero() {
    const box = $('[data-hero-cards]');
    if (!box) return;
    const cards = $$('.hcard', box);
    const trail = $('.trail');
    let mx = 0, my = 0, cx = 0, cy = 0;
    window.addEventListener('mousemove', (e) => { mx = e.clientX / vw - 0.5; my = e.clientY / vh - 0.5; }, { passive: true });
    whileVisible(box.closest('section'), ({ y }) => {
      if (!motion()) return;
      const m = fine.matches && desk.matches;
      cx = lerp(cx, m ? mx : 0, 0.07);
      cy = lerp(cy, m ? my : 0, 0.07);
      cards.forEach((c) => {
        const d = parseFloat(c.dataset.depth) || 0.5;
        c.style.setProperty('--mx', `${(cx * 46 * d).toFixed(2)}px`);
        c.style.setProperty('--my', `${(cy * 34 * d - y * d * (desk.matches ? 0.22 : 0.08)).toFixed(2)}px`);
      });
      if (trail) trail.style.transform = `translate3d(0,${(y * 0.12).toFixed(1)}px,0)`;
    });
  }

  function rotator() {
    $$('[data-rotator]').forEach((el) => {
      const groups = [$$('.rot__vals b', el), $$('.rot__labels b', el)];
      let i = 0;
      const n = groups[0].length;
      setInterval(() => {
        if (document.hidden) return;
        const next = (i + 1) % n;
        groups.forEach((g) => {
          g[i].classList.remove('on'); g[i].classList.add('out');
          g[next].classList.remove('out'); g[next].classList.add('on');
          const prev = g[i];
          setTimeout(() => prev.classList.remove('out'), 800);
        });
        i = next;
      }, 2800);
    });
  }

  /* ------------------------------------------------------------ custom cursor */
  function cursor() {
    const c = $('.cursor');
    if (!c || !fine.matches) return;
    const label = $('.cursor__label', c);
    let x = vw / 2, y = vh / 2, tx = x, ty = y, seen = false;
    window.addEventListener('mousemove', (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!seen) { seen = true; x = tx; y = ty; c.classList.remove('is-hidden'); }
    }, { passive: true });
    document.addEventListener('mouseleave', () => c.classList.add('is-hidden'));
    document.addEventListener('mouseenter', () => c.classList.remove('is-hidden'));
    document.addEventListener('mouseover', (e) => {
      const t = e.target instanceof Element ? e.target : null;
      const labeled = t && t.closest('[data-cursor]');
      if (labeled) {
        label.textContent = labeled.dataset.cursor;
        c.classList.add('is-label'); c.classList.remove('is-link');
        return;
      }
      c.classList.remove('is-label');
      c.classList.toggle('is-link', !!(t && t.closest('a, button, summary, label, select, input, [role="button"]')));
    });
    c.classList.add('is-hidden');
    loops.add(() => {
      x = lerp(x, tx, 0.2); y = lerp(y, ty, 0.2);
      c.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    });
  }

  /* ------------------------------------------------------------ schedule: photo preview follows the pointer */
  function schedPreview() {
    const list = $('[data-sched]');
    if (!list) return;
    const pv = $('.sched__preview', list);
    const im = $('img', pv);
    let x = 0, y = 0, tx = 0, ty = 0, active = false;
    list.addEventListener('mousemove', (e) => {
      if (!fine.matches || !desk.matches) return;
      const r = list.getBoundingClientRect();
      const row = e.target.closest('.sched__row');
      // the photo travels with the pointer vertically, but stays in the gap between text and facts
      const act = row && $('.sched__act', row).getBoundingClientRect();
      tx = act ? act.left - r.left - pv.offsetWidth - 40 : tx;
      ty = e.clientY - r.top - pv.offsetHeight / 2;
      const src = row && $('.sched__link', row).dataset.preview;
      const onAction = e.target.closest('.sched__act .btn');
      if (src && !onAction) {
        if (!active) { x = tx; y = ty; }
        if (im.getAttribute('src') !== src) im.src = src;
        active = true; pv.classList.add('is-on');
      } else { active = false; pv.classList.remove('is-on'); }
    });
    list.addEventListener('mouseleave', () => { active = false; pv.classList.remove('is-on'); });
    whileVisible(list, () => {
      x = lerp(x, tx, 0.14); y = lerp(y, ty, 0.14);
      pv.style.setProperty('--px', `${x.toFixed(1)}px`);
      pv.style.setProperty('--py', `${y.toFixed(1)}px`);
    });
  }

  /* ------------------------------------------------------------ progress rails */
  function rails() {
    $$('[data-rail-host]').forEach((host) => {
      const bar = $('[data-rail-bar]', host);
      whileVisible(host, () => {
        const r = host.getBoundingClientRect();
        bar.style.setProperty('--rp', clamp((vh * 0.5 - r.top) / r.height).toFixed(4));
      });
    });
    const top = $('.to-top');
    if (top) {
      loops.add(({ y }) => {
        top.classList.toggle('is-on', y > vh * 0.9);
        const max = doc.scrollHeight - vh;
        top.style.setProperty('--p', clamp(y / Math.max(1, max)).toFixed(4));
      });
    }
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-to-top]')) return;
      window.scrollTo({ top: 0, behavior: motion() ? 'smooth' : 'auto' });
    });
  }

  /* ------------------------------------------------------------ accordion with height animation */
  function accordions() {
    $$('.faq__item, .day-acc').forEach((d) => {
      const sum = $('summary', d);
      const body = sum.nextElementSibling;
      let anim;
      sum.addEventListener('click', (e) => {
        if (!motion() || !body.animate) return;
        e.preventDefault();
        anim && anim.cancel();
        if (d.open) {
          anim = body.animate([{ height: `${body.offsetHeight}px` }, { height: '0px' }], { duration: 420, easing: 'cubic-bezier(.65,0,.35,1)' });
          anim.onfinish = () => { d.open = false; };
        } else {
          d.open = true;
          const h = body.offsetHeight;
          anim = body.animate([{ height: '0px' }, { height: `${h}px` }], { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' });
        }
      });
    });
  }

  /* ------------------------------------------------------------ drag to scroll (reviews, galleries) */
  function dragRails() {
    $$('[data-drag]').forEach((el) => {
      let down = false, moved = false, sx = 0, sl = 0, v = 0, lx = 0, raf;
      el.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        down = true; moved = false; sx = e.clientX; lx = e.clientX; sl = el.scrollLeft; v = 0;
        cancelAnimationFrame(raf);
      });
      window.addEventListener('pointermove', (e) => {
        if (!down) return;
        const dx = e.clientX - sx;
        if (Math.abs(dx) > 5 && !moved) { moved = true; el.classList.add('is-dragging'); }
        if (moved) { el.scrollLeft = sl - dx; v = e.clientX - lx; lx = e.clientX; }
      });
      window.addEventListener('pointerup', () => {
        if (!down) return;
        down = false;
        el.classList.remove('is-dragging');
        const glide = () => {
          if (Math.abs(v) < 0.5 || !motion()) return;
          el.scrollLeft -= v; v *= 0.94; raf = requestAnimationFrame(glide);
        };
        glide();
      });
      el.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    });
  }

  /* ------------------------------------------------------------ lightbox */
  function lightbox() {
    let root, img, count, items = [], i = 0, lastFocus;
    const build = () => {
      root = document.createElement('div');
      root.className = 'lb';
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-label', 'Просмотр фото');
      root.innerHTML = `<figure class="lb__fig"><img class="lb__img" alt=""></figure><span class="lb__count"></span>
        <button class="lb__btn lb__close" type="button" aria-label="Закрыть"><svg class="i"><use href="#i-close"/></svg></button>
        <button class="lb__btn lb__prev" type="button" aria-label="Предыдущее фото"><svg class="i"><use href="#i-arrow"/></svg></button>
        <button class="lb__btn lb__next" type="button" aria-label="Следующее фото"><svg class="i"><use href="#i-arrow"/></svg></button>`;
      img = $('.lb__img', root); count = $('.lb__count', root);
      $('.lb__close', root).onclick = close;
      $('.lb__prev', root).onclick = () => show(i - 1);
      $('.lb__next', root).onclick = () => show(i + 1);
      root.addEventListener('click', (e) => { if (e.target === root || e.target.classList.contains('lb__fig')) close(); });
      root.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowLeft') show(i - 1);
        if (e.key === 'ArrowRight') show(i + 1);
        trapFocus(root, e);
      });
      let sx = null;
      root.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
      root.addEventListener('touchend', (e) => {
        if (sx === null) return;
        const dx = e.changedTouches[0].clientX - sx;
        if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1));
        sx = null;
      });
      document.body.appendChild(root);
    };
    const show = (n) => {
      i = (n + items.length) % items.length;
      img.classList.remove('is-on');
      const src = items[i].getAttribute('href');
      const pre = new Image();
      pre.onload = () => { img.src = src; img.alt = $('img', items[i])?.alt || ''; requestAnimationFrame(() => img.classList.add('is-on')); };
      pre.src = src;
      count.textContent = `${i + 1} / ${items.length}`;
      [i + 1, i - 1].forEach((k) => { const a = items[(k + items.length) % items.length]; if (a) new Image().src = a.getAttribute('href'); });
    };
    function close() {
      root.classList.remove('is-open');
      doc.classList.remove('modal-open');
      setTimeout(() => { root.hidden = true; }, 350);
      lastFocus && lastFocus.focus({ preventScroll: true });
    }
    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-lightbox-open]');
      if (opener) {
        const firstItem = $(`a[data-lightbox="${opener.dataset.lightboxOpen}"]`);
        if (firstItem) firstItem.click();
        return;
      }
      const a = e.target.closest('a[data-lightbox]');
      if (!a || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      if (!root) build();
      items = $$(`a[data-lightbox="${a.dataset.lightbox}"]`);
      lastFocus = a;
      root.hidden = false;
      doc.classList.add('modal-open');
      show(items.indexOf(a));
      requestAnimationFrame(() => root.classList.add('is-open'));
      $('.lb__close', root).focus({ preventScroll: true });
    });
  }

  /* ------------------------------------------------------------ YouTube in a modal (loaded only on click) */
  function videos() {
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-video]');
      if (!b) return;
      e.preventDefault();
      const id = b.dataset.video;
      const last = b;
      const root = document.createElement('div');
      root.className = 'vmodal';
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-label', 'Видео');
      root.innerHTML = `<div class="vmodal__frame"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0" title="Видео" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>
        <button class="vmodal__close" type="button" aria-label="Закрыть видео"><svg class="i"><use href="#i-close"/></svg></button>`;
      const close = () => {
        root.classList.remove('is-open');
        doc.classList.remove('modal-open');
        setTimeout(() => root.remove(), 350);
        last.focus({ preventScroll: true });
      };
      root.addEventListener('click', (ev) => { if (ev.target === root || ev.target.closest('.vmodal__close')) close(); });
      root.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') close(); trapFocus(root, ev); });
      document.body.appendChild(root);
      doc.classList.add('modal-open');
      requestAnimationFrame(() => root.classList.add('is-open'));
      $('.vmodal__close', root).focus({ preventScroll: true });
    });
  }

  /* ------------------------------------------------------------ booking modal + lead forms */
  let TOURS = [];
  try { TOURS = JSON.parse($('#tours-data').textContent); } catch { /* no data */ }

  function fillDates(form, slug) {
    const field = $('[data-dates-field]', form);
    const note = $('[data-dates-note]', form);
    if (!field) return;
    const sel = $('select', field);
    const t = TOURS.find((x) => x.slug === slug);
    const groups = (t && t.dates && t.dates.groups) || [];
    sel.innerHTML = '';
    groups.forEach((g) => {
      if (!g.dates.length) { sel.add(new Option(g.month, g.month)); return; }
      const og = document.createElement('optgroup');
      og.label = g.month;
      g.dates.forEach((dd) => og.appendChild(new Option(dd, `${dd} (${g.month})`)));
      sel.appendChild(og);
    });
    if (groups.length) sel.add(new Option('Ещё выбираю дату', ''));
    field.hidden = !groups.length;
    const msg = t && t.dates && t.dates.note;
    note.hidden = !msg;
    note.textContent = msg ? `${msg}. Оставьте заявку — менеджер расскажет о ближайших датах.` : '';
  }

  function booking() {
    const root = $('[data-modal="booking"]');
    if (!root) return;
    const form = $('form', root);
    const select = $('[data-tour-select]', form);
    const dlg = makeDialog(root, {
      lockClass: 'modal-open',
      onOpen: (slug) => {
        const pageTour = document.body.dataset.tour;
        const s = typeof slug === 'string' && slug ? slug : pageTour || '';
        if (select) { select.value = TOURS.some((t) => t.slug === s) ? s : ''; fillDates(form, select.value); }
      },
    });
    select && select.addEventListener('change', () => fillDates(form, select.value));
    root.addEventListener('click', (e) => { if (e.target.closest('[data-modal-close]')) dlg.close(); });
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-book]');
      if (!b) return;
      e.preventDefault();
      if (window.__menu && window.__menu.isOpen()) window.__menu.close();
      setTimeout(() => dlg.open(b.dataset.book), window.__menu && window.__menu.isOpen() ? 300 : 0);
    });
  }

  const digits = (s) => String(s || '').replace(/\D/g, '');
  function formatPhone(v) {
    let d = digits(v);
    if (!d) return '';
    if (d[0] === '8') d = `7${d.slice(1)}`;
    if (d[0] === '9') d = `7${d}`;
    if (d[0] !== '7') return `+${d.slice(0, 15)}`;
    d = d.slice(1, 11);
    let out = '+7';
    if (d.length) out += ` (${d.slice(0, 3)}`;
    if (d.length >= 3) out += ')';
    if (d.length > 3) out += ` ${d.slice(3, 6)}`;
    if (d.length > 6) out += `-${d.slice(6, 8)}`;
    if (d.length > 8) out += `-${d.slice(8, 10)}`;
    return out;
  }

  function forms() {
    $$('[data-phone]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const atEnd = inp.selectionStart === inp.value.length;
        inp.value = formatPhone(inp.value);
        if (atEnd) inp.setSelectionRange(inp.value.length, inp.value.length);
      });
      inp.addEventListener('blur', () => { if (digits(inp.value).length <= 1) inp.value = ''; });
    });

    $$('form[data-lead]').forEach((form) => {
      const status = $('.form__status', form);
      const setErr = (name, on) => {
        const f = form.elements[name];
        if (!f) return;
        const field = f.closest('.field');
        if (field) field.classList.toggle('is-invalid', on);
        const msg = $(`[data-err="${name}"]`, form);
        if (msg && !field) msg.classList.toggle('is-on', on);
      };
      form.addEventListener('input', (e) => { if (e.target.name) setErr(e.target.name, false); });
      form.addEventListener('change', (e) => { if (e.target.name) setErr(e.target.name, false); });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = form.elements;
        const errors = {};
        if (!f.name.value.trim()) errors.name = 1;
        const ph = digits(f.phone.value);
        if (ph.length < 11 || ph.length > 15) errors.phone = 1;
        if (f.email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value)) errors.email = 1;
        if (!f.consent.checked) errors.consent = 1;
        ['name', 'phone', 'email', 'consent'].forEach((k) => setErr(k, !!errors[k]));
        if (Object.keys(errors).length) {
          status.textContent = 'Проверьте поля формы';
          status.className = 'form__status is-error';
          const firstBad = form.elements[Object.keys(errors)[0]];
          firstBad && firstBad.focus();
          return;
        }
        const params = new URLSearchParams(location.search);
        const utm = {};
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((k) => { if (params.get(k)) utm[k] = params.get(k); });
        const payload = {
          name: f.name.value.trim(), phone: ph, email: f.email.value.trim() || undefined, consent: true,
          pageUrl: location.href, utm: Object.keys(utm).length ? utm : undefined,
        };
        if (f.tourSlug && f.tourSlug.value) payload.tourSlug = f.tourSlug.value;
        const choice = form.querySelector('input[name="tourName"]:checked');
        if (choice) payload.tourName = choice.value;
        if (f.dates && f.dates.value && !$('[data-dates-field]', form).hidden) payload.comment = `Желаемые даты: ${f.dates.value}`;
        form.classList.add('is-sending');
        status.textContent = 'Отправляем…';
        status.className = 'form__status';
        try {
          const res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (res.status === 201) {
            status.textContent = 'Заявка отправлена!';
            status.className = 'form__status is-ok';
            setTimeout(() => { location.href = '/success'; }, 500);
            return;
          }
          const data = await res.json().catch(() => ({}));
          if (res.status === 422 && data.fields) {
            Object.keys(data.fields).forEach((k) => setErr(k === 'tourSlug' ? 'name' : k, true));
            status.textContent = 'Проверьте поля формы';
          } else {
            status.textContent = 'Не получилось отправить. Позвоните нам или напишите в WhatsApp.';
          }
          status.className = 'form__status is-error';
        } catch {
          status.textContent = 'Нет связи с сервером. Позвоните нам: +7 (913) 775 79 90.';
          status.className = 'form__status is-error';
        } finally {
          form.classList.remove('is-sending');
        }
      });
    });
  }

  /* ------------------------------------------------------------ tour page: active day in the program nav */
  function programNav() {
    const nav = $('[data-days-nav]');
    if (!nav) return;
    const links = $$('a', nav);
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.remove('is-on'));
      const a = map.get(e.target.id);
      if (a) { a.classList.add('is-on'); nav.scrollTop = a.offsetTop - nav.clientHeight / 2; }
    }), { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const el = document.getElementById(id); el && io.observe(el); });
  }

  /* ------------------------------------------------------------ init */
  intro();
  header();
  menu();
  reveal();
  words();
  marquees();
  hscroll();
  parallax();
  expand();
  hero();
  rotator();
  cursor();
  schedPreview();
  rails();
  accordions();
  dragRails();
  lightbox();
  videos();
  booking();
  forms();
  programNav();
  requestAnimationFrame(tick);
})();
