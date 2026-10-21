import { scryptSync, timingSafeEqual } from "node:crypto";
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
  const value=Netlify.env.get("PERICIA_PIN_HASH");
  if(!value)throw Error("Acceso no configurado");
  const [salt,hex]=value.split(":");
  const expected=Buffer.from(hex||"","hex"),got=scryptSync(input.pin,Buffer.from(salt,"hex"),expected.length);
  const valid=expected.length===64&&timingSafeEqual(expected,got);
  if(!valid)return json({error:"Clave incorrecta"},401);
  return json({ok:true},200,{"Set-Cookie":sessionCookie(issueSession())});
 }catch(e){console.error("Pericia authentication error:",e?.name||"Error",e?.message||"");return json({error:"No se pudo verificar el acceso"},500)}
}
