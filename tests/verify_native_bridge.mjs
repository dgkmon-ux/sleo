import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {webcrypto,createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=await fs.readFile(path.join(root,'app/src/main/assets/www/native-bridge.js'),'utf8');
const results=[];
function setup(mode='ok'){
 const sent=[],chunks=[];let expectedSequence=0;
 const bridge={postMessage(text){
  const m=JSON.parse(text);sent.push(m);
  const answer=x=>setTimeout(()=>bridge.onmessage({data:JSON.stringify({id:m.id,...x})}),0);
  if(m.type==='open'){
   if(mode==='cancel')answer({type:'cancelled',message:'저장을 취소했어요.'});
   else if(mode!=='hold')answer({type:'ready'});
  }
  if(m.type==='chunk'){
   assert.equal(m.sequence,expectedSequence++);const bytes=Buffer.from(m.data,'base64');
   assert.ok(bytes.length<=192*1024);chunks.push(bytes);
   if(mode==='writeError')answer({type:'error',message:'파일 쓰기 실패'});
   else answer({type:'chunk',sequence:mode==='badSequence'?m.sequence+1:m.sequence});
  }
  if(m.type==='finish')answer({type:'saved'});
 }};
 const context=vm.createContext({window:{SleoNative:bridge},document:{addEventListener(){}},Blob,Uint8Array,crypto:webcrypto,setTimeout,clearTimeout,URL,location:{href:'https://appassets.androidplatform.net/assets/www/index.html',origin:'https://appassets.androidplatform.net'},btoa:s=>Buffer.from(s,'binary').toString('base64')});
 vm.runInContext(source,context);return {api:context.window.NativeFiles,bridge,sent,chunks};
}
async function check(name,fn){await fn();results.push({name,pass:true});console.log('PASS '+name);}
await check('400KB ZIP의 순차 청크와 바이트 일치',async()=>{
 const t=setup(),bytes=Buffer.alloc(400*1024);for(let i=0;i<bytes.length;i++)bytes[i]=i%251;
 const out=await t.api.saveBlob(new Blob([bytes]),'Sleo.zip');
 assert.equal(out.saved,true);assert.equal(t.chunks.length,3);assert.deepEqual(Buffer.concat(t.chunks),bytes);
 assert.equal(t.sent.at(-1).type,'finish');
});
await check('시스템 저장 창 취소는 AbortError, 청크와 완료 요청 없음',async()=>{
 const t=setup('cancel');await assert.rejects(t.api.saveBlob(new Blob(['abc']),'Sleo.zip'),e=>e.name==='AbortError');
 assert.equal(t.chunks.length,0);assert.ok(!t.sent.some(m=>m.type==='finish'));
});
await check('네이티브 쓰기 실패는 저장 성공으로 반환하지 않음',async()=>{
 const t=setup('writeError');await assert.rejects(t.api.saveBlob(new Blob(['abc']),'Sleo.zip'));
 assert.equal(t.sent.at(-1).type,'abort');assert.ok(!t.sent.some(m=>m.type==='finish'));
});
await check('잘못된 응답 순서 거부',async()=>{
 const t=setup('badSequence');await assert.rejects(t.api.saveBlob(new Blob(['abc']),'Sleo.zip'));
 assert.equal(t.sent.at(-1).type,'abort');
});
await check('300MB 초과는 파일 창 열기 전 거부 (실제 큰 할당 없음)',async()=>{
 const t=setup();class Oversize extends Blob{get size(){return 300*1024*1024+1;}}
 await assert.rejects(t.api.saveBlob(new Oversize(['x']),'Sleo.zip'));assert.equal(t.sent.length,0);
});
await check('정확한 300MB 경계 허용 후 사용자 취소 (실제 큰 할당 없음)',async()=>{
 const t=setup('cancel');class Boundary extends Blob{get size(){return 300*1024*1024;}}
 await assert.rejects(t.api.saveBlob(new Boundary(['x']),'Sleo.zip'),e=>e.name==='AbortError');
 assert.equal(t.sent[0].size,300*1024*1024);
});
await check('저장 진행 중 중복 요청 거부',async()=>{
 const t=setup('hold'),first=t.api.saveBlob(new Blob(['abc']),'Sleo.zip');
 await assert.rejects(t.api.saveBlob(new Blob(['abc']),'Second.zip'));
 assert.equal(t.sent.filter(m=>m.type==='open').length,1);
 const id=t.sent[0].id;t.bridge.onmessage({data:JSON.stringify({id,type:'cancelled'})});
 await assert.rejects(first,e=>e.name==='AbortError');
});
await check('브리지 없는 환경은 명확한 업데이트 안내',async()=>{
 const c=vm.createContext({window:{},document:{addEventListener(){}},Blob,Uint8Array,crypto:webcrypto,setTimeout,clearTimeout,URL,btoa:s=>Buffer.from(s,'binary').toString('base64')});
 vm.runInContext(source,c);assert.equal(c.window.NativeFiles.available,false);
 await assert.rejects(c.window.NativeFiles.saveBlob(new Blob(['x']),'x.zip'));
});
const report={testedAt:new Date().toISOString(),kind:'실제 native-bridge.js와 모의 네이티브 응답의 단위 검증',passed:results.length,total:results.length,results,androidDeviceTest:false};
await fs.writeFile(path.join(root,'tests/native-bridge-results.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:results.length,total:results.length}));

