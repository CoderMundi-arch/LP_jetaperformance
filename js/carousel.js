/* Carrosséis de arrastar (só no celular, via CSS): pontos de navegação sincronizados com o scroll */
(function () {
  'use strict';
  var mq = window.matchMedia('(max-width: 767px)');
  document.querySelectorAll('[data-carousel]').forEach(function (track) {
    var slides = Array.prototype.slice.call(track.children);
    if (slides.length < 2) return;
    var dots = document.createElement('div');
    dots.className = 'carousel-dots';
    dots.setAttribute('role', 'group');
    dots.setAttribute('aria-label', 'Navegação: ' + (track.getAttribute('aria-label') || 'carrossel'));
    var buttons = slides.map(function (slide, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Ir para o item ' + (i + 1) + ' de ' + slides.length);
      b.addEventListener('click', function () {
        track.scrollTo({ left: slide.offsetLeft - track.offsetLeft - parseFloat(getComputedStyle(track).scrollPaddingLeft || 0), behavior: 'smooth' });
      });
      dots.appendChild(b);
      return b;
    });
    track.insertAdjacentElement('afterend', dots);

    var current = -1;
    function update() {
      if (!mq.matches) return;
      var max = track.scrollWidth - track.clientWidth;
      var idx = max <= 0 ? 0 : Math.round((track.scrollLeft / max) * (slides.length - 1));
      if (idx === current) return;
      current = idx;
      buttons.forEach(function (b, i) { b.setAttribute('aria-current', i === idx ? 'true' : 'false'); });
    }
    var raf = 0;
    track.addEventListener('scroll', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  });
})();
