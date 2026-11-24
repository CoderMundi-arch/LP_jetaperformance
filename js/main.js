/* ==========================================================================
   JETA Performance — interações principais
   Header, menu, links ativos, trilho de vídeos, lightbox, formulário e WhatsApp.
   ========================================================================== */
(function () {
  'use strict';

  var CONFIG = window.JETA || {};
  var WA = String(CONFIG.whatsapp || '').replace(/\D/g, '');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Eventos para GTM / Pixel ---------- */
  function track(event, data) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: event }, data || {}));
    } catch (e) { /* silencioso */ }
  }

  $$('[data-track]').forEach(function (el) {
    if (el.tagName === 'BUTTON' && el.type === 'submit') return;
    el.addEventListener('click', function () { track('cta_click', { cta_id: el.getAttribute('data-track') }); });
  });

  /* ---------- Ano no rodapé ---------- */
  var year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Header: vidro ao rolar, some ao descer, volta ao subir ---------- */
  var header = $('[data-header]');
  var lastY = window.scrollY;
  var ticking = false;
  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    var menuOpen = header.classList.contains('menu-open');
    if (!menuOpen && y > 480 && y > lastY + 4) header.classList.add('is-hidden');
    else if (y < lastY - 4 || y < 480) header.classList.remove('is-hidden');
    lastY = y;
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();
  header.addEventListener('focusin', function () { header.classList.remove('is-hidden'); });

  /* ---------- Menu mobile ---------- */
  var toggle = $('[data-menu-toggle]');
  var menu = $('#menu');
  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
    document.body.classList.toggle('is-locked', open);
    if (open) header.classList.remove('is-hidden');
  }
  toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
  $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 1025px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });

  /* ---------- Link ativo no menu conforme a seção ---------- */
  var navLinks = $$('.nav__list a[href^="#"]:not(.btn)');
  if ('IntersectionObserver' in window) {
    var map = {};
    navLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) {
          navLinks.forEach(function (a) { a.classList.remove('is-active'); });
          map[en.target.id].classList.add('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) navIO.observe(s); });
  }

  /* ---------- Trilho de vídeos ---------- */
  var rail = $('[data-rail]');
  var prev = $('[data-rail-prev]');
  var next = $('[data-rail-next]');
  function railStep() {
    var item = rail.firstElementChild;
    var gap = parseFloat(getComputedStyle(rail).columnGap) || 20;
    return item ? item.getBoundingClientRect().width + gap : rail.clientWidth;
  }
  function railState() {
    var max = rail.scrollWidth - rail.clientWidth - 2;
    prev.disabled = rail.scrollLeft <= 2;
    next.disabled = rail.scrollLeft >= max;
  }
  if (rail) {
    prev.addEventListener('click', function () { rail.scrollBy({ left: -railStep(), behavior: 'smooth' }); });
    next.addEventListener('click', function () { rail.scrollBy({ left: railStep(), behavior: 'smooth' }); });
    rail.addEventListener('scroll', function () { window.requestAnimationFrame(railState); }, { passive: true });
    window.addEventListener('resize', railState);
    railState();
  }

  /* ---------- Lightbox (imagens e vídeos do YouTube) ---------- */
  var lb = $('[data-lightbox-root]');
  var stage = $('[data-lightbox-stage]');
  var closeBtn = $('[data-lightbox-close]');
  var lastFocus = null;

  function openLightbox(node, label) {
    lastFocus = document.activeElement;
    stage.innerHTML = '';
    stage.appendChild(node);
    lb.setAttribute('aria-label', label || 'Visualização ampliada');
    lb.hidden = false;
    document.body.classList.add('is-locked');
    closeBtn.focus();
  }
  function closeLightbox() {
    if (lb.hidden) return;
    lb.hidden = true;
    stage.innerHTML = '';
    document.body.classList.remove('is-locked');
    if (lastFocus) lastFocus.focus();
  }
  closeBtn.addEventListener('click', closeLightbox);
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target === stage) closeLightbox(); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'Tab') { e.preventDefault(); closeBtn.focus(); }
  });

  $$('[data-lightbox]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var src = btn.getAttribute('data-lightbox');
      var thumb = $('img', btn);
      var img = document.createElement('img');
      img.src = src;
      img.alt = thumb ? thumb.alt : '';
      openLightbox(img, img.alt);
    });
  });

  $$('[data-video]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-video');
      // Sem origem http(s) (arquivo aberto direto do disco) o YouTube recusa o player (erro 153): abre no YouTube
      if (!/^https?:$/.test(location.protocol)) {
        window.open('https://www.youtube.com/shorts/' + encodeURIComponent(id), '_blank', 'noopener');
        track('video_play', { video_id: id });
        return;
      }
      var wrap = document.createElement('div');
      wrap.className = 'lightbox__video';
      var iframe = document.createElement('iframe');
      // o YouTube exige o Referer (origem do site) para liberar o player embutido
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.src = 'https://www.youtube.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0&playsinline=1&modestbranding=1&enablejsapi=0&origin=' + encodeURIComponent(location.origin);
      iframe.title = btn.getAttribute('aria-label') || 'Depoimento em vídeo';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.allowFullscreen = true;
      wrap.appendChild(iframe);
      openLightbox(wrap, iframe.title);
      track('video_play', { video_id: id });
    });
  });

  /* ---------- WhatsApp flutuante ---------- */
  var waFloat = $('[data-wa-float]');
  if (WA && waFloat) {
    waFloat.href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent('Olá! Vim pelo site da JETA Performance e quero agendar meu diagnóstico gratuito.');
    waFloat.target = '_blank';
    waFloat.rel = 'noopener';
    waFloat.hidden = false;
    waFloat.addEventListener('click', function () { track('whatsapp_click', { origin: 'float' }); });
  }

  /* ==========================================================================
     POPUP DE DIAGNÓSTICO
     Todo link para #diagnostico abre o popup. Sem JS, o link leva à seção.
     ========================================================================== */
  var modal = $('#lead-modal');
  var form = $('#lead-form');
  var success = $('[data-modal-step="success"]');
  var tel = $('#f-tel');
  var statusEl = $('[data-form-status]');
  var submitBtn = $('button[type="submit"]', form);
  var submitLabel = $('.btn__label', submitBtn);
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var openerEl = null;
  var closing = false;

  function resetModal() {
    form.reset();
    form.hidden = false;
    success.hidden = true;
    setStatus('');
    $$('.has-error', form).forEach(function (f) { f.classList.remove('has-error'); });
    $$('.field__error', form).forEach(function (e) { e.textContent = ''; });
    $$('[aria-invalid]', form).forEach(function (e) { e.removeAttribute('aria-invalid'); });
  }

  function openModal(origin) {
    if (modal.open) return;
    openerEl = document.activeElement;
    resetModal();
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
    document.body.classList.add('is-locked');
    header.classList.remove('is-hidden');
    // foco no primeiro campo (no toque, só depois da animação para o teclado não pular a tela)
    var isTouch = window.matchMedia('(hover: none)').matches;
    setTimeout(function () { (isTouch ? modal : $('#f-nome')).focus({ preventScroll: true }); }, isTouch ? 0 : 60);
    track('lead_modal_open', { cta_id: origin || 'desconhecido' });
  }

  function closeModal() {
    if (!modal.open || closing) return;
    var finish = function () {
      closing = false;
      modal.classList.remove('is-closing');
      if (typeof modal.close === 'function') modal.close(); else modal.removeAttribute('open');
      document.body.classList.remove('is-locked');
      if (openerEl && openerEl.focus) openerEl.focus({ preventScroll: true });
    };
    if (reduceMotion) return finish();
    closing = true;
    modal.classList.add('is-closing');
    setTimeout(finish, 280);
  }

  // abrir: qualquer link para #diagnostico
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href="#diagnostico"]');
    if (!a) return;
    e.preventDefault();
    var menuEl = a.closest('#menu');
    if (menuEl) setMenu(false);
    openModal(a.getAttribute('data-track'));
  });

  // fechar: botão, Esc e clique fora do painel
  $$('[data-modal-close]', modal).forEach(function (b) { b.addEventListener('click', closeModal); });
  modal.addEventListener('cancel', function (e) { e.preventDefault(); closeModal(); });
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });

  // abre direto quando a URL chega com #diagnostico (ex.: link de anúncio)
  if (location.hash === '#diagnostico') setTimeout(function () { openModal('url_hash'); }, 600);

  /* ---------- Máscara (00) 00000-0000 ---------- */
  tel.addEventListener('input', function () {
    var d = tel.value.replace(/\D/g, '').slice(0, 11);
    var out = d;
    if (d.length > 2) out = '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length > 6) out = '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(-4);
    tel.value = out;
  });

  /* ---------- Validação ---------- */
  function setError(input, errId, msg) {
    var field = input.closest('.field');
    var err = document.getElementById(errId);
    field.classList.toggle('has-error', !!msg);
    if (input.setAttribute) {
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (msg) input.setAttribute('aria-describedby', errId); else input.removeAttribute('aria-describedby');
    }
    err.textContent = msg || '';
    return !msg;
  }

  function validate() {
    var ok = true;
    var nome = form.nome.value.trim();
    var digits = form.telefone.value.replace(/\D/g, '');
    var fatField = $('.field--choices', form);
    ok = setError(form.nome, 'e-nome', nome.length < 2 ? 'Digite seu nome.' : '') && ok;
    ok = setError(form.telefone, 'e-tel', (digits.length < 10 || digits.length > 11) ? 'Digite um telefone válido com DDD.' : '') && ok;
    ok = setError(fatField, 'e-fat', !form.faturamento.value ? 'Selecione a faixa de faturamento.' : '') && ok;
    return ok;
  }

  form.nome.addEventListener('blur', function () { if (form.nome.closest('.field').classList.contains('has-error')) validate(); });
  tel.addEventListener('blur', function () { if (tel.closest('.field').classList.contains('has-error')) validate(); });
  $$('input[name="faturamento"]', form).forEach(function (r) {
    r.addEventListener('change', function () { if ($('.field--choices', form).classList.contains('has-error')) validate(); });
  });

  function setStatus(msg, kind) {
    statusEl.textContent = msg;
    statusEl.className = 'form__status' + (kind ? ' is-' + kind : '');
  }

  /* ---------- Envio ----------
     Próxima etapa: integração com Google Sheets. Basta preencher window.JETA.formEndpoint
     (ex.: URL de um Web App do Google Apps Script) que o lead é enviado por POST. */
  function sendLead(lead) {
    if (!CONFIG.formEndpoint) {
      // prévia: ainda sem destino. Mostra o lead no console para conferência.
      if (window.console) console.info('[JETA] Lead (sem envio, integração pendente):', lead);
      return new Promise(function (resolve) { setTimeout(resolve, 700); });
    }
    return fetch(CONFIG.formEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(lead)
    }).then(function (r) { if (!r.ok && r.type !== 'opaque') throw new Error('HTTP ' + r.status); });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    setStatus('');
    if (!validate()) {
      submitBtn.classList.remove('is-shake');
      void submitBtn.offsetWidth;
      submitBtn.classList.add('is-shake');
      var firstErr = $('.has-error input', form);
      if (firstErr) firstErr.focus();
      return;
    }

    var lead = {
      nome: form.nome.value.trim(),
      telefone: form.telefone.value.trim(),
      faturamento: form.faturamento.value,
      origem: location.hostname || 'local',
      pagina: location.href,
      data: new Date().toISOString()
    };

    submitBtn.classList.add('is-loading');
    submitLabel.textContent = 'Enviando...';

    sendLead(lead).then(function () {
      track('generate_lead', { faturamento: lead.faturamento });
      if (typeof window.fbq === 'function') window.fbq('track', 'Lead', { content_name: 'Diagnóstico gratuito', faturamento: lead.faturamento });
      $('[data-success-name]', success).textContent = lead.nome.split(' ')[0];
      $('[data-success-phone]', success).textContent = lead.telefone;
      form.hidden = true;
      success.hidden = false;
      success.focus({ preventScroll: true });
    }).catch(function () {
      setStatus('Não conseguimos enviar agora. Tente de novo em instantes.', 'warn');
    }).then(function () {
      submitBtn.classList.remove('is-loading');
      submitLabel.textContent = 'Consultoria gratuita';
    });
  });

})();
