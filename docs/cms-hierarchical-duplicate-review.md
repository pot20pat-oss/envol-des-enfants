# CMS — détection hiérarchique des doublons

## Objectif
Unifier la détection du catalogue existant et de l'importation par lots sans supprimer automatiquement de produits ni de photos.

## Pipeline
1. Calculer une empreinte SHA-256 du fichier original et une signature visuelle normalisée. La comparaison visuelle globale ne doit dépendre ni de la marque ni de la catégorie.
2. Classer chaque article selon catégorie > groupe > sous-groupe > famille de produits > variante. Conserver le classement proposé et sa confiance; ne jamais imposer une classification incertaine.
3. Comparer les candidats dans la famille, le sous-groupe, le groupe et la catégorie; compléter par une recherche visuelle dans le catalogue entier.
4. Construire des dossiers de révision avec preuves (images, nom, marque, référence, prix, stock, marchés, différences de variante).
5. Persister les verdicts dans D1 avec une clé canonique de paire et une trace des actions. Ne pas se limiter au localStorage.

## Décisions
- Même article : proposer une fusion après validation explicite.
- Autre photo du même article : proposer l'ajout à la galerie.
- Variante distincte : conserver les fiches séparées et associer leur famille.
- Produit distinct : enregistrer le rejet et ne pas reproposer la paire inchangée.
- Nouveau produit : permettre de forcer la création sans contourner un doublon visuel exact non résolu.

## Contraintes
- Aucun effacement ni fusion automatique.
- Préserver les numéros d'article, les prix et stocks indépendants Québec/Conakry, la visibilité et les commandes liées.
- Garder l'interface au même endroit après chaque décision; permettre annulation lorsque techniquement réversible.
- Réutiliser les empreintes déjà calculées; prévoir une migration rétrocompatible et une reprise des articles existants.
- Ne pas bloquer l'importation sur une simple ressemblance de produits distincts.

## Validation requise avant fusion
- Copies strictes, JPEG recompressés, recadrages et photos différentes d'un même jouet.
- Marque/catégorie erronées et variantes de couleurs.
- Persistance des verdicts entre appareils et après rechargement.
- Vérification des contraintes D1, des stocks et des prix par marché.
- Build, tests de non-régression et vérification de la migration sur une base de test.
