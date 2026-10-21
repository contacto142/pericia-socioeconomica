import { getStore } from "@netlify/blobs";
import { checkSession, json } from "./shared.mjs";
const files=()=>getStore({name:"pericia-vault-files",consistency:"strong"});
const states=()=>getStore({name:"pericia-vault-states",consistency:"strong"});
const chunks=()=>getStore({name:"pericia-vault-chunks",consistency:"strong"});
const pending=()=>getStore({name:"pericia-vault-pending",consistency:"strong"});
const MAX=25*1024*1024, PART=1024*1024;
const TYPES=new Set(["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","image/jpeg","image/png","image/webp","image/heic","text/plain","application/octet-stream"]);
const docId=x=>typeof x==="string"&&/^[0-9]+-[0-9]+$/.test(x);
const fid=x=>typeof x==="string"&&/^[0-9a-f-]{36}$/.test(x);
export const config={path:"/api/pericia/data"};
export default async function(req){
 if(!checkSession(req))return json({error:"Debes ingresar la clave de acceso"},401);
 const url=new URL(req.url),op=url.searchParams.get("op");
 if(req.method==="POST"&&req.headers.get("origin")!==url.origin)return json({error:"Origen no autorizado"},403);
 try {
  if(req.method==="GET"&&op==="list"){
   const [s,f]=await Promise.all([states().list(),files().list()]);
   const [stateRecords,fileRecords]=await Promise.all([
    Promise.all(s.blobs.map(x=>states().get(x.key,{type:"json"}))),
    Promise.all(f.blobs.map(x=>files().get(x.key,{type:"json"})))
   ]);
   return json({states:stateRecords.filter(Boolean),files:fileRecords.filter(Boolean)});
  }
  if(req.method==="GET"&&op==="chunk"){
   const id=url.searchParams.get("id"),index=Number(url.searchParams.get("index"));
   if(!fid(id)||!Number.isInteger(index)||index<0)return json({error:"Archivo incorrecto"},400);
   const f=await files().get(id,{type:"json"});
   if(!f||index>=f.parts)return json({error:"Archivo no encontrado"},404);
   const content=await chunks().get(id+"/"+index,{type:"arrayBuffer"});
   if(!content)return json({error:"No se encontró una parte del documento"},404);
   return new Response(content,{headers:{"Content-Type":"application/octet-stream","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
  }
  if(req.method!=="POST")return json({error:"Operación no permitida"},405);
  if(op==="part"){
   const id=url.searchParams.get("id"),index=Number(url.searchParams.get("index"));
   if(!fid(id)||!Number.isInteger(index)||index<0)return json({error:"Parte incorrecta"},400);
   const p=await pending().get(id,{type:"json"});
   if(!p||p.created<Date.now()-60*60*1000||index>=p.parts)return json({error:"Carga no encontrada o expirada"},404);
   const n=Number(req.headers.get("content-length")||0);
   if(n>PART)return json({error:"Parte demasiado grande"},413);
   const body=await req.arrayBuffer();
   if(body.byteLength>PART||body.byteLength===0)return json({error:"Parte vacía o muy grande"},400);
   await chunks().set(id+"/"+index,body);
   return json({ok:true});
  }
  const b=await req.json();
  if(op==="save"){
   if(!docId(b.docId)||!["pending","review","done","na"].includes(b.status)||typeof b.notes!=="string"||b.notes.length>15000)return json({error:"Estado o nota incorrectos"},400);
   const row={doc_id:b.docId,status:b.status,notes:b.notes,updated_at:new Date().toISOString()};
   await states().setJSON(b.docId,row);return json({state:row});
  }
  if(op==="begin"){
   if(!docId(b.docId)||typeof b.name!=="string"||!b.name.trim()||b.name.length>200||!Number.isInteger(b.size)||b.size<1||b.size>MAX||!TYPES.has(b.mime))return json({error:"Nombre, tipo o tamaño no permitidos (máximo 25 MB)"},400);
   const id=crypto.randomUUID(),p={id,doc_id:b.docId,file_name:b.name,content_type:b.mime,size_bytes:b.size,parts:Math.ceil(b.size/PART),created:Date.now()};
   await pending().setJSON(id,p);return json({id,parts:p.parts});
  }
  if(op==="finish"){
   if(!fid(b.id))return json({error:"Identificador incorrecto"},400);
   const p=await pending().get(b.id,{type:"json"});
   if(!p)return json({error:"Carga incompleta"},409);
   for(let i=0;i<p.parts;i++){
    const m=await chunks().getMetadata(b.id+"/"+i);if(!m)return json({error:"Faltan partes del documento"},409);
   }
   const row={id:p.id,doc_id:p.doc_id,file_name:p.file_name,content_type:p.content_type,size_bytes:p.size_bytes,parts:p.parts,created_at:new Date().toISOString()};
   await files().setJSON(p.id,row);await pending().delete(p.id);
   return json({file:row});
  }
  if(op==="delete"){
   if(!fid(b.id))return json({error:"Identificador incorrecto"},400);
   const f=await files().get(b.id,{type:"json"});
   if(!f)return json({ok:true});
   await files().delete(b.id);
   for(let i=0;i<f.parts;i++)await chunks().delete(b.id+"/"+i);
   return json({ok:true});
  }
  return json({error:"Operación desconocida"},400);
 }catch(err){return json({error:"Error del almacenamiento. Intenta nuevamente."},500)}
}
