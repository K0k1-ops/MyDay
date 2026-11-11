// =======================================================
// MYSELF — LÓGICA PRINCIPAL DE ESCRITORIO (PC FIRST)
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inicialización de Iconos Lucide
  if (window.lucide) {
    lucide.createIcons();
  }

  // 2. Registro del Service Worker para funcionamiento offline
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('Service Worker registrado'))
      .catch(err => console.error('Error SW:', err));
  }

  // --------------------------------------------------
  // A. CONTROL DE ATAJOS DE TECLADO
  // --------------------------------------------------
  document.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const isTyping = activeEl.tagName === 'INPUT' || 
                     activeEl.tagName === 'TEXTAREA' || 
                     activeEl.isContentEditable;

    // Tecla ESC: Cerrar modales o salir de campos de texto
    if (e.key === 'Escape') {
      const modales = document.querySelectorAll('.modal-backdrop');
      modales.forEach(modal => modal.classList.add('hidden'));
      if (isTyping) activeEl.blur();
      return;
    }

    // Si el usuario está escribiendo, no interceptar los accesos directos
    if (isTyping) return;

    switch (e.key.toLowerCase()) {
      case 'n':
        e.preventDefault();
        const btnAdd = document.getElementById('btn-add-task') || document.querySelector('.btn-add');
        if (btnAdd) btnAdd.click();
        break;

      case 't':
        e.preventDefault();
        const btnToday = document.getElementById('btn-today') || document.querySelector('.btn-today');
        if (btnToday) btnToday.click();
        break;

      case 'arrowleft':
        e.preventDefault();
        const btnPrev = document.getElementById('btn-prev-week') || document.querySelector('.btn-prev');
        if (btnPrev) btnPrev.click();
        break;

      case 'arrowright':
        e.preventDefault();
        const btnNext = document.getElementById('btn-next-week') || document.querySelector('.btn-next');
        if (btnNext) btnNext.click();
        break;
    }
  });

  // --------------------------------------------------
  // B. BLOC DE NOTAS RÁPIDO CON AUTOGUARDADO
  // --------------------------------------------------
  const quickNotesArea = document.getElementById('desktop-quick-notes');
  const notesStatus = document.getElementById('notes-saved-status');

  if (quickNotesArea) {
    // Cargar notas al iniciar
    quickNotesArea.value = localStorage.getItem('myday_quick_notes') || '';

    let timeoutSave = null;
    quickNotesArea.addEventListener('input', () => {
      clearTimeout(timeoutSave);
      // Auto-guardado tras 500ms sin escribir
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
  // C. MODAL DE AJUSTES Y BACKUPS
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
        version: '1.0',
        timestamp: new Date().toISOString(),
        storage: { ...localStorage }
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const dl = document.createElement('a');
      dl.setAttribute("href", dataStr);
      dl.setAttribute("download", `myself_pc_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(dl);
      dl.click();
      dl.remove();
    });
  }

  // Importar JSON
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
            alert('Datos cargados con éxito. Recargando...');
            window.location.reload();
          }
        } catch (err) {
          alert('Archivo JSON no válido.');
        }
      };
      reader.readAsText(file);
    });
  }

  // Notificaciones Locales
  const btnNotify = document.getElementById('btn-enable-notifications');
  if (btnNotify) {
    btnNotify.addEventListener('click', async () => {
      if (!('Notification' in window)) return alert('Navegador no compatible con notificaciones.');
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        new Notification('Myself PC', { body: 'Notificaciones activadas correctamente.' });
      }
    });
  }

  // Iniciar el temporizador de notificaciones por hora
  iniciarComprobadorNotificaciones();
});

// --------------------------------------------------
// D. REVISOR AUTOMÁTICO DE NOTIFICACIONES (CADA MINUTO)
// --------------------------------------------------
function iniciarComprobadorNotificaciones() {
  setInterval(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const ahora = new Date();
    const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    const hoyStr = ahora.toISOString().slice(0, 10);

    const rawData = localStorage.getItem('myday_tasks') || '[]';
    let tareas = [];
    try { tareas = JSON.parse(rawData); } catch(e) { return; }

    let cambios = false;
    tareas.forEach((tarea) => {
      if (!tarea.time || tarea.completed) return;

      const parts = tarea.time.split(':');
      const horaTarea = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;

      if (horaTarea === horaActual && tarea.lastNotified !== hoyStr) {
        new Notification(`⏰ ${tarea.title || 'Recordatorio'}`, {
          body: `Es la hora de tu actividad (${horaTarea}).`,
          icon: 'icons/icon-192.png'
        });
        tarea.lastNotified = hoyStr;
        cambios = true;
      }
    });

    if (cambios) {
      localStorage.setItem('myday_tasks', JSON.stringify(tareas));
    }
  }, 15000);
}