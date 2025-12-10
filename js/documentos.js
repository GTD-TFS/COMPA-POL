// js/documentos.js — COMPLETO (ODT desde /plantillas)
// ============================================================
// • Carga ODT reales desde ./plantillas/<clave>.js (base64 en window.TEMPLATE_BODIES, sin fetch)
// • Abre ZIP, sustituye {{PLACEHOLDERS}} en TODOS los XML y re-empaqueta ODT (mimetype primero, STORE)
// • Usa memoria unificada (localStorage) para Abogado/Juzgado/Instructor
// • Selector de filiación por rol, listas completas de ABOGADOS y JUZGADOS
// • Botón principal: genera los ODT seleccionados
// ============================================================

// ===== UTIL =====
const $  = (sel,root=document)=>root.querySelector(sel);
const $$ = (sel,root=document)=>Array.from(root.querySelectorAll(sel));

function showMessage(msg, ok=true){
  const el = $('#message');
  if(!el) return;
  el.textContent = msg;
  el.style.color = ok ? '#90ee90' : '#ff8080';
}

function requireDeps(){
  if (typeof JSZip === 'undefined') throw new Error('Falta JSZip: incluye <script src="jszip.min.js"></script> antes de este archivo.');
  if (typeof saveAs === 'undefined') throw new Error('Falta FileSaver: incluye <script src="FileSaver.min.js"></script> antes de este archivo.');
}

function xmlEscape(str){
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\"/g,'&quot;').replace(/'/g,'&apos;');
}
// Igual que xmlEscape pero convirtiendo \n en saltos de línea ODT reales
function xmlEscapeWithBreaks(str){
  return xmlEscape(str).replace(/\r?\n/g, '<text:line-break/>');
}
function toESDate(input){
  if(input==null || input==='') return '';
  if(!isNaN(input) && typeof input==='number'){
    const base = new Date(Date.UTC(1899,11,30));
    const d = new Date(base.getTime()+input*86400000);
    const dd = String(d.getUTCDate()).padStart(2,'0');
    const mm = String(d.getUTCMonth()+1).padStart(2,'0');
    const yy = d.getUTCFullYear();
    return `${dd}/${mm}/${yy}`;
  }
  if(/^\d{4}-\d{2}-\d{2}$/.test(String(input))){
    const [y,m,d]=String(input).split('-');
    return `${d}/${m}/${y}`;
  }
  const m = String(input).match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if(m){
    const d = m[1].padStart(2,'0');
    const mn= m[2].padStart(2,'0');
    let y = m[3]; if(y.length===2) y = (Number(y)>50? '19':'20')+y;
    return `${d}/${mn}/${y}`;
  }
  return String(input);
}
function capitalizeEachWord(str){
  if(!str) return '';
  return String(str).toLowerCase().replace(/\b[\p{L}\p{N}][\p{L}\p{N}]*/gu, s => s.charAt(0).toUpperCase()+s.slice(1));
}
function upper(s){ return String(s||'').toUpperCase(); }

// === Wrapper de saveAs para Tauri: usa diálogo de guardado de escritorio si está disponible ===
(function hijackSaveAsForTauri(){
  if (typeof window === 'undefined' || !window) return;

  const originalSaveAs = window.saveAs;

  async function tauriAwareSaveAs(blob, name){
    const fileName = name || 'documento.odt';

    try{
      if (window.__TAURI__ && window.__TAURI__.dialog && window.__TAURI__.fs){
        console.log('[DOCS] Usando rama Tauri para guardar ODT');
        const { save }      = window.__TAURI__.dialog;
        const { writeFile } = window.__TAURI__.fs;

        const filePath = await save({
          defaultPath: fileName,
          filters: [{
            name: 'Documento ODT',
            extensions: ['odt']
          }]
        });
        // Si usuario cancela, no hacemos nada
        if (!filePath) return;

        let bytes;
        if (blob instanceof Blob){
          const buf = await blob.arrayBuffer();
          bytes = new Uint8Array(buf);
        } else if (blob instanceof Uint8Array){
          bytes = blob;
        } else if (blob instanceof ArrayBuffer){
          bytes = new Uint8Array(blob);
        } else {
          // Fallback defensivo: tratar como texto
          const txt  = typeof blob === 'string' ? blob : String(blob ?? '');
          const enc  = new TextEncoder();
          bytes = enc.encode(txt);
        }

        await writeFile(filePath, bytes);
        return;
      }
    }catch(e){
      console.warn('[DOCS] saveAs Tauri falló, usando implementación web.', e);
    }

    // --- Rama navegador clásica ---
    if (typeof originalSaveAs === 'function'){
      return originalSaveAs(blob, fileName);
    }

    // Fallback muy básico si por algún motivo no existe FileSaver
    let outBlob;
    if (blob instanceof Blob){
      outBlob = blob;
    } else if (blob instanceof Uint8Array || blob instanceof ArrayBuffer){
      const arr = blob instanceof Uint8Array ? blob : new Uint8Array(blob);
      outBlob = new Blob([arr], { type:'application/vnd.oasis.opendocument.text' });
    } else {
      outBlob = new Blob(
        [typeof blob === 'string' ? blob : String(blob ?? '')],
        { type:'application/vnd.oasis.opendocument.text' }
      );
    }

    const url = URL.createObjectURL(outBlob);
    const a   = document.createElement('a');
    a.href        = url;
    a.download    = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 800);
  }

  // Sobrescribimos window.saveAs solo una vez
  if (typeof originalSaveAs === 'function'){
    window.saveAs = function(blob, name){
      return tauriAwareSaveAs(blob, name);
    };
  } else {
    window.saveAs = tauriAwareSaveAs;
  }
})();

// ——— Helper: fija TODOS los alias de "Instructor" (incluida la variante exacta {{instructor actual}})
function setInstructorAliases(target, instr){
  if(!target) return;
  const v = String(instr||'').trim();
  if(!v) return;
  const keys = [
    'Instructor Actual', 'INSTRUCTOR_ACTUAL', 'INSTRUCTOR',
    'NUEVO_INSTRUCTOR', 'instructor', 'instructor actual', 'instructor_actual'
  ];
  for (const k of keys){
    if (target[k] == null || target[k] === '') target[k] = v;
  }
}

