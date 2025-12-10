// js/diligencias_rules.js
(function () {
  // Global-multi: redactan en plural si hay varios
  const GLOBAL_MULTI = new Set([
    "info_derechos","resena","ingreso_calabozos","personacion_letrado","inicial_pl","comunicacion_colegio"
  ]);

  // Siempre globales (no ligadas a un detenido concreto)
   const ALWAYS_GLOBAL = new Set([
    "aceptacion","traspaso","remision","comision_cientifica",
    "senalamiento_jrd","senalamiento_jidl",
    "vpr","consultas_anteriores","consulta_armas","siraj","valoracion_sustancia","entrega_estupefaciente"
  ]);

  // Contexto RAÍZ
  let ctxRaiz = { detenidos: [], personas: [] };

  // Inyectar raíz ya preparada
  window.diligencias_setRaiz = (raiz) => {
    ctxRaiz = (raiz && typeof raiz === "object")
      ? raiz
      : { detenidos: [], personas: [] };

    if (!Array.isArray(ctxRaiz.detenidos)) ctxRaiz.detenidos = [];
    if (!Array.isArray(ctxRaiz.personas))  ctxRaiz.personas  = [];
    // Exponer el contexto global para remisionguardado.js
    window.ctxRaiz = ctxRaiz;
  };

    // Ingestar EXPEDIENTE crudo (como lo guarda raiz.html)
  window.diligencias_ingestarExpediente = (exp) => {
    const arr = Array.isArray(exp?.filiaciones) ? exp.filiaciones : [];

    // getter seguro de claves alternativas
    const g = (o, ...k) => {
      for (const kk of k) if (o && o[kk] != null) return String(o[kk]).trim();
      return "";
    };

    // Nombre: Capitaliza; Apellidos: MAYÚSCULAS
    const toTitle = (s) => String(s || "")
      .toLowerCase()
      .replace(/\b([a-záéíóúñü])/gi, (m, c) => c.toUpperCase());

    const nombreFormateado = (p) => {
      const nom = toTitle(g(p, "Nombre"));
      const aps = g(p, "Apellidos").toUpperCase();
      return `${nom} ${aps}`.replace(/\s+/g, " ").trim();
    };

    const isDet = (p) => /detenid[oa]/i.test(g(p, "Condición", "Condicion"));

    const detenidos = arr.filter(isDet).map(p => ({
      nombreCompleto: nombreFormateado(p),
      sexo: g(p,"Sexo"),
      nacionalidad: g(p,"Nacionalidad"),
      abogado: g(p,"Abogado","Letrado"),
      comunicarseCon: g(p,"Comunicarse con","Comunicarse"),
      informarDetencionA: g(p,"Informar de detención","Informar de detencion","Informar de Detención"),
      interprete: g(p,"Intérprete","Interprete"),
      medico: g(p,"Médico","Medico"),
      consulado: g(p,"Consulado")
    }));

    // Todas las filiaciones (incluidas no detenidas) para diligencias ligadas a personas
    const personas = arr.map((p, idx) => ({
      index: idx,
      nombreCompleto: nombreFormateado(p),
      condicion: g(p, "Condición", "Condicion"),
      sexo: g(p, "Sexo"),
      nacionalidad: g(p, "Nacionalidad"),
      abogado: g(p, "Abogado", "Letrado"),
      comunicarseCon: g(p, "Comunicarse con", "Comunicarse"),
      informarDetencionA: g(p, "Informar de detención", "Informar de detencion", "Informar de Detención"),
      interprete: g(p, "Intérprete", "Interprete"),
      medico: g(p, "Médico", "Medico"),
      consulado: g(p, "Consulado"),
      raw: p
    }));

    window.diligencias_setRaiz({ detenidos, personas });
  };

  // ===== Utils
  const norm = s => String(s || "").trim();
  const sexF = s => /^f/i.test(String(s || ""));
  const noStrayS = s => String(s || "").replace(/([A-ZÁÉÍÓÚÑ]{2,})s(?=\s|[,.–-]|$)/g, "$1");
  const contraerAl  = t => t.replace(/\ba el\b/gi, "al");
  const contraerDel = t => t.replace(/\bde el\b/gi, "del");
  // === NUEVA FUNCIÓN ===
  function isSpainNationality(nac){
    const n = String(nac||"")
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .trim().toUpperCase();
    return n === 'ESPANA' || n === 'ESPAÑA' || n === 'SPAIN' || n === 'ESP';
  }
  function nombresDetenidos(detIdx) {
    if (detIdx == null) return (ctxRaiz.detenidos || []).map(d => noStrayS(norm(d?.nombreCompleto || ""))).filter(Boolean);
    const d = (ctxRaiz.detenidos || [])[detIdx] || {};
    return [noStrayS(norm(d.nombreCompleto || ""))].filter(Boolean);
  }
  function listaNombres(arr) {
    const n = arr.length; if (!n) return "";
    if (n === 1) return arr[0];
    if (n === 2) return `${arr[0]} y ${arr[1]}`;
    return `${arr.slice(0, n - 1).join(", ")} y ${arr[n - 1]}`;
  }
  function forms(detIdx, esGlobal) {
    const arr = ctxRaiz.detenidos || [];
    const many = esGlobal ? (arr.length > 1) : false;
    const oneF = esGlobal ? (arr.length === 1 ? sexF(arr[0]?.sexo) : false) : sexF(arr[detIdx]?.sexo);
    const allF = many && arr.every(d => sexF(d?.sexo));
    return {
      many, oneF, allF,
      art: many ? (allF ? "las" : "los") : (oneF ? "la" : "el"),
      detenido: many ? (allF ? "detenidas" : "detenidos") : (oneF ? "detenida" : "detenido"),
      llamado: many ? (allF ? "llamadas" : "llamados") : (oneF ? "llamada" : "llamado"),
      le: many ? "les" : "le",
      acta: many ? "actas" : "acta",
      mismo: many ? (allF ? "las mismas" : "los mismos") : (oneF ? "la misma" : "el mismo")
    };
  }
  const limpiarGen = t => t
    .replace(/,\s*cuyos\s+datos\s+(?:de\s+filiaci[oó]n\s+)?ya\s+constan,?/gi, "")
    .replace(/,\s*,/g, ", ")
    .replace(/\s+,/g, ", ");

  function resolverBarras(t, detIdx, esGlobal) {
    const f = forms(detIdx, esGlobal);
    return t
      .replace(/\bal\/los\s+detenido\/s\b/gi, `${f.art} ${f.detenido}`)
      .replace(/\ba\/los\s+detenido\/s\b/gi, `a ${f.art} ${f.detenido}`)
      .replace(/\bel\/los\s+detenido\/s\b/gi, `${f.art} ${f.detenido}`)
      .replace(/\bel\/la\s+detenido\/a\b/gi, `${f.art} ${f.detenido}`)
      .replace(/\ba el\/los\b/gi, `a ${f.art}`)
      .replace(/\ble\/s\b/gi, f.le)
      .replace(/\bacta\/s\b/gi, f.acta)
      .replace(/\bse adjunta\/n\b/gi, f.many ? "se adjuntan" : "se adjunta")
      .replace(/\bsea\/n\s+ingresado\/s\b/gi, f.many ? "sean ingresados" : (f.oneF ? "sea ingresada" : "sea ingresado"));
  }

  // Inserta ", el/la/los/las llamado/a(s) NOMBRES" justo DESPUÉS de "detenido/a/os/as"
  function insertarNombresTrasDetenidos(out, f, nombres) {
    // Coincide el grupo completo “(a )?(el|la|los|las) detenido(s/as?)” con límite de palabra
    return out.replace(
      /((?:^|[\s,])(?:a\s+)?(?:el|la|los|las)\s+detenid(?:o|a|os|as))\b/i,
      (_m, pref) => `${pref}, ${f.art} ${f.llamado} ${nombres}`
    );
  }

  function comaTrasListaParaMotivos(t) {
    t = t.replace(
      /((?:los|las)\s+llamad[oa]s\s+[^\n,]+?)(,)?(\s+de\s+los\s+motivos|\s+del\s+motivo)/i,
      (_m, lista, _c, resto) => `${lista.replace(/,\s*$/, "")},${resto}`
    ).replace(
      /((?:el|la)\s+llamad[oa]\s+[^\n,]+?)(,)?(\s+de\s+los\s+motivos|\s+del\s+motivo)/i,
      (_m, lista, _c, resto) => `${lista.replace(/,\s*$/, "")},${resto}`
    );
    return t.replace(/,\s*,/g, ", ");
  }
  function comaTrasListaAntesDe(t, palabra) {
    const re = new RegExp(`(llamad[oa]s?\\s+[^,\\n]+?)(\\s+${palabra})`, "i");
    return t.replace(re, (_m, lista, resto) => `${lista.replace(/,\s*$/, "")},${resto}`);
  }

  function adaptarPreambulo(texto, detIdx, esGlobal, id) {
    const nombresArr = esGlobal ? nombresDetenidos(null) : nombresDetenidos(detIdx);
    const nombres = listaNombres(nombresArr);
    const f = forms(detIdx, esGlobal);
    let out = limpiarGen(texto);
    out = resolverBarras(out, detIdx, esGlobal);

    // Concordancias base
    out = out
      .replace(/\bal\s+detenido\b/gi, `a ${f.art} ${f.detenido}`)
      .replace(/\ba\s+los\s+detenido\b/gi, "a los detenidos")
      .replace(/\ba\s+las\s+detenido\b/gi, "a las detenidas")
      .replace(/\bel\s+detenido\b/gi, `${f.art} ${f.detenido}`)
      .replace(/\blos\s+detenido\b/gi, "los detenidos")
      .replace(/\blas\s+detenido\b/gi, "las detenidas");

    // Inserta nombres tras “detenido/a/os/as”
    if (nombres) {
      if (!/llamad[oa]s?\s+/i.test(out)) {
        out = insertarNombresTrasDetenidos(out, f, nombres);
      } else {
        out = out.replace(
          /((?:el|la|los|las)\s+llamad[oa]s?\s+[^\n,]+?)(\s+(?:de\s+los\s+motivos|del\s+motivo|lo que|sean ingresados|sobre los hechos))/i,
          (_m, lista, resto) => `${lista.replace(/,\s*$/, "")},${resto}`
        );
      }
    }

    // Motivo(s), pronombres, acta(s)
    out = out
      .replace(/del motivo de su detenci[oó]n/gi, f.many ? "de los motivos de su detención" : "del motivo de su detención")
      .replace(/\b(le|les)\s+asisten\b/gi, `${f.le} asisten`)
      .replace(/\bacta(?:s)?\s+aparte\b/gi, `${f.acta} aparte`);
    if (f.many) out = out.replace(/\bque se adjunta\b/gi, "que se adjuntan");

    // Ingreso pluralizado
    if (esGlobal && id === "ingreso_calabozos") {
      out = out
        .replace(/\bsea ingresad[oa]\b/gi, f.many ? "sean ingresados" : (f.oneF ? "sea ingresada" : "sea ingresado"))
        .replace(/\bser[aá] ingresado\b/gi, f.many ? "sean ingresados" : (f.oneF ? "sea ingresada" : "sea ingresado"));
    }

    // “encartado(s)” → llamados (si hay nombres)
    if (nombres) {
      const ref = `${f.art} ${f.llamado} ${nombres}`;
      out = out
        .replace(/\bel encartado(?: en las presentes)?\b/gi, ref)
        .replace(/\bla encartada(?: en las presentes)?\b/gi, ref)
        .replace(/\bl[oa]s encartad[oa]s?(?: en las presentes)?\b/gi, ref);
    }

    // Comas + contracciones
    out = comaTrasListaParaMotivos(out);
    out = comaTrasListaAntesDe(out, "lo que");
    out = comaTrasListaAntesDe(out, "sean ingresados");
    out = comaTrasListaAntesDe(out, "sobre los hechos");
    out = out.replace(/,\s*,/g, ", ").replace(/,\s{2,}/g, ", ").replace(/ {2,}/g, " ");
    out = contraerAl(out); out = contraerDel(out);
    return out;
  }

  // Checklist de “cumplimentación de derechos”
  function buildChecklist(det) {
    const esF = sexF(det?.sexo);
    const lines = [];
    const abogado = norm(det.abogado);
    if (abogado) {
      if (/^de oficio\.?$/i.test(abogado)) lines.push(`* Desea ser ${esF ? "asistida" : "asistido"} por el letrado/a del Turno de Oficio.`);
      else lines.push(`* Desea ser ${esF ? "asistida" : "asistido"} por el letrado/a ${abogado}.`);
    }
    const tel = norm(det.comunicarseCon);
    if (tel) lines.push(/^nadie\.?$/i.test(tel) ? "* No desea comunicarse telefónicamente con nadie." : `* Sí desea comunicarse telefónicamente con ${tel}.`);
    const informar = norm(det.informarDetencionA);
    if (informar) lines.push(/^nadie\.?$/i.test(informar) ? "* No desea que comuniquen la detención y lugar de custodia a nadie." : `* Sí desea que comuniquen la detención y lugar de custodia a ${informar}.`);
    const inter = norm(det.interprete);
    if (inter && !/^no$/i.test(inter)) lines.push(`* Sí desea ser ${esF ? "asistida" : "asistido"} por un intérprete de ${inter}.`);
    const medico = norm(det.medico);
    if (medico) lines.push(`* ${/^(si|sí)$/i.test(medico) ? "Sí" : "No"} desea ser reconocid${esF ? "a" : "o"} por un médico.`);
       const cons = norm(det.consulado);
    if (!isSpainNationality(det?.nacionalidad)) {
      if (cons) lines.push(`* ${/^(si|sí)$/i.test(cons) ? "Sí" : "No"} desea comunicar su detención a su consulado o embajada.`);
    }
    return lines.join("\n");
  }

  // Render final de cada diligencia
  function renderHTML(itemBase, meta) {
    const id = itemBase.id;
    let out = String(itemBase.texto || "");

    // === Sustitución dinámica de [fecha] y [hora] ===
    if (/\[fecha\]/i.test(out) || /\[hora\]/i.test(out)) {
      const ahora = new Date();
      const fechaHoy = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid' }).format(ahora);
      const horaAhora = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });

      // Fecha siempre dinámica
      out = out.replace(/\[fecha\]/ig, fechaHoy);

      // Reglas específicas por diligencia
      if (id === 'aceptacion') {
        // ACEPTACIÓN: bloque 08:00 si 02:00–14:29, si no 14:30
        const horaNum = ahora.getHours() + ahora.getMinutes() / 60; // e.g., 14.5
        const bloque = (horaNum >= 2 && horaNum < 14.5) ? '08:00' : '14:30';
        out = out
          .replace(/\[hora\]/ig, bloque)
          .replace(/\b08:00 14:30\b/, bloque); // compat textos antiguos
      } else if (id === 'traspaso') {
        // TRASPASO: 14:30 si 02:00–14:29, en otro caso 22:00
        const horaNum = ahora.getHours() + ahora.getMinutes() / 60;
        const bloque = (horaNum >= 2 && horaNum < 14.5) ? '14:30' : '22:00';
        out = out.replace(/\[hora\]/ig, bloque);
      } else {
        // Caso general: hora real del sistema
        out = out.replace(/\[hora\]/ig, horaAhora);
      }
    }

    // Preambulo y listas
    if (GLOBAL_MULTI.has(id) || ALWAYS_GLOBAL.has(id)) {
      out = adaptarPreambulo(out, null, true, id);
    } else if (meta && meta.type === "det") {
      out = adaptarPreambulo(out, meta.detIndex, false, id);
    }

    const arr = ctxRaiz.detenidos || [];
    const total = arr.length;
    const det = (meta && meta.type === "det") ? (arr[meta.detIndex] || {}) : {};
    const nombre = noStrayS(norm(det.nombreCompleto));
    const esF = sexF(det.sexo);
    const art = esF ? "la" : "el";
    const llamado = esF ? "llamada" : "llamado";
    const prepDeLlamado = esF ? "de la llamada" : "del llamado";

    // Cumplimentación (cabecera y concordancias)
    if (id === "cumplimentacion_derechos") {
      // Corrige encabezado femenino: "DE LA DETENIDA" (masculino: "DEL DETENIDO")
      out = out.replace(
        /^(\s*DILIGENCIA DE CUMPLIMENTACIÓN DE DERECHOS )DE?L\s+DETENID[OA]\.-/i,
        (_, pre) => `${pre}${esF ? "DE LA DETENIDA" : "DEL DETENIDO"}.-`
      );

      // Inserta "por el/la detenido/a, el/la llamado/a NOMBRE" y "la misma/el mismo"
      if (nombre) {
        out = out
          .replace(
            /(por\s+(?:el|la)\s+detenid[ao])(?!,\s+(?:el|la)\s+llamad[oa])/i,
            `$1, ${art} ${llamado} ${nombre}`
          )
          .replace(/se participa que (el\/la) mismo\/a:/i, `se participa que ${esF ? "la misma" : "el mismo"}:`)
          .replace(/se participa que el\/la mismo\/a:/i, `se participa que ${esF ? "la misma" : "el mismo"}:`);
      }

      // Checklist final (concordado por sexo)
      const ck = buildChecklist(det);
      if (ck) out = out.replace(/CONSTE Y CERTIFICO\.\s*$/i, `${ck}\nCONSTE Y CERTIFICO.`);
    }

    // Comunicación al Colegio de Abogados (GLOBAL). Redacta "el/la/los/las llamado/a(s) NOMBRES" según número y sexo.
    if (id === "comunicacion_colegio") {
      const arrD = ctxRaiz.detenidos || [];
      if (arrD.length) {
        const nombres = listaNombres(arrD.map(d => noStrayS(norm(d?.nombreCompleto || ""))).filter(Boolean));
        const anyMale = arrD.some(d => !sexF(d?.sexo));
        const allFemale = arrD.every(d => sexF(d?.sexo));
        let articulo, llamado;
        if (arrD.length === 1) {
          const esFemi = sexF(arrD[0]?.sexo);
          articulo = esFemi ? "la" : "el";
          llamado  = esFemi ? "llamada" : "llamado";
        } else {
          // Si hay varias personas: si hay al menos un hombre -> "los llamados"; si todas son mujeres -> "las llamadas".
          articulo = anyMale ? "los" : "las";
          llamado  = anyMale ? "llamados" : "llamadas";
        }
        out = out.replace(/la detenci[oó]n correspondiente/i, `la detención de ${articulo} ${llamado} ${nombres}`);
      }
    }

    
  // Puesta en libertad (por detenido si hay varios)
if (id === "puesta_libertad" && nombre) {
  out = out
    .replace(/la detención de la persona reseñada/i, `la detención ${prepDeLlamado} ${nombre}`)
    .replace(/que el\/la mismo\/a sea PUESTO\/A EN LIBERTAD/i, `que ${esF ? "la misma" : "el mismo"} sea ${esF ? "PUESTA" : "PUESTO"} EN LIBERTAD`)
    .replace(/informado\/a/i, `informad${esF ? "a" : "o"}`);
}


    // Habeas Corpus
    if (id === "habeas_corpus" && nombre) {
      out = out.replace(/la persona detenida solicita/i, `${esF ? "la detenida" : "el detenido"}, ${esF ? "la llamada" : "el llamado"} ${nombre}, solicita`);
    }

    // ADN
    if (id === "consentimiento_adn_si" && nombre) {
      out = out.replace(/del detenido\b/i, `${prepDeLlamado} ${nombre}`);
    }
    if (id === "muestra_indubitada_no" && nombre) {
      out = out.replace(/a la persona detenida\b/i, `a ${art} ${llamado} ${nombre}`);
    }
    if (id === "toma_forzosa" && nombre) {
      out = out.replace(/de la persona detenida\b/i, `de ${art} ${llamado} ${nombre}`);
    }
    // Comunicación al Consulado (por detenido)
    if (id === "comunicacion_consulado" && nombre) {
      // País a partir de la nacionalidad del detenido (formato: Título)
      const paisRaw = String(det.Nacionalidad || det.nacionalidad || '').trim();
      const toTitle = s => String(s||'').toLowerCase().replace(/\b([a-záéíóúñü])/gi, (_, c) => c.toUpperCase());
      const pais = paisRaw ? toTitle(paisRaw) : '';

      // Reescritura mínima: apuntar al consulado del país y al detenido concreto
      if (pais) {
        out = out.replace(
          /al Consulado que corresponda/i,
          `al Consulado de ${pais}`
        );
      }
      out = out
        .replace(
          /la detención de la persona afectada/i,
          `la detención ${prepDeLlamado} ${nombre}`
        )
        .replace(
          /la persona afectada/i,
          `${art} ${llamado} ${nombre}`
        );
    }

    // Situación Administrativa (por detenido)
    if (id === "situacion_administrativa" && nombre) {
      // Sustituye la referencia genérica por el detenido concreto con concordancia
      out = out
        .replace(
          /que la persona reseñada se encuentra/i,
          `que ${art} ${llamado} ${nombre} se encuentra`
        )
        .replace(
          /la persona reseñada/i,
          `${art} ${llamado} ${nombre}`
        );
    }

    // Antecedentes (por detenido)
    if (id === "antecedentes" && nombre) {
      // Sustituye la referencia genérica por el detenido concreto con concordancia
      out = out
        .replace(/los antecedentes de la persona reseñada/i, `los antecedentes ${prepDeLlamado} ${nombre}`)
        .replace(/respecto de la persona reseñada/i, `respecto ${prepDeLlamado} ${nombre}`)
        .replace(/de la persona reseñada/i, `de ${art} ${llamado} ${nombre}`)
        .replace(/la persona reseñada/i, `${art} ${llamado} ${nombre}`)
        .replace(/que no le constan antecedentes/i, `que ${esF ? "a la misma" : "al mismo"} no le constan antecedentes`);
    }
// === Valoración de Sustancia (lee strings en expediente.objects) ===
if (id === "valoracion_sustancia") {
  try {
    const DRUG_PRICES = {
      "cocaina": { per: "g", price: 60.03 },
      "hachis":  { per: "g", price: 6.83 },
      "marihuana": { per: "g", price: 6.28 },
      "heroina": { per: "g", price: 58.35 },
      "speed":   { per: "g", price: 30.04 },
      "ketamina":{ per: "g", price: 49.26 },
      "ghb":     { per: "g", price: 48.87 },
      "mdma":    { per: "u", price: 13.31 },
      "lsd":     { per: "u", price: 13.03 }
    };

    // 1) Cargar expediente desde localStorage usando el mismo criterio que el resto de diligencias:
    //    primero snapshot ODAC (gestor_partes_comparecencias_pc_v3) y, si no existe, proyecto/expediente clásico.
    let root = null;
    try {
      const rawGestor = localStorage.getItem('gestor_partes_comparecencias_pc_v3');
      if (rawGestor) {
        const expG = JSON.parse(rawGestor);
        root = (expG && (expG.expediente || expG)) || null;
      }
    } catch (_) { root = null; }

    if (!root) {
      const raw = localStorage.getItem("proyecto")
               || localStorage.getItem("expedienteGuardado")
               || localStorage.getItem("expedienteOriginal")
               || "";
      const exp = raw ? JSON.parse(raw) : {};
      root = (exp && exp.expediente && (Array.isArray(exp.expediente.filiaciones) || Object.keys(exp.expediente).length))
        ? exp.expediente
        : exp;
    }

    const objetos = Array.isArray(root?.objects) ? root.objects
                  : Array.isArray(root?.objetos) ? root.objetos
                  : [];

    // 2) Normalizar: si el item es string, úsalo tal cual; si es objeto, intenta nombre/desc/tipo
    const textos = objetos.map(o => {
      if (typeof o === "string") return o;
      return o?.nombre || o?.descripcion || o?.tipo || "";
    }).filter(Boolean);

    // 3) Parser: "2 gramos de cocaína" / "0,5 kg de marihuana" / "3 pastillas de MDMA"
    const parseLine = t => {
      const m = String(t||"").match(/(?:\((\d+(?:[.,]\d+)?)\)|(\d+(?:[.,]\d+)?))\s*(kg|kilo(?:s)?|g|gr(?:s|amos)?|gramos?|ud(?:es)?|unidad(?:es)?|pastilla(?:s)?|tableta(?:s)?|dosis)\s+de\s+(.+)/i);
      if (!m) return null;
      const numStr = m[1] || m[2];
      const n = parseFloat(numStr.replace(",", "."));
      let u = m[3].toLowerCase();
      if (/^kg|kilo/.test(u)) u = "kg";
      else if (/^g|gr/.test(u)) u = "g";
      else u = "u";
      // normalizar droga
      const d = m[4].toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
        .replace(/[^\w\s]/g,"").trim();
      // mapear alias básicos
      const drug =
        /cocain?a|^coca\b/.test(d) ? "cocaina" :
        /hachis|hash/.test(d) ? "hachis" :
        /marihu?ana|grifa|cannabis/.test(d) ? "marihuana" :
        /heroin?a/.test(d) ? "heroina" :
        /mdma|extasis/.test(d) ? "mdma" :
        /lsd|trip|acido/.test(d) ? "lsd" :
        /ketamina|keta/.test(d) ? "ketamina" :
        /ghb|gbl/.test(d) ? "ghb" :
        /speed|anfetamina|sulfato/.test(d) ? "speed" :
        null;
      if (!drug) return null; // p.ej. "Metanfetamina" sin mapeo -> se ignora
      return { n, u, drug };
    };

    const euro = x => (Number(x)||0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // 4) Calcular líneas
    const lines = [];
    let total = 0;
    textos.forEach(t => {
      const p = parseLine(t);
      if (!p) return;
      const info = DRUG_PRICES[p.drug];
      if (!info) return;

      if (info.per === "g") {
        const g = p.u === "kg" ? p.n * 1000 : p.n;
        const val = g * info.price;
        total += val;
        lines.push(`• ${euro(g)} gramos de ${p.drug.toUpperCase()}: precio medio ${euro(info.price)} €/g ⇒ ${euro(val)} €.`);
      } else {
        const val = p.n * info.price;
        total += val;
        const uTxt = p.n === 1 ? "unidad" : "unidades";
        lines.push(`• ${euro(p.n)} ${uTxt} de ${p.drug.toUpperCase()}: precio medio ${euro(info.price)} €/ud ⇒ ${euro(val)} €.`);
      }
    });

    if (lines.length) {
      const bloque = [
        "",
        "-- A efectos meramente estimativos y conforme a precios medios en el mercado ilícito (1er semestre 2025), resulta:",
        ...lines,
        "",
        `Valor global de la sustancia intervenida: ${euro(total)} €.`,
      ].join("\n");

      // Tolerante con espacios/puntos al final
      out = out.replace(/CONSTE Y CERTIFICO[\s.]*$/i, `${bloque}\nCONSTE Y CERTIFICO.`);
    }
  } catch(_) {}
}
    // Señalamientos JRD/JIDL y diligencias que comparten [fecha/hora/juzgado] desde DOCUMENTOS
    if (
      id === "senalamiento_jrd" ||
      id === "senalamiento_jidl" ||
      id === "toma_y_ofrecimiento" ||
      id === "citacion_jrd" ||
      id === "citacion_jidl" ||
      id === "citacion_tlf_jrd" ||
      id === "citacion_tlf_jidl" ||
      id === "personacion_victima"
    ) {
      try {
        // 1) Preferir snapshot ODAC de gestor_partes_comparecencias_pc_v3
        let root = null;
        try{
          const rawGestor = localStorage.getItem('gestor_partes_comparecencias_pc_v3');
          if (rawGestor){
            const expG = JSON.parse(rawGestor);
            root = (expG && (expG.expediente || expG)) || null;
          }
        }catch(_){ root = null; }

        // 2) Fallback: expedienteGuardado / proyecto / expedienteOriginal clásicos
        if (!root){
          const raw = localStorage.getItem("expedienteGuardado")
                  || localStorage.getItem("proyecto")
                  || localStorage.getItem("expedienteOriginal")
                  || "";
          const exp = raw ? JSON.parse(raw) : {};
          root = (exp && exp.expediente && (Array.isArray(exp.expediente.filiaciones) || Object.keys(exp.expediente).length))
            ? exp.expediente
            : exp;
        }

        const JUZ = (root && root.Juzgado) ? root.Juzgado : {};

        const pick = (...vals) => {
          for (const v of vals) {
            if (v != null && String(v).trim() !== '') return String(v).trim();
          }
          return '';
        };

        const fecha = pick(
          JUZ.Fecha,
          root && root['Fecha de procedimiento'], root && root['FECHA_PROCEDIMIENTO'],
          document.getElementById('docFechaProc')?.value
        );
        const fechaES = /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha.split('-').reverse().join('/') : fecha;

        let hora = pick(
          JUZ.Hora,
          root && root['Hora de procedimiento'], root && root['HORA_PROCEDIMIENTO'],
          document.getElementById('docHoraProc')?.value
        );

        const juzg = pick(
          JUZ.Nombre,
          root && root['Juzgado'], root && root['JUZGADO'],
          document.getElementById('docJuzgado')?.value
        );

        // Normaliza hora mínima (HH:MM)
        if (hora && /^\d{1,2}$/.test(hora)) hora = hora.padStart(2,'0')+':00';
        if (hora && /^\d{1,2}:$/.test(hora)) hora = hora+'00';
        if (hora && /^\d{1,2}:\d$/.test(hora)) hora = hora.replace(/:(\d)$/,':$10');

        // === Cartel ÚNICO si faltan datos básicos (reutiliza el bloque existente, no añade nuevos componentes) ===
        const faltan = [];
        if (!fechaES) faltan.push('fecha del procedimiento');
        if (!hora)    faltan.push('hora del procedimiento');
        if (!juzg)    faltan.push('juzgado seleccionado');

       if (faltan.length) {
  // Aviso simple y no intrusivo; no insertamos nada si faltan datos
  alert('Faltan datos para el señalamiento: ' + faltan.join(', ') + '.\nRellénalos en DOCUMENTOS para autocompletar.');
} else {
  // Rellenar TODAS las variantes de placeholders que usan meta de DOCUMENTOS,
  // no solo las de esta diligencia concreta.
  if (fechaES) {
    out = out
      // Formato antiguo específico de esta plantilla
      .replace(/\[fecha del procedimiento\]/ig, fechaES)
      // Placeholders genéricos usados por otras diligencias
      .replace(/\[FECHA_PROCEDIMIENTO\]/ig, fechaES)
      .replace(/\{\{\s*FECHA_PROCEDIMIENTO\s*\}\}/ig, fechaES);
  }
  if (hora) {
    out = out
      .replace(/\[hora del procedimiento\]/ig, hora)
      .replace(/\[HORA_PROCEDIMIENTO\]/ig, hora)
      .replace(/\{\{\s*HORA_PROCEDIMIENTO\s*\}\}/ig, hora);
  }
  if (juzg) {
    out = out
      .replace(/\[juzgado seleccionado\]/ig, juzg)
      .replace(/\[JUZGADO\]/ig, juzg)
      .replace(/\{\{\s*JUZGADO\s*\}\}/ig, juzg);
  }
}
      } catch(_) {}
    }
    
    // === TOMA DE DECLARACIÓN Y OFRECIMIENTO DE ACCIONES (por filiación NO detenida) ===
    if (id === 'toma_y_ofrecimiento') {
      // Meta trae nombre/sexo/rol desde expandItems (NONDET)
      const nombreP = noStrayS(norm(meta?.nombre || ''));
      const esPF = /^f/i.test(String(meta?.sexo || ''));
      const artLlam = esPF ? 'la llamada' : 'el llamado';
      const informadoA = esPF ? 'informada' : 'informado';
      const rolSexo = esPF ? 'Perjudicada u Ofendida' : 'Perjudicado u Ofendido'; out = out.replace(/Perjudicado\/a u Ofendido\/a/gi, rolSexo);
      if (nombreP) {
        out = out.replace(/\[NOMBRE_FILIACION\]/ig, nombreP);
      }
      out = out
        .replace(/\[EL_LA_LLAMADO\]/ig, artLlam)
        .replace(/\[INFORMADO_A\]/ig, informadoA);
    }
   if (id === "inicial_pl") {
  try {
    const ahora = new Date();
    const fechaHoy  = ahora.toLocaleDateString('es-ES');
    const horaAhora = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });

    let root = null;
    try {
      const rawGestor = localStorage.getItem('gestor_partes_comparecencias_pc_v3');
      if (rawGestor) {
        const expG = JSON.parse(rawGestor);
        root = (expG && (expG.expediente || expG)) || null;
      }
    } catch (_) { root = null; }

    if (!root) {
      const raw  = localStorage.getItem('expedienteGuardado')
                || localStorage.getItem('proyecto')
                || localStorage.getItem('expedienteOriginal')
                || "";
      const exp  = raw ? JSON.parse(raw) : {};
      root = (exp && exp.expediente && (Array.isArray(exp.expediente.filiaciones) || Object.keys(exp.expediente).length))
        ? exp.expediente
        : exp;
    }

    const fil = Array.isArray(root?.filiaciones) ? root.filiaciones : [];
    const esDet = p => /detenid[oa]/i.test(String(p?.["Condición"] || p?.Condicion || ""));
    const detenidos = fil.filter(esDet);
    const principal = detenidos[0] || fil[0] || {};

    // FECHA: usar SIEMPRE la "Fecha de generación" (formato DD/MM/YYYY si viene ISO)
    const fechaES = (() => {
      const f = String(root['Fecha de generación'] || root['Fecha de generacion'] || '').trim();
      const m = f.match(/^(\d{4})-(\d{2})-(\d{2})/);
      return m ? `${m[3]}/${m[2]}/${m[1]}` : (f || fechaHoy);
    })();

    // Hora del hecho si viene; si no, hora actual
    const horaHechoRaw = String(root['Hora del hecho'] || '').trim();
    const horaES = /^\d{1,2}:\d{2}$/.test(horaHechoRaw)
      ? horaHechoRaw
      : (horaHechoRaw ? horaHechoRaw.padStart(5,'0') : horaAhora);

    // Municipio del hecho (capitaliza) y C.P. Agentes
    const muniDet = (principal && (principal['municipio-hecho'] || principal['Municipio del hecho'])) || '';
    const MunicipioHechoRaw = (root['municipio-hecho'] || root['Municipio del hecho'] || muniDet || '').toString().trim() || 'Arona';
    const MunicipioHecho = MunicipioHechoRaw.charAt(0).toUpperCase() + MunicipioHechoRaw.slice(1).toLowerCase();
    const CPAgentes = (root['C.P. Agentes'] || root['Agentes'] || principal['C.P. Agentes'] || '').toString().trim();

    // ==== Construir bloques de identificación (uno por detenido) ====
    const bloques = (detenidos.length ? detenidos : [principal]).map(p => {
      const esF = /^f/i.test(String(p?.Sexo || ''));
      const suf = esF ? 'a' : 'o';
      const Nombre          = (p['Nombre'] || '').trim();
      const Apellidos       = (p['Apellidos'] || '').trim().toUpperCase();
      const FechaNacimiento = (p['Fecha de nacimiento'] || '').trim();
      const LugarNacimiento = (p['Lugar de nacimiento'] || '').trim();
      const Nacionalidad    = (p['Nacionalidad'] || '').trim();
      const TipoDocumento   = (p['Tipo de documento'] || '').trim();
      const NumeroDocumento = (p['Nº Documento'] || '').trim();
      const NombrePadres    = (p['Nombre de los Padres'] || '').trim();
      const Domicilio       = (p['Domicilio'] || '').trim();
      const Telefono        = (p['Teléfono'] || p['Telefono'] || '').trim();

      // Fecha de nacimiento en formato ES si viene en ISO (YYYY-MM-DD...)
      const fechaNacES = /^\d{4}-\d{2}-\d{2}/.test(FechaNacimiento)
        ? FechaNacimiento.slice(0,10).split('-').reverse().join('/')
        : FechaNacimiento;

      const partes = [];
      const nomFull = `${Nombre} ${Apellidos}`.replace(/\s+/g,' ').trim();
      if (nomFull)          partes.push(`** ${nomFull}`);
      if (FechaNacimiento)  partes.push(`nacid${suf} el día ${fechaNacES}`);
      if (LugarNacimiento)  partes.push(`en ${LugarNacimiento}`);
      if (Nacionalidad)     partes.push(`país de nacionalidad ${Nacionalidad}`);
      const docBlock = [TipoDocumento, NumeroDocumento].filter(Boolean).join(' ');
      if (docBlock)         partes.push(`con ${docBlock}`);
      if (NombrePadres)     partes.push(`hij${suf} de ${NombrePadres}`);
      if (Domicilio)        partes.push(`con domicilio en ${Domicilio}`);
      if (Telefono)         partes.push(`y teléfono ${Telefono}`);
      return partes.join(', ') + (partes.length ? ',' : '');
    });

    // Texto final (incluye a todos los detenidos listados)
        const fraseCP = CPAgentes ? `, con números de carné profesionales ${CPAgentes},` : '';
        const lista = bloques.length ? bloques.join("\n\n") : '** (SIN DATOS DE DETENIDOS EN EL EXPEDIENTE ACTUAL)';

        // Concordancia "detenido/detenida/detenidos/detenidas" según número y sexo
        const totalDet = detenidos.length || (esDet(principal) ? 1 : 0);
        const manyDet  = totalDet > 1;
        const refSexo  = (detenidos[0] || principal || {});
        const esFDet   = /^f/i.test(String(refSexo.Sexo || refSexo.sexo || ''));

        let palabraDet;
        if (manyDet) {
          const allFem = detenidos.length && detenidos.every(p =>
            /^f/i.test(String(p.Sexo || p.sexo || ''))
          );
          palabraDet = allFem ? 'detenidas' : 'detenidos';
        } else {
          palabraDet = esFDet ? 'detenida' : 'detenido';
        }

        out = `DILIGENCIA INICIAL.- Se extiende la presente para hacer constar que, siendo las ${horaES} horas del día ${fechaES}, se personan en estas dependencias los agentes de la Policía Local de ${MunicipioHecho}${fraseCP} quienes PRESENTAN EN CALIDAD DE ${palabraDet.toUpperCase()} A:\n\n` +
               lista + "\n\n" +
          `-- HACEN ENTREGA DE:\n` +
          `** UN ATESTADO con número de registro <mark class="pickHL">(ATESTADO P.L.)</mark>, instruido en las dependencias de la Jefatura de la Policía Local de ${MunicipioHecho}.\n\n` +
          `-- MANIFIESTAN:\n` +
          `-- Que estos derivan de una intervención policial, llevada a cabo por los agentes comparecientes, la cual queda perfectamente detallada en el Atestado que se adjunta al cuerpo de las presentes. CONSTE Y CERTIFICO.`;
  } catch(_) { /* mantener plantilla base en caso de error */ }
}


    // === NUEVO: Citaciones por filiación NO detenida (JRD/JIDL y telefónica) ===
    if (id === 'citacion_jrd' || id === 'citacion_jidl' || id === 'citacion_tlf_jrd' || id === 'citacion_tlf_jidl') {
      const nombreP = noStrayS(norm(meta?.nombre || ''));
      const rawSexo = String(meta?.sexo || '').trim();
      let esPF = /^f/i.test(rawSexo) || /mujer|female|femenin|^f$/i.test(rawSexo);
      const rolPRaw = String(meta?.rol || '').trim();
      const rolP    = noStrayS(norm(rolPRaw)) || 'compareciente';
      if (rawSexo === '' && rolPRaw) {
        const r = rolPRaw.toLowerCase();
        if (/\bvíctima\b/.test(r) || /\bperjudicada\b/.test(r) || /\btestiga\b/.test(r)) esPF = true;
        else if (/\bperjudicado\b/.test(r) || /\btestigo\b/.test(r)) esPF = false;
      }

      // Normaliza encabezado para el detector (verde)
      out = out.replace(/DILIGENCIA DE CITACIÓN(?: TELEF[ÓO]NICA)?(?:\s*\(?.*?\)?)?\.-/i, 
        (id==='citacion_tlf_jrd'||id==='citacion_tlf_jidl')
          ? ((id==='citacion_tlf_jrd')  ? 'DILIGENCIA DE CITACIÓN TELEFÓNICA JRD.-'  : 'DILIGENCIA DE CITACIÓN TELEFÓNICA JIDL.-')
          : ((id==='citacion_jrd')       ? 'DILIGENCIA DE CITACIÓN JRD.-'            : 'DILIGENCIA DE CITACIÓN JIDL.-')
      );

      // Nombre + concordancias (aplicar género ANTES de sustituir el nombre para no perder el patrón)
      const artLlam = esPF ? 'a la llamada' : 'al llamado';
      // Reemplazo robusto de "al/la llamado/a", "al llamado/a", "a la llamado/a", y "al/la llamad@" (por si acaso)
      const patt  = /\b(?:al\/la|al|a la)\s+llamad(?:o|a)\/a\b/gi; // "al/la llamado/a" o "al llamado/a" o "a la llamado/a"
      const patt2 = /\b(?:al\/la|al|a la)\s+llamad@\b/gi;            // "al/la llamad@" (por si acaso)
      out = out.replace(patt, artLlam).replace(patt2, artLlam);

      if (nombreP) {
        out = out.replace(/\[NOMBRE_FILIACION\]/ig, nombreP);
      }

      // Variante telefónica: "ser citad@" → "ser citada/o"
      if (id === 'citacion_tlf_jrd' || id === 'citacion_tlf_jidl') {
        out = out.replace(/ser citad@/i, `ser citad${esPF ? 'a' : 'o'}`);
      }

      if (rolP) out = out.replace(/\[CONDICION_FILIACION\]/ig, rolP.toLowerCase());
    }
    // === Personación víctima: por filiación NO detenida ===
    if (id === 'personacion_victima') {
      // Sustituir nombre de la filiación
      const nombreP = noStrayS(norm(meta?.nombre || ''));
      if (nombreP) {
        out = out.replace(/\[NOMBRE_FILIACION\]/ig, nombreP);
      }
    }
    // Limpieza básica
    out = out.replace(/,\s*,/g, ", ").replace(/ {2,}/g, " ");
    out = contraerAl(out);
    out = contraerDel(out);

  return out;
  }
  
  // Expansión para la barra lateral
  function expandItems(groups) {
    const src = Array.isArray(groups) ? groups : [];
    return src.map(gr => {
      const title = (gr && (gr.name ?? gr.title ?? gr.titulo)) || "";
      const items = Array.isArray(gr.items) ? gr.items : [];
      const mapped = [];
      items.forEach(it => {
        const id = it.id;
        let corto = it.corto || "—";
        if (id === "personacion_letrado") corto = "Toma de declaración";
                // ——— NUEVO: citaciones por filiación NO detenida ———
        const NONDET = new Set(["citacion_jrd","citacion_jidl","citacion_tlf_jrd","citacion_tlf_jidl","personacion_victima","toma_y_ofrecimiento"]);
        if (NONDET.has(id)) {
          let otros = [];

          // 1) Preferir el contexto ya ingerido (todas las filiaciones) PERO solo no detenidos
          if (Array.isArray(ctxRaiz.personas) && ctxRaiz.personas.length) {
            otros = ctxRaiz.personas
              .filter(p => !/detenid[oa]/i.test(String(p.condicion || '')))
              .map(p => ({
                nombreCompleto: p.nombreCompleto || '',
                sexo: p.sexo || '',
                condicion: p.condicion || ''
              }));
          } else {
            // 2) Fallback: leer de localStorage como antes
            try{
              const raw = localStorage.getItem('expedienteGuardado') || localStorage.getItem('proyecto') || localStorage.getItem('expedienteOriginal') || '';
              const exp = raw ? JSON.parse(raw) : {};
              const root = (exp && exp.expediente && (Array.isArray(exp.expediente.filiaciones) || Object.keys(exp.expediente).length)) ? exp.expediente : exp;
              const fil = Array.isArray(root?.filiaciones) ? root.filiaciones : [];
              const rol = p => String(p?.['Condición']||p?.['Condicion']||p?.['Rol']||p?.rol||'').trim();
              const isDet = p => /detenid[oa]/i.test(rol(p));
              const toTitle = s => String(s||'').toLowerCase().replace(/\b([a-záéíóúñü])/gi,(m,c)=>c.toUpperCase());
              otros = fil.filter(p=>!isDet(p)).map(p=>{
                const nom = toTitle(p?.Nombre||'');
                const ape = String(p?.Apellidos||'').toUpperCase();
                const nombreCompleto = `${nom} ${ape}`.replace(/\s+/g,' ').trim();
                return { 
                  nombreCompleto,
                  sexo: p?.Sexo || '',
                  condicion: rol(p) || ''
                };
              });
            }catch(_){ otros=[]; }
          }

          if (!otros.length) {
            mapped.push({ ...it, corto: `${corto} — (sin filiación aplicable)`, __meta: { type: "fil", filIndex: null, nombre: "", sexo:"", rol:"" } });
          } else {
            otros.forEach((p, i) => {
              const full = noStrayS(norm(p?.nombreCompleto || `Persona ${i + 1}`));
              // Nombre + inicial del 1er apellido
              let display = full;
              if (full && !/^Persona\s+\d+$/i.test(full)) {
                const parts = full.split(/\s+/);
                if (parts.length >= 2) {
                  const nombre   = parts[0];
                  const ape1word = (parts.length >= 3) ? parts[parts.length - 2] : parts[1];
                  const inicial  = (ape1word && ape1word[0]) ? (ape1word[0].toUpperCase() + '.') : '';
                  display = `${nombre} ${inicial}`.trim();
                }
              }
              mapped.push({ 
                ...it, 
                corto: `${corto} : ${display}`, 
                __meta: { type: "fil", filIndex: i, nombre: p.nombreCompleto, sexo: p.sexo, rol: p.condicion }
              });
            });
          }
          return; // saltamos a siguiente item (ya mapeado)
        }       
        if (ALWAYS_GLOBAL.has(id) || GLOBAL_MULTI.has(id)) {
          mapped.push({ ...it, corto, __meta: { type: "global" } });
        } else {
          const arr = ctxRaiz.detenidos || [];
          if (!arr.length) {
            mapped.push({ ...it, corto: `${corto} — (sin detenido)`, __meta: { type: "det", detIndex: null } });
          } else {
                      arr.forEach((d, i) => {
  // Omitir para españoles: Consulado y Situación Administrativa no aplican
  if ((id === 'comunicacion_consulado' || id === 'situacion_administrativa') && isSpainNationality(d?.nacionalidad)) {
    return; // saltar este item para este detenido
  }

  const full = noStrayS(norm(d?.nombreCompleto || `Detenido ${i + 1}`));

  // Formato sidebar: "Nombre" + inicial del 1er apellido + "."
  // Heurística: si hay ≥3 palabras, tomamos el penúltimo token como 1er apellido.
  let display = full;
  if (full && !/^Detenido\s+\d+$/i.test(full)) {
    const parts = full.split(/\s+/);
    if (parts.length >= 2) {
      const nombre   = parts[0];
      const ape1word = (parts.length >= 3) ? parts[parts.length - 2] : parts[1];
      const inicial  = (ape1word && ape1word[0]) ? (ape1word[0].toUpperCase() + '.') : '';
      display = `${nombre} ${inicial}`.trim();
    }
  }

  mapped.push({ ...it, corto: `${corto} : ${display}`, __meta: { type: "det", detIndex: i } });
});

          }
        }
      });
      return { name: title, items: mapped };
    });
  }

  window.diligencias_expandItems = expandItems;
  window.diligencias_renderHTML = renderHTML;
})();
