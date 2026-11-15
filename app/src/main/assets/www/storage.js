(function(root){
'use strict';let dbPromise;
function db(){return dbPromise||(dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open('SceneNote_v14_records',1);req.onupgradeneeded=()=>{req.result.createObjectStore('records',{keyPath:'id'});req.result.createObjectStore('media');};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('다른 창의 기록 저장이 끝난 뒤 다시 열어 주세요.'));}));}
async function transact(stores,mode,fn){const database=await db();return new Promise((resolve,reject)=>{const t=database.transaction(stores,mode);let result;try{result=fn(t);}catch(e){t.abort();reject(e);return;}t.oncomplete=()=>resolve(result?.result);t.onerror=()=>reject(t.error||Error('기록을 저장하지 못했어요.'));t.onabort=()=>reject(t.error||Error('저장이 중단됐어요.'));});}
const api={
 all:()=>transact(['records'],'readonly',t=>t.objectStore('records').getAll()),
 get:id=>transact(['records'],'readonly',t=>t.objectStore('records').get(id)),
 media:id=>transact(['media'],'readonly',t=>t.objectStore('media').get(id)),
 save:(record,blob)=>transact(['records','media'],'readwrite',t=>{t.objectStore('records').put(structuredClone(record));if(blob!==undefined){if(blob===null)t.objectStore('media').delete(record.id);else t.objectStore('media').put(blob,record.id);}}),
 remove:id=>transact(['records','media'],'readwrite',t=>{t.objectStore('records').delete(id);t.objectStore('media').delete(id);})
};root.SceneStore=api;
})(globalThis);
