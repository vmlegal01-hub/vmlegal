/* VM Legal · Sitio — interacciones sin dependencias. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* i18n se resuelve en cada llamada, no al cargar: así no importa el orden en
     que se ejecuten los dos scripts ni cuándo quede publicado window.VMi18n. */
  function t(es) {
    return window.VMi18n ? window.VMi18n.t(es) : es;
  }
  function onLang(fn) {
    if (window.VMi18n) { window.VMi18n.onChange(fn); return; }
    document.addEventListener('DOMContentLoaded', function () {
      if (window.VMi18n) { window.VMi18n.onChange(fn); fn(); }
    });
  }

  // Equipo y Documentos se pintan desde JSON (datos.js): todo lo demás espera.
  (window.VMdatos || Promise.resolve()).then(init);
  function init() {
  // Lo pintado desde JSON llegó después de la primera traducción.
  if (window.VMi18n && window.VMi18n.lang === 'en') window.VMi18n.apply('en');

  /* ===================  Menú móvil  =================================== */
  var burger = document.getElementById('burger');
  var nav    = document.getElementById('nav');
  var scrim  = document.getElementById('navScrim');

  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', t(open ? 'Cerrar menú' : 'Abrir menú'));
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-locked', open);
    if (open) {
      scrim.hidden = false;
      requestAnimationFrame(function () { scrim.classList.add('is-on'); });
    } else {
      scrim.classList.remove('is-on');
      setTimeout(function () { scrim.hidden = true; }, 350);
    }
  }

  if (burger && nav && scrim) {
    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    scrim.addEventListener('click', function () { setMenu(false); });

    // Al elegir una sección el cajón se cierra solo.
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setMenu(false);
        burger.focus();
      }
    });
  }

  /* ===================  Sombra de la cabecera  ======================== */
  var header = document.getElementById('siteHeader');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ===================  Página actual en el menú  ==================== */
  var here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link').forEach(function (a) {
    var on = a.getAttribute('href') === here;
    a.classList.toggle('is-current', on);
    if (on) a.setAttribute('aria-current', 'page');
  });

  /* ===================  Revelado al hacer scroll  ===================== */
  var reveals = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = (Math.min(i % 5, 4) * 55) + 'ms';
      io.observe(el);
    });
  }

  /* ===================  Carruseles  =================================== */
  /* El desplazamiento real lo hace el navegador (scroll-snap). Aquí solo se
     sincronizan los puntos y las flechas con la posición actual. */
  document.querySelectorAll('[data-carousel]').forEach(function (car) {
    var track = car.querySelector('.carousel__track');
    var items = Array.prototype.slice.call(track.children);
    var dots  = car.querySelector('.carousel__dots');
    var arrows = Array.prototype.slice.call(car.querySelectorAll('.carousel__arrow'));
    if (!track || !items.length) return;

    function step() {
      var cs = getComputedStyle(track);
      return items[0].getBoundingClientRect().width + (parseFloat(cs.gap) || 0);
    }

    // Cuántas tarjetas caben a la vez: define cuántas "páginas" hay.
    // clientWidth incluye el padding lateral del track, que es sangrado y no
    // espacio útil: hay que descontarlo o se cuenta una tarjeta de más.
    function perView() {
      var cs = getComputedStyle(track);
      var util = track.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
      return Math.max(1, Math.round(util / step()));
    }

    function buildDots() {
      if (!dots) return;
      var pages = Math.max(1, items.length - perView() + 1);
      dots.innerHTML = '';
      for (var i = 0; i < pages; i++) dots.appendChild(document.createElement('i'));
      sync();
    }

    function current() {
      return Math.round(track.scrollLeft / step());
    }

    function sync() {
      var i = current();
      var max = track.scrollWidth - track.clientWidth;
      if (dots) {
        Array.prototype.forEach.call(dots.children, function (d, n) {
          d.classList.toggle('is-on', n === Math.min(i, dots.children.length - 1));
        });
      }
      arrows.forEach(function (b) {
        var dir = +b.dataset.dir;
        b.disabled = dir < 0 ? track.scrollLeft <= 2 : track.scrollLeft >= max - 2;
      });
    }

    arrows.forEach(function (b) {
      b.addEventListener('click', function () {
        track.scrollBy({ left: step() * +b.dataset.dir, behavior: reduced ? 'auto' : 'smooth' });
      });
    });

    var tick;
    track.addEventListener('scroll', function () {
      clearTimeout(tick);
      tick = setTimeout(sync, 60);
    }, { passive: true });

    window.addEventListener('resize', function () {
      clearTimeout(tick);
      tick = setTimeout(buildDots, 150);
    });

    buildDots();
  });

  /* ===================  Desplegables  ================================= */
  document.querySelectorAll('.disclose__trigger').forEach(function (btn) {
    var label = btn.querySelector('span');
    if (!label) return;
    var abrir = label.textContent.trim();            // "Ver detalle" / "Ver perfil"
    var cerrar = abrir.replace(/^Ver/, 'Ocultar');

    // Se redibuja a partir del estado actual: así sobrevive a un cambio de idioma
    // con el panel abierto.
    function render() {
      var open = btn.getAttribute('aria-expanded') === 'true';
      label.textContent = t(open ? cerrar : abrir);
    }

    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    var inner = panel ? panel.firstElementChild : null;

    function setOpen(open) {
      btn.setAttribute('aria-expanded', String(open));
      render();
      if (!panel || !inner) return;

      if (reduced) {                       // sin animación si así lo pidió el sistema
        panel.style.height = open ? 'auto' : '0px';
        return;
      }

      if (open) {
        panel.style.height = inner.offsetHeight + 'px';
        var done = function (e) {
          if (e.target !== panel || e.propertyName !== 'height') return;
          panel.style.height = 'auto';     // así crece solo si cambia el contenido
          panel.removeEventListener('transitionend', done);
        };
        panel.addEventListener('transitionend', done);
      } else {
        panel.style.height = inner.offsetHeight + 'px';
        void panel.offsetHeight;           // reflujo: sin esto no hay transición desde auto
        panel.style.height = '0px';
      }
    }

    btn.addEventListener('click', function () {
      setOpen(btn.getAttribute('aria-expanded') !== 'true');
    });

    onLang(render);
    render();
  });

  /* ===================  Filtro de documentos  ========================= */
  /* En su propia página la lista arranca completa ("Todas"). Si se deselecciona
     el área y no hay búsqueda, se muestra la invitación, si la página la tiene. */
  var list  = document.getElementById('circulars');
  var input = document.getElementById('q');
  var empty = document.getElementById('circularsEmpty');
  var start = document.getElementById('circularsStart');
  var verTodas = document.getElementById('verTodas');
  var chips = document.querySelectorAll('.chip');
  var yearSel = document.getElementById('year');

  if (list) {
    var items  = Array.prototype.slice.call(list.querySelectorAll('.circular'));
    var area   = null;   // null = ningún área elegida
    var needle = '';

    function normalize(s) {
      return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function setChip(value) {
      area = value;
      chips.forEach(function (c) {
        var on = c.dataset.filter === value;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', String(on));
      });
    }

    function apply() {
      // Sin área ni búsqueda: no se lista nada, solo la invitación.
      if (!area && !needle && start) {
        items.forEach(function (li) { li.hidden = true; });
        list.hidden = true;
        if (start) start.hidden = false;
        if (empty) empty.hidden = true;
        return;
      }

      if (start) start.hidden = true;
      list.hidden = false;

      var shown = 0;
      items.forEach(function (li) {
        var matchArea = !area || area === 'todas' || li.dataset.area === area;
        var matchText = !needle || normalize(li.textContent + ' ' + (li.dataset.k || '')).indexOf(needle) !== -1;
        var matchYear = !yearSel || !yearSel.value || li.dataset.year === yearSel.value;
        var show = matchArea && matchText && matchYear;
        li.hidden = !show;
        if (show) shown++;
      });

      if (empty) empty.hidden = shown !== 0;
      list.hidden = shown === 0;
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        // Volver a tocar el área activa la deselecciona.
        setChip(chip.classList.contains('is-active') ? null : chip.dataset.filter);
        apply();
      });
    });

    if (verTodas) {
      verTodas.addEventListener('click', function () {
        setChip('todas');
        if (input) { input.value = ''; needle = ''; }
        apply();
        list.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      });
    }

    if (input) {
      var typing;   // no llamarlo t: taparía la función de traducción
      input.addEventListener('input', function () {
        clearTimeout(typing);
        typing = setTimeout(function () {
          needle = normalize(input.value.trim());
          apply();
        }, 140);
      });
    }

    if (yearSel) yearSel.addEventListener('change', apply);

    setChip('todas');
    apply();
  }

  /* ===================  Validación y envío de formularios  ============ */
  // Contacto y hojas de vida usan la misma función de Supabase, que reenvía
  // todo por Resend a info@vmlegal.com.co (código en supabase/functions/contacto).
  var FORM_ENDPOINT = 'https://hciwbnmnoeobtcfmfjox.supabase.co/functions/v1/contacto';
  var MAX_FILE = 5 * 1024 * 1024;   // 5 MB: suficiente para una hoja de vida en PDF
  var FILE_OK = /\.(pdf|docx?)$/i;

  var messages = {
    'f-nombre': 'Por favor indíquenos su nombre.',
    'f-email':  'Necesitamos un correo válido para responderle.',
    'f-msg':    'Cuéntenos brevemente en qué podemos ayudarle.',
    'f-hab':    'Necesitamos su autorización para tratar los datos.',
    'f-cv':     'Adjunte su hoja de vida en PDF o Word, de máximo 5 MB.',
    'f-uni':    'Indíquenos su universidad.'
  };

  // Lee el archivo como base64 (sin el prefijo data:) para enviarlo en el JSON.
  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result).split(',')[1]); };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  document.querySelectorAll('form[data-form]').forEach(function (form) {
    var ok = form.querySelector('[data-ok]');
    var fail = form.querySelector('[data-fail]');
    var send = form.querySelector('button[type="submit"]');
    var idle = send.textContent.trim();

    function showError(field, msg) {
      var box = form.querySelector('[data-error-for="' + field.id + '"]');
      if (box) box.textContent = msg ? t(msg) : '';
      field.classList.toggle('is-invalid', Boolean(msg));
      if (msg) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
    }

    function validate(field) {
      var value = field.type === 'checkbox' ? field.checked
                : field.type === 'file' ? field.files.length : field.value.trim();
      var msg = '';
      if (field.required && !value) {
        msg = messages[field.id] || 'Este campo es obligatorio.';
      } else if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        msg = messages['f-email'];
      } else if (field.type === 'file' && value) {
        var f = field.files[0];
        if (!FILE_OK.test(f.name) || f.size > MAX_FILE) msg = messages[field.id];
      }
      showError(field, msg);
      return !msg;
    }

    var fields = Array.prototype.slice.call(form.querySelectorAll('[required], input[type="file"]'));
    fields.forEach(function (field) {
      field.addEventListener('blur', function () { validate(field); });
      field.addEventListener(field.type === 'file' ? 'change' : 'input', function () {
        if (field.type === 'file' || field.classList.contains('is-invalid')) validate(field);
      });
    });

    function label(txt) {
      send.textContent = t(txt);
      onLang(function () { send.textContent = t(txt); });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var first = null;
      fields.forEach(function (field) { if (!validate(field) && !first) first = field; });
      if (first) { first.focus(); return; }

      // Todos los campos con name viajan tal cual; el archivo, aparte y en base64.
      var data = { tipo: form.dataset.form };
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.type === 'file') return;
        data[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim();
      });
      var fileInput = form.querySelector('input[type="file"]');
      var file = fileInput && fileInput.files[0];

      send.disabled = true;
      if (fail) fail.hidden = true;
      label('Enviando…');

      (file ? readFile(file) : Promise.resolve(null)).then(function (b64) {
        if (b64) data.adjunto = { nombre: file.name, contenido: b64 };
        return fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        if (ok) ok.hidden = false;
        label('Solicitud enviada');
        Array.prototype.forEach.call(form.elements, function (f) { f.disabled = true; });
      }).catch(function (err) {
        console.error('Formulario:', err);
        if (fail) fail.hidden = false;
        send.disabled = false;
        label(idle);
      });
    });
  });

  } // init
})();
