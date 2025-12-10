// pdf_import.js
// Módulo común para importar PDF en COMPAODAC (COMPAPOL) e INDEX DILIPOL
// Requiere que pdf.js esté cargado y disponible como pdfjsLib

(function(global){
  'use strict';

  if (!global.pdfjsLib) {
    console.warn('[pdf_import] pdfjsLib no encontrado. Asegúrate de cargar pdf.js antes.');
  } else {
    // Ruta del worker (ajústala según dónde pongas pdf.worker.js)
    if (!global.pdfjsLib.GlobalWorkerOptions.workerSrc) {
      // Cambia esta ruta a la que uses en tu proyecto
      global.pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/pdf.worker.min.js';
    }
  }

  // ---------- Helpers básicos ----------

  function createHiddenFileInput() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.style.display = 'none';
    document.body.appendChild(input);
    return input;
  }

  function createImportButton(label) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label || 'Importar PDF';
    // Estilos mínimos, tú luego lo tuneas con CSS si quieres
    btn.style.borderRadius = '8px';
    btn.style.padding = '6px 10px';
    btn.style.fontSize = '12px';
    btn.style.cursor = 'pointer';
    btn.style.opacity = '0.9';
    return btn;
  }

  // Extraer texto de todas las páginas de un PDF usando pdf.js
  async function extractTextFromPdf(file) {
    if (!global.pdfjsLib) {
      alert('No se ha cargado pdf.js, no se puede leer el PDF.');
      throw new Error('pdfjsLib no disponible');
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await global.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const strings = content.items.map(it => it.str || '');

      // Texto bruto de la página
      let pageText = strings.join(' ');

      // 👉 Forzamos saltos de línea en los puntos clave del parte

      // Cabecera de personas implicadas
      pageText = pageText.replace(/PERSONAS IMPLICADAS/gi, '\nPERSONAS IMPLICADAS\n');

      // Cabecera de tabla "Relación Filiación" (con y sin tildes)
      pageText = pageText.replace(/RELACIÓN\s+FILIACIÓN/gi, '\nRELACIÓN FILIACIÓN\n');
      pageText = pageText.replace(/RELACION\s+FILIACION/gi, '\nRELACION FILIACION\n');

      // Inicio de cada persona: Identificado, Infractor, Denunciado, Investigado, Requirente/Requerente, Testigo, Denunciante, Perjudicado, Víctima, Finado
      pageText = pageText.replace(/\b(Identificado|Infractor|Denunciado|Investigado|Requirente|Requerente|Testigo|Denunciante|Perjudicado|Víctima|Victima|Finado)\b/g, '\n$1 ');

      // Inicio de la descripción de la actuación (con y sin tildes)
      pageText = pageText.replace(/DESCRIPCIÓN DE LA ACTUACIÓN:/gi, '\nDESCRIPCIÓN DE LA ACTUACIÓN:\n');
      pageText = pageText.replace(/DESCRIPCION DE LA ACTUACION:/gi, '\nDESCRIPCION DE LA ACTUACION:\n');

      // Unimos el contenido de la página con saltos
      fullText += pageText + '\n\n';
    }

    // Normalizamos espacios un poco
    return fullText
      .replace(/\s+\n/g, '\n')
      .replace(/\n\s+/g, '\n')
      .trim();
  }

  // Helper simple de mapeo por “entre texto A y B”
  function extractBetween(text, start, end) {
    const i = text.indexOf(start);
    if (i === -1) return '';
    const j = text.indexOf(end, i + start.length);
    if (j === -1) return text.slice(i + start.length).trim();
    return text.slice(i + start.length, j).trim();
  }

  // ---------- Hooks de mapeo (a rellenar según app) ----------

  // mapPdfToCompaODAC(text) → { personas[], descripcion }
  function mapPdfToCompaODAC(pdfText) {
    // Parser específico para PARTES DE INTERVENCIÓN tipo "LA PLAZA"
    // Ahora robusto: PERSONAS IMPLICADAS + anclajes (Infractor, Testigo, Perjudicado, Víctima, Identificado, Denunciado)
    if (!pdfText) return {};

    const raw = String(pdfText || '');
    const lines = raw.split(/\r?\n/);

    const normalize = s => String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();

    // Palabras que marcan inicio de una nueva filiación EN LA ZONA DE PERSONAS (antes de la descripción)
    const anchors = [
      'IDENTIFICADO',
      'INFRACTOR',
      'DENUNCIADO',
      'INVESTIGADO',
      'REQUIRENTE',
      'REQUERENTE',
      'TESTIGO',
      'DENUNCIANTE',
      'PERJUDICADO',
      'VICTIMA',
      'FINADO'
      // fácil añadir más: solo meter aquí la palabra en mayúsculas
    ];
    const reAnchor = new RegExp('^(' + anchors.join('|') + ')\\b');

    const personasBlocks = [];
    const docLines = [];

    let inPeople = false;
    let inDoc = false;
    let currentBlock = null;

    // Recorremos línea a línea
    for (let line of lines) {
      const norm = normalize(line);
      if (!norm) continue;

      // Detectar entrada en PERSONAS IMPLICADAS
      if (!inPeople && norm.includes('PERSONAS IMPLICADAS')) {
        inPeople = true;
        continue;
      }

      // Saltar cabecera tipo "Relación Filiación"
      if (inPeople && !inDoc && /^RELACION\s+FILIACION\b/.test(norm.replace(/\s+/g, ' '))) {
        continue;
      }

      // Detectar entrada en DESCRIPCIÓN DE LA ACTUACIÓN → a partir de aquí es DOC
      if (!inDoc && norm.startsWith('DESCRIPCION DE LA ACTUACION:')) {
        // volcar último bloque de persona si había
        if (currentBlock && currentBlock.length) {
          personasBlocks.push(currentBlock.join(' '));
          currentBlock = null;
        }
        inDoc = true;
        inPeople = false;
        continue;
      }

      // === Zona de filiaciones (PERSONAS IMPLICADAS, antes de DESCRIPCIÓN) ===
      if (inPeople && !inDoc) {
        const normNoLeading = norm; // ya está trim

        if (reAnchor.test(normNoLeading)) {
          // Nueva persona
          if (currentBlock && currentBlock.length) {
            personasBlocks.push(currentBlock.join(' '));
          }
          currentBlock = [ line.trim() ];
        } else if (currentBlock) {
          // Continuación de la persona actual
          currentBlock.push(line.trim());
        }
        continue;
      }

      // === Zona de DOC (después de DESCRIPCIÓN DE LA ACTUACIÓN) ===
      if (inDoc) {
        docLines.push(line);
      }
    }

    // Cerrar última persona si se terminó el archivo sin DESCRIPCIÓN
    if (!inDoc && currentBlock && currentBlock.length) {
      personasBlocks.push(currentBlock.join(' '));
    }

    // Función para compactar texto y facilitar regex
    const normTight = s => String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .trim();

    function parsePersona(bloque) {
      const tight = normTight(bloque);

      const out = {
        nombreCompleto: '',
        tipoDocumento: 'NIE',
        numeroDocumento: '',
        domicilio: '',
        municipio: '',
        provincia: '',
        lugarNacimiento: '',
        fechaNacimiento: '',
        nombrePadres: '',
        telefono: '',
        condicion: ''
      };

      // Lista de condiciones posibles (normalizadas, en mayúsculas y sin tildes)
      const condKeys = [
        'IDENTIFICADO EN VIA PUBLICA',
        'IDENTIFICADO EN COMISARIA (NO POSIBLE EN LUGAR)',
        'IDENTIFICADO EN COMISARIA (NEGATIVA IDENTIFICARSE)',
        'IDENTIFICADO EN COMISARIA (OTRO MOTIVO)',
        'INFRACTOR',
        'DENUNCIADO',
        'INVESTIGADO',
        'REQUIRENTE',
        'REQUERENTE',
        'TESTIGO',
        'DENUNCIANTE Y/O PERJUDICADO',
        'PERJUDICADO',
        'DENUNCIANTE Y/O PERJUDICADO Y VICTIMA',
        'VICTIMA',
        'FINADO'
      ];

      const condMap = {
        'IDENTIFICADO EN VIA PUBLICA': 'Identificado',
        'IDENTIFICADO EN COMISARIA (NO POSIBLE EN LUGAR)': 'Identificado',
        'IDENTIFICADO EN COMISARIA (NEGATIVA IDENTIFICARSE)': 'Identificado',
        'IDENTIFICADO EN COMISARIA (OTRO MOTIVO)': 'Identificado',
        'INFRACTOR': 'Infractor',
        'DENUNCIADO': 'Denunciado',
        'INVESTIGADO': 'Investigado',
        'REQUIRENTE': 'Requirente',
        'REQUERENTE': 'Requerente',
        'TESTIGO': 'Testigo',
        'DENUNCIANTE Y/O PERJUDICADO': 'Perjudicado',
        'PERJUDICADO': 'Perjudicado',
        'DENUNCIANTE Y/O PERJUDICADO Y VICTIMA': 'Perjudicado',
        'VICTIMA': 'Víctima',
        'FINADO': 'Finado'
      };

      let condKey = '';
      // Buscamos si la línea empieza por alguna condición conocida
      for (const c of condKeys) {
        if (tight.startsWith(c + ' ') || tight === c) {
          condKey = c;
          break;
        }
      }

      // Intento extra: por si la condición está solo en la parte previa al nombre
      const mNombreFull = /(.+?),\s*NACIDO EN/.exec(tight);
      let nombreBase = '';
      if (!condKey && mNombreFull) {
        const pre = mNombreFull[1].trim();
        for (const c of condKeys) {
          if (pre.startsWith(c + ' ') || pre === c) {
            condKey = c;
            break;
          }
        }
      }

      // Asignar condición (fallback: Denunciado)
      if (condKey) {
        out.condicion = condMap[condKey] || 'Denunciado';
      } else {
        out.condicion = 'Denunciado';
      }

      // Extraer nombre completo sin la condición delante
      if (mNombreFull) {
        nombreBase = mNombreFull[1].trim();
        if (condKey && nombreBase.startsWith(condKey + ' ')) {
          nombreBase = nombreBase.slice(condKey.length).trim();
        }
        out.nombreCompleto = nombreBase;
      }

      const cuerpo = tight; // para el resto de campos usamos toda la cadena normalizada

      // Lugar de nacimiento
      const mLugar = cuerpo.match(/NACIDO EN\s+(.+?)\s+EL\s+\d{1,2}\/\d{1,2}\/\d{2,4}/);
      if (mLugar) {
        out.lugarNacimiento = mLugar[1].trim();
      }

      // Fecha de nacimiento
      const mFecha = cuerpo.match(/NACIDO EN\s+.+?\s+EL\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/);
      if (mFecha) {
        out.fechaNacimiento = mFecha[1].trim();
      }

      // Tipo y Nº de documento (DNI, NIE, Pasaporte; resto → "Otro")
      let tipoDoc = '';
      let numDoc = '';

      // NIE: "NUMERO DE IDENTIFICACION DE EXTRANJEROS XXXXX" o "... EXTRANJEROS XXXXX, HIJO DE"
      let m = cuerpo.match(/NUMERO DE IDENTIFICACION DE EXTRANJEROS\s+([A-Z0-9]+)/);
      if (m) {
        tipoDoc = 'NIE';
        numDoc = m[1].trim();
      } else {
        m = cuerpo.match(/EXTRANJEROS\s+([A-Z0-9]+)\s*,\s*HIJO DE/);
        if (m) {
          tipoDoc = 'NIE';
          numDoc = m[1].trim();
        }
      }

      // DNI: "DNI XXXXXXXXA"
      if (!numDoc) {
        m = cuerpo.match(/\bDNI\s+([A-Z0-9]+)\b/);
        if (m) {
          tipoDoc = 'DNI';
          numDoc = m[1].trim();
        }
      }

      // PASAPORTE: "PASAPORTE XXXXX"
      if (!numDoc) {
        m = cuerpo.match(/\bPASAPORTE\s+([A-Z0-9]+)\b/);
        if (m) {
          tipoDoc = 'Pasaporte';
          numDoc = m[1].trim();
        }
      }

      // Fallback: cualquier bloque tipo "XXXXXX, HIJO DE"
      if (!numDoc) {
        m = cuerpo.match(/([A-Z0-9]{5,})\s*,\s*HIJO DE/);
        if (m) {
          tipoDoc = 'Documento';
          numDoc = m[1].trim();
        }
      }

      // Asignar resultado final con fallback a Indocumentado
      if (numDoc) {
        out.tipoDocumento = tipoDoc || out.tipoDocumento || '';
        out.numeroDocumento = numDoc;
      } else {
        out.tipoDocumento = 'Indocumentado';
        out.numeroDocumento = '';
      }

      // Nombre de los padres
      const mPadres = cuerpo.match(/HIJO DE\s+(.+?)\s*,\s*CON DOMICILIO EN/);
      if (mPadres) {
        out.nombrePadres = mPadres[1].trim();
      }

      // Domicilio + municipio + provincia (con o sin TELÉFONO)
      // Domicilio + municipio + provincia (con o sin TELÉFONO), cortando antes de "SE PARTICIPA..."
const mDom = cuerpo.match(
  /CON DOMICILIO EN\s+(.+?)(?:\s*,\s*TELEFONO\s+(\d{6,15}))?(?:\s+SE\s+PARTICIPA\b|$)/
);
      if (mDom) {
        const fullDom = mDom[1].trim();
        if (mDom[2]) {
          out.telefono = mDom[2].trim();
        }

        const parts = fullDom.split(',').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 3) {
          out.provincia = parts[parts.length - 1];
          out.municipio = parts[parts.length - 2];
        }
        out.domicilio = fullDom;
      }

      return out;
    }

    const personas = personasBlocks
      .map(parsePersona)
      .filter(p => p && p.nombreCompleto);

    // Descripción de la actuación = todo lo que hay después de DESCRIPCION DE LA ACTUACION
    // Usamos docLines (todas las líneas acumuladas desde que entramos en la descripción)
    let descripcion = '';
    if (docLines.length) {
      let desc = docLines.join('\n');

      // Quitar cabeceras "PARTE DE INTERVENCION" en cualquier página
      desc = desc.replace(/PARTE DE INTERVENCION/gi, '');

      // Eliminar líneas sueltas de cabecera OCR
      desc = desc.replace(/^\s*PARTE DE\s*$/gmi, '');
      desc = desc.replace(/^\s*INTERVENCION\s*$/gmi, '');
      desc = desc.replace(/^\s*INTERVENCIÓN\s*$/gmi, '');

      // Quitar también la variante con tilde embebida en la línea
      desc = desc.replace(/PARTE DE INTERVENCI[ÓO]N/gi, '');

      // Quitar cualquier "PAGINA n DE m" o "PAGINA n DE" en cualquier posición, sin cortar el resto
      // Cubre "Pagina 1 de 2", "2 Pagina 1 de 2", "Pagina 1 de", "2 Pagina 1 de"
      desc = desc.replace(/\s*\d*\s*(PAGINA|PÁGINA)\s*\d+(?:\s*DE(?:\s*\d+)?)?\s*/gi, ' ');

      // Normalizar espacios y saltos de línea
      desc = desc
        .replace(/\s+\n/g, '\n')
        .replace(/\n\s+/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .trim();

      descripcion = desc;
    }

    return {
      personas,
      descripcion
    };
  }

  function mapPdfToDilipol(pdfText) {
    // TODO: Aquí pondremos reglas específicas para DILIPOL
    // De momento puede ser similar o incluso reutilizar parte de CompaODAC si el modelo es el mismo.

    const upper = pdfText.toUpperCase();

    const nombreCompleto = extractBetween(upper, 'INFRACTOR ', ','); // ejemplo
    const nie = extractBetween(upper, 'NÚMERO DE IDENTIFICACIÓN DE EXTRANJEROS', '\n');
    const domicilio = extractBetween(upper, 'CON DOMICILIO EN', '\n');
    const municipio = extractBetween(upper, 'MUNICIPIO:', '\n');
    const provincia = extractBetween(upper, 'PROVINCIA:', '\n');

    return {
      nombreCompleto: nombreCompleto || '',
      tipoDocumento: 'NIE',
      numeroDocumento: nie || '',
      domicilio: domicilio || '',
      municipio: municipio || '',
      provincia: provincia || '',
    };
  }

  // ---------- Hooks para volcar datos en cada app ----------

  function applyCompaODACDataToForm(data) {
    console.log('[pdf_import][COMPAODAC] Datos extraídos del PDF:', data);

    const personas = Array.isArray(data && data.personas)
      ? data.personas
      : (data && data.nombreCompleto ? [data] : []);

    if (!personas.length) {
      alert('No se ha podido extraer ninguna filiación válida del PDF.');
      return;
    }

    // Necesitamos la infraestructura global de COMPA·POL
    if (!window.state || !Array.isArray(window.state.filiaciones) || typeof window.nuevaFiliacion !== 'function') {
      console.warn('[pdf_import][COMPAODAC] Entorno de filiaciones no disponible.');
      return;
    }

    personas.forEach(p => {
      const f = window.nuevaFiliacion();

      const tokens = (p.nombreCompleto || '').trim().split(/\s+/);
      f["Nombre"] = tokens.shift() || "";
      f["Apellidos"] = tokens.join(' ');

      f["Tipo de documento"]   = p.tipoDocumento || "";
      f["Nº Documento"]        = p.numeroDocumento || "";
      f["Domicilio"]           = p.domicilio || "";
      f["Lugar de nacimiento"] = p.lugarNacimiento || "";
      f["Fecha de nacimiento"] = p.fechaNacimiento || "";
      f["Nombre de los Padres"]= p.nombrePadres || "";
      f["Teléfono"]            = p.telefono || "";
      f["Condición"]           = p.condicion || "";

      try {
        if (typeof window.normalizeFiliacionTitleCaseExcept === 'function') {
          window.normalizeFiliacionTitleCaseExcept(f);
        }
        if (typeof window.nextAvailableId === 'function') {
          f.fixedId = window.nextAvailableId();
        }
      } catch(_){}

      window.state.filiaciones.push(f);
    });

    if (typeof window.save === 'function') {
      try { window.save(); } catch(_){}
    }
    if (typeof window.renderFiliaciones === 'function') {
      try { window.renderFiliaciones(); } catch(_){}
    }

    // Tras importar desde PDF, dejamos todas las filiaciones replegadas
    // usando la función común de la app (no tocamos estilos ni layout)
    try {
      if (typeof window.collapseAllDetails === 'function') {
        window.collapseAllDetails();
      } else {
        const cont = document.querySelector('#filiaciones');
        if (cont) {
          cont.querySelectorAll('details').forEach(d => { d.open = false; });
        }
      }
    } catch(_){}

    // Volcar la DESCRIPCIÓN DE LA ACTUACIÓN al editor principal (doc)
    if (data && data.descripcion) {
      try {
        const ed = document.getElementById('doc');
        if (ed) {
          let txt = data.descripcion.trim();

          // Fallback: si queda algo tipo ". 1" al final, limpiarlo
          txt = txt.replace(/(\.\s*)\d+\s*$/, '$1');

          // Cada punto inicia un nuevo párrafo
          txt = txt.replace(/\.\s*/g, '.\n');

          // Cada guion de parte se convierte en un nuevo párrafo con "-- "
          // Ej: "- QUE ..." -> "\n-- QUE ..."
          txt = txt.replace(/\s*-\s+/g, '\n-- ');

          ed.textContent = txt;
          if (window.state) {
            window.state.doc = ed.innerHTML;
          }
          if (typeof window.save === 'function') {
            window.save();
          }
        }
      } catch(_){}
    }
  }

  function applyDilipolDataToForm(data) {
    // Igual que arriba pero apuntando a los campos de DILIPOL:
    // const inpNombre = document.querySelector('#detenidoNombre');
    // ...
    console.log('[pdf_import][DILIPOL] Datos extraídos del PDF:', data);
  }

  // ---------- Inicialización por app (crea botón + lógica) ----------

  async function handleFileForApp(file, app) {
    if (!file) return;

    try {
      const text = await extractTextFromPdf(file);

      if (!text) {
        alert('No se ha podido extraer texto del PDF.');
        return;
      }

      if (app === 'COMPAODAC') {
        const data = mapPdfToCompaODAC(text);
        applyCompaODACDataToForm(data);
      } else if (app === 'DILIPOL') {
        const data = mapPdfToDilipol(text);
        applyDilipolDataToForm(data);
      } else {
        console.warn('[pdf_import] App desconocida:', app);
      }
    } catch (err) {
      console.error('[pdf_import] Error al procesar el PDF:', err);
      alert('Ha ocurrido un error al leer el PDF.');
    }
  }

  function initForApp(options) {
    const app = options && options.app; // 'COMPAODAC' o 'DILIPOL'
    const targetSelector = options && options.targetSelector;
    const label = options && options.label;

    if (!app) {
      console.warn('[pdf_import] Falta app en initForApp');
      return;
    }

    const container = targetSelector ? document.querySelector(targetSelector) : null;
    if (!container) {
      console.warn('[pdf_import] No se ha encontrado el contenedor para el botón. Selector:', targetSelector);
      return;
    }

    const fileInput = createHiddenFileInput();
    const btn = createImportButton(label || 'Importar PDF');

    btn.addEventListener('click', () => {
      fileInput.value = ''; // reset
      fileInput.click();
    });

    fileInput.addEventListener('change', (ev) => {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;
      handleFileForApp(file, app);
    });

    container.appendChild(btn);
  }

  // Exponemos una API muy corta y clara
  global.PdfImport = {
    initForCompaODAC: function(opts){
      opts = opts || {};
      opts.app = 'COMPAODAC';
      initForApp(opts);
    },
    initForDilipol: function(opts){
      opts = opts || {};
      opts.app = 'DILIPOL';
      initForApp(opts);
    },
    // Exporto también extractBetween por si quieres reutilizarlo fuera
    _extractBetween: extractBetween
  };

})(window);