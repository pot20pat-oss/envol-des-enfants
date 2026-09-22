import * as v from "valibot";
import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";
import { validateJsonBody } from "@/lib/api-validation";

const schema=v.object({image_urls:v.pipe(v.array(v.string()),v.minLength(1),v.maxLength(8))});
function imageKey(url:string){const p="/api/images/";if(!url.startsWith(p))return null;const key=decodeURIComponent(url.slice(p.length));return key.startsWith("products/")&&!key.includes("..")?key:null}
function b64(buffer:ArrayBuffer){const bytes=new Uint8Array(buffer);let s="";for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s)}
export async function POST(request:Request){
 if(!await currentAdmin(request))return forbidden();
 const parsed=await validateJsonBody(request,schema);if(!parsed.success)return parsed.response;
 const runtime=cmsEnv();if(!runtime.NVIDIA_API_KEY)return Response.json({error:"La clé NVIDIA n’est pas configurée dans Cloudflare."},{status:503});
 const inputs:string[]=[];
 for(const url of parsed.data.image_urls){const key=imageKey(url);if(!key)return Response.json({error:"Image produit invalide."},{status:400});const object=await runtime.BUCKET.get(key);if(!object)return Response.json({error:"Image introuvable."},{status:404});const type=object.httpMetadata?.contentType||"image/jpeg";inputs.push(`data:${type};base64,${b64(await object.arrayBuffer())}`)}
 const response=await fetch("https://integrate.api.nvidia.com/v1/embeddings",{method:"POST",headers:{Authorization:`Bearer ${runtime.NVIDIA_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:"nvidia/llama-nemotron-embed-vl-1b-v2",input:inputs,input_type:"passage",modality:"image",embedding_type:"float",encoding_format:"float"})});
 const result=await response.json() as {data?:Array<{index:number;embedding:number[]}>;detail?:unknown;message?:unknown};
 if(!response.ok)return Response.json({error:typeof result.detail==="string"?result.detail:typeof result.message==="string"?result.message:"Embedding NVIDIA impossible."},{status:502});
 const vectors=(result.data||[]).sort((a,b)=>a.index-b.index).map(x=>x.embedding);
 if(vectors.length!==inputs.length)return Response.json({error:"Réponse embedding NVIDIA incomplète."},{status:502});
 return Response.json({vectors,model:"nvidia/llama-nemotron-embed-vl-1b-v2"});
}
