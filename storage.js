const DATABASE='london-field-atlas-models-v2';
async function db(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DATABASE,1);req.onupgradeneeded=()=>req.result.createObjectStore('models',{keyPath:'key'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function transact(mode,action){const d=await db();try{return await new Promise((resolve,reject)=>{const tx=d.transaction('models',mode),req=action(tx.objectStore('models'));let result;req.onsuccess=()=>result=req.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}finally{d.close()}}
export const savedModels=()=>transact('readonly',s=>s.getAll());
export const saveModel=model=>transact('readwrite',s=>s.put(model));
export const deleteModel=key=>transact('readwrite',s=>s.delete(key));