const ABOGADOS = [ /* …(lista completa tal cual me diste)… */ 
  { nombre: 'Carmen Francisca Pitti Garcia', colegiado: '760' },
  { nombre: 'Ana Cristina Galvan Marrero', colegiado: '870' },
  { nombre: 'Jose Alfonso Rodriguez Cruz', colegiado: '927' },
  { nombre: 'Jose Vega Vega', colegiado: '1180' },
  { nombre: 'Jose Honorio Perez Gonzalez', colegiado: '1222' },
  { nombre: 'Julio Imeldo Bello Hernandez', colegiado: '1395' },
  { nombre: 'Manuel Diaz Arteaga', colegiado: '1412' },
  { nombre: 'Carmen Rosa Botia Luis', colegiado: '1443' },
  { nombre: 'Jose Pedro Cedres Rivero', colegiado: '1538' },
  { nombre: 'Pilar Rosa Felipe Martinez', colegiado: '1548' },
  { nombre: 'Paulo Francisco Ramos Dos Santos Scheele', colegiado: '1606' },
  { nombre: 'Ramon Rolando Rodriguez Gil', colegiado: '1610' },
  { nombre: 'Francisco Javier Valdivia Palau', colegiado: '1618' },
  { nombre: 'Alicia Perez Cruz', colegiado: '1717' },
  { nombre: 'Ana Del Carmen Siverio Rodriguez', colegiado: '1761' },
  { nombre: 'Ramon Jose Darias Negrin', colegiado: '1806' },
  { nombre: 'Ana Maria Quintana Perez', colegiado: '1839' },
  { nombre: 'Jose Luis Camarillo Perez', colegiado: '1867' },
  { nombre: 'Rafael Vasco Oliveras', colegiado: '1893' },
  { nombre: 'Joaquina Carmen Yanes Barreto', colegiado: '1895' },
  { nombre: 'Maria De Los Angeles Diaz Alayon', colegiado: '1944' },
  { nombre: 'Antonio Agustin Dominguez Dominguez', colegiado: '1945' },
  { nombre: 'Pedro Julio Andres Arranz', colegiado: '2009' },
  { nombre: 'Teresa Febles Barroso', colegiado: '2013' },
  { nombre: 'Jose Julian Ramos Laserna', colegiado: '2034' },
  { nombre: 'Maria Montserrat Trujillo Consul', colegiado: '2039' },
  { nombre: 'Lope Juan Perez Lara', colegiado: '2109' },
  { nombre: 'Araceli Reyes Alonso', colegiado: '2114' },
  { nombre: 'Naima Riquelme Santana', colegiado: '2117' },
  { nombre: 'Sergio Ismael Arbelo Ledesma', colegiado: '2139' },
  { nombre: 'Maria Sol Chinea Rodriguez', colegiado: '2144' },
  { nombre: 'Fernando Ballesteros Ballester', colegiado: '2212' },
  { nombre: 'Maria Jesus Perez Dominguez', colegiado: '2266' },
  { nombre: 'Maria Nereida Salinas Martin', colegiado: '2276' },
  { nombre: 'Monica De Benito Inglada', colegiado: '2285' },
  { nombre: 'Fernando Comenge Acosta', colegiado: '2305' },
  { nombre: 'Carmen Dolores Delgado Garzon', colegiado: '2308' },
  { nombre: 'Maria Candelaria De La Rosa Gonzalez', colegiado: '2410' },
  { nombre: 'Francisco Javier Diaz Gonzalez', colegiado: '2415' },
  { nombre: 'Maria Teresa De Burgos Isidro', colegiado: '2409' },
  { nombre: 'Maria Visitacion Calzado Tinoco', colegiado: '2402' },
  { nombre: 'Pedro Santiago Brito Exposito', colegiado: '2400' },
  { nombre: 'Jose Maria Ribas Perez', colegiado: '2475' },
  { nombre: 'Juan Antonio Rodriguez Armas', colegiado: '2478' },
  { nombre: 'Fernando Adrian Torrijos Suarez', colegiado: '2495' },
  { nombre: 'Maria Mercedes Zerolo Alvarez', colegiado: '2498' },
  { nombre: 'Maria Teresa Benet Gonzalez', colegiado: '2516' },
  { nombre: 'Jose Antonio Dominguez Hernandez', colegiado: '2520' },
  { nombre: 'Francisco De Borja Dominguez Salavarria Rufino', colegiado: '2521' },
  { nombre: 'Juan Jose Perez Gomez', colegiado: '2538' },
  { nombre: 'Maria Esther Ruiz Valdivia', colegiado: '2544' },
  { nombre: 'Jose Miguel Velazquez Perello', colegiado: '2547' },
  { nombre: 'Alicia Cristina Pomares Vilaplana', colegiado: '2584' },
  { nombre: 'Maria Victoria Aldazabal Garcia', colegiado: '2634' },
  { nombre: 'Leopoldo Escobar Martinez De Azagra', colegiado: '2664' },
  { nombre: 'Maria Jesus De Armas Melo', colegiado: '2800' },
  { nombre: 'Maria Teresa De La Concha Garcia', colegiado: '2801' },
  { nombre: 'Alberto Juan Diaz Mesa', colegiado: '2803' },
  { nombre: 'Gustavo De Jorge Morales', colegiado: '2820' },
  { nombre: 'Yvan Mauricio Andueza Pulido', colegiado: '2900' },
  { nombre: 'Santiago Ramos Perez', colegiado: '3004' },
  { nombre: 'Maria Montserrat Castro Delgado', colegiado: '3046' },
  { nombre: 'Francisca Bilma Perez Garcia', colegiado: '3088' },
  { nombre: 'Maria Antonia Rodriguez Amador', colegiado: '3097' },
  { nombre: 'Aurelio De La Vega Feliciano', colegiado: '3110' },
  { nombre: 'Maria Candelaria Velazquez Padilla', colegiado: '3111' },
  { nombre: 'Zenaida Adianez Raussed Mendoza', colegiado: '3113' },
  { nombre: 'Begoña Reta Perez', colegiado: '3146' },
  { nombre: 'Oscar Luis Rodriguez Rodriguez', colegiado: '3172' },
  { nombre: 'Sergio Luis Rodriguez Martinez', colegiado: '3184' },
  { nombre: 'Ernesto Baltar Pascual', colegiado: '3185' },
  { nombre: 'Margarita De Las Nieves Suarez Delgado', colegiado: '3258' },
  { nombre: 'Frauke Hanna Walzberg', colegiado: '3266' },
  { nombre: 'Elias Yanes Hernandez', colegiado: '3268' },
  { nombre: 'Maria Dolores Arriaga Hardisson', colegiado: '3278' },
  { nombre: 'Jorge Jesus Quintero Brito', colegiado: '3305' },
  { nombre: 'Maria Bello Reyes', colegiado: '3310' },
  { nombre: 'David Arroyo Vidal', colegiado: '3345' },
  { nombre: 'Maria Jose Benitez Santos Moran', colegiado: '3346' },
  { nombre: 'Manuel Estevez Acevedo', colegiado: '3351' },
  { nombre: 'Jose Regalado Exposito', colegiado: '3436' },
  { nombre: 'Jose Gregorio Armas Cruz', colegiado: '3434' },
  { nombre: 'Maria Teresa Pestana Martin', colegiado: '3402' },
  { nombre: 'Dacil Rocio Valladares Cabrera', colegiado: '3424' },
  { nombre: 'Guillermo De Benito Muñoz', colegiado: '3444' },
  { nombre: 'Sara Ceballos Padron', colegiado: '3453' },
  { nombre: 'Maria Angeles Conde Rodriguez', colegiado: '3454' },
  { nombre: 'Maria Noelia Cornejo Fumero', colegiado: '3455' },
  { nombre: 'Matilde Zambudio Molina', colegiado: '3494' },
  { nombre: 'Maria Luisa Baudet Trujillo', colegiado: '3507' },
  { nombre: 'Domingo Javier Castillo Gil', colegiado: '3535' },
  { nombre: 'Natalia Dominguez Castilla', colegiado: '3540' },
  { nombre: 'Esau Jacob De Leon Gonzalez', colegiado: '3556' },
  { nombre: 'Mercedes Vacas Sentis', colegiado: '3577' },
  { nombre: 'Antonio Gregorio Brito Perez', colegiado: '3622' },
  { nombre: 'Adriana Herrera Gutierrez', colegiado: '3627' },
  { nombre: 'Maria Del Carmen Delgado Caceres', colegiado: '3636' },
  { nombre: 'Eva Maria Rodriguez Acosta', colegiado: '3639' },
  { nombre: 'Luis Francisco Diaz Dorta', colegiado: '3659' },
  { nombre: 'Manuel Adrian Rosales', colegiado: '3673' },
  { nombre: 'Soledad Suarez Cruz', colegiado: '3705' },
  { nombre: 'Maria Del Mar Vera Sosa', colegiado: '3707' },
  { nombre: 'Maria De Las Nieves Viña Rodriguez', colegiado: '3708' },
  { nombre: 'Elena Cristina Diaz Gonzalez', colegiado: '3738' },
  { nombre: 'Ana Carina Suarez Pestano', colegiado: '3761' },
  { nombre: 'Monica Raquel Benitez Diaz', colegiado: '3782' },
  { nombre: 'Wilfredo Tanausu Elvira Cabrera', colegiado: '3789' },
  { nombre: 'Maria Carmen Fabelo Rodriguez', colegiado: '3790' },
  { nombre: 'Alejandra Maria Sanjuan Gonzalez', colegiado: '3824' },
  { nombre: 'Eduardo Valentin Braun Fulford', colegiado: '3825' },
  { nombre: 'Veronica Alvarez Liddell', colegiado: '3833' },
  { nombre: 'Miguel Angel Alabau Jimenez', colegiado: '3871' },
  { nombre: 'Laura Alvarez Martin', colegiado: '3873' },
  { nombre: 'Francisco Beltran Aroca', colegiado: '3874' },
  { nombre: 'Elisa Maria Armas Perez', colegiado: '3886' },
  { nombre: 'Carlos Tejera Pigeon', colegiado: '3901' },
  { nombre: 'Javier Suarez Gonzalez', colegiado: '3913' },
  { nombre: 'Maria Pilar Afonso Garriga', colegiado: '3928' },
  { nombre: 'Susana Cabrero Sanchez', colegiado: '3965' },
  { nombre: 'Maria Ines Alonso Rodriguez', colegiado: '3980' },
  { nombre: 'Mario Manuel Aleman Rodriguez', colegiado: '3979' },
  { nombre: 'Beatriz Carrero De Castro', colegiado: '3984' },
  { nombre: 'Maria Antonia Correa Garcia', colegiado: '3993' },
  { nombre: 'Rodolfo Rodriguez Montenegro', colegiado: '4009' },
  { nombre: 'Raquel Plasencia Mendoza', colegiado: '4023' },
  { nombre: 'Alejandro Rodriguez Delgado De Molina', colegiado: '4024' },
  { nombre: 'Maria Teresa Aleman Rodriguez', colegiado: '4033' },
  { nombre: 'Cristina Amat Guerra', colegiado: '4034' },
  { nombre: 'Luis Miguel Rodriguez Rodriguez', colegiado: '4056' },
  { nombre: 'Guillermo Santos Perez', colegiado: '4059' },
  { nombre: 'Silvia Teruelo Hernandez', colegiado: '4059' },
  { nombre: 'Belen De La Torriente Hoyo', colegiado: '4068' },
  { nombre: 'Lorena Diaz Acosta', colegiado: '4085' },
  { nombre: 'Juan Jesus Rodriguez Batista', colegiado: '4103' },
  { nombre: 'Dacil Rodriguez Mendez', colegiado: '4105' },
  { nombre: 'Rossana Alicia Brancato', colegiado: '4115' },
  { nombre: 'Ana Belen Espejo Lesme', colegiado: '4129' },
  { nombre: 'Natalia Arteaga Hernandez', colegiado: '4152' },
  { nombre: 'Maria Dolores Chinea Brito', colegiado: '4153' },
  { nombre: 'Karen De Los Angeles Cordero Capriles', colegiado: '4155' },
  { nombre: 'Grace Uriarte Sanchez', colegiado: '4164' },
  { nombre: 'Conrado Santiago Dorta Exposito', colegiado: '4179' },
  { nombre: 'Emma Janette Alegria Gonzalez', colegiado: '4184' },
  { nombre: 'Nancy Dorta Gonzalez', colegiado: '4196' },
  { nombre: 'Carolina Reveron Ramos', colegiado: '4221' },
  { nombre: 'Nayra Milagros Santos Medina', colegiado: '4223' },
  { nombre: 'Ana Maria Cabrera Mesa', colegiado: '4228' },
  { nombre: 'Maria Desiree Requena Lopez', colegiado: '4246' },
  { nombre: 'Luis Alejandro Sanchez Garcia-Yanes', colegiado: '4256' },
  { nombre: 'Alicia Delgado Gonzalez', colegiado: '4261' },
  { nombre: 'Rita De Cassia Alves Borges', colegiado: '4280' },
  { nombre: 'Esther Davinia Roger Marcelino', colegiado: '4290' },
  { nombre: 'Juan David Cruz Torres', colegiado: '4299' },
  { nombre: 'Heller Maria Abreu Trujillo', colegiado: '4306' },
  { nombre: 'Concetta Contino', colegiado: '4312' },
  { nombre: 'Yurena Rodriguez Afonso', colegiado: '4340' },
  { nombre: 'Eduardo Diaz Beautell', colegiado: '4372' },
  { nombre: 'Raquel Rosa Acevedo Gonzalez', colegiado: '4378' },
  { nombre: 'Jose Manuel Cuerva Gonzalez', colegiado: '4382' },
  { nombre: 'Olga De Luque Sollheim', colegiado: '4395' },
  { nombre: 'Ramon Tabares Marcos', colegiado: '4411' },
  { nombre: 'Blanca Isora Cruz Gonzalez', colegiado: '4413' },
  { nombre: 'Miguel Visconti Suarez', colegiado: '4436' },
  { nombre: 'Maria Del Pilar Acosta Alba', colegiado: '4441' },
  { nombre: 'Raul Jose Alonso Fernandez', colegiado: '4442' },
  { nombre: 'Tamara Conde Pfahl', colegiado: '4444' },
  { nombre: 'Karel Felipe Marra', colegiado: '4448' },
  { nombre: 'Adriana Acosta Castro', colegiado: '4462' },
  { nombre: 'Nicolas Quintero Arzola', colegiado: '4486' },
  { nombre: 'Patricia Yumar Diaz', colegiado: '4519' },
  { nombre: 'Victoria Eugenia Diaz Alba', colegiado: '4524' },
  { nombre: 'Maria Lorena Cabo Perez', colegiado: '4526' },
  { nombre: 'Maria Fernanda Ruffini Muriel', colegiado: '4544' },
  { nombre: 'Isabel Astrid Dorta Correa', colegiado: '4552' },
  { nombre: 'Rocco Crimeni', colegiado: '4565' },
  { nombre: 'Natacha Erika Balestra Rodriguez', colegiado: '4571' },
  { nombre: 'Rafael Espejo Saavedra Conesa', colegiado: '4574' },
  { nombre: 'Juan Jose Fanego Beneciartua', colegiado: '4576' },
  { nombre: 'Paulo Daniel Ramos Dos Santos Medina', colegiado: '4608' },
  { nombre: 'Jose Alejandro Rodriguez Gutierrez', colegiado: '4610' },
  { nombre: 'Yurena Suleiman Tejera', colegiado: '4616' },
  { nombre: 'Vanesa Zamora Padron', colegiado: '4656' },
  { nombre: 'Daniel Angel Alberto Gonzalez', colegiado: '4660' },
  { nombre: 'Emilio De Fuentes Marcos', colegiado: '4667' },
  { nombre: 'Noe Oscar Bernardez Couceiro', colegiado: '4716' },
  { nombre: 'Nilsa Misvelia Quevedo Ugarte', colegiado: '4746' },
  { nombre: 'Carmen Afonso Garriga', colegiado: '4750' },
  { nombre: 'Jennifer Desantis Hernandez', colegiado: '4753' },
  { nombre: 'Yerai Teruelo Hernandez', colegiado: '4767' },
  { nombre: 'Javier Suarez Gonzalez', colegiado: '4767' },
  { nombre: 'Ileana Alvarez', colegiado: '4846' },
  { nombre: 'Carlos Zurita Perez', colegiado: '4866' },
  { nombre: 'Silvia Luz Saavedra Gonzalez', colegiado: '4967' },
  { nombre: 'Cristo Ayose Suarez Pimentel', colegiado: '4968' },
  { nombre: 'Maria Isabel De Taoro Gonzalez', colegiado: '4969' },
  { nombre: 'Sergio Armas Hernandez', colegiado: '4977' },
  { nombre: 'Annick Claudia Bourgeois', colegiado: '4978' },
  { nombre: 'Javier Casado San Roman', colegiado: '4979' },
  { nombre: 'Alexis Fonte Quintero', colegiado: '5008' },
  { nombre: 'Antonio Almira Picazo', colegiado: '5035' },
  { nombre: 'Nuria Patricia Abella Marquez', colegiado: '5036' },
  { nombre: 'Nuria Patricia Abella Marquez', colegiado: '5056' },
  { nombre: 'Tomas Febles Diaz', colegiado: '5086' },
  { nombre: 'Jonay Rodriguez Darias', colegiado: '5131' },
  { nombre: 'Ubay Cañas Morales', colegiado: '5148' },
  { nombre: 'Idaira Dominguez Lemus Gonzalez', colegiado: '5157' },
  { nombre: 'Alvaro Jesus Rodriguez Bernaldo De Quiros', colegiado: '5160' },
  { nombre: 'Mirian Delgado Gonzalez', colegiado: '5161' },
  { nombre: 'Maria Jose Alonso Alvarez', colegiado: '5204' },
  { nombre: 'Paula Velazquez Paredes', colegiado: '5220' },
  { nombre: 'Sheila Ramon Medina', colegiado: '5232' },
  { nombre: 'Erika Maria Cabello Garcia', colegiado: '5243' },
  { nombre: 'Pilar Betsabe Diaz Diaz', colegiado: '5249' },
  { nombre: 'Sergio Rodriguez Curbelo', colegiado: '5252' },
  { nombre: 'Irina Cabello Perez', colegiado: '5326' },
  { nombre: 'Maite Perez Guerra', colegiado: '5406' },
  { nombre: 'Eloy Diaz Lopez', colegiado: '5559' },
  { nombre: 'Maria Dolores Damaso Ojeda', colegiado: '5555' },
  { nombre: 'Silvia Camejo Alarcon', colegiado: '5574' },
  { nombre: 'Liliana Perez Suarez', colegiado: '5598' },
  { nombre: 'Sussette Afonso Hernandez', colegiado: '5609' },
  { nombre: 'Catalina Cuza Vega', colegiado: '5617' },
  { nombre: 'Natalia Rodriguez Marrero', colegiado: '5632' },
  { nombre: 'Irene Villar Garcia De Paredes', colegiado: '5633' },
  { nombre: 'Maralbis Del Valle Vivas Francisco', colegiado: '5661' },
  { nombre: 'Kilian Cabrera Martin', colegiado: '5717' },
  { nombre: 'Davinia San Millan Pacheco', colegiado: '5725' },
  { nombre: 'Marta De Los Angeles Arbelo Gomez', colegiado: '5758' },
  { nombre: 'David Reyes Cabello', colegiado: '5761' },
  { nombre: 'Zosimo Darias Armas', colegiado: '5777' },
  { nombre: 'Beatriz Villalobos Medina', colegiado: '5798' },
  { nombre: 'Jonathan Riverol Cruz', colegiado: '5803' },
  { nombre: 'Salvador Ramon Torres Herrera', colegiado: '5814' },
  { nombre: 'Samuel Suarez Sigut', colegiado: '5815' },
  { nombre: 'Jennifer Rosa Curbelo Gonzalez', colegiado: '5822' },
  { nombre: 'Nieves Maria Diaz Exposito', colegiado: '5898' },
  { nombre: 'Aitana Badillo Gomez', colegiado: '5952' },
  { nombre: 'Francisco De Borja Virgos De Santisteban', colegiado: '5966' },
  { nombre: 'Cathaysa Diaz Perera', colegiado: '5968' },
  { nombre: 'Jesus Castro Robredo', colegiado: '5988' },
  { nombre: 'Sara Duque Serrano', colegiado: '6013' },
  { nombre: 'Jose Ramon Armas Herrera', colegiado: '6035' },
  { nombre: 'Gloria Maria Vietor Hernandez', colegiado: '6041' },
  { nombre: 'Erika Rocio Perez Martin', colegiado: '6059' },
  { nombre: 'Catherine Maria Dorta Gonzalez', colegiado: '6061' },
  { nombre: 'Laura Alvarez Martin', colegiado: '6089' },
  { nombre: 'Gregorio David Zamora Jara', colegiado: '6124' },
  { nombre: 'Alejandro Casanova Arzola', colegiado: '6132' },
  { nombre: 'Antonio Perez Socorro', colegiado: '6158' },
  { nombre: 'Silvia Afonso Marichal', colegiado: '6191' },
  { nombre: 'Miguel Dominguez Escobar', colegiado: '6192' },
  { nombre: 'Ainoa Chaxiraxi Diaz Robayna', colegiado: '6204' },
  { nombre: 'Iris Candelaria Dorta Alonso', colegiado: '6205' },
  { nombre: 'Montserrat Perez Gonzalez', colegiado: '6240' },
  { nombre: 'Vicente Manuel Castellano Roque', colegiado: '6241' },
  { nombre: 'Miguel Angel Dominguez Cernadas', colegiado: '6243' },
  { nombre: 'Yesica De La Cruz Arvelo Rosa', colegiado: '6289' },
  { nombre: 'Candelaria Mesa Hernandez', colegiado: '6326' },
  { nombre: 'Jose Antonio Rojas Luis', colegiado: '6337' },
  { nombre: 'Jose Maria Chico Martin', colegiado: '6378' },
  { nombre: 'Sara Estevez Diaz', colegiado: '6383' },
  { nombre: 'Jesus Caballero Ruiz', colegiado: '6416' },
  { nombre: 'Maroussa Arvelo Dominguez', colegiado: '6481' },
  { nombre: 'Sara Maria Rodriguez Trigo', colegiado: '6576' },
  { nombre: 'Alejandro Cabrera Jaubert', colegiado: '6681' },
  { nombre: 'Marta De Los Angeles Arbelo Gomez', colegiado: '9758' }
];

