// =======================================================
// MYSELF — MOTOR PRINCIPAL CON MODO NOCHE Y RUTINAS HABITUALES
// =======================================================

let fechaActual = new Date();

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('SW registrado'))
      .catch(err => console.error('Error SW:', err));
  }

  // 1. Inicializar Tema Oscuro / Claro
  inicializarTema();

  // 2. Renderizar Calendario y Rutinas Habituales
  renderizarCalendario();
  renderizarHabituales();

  // --------------------------------------------------
  // A. NAVEGACIÓN Y BOTONES CABECERA
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
        if (notesStatus) {
          notesStatus.style.opacity = '1';
          setTimeout(() => { notesStatus.style.opacity = '0'; }, 2000);
        }
      }, 500);
    });
  }

  // --------------------------------------------------
  // D. MODAL DE AJUSTES E IMPORTACIÓN / EXPORTACIÓN
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
        version: '3.0',
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
      dl.setAttribute("download", `myself_pc_full_backup_${new Date().toISOString().slice(0,10)}.json`);
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

          alert('¡Sincronización de copia completada con éxito!');
          window.location.reload();
        } catch (err) {
          alert('Error al leer el archivo JSON: ' + err.message);
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
  iniciarComprobadorNotificaciones();
});

// =======================================================
// MODO NOCHE (DARK MODE)
// =======================================================
function inicializarTema() {
  const temaGuardado = localStorage.getItem('myday_theme') || 'light';
  aplicarTema(temaGuardado);
}

function aplicarTema(tema) {
  document.documentElement.setAttribute('data-theme', tema);
  localStorage.setItem('myday_theme', tema);
  const btnTheme = document.getElementById('btn-theme-toggle');
  if (btnTheme) {
    btnTheme.innerText = tema === 'dark' ? '☀️' : '🌙';
  }
}

// =======================================================
// REJILLA SEMANAL (CON CLASES Y DÍAS PASADOS EN VERDE)
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

  for (let i = 0; i < 7; i++) {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    fechasSemana.push(d);
  }

  const hoyStr = new Date().toISOString().slice(0, 10);

  // Fila Encabezado Hora
  const headerHora = document.createElement('div');
  headerHora.className = 'grid-time-cell';
  headerHora.style.fontWeight = '700';
  headerHora.innerText = 'Hora';
  grid.appendChild(headerHora);

  // Encabezados Días
  fechasSemana.forEach((fecha, idx) => {
    const fechaStr = fecha.toISOString().slice(0, 10);
    const esHoy = fechaStr === hoyStr;
    const esPasado = fechaStr < hoyStr;

    const headerDia = document.createElement('div');
    headerDia.className = `grid-header-cell ${esHoy ? 'is-today' : ''} ${esPasado ? 'is-past' : ''}`;

    let colorSub = 'var(--text-secondary)';
    let colorNum = 'var(--text-primary)';

    if (esHoy) {
      colorSub = 'var(--text-today)';
      colorNum = 'var(--text-today)';
    } else if (esPasado) {
      colorSub = 'var(--text-past-day)';
      colorNum = 'var(--text-past-day)';
    }

    headerDia.innerHTML = `
      <div style="font-size: 0.75rem; font-weight: 700; color: ${colorSub}; text-transform: uppercase;">${diasSemana[idx]}</div>
      <div style="font-size: 1rem; font-weight: 800; color: ${colorNum};">${fecha.getDate()}</div>
    `;
    grid.appendChild(headerDia);
  });

  const tareas = JSON.parse(localStorage.getItem('myday_tasks') || '[]');

  // Filas por Hora
  for (let h = 7; h <= 23; h++) {
    const horaStr = `${String(h).padStart(2, '0')}:00`;

    const cellHora = document.createElement('div');
    cellHora.className = 'grid-time-cell';
    cellHora.innerText = horaStr;
    grid.appendChild(cellHora);

    fechasSemana.forEach((fecha) => {
      const fechaISO = fecha.toISOString().slice(0, 10);
      const esPasado = fechaISO < hoyStr;

      const cell = document.createElement('div');
      cell.className = `grid-slot-cell ${esPasado ? 'is-past' : ''}`;

      const tareasSlot = tareas.filter(t => t.date === fechaISO && t.time && t.time.startsWith(String(h).padStart(2, '0')));

      tareasSlot.forEach(t => {
        const item = document.createElement('div');
        item.className = `task-card-item ${t.completed ? 'completed' : ''}`;
        item.innerText = `${t.time} ${t.title}`;
        item.onclick = (e) => {
          e.stopPropagation();
          abrirModalTarea(t);
        };
        cell.appendChild(item);
      });

      cell.onclick = () => abrirModalTarea({ date: fechaISO, time: horaStr });
      grid.appendChild(cell);
    });
  }
}

