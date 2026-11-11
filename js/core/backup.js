import { db } from './db.js';

export async function exportData() {
  const tasks = await db.getAll('tasks');
  const events = await db.getAll('events');
  const notes = await db.getAll('notes');

  const payload = {
    app: 'MI_DIA',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      tasks,
      events,
      notes
    }
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `MiDia_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);

        if (!parsed.app || parsed.app !== 'MI_DIA' || !parsed.data) {
          throw new Error('El archivo seleccionado no es una copia de seguridad válida de MI DÍA.');
        }

        const { tasks = [], events = [], notes = [] } = parsed.data;

        // Sobrescribir o añadir registros a IndexedDB
        for (const t of tasks) await db.update('tasks', t);
        for (const ev of events) await db.update('events', ev);
        for (const n of notes) await db.update('notes', n);

        resolve(true);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsText(file);
  });
}