const JUZGADOS = [
  'Juzgado de Instrucción Nº UNO (1) de Arona',
  'Juzgado de Instrucción Nº DOS (2) de Arona',
  'Juzgado de Instrucción Nº TRES (3) de Arona',
  'Juzgado de Instrucción Nº CUATRO (4) de Arona',
  'Juzgado de Violencia sobre la Mujer Nº UNO (1) de Arona'
];
window.JUZGADOS = JUZGADOS;

// Cache por sesión: { templateKey : ArrayBuffer }
const TEMPLATE_ODT_BUFFERS = {};

// ===== PLANTILLAS DISPONIBLES =====
const TEMPLATES = [
  { key: 'plantilla_declaracion',      file: 'plantilla_declaracion.odt',      label: 'Toma Declaración Detenido' },
  { key: 'plantilla_ofidinero',        file: 'plantilla_ofidinero.odt',        label: 'Oficio Dinero Juzgado' },
  { key: 'plantilla_ofiadn1',           file: 'plantilla_ofiadn.odt',           label: 'Oficio Solicitud ADN' },
  { key: 'plantilla_adnconsen',        file: 'plantilla_adnconsen.odt',        label: 'Consentimiento ADN' },
  { key: 'plantilla_entregamenor',     file: 'plantilla_entregamenor.odt',     label: 'Acta Entrega Menor' },
  { key: 'plantilla_jidlcita',         file: 'plantilla_jidlcita.odt',         label: 'Citación JIDL' },
  { key: 'plantilla_jrdcita',          file: 'plantilla_jrdcita.odt',          label: 'Citación JRD' },
  { key: 'plantilla_ofrecimiento',     file: 'plantilla_ofrecimiento.odt',     label: 'Ofrecimiento Acciones Esp' },
  { key: 'plantilla_ofrecimientoingles', file: 'plantilla_ofrecimientoingles.odt', label: 'Ofrecimiento Acciones Ing' },
  { key: 'plantilla_dereviogen',       file: 'plantilla_dereviogen.odt',       label: 'Derechos VIOGEN Esp' },
  { key: 'plantilla_viogenrights',     file: 'plantilla_viogenrights.odt',     label: 'Derechos VIOGEN Ing' }
];

