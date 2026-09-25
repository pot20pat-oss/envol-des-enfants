"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Product } from "@/lib/default-catalog";
import { marketPrice, type Market } from "@/lib/markets";

type Language = "fr" | "en";
type CartLine = { product: Product; quantity: number };
type Profile = { name: string; phone: string; email: string; address: string };
type CustomerOrder = { id:string; product_name?:string; quantity?:number; total:number; status:string; region:Market; currency?:string; items_json?:string; created_at:string };
type Panel = "cart" | "favorites" | "account" | null;
type CommerceContextValue = {
  cart: CartLine[]; favorites: Product[]; profile: Profile; panel: Panel;
  open: (panel: Exclude<Panel, null>) => void; close: () => void;
  addToCart: (product: Product) => void; toggleFavorite: (product: Product) => void;
  isFavorite: (product: Product) => boolean; cartCount: number;
};

const CommerceContext = createContext<CommerceContextValue | null>(null);
const emptyProfile = { name: "", phone: "", email: "", address: "" };

export function useCommerce() {
  const value = useContext(CommerceContext);
  if (!value) throw new Error("CommerceProvider manquant.");
  return value;
}

export function CommerceProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [panel, setPanel] = useState<Panel>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        setCart(JSON.parse(localStorage.getItem("envol-cart") || "[]"));
        setFavorites(JSON.parse(localStorage.getItem("envol-favorites") || "[]"));
        setProfile({ ...emptyProfile, ...JSON.parse(localStorage.getItem("envol-profile") || "{}") });
      } catch {}
      setReady(true);
    });
  }, []);
  useEffect(() => { if (ready) localStorage.setItem("envol-cart", JSON.stringify(cart)); }, [cart, ready]);
  useEffect(() => { if (ready) localStorage.setItem("envol-favorites", JSON.stringify(favorites)); }, [favorites, ready]);
  useEffect(() => { if (ready) localStorage.setItem("envol-profile", JSON.stringify(profile)); }, [profile, ready]);

  const productKey = (product: Product) => product.id || product.articleNumber || product.imageUrl || product.name.fr;
  const addToCart = (product: Product) => {
    setCart((current) => current.some((line) => productKey(line.product) === productKey(product))
      ? current.map((line) => productKey(line.product) === productKey(product) ? { ...line, quantity: Math.min(99, line.quantity + 1) } : line)
      : [...current, { product, quantity: 1 }]);
    setPanel("cart");
  };
  const toggleFavorite = (product: Product) => setFavorites((current) => current.some((item) => productKey(item) === productKey(product))
    ? current.filter((item) => productKey(item) !== productKey(product)) : [...current, product]);
  const value = { cart, favorites, profile, panel, open: setPanel, close: () => setPanel(null), addToCart, toggleFavorite, isFavorite: (product: Product) => favorites.some((item) => productKey(item) === productKey(product)), cartCount: cart.reduce((sum, line) => sum + line.quantity, 0) };

  return <CommerceContext.Provider value={value}>{children}{panel && <CommercePanel panel={panel} cart={cart} setCart={setCart} favorites={favorites} profile={profile} setProfile={setProfile} close={() => setPanel(null)} addToCart={addToCart} />}</CommerceContext.Provider>;
}

