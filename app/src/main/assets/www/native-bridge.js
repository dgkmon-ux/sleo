/* Android host only. Replies are restricted by native origin + main-frame checks. */
(() => {
'use strict';
const bridge=window.SleoNative,CHUNK=192*1024,MAX=300*1024*1024;
let running=false,pending=null;
function fail(message,name='Error'){const error=new Error(message);error.name=name;return error;}
if(bridge)bridge.onmessage=event=>{
 let message;try{message=JSON.parse(event.data);}catch{return;}
 const p=pending;if(!p||message.id!==p.id)return;
 if(message.type==='error'||message.type==='cancelled'){
  clearTimeout(p.timer);pending=null;
  p.reject(fail(message.message||'파일을 저장하지 못했어요.',message.type==='cancelled'?'AbortError':'Error'));return;
 }
 if(message.type!==p.expected)return;
 clearTimeout(p.timer);pending=null;
 if(p.sequence!==undefined&&message.sequence!==p.sequence){p.reject(fail('파일 전달 순서를 확인할 수 없어요.'));return;}
 p.resolve(message);
};
function exchange(id,type,payload,expected,sequence,timeout=30000){
 return new Promise((resolve,reject)=>{
  const timer=timeout?setTimeout(()=>{if(pending?.id!==id)return;pending=null;reject(fail('저장 응답이 늦어졌어요. 저장 위치를 확인하고 다시 시도해 주세요.'));},timeout):null;
  pending={id,expected,sequence,resolve,reject,timer};
  try{bridge.postMessage(JSON.stringify({id,type,...payload}));}
  catch(error){clearTimeout(timer);pending=null;reject(error);}
 });
}
function base64(bytes){
 let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));
 return btoa(text);
}
window.NativeFiles=Object.freeze({
 available:!!bridge,
 maxBytes:MAX,
 async saveBlob(blob,name){
  if(!bridge)throw fail('Android System WebView를 업데이트한 뒤 다시 저장해 주세요.');
  if(!(blob instanceof Blob)||blob.size>MAX)throw fail('기록 파일은 300MB 이하로 저장해 주세요.');
  if(running)throw fail('진행 중인 저장을 마친 뒤 다시 눌러 주세요.');
  running=true;const id=crypto.randomUUID();
  try{
   // The system picker may remain open as long as the user needs.
   await exchange(id,'open',{name,size:blob.size},'ready',undefined,0);
   let sequence=0;
   for(let offset=0;offset<blob.size;offset+=CHUNK){
    const bytes=new Uint8Array(await blob.slice(offset,offset+CHUNK).arrayBuffer());
    await exchange(id,'chunk',{sequence,data:base64(bytes)},'chunk',sequence);
    sequence++;
   }
   await exchange(id,'finish',{},'saved',undefined,60000);
   return {saved:true,bytes:blob.size};
  }catch(error){
   try{bridge.postMessage(JSON.stringify({id,type:'abort'}));}catch{}
   throw error;
  }finally{
   if(pending?.id===id){clearTimeout(pending.timer);pending=null;}
   running=false;
  }
 }
});
document.addEventListener('click',event=>{
 const link=event.target.closest?.('a[href]');if(!link||!bridge)return;
 const uri=new URL(link.href,location.href);
 if((uri.protocol==='https:'||uri.protocol==='http:')&&uri.origin!==location.origin){
  event.preventDefault();bridge.postMessage(JSON.stringify({type:'external',url:uri.href}));
 }
},true);
})();