// ===== UI: lista plantillas =====
function renderTemplateCheckboxes(){
  const container = $('#templatesList');
  if(!container) return;
  container.innerHTML = '';
  TEMPLATES.forEach(t=>{
    const div = document.createElement('div');
    div.className = 'template-item';
    const id = `tpl_${t.key}`;
    div.innerHTML = `<label><input type="checkbox" class="tplCheck" value="${t.key}" id="${id}"/> <span>${xmlEscape(t.label)}</span></label>`;
    container.appendChild(div);
  });
}
function getSelectedTemplates(){
  return $$('.tplCheck:checked').map(x=>x.value);
}

// ===== JUZGADOS (datalist o select) =====
function populateJuzgados(){
  const lista = Array.isArray(window.JUZGADOS) ? window.JUZGADOS
              : (typeof JUZGADOS !== 'undefined' && Array.isArray(JUZGADOS) ? JUZGADOS : []);
  if (!lista.length) {
    console.warn('[JUZGADOS] Lista vacía/no disponible');
    return;
  }

  const input = document.getElementById('juzgadoInput');
  const dl    = document.getElementById('juzgadosList');

  if (input && dl) {
    if (input.getAttribute('list') !== 'juzgadosList') input.setAttribute('list','juzgadosList');
    input.setAttribute('autocomplete','on');
    dl.textContent = '';
    for (const j of lista) {
      const op = document.createElement('option');
      op.value = String(j || '');
      dl.appendChild(op);
    }
    return;
  }

  const sel = document.getElementById('juzgadoInput');
  if (sel && sel.tagName === 'SELECT') {
    sel.innerHTML = '<option value="">— Selecciona juzgado —</option>';
    for (const j of lista) {
      const op = document.createElement('option');
      op.value = String(j || '');
      op.textContent = String(j || '');
      sel.appendChild(op);
    }
  }
}

