import { markets, type Market } from "@/lib/markets";
import type { FormEvent, ReactNode } from "react";
import { labels, type Section } from "./admin-shared";

export function AdminLogin({ email, password, error, busy, setEmail, setPassword, signIn }: { email: string; password: string; error: string; busy: boolean; setEmail: (value: string) => void; setPassword: (value: string) => void; signIn: (event: FormEvent<HTMLFormElement>) => void | Promise<void> }) {
  return <main className="cms-login"><form className="cms-login-card" onSubmit={signIn}>
    <img src="/envol-reference.png" alt="Envol des Enfants" /><span className="cms-eyebrow">Espace de gestion sécurisé</span><h1>Votre boutique,<br /><em>au bout des doigts.</em></h1><p>Connectez-vous pour gérer vos produits, vos commandes et vos promotions.</p>
    {error && <div className="cms-error">{error}</div>}
    <label>Adresse courriel<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
    <label>Mot de passe<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
    <button disabled={busy}>{busy ? "Connexion…" : "Accéder à mon administration →"}</button><a href="/">← Retour à la boutique</a>
  </form></main>;
}

export function AdminLayout({ admin, section, market, notice, error, onSection, onMarket, signOut, children }: { admin: { email: string; name: string }; section: Section; market: Market; notice: string; error: string; onSection: (section: Section) => void; onMarket: (market: Market) => void; signOut: () => void; children: ReactNode }) {
  const icons: Record<Section, string> = { dashboard: "◉", products: "▣", stock: "▤", orders: "☷", promotions: "✦", subscribers: "♡", editor: "✎", settings: "⚙" };
  return <main className="cms-app">
    <aside className="cms-sidebar"><a className="cms-logo" href="/"><img src="/envol-reference.png" alt="Envol des Enfants" /></a><span className="cms-eyebrow">Administration</span><nav>{(Object.keys(labels) as Section[]).map((key) => <button key={key} className={section === key ? "active" : ""} onClick={() => onSection(key)}><span>{icons[key]}</span>{labels[key]}</button>)}</nav><div className="cms-account"><strong>{admin.name}</strong><small>{admin.email}</small><button onClick={signOut}>Déconnexion</button></div></aside>
    <div className="cms-main"><header className="cms-topbar"><div><span className="cms-eyebrow">Envol des Enfants · {markets[market].label}</span><h1>{labels[section]}</h1></div><div className="cms-top-actions"><div className="cms-market-switch" role="group" aria-label="Choisir la boutique"><button className={market === "conakry" ? "active" : ""} onClick={() => onMarket("conakry")}>Conakry · GNF</button><button className={market === "qc" ? "active" : ""} onClick={() => onMarket("qc")}>Québec · CAD</button></div><a href={`/?region=${market}`} target="_blank">Voir la boutique ↗</a></div></header>
      {notice && <div className="cms-notice">✓ {notice}</div>}{error && <div className="cms-error">{error}</div>}{children}
      <div className="cms-quick-scroll" aria-label="Défilement rapide"><button type="button" aria-label="Revenir complètement en haut" title="Retour en haut" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑</button><button type="button" aria-label="Aller complètement en bas" title="Aller en bas" onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })}>↓</button></div>
    </div>
  </main>;
}
