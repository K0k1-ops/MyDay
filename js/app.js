// =======================================================
// MYSELF — MOTOR PRINCIPAL DE ESCRITORIO CON REJILLA SEMANAL
// =======================================================

let fechaActual = new Date();

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('SW registrado'))
      .catch(err => console.error('Error SW:', err));
  }

  // Render inicial
  renderizarCalendario();

  // --------------------------------------------------
  // A. NAVEGACIÓN Y BOTONES
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
    btnAdd.addEventListener('click', () => abrirModalTarea());
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
  // D. MODAL DE AJUSTES E IMPORTACIÓN/EXPORTACIÓN JSON
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

  // Exportar JSON
  const btnExport = document.getElementById('btn-export-json');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const backupData = {
        version: '2.0',
        timestamp: new Date().toISOString(),
        myday_tasks: localStorage.getItem('myday_tasks') || '[]',
        myday_quick_notes: localStorage.getItem('myday_quick_notes') || '',
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

  // Importar JSON (Reparado para aceptar todos los formatos)
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
            if (imported.myday_tasks) {
              const tasksVal = typeof imported.myday_tasks === 'string' ? imported.myday_tasks : JSON.stringify(imported.myday_tasks);
              localStorage.setItem('myday_tasks', tasksVal);
            }
            if (imported.myday_quick_notes) {
              localStorage.setItem('myday_quick_notes', imported.myday_quick_notes);
            }
            // Si viene un objeto simple clave-valor
            Object.keys(imported).forEach(k => {
              if (k !== 'myday_tasks' && k !== 'myday_quick_notes' && k !== 'timestamp' && k !== 'version') {
                const val = typeof imported[k] === 'string' ? imported[k] : JSON.stringify(imported[k]);
                localStorage.setItem(k, val);
              }
            });
          }

          alert('¡Datos importados con éxito!');
          window.location.reload();
        } catch (err) {
          alert('Error al procesar el archivo JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  // Notificaciones
  const btnNotify = document.getElementById('btn-enable-notifications');
  if (btnNotify) {
    btnNotify.addEventListener('click', async () => {
      if (!('Notification' in window)) return alert('Navegador no compatible.');
      const perm = await Notification.requestPermission();
      if (perm === 'granted') new Notification('Myself PC', { body: 'Notificaciones activas.' });
    });
  }

  // Eventos del Modal de Tarea
  configurarModalTareaForm();
  iniciarComprobadorNotificaciones();
});

