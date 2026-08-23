# Envol des Enfants — boutique et CMS

Site bilingue français-anglais avec administration sécurisée indépendante de ChatGPT, conçu pour Cloudflare Workers, D1 et R2.

## Fonctionnalités

- Catalogue administrable : produits, prix en GNF, stock, catégories, disponibilité, descriptions françaises et anglaises.
- Fiches produit : photos, marque, matière, dimensions, âge conseillé et conditions d’échange.
- Commandes, promotions et abonnés à l’offre de bienvenue avec consentement.
- Tableau de bord, réglages de la boutique et changement individuel de mot de passe.
- Téléversement des photos sur Cloudflare R2.
- Connexion administrateur avec mot de passe haché PBKDF2, cookie sécurisé HttpOnly et contrôle strict des adresses autorisées.

## Configuration Cloudflare

1. Installer les dépendances : `npm ci`.
2. Créer la base : `npx wrangler d1 create envol-des-enfants-db`.
3. Remplacer le `database_id` de démonstration dans `wrangler.jsonc` par l’identifiant obtenu.
4. Créer le stockage des images : `npx wrangler r2 bucket create envol-des-enfants-images`.
5. Appliquer les migrations : `npm run db:migrate`.
6. Configurer les secrets Cloudflare, sans jamais écrire leurs valeurs dans GitHub :

```sh
npx wrangler secret put ADMIN_EMAILS
npx wrangler secret put ADMIN_BOOTSTRAP_PASSWORD
npx wrangler secret put SESSION_SECRET
```

`ADMIN_EMAILS` contient les adresses administratrices séparées par une virgule. Le mot de passe initial doit comporter au moins 12 caractères. Chaque administrateur pourra ensuite définir son propre mot de passe depuis l’espace de gestion.

7. Générer puis déployer : `npm run build && npm run deploy`.
8. Ouvrir `/admin` sur le domaine de la boutique.

Pour connecter GitHub à Cloudflare, choisir **Workers & Pages → Créer → Importer un dépôt Git**, puis sélectionner ce dépôt et conserver `npm run build` comme commande de compilation.

## Développement local

Copier `.dev.vars.example` vers `.dev.vars`, renseigner des valeurs de développement, puis lancer `npm run dev`. Les fichiers `.dev.vars` et `.env` sont exclus du dépôt.
