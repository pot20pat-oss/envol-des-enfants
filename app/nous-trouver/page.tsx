"use client";
import { useEffect,useState } from "react";

type CatalogResponse = {
  settings?: Record<string,string>;
  region?: "conakry" | "qc";
};

export default function Page(){
  const [settings,setSettings]=useState<Record<string,string>>({});
  const [region,setRegion]=useState<"conakry"|"qc">("conakry");

  useEffect(()=>{
    const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;
    fetch(`/api/catalog?timezone=${encodeURIComponent(timezone)}`)
      .then(r=>r.json())
      .then((d:CatalogResponse)=>{
        setSettings(d.settings||{});
        setRegion(d.region==="qc"?"qc":"conakry");
      })
      .catch(()=>{});
  },[]);

  const phone=settings.phone||"";
  const address=settings.address||(region==="conakry"?"Immeuble Famille Diallo, Cameroun, Dixinn, Conakry, Guinée":"");
  const mapUrl=settings.map_url||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const mapEmbedUrl=`https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;

  return <main className="category-page">
    <header className="category-header wrap">
      <a href="/" className="category-brand"><img src="/envol-logo-officiel.svg" alt="Envol des Enfants"/></a>
      <a href="/" className="category-back">← Accueil</a>
    </header>
    <section className="category-hero wrap">
      <p className="eyebrow">Envol des Enfants</p>
      <h1>Nous trouver</h1>
      <p>{address||"Coordonnées de la boutique."}</p>
      {phone&&<p><a href={`tel:${phone.replace(/\s/g,"")}`}><strong>{phone}</strong></a></p>}
      {settings.opening_hours&&<p>{settings.opening_hours}</p>}
    </section>
    {region==="conakry"&&address&&<section className="wrap" style={{paddingBottom:"48px"}}>
      <div style={{overflow:"hidden",borderRadius:"20px",boxShadow:"0 14px 34px rgba(25,54,72,.16)",background:"#fff"}}>
        <iframe
          title="Carte de la boutique Envol des Enfants à Conakry"
          src={mapEmbedUrl}
          width="100%"
          height="420"
          style={{border:0,display:"block"}}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <p style={{marginTop:"14px"}}><a href={mapUrl} target="_blank" rel="noreferrer"><strong>Ouvrir dans Google Maps</strong></a></p>
    </section>}
  </main>;
}
