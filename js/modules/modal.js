// js/modules/modal.js
import { db } from '../core/db.js';

export class ModalController {
  constructor(onDataSavedCallback) {
    this.modal = document.getElementById('quick-modal');
    this.fab = document.getElementById('fab-add');
    this.closeBtn = this.modal ? this.modal.querySelector('.close-modal') : null;
    this.tabs = this.modal ? this.modal.querySelectorAll('.tab-btn') : [];
    this.form = document.getElementById('quick-form');
    this.currentTab = 'task';
    this.onSaved = onDataSavedCallback;
    this.selectedDays = [];
    this.editingTask = null;

    this.init();
  }

  init() {
    if (this.fab) this.fab.addEventListener('click', () => this.open());
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }

    this.tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.tabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.currentTab = e.target.dataset.tab;
        this.renderForm();
      });
    });

    if (this.form) {
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
  }

  open(taskToEdit = null) {
    this.editingTask = taskToEdit;
    if (this.modal) this.modal.classList.remove('hidden');

    if (taskToEdit) {
      this.currentTab = 'task';
      this.selectedDays = taskToEdit.repeatDays ? [...taskToEdit.repeatDays] : [];
    } else {
      this.selectedDays = [];
    }
    this.renderForm();
  }

  close() {
    if (this.modal) this.modal.classList.add('hidden');
    if (this.form) this.form.reset();
    this.selectedDays = [];
    this.editingTask = null;
  }

  renderForm() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const t = this.editingTask;

    if (this.currentTab === 'task') {
      const isNoDate = t ? (!t.isRecurring && !t.dueDate) : false;
      const isRecurring = t ? !!t.isRecurring : false;

      const dayNames = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 0: 'D' };

      this.form.innerHTML = `
        <div class="form-group">
          <label class="form-label">${t ? 'Editar Actividad' : 'Título de la actividad / tarea'}</label>
          <input type="text" id="field-title" class="form-input" value="${t ? this.escapeHtml(t.title || '') : ''}" placeholder="Ej. Universidad / Gimnasio" required autofocus>
        </div>

        <div class="form-group">
          <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer; color: var(--accent-primary);">
            <input type="checkbox" id="field-no-date" style="width: 18px; height: 18px;" ${isNoDate ? 'checked' : ''}>
            📌 Sin fecha (Guardar en To-Do List)
          </label>
        </div>

        <div id="datetime-fields" class="${isNoDate ? 'hidden' : ''}">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label class="form-label">Hora Inicio</label>
              <input type="time" id="field-start-time" class="form-input" value="${t && t.startTime ? t.startTime : '09:00'}">
            </div>
            <div class="form-group">
              <label class="form-label">Hora Fin (Duración)</label>
              <input type="time" id="field-end-time" class="form-input" value="${t && t.endTime ? t.endTime : '10:00'}">
            </div>
          </div>

          <div id="single-date-group" class="form-group ${isRecurring ? 'hidden' : ''}">
            <label class="form-label">Fecha</label>
            <input type="date" id="field-date" class="form-input" value="${t && t.dueDate ? t.dueDate : (t && t.startDate ? t.startDate : todayStr)}">
          </div>

          <div class="form-group">
            <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer;">
              <input type="checkbox" id="field-is-recurring" style="width: 18px; height: 18px;" ${isRecurring ? 'checked' : ''}>
              ¿Se repite cada semana? (Rutina)
            </label>
          </div>

          <div id="recurring-options" class="${isRecurring ? '' : 'hidden'}">
            <div class="form-group">
              <label class="form-label">Días en los que se repite</label>
              <div class="days-selector">
                ${[1, 2, 3, 4, 5, 6, 0].map(d => {
                  const isSel = this.selectedDays.includes(d);
                  return `<button type="button" class="day-chip ${isSel ? 'selected' : ''}" data-day="${d}">${dayNames[d]}</button>`;
                }).join('')}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Fecha fin de la rutina (Opcional)</label>
              <input type="date" id="field-end-date" class="form-input" value="${t && t.endDate ? t.endDate : ''}">
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Categoría</label>
          <select id="field-category" class="form-input">
            <option value="Estudios" ${t && t.category === 'Estudios' ? 'selected' : ''}>Estudios</option>
            <option value="Personal" ${t && t.category === 'Personal' ? 'selected' : ''}>Personal</option>
            <option value="Trabajo" ${t && t.category === 'Trabajo' ? 'selected' : ''}>Trabajo</option>
            <option value="Casa" ${t && t.category === 'Casa' ? 'selected' : ''}>Casa</option>
            <option value="Compras" ${t && t.category === 'Compras' ? 'selected' : ''}>Compras</option>
            <option value="Otros" ${t && t.category === 'Otros' ? 'selected' : ''}>Otros</option>
          </select>
        </div>

        <button type="submit" class="btn-primary">${t ? 'Guardar Cambios' : 'Guardar Tarea'}</button>
      `;
    } else if (this.currentTab === 'note') {
      this.form.innerHTML = `
        <div class="form-group">
          <label class="form-label">Título</label>
          <input type="text" id="field-title" class="form-input" placeholder="Ej. Nota rápida" required autofocus>
        </div>
        <div class="form-group">
          <label class="form-label">Contenido</label>
          <textarea id="field-content" class="form-input" rows="4" placeholder="Escribe aquí..."></textarea>
        </div>
        <button type="submit" class="btn-primary">Guardar Nota</button>
      `;
    }

    this.bindFormEvents();
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  bindFormEvents() {
    const noDateCheckbox = this.form.querySelector('#field-no-date');
    const dateTimeFields = this.form.querySelector('#datetime-fields');
    const isRecurringCheckbox = this.form.querySelector('#field-is-recurring');
    const recurringOptions = this.form.querySelector('#recurring-options');
    const singleDateGroup = this.form.querySelector('#single-date-group');

    if (noDateCheckbox) {
      noDateCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) dateTimeFields.classList.add('hidden');
        else dateTimeFields.classList.remove('hidden');
      });
    }

    if (isRecurringCheckbox) {
      isRecurringCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          recurringOptions.classList.remove('hidden');
          if (singleDateGroup) singleDateGroup.classList.add('hidden');
        } else {
          recurringOptions.classList.add('hidden');
          if (singleDateGroup) singleDateGroup.classList.remove('hidden');
        }
      });
    }

    this.form.querySelectorAll('.day-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const day = parseInt(e.target.dataset.day, 10);
        if (this.selectedDays.includes(day)) {
          this.selectedDays = this.selectedDays.filter(d => d !== day);
          e.target.classList.remove('selected');
        } else {
          this.selectedDays.push(day);
          e.target.classList.add('selected');
        }
      });
    });
  }

  async handleSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('field-title').value.trim();

    if (this.currentTab === 'task') {
      const category = document.getElementById('field-category').value;
      const noDate = document.getElementById('field-no-date').checked;

      let taskData = {
        id: this.editingTask ? this.editingTask.id : 'task_' + Date.now(),
        title,
        category,
        createdAt: this.editingTask ? this.editingTask.createdAt : new Date().toISOString()
      };

      if (noDate) {
        taskData = {
          ...taskData,
          isRecurring: false,
          dueDate: null,
          startTime: null,
          endTime: null,
          status: this.editingTask ? this.editingTask.status || 'pending' : 'pending'
        };
      } else {
        const isRecurring = document.getElementById('field-is-recurring').checked;
        const startDate = document.getElementById('field-date').value;
        const startTime = document.getElementById('field-start-time').value || null;
        const endTime = document.getElementById('field-end-time').value || null;

        taskData = {
          ...taskData,
          startTime,
          endTime
        };

        if (isRecurring) {
          const endDate = document.getElementById('field-end-date').value || null;
          taskData = {
            ...taskData,
            isRecurring: true,
            repeatDays: this.selectedDays.length > 0 ? this.selectedDays : [1, 2, 3, 4, 5],
            startDate,
            endDate,
            completedDates: this.editingTask ? this.editingTask.completedDates || [] : []
          };
        } else {
          taskData = {
            ...taskData,
            isRecurring: false,
            dueDate: startDate,
            status: this.editingTask ? this.editingTask.status || 'pending' : 'pending'
          };
        }
      }

      if (this.editingTask) {
        await db.update('tasks', taskData);
      } else {
        await db.add('tasks', taskData);
      }
    } else if (this.currentTab === 'note') {
      const content = document.getElementById('field-content').value;
      await db.add('notes', {
        id: 'note_' + Date.now(),
        title,
        content,
        isPinned: false,
        updatedAt: new Date().toISOString()
      });
    }

    this.close();
    if (this.onSaved) this.onSaved();
  }
}