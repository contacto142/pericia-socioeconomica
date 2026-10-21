import { scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { issueSession, checkSession, sessionCookie, clearCookie, json } from "./shared.mjs";
export const config={path:"/api/pericia/auth",rateLimit:{action:"rate_limit",aggregateBy:"ip",windowSize:60,windowLimit:12}};
export default async function(req,ctx){
 try {
  const method=req.method;
  if(method==="GET")return checkSession(req)?json({ok:true}):json({ok:false},401);
  if(method!=="POST")return json({error:"Method not allowed"},405);
  const input=await req.json();
  if(input.action==="logout")return json({ok:true},200,{"Set-Cookie":clearCookie()});
  if(input.action!=="login"||typeof input.pin!=="string"||input.pin.length>100)return json({error:"Solicitud incorrecta"},400);
  const store=getStore({name:"pericia-login-limits",consistency:"strong"});
  const ip=ctx.ip||req.headers.get("x-nf-client-connection-ip")||"unknown";
  const key=createHash("sha256").update(ip).digest("hex");
  const now=Date.now(),record=await store.get(key,{type:"json"})||{attempts:0,start:now,blocked:0};
  if(record.blocked>now)return json({error:"Demasiados intentos. Vuelve a intentarlo más tarde."},429);
  if(now-record.start>15*60*1000){record.attempts=0;record.start=now}
  const value=Netlify.env.get("PERICIA_PIN_HASH");
  if(!value)throw Error("Acceso no configurado");
  const [salt,hex]=value.split(":");
  const expected=Buffer.from(hex||"","hex"),got=scryptSync(input.pin,Buffer.from(salt,"hex"),expected.length);
  const valid=expected.length===64&&timingSafeEqual(expected,got);
  if(!valid){
   record.attempts++;
   if(record.attempts>=5)record.blocked=now+15*60*1000;
   await store.setJSON(key,record);
   return json({error:record.blocked>now?"Acceso bloqueado temporalmente":"Clave incorrecta"},record.blocked>now?429:401);
  }
  await store.delete(key);
  return json({ok:true},200,{"Set-Cookie":sessionCookie(issueSession())});
 }catch(e){return json({error:"No se pudo verificar el acceso"},500)}
}
