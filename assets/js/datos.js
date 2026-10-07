/* VM Legal · Contenido editable desde el panel (admin/).
   El panel guarda un archivo por elemento en data/<colección>/; al publicar,
   scripts/unir_datos.py los une en data/<colección>.json, que es lo que se lee aquí.
   Toda sección sin contenido queda oculta. window.VMdatos es la promesa que
   sitio.js espera antes de armar carruseles, desplegables y el buscador. */
(function () {
  'use strict';

  var OUT  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';
  var PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  var AREAS = { tributario: 'Tributario', societario: 'Societario', comercial: 'Comercial', cambiario: 'Cambiario', aduanero: 'Aduanero' };

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // El panel guarda rutas como "/uploads/x.pdf"; se vuelven relativas para que
  // sirvan igual en GitHub Pages (subcarpeta) y en el dominio definitivo.
  function src(p) {
    p = String(p || '');
    if (/^https?:\/\//.test(p)) return p;
    // Nombres con espacios o tildes subidos antes de la regla del panel.
    try { p = decodeURI(p); } catch (e) { /* ya venía codificado a medias */ }
    return encodeURI(p.replace(/^\/+/, ''));
  }

  function initials(name) {
    return String(name || '').split(/\s+/).filter(function (w) { return /^[A-ZÁÉÍÓÚÑ]/.test(w); })
      .slice(0, 2).map(function (w) { return w[0]; }).join('');
  }

  function fecha(iso) {
    var d = new Date(iso + 'T12:00:00');
    return isNaN(d) ? esc(iso) : d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function byOrder(a, b) { return (a.orden || 999) - (b.orden || 999); }

  // Una sección se muestra solo si su lista recibió elementos.
  function fill(listId, items, render, sectionId) {
    var el = $(listId);
    if (!el) return;
    el.innerHTML = items.map(render).join('');
    var sec = $(sectionId || listId);
    if (sec) sec.hidden = !items.length;
  }

  var cache = {};
  function load(name) {
    // GitHub Pages guarda en caché 10 min; el parámetro fuerza la versión
    // recién publicada desde el panel.
    if (!cache[name]) {
      cache[name] = fetch('data/' + name + '.json?v=' + Date.now(), { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error(name + ' → ' + r.status);
        return r.json();
      }).then(function (d) { return d.items || []; });
    }
    return cache[name];
  }

  /* ---------------------------------------------------------- Equipo */
  // El equipo tiene sus textos en español y, opcionalmente, en inglés (m.en);
  // con ENG activo se usa el inglés y, si falta un campo, el español.
  function isEn() { return window.VMi18n && window.VMi18n.lang === 'en'; }
  function T(es) { return window.VMi18n ? window.VMi18n.t(es) : es; }
  function L(m, k) { return (isEn() && m.en && m.en[k]) || m[k] || ''; }

  function edu(m) {
    var li = '';
    if (L(m, 'pregrado')) li += '<li><b>' + T('Pregrado') + '</b>' + esc(L(m, 'pregrado')) + '</li>';
    if (L(m, 'posgrado')) li += '<li><b>' + T('Posgrado') + '</b>' + esc(L(m, 'posgrado')) + '</li>';
    return li ? '<ul class="member__edu">' + li + '</ul>' : '';
  }

  function personCard(m, compact) {
    var photo = m.foto
      ? '<img src="' + esc(src(m.foto)) + '" alt="' + T('Retrato de') + ' ' + esc(m.nombre) + '" width="560" height="700" loading="lazy">'
      : '<span class="partner__initials" aria-hidden="true">' + esc(initials(m.nombre)) + '</span>';
    return '<li class="partner"><figure class="partner__photo">' + photo + '</figure>' +
      '<div class="partner__body"><h3>' + esc(m.nombre) + '</h3>' +
      (L(m, 'cargo') ? '<p class="member__role">' + esc(L(m, 'cargo')) + '</p>' : '') +
      (L(m, 'area') ? '<p class="partner__area">' + esc(L(m, 'area')) + '</p>' : '') +
      (compact ? (L(m, 'posgrado') ? '<p class="partner__sum">' + esc(L(m, 'posgrado')) + '</p>' : '')
               : edu(m) + (L(m, 'perfil') ? '<p class="partner__bio">' + esc(L(m, 'perfil')) + '</p>' : '')) +
      '</div></li>';
  }

  function team() {
    if (!$('teamGrid') && !$('partnersGrid') && !$('partnersTeaser')) return null;
    return load('equipo').then(function (all) {
      all.sort(byOrder);
      var socios = all.filter(function (m) { return m.socio; });
      var resto  = all.filter(function (m) { return !m.socio; });
      function render() {
        fill('partnersGrid', socios, function (m) { return personCard(m, false); });
        fill('teamGrid', resto, function (m) { return personCard(m, false); }, 'teamSection');
        fill('partnersTeaser', socios, function (m) { return personCard(m, true); });
      }
      render();
      // Al cambiar de idioma se vuelve a pintar con los textos del otro idioma.
      if (window.VMi18n) window.VMi18n.onChange(render);
    });
  }

  /* ---------------------------------------------------------- Novedades */
  function docCard(c, extra) {
    var area = AREAS[c.area] ? c.area : 'tributario';
    // Las palabras clave no se muestran: solo alimentan el buscador.
    var keys = (c.palabras_clave || []).filter(Boolean).join(' ');
    return '<li class="circular reveal' + (extra || '') + '" data-area="' + area + '" data-k="' + esc(keys) + '">' +
      '<div class="circular__meta"><span class="tag tag--' + area + '">' + AREAS[area] + '</span>' +
      '<time datetime="' + esc(c.fecha) + '">' + fecha(c.fecha) + '</time></div>' +
      '<h3>' + esc(c.titulo) + '</h3>' +
      (c.descripcion ? '<p>' + esc(c.descripcion) + '</p>' : '') +
      (c.archivo ? '<a class="circular__link" href="' + esc(src(c.archivo)) + '" target="_blank" rel="noopener" type="application/pdf">Ver documento (PDF)' + OUT + '</a>' : '') +
      '</li>';
  }

  function docs() {
    var list = $('circulars'), feat = $('docFeatured'), latest = $('latestDocs'), byArea = $('areaDocs');
    if (!list && !feat && !latest && !byArea) return null;
    return load('documentos').then(function (items) {
      items.sort(function (a, b) { return String(b.fecha).localeCompare(String(a.fecha)); });
      if (list) list.innerHTML = items.map(function (c) { return docCard(c); }).join('');
      // Páginas de área: sus 3 circulares más recientes; sin ninguna, la sección no se muestra.
      if (byArea) fill('areaDocs', items.filter(function (c) { return c.area === byArea.dataset.area; }).slice(0, 3),
                       function (c) { return docCard(c); }, 'docsArea');
      if (latest) latest.innerHTML = items.slice(0, 3).map(function (c) { return docCard(c); }).join('');
      if (feat && items.length) {
        var f = items.filter(function (c) { return c.destacado; })[0] || items[0];
        feat.innerHTML = '<p class="eyebrow">Más reciente</p><ul class="circulars circulars--featured">' + docCard(f, ' is-featured') + '</ul>';
      }
    });
  }

  /* ---------------------------------------------------------- Valor agregado e inicio */
  function ytId(url) {
    var m = String(url || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
    return m ? m[1] : '';
  }

  function deals() {
    var el = $('dealsList');
    if (!el) return null;
    var limit = +el.dataset.limit || 0;   // en el inicio solo unas pocas por columna
    return load('operaciones').then(function (items) {
      items.sort(byOrder);
      var groups = [['venta', 'Acompañamiento en ventas'], ['adquisicion', 'Acompañamiento en adquisiciones'], ['litigio', 'Demandas promovidas']];
      el.innerHTML = groups.map(function (g) {
        var mine = items.filter(function (o) { return o.tipo === g[0]; });
        if (limit) mine = mine.slice(0, limit);
        return mine.length ? '<div class="deals__col"><h3>' + g[1] + '</h3><ul>' +
          mine.map(function (o) { return '<li>' + esc(o.descripcion) + (o.anio ? ' <span>' + esc(o.anio) + '</span>' : '') + '</li>'; }).join('') +
          '</ul></div>' : '';
      }).join('');
      $('dealsSection').hidden = !items.length;
    });
  }

  function talkCard(c) {
    var id = ytId(c.video);
    var thumb = id ? '<img src="https://i.ytimg.com/vi/' + id + '/hqdefault.jpg" alt="" loading="lazy" width="480" height="360">' : '';
    return '<li><a class="talk" href="' + esc(c.video || '#') + '" target="_blank" rel="noopener">' +
      '<span class="talk__thumb">' + thumb + '<span class="talk__play">' + PLAY + '</span></span>' +
      '<span class="talk__body"><time datetime="' + esc(c.fecha) + '">' + fecha(c.fecha) + '</time>' +
      '<b>' + esc(c.titulo) + '</b>' + (c.descripcion ? '<span>' + esc(c.descripcion) + '</span>' : '') + '</span></a></li>';
  }

  // Videocolumna: el video más reciente se ve grande y se reproduce aquí mismo
  // (el reproductor de YouTube se carga solo al hacer clic, para no pesar).
  function talks() {
    if (!$('talksList')) return null;
    return load('conferencias').then(function (items) {
      items.sort(function (a, b) { return String(b.fecha).localeCompare(String(a.fecha)); });
      var feat = $('talksFeature'), rest = items;
      if (feat && items.length) {
        var c = items[0], id = ytId(c.video);
        rest = items.slice(1, 4);
        feat.innerHTML = '<div class="vcol__player">' + (id
          ? '<button type="button" class="vcol__lite" data-yt="' + id + '" aria-label="Reproducir: ' + esc(c.titulo) + '">' +
            '<img src="https://i.ytimg.com/vi/' + id + '/hqdefault.jpg" alt="" loading="lazy"><span class="talk__play">' + PLAY + '</span></button>'
          : '<a href="' + esc(c.video) + '" target="_blank" rel="noopener">' + esc(c.titulo) + '</a>') + '</div>' +
          '<div class="vcol__text"><time datetime="' + esc(c.fecha) + '">' + fecha(c.fecha) + '</time><h3>' + esc(c.titulo) + '</h3>' +
          (c.descripcion ? '<p>' + esc(c.descripcion) + '</p>' : '') + '</div>';
        var lite = feat.querySelector('.vcol__lite');
        if (lite) lite.addEventListener('click', function () {
          lite.outerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + lite.dataset.yt +
            '?autoplay=1&rel=0" title="Videocolumna" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
        });
      }
      fill('talksList', rest, talkCard);
      $('talksSection').hidden = !items.length;
    });
  }

  function awards() {
    if (!$('awardsList') && !$('recogList')) return null;
    return load('reconocimientos').then(function (items) {
      items.sort(byOrder);
      fill('awardsList', items, function (r) {
        var logo = r.logo ? '<img src="' + esc(src(r.logo)) + '" alt="" loading="lazy">' : '<span>' + esc(initials(r.nombre)) + '</span>';
        var inner = '<span class="award__logo">' + logo + '</span><b>' + esc(r.nombre) + '</b>' +
          (r.anio ? '<span class="award__year">' + esc(r.anio) + '</span>' : '') +
          (r.distincion ? '<span class="award__text">' + esc(r.distincion) + '</span>' : '');
        return '<li>' + (r.enlace ? '<a href="' + esc(r.enlace) + '" target="_blank" rel="noopener">' + inner + '</a>' : inner) + '</li>';
      }, 'awardsSection');
      fill('recogList', items, function (r) {
        var inner = r.logo ? '<img src="' + esc(src(r.logo)) + '" alt="' + esc(r.nombre) + '" loading="lazy">' : esc(r.nombre);
        return '<li>' + (r.enlace ? '<a href="' + esc(r.enlace) + '" target="_blank" rel="noopener">' + inner + '</a>' : inner) + '</li>';
      }, 'recogStrip');
    });
  }

  function valor() {
    if (!$('clientsSection')) return null;
    return Promise.all([
      load('clientes').then(function (items) {
        items.sort(byOrder);
        // Se duplica la fila para que el desplazamiento continuo no tenga saltos.
        var one = items.map(function (c) {
          return '<li>' + (c.logo ? '<img src="' + esc(src(c.logo)) + '" alt="' + esc(c.nombre) + '" loading="lazy">' : '<span>' + esc(c.nombre) + '</span>') + '</li>';
        }).join('');
        $('clientsList').innerHTML = one + one.replace(/<li>/g, '<li aria-hidden="true">');
        $('clientsSection').hidden = !items.length;
      }),
      load('resenas').then(function (items) {
        fill('reviewsList', items.sort(byOrder), function (r) {
          return '<li><blockquote><p>' + esc(r.texto) + '</p></blockquote><p class="review__by"><b>' + esc(r.autor) + '</b>' +
            (r.empresa ? '<span>' + esc(r.empresa) + '</span>' : '') + '</p></li>';
        }, 'reviewsSection');
      }),
      load('sostenibilidad').then(function (items) {
        items.sort(function (a, b) { return (b.anio || 0) - (a.anio || 0); });
        fill('csrList', items, function (s) {
          return '<li>' + (s.foto ? '<img src="' + esc(src(s.foto)) + '" alt="" loading="lazy">' : '') +
            '<div><span class="csr__year">' + esc(s.anio) + '</span><h3>' + esc(s.titulo) + '</h3>' +
            (s.descripcion ? '<p>' + esc(s.descripcion) + '</p>' : '') + '</div></li>';
        }, 'csrSection');
      })
    ].map(function (j) { return j.catch(function (e) { console.error(e); }); }));
  }

  /* ---------------------------------------------------------- Portada */
  // Diapositivas del panel. Sin ninguna, queda la que viene escrita en el HTML.
  function slides() {
    var box = $('heroSlides');
    if (!box) return null;
    return load('portada').then(function (items) {
      items = items.filter(function (s) { return s.activo !== false && s.titulo; }).sort(byOrder);
      if (!items.length) return;
      box.innerHTML = items.map(function (s, i) {
        var bg = s.imagen ? ' style="background-image:url(\'' + esc(src(s.imagen)) + '\')"' : '';
        var tag = i === 0 ? 'h1' : 'h2';   // un solo h1 por página
        return '<article class="slide slide--' + ((i % 4) + 1) + (s.imagen ? ' slide--photo' : '') + (i === 0 ? ' is-active' : '') + '"' + bg +
          ' aria-roledescription="diapositiva">' +
          '<div class="wrap slide__inner">' + (s.antetitulo ? '<p class="slide__kicker">' + esc(s.antetitulo) + '</p>' : '') +
          '<' + tag + ' class="slide__title">' + esc(s.titulo) + '</' + tag + '>' +
          (s.texto ? '<p class="slide__text">' + esc(s.texto) + '</p>' : '') +
          (s.enlace ? '<a class="slide__cta" href="' + esc(src(s.enlace)) + '">' + esc(s.boton || 'Ver más') +
            ' <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>' : '') +
          '</div></article>';
      }).join('');
    });
  }

  /* ---------------------------------------------------------- Configuración: cifra y aviso */
  function site() {
    return fetch('data/sitio.json?v=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (s) {
        var mark = $('markClients');
        if (mark && s.clientes) { mark.querySelector('b').textContent = s.clientes; mark.hidden = false; }
        var all = $('talksAll');
        if (all && s.videocolumna) { all.href = s.videocolumna; all.target = '_blank'; all.rel = 'noopener'; }
        notice(s.aviso || {});
      });
  }

  // Aviso emergente para novedades urgentes. Se muestra una vez por sesión
  // (por título) y deja de salir solo cuando pasa la fecha "hasta".
  function notice(a) {
    if (!a.activo || !a.titulo) return;
    if (a.hasta && new Date(a.hasta + 'T23:59:59') < new Date()) return;
    var key = 'vm-aviso:' + a.titulo;
    try { if (sessionStorage.getItem(key)) return; } catch (e) { /* modo privado */ }
    var d = document.createElement('dialog');
    d.className = 'notice';
    d.setAttribute('aria-labelledby', 'noticeTitle');
    d.innerHTML = '<form method="dialog"><button class="notice__close" aria-label="Cerrar aviso">×</button></form>' +
      '<p class="eyebrow">Aviso importante</p><h2 id="noticeTitle">' + esc(a.titulo) + '</h2>' +
      (a.texto ? '<p>' + esc(a.texto) + '</p>' : '') +
      (a.enlace ? '<a class="btn btn--primary" href="' + esc(src(a.enlace)) + '" target="_blank" rel="noopener">' + esc(a.boton || 'Leer más') + '</a>' : '');
    document.body.appendChild(d);
    d.addEventListener('close', function () { try { sessionStorage.setItem(key, '1'); } catch (e) { /* nada */ } });
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });   // clic en el fondo
    if (d.showModal) d.showModal();
  }

  var jobs = [slides(), team(), docs(), deals(), talks(), awards(), valor(), site()].filter(Boolean)
    .map(function (j) { return j.catch(function (e) { console.error(e); }); });

  window.VMdatos = Promise.all(jobs);
})();
