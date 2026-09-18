import * as v from "valibot";
import { cmsEnv } from "@/lib/cms";
import { clearCustomerSession, currentCustomer, customerSession, hashPassword } from "@/lib/customer-auth";
import { validateJsonBody } from "@/lib/api-validation";

const schema = v.object({
  action: v.picklist(["register", "login"]),
  email: v.pipe(v.string(), v.trim(), v.email()),
  password: v.pipe(v.string(), v.minLength(8)),
  name: v.optional(v.string()), phone: v.optional(v.string()), address: v.optional(v.string()), region: v.optional(v.string()),
});

export async function GET(request: Request) {
  return Response.json({ customer: await currentCustomer(request) });
}

export async function POST(request: Request) {
  const parsed = await validateJsonBody(request, schema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;
  const email = data.email.toLowerCase();
  const database = cmsEnv().DB;
  let customer = await database.prepare("SELECT * FROM customers WHERE email=?").bind(email).first<Record<string, unknown>>();
  if (data.action === "register") {
    if (customer) return Response.json({ error: "Un compte existe déjà avec cette adresse." }, { status: 409 });
    const id = crypto.randomUUID(); const salt = crypto.randomUUID(); const now = new Date().toISOString();
    await database.prepare("INSERT INTO customers (id,email,name,phone,address,region,password_hash,salt,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .bind(id,email,(data.name||"").trim(),(data.phone||"").trim(),(data.address||"").trim(),data.region==="conakry"?"conakry":"qc",await hashPassword(data.password,salt),salt,now,now).run();
    customer = { id,email,name:data.name||"",phone:data.phone||"",address:data.address||"",region:data.region||"qc" };
  } else {
    if (!customer || await hashPassword(data.password,String(customer.salt)) !== customer.password_hash) return Response.json({ error: "Courriel ou mot de passe incorrect." }, { status: 401 });
  }
  return Response.json({ customer: { id:customer.id,email:customer.email,name:customer.name,phone:customer.phone,address:customer.address,region:customer.region } }, { headers: { "Set-Cookie": await customerSession(String(customer.id)) } });
}

export async function DELETE(request: Request) {
  return Response.json({ success:true }, { headers: { "Set-Cookie": await clearCustomerSession(request) } });
}
