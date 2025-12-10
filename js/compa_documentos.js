// js/compa_documentos.js — DILIGENCIAS + DOCUMENTOS usando las mismas plantillas y placeholders que documentos.js

(function(){
  'use strict';

  // Helpers locales (no pisan los globales de documentos.js gracias al IIFE)
  const $  = (sel,root=document)=>root.querySelector(sel);
  const $$ = (sel,root=document)=>Array.from(root.querySelectorAll(sel));

  // === PERSONAS DESDE EXPEDIENTE (detenidos y NO detenidos) ===
  // === PERSONAS DESDE EXPEDIENTE (ODAC primero, luego registro clásico) ===
function getPersonasForDocs(){
  let personas = [];

  // 1) Estado vivo de ODAC (window.Expediente)
  try{
    if (window.Expediente && typeof window.Expediente.getState === 'function'){
      const st   = window.Expediente.getState();
      const root = (st && (st.expediente || st)) || {};
      if (Array.isArray(root.filiaciones)) {
        personas = root.filiaciones;
      }
    }
  }catch(_){}

  // 2) Snapshot ODAC en localStorage (gestor_partes_comparecencias_pc_v3)
  if (!personas.length){
    try{
      const raw = localStorage.getItem('gestor_partes_comparecencias_pc_v3');
      if (raw){
        const exp  = JSON.parse(raw);
        const root = (exp && (exp.expediente || exp)) || {};
        if (Array.isArray(root.filiaciones)) {
          personas = root.filiaciones;
        }
      }
    }catch(_){}
  }

  // 3) Último recurso: loadExpediente() de documentos.js (registro clásico)
  if (!personas.length){
    try{
      if (typeof loadExpediente === 'function'){
        const exp = loadExpediente();
        if (exp){
          if (typeof getPersonas === 'function'){
            personas = getPersonas(exp) || [];
          } else {
            const root = (typeof getExpRoot === 'function') ? getExpRoot(exp) : exp;
            personas = Array.isArray(root?.filiaciones) ? root.filiaciones : [];
          }
        }
      }
    }catch(_){}
  }

  if (!Array.isArray(personas) || !personas.length) return [];

  // Usamos personaLabel si existe (mismo texto que en documentos.html)
  const hasPersonaLabel = (typeof personaLabel === 'function');

  return personas.map((p, idx)=>{
    const label = hasPersonaLabel
      ? personaLabel(p)
      : (()=>{
          const rol = (p['Condición']||p['condicion']||p['Rol']||p['rol']||'').trim() || 'Identificado';
          const nom = (p['Nombre']||'').trim();
          const ape = (p['Apellidos']||'').trim();
          return `${rol} — ${nom} ${ape}`.trim();
        })();
    return { idx, p, label };
  });
}

  // === Rellenar selector lateral de persona ===
  function populateSidebarSelectors(){
    const selPersona = $('#docPersona');
    if (!selPersona) return;

    const personas = getPersonasForDocs();
    selPersona.innerHTML = '<option value="">— Selecciona persona —</option>';

    personas.forEach((entry)=>{
      const { idx, label } = entry;
      const op = document.createElement('option');
      op.value = String(idx);      // índice REAL en el array de filiaciones
      op.textContent = label || `Filiación ${idx+1}`;
      selPersona.appendChild(op);
    });
  }

  // === Juzgados (desde documentos.js: JUZGADOS / window.JUZGADOS) ===
  function populateSidebarJuzgado(){
    const input = $('#docJuzgado');
    const dl    = $('#docJuzgadosList');
    if (!input || !dl) return;

    let lista = [];
    if (typeof JUZGADOS !== 'undefined' && Array.isArray(JUZGADOS)) {
      lista = JUZGADOS;
    } else if (Array.isArray(window.JUZGADOS)) {
      lista = window.JUZGADOS;
    }
    if (!lista.length) return;

    dl.textContent = '';
    lista.forEach(j => {
      const op = document.createElement('option');
      op.value = String(j || '');
      dl.appendChild(op);
    });
  }

  // === Persistencia de Juzgado / Fecha / Hora / Abogado / Colegiado en el expediente ODAC ===
  function docToESDateFromInput(v){
    // Convierte "YYYY-MM-DD" (value de <input type="date">) a "dd/mm/aaaa"
    if (!v) return '';
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)){
      const [y,m,d] = s.split('-');
      return `${d}/${m}/${y}`;
    }
    if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(s)){
      const [d, m, y] = s.split(/[\-\/]/);
      return `${d}/${m}/${y}`;
    }
    return s;
  }

  function loadGestorRoot(){
    try{
      const raw = localStorage.getItem('gestor_partes_comparecencias_pc_v3');
      if (!raw) return null;
      const exp = JSON.parse(raw);
      const root = (exp && (exp.expediente || exp)) || {};
      return { exp, root };
    }catch(_){
      return null;
    }
  }

  function saveGestorRoot(exp, root){
    try{
      if (exp && exp.expediente) exp.expediente = root;
      const toStore = exp || root;
      localStorage.setItem('gestor_partes_comparecencias_pc_v3', JSON.stringify(toStore));
    }catch(e){
      console.error('[DOCS] No se pudo persistir gestor_partes_comparecencias_pc_v3', e);
    }
  }

  function persistDocMeta(){
  const juzInput   = $('#docJuzgado');
  const fechaInput = $('#docFechaProc');
  const horaInput  = $('#docHoraProc');
  const aboInput   = $('#docAbogado');
  const colInput   = $('#docAbogadoColegiado');

  const juz   = juzInput   ? juzInput.value.trim()   : '';
  const fecha = fechaInput ? fechaInput.value.trim() : '';
  const hora  = horaInput  ? horaInput.value.trim()  : '';
  const abo   = aboInput   ? aboInput.value.trim()   : '';
  const col   = colInput   ? colInput.value.trim()   : '';

  const pack = loadGestorRoot();
  let exp, root;

  if (pack && pack.root){
    exp  = pack.exp;
    root = pack.root || {};
  } else {
    // Si no hay snapshot todavía, creamos uno mínimo en memoria
    exp  = null;
    root = {};
  }

  if (juz){
    root['Juzgado'] = juz;
  }
  if (fecha){
    const es = docToESDateFromInput(fecha);
    root['Fecha de procedimiento'] = es;
  }
  if (hora){
    root['Hora de procedimiento'] = hora;
  }
  if (abo){
    root['Abogado nombre'] = abo;
  }
  if (col){
    root['Abogado colegiado'] = col;
  }

  saveGestorRoot(exp, root);
}

