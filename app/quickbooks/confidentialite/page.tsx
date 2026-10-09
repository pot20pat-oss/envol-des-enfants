import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confidentialité de l'intégration QuickBooks | L'Envol des Enfants",
  description: "Politique de confidentialité pour l'intégration privée QuickBooks Online de L'Envol des Enfants.",
  alternates: { canonical: "/quickbooks/confidentialite" },
};

export default function QuickBooksPrivacyPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 22px 72px", lineHeight: 1.7 }}>
      <article style={{ background: "white", color: "#1a3032", padding: "clamp(22px, 5vw, 48px)", borderRadius: 18, border: "1px solid #d6e4df" }}>
        <p style={{ fontSize: 14, color: "#48645e" }}>L'Envol des Enfants · Intégration QuickBooks</p>
        <h1 style={{ fontSize: "clamp(1.7rem, 4vw, 2.3rem)", lineHeight: 1.2, marginBottom: 12 }}>Politique de confidentialité — Intégration QuickBooks</h1>
        <p><strong>Dernière mise à jour :</strong> 9 octobre 2026 · <a href="#english">English version ↓</a></p>
        <p>Cette politique explique le traitement des données de l'application privée qui relie, après autorisation, QuickBooks Online au système de gestion de <strong>L'Envol des Enfants</strong>. Elle concerne l'intégration QuickBooks, et non l'ensemble des fonctionnalités de la boutique en ligne.</p>

        <h2>1. Responsabilités et contact</h2>
        <p>L'Envol des Enfants décide des utilisations de ses données de produits, de stock et de comptabilité. <strong>Atelier Informatique Potvin (AIP)</strong> développe et exploite techniquement l'intégration pour le compte de cette entreprise et selon ses instructions. Pour les questions de confidentialité, demandes d'accès ou de suppression liées à cette intégration, contactez <a href="mailto:kmaniamba@yahoo.fr">kmaniamba@yahoo.fr</a>.</p>
        <h2>2. Données concernées</h2>
        <p>Selon les fonctions expressément activées, l'application peut accéder aux identifiants de l'entreprise QuickBooks et de ses articles, aux noms de produits, UGS/références, types d'articles, quantités en stock, et aux mouvements ou références de commandes nécessaires au rapprochement. Si une fonction de synchronisation des ventes est ultérieurement autorisée, seules les données de transaction requises pour cette opération devront être traitées. Les identifiants de connexion et mots de passe du compte Intuit ne sont pas demandés par l'application.</p>
        <h2>3. Finalités et autorisation</h2>
        <p>Les données sont utilisées pour établir et vérifier les correspondances d'articles, consulter et comparer les stocks de <strong>Conakry</strong>, sécuriser l'accès et, uniquement après validation et activation, transmettre les opérations autorisées. Le stock du Québec n'entre pas dans le périmètre de la synchronisation QuickBooks. La connexion utilise le processus OAuth d'Intuit et nécessite l'autorisation d'un utilisateur habilité.</p>
        <h2>4. Stockage et sécurité</h2>
        <p>Les informations nécessaires au fonctionnement du CMS sont hébergées à l'aide de services Cloudflare, et les données comptables restent également conservées par Intuit dans QuickBooks. Les jetons d'autorisation QuickBooks enregistrés par l'intégration sont chiffrés; leur accès est réservé aux composants techniques autorisés. L'accès administratif du CMS est protégé par authentification. Aucune mesure ne peut garantir l'absence absolue de risque.</p>
        <h2>5. Communication des données</h2>
        <p>Les données sont communiquées aux prestataires nécessaires au fonctionnement de l'intégration, notamment Intuit et Cloudflare, ainsi qu'aux intervenants autorisés lorsque le support technique l'exige. Les données QuickBooks ne sont pas vendues à des annonceurs. Selon les infrastructures des prestataires, leur traitement peut impliquer d'autres pays.</p>
        <h2>6. Durée de conservation et retrait</h2>
        <p>Les informations opérationnelles sont conservées aussi longtemps qu'elles sont nécessaires à l'intégration et aux obligations applicables. En cas de déconnexion ou de demande de suppression, les données propres à l'intégration seront examinées afin de supprimer celles qui ne sont plus nécessaires, sous réserve des obligations de conservation et de sécurité. Les livres et écritures stockés directement dans QuickBooks restent régis par les paramètres et obligations de l'entreprise dans QuickBooks.</p>
        <h2>7. Vos demandes et changements</h2>
        <p>L'entreprise peut retirer l'accès dans Intuit et écrire à <a href="mailto:kmaniamba@yahoo.fr">kmaniamba@yahoo.fr</a> pour demander de l'information, l'accès, une correction ou une suppression, dans les limites de la loi applicable. Cette politique pourra être mise à jour si les usages réels de l'application changent. Consultez également les <a href="/quickbooks/conditions">conditions d'utilisation de l'intégration</a>.</p>

        <hr style={{ margin: "40px 0", border: 0, borderTop: "1px solid #d6e4df" }} />
        <section id="english" lang="en">
          <h2 style={{ fontSize: "1.7rem" }}>QuickBooks Integration — Privacy Policy</h2>
          <p><strong>Last updated:</strong> October 9, 2026.</p>
          <p>This policy covers the private integration between QuickBooks Online and L'Envol des Enfants' content management system. It does not describe all retail store data practices.</p>
          <h3>1. Responsible parties and contact</h3>
          <p>L'Envol des Enfants determines how its inventory and accounting information is used. Atelier Informatique Potvin (AIP) provides development and technical operation on its behalf. Contact <a href="mailto:kmaniamba@yahoo.fr">kmaniamba@yahoo.fr</a> with privacy requests.</p>
          <h3>2. Information processed</h3>
          <p>Depending on the features authorized, the integration may process the QuickBooks company identifier, product identifiers, names, SKUs, item types, inventory quantities, and related order or inventory movement references. If sales synchronization is separately activated, only transaction information needed for that operation should be processed. The app does not request Intuit account passwords.</p>
          <h3>3. Use and consent</h3>
          <p>Information is used to compare and validate product mappings, review Conakry inventory, protect access and, only when explicitly enabled, perform authorized operations. Québec inventory is outside the QuickBooks integration scope. An authorized company representative connects QuickBooks through Intuit OAuth.</p>
          <h3>4. Storage and security</h3>
          <p>The integration relies on Cloudflare hosting services and Intuit's QuickBooks services. Stored QuickBooks authorization tokens are encrypted, with access restricted to authorized application components. CMS administrative access requires authentication. No security system can eliminate all risk.</p>
          <h3>5. Sharing and international processing</h3>
          <p>Information may be shared with necessary service providers, including Intuit and Cloudflare, and authorized technical support personnel as required. QuickBooks information is not sold to advertisers. Providers may process information in different countries.</p>
          <h3>6. Retention, deletion and requests</h3>
          <p>Operational information is retained only while reasonably needed for the integration and applicable obligations. On disconnection or a deletion request, integration-specific data that is no longer needed will be reviewed for deletion, subject to legal and security obligations. Records held directly in QuickBooks remain under the company's QuickBooks account. The company may revoke app access through Intuit and request access, correction or deletion by contacting <a href="mailto:kmaniamba@yahoo.fr">kmaniamba@yahoo.fr</a>, subject to applicable law.</p>
          <h3>7. Changes</h3>
          <p>This policy may be updated when the application's actual data practices change. See the <a href="/quickbooks/conditions">terms of use</a>.</p>
        </section>
      </article>
    </main>
  );
}