// ===== ABOGADOS: autocompletar por nº de colegiado =====
function wireBuscarColegiado(){
  const q = $('#buscarColegiado');
  const outNombre = $('#abogadoNombre');
  const outCol = $('#abogadoColegiado');
  if(!q || !outNombre || !outCol) return;

  const norm = v => String(v ?? '').replace(/\D+/g,'');
  const tryFill = () => {
    const num = norm(q.value.trim());
    if(!num) return;
    let found = ABOGADOS.find(a => norm(a.colegiado) === num);
    if(!found && num.length >= 3){
      const cands = ABOGADOS.filter(a => norm(a.colegiado).startsWith(num));
      if(cands.length === 1) found = cands[0];
    }
    if(found){
      outNombre.value = capitalizeEachWord(found.nombre || '');
      outCol.value    = String(found.colegiado || '');
      persistAbogadoJuzgado();
    }
  };
  ['input','change','blur'].forEach(ev=>q.addEventListener(ev, tryFill));
  q.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); tryFill(); } });
}

// ===== EXPEDIENTE / PERSONAS =====
function loadExpediente(){
  try{
    const raw = localStorage.getItem('expedienteGuardado') ||
                localStorage.getItem('proyecto') ||
                localStorage.getItem('expedienteOriginal');
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){
    console.error('JSON expediente inválido', e);
    return null;
  }
}
function persistExpediente(exp){
  try{
    const s = JSON.stringify(exp);
    localStorage.setItem('expedienteGuardado', s);
    localStorage.setItem('proyecto', s);
    localStorage.setItem('expedienteOriginal', s);
    localStorage.setItem('expedienteAbierto', 'true');
    window.dispatchEvent(new CustomEvent('expedienteUpdated',{ detail: exp }));
  }catch(_){}
}
function getExpRoot(exp){
  return (exp && exp.expediente && (Array.isArray(exp.expediente.filiaciones) || Object.keys(exp.expediente).length))
    ? exp.expediente
    : exp;
}
function getPersonas(exp){
  const root = getExpRoot(exp || {});
  return Array.isArray(root?.filiaciones) ? root.filiaciones : [];
}
function getRol(p){
  return (p && (p['Condición']||p['condicion']||p['Rol']||p['rol']||'Identificado')) || 'Identificado';
}
function personaLabel(p){
  const rol = getRol(p);
  const nom = (p['Nombre']||'').trim();
  const ape = (p['Apellidos']||'').trim();
  const tipo= (p['Tipo de documento']||'').trim();
  const num = (p['Nº Documento']||p['Número de Documento']||p['Numero de Documento']||'').trim();
  const doc = (tipo||num) ? ` (${[tipo,num].filter(Boolean).join(' ')})` : '';
  return `${rol} — ${nom} ${ape}${doc}`;
}
function defaultPersonaIndex(arr){
  const i = arr.findIndex(p=>/detenid[oa]/i.test(getRol(p)));
  return i<0 ? 0 : i;
}
function populatePersonaSelector(){
  const sel = $('#personaActiva'); if(!sel) return;
  const exp = loadExpediente();
  const personas = getPersonas(exp);

  const prev = sel.value;

  sel.innerHTML='';
  if(!personas.length){
    const op=document.createElement('option');
    op.value='-1'; op.textContent='— No hay filiaciones —';
    sel.appendChild(op);
    return;
  }
  const groups = {};
  personas.forEach((p,idx)=>{ (groups[getRol(p)] ||= []).push({idx,p}); });
  Object.keys(groups).forEach(rol=>{
    const og=document.createElement('optgroup'); og.label=rol;
    groups[rol].forEach(({idx,p})=>{
      const op=document.createElement('option');
      op.value=String(idx); op.textContent=personaLabel(p);
      og.appendChild(op);
    });
    sel.appendChild(og);
  });

  if (prev && personas[Number(prev)]) {
    sel.value = prev;
  } else {
    sel.value = String(defaultPersonaIndex(personas));
  }
}

// ===== PLACEHOLDERS =====
function normalizeKey(k){
  return String(k||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'_').toUpperCase();
}
function getValueForPlaceholder(rawKey, data){
  const rawTrim = String(rawKey).trim();
  const candidates = [ rawTrim, rawTrim.replace(/\s+/g,'_'), normalizeKey(rawTrim) ];
  for(const k of candidates){
    if(data[k]!=null && data[k]!=='') return xmlEscape(String(data[k]));
  }
  return '';
}

