

(function(){
  'use strict';

  // Vista ampliada de detenido para COMPA
  // - Ocupa la misma zona que el documento (#doc)
  // - Se abre desde fuera llamando a CompaDetenidoDetalle.open(detObj, index)
  // - detObj es el objeto de filiación/detenido (se edita por referencia)

  let docArea      = null;
  let docPanel     = null;
  let docHead      = null;
  let docLabel     = null;
  let view         = null;
  let currentDet   = null;
  let currentIndex = null;
  let reviewComplete    = false;

let reviewGuardActive = true;

  let reviewedIndices = new Set();

  // Campos que solo se muestran como resumen (ya suelen estar en la barra lateral)
  const SUMMARY_FIELDS = [
    { k: 'Condición',          label: 'Condición' },
    { k: 'Nombre',             label: 'Nombre' },
    { k: 'Apellidos',          label: 'Apellidos' },
    { k: 'Sexo',               label: 'Sexo' },
    { k: 'Tipo de documento',  label: 'Tipo documento' },
    { k: 'Nº Documento',       label: 'Nº documento' },
    { k: 'Nacionalidad',       label: 'Nacionalidad' },
    { k: 'Fecha de nacimiento',label: 'Fecha nacimiento' },
    { k: 'Lugar de nacimiento',label: 'Lugar nacimiento' },
    { k: 'Domicilio',          label: 'Domicilio' },
    { k: 'Teléfono',           label: 'Teléfono' }
  ];

  // Campos extra que normalmente NO se ven en la barra lateral
  // Todos los campos son type: 'text', y los que correspondan llevan list: ...
  const EXTRA_FIELDS = [
    // ---- Bloque: Núcleo diligencias / delito ----
    { k: 'Diligencias',                   label: 'Diligencias' },
    { k: 'Delito',                        label: 'Delito(s)', list: 'detListaDelitos' },
    { k: 'C.P. Agentes',                  label: 'Agentes' },
    { k: 'Instructor',                    label: 'Instructor' },
    { k: 'Indicativo',                    label: 'Indicativo' },

    // ---- Bloque: Relato de hechos ----
    { k: 'Breve resumen de los hechos',   label: 'Breve resumen de los hechos' },
    { k: 'Indicios por los que se detiene',label: 'Indicios por los que se detiene' },

    // ---- Bloque: Asistencia / derechos ----
    { k: 'Abogado',                       label: 'Abogado' },
    { k: 'Comunicarse con',               label: 'Comunicarse con' },
    { k: 'Informar de detención',         label: 'Informar detención' },
    { k: 'Intérprete',                    label: 'Intérprete' },
    { k: 'Médico',                        label: 'Médico' },
    { k: 'Consulado',                     label: 'Consulado' },

    // ---- Bloque: Nacimiento normalizado ----
    { k: 'pais-nacimiento',               label: 'País nacimiento',  list: 'detListaPaises' },
    { k: 'provincia-nacimiento',          label: 'Provincia nacimiento',           list: 'detListaProvincias' },
    { k: 'municipio-nacimiento',          label: 'Municipio nacimiento',           list: 'detListaMunicipios' },

    // ---- Bloque: Domicilio extendido ----
    { k: 'Domicilio',                     label: 'Domicilio' },
    { k: 'provincia-domicilio',           label: 'Provincia domicilio',            list: 'detListaProvincias' },
    { k: 'municipio-domicilio',           label: 'Municipio domicilio',            list: 'detListaMunicipios' },

    // ---- Bloque: Hecho (calles / municipio / hora) ----
    { k: 'via-hecho',                     label: 'Vía (hecho)',                       list: 'detListaCalles' },
    { k: 'restodireccion-hecho',          label: 'Resto direc. (hecho)', },
    { k: 'municipio-hecho',               label: 'Muni.hecho',               list: 'detListaMunicipios' },
    { k: 'Hora del hecho',                label: 'Hora hecho' },

    // ---- Bloque: Detención (calles / municipio / hora) ----
    { k: 'via-detencion',                 label: 'Vía (detención)',                   list: 'detListaCalles' },
    { k: 'restodireccion-detencion',      label: 'Resto direc. (detención)', },
    { k: 'municipio-detencion',           label: 'Muni. det.',         list: 'detListaMunicipios' },
    { k: 'Hora de la detención',          label: 'Hora det.' },

    // ---- Bloque: Metadatos / control ----
    // Usamos la misma clave que el resto de JSON ("Fecha de generación"),
    // pero al usuario se le muestra como "Fecha de detención".
    { k: 'Fecha de generación',           label: 'F.detención' }
  ];

  // Campos requeridos en la vista de detenido (borde rojo si están vacíos)
  function updateRequiredHighlight(){
    if (!view) return;
    var required = [
      'Diligencias',
      'Fecha de generación',
      'Delito',
      'Instructor',
      'C.P. Agentes',
      'municipio-hecho',
      'Hora del hecho'
    ];
    required.forEach(function(k){
      var input = view.querySelector('.det-ext-input[data-k="' + k + '"]');
      if (!input) return;
      var val = (input.value || '').trim();
      if (!val){
        input.style.borderColor = 'rgba(248,113,113,.95)';
        input.style.boxShadow = '0 0 6px rgba(248,113,113,.7)';
      }else{
        input.style.borderColor = 'rgba(148,163,184,.6)';
        input.style.boxShadow = 'none';
      }
    });
  }

  function requiredFieldsFilled(){
    if (!view) return false;
    var required = [
      'Diligencias',
      'Fecha de generación',
      'Delito',
      'Instructor',
      'municipio-hecho',
      'Hora del hecho'
    ];
    for (var i = 0; i < required.length; i++){
      var k = required[i];
      var input = view.querySelector('.det-ext-input[data-k="' + k + '"]');
      if (!input) continue;
      var val = (input.value || '').trim();
      if (!val){
        return false;
      }
    }
    return true;
  }

  function $(sel, root){
    return (root || document).querySelector(sel);
  }

  function ensureView(){
    if (view) return;
    docArea = document.getElementById('doc');
    if (!docArea || !docArea.parentNode) return;

    docPanel = docArea.closest('#panel-documento') || null;
    if (docPanel){
      docHead  = docPanel.querySelector('.head') || null;
      docLabel = docPanel.querySelector('label[for="doc"]') || null;
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'vistaDetenido';
    wrapper.style.display = 'none';
    wrapper.className = 'det-ext-wrapper';
    wrapper.innerHTML = buildViewHTML();

    docArea.parentNode.insertBefore(wrapper, docArea.nextSibling);
    view = wrapper;

    // Inicializar datalists la primera vez
    initDetenidoDatalists();

    // Eventos internos
    view.addEventListener('input', onFieldInput, true);
    view.addEventListener('focusin', onFieldFocus, true);

        // Acordeón: al abrir una sección, se cierran las otras y se marca como visitada
    view.addEventListener('toggle', function(ev){
      const d = ev.target;
      if (!d || d.tagName !== 'DETAILS' || !d.classList.contains('det-ext-group')) return;
      
      if (!d.open) return; // solo actuamos cuando se abre
      const all = view.querySelectorAll('details.det-ext-group');
      all.forEach(function(other){
        if (other !== d) other.open = false;
      });
      markSectionVisited(d);
            // Resaltar el bloque activo
      all.forEach(g=>{
        g.style.outline = 'none';
        g.style.boxShadow = 'none';
      });
      d.style.outline = '1px solid rgba(255,255,255,.35)';
      d.style.boxShadow = '0 0 8px rgba(255,255,255,.3)';
    }, true);

    const tramBtn = view.querySelector('#btnTramitesReview');
    if (tramBtn){
      tramBtn.addEventListener('click', function(){
        if (!reviewComplete){
          alert('Revisar cada apartado del detenido antes de descargar los trámites.');
          return;
        }
        triggerTramites();
      });
    }


  }

  function buildViewHTML(){
    // Helper para buscar metadatos de un campo
    function metaFor(k){
      return EXTRA_FIELDS.find(f => f.k === k);
    }
    // Helper para construir un input con su label (centrados)
    function fieldHTML(k, extraStyle){
      const m = metaFor(k);
      if (!m) return '';
      const listAttr = m.list ? ' list="' + escapeHTMLAttr(m.list) + '"' : '';
      const baseStyle = 'display:flex;flex-direction:column;align-items:center;text-align:center;';
      const styleAttr = ' style="' + baseStyle + (extraStyle ? ';' + extraStyle : '') + '"';
      // Hora del hecho / detención como <input type="time">, resto text
      const inputType =
        (m.k === 'Hora del hecho' || m.k === 'Hora de la detención')
          ? 'time'
          : 'text';
      return (
        '<div class="det-ext-field"' + styleAttr + '>' +
          '<label class="det-ext-label" style="text-align:center;color:#b1ae01;font-weight:600;">' +
            escapeHTML(m.label) +
          '</label>' +
          '<input type="' + inputType + '" data-k="' + escapeHTMLAttr(m.k) + '" class="det-ext-input"' + listAttr +
            ' style="text-align:center;background:transparent;border:1px solid rgba(148,163,184,.6);color:inherit;" />' +
        '</div>'
      );
    }
    // Cabecera: Diligencias + Delito + Fecha de detención + fila 2 (Instructor, C.P. Agentes, Indicativo)
    const headerRow =
      '<div class="det-ext-header-row" ' +
           'style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;padding:12px 8px 18px;max-width:98%;margin-left:0;margin-right:auto;">' +
        fieldHTML('Diligencias',        'flex:0 0 110px;max-width:110px;') +
        fieldHTML('Fecha de generación','flex:0 0 110px;max-width:110px;') +
        fieldHTML('Delito',             'flex:1;min-width:150px;') +
        fieldHTML('Instructor',         'flex:0 0 110px;max-width:110px;') +
        fieldHTML('C.P. Agentes',       'flex:1;min-width:150px;') +
        fieldHTML('Indicativo',         'flex:0 0 110px;max-width:110px;') +
      '</div>';

    // Fila 3: País nac., Provincia nac., Municipio nac., Provincia domicilio, Municipio domicilio (con línea difuminada)
    const row3 =
      '<div class="det-ext-row det-row-3" ' +
           'style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;padding:12px 8px 18px;max-width:98%;margin-left:0;margin-right:auto;">' +
        fieldHTML('pais-nacimiento',      'flex:1;min-width:110px;') +
        fieldHTML('provincia-nacimiento', 'flex:1;min-width:130px;') +
        fieldHTML('municipio-nacimiento', 'flex:1;min-width:130px;') +
        fieldHTML('provincia-domicilio',  'flex:1;min-width:130px;') +
        fieldHTML('municipio-domicilio',  'flex:1;min-width:130px;') +
      '</div>';

    // Fila 5: Municipio hecho, Vía hecho, Resto hecho, Hora hecho (con línea difuminada)
    const row5 =
      '<div class="det-ext-row det-row-5" ' +
           'style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;padding:12px 8px 18px;max-width:98%;margin-left:0;margin-right:auto;">' +
        fieldHTML('municipio-hecho',      'flex:0 0 100px;max-width:100px;') +
        fieldHTML('via-hecho',            'flex:1.5;min-width:270px;') +
        fieldHTML('restodireccion-hecho', 'flex:1.5;min-width:300px;') +
        fieldHTML('Hora del hecho',       'flex:0 0 100px;max-width:100px;') +
      '</div>';

    // Fila 6: Municipio detención, Vía detención, Resto detención, Hora detención
const row6 =
  '<div class="det-ext-row det-row-6" ' +
       'style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;padding:12px 8px 18px;max-width:98%;margin-left:0;margin-right:auto;">' +
    fieldHTML('municipio-detencion',      'flex:0 0 100px;max-width:100px;') +
    fieldHTML('via-detencion',            'flex:1.2;min-width:270px;') +
    fieldHTML('restodireccion-detencion', 'flex:1.2;min-width:300px;') +
    fieldHTML('Hora de la detención',     'flex:0 0 100px;max-width:100px;') +
  '</div>';

    // Fila 7+8: Abogado, Comunicarse con, Informar de detención, Intérprete, Médico, Consulado (con línea difuminada)
    const row7 =
      '<div class="det-ext-row det-row-7" ' +
           'style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;padding:12px 8px 18px;max-width:98%;margin-left:0;margin-right:auto;">' +
        fieldHTML('Abogado',             'flex:1;min-width:120px;') +
        fieldHTML('Comunicarse con',     'flex:1;min-width:120px;') +
        fieldHTML('Informar de detención','flex:1;min-width:120px;') +
        fieldHTML('Intérprete',          'flex:1;min-width:110px;') +
        fieldHTML('Médico',              'flex:1;min-width:110px;') +
        fieldHTML('Consulado',           'flex:1;min-width:110px;') +
      '</div>';

    // Fila 9: Resumen, Indicios (dos columnas anchas)
    const row9 =
      '<div class="det-ext-row det-row-9" ' +
           'style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;padding:12px 8px 18px;width:100%;">' +
        fieldHTML('Breve resumen de los hechos',   'flex:1;min-width:260px;') +
        fieldHTML('Indicios por los que se detiene','flex:1;min-width:260px;') +
      '</div>';

    return (
      '<div class="det-ext-body">' +
        // Procedimiento / diligencias
      '<details class="det-ext-group" ' +
         'style="margin-top:18px;margin-bottom:26px;">' +
        '<summary style="width:100%;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative;color: var(--label-accent);">DATOS GENERALES <span class="det-group-check" style="position:absolute;right:10px;opacity:0;">✅</span></summary>' +
          '<div class="det-ext-grid" style="display:flex;flex-direction:column;gap:0;">' +
            headerRow +
          '</div>' +
        '</details>' +
        // Nacimiento y domicilio
        '<details class="det-ext-group" ' +
           'style="margin-top:18px;margin-bottom:26px;">' +
          '<summary style="width:100%;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative;color: var(--label-accent);">NACIMIENTO Y DOMICILIO <span class="det-group-check" style="position:absolute;right:10px;opacity:0;">✅</span></summary>' +
          '<div class="det-ext-grid" style="display:flex;flex-direction:column;gap:0;">' +
            row3 +
          '</div>' +
        '</details>' +
        // Lugar del hecho
        '<details class="det-ext-group" ' +
           'style="margin-top:18px;margin-bottom:26px;">' +
          '<summary style="width:100%;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative;color: var(--label-accent);">LUGAR DEL HECHO <span class="det-group-check" style="position:absolute;right:10px;opacity:0;">✅</span></summary>' +
          '<div class="det-ext-grid" style="display:flex;flex-direction:column;gap:0;">' +
            row5 +
          '</div>' +
        '</details>' +
        // Lugar de la detención
        '<details class="det-ext-group" ' +
           'style="margin-top:18px;margin-bottom:26px;">' +
          '<summary style="width:100%;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative;color: var(--label-accent);">LUGAR DE LA DETENCIÓN <span class="det-group-check" style="position:absolute;right:10px;opacity:0;">✅</span></summary>' +
          '<div class="det-ext-grid" style="display:flex;flex-direction:column;gap:0;">' +
            row6 +
          '</div>' +
        '</details>' +
        // Asistencia y comunicaciones
        '<details class="det-ext-group" ' +
           'style="margin-top:18px;margin-bottom:26px;">' +
          '<summary style="width:100%;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative;color: var(--label-accent);">DERECHOS <span class="det-group-check" style="position:absolute;right:10px;opacity:0;">✅</span></summary>' +
          '<div class="det-ext-grid" style="display:flex;flex-direction:column;gap:0;">' +
            row7 +
          '</div>' +
        '</details>' +
        // Resumen e indicios
        '<details class="det-ext-group" ' +
           'style="margin-top:18px;margin-bottom:26px;">' +
          '<summary style="width:100%;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative;color: var(--label-accent);">RESUMEN E INDICIOS <span class="det-group-check" style="position:absolute;right:10px;opacity:0;">✅</span></summary>' +
          '<div class="det-ext-grid" style="display:flex;flex-direction:column;gap:0;">' +
            row9 +
          '</div>' +
        '</details>' +
        '<div id="tramitesReviewWrapper" style="margin-top:18px;text-align:center;display:none;">' +
          '<button type="button" id="btnTramitesReview" class="btn" style="min-width:220px;transition:0.25s;">Descargar trámites</button>' +
          '<style>' +
          '#btnTramitesReview{' +
          '  background:rgba(15,23,42,.9);' +
          '  border:1px solid rgba(34,197,94,.6);' +
          '  box-shadow:0 0 10px rgba(34,197,94,.35), inset 0 0 0 rgba(34,197,94,0);' +
          '}' +
          '#btnTramitesReview:hover{' +
          '  transform:scale(1.04);' +
          '  background:radial-gradient(circle at 50% 0,rgba(34,197,94,0.45),rgba(5,46,22,0.95));' +
          '  box-shadow:0 0 18px rgba(34,197,94,0.9), 0 0 26px rgba(16,185,129,0.75) inset;' +
          '}' +
          '#btnTramitesReview:active{' +
          '  transform:scale(0.97);' +
          '  box-shadow:0 0 22px rgba(16,185,129,0.95), 0 0 30px rgba(4,120,87,0.9) inset;' +
          '}' +
          '</style>' +
        '</div>' +
      '</div>' +
      // Datalists para los inputs
      '<datalist id="detListaPaises"></datalist>' +
      '<datalist id="detListaProvincias"></datalist>' +
      '<datalist id="detListaMunicipios"></datalist>' +
      '<datalist id="detListaCalles"></datalist>' +
      '<datalist id="detListaDelitos">' +
        '<option value="HURTO">HURTO</option>' +
        '<option value="DAÑOS">DAÑOS</option>' +
        '<option value="ESTAFA">ESTAFA</option>' +
        '<option value="ROBO CON VIOLENCIA">ROBO CON VIOLENCIA</option>' +
        '<option value="ROBO CON FUERZA">ROBO CON FUERZA</option>' +
        '<option value="ROBO USO DE VEHÍCULO">ROBO USO DE VEHÍCULO</option>' +
        '<option value="HURTO USO DE VEHÍCULO">HURTO USO DE VEHÍCULO</option>' +
        '<option value="APROPIACIÓN INDEBIDA">APROPIACIÓN INDEBIDA</option>' +
        '<option value="LESIONES">LESIONES</option>' +
        '<option value="HOMICIDIO">HOMICIDIO</option>' +
        '<option value="AMENAZAS GRAVES">AMENAZAS GRAVES</option>' +
        '<option value="ACOSO">ACOSO</option>' +
        '<option value="MALOS TRATOS EN EL ÁMBITO FAMILIAR">MALOS TRATOS EN EL ÁMBITO FAMILIAR</option>' +
        '<option value="COACCIONES">COACCIONES</option>' +
        '<option value="ABUSO SEXUAL">ABUSO SEXUAL</option>' +
        '<option value="AGRESIÓN SEXUAL">AGRESIÓN SEXUAL</option>' +
        '<option value="VIOLACIÓN">VIOLACIÓN</option>' +
        '<option value="ATENTADO AGENTE AUTORIDAD">ATENTADO AGENTE AUTORIDAD</option>' +
        '<option value="RESISTENCIA / DESOBEDIENCIA">RESISTENCIA / DESOBEDIENCIA</option>' +
        '<option value="CONTRA LA SEGURIDAD VIAL">CONTRA LA SEGURIDAD VIAL</option>' +
        '<option value="CONTRA LA SALUD PÚBLICA">CONTRA LA SALUD PÚBLICA</option>' +
        '<option value="TRÁFICO DE DROGAS">TRÁFICO DE DROGAS</option>' +
        '<option value="FALSEDAD DOCUMENTAL">FALSEDAD DOCUMENTAL</option>' +
        '<option value="RECLAMACIÓN JUDICIAL">RECLAMACIÓN JUDICIAL</option>' +
        '<option value="QUEBRANTAMIENTO DE CONDENA">QUEBRANTAMIENTO DE CONDENA</option>' +
        '<option value="RIÑA TUMULTUARIA">RIÑA TUMULTUARIA</option>' +
        '<option value="DETENCIÓN ILEGAL">DETENCIÓN ILEGAL</option>' +
        '<option value="OMISIÓN DEL DEBER DE SOCORRO">OMISIÓN DEL DEBER DE SOCORRO</option>' +
        '<option value="ALLANAMIENTO DE MORADA">ALLANAMIENTO DE MORADA</option>' +
      '</datalist>'
    );
  }

  function resetReviewState(){
    reviewComplete = false;
    reviewGuardActive = true;
    if (!view) return;
    const groups = view.querySelectorAll('details.det-ext-group');
    groups.forEach(function(g){
      g.open = false;
      g.removeAttribute('data-visited');
      const chk = g.querySelector('.det-group-check');
      if (chk) chk.style.opacity = '0';
    });
    const wrap = view.querySelector('#tramitesReviewWrapper');
    if (wrap) wrap.style.display = 'none';
  }

  function markAllVisitedFromPersistence(){
    if (!view) return;
    const groups = view.querySelectorAll('details.det-ext-group');
    groups.forEach(function(g){
      g.setAttribute('data-visited','1');
      const chk = g.querySelector('.det-group-check');
      if (chk) chk.style.opacity = '1';
    });
    const wrap = view.querySelector('#tramitesReviewWrapper');
    if (wrap) wrap.style.display = 'block';
    reviewComplete = true;
    reviewGuardActive = false;
  }

  function markSectionVisited(d){
    if (!view || !d) return;
    d.setAttribute('data-visited','1');
    const chk = d.querySelector('.det-group-check');
    if (chk) chk.style.opacity = '1';

    const all = view.querySelectorAll('details.det-ext-group');
    let allVisited = true;
    all.forEach(function(other){
      if (other.getAttribute('data-visited') !== '1'){
        allVisited = false;
      }
    });
    if (allVisited){
      // Antes de marcar la revisión como completa, comprobar que los campos requeridos no están vacíos
      if (!requiredFieldsFilled()){
        alert('Hay campos obligatorios sin rellenar (Diligencias, F. detención, Delito, Instructor, Muni.hecho y Hora hecho).');
        return;
      }
      reviewComplete = true;
      reviewGuardActive = false;
      const wrap = view.querySelector('#tramitesReviewWrapper');
      if (wrap) wrap.style.display = 'block';
      if (typeof currentIndex === 'number'){
        reviewedIndices.add(currentIndex);
      }
      // Marcar en el propio detenido que ya pasó revisión (persiste en localStorage)
      if (currentDet){
        currentDet.__detalleRevisado = true;
        try{
          if (typeof window.save === 'function') window.save();
        }catch(_){}
      }
    }
  }

  function triggerTramites(){
    // Llamar directamente al mismo flujo que el botón "Trámites🧾" lateral
    if (typeof window.CompaExportDetenidoODTJSON === 'function' && currentDet){
      const idx = (typeof currentIndex === 'number') ? currentIndex : -1;
      try{
        window.CompaExportDetenidoODTJSON(currentDet, idx);
      }catch(e){
        console.error('Error al exportar ODT/JSON desde ficha ampliada', e);
      }
    } else {
      console.warn('CompaExportDetenidoODTJSON no está disponible o no hay detenido activo.');
    }
  }

  function escapeHTML(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function escapeHTMLAttr(s){
    return escapeHTML(s).replace(/"/g, '&quot;');
  }

  function normKey(s){
    return String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .toUpperCase()
      .trim();
  }

  function getMunicipiosForProvincia(provRaw){
    if (!window.MUNICIPIOS_ES || typeof window.MUNICIPIOS_ES !== 'object') return [];
    if (!provRaw) return [];
    const base = normKey(provRaw);
    let arr = window.MUNICIPIOS_ES[base];
    if (!Array.isArray(arr)){
      const alt = base.split('/')[0];
      if (alt && window.MUNICIPIOS_ES[alt]){
        arr = window.MUNICIPIOS_ES[alt];
      }
    }
    return Array.isArray(arr) ? arr.slice() : [];
  }

  // Devuelve SIEMPRE los municipios de Tenerife (por nombre robusto en PROVINCIAS_ES)
  function getMunicipiosTenerife(){
    if (!window.MUNICIPIOS_ES || typeof window.MUNICIPIOS_ES !== 'object') return [];
    if (!Array.isArray(window.PROVINCIAS_ES)) return [];
    // Buscar la provincia cuyo nombre contenga "TENERIFE" (forma robusta)
    let prov = null;
    for (let i = 0; i < window.PROVINCIAS_ES.length; i++){
      const p   = window.PROVINCIAS_ES[i];
      const nom = p && (p.NOMBRE || p.nombre || p);
      if (!nom) continue;
      const nk = normKey(nom);
      if (nk.indexOf('TENERIFE') !== -1){
        prov = nom;
        break;
      }
    }
    if (!prov) return [];
    const key = normKey(prov);
    const arr = window.MUNICIPIOS_ES[key];
    return Array.isArray(arr) ? arr.slice() : [];
  }

  function getCallesForMunicipio(munRaw){
    if (!window.CALLEJERO || typeof window.CALLEJERO !== 'object') return [];
    if (!munRaw) return [];
    const key = normKey(munRaw);
    const tipos = window.CALLEJERO[key];
    if (!tipos || typeof tipos !== 'object') return [];
    const all = [];
    Object.keys(tipos).forEach(function(tipo){
      const arr = tipos[tipo];
      if (Array.isArray(arr)){
        arr.forEach(function(n){
          if (n) all.push(n);
        });
      }
    });
    return all;
  }

  function guessProvinciaForMunicipios(){
    if (!currentDet) return null;
    const keys = ['provincia-domicilio','provincia-nacimiento'];
    for (let i = 0; i < keys.length; i++){
      const v = currentDet[keys[i]];
      if (v && String(v).trim() !== '') return v;
    }
    return null;
  }

  function fillFromCurrent(){
    if (!view || !currentDet) return;
    // Solo rellenar los campos de EXTRA_FIELDS
    EXTRA_FIELDS.forEach(f => {
      const el = view.querySelector('[data-k="' + f.k + '"]');
      if (!el) return;

      // Caso especial: Fecha de generación (fecha de detención)
      if (f.k === 'Fecha de generación') {
        let raw = currentDet[f.k];
        raw = (raw == null) ? '' : String(raw).trim();

        // Si no hay fecha previa (expediente nuevo), poner por defecto la fecha actual dd/mm/aaaa
        if (!raw) {
          const today = new Date();
          const dd   = String(today.getDate()).padStart(2,'0');
          const mm   = String(today.getMonth() + 1).padStart(2,'0');
          const yyyy = today.getFullYear();
          raw = dd + '/' + mm + '/' + yyyy;

          // Guardar en el detenido en memoria
          currentDet[f.k] = raw;

          // Reflejar también en state.filiaciones[currentIndex], si existe
          try{
            if (typeof window.state === 'object' &&
                Array.isArray(window.state.filiaciones) &&
                typeof currentIndex === 'number' &&
                window.state.filiaciones[currentIndex]) {
              window.state.filiaciones[currentIndex][f.k] = raw;
            }
          }catch(_){/* noop */}

          // Disparar guardado para que quede persistido
          try{
            if (typeof window.save === 'function') {
              window.save();
            }
          }catch(_){/* noop */}
        }

        el.value = raw;
        return;
      }

      // Caso especial: Hora del hecho y Hora de la detención
      if (f.k === 'Hora del hecho' || f.k === 'Hora de la detención') {
        let raw = currentDet[f.k];
        raw = (raw == null) ? '' : String(raw).trim();

        // Si no hay hora previa, usamos la hora actual HH:MM
        if (!raw) {
          const now = new Date();
          const hh = String(now.getHours()).padStart(2, '0');
          const mm = String(now.getMinutes()).padStart(2, '0');
          raw = hh + ':' + mm;

          currentDet[f.k] = raw;

          try{
            if (typeof window.state === 'object' &&
                Array.isArray(window.state.filiaciones) &&
                typeof currentIndex === 'number' &&
                window.state.filiaciones[currentIndex]) {
              window.state.filiaciones[currentIndex][f.k] = raw;
            }
          }catch(_){/* noop */}

          try{
            if (typeof window.save === 'function') {
              window.save();
            }
          }catch(_){/* noop */}
        }

        el.value = raw;
        return;
      }

      // Resto de campos: comportamiento original
      const val = currentDet[f.k];
      el.value = (val == null) ? '' : String(val);
    });
    updateRequiredHighlight();
  }
  // --- Datalist helpers ---
  let dlsInitialized = false;
  function populateDatalistLocal(id, items){
    if (!view) return;
    const dl = view.querySelector('#' + id);
    if (!dl || !Array.isArray(items) || !items.length) return;
    dl.innerHTML = items.map(v => '<option value="' + escapeHTMLAttr(v) + '"></option>').join('');
  }
  function initDetenidoDatalists(){
    if (dlsInitialized || !view) return;
    dlsInitialized = true;
    try{
      // Paises
      if (window.PAISES){
        const base = (window.PAISES.featured || []).concat(
          window.PAISES.groups ? window.PAISES.groups.flatMap(g => g.items || []) : []
        );
        populateDatalistLocal('detListaPaises', base);
      }
    }catch(_){}
    try{
      if (Array.isArray(window.PROVINCIAS_ES)){
        const provs = window.PROVINCIAS_ES.map(p => p.NOMBRE || p.nombre || p).filter(Boolean);
        populateDatalistLocal('detListaProvincias', provs);
      }
    }catch(_){}
  }

  function onFieldFocus(ev){
    const target = ev.target;
    if (!target || !target.matches('.det-ext-input')) return;
    if (!currentDet) return;

    const key = target.getAttribute('data-k') || '';
    if (!key) return;

    // Municipios HECHO / DETENCIÓN: sugerir siempre municipios de Tenerife (no obligatorio)
    if (key === 'municipio-hecho' || key === 'municipio-detencion'){
      const listaTfe = getMunicipiosTenerife();
      if (listaTfe && listaTfe.length){
        populateDatalistLocal('detListaMunicipios', listaTfe);
      }
      return;
    }

    // Municipios NACIMIENTO / DOMICILIO: seguir usando la provincia detectada
    if (key === 'municipio-nacimiento' || key === 'municipio-domicilio'){
      const provName = guessProvinciaForMunicipios();
      const lista = getMunicipiosForProvincia(provName);
      if (lista && lista.length){
        populateDatalistLocal('detListaMunicipios', lista);
      }
      return;
    }

    // Calles del HECHO: filtrar por municipio del hecho (Adeje / Arona / etc.)
    if (key === 'via-hecho' || key === 'restodireccion-hecho'){
      const mun = currentDet['municipio-hecho'] || '';
      const calles = getCallesForMunicipio(mun);
      if (calles && calles.length){
        populateDatalistLocal('detListaCalles', calles);
      }
      return;
    }

    // Calles de la DETENCIÓN: filtrar por municipio de la detención
    if (key === 'via-detencion' || key === 'restodireccion-detencion'){
      const mun = currentDet['municipio-detencion'] || '';
      const calles = getCallesForMunicipio(mun);
      if (calles && calles.length){
        populateDatalistLocal('detListaCalles', calles);
      }
      return;
    }
  }

  function onFieldInput(ev){
    const target = ev.target;
    if (!target || !target.matches('.det-ext-input')) return;
    if (!currentDet) return;

    const key = target.getAttribute('data-k');
    if (!key) return;

    // Actualiza el objeto de detenido actualmente cargado
    currentDet[key] = target.value;

    // Reflejar también el cambio en state.filiaciones[currentIndex], si existe
    try{
      if (typeof window.state === 'object' &&
          Array.isArray(window.state.filiaciones) &&
          typeof currentIndex === 'number' &&
          window.state.filiaciones[currentIndex]) {
        window.state.filiaciones[currentIndex][key] = target.value;
      }
    }catch(_){/* noop */}

    // Guardar inmediatamente tras el cambio
    try{
      if (typeof window.save === 'function') {
        window.save();
      }
    }catch(_){/* noop */}

    // Actualizar bordes rojos de campos requeridos
    updateRequiredHighlight();
  }

  function showView(){
    if (!docArea || !view) return;
    // Ocultamos solo el área de comparecencia (editor + cabecera de botones)
    docArea.style.display = 'none';
    if (docHead)  docHead.style.display  = 'none';
    if (docLabel) docLabel.style.display = 'none';
    // Mostramos la ficha ocupando toda la tarjeta
    view.style.display = 'block';
  }

  function hideView(){
    if (!docArea || !view) return;
    // Ocultamos ficha y restauramos modo comparecencia completo (botones + editor)
    view.style.display = 'none';
    if (docHead)  docHead.style.display  = '';
    if (docLabel) docLabel.style.display = '';
    docArea.style.display = '';
  }

  function isViewVisible(){
    return !!(view && view.style.display !== 'none');
  }

  // API pública mínima
  window.CompaDetenidoDetalle = {
    /**
     * Abre la vista ampliada para un detenido.
     * @param {Object} detObj  Objeto de detenido / filiación (se edita por referencia).
     * @param {number} index   Índice opcional del detenido en la lista.
     */
    open: function(detObj, index){
      ensureView();
      if (!view){
        console.warn('No se pudo inicializar vistaDetenido: falta #doc');
        return;
      }
      if (!detObj){
        console.warn('CompaDetenidoDetalle.open(): detObj vacío');
        return;
      }
      currentDet   = detObj;
      currentIndex = (typeof index === 'number') ? index : null;

      const alreadyReviewed =
        !!(detObj && detObj.__detalleRevisado) ||
        (typeof currentIndex === 'number' && reviewedIndices.has(currentIndex));

      if (alreadyReviewed){
        // No obligamos a repasar; restauramos estado de revisión y ✅
        fillFromCurrent();
        showView();
        markAllVisitedFromPersistence();
      } else {
        // Primera vez: reset y revisión obligatoria
        resetReviewState();
        fillFromCurrent();
        showView();
      }
    },

    /**
     * Cierra la vista ampliada y vuelve a la comparecencia.
     */
    close: function(){
      hideView();
      currentDet   = null;
      currentIndex = null;
    },

    /**
     * Abre o cierra la vista ampliada usando el mismo botón de la ficha lateral.
     * Si ya está abierta para este mismo detenido, cierra. Si no, abre.
     */
    toggle: function(detObj, index){
      ensureView();
      if (!view){
        console.warn('No se pudo inicializar vistaDetenido: falta #doc');
        return;
      }
      if (!detObj){
        console.warn('CompaDetenidoDetalle.toggle(): detObj vacío');
        return;
      }
      // Si ya está abierta para este detenido, cerramos
      if (isViewVisible() && currentDet === detObj){
        this.close();
        return;
      }
      // En cualquier otro caso, abrimos para el detenido indicado
      this.open(detObj, index);
    },

    /**
     * Devuelve el detenido actualmente cargado (o null).
     */
    getCurrent: function(){
      return currentDet;
    },

    /**
     * Devuelve el índice asociado que se pasó en open(), o null.
     */
    getIndex: function(){
      return currentIndex;
    },

    /**
     * Indica si la ficha ampliada está actualmente visible.
     */
    isOpen: function(){
      return isViewVisible();
    }
  };

   document.addEventListener('DOMContentLoaded', function(){
    ensureView();
  });

  // Guard de clics: mientras la revisión no esté completa, no se puede salir de la ficha
  document.addEventListener('click', function(ev){
    if (!view || view.style.display === 'none') return;
    if (reviewComplete === true) return;
    if (reviewGuardActive !== true) return;
    if (view.contains(ev.target)) return;
    ev.stopPropagation();
    ev.preventDefault();
    alert('Revisar cada apartado del detenido antes de continuar.');
  }, true);

})();
