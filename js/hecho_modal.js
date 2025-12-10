// js/hecho_modal.js
(function hechoModal(){
  document.addEventListener('DOMContentLoaded', () => {
    const trigger = document.getElementById('openHechoModalBtn');
    if (!trigger) return;

    let currentCoords = null;
    let detenidoLoaded = false;
    let detenidosList = [];
    let detCountLabel = null;

    // refs a inputs (se rellenan tras crear el modal)
    let inpDil, inpDelitoDet, inpNombre, inpApellidos, inpNac, inpFechaHDet, inpHoraHDet, inpViaHDet;
    let inpDelitoManual, inpFechaManual, inpHoraManual;
    let coordsLabel;

    // ==== construir modal en DOM ====
    const overlay = document.createElement('div');
    overlay.id = 'hechoModalOverlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.55)';
    overlay.style.zIndex = '9999';
    overlay.style.display = 'none';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';

    overlay.innerHTML = `
     <style>
       #hechoModalCard .hechoBtn{
         position:relative;
         border-radius:999px;
         padding:8px 14px;
         font-weight:800;
         letter-spacing:.03em;
         border:1px solid rgba(148,163,184,0.75);
         background:rgba(15,23,42,0.2);
         color:#e5e7eb;
         cursor:pointer;
         backdrop-filter:blur(10px) saturate(150%);
         box-shadow:none; /* sin halo en inactivo */
         transition:
           transform .14s ease,
           box-shadow .18s ease,
           background .18s ease,
           border-color .18s ease;
       }
       #hechoModalCard .hechoBtn:hover{
         transform:translateY(-1px);
         background:rgba(15,23,42,0.45);
       }
       #hechoModalCard .hechoBtn:active{
         transform:translateY(0);
       }

       #hechoModalCard .hechoBtn-accent{
         border-color:rgba(56,189,248,0.9);
         color:#ecfeff;
       }

       #hechoModalCard .hechoBtn-warn{
         border-color:rgba(251,191,36,0.95);
         color:#fefce8;
       }

       #hechoModalCard .hechoBtn-danger{
         border-color:rgba(248,113,113,0.95);
         color:#fee2e2;
       }

       #hechoModalCard .hechoBtn-ghost{
         border-color:rgba(148,163,184,0.9);
         color:#e5e7eb;
       }

       #hechoModalCard .hechoBtn-accent:hover,
       #hechoModalCard .hechoBtn-accent:active{
         box-shadow:
           0 0 0 1px rgba(8,47,73,0.95),
           0 0 20px rgba(56,189,248,0.9),
           0 0 48px rgba(59,130,246,0.75);
       }

       #hechoModalCard .hechoBtn-warn:hover,
       #hechoModalCard .hechoBtn-warn:active{
         box-shadow:
           0 0 0 1px rgba(120,53,15,0.9),
           0 0 20px rgba(251,191,36,0.9),
           0 0 46px rgba(234,179,8,0.7);
       }

       #hechoModalCard .hechoBtn-danger:hover,
       #hechoModalCard .hechoBtn-danger:active{
         box-shadow:
           0 0 0 1px rgba(127,29,29,0.95),
           0 0 20px rgba(248,113,113,0.9),
           0 0 46px rgba(248,113,113,0.8);
       }

       #hechoModalCard .hechoBtn-ghost:hover,
       #hechoModalCard .hechoBtn-ghost:active{
         box-shadow:
           0 0 0 1px rgba(15,23,42,0.95),
           0 0 16px rgba(148,163,184,0.7),
           0 0 36px rgba(148,163,184,0.55);
       }

       /* nuevo: verde para Ubicar hecho */
       #hechoModalCard .hechoBtn-success{
         border-color:rgba(34,197,94,0.95);
         color:#dcfce7;
       }
       #hechoModalCard .hechoBtn-success:hover,
       #hechoModalCard .hechoBtn-success:active{
         box-shadow:
           0 0 0 1px rgba(22,101,52,0.95),
           0 0 20px rgba(34,197,94,0.9),
           0 0 46px rgba(22,163,74,0.8);
       }
     </style>
     <div id="hechoModalCard" style="
        width:min(840px, 96vw);
        max-height: 90vh;
        overflow:auto;
        background:linear-gradient(145deg,#020617 0%, #02170bff 35%, #023818ff 100%);
        border-radius:14px;
        border:1px solid rgba(148,163,184,.45);
        box-shadow:0 18px 40px rgba(0,0,0,.7);
        color:#e5e7eb;
        padding:16px 18px 14px;
      ">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
          <div>
            <div style="font-size:18px; font-weight:800;">Hecho en mapa</div>
          </div>
          <button type="button" id="hechoCloseBtn" class="hechoBtn hechoBtn-ghost" style="padding:4px 10px; font-size:16px;">×</button>
        </div>

        <!-- BLOQUE DETENIDO -->
        <section style="margin-bottom:12px; padding:10px; border-radius:10px; background:linear-gradient(145deg,#023818ff 0%, #02170bff 35%, #020617 100%); border:1px solid #1f2937;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px;">
            <div>
              <strong>Datos desde detenido (JSON)</strong>
              <div id="hechoDetCount" style="font-size:11px; opacity:.75; margin-top:2px;"></div>
            </div>
            <div>
              <button type="button" id="hechoImportBtn" class="hechoBtn hechoBtn-accent">📥 Importar detenido</button>
              <input type="file" id="hechoImportInput" accept="application/json,.json" style="display:none;">
            </div>
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:8px; font-size:13px;">
            <div>
              <label style="font-size:11px; opacity:.8;">Diligencias</label>
              <input id="hechoDil" type="text" style="width:100%; padding:6px 8px; border-radius:8px; border:1px solid #374151; background:#020617; color:#e5e7eb;">
            </div>
            <div>
              <label style="font-size:11px; opacity:.8;">Delito</label>
              <input id="hechoDelitoDet" type="text" style="width:100%; padding:6px 8px; border-radius:8px; border:1px solid #374151; background:#020617; color:#e5e7eb;">
            </div>
            <div>
              <label style="font-size:11px; opacity:.8;">Nombre</label>
              <input id="hechoNombre" type="text" style="width:100%; padding:6px 8px; border-radius:8px; border:1px solid #374151; background:#020617; color:#e5e7eb;">
            </div>
            <div>
              <label style="font-size:11px; opacity:.8;">Apellidos</label>
              <input id="hechoApellidos" type="text" style="width:100%; padding:6px 8px; border-radius:8px; border:1px solid #374151; background:#020617; color:#e5e7eb;">
            </div>
            <div>
              <label style="font-size:11px; opacity:.8;">Nacionalidad</label>
              <input id="hechoNac" type="text" style="width:100%; padding:6px 8px; border-radius:8px; border:1px solid #374151; background:#020617; color:#e5e7eb;">
            </div>
            <div>
              <label style="font-size:11px; opacity:.8;">Fecha del hecho</label>
              <input id="hechoFechaHDet" type="text" placeholder="dd/mm/aaaa" style="width:100%; padding:6px 8px; border-radius:8px; border:1px solid #374151; background:#020617; color:#e5e7eb;">
            </div>
            <div>
              <label style="font-size:11px; opacity:.8;">Hora del hecho</label>
              <input id="hechoHoraHDet" type="text" placeholder="hh:mm" style="width:100%; padding:6px 8px; border-radius:8px; border:1px solid #374151; background:#020617; color:#e5e7eb;">
            </div>
            <div>
              <label style="font-size:11px; opacity:.8;">Vía del hecho</label>
              <input id="hechoViaHDet" type="text" style="width:100%; padding:6px 8px; border-radius:8px; border:1px solid #374151; background:#020617; color:#e5e7eb;">
            </div>
          </div>
        </section>

        <!-- BLOQUE MANUAL -->
        <section style="margin-bottom:12px; padding:10px; border-radius:10px; background:linear-gradient(145deg,#023818ff 0%, #02170bff 35%, #020617 100%); border:1px solid #1f2937;">
          <div style="font-weight:700; margin-bottom:8px;">Datos si no proviene de detenido</div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:8px; font-size:13px;">
            <div>
              <label style="font-size:11px; opacity:.8;">Delito</label>
              <input id="hechoDelitoManual" type="text" list="hechoDelitoList" style="width:100%; padding:6px 8px; border-radius:8px; border:1px solid #374151; background:#020617; color:#e5e7eb;">
            </div>
            <div>
              <label style="font-size:11px; opacity:.8;">Fecha del hecho</label>
              <input id="hechoFechaManual" type="date" placeholder="dd/mm/aaaa" style="width:100%; padding:6px 8px; border-radius:8px; border:1px solid #374151; background:#020617; color:#e5e7eb;">
            </div>
            <div>
              <label style="font-size:11px; opacity:.8;">Hora del hecho</label>
              <input id="hechoHoraManual" type="time" placeholder="hh:mm" style="width:100%; padding:6px 8px; border-radius:8px; border:1px solid #374151; background:#020617; color:#e5e7eb;">
            </div>
          </div>
          <datalist id="hechoDelitoList">
            
            <option value="HURTO"></option>
            <option value="DAÑOS"></option>
            <option value="ESTAFA"></option>
            <option value="ROBO CON VIOLENCIA"></option>
            <option value="ROBO CON FUERZA"></option>
            <option value="ROBO USO DE VEHÍCULO"></option>
            <option value="HURTO USO DE VEHÍCULO"></option>
            <option value="APROPIACIÓN INDEBIDA"></option>
            <option value="LESIONES"></option>
            <option value="HOMICIDIO"></option>
            <option value="AMENAZAS GRAVES"></option>
            <option value="ACOSO"></option>
            <option value="MALOS TRATOS EN EL ÁMBITO FAMILIAR"></option>
            <option value="COACCIONES"></option>
            <option value="ABUSO SEXUAL"></option>
            <option value="AGRESIÓN SEXUAL"></option>
            <option value="VIOLACIÓN"></option>
            <option value="ATENTADO AGENTE AUTORIDAD"></option>
            <option value="RESISTENCIA / DESOBEDIENCIA"></option>
            <option value="CONTRA LA SEGURIDAD VIAL"></option>
            <option value="CONTRA LA SALUD PÚBLICA"></option>
            <option value="TRÁFICO DE DROGAS"></option>
            <option value="FALSEDAD DOCUMENTAL"></option>
            <option value="RECLAMACIÓN JUDICIAL"></option>
            <option value="QUEBRANTAMIENTO DE CONDENA"></option>
            <option value="RIÑA TUMULTUARIA"></option>
            <option value="DETENCIÓN ILEGAL"></option>
            <option value="OMISIÓN DEL DEBER DE SOCORRO"></option>
            <option value="ALLANAMIENTO DE MORADA"></option>
          </datalist>
        </section>

        <!-- BLOQUE COORDENADAS -->
        <section style="margin-bottom:12px; padding:10px; border-radius:10px; background:linear-gradient(145deg,#023818ff 0%, #02170bff 35%, #020617 100%); border:1px solid #1f2937;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
            <div>
              <div style="font-weight:700;">Ubicación del hecho</div>
              <div id="hechoCoordsLabel" style="font-size:12px; opacity:.8; margin-top:2px;">Sin coordenadas seleccionadas.</div>
            </div>
            <button type="button" id="hechoPickCoordsBtn" class="hechoBtn hechoBtn-success">📍 Ubicar hecho</button>
          </div>
        </section>

        <!-- FOOTER -->
        <div style="display:flex; justify-content:space-between; gap:10px; margin-top:6px;">
          <button type="button" id="hechoClearBtn" class="hechoBtn hechoBtn-danger">Limpiar</button>
          <button type="button" id="hechoSaveBtn" class="hechoBtn hechoBtn-warn">💾 Guardar Hecho JSON</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // refs inputs
    inpDil         = overlay.querySelector('#hechoDil');
    inpDelitoDet   = overlay.querySelector('#hechoDelitoDet');
    inpNombre      = overlay.querySelector('#hechoNombre');
    inpApellidos   = overlay.querySelector('#hechoApellidos');
    inpNac         = overlay.querySelector('#hechoNac');
    inpFechaHDet   = overlay.querySelector('#hechoFechaHDet');
    inpHoraHDet    = overlay.querySelector('#hechoHoraHDet');
    inpViaHDet     = overlay.querySelector('#hechoViaHDet');

    inpDelitoManual = overlay.querySelector('#hechoDelitoManual');
    inpFechaManual  = overlay.querySelector('#hechoFechaManual');
    inpHoraManual   = overlay.querySelector('#hechoHoraManual');

    coordsLabel     = overlay.querySelector('#hechoCoordsLabel');
    detCountLabel   = overlay.querySelector('#hechoDetCount');

    const btnClose      = overlay.querySelector('#hechoCloseBtn');
    const btnImport     = overlay.querySelector('#hechoImportBtn');
    const fileImport    = overlay.querySelector('#hechoImportInput');
    const btnPickCoords = overlay.querySelector('#hechoPickCoordsBtn');
    const btnSave       = overlay.querySelector('#hechoSaveBtn');
    const btnClear      = overlay.querySelector('#hechoClearBtn');

    function updateDetCount(){
      if (detCountLabel){
        const n = detenidosList.length;
        detCountLabel.textContent = n ? `Detenidos en este hecho: ${n}` : '';
      }
    }

    function openModal(){
      overlay.style.display = 'flex';
      detenidoLoaded = false;
    }
    function closeModal(){
      overlay.style.display = 'none';
    }
    function clearFields(){
      if (inpDil)         inpDil.value = '';
      if (inpDelitoDet)   inpDelitoDet.value = '';
      if (inpNombre)      inpNombre.value = '';
      if (inpApellidos)   inpApellidos.value = '';
      if (inpNac)         inpNac.value = '';
      if (inpFechaHDet)   inpFechaHDet.value = '';
      if (inpHoraHDet)    inpHoraHDet.value = '';
      if (inpViaHDet)     inpViaHDet.value = '';
      if (inpDelitoManual)inpDelitoManual.value = '';
      if (inpFechaManual) inpFechaManual.value = '';
      if (inpHoraManual)  inpHoraManual.value = '';
      currentCoords = null;
      detenidoLoaded = false;
      detenidosList = [];
      if (coordsLabel) coordsLabel.textContent = 'Sin coordenadas seleccionadas.';
      updateDetCount();
    }

    trigger.addEventListener('click', openModal);
    btnClose.addEventListener('click', closeModal);
    if (btnClear) btnClear.addEventListener('click', clearFields);

    // ==== IMPORTAR JSON DETENIDO ====
    btnImport.addEventListener('click', () => fileImport.click());

    fileImport.addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if(!f){ e.target.value=''; return; }
      try{
        const txt = await f.text();
        const obj = JSON.parse(txt);

        // si viene como proyecto con "filiaciones", cojo la primera
        let src = obj;
        if (Array.isArray(obj.filiaciones) && obj.filiaciones.length){
          src = obj.filiaciones[0];
        }

        // helpers apellidos
        const ap = (
          (src['PRIMER APELLIDO'] || src['Primer apellido'] || '') +
          ' ' +
          (src['SEGUNDO APELLIDO'] || src['Segundo apellido'] || '')
        ).trim() || src['Apellidos'] || src['apellidos'] || '';

        const dils   = src.DILIGENCIAS || src.Diligencias || src['Diligencias'] || '';
        const delito = src.DELITO || src.Delito || src['Delito'] || '';
        const nombre = src.NOMBRE || src.Nombre || src['Nombre'] || '';
        const nac    = src.NACIONALIDAD || src.Nacionalidad || src['Nacionalidad'] || '';

        const fechaGen = src['Fecha de generación'] || src['Fecha_generación'] || src['FechaGeneracion'] || '';
        const fHecho   = src['Fecha del hecho'] || src['FECHA HECHO'] || src['Fecha_hecho'] || fechaGen;
        const hHecho   = src['Hora del hecho']  || src['HORA HECHO']  || src['Hora_hecho']  || '';
        const viaH     = src['via-hecho'] || src['VIA HECHO'] || src['VIA_DEL_HECHO'] || src['Lugar del hecho'] || '';

        // Rellenar campos visibles (primer detenido / último importado)
        inpDil.value       = dils;
        inpDelitoDet.value = delito;
        inpNombre.value    = nombre;
        inpApellidos.value = ap;
        inpNac.value       = nac;
        inpFechaHDet.value = fHecho;
        inpHoraHDet.value  = hHecho;
        inpViaHDet.value   = viaH;

        // Registrar detenido en la lista interna para exportar varios en un mismo hecho
        detenidosList.push({
          Diligencias:      dils,
          Delito:           delito,
          Nombre:           nombre,
          Apellidos:        ap,
          Nacionalidad:     nac,
          'Hora del hecho': hHecho,
          'via-hecho':      viaH
        });

        detenidoLoaded = true;
        updateDetCount();
        alert('Detenido importado en el modal.');
      }catch(_){
        alert('No se ha podido leer el JSON del detenido.');
      }
      e.target.value = '';
    });

    // ==== PICKER DE COORDENADAS (MAPA) ====
    function openPicker(){
      try{
        const pickerUrl = new URL('./picker/map_picker.html', window.location.href).href;
        const w = window.open(pickerUrl, 'mapPicker', 'width=980,height=740');
        if(!w){
          alert('No se pudo abrir la ventana del mapa (¿popup bloqueado?).');
          return;
        }
        const onMsg = (ev)=>{
          try{
            const d = ev && ev.data ? ev.data : {};
            if(d && d.type === 'coords-picked' && Array.isArray(d.coords)){
              const lat = Number(d.coords[0]);
              const lng = Number(d.coords[1]);
              if(isFinite(lat) && isFinite(lng)){
                currentCoords = [lat, lng];
                coordsLabel.textContent = `Lat ${lat.toFixed(6)}, Lng ${lng.toFixed(6)}`;
              }
            }
          }catch(_){}
          window.removeEventListener('message', onMsg);
          try{ if(w) w.close(); }catch(_){}
        };
        window.addEventListener('message', onMsg);
      }catch(_){
        alert('No se pudo abrir el selector de mapa.');
      }
    }

    btnPickCoords.addEventListener('click', openPicker);

    // ==== UTIL GUARDAR ARCHIVO SIN TOCAR STATE/LOCALSTORAGE ====
    async function saveJsonToFile(defaultName, obj){
      const data = JSON.stringify(obj, null, 2);
      const filename = defaultName || 'Hecho.json';

      if(window.showSaveFilePicker){
        try{
          const handle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{ description:'JSON', accept:{ 'application/json':['.json'] } }]
          });
          const writable = await handle.createWritable();
          await writable.write(new Blob([data], {type:'application/json'}));
          await writable.close();
          alert('Hecho guardado.');
          return;
        }catch(e){
          if(e && e.name === 'AbortError') return;
        }
      }

      const blob = new Blob([data], {type:'application/json'});
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
    }

    function nombreDesdeFechaHora(fecha, hora){
      let base = 'Hecho';
      if(fecha){
        const m = String(fecha).trim().match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})$/);
        if(m){
          const yy = m[3].slice(-2);
          base = `Hecho ${m[1]}-${m[2]}-${yy}`;
        }
      }
      let suf = '';
      if(hora){
        const m2 = String(hora).trim().match(/^(\d{1,2}):(\d{2})$/);
        if(m2){
          suf = ` ${m2[1]}_${m2[2]}h`;
        }
      }
      return `${base}${suf || ''}.json`;
    }

    // ==== CLICK GUARDAR HECHO JSON ====
    btnSave.addEventListener('click', async () => {
      if(!currentCoords){
        alert('Selecciona primero las coordenadas del hecho.');
        return;
      }

      const [lat,lng] = currentCoords;
      const base = {
        coords: [lat, lng],
        coordenadas: { lat, lng }
      };

      // fecha generación (por si el visor la usa)
      const now = new Date();
      const dd  = String(now.getDate()).padStart(2,'0');
      const mm  = String(now.getMonth()+1).padStart(2,'0');
      const yy4 = now.getFullYear();
      const fechaGeneracion = `${dd}/${mm}/${yy4}`;

      let out, fechaHecho, horaHecho;

      if(detenidoLoaded && detenidosList.length){
        // Actualizar el último detenido con lo que haya en los inputs visibles
        const commonDil  = (inpDil.value || '').trim() || (detenidosList[0].Diligencias || '');
        const commonHora = (inpHoraHDet.value || '').trim() || (detenidosList[0]['Hora del hecho'] || '');

        const lastIdx = detenidosList.length - 1;
        if (lastIdx >= 0){
          const last = detenidosList[lastIdx];
          last.Diligencias      = commonDil;
          last.Delito           = (inpDelitoDet.value || last.Delito || '').trim();
          last.Nombre           = (inpNombre.value || last.Nombre || '').trim();
          last.Apellidos        = (inpApellidos.value || last.Apellidos || '').trim();
          last.Nacionalidad     = (inpNac.value || last.Nacionalidad || '').trim();
          last['Hora del hecho'] = commonHora;
          last['via-hecho']      = (inpViaHDet.value || last['via-hecho'] || '').trim();
        }

        // Construir array de filiaciones (uno por detenido) en la misma coordenada
        const filiaciones = detenidosList.map(det => ({
          Diligencias:          (det.Diligencias || commonDil || '').trim(),
          Delito:               (det.Delito || '').trim(),
          Nombre:               (det.Nombre || '').trim(),
          Apellidos:            (det.Apellidos || '').trim(),
          Nacionalidad:         (det.Nacionalidad || '').trim(),
          'Fecha de generación':fechaGeneracion,
          'Fecha del hecho':    fechaGeneracion,
          'Hora del hecho':     (det['Hora del hecho'] || commonHora || '').trim(),
          'via-hecho':          (det['via-hecho'] || '').trim(),
          coords:               [lat, lng],
          coordenadas:          { lat, lng }
        }));

        out = Object.assign({}, base, {
          'Fecha de generación': fechaGeneracion,
          'Fecha del hecho':     fechaGeneracion,
          'Hora del hecho':      commonHora,
          Diligencias:           commonDil,
          filiaciones
        });

        fechaHecho = fechaGeneracion;
        horaHecho  = commonHora;
      }else{
        // usar bloque manual (hecho sin detenido)
        const delM = (inpDelitoManual.value || '').trim();
        const fM   = (inpFechaManual.value || '').trim();
        const hM   = (inpHoraManual.value || '').trim();

        out = Object.assign({}, base, {
          Delito:           delM,
          'Fecha del hecho':fM,
          'Hora del hecho': hM
        });
        out['Fecha de generación'] = fechaGeneracion;
        fechaHecho = fM || fechaGeneracion;
        horaHecho  = hM || '';
      }

      const fname = nombreDesdeFechaHora(fechaHecho, horaHecho);
      await saveJsonToFile(fname, out);
    });

  });
})();