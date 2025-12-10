// js/remisionguardado.js
// Inserta la diligencia "Remisión" (única/común) y garantiza guardado en localStorage al salir/guardar.
(function(){
  // --- Utils ---
  const norm = s => String(s||"").trim();
  const sexF = s => /^f/i.test(String(s||""));
  const toTitle = s => String(s||'').toLowerCase().replace(/\b([a-záéíóúñü])/gi, (_,c)=>c.toUpperCase());
  const noStrayS = s => String(s||"")
    .replace(/,\s*,/g, ", ")
    .replace(/[ \t]{2,}/g, " "); // no colapsar \n

  // Detenidos desde raíz, Expediente ODAC o localStorage (gestor / proyecto)
  function getDetenidos(){
    // 1) Contexto ya ingestado por diligencias_ingestarExpediente (ctxRaiz)
    try{
      if (Array.isArray(window.ctxRaiz?.detenidos) && window.ctxRaiz.detenidos.length){
        return window.ctxRaiz.detenidos;
      }
    }catch(_){}

    // 2) Estado vivo del Expediente ODAC (mismo patrón que getDetenidosExp en diligencias.html)
    try{
      if (window.Expediente && typeof window.Expediente.getState === 'function'){
        const st = window.Expediente.getState();
        const fil = Array.isArray(st?.filiaciones) ? st.filiaciones : [];
        if (fil.length){
          const isDet = p => /detenid[oa]/i.test(String(p?.['Condición']||p?.['Condicion']||''));
          const toTitle = s => String(s||'').toLowerCase().replace(/\b([a-záéíóúñü])/gi,(_,c)=>c.toUpperCase());
          return fil.filter(isDet).map(p=>{
            const nom = toTitle(p?.Nombre||'');
            const ape = String(p?.Apellidos||'').toUpperCase();
            return {
              nombreCompleto: `${nom} ${ape}`.replace(/\s+/g,' ').trim(),
              sexo: String(p?.Sexo||'')
            };
          });
        }
      }
    }catch(_){}

    // 3) Snapshot gestor_partes_comparecencias_pc_v3 (ODAC)
    try{
      const rawGestor = localStorage.getItem('gestor_partes_comparecencias_pc_v3');
      if (rawGestor){
        const expG = JSON.parse(rawGestor);
        const root = (expG && (expG.expediente || expG)) || null;
        const fil  = Array.isArray(root?.filiaciones) ? root.filiaciones : [];
        if (fil.length){
          const isDet = p => /detenid[oa]/i.test(String(p?.['Condición']||p?.['Condicion']||''));
          const toTitle = s => String(s||'').toLowerCase().replace(/\b([a-záéíóúñü])/gi,(_,c)=>c.toUpperCase());
          return fil.filter(isDet).map(p=>{
            const nom = toTitle(p?.Nombre||'');
            const ape = String(p?.Apellidos||'').toUpperCase();
            return {
              nombreCompleto: `${nom} ${ape}`.replace(/\s+/g,' ').trim(),
              sexo: String(p?.Sexo||'')
            };
          });
        }
      }
    }catch(_){}

    // 4) Fallback antiguo: proyecto / expedienteGuardado clásicos
    try{
      const raw = localStorage.getItem('proyecto') || localStorage.getItem('expedienteGuardado') || '';
      const exp = raw ? JSON.parse(raw) : null;
      const fil = Array.isArray(exp?.filiaciones) ? exp.filiaciones : [];
      const isDet = p => /detenid[oa]/i.test(String(p?.['Condición']||p?.['Condicion']||''));
      const toTitle = s => String(s||'').toLowerCase().replace(/\b([a-záéíóúñü])/gi,(_,c)=>c.toUpperCase());
      return fil.filter(isDet).map(p=>{
        const nom = toTitle(p?.Nombre||'');
        const ape = String(p?.Apellidos||'').toUpperCase();
        return {
          nombreCompleto: `${nom} ${ape}`.replace(/\s+/g,' ').trim(),
          sexo: String(p?.Sexo||'')
        };
      });
    }catch(_){}
    return [];
  }

  function pick(...vals){ for(const v of vals){ if(v!=null && String(v).trim()!=='') return String(v).trim(); } return ''; }

  function getJuzgadoData(){
    // 1) Preferir SIEMPRE los campos del sidebar de DOCUMENTOS (docJuzgado / docFechaProc / docHoraProc)
    try{
      const inpJuz   = document.getElementById('docJuzgado');
      const inpFecha = document.getElementById('docFechaProc');
      const inpHora  = document.getElementById('docHoraProc');
      let jVal   = inpJuz   ? String(inpJuz.value||'').trim()   : '';
      let fVal   = inpFecha ? String(inpFecha.value||'').trim() : '';
      let hVal   = inpHora  ? String(inpHora.value||'').trim()  : '';

      if (jVal || fVal || hVal){
        // Normalizar fecha YYYY-MM-DD → DD/MM/YYYY
        if (fVal && /^\d{4}-\d{2}-\d{2}$/.test(fVal)){
          const [y,m,d] = fVal.split('-');
          fVal = `${d}/${m}/${y}`;
        }
        // Normalizar hora a HH:MM
        if (hVal && /^\d{1,2}$/.test(hVal)) hVal = hVal.padStart(2,'0')+':00';
        if (hVal && /^\d{1,2}:$/.test(hVal)) hVal = hVal+'00';
        if (hVal && /^\d{1,2}:\d$/.test(hVal)) hVal = hVal.replace(/:(\d)$/,':$10');
        return { fecha: fVal, hora: hVal };
      }
    }catch(_){}

    // 2) Snapshot ODAC del gestor (misma filosofía que diligencias_rules.js para señalamientos)
    try{
      const rawGestor = localStorage.getItem('gestor_partes_comparecencias_pc_v3');
      if (rawGestor){
        const expG = JSON.parse(rawGestor);
        const root = (expG && (expG.expediente || expG)) || null;
        if (root){
          const JUZ = root.Juzgado || root.juzgado || root.docMeta?.juzgado || {};
          let fecha = pick(
            JUZ.Fecha, JUZ.fecha,
            root['Fecha de procedimiento'], root['FECHA_PROCEDIMIENTO'], root.fechaProcedimiento,
            root.docMeta?.fechaProcedimiento
          );
          let hora  = pick(
            JUZ.Hora, JUZ.hora,
            root['Hora de procedimiento'],  root['HORA_PROCEDIMIENTO'],  root.horaProcedimiento,
            root.docMeta?.horaProcedimiento
          );
          // Normalización
          if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)){
            const [y,m,d] = fecha.split('-');
            fecha = `${d}/${m}/${y}`;
          }
          if (hora && /^\d{1,2}$/.test(hora)) hora = hora.padStart(2,'0')+':00';
          if (hora && /^\d{1,2}:$/.test(hora)) hora = hora+'00';
          if (hora && /^\d{1,2}:\d$/.test(hora)) hora = hora.replace(/:(\d)$/,':$10');
          if (fecha || hora) return { fecha, hora };
        }
      }
    }catch(_){}

    // 3) Fallback clásico: expedienteGuardado / proyecto / expedienteOriginal
    try{
      const raw = localStorage.getItem("expedienteGuardado")
                || localStorage.getItem("proyecto")
                || localStorage.getItem("expedienteOriginal")
                || "";
      const exp = raw ? JSON.parse(raw) : {};
      const root = (exp && exp.expediente && (Array.isArray(exp.expediente.filiaciones) || Object.keys(exp.expediente).length)) ? exp.expediente : exp;
      const JUZ  = (root && root.Juzgado) ? root.Juzgado : {};
      let fecha = pick(JUZ.Fecha, root['Fecha de procedimiento'], root['FECHA_PROCEDIMIENTO'], document.getElementById('fechaProcedimiento')?.value);
      let hora  = pick(JUZ.Hora,  root['Hora de procedimiento'],  root['HORA_PROCEDIMIENTO'],  document.getElementById('horaProcedimiento')?.value);
      if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)){
        const [y,m,d] = fecha.split('-');
        fecha = `${d}/${m}/${y}`;
      }
      if (hora && /^\d{1,2}$/.test(hora)) hora = hora.padStart(2,'0')+':00';
      if (hora && /^\d{1,2}:$/.test(hora)) hora = hora+'00';
      if (hora && /^\d{1,2}:\d$/.test(hora)) hora = hora.replace(/:(\d)$/,':$10');
      return { fecha, hora };
    }catch(_){}

    return { fecha:'', hora:'' };
  }

  const editorText = ()=> String(document.getElementById('editor')?.innerText||'');

  // Construye el texto “Remisión” sin **/**_ marcas para ODT
  function buildRemision(){
    const dets = getDetenidos();
    const n = dets.length;

    // Encabezado + primer párrafo (sin negrita/itálica)
    let head = 'DILIGENCIA DE REMISIÓN.-';
    let p1 = '';
    if (n === 1){
      const d = dets[0]||{};
      const esF = sexF(d.sexo);
      const nombre = norm(d.nombreCompleto||'');
      p1 = `${esF?'La detenida':'El detenido'} ${nombre} pasará a disposición de ese Juzgado en la próxima conducción disponible.`;
    } else if (n > 1){
      const nombres = dets.map(d=>norm(d.nombreCompleto||'')).filter(Boolean).join(' y ');
      const allF = dets.every(d=>sexF(d.sexo));
      const art = allF ? 'Las' : 'Los';
      const llam= allF ? 'llamadas' : 'llamados';
      p1 = `${art} ${llam} ${nombres} pasarán a disposición de ese Juzgado en la próxima conducción disponible.`;
    } else {
      p1 = `Se remiten las presentes diligencias al Juzgado competente.`;
    }

    // Señalamiento (si procede) — versión simple y exacta
    const edTxt = editorText();
    const hayJRD  = /DILIGENCIA DE SEÑALAMIENTO JRD/i.test(edTxt);
    const hayJIDL = /DILIGENCIA DE SEÑALAMIENTO JIDL/i.test(edTxt);
    let p2 = '';
    if (hayJRD || hayJIDL){
      const {fecha, hora} = getJuzgadoData();
      const via = hayJRD ? 'J.R.D.' : 'J.I.D.L.';
      const fechaTxt = fecha ? fecha : '';
      const horaTxt  = hora  ? hora  : '';
      if (fechaTxt || horaTxt){
        p2 = `*Se significa que las presentes se tramitan vía ${via} quedando fijada fecha de celebración para el día ${fechaTxt} a las ${horaTxt} horas.`;
      } else {
        p2 = `*Se significa que las presentes se tramitan vía ${via}.`;
      }
    }

    // Adjuntos
    const lines = [];
    lines.push('– Se adjuntan los siguientes documentos:');
    lines.push('');

    if (n === 1){
      const esF = sexF(dets[0]?.sexo);
      lines.push(`- Un (1) acta de Información de derechos a nombre ${esF?'de la detenida':'del detenido'}.`);
      lines.push(`- Un (1) acta de declaración a nombre ${esF?'de la detenida':'del detenido'}.`);
      if (/DILIGENCIA DE SITUACI[ÓO]N ADMINISTRATIVA/i.test(edTxt)){
        lines.push(`- Un (1) certificado de situación en España a nombre ${esF?'de la detenida':'del detenido'}.`);
      }
      lines.push(`- Dos (2) impresos de identificación ${esF?'de la detenida':'del detenido'}.`);
    } else if (n>1){
      const haySit = /DILIGENCIA DE SITUACI[ÓO]N ADMINISTRATIVA/i.test(edTxt);
      const hasName = (name)=>{
        if (!name) return false;
        const esc = name.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&');
        return new RegExp(`\\b${esc}\\b`, 'i').test(edTxt);
      };
      dets.forEach(d=>{
        const nom = norm(d.nombreCompleto||''); if(!nom) return;
        lines.push(`- Un (1) acta de Información de derechos a nombre de ${nom}.`);
        lines.push(`- Un (1) acta de declaración a nombre de ${nom}.`);
        // Situación administrativa SOLO si existe la diligencia y aparece el nombre concreto en el editor
        if (haySit && hasName(nom)) {
          lines.push(`- Un (1) certificado de situación en España a nombre de ${nom}.`);
        }
        lines.push(`- Dos (2) impresos de identificación a nombre de ${nom}.`);
        lines.push(''); // separador
      });
    }

    // Filiaciones no detenidas
    try{
      let root = null;
      // 1) Preferir snapshot ODAC del gestor
      try{
        const rawGestor = localStorage.getItem('gestor_partes_comparecencias_pc_v3');
        if (rawGestor){
          const expG = JSON.parse(rawGestor);
          root = (expG && (expG.expediente || expG)) || null;
        }
      }catch(_){ root = null; }

      // 2) Fallback: expedienteGuardado / proyecto / expedienteOriginal clásicos
      if (!root){
        const raw = localStorage.getItem('expedienteGuardado')
                 || localStorage.getItem('proyecto')
                 || localStorage.getItem('expedienteOriginal')
                 || '';
        const exp = raw ? JSON.parse(raw) : {};
        root = (exp && exp.expediente && (Array.isArray(exp.expediente.filiaciones) || Object.keys(exp.expediente).length))
          ? exp.expediente
          : exp;
      }

      const fil = Array.isArray(root?.filiaciones) ? root.filiaciones : [];
      const rol = p => String(p?.['Condición']||p?.['Condicion']||p?.['Rol']||p?.rol||'').trim();
      const isDet = p => /detenid[oa]/i.test(rol(p));
      const otros = fil.filter(p=>!isDet(p)).map(p=>{
        const nom = toTitle(p?.Nombre||'');
        const ape = String(p?.Apellidos||'').toUpperCase();
        return `${nom} ${ape}`.replace(/\s+/g,' ').trim();
      }).filter(Boolean);
      if (otros.length) lines.push('');
      const viaTxt = hayJRD ? 'JRD' : (hayJIDL ? 'JIDL' : '');
      otros.forEach(nombre=>{
        lines.push(`- Un (1) acta de Ofrecimiento de acciones a nombre de ${nombre}.`);
        lines.push(`- Un (1) acta de declaración a nombre de ${nombre}.`);
        if (viaTxt) lines.push(`- Una (1) cédula de citación para ${viaTxt} a nombre de ${nombre}.`);
      });
    }catch(_){}

    // VPR
    if (/VALORACI[ÓO]N POLICIAL DE RIESGO/i.test(edTxt)){
      lines.push(`- Un (1) informe de valoración policial del riesgo con resultado.`);
    }
    // Inicial P.L.
    if (/DILIGENCIA INICIAL\b|\(P\.L\.\)/i.test(edTxt)){
      lines.push(`- Una (1) copia de Atestado de Policía Local.`);
    }

    // ADN negativa
    let adnNeg = '';
    if (/DILIGENCIA DE TOMA DE MUESTRA BIOL[ÓO]GICA INDUBITADA DE ADN/i.test(edTxt)){
      adnNeg = `\n--Se informa de que la persona detenida no ha prestado su consentimiento para la recogida de muestra indubitada mediante frotis bucal, conforme a las previsiones de la Ley Orgánica 10/2007, de 8 de octubre, reguladora de la base de datos policial sobre identificadores obtenidos a partir del ADN. Atendiendo a las características del delito investigado, se solicita que, conforme a lo dispuesto en el artículo 363 de la LECrim, se autorice la toma de muestra biológica de la persona detenida y que el perfil de ADN que se obtenga sea incorporado a la base de datos mencionada, dado que el mismo puede ser fundamental para la investigación judicial y policial, sirviendo además para la prevención o resolución de otros hechos. Dicho perfil sólo podrá ser revelador de la identidad y del sexo, pero en ningún caso será de naturaleza codificante que permita revelar cualquier otro dato o característica genética. Se solicita que dicha toma sea llevada a cabo por especialistas de Policía Científica.`;
    }

    const parts = [head, p1, p2, lines.join('\n'), adnNeg].filter(Boolean);
    let out = noStrayS(parts.join('\n\n')).replace(/\n{3,}/g, '\n\n');
    return out;
  }


  // Envuelve renderHTML para capturar "remision" sin tocar rules.js
  function wrapRender(){
    const prev = window.diligencias_renderHTML;
    if (typeof prev !== 'function') return;
    if (prev.__wrappedRemision) return;
    const fn = function(itemBase, meta){
      if (itemBase && itemBase.id === 'remision'){
        try{
          const txt = buildRemision();
          if (txt && String(txt).trim()) return txt;
        }catch(e){
          console.error('[remisionguardado] Error en buildRemision:', e);
        }
        // Fallback: usar el render original (texto neutro de DILIGENCIAS_DATA)
        return prev(itemBase, meta);
      }
      return prev(itemBase, meta);
    };
    fn.__wrappedRemision = true;
    window.diligencias_renderHTML = fn;
  }

  // Envuelve diligencias_expandItems para que "remision" sea siempre única (global)
  function wrapExpand(){
    const prev = window.diligencias_expandItems;
    if (typeof prev !== 'function') return;
    if (prev.__wrappedRemisionOnce) return;
    const fn = function(base){
      const out = prev(base) || [];
      // Recorre grupos e items y fuerza "remision" a ser única y global
      out.forEach(gr=>{
        if (!Array.isArray(gr.items)) return;
        let seen = false;
        gr.items = gr.items.filter(it=>{
          if (!it || it.id !== 'remision') return true;
          if (seen) return false;      // elimina duplicados
          // primera vez: limpiar metadatos nominativos (si los hubiera)
          if (it.__meta) delete it.__meta;
          if (it._meta) delete it._meta;
          seen = true;
          return true;
        });
      });
      return out;
    };
    fn.__wrappedRemisionOnce = true;
    window.diligencias_expandItems = fn;
  }

  // Guardado robusto
  function persistEditor(){
    try{
      const editor = document.getElementById('editor');
      if (!editor) return;
      const html = editor.innerHTML;
      const KEY_A='expedienteGuardado', KEY_B='proyecto', KEY_C='expedienteAbierto';
      const raw = localStorage.getItem(KEY_A) || localStorage.getItem(KEY_B) || '{}';
      const exp = raw ? JSON.parse(raw) : {};
      exp.diligenciasHtml = html;
      localStorage.setItem(KEY_A, JSON.stringify(exp));
      localStorage.setItem(KEY_B, JSON.stringify(exp));
      localStorage.setItem(KEY_C, 'true');
    }catch(_){}
  }
  function bindPersistence(){
    window.addEventListener('beforeunload', persistEditor, {capture:true});
    document.addEventListener('visibilitychange', ()=>{ if (document.visibilityState==='hidden') persistEditor(); });
    // Botones "Guardar"
    const hookSaves = ()=>{
      Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'))
        .filter(el=>{
          const t=(el.textContent||el.value||'').toLowerCase();
          return /\bguardar\b/.test(t) || el.id==='btnGuardar' || el.name==='btnGuardar';
        })
        .forEach(el=>{
          if (!el.dataset._bindSave){
            el.dataset._bindSave='1';
            el.addEventListener('click', ()=>setTimeout(persistEditor, 0), {passive:true});
          }
        });
    };
    hookSaves();
    // Rehook tras cualquier click (por si se inyectan botones luego)
    window.addEventListener('click', ()=>{ setTimeout(hookSaves,0); setTimeout(persistEditor,0); }, {passive:true});
    window.addEventListener('expedienteUpdated', ()=>{ setTimeout(persistEditor,0); });
  }


  function init(){
    wrapExpand();   // evita expansión por detenido (una sola Remisión)
    wrapRender();
    bindPersistence();
  }
  if (document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init, {once:true}); } else { init(); }
})();