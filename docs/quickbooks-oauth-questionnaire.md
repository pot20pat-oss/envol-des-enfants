# QuickBooks OAuth — réponses et preuves pour le questionnaire Intuit

Portée : environnement Sandbox uniquement. Aucun endpoint, jeton ni secret de production.

## Points traités

| Question | Mécanisme | Preuve |
| --- | --- | --- |
| 3 — nouvelles tentatives après erreur temporaire | `fetchTokenWithControlledRetry` dans `lib/quickbooks-oauth.ts` : seuls les échecs réseau, HTTP 429 et 5xx sont retentés, 3 tentatives maximum par défaut, backoff exponentiel (250 ms, 500 ms…), en-tête `Retry-After` honoré et plafonné à 10 s. Les erreurs OAuth 4xx ne sont jamais retentées; un timeout/abandon n'est pas retenté. | Tests « Q3 » dans `tests/quickbooks-oauth-lifecycle.test.mjs` |
| 4 — reconnexion explicite | `QuickBooksReconnectRequiredError` (`requiresReconnect: true`, code OAuth conservé) pour toute erreur exigeant une nouvelle autorisation. La route `GET /api/quickbooks/status` répond alors HTTP 401 avec `requires_reconnect: true`, `reconnect_url: /api/quickbooks/connect` et le message « Reconnectez QuickBooks depuis le CMS ». | Tests « Q4 » (route status, cas OAuth et cas générique) |
| 5 — document Discovery | `resolveIntuitOAuthEndpoints` lit le document officiel `https://developer.api.intuit.com/.well-known/openid_sandbox_configuration`, valide chaque endpoint (HTTPS + hôte Intuit attendu) et le met en cache. En cas d'échec ou de document inattendu, repli sur les endpoints connus, identiques au document officiel vérifié le 2026-10-17 : autorisation `https://appcenter.intuit.com/connect/oauth2`, jetons `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer`, révocation `https://developer.api.intuit.com/v2/oauth2/tokens/revoke`. L'échange de code et le rafraîchissement utilisent l'endpoint résolu. | Tests « Q5 » (document officiel, hôte hostile, panne Discovery, endpoint de révocation) |
| 6b — expiration du refresh token | Si `refresh_expires_at` est dépassé localement, `accessTokenForSandbox` lève `refresh_token_expired` sans appeler Intuit. | Test « Q6b » (zéro appel à l'endpoint de jetons) |
| 6c — `invalid_grant` | Réponse `invalid_grant` (ou `invalid_token`) de l'endpoint de jetons, à l'échange comme au rafraîchissement : erreur de reconnexion dédiée, aucune nouvelle tentative, jetons stockés inchangés. | Test « Q6c » (un seul appel, `encrypted_tokens` inchangé) |
| 1 — cycle complet | Connexion (URL d'autorisation + `state` CSRF) → échange du code → utilisation du jeton → rafraîchissement avec rotation persistée → révocation → reconnexion. | Test « Q1 » (Intuit et D1 simulés) |

## Déjà présents, inchangés

- Q2 : renouvellement préventif (jeton servi seulement s'il reste plus de 90 s de validité).
- Q6a : rafraîchissement à l'expiration de l'access token, rotation persistée avant usage, conflit concurrent traité.
- Q6d : protection CSRF par `state` (cookie + hachage en base, consommation atomique).
- Q7 : aucune dépendance à OAuth Playground.

## État réel observé (lecture seule, 2026-10-17)

- Worker déployé : secrets `QUICKBOOKS_MODE`, `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET` et `QUICKBOOKS_TOKEN_KEY` présents (noms seulement, valeurs jamais lues).
- Base D1 distante : une connexion `sandbox` existe (realm `9341458454408573`, connectée le 2026-10-08, `updated_at` au 2026-10-16). Ce rafraîchissement récent par le code déjà déployé démontre Q6a en conditions réelles.
- `GET /api/quickbooks/status` sans session répond HTTP 401 : l'authentification administrateur est bien exigée.

## Limite honnête

Le cycle Q1 et le scénario Q6b sont démontrés contre un Intuit et une base D1 simulés, avec les vraies fonctions du code de production. Le cycle réel en sandbox Intuit n'a pas été exécuté depuis cet environnement d'agent : il exige la session administrateur du CMS, le consentement dans le navigateur avec les identifiants de la compagnie sandbox Intuit, et la publication préalable du code corrigé. Aucun de ces trois éléments ne peut être fourni par l'agent.

## Procédure réelle Q1 + Q6b (à exécuter une fois dans le CMS)

1. Publier le code corrigé, puis ouvrir une session administrateur CMS.
2. Q1 : ouvrir `/api/quickbooks/connect`, autoriser la compagnie sandbox chez Intuit, vérifier le retour `admin?quickbooks=sandbox-connected`.
3. Capturer `GET /api/quickbooks/status` : conserver la réponse montrant `connected: true` et `api_verified: true` (preuve de bout en bout).
4. Déconnecter depuis le CMS (déconnexion explicite Sandbox), vérifier que le status ne montre plus de connexion vérifiée.
5. Reconnecter par `/api/quickbooks/connect` et capturer de nouveau un status `api_verified: true`.
6. Q6b réel : laisser expirer le refresh token sandbox (100 jours) est impraticable en séance; le scénario est couvert par le test Q6b simulé et, en réel, par la révocation côté Intuit suivie d'un appel protégé, qui doit produire la réponse de reconnexion explicite de la route status (HTTP 401, `requires_reconnect: true`).

## Bloqueur consigné — vérification réelle Q1/Q6b (2026-10-17)

Tentative de finalisation réelle effectuée; chaque prérequis a été revérifié avant consignation :

- Session administrateur CMS : indisponible pour l'agent. `GET /api/quickbooks/status` sans session répond HTTP 401 (revérifié le 2026-10-17). Le mot de passe administrateur est un secret Worker en écriture seule (`ADMIN_BOOTSTRAP_PASSWORD`) : il ne peut être ni lu ni récupéré par l'agent, et il n'est pas demandé à l'utilisateur de le transmettre.
- Publication : le code corrigé (retries, Discovery, reconnexion) est local et non publié; le Worker déployé exécute encore l'ancien code. Déployer est une décision de publication qui n'appartient pas à l'agent, d'autant que l'arbre de travail contient des modifications non liées en cours.
- Consentement Intuit : l'autorisation navigateur exige les identifiants de la compagnie sandbox Intuit de l'utilisateur et son consentement interactif, infournissables par l'agent.
- Q6b réel : le refresh token sandbox vit 100 jours; son expiration naturelle est impraticable en séance, et la révocation côté Intuit exige la même session administrateur.

Conséquence : les captures réelles attendues (`api_verified: true` après connexion puis après reconnexion, et réponse `requires_reconnect: true` après révocation) restent à produire par l'utilisateur en suivant la procédure ci-dessus, après publication du code. Le travail validé n'a pas été réécrit : tests du cycle toujours verts (10/10 revérifiés le 2026-10-17), code OAuth, route status et la présente note préservés tels quels.

Revérification du 2026-10-17 : aucune publication du code corrigé n'a encore eu lieu (dernière version du Worker datée du 2026-10-09 selon `wrangler versions list`) et la connexion sandbox en base est inchangée depuis le 2026-10-16. La fiche opérateur ci-dessous reste donc intégralement à exécuter.

## Fiche opérateur — exécution réelle Q1/Q6b (à remplir par l'opérateur)

Prérequis : code corrigé publié; session administrateur CMS ouverte dans le navigateur; identifiants de la compagnie sandbox Intuit de L'Envol des Enfants. Ne jamais consigner de jeton, secret, code d'autorisation ni cookie ci-dessous — uniquement les réponses JSON de status expurgées et les dates.

- [ ] Publication du code corrigé confirmée (date/heure : ____ ; opérateur : ____)
- [ ] Q1a Connexion : `/api/quickbooks/connect` → consentement Intuit → retour `admin?quickbooks=sandbox-connected` observé le ____
- [ ] Q1b Capture status n°1 : coller ici la réponse de `GET /api/quickbooks/status` (attendu : `connected: true`, `api_verified: true`, `environment: sandbox`) — À CAPTURER
- [ ] Q1c Déconnexion explicite Sandbox depuis le CMS confirmée le ____ ; status suivant non vérifié observé
- [ ] Q1d Reconnexion : `/api/quickbooks/connect` → consentement Intuit → retour `admin?quickbooks=sandbox-connected` observé le ____
- [ ] Q1e Capture status n°2 : coller ici la réponse de `GET /api/quickbooks/status` après reconnexion (attendu : `connected: true`, `api_verified: true`) — À CAPTURER
- [ ] Q6b Réel : révocation de l'autorisation côté Intuit effectuée le ____, puis `GET /api/quickbooks/status` — coller ici la réponse (attendu : HTTP 401, `requires_reconnect: true`, `reconnect_url: /api/quickbooks/connect`) — À CAPTURER
- [ ] Clôture : les trois captures sont présentes, datées, sans secret; le questionnaire Intuit peut être soumis.

## Commandes de vérification

```sh
node --experimental-strip-types --test tests/quickbooks-oauth-lifecycle.test.mjs
npm run test:unit
```
