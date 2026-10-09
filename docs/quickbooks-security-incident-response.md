# QuickBooks — procédure de réponse aux incidents (proposition opérationnelle)

Statut : **procédure documentée, non exercée et non validée opérationnellement**.
Périmètre : intégration privée QuickBooks Online de L'Envol des Enfants (CMS Cloudflare Workers, D1 et R2), développée par Atelier Informatique Potvin. Le périmètre comptable prévu est Conakry; ne pas activer Production par cette procédure.

## Déclencheurs

- Suspicion de fuite de jeton OAuth, secret Intuit ou session administrateur.
- Accès non autorisé au CMS ou aux données QuickBooks.
- Transactions, factures ou mouvements de stocks inattendus.
- Journaux révélant un abus de l'API ou une panne causant une perte ou altération de données.
- Divulgation de données clients ou comptables.

## Actions immédiates

1. Consigner l'heure (UTC), le responsable, les symptômes, les systèmes touchés et les preuves disponibles dans un dossier d'incident à accès restreint. Ne jamais y copier de jeton, mot de passe ou données personnelles inutiles.
2. Prévenir le responsable autorisé de L'Envol des Enfants et le responsable technique AIP par leurs canaux approuvés.
3. Si nécessaire, **désactiver les opérations QuickBooks concernées** avant toute investigation. Ne pas effacer la base D1, les sauvegardes ou les journaux. Ne pas présumer qu'une page informative de déconnexion révoque les jetons.
4. En cas de soupçon de jeton compromis, demander à l'administrateur autorisé la révocation dans Intuit, vérifier la révocation, puis renouveler les secrets concernés via Cloudflare Secrets. Ne jamais afficher les secrets dans les tickets ou journaux.
5. Préserver les journaux Cloudflare/Intuit pertinents avec contrôle d'accès et minimisation des données; relever les identifiants de déploiement et les opérations comptables concernées.
6. Délimiter l'étendue de l'incident, corriger la cause, examiner les risques résiduels. Tester d'abord en Sandbox.
7. Faire approuver la remise en service et surveiller les opérations, stocks et factures après reprise.

## Notification et suivi

- Évaluer sans délai les obligations contractuelles Intuit et les lois applicables selon la nature des données et les territoires concernés. Le calendrier exact de notification doit être vérifié auprès des textes et contrats en vigueur; cette procédure n'invente aucun délai.
- Documenter les décisions de notification, les destinataires, les dates et les confirmations.
- Faire une revue post-incident : origine, chronologie, impact, corrections, preuves de tests et mesures préventives.

## Contrôles à valider avant Production

- [ ] Désigner explicitement les responsables d'incident et leurs moyens de contact sûrs.
- [ ] Vérifier le processus de révocation Intuit de bout en bout.
- [ ] Tester les accès aux journaux, la sauvegarde et une restauration contrôlée.
- [ ] Vérifier la politique de rétention et suppression des données propres à l'intégration.
- [ ] Exécuter un exercice simulé (jeton compromis et anomalie de stock) et conserver les résultats.
- [ ] Faire approuver les obligations de notification et la procédure par le responsable de l'entreprise.

Cette procédure décrit les actions prévues. **Son existence ne constitue pas une preuve qu'elles sont en place ou qu'une conformité Intuit est acquise.**
