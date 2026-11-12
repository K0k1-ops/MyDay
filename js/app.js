// =======================================================
// MYSELF — MOTOR PRINCIPAL (SINCRONIZACIÓN NUBE + LOCAL)
// =======================================================

let fechaActual = new Date();
let filtroCategoriaActual = 'todas';
const HORA_INICIO_GRID = 7;
const HORA_FIN_GRID = 23;
const GITHUB_RAW_BACKUP_URL = 'https://raw.githubusercontent.com/K0k1-ops/MyDay/main/myself_backup.json';

function getFechaHoyISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

document.addEventListener('DOMContentLoaded', () => {
  cargarBackupServidor();

  if (window.lucide) lucide.createIcons();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('SW registrado'))
      .catch(err => console.error('Error SW:', err));
  }

  inicializarTema();
  configurarFiltros();
  renderizarCalendario();
  renderizarHabitualesSidebar();
  autoScrollAHoraActual();
  inicializarPaletaComandos();

  setInterval(() => {
    renderizarIndicadorHoraActual();
  }, 30000);

  // --------------------------------------------------
  // A. EVENTOS DE CABECERA Y NAVEGACIÓN
  // --------------------------------------------------
  const btnPrev = document.getElementById('btn-prev-week');
  const btnNext = document.getElementById('btn-next-week');
  const btnToday = document.getElementById('btn-today');
  const btnAdd = document.getElementById('btn-add-task');
  const btnTheme = document.getElementById('btn-theme-toggle');

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      fechaActual.setDate(fechaActual.getDate() - 7);
      renderizarCalendario();
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      fechaActual.setDate(fechaActual.getDate() + 7);
      renderizarCalendario();
    });
  }

  if (btnToday) {
    btnToday.addEventListener('click', () => {
      fechaActual = new Date();
      renderizarCalendario();
      autoScrollAHoraActual();
    });
  }

  if (btnAdd) btnAdd.addEventListener('click', () => abrirModalTarea());

  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      const actual = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const nuevo = actual === 'dark' ? 'light' : 'dark';
      aplicarTema(nuevo);
    });
  }

  // --------------------------------------------------
  // B. ATAJOS DE TECLADO
  // --------------------------------------------------
  document.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const isTyping = activeEl.tagName === 'INPUT' || 
                     activeEl.tagName === 'TEXTAREA' || 
                     activeEl.tagName === 'SELECT' ||
                     activeEl.isContentEditable;

    if (e.key === 'Escape') {
      const modales = document.querySelectorAll('.modal-backdrop');
      modales.forEach(m => m.classList.add('hidden'));
      if (isTyping) activeEl.blur();
      return;
    }

    if (isTyping) return;

    switch (e.key.toLowerCase()) {
      case 'n':
        e.preventDefault();
        abrirModalTarea();
        break;
      case 't':
        e.preventDefault();
        fechaActual = new Date();
        renderizarCalendario();
        autoScrollAHoraActual();
        break;
      case 'arrowleft':
        e.preventDefault();
        fechaActual.setDate(fechaActual.getDate() - 7);
        renderizarCalendario();
        break;
      case 'arrowright':
        e.preventDefault();
        fechaActual.setDate(fechaActual.getDate() + 7);
        renderizarCalendario();
        break;
    }
  });

  // --------------------------------------------------
  // C. AUTOGUARDADO BLOC DE NOTAS
  // --------------------------------------------------
  const quickNotesArea = document.getElementById('desktop-quick-notes');
  const notesStatus = document.getElementById('notes-saved-status');

  if (quickNotesArea) {
    quickNotesArea.value = localStorage.getItem('myday_quick_notes') || '';
    let timeoutSave = null;
    quickNotesArea.addEventListener('input', () => {
      clearTimeout(timeoutSave);
      timeoutSave = setTimeout(() => {
        localStorage.setItem('myday_quick_notes', quickNotesArea.value);
        autosaveAlServidor();
        if (notesStatus) {
          notesStatus.style.opacity = '1';
          setTimeout(() => { notesStatus.style.opacity = '0'; }, 2000);
        }
      }, 500);
    });
  }

  // --------------------------------------------------
  // D. AJUSTES E IMPORTACIÓN / EXPORTACIÓN
  // --------------------------------------------------
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const modalSettings = document.getElementById('modal-settings');

  if (btnOpenSettings && modalSettings) {
    btnOpenSettings.addEventListener('click', () => modalSettings.classList.remove('hidden'));
  }
  if (btnCloseSettings && modalSettings) {
    btnCloseSettings.addEventListener('click', () => modalSettings.classList.add('hidden'));
  }

  const btnExport = document.getElementById('btn-export-json');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const backupData = {
        version: '11.0',
        timestamp: new Date().toISOString(),
        myday_tasks: localStorage.getItem('myday_tasks') || '[]',
        myday_habitual: localStorage.getItem('myday_habitual') || '[]',
        myday_quick_notes: localStorage.getItem('myday_quick_notes') || '',
        myday_theme: localStorage.getItem('myday_theme') || 'light',
        storage: { ...localStorage }
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const dl = document.createElement('a');
      dl.setAttribute("href", dataStr);
      dl.setAttribute("download", `myself_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(dl);
      dl.click();
      dl.remove();
    });
  }

  const inputImport = document.getElementById('input-import-json');
  if (inputImport) {
    inputImport.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const imported = JSON.parse(evt.target.result);
          if (imported.storage) {
            Object.keys(imported.storage).forEach(k => localStorage.setItem(k, imported.storage[k]));
          } else {
            Object.keys(imported).forEach(k => {
              if (typeof imported[k] === 'object') {
                localStorage.setItem(k, JSON.stringify(imported[k]));
              } else {
                localStorage.setItem(k, imported[k]);
              }
            });
          }
          autosaveAlServidor();
          alert('¡Sincronización completada!');
          window.location.reload();
        } catch (err) {
          alert('Error al importar el JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  const btnNotify = document.getElementById('btn-enable-notifications');
  if (btnNotify) {
    btnNotify.addEventListener('click', async () => {
      if (!('Notification' in window)) return alert('Navegador no compatible.');
      const perm = await Notification.requestPermission();
      if (perm === 'granted') new Notification('Myself PC', { body: 'Notificaciones activas.' });
    });
  }

  configurarModalTareaForm();
  configurarModalHabitualForm();
});

// =======================================================
// CARGAR Y SINCRONIZAR DATOS (LOCAL + GITHUB NUBE)
// =======================================================
async function cargarBackupServidor() {
  const cacheBust = `?t=${Date.now()}`;

  const fetchJsonSeguro = async (url) => {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  const [localData, githubData] = await Promise.all([
    fetchJsonSeguro(`/myself_backup.json${cacheBust}`),
    fetchJsonSeguro(`${GITHUB_RAW_BACKUP_URL}${cacheBust}`)
  ]);

  if (!localData && !githubData) {
    console.log('Usando datos de localStorage');
    return;
  }

  const tsLocal = localData && localData.timestamp ? new Date(localData.timestamp).getTime() : 0;
  const tsGithub = githubData && githubData.timestamp ? new Date(githubData.timestamp).getTime() : 0;

  const masReciente = tsGithub > tsLocal ? githubData : (localData || githubData);

  if (masReciente.myday_tasks) {
    localStorage.setItem(
      'myday_tasks',
      typeof masReciente.myday_tasks === 'string' ? masReciente.myday_tasks : JSON.stringify(masReciente.myday_tasks)
    );
  }
  if (masReciente.myday_habitual) {
    localStorage.setItem(
      'myday_habitual',
      typeof masReciente.myday_habitual === 'string' ? masReciente.myday_habitual : JSON.stringify(masReciente.myday_habitual)
    );
  }
  if (typeof masReciente.myday_quick_notes === 'string') {
    localStorage.setItem('myday_quick_notes', masReciente.myday_quick_notes);
    const notesEl = document.getElementById('desktop-quick-notes');
    if (notesEl) notesEl.value = masReciente.myday_quick_notes;
  }
  if (masReciente.myday_theme) {
    localStorage.setItem('myday_theme', masReciente.myday_theme);
  }

  if (tsGithub > tsLocal) {
    console.log('☁️ Sincronizado desde Jarvis / GitHub');
    autosaveAlServidor();
  }

  renderizarCalendario();
  renderizarHabitualesSidebar();
}

// =======================================================
// AUTO-GUARDADO AL SERVIDOR LOCAL (PYTHON API)
// =======================================================
function autosaveAlServidor() {
  const backupData = {
    version: '11.0',
    timestamp: new Date().toISOString(),
    myday_tasks: localStorage.getItem('myday_tasks') || '[]',
    myday_habitual: localStorage.getItem('myday_habitual') || '[]',
    myday_quick_notes: localStorage.getItem('myday_quick_notes') || '',
    myday_theme: localStorage.getItem('myday_theme') || 'light'
  };

  fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backupData)
  })
  .then(res => res.json())
  .then(data => console.log('📁 Auto-guardado en myself_backup.json:', data))
  .catch(err => console.warn('Servidor sin endpoint POST:', err));
}

// =======================================================
// MODO NOCHE & FILTROS
// =======================================================
function inicializarTema() {
  const temaGuardado = localStorage.getItem('myday_theme') || 'light';
  aplicarTema(temaGuardado);
}

function aplicarTema(tema) {
  document.documentElement.setAttribute('data-theme', tema);
  localStorage.setItem('myday_theme', tema);
  autosaveAlServidor();
  const btnTheme = document.getElementById('btn-theme-toggle');
  if (btnTheme) {
    btnTheme.innerText = tema === 'dark' ? '☀️' : '🌙';
  }
}

function configurarFiltros() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filtroCategoriaActual = btn.getAttribute('data-filter');
      renderizarCalendario();
    });
  });
}

// =======================================================
// HORA ACTUAL Y AUTO-SCROLL
// =======================================================
function autoScrollAHoraActual() {
  const gridBody = document.getElementById('calendar-grid-body');
  if (!gridBody) return;
  const ahora = new Date();
  const minActuales = ahora.getHours() * 60 + ahora.getMinutes();
  const minInicioGrid = HORA_INICIO_GRID * 60;
  
  if (minActuales >= minInicioGrid && minActuales <= HORA_FIN_GRID * 60) {
    const scrollPos = (minActuales - minInicioGrid) - 100;
    gridBody.scrollTop = Math.max(0, scrollPos);
  }
}

function renderizarIndicadorHoraActual() {
  const prevLine = document.querySelector('.current-time-line');
  if (prevLine) prevLine.remove();

  const hoyStr = getFechaHoyISO();
  const columnaHoy = document.querySelector(`.grid-day-column[data-date="${hoyStr}"]`);
  if (!columnaHoy) return;

  const ahora = new Date();
  const minActuales = ahora.getHours() * 60 + ahora.getMinutes();
  const minInicioGrid = HORA_INICIO_GRID * 60;

  if (minActuales >= minInicioGrid && minActuales <= (HORA_FIN_GRID + 1) * 60) {
    const topPx = minActuales - minInicioGrid;
    const timeLine = document.createElement('div');
    timeLine.className = 'current-time-line';
    timeLine.style.top = `${topPx}px`;

    const eventsLayer = columnaHoy.querySelector('.day-events-layer');
    if (eventsLayer) {
      eventsLayer.appendChild(timeLine);
    } else {
      columnaHoy.appendChild(timeLine);
    }
  }
}

// =======================================================
// ALGORITMO DE GESTIÓN DE SOLAPAMIENTOS
// =======================================================
function procesarSolapamientos(eventos) {
  if (!eventos || eventos.length === 0) return [];

  eventos.sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin));

  const clusters = [];
  let currentCluster = [];
  let clusterEnd = 0;

  eventos.forEach(ev => {
    if (currentCluster.length === 0) {
      currentCluster.push(ev);
      clusterEnd = ev.endMin;
    } else if (ev.startMin < clusterEnd) {
      currentCluster.push(ev);
      if (ev.endMin > clusterEnd) clusterEnd = ev.endMin;
    } else {
      clusters.push(currentCluster);
      currentCluster = [ev];
      clusterEnd = ev.endMin;
    }
  });
  if (currentCluster.length > 0) clusters.push(currentCluster);

  const resultado = [];
  clusters.forEach(cluster => {
    const columnas = [];

    cluster.forEach(ev => {
      let colAsignada = -1;
      for (let i = 0; i < columnas.length; i++) {
        if (columnas[i] <= ev.startMin) {
          colAsignada = i;
          columnas[i] = ev.endMin;
          break;
        }
      }
      if (colAsignada === -1) {
        colAsignada = columnas.length;
        columnas.push(ev.endMin);
      }
      ev.colIndex = colAsignada;
    });

    const totalCols = columnas.length;
    cluster.forEach(ev => {
      ev.totalCols = totalCols;
      resultado.push(ev);
    });
  });

  return resultado;
}

// =======================================================
// FUNCIONES AUXILIARES DE TIEMPO
// =======================================================
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}

function calcularHoraFinPorDefecto(horaInicioStr) {
  if (!horaInicioStr) return '10:00';
  const parts = horaInicioStr.split(':');
  let h = parseInt(parts[0], 10) + 1;
  if (h > 23) h = 23;
  return `${String(h).padStart(2, '0')}:${parts[1] || '00'}`;
}

function obtenerLunes(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

// =======================================================
// REJILLA SEMANAL CONTINUA + DRAG & DROP INTEGRADO
// =======================================================
function renderizarCalendario() {
  const gridHeader = document.getElementById('calendar-grid-header');
  const gridBody = document.getElementById('calendar-grid-body');
  if (!gridHeader || !gridBody) return;

  gridHeader.innerHTML = '';
  gridBody.innerHTML = '';

  const lunes = obtenerLunes(fechaActual);
  const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const fechasSemana = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    fechasSemana.push(d);
  }

  const hoyStr = new Date().toISOString().slice(0, 10);

  const emptyCorner = document.createElement('div');
  emptyCorner.className = 'grid-header-cell';
  emptyCorner.style.fontWeight = '700';
  emptyCorner.innerText = 'Hora';
  gridHeader.appendChild(emptyCorner);

  fechasSemana.forEach((fecha, idx) => {
    const fechaStr = fecha.toISOString().slice(0, 10);
    const esHoy = fechaStr === hoyStr;
    const esPasado = fechaStr < hoyStr;

    const headerDia = document.createElement('div');
    headerDia.className = `grid-header-cell ${esHoy ? 'is-today' : ''} ${esPasado ? 'is-past' : ''}`;
    headerDia.innerHTML = `
      <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">${diasSemana[idx]}</div>
      <div style="font-size: 1rem; font-weight: 800; margin-top:2px;">${fecha.getDate()}</div>
    `;
    gridHeader.appendChild(headerDia);
  });

  const timeColumn = document.createElement('div');
  timeColumn.className = 'grid-time-column';
  for (let h = HORA_INICIO_GRID; h <= HORA_FIN_GRID; h++) {
    const slot = document.createElement('div');
    slot.className = 'grid-time-slot';
    slot.innerText = `${String(h).padStart(2, '0')}:00`;
    timeColumn.appendChild(slot);
  }
  gridBody.appendChild(timeColumn);

  const tareas = JSON.parse(localStorage.getItem('myday_tasks') || '[]');
  const habituales = JSON.parse(localStorage.getItem('myday_habitual') || '[]');
  const minInicioGrid = HORA_INICIO_GRID * 60;

  fechasSemana.forEach((fecha) => {
    const fechaISO = fecha.toISOString().slice(0, 10);
    const dayOfWeek = fecha.getDay();
    const esPasado = fechaISO < hoyStr;

    const dayColumn = document.createElement('div');
    dayColumn.className = `grid-day-column ${esPasado ? 'is-past' : ''}`;
    dayColumn.setAttribute('data-date', fechaISO);

    dayColumn.addEventListener('dragover', (e) => {
      e.preventDefault();
      dayColumn.classList.add('drag-over');
    });

    dayColumn.addEventListener('dragleave', () => {
      dayColumn.classList.remove('drag-over');
    });

    dayColumn.addEventListener('drop', (e) => {
      e.preventDefault();
      dayColumn.classList.remove('drag-over');

      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;

      try {
        const payload = JSON.parse(rawData);
        const rect = dayColumn.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;

        let dropMin = minInicioGrid + offsetY;
        dropMin = Math.round(dropMin / 15) * 15;

        const maxStart = HORA_FIN_GRID * 60 - payload.durationMin;
        if (dropMin < minInicioGrid) dropMin = minInicioGrid;
        if (dropMin > maxStart) dropMin = maxStart;

        const newEndMin = dropMin + payload.durationMin;

        const formatMinToStr = (m) => {
          const h = Math.floor(m / 60);
          const mins = m % 60;
          return `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        };

        const newStartStr = formatMinToStr(dropMin);
        const newEndStr = formatMinToStr(newEndMin);

        if (payload.type === 'task') {
          let tList = JSON.parse(localStorage.getItem('myday_tasks') || '[]');
          const idx = tList.findIndex(t => t.id === payload.id);
          if (idx !== -1) {
            tList[idx].date = fechaISO;
            tList[idx].startTime = newStartStr;
            tList[idx].endTime = newEndStr;
            tList[idx].time = newStartStr;
            localStorage.setItem('myday_tasks', JSON.stringify(tList));
            autosaveAlServidor();
            renderizarCalendario();
          }
        } else if (payload.type === 'habitual') {
          let hList = JSON.parse(localStorage.getItem('myday_habitual') || '[]');
          const idx = hList.findIndex(h => h.id === payload.id);
          if (idx !== -1) {
            hList[idx].startTime = newStartStr;
            hList[idx].endTime = newEndStr;
            localStorage.setItem('myday_habitual', JSON.stringify(hList));
            autosaveAlServidor();
            renderizarHabitualesSidebar();
            renderizarCalendario();
          }
        }
      } catch (err) {
        console.error('Error al procesar soltado de tarea:', err);
      }
    });

    for (let h = HORA_INICIO_GRID; h <= HORA_FIN_GRID; h++) {
      const bgSlot = document.createElement('div');
      bgSlot.className = 'grid-hour-bg-slot';
      const horaStr = `${String(h).padStart(2, '0')}:00`;
      const horaFinSlot = `${String(h + 1).padStart(2, '0')}:00`;

      bgSlot.onclick = () => abrirModalTarea({ date: fechaISO, startTime: horaStr, endTime: horaFinSlot });
      dayColumn.appendChild(bgSlot);
    }

    const eventsLayer = document.createElement('div');
    eventsLayer.className = 'day-events-layer';

    const eventosDia = [];

    if (filtroCategoriaActual === 'todas' || filtroCategoriaActual === 'rutinas') {
      const habs = habituales.filter(hab => hab.days && hab.days.map(String).includes(String(dayOfWeek)));
      habs.forEach(hab => {
        const startMin = timeToMinutes(hab.startTime || '10:00');
        const endMin = timeToMinutes(hab.endTime || '11:00');
        if (endMin > startMin) {
          eventosDia.push({
            type: 'habitual',
            title: hab.title,
            startTime: hab.startTime || '10:00',
            endTime: hab.endTime || '11:00',
            startMin,
            endMin,
            raw: hab
          });
        }
      });
    }

    if (filtroCategoriaActual !== 'rutinas') {
      let ts = tareas.filter(t => t.date === fechaISO);
      if (filtroCategoriaActual !== 'todas') {
        ts = ts.filter(t => (t.category || 'personal') === filtroCategoriaActual);
      }
      ts.forEach(t => {
        const sTime = t.startTime || t.time || '09:00';
        const eTime = t.endTime || calcularHoraFinPorDefecto(sTime);
        const startMin = timeToMinutes(sTime);
        const endMin = timeToMinutes(eTime);
        if (endMin > startMin) {
          eventosDia.push({
            type: 'task',
            category: t.category || 'personal',
            completed: t.completed,
            title: t.title,
            description: t.description || '',
            startTime: sTime,
            endTime: eTime,
            startMin,
            endMin,
            raw: t
          });
        }
      });
    }

    const eventosProcesados = procesarSolapamientos(eventosDia);

    eventosProcesados.forEach(ev => {
      const topPx = Math.max(0, ev.startMin - minInicioGrid);
      const heightPx = ev.endMin - ev.startMin;

      if (heightPx > 0) {
        let catClass = 'habitual';
        if (ev.type === 'task') {
          catClass = ev.category === 'estudios' ? 'cat-estudios' : 'cat-personal';
          if (ev.completed) catClass += ' completed';
        }

        const item = document.createElement('div');
        item.className = `task-card-item ${catClass}`;
        item.style.top = `${topPx}px`;
        item.style.height = `${heightPx}px`;

        const widthPct = 100 / ev.totalCols;
        const leftPct = widthPct * ev.colIndex;
        item.style.left = `calc(${leftPct}% + 2px)`;
        item.style.width = `calc(${widthPct}% - 4px)`;

        item.setAttribute('draggable', 'true');
        item.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', JSON.stringify({
            id: ev.raw.id,
            type: ev.type,
            durationMin: ev.endMin - ev.startMin
          }));
          item.classList.add('dragging');
        });
        item.addEventListener('dragend', () => {
          item.classList.remove('dragging');
        });

        const escapeHTML = (str) => String(str || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');

        const prefix = ev.type === 'habitual' ? '🔄' : (ev.category === 'estudios' ? '📚' : '👤');
        const isChecked = ev.completed ? '✓' : '';
        const tieneDesc = Boolean(ev.description && ev.description.trim());

        if (tieneDesc) {
          item.title = `${ev.title} (${ev.startTime} - ${ev.endTime})\n📝 ${ev.description}`;
        }

        const descEnTarjeta = (tieneDesc && heightPx >= 45)
          ? `<div style="font-size:0.72rem; opacity:0.88; margin-top:3px; line-height:1.25; display:-webkit-box; -webkit-line-clamp:${heightPx >= 90 ? 3 : 1}; -webkit-box-orient:vertical; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(ev.description)}</div>`
          : '';

        item.innerHTML = `
          <div style="display:flex; align-items:center; gap:4px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${ev.type === 'task' ? `<span class="task-check-btn" title="Completar">${isChecked}</span>` : ''}
            <span>${prefix} ${escapeHTML(ev.title)}</span>
          </div>
          <div style="font-size:0.7rem; opacity:0.9; margin-top:2px;">${ev.startTime} - ${ev.endTime}${tieneDesc && heightPx < 45 ? ' · 📝' : ''}</div>
          ${descEnTarjeta}
        `;

        const checkBtn = item.querySelector('.task-check-btn');
        if (checkBtn) {
          checkBtn.onclick = (e) => {
            e.stopPropagation();
            let tList = JSON.parse(localStorage.getItem('myday_tasks') || '[]');
            const idx = tList.findIndex(t => t.id === ev.raw.id);
            if (idx !== -1) {
              tList[idx].completed = !tList[idx].completed;
              localStorage.setItem('myday_tasks', JSON.stringify(tList));
              autosaveAlServidor();
              renderizarCalendario();
            }
          };
        }

        item.onclick = (e) => {
          e.stopPropagation();
          if (ev.type === 'habitual') abrirModalHabitual(ev.raw);
          else abrirModalTarea(ev.raw);
        };

        eventsLayer.appendChild(item);
      }
    });

    dayColumn.appendChild(eventsLayer);
    gridBody.appendChild(dayColumn);
  });

  renderizarIndicadorHoraActual();
}

