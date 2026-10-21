import { createHmac, timingSafeEqual } from "node:crypto";
const COOKIE="__Host-pericia_session";
const maxAge=12*60*60;
function secret(){const s=Netlify.env.get("PERICIA_SESSION_SECRET")||Netlify.env.get("PERICIA_PIN_HASH");if(!s||s.length<32)throw Error("Session signing key not configured");return s}
function signature(payload){return createHmac("sha256",secret()).update(payload).digest("base64url")}
export function issueSession(){
 const payload="v1."+String(Date.now()+maxAge*1000)+"."+crypto.randomUUID();
 return payload+"."+signature(payload);
}
export function checkSession(req){
 const raw=req.headers.get("cookie")||"";
 const text=raw.split(";").map(s=>s.trim()).find(s=>s.startsWith(COOKIE+"="))?.slice(COOKIE.length+1);
 if(!text)return false;
 const parts=text.split(".");if(parts.length!==4)return false;
 const payload=parts.slice(0,3).join(".");
 const expires=Number(parts[1]);if(!Number.isSafeInteger(expires)||Date.now()>expires)return false;
 const expected=signature(payload),actual=parts[3];
 if(expected.length!==actual.length)return false;
 return timingSafeEqual(Buffer.from(expected),Buffer.from(actual));
}
export function sessionCookie(v){return COOKIE+"="+v+"; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age="+maxAge}
export function clearCookie(){return COOKIE+"=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0"}
export function json(payload,status=200,headers={}){return new Response(JSON.stringify(payload),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...headers}})}
