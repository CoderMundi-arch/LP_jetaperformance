/* ==========================================================================
   JETA Performance — movimento (GSAP + ScrollTrigger + Lenis)
   - Rolagem suave (Lenis) sincronizada com o ScrollTrigger
   - Entrada do hero com linhas subindo por máscara
   - Depoimentos em trilho horizontal fixo (desktop)
   - Frases que acendem palavra por palavra conforme a rolagem
   - Fotos com revelação por máscara e parallax
   - Cards de serviço empilhados, riscado no "Antes", marca do rodapé
   Sem GSAP ou com movimento reduzido: tudo fica visível e estático.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Faixa de prints: duplica o conjunto para o loop sem emenda ---------- */
  $$('[data-marquee]').forEach(function (row) {
    var set = row.querySelector('.prints__set');
    if (!set) return;
    var clone = set.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    var originals = $$('button', set);
    $$('button', clone).forEach(function (b, i) {
      b.tabIndex = -1;
      b.addEventListener('click', function () { originals[i].click(); });
    });
    row.appendChild(clone);
  });

  if (reduce || !window.gsap || !window.ScrollTrigger) {
    root.classList.remove('has-motion');
    return;
  }

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('has-motion');

  /* ---------- Lenis (rolagem suave) ---------- */
  var lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    root.classList.add('lenis');
    window.__lenis = lenis;

    // âncoras internas com a rolagem suave (o #diagnostico abre o popup e é tratado no main.js)
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a || e.defaultPrevented) return;
      var id = a.getAttribute('href');
      if (id === '#' || id === '#diagnostico' || id === '#conteudo') return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: id === '#inicio' ? 0 : -20, duration: 1.4 });
    });

    // trava a rolagem quando menu, popup ou lightbox estão abertos
    new MutationObserver(function () {
      if (document.body.classList.contains('is-locked')) lenis.stop(); else lenis.start();
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(function () {
      var lb = document.querySelector('[data-lightbox-root]');
      if (lb && !lb.hidden) lenis.stop(); else if (!document.body.classList.contains('is-locked')) lenis.start();
    }).observe(document.querySelector('[data-lightbox-root]'), { attributes: true, attributeFilter: ['hidden'] });
  }

  /* ---------- Utilitários de quebra de texto ---------- */
  // quebra em palavras preservando <em>/<strong>; espaços normais separam, &nbsp; mantém junto
  function toWords(el, cls) {
    var parts = [];
    (function walk(node, wrap) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          n.textContent.split(/([ \t\n\r]+)/).forEach(function (p) {
            if (!p) return;
            if (/^[ \t\n\r]+$/.test(p)) { parts.push(' '); return; }
            var s = document.createElement('span');
            s.className = cls;
            if (wrap) { var w = wrap.cloneNode(false); w.textContent = p; s.appendChild(w); }
            else s.textContent = p;
            parts.push(s);
          });
        } else if (n.nodeType === 1) {
          walk(n, n);
        }
      });
    })(el, null);
    el.textContent = '';
    parts.forEach(function (p) { el.appendChild(typeof p === 'string' ? document.createTextNode(p) : p); });
    return parts.filter(function (p) { return typeof p !== 'string'; });
  }

  // agrupa as palavras em linhas reais, cada uma com máscara
  function toLines(el) {
    var words = toWords(el, 'w');
    var lines = [];
    var current = null;
    var top = null;
    var nodes = Array.prototype.slice.call(el.childNodes);
    nodes.forEach(function (n) {
      if (n.nodeType === 3) { if (current) current.push(n); return; }
      var t = n.offsetTop;
      if (top === null || Math.abs(t - top) > 6) { current = []; lines.push(current); top = t; }
      current.push(n);
    });
    el.textContent = '';
    var inners = [];
    lines.forEach(function (l) {
      var line = document.createElement('span');
      line.className = 'split-line';
      var inner = document.createElement('span');
      inner.className = 'split-inner';
      l.forEach(function (n) { inner.appendChild(n); });
      line.appendChild(inner);
      el.appendChild(line);
      inners.push(inner);
    });
    return words.length ? inners : [];
  }

  var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();

  fontsReady.then(function () {
    var isDesktop = window.matchMedia('(min-width: 768px)').matches;

    /* ---------- Hero ---------- */
    var heroTitle = document.querySelector('.hero__title');
    var heroLines = heroTitle ? toLines(heroTitle) : [];
    if (heroTitle) heroTitle.classList.add('is-split');
    var intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
    intro
      .to('.header', { opacity: 1, duration: 1 }, 0)
      .fromTo('[data-hero-media]', { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 2.2 }, 0)
      .from(heroLines, { yPercent: 115, duration: 1.4, stagger: 0.085 }, 0.1)
      .fromTo('[data-hero-fade]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.2, stagger: 0.12 }, 0.75);

    gsap.to('[data-hero-media] img', {
      yPercent: 10, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to('.hero__inner', {
      y: -60, opacity: 0.2, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: '40% top', end: 'bottom top', scrub: true }
    });

    /* ---------- Títulos com linhas subindo ---------- */
    $$('[data-split]').forEach(function (el) {
      if (el === heroTitle) return;
      var lines = toLines(el);
      gsap.from(lines, {
        yPercent: 115, duration: 1.3, ease: 'expo.out', stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top 86%' }
      });
    });

    /* ---------- Revelar textos e botões ---------- */
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 90%',
      onEnter: function (batch) {
        gsap.fromTo(batch, { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.1, overwrite: true });
      }
    });

    /* ---------- Depoimentos: trilho horizontal fixo ---------- */
    var mm = gsap.matchMedia();
    mm.add('(min-width: 768px)', function () {
      var section = document.querySelector('[data-hscroll]');
      var track = document.querySelector('[data-hscroll-track]');
      var bar = document.querySelector('[data-hscroll-progress]');
      if (!section || !track) return;
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      gsap.to(track, {
        x: function () { return -dist(); },
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: function () { return '+=' + dist(); },
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: function (self) { if (bar) bar.style.transform = 'scaleX(' + self.progress.toFixed(3) + ')'; }
        }
      });
      // cards entram com leve atraso entre si
      gsap.from('.video-card', {
        y: 80, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08,
        scrollTrigger: { trigger: section, start: 'top 70%' }
      });
    });

    /* ---------- Frase que acende palavra por palavra ---------- */
    var statement = document.querySelector('[data-words]');
    if (statement) {
      var sw = toWords(statement, 'word');
      var pinEl = document.querySelector('[data-words-pin]');
      mm.add('(min-width: 768px)', function () {
        gsap.fromTo(sw, { opacity: 0.12 }, {
          opacity: 1, ease: 'none', stagger: 0.12,
          scrollTrigger: { trigger: pinEl, start: 'top top', end: '+=110%', scrub: true, pin: true }
        });
      });
      mm.add('(max-width: 767px)', function () {
        gsap.fromTo(sw, { opacity: 0.12 }, {
          opacity: 1, ease: 'none', stagger: 0.12,
          scrollTrigger: { trigger: statement, start: 'top 80%', end: 'bottom 45%', scrub: true }
        });
      });
    }
    $$('[data-words-simple]').forEach(function (el) {
      var w = toWords(el, 'word');
      gsap.fromTo(w, { opacity: 0.12 }, {
        opacity: 1, ease: 'none', stagger: 0.1,
        scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 50%', scrub: true }
      });
    });

    /* ---------- 1,5 ano x 6 meses ---------- */
    gsap.from('.versus__num', {
      yPercent: 40, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: 0.15,
      scrollTrigger: { trigger: '.versus', start: 'top 80%' }
    });
    gsap.from('[data-bar]', {
      scaleX: 0, transformOrigin: 'left center', duration: 1.8, ease: 'expo.out', stagger: 0.2,
      scrollTrigger: { trigger: '.versus', start: 'top 75%' }
    });

    /* ---------- Fotos: máscara + parallax ---------- */
    $$('[data-clip]').forEach(function (fig, i) {
      gsap.fromTo(fig,
        { clipPath: 'inset(100% 0% 0% 0% round 24px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 24px)', duration: 1.6, ease: 'expo.inOut', delay: i * 0.08,
          scrollTrigger: { trigger: fig, start: 'top 88%' } });
    });
    $$('[data-parallax]').forEach(function (img) {
      var amount = parseFloat(img.getAttribute('data-parallax')) || 8;
      gsap.fromTo(img, { yPercent: amount > 0 ? -amount : 0 }, {
        yPercent: amount > 0 ? amount : amount, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    /* ---------- Serviços: cards empilhados ---------- */
    // Cards "sticky" confundem a medição do ScrollTrigger. Por isso cada card ganha um marcador
    // invisível, fora do sticky, na posição natural dele no fluxo — e é o marcador que dispara.
    var cards = $$('[data-stack]');
    var stackEl = document.querySelector('.stack');
    if (stackEl && cards.length) {
      stackEl.style.position = 'relative';
      var markers = cards.map(function () {
        var m = document.createElement('span');
        m.setAttribute('aria-hidden', 'true');
        m.style.cssText = 'position:absolute;left:0;width:1px;height:1px;pointer-events:none;';
        stackEl.appendChild(m);
        return m;
      });
      var placeMarkers = function () {
        var gap = parseFloat(getComputedStyle(stackEl).rowGap) || 0;
        var y = 0;
        cards.forEach(function (c, i) { markers[i].style.top = y + 'px'; y += c.offsetHeight + gap; });
      };
      placeMarkers();
      ScrollTrigger.addEventListener('refreshInit', placeMarkers);
      mm.add('(min-width: 768px)', function () {
        cards.forEach(function (card, i) {
          if (!cards[i + 1]) return;
          gsap.to(card, {
            scale: 0.93, filter: 'brightness(0.55)', ease: 'none',
            scrollTrigger: { trigger: markers[i + 1], start: 'top 70%', end: 'top 15%', scrub: true }
          });
        });
      });
    }
    gsap.from('.cal span', {
      scaleY: 0, transformOrigin: 'bottom center', duration: 1.1, ease: 'expo.out', stagger: 0.05,
      scrollTrigger: { trigger: '.cal', start: 'top 85%' }
    });
    // 01: janela da reunião entra, funil se forma e um lead percorre o CRM até virar venda
    var crmIntro = gsap.timeline({ scrollTrigger: { trigger: '.stack__visual--crm', start: 'top 80%' }, defaults: { ease: 'expo.out' } });
    crmIntro.from('.meet', { y: 50, opacity: 0, duration: 1.2 })
      .from('.funnel__step', { scaleX: 0, opacity: 0, duration: 0.9, stagger: 0.12 }, 0.3)
      .from('.crm__col', { y: 16, opacity: 0, duration: 0.8, stagger: 0.08 }, 0.4);
    var mover = document.querySelector('[data-crm-move]');
    if (mover) {
      var step = function () {
        var col = mover.parentElement;
        var gap = parseFloat(getComputedStyle(col.parentElement).columnGap) || 6;
        return col.offsetWidth + gap;
      };
      gsap.timeline({ repeat: -1, repeatDelay: 0.8, delay: 2, defaults: { duration: 0.7, ease: 'power3.inOut' },
        scrollTrigger: { trigger: '.stack__visual--crm', start: 'top 80%', toggleActions: 'play pause resume pause' } })
        .to(mover, { x: function () { return step(); } }, '+=0.6')
        .to(mover, { x: function () { return step() * 2; } }, '+=0.6')
        .to(mover, { scale: 1.08, duration: 0.25, yoyo: true, repeat: 1, ease: 'power1.inOut' })
        .to(mover, { opacity: 0, duration: 0.4 }, '+=0.5')
        .set(mover, { x: 0 })
        .to(mover, { opacity: 1, duration: 0.4 });
    }

    // 02: celular sobe, criativos de trás abrem em leque, métricas flutuam
    var ad = gsap.timeline({ scrollTrigger: { trigger: '.stack__visual--ad', start: 'top 80%' }, defaults: { ease: 'expo.out' } });
    ad.from('.phone', { y: 80, opacity: 0, duration: 1.2 })
      .from('.ad-stack__back', { rotate: 0, x: 0, opacity: 0, duration: 1.2, stagger: 0.08 }, 0.15)
      .from('.stack__visual--ad .chip', { y: 24, opacity: 0, duration: 1, stagger: 0.15 }, 0.5);
    gsap.to('.chip--a', { y: -10, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to('.chip--b', { y: 10, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1 });

    // 04: etapas do script e mensagens entram em sequência
    var team = gsap.timeline({ scrollTrigger: { trigger: '.stack__visual--team', start: 'top 80%' }, defaults: { ease: 'expo.out' } });
    team.from('.script li', { x: -16, opacity: 0, duration: 0.8, stagger: 0.12 })
      .from('.chat__msg', { y: 14, opacity: 0, scale: 0.96, transformOrigin: 'left bottom', duration: 0.7, stagger: 0.35 }, 0.2)
      .from('.chip--sale', { y: -12, opacity: 0, scale: 0.9, duration: 0.8 }, '-=0.2');

    /* ---------- Antes riscado, Depois acendendo ---------- */
    $$('[data-strike] span').forEach(function (s) {
      gsap.fromTo(s, { '--strike': '0%' }, {
        '--strike': '100%', ease: 'none',
        scrollTrigger: { trigger: s, start: 'top 80%', end: 'top 55%', scrub: true }
      });
    });
    $$('[data-light]').forEach(function (li) {
      gsap.fromTo(li, { opacity: 0.15, x: -24 }, {
        opacity: 1, x: 0, ease: 'none',
        scrollTrigger: { trigger: li, start: 'top 85%', end: 'top 60%', scrub: true }
      });
    });

    /* ---------- Marca gigante no rodapé ---------- */
    gsap.from('[data-mark] span', {
      yPercent: 100, duration: 1.4, ease: 'expo.out', stagger: 0.07,
      scrollTrigger: { trigger: '.footer', start: 'top 90%' }
    });

    /* ---------- Cursor contextual + botões magnéticos (só mouse) ---------- */
    if (finePointer) {
      root.classList.add('has-cursor');
      var cursor = document.querySelector('[data-cursor-el]');
      var label = document.querySelector('[data-cursor-label]');
      var xTo = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3' });
      var yTo = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3' });
      window.addEventListener('pointermove', function (e) { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
      $$('[data-cursor]').forEach(function (el) {
        el.addEventListener('pointerenter', function () { label.textContent = el.getAttribute('data-cursor'); cursor.classList.add('is-on'); });
        el.addEventListener('pointerleave', function () { cursor.classList.remove('is-on'); });
      });

      $$('[data-magnetic]').forEach(function (btn) {
        var bx = gsap.quickTo(btn, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
        var by = gsap.quickTo(btn, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
        btn.addEventListener('pointermove', function (e) {
          var r = btn.getBoundingClientRect();
          bx((e.clientX - r.left - r.width / 2) * 0.22);
          by((e.clientY - r.top - r.height / 2) * 0.3);
        });
        btn.addEventListener('pointerleave', function () { bx(0); by(0); });
      });
    }

    // recalcula depois que imagens carregam (alturas mudam)
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    ScrollTrigger.refresh();
  });
})();
