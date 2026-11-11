// js/core/db.js
class DBManager {
  constructor() {
    this.dbName = 'midia_db';
    this.version = 1;
    this.db = null;
  }

  async open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Store de Tareas
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('status', 'status', { unique: false });
          taskStore.createIndex('dueDate', 'dueDate', { unique: false });
        }

        // Store de Eventos
        if (!db.objectStoreNames.contains('events')) {
          const eventStore = db.createObjectStore('events', { keyPath: 'id' });
          eventStore.createIndex('startDate', 'startDate', { unique: false });
        }

        // Store de Notas
        if (!db.objectStoreNames.contains('notes')) {
          const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
          noteStore.createIndex('isPinned', 'isPinned', { unique: false });
        }

        // Store de Ajustes
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onerror = (e) => reject(e.target.error);
    });
  }

  async add(storeName, item) {
    return this._transaction(storeName, 'readwrite', store => store.add(item));
  }

  async getAll(storeName) {
    return this._transaction(storeName, 'readonly', store => store.getAll());
  }

  async update(storeName, item) {
    return this._transaction(storeName, 'readwrite', store => store.put(item));
  }

  async delete(storeName, id) {
    return this._transaction(storeName, 'readwrite', store => store.delete(id));
  }

  _transaction(storeName, mode, callback) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = callback(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const db = new DBManager();