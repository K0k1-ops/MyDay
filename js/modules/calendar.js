import { db } from '../core/db.js';

export class CalendarView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentDate = new Date();
    this.selectedDateStr = new Date().toISOString().slice(0, 10);
  }

  async render() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const events = await db.getAll('events');
    const tasks = await db.getAll('tasks');

    // Días del mes actual
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Domingo
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Ajustar para que la semana empiece en Lunes (0 = Lunes, 6 = Domingo)
    const startOffset = (firstDayIndex === 0 ? 6 : firstDayIndex - 1);

    const todayStr = new Date().toISOString().slice(0, 10);

    this.container.innerHTML = `
      <header style="margin-bottom: 20px;">
        <h1 style="font-size: 1.8rem; font-weight: 700;">Calendario</h1>
        <p style="color: var(--text-secondary);">Planifica tus eventos y fechas importantes</p>
      </header>

      <!-- Selector de Mes -->
      <div class="card" style="padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h2 style="font-size: 1.2rem; font-weight: 600; text-transform: capitalize;">
            ${monthNames[month]} ${year}
          </h2>
          <div style="display: flex; gap: 8px;">
            <button id="cal-prev" class="icon-button" style="padding: 8px; border-radius: 8px; background: var(--bg-primary);">
              <i data-lucide="chevron-left"></i>
            </button>
            <button id="cal-today-btn" style="padding: 6px 12px; font-size: 0.85rem; border-radius: 8px; background: var(--bg-primary); font-weight: 600;">Hoy</button>
            <button id="cal-next" class="icon-button" style="padding: 8px; border-radius: 8px; background: var(--bg-primary);">
              <i data-lucide="chevron-right"></i>
            </button>
          </div>
        </div>

        <!-- Encabezados de Días de la Semana -->
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 8px;">
          <div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div><div>Dom</div>
        </div>

        <!-- Grid de Días -->
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;" id="calendar-days-grid">
          ${this.generateDaysGrid(startOffset, daysInMonth, year, month, todayStr, events, tasks)}
        </div>
      </div>

      <!-- Detalle del Día Seleccionado -->
      <section style="margin-top: 24px;">
        <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 12px;">
          Agenda para el ${this.formatSelectedDateLabel()}
        </h3>
        <div id="day-details-container">
          ${this.renderDayDetails(events, tasks)}
        </div>
      </section>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  generateDaysGrid(offset, daysInMonth, year, month, todayStr, events, tasks) {
    let html = '';

    // Celdas vacías al inicio
    for (let i = 0; i < offset; i++) {
      html += `<div style="height: 44px;"></div>`;
    }

    // Celdas de los días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      const dayFormatted = String(day).padStart(2, '0');
      const monthFormatted = String(month + 1).padStart(2, '0');
      const dateStr = `${year}-${monthFormatted}-${dayFormatted}`;

      const isToday = dateStr === todayStr;
      const isSelected = dateStr === this.selectedDateStr;

      const hasEvents = events.some(e => e.startDate === dateStr);
      const hasTasks = tasks.some(t => t.dueDate === dateStr);

      let cellStyle = `
        height: 44px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
        position: relative;
        transition: all 0.15s ease;
      `;

      if (isSelected) {
        cellStyle += `background: var(--accent-primary); color: #fff;`;
      } else if (isToday) {
        cellStyle += `border: 2px solid var(--accent-primary); color: var(--accent-primary);`;
      } else {
        cellStyle += `background: transparent; color: var(--text-primary);`;
      }

      html += `
        <div class="cal-day-cell" data-date="${dateStr}" style="${cellStyle}">
          <span>${day}</span>
          ${(hasEvents || hasTasks) ? `
            <span style="
              width: 5px;
              height: 5px;
              border-radius: 50%;
              background: ${isSelected ? '#fff' : 'var(--accent-primary)'};
              position: absolute;
              bottom: 4px;
            "></span>
          ` : ''}
        </div>
      `;
    }

    return html;
  }

  formatSelectedDateLabel() {
    if (!this.selectedDateStr) return '';
    const [y, m, d] = this.selectedDateStr.split('-');
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  renderDayDetails(events, tasks) {
    const dayEvents = events.filter(e => e.startDate === this.selectedDateStr);
    const dayTasks = tasks.filter(t => t.dueDate === this.selectedDateStr);

    if (dayEvents.length === 0 && dayTasks.length === 0) {
      return `<p style="color: var(--text-muted); font-size: 0.9rem;">No hay compromisos ni tareas para esta fecha.</p>`;
    }

    let html = '';

    if (dayEvents.length > 0) {
      html += `<div style="margin-bottom: 12px; font-weight: 600; font-size: 0.85rem; color: var(--text-secondary);">EVENTOS</div>`;
      dayEvents.forEach(e => {
        html += `
          <div class="card" style="display: flex; gap: 16px; align-items: center; padding: 12px 16px; margin-bottom: 8px;">
            <span style="font-weight: 700; color: var(--accent-primary);">${e.startTime || 'Todo el día'}</span>
            <span style="font-weight: 500;">${e.title}</span>
          </div>
        `;
      });
    }

    if (dayTasks.length > 0) {
      html += `<div style="margin-top: 16px; margin-bottom: 12px; font-weight: 600; font-size: 0.85rem; color: var(--text-secondary);">TAREAS</div>`;
      dayTasks.forEach(t => {
        html += `
          <div class="card" style="display: flex; gap: 12px; align-items: center; padding: 12px 16px; margin-bottom: 8px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--accent-primary);"></span>
            <span style="font-weight: 500; ${t.status === 'completed' ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${t.title}</span>
          </div>
        `;
      });
    }

    return html;
  }

  bindEvents() {
    this.container.querySelector('#cal-prev').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.render();
    });

    this.container.querySelector('#cal-next').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.render();
    });

    this.container.querySelector('#cal-today-btn').addEventListener('click', () => {
      this.currentDate = new Date();
      this.selectedDateStr = new Date().toISOString().slice(0, 10);
      this.render();
    });

    this.container.querySelectorAll('.cal-day-cell').forEach(cell => {
      cell.addEventListener('click', (e) => {
        const target = e.currentTarget;
        this.selectedDateStr = target.dataset.date;
        this.render();
      });
    });
  }
}