// ===== DATOS PARA PLACEHOLDERS =====
function getDocNumberFromPersona(p){
  return p['Nº Documento']||p['Número de Documento']||p['Numero de Documento']||p['No Documento']||'';
}
function buildDataFromSelection(){
  const exp = loadExpediente() || {};
  const root = getExpRoot(exp);
  const personas = getPersonas(exp);
  const sel = $('#personaActiva');
  const idx = sel ? parseInt(sel.value||'-1',10) : defaultPersonaIndex(personas);
  const persona = (idx>=0 && personas[idx]) ? personas[idx] : null;
  const a = (k)=> (persona && persona[k]) || '';

  const fullName = [a('Nombre'), a('Apellidos')].map(x=>x||'').join(' ').trim();

  const base = {
    NOMBRE:            capitalizeEachWord(a('Nombre')),
    APELLIDOS:         upper(a('Apellidos')),
    TIPO_DOCUMENTO:    a('Tipo de documento')||'',
    NUMERO_DOCUMENTO:  getDocNumberFromPersona(persona||{}),
    FECHA_NACIMIENTO:  toESDate(a('Fecha de nacimiento')),
    LUGAR_NACIMIENTO:  capitalizeEachWord(a('Lugar de nacimiento')),
    PADRES:            capitalizeEachWord(a('Nombre de los Padres')),
    DOMICILIO:         capitalizeEachWord(a('Domicilio')),
    TELEFONO:          a('Teléfono')||a('Telefono')||'',
    SEXO:              capitalizeEachWord(a('Sexo')),
    NACIONALIDAD:      capitalizeEachWord(a('Nacionalidad')),
    PERSONA_ACTIVA_NOMBRE_COMPLETO: fullName
  };

  const ABO = root?.Abogado || {};
  const JUZ = root?.Juzgado || {};
  base.ABOGADO_NOMBRE    = capitalizeEachWord(ABO.Nombre || $('#abogadoNombre')?.value || '');
  base.ABOGADO_COLEGIADO = (ABO.NumColegiado || ABO['Nº colegiado'] || $('#abogadoColegiado')?.value || '');
  base.JUZGADO           = JUZ.Nombre || $('#juzgadoInput')?.value || '';
  base.FECHA_PROCEDIMIENTO = JUZ.Fecha ? toESDate(JUZ.Fecha) : ($('#fechaProcedimiento')?.value ? toESDate($('#fechaProcedimiento').value) : '');
  base.HORA_PROCEDIMIENTO  = JUZ.Hora  || $('#horaProcedimiento')?.value || '';

  // Instructor: preferimos input vivo, luego tmp, luego JSON
  const iaInput = ($('#inpInstructorActual')?.value || '').trim();
  const iaTmp   = (localStorage.getItem('instructorActualTmp') || '').trim();
  const iaJson  = (root && (root['Instructor Actual'] || root['Instructor'] || root.INSTRUCTOR)) || '';
  const instr   = iaInput || iaTmp || iaJson || '';

  // Aliases en base
  setInstructorAliases(base, instr);

  const esDetenido = /detenid[oa]/i.test(getRol(persona||{}));
  const det = esDetenido ? {
    DETENIDO_NOMBRE:                capitalizeEachWord(a('Nombre')),
    DETENIDO_APELLIDOS:             upper(a('Apellidos')),
    DETENIDO_TIPO_DOCUMENTO:        a('Tipo de documento')||'',
    DETENIDO_NUMERO_DOCUMENTO:      getDocNumberFromPersona(persona||{}),
    DETENIDO_FECHA_NACIMIENTO:      toESDate(a('Fecha de nacimiento')),
    DETENIDO_LUGAR_NACIMIENTO:      capitalizeEachWord(a('Lugar de nacimiento')),
    DETENIDO_PADRES:                capitalizeEachWord(a('Nombre de los Padres')),
    DETENIDO_DOMICILIO:             capitalizeEachWord(a('Domicilio')),
    DETENIDO_TELEFONO:              a('Teléfono')||a('Telefono')||'',
    DETENIDO_SEXO:                  capitalizeEachWord(a('Sexo')),
    DETENIDO_NACIONALIDAD:          capitalizeEachWord(a('Nacionalidad')),
    DETENIDO_DELITO:                capitalizeEachWord(a('Delito') || a('delito') || a('DELITO')),
    DETENIDO_CP_AGENTES:            a('C.P. Agentes')||'',
    DETENIDO_INSTRUCTOR:            instr,
    DETENIDO_LUGAR_DEL_HECHO:       capitalizeEachWord(a('Lugar del hecho')),
    DETENIDO_LUGAR_DE_LA_DETENCIÓN: capitalizeEachWord(a('Lugar de la detención')),
    DETENIDO_HORA_DEL_HECHO:        a('Hora del hecho')||'',
    DETENIDO_HORA_DE_LA_DETENCIÓN:  a('Hora de la detención')||'',
    DETENIDO_BREVE_RESUMEN_DE_LOS_HECHOS:      capitalizeEachWord(a('Breve resumen de los hechos')),
    DETENIDO_INDICIOS_POR_LOS_QUE_SE_DETIENE:  capitalizeEachWord(a('Indicios por los que se detiene')),
    DETENIDO_ABOGADO:               base.ABOGADO_NOMBRE,
    DETENIDO_COMUNICARSE_CON:       capitalizeEachWord(a('Comunicarse con')),
    DETENIDO_INTERPRETE:            capitalizeEachWord(a('Intérprete')),
    DETENIDO_MEDICO:                capitalizeEachWord(a('Médico')),
    DETENIDO_CONSULADO:             capitalizeEachWord(a('Consulado'))
  } : {};

  // === Filiación NO detenida (perjudicado/testigo, etc.) para plantillas ===
  const fil = !esDetenido ? {
    FILIACION_NOMBRE:           capitalizeEachWord(a('Nombre')),
    FILIACION_APELLIDOS:        upper(a('Apellidos')),
    FILIACION_TIPO_DOCUMENTO:   a('Tipo de documento') || '',
    FILIACION_NUMERO_DOCUMENTO: getDocNumberFromPersona(persona || {})
  } : {};

  const glob = {
    DILIGENCIAS: (root && (root.diligencias || root.Diligencias || '')) || ''
  };
  // === Resolución robusta del DELITO desde la selección o expediente ===
  (function ensureDetenidoDelito(){
    // 1) Intentar directamente desde la ficha activa (campo simple)
    let delito = a('Delito') || a('delito') || a('DELITO') || '';

    // 2) Si no viene, intentar arrays habituales en la persona o en el expediente
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
    const rootAll = getExpRoot(exp || {});
    if (!delito) delito = pickFromArray((rootAll && (rootAll.Delitos || rootAll.delitos || rootAll.DELITOS)) || null);
    if (!delito && rootAll && typeof rootAll.Delito === 'string') delito = rootAll.Delito;
    if (!delito && rootAll && typeof rootAll.DELITO === 'string') delito = rootAll.DELITO;

    delito = String(delito || '').trim();
    if (!delito) return;

    const delitoUpper = delito.toUpperCase();

    // Volcar a la clave exacta que pide la plantilla
    if (!det.DETENIDO_DELITO) det.DETENIDO_DELITO = delitoUpper;

    // Mantener también DELITO global por compatibilidad (lo usa documentos)
    if (!base.DELITO) base.DELITO = delitoUpper;
  })();

  // *** Delito para Documentos: solo el de la filiación seleccionada ***
  base.DELITO = det.DETENIDO_DELITO ? String(det.DETENIDO_DELITO).toUpperCase() : '';

  // Exporta también "Instructor Actual" en el bloque global por compatibilidad
  setInstructorAliases(glob, instr);

  // Forzar mayúsculas de los campos de DELITO
  if (base.DELITO) base.DELITO = String(base.DELITO).toUpperCase();
  if (det.DETENIDO_DELITO) det.DETENIDO_DELITO = String(det.DETENIDO_DELITO).toUpperCase();

  return Object.assign({}, base, det, fil, glob);

}

