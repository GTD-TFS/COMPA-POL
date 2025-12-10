/* macro_dilipol.js */
(function(){
  const G = {};

  // ---- utilidades ----
  const splitApellidos = ap => {
    if(!ap) return {a1:'',a2:''};
    const parts = String(ap).trim().split(/\s+/);
    if(parts.length===1) return {a1:parts[0], a2:''};
    if(parts.length===2) return {a1:parts[0], a2:parts[1]};
    return {a1:parts[0], a2:parts.slice(1).join(' ')};
  };
  const mapDoc = t => {
    const k=(t||'').toLowerCase();
    if(k.includes('dni')) return 'DOCUMENTO NACIONAL DE IDENTIDAD (DNI)';
    if(k.includes('nie')) return 'Nº EXTRANJERO (NIE)';
    if(k.includes('pasap')) return 'PASAPORTE';
    if(k.includes('indocument')) return 'INDOCUMENTADO';
    if(k.includes('carta nacional')||k.includes('cni')) return 'Nº IDENTIFICACIÓN FISCAL EN PAÍS EXTRANJERO';
    return 'DOCUMENTO NACIONAL DE IDENTIDAD (DNI)';
  };
  const mapSexo = s => (String(s||'').toLowerCase().startsWith('fem') ? 'Mujer' : 'Hombre');
  const numAtestado = dils=>{
    if(!dils) return '';
    const m = String(dils).match(/^(\d+)/);
    return m? m[1] : String(dils);
  };
  const yearFrom = fecha=>{
    const m = String(fecha||'').match(/(\d{4})/);
    return m? m[1] : String(new Date().getFullYear());
  };
  const horaYMin = hhmm=>{
    const m = String(hhmm||'').match(/^(\d{1,2})[:.](\d{1,2})/);
    return m? {h:m[1], m:m[2]} : {h:'', m:''};
  };

  // --- helper: obtener municipio del hecho desde varias fuentes ---
  function pickMunicipioHecho(data){
    // 1) claves en raíz
    let v = data?.['municipio-hecho'] || data?.['Municipio del hecho'];
    if (v && String(v).trim()) return String(v).trim();

    // 2) buscar en filiaciones
    if (Array.isArray(data?.filiaciones)) {
      for (const f of data.filiaciones) {
        const m = f?.['municipio-hecho'] || f?.['Municipio del hecho'];
        if (m && String(m).trim()) return String(m).trim();
      }
    }

    // 3) inferir desde "Lugar del hecho" (lo que va tras la última coma)
    const lugar = data?.['Lugar del hecho'] || data?.['lugar del hecho'] || '';
    if (lugar) {
      const parts = String(lugar).split(',').map(s=>s.trim()).filter(Boolean);
      if (parts.length) return parts[parts.length-1];
    }

    // 4) otros alias
    v = data?.['municipio_hecho'] || data?.['municipioHecho'] || '';
    return String(v||'').trim();
  }

  // ---- mapa delito → código (UNIFICADO + normalización robusta) ----
  const DELITO_MAP_UNIFIED = {
    // ===== PRIORITARIOS (opciones simplificadas) =====
    "HURTO": "21301",
    "DAÑOS": "21314",
    "ESTAFA": "21308",
    "ROBO CON FUERZA": "21302",
    "ROBO USO DE VEHICULO": "21306",
    "HURTO USO DE VEHICULO": "21306",
    "ROBO CON VIOLENCIA": "21304",
    "LESIONES": "20301",
    "AMENAZAS GRAVES": "20603",
    "MALOS TRATOS EN EL ÁMBITO FAMILIAR": "20304",
    "ABUSO SEXUAL": "20803",
    "ATENTADO AGENTE AUTORIDAD": "22502",
    "DESOBEDIENCIA": "22503",
    "CONTRA LA SEGURIDAD VIAL": "22007",
    "CONTRA LA SALUD PÚBLICA": "21907",
    "TRÁFICO DE DROGAS": "21907",
    "FALSEDAD DOCUMENTAL": "22103",
    "RECLAMACIÓN JUDICIAL": "22309",
    "QUEBRANTAMIENTO DE CONDENA": "22315",

    // ===== COMPLEMENTOS (alias/variantes de catálogo) =====
    "Homicidio": "20101",
    "Asesinato": "20102",
    "Violencia doméstica y de género. Lesiones y maltrato familiar": "20304",
    "Riña tumultuaria": "20305",
    "Detención ilegal": "20601",
    "Amenazas": "20603",
    "Coacciones": "20605",
    "Acoso": "20611",
    "Agresión sexual": "20801",
    "Violación": "20802",
    "Omisión del deber de socorro": "20901",
    "Allanamiento de morada": "21003",
    "Hurto": "21301",
    "Robo con fuerza": "21302",
    "Robo con violencia": "21304",
    "Extorsión": "21305",
    "Hurto - Robo de uso de vehículos": "21306",
    "Usurpación": "21307",
    "Estafa": "21308",
    "Apropiación indebida": "21309",
    "Daños": "21314",
    "Contra la propiedad intelectual": "21318",
    "Contra la propiedad industrial": "21319",
    "Tráfico de drogas": "21907",
    "Contra la salud pública": "21907",
    "Conduccion bajo la influencia de bebidas alcoholicas, drogas toxicas, sustancias estupefacientes o psicotropicas (L.O. 15/2007)": "22007",
    "Conducción temeraria (L.O. 15/2007)": "22008",
    "Negativa a realizas las pruebas de deteccion de alcohol, drogas toxicas, sustancias estupefacientes o psicotropicas (L.O. 15/2007)": "22010",
    "Conducción sin licencia o permiso (L.O. 15/2007)": "22011",
    "Falsificación documentos públicos": "22103",
    "Usurpación de estado civil": "22111",
    "Realización arbitraria del propio derecho": "22307",
    "Acusación o denuncia falsa": "22308",
    "Simulación de delito": "22309",
    "Quebrantamiento condena o medida cautelar (todos los supuestos)": "22315",
    "Atentado": "22502",
    "Resistencia o desobediencia a autoridad, agentes o personal de seguridad privada": "22503",
    "Desórdenes públicos": "22505"
  };

  // Normaliza claves: quita ; finales, tildes, colapsa espacios, upper-case
  function _normDelitoKey(s){
    return String(s||'')
      .replace(/\s*;+\s*$/,'')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/\s+/g,' ')
      .trim()
      .toUpperCase();
  }

  // Índice normalizado → código
  const _DELITO_MAP_IDX = (function(){
    const idx = new Map();
    for(const [k,v] of Object.entries(DELITO_MAP_UNIFIED)){
      idx.set(_normDelitoKey(k), String(v));
    }
    return idx;
  })();

  // API para ampliar/ajustar el mapa desde fuera (fusiona y reindexa)
  G.setDelitoMap = obj => {
    if(!obj || typeof obj!=='object') return;
    for(const [k,v] of Object.entries(obj)){
      DELITO_MAP_UNIFIED[k] = v;
      _DELITO_MAP_IDX.set(_normDelitoKey(k), String(v));
    }
  };

  // Resolver nombre → código
  const delitoCode = nombre=>{
    if(!nombre) return '##DELITO_CODE()##';
    const hit = _DELITO_MAP_IDX.get(_normDelitoKey(nombre));
    return hit || `##DELITO_CODE(${nombre})##`;
  };

  // ---- generador de macro desde JSON expediente ----
  G.buildMacro = function(data){
    const M = [];

    // Parte fija hasta entrar a filiaciones
    M.push(
      ["click",".glifo.fj-regular.fj-buscar[title*='órgano destino']"],
      ["wait",700],
      ["click","#btnComunidad"],
      ["wait",600],
      ["pickOpen","Canarias"],
      ["wait",400],
      ["click","#btnProvincias"],
      ["wait",700],
      ["pickOpen","Santa Cruz de Tenerife"],
      ["wait",400],
      ["click","#btnPartidos__judiciales"],
      ["wait",800],
      ["pickOpen","Arona"],
      ["wait",400],
      ["enable","#botonAniadirDest"],
      ["wait",150],
      ["click","#botonAniadirDest"],
      ["wait",700]
    );

    // Filiaciones (DEO/DEE)
    const filas = Array.isArray(data?.filiaciones) ? data.filiaciones : [];
    for(const f of filas){
      const condicion = String(f['Condición']||'').toLowerCase();
      const esDetenidoLex = (
        condicion.includes('deten') ||
        condicion.includes('det. p. local') ||
        condicion.includes('det p local')
      );
      const tipoInterv = esDetenidoLex
        ? 'Denunciado [DEO]'
        : (condicion.includes('perjud') || condicion.includes('denunc'))
          ? 'Denunciante [DEE]'
          : 'Denunciante [DEE]';
      const docLabel = mapDoc(f['Tipo de documento']);
      const docNum = (docLabel==='INDOCUMENTADO') ? '' : (f['Nº Documento']||'');
      const {a1,a2} = splitApellidos(f['Apellidos']||'');
      const sexo = mapSexo(f['Sexo']);

      M.push(
        ["click",".glifo.fj-solid.fj-mas-cir"],
        ["wait",600],
        ["click",".filter-option.pull-left"],
        ["wait",300],
        ["select", tipoInterv],
        ["wait",300],
        ["click",".filter-option.pull-left"],
        ["wait",300],
        ["select", docLabel],
        ["wait",300],
        ["type", "#numero", docNum],
        ["type", "#nombreInterv", f['Nombre']||''],
        ["type", "#apellido1", a1],
        ["type", "#apellido2", a2],
        ["select", sexo, "select[name='Sexo'], select[name='sexo'], #sexo"],
        ["wait",250],
        ["click", "#botonAniadirInterv"],
        ["wait",600]
      );
    }

    // Campos comunes
    // 1) Localizamos PRIMER DETENIDO para extraer sus campos clave
    const firstDet = (Array.isArray(filas) ? filas : []).find(f =>
      /detenid[oa]/i.test(String(f?.['Condición'] || f?.Condicion || '')) ||
      /det\.\s*p\.?\s*local/.test(String(f?.['Condición'] || f?.Condicion || '').toLowerCase())
    );

    // Nº Atestado = DILIGENCIAS del detenido (si no, raíz)
    const rawDils =
      (firstDet && (firstDet['Diligencias'] || firstDet['Nº diligencias'] || firstDet['Numero diligencias'])) ||
      data?.['Diligencias'] || data?.['diligencias'] || '';
    const nAt = numAtestado(rawDils);

        // FECHA / AÑO atestado = FECHA DE GENERACIÓN (normalizada dd/mm/aaaa)
    const rawFechaGen =
      (firstDet && (
        firstDet['Fecha de generación'] ||
        firstDet['Fecha de Generación'] ||
        firstDet['Fecha detención'] ||
        firstDet['Fecha del procedimiento']
      )) ||
      data?.['Fecha de generación'] ||
      data?.['Fecha de Generación'] ||
      data?.['Fecha del procedimiento'] ||
      data?.['Fecha detención'] ||
      '';

    const fechaGen = (function(f){
      const s = String(f||'').trim();
      if (!s) return '';
      // si ya viene en dd/mm/aaaa o dd-mm-aaaa → normalizamos a dd/mm/aaaa
      let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (m) return `${m[1].padStart(2,'0')}/${m[2].padStart(2,'0')}/${m[3]}`;
      // si viene en yyyy-mm-dd o yyyy/mm/dd → pasamos a dd/mm/aaaa
      m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
      if (m) return `${m[3].padStart(2,'0')}/${m[2].padStart(2,'0')}/${m[1]}`;
      // cualquier otro formato, lo dejamos tal cual
      return s;
    })(rawFechaGen);

    const year = yearFrom(fechaGen);

    // DELITO: tomar el primero del PRIMER DETENIDO; si viene "A; B" nos quedamos con "A"
    let delNombre = '';
    if (firstDet) {
      delNombre = String(
        firstDet['Delito'] ||
        (Array.isArray(firstDet['Delitos']) ? firstDet['Delitos'][0] : '') ||
        (Array.isArray(firstDet['delitos']) ? firstDet['delitos'][0] : '')
      ).trim();
    }
    if (!delNombre) delNombre = String(data?.['Delito'] || '').trim();
    delNombre = delNombre.split(';')[0].trim(); // limpia "HURTO; Daños" -> "HURTO"

    const delCode = delitoCode(delNombre);

    // HORA / MINUTO = HORA DEL HECHO (hh:mm) del detenido; si no, de raíz
    const {h, m} = horaYMin(
      (firstDet && firstDet['Hora del hecho']) ||
      data?.['Hora del hecho'] ||
      data?.['hora-hecho'] ||
      ''
    );

    const muniRaw   = pickMunicipioHecho(data);
    const muniHecho = muniRaw ? String(muniRaw).slice(0,30) : '';

    M.push(
      ["type","#numAtestado", nAt],
      ["type","#anhoAtestado", year],
      ["wait",350],
      ["select", delCode, "select[name='Delito'], select[name='delito'], #delito, select[data-id='delito']"],
      ["wait",300],
      ["type","#localidad", muniHecho],
      ["type","#fecha", fechaGen],
      ["type","#hora", h],
      ["type","#minuto", m],
      ["click","#detenido"]
    );

    return M;
  };

  // ---- obtener expediente desde localStorage o pedirlo ----
  function readExpediente(){
    const primarias   = ['gestor_partes_comparecencias_pc_v3'];
    const secundarias = ['proyecto','expedienteGuardado','expedienteOriginal'];

    const parse = raw => { try{ return JSON.parse(raw); }catch(_){ return null; } };
    const unwrap = obj => {
      if (obj && typeof obj === 'object' && obj.expediente && typeof obj.expediente === 'object') {
        return obj.expediente;
      }
      return obj;
    };

    // 1) Claves nuevas (snapshot unificado ODAC / COMPA)
    for (const k of primarias){
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const obj = parse(raw);
      if (obj) return unwrap(obj);
    }

    // 2) Compatibilidad con claves clásicas
    for (const k of secundarias){
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const obj = parse(raw);
      if (obj) return unwrap(obj);
    }

    // 3) Último recurso: pegar JSON
    const pegado = prompt('Pega el JSON del expediente (no se encontró en localStorage):');
    if(!pegado) return null;
    const manual = parse(pegado);
    if (!manual){
      alert('JSON inválido');
      return null;
    }
    return unwrap(manual);
  }

  // ---- copiar macro al portapapeles ----
  async function copy(text){
    try{
      await navigator.clipboard.writeText(text);
      return true;
    }catch(_){
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position='fixed'; ta.style.left='-9999px';
      document.body.appendChild(ta);
      ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    }
  }

  // ---- API principal: genera y copia ----
  G.copyFromMemory = async function(){
    const data = readExpediente();
    if(!data) return;
    const macro = G.buildMacro(data);
    const pretty = JSON.stringify(macro, null, 2);
    const ok = await copy(pretty);
    if(ok) alert('Macro generada y copiada al portapapeles ✅');
  };

  // ---- helper opcional: crear botón programáticamente ----
  G.injectButton = function(opts){
    const o = Object.assign({
      text:'Generar Macro (DILIPOL)',
      title:'Genera y copia la macro basada en tu expediente',
      id:'btnGenerarMacroDilipol'
    }, opts||{});
    if(document.getElementById(o.id)) return;
    const b = document.createElement('button');
    b.id = o.id;
    b.textContent = o.text;
    b.title = o.title;
    b.className = "btn-macro-dilipol";
    b.onclick = ()=> G.copyFromMemory();
    document.body.appendChild(b);
  };

  // expone en window
  window.GenerarMacroDilipol = G;
})();