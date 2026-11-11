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