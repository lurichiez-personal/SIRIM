const DB_NAME = 'SIRIM_RNC_DB';
const STORE_NAME = 'rnc_store';
const DB_VERSION = 1;

let db: IDBDatabase;

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("IndexedDB error:", request.error);
            reject(request.error);
        };

        request.onsuccess = (event) => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const tempDb = (event.target as IDBOpenDBRequest).result;
            if (!tempDb.objectStoreNames.contains(STORE_NAME)) {
                const store = tempDb.createObjectStore(STORE_NAME, { keyPath: 'rnc' });
            }
        };
    });
}

export async function clearRNCData(): Promise<void> {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function appendRNCData(data: { rnc: string, name: string, status: string }[]): Promise<void> {
    if (data.length === 0) return Promise.resolve();
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    data.forEach(item => {
        store.put(item);
    });
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

export async function findRNC(rnc: string): Promise<{ rnc: string, name: string, status: string } | null> {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(rnc);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            resolve(request.result || null);
        };
        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function getDBInfo(): Promise<{ lastUpdated: number, count: number } | null> {
    try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const countRequest = store.count();
        
        return new Promise((resolve) => {
            countRequest.onsuccess = () => {
                const lastUpdated = localStorage.getItem('rncDBLastUpdated');
                resolve({
                    count: countRequest.result,
                    lastUpdated: lastUpdated ? parseInt(lastUpdated, 10) : 0,
                });
            };
            countRequest.onerror = () => resolve(null);
        });
    } catch(e) {
        return null;
    }
}