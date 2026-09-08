"use client";

type Say = (french: string, english: string) => string;

type Props = {
  say: Say;
};

export default function StorefrontQuickScroll({ say }: Props) {
  return (
    <div className="quick-scroll" aria-label={say("Défilement rapide", "Quick navigation")}>
      <button
        type="button"
        aria-label={say("Revenir complètement en haut", "Scroll all the way to the top")}
        title={say("Retour en haut", "Back to top")}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        ↑
      </button>
      <button
        type="button"
        aria-label={say("Aller complètement en bas", "Scroll all the way to the bottom")}
        title={say("Aller en bas", "Go to bottom")}
        onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })}
      >
        ↓
      </button>
    </div>
  );
}
