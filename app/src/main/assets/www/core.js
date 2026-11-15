(function(root){
'use strict';
const text=(v,n=3000)=>String(v??'').slice(0,n);
function parseKST(value){
 const m=String(value).match(/^(\d{4})-?(\d{2})-?(\d{2})[T_ -]?(\d{2}):?(\d{2}):?(\d{2})?$/);
 if(!m)return NaN; const [y,mo,day,h,mi,se]=m.slice(1).map(v=>Number(v||0));
 if(mo<1||mo>12||day<1||day>31||h>23||mi>59||se>59)return NaN;
 const ms=Date.UTC(y,mo-1,day,h-9,mi,se);const check=new Date(ms+9*3600000);
 return check.getUTCFullYear()===y&&check.getUTCMonth()===mo-1&&check.getUTCDate()===day?ms:NaN;
}
function localInput(value){const ms=typeof value==='number'?value:Date.parse(value);return Number.isFinite(ms)?new Date(ms+9*3600000).toISOString().slice(0,19):'';}
function fileTime(name){const m=String(name).match(/(20\d{2})[-_]?(\d{2})[-_]?(\d{2})[T_ -]?(\d{2})[-_:]?(\d{2})[-_:]?(\d{2})/);return m?parseKST(m.slice(1).join('')):NaN;}
function dateLabel(value,full=false){const ms=typeof value==='number'?value:Date.parse(value);if(!Number.isFinite(ms))return '시각을 적어 주세요';return new Date(ms).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',year:full?'numeric':undefined,month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});}
function record(memo='',at=Date.now(),example=false){return {schema:1,id:'scene-'+(root.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2)),recordedAt:new Date(at).toISOString(),targetAt:new Date(at).toISOString(),memo:text(memo),location:'',plate:'',observed:'',followUp:'',purpose:'note',clip:null,clockOffset:0,segment:{start:null,end:null},receipt:{number:'',date:''},revision:1,lastExportedRevision:0,example,updatedAt:new Date(at).toISOString()};}
function candidates(files,target,offset=0){const at=typeof target==='number'?target:Date.parse(target);if(!Number.isFinite(at))return [];
 return files.map(f=>{const start=Number.isFinite(f.start)?f.start+offset*1000:NaN;const end=start+f.duration*1000;const known=Number.isFinite(start)&&Number.isFinite(end)&&f.duration>0;const inside=known&&at>=start&&at<end;const near=known&&at+60000>=start&&at-120000<=end;const distance=known?inside?0:Math.min(Math.abs(at-start),Math.abs(at-end)):Infinity;return {...f,correctedStart:start,correctedEnd:end,inside,near,distance,seek:known?Math.max(0,Math.min(f.duration,((at-start)/1000)-30)):0};}).sort((a,b)=>Number(b.inside)-Number(a.inside)||Number(b.near)-Number(a.near)||a.distance-b.distance||a.name.localeCompare(b.name));
}
function validSegment(start,end,duration){return Number.isFinite(duration)&&duration>0&&Number.isFinite(start)&&Number.isFinite(end)&&start>=0&&end>start&&end<=duration+.05;}
function draft(r){const isReport=r.purpose==='report';const lines=[isReport?'교통 상황 설명 초안':(root.SceneConfig?.brand||'장면노트')+' · 개인 보관 기록',r.example?'예시 기록':'',`기록한 시각: ${dateLabel(r.recordedAt,true)} (한국시간)`,`${isReport?'발생':'장면'} 시각: ${dateLabel(r.targetAt,true)} (한국시간)`,`장소: ${r.location||'아직 적지 않음'}`];
 if(isReport)lines.push(`상대 차량 번호·특징: ${r.plate||'아직 적지 않음'}`);else if(r.plate)lines.push(`함께 기록한 차량: ${r.plate}`);
 lines.push('','내가 기억하는 상황',r.memo||'아직 적지 않음','','영상에서 확인한 내용',r.observed||'아직 적지 않음');
 if(r.clip)lines.push('','함께 보관한 영상',r.clip.name,validSegment(r.segment.start,r.segment.end,r.clip.duration)?`다시 볼 구간: ${r.segment.start.toFixed(1)}초 ~ ${r.segment.end.toFixed(1)}초`:'다시 볼 구간을 정하지 않음');
 if(!isReport)lines.push('','나중에 할 일',r.followUp||'아직 적지 않음');
 if(r.receipt?.number)lines.push('',isReport?'접수 메모':'보관 메모',r.receipt.number,r.receipt.date||'');
 return lines.filter((s,i)=>s||i>1).join('\n');
}
function validateRecord(raw){
 if(!raw||raw.schema!==1||!Number.isFinite(Date.parse(raw.recordedAt))||!Number.isFinite(Date.parse(raw.targetAt)))throw Error('기록 파일의 날짜나 형식을 확인할 수 없어요.');
 const r=record(raw.memo,Date.parse(raw.recordedAt),!!raw.example);
 r.targetAt=new Date(raw.targetAt).toISOString();for(const k of ['memo','location','plate','observed','followUp'])r[k]=text(raw[k]);
 r.clockOffset=Number.isFinite(raw.clockOffset)?Math.max(-86400,Math.min(86400,raw.clockOffset)):0;
 r.revision=Number.isInteger(raw.revision)&&raw.revision>0?raw.revision:1;r.lastExportedRevision=Number.isInteger(raw.lastExportedRevision)&&raw.lastExportedRevision>=0?Math.min(raw.lastExportedRevision,r.revision):0;
 r.purpose=raw.purpose==='report'?'report':'note';r.receipt={number:text(raw.receipt?.number,500),date:text(raw.receipt?.date,30)};
 if(raw.clip){const c=raw.clip;if(c.duration!==null&&(!Number.isFinite(c.duration)||c.duration<=0||c.duration>86400)||!Number.isFinite(c.size)||c.size<0)throw Error('영상 정보가 올바르지 않아요.');r.clip={name:text(c.name,250),duration:c.duration,size:c.size,type:text(c.type,100),start:Number.isFinite(c.start)?c.start:null,clockOffset:Number.isFinite(c.clockOffset)?c.clockOffset:0};
 if(raw.segment&&validSegment(raw.segment.start,raw.segment.end,c.duration))r.segment={start:raw.segment.start,end:raw.segment.end};}
 return r;
}
const api={parseKST,localInput,fileTime,dateLabel,record,candidates,validSegment,draft,validateRecord};root.SceneCore=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