/* ====== REEMPLAZO ÚNICO: robusto + ODT multi-XML (incluso con llaves y letras partidas por <span>) ====== */

// Helpers de regex/normalización
function _escRe(s){ return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'); }
function _normKey(s){
  return String(s||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,'_')
    .toUpperCase();
}
// Permite tags/espacios/entidades ENTRE letras (llaves intactas)
function _looseRxFor(key){
  const between = '(?:\\s|<[^>]+>|&[^;]+;)*';
  const letters = String(key).split('').map(ch => _escRe(ch)).join(between);
  return new RegExp(`\\{\\{{?${between}${letters}${between}\\}{2,3}`, 'gi');
}
// Lookup de valor; si no hay, devolvemos null para preservar placeholder
function _lookup(rawKey, data){
  const cands = [ rawKey, String(rawKey).replace(/\s+/g,'_'), _normKey(rawKey) ];
  for(const k of cands){
    if(data[k] != null && data[k] !== '') return xmlEscapeWithBreaks(String(data[k]));
  }
  return null;
}

function replacePlaceholders(xmlBody, data){
  if (typeof xmlBody !== 'string') {
    try { xmlBody = String(xmlBody); }
    catch { throw new TypeError('La plantilla no es texto y no se pudo convertir a string'); }
  }

  // Normaliza triples → dobles (sin tocar el contenido)
  xmlBody = xmlBody
    .replace(/\{([ \t\r\n]*)([A-ZÁÉÍÓÚÜÑ0-9_ .-]{2,})([ \t\r\n]*)\}\}/gi, '{{$1$2$3}}')
    .replace(/\{\{\{([ \t\r\n]*)([^}]+?)([ \t\r\n]*)\}\}\}/g, '{{$1$2$3}}');

  // Pase plano {{...}}: sustituye solo si hay valor
  let out = xmlBody.replace(/\{\{([^}]+)\}\}/g, (m, rawKey) => {
    const v = _lookup(rawKey, data);
    return (v === null) ? m : v;
  });

  // Pase laxo por cada clave (llaves intactas)
  const keys = Object.keys(data||{});
  for (const key of keys){
    const raw = data[key];
    if (raw == null || raw === '') continue;
    const val = xmlEscapeWithBreaks(String(raw));
    const variants = new Set([
      key,
      key.replace(/_/g,' '),
      key.replace(/_/g,''),
      _normKey(key),
      _normKey(key).replace(/_/g,' ')
    ]);
    for (const vKey of variants){
      const rx = _looseRxFor(vKey);
      out = out.replace(rx, val);
    }
  }

  // Pase ultra-laxo: permite TAMBIÉN que las llaves estén partidas por spans
  const between = '(?:\\s|<[^>]+>|&[^;]+;)*';
  const makeUltraLoose = (phrase) => {
    const letters = String(phrase).split('').map(ch => _escRe(ch)).join(between);
    const open = `\\{${between}\\{${between}(?:\\{${between})?`; // {{ o {{{
    const close = `\\}${between}\\}${between}(?:\\}${between})?`; // }} o }}}
    return new RegExp(`${open}${letters}${close}`, 'gi');
  };
  for (const key of keys){
    const raw = data[key];
    if (raw == null || raw === '') continue;
    const val = xmlEscapeWithBreaks(String(raw));
    const variants = new Set([
      key,
      key.replace(/_/g,' '),
      key.replace(/_/g,''),
      _normKey(key),
      _normKey(key).replace(/_/g,' ')
    ]);
    for (const vKey of variants){
      const ultra = makeUltraLoose(vKey);
      out = out.replace(ultra, val);
    }
  }

  // Rutas a.b[0].c — preservar si no hay valor
  out = out.replace(/\{\{([^}]+)\}\}/g, (m, rawKey) => {
    const key = rawKey.trim();
    const parts = key.replace(/\[(\d+)\]/g, '.$1').split('.');
    let cur = data;
    for (const p of parts) {
      if (!p) continue;
      if (cur == null) return m;
      cur = cur[p];
    }
    if (cur == null || cur === '') return m;
    return xmlEscapeWithBreaks(String(cur));
  });

  // ==== Limpieza final: borra cualquier placeholder restante (campo vacío) ====
  // 1) Placeholders intactos {{ ... }} → vacío
  out = out.replace(/\{\{\s*[^}]+\s*\}\}/g, '');

  // 2) Versión ultra-laxa: llaves y texto partidos por espacios/etiquetas/entidades
  //    Cubre casos de ODT donde <span> rompe las llaves o el texto interno
  (function(){
    const between = '(?:\\s|<[^>]+>|&[^;]+;)*';
    const ultraCleanup = new RegExp('\\{' + between + '\\{' + between + '[^}]+' + between + '\\}' + between + '\\}', 'gi');
    out = out.replace(ultraCleanup, '');
  })();

  return out;
}

// ===== ODT ZIP =====
function looksLikeZip(u8){ return u8 && u8.length >= 4 && u8[0] === 0x50 && u8[1] === 0x4B; } // 'PK'

async function renderOdtFromBuffer(buf, data){
  requireDeps();
  const bytes = new Uint8Array(buf);
  if (!looksLikeZip(bytes)) throw new Error('El archivo no parece un ODT (ZIP) válido');

  // Clona y enriquece data con alias
  const aug = Object.assign({}, data);

  // Unifica Instructor (input vivo → tmp → ya en data)
  const iaInput = ($('#inpInstructorActual')?.value || '').trim();
  const iaTmp   = (localStorage.getItem('instructorActualTmp') || '').trim();
  const iaData  = (aug['Instructor Actual'] || aug['Instructor'] || aug.INSTRUCTOR || aug.INSTRUCTOR_ACTUAL || aug.NUEVO_INSTRUCTOR || aug['instructor actual'] || aug.instructor || '');
  setInstructorAliases(aug, iaInput || iaTmp || iaData);

  // === DELITO en exportación ODT ===
  // - DETENIDO_DELITO: SOLO el de la filiación seleccionada (NUNCA copiar desde el global)
  if (aug.DETENIDO_DELITO) {
    aug.DETENIDO_DELITO = String(aug.DETENIDO_DELITO).toUpperCase();
  }
  // - Para documentos, {{DELITO}} debe reflejar el del detenido activo (evita mezclar con el global del expediente)
  aug.DELITO = (aug.DETENIDO_DELITO || '').toUpperCase();

  // ABOGADO alias típicos (si viene solo en una variante)
  const aboRaw = aug.ABOGADO_NOMBRE || aug.ABOGADO || aug.DETENIDO_ABOGADO || aug.LETRADO || aug.LETRADA || '';
  if (aboRaw) {
    if (!aug.ABOGADO_NOMBRE)   aug.ABOGADO_NOMBRE   = aboRaw;
    if (!aug.ABOGADO)          aug.ABOGADO          = aboRaw;
    if (!aug.DETENIDO_ABOGADO) aug.DETENIDO_ABOGADO = aboRaw;
    if (!aug.LETRADO)          aug.LETRADO          = aboRaw;
    if (!aug.LETRADA)          aug.LETRADA          = aboRaw;
  }

  // DILIGENCIAS alias
  const dilig = aug.DETENIDO_DILIGENCIAS || aug.DILIGENCIAS || aug.Diligencias;
  if (dilig) {
    if (!aug.DETENIDO_DILIGENCIAS) aug.DETENIDO_DILIGENCIAS = dilig;
    if (!aug.DILIGENCIAS)          aug.DILIGENCIAS          = dilig;
    if (!aug.Diligencias)          aug.Diligencias          = dilig;
  }

  // Fecha de generación por defecto
  if (!aug.FECHA_GENERACION) {
    const hoy = new Date();
    const dd = String(hoy.getDate()).padStart(2,'0');
    const mm = String(hoy.getMonth()+1).padStart(2,'0');
    const yyyy = hoy.getFullYear();
    aug.FECHA_GENERACION = `${dd}/${mm}/${yyyy}`;
  }

  const srcZip = await JSZip.loadAsync(bytes);

  // Reempaquetado ODT
  const out = new JSZip();
  const mimetypeEntry = srcZip.file('mimetype');
  const mimetypeStr = mimetypeEntry ? await mimetypeEntry.async('string') : 'application/vnd.oasis.opendocument.text';
  out.file('mimetype', mimetypeStr, { compression: 'STORE' });

  const allFiles = Object.keys(srcZip.files).filter(p => p !== 'mimetype');
  for (const path of allFiles){
    const f = srcZip.file(path);
    if (!f) continue;

    if (/\.xml$/i.test(path)) {
      const xml = await f.async('string');
      const replaced = replacePlaceholders(xml, aug);
      out.file(path, replaced);
    } else {
      out.file(path, await f.async('uint8array'));
    }
  }

  return out.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

// ===== CARGA ODT desde plantillas *.js (window.TEMPLATE_BODIES) =====
window.TEMPLATE_ODT_BUFFERS = window.TEMPLATE_ODT_BUFFERS || {};
window.base64ToArrayBuffer = function(b64){
  const bin = atob(b64);
  const len = bin.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
};

async function fetchOdtArrayBuffer(templateKey){
  if (TEMPLATE_ODT_BUFFERS[templateKey]) return TEMPLATE_ODT_BUFFERS[templateKey];

  // Cada plantilla_*.js define: window.TEMPLATE_BODIES[<key>] = { content: "<BASE64>" }
  const entry = window.TEMPLATE_BODIES && window.TEMPLATE_BODIES[templateKey];
  const b64 = entry && entry.content;

  if (!b64) {
    throw new Error(
      `Plantilla "${templateKey}" no cargada.\n` +
      `Incluye el script: <script src="./plantillas/${templateKey}.js"></script> ANTES de js/documentos.js\n` +
      `y define: window.TEMPLATE_BODIES.${templateKey} = { content: "<BASE64>" }`
    );
  }

  const buf = base64ToArrayBuffer(b64);
  TEMPLATE_ODT_BUFFERS[templateKey] = buf;
  return buf;
}

// ===== GENERACIÓN ODT =====
async function generarODT(templateKey, data){
  requireDeps();
  const buf = await fetchOdtArrayBuffer(templateKey);
  const blob = await renderOdtFromBuffer(buf, data);

  const algo = templateKey.replace(/^plantilla_/, '').replace(/_/g, ' ').trim();
  const nombre = (data.PERSONA_ACTIVA_NOMBRE_COMPLETO || '').trim();
  const outName = (algo ? (algo + (nombre ? ' ' + nombre : '')) : templateKey) + '.odt';

  saveAs(blob, outName);
}

// ===== PERSISTENCIA ABOGADO/JUZGADO/INSTRUCTOR =====
function persistAbogadoJuzgado(){
  const exp = loadExpediente();
  if(!exp) return;
  const root = getExpRoot(exp);

  root.Abogado = root.Abogado || {};
  root.Juzgado = root.Juzgado || {};

  const nomAbo = $('#abogadoNombre')?.value || '';
  const colAbo = $('#abogadoColegiado')?.value || '';
  const juzNom = $('#juzgadoInput')?.value || '';
  const fProc  = $('#fechaProcedimiento')?.value || '';
  const hProc  = $('#horaProcedimiento')?.value || '';
  const ia     = ($('#inpInstructorActual')?.value || localStorage.getItem('instructorActualTmp') || '').trim();

  root.Abogado.Nombre = nomAbo;
  root.Abogado.NumColegiado = colAbo;
  root.Abogado['Nº colegiado'] = colAbo;

  root.Juzgado.Nombre = juzNom;
  root.Juzgado.Fecha  = fProc;
  root.Juzgado.Hora   = hProc;

  if (ia) root['Instructor Actual'] = ia;

  persistExpediente(exp);
}

// ===== BOTÓN PRINCIPAL =====
function generarDocumentos(){
  (async()=>{
    try{
      const selected = getSelectedTemplates();
      if(!selected.length){
        showMessage('Selecciona al menos una plantilla.', false);
        return;
      }

      const sel = $('#personaActiva');
      const prevSel = sel ? sel.value : null;

      // Asegura persistencia previa
      persistAbogadoJuzgado();

      if (sel && prevSel !== null) {
        sel.value = prevSel;
      }

      const data = buildDataFromSelection();

      let ok = 0;
      for(const key of selected){
        try{
          await generarODT(key, data);
          ok++;
        }catch(err){
          console.error('Error en plantilla', key, err);
          showMessage(`Error generando ${key}: ${err.message}`, false);
        }
      }
      if (ok>0) showMessage(`Se generaron ${ok} documento(s).`, true);
    }catch(e){
      console.error(e);
      showMessage('Error al generar documentos: ' + (e?.message||e), false);
    }
  })();
}

// ===== INIT =====
function populateJuzgadoInputsFromExpediente(){
  const exp = loadExpediente(); if(!exp) return;
  const root = getExpRoot(exp);
  const ABO = root.Abogado || {};
  const JUZ = root.Juzgado || {};
  if($('#abogadoNombre'))     $('#abogadoNombre').value     = ABO.Nombre || $('#abogadoNombre').value || '';
  if($('#abogadoColegiado'))  $('#abogadoColegiado').value  = ABO.NumColegiado || ABO['Nº colegiado'] || $('#abogadoColegiado').value || '';
  if($('#juzgadoInput'))      $('#juzgadoInput').value      = JUZ.Nombre || $('#juzgadoInput').value || '';
  if($('#fechaProcedimiento'))$('#fechaProcedimiento').value= JUZ.Fecha  || $('#fechaProcedimiento').value || '';
  if($('#horaProcedimiento')) $('#horaProcedimiento').value = JUZ.Hora   || $('#horaProcedimiento').value || '';
}
function bindPersistInputs(){
  const ids = ['abogadoNombre','abogadoColegiado','juzgadoInput','fechaProcedimiento','horaProcedimiento','inpInstructorActual'];
  ids.forEach(id=>{
    const el = $('#'+id);
    if(!el) return;
    const h = ()=>persistAbogadoJuzgado();
    el.addEventListener('change', h);
    el.addEventListener('blur', h);
    if(id==='inpInstructorActual') el.addEventListener('input', ()=>localStorage.setItem('instructorActualTmp', el.value || ''));
  });
}
function initApp(){
  try{
    renderTemplateCheckboxes();
    populateJuzgados();
    wireBuscarColegiado();
    populatePersonaSelector();
    populateJuzgadoInputsFromExpediente();
    bindPersistInputs();
    showMessage('Aplicación lista ✅', true);

  }catch(e){
    console.error(e);
    showMessage('Error iniciando: ' + (e?.message||e), false);
  }
}
document.addEventListener('DOMContentLoaded', initApp);