function CommercePanel({ panel, cart, setCart, favorites, profile, setProfile, close, addToCart }: { panel: Exclude<Panel, null>; cart: CartLine[]; setCart: React.Dispatch<React.SetStateAction<CartLine[]>>; favorites: Product[]; profile: Profile; setProfile: React.Dispatch<React.SetStateAction<Profile>>; close: () => void; addToCart: (product: Product) => void }) {
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [password, setPassword] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const params = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const market: Market = params.get("region") === "conakry" ? "conakry" : "qc";
  const language: Language = typeof window !== "undefined" && localStorage.getItem("envol-language") === "en" ? "en" : "fr";
  const say = (fr: string, en: string) => language === "en" ? en : fr;
  const total = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

  useEffect(() => {
    if (panel !== "account") return;
    fetch("/api/customer/session").then((response) => response.json()).then((result: { customer?: Profile | null }) => {
      if (!result.customer) return;
      setProfile((current) => ({ ...current, ...result.customer })); setSignedIn(true); void loadOrders();
    }).catch(() => {});
  }, [panel, setProfile]);

  async function loadOrders(){try{const response=await fetch("/api/customer/orders");if(response.ok){const result=await response.json() as {orders?:CustomerOrder[]};setOrders(result.orders||[])}}catch{}}
  async function cancelOrder(id:string){if(!window.confirm(say("Annuler cette commande ?","Cancel this order?")))return;setSending(true);try{const response=await fetch("/api/customer/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,action:"cancel"})});const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error||say("Annulation impossible.","Unable to cancel order."));await loadOrders();setNotice(say("Commande annulée.","Order cancelled."))}catch(error){setNotice(error instanceof Error?error.message:say("Annulation impossible.","Unable to cancel order."))}finally{setSending(false)}}
  async function deleteOrder(id:string){if(!window.confirm(say("Supprimer cette commande de votre historique ?","Delete this order from your history?")))return;setSending(true);try{const response=await fetch(`/api/customer/orders?id=${encodeURIComponent(id)}`,{method:"DELETE"});const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error||say("Suppression impossible.","Unable to delete order."));await loadOrders();setNotice(say("Commande supprimée.","Order deleted."))}catch(error){setNotice(error instanceof Error?error.message:say("Suppression impossible.","Unable to delete order."))}finally{setSending(false)}}

  async function account(action: "register" | "login") {
    setNotice("");
    const email=profile.email.trim();
    if (!email || !email.includes("@")) { setNotice(say("Entrez une adresse courriel valide.","Enter a valid email address.")); return; }
    if (password.length < 8) { setNotice(say("Le mot de passe doit contenir au moins 8 caractères.","Password must contain at least 8 characters.")); return; }
    if (action==="register" && (!profile.name.trim() || !profile.phone.trim() || !profile.address.trim())) { setNotice(say("Complétez votre nom, téléphone et adresse de livraison.","Complete your name, phone and delivery address.")); return; }
    setSending(true);
    try {
      const response = await fetch("/api/customer/session", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action, ...profile, email, password, region:market }) });
      const result = await response.json() as { customer?: Profile; error?: string };
      if (!response.ok) throw new Error(result.error || say("Connexion impossible.","Unable to sign in."));
      if (result.customer) setProfile((current)=>({...current,...result.customer})); setSignedIn(true); setPassword(""); await loadOrders();
      setNotice(action==="register"?say("Votre compte est créé.","Your account is ready."):say("Vous êtes connecté.","You are signed in."));
    } catch(error) { setNotice(error instanceof Error?error.message:say("Connexion impossible.","Unable to sign in.")); }
    finally { setSending(false); }
  }

  async function logout() { await fetch("/api/customer/session",{method:"DELETE"}); setSignedIn(false); setOrders([]); setNotice(say("Vous êtes déconnecté.","You are signed out.")); }

  async function checkout() {
    if (!profile.name || !profile.phone || !profile.address) { setNotice(say("Complétez d’abord votre nom, téléphone et adresse dans Mon compte.", "Complete your name, phone and address in My account first.")); return; }
    setSending(true); setNotice("");
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer_name: profile.name, customer_phone: profile.phone, customer_email: profile.email, delivery_address: profile.address, region: market, items: cart.map((line) => ({ product_id: line.product.id, quantity: line.quantity })) }) });
      const result = await response.json() as { id?: string; error?: string };
      if (!response.ok) throw new Error(result.error || say("Commande impossible.", "Unable to place order."));
      setCart([]); setNotice(`${say("Commande transmise. Numéro", "Order submitted. Number")}: ${result.id}`);
    } catch (error) { setNotice(error instanceof Error ? error.message : say("Commande impossible.", "Unable to place order.")); }
    finally { setSending(false); }
  }

  return <div className="commerce-overlay" onClick={close}><aside className="commerce-panel" onClick={(event) => event.stopPropagation()}><button className="commerce-close" onClick={close}>×</button>
    <h2>{panel === "cart" ? say("Mon panier", "My cart") : panel === "favorites" ? say("Mes favoris", "My favorites") : say("Mon compte", "My account")}</h2>
    {panel === "account" && <div className="commerce-account"><p>{signedIn?say("Votre compte est connecté. Vos coordonnées sont prêtes pour la commande.","Your account is connected and ready for checkout."):say("Créez votre compte ou connectez-vous pour accélérer vos commandes.","Create an account or sign in to speed up checkout.")}</p>{([['name',say('Nom complet','Full name')],['phone',say('Téléphone','Phone')],['email','Email'],['address',say('Adresse de livraison','Delivery address')]] as const).map(([field,label])=><label key={field}>{label}<input value={profile[field]} onChange={(event)=>setProfile((current)=>({...current,[field]:event.target.value}))}/></label>)}{!signedIn?<><label>{say("Mot de passe (8 caractères minimum)","Password (8 characters minimum)")}<input type="password" value={password} onChange={(event)=>setPassword(event.target.value)}/></label><div className="commerce-account-actions"><button disabled={sending} onClick={()=>void account("register")}>{say("Créer mon compte","Create account")}</button><button disabled={sending} onClick={()=>void account("login")}>{say("Me connecter","Sign in")}</button></div></>:<><section className="commerce-orders"><h3>{say("Mes commandes","My orders")}</h3>{orders.map(order=><article key={order.id}><div><strong>{new Date(order.created_at).toLocaleDateString(language==="fr"?"fr-CA":"en-CA")}</strong><span>{marketPrice(order.total,order.region,language)}</span></div><small>{order.product_name||say("Commande en ligne","Online order")} · {order.status}</small><div className="commerce-order-actions">{["new","confirmed"].includes(order.status)&&<button disabled={sending} onClick={()=>void cancelOrder(order.id)}>{say("Annuler la commande","Cancel order")}</button>}{order.status==="cancelled"&&<button disabled={sending} onClick={()=>void deleteOrder(order.id)}>{say("Supprimer","Delete")}</button>}</div></article>)}{!orders.length&&<p>{say("Aucune commande dans votre compte.","No orders in your account.")}</p>}</section><button onClick={()=>void logout()}>{say("Me déconnecter","Sign out")}</button></>}</div>}
    {panel === "favorites" && <div className="commerce-lines">{favorites.map((product)=><article key={productKey(product)}><img src={product.imageUrl} alt=""/><div><strong>{product.name[language]}</strong><button onClick={()=>addToCart(product)}>{say("Ajouter au panier", "Add to cart")}</button></div></article>)}{!favorites.length&&<p>{say("Aucun favori pour le moment.", "No favorites yet.")}</p>}</div>}
    {panel === "cart" && <><div className="commerce-lines">{cart.map((line)=><article key={productKey(line.product)}><img src={line.product.imageUrl} alt=""/><div><strong>{line.product.name[language]}</strong><span>{marketPrice(line.product.price * line.quantity,market,language)}</span><div className="commerce-quantity"><button onClick={()=>setCart((current)=>current.map((item)=>productKey(item.product)===productKey(line.product)?{...item,quantity:Math.max(1,item.quantity-1)}:item))}>−</button><span>{line.quantity}</span><button onClick={()=>setCart((current)=>current.map((item)=>productKey(item.product)===productKey(line.product)?{...item,quantity:item.quantity+1}:item))}>+</button><button onClick={()=>setCart((current)=>current.filter((item)=>productKey(item.product)!==productKey(line.product)))}>{say("Retirer", "Remove")}</button></div></div></article>)}{!cart.length&&<p>{say("Votre panier est vide.", "Your cart is empty.")}</p>}</div>{cart.length>0&&<div className="commerce-checkout"><strong>{say("Total estimé", "Estimated total")}: {marketPrice(total,market,language)}</strong><button disabled={sending} onClick={()=>void checkout()}>{sending?say("Envoi…","Sending…"):say("Envoyer la commande","Submit order")}</button></div>}</>}
    {notice&&<p className="commerce-notice">{notice}</p>}
  </aside></div>;
}

function productKey(product: Product) { return product.id || product.articleNumber || product.imageUrl || product.name.fr; }
