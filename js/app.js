// =======================================================
// MYSELF — MOTOR PRINCIPAL DE ESCRITORIO CON REJILLA SEMANAL
// =======================================================

let fechaActual = new Date(); // Controla la semana visible

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inicialización de iconos
  if (window.lucide) {
    lucide.createIcons();
  }

  // 2. Registro del Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('SW registrado'))
      .catch(err => console.error('Error SW:', err));
  }

  // 3. Renderizar el calendario por primera vez
  renderizarCalendario();

  // --------------------------------------------------
  // A. BOTONES DE NAVEGACIÓN DE FECHAS
  // --------------------------------------------------
  const btnPrev = document.getElementById('btn-prev-week');
  const btnNext = document.getElementById('btn-next-week');
  const btnToday = document.getElementById('btn-today');
  const btnAdd = document.getElementById('btn-add-task');

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
    });
  }

  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      crearNuevaTareaPrompt();
    });
  }

  // --------------------------------------------------
  // B. ATAJOS DE TECLADO
  // --------------------------------------------------
  document.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const isTyping = activeEl.tagName === 'INPUT' || 
                     activeEl.tagName === 'TEXTAREA' || 
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
        crearNuevaTareaPrompt();
        break;
      case 't':
        e.preventDefault();
        fechaActual = new Date();
        renderizarCalendario();
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
  // C. AUTOGUARDADO DEL BLOC DE NOTAS
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
        if (notesStatus) {
          notesStatus.style.opacity = '1';
          setTimeout(() => { notesStatus.style.opacity = '0'; }, 2000);
        }
      }, 500);
    });
  }

  // --------------------------------------------------
  // D. AJUSTES Y NOTIFICACIONES
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
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ ...localStorage }, null, 2));
      const dl = document.createElement('a');
      dl.setAttribute("href", dataStr);
      dl.setAttribute("download", `myself_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(dl);
      dl.click();
      dl.remove();
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

  iniciarComprobadorNotificaciones();
});

// =======================================================
// RENDERIZADOR DE LA REJILLA SEMANAL
// =======================================================
function obtenerLunes(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function renderizarCalendario() {
  const grid = document.getElementById('calendar-grid');
  if (!grid) return;

  grid.innerHTML = '';

  const lunes = obtenerLunes(fechaActual);
  const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const fechasSemana = [];

  // Calcular las 7 fechas de la semana
  for (let i = 0; i < 7; i++) {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    fechasSemana.push(d);
  }

  const hoyStr = new Date().toISOString().slice(0, 10);

  // 1. Fila de Encabezados (Hora + 7 Días)
  const headerHora = document.createElement('div');
  headerHora.style.cssText = 'padding: 12px; font-size: 0.75rem; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0; text-align: center; background: #f8fafc;';
  headerHora.innerText = 'Hora';
  grid.appendChild(headerHora);

  fechasSemana.forEach((fecha, idx) => {
    const fechaStr = fecha.toISOString().slice(0, 10);
    const esHoy = fechaStr === hoyStr;
    const headerDia = document.createElement('div');
    headerDia.style.cssText = `padding: 10px; text-align: center; border-bottom: 2px solid #e2e8f0; background: ${esHoy ? '#eff6ff' : '#f8fafc'}; border-left: 1px solid #f1f5f9;`;
    headerDia.innerHTML = `
      <div style="font-size: 0.75rem; font-weight: 700; color: ${esHoy ? '#2563eb' : '#64748b'}; text-transform: uppercase;">${diasSemana[idx]}</div>
      <div style="font-size: 1rem; font-weight: 800; color: ${esHoy ? '#1d4ed8' : '#0f172a'};">${fecha.getDate()}</div>
    `;
    grid.appendChild(headerDia);
  });

  // 2. Cargar tareas guardadas
  const tareas = JSON.parse(localStorage.getItem('myday_tasks') || '[]');

  // 3. Filas de Horas (De 07:00 a 23:00)
  for (let h = 7; h <= 23; h++) {
    const horaStr = `${String(h).padStart(2, '0')}:00`;

    // Etiqueta de Hora
    const cellHora = document.createElement('div');
    cellHora.style.cssText = 'padding: 8px; font-size: 0.75rem; font-weight: 600; color: #94a3b8; text-align: center; border-bottom: 1px solid #f1f5f9; background: #fafafa;';
    cellHora.innerText = horaStr;
    grid.appendChild(cellHora);

    // 7 Celdas de días para esta hora
    fechasSemana.forEach((fecha) => {
      const fechaISO = fecha.toISOString().slice(0, 10);
      const cell = document.createElement('div');
      cell.style.cssText = 'min-height: 48px; border-bottom: 1px solid #f1f5f9; border-left: 1px solid #f1f5f9; padding: 4px; position: relative; transition: background 0.2s;';

      // Filtrar tareas que corresponden a esta fecha y hora
      const tareasSlot = tareas.filter(t => t.date === fechaISO && t.time && t.time.startsWith(String(h).padStart(2, '0')));

      tareasSlot.forEach(t => {
        const item = document.createElement('div');
        item.style.cssText = `background: ${t.completed ? '#e2e8f0' : '#dbeafe'}; border-left: 3px solid ${t.completed ? '#94a3b8' : '#2563eb'}; padding: 4px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; color: ${t.completed ? '#64748b' : '#1e40af'}; margin-bottom: 4px; cursor: pointer; text-decoration: ${t.completed ? 'line-through' : 'none'};`;
        item.innerText = `${t.time} ${t.title}`;
        item.onclick = (e) => {
          e.stopPropagation();
          t.completed = !t.completed;
          localStorage.setItem('myday_tasks', JSON.stringify(tareas));
          renderizarCalendario();
        };
        cell.appendChild(item);
      });

      // Click en la celda para añadir tarea rápida en esa fecha/hora
      cell.onclick = () => crearNuevaTareaPrompt(fechaISO, horaStr);
      grid.appendChild(cell);
    });
  }

  actualizarListaPendientes(tareas);
}

