import { db } from '../core/db.js';

export class NotesView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.searchQuery = '';
  }

  async render() {
    const notes = await db.getAll('notes');

    let filteredNotes = notes;
    if (this.searchQuery.trim() !== '') {
      const q = this.searchQuery.toLowerCase();
      filteredNotes = notes.filter(n => 
        n.title.toLowerCase().includes(q) || (n.content && n.content.toLowerCase().includes(q))
      );
    }

    // Ordenar: fijadas primero, luego por fecha de modificación
    filteredNotes.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    this.container.innerHTML = `
      <header style="margin-bottom: 20px;">
        <h1 style="font-size: 1.8rem; font-weight: 700;">Notas Rápidas</h1>
        <p style="color: var(--text-secondary);">Tus ideas, recordatorios e información de interés</p>
      </header>

      <!-- Buscador de Notas -->
      <div style="margin-bottom: 20px;">
        <input 
          type="text" 
          id="notes-search" 
          class="form-input" 
          placeholder="Buscar en tus notas..." 
          value="${this.searchQuery}"
        >
      </div>

      <!-- Grid de Notas -->
      ${filteredNotes.length === 0 ? `
        <div style="text-align: center; padding: 40px 16px; color: var(--text-muted);">
          <i data-lucide="file-text" style="width: 40px; height: 40px; margin-bottom: 8px; opacity: 0.4;"></i>
          <p>No tienes notas guardadas. ¡Pulsa + para crear una!</p>
        </div>
      ` : ''}

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px;">
        ${filteredNotes.map(n => `
          <div class="card" data-id="${n.id}" style="position: relative; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <h3 style="font-size: 1.05rem; font-weight: 600; padding-right: 24px;">${n.title}</h3>
                <button class="btn-pin-note" style="position: absolute; top: 16px; right: 16px; color: ${n.isPinned ? 'var(--accent-warning)' : 'var(--text-muted)'};">
                  <i data-lucide="pin" style="width: 16px; height: 16px;"></i>
                </button>
              </div>
              <p style="font-size: 0.9rem; color: var(--text-secondary); white-space: pre-wrap; word-break: break-word;">${n.content || ''}</p>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; pt-8; border-top: 1px solid var(--border-color); padding-top: 8px;">
              <span style="font-size: 0.75rem; color: var(--text-muted);">
                ${new Date(n.updatedAt).toLocaleDateString('es-ES')}
              </span>
              <button class="btn-delete-note" style="color: var(--text-muted);" title="Eliminar">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  bindEvents() {
    const searchInput = this.container.querySelector('#notes-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render();
      });
    }

    // Toggle Pin
    this.container.querySelectorAll('.btn-pin-note').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const noteCard = e.target.closest('.card');
        const noteId = noteCard.dataset.id;
        const notes = await db.getAll('notes');
        const note = notes.find(n => n.id === noteId);
        if (note) {
          note.isPinned = !note.isPinned;
          await db.update('notes', note);
          this.render();
        }
      });
    });

    // Eliminar nota
    this.container.querySelectorAll('.btn-delete-note').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const noteCard = e.target.closest('.card');
        const noteId = noteCard.dataset.id;
        if (confirm('¿Deseas borrar esta nota?')) {
          await db.delete('notes', noteId);
          this.render();
        }
      });
    });
  }
}