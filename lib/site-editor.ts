export type SiteSection = { id: string; label: string; visible: boolean };

export const defaultSiteSections: SiteSection[] = [
  { id: "hero", label: "Bannière principale", visible: true },
  { id: "ribbon", label: "Avantages de la boutique", visible: true },
  { id: "nouveautes", label: "Nouveautés", visible: true },
  { id: "catalogue", label: "Catalogue des produits", visible: true },
  { id: "rentree", label: "Articles scolaires", visible: true },
  { id: "promotions", label: "Promotions", visible: true },
  { id: "promise", label: "Engagements", visible: true },
  { id: "services", label: "Services", visible: true },
  { id: "delivery", label: "Livraison", visible: true },
  { id: "testimonials", label: "Avis clients", visible: true },
  { id: "story", label: "Notre histoire", visible: true },
  { id: "brands", label: "Marques partenaires", visible: true },
  { id: "faq", label: "Questions fréquentes", visible: true },
  { id: "contact", label: "Coordonnées", visible: true },
  { id: "cta", label: "Offre de bienvenue", visible: true },
];

export type EditableText = { key: string; label: string; french: string; english: string; multiline?: boolean };

export const editableTexts: EditableText[] = [
  { key: "hero_eyebrow", label: "Bannière — surtitre", french: "Boutique de jouets éducatifs · Conakry", english: "Educational toy shop · Conakry" },
  { key: "hero_title", label: "Bannière — titre", french: "Le jeu qui fait", english: "Play that helps" },
  { key: "hero_accent", label: "Bannière — titre coloré", french: "grandir vos enfants.", english: "your children grow." },
  { key: "hero_description", label: "Bannière — description", french: "Jouets, articles pour bébé, vélos et fournitures scolaires choisis pour éveiller leur curiosité.", english: "Toys, baby essentials, bicycles and school supplies chosen to spark their curiosity.", multiline: true },
  { key: "catalogue_title", label: "Catalogue — titre", french: "Le catalogue", english: "A little shop" },
  { key: "catalogue_accent", label: "Catalogue — sous-titre", french: "des petits bonheurs.", english: "full of joy." },
  { key: "catalogue_description", label: "Catalogue — description", french: "Jouets éducatifs, vêtements, fournitures et idées-cadeaux : choisissez, puis commandez simplement sur WhatsApp.", english: "Educational toys, clothing, school essentials and thoughtful gifts. Pick your favourites and order through WhatsApp.", multiline: true },
  { key: "story_title", label: "Notre histoire — titre", french: "Un endroit où", english: "A place where" },
  { key: "story_description", label: "Notre histoire — description", french: "Envol des Enfants, c’est un univers où les couleurs attirent les regards, où les petits véhicules font rêver et où chaque visite devient un moment à partager.", english: "Envol des Enfants is a world of eye-catching colours, dream-worthy little vehicles and shared moments around every corner.", multiline: true },
  { key: "services_title", label: "Services — titre", french: "À vos côtés,", english: "By your side," },
  { key: "services_description", label: "Services — description", french: "De petites attentions qui rendent l’expérience encore plus belle.", english: "The thoughtful little touches that make every visit special.", multiline: true },
  { key: "delivery_description", label: "Livraison — conditions", french: "Livraison à Conakry et dans ses environs. Paiement à la réception ou selon les modalités convenues.", english: "Delivery across Conakry and surrounding areas. Pay upon delivery or by prior arrangement.", multiline: true },
  { key: "contact_title", label: "Coordonnées — titre", french: "Passez nous", english: "Come say" },
  { key: "welcome_eyebrow", label: "Offre de bienvenue — surtitre", french: "Une petite surprise de bienvenue", english: "A little welcome surprise" },
];

export function readSiteSections(value?: string): SiteSection[] {
  if (!value) return defaultSiteSections.map((section) => ({ ...section }));
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error("invalid sections");
    const known = new Map(defaultSiteSections.map((section) => [section.id, section]));
    const ordered: SiteSection[] = [];
    for (const candidate of parsed) {
      if (!candidate || typeof candidate !== "object") continue;
      const item = candidate as { id?: unknown; visible?: unknown };
      if (typeof item.id !== "string" || !known.has(item.id) || ordered.some((section) => section.id === item.id)) continue;
      ordered.push({ ...known.get(item.id)!, visible: item.visible !== false });
    }
    for (const section of defaultSiteSections) if (!ordered.some((item) => item.id === section.id)) ordered.push({ ...section });
    return ordered;
  } catch {
    return defaultSiteSections.map((section) => ({ ...section }));
  }
}

export function readSiteTexts(value?: string): Record<string, string> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch {
    return {};
  }
}