// =======================================================
// GESTIÓN DE RUTINAS HABITUALES
// =======================================================
function renderizarHabitualesSidebar() {
  const listContainer = document.getElementById('side-habitual-list');
  if (!listContainer) return;

  const habituales = JSON.parse(localStorage.getItem('myday_habitual') || '[]');

  if (habituales.length === 0) {
    listContainer.innerHTML = '<p style="color:var(--text-secondary); font-size:0.8rem;">No tienes rutinas programadas.</p>';
    return;
  }

  const nombresDias = { "1": "Lun", "2": "Mar", "3": "Mié", "4": "Jue", "5": "Vie", "6": "Sáb", "0": "Dom" };

  listContainer.innerHTML = habituales.map(h => {
    const diasTxt = (h.days || []).map(d => nombresDias[String(d)] || d).join(', ') || 'Sin días';
    return `
      <div style="background:var(--bg-primary); border:1px solid var(--border-color); padding:8px 10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="abrirModalHabitualDirecto('${h.id}')">
        <div>
          <div style="font-weight:700; color:var(--text-primary);">${h.title}</div>
          <div style="font-size:0.75rem; color:var(--text-secondary);">${diasTxt} | ${h.startTime || '10:00'} - ${h.endTime || '11:00'}</div>
        </div>
        <span style="font-size:0.85rem; color:var(--accent-primary);">✏️</span>
      </div>
    `;
  }).join('');
}

