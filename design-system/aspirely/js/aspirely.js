/* Aspirely design book · shared behavior.
   Theme is carried in the URL (?theme=dark) so the screens work
   identically standalone and inside the design-book iframes. */

(function () {
  'use strict';

  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- theme ------------------------------------------------- */
  var theme = new URLSearchParams(location.search).get('theme') === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);

  function toggleTheme() {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    var u = new URL(location.href);
    u.searchParams.set('theme', next);
    history.replaceState(null, '', u);
    document.querySelectorAll('[data-theme-label]').forEach(function (el) {
      el.textContent = next === 'dark' ? 'paper' : 'ink';
    });
  }

  /* ---- scroll reveal with 40ms stagger ----------------------- */
  function initReveal() {
    var nodes = document.querySelectorAll('[data-reveal]');
    if (reduced) { nodes.forEach(function (n) { n.classList.add('is-in'); }); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var group = e.target.closest('[data-stagger]');
        var delay = 0;
        if (group) {
          var sibs = Array.prototype.slice.call(group.querySelectorAll('[data-reveal]'));
          delay = Math.min(sibs.indexOf(e.target), 12) * 40;
        }
        e.target.style.setProperty('--d', delay + 'ms');
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ---- count-up for match percentages ------------------------ */
  function countUp(el) {
    var to = parseFloat(el.dataset.count);
    if (reduced) { el.textContent = to; return; }
    var t0 = null, dur = 1100;
    function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function initCounters() {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        countUp(e.target);
        var ring = e.target.closest('[data-ring-host]');
        if (ring) {
          var arc = ring.querySelector('.arc');
          if (arc) {
            var len = arc.getTotalLength();
            arc.style.strokeDasharray = len;
            arc.style.strokeDashoffset = len * (1 - parseFloat(e.target.dataset.count) / 100);
          }
        }
        io.unobserve(e.target);
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('[data-count]').forEach(function (n) {
      var arc = n.closest('[data-ring-host]') && n.closest('[data-ring-host]').querySelector('.arc');
      if (arc) { var l = arc.getTotalLength(); arc.style.strokeDasharray = l; arc.style.strokeDashoffset = l; }
      io.observe(n);
    });
  }

  /* ---- faq accordion ----------------------------------------- */
  function initFaq() {
    document.querySelectorAll('.faq-q').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.faq-item');
        var open = item.getAttribute('open-state') === '1';
        item.setAttribute('open-state', open ? '0' : '1');
        btn.setAttribute('aria-expanded', String(!open));
      });
    });
  }

  /* ---- scroll-locked ribbon (landing "one pass" section) ----- */
  function initRibbon() {
    var host = document.querySelector('[data-ribbon]');
    if (!host) return;
    var steps = host.querySelectorAll('[data-step]');
    var panels = host.querySelectorAll('[data-panel]');
    var labels = host.querySelectorAll('[data-ribbon-label]');

    function setActive(i) {
      labels.forEach(function (l, n) { l.setAttribute('data-on', n <= i ? '1' : '0'); });
      panels.forEach(function (p, n) { p.setAttribute('data-on', n === i ? '1' : '0'); });
    }
    setActive(0);

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) setActive(parseInt(e.target.dataset.step, 10));
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(function (s) { io.observe(s); });
  }

  /* ---- upload timeline (guest flow) -------------------------- */
  function initTimeline() {
    var tl = document.querySelector('[data-timeline]');
    if (!tl) return;
    var rows = tl.querySelectorAll('[data-stage]');
    var i = 0;
    function advance() {
      if (i >= rows.length) return;
      rows[i].setAttribute('data-on', '1');
      if (i > 0) rows[i - 1].setAttribute('data-on', 'done');
      i++;
      setTimeout(advance, i === rows.length ? 0 : 1400);
    }
    setTimeout(advance, 600);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-toggle-theme]').forEach(function (b) {
      b.addEventListener('click', toggleTheme);
      var lbl = b.querySelector('[data-theme-label]');
      if (lbl) lbl.textContent = theme === 'dark' ? 'paper' : 'ink';
    });
    initReveal();
    initCounters();
    initFaq();
    initRibbon();
    initTimeline();
  });
})();