function hydrateDocSidebarFromExpediente(){
  let root = null;

  // 1) Preferir SIEMPRE el snapshot persistido en gestor_partes_comparecencias_pc_v3
  const pack = loadGestorRoot();
  if (pack && pack.root){
    root = pack.root;
  }

  // 2) Si no hay snapshot, usar como fallback el estado vivo de ODAC (window.Expediente)
  if (!root){
    try{
      if (window.Expediente && typeof window.Expediente.getState === 'function'){
        const st = window.Expediente.getState();
        root = (st && (st.expediente || st)) || null;
      }
    }catch(_){}
  }

  if (!root) return;

  const juz = root['Juzgado'] || (root.Juzgado && root.Juzgado.Nombre) || '';
  const fechaProc = root['Fecha de procedimiento'] || (root.Juzgado && root.Juzgado.Fecha) || '';
  const horaProc  = root['Hora de procedimiento']  || (root.Juzgado && root.Juzgado.Hora)  || '';
  const aboNom    = root['Abogado nombre'] || (root.Abogado && root.Abogado.Nombre) || '';
  const aboCol    = root['Abogado colegiado'] || (root.Abogado && (root.Abogado.NumColegiado || root.Abogado['Nº colegiado'])) || '';

  const toInputDate = (v)=>{
    if (!v) return '';
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (m){
      const d = m[1], mo = m[2], y = m[3];
      return `${y}-${mo}-${d}`;
    }
    return '';
  };

  const juzInput   = $('#docJuzgado');
  const fechaInput = $('#docFechaProc');
  const horaInput  = $('#docHoraProc');
  const aboInput   = $('#docAbogado');
  const colInput   = $('#docAbogadoColegiado');

  if (juzInput && juz)         juzInput.value   = juz;
  if (fechaInput && fechaProc) fechaInput.value = toInputDate(fechaProc);
  if (horaInput && horaProc)   horaInput.value  = horaProc;
  if (aboInput && aboNom)      aboInput.value   = aboNom;
  if (colInput && aboCol)      colInput.value   = aboCol;
}

  function wireDocMetaPersistence(){
    const ids = ['docJuzgado','docFechaProc','docHoraProc','docAbogado','docAbogadoColegiado'];
    ids.forEach(id=>{
      const el = $('#'+id);
      if (!el) return;
      ['change','blur'].forEach(ev=> el.addEventListener(ev, persistDocMeta));
    });
  }

  // === Construir DATA para plantillas ODT usando la misma lógica que documentos.js ===
  function buildDocDataFromExpediente(idxPersona){
    idxPersona = parseInt(idxPersona,10);
    if (isNaN(idxPersona) || idxPersona < 0) return {};

    // Helpers que ya existen en documentos.js (si no, hacemos fallback simple)
    const hasGetExpRoot        = (typeof getExpRoot === 'function');
    const hasGetPersonas       = (typeof getPersonas === 'function');
    const hasGetRol            = (typeof getRol === 'function');
    const hasToESDate          = (typeof toESDate === 'function');
    const hasCapitalizeEach    = (typeof capitalizeEachWord === 'function');
    const hasUpper             = (typeof upper === 'function');
    const hasGetDocNumber      = (typeof getDocNumberFromPersona === 'function');
    const hasSetInstructorAl   = (typeof setInstructorAliases === 'function');

    let exp   = null;
    let root  = null;
    let personas = [];

    // 1) Estado vivo de ODAC (window.Expediente)
    try{
      if (window.Expediente && typeof window.Expediente.getState === 'function'){
        const st = window.Expediente.getState();
        root = (st && (st.expediente || st)) || {};
        if (Array.isArray(root.filiaciones)) {
          personas = root.filiaciones;
        }
      }
    }catch(_){}

    // 2) Snapshot ODAC en localStorage (gestor_partes_comparecencias_pc_v3)
    if (!personas.length){
      try{
        const raw = localStorage.getItem('gestor_partes_comparecencias_pc_v3');
        if (raw){
          exp  = JSON.parse(raw);
          root = (exp && (exp.expediente || exp)) || {};
          if (Array.isArray(root.filiaciones)) {
            personas = root.filiaciones;
          }
        }
      }catch(_){}
    }

    // 3) Último recurso: loadExpediente() clásico (registro)
    if (!personas.length){
      try{
        if (typeof loadExpediente === 'function'){
          exp = loadExpediente();
          if (exp){
            root = hasGetExpRoot ? getExpRoot(exp) : exp;
            if (hasGetPersonas){
              personas = getPersonas(exp) || [];
            } else {
              personas = Array.isArray(root?.filiaciones) ? root.filiaciones : [];
            }
          }
        }
      }catch(_){}
    }

    if (!Array.isArray(personas) || !personas[idxPersona]) return {};
    if (!root){
      // Si no se ha fijado root todavía, lo referenciamos al objeto que contiene las filiaciones
      root = { filiaciones: personas };
    }

    const persona = personas[idxPersona];
    const a = (k)=> (persona && persona[k] != null ? String(persona[k]).trim() : '');

    const getRolLocal = (p)=>{
      if (hasGetRol) return getRol(p);
      return (p && (p['Condición']||p['condicion']||p['Rol']||p['rol']||'Identificado')) || 'Identificado';
    };

    const toES  = hasToESDate       ? toESDate       : (v=>String(v||''));
    const cap   = hasCapitalizeEach ? capitalizeEachWord : (v=>String(v||''));
    const up    = hasUpper          ? upper          : (v=>String(v||'').toUpperCase());
    const docNo = hasGetDocNumber   ? (p=>getDocNumberFromPersona(p||{})) : (p=>(p['Nº Documento']||p['Número de Documento']||p['Numero de Documento']||''));
    const setIA = hasSetInstructorAl? setInstructorAliases : ((obj,instr)=>{ if(!obj) return; obj['Instructor Actual'] = instr; });

    const fullName = [a('Nombre'), a('Apellidos')].filter(Boolean).join(' ').trim();
    const rol = getRolLocal(persona);
    const esDetenido = /detenid[oa]/i.test(rol);

    const base = {
      NOMBRE:            cap(a('Nombre')),
      APELLIDOS:         up(a('Apellidos')),
      TIPO_DOCUMENTO:    a('Tipo de documento') || '',
      NUMERO_DOCUMENTO:  docNo(persona),
      FECHA_NACIMIENTO:  toES(a('Fecha de nacimiento')),
      LUGAR_NACIMIENTO:  cap(a('Lugar de nacimiento')),
      PADRES:            cap(a('Nombre de los Padres')),
      DOMICILIO:         cap(a('Domicilio')),
      TELEFONO:          a('Teléfono') || a('Telefono') || '',
      SEXO:              cap(a('Sexo')),
      NACIONALIDAD:      cap(a('Nacionalidad')),
      PERSONA_ACTIVA_NOMBRE_COMPLETO: fullName
    };

    const ABO = (root && typeof root.Abogado === 'object') ? root.Abogado : {};
    const JUZ = (root && typeof root.Juzgado === 'object') ? root.Juzgado : {};

    // Abogado / juzgado: mezclamos expediente (claves planas + objeto) + sidebar DOC
    const aboNomSide = $('#docAbogado') ? $('#docAbogado').value.trim() : '';
    const aboColSide = $('#docAbogadoColegiado') ? $('#docAbogadoColegiado').value.trim() : '';
    const juzNomSide = $('#docJuzgado') ? $('#docJuzgado').value.trim() : '';

    const aboNomRoot = root && root['Abogado nombre'] ? String(root['Abogado nombre']).trim() : '';
    const aboColRoot = root && root['Abogado colegiado'] ? String(root['Abogado colegiado']).trim() : '';
    const juzNomRoot = root && root['Juzgado'] ? String(root['Juzgado']).trim() : '';

    base.ABOGADO_NOMBRE    = cap(aboNomSide || ABO.Nombre || aboNomRoot);
    base.ABOGADO_COLEGIADO = aboColSide || ABO.NumColegiado || ABO['Nº colegiado'] || aboColRoot;
    base.JUZGADO           = juzNomSide || JUZ.Nombre || juzNomRoot;

    // Leer también del sidebar DOC (fecha / hora procedimiento)
    const fechaSide = $('#docFechaProc') ? $('#docFechaProc').value.trim() : '';
    const horaSide  = $('#docHoraProc')  ? $('#docHoraProc').value.trim()  : '';

    const fechaRoot = root && root['Fecha de procedimiento'] ? String(root['Fecha de procedimiento']).trim() : '';
    const horaRoot  = root && root['Hora de procedimiento']  ? String(root['Hora de procedimiento']).trim()  : '';

    base.FECHA_PROCEDIMIENTO = JUZ.Fecha
      ? toES(JUZ.Fecha)
      : (fechaRoot ? toES(fechaRoot) : (fechaSide ? toES(fechaSide) : ''));

    base.HORA_PROCEDIMIENTO  = JUZ.Hora || horaRoot || horaSide || '';

    // Instructor (mismo criterio que documentos.js, añadiendo fallback desde la filiación y desde cualquier persona)
    const iaInput   = ($('#inpInstructorActual')?.value || '').trim();
    const iaTmp     = (localStorage.getItem('instructorActualTmp') || '').trim();
    const iaJson    = (root && (root['Instructor Actual'] || root['Instructor'] || root.INSTRUCTOR || root['NUEVO_INSTRUCTOR'])) || '';
    const iaPersona = a('Instructor') || a('INSTRUCTOR') || a('Nuevo instructor') || a('NUEVO_INSTRUCTOR') || '';

    // Buscar instructor en cualquier filiación del expediente (por si solo está en el detenido)
    const iaFromAnyPersona = (() => {
      try{
        if (!Array.isArray(personas)) return '';
        for (const p of personas){
          if (!p) continue;
          const v =
            p['Instructor Actual']   ||
            p['INSTRUCTOR_ACTUAL']   ||
            p['Instructor']          ||
            p['INSTRUCTOR']          ||
            p['Nuevo instructor']    ||
            p['NUEVO_INSTRUCTOR']    ||
            '';
          if (v && String(v).trim()) return String(v).trim();
        }
      }catch(_){}
      return '';
    })();

    const instr = iaInput || iaTmp || iaJson || iaPersona || iaFromAnyPersona || '';

    // Aliases de instructor en base
    setIA(base, instr);

    // Datos DETENIDO_* (solo si rol es detenido)
    const det = esDetenido ? {
      DETENIDO_NOMBRE:                cap(a('Nombre')),
      DETENIDO_APELLIDOS:             up(a('Apellidos')),
      DETENIDO_TIPO_DOCUMENTO:        a('Tipo de documento')||'',
      DETENIDO_NUMERO_DOCUMENTO:      docNo(persona),
      DETENIDO_FECHA_NACIMIENTO:      toES(a('Fecha de nacimiento')),
      DETENIDO_LUGAR_NACIMIENTO:      cap(a('Lugar de nacimiento')),
      DETENIDO_PADRES:                cap(a('Nombre de los Padres')),
      DETENIDO_DOMICILIO:             cap(a('Domicilio')),
      DETENIDO_TELEFONO:              a('Teléfono')||a('Telefono')||'',
      DETENIDO_SEXO:                  cap(a('Sexo')),
      DETENIDO_NACIONALIDAD:          cap(a('Nacionalidad')),
      DETENIDO_DELITO:                cap(a('Delito') || a('delito') || a('DELITO')),
      DETENIDO_CP_AGENTES:            a('C.P. Agentes')||'',
      DETENIDO_INSTRUCTOR:            instr,
      DETENIDO_LUGAR_DEL_HECHO:       cap(a('Lugar del hecho')),
      DETENIDO_LUGAR_DE_LA_DETENCIÓN: cap(a('Lugar de la detención')),
      DETENIDO_HORA_DEL_HECHO:        a('Hora del hecho')||'',
      DETENIDO_HORA_DE_LA_DETENCIÓN:  a('Hora de la detención')||'',
      DETENIDO_BREVE_RESUMEN_DE_LOS_HECHOS:      cap(a('Breve resumen de los hechos')),
      DETENIDO_INDICIOS_POR_LOS_QUE_SE_DETIENE:  cap(a('Indicios por los que se detiene')),
      DETENIDO_ABOGADO:               cap(base.ABOGADO_NOMBRE),
      DETENIDO_COMUNICARSE_CON:       cap(a('Comunicarse con')),
      DETENIDO_INTERPRETE:            cap(a('Intérprete')),
      DETENIDO_MEDICO:                cap(a('Médico')),
      DETENIDO_CONSULADO:             cap(a('Consulado'))
    } : {};

    // Datos FILIACION_* para no detenidos (perjudicados, testigos, etc.)
    const fil = !esDetenido ? {
      FILIACION_NOMBRE:           cap(a('Nombre')),
      FILIACION_APELLIDOS:        up(a('Apellidos')),
      FILIACION_TIPO_DOCUMENTO:   a('Tipo de documento') || '',
      FILIACION_NUMERO_DOCUMENTO: docNo(persona)
    } : {};

    const glob = {
      DILIGENCIAS: (root && (root.diligencias || root.Diligencias || '')) || ''
    };

    // DELITO: solo el de la filiación seleccionada
    (function ensureDetenidoDelito(){
      // 1) Delito directo
      let delito = a('Delito') || a('delito') || a('DELITO') || '';

      // 2) Arrays en persona / expediente
      const pickFromArray = (arr) => {
        try{
          if (!Array.isArray(arr) || !arr.length) return '';
          const first = arr[0];
          if (typeof first === 'string') return first;
          if (first && typeof first === 'object') return first.nombre || first.name || first.titulo || '';
          return '';
        }catch{ return ''; }
      };

      if (!delito) delito = pickFromArray((persona && (persona.Delitos || persona.delitos || persona.DELITOS)) || null);
      if (!delito && root) delito = pickFromArray((root.Delitos || root.delitos || root.DELITOS) || null);
      if (!delito && root && typeof root.Delito === 'string') delito = root.Delito;
      if (!delito && root && typeof root.DELITO === 'string') delito = root.DELITO;

      delito = String(delito || '').trim();
      if (!delito) return;

      const delitoUpper = up(delito);
      if (!det.DETENIDO_DELITO && esDetenido) det.DETENIDO_DELITO = delitoUpper;
      if (!base.DELITO) base.DELITO = delitoUpper;
    })();

    // DELITO global para documentos: el de la persona activa
    base.DELITO = det.DETENIDO_DELITO ? up(det.DETENIDO_DELITO) : (base.DELITO ? up(base.DELITO) : '');

    // Instructor también en bloque global
    setIA(glob, instr);

    // Upper de DELITO
    if (base.DELITO) base.DELITO = up(base.DELITO);
    if (det.DETENIDO_DELITO) det.DETENIDO_DELITO = up(det.DETENIDO_DELITO);

    // FECHA_GENERACION para plantillas que lo usen
    if (!glob.FECHA_GENERACION){
      const hoy = new Date();
      const dd = String(hoy.getDate()).padStart(2,'0');
      const mm = String(hoy.getMonth()+1).padStart(2,'0');
      const yy = hoy.getFullYear();
      glob.FECHA_GENERACION = `${dd}/${mm}/${yy}`;
    }

    // === Vuelco genérico de campos ===
    // Idea: además de base/det/fil/glob, exportar TODOS los primitivos de persona y root
    // con claves normalizadas (sin tildes, espacios→_ y mayúsculas),
    // para pillar placeholders que estén en encabezados o con nombres “raros”.
    const data = Object.assign({}, base, det, fil, glob);

    // Forzar Instructor Actual en todas sus variantes en el objeto de datos final
    fixInstructorAliases(data, instr);
    setIA(data, instr);

    const normKey = (k) => {
      return String(k||'')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g,'')
        .replace(/\s+/g,'_')
        .toUpperCase();
    };

    const dumpPrimitives = (obj, prefix='') => {
      if (!obj || typeof obj !== 'object') return;
      const basePrefix = prefix ? (prefix + '_') : '';
      for (const [k, v] of Object.entries(obj)){
        if (v == null) continue;
        if (typeof v === 'object') continue; // no a objetos/arrays aquí (evita ruido raro)
        const rawKey = String(k);
        const nk = normKey(basePrefix + rawKey);
        if (data[nk] == null || data[nk] === ''){
          data[nk] = String(v);
        }
      }
    };

    // Volcar persona (sus campos directos)
    dumpPrimitives(persona);

    // Volcar raíz del expediente (para campos globales como Nº Diligencias, Juzgado, etc.)
    dumpPrimitives(root);

    return data;
  }

  // === Forzar Instructor Actual en todas sus variantes (alias unificados) ===
  function fixInstructorAliases(obj, val){
    if (!val) return;
    const aliases = [
      "Instructor",
      "INSTRUCTOR",
      "Instructor Actual",
      "INSTRUCTOR_ACTUAL",
      "INSTRUCTOR ACTUAL",
      "instructor",
      "instructor_actual",
      "instructor actual"
    ];
    for (const k of aliases){
      obj[k] = val;
    }
  }

  // === Generador Comparecencia Completa (Detenidos + Objetos + Datos Generales) ===
  function buildComparecenciaPayload(){
    // 1) Obtener raíz expediente igual que el resto del archivo (preferencia ODAC)
    let root = null;
    let personas = [];
    try{
      if (window.Expediente && typeof window.Expediente.getState === 'function'){
        const st = window.Expediente.getState();
        root = (st && (st.expediente || st)) || {};
        if (Array.isArray(root.filiaciones)) personas = root.filiaciones;
      }
    }catch(_){}

    if (!personas.length){
      try{
        const raw = localStorage.getItem('gestor_partes_comparecencias_pc_v3');
        if (raw){
          const exp  = JSON.parse(raw);
          root = (exp && (exp.expediente || exp)) || {};
          if (Array.isArray(root.filiaciones)) personas = root.filiaciones;
        }
      }catch(_){}
    }

    // fallback registro clásico
    if (!personas.length){
      try{
        if (typeof loadExpediente === 'function'){
          const exp = loadExpediente();
          if (exp){
            root     = (typeof getExpRoot === 'function') ? getExpRoot(exp) : exp;
            personas = Array.isArray(root?.filiaciones) ? root.filiaciones : [];
          }
        }
      }catch(_){}
    }

    if (!Array.isArray(personas) || !personas.length){
      return {
        DETENIDOS_LISTA: "",
        OBJETOS_LISTA: "",
        AGENTES: "",
        INDICATIVO: "",
        LUGAR_DETENCION: "",
        HORA_DETENCION: ""
      };
    }

    // === Detectar detenidos por condición ===
    const detenidos = personas.filter(p=>{
      const c = String(p["Condición"]||p["condicion"]||"").toLowerCase();
      return c.includes("detenid") || c.includes("det. p. local");
    });

    const norm = s => (s==null?"":String(s).trim());
    const cap  = s => (typeof capitalizeEachWord==="function"?capitalizeEachWord(s):norm(s));
    const up   = s => norm(s).toUpperCase();

    function filaDetenido(p, idx){
      const nombre   = cap(norm(p["Nombre"]));
      const ape      = up(norm(p["Apellidos"]));
      const tdoc     = norm(p["Tipo de documento"]);
      const ndoc     = norm(p["Nº Documento"] || p["Numero Documento"] || "");
      const fnac     = norm(p["Fecha de nacimiento"]);
      const lnac     = cap(norm(p["Lugar de nacimiento"]));
      const padres   = cap(norm(p["Nombre de los Padres"]));
      const dom      = cap(norm(p["Domicilio"]));
      const tel      = norm(p["Teléfono"]||p["Telefono"]||"");
      const sexoRaw  = norm(p["Sexo"]).toLowerCase();

      const esMujer  = sexoRaw.startsWith("fem") || sexoRaw.startsWith("muj");
      const etiquetaNac  = esMujer ? "nacida" : (sexoRaw ? "nacido" : "nacido/a");
      const etiquetaHijo = esMujer ? "hija"   : (sexoRaw ? "hijo"   : "hijo/a");

      // Normalizar la "Y" en el nombre de los padres a minúscula
      const padresFmt = padres ? padres.replace(/\s+Y\s+/g, " y ") : "";

      const trozos = [];
      trozos.push(`${nombre} ${ape}`);
      if (tdoc && ndoc) trozos.push(`con ${tdoc} nº ${ndoc}`);
      else if (tdoc)    trozos.push(`con ${tdoc}`);

      if (fnac || lnac){
        let n = etiquetaNac;
        if (lnac) n += ` en ${lnac}`;
        if (fnac) n += ` el ${fnac}`;
        trozos.push(n);
      }

      if (padresFmt) trozos.push(`${etiquetaHijo} de ${padresFmt}`);
      if (dom)       trozos.push(`domicilio en ${dom}`);
      if (tel)       trozos.push(`teléfono ${tel}`);

      let frase = trozos.join(", ");
      if (!/[.!?]$/.test(frase)) frase += ".";
      return frase;
    }

    const DETENIDOS_LISTA = detenidos
      .map(filaDetenido)
      .map(t => String(t || "").trim())
      .join("\n\n");

    // === Objetos desde ruta ODAC ===
    const objetos = (root && Array.isArray(root.objects)) ? root.objects : [];
    const OBJETOS_LISTA = objetos.length
      ? objetos.map(o=>`- ${o}`).join("\n")
      : "";

    let AGENTES="", INDICATIVO="", LUGAR_DETENCION="", HORA_DETENCION="";

    if (detenidos.length){
      const d0 = detenidos[0];
      AGENTES         = norm(d0["C.P. Agentes"] || "");
      INDICATIVO      = norm(d0["Indicativo"] || root.indicativo || root.INDICATIVO || "");
      LUGAR_DETENCION = cap(norm(d0["Lugar de la detención"] || ""));
      HORA_DETENCION  = norm(d0["Hora de la detención"] || "");
    }

    // Instructor: primero el del primer detenido, luego input / localStorage
    let instr = '';
    if (detenidos.length) {
      instr = (detenidos[0]['Instructor'] || '').trim();
    }
    if (!instr) {
      instr =
        (document.getElementById('inpInstructorActual')?.value || '').trim() ||
        (localStorage.getItem('instructorActualTmp') || '').trim() ||
        '';
    }

    const payload = {
      DETENIDOS_LISTA: DETENIDOS_LISTA,
      OBJETOS_LISTA:   OBJETOS_LISTA,
      AGENTES,
      INDICATIVO,
      LUGAR_DETENCION,
      HORA_DETENCION,
      INSTRUCTOR: instr
    };

    return payload;
  }

  // Exponer para uso externo (si se necesita desde otros scripts)
  window.buildComparecenciaPayload = buildComparecenciaPayload;

  // === Toggle del panel DOC / Editor ===
  function wireToggleDocPanel(){
    const btn       = $('#btnToggleDocs');
    const ed        = $('#editor');
    const panel     = $('#docPanel');
    const sideDils  = $('#groups');
    const sideDocs  = $('#docSidebar');
    if (!btn || !ed || !panel || !sideDils || !sideDocs) return;

    btn.addEventListener('click', ()=>{
      const docsVisible = panel.style.display !== 'none';

      if (!docsVisible){
        // Entrar en modo DOCUMENTOS:
        panel.style.display    = 'block';
        ed.style.display       = 'none';
        sideDils.style.display = 'none';
        sideDocs.style.display = 'block';
        btn.classList.add('on');
        document.body.dataset.docsMode = '1';
      } else {
        // Volver a modo DILIGENCIAS:
        panel.style.display    = 'none';
        ed.style.display       = 'block';
        sideDils.style.display = '';
        sideDocs.style.display = 'none';
        btn.classList.remove('on');
        document.body.dataset.docsMode = '0';
      }
    });
  }

  // === Autocompletar nombre de abogado a partir del nº colegiado (misma tabla ABOGADOS de documentos.js) ===
  function wireAbogadoColegiadoLookup(){
    if (typeof ABOGADOS === 'undefined') return;

    const q          = $('#docAbogadoColegiado');
    const outNombre  = $('#docAbogado');
    if (!q || !outNombre) return;

    const norm = v => String(v ?? '').replace(/\D+/g,'');

    const tryFill = () => {
      const num = norm(q.value.trim());
      if (!num) return;
      let found = ABOGADOS.find(a => norm(a.colegiado) === num);
      if (!found && num.length >= 3){
        const cands = ABOGADOS.filter(a => norm(a.colegiado).startsWith(num));
        if (cands.length === 1) found = cands[0];
      }
      if (found){
        outNombre.value = (typeof capitalizeEachWord === 'function')
          ? capitalizeEachWord(found.nombre || '')
          : (found.nombre || '');
        // Persistir también en el expediente ODAC / JSON
        persistDocMeta();
      }
    };

    ['input','change','blur'].forEach(ev => q.addEventListener(ev, tryFill));
    q.addEventListener('keydown', e => {
      if (e.key === 'Enter'){
        e.preventDefault();
        tryFill();
      }
    });
  }

  // === Generar ODT reales usando generarODT() de documentos.js y /plantillas ===
  function wireGenerateDocs(){
    const btn = $('#btnDocGenerar');
    const msg = $('#docMessage');
    if (!btn || !msg) return;

    // Mapeo checkboxes → claves de plantilla_*.js (coinciden con documentos.js)
    const tplMap = {
      'declaracion':          'plantilla_declaracion',
      'oficio_dinero':        'plantilla_ofidinero',
      'oficio_adn':           'plantilla_ofiadn1',
      'consentimiento_adn':   'plantilla_adnconsen',
      'entrega_menor':        'plantilla_entregamenor',
      'cita_jidl':            'plantilla_jidlcita',
      'cita_jrd':             'plantilla_jrdcita',
      'ofrecimiento_esp':     'plantilla_ofrecimiento',
      'ofrecimiento_ing':     'plantilla_ofrecimientoingles',
      'derechos_viogen_esp':  'plantilla_dereviogen',
      'derechos_viogen_ing':  'plantilla_viogenrights',
      'comparecencia_total':  'plantilla_comparecencia_total'
    };

    btn.addEventListener('click', async ()=>{
      const personaIdx = $('#docPersona') ? $('#docPersona').value : '';
      const marcadas   = $$('#docTemplatesList input[type="checkbox"]:checked').map(c=>c.value);

      if (!personaIdx){
        msg.textContent = 'Selecciona una persona en el lateral.';
        msg.style.color = '#fca5a5';
        return;
      }
      if (!marcadas.length){
        msg.textContent = 'Marca al menos una plantilla.';
        msg.style.color = '#fca5a5';
        return;
      }
      if (typeof generarODT !== 'function'){
        msg.textContent = 'Falta documentos.js / JSZip / FileSaver / plantillas (ver consola).';
        msg.style.color = '#fca5a5';
        console.error('[DOCS] generarODT no disponible');
        return;
      }

      const data = buildDocDataFromExpediente(personaIdx);
      if (!data || Object.keys(data).length === 0){
        msg.textContent = 'No se han podido obtener los datos de esa filiación.';
        msg.style.color = '#fca5a5';
        return;
      }

      let ok = 0, fail = 0;
      for (const v of marcadas){
        // Plantilla especial: comparecencia total (detenidos + objetos)
        if (v === 'comparecencia_total'){
          try{
            const dataTotal = buildComparecenciaPayload();
            await generarODT('plantilla_comparecencia_total', dataTotal);
            ok++;
          }catch(e){
            console.error('[DOCS] Error generando plantilla_comparecencia_total', e);
            fail++;
          }
          continue; // pasamos al siguiente checkbox
        }
        const tplKey = tplMap[v];
        if (!tplKey){
          console.warn('[DOCS] Sin mapeo de plantilla para valor', v);
          continue;
        }
        try{
          await generarODT(tplKey, data);
          ok++;
        }catch(e){
          console.error('[DOCS] Error generando', tplKey, e);
          fail++;
        }
      }

      if (ok > 0){
        msg.textContent = `Se han generado ${ok} documento(s) ODT.`;
        msg.style.color = '#a7f3d0';
      } else {
        msg.textContent = 'No se ha generado ningún documento (ver consola).';
        msg.style.color = '#fca5a5';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    populateSidebarSelectors();      // Todas las filiaciones (detenidos y no detenidos)
    populateSidebarJuzgado();        // Juzgados desde documentos.js
    hydrateDocSidebarFromExpediente(); // Rellenar Juzgado/fecha/hora/abogado/colegiado si ya existen en el expediente
    wireAbogadoColegiadoLookup();    // Buscar abogado por nº colegiado
    wireDocMetaPersistence();        // Escuchar cambios y persistirlos en el JSON del expediente
    wireToggleDocPanel();            // DOC <-> DILS
    wireGenerateDocs();              // Botón que ahora sí genera ODT reales
  });

  // === Auto‑inicializar sidebar DOCUMENTOS cuando existan sus campos en la página ===
  document.addEventListener('DOMContentLoaded', function(){
    // Solo actuar en páginas que realmente tienen el sidebar/campos DOC
    const hasSidebar =
      document.getElementById('docSidebar') ||
      document.getElementById('docPersona') ||
      document.getElementById('docJuzgado') ||
      document.getElementById('docFechaProc') ||
      document.getElementById('docAbogado');

    if (!hasSidebar) return;

    try{
      populateSidebarSelectors();
    }catch(e){
      console.warn('[COMPA_DOCS] Error populating personas', e);
    }
    try{
      populateSidebarJuzgado();
    }catch(e){
      console.warn('[COMPA_DOCS] Error populating juzgados', e);
    }
    try{
      hydrateDocSidebarFromExpediente();
    }catch(e){
      console.warn('[COMPA_DOCS] Error hydrating DOC sidebar', e);
    }
    try{
      wireDocMetaPersistence();
    }catch(e){
      console.warn('[COMPA_DOCS] Error wiring DOC persistence', e);
    }

    // Refrescar datos DOC cada vez que se pulse el botón DOC, si existe
    const btnDocs = document.getElementById('btnToggleDocs');
    if (btnDocs && !btnDocs.__compaDocsHydrateHooked){
      btnDocs.__compaDocsHydrateHooked = true;
      btnDocs.addEventListener('click', function(){
        // Pequeño delay para dejar que se muestre el panel si alguien lo anima
        setTimeout(function(){
          try{ hydrateDocSidebarFromExpediente(); }catch(_){}
        }, 50);
      });
    }
  });
})();