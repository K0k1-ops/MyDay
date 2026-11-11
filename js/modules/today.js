// js/modules/today.js
import { db } from '../core/db.js';

export class TodayView {
  constructor(containerId) {
    this.containerId = containerId;
  }

  get container() {
    return document.getElementById(this.containerId);
  }

  async render() {
    if (!this.container) return;

    try {
      const todayObj = new Date();
      const todayStr = todayObj.toISOString().slice(0, 10);

      let allTasks = [];
      let allEvents = [];

      try { allTasks = await db.getAll('tasks') || []; } catch (e) { console.error(e); }
      try { allEvents = await db.getAll('events') || []; } catch (e) { console.error(e); }

      const backlogTasks = allTasks.filter(t => t && !t.isRecurring && !t.dueDate);
      const weekRangeText = this.getWeekRangeText(todayObj);

      this.container.innerHTML = `
        <header style="margin-bottom: 20px;">
          <h1 style="font-size: 1.8rem; font-weight: 700;">Planificación Semanal</h1>
          <p style="color: var(--text-secondary); text-transform: capitalize;">${weekRangeText}</p>
        </header>

        <!-- Grid Principal de la Semana -->
        <section style="margin-bottom: 32px;">
          ${this.renderWeekGrid(allTasks, allEvents, todayObj, todayStr)}
        </section>

        <!-- Sección To-Do List (Arrastrables) -->
        <section>
          <h2 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span>📌 To-Do List (Arrastra una tarea a la hora deseada)</span>
            <span class="badge badge-otros" style="font-size: 0.75rem;">${backlogTasks.length}</span>
          </h2>
          <div class="card">
            ${backlogTasks.length === 0 ? `
              <p style="color: var(--text-muted); font-size: 0.85rem; padding: 8px 0;">No tienes tareas pendientes por organizar.</p>
            ` : ''}

            ${backlogTasks.map(t => `
              <div class="task-item ${t.status === 'completed' ? 'completed' : ''}" data-id="${t.id}" draggable="true" style="cursor: pointer;">
                <i data-lucide="grip-vertical" style="width: 16px; height: 16px; color: var(--text-muted); cursor: grab;"></i>
                <div class="custom-checkbox btn-toggle-backlog" style="flex-shrink: 0; cursor: pointer;">
                  ${t.status === 'completed' ? '✓' : ''}
                </div>
                <div style="flex: 1; min-width: 0;" class="btn-edit-task">
                  <div class="task-text" style="font-weight: 500;">${this.escapeHtml(t.title || '')}</div>
                </div>
                <span class="badge badge-${(t.category || 'otros').toLowerCase()}">${t.category || 'General'}</span>
              </div>
            `).join('')}
          </div>
        </section>
      `;

      this.bindEvents(todayStr);
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error('Error al renderizar la vista semanal:', err);
    }
  }

  renderWeekGrid(allTasks, allEvents, todayObj, todayStr) {
    const curr = new Date(todayObj);
    const day = curr.getDay();
    const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
    
    const monday = new Date(curr.setDate(diffToMonday));
    const weekDays = [];
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      weekDays.push({
        dateStr: dateStr,
        dayNum: d.getDate(),
        dayOfWeek: d.getDay(),
        label: dayNames[i],
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr
      });
    }

    let headerHtml = `<div class="week-head-cell">Hora</div>`;
    weekDays.forEach(wd => {
      let cellClass = 'week-head-cell';
      if (wd.isToday) cellClass += ' today-cell';
      else if (wd.isPast) cellClass += ' past-day-cell';

      headerHtml += `
        <div class="${cellClass}">
          <div>${wd.label}</div>
          <div style="font-size: 1rem; font-weight: 800;">${wd.dayNum}</div>
        </div>
      `;
    });