// =======================================================
// TAREAS HABITUALES / RUTINAS
// =======================================================
function renderizarHabituales() {
  const listContainer = document.getElementById('side-habitual-list');
  if (!listContainer) return;

  const habituales = JSON.parse(localStorage.getItem('myday_habitual') || '[]');

  if (habituales.length === 0) {
    listContainer.innerHTML = '<p style="color:var(--text-secondary); font-size:0.8rem;">No tienes rutinas habituales guardadas.</p>';
    return;
  }

  listContainer.innerHTML = habituales.map(h => `
    <div style="background:var(--bg-primary); border:1px solid var(--border-color); padding:8px 10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-weight:700; color:var(--text-primary);">${h.title}</div>
        <div style="font-size:0.75rem; color:var(--text-secondary);">${h.time || '10:00'}</div>
      </div>
      <div style="display:flex; gap:6px;">
        <button onclick="añadirHabitualAHoy('${h.id}')" style="padding:4px 8px; background:var(--accent-primary); color:#fff; border:none; border-radius:6px; font-weight:600; cursor:pointer; font-size:0.75rem;" title="Añadir a Hoy">+ Hoy</button>
        <button onclick="eliminarHabitual('${h.id}')" style="padding:4px 6px; background:transparent; color:#ef4444; border:none; cursor:pointer; font-size:0.85rem;" title="Eliminar Rutina">🗑️</button>
      </div>
    </div>
  `).join('');
}

function añadirHabitualAHoy(id) {
  const habituales = JSON.parse(localStorage.getItem('myday_habitual') || '[]');
  const rut = habituales.find(x => x.id === id);
  if (!rut) return;

  const hoyStr = new Date().toISOString().slice(0, 10);
  const tareas = JSON.parse(localStorage.getItem('myday_tasks') || '[]');

  tareas.push({
    id: Date.now().toString(),
    title: rut.title,
    date: hoyStr,
    time: rut.time || '10:00',
    completed: false
  });

  localStorage.setItem('myday_tasks', JSON.stringify(tareas));
  renderizarCalendario();
}

function eliminarHabitual(id) {
  let habituales = JSON.parse(localStorage.getItem('myday_habitual') || '[]');
  habituales = habituales.filter(h => h.id !== id);
  localStorage.setItem('myday_habitual', JSON.stringify(habituales));
  renderizarHabituales();
}

function configurarModalHabitualForm() {
  const modalBtn = document.getElementById('btn-open-habitual-modal');
  const modal = document.getElementById('modal-habitual');
  const btnClose = document.getElementById('btn-close-habitual-modal');
  const btnCancel = document.getElementById('btn-cancel-habitual');
  const form = document.getElementById('form-habitual');

  const cerrar = () => modal.classList.add('hidden');

  if (modalBtn) modalBtn.onclick = () => modal.classList.remove('hidden');
  if (btnClose) btnClose.onclick = cerrar;
  if (btnCancel) btnCancel.onclick = cerrar;

  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const title = document.getElementById('habitual-title-input').value.trim();
      const time = document.getElementById('habitual-time-input').value;
      if (!title) return;

      const habituales = JSON.parse(localStorage.getItem('myday_habitual') || '[]');
      habituales.push({ id: Date.now().toString(), title, time });

      localStorage.setItem('myday_habitual', JSON.stringify(habituales));
      document.getElementById('habitual-title-input').value = '';
      cerrar();
      renderizarHabituales();
    };
  }
}

// =======================================================
// MODAL TAREA NORMAL (CREAR Y EDITAR)
// =======================================================
function abrirModalTarea(tareaExistente = {}) {
  const modal = document.getElementById('modal-task');
  const modalTitle = document.getElementById('modal-task-header-title');
  const inputId = document.getElementById('task-id');
  const inputTitle = document.getElementById('task-title-input');
  const inputDate = document.getElementById('task-date-input');
  const inputTime = document.getElementById('task-time-input');
  const btnDelete = document.getElementById('btn-delete-task');

  if (!modal) return;

  const hoyStr = new Date().toISOString().slice(0, 10);

  if (tareaExistente.id) {
    modalTitle.innerText = "Editar Tarea";
    inputId.value = tareaExistente.id;
    inputTitle.value = tareaExistente.title || '';
    inputDate.value = tareaExistente.date || hoyStr;
    inputTime.value = tareaExistente.time || '09:00';
    btnDelete.style.display = 'block';
  } else {
    modalTitle.innerText = "Nueva Tarea";
    inputId.value = '';
    inputTitle.value = '';
    inputDate.value = tareaExistente.date || hoyStr;
    inputTime.value = tareaExistente.time || '09:00';
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
      const date = document.getElementById('task-date-input').value;
      const time = document.getElementById('task-time-input').value;

      if (!title) return;

      let tareas = JSON.parse(localStorage.getItem('myday_tasks') || '[]');

      if (id) {
        const idx = tareas.findIndex(t => t.id === id);
        if (idx !== -1) {
          tareas[idx].title = title;
          tareas[idx].date = date;
          tareas[idx].time = time;
        }
      } else {
        tareas.push({
          id: Date.now().toString(),
          title,
          date,
          time,
          completed: false
        });
      }

      localStorage.setItem('myday_tasks', JSON.stringify(tareas));
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
      cerrarModal();
      renderizarCalendario();
    };
  }
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