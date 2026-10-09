# QuickBooks Sandbox — récupération après révocation interrompue

**Portée :** environnement Sandbox uniquement. Ne pas appliquer cette procédure à une société Production.

## Diagnostic sûr (sans modification)
1. Ouvrir une session administrateur CMS. Effectuer `GET /api/quickbooks/revocation-diagnostic` depuis cette session.
2. Noter `revocation_pending`, `pending_since`, `connection_present`, sans enregistrer de cookie, secret ni jeton.
3. Si `revocation_pending=false`, aucune barrière persistante à traiter.
4. Si `revocation_pending=true`, suspendre toutes les opérations comptables Sandbox et documenter les requêtes OAuth/intuit en cours, leur chronologie et leurs erreurs.

## Si Intuit a répondu par une erreur ou si la requête a expiré
- **Ne pas effacer automatiquement la barrière** : un timeout n'établit pas que la révocation a échoué côté Intuit.
- Vérifier indépendamment, dans le portail développeur Sandbox Intuit et dans les journaux expurgés, si la révocation a été acceptée. Éviter une requête de rafraîchissement automatique pour « tester » la connexion.
- Si l'état distant reste ambigu, laisser la barrière active et demander la révocation ou déconnexion par l'interface Intuit appropriée avant de réautoriser une connexion.

## Rétablissement contrôlé
- Après confirmation de l'état distant, préparer une nouvelle autorisation Sandbox.
- Toute correction des lignes D1 doit être **explicite, approuvée, auditée et faite après sauvegarde**, avec relecture des données et exclusion d'une requête concurrente. Ne pas utiliser de suppression SQL générique ni de nettoyage d'états expirés comme raccourci.
- Une barrière persistante et une ancienne connexion doivent être traitées ensemble dans un créneau de maintenance isolé. Ne jamais divulguer, télécharger ni afficher `encrypted_tokens`.
- Réexécuter les tests fonctionnels simulés, puis vérifier une reconnexion Sandbox légitime avant de déclarer l'incident clos.

## Critères de clôture
- L'issue Intuit et l'état de la connexion locale sont conciliés.
- Les opérations concurrentes ne peuvent plus écrire pendant la procédure.
- La nouvelle connexion éventuelle est autorisée explicitement.
- La procédure et les preuves d'exécution sont consignées, sans secret.

**Limite :** procédure documentaire non encore exercée sur D1 isolée; aucun effacement automatique de barrière n'est fourni.
