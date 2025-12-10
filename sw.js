const CACHE_NAME = 'compapol-github-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './styles.css',
  './js/odt_zip.js',
  './js/compa_documentos.js',
  './Compaodac.html',
  './diligencias.html',
  './compa_theme.css',
  './js/paises.js',
  './js/provincias_es.js',
  './js/municipios.js',
  './js/calles.js',
  './plantillas/plantilla_amarillas.js',
  './plantillas/plantilla_azules.js',
  './plantillas/plantilla_derechos_espanol.js',
  './plantillas/plantilla_derechos_ingles.js',
  './plantillas/plantilla_derechos_arabe.js',
  './plantillas/plantilla_derechos_italiano.js',
  './plantillas/plantilla_derechos_ruso.js',
  './plantillas/plantilla_fax.js',
  './js/diligencias_data.js',
  './js/diligencias_rules.js',
  './js/remisionguardado.js',
  './js/jszip.min.js',
  './js/FileSaver.min.js',
  './plantillas/plantilla_declaracion.js',
  './plantillas/plantilla_ofidinero.js',
  './plantillas/plantilla_ofiadn1.js',
  './plantillas/plantilla_adnconsen.js',
  './plantillas/plantilla_entregamenor.js',
  './plantillas/plantilla_jidlcita.js',
  './plantillas/plantilla_jrdcita.js',
  './plantillas/plantilla_ofrecimiento.js',
  './plantillas/plantilla_ofrecimientoingles.js',
  './plantillas/plantilla_dereviogen.js',
  './plantillas/plantilla_viogenrights.js',
  './js/documentos.js',
  './plantillas/plantilla_comparecencia_total.js',
  './js/entrada_logo',
  './js/compa_quick_menu.js',
  // ➕ añade aquí el resto de JS/CSS/HTML que quieras offline
];

// Instala el SW: añade cada asset individualmente (tolerando 404) y toma control inmediato
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        ASSETS.map(path =>
          cache.add(path).catch(err => {
            console.warn('[SW] No se pudo cachear', path, err);
          })
        )
      ).then(() => self.skipWaiting())
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});