function abrirModalHabitualDirecto(id) {
  const habituales = JSON.parse(localStorage.getItem('myday_habitual') || '[]');
  const hab = habituales.find(x => x.id === id);
  if (hab) abrirModalHabitual(hab);
}

function abrirModalHabitual(habitualExistente = {}) {
  const modal = document.getElementById('modal-habitual');
  const titleHeader = document.getElementById('modal-habitual-header-title');
  const inputId = document.getElementById('habitual-id');
  const inputTitle = document.getElementById('habitual-title-input');
  const inputStart = document.getElementById('habitual-start-input');
  const inputEnd = document.getElementById('habitual-end-input');
  const btnDelete = document.getElementById('btn-delete-habitual');
  const dayCheckboxes = document.querySelectorAll('input[name="habitual-day"]');

  if (!modal) return;

  dayCheckboxes.forEach(cb => cb.checked = false);

  if (habitualExistente.id) {
    titleHeader.innerText = "Editar Rutina Habitual";
    inputId.value = habitualExistente.id;
    inputTitle.value = habitualExistente.title || '';
    inputStart.value = habitualExistente.startTime || '10:00';
    inputEnd.value = habitualExistente.endTime || '11:00';
    
    (habitualExistente.days || []).forEach(dayVal => {
      const targetCb = document.querySelector(`input[name="habitual-day"][value="${dayVal}"]`);
      if (targetCb) targetCb.checked = true;
    });

    btnDelete.style.display = 'block';
  } else {
    titleHeader.innerText = "Nueva Rutina Habitual";
    inputId.value = '';
    inputTitle.value = '';
    inputStart.value = '10:00';
    inputEnd.value = '11:00';
    ['1', '2', '3', '4', '5'].forEach(dayVal => {
      const targetCb = document.querySelector(`input[name="habitual-day"][value="${dayVal}"]`);
      if (targetCb) targetCb.checked = true;
    });
    btnDelete.style.display = 'none';
  }

  modal.classList.remove('hidden');
  setTimeout(() => inputTitle.focus(), 100);
}

