const categoryPrefixes: Record<string, string> = {
  eveil: "EDU", poupees: "POU", disney: "DIS", barbie: "BAR",
  piscine: "PIS", imitation: "MET", dinosaures: "DIN", animaux: "ANI",
  bebe: "BEB", vetements: "VET", chaussures: "CHA", scolaire: "SCO",
  sacs: "SAC", vehicules: "VEH",
};

export function generateArticleNumber(category: string) {
  const prefix = categoryPrefixes[category] || "ART";
  const code = crypto.randomUUID().replaceAll("-", "").slice(0, 5).toUpperCase();
  return `${prefix}-${code}`;
}