// =======================================================
// RENDERIZADOR DE LA REJILLA SEMANAL (CON DÍAS PASADOS EN VERDE)
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

  // 1. Header Hora
  const headerHora = document.createElement('div');
  headerHora.style.cssText = 'padding: 12px; font-size: 0.75rem; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0; text-align: center; background: #f8fafc;';
  headerHora.innerText = 'Hora';
  grid.appendChild(headerHora);

  // 2. Header Días
  fechasSemana.forEach((fecha, idx) => {
    const fechaStr = fecha.toISOString().slice(0, 10);
    const esHoy = fechaStr === hoyStr;
    const esPasado = fechaStr < hoyStr;

    const headerDia = document.createElement('div');
    
    // Estilos por fecha (Verde para pasados, Azul para hoy)
    let bgHeader = '#f8fafc';
    let colorSub = '#64748b';
    let colorNum = '#0f172a';
    let borderBot = '2px solid #e2e8f0';

    if (esHoy) {
      bgHeader = '#eff6ff';
      colorSub = '#2563eb';
      colorNum = '#1d4ed8';
      borderBot = '2px solid #3b82f6';
    } else if (esPasado) {
      bgHeader = '#f0fdf4'; // Verde suave
      colorSub = '#166534';
      colorNum = '#15803d';
      borderBot = '2px solid #bbf7d0';
    }

    headerDia.style.cssText = `padding: 10px; text-align: center; border-bottom: ${borderBot}; background: ${bgHeader}; border-left: 1px solid #f1f5f9;`;
    headerDia.innerHTML = `
      <div style="font-size: 0.75rem; font-weight: 700; color: ${colorSub}; text-transform: uppercase;">${diasSemana[idx]}</div>
      <div style="font-size: 1rem; font-weight: 800; color: ${colorNum};">${fecha.getDate()}</div>
    `;
    grid.appendChild(headerDia);
  });

  // 3. Cargar Tareas
  const tareas = JSON.parse(localStorage.getItem('myday_tasks') || '[]');

  // 4. Filas por Hora
  for (let h = 7; h <= 23; h++) {
    const horaStr = `${String(h).padStart(2, '0')}:00`;

    const cellHora = document.createElement('div');
    cellHora.style.cssText = 'padding: 8px; font-size: 0.75rem; font-weight: 600; color: #94a3b8; text-align: center; border-bottom: 1px solid #f1f5f9; background: #fafafa;';
    cellHora.innerText = horaStr;
    grid.appendChild(cellHora);

    fechasSemana.forEach((fecha) => {
      const fechaISO = fecha.toISOString().slice(0, 10);
      const esPasado = fechaISO < hoyStr;

      const cell = document.createElement('div');
      cell.style.cssText = `min-height: 48px; border-bottom: 1px solid #f1f5f9; border-left: 1px solid #f1f5f9; padding: 4px; position: relative; transition: background 0.2s; background: ${esPasado ? '#fafdfa' : '#ffffff'};`;

      const tareasSlot = tareas.filter(t => t.date === fechaISO && t.time && t.time.startsWith(String(h).padStart(2, '0')));

      tareasSlot.forEach(t => {
        const item = document.createElement('div');
        item.style.cssText = `background: ${t.completed ? '#e2e8f0' : '#dbeafe'}; border-left: 3px solid ${t.completed ? '#94a3b8' : '#2563eb'}; padding: 4px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; color: ${t.completed ? '#64748b' : '#1e40af'}; margin-bottom: 4px; cursor: pointer; text-decoration: ${t.completed ? 'line-through' : 'none'};`;
        item.innerText = `${t.time} ${t.title}`;
        
        // Clic en la tarea: Abrir modal para editar
        item.onclick = (e) => {
          e.stopPropagation();
          abrirModalTarea(t);
        };
        cell.appendChild(item);
      });

      // Clic en la celda vacía: Crear nueva tarea en esa fecha y hora
      cell.onclick = () => abrirModalTarea({ date: fechaISO, time: horaStr });
      grid.appendChild(cell);
    });
  }

  actualizarListaPendientes(tareas);
}

// =======================================================
// INTERFAZ DE MODAL DE TAREAS (NADA DE PROMPTS)
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
    // Editar Tarea
    modalTitle.innerText = "Editar Tarea";
    inputId.value = tareaExistente.id;
    inputTitle.value = tareaExistente.title || '';
    inputDate.value = tareaExistente.date || hoyStr;
    inputTime.value = tareaExistente.time || '09:00';
    btnDelete.style.display = 'block';
  } else {
    // Crear Tarea
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
        // Actualizar existente
        const idx = tareas.findIndex(t => t.id === id);
        if (idx !== -1) {
          tareas[idx].title = title;
          tareas[idx].date = date;
          tareas[idx].time = time;
        }
      } else {
        // Crear nueva
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

function actualizarListaPendientes(tareas) {
  const sideList = document.getElementById('side-pending-list');
  if (!sideList) return;

  const pendientes = tareas.filter(t => !t.completed);
  if (pendientes.length === 0) {
    sideList.innerHTML = '<p style="color:#94a3b8; font-size:0.85rem;">No hay tareas pendientes.</p>';
    return;
  }

  sideList.innerHTML = pendientes.slice(0, 5).map(t => `
    <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:8px 10px; border-radius:6px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="abrirModalTareaDirecto('${t.id}')">
      <span style="font-weight:600; color:#334155;">${t.title}</span>
      <span style="font-size:0.75rem; color:#64748b; background:#e2e8f0; padding:2px 6px; border-radius:4px;">${t.time || 'Todo el día'}</span>
    </div>
  `).join('');
}

function abrirModalTareaDirecto(id) {
  const tareas = JSON.parse(localStorage.getItem('myday_tasks') || '[]');
  const t = tareas.find(x => x.id === id);
  if (t) abrirModalTarea(t);
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