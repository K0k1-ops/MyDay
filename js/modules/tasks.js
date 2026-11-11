// js/modules/tasks.js
import { db } from '../core/db.js';

export class TasksView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentCategory = 'all';
  }

  async render() {
    const tasks = await db.getAll('tasks');
    
    let filteredTasks = tasks;
    if (this.currentCategory !== 'all') {
      filteredTasks = filteredTasks.filter(t => t.category === this.currentCategory);
    }

    // Separar tareas en 2 grandes grupos:
    // 1. To-Do List / Inbox (Sin fecha asignada)
    const backlogTasks = filteredTasks.filter(t => !t.isRecurring && !t.dueDate);

    // 2. Tareas agendadas o rutinas
    const scheduledTasks = filteredTasks.filter(t => t.isRecurring || t.dueDate);

    const dayLabels = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 0: 'D' };

    this.container.innerHTML = `
      <header style="margin-bottom: 20px;">
        <h1 style="font-size: 1.8rem; font-weight: 700;">To-Do List & Tareas</h1>
        <p style="color: var(--text-secondary);">Apunta cosas rápidamente o revisa tu lista de pendientes</p>
      </header>

      <!-- Entrada Rápida de Tareas (Quick Add) -->
      <form id="quick-todo-form" style="margin-bottom: 24px; display: flex; gap: 8px;">
        <input 
          type="text" 
          id="quick-todo-input" 
          class="form-input" 
          placeholder="⚡ Añadir tarea rápida a mi To-Do List (Pulsa Enter)..." 
          style="flex: 1;" 
          required
        >
        <button type="submit" class="btn-primary" style="white-space: nowrap; width: auto; padding: 0 16px;">
          + Añadir
        </button>
      </form>

      <!-- Filtro por Categoría -->
      <div style="margin-bottom: 20px;">
        <select id="category-filter" class="form-input" style="padding: 8px 12px; font-size: 0.85rem; width: auto;">
          <option value="all" ${this.currentCategory === 'all' ? 'selected' : ''}>Todas las categorías</option>
          <option value="Estudios">Estudios</option>
          <option value="Personal">Personal</option>
          <option value="Trabajo">Trabajo</option>
          <option value="Casa">Casa</option>
          <option value="Compras">Compras</option>
          <option value="Otros">Otros</option>
        </select>
      </div>

      <!-- SECCIÓN 1: Bandeja de Entrada / To-Do List (Sin Fecha) -->
      <section style="margin-bottom: 32px;">
        <h2 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span>📌 Pendientes de organizar (To-Do List)</span>
          <span class="badge badge-otros" style="font-size: 0.75rem;">${backlogTasks.length}</span>
        </h2>

        <div class="card">
          ${backlogTasks.length === 0 ? `
            <p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 12px;">
              ¡No tienes nada pendiente de organizar! Usa la barra de arriba para volcar ideas.
            </p>
          ` : ''}

          ${backlogTasks.map(t => `
            <div class="task-item ${t.status === 'completed' ? 'completed' : ''}" data-id="${t.id}">
              <div class="custom-checkbox btn-toggle-task" style="flex-shrink: 0;">
                ${t.status === 'completed' ? '✓' : ''}
              </div>
              <div style="flex: 1; min-width: 0;">
                <div class="task-text" style="font-weight: 500;">${t.title}</div>
              </div>
              <span class="badge badge-${t.category ? t.category.toLowerCase() : 'otros'}">${t.category || 'General'}</span>
              <button class="btn-delete-task" style="color: var(--text-muted); padding: 4px; border-radius: 4px;" title="Eliminar">
                <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
              </button>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- SECCIÓN 2: Tareas Agendadas y Rutinas -->
      <section>
        <h2 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span>📅 Agendadas & Rutinas</span>
          <span class="badge badge-estudios" style="font-size: 0.75rem;">${scheduledTasks.length}</span>
        </h2>

        <div class="card">
          ${scheduledTasks.length === 0 ? `
            <p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 12px;">
              No tienes tareas fijadas con fecha o rutinas.
            </p>
          ` : ''}

          ${scheduledTasks.map(t => {
            const daysText = t.isRecurring && t.repeatDays 
              ? t.repeatDays.map(d => dayLabels[d]).join(', ') 
              : '';

            return `
              <div class="task-item" data-id="${t.id}">
                <div style="flex: 1; min-width: 0;">
                  <div class="task-text" style="font-weight: 500;">
                    ${t.title}
                    ${t.isRecurring ? `<span style="font-size: 0.75rem; color: var(--accent-primary); margin-left: 6px;">🔄 Rutina (${daysText})</span>` : ''}
                  </div>
                  ${t.dueDate ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Fecha: ${t.dueDate} ${t.startTime ? `(${t.startTime})` : ''}</div>` : ''}
                </div>
                <span class="badge badge-${t.category ? t.category.toLowerCase() : 'otros'}">${t.category || 'General'}</span>
                <button class="btn-delete-task" style="color: var(--text-muted); padding: 4px; border-radius: 4px;" title="Eliminar">
                  <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  bindEvents() {
    // Volcado rápido con tecla Enter
    const quickForm = this.container.querySelector('#quick-todo-form');
    if (quickForm) {
      quickForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = this.container.querySelector('#quick-todo-input');
        const title = input.value.trim();
        if (title) {
          await db.add('tasks', {
            id: 'task_' + Date.now(),
            title,
            category: 'Personal',
            isRecurring: false,
            dueDate: null,
            startTime: null,
            endTime: null,
            status: 'pending',
            createdAt: new Date().toISOString()
          });
          input.value = '';
          this.render();
        }
      });
    }

    // Filtro por categoría
    const catSelect = this.container.querySelector('#category-filter');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        this.currentCategory = e.target.value;
        this.render();
      });
    }

    // Completar tarea sin fecha
    this.container.querySelectorAll('.btn-toggle-task').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const itemEl = e.target.closest('.task-item');
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

    // Eliminar tarea
    this.container.querySelectorAll('.btn-delete-task').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const itemEl = e.target.closest('.task-item');
        const taskId = itemEl.dataset.id;
        if (confirm('¿Deseas eliminar esta tarea?')) {
          await db.delete('tasks', taskId);
          this.render();
        }
      });
    });
  }
}