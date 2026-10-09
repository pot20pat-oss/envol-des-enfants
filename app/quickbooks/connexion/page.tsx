import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion QuickBooks | L'Envol des Enfants",
  description: "Point d'accès de l'intégration privée QuickBooks pour L'Envol des Enfants.",
  robots: { index: false, follow: false },
};

export default function QuickBooksConnectLanding() {
  return (
    <main style={{ maxWidth: 850, margin: "0 auto", padding: "55px 22px" }}>
      <section style={{ background: "white", color: "#213630", padding: "clamp(24px,5vw,45px)", borderRadius: 18, border: "1px solid #d4e3dd", lineHeight: 1.7 }}>
        <h1>Connexion QuickBooks — L'Envol des Enfants</h1>
        <p>Cette page est réservée à la connexion de la compagnie QuickBooks autorisée de L'Envol des Enfants pour la boutique de Conakry.</p>
        <p><strong>Connexion Production non encore activée.</strong> Le processus d'autorisation sécurisé sera disponible lorsque les identifiants Intuit Production seront validés et que les contrôles nécessaires seront installés. Aucun compte n'est connecté depuis cette page actuellement.</p>
        <p>Si vous êtes autorisé à gérer l'intégration, utilisez le <a href="/admin">CMS de L'Envol des Enfants</a>. Ne communiquez jamais de mot de passe, de code de connexion ou de secret Intuit par courriel.</p>
        <p>Pour toute question : <a href="mailto:kmaniamba@yahoo.fr">kmaniamba@yahoo.fr</a>.</p>
        <hr style={{ border: 0, borderTop: "1px solid #d4e3dd", margin: "28px 0" }} />
        <section lang="en">
          <h2>Connect or reconnect QuickBooks</h2>
          <p>This page is reserved for L'Envol des Enfants' authorized QuickBooks integration for Conakry. Production authorization is <strong>not enabled yet</strong>. Once Intuit Production credentials and security controls are ready, authorized company users will be able to connect through Intuit's consent screen. No account is connected by visiting this page.</p>
          <p>Authorized administrators may visit the <a href="/admin">CMS</a>. Contact <a href="mailto:kmaniamba@yahoo.fr">kmaniamba@yahoo.fr</a> for assistance.</p>
        </section>
        <p><a href="/quickbooks/conditions">Conditions / Terms</a> · <a href="/quickbooks/confidentialite">Confidentialité / Privacy</a></p>
      </section>
    </main>
  );
}
