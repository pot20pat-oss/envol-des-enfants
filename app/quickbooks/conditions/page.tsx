import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions d'utilisation de l'intégration QuickBooks | L'Envol des Enfants",
  description: "Conditions d'utilisation de l'application QuickBooks privée développée pour L'Envol des Enfants.",
  alternates: { canonical: "/quickbooks/conditions" },
};

export default function QuickBooksConditionsPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 22px 72px", lineHeight: 1.7 }}>
      <article style={{ background: "white", color: "#1a3032", padding: "clamp(22px, 5vw, 48px)", borderRadius: 18, border: "1px solid #d6e4df" }}>
        <p style={{ fontSize: 14, color: "#48645e" }}>L'Envol des Enfants · Intégration QuickBooks</p>
        <h1 style={{ fontSize: "clamp(1.7rem, 4vw, 2.3rem)", lineHeight: 1.2, marginBottom: 12 }}>Conditions d'utilisation de l'intégration QuickBooks</h1>
        <p><strong>Dernière mise à jour :</strong> 9 octobre 2026 · <a href="#english">English version ↓</a></p>
        <p>Ces conditions concernent uniquement l'application privée reliant le système de gestion de L'Envol des Enfants à QuickBooks Online. Elles ne remplacent pas les conditions générales de vente de la boutique.</p>

        <h2>1. Parties et utilisation autorisée</h2>
        <p>L'application est développée et administrée techniquement par <strong>Atelier Informatique Potvin (AIP)</strong> pour l'usage interne exclusif de <strong>L'Envol des Enfants</strong>. L'entreprise utilisatrice demeure responsable de son compte QuickBooks, des autorisations accordées et des données qu'elle y gère. L'accès est réservé aux personnes qu'elle autorise.</p>
        <h2>2. Fonction de l'application</h2>
        <p>L'intégration a pour objectif de comparer les articles et les inventaires, puis, après vérification et activation expresse des fonctions concernées, de coordonner les mouvements de stock et les opérations nécessaires entre le CMS et QuickBooks Online pour <strong>Conakry</strong>. Le stock du Québec n'est pas inclus dans cette intégration. QuickBooks constitue la référence de stock convenue pour Conakry.</p>
        <h2>3. Autorisation et contrôles</h2>
        <p>La connexion à QuickBooks utilise une autorisation Intuit OAuth accordée par un utilisateur habilité de l'entreprise. Le rapprochement par nom ou par UGS ne garantit pas l'identité d'un article. Avant toute écriture automatique, les articles, variantes, quantités, traitements des annulations et règles comptables doivent être vérifiés et approuvés. Aucune autorisation de connexion ne vaut à elle seule autorisation de modifier des données comptables.</p>
        <h2>4. Responsabilités</h2>
        <p>L'Envol des Enfants valide ses produits, ses quantités et les paramètres de sa comptabilité. AIP assure le développement et le soutien technique selon l'entente conclue avec l'entreprise. Les parties doivent signaler rapidement toute correspondance erronée ou anomalie de synchronisation. L'application ne remplace pas l'avis d'un comptable.</p>
        <h2>5. Accès et retrait de l'autorisation</h2>
        <p>L'entreprise peut demander la désactivation de l'intégration et révoquer les autorisations dans les paramètres de son compte Intuit. La révocation interrompt les futurs accès autorisés par ce compte, sans effacer les écritures déjà enregistrées directement dans QuickBooks. Les demandes concernant les données sont traitées selon la <a href="/quickbooks/confidentialite">politique de confidentialité de l'intégration</a>.</p>
        <h2>6. Disponibilité et modifications</h2>
        <p>L'intégration dépend notamment des services QuickBooks Online, du site et de l'hébergement. Des interruptions et modifications techniques peuvent survenir. Ces conditions peuvent être mises à jour pour refléter l'évolution réelle des fonctions ou des exigences de sécurité, sous réserve des ententes contractuelles et des lois applicables.</p>
        <h2>7. Contact</h2>
        <p>Pour toute question sur cette application privée : <a href="mailto:kmaniamba@yahoo.fr">kmaniamba@yahoo.fr</a> (L'Envol des Enfants).</p>

        <hr style={{ margin: "40px 0", border: 0, borderTop: "1px solid #d6e4df" }} />
        <section id="english" lang="en">
          <h2 style={{ fontSize: "1.7rem" }}>QuickBooks Integration — End-User License and Terms of Use</h2>
          <p><strong>Last updated:</strong> October 9, 2026.</p>
          <p>These terms govern only the private QuickBooks Online integration for L'Envol des Enfants, not the retail store's general terms of sale.</p>
          <h3>1. Parties and authorized users</h3>
          <p>Atelier Informatique Potvin (AIP) develops and technically maintains the application for the exclusive internal use of L'Envol des Enfants. L'Envol des Enfants controls its QuickBooks company account, authorized users, permissions and accounting records.</p>
          <h3>2. Purpose and scope</h3>
          <p>The application is intended to compare product identities and inventory data and, only after explicit activation and verification, coordinate approved inventory-related operations between the CMS and QuickBooks Online for the Conakry store. Québec inventory is excluded. QuickBooks is the agreed reference for Conakry stock.</p>
          <h3>3. Authorization and safeguards</h3>
          <p>An authorized company user must grant access through Intuit OAuth. A matching product name or SKU alone does not prove item identity. Product mappings, variants, quantities and accounting treatment must be validated before any automated writes. Connecting an account does not itself authorize accounting changes.</p>
          <h3>4. Responsibilities</h3>
          <p>L'Envol des Enfants is responsible for validating product identities, inventory and accounting settings. AIP provides development and technical support under the parties' agreement. The application does not replace professional accounting advice.</p>
          <h3>5. Disconnection and data</h3>
          <p>The company may request disconnection or revoke access in its Intuit account. Revocation stops future access under that authorization but does not delete accounting records already held by QuickBooks. Please see the <a href="/quickbooks/confidentialite">integration privacy policy</a> for information requests.</p>
          <h3>6. Service changes</h3>
          <p>The integration depends on QuickBooks, hosting and website availability. Functionality and these terms may change in accordance with contractual commitments and applicable law.</p>
          <h3>7. Contact</h3>
          <p><a href="mailto:kmaniamba@yahoo.fr">kmaniamba@yahoo.fr</a> — L'Envol des Enfants.</p>
        </section>
      </article>
    </main>
  );
}
