# L’Envol des Enfants — Site + CMS Cloudflare

Boutique bilingue (FR/EN) avec CMS administrateur, déployée sur Cloudflare Workers avec D1 et R2.

## Démarrage local

1. `npm install`
2. Copier `.dev.vars.example` vers `.dev.vars`
3. Configurer les variables/secrets administrateur
4. Appliquer les migrations D1
5. `npm run dev`

## Scripts

- `npm run dev` — serveur local
- `npm run build` — build de production
- `npm run test` — build + tests
- `npm run db:migrate` — migrations D1 distantes
- `npm run deploy` — déploiement Cloudflare

## Architecture

- `app/` — vitrine, CMS et routes API
- `lib/` — logique CMS/catalogue/marchés
- `worker/` — Worker Cloudflare
- `drizzle/` — migrations D1
- `public/` — images statiques

## Données

- Produits, commandes, promotions, abonnés et réglages : D1
- Images téléversées dans le CMS : R2
- Images statiques du catalogue : `public/`

## Sécurité

Les fichiers `.env*` et `.dev.vars` ne doivent jamais être commités. Utiliser les secrets Cloudflare pour les valeurs sensibles.
