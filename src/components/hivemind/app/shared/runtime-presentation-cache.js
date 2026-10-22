/** Read-only local presentation. Never used for authorization or execution state. */
const DB = 'hivemind-runtime-presentation-v1', STORE = 'windows', TTL = 24 * 60 * 60 * 1000;
const validScope = scope => typeof scope === 'string' && /^[0-9a-f-]+:[0-9a-f-]+$/i.test(scope);
export const runtimeRouteKey = scope => `hivemind.runtime.route.v1:${scope}`;
export function readRuntimeRoute(scope) {
  if (!validScope(scope)) return null;
  try { const path = localStorage.getItem(runtimeRouteKey(scope)); return /^\/hivemind\/app\/employee\/harness\/session\/session-[a-z0-9-]+$/.test(path || '') ? path : null; } catch { return null; }
}
export function validRuntimePresentation(value, scope, sessionId, now = Date.now()) {
  return validScope(scope) && value?.scope === scope && value.sessionId === sessionId
    && Number.isSafeInteger(value.generation) && value.generation > 0 && Number.isFinite(value.at)
    && value.at <= now + 60000 && now - value.at < TTL && Array.isArray(value.messages) && value.messages.length <= 10
    && value.messages.every(m => ['user','assistant'].includes(m.role) && typeof m.text === 'string' && m.text.length <= 4000 && Number.isSafeInteger(m.seq));
}
function database() {
  return new Promise(resolve => {
    if (typeof indexedDB === 'undefined') { resolve(null); return; }
    const request = indexedDB.open(DB,1);
    request.onupgradeneeded = () => { request.result.createObjectStore(STORE,{keyPath:'key'}); };
    request.onsuccess = () => resolve(request.result); request.onerror = () => resolve(null);
  });
}
async function all(scope) {
  const db = await database(); if (!db) return [];
  return new Promise(resolve => {
    const request = db.transaction(STORE).objectStore(STORE).getAll();
    request.onsuccess = () => { const rows = request.result.filter(row => row.scope === scope); db.close(); resolve(rows); };
    request.onerror = () => { db.close(); resolve([]); };
  });
}
export async function readRuntimePresentation(scope, sessionId) {
  if (!validScope(scope) || !sessionId) return null;
  try { if (localStorage.getItem(`runtime.reset.pending:${sessionId}`)) return null; } catch {}
  let completed = 0; try { completed = Number(localStorage.getItem(`runtime.reset.completed:${sessionId}`)) || 0; } catch {}
  const rows = (await all(scope)).filter(row => row.generation >= completed && validRuntimePresentation(row,scope,sessionId));
  return rows.sort((a,b) => b.generation-a.generation || b.at-a.at)[0] || null;
}
export async function saveRuntimePresentation(value) {
  if (!validRuntimePresentation(value,value?.scope,value?.sessionId)) return;
  const db = await database(); if (!db) return;
  await new Promise(resolve => {
    const transaction = db.transaction(STORE,'readwrite'), store = transaction.objectStore(STORE), query = store.getAll();
    query.onsuccess = () => {
      const rows = query.result.filter(row=>row.scope===value.scope);
      if (rows.some(row=>row.sessionId===value.sessionId && row.generation>value.generation)) return;
      const retained = rows.filter(row=>row.sessionId!==value.sessionId && Date.now()-row.at<TTL).sort((a,b)=>b.at-a.at).slice(0,9);
      for (const row of rows) if (!retained.some(item=>item.key===row.key)) store.delete(row.key);
      store.put({...value,key:`${value.scope}:${value.sessionId}:${value.generation}`});
    };
    transaction.oncomplete = transaction.onabort = () => { db.close(); resolve(); };
  });
  try { localStorage.setItem(runtimeRouteKey(value.scope),`/hivemind/app/employee/harness/session/${value.sessionId}`); } catch {}
}

export async function clearRuntimePresentation(scope) {
  if (!validScope(scope)) return;
  const rows = await all(scope), db = await database(); if (!db) return;
  const transaction = db.transaction(STORE,'readwrite'); for (const row of rows) transaction.objectStore(STORE).delete(row.key);
  transaction.oncomplete = transaction.onabort = () => db.close();
  try { localStorage.removeItem(runtimeRouteKey(scope)); } catch {}
}

// Logout clears this product cache even when the chat view is unmounted.
if (typeof window !== 'undefined') window.addEventListener('hivemind:clear-runtime-cache',()=>{
  if (typeof indexedDB !== 'undefined') indexedDB.deleteDatabase(DB);
  try { for (const key of Object.keys(localStorage)) if (key.startsWith('hivemind.runtime.route.v1:')) localStorage.removeItem(key); } catch {}
});
