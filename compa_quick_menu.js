// === ESTILO VISUAL PARA LOS BOTONES DEL MENÚ RÁPIDO ===
(function(){
  const style = document.createElement('style');
  style.textContent = `
    #appQuickMenu .quick-btn{
      padding: 8px 12px;
      border-radius: 10px;
      font-weight: 700;
      cursor: pointer;
      transition: 
        box-shadow .25s ease,
        transform .25s ease,
        background .25s ease,
        border-color .25s ease;
    }

    #appQuickMenu .quick-btn:hover{
      transform: translateY(-1px);
    }

    .badge{
      cursor: pointer;
      user-select: none;
      transition: box-shadow .25s ease, transform .25s ease;
    }

    .badge:hover{
      transform: translateY(-1px);
      box-shadow: 0 0 25px rgba(225, 254, 0, 1);
    }

    .badge:active{
      transform: translateY(0);
      box-shadow: 0 0 36px rgba(221, 13, 13, 0.95);
    }
  `;
  document.head.appendChild(style);
})();
// BOTÓN PADRE DE GUIONES + COLETILLAS
(() => {
  const parent = document.getElementById('btnTools');
  const split  = document.getElementById('toolsSplit');
  const dash   = document.getElementById('childDash');
  const col    = document.getElementById('childCol');

  if (!parent || !split) return;

  parent.onclick = (ev) => {
    ev.stopPropagation?.();
    parent.classList.add('hidden');
    split.classList.remove('hidden');
    split.classList.add('show');
  };

  function closeSplit(){
    split.classList.remove('show');
    setTimeout(()=>{
      split.classList.add('hidden');
      parent.classList.remove('hidden');
    },250);
  }

  if (dash){
    dash.onclick = (ev) => {
      ev?.stopPropagation?.();
      try{
        if (typeof prefixParagraphs === 'function') {
          prefixParagraphs();
        }
      }catch(_){}
      closeSplit();
    };
  }

  if (col){
    col.onclick = (ev) => {
      ev?.stopPropagation?.();
      try{
        if (typeof openColetillas === 'function') {
          openColetillas();
        } else {
          const btn = document.getElementById('openColetillasBtn');
          if (btn) btn.click();
        }
      }catch(_){}
      closeSplit();
    };
  }

  // Cerrar al hacer click fuera
  document.addEventListener('click', (ev) => {
    try{
      const wrap = document.querySelector('.split-btn-wrap');
      if (!wrap) return;
      if (split.classList.contains('show') && !wrap.contains(ev.target)) {
        closeSplit();
      }
    }catch(_){}
  });
})();

// MENÚ RÁPIDO EN BADGE COMPA • POL
(() => {
  // Solo activar QuickMenu en la página principal de COMPA • POL (ODAC)
  const hostPanel = document.getElementById('panel-documento');
  if (!hostPanel) return;

  // Use .badge as toggle, and create panel if not present
  const toggle = document.querySelector('.badge');
  const panel = document.getElementById('appQuickMenu') || (function(){
    const p=document.createElement('div');
    p.id='appQuickMenu';
    p.style.position='fixed';
    p.style.top='56px';
    p.style.left='18px';
    p.style.zIndex='80';
    p.style.background='rgba(0, 0, 0, 0.96)';
    p.style.border='1px solid rgba(255,255,255,.15)';
    p.style.padding='8px';
    p.style.borderRadius='10px';
    p.style.display='none';
    p.style.flexDirection='column';
    p.style.gap='6px';
    document.body.appendChild(p);
    return p;
  })();
  if (!toggle || !panel) return;

  let isMenuOpen = false;

  function closeMenu(){
    panel.style.display = 'none';
    isMenuOpen = false;
  }
  function openMenu(){
    // Dynamic menu generation
    panel.innerHTML = `
      <button class="quick-btn" data-act="load"> Abrir 📂</button>
      <button class="quick-btn" data-act="save"> Guardar 💾</button>
      <button class="quick-btn" data-act="pdf"> PDF  📄</button>
      <button class="quick-btn" data-act="lexnet"> LexNET ⚙️</button>
      <button class="quick-btn" data-act="exit"> Salir ⏻</button>`;
    panel.onclick = (ev)=>{
      const act = ev.target.dataset.act;
      if (!act) return;

      // Menú rápido COMPA • POL: mismas acciones en cualquier HTML
      if (act === 'save'){
        const btn = document.getElementById('saveProjectBtn');
        if (btn) btn.click();
      }
      if (act === 'pdf'){
        const pdfBtn = document.querySelector('#pdfImportSlot button');
        if (pdfBtn) pdfBtn.click();
      }
      if (act === 'lexnet'){
        try{
          if (window.GenerarMacroDilipol && typeof window.GenerarMacroDilipol.copyFromMemory === 'function'){
            window.GenerarMacroDilipol.copyFromMemory();
          } else {
            alert('Macro LEXNET no disponible en esta página.');
          }
        }catch(e){
          console.error('Error al generar macro LEXNET', e);
          alert('No se pudo generar la macro LEXNET.');
        }
      }
      if (act === 'load'){
        const loadBtn = document.getElementById('loadProjectBtn');
        if (loadBtn) loadBtn.click();
      }
      if (act === 'exit'){
        const exitBtn = document.getElementById('exitBtn');
        if (exitBtn) exitBtn.click();
      }

      closeMenu();
    };

    // Posicionar siempre justo debajo del badge
    try{
      const rect = toggle.getBoundingClientRect();
      const marginY = 6;   // separación vertical
      const marginX = 0;   // ajuste horizontal básico
      panel.style.position = 'fixed';
      panel.style.top  = (rect.bottom + marginY) + 'px';
      panel.style.left = (rect.left + marginX) + 'px';
      panel.style.width = rect.width + 'px';
    }catch(_){}

    // Mostrar como columna
    panel.style.display = 'flex';
    isMenuOpen = true;

    // Corregir si se sale por la derecha de la ventana
    try{
      const vw = window.innerWidth || document.documentElement.clientWidth || 0;
      const pr = panel.getBoundingClientRect();
      if (pr.right > vw - 8){
        const overflow = pr.right - (vw - 8);
        let left = pr.left - overflow;
        if (left < 8) left = 8;
        panel.style.left = left + 'px';
      }
    }catch(_){}
  }
  function isOpen(){
    return isMenuOpen;
  }

  toggle.addEventListener('click', (ev)=>{
    ev.stopPropagation();
    if (isOpen()) closeMenu();
    else openMenu();
  });

  // Cerrar al hacer click fuera
  document.addEventListener('click', (ev)=>{
    if (!isOpen()) return;
    if (toggle.contains(ev.target) || panel.contains(ev.target)) return;
    closeMenu();
  });

  // Cerrar si el badge pierde el foco (blur)
  if (toggle) {
    toggle.addEventListener('blur', () => {
      setTimeout(() => {
        if (isOpen()) closeMenu();
      }, 80);
    });
  }

  // Auto-abrir QuickMenu si venimos de diligencias con el flag ?quickMenu=1
  try{
    if (location.search && location.search.indexOf('quickMenu=1') !== -1){
      setTimeout(() => {
        if (toggle) {
          toggle.click();
        }
      }, 300);
    }
  }catch(_){}
})();