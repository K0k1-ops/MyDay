// js/app.js
import { db } from './core/db.js';
import { TodayView } from './modules/today.js';
import { TasksView } from './modules/tasks.js';
import { CalendarView } from './modules/calendar.js';
import { NotesView } from './modules/notes.js';
import { ModalController } from './modules/modal.js';
import { exportData, importData } from './core/backup.js';
import { NotificationService } from './core/notifications.js';

document.addEventListener('DOMContentLoaded', async () => {
  await db.open();

  const views = {
    today: new TodayView('view-today'),
    calendar: new CalendarView('view-calendar'),
    tasks: new TasksView('view-tasks'),
    notes: new NotesView('view-notes')
  };

  let activeViewKey = 'today';

  async function navigateTo(viewKey) {
    if (!views[viewKey]) return;
    activeViewKey = viewKey;

    document.querySelectorAll('.view-page').forEach(page => {
      page.classList.remove('active');
      page.style.display = 'none';
    });

    const activeSection = document.getElementById(`view-${viewKey}`);
    if (activeSection) {
      activeSection.classList.add('active');
      activeSection.style.display = 'block';
    }

    document.querySelectorAll('[data-view]').forEach(btn => {
      if (btn.dataset.view === viewKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    try {
      await views[viewKey].render();
    } catch (err) {
      console.error(`Error al renderizar la vista ${viewKey}:`, err);
    }
  }

  await navigateTo('today');

  document.querySelectorAll('[data-view]').forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const btn = e.target.closest('[data-view]');
      if (!btn) return;
      const viewKey = btn.dataset.view;
      await navigateTo(viewKey);
    });
  });

  // Modal Controller Global
  const modalController = new ModalController(async () => {
    await navigateTo(activeViewKey);
  });

  window.openTaskModal = (task = null) => {
    modalController.open(task);
  };

  // Tema Light / Dark
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      const icon = themeToggle.querySelector('i');
      if (icon) {
        icon.setAttribute('data-lucide', newTheme === 'dark' ? 'sun' : 'moon');
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // Ajustes
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsBtn = document.getElementById('close-settings-modal');
  const exportBtn = document.getElementById('btn-export-json');
  const importInput = document.getElementById('input-import-json');
  const notifyBtn = document.getElementById('btn-enable-notifications');

  if (settingsModal) {
    window.openSettings = () => settingsModal.classList.remove('hidden');
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        await exportData();
      });
    }

    if (importInput) {
      importInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            await importData(file);
            alert('¡Datos importados con éxito!');
            settingsModal.classList.add('hidden');
            await navigateTo(activeViewKey);
          } catch (err) {
            alert('Error al importar: ' + err.message);
          }
        }
      });
    }

    if (notifyBtn) {
      notifyBtn.addEventListener('click', async () => {
        const granted = await NotificationService.requestPermission();
        if (granted) {
          NotificationService.send('Myself', { body: 'Las notificaciones están activadas correctamente.' });
        } else {
          alert('No se otorgaron permisos de notificación.');
        }
      });
    }
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .catch(err => console.log('Error al registrar SW:', err));
  }

  if (window.lucide) window.lucide.createIcons();
});

// =======================================================
// LÓGICA DE AJUSTES: BACKUP JSON Y NOTIFICACIONES
// =======================================================
document.addEventListener('DOMContentLoaded', () => {

  // 1. Exportar datos a archivo JSON
  const btnExport = document.getElementById('btn-export-json');
  if (btnExport) {
    btnExport.addEventListener('click', async () => {
      try {
        // Recuperar todo LocalStorage / IndexedDB
        const backupData = {
          version: '1.0',
          timestamp: new Date().toISOString(),
          storage: { ...localStorage }
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `myself_backup_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        alert(' Copia de seguridad exportada con éxito.');
      } catch (err) {
        console.error('Error al exportar:', err);
        alert('Error al generar la copia de seguridad.');
      }
    });
  }

  // 2. Importar datos desde archivo JSON
  const inputImport = document.getElementById('input-import-json');
  if (inputImport) {
    inputImport.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target.result);
          if (importedData.storage) {
            Object.keys(importedData.storage).forEach((key) => {
              localStorage.setItem(key, importedData.storage[key]);
            });
            alert(' Datos importados correctamente. La aplicación se recargará.');
            window.location.reload();
          } else {
            alert(' El archivo JSON no tiene un formato válido.');
          }
        } catch (err) {
          console.error('Error al importar:', err);
          alert('Error al leer el archivo JSON.');
        }
      };
      reader.readAsText(file);
    });
  }

  // 3. Activar Notificaciones Nativas
  const btnNotify = document.getElementById('btn-enable-notifications');
  if (btnNotify) {
    btnNotify.addEventListener('click', async () => {
      if (!('Notification' in window)) {
        alert('Tu navegador no soporta notificaciones locales.');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('Myself — Agenda', {
          body: ' Notificaciones activadas correctamente.',
          icon: 'icons/icon-192.png'
        });
        btnNotify.innerText = 'Notificaciones Activadas';
        btnNotify.style.background = '#10b981';
      } else {
        alert('Permiso de notificaciones denegado.');
      }
    });
  }
});

// =======================================================
// REVISOR AUTOMÁTICO DE NOTIFICACIONES Y TAREAS
// =======================================================
function iniciarComprobadorNotificaciones() {
  // Ejecuta la comprobación cada 60 segundos
  setInterval(() => {
    // Si el usuario no ha dado permisos de notificación, no hace nada
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const ahora = new Date();
    // Formato de hora actual en "HH:MM" (ej: "09:30")
    const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    const hoyStr = ahora.toISOString().slice(0, 10); // YYYY-MM-DD

    // Recupera las tareas del almacenamiento local
    const tareas = JSON.parse(localStorage.getItem('myday_tasks') || '[]');
    let cambios = false;

    tareas.forEach((tarea) => {
      // Notifica si coincide la hora, no está hecha y no ha sido notificada hoy
      if (
        tarea.time === horaActual && 
        !tarea.completed && 
        tarea.lastNotified !== hoyStr
      ) {
        new Notification(`⏰ ${tarea.title || 'Recordatorio'}`, {
          body: `Es la hora de tu actividad (${horaActual}).`,
          icon: 'icons/icon-192.png',
          tag: tarea.id || 'tarea-notif'
        });

        // Marca que ya se notificó hoy para no repetir en el mismo minuto
        tarea.lastNotified = hoyStr;
        cambios = true;
      }
    });

    // Guarda el estado actualizado si hubo notificaciones
    if (cambios) {
      localStorage.setItem('myday_tasks', JSON.stringify(tareas));
    }
  }, 60000); // Revisa cada 60.000 milisegundos (1 minuto)
}

// Iniciar el comprobador tras cargar la página
document.addEventListener('DOMContentLoaded', () => {
  iniciarComprobadorNotificaciones();
});