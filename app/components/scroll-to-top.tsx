"use client";

import { useEffect, useState } from "react";

export default function ScrollToTop() {
  const [visible,setVisible]=useState(false);

  useEffect(()=>{
    const onScroll=()=>setVisible(window.scrollY>320);
    onScroll();
    window.addEventListener("scroll",onScroll,{passive:true});
    return ()=>window.removeEventListener("scroll",onScroll);
  },[]);

  if(!visible) return null;

  return (
    <button
      type="button"
      className="scroll-to-top"
      aria-label="Retour en haut"
      title="Retour en haut"
      onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}
    >
      ↑
    </button>
  );
}