    const combinedList = [...(allTasks || []), ...(allEvents || [])];

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    let bodyRows = '';
    for (let h = 8; h <= 22; h++) {
      const hourStr = `${String(h).padStart(2, '0')}:00`;
      let cellsHtml = `<div class="hour-label" style="width: 50px;">${hourStr}</div>`;

      weekDays.forEach(wd => {
        const cellTasks = combinedList.filter(t => {
          if (!t || !t.startTime || typeof t.startTime !== 'string') return false;
          const parts = t.startTime.split(':');
          if (parts.length < 2) return false;
          
          const startH = parseInt(parts[0], 10);
          let endH = t.endTime && typeof t.endTime === 'string' ? parseInt(t.endTime.split(':')[0], 10) : startH + 1;
          if (isNaN(endH) || endH <= startH) endH = startH + 1;

          if (h < startH || h >= endH) return false;

          if (t.isRecurring) {
            const afterStart = !t.startDate || t.startDate <= wd.dateStr;
            const beforeEnd = !t.endDate || t.endDate >= wd.dateStr;
            const matchesDay = Array.isArray(t.repeatDays) && t.repeatDays.includes(wd.dayOfWeek);
            return afterStart && beforeEnd && matchesDay;
          }
          return t.dueDate === wd.dateStr || t.startDate === wd.dateStr;
        });

        let cellClass = 'week-day-cell';
        if (wd.isPast) cellClass += ' past-day-cell';

        let currentTimeLineHtml = '';
        if (wd.isToday && h === currentHour) {
          const minutePercent = (currentMinutes / 60) * 100;
          currentTimeLineHtml = `<div class="current-time-line" style="top: ${minutePercent.toFixed(1)}%;"></div>`;
        }

        cellsHtml += `
          <div class="${cellClass}" data-date="${wd.dateStr}" data-hour="${h}">
            ${currentTimeLineHtml}
            ${cellTasks.map(t => {
              const catClass = `bg-cat-${(t.category || 'otros').toLowerCase()}`;
              const startH = parseInt(t.startTime.split(':')[0], 10);
              const isFirstHour = (h === startH);

              return `
                <div class="block-item ${catClass}" data-id="${t.id}" style="padding: 3px 5px; font-size: 0.75rem; border-radius: 4px; cursor: pointer; ${!isFirstHour ? 'opacity: 0.85;' : ''}">
                  <div style="font-weight: ${isFirstHour ? '700' : '500'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">
                    ${isFirstHour ? this.escapeHtml(t.title || '') : `↳ ${this.escapeHtml(t.title || '')}`}
                  </div>
                  ${isFirstHour ? `
                    <button class="btn-delete-task" style="background: none; border: none; color: #fff; cursor: pointer; padding: 0;" title="Eliminar">
                      <i data-lucide="x" style="width: 12px; height: 12px;"></i>
                    </button>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        `;
      });

      bodyRows += `<div class="week-hour-row">${cellsHtml}</div>`;
    }

    return `
      <div class="week-grid-wrapper">
        <div class="week-grid-header">${headerHtml}</div>
        <div class="week-grid-body">${bodyRows}</div>
      </div>
    `;
  }

  getWeekRangeText(todayObj) {
    const curr = new Date(todayObj);
    const day = curr.getDay();
    const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
    
    const monday = new Date(curr.setDate(diffToMonday));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const mMonth = monday.toLocaleDateString('es-ES', { month: 'short' });
    const sMonth = sunday.toLocaleDateString('es-ES', { month: 'short' });

    return `Semana del ${monday.getDate()} ${mMonth} al ${sunday.getDate()} ${sMonth}`;
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  bindEvents(todayStr) {
    // 1. Abrir Modal de Edición al hacer clic en un bloque de la semana
    this.container.querySelectorAll('.block-item').forEach(block => {
      block.addEventListener('click', async (e) => {
        if (e.target.closest('.btn-delete-task')) return;

        const taskId = block.dataset.id;
        const tasks = await db.getAll('tasks');
        const task = tasks.find(t => t.id === taskId);
        if (task && window.openTaskModal) {
          window.openTaskModal(task);
        }
      });
    });

    // 2. Marcar tareas completadas del To-Do List
    this.container.querySelectorAll('.btn-toggle-backlog').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const itemEl = e.target.closest('.task-item');
        if (!itemEl) return;
        const taskId = itemEl.dataset.id;
        const tasks = await db.getAll('tasks');
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          task.status = task.status === 'completed' ? 'pending' : 'completed';
          await db.update('tasks', task);
          this.render();
        }
      });
    });

    // 3. Abrir edición en elementos del To-Do List
    this.container.querySelectorAll('.btn-edit-task').forEach(el => {
      el.addEventListener('click', async (e) => {
        const itemEl = e.target.closest('.task-item');
        if (!itemEl) return;
        const taskId = itemEl.dataset.id;
        const tasks = await db.getAll('tasks');
        const task = tasks.find(t => t.id === taskId);
        if (task && window.openTaskModal) {
          window.openTaskModal(task);
        }
      });
    });

    // 4. Eliminar tareas de la semana
    this.container.querySelectorAll('.btn-delete-task').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const itemEl = e.target.closest('.block-item');
        if (!itemEl) return;
        const taskId = itemEl.dataset.id;
        if (confirm('¿Deseas eliminar esta actividad de la semana?')) {
          await db.delete('tasks', taskId);
          await db.delete('events', taskId);
          this.render();
        }
      });
    });

    // 5. Arrastrar y Soltar (Drag & Drop)
    this.container.querySelectorAll('.task-item[draggable="true"]').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', item.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
      });
    });

    this.container.querySelectorAll('.week-day-cell').forEach(cell => {
      cell.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        cell.classList.add('drop-target-active');
      });

      cell.addEventListener('dragleave', () => {
        cell.classList.remove('drop-target-active');
      });

      cell.addEventListener('drop', async (e) => {
        e.preventDefault();
        cell.classList.remove('drop-target-active');

        const taskId = e.dataTransfer.getData('text/plain');
        if (!taskId) return;

        const targetDate = cell.dataset.date;
        const targetHour = parseInt(cell.dataset.hour, 10);
        if (!targetDate || isNaN(targetHour)) return;

        const tasks = await db.getAll('tasks');
        const task = tasks.find(t => t.id === taskId);

        if (task) {
          const startH = String(targetHour).padStart(2, '0');
          const endH = String(targetHour + 1).padStart(2, '0');

          task.dueDate = targetDate;
          task.startTime = `${startH}:00`;
          task.endTime = `${endH}:00`;

          await db.update('tasks', task);
          await this.render();

          // Abrir modal inmediatamente para cambiar fácilmente la hora de fin si dura más de 1 hora
          if (window.openTaskModal) {
            window.openTaskModal(task);
          }
        }
      });
    });
  }
}