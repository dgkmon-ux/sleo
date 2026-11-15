(function(root){
'use strict';const encoder=new TextEncoder(),decoder=new TextDecoder();const table=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
async function crc(blob){let c=0xffffffff;const reader=blob.stream().getReader();try{while(true){const {done,value}=await reader.read();if(done)break;for(const b of value)c=table[(c^b)&255]^(c>>>8);}}finally{reader.releaseLock();}return (c^0xffffffff)>>>0;}
function header(size,items){const b=new Uint8Array(size),v=new DataView(b.buffer);for(const [offset,value,width]of items)width===4?v.setUint32(offset,value,true):v.setUint16(offset,value,true);return b;}
const videoExtensions=new Set(['mp4','webm','mov','avi','mkv','m4v','mpg','mpeg','mts','m2ts','ts','3gp','3g2','ogv','vob','wmv','flv','asf','bin']);
function mediaName(clip){const found=String(clip?.name||'').match(/\.([a-z0-9]{1,8})$/i),extension=found?.[1].toLowerCase();const byType={'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov','video/x-msvideo':'avi','video/x-matroska':'mkv','video/mpeg':'mpeg','video/ogg':'ogv','video/mp2t':'ts','video/3gpp':'3gp','video/3gpp2':'3g2','video/x-ms-wmv':'wmv'};return '원본영상.'+(videoExtensions.has(extension)?extension:byType[String(clip?.type||'').toLowerCase()]||'bin');}
function allowedMediaName(name){if(name==='original.video')return true;const match=typeof name==='string'&&name.match(/^원본영상\.([a-z0-9]{1,8})$/);return !!match&&videoExtensions.has(match[1]);}
function packageEntries(record,media){
 const mediaEntry=media&&record.clip?mediaName(record.clip):null;
 const entries=[{name:'record.json',blob:new Blob([JSON.stringify({format:'scenenote-record',version:1,mediaEntry,record},null,2)])},{name:'설명.txt',blob:new Blob([SceneCore.draft(record)])}];
 if(mediaEntry)entries.push({name:mediaEntry,blob:media});
 return entries;
}
function archiveSize(entries){return entries.reduce((sum,e)=>sum+e.blob.size+76+2*encoder.encode(e.name).length,22);}
function estimateSize(record,media){return archiveSize(packageEntries(record,media));}
async function pack(record,media){
 const entries=packageEntries(record,media);
 if(archiveSize(entries)>300*1024*1024)throw Error('다른 기기에서도 열 수 있도록 기록 파일은 300MB까지 저장할 수 있어요. 더 작은 영상을 골라 주세요. 원본은 따로 보관해 주세요.');
 let offset=0;const pieces=[],central=[];for(const e of entries){const name=encoder.encode(e.name),sum=await crc(e.blob),size=e.blob.size;const h=header(30,[[0,0x04034b50,4],[4,20,2],[6,0x0800,2],[14,sum,4],[18,size,4],[22,size,4],[26,name.length,2]]);pieces.push(h,name,e.blob);central.push(header(46,[[0,0x02014b50,4],[4,20,2],[6,20,2],[8,0x0800,2],[16,sum,4],[20,size,4],[24,size,4],[28,name.length,2],[42,offset,4]]),name);offset+=h.length+name.length+size;}
 const centralSize=central.reduce((sum,x)=>sum+x.length,0);return new Blob([...pieces,...central,header(22,[[0,0x06054b50,4],[8,entries.length,2],[10,entries.length,2],[12,centralSize,4],[16,offset,4]])],{type:'application/zip'});
}
async function unpack(file){
 if(file.size>300*1024*1024)throw Error('300MB 이하의 '+(root.SceneConfig?.brand||'장면노트')+' 기록 파일을 골라 주세요.');
 const buffer=await file.arrayBuffer(),bytes=new Uint8Array(buffer),view=new DataView(buffer);if(bytes.length<22||view.getUint32(bytes.length-22,true)!==0x06054b50)throw Error('기록 파일이 끝까지 저장되지 않았어요. 다시 받은 파일을 골라 주세요.');
 const entries=new Map();let at=0;while(at+30<=bytes.length&&view.getUint32(at,true)===0x04034b50){const flags=view.getUint16(at+6,true),method=view.getUint16(at+8,true),sum=view.getUint32(at+14,true),size=view.getUint32(at+18,true),originalSize=view.getUint32(at+22,true),nameLength=view.getUint16(at+26,true),extraLength=view.getUint16(at+28,true);const name=decoder.decode(bytes.subarray(at+30,at+30+nameLength)),start=at+30+nameLength+extraLength;
 if(method!==0||(flags&9)||size!==originalSize||start+size>bytes.length||!(['record.json','설명.txt'].includes(name)||allowedMediaName(name))||entries.has(name))throw Error((root.SceneConfig?.brand||'장면노트')+'에서 보낸 기록 파일인지 확인해 주세요.');
 const blob=new Blob([bytes.subarray(start,start+size)]);if(await crc(blob)!==sum)throw Error('기록 파일의 일부가 손상됐어요. 원래 파일을 다시 받아 주세요.');entries.set(name,blob);at=start+size;if(entries.size>3)throw Error('기록 파일의 구성이 올바르지 않아요.');}
 const info=entries.get('record.json');if(!info||info.size>100000)throw Error('기록 내용을 찾을 수 없어요.');let data;try{data=JSON.parse(await info.text());}catch{throw Error('기록 내용을 읽을 수 없어요.');}
 if(data.format!=='scenenote-record'||data.version!==1)throw Error('지원하지 않는 기록 파일이에요.');
 const record=SceneCore.validateRecord(data.record),mediaEntries=[...entries.keys()].filter(name=>name!=='record.json'&&name!=='설명.txt');
 const expected=Object.prototype.hasOwnProperty.call(data,'mediaEntry')?data.mediaEntry:record.clip?'original.video':null;
 if(expected!==null&&!allowedMediaName(expected))throw Error('기록에 적힌 영상 파일 이름이 올바르지 않아요.');
 if(record.clip&&(mediaEntries.length!==1||!expected||mediaEntries[0]!==expected))throw Error('기록과 영상 파일 이름이 맞지 않아요. 원래 기록 파일을 다시 받아 주세요.');
 if(!record.clip&&(mediaEntries.length||expected!==null))throw Error('영상에 연결된 기록 정보가 없어요.');
 let media=expected?entries.get(expected):undefined;if(record.clip&&(!media||record.clip.size!==media.size))throw Error('기록과 영상이 맞지 않아요. 원래 기록 파일을 다시 받아 주세요.');if(media)media=new Blob([media],{type:record.clip.type});return {record,media};
}
root.ScenePackage={pack,unpack,crc,estimateSize};
})(globalThis);