// =======================================================
// CREAR TAREA Y ACTUALIZAR SIDEBAR
// =======================================================
function crearNuevaTareaPrompt(fechaDefecto, horaDefecto) {
  const hoyStr = new Date().toISOString().slice(0, 10);
  const titulo = prompt("Título de la tarea:");
  if (!titulo || !titulo.trim()) return;

  const fecha = fechaDefecto || prompt("Fecha (YYYY-MM-DD):", hoyStr) || hoyStr;
  const hora = horaDefecto || prompt("Hora (HH:MM):", "09:00") || "09:00";

  const tareas = JSON.parse(localStorage.getItem('myday_tasks') || '[]');
  tareas.push({
    id: Date.now().toString(),
    title: titulo.trim(),
    date: fecha,
    time: hora,
    completed: false
  });

  localStorage.setItem('myday_tasks', JSON.stringify(tareas));
  renderizarCalendario();
}

function actualizarListaPendientes(tareas) {
  const sideList = document.getElementById('side-pending-list');
  if (!sideList) return;

  const pendientes = tareas.filter(t => !t.completed);
  if (pendientes.length === 0) {
    sideList.innerHTML = '<p style="color:#94a3b8; font-size:0.85rem;">No hay tareas pendientes.</p>';
    return;
  }

  sideList.innerHTML = pendientes.slice(0, 5).map(t => `
    <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:8px 10px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
      <span style="font-weight:600; color:#334155;">${t.title}</span>
      <span style="font-size:0.75rem; color:#64748b; background:#e2e8f0; padding:2px 6px; border-radius:4px;">${t.time || 'Todo el día'}</span>
    </div>
  `).join('');
}

function iniciarComprobadorNotificaciones() {
  setInterval(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const ahora = new Date();
    const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    const hoyStr = ahora.toISOString().slice(0, 10);

    const tareas = JSON.parse(localStorage.getItem('myday_tasks') || '[]');
    let cambios = false;

    tareas.forEach((t) => {
      if (!t.time || t.completed || t.date !== hoyStr) return;
      if (t.time === horaActual && t.lastNotified !== hoyStr) {
        new Notification(`⏰ ${t.title}`, { body: `Es la hora (${t.time}).` });
        t.lastNotified = hoyStr;
        cambios = true;
      }
    });

    if (cambios) localStorage.setItem('myday_tasks', JSON.stringify(tareas));
  }, 15000);
}