function configurarModalHabitualForm() {
  const modalBtn = document.getElementById('btn-open-habitual-modal');
  const modal = document.getElementById('modal-habitual');
  const btnClose = document.getElementById('btn-close-habitual-modal');
  const btnCancel = document.getElementById('btn-cancel-habitual');
  const btnDelete = document.getElementById('btn-delete-habitual');
  const form = document.getElementById('form-habitual');

  const cerrar = () => modal.classList.add('hidden');

  if (modalBtn) modalBtn.onclick = () => abrirModalHabitual();
  if (btnClose) btnClose.onclick = cerrar;
  if (btnCancel) btnCancel.onclick = cerrar;

  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const id = document.getElementById('habitual-id').value;
      const title = document.getElementById('habitual-title-input').value.trim();
      const startTime = document.getElementById('habitual-start-input').value;
      const endTime = document.getElementById('habitual-end-input').value;
      const selectedDays = Array.from(document.querySelectorAll('input[name="habitual-day"]:checked')).map(cb => cb.value);

      if (!title || selectedDays.length === 0) {
        alert('Por favor añade un título y selecciona al menos un día.');
        return;
      }

      let habituales = JSON.parse(localStorage.getItem('myday_habitual') || '[]');

      if (id) {
        const idx = habituales.findIndex(h => h.id === id);
        if (idx !== -1) {
          habituales[idx] = { id, title, days: selectedDays, startTime, endTime };
        }
      } else {
        habituales.push({
          id: Date.now().toString(),
          title,
          days: selectedDays,
          startTime,
          endTime
        });
      }

      localStorage.setItem('myday_habitual', JSON.stringify(habituales));
      autosaveAlServidor();
      cerrar();
      renderizarHabitualesSidebar();
      renderizarCalendario();
    };
  }

  if (btnDelete) {
    btnDelete.onclick = () => {
      const id = document.getElementById('habitual-id').value;
      if (!id) return;

      let habituales = JSON.parse(localStorage.getItem('myday_habitual') || '[]');
      habituales = habituales.filter(h => h.id !== id);

      localStorage.setItem('myday_habitual', JSON.stringify(habituales));
      autosaveAlServidor();
      cerrar();
      renderizarHabitualesSidebar();
      renderizarCalendario();
    };
  }
}

