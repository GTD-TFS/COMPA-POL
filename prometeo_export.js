// js/prometeo_export.js
// Exportar a Prometeo: genera payload y lo copia al portapapeles desde COMPA, sin abrir prometeo.html
(function(){
  const LS_KEY = "gestor_partes_comparecencias_pc_v3";

  function loadExp(){
    try{
      if (window.state && typeof window.state === "object"){
        // Copia defensiva del estado en memoria (mientras editas)
        return JSON.parse(JSON.stringify(window.state));
      }
    }catch(_){}
    try{
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(_){ return {}; }
  }

   // ===== Exportar a Prometeo (payload 1) =====
function buildPrometeoPayload(){
  // Cargar el expediente actual desde localStorage (misma fuente que usa la página)
  let data = loadExp() || {};
  if (!Array.isArray(data.filiaciones)) data.filiaciones = [];

  const s  = v => (v==null ? "" : String(v)).trim();
  const f0 = () => (data.filiaciones && data.filiaciones.length ? data.filiaciones[0] : {});
  function common(k){
    const v = data[k];
    if (v != null && String(v).trim() !== "") return String(v);
    const ff = f0();
    const fv = ff && ff[k];
    return String(fv || "");
  }
  function toISO(dateDDMMYYYY, hourHHMM){
    const d = s(dateDDMMYYYY);
    const h = s(hourHHMM);
    if(!/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return "";
    const [dd,mm,yyyy] = d.split("/");
    let HH = "00", MI = "00", SS = "00";
    const m = h.match(/^(\d{1,2})(?:[:hH\.](\d{2}))?$/);
    if (m){ HH = String(m[1]).padStart(2,"0"); MI = String(m[2]||"00").padStart(2,"0"); }
    return `${yyyy}-${mm}-${dd}T${HH}:${MI}:${SS}`;
  }

  const carnet     = common("C.P. Agentes") || common("Agentes") || common("Instructor");
  const indicativo = common("Indicativo");
  const unidadText = "SUR DE TENERIFE-COMISARIA LOCAL";

  const GAC   = "SUR TENERIFE-GRUPO ATENCIÓN AL CIUDADANO (GAC)";
  const GOR   = "SUR TENERIFE-GRUPO OPERATIVO DE RESPUESTA (GOR)";
  const UPR   = "SUR TENERIFE-UNIDAD PREVENCION REACCION (UPR)";
  const COORD = "SUR TENERIFE-COORDINADORES DE SERVICIO";

  const __indRaw = (indicativo || "").toString();
  const __ind = __indRaw
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');

  let grupoText;
  if (__ind.includes('AMERICA') || /^A(?:\W|\d|$)/.test(__ind)) {
    grupoText = GAC;
  } else if (__ind.includes('TROYA')) {
    grupoText = UPR;
  } else if (__ind.includes('FARO') && __ind.includes('ADEJE')) {
    grupoText = COORD;
  } else {
    grupoText = GOR;
  }

  const steps = [];
  steps.push({
    "__profile":"dilipol_step1",
    "__ts": Date.now(),
    "data": { carnet, unidadText, grupoText, indicativo }
  });

  const fechaGen  = common("Fecha de generación");
  const horaHecho = common("Hora del hecho");
  const horaDet   = common("Hora de la detención");
  const isoInicio = toISO(fechaGen, horaDet || horaHecho);
  const amb1 = "VIAS DE COMUNICACIÓN";
  const amb2 = "Vía publica urbana";
  const tipoV = (common("tipovia-detencion") || common("Tipo de vía") || "CALLE").toString().trim().toUpperCase();
  const nombreVia = common("viasin-detencion") || common("via-detencion") || common("Lugar de la detención") || common("Lugar del hecho");
  const restoDir  = common("restodireccion-hecho") || "";

  steps.push({
    "__profile":"dilipol_step2",
    "__ts": Date.now(),
    "data": {
      "map": [
        { "op":"set", "formControlName":"fechaHoraInicio", "formcontrol":"fechaHoraInicio", "value": isoInicio },
        { "op":"selectText", "text": amb1 },
        { "op":"selectText", "text": amb2 },
        { "op":"municipio2", "text": (common("municipio-detencion") || common("Municipio de la detención") || common("Municipio del hecho") || common("Población del hecho") || "ARONA") },
        { "op":"selectText", "text": tipoV },
        { "op":"set", "formControlName":"nombreVia", "formcontrol":"nombreVia", "value": nombreVia },
        ...(restoDir ? [
          { "op":"set", "formControlName":"restoDireccion", "value": restoDir },
          { "op":"wait", "ms":100 }
        ] : []),
        { "op":"clickText", "text":"Validar dirección" },
        { "op":"wait", "ms": 3000 },
        { "op":"next" }
      ]
    }
  });

  const detenidos = (Array.isArray(data.filiaciones) ? data.filiaciones : [])
    .filter(f => String((f && f["Condición"]) || "").toLowerCase().includes("detenid"));

  if (detenidos.length){
    const mapStep3 = [];

    detenidos.forEach((f) => {
      const tipoDocRaw  = s(f["Tipo de documento"]);
      const tipoDocBase = /^indocumentad/i.test(tipoDocRaw) ? "Indocumentado" : tipoDocRaw;
      const tipoDocNorm = (()=>{
        const v = tipoDocBase;
        if (!v) return "";
        const up = v.toUpperCase();
        if (up === "DNI" || up === "NIE") return v;
        if (/^PASAPORTE$/i.test(v)) return "Pasaporte";
        if (/^CARTA (NACIONAL )?DE IDENTIDAD$/i.test(v) || /^CARTA DE IDENTIDAD$/i.test(v)) return "Carta Nacional de Identidad";
        if (/^INDOCUMENTADO$/i.test(v)) return "Indocumentado";
        return "Otro Documento de Identidad";
      })();
      const numDoc     = s(f["Nº Documento"]).toUpperCase();
      const nombre     = s(f["Nombre"]);
      const apellidos  = s(f["Apellidos"]);
      const sexoSrc    = s(f["Sexo"]);
      const nacional   = (s(f["Nacionalidad"]) || s(f["NACIONALIDAD"])).toUpperCase();
      const paisNac    = (s(f["pais-nacimiento"] || f["País de nacimiento"]) || "ESPAÑA").toUpperCase();
      const provNac    = s(f["provincia-nacimiento"] || f["Provincia nacimiento"]).toUpperCase();
      const pobNac     = s(f["municipio-nacimiento"] || f["Población de nacimiento"]).toUpperCase();
      const fechaNac   = s(f["Fecha de nacimiento"]);
      const padres     = s(f["Nombre de los Padres"] || f["Nombre de los padres"]);
      const dom        = s(f["Domicilio"]);
      const paisDom    = "ESPAÑA";
      let   provDom    = s(f["provincia-domicilio"] || f["Provincia de residencia"]).toUpperCase();
      let   pobDom     = s(f["municipio-domicilio"] || f["Población de residencia"]).toUpperCase();

      if (dom.toUpperCase() === "NO APORTA") {
        if (!provDom) provDom = "SANTA CRUZ DE TENERIFE";
        if (!pobDom)  pobDom  = "ADEJE";
      }

      const telRaw    = s(f["Teléfono"]);
      const tel       = (telRaw.toUpperCase() === "NO APORTA")
                        ? "0"
                        : (/^\d+$/.test(telRaw) ? telRaw : (telRaw ? "0" : ""));
      const email     = "";
      const esEspNac = paisNac === "ESPAÑA";
      const esEspDom = paisDom === "ESPAÑA";

      mapStep3.push(
        { "op":"clickText", "text":"Añadir detenido" },
        { "op":"wait", "ms":400 }
      );

      if (nacional){
        mapStep3.push(
          { "op":"selectText", "formcontrol":"nacionalidad", "text": nacional },
          { "op":"wait", "ms":300 }
        );
      }

      mapStep3.push(
        { "op":"set", "formcontrol":"nombre", "value": nombre },
        { "op":"wait", "ms":100 },
        { "op":"set", "formcontrol":"apellidos", "value": apellidos },
        { "op":"wait", "ms":100 }
      );

      if (tipoDocNorm){
        mapStep3.push(
          { "op":"selectText", "formcontrol":"tipoDocumento", "text": tipoDocNorm },
          { "op":"wait", "ms":400 }
        );
      }

      if (paisNac){
        mapStep3.push(
          { "op":"selectText", "formcontrol":"paisNacimiento", "text": paisNac }
        );
      }

      if (esEspNac && provNac){
        mapStep3.push(
          { "op":"selectText", "formcontrol":"provinciaNacimiento", "text": provNac },
          { "op":"wait", "ms":600 }
        );
      }

      if (esEspNac && pobNac){
        mapStep3.push(
          { "op":"selectText", "formcontrol":"municipioNacimiento", "text": pobNac },
          { "op":"wait", "ms":600 }
        );
      }

      mapStep3.push(
        { "op":"set", "formcontrol":"numeroDocumento", "value": numDoc },
        { "op":"wait", "ms":300 }
      );

      (function(){
        const low = sexoSrc.toLowerCase();
        let query = "";
        if (/^m/.test(low)) {
          query = "mat-radio-group[formcontrolname='sexo'] mat-radio-button:first-of-type .mat-radio-label";
        } else if (/^f/.test(low)) {
          query = "mat-radio-group[formcontrolname='sexo'] mat-radio-button:nth-of-type(2) .mat-radio-label";
        }
        if (query){
          mapStep3.push(
            { "op":"click", "query": query },
            { "op":"wait", "ms":300 }
          );
        }
      })();

      mapStep3.push(
        { "op":"set", "formcontrol":"fechaNacimiento", "value": fechaNac },
        { "op":"wait", "ms":100 },
        { "op":"set", "formcontrol":"nombrePadres", "value": padres },
        { "op":"wait", "ms":100 }
      );

      if (paisDom){
        mapStep3.push(
          { "op":"selectText", "formcontrol":"paisDomicilio", "text": paisDom },
          { "op":"wait", "ms":400 }
        );
      }

      if (esEspDom && provDom){
        mapStep3.push(
          { "op":"selectText", "formcontrol":"provinciaDomicilio", "text": provDom },
          { "op":"wait", "ms":800 }
        );
      }

      if (esEspDom && pobDom){
        mapStep3.push(
          { "op":"selectText", "formcontrol":"municipioDomicilio", "text": pobDom },
          { "op":"wait", "ms":200 }
        );
      }

      mapStep3.push(
        { "op":"set", "formcontrol":"domicilio", "value": dom },
        { "op":"wait", "ms":100 },
        { "op":"set", "formcontrol":"telefono", "value": tel },
        { "op":"wait", "ms":100 },
        { "op":"set", "formcontrol":"email", "value": email },
        { "op":"uncheckEmail" },
        { "op":"wait", "ms":100 },
        { "op":"clickText", "text":"Aceptar" },
        { "op":"wait", "ms":800 }
      );
    });

    mapStep3.push(
      { "op":"next" },
      { "op":"wait", "ms":100 },
      { "op":"next" },
      { "op":"wait", "ms":100 }
    );

    steps.push({
      "__profile":"dilipol_step3",
      "__ts": Date.now(),
      "data": { "map": mapStep3 }
    });
  }

  // Objetos: admite data.objects o data.objects.objects
  let objs = [];
  if (Array.isArray(data.objects)) {
    objs = data.objects.map(s).filter(Boolean);
  } else if (data.objects && Array.isArray(data.objects.objects)) {
    objs = data.objects.objects.map(s).filter(Boolean);
  }

  if (objs.length){
    steps.push({
      "__profile":"toggle_objetos",
      "data":{ "map":[
        { "op":"click","query":"mat-slide-toggle label[for$='-input']" },
        { "op":"wait","ms":200 },
        { "op":"selectText","text":"PRESENTADOS" },
        { "op":"wait","ms":250 }
      ] }
    });
    objs.forEach((desc)=>{
      steps.push({
        "__profile":"objeto",
        "data":{ "map":[
          { "op":"clickText","text":"Agregar objeto" },
          { "op":"wait","ms":250 },
          { "op":"clickText","text":"Otro objeto" },
          { "op":"wait","ms":250 },
          { "op":"selectText","text":"OBJETOS GENERALES" },
          { "op":"wait","ms":200 },
          { "op":"selectText","text":"Otro objeto" },
          { "op":"wait","ms":200 },
          { "op":"set","formcontrol":"cantidad","value":"1" },
          { "op":"wait","ms":150 },
          { "op":"set","formcontrol":"descripcion","value": String(desc) },
          { "op":"wait","ms":150 },
          { "op":"clickText","text":"Aceptar" },
          { "op":"wait","ms":300 }
        ] }
      });
    });
    steps.push({ "__profile":"toggle_objetos", "data": { "map":[ { "op":"next" } ] } });
  } else {
    steps.push({ "__profile":"toggle_objetos", "data": { "map":[ { "op":"next" } ] } });
  }

  steps.push({
    "__profile":"post_objetos_next",
    "data":{ "map":[ { "op":"next" } ] }
  });

  // —— Página “Asunto” y “Documento” ——
  const primerDet    = detenidos[0] || {};
  const delitoAsunto = s(primerDet["Delito"] || primerDet["DELITO"] || "");
  const asuntoText   = delitoAsunto || s(localStorage.getItem("diligencias") || "");

  steps.push({
    "__profile":"asunto_doc",
    "data":{ "map":[
      { "op":"wait","ms":300 },
      { "op":"click","query":"label[for='mat-input-35']" },
      { "op":"wait","ms":120 },
      { "op":"click","query":"#mat-input-35" },
      { "op":"wait","ms":80 },
      { "op":"set","formcontrol":"asunto","value": asuntoText || "Asunto" }
    ] }
  });

  const slim = steps.map(step => {
    const { __ts, ...rest } = step || {};
    return rest;
  });

  return JSON.stringify(slim);
}

  function attach(){
    const btn = document.getElementById("exportPrometeoBtn");
    if (!btn) return;
    btn.addEventListener("click", async ()=>{
      try{
        const payload = buildPrometeoPayload();
        await navigator.clipboard.writeText(payload);
        alert("✅ Prometeo: JSON copiado al portapapeles");
      }catch(e){
        console.error(e);
        alert("No se pudo copiar al portapapeles");
      }
    }, {passive:true});
  }

  // Esperar DOM listo por si el script se carga en <head>
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", attach, {once:true});
  } else {
    attach();
  }
})();