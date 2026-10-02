"use client";

type BackToOriginProps = {
  fallbackHref?: string;
  label?: string;
};

export default function BackToOrigin({
  fallbackHref = "/catalogue",
  label = "Retour",
}: BackToOriginProps) {
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = fallbackHref;
  };

  return (
    <button
      type="button"
      className="back-to-origin"
      onClick={handleBack}
      aria-label={label}
    >
      <span className="back-to-origin-arrow" aria-hidden="true">←</span>
      <span>{label}</span>
    </button>
  );
}