// =======================================================
// MODAL TAREA PUNTUAL
// =======================================================
function abrirModalTarea(tareaExistente = {}) {
  const modal = document.getElementById('modal-task');
  const modalTitle = document.getElementById('modal-task-header-title');
  const inputId = document.getElementById('task-id');
  const inputTitle = document.getElementById('task-title-input');
  const inputDesc = document.getElementById('task-desc-input');
  const inputCategory = document.getElementById('task-category-input');
  const inputDate = document.getElementById('task-date-input');
  const inputStart = document.getElementById('task-start-input');
  const inputEnd = document.getElementById('task-end-input');
  const btnDelete = document.getElementById('btn-delete-task');
  const quickDaysContainer = document.getElementById('task-quick-days-container');

  if (!modal) return;

  const hoyStr = new Date().toISOString().slice(0, 10);
  const fechaSeleccionada = tareaExistente.date || hoyStr;
  const startDefault = tareaExistente.startTime || tareaExistente.time || '09:00';
  const endDefault = tareaExistente.endTime || calcularHoraFinPorDefecto(startDefault);

  if (quickDaysContainer) {
    quickDaysContainer.innerHTML = '';
    const lunes = obtenerLunes(fechaActual);
    const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      const dateISO = d.toISOString().slice(0, 10);

      const chip = document.createElement('div');
      chip.className = 'day-chip';
      if (dateISO === fechaSeleccionada) {
        chip.style.background = 'var(--accent-primary)';
        chip.style.color = '#ffffff';
        chip.style.borderColor = 'var(--accent-primary)';
      }

      chip.innerHTML = `
        <span style="font-size:0.7rem; text-transform:uppercase;">${diasSemana[i]}</span>
        <span style="font-size:0.85rem; font-weight:800;">${d.getDate()}</span>
      `;

      chip.onclick = () => {
        inputDate.value = dateISO;
        Array.from(quickDaysContainer.children).forEach(c => {
          c.style.background = 'var(--bg-primary)';
          c.style.color = 'var(--text-primary)';
          c.style.borderColor = 'var(--border-color)';
        });
        chip.style.background = 'var(--accent-primary)';
        chip.style.color = '#ffffff';
        chip.style.borderColor = 'var(--accent-primary)';
      };

      quickDaysContainer.appendChild(chip);
    }
  }

  if (tareaExistente.id) {
    modalTitle.innerText = "Editar Tarea";
    inputId.value = tareaExistente.id;
    inputTitle.value = tareaExistente.title || '';
    if (inputDesc) inputDesc.value = tareaExistente.description || '';
    if (inputCategory) inputCategory.value = tareaExistente.category || 'personal';
    inputDate.value = fechaSeleccionada;
    inputStart.value = startDefault;
    inputEnd.value = endDefault;
    btnDelete.style.display = 'block';
  } else {
    modalTitle.innerText = "Nueva Tarea";
    inputId.value = '';
    inputTitle.value = '';
    if (inputDesc) inputDesc.value = '';
    if (inputCategory) inputCategory.value = 'personal';
    inputDate.value = fechaSeleccionada;
    inputStart.value = startDefault;
    inputEnd.value = endDefault;
    btnDelete.style.display = 'none';
  }

  modal.classList.remove('hidden');
  setTimeout(() => inputTitle.focus(), 100);
}

function configurarModalTareaForm() {
  const modal = document.getElementById('modal-task');
  const form = document.getElementById('form-task');
  const btnClose = document.getElementById('btn-close-task-modal');
  const btnCancel = document.getElementById('btn-cancel-task');
  const btnDelete = document.getElementById('btn-delete-task');

  const cerrarModal = () => modal.classList.add('hidden');

  if (btnClose) btnClose.onclick = cerrarModal;
  if (btnCancel) btnCancel.onclick = cerrarModal;

  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const id = document.getElementById('task-id').value;
      const title = document.getElementById('task-title-input').value.trim();
      const description = document.getElementById('task-desc-input') ? document.getElementById('task-desc-input').value.trim() : '';
      const category = document.getElementById('task-category-input') ? document.getElementById('task-category-input').value : 'personal';
      const date = document.getElementById('task-date-input').value;
      const startTime = document.getElementById('task-start-input').value;
      const endTime = document.getElementById('task-end-input').value;

      if (!title || !date) {
        alert('Por favor introduce un título y una fecha.');
        return;
      }

      let tareas = JSON.parse(localStorage.getItem('myday_tasks') || '[]');

      if (id) {
        const idx = tareas.findIndex(t => t.id === id);
        if (idx !== -1) {
          tareas[idx] = { ...tareas[idx], title, description, category, date, startTime, endTime, time: startTime };
        }
      } else {
        tareas.push({
          id: Date.now().toString(),
          title,
          description,
          category,
          date,
          startTime,
          endTime,
          time: startTime,
          completed: false
        });
      }

      localStorage.setItem('myday_tasks', JSON.stringify(tareas));
      autosaveAlServidor();
      cerrarModal();
      renderizarCalendario();
    };
  }

  if (btnDelete) {
    btnDelete.onclick = () => {
      const id = document.getElementById('task-id').value;
      if (!id) return;

      let tareas = JSON.parse(localStorage.getItem('myday_tasks') || '[]');
      tareas = tareas.filter(t => t.id !== id);

      localStorage.setItem('myday_tasks', JSON.stringify(tareas));
      autosaveAlServidor();
      cerrarModal();
      renderizarCalendario();
    };
  }
}

// =======================================================
// PALETA DE COMANDOS FLOTANTE (CTRL + K)
// =======================================================
function inicializarPaletaComandos() {
  if (document.getElementById('command-palette-backdrop')) return;

  const paletteContainer = document.createElement('div');
  paletteContainer.id = 'command-palette-backdrop';
  paletteContainer.className = 'modal-backdrop hidden';
  paletteContainer.innerHTML = `
    <div class="command-palette-modal" style="background:var(--bg-primary, #1e1e1e); border:1px solid var(--border-color, #444); border-radius:12px; width:90%; max-width:550px; margin:10vh auto; padding:16px; box-shadow:0 20px 40px rgba(0,0,0,0.5); color:var(--text-primary, #ffffff); position:relative;">
      <div style="display:flex; align-items:center; gap:10px; border-bottom:1px solid var(--border-color, #333); padding-bottom:10px;">
        <span style="font-size:1.2rem;">🔍</span>
        <input type="text" id="cmd-input" placeholder="Buscar tarea, rutina o comando..." style="width:100%; border:none; outline:none; background:transparent; font-size:1rem; color:inherit;" />
        <kbd style="font-size:0.75rem; background:var(--bg-secondary, #333); color:var(--text-primary, #fff); padding:2px 6px; border-radius:4px;">ESC</kbd>
        <button id="cmd-btn-close" type="button" style="background:transparent; border:none; color:var(--text-secondary, #aaa); font-size:1.4rem; cursor:pointer; padding:0 4px; line-height:1;" title="Cerrar (Esc)">&times;</button>
      </div>
      <div id="cmd-results" style="max-height:300px; overflow-y:auto; margin-top:10px; display:flex; flex-direction:column; gap:6px;">
      </div>
    </div>
  `;
  document.body.appendChild(paletteContainer);

  const backdrop = document.getElementById('command-palette-backdrop');
  const input = document.getElementById('cmd-input');
  const results = document.getElementById('cmd-results');
  const btnClose = document.getElementById('cmd-btn-close');

  const abrirPaleta = () => {
    backdrop.classList.remove('hidden');
    input.value = '';
    renderResultados('');
    setTimeout(() => input.focus(), 50);
  };

  const cerrarPaleta = () => {
    backdrop.classList.add('hidden');
  };

  if (btnClose) {
    btnClose.onclick = (e) => {
      e.stopPropagation();
      cerrarPaleta();
    };
  }

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (backdrop.classList.contains('hidden')) abrirPaleta();
      else cerrarPaleta();
    }
  });

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) cerrarPaleta();
  });

  input.addEventListener('input', () => {
    renderResultados(input.value.trim().toLowerCase());
  });

  function renderResultados(query) {
    results.innerHTML = '';
    const tareas = JSON.parse(localStorage.getItem('myday_tasks') || '[]');
    const habituales = JSON.parse(localStorage.getItem('myday_habitual') || '[]');

    const comandosBase = [
      { icon: '➕', title: 'Crear nueva tarea', action: () => { cerrarPaleta(); abrirModalTarea(); } },
      { icon: '🔄', title: 'Crear nueva rutina habitual', action: () => { cerrarPaleta(); abrirModalHabitual(); } },
      { icon: '📅', title: 'Ir a Hoy', action: () => { cerrarPaleta(); fechaActual = new Date(); renderizarCalendario(); autoScrollAHoraActual(); } },
      { icon: '🌙', title: 'Alternar Tema (Claro/Oscuro)', action: () => { cerrarPaleta(); const a = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; aplicarTema(a === 'dark' ? 'light' : 'dark'); } }
    ];

    const cmdsFiltrados = comandosBase.filter(c => c.title.toLowerCase().includes(query));
    cmdsFiltrados.forEach(c => {
      const item = document.createElement('div');
      item.style.cssText = 'padding:10px 14px; border-radius:6px; cursor:pointer; background:var(--bg-secondary, #2a2a2a); color:var(--text-primary, #ffffff); font-weight:600; font-size:0.9rem; display:flex; align-items:center; gap:10px; margin-bottom:4px;';
      item.innerHTML = `<span style="font-size:1.1rem; width:20px; text-align:center;">${c.icon}</span><span>${c.title}</span>`;
      item.onclick = c.action;
      results.appendChild(item);
    });

    if (query.length > 0) {
      const tareasCoincidentes = tareas.filter(t =>
        t.title.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query))
      );
      tareasCoincidentes.forEach(t => {
        const item = document.createElement('div');
        item.style.cssText = 'padding:10px 14px; border-radius:6px; cursor:pointer; border:1px solid var(--border-color, #444); color:var(--text-primary, #ffffff); background:var(--bg-primary, #1e1e1e); display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:4px;';
        const descPreview = t.description ? `<div style="font-size:0.75rem; opacity:0.75; margin-top:2px;">${t.description}</div>` : '';
        item.innerHTML = `<div><div>📌 ${t.title}</div>${descPreview}</div><small style="opacity:0.7; white-space:nowrap;">${t.date || 'Tarea'}</small>`;
        item.onclick = () => { cerrarPaleta(); abrirModalTarea(t); };
        results.appendChild(item);
      });
    }
  }
}