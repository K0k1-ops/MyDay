// =======================================================
// MYSELF — MOTOR PRINCIPAL (REPRESENTACIÓN MINUTO A MINUTO)
// =======================================================

let fechaActual = new Date();

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('SW registrado'))
      .catch(err => console.error('Error SW:', err));
  }

  inicializarTema();
  renderizarCalendario();
  renderizarHabitualesSidebar();

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
        version: '7.0',
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
  iniciarComprobadorNotificaciones();
});

// =======================================================
// MODO NOCHE
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

// =======================================================
// REJILLA SEMANAL (CON POSICIONAMIENTO SUB-HORARIO PRECISO)
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
  headerHora.className = 'grid-time-cell';
  headerHora.style.fontWeight = '700';
  headerHora.innerText = 'Hora';
  grid.appendChild(headerHora);

  // 2. Encabezados Días
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
  const habituales = JSON.parse(localStorage.getItem('myday_habitual') || '[]');

  // 3. Filas por Hora (De 07:00 a 23:00)
  for (let h = 7; h <= 23; h++) {
    const slotStartMin = h * 60;
    const slotEndMin = (h + 1) * 60;
    const horaStr = `${String(h).padStart(2, '0')}:00`;
    const horaFinSlot = `${String(h + 1).padStart(2, '0')}:00`;

    const cellHora = document.createElement('div');
    cellHora.className = 'grid-time-cell';
    cellHora.innerText = horaStr;
    grid.appendChild(cellHora);

    fechasSemana.forEach((fecha) => {
      const fechaISO = fecha.toISOString().slice(0, 10);
      const dayOfWeek = fecha.getDay();
      const esPasado = fechaISO < hoyStr;

      const cell = document.createElement('div');
      cell.className = `grid-slot-cell ${esPasado ? 'is-past' : ''}`;

      // A. Mostrar Tareas Habituales (Rutinas) con Posicionamiento Exacto
      const habitualesCoincidentes = habituales.filter(hab => {
        if (!hab.days || !hab.days.includes(String(dayOfWeek))) return false;
        const startMin = timeToMinutes(hab.startTime || '10:00');
        const endMin = timeToMinutes(hab.endTime || '11:00');
        return startMin < slotEndMin && endMin > slotStartMin;
      });

      habitualesCoincidentes.forEach(hab => {
        const startMin = timeToMinutes(hab.startTime || '10:00');
        const endMin = timeToMinutes(hab.endTime || '11:00');
        
        const taskSlotStart = Math.max(startMin, slotStartMin);
        const taskSlotEnd = Math.min(endMin, slotEndMin);

        const offsetMin = taskSlotStart - slotStartMin;
        const durationMin = taskSlotEnd - taskSlotStart;

        const itemHab = document.createElement('div');
        itemHab.className = 'task-card-item habitual';
        itemHab.style.position = 'absolute';
        itemHab.style.top = `${offsetMin}px`;
        itemHab.style.height = `${Math.max(durationMin, 18)}px`;
        itemHab.style.left = '2px';
        itemHab.style.right = '2px';

        const isFirstSegment = taskSlotStart === startMin;
        if (isFirstSegment) {
          itemHab.innerText = `🔄 ${hab.startTime}-${hab.endTime} ${hab.title}`;
        } else {
          itemHab.innerText = `↳ ${hab.title} (${hab.endTime})`;
          itemHab.style.opacity = '0.85';
        }

        itemHab.onclick = (e) => {
          e.stopPropagation();
          abrirModalHabitual(hab);
        };
        cell.appendChild(itemHab);
      });

      // B. Mostrar Tareas Puntuales con Posicionamiento Exacto
      const tareasSlot = tareas.filter(t => {
        if (t.date !== fechaISO) return false;
        const sTime = t.startTime || t.time || '09:00';
        const eTime = t.endTime || calcularHoraFinPorDefecto(sTime);
        const startMin = timeToMinutes(sTime);
        const endMin = timeToMinutes(eTime);
        return startMin < slotEndMin && endMin > slotStartMin;
      });

      tareasSlot.forEach(t => {
        const sTime = t.startTime || t.time || '09:00';
        const eTime = t.endTime || calcularHoraFinPorDefecto(sTime);
        const startMin = timeToMinutes(sTime);
        const endMin = timeToMinutes(eTime);

        const taskSlotStart = Math.max(startMin, slotStartMin);
        const taskSlotEnd = Math.min(endMin, slotEndMin);

        const offsetMin = taskSlotStart - slotStartMin; // Desplazamiento desde la parte superior de la celda
        const durationMin = taskSlotEnd - taskSlotStart; // Altura relativa a los minutos

        const catClass = t.category === 'estudios' ? 'cat-estudios' : 'cat-personal';
        const item = document.createElement('div');
        item.className = `task-card-item ${catClass} ${t.completed ? 'completed' : ''}`;
        
        item.style.position = 'absolute';
        item.style.top = `${offsetMin}px`;
        item.style.height = `${Math.max(durationMin, 18)}px`; // Altura mínima para legibilidad
        item.style.left = '2px';
        item.style.right = '2px';

        const prefix = t.category === 'estudios' ? '📚' : '👤';
        const isFirstSegment = taskSlotStart === startMin;

        if (isFirstSegment) {
          item.innerText = `${prefix} ${sTime}-${eTime} ${t.title}`;
        } else {
          item.innerText = `↳ ${t.title} (${eTime})`;
          item.style.opacity = '0.85';
        }

        item.onclick = (e) => {
          e.stopPropagation();
          abrirModalTarea(t);
        };
        cell.appendChild(item);
      });

      // Clic en celda vacía para crear tarea
      cell.onclick = () => abrirModalTarea({ date: fechaISO, startTime: horaStr, endTime: horaFinSlot });
      grid.appendChild(cell);
    });
  }
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
    const diasTxt = (h.days || []).map(d => nombresDias[d] || d).join(', ') || 'Sin días';
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
  const inputCategory = document.getElementById('task-category-input');
  const inputDate = document.getElementById('task-date-input');
  const inputStart = document.getElementById('task-start-input');
  const inputEnd = document.getElementById('task-end-input');
  const btnDelete = document.getElementById('btn-delete-task');

  if (!modal) return;

  const hoyStr = new Date().toISOString().slice(0, 10);
  const startDefault = tareaExistente.startTime || tareaExistente.time || '09:00';
  const endDefault = tareaExistente.endTime || calcularHoraFinPorDefecto(startDefault);

  if (tareaExistente.id) {
    modalTitle.innerText = "Editar Tarea";
    inputId.value = tareaExistente.id;
    inputTitle.value = tareaExistente.title || '';
    if (inputCategory) inputCategory.value = tareaExistente.category || 'personal';
    inputDate.value = tareaExistente.date || hoyStr;
    inputStart.value = startDefault;
    inputEnd.value = endDefault;
    btnDelete.style.display = 'block';
  } else {
    modalTitle.innerText = "Nueva Tarea";
    inputId.value = '';
    inputTitle.value = '';
    if (inputCategory) inputCategory.value = 'personal';
    inputDate.value = tareaExistente.date || hoyStr;
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
      const category = document.getElementById('task-category-input').value;
      const date = document.getElementById('task-date-input').value;
      const startTime = document.getElementById('task-start-input').value;
      const endTime = document.getElementById('task-end-input').value;

      if (!title) return;

      let tareas = JSON.parse(localStorage.getItem('myday_tasks') || '[]');

      if (id) {
        const idx = tareas.findIndex(t => t.id === id);
        if (idx !== -1) {
          tareas[idx].title = title;
          tareas[idx].category = category;
          tareas[idx].date = date;
          tareas[idx].startTime = startTime;
          tareas[idx].endTime = endTime;
          tareas[idx].time = startTime;
        }
      } else {
        tareas.push({
          id: Date.now().toString(),
          title,
          category,
          date,
          startTime,
          endTime,
          time: startTime,
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

// =======================================================
// COMPROBADOR DE NOTIFICACIONES
// =======================================================
function iniciarComprobadorNotificaciones() {
  setInterval(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const ahora = new Date();
    const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    const hoyStr = ahora.toISOString().slice(0, 10);
    const dayOfWeekStr = String(ahora.getDay());

    const tareas = JSON.parse(localStorage.getItem('myday_tasks') || '[]');
    const habituales = JSON.parse(localStorage.getItem('myday_habitual') || '[]');
    let cambios = false;

    tareas.forEach((t) => {
      const sTime = t.startTime || t.time;
      if (!sTime || t.completed || t.date !== hoyStr) return;
      if (sTime === horaActual && t.lastNotified !== hoyStr) {
        new Notification(`⏰ ${t.title}`, { body: `Comienza tu tarea (${sTime} - ${t.endTime || ''}).` });
        t.lastNotified = hoyStr;
        cambios = true;
      }
    });

    habituales.forEach((h) => {
      if (!h.startTime || !(h.days || []).includes(dayOfWeekStr)) return;
      if (h.startTime === horaActual && h.lastNotified !== hoyStr) {
        new Notification(`🔄 Rutina: ${h.title}`, { body: `Comienza tu rutina (${h.startTime} - ${h.endTime}).` });
        h.lastNotified = hoyStr;
        cambios = true;
      }
    });

    if (cambios) {
      localStorage.setItem('myday_tasks', JSON.stringify(tareas));
      localStorage.setItem('myday_habitual', JSON.stringify(habituales));
    }
  }, 15000);
}