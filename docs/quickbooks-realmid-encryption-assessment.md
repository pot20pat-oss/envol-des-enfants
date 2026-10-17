# QuickBooks — évaluation du chiffrement du realmId (2026-10-15)

**État : analyse vérifiée sur le code `main`; aucune migration de données exécutée.**
Périmètre : connexion OAuth QuickBooks Online de l'application privée Envol des Enfants Integration, environnement Sandbox uniquement.

## Constat matériel

- `quickbooks_connections.realm_id` est enregistré comme **texte lisible par requête SQL** dans D1 ; les applications utilisant les droits SQL peuvent lire cette valeur.
- **Ce n'est pas un stockage physique non chiffré.** Cloudflare documente le chiffrement automatique de **toutes les données D1 au repos par AES-256**, généralement en mode GCM. Voir : https://developers.cloudflare.com/d1/reference/data-security/.
- La couche applicative chiffre déjà les **jetons OAuth** par AES-GCM avant leur écriture dans `quickbooks_connections.encrypted_tokens`. L'identifiant d'entreprise n'est **pas** chiffré individuellement dans le champ `realm_id`.
- Le chiffrement en transit Worker ↔ D1 est également assuré par Cloudflare selon sa documentation. L'existence des secrets Cloudflare et de leur rotation en production **n'a pas été vérifiée**.
- Le texte Intuit demandé pendant l'évaluation mentionne « Encrypt and store the refresh token and realmID in persistent memory ». **Il n'est pas établi** qu'Intuit accepte le seul chiffrement d'infrastructure D1 comme satisfaction de cette phrase, particulièrement sans chiffrement applicatif de `realmId`. Obtenir une confirmation d'Intuit avant d'attester de ce point.

## Dépendances qui rendent une migration directe risquée

- `lib/quickbooks-oauth.ts` : la clé AES-GCM des jetons utilise actuellement `quickbooks:sandbox:${realmId}` comme donnée additionnelle authentifiée ; modifier `realm_id` sans adapter la lecture rendrait les jetons indéchiffrables.
- `app/api/quickbooks/callback/route.ts`, `app/api/quickbooks/disconnect/route.ts` : insertion et suppression atomiques conditionnées par `realm_id`, `encrypted_tokens` et une barrière de révocation.
- `lib/quickbooks-order-queue.ts`, `lib/quickbooks-inventory-capture.ts`, `lib/order-stock-restoration.ts` et plusieurs routes `app/api/quickbooks/` : contrôles d'identité par comparaison directe de `realm_id` avec la compagnie Sandbox attendue.
- `quickbooks_order_sync`, `quickbooks_product_mappings`, `quickbooks_inventory_events` et `quickbooks_sandbox_test_runs` conservent également cet identifiant. Changer seulement `quickbooks_connections` **ne protégerait pas** les autres copies et casserait potentiellement les jointures/contrôles.

## Décision de sécurité

**Aucune modification improvisée de schéma ni de valeur `realm_id`.** Les données actuelles restent protégées au repos par D1 et les jetons disposent d'un chiffrement supplémentaire à la couche applicative. Une migration applicative ne doit pas être présentée comme accomplie sans tests d'intégrité et validation de la conversion.

Avant de modifier les données réelles :

1. Demander à Intuit si AES-256 au repos de Cloudflare D1 couvre son exigence sur `realmId`. Sinon, confirmer le besoin de chiffrement applicatif.
2. Inventorier toutes les colonnes et usages de `realm_id` et conserver l'environnement Sandbox isolé de Production.
3. Proposer un format de stockage versionné : identifiant chiffré AES-GCM et valeur dérivée non réversible pour les recherches/contrôles d'intégrité. Éviter de réutiliser directement un `realmId` en clair comme clé de jointure.
4. Écrire et tester une migration **transactionnelle**, réversible par sauvegarde, sur une copie de Sandbox. Vérifier la compatibilité de déchiffrement des jetons existants, les revocations concurrentes, les retours d'erreur et les écritures de file d'attente.
5. Vérifier le build, les tests d'intégration et les résultats de migration. Exécuter la migration réelle uniquement après autorisation explicite et plan de restauration.

## Verdict

- **OBSERVED / PASS :** chiffrement *au repos* offert par D1 selon la documentation Cloudflare ; présence de chiffrement applicatif AES-GCM des jetons dans le code.
- **OBSERVED / NON CONFORMITÉ NON ÉTABLIE :** `realm_id` lisible via SQL, sans chiffrement applicatif propre.
- **INDETERMINATE :** interprétation d'Intuit concernant le chiffrement D1, configuration runtime des secrets, conformité générale de l'application.
- **NOT DONE :** migration de schéma, conversion de données, déploiement et approbation Intuit.

Ne pas cocher une attestation de conformité *actuellement complète* sur la seule base de cette documentation.
