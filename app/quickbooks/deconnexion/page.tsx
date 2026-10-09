import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Déconnexion QuickBooks | L'Envol des Enfants",
  description: "Informations sur la déconnexion de l'application privée QuickBooks.",
  robots: { index: false, follow: false },
};

export default function QuickBooksDisconnectLanding() {
  return (
    <main style={{ maxWidth: 850, margin: "0 auto", padding: "55px 22px" }}>
      <section style={{ background: "white", color: "#213630", padding: "clamp(24px,5vw,45px)", borderRadius: 18, border: "1px solid #d4e3dd", lineHeight: 1.7 }}>
        <h1>Déconnexion QuickBooks — L'Envol des Enfants</h1>
        <p>Pour retirer l'accès d'une application au compte QuickBooks de L'Envol des Enfants, un administrateur autorisé peut gérer ou révoquer l'autorisation dans son compte Intuit.</p>
        <p><strong>Cette page est informative.</strong> La visiter ne révoque aucun jeton et ne supprime aucune donnée. La fonction de déconnexion automatique de l'intégration Production sera mise en place et testée avant l'activation de la connexion réelle.</p>
        <p>Les écritures déjà enregistrées dans QuickBooks ne sont pas effacées par une déconnexion. En cas de question, contactez <a href="mailto:kmaniamba@yahoo.fr">kmaniamba@yahoo.fr</a>.</p>
        <hr style={{ border: 0, borderTop: "1px solid #d4e3dd", margin: "28px 0" }} />
        <section lang="en">
          <h2>Disconnect QuickBooks</h2>
          <p>An authorized company administrator can revoke app access from the company's Intuit account. <strong>This page is informational only</strong>: visiting it does not revoke tokens or erase accounting data. The production disconnection workflow must be implemented and tested before the real integration is enabled.</p>
          <p>Contact <a href="mailto:kmaniamba@yahoo.fr">kmaniamba@yahoo.fr</a> for assistance.</p>
        </section>
        <p><a href="/quickbooks/conditions">Conditions / Terms</a> · <a href="/quickbooks/confidentialite">Confidentialité / Privacy</a></p>
      </section>
    </main>
  );
}
