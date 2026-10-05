/* =========================================================
   RIDER7 · sitio flipbook personalizable con config.txt
   Licencia MIT. Usa StPageFlip (MIT) para el efecto de hojas.
   ========================================================= */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var IMG_RE = /\.(jpe?g|png|webp|gif|avif)$/i;
  var MAX_DEPTH = 3; // niveles de carpetas: grupo > subgrupo > libro

  var DEFAULTS = {
    titulo: 'Mi sitio', descripcion: '', logo: 'logo.png', logo_claro: '', logo_alto: '48', favicon: '',
    modo: 'oscuro', selector_modo: 'si',
    color_fondo_oscuro: '#0f0f12', color_fondo_claro: '#f6f3ee',
    color_texto_oscuro: '#f2efe9', color_texto_claro: '#1b1a18',
    color_acento: '#e8b04a',
    fuente_titulos: 'Playfair Display', fuente_texto: 'Inter',
    cabecera: 'centrada',
    inicio_titulo: '', inicio_texto: '', inicio_boton: 'Entrar',
    paginas: 'auto', tapa: 'si', tapa_dura: 'no', velocidad: '800', desenfoque: '40', color_hoja: '#ffffff',
    contacto_titulo: 'Contacto', contacto_texto: '',
    pie: '', credito: 'si',
    fuente: 'auto', carpeta_contenido: 'contenido',
    github_repositorio: '', github_rama: '',
    drive_carpeta_id: '', drive_api_key: ''
  };

  var state = { cfg: {}, tree: [], col: null, flip: null, layout: null, page: 0, landscape: false, cover: false };

  /* ---------------- Utilidades ---------------- */

  // Lee archivos "clave: valor" (config.txt e info.txt)
  function parseTxt(text) {
    var out = {};
    String(text || '').replace(/^﻿/, '').split(/\r?\n/).forEach(function (line) {
      var t = line.trim();
      if (!t || t.charAt(0) === '#') return;
      var i = t.indexOf(':');
      if (i < 1) return;
      var k = t.slice(0, i).trim().toLowerCase().replace(/\s+/g, '_');
      var v = t.slice(i + 1).trim().replace(/\s+#\s.*$/, '').trim(); // comentario al final: "valor   # nota"
      out[k] = v;
    });
    return out;
  }
  function yes(v) { return /^(s[ií]|yes|true|1|on)$/i.test(String(v || '').trim()); }
  function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : d; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function natSort(a, b) { return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }); }
  function slugify(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
  }
  function titleFromFolder(name) {
    var t = String(name).replace(/^\d+[\s._-]*/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    return t || name;
  }
  function hidden(name) { return /^[._]/.test(name); }
  function encPath(p) { return p.split('/').map(encodeURIComponent).join('/'); }
  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }
  function cacheGet(k) {
    try { var j = JSON.parse(sessionStorage.getItem(k)); if (j && Date.now() - j.t < 6e5) return j.d; } catch (e) {}
    return null;
  }
  function cacheSet(k, d) { try { sessionStorage.setItem(k, JSON.stringify({ t: Date.now(), d: d })); } catch (e) {} }
  function fetchText(url, opts) {
    return fetch(url, opts || { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(r.status + ' ' + url);
      return r.text();
    });
  }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
  function loadImage(src) {
    return new Promise(function (res, rej) {
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = rej;
      im.src = src;
    });
  }

  var ICONS = {
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    whatsapp: '<path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4z"/><path d="M9 8.6c.2 3.3 3 6.2 6.4 6.4l1.1-1.5-2-1.1-1 .8a5 5 0 0 1-2.4-2.4l.8-1-1.1-2z"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/>',
    facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V9a1 1 0 0 1 1-1z"/>',
    tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.5 2.5 4.5 5 4.8"/>',
    youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5z"/>',
    linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10.5V17M8 7.2v.1M12 17v-6.5M12 13.5a2.5 2.5 0 0 1 5 0V17"/>',
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    stack: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
    caret: '<path d="M6 9l6 6 6-6"/>'
  };
  function icon(n) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[n] + '</svg>'; }

  /* ---------------- Apariencia ---------------- */

  function loadFont(name) {
    if (!name) return;
    var fam = name.trim().replace(/\s+/g, '+');
    var base = 'https://fonts.googleapis.com/css2?family=';
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = base + fam + ':wght@400;500;600;700&display=swap';
    // Si la fuente no tiene esos pesos, Google responde error: se pide sin pesos
    link.onerror = function () {
      var l2 = document.createElement('link');
      l2.rel = 'stylesheet';
      l2.href = base + fam + '&display=swap';
      document.head.appendChild(l2);
    };
    document.head.appendChild(link);
  }

  // Decide si sobre el color de acento conviene texto oscuro o claro
  function isLight(color) {
    var cv = document.createElement('canvas').getContext('2d');
    cv.fillStyle = '#000'; cv.fillStyle = color;
    var h = cv.fillStyle;
    if (!/^#[0-9a-f]{6}$/i.test(h)) return true;
    var r = parseInt(h.substr(1, 2), 16), g = parseInt(h.substr(3, 2), 16), b = parseInt(h.substr(5, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150;
  }

  function applyConfig(c) {
    var root = document.documentElement.style;
    root.setProperty('--bg-dark', c.color_fondo_oscuro);
    root.setProperty('--bg-light', c.color_fondo_claro);
    root.setProperty('--fg-dark', c.color_texto_oscuro);
    root.setProperty('--fg-light', c.color_texto_claro);
    root.setProperty('--accent', c.color_acento);
    root.setProperty('--on-accent', isLight(c.color_acento) ? '#111111' : '#ffffff');
    root.setProperty('--page', c.color_hoja);
    root.setProperty('--blur', num(c.desenfoque, 40) + 'px');
    root.setProperty('--logo-h', num(c.logo_alto, 48) + 'px');
    root.setProperty('--font-title', '"' + c.fuente_titulos + '", Georgia, serif');
    root.setProperty('--font-body', '"' + c.fuente_texto + '", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif');
    loadFont(c.fuente_titulos);
    if (c.fuente_texto !== c.fuente_titulos) loadFont(c.fuente_texto);

    // Modo claro / oscuro
    var map = { oscuro: 'dark', claro: 'light', auto: 'auto', dark: 'dark', light: 'light' };
    var saved = yes(c.selector_modo) ? store('r7-modo') : null;
    document.documentElement.dataset.theme = saved || map[String(c.modo).toLowerCase()] || 'dark';
    $('.theme-toggle').hidden = !yes(c.selector_modo);

    document.body.classList.toggle('header-centered', !/^lateral/i.test(c.cabecera));

    document.title = c.titulo;
    var md = $('meta[name="description"]');
    if (md) md.setAttribute('content', c.descripcion);
    var fav = document.createElement('link');
    fav.rel = 'icon';
    fav.href = c.favicon || c.logo;
    document.head.appendChild(fav);

    $('.brand-text').textContent = c.titulo;
    $('.brand').setAttribute('aria-label', c.titulo + ' · inicio');
    updateLogo();
  }

  function effectiveTheme() {
    var t = document.documentElement.dataset.theme;
    if (t === 'auto') return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    return t;
  }

  function updateLogo() {
    var c = state.cfg;
    var img = $('.brand-logo');
    var brand = $('.brand');
    var src = (effectiveTheme() === 'light' && c.logo_claro) ? c.logo_claro : c.logo;
    if (!src) { brand.classList.remove('has-logo'); img.hidden = true; return; }
    img.onload = function () { brand.classList.add('has-logo'); img.hidden = false; checkNav(); };
    img.onerror = function () { brand.classList.remove('has-logo'); img.hidden = true; checkNav(); };
    img.alt = c.titulo;
    if (img.getAttribute('src') !== src) img.src = src;
  }

  /* ---------------- Árbol de carpetas ----------------
     Carpeta con imágenes          -> libro
     Carpeta solo con subcarpetas  -> grupo (submenú)
  */

  function makeNode(folder, images, children, info, extra) {
    info = info || {};
    var base = {
      carpeta: folder,
      titulo: info.titulo || titleFromFolder(folder),
      menu: info.menu || info.titulo || titleFromFolder(folder),
      descripcion: info.descripcion || (extra && extra.descripcion) || ''
    };
    if (images && images.length) {
      var portada = images[0];
      if (info.portada) {
        var hit = images.filter(function (u) { return decodeURIComponent(u).split('/').pop() === info.portada; })[0];
        if (hit) portada = hit;
      }
      base.type = 'book';
      base.imagenes = images.slice();
      base.portada = (extra && extra.portada) || portada;
      base.fondo = images[0];
      return base;
    }
    children = (children || []).filter(Boolean);
    if (!children.length) return null;
    base.type = 'group';
    base.children = children;
    base.portadaNombre = info.portada || '';
    return base;
  }

  // Asigna slug, ruta y padre; calcula la portada de los grupos
  function finishTree(nodes, parent) {
    var used = {}, out = [];
    (nodes || []).forEach(function (n) {
      if (!n) return;
      var s = slugify(n.titulo), b = s, i = 2;
      while (used[s]) s = b + '-' + (i++);
      used[s] = 1;
      n.slug = s;
      n.parent = parent || null;
      n.path = (parent ? parent.path + '/' : '') + s;
      if (n.type === 'group') {
        n.children = finishTree(n.children, n);
        if (!n.children.length) return;
        var pick = n.portadaNombre && n.children.filter(function (c) { return c.carpeta === n.portadaNombre; })[0];
        n.portada = (pick || n.children[0]).portada;
        n.fondo = n.portada;
      }
      out.push(n);
    });
    return out;
  }

  function countBooks(n) {
    return n.type === 'book' ? 1 : n.children.reduce(function (s, c) { return s + countBooks(c); }, 0);
  }

  /* ---------------- Fuentes de datos ---------------- */

  // 1) Listado de carpetas del servidor (prueba local o hosting con Apache/nginx)
  function listDir(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      var ct = r.headers.get('content-type') || '';
      if (!r.ok || ct.indexOf('html') === -1) throw new Error('SIN_LISTADO');
      return r.text();
    }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var base = new URL(url, location.href);
      var dirs = [], files = [], seen = {};
      $$('a[href]', doc).forEach(function (a) {
        var href = a.getAttribute('href');
        if (!href || href.charAt(0) === '#' || /^(mailto|tel|javascript):/i.test(href)) return;
        var u;
        try { u = new URL(href, base); } catch (e) { return; }
        if (u.origin !== base.origin || u.search || u.hash) return;
        if (u.pathname.indexOf(base.pathname) !== 0) return;
        var rest = u.pathname.slice(base.pathname.length);
        if (!rest) return;
        var slash = rest.slice(-1) === '/';
        var name = decodeURIComponent(slash ? rest.slice(0, -1) : rest);
        if (!name || name.indexOf('/') !== -1 || seen[name] || name.charAt(0) === '.') return;
        seen[name] = 1;
        var isDir = slash || /dir/i.test(a.className) || !/\.[a-z0-9]{2,5}$/i.test(name);
        (isDir ? dirs : files).push(name);
      });
      return { dirs: dirs, files: files };
    });
  }
  function scanFolder(dir, name, depth) {
    return listDir(encPath(dir)).catch(function () { return { dirs: [], files: [] }; }).then(function (l) {
      var imgs = l.files.filter(function (x) { return IMG_RE.test(x); }).sort(natSort)
        .map(function (x) { return encPath(dir + x); });
      var hasInfo = l.files.some(function (x) { return x.toLowerCase() === 'info.txt'; });
      var info = hasInfo ? fetchText(encPath(dir + 'info.txt')).then(parseTxt).catch(function () { return {}; }) : Promise.resolve({});
      var subs = (!imgs.length && depth < MAX_DEPTH) ?
        Promise.all(l.dirs.filter(function (d) { return !hidden(d); }).sort(natSort).map(function (d) {
          return scanFolder(dir + d + '/', d, depth + 1);
        })) : Promise.resolve([]);
      return Promise.all([info, subs]).then(function (r) { return makeNode(name, imgs, r[1], r[0]); });
    });
  }
  function fromListing() {
    var root = state.cfg.carpeta_contenido.replace(/^\/+|\/+$/g, '');
    return listDir(encPath(root) + '/').then(function (top) {
      var folders = top.dirs.filter(function (d) { return !hidden(d); }).sort(natSort);
      if (!folders.length) throw new Error('SIN_LISTADO');
      return Promise.all(folders.map(function (f) { return scanFolder(root + '/' + f + '/', f, 1); }));
    });
  }

  // 2) API pública de GitHub (GitHub Pages, Cloudflare Pages)
  function detectRepo() {
    var c = state.cfg;
    if (c.github_repositorio) return c.github_repositorio.replace(/^https?:\/\/github\.com\//, '').replace(/\/+$/, '');
    var h = location.hostname;
    if (/\.github\.io$/.test(h)) {
      var owner = h.split('.')[0];
      var first = location.pathname.split('/').filter(Boolean)[0];
      if (first && !/\.html?$/.test(first)) return owner + '/' + first;
      return owner + '/' + h;
    }
    return '';
  }
  function fromGitHub() {
    var c = state.cfg;
    var repo = detectRepo();
    if (!repo) return Promise.reject(new Error('NO_REPO'));
    var root = c.carpeta_contenido.replace(/^\/+|\/+$/g, '');
    var branch = c.github_rama || 'HEAD';
    var key = 'r7-gh-' + repo + '-' + branch;
    var cached = cacheGet(key);
    var p = cached ? Promise.resolve(cached) :
      fetch('https://api.github.com/repos/' + repo + '/git/trees/' + encodeURIComponent(branch) + '?recursive=1')
        .then(function (r) { if (!r.ok) throw new Error('GitHub ' + r.status); return r.json(); })
        .then(function (j) {
          var paths = (j.tree || []).filter(function (t) { return t.type === 'blob'; }).map(function (t) { return t.path; });
          cacheSet(key, paths);
          return paths;
        });
    return p.then(function (paths) {
      // Arma un árbol { dirs: {}, files: [] } con las rutas del repositorio
      var tree = { dirs: {}, files: [] };
      paths.forEach(function (path) {
        if (path.indexOf(root + '/') !== 0) return;
        var segs = path.slice(root.length + 1).split('/');
        var file = segs.pop();
        if (!segs.length || file.charAt(0) === '.') return;
        var node = tree;
        for (var i = 0; i < segs.length; i++) {
          if (hidden(segs[i]) || i >= MAX_DEPTH) return;
          node = node.dirs[segs[i]] || (node.dirs[segs[i]] = { dirs: {}, files: [] });
        }
        node.files.push(file);
      });
      function build(name, node, prefix) {
        var imgs = node.files.filter(function (x) { return IMG_RE.test(x); }).sort(natSort)
          .map(function (x) { return encPath(prefix + x); });
        var hasInfo = node.files.some(function (x) { return x.toLowerCase() === 'info.txt'; });
        var info = hasInfo ? fetchText(encPath(prefix + 'info.txt')).then(parseTxt).catch(function () { return {}; }) : Promise.resolve({});
        var subs = imgs.length ? Promise.resolve([]) : Promise.all(Object.keys(node.dirs).sort(natSort).map(function (d) {
          return build(d, node.dirs[d], prefix + d + '/');
        }));
        return Promise.all([info, subs]).then(function (r) { return makeNode(name, imgs, r[1], r[0]); });
      }
      return Promise.all(Object.keys(tree.dirs).sort(natSort).map(function (d) {
        return build(d, tree.dirs[d], root + '/' + d + '/');
      }));
    });
  }

  // 3) Google Drive (carpeta pública + API key)
  function driveList(q) {
    var c = state.cfg, files = [];
    function page(token) {
      var u = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) +
        '&key=' + encodeURIComponent(c.drive_api_key) +
        '&fields=' + encodeURIComponent('nextPageToken,files(id,name,mimeType,description)') +
        '&pageSize=1000&orderBy=name&supportsAllDrives=true&includeItemsFromAllDrives=true' +
        (token ? '&pageToken=' + encodeURIComponent(token) : '');
      return fetch(u).then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error('Google Drive ' + r.status + ': ' + t.slice(0, 200)); });
        return r.json();
      }).then(function (j) {
        files = files.concat(j.files || []);
        return j.nextPageToken ? page(j.nextPageToken) : files;
      });
    }
    return page('');
  }
  function driveImg(id) { return 'https://lh3.googleusercontent.com/d/' + id + '=w2000'; }
  function driveFolder(f, depth) {
    var c = state.cfg;
    return driveList("'" + f.id + "' in parents and trashed=false").then(function (files) {
      var imgs = files.filter(function (x) { return /^image\//.test(x.mimeType); })
        .sort(function (a, b) { return natSort(a.name, b.name); });
      var infoFile = files.filter(function (x) { return x.name.toLowerCase() === 'info.txt'; })[0];
      var info = infoFile ? fetchText('https://www.googleapis.com/drive/v3/files/' + infoFile.id + '?alt=media&key=' + encodeURIComponent(c.drive_api_key), {})
        .then(parseTxt).catch(function () { return {}; }) : Promise.resolve({});
      var folders = files.filter(function (x) { return x.mimeType === 'application/vnd.google-apps.folder' && !hidden(x.name); })
        .sort(function (a, b) { return natSort(a.name, b.name); });
      var subs = (!imgs.length && depth < MAX_DEPTH) ?
        Promise.all(folders.map(function (sf) { return driveFolder(sf, depth + 1); })) : Promise.resolve([]);
      return Promise.all([info, subs]).then(function (r) {
        var i = r[0], extra = { descripcion: f.description };
        if (i.portada) {
          var hit = imgs.filter(function (x) { return x.name === i.portada; })[0];
          if (hit) extra.portada = driveImg(hit.id);
        }
        return makeNode(f.name, imgs.map(function (x) { return driveImg(x.id); }), r[1], i, extra);
      });
    });
  }
  function fromDrive() {
    var c = state.cfg;
    if (!c.drive_carpeta_id || !c.drive_api_key) return Promise.reject(new Error('NO_DRIVE'));
    var id = c.drive_carpeta_id.replace(/.*folders\//, '').replace(/[?#].*$/, '');
    var key = 'r7-drive-' + id;
    var cached = cacheGet(key);
    if (cached) return Promise.resolve(cached);
    return driveList("'" + id + "' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false")
      .then(function (folders) {
        folders = folders.filter(function (f) { return !hidden(f.name); }).sort(function (a, b) { return natSort(a.name, b.name); });
        return Promise.all(folders.map(function (f) { return driveFolder(f, 1); }));
      })
      .then(function (nodes) { cacheSet(key, nodes); return nodes; });
  }

  function loadTree() {
    var f = String(state.cfg.fuente || 'auto').toLowerCase();
    if (f === 'drive') return fromDrive();
    if (f === 'github') return fromGitHub();
    if (f === 'local') return fromListing();
    return fromListing().catch(function () { return fromGitHub(); });
  }

  /* ---------------- Cabecera y menú ---------------- */

  function navItem(n) {
    var link = '<a href="#/' + esc(n.path) + '" data-key="' + esc(n.path) + '">' + esc(n.menu) + '</a>';
    if (n.type !== 'group') return '<li>' + link + '</li>';
    return '<li class="has-sub"><div class="nav-group">' + link +
      '<button class="sub-toggle" aria-expanded="false" aria-label="Ver ' + esc(n.menu) + '">' + icon('caret') + '</button></div>' +
      '<ul class="sub">' + n.children.map(navItem).join('') + '</ul></li>';
  }

  function buildNav() {
    $('.nav-list').innerHTML =
      '<li><a href="#/" data-key="">Inicio</a></li>' +
      state.tree.map(navItem).join('') +
      '<li><a href="#contacto" data-key="#contacto">' + esc(state.cfg.contacto_titulo || 'Contacto') + '</a></li>';
    checkNav();
  }

  // Marca el elemento actual y los grupos que lo contienen
  function setActive(key) {
    $$('.nav-list a').forEach(function (a) {
      var k = a.dataset.key;
      a.classList.toggle('active', k === key);
      a.classList.toggle('in-path', !!k && k !== key && key.indexOf(k + '/') === 0);
    });
    $$('.has-sub').forEach(function (li) {
      var k = $('a', li).dataset.key;
      var inside = key === k || key.indexOf(k + '/') === 0;
      if (document.body.classList.contains('nav-compact')) setSub(li, inside);
      else setSub(li, false);
    });
  }

  function setSub(li, open) {
    li.classList.toggle('open', open);
    var b = $('.sub-toggle', li);
    if (b) b.setAttribute('aria-expanded', String(open));
  }

  // Pasa a menú hamburguesa si no entra en una línea
  function checkNav() {
    var body = document.body, inner = $('.header-inner');
    body.classList.remove('nav-compact');
    body.classList.add('nav-measure');
    var tooNarrow = window.innerWidth < 640;
    var overflow = inner.scrollWidth > inner.clientWidth + 1;
    body.classList.remove('nav-measure');
    if (tooNarrow || overflow) body.classList.add('nav-compact');
    else closeMenu();
    var h = $('.site-header').offsetHeight;
    document.documentElement.style.setProperty('--header-h', h + 'px');
  }
  function closeMenu() {
    $('.site-nav').classList.remove('open');
    $('.menu-toggle').setAttribute('aria-expanded', 'false');
    if (!document.body.classList.contains('nav-compact')) $$('.has-sub.open').forEach(function (li) { setSub(li, false); });
  }

  /* ---------------- Portadas (inicio y grupos) ---------------- */

  function coverHTML(n, i) {
    var c = state.cfg, group = n.type === 'group';
    var count = group ? countBooks(n) : 0;
    return '<a class="cover' + (group ? ' cover-group' : '') + '" href="#/' + esc(n.path) + '">' +
      '<img class="cover-bg" src="' + n.portada + '" alt="" loading="lazy">' +
      '<div class="cover-art"><div class="cover-book"><img src="' + n.portada + '" alt="' + esc(n.titulo) + '" loading="' + (i < 2 ? 'eager' : 'lazy') + '"></div></div>' +
      '<div class="cover-info">' +
        (group ? '<div class="cover-kicker" title="' + count + ' dentro">' + icon('stack') + '<span>' + count + '</span></div>' : '') +
        '<h2>' + esc(n.titulo) + '</h2>' +
        (n.descripcion ? '<p>' + esc(n.descripcion) + '</p>' : '') +
        '<span class="cover-btn">' + esc(c.inicio_boton || 'Entrar') + icon('arrow') + '</span>' +
      '</div></a>';
  }

  function renderCovers(nodes) {
    $('.covers').innerHTML = nodes.map(coverHTML).join('');
    $$('.cover-book img').forEach(function (img) {
      function fit() { if (img.naturalWidth) img.parentNode.style.setProperty('--ratio', img.naturalWidth + '/' + img.naturalHeight); }
      if (img.complete) fit(); else img.addEventListener('load', fit);
    });
  }

  function backTarget(n) {
    var p = n && n.parent;
    return p ? { href: '#/' + p.path, label: p.titulo } : { href: '#/', label: 'Inicio' };
  }

  function showList(group, scrollToContact) {
    destroyFlip();
    state.col = null;
    var c = state.cfg, head = '';
    if (group) {
      var back = backTarget(group);
      head = '<a class="list-back" href="' + esc(back.href) + '">' + icon('caret') + '<span>' + esc(back.label) + '</span></a>' +
        '<h1>' + esc(group.titulo) + '</h1>' + (group.descripcion ? '<p>' + esc(group.descripcion) + '</p>' : '');
    } else {
      if (c.inicio_titulo) head += '<h1>' + esc(c.inicio_titulo) + '</h1>';
      if (c.inicio_texto) head += '<p>' + esc(c.inicio_texto) + '</p>';
    }
    $('.intro').innerHTML = head;
    $('.intro').classList.toggle('is-group', !!group);
    renderCovers(group ? group.children : state.tree);
    show('home');
    setActive(scrollToContact ? '#contacto' : (group ? group.path : ''));
    document.title = group ? group.titulo + ' · ' + c.titulo : c.titulo;
    if (scrollToContact) setTimeout(function () { $('#contacto').scrollIntoView({ behavior: 'smooth' }); }, 50);
    else window.scrollTo(0, 0);
  }

  /* ---------------- Footer ---------------- */

  function renderFooter() {
    var c = state.cfg, items = [];
    function url(v, base) { return /^https?:\/\//i.test(v) ? v : base + v.replace(/^@/, ''); }
    if (c.email) items.push({ i: 'mail', h: 'mailto:' + c.email, t: c.email });
    if (c.telefono) items.push({ i: 'phone', h: 'tel:' + c.telefono.replace(/[^\d+]/g, ''), t: c.telefono });
    if (c.whatsapp) items.push({ i: 'whatsapp', h: 'https://wa.me/' + c.whatsapp.replace(/\D/g, ''), t: 'WhatsApp', x: 1 });
    if (c.instagram) items.push({ i: 'instagram', h: url(c.instagram, 'https://instagram.com/'), t: /^https?:/.test(c.instagram) ? 'Instagram' : '@' + c.instagram.replace(/^@/, ''), x: 1 });
    if (c.facebook) items.push({ i: 'facebook', h: url(c.facebook, 'https://facebook.com/'), t: 'Facebook', x: 1 });
    if (c.tiktok) items.push({ i: 'tiktok', h: url(c.tiktok, 'https://www.tiktok.com/@'), t: 'TikTok', x: 1 });
    if (c.youtube) items.push({ i: 'youtube', h: url(c.youtube, 'https://youtube.com/@'), t: 'YouTube', x: 1 });
    if (c.linkedin) items.push({ i: 'linkedin', h: url(c.linkedin, 'https://linkedin.com/in/'), t: 'LinkedIn', x: 1 });
    if (c.web) items.push({ i: 'web', h: url(c.web, 'https://'), t: c.web.replace(/^https?:\/\//, '').replace(/\/$/, ''), x: 1 });
    if (c.direccion) items.push({ i: 'pin', h: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(c.direccion), t: c.direccion, x: 1 });

    var legal = [];
    if (c.pie) legal.push('<span>' + esc(c.pie) + '</span>');
    if (yes(c.credito)) legal.push('<span>Hecho con Rider7</span>');

    $('.site-footer').innerHTML = '<div class="footer-inner">' +
      '<h2>' + esc(c.contacto_titulo) + '</h2>' +
      (c.contacto_texto ? '<p class="footer-text">' + esc(c.contacto_texto) + '</p>' : '') +
      (items.length ? '<ul class="contact-list">' + items.map(function (it) {
        return '<li><a href="' + esc(it.h) + '"' + (it.x ? ' target="_blank" rel="noopener"' : '') + '>' + icon(it.i) + '<span>' + esc(it.t) + '</span></a></li>';
      }).join('') + '</ul>' : '') +
      (legal.length ? '<div class="footer-legal">' + legal.join('') + '</div>' : '') +
      '</div>';
  }

  /* ---------------- Vistas ---------------- */

  function show(view) {
    ['home', 'book', 'msg'].forEach(function (v) { $('.view-' + v).hidden = v !== view; });
    document.body.classList.toggle('is-book', view === 'book');
  }

  function showMessage(title, html, loading) {
    $('.msg').innerHTML = (loading ? '<div class="spinner"></div>' : '') +
      (title ? '<h2>' + esc(title) + '</h2>' : '') + (html || '');
    show('msg');
  }

  /* ---------------- Libro ---------------- */

  function destroyFlip() {
    if (state.flip) {
      try { state.flip.destroy(); } catch (e) {}
      state.flip = null;
    }
    $('.book-holder').innerHTML = '';
    $('.book-holder').className = 'book-holder';
  }

  function openBook(col, startPage) {
    if (state.col === col && state.flip) {
      if (startPage !== state.page) { state.flip.turnToPage(normalizePage(startPage)); state.page = state.flip.getCurrentPageIndex(); afterFlip(); }
      return;
    }
    destroyFlip();
    state.col = col;
    show('book');
    setActive(col.path);
    closeMenu();
    window.scrollTo(0, 0);
    document.title = col.titulo + ' · ' + state.cfg.titulo;
    $('.book-title').textContent = col.titulo;
    var back = backTarget(col);
    var bl = $('.book-back');
    bl.setAttribute('href', back.href);
    bl.setAttribute('aria-label', 'Volver a ' + back.label);
    $('span', bl).textContent = back.label;
    $('.book-holder').innerHTML = '<div class="spinner"></div>';

    var bg = $('.bg-blur'), bgImg = $('.bg-blur img');
    bg.classList.remove('ready');
    bgImg.onload = function () { bg.classList.add('ready'); };
    bgImg.src = col.fondo;
    if (bgImg.complete && bgImg.naturalWidth) bg.classList.add('ready');

    var ready = col.ratio ? Promise.resolve() : loadImage(col.imagenes[0]).then(function (im) {
      col.ratio = im.naturalWidth / im.naturalHeight;
    }).catch(function () { col.ratio = 0.75; });

    ready.then(function () {
      if (state.col !== col) return;
      buildFlip(Math.max(0, Math.min(startPage || 0, col.imagenes.length - 1)));
    });
  }

  function computeLayout() {
    var col = state.col;
    // Alto disponible: pantalla menos cabecera y barra de controles (las imágenes quedan pegadas al menú)
    var view = $('.view-book');
    var mobile = window.innerWidth <= 760;
    var cs = getComputedStyle(view);
    var W = view.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - (mobile ? 8 : 128);
    var ui = $('.book-ui');
    var H = $('.vh-probe').offsetHeight - $('.site-header').offsetHeight -
      parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - ui.offsetHeight - parseFloat(getComputedStyle(ui).marginTop);
    H = Math.max(160, H);
    var r = col.ratio || 0.75;
    var pw1 = Math.min(W, H * r);
    var pw2 = Math.min(W / 2, H * r);
    var mode = String(state.cfg.paginas).trim();
    var two;
    if (mode === '1') two = false;
    else if (mode === '2') two = col.imagenes.length > 1;
    else two = W >= 700 && pw2 >= pw1 * 0.6 && col.imagenes.length > 1;
    var pw = Math.max(80, Math.floor(two ? pw2 : pw1));
    return { two: two, pw: pw, ph: Math.floor(pw / r) };
  }

  function buildFlip(start) {
    var col = state.col, c = state.cfg;
    destroyFlip();
    var L = state.layout = computeLayout();
    var holder = $('.book-holder');
    var w = L.two ? L.pw * 2 : L.pw;
    $('.book-stage').style.height = L.ph + 'px';
    holder.style.width = w + 'px';
    holder.style.height = L.ph + 'px';

    var el = document.createElement('div');
    el.style.width = w + 'px';
    el.style.height = L.ph + 'px';
    holder.appendChild(el);

    var n = col.imagenes.length;
    state.cover = yes(c.tapa) && n > 2;
    var hard = state.cover && yes(c.tapa_dura);

    var pages = col.imagenes.map(function (src, i) {
      var p = document.createElement('div');
      p.className = 'page';
      p.setAttribute('data-density', hard && (i === 0 || i === n - 1) ? 'hard' : 'soft');
      p.innerHTML = '<div class="page-inner"><img alt="' + esc(col.titulo) + ' · ' + (i + 1) + '" data-src="' + src + '" draggable="false"><div class="page-loader"></div></div>';
      return p;
    });

    var flip = new St.PageFlip(el, {
      width: L.pw,
      height: L.ph,
      size: 'stretch',
      minWidth: Math.floor(L.two ? L.pw * 0.9 : L.pw * 0.6),
      maxWidth: 5000,
      minHeight: 50,
      maxHeight: 5000,
      autoSize: false,
      usePortrait: true,
      showCover: state.cover,
      flippingTime: num(c.velocidad, 800),
      maxShadowOpacity: 0.55,
      drawShadow: true,
      mobileScrollSupport: true,
      showPageCorners: true,
      startPage: normalizePage(start, L.two)
    });
    state.flip = flip;
    flip.loadFromHTML(pages);
    state.landscape = flip.getOrientation() === 'landscape';
    state.page = flip.getCurrentPageIndex();

    flip.on('flip', function (e) { state.page = e.data; afterFlip(true); });
    flip.on('changeOrientation', function (e) { state.landscape = e.data === 'landscape'; afterFlip(); });
    flip.on('changeState', function (e) {
      if (e.data === 'read') updateShift();
      else holder.classList.remove('shift-right', 'shift-left');
    });

    $('.book-range').max = n - 1;
    afterFlip();
  }

  // En modo doble, el índice debe ser el comienzo de una doble página
  function normalizePage(i, two) {
    if (two === undefined) two = state.landscape;
    if (!two) return i;
    if (state.cover) return i > 0 && i % 2 === 0 ? i - 1 : i;
    return i % 2 === 1 ? i - 1 : i;
  }

  function updateShift() {
    var holder = $('.book-holder');
    var n = state.col ? state.col.imagenes.length : 0;
    holder.classList.remove('shift-right', 'shift-left');
    if (!state.landscape || !state.cover) return;
    if (state.page === 0) holder.classList.add('shift-right');
    else if (n % 2 === 0 && state.page >= n - 1) holder.classList.add('shift-left');
  }

  function visiblePages() {
    var i = state.page, n = state.col.imagenes.length;
    if (!state.landscape) return [i];
    if (state.cover && i === 0) return [0];
    return i + 1 < n ? [i, i + 1] : [i];
  }

  function afterFlip(fromUser) {
    if (!state.flip || !state.col) return;
    var n = state.col.imagenes.length;
    var vis = visiblePages();
    var first = vis[0], last = vis[vis.length - 1];
    $('.book-count').textContent = (first === last ? (first + 1) : (first + 1) + '-' + (last + 1)) + ' / ' + n;
    var range = $('.book-range');
    range.value = first;
    range.style.setProperty('--progress', (n > 1 ? (first / (n - 1)) * 100 : 100) + '%');
    $('.book-arrow.prev').disabled = first <= 0;
    $('.book-arrow.next').disabled = last >= n - 1;
    updateShift();
    lazyLoad();
    if (fromUser) {
      var h = '#/' + state.col.path + (first > 0 ? '/' + (first + 1) : '');
      try { history.replaceState(null, '', h); } catch (e) {}
    }
  }

  function lazyLoad() {
    var from = state.page - 3, to = state.page + 6;
    $$('.book-holder .page img').forEach(function (img, idx) {
      if (idx < from || idx > to || img.getAttribute('src')) return;
      img.onload = function () { img.classList.add('loaded'); };
      img.onerror = function () { img.classList.add('loaded'); };
      img.src = img.dataset.src;
    });
  }

  /* ---------------- Zoom ---------------- */

  function openZoom() {
    if (!state.col) return;
    var vis = visiblePages();
    var box = $('.zoom-scroll');
    box.className = 'zoom-scroll fit' + (vis.length > 1 ? ' two' : '');
    box.innerHTML = vis.map(function (i) { return '<img src="' + state.col.imagenes[i] + '" alt="">'; }).join('');
    $('.zoom').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeZoom() {
    $('.zoom').hidden = true;
    $('.zoom-scroll').innerHTML = '';
    document.body.style.overflow = '';
  }

  /* ---------------- Router ----------------
     #/                    inicio
     #/libro/5             libro, página 5
     #/grupo               portadas del grupo
     #/grupo/libro/3       libro dentro de un grupo
  */

  function route() {
    closeZoom();
    var h = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (h === 'contacto') return showList(null, true);
    var segs = h.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
    var list = state.tree, node = null, i = 0;
    while (i < segs.length && list) {
      var m = list.filter(function (x) { return x.slug === segs[i]; })[0];
      if (!m) break;
      node = m; i++;
      list = m.type === 'group' ? m.children : null;
    }
    if (node && node.type === 'book') {
      var p = segs[i] ? Math.max(0, (parseInt(segs[i], 10) || 1) - 1) : 0;
      return openBook(node, p);
    }
    showList(node && node.type === 'group' ? node : null);
  }

  /* ---------------- Eventos ---------------- */

  function bindEvents() {
    window.addEventListener('hashchange', route);

    $('.menu-toggle').addEventListener('click', function () {
      var nav = $('.site-nav');
      var open = !nav.classList.contains('open');
      nav.classList.toggle('open', open);
      this.setAttribute('aria-expanded', String(open));
    });

    $('.nav-list').addEventListener('click', function (e) {
      var t = e.target.closest('.sub-toggle');
      if (t) {
        e.preventDefault();
        var li = t.closest('.has-sub');
        var open = !li.classList.contains('open');
        if (!document.body.classList.contains('nav-compact')) {
          $$('.has-sub.open').forEach(function (o) { if (!o.contains(li)) setSub(o, false); });
        }
        setSub(li, open);
        return;
      }
      var a = e.target.closest('a');
      if (!a) return;
      // En escritorio, oculta el desplegable aunque el mouse siga encima
      var top = a.closest('.nav-list > .has-sub');
      if (top && !document.body.classList.contains('nav-compact')) {
        top.classList.add('hover-off');
        top.addEventListener('mouseleave', function off() { top.classList.remove('hover-off'); top.removeEventListener('mouseleave', off); });
      }
      closeMenu();
      if (a.dataset.key === '#contacto') {
        e.preventDefault();
        $('#contacto').scrollIntoView({ behavior: 'smooth' });
      }
    });

    // Cierra los submenús al tocar fuera
    document.addEventListener('click', function (e) {
      if (document.body.classList.contains('nav-compact') || e.target.closest('.has-sub')) return;
      $$('.has-sub.open').forEach(function (li) { setSub(li, false); });
    });

    $('.theme-toggle').addEventListener('click', function () {
      var next = effectiveTheme() === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      store('r7-modo', next);
      updateLogo();
    });
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', updateLogo);

    $('.book-arrow.prev').addEventListener('click', function () { if (state.flip) state.flip.flipPrev(); });
    $('.book-arrow.next').addEventListener('click', function () { if (state.flip) state.flip.flipNext(); });
    $('.book-range').addEventListener('input', function () {
      if (!state.flip) return;
      state.flip.turnToPage(normalizePage(parseInt(this.value, 10)));
      state.page = state.flip.getCurrentPageIndex();
      afterFlip(true);
    });

    $('.tool-zoom').addEventListener('click', openZoom);
    $('.zoom-close').addEventListener('click', closeZoom);
    $('.zoom-scroll').addEventListener('click', function (e) {
      if (e.target.tagName !== 'IMG') return closeZoom();
      this.classList.toggle('fit');
    });

    var fullBtn = $('.tool-full');
    if (!document.fullscreenEnabled) fullBtn.hidden = true;
    fullBtn.addEventListener('click', function () {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(function () {});
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeZoom(); $$('.has-sub.open').forEach(function (li) { if (!document.body.classList.contains('nav-compact')) setSub(li, false); }); }
      if (!state.flip || !$('.zoom').hidden) return;
      if (/input|textarea/i.test(document.activeElement.tagName)) return;
      if (e.key === 'ArrowRight') state.flip.flipNext();
      if (e.key === 'ArrowLeft') state.flip.flipPrev();
    });

    window.addEventListener('resize', debounce(function () {
      checkNav();
      if (!state.flip || !state.col) return;
      var L = computeLayout(), P = state.layout;
      if (!P || L.two !== P.two || Math.abs(L.pw - P.pw) > 2) buildFlip(state.page);
    }, 220));
  }

  /* ---------------- Inicio de la app ---------------- */

  function start() {
    bindEvents();
    showMessage('', '', true);
    fetchText('config.txt').then(parseTxt).catch(function () { return {}; }).then(function (cfg) {
      var c = {};
      Object.keys(DEFAULTS).forEach(function (k) { c[k] = DEFAULTS[k]; });
      Object.keys(cfg).forEach(function (k) { if (cfg[k] !== '' || !(k in DEFAULTS)) c[k] = cfg[k]; });
      // claves que pueden quedar vacías a propósito
      ['logo', 'logo_claro', 'inicio_titulo', 'inicio_texto', 'contacto_texto', 'pie', 'descripcion'].forEach(function (k) {
        if (k in cfg) c[k] = cfg[k];
      });
      state.cfg = c;
      applyConfig(c);
      renderFooter();
      return loadTree();
    }).then(function (nodes) {
      state.tree = finishTree(nodes || [], null);
      buildNav();
      if (!state.tree.length) {
        showMessage('Todavía no hay contenido',
          '<p>Creá carpetas dentro de <code>' + esc(state.cfg.carpeta_contenido) + '/</code> con imágenes adentro. Cada carpeta será un elemento del menú.</p>');
        return;
      }
      route();
    }).catch(function (err) {
      console.error(err);
      buildNav();
      var m = String(err && err.message);
      var help = '<p>No se pudo leer el listado de carpetas.</p>';
      if (m === 'NO_REPO' || m === 'SIN_LISTADO') help = '<p>No pude leer las carpetas de <code>' + esc(state.cfg.carpeta_contenido) + '/</code>.</p>' +
        '<p>Si el sitio está en Cloudflare Pages o con dominio propio, completá <code>github_repositorio: usuario/repositorio</code> en <code>config.txt</code> (el repositorio tiene que ser público).</p>' +
        '<p>Para probar en tu computadora abrí la carpeta con un servidor que muestre listados de carpetas (ver README).</p>';
      else if (m === 'NO_DRIVE') help = '<p>Para usar Google Drive completá <code>drive_carpeta_id</code> y <code>drive_api_key</code> en <code>config.txt</code>.</p>';
      else help += '<p><code>' + esc(m) + '</code></p>';
      showMessage('Algo no salió bien', help);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
