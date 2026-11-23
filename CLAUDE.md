# Doublet libre

Éditeur web libre (MIT) pour dessiner des mécanismes de chimie organique, pensé d'abord pour les étudiants. Site statique sans build ni dépendance.

Less is more. You see elegance in simplicity. You favour concise, clean solutions over those that are complex and comprehensive for risk of over-engineering. Upon work completion, take pause to critically review your work: if complexity has crept in, address the issue and suggest a small change to our workflow to help avoid this in the future.

Langue : on échange en français ; le code, les identifiants et les commentaires sont en anglais. Tout texte affiché à l'utilisateur vit dans `src/i18n/fr.js`.

## Commandes

- Tests : `node --test` ; un seul fichier : `node --test tests/render.test.js`
- Types : `npx -y -p typescript@5.6.3 tsc -p jsconfig.json` (aussi lancé par la CI)
- Aperçu : `node scripts/serve.mjs` puis http://localhost:8765 (configuration `doublet` dans `.claude/launch.json`)
- Image d'un document : `node scripts/snapshot.mjs doc.json out.png` (Edge ou Chrome sans fenêtre)
- Bords de l'écran : `node scripts/edges.mjs` (Edge ou Chrome sans fenêtre, sort en erreur s'il trouve un problème)

## Façon de travailler

- Partir de `SPEC.md`. Une fonctionnalité qui n'y est pas se propose d'abord, avant d'être codée.
- Avant d'ajouter une fonction, chercher si elle existe déjà ailleurs dans l'interface ; si oui, le problème est de la rendre trouvable.
- Une phase à la fois. Écrire d'abord le test qui échoue, puis le code qui le fait passer.
- Une nouvelle vérification (dans `edges.mjs` ou ailleurs) se voit d'abord échouer : casser exprès ce qu'elle doit attraper, puis remettre. Une vérification qui ne trouve jamais rien ne prouve rien.
- Une tâche est finie quand `node --test` passe, et que le rendu a été vu dans le navigateur si l'affichage a changé. Montrer la commande lancée et sa sortie.
- Vérification visuelle : rejouer un scénario de vrais événements de pointeur et de clavier dans l'app, puis juger le SVG obtenu. Les tests ne voient pas le CSS, et les captures du navigateur intégré ne sont pas fiables quand la fenêtre est réduite.
- Une fenêtre, un menu ou une barre se vérifient aux bords avec `node scripts/edges.mjs` : il ouvre chaque outil et chaque menu du haut sur six tailles d'écran (ordinateur, tablette, téléphone, debout et couchés) et signale ce qui sort de l'écran, cache son bouton ou devient inaccessible, une aide de la barre du bas qui dépasse sa ligne (une aide plus longue se raccourcit), et un champ du panneau écrasé quand on sélectionne chaque sorte d'objet.
- Une nouvelle pièce de verrerie se montre d'abord en image (`snapshot.mjs` : chaque pièce seule, puis dans un montage) ; la PR suit l'accord sur le dessin.
- Une règle de dessin cite sa source IUPAC dans le test ou le commentaire (GR-x : recommandations de 2008, ST-x : stéréo 2006).
- Un tracé calculé (pièce penchée, coudée) garde son calcul en commentaire à côté, pour qu'on puisse le refaire.
- Travailler sur une branche, puis ouvrir une PR vers `main`. Messages de commit courts, en français.
- Partir de `main` seulement après avoir vu la PR précédente fusionnée (`gh pr view N --json state` doit dire `MERGED`). Ne pas l'enchaîner avec `&&` : `gh pr view` réussit aussi quand la PR est encore ouverte.
- Après avoir ouvert la PR, activer sa fusion automatique (squash) : GitHub la fusionne seulement quand le test `test` est vert. Si un test échoue, corriger plutôt que fusionner.
- Un plan accepté s'enchaîne : dès que la PR d'une étape est fusionnée, passer à l'étape suivante sans attendre un nouveau feu vert.

## Choix qui ne se voient pas dans le code

- Pas de framework ni de build. Les types passent par JSDoc et `// @ts-check`. Une dépendance ne s'ajoute que si elle remplace beaucoup de code.
- `render.js` est pur (document → SVG) et testable sans navigateur. La logique de dessin y vit, pas dans `editor.js`.
- Une flèche courbe référence des électrons (doublet, liaison, atome), jamais des coordonnées. Ses points de contrôle sont relatifs à ses ancres : c'est ce qui la fait suivre les molécules.
- Chaque modification passe par `commit()` dans `editor.js`, qui enregistre l'état pour annuler.
- Une opération sur une sélection (cadre, déplacer, effacer) vaut pour tous les objets à coordonnées : atomes, textes, flèches de réaction (`idsInRect` et `moveObjects` dans `model.js`).
- Une action au clavier a aussi un bouton (panneau, petite fenêtre ou menu) : un étudiant sur tablette n'a ni Ctrl, ni Suppr, ni chiffres.
- Chaque chose à sa place : ce que l'outil va dessiner se choisit dans la petite fenêtre à côté de l'outil ; ce qui est sélectionné se règle dans le panneau ; sans sélection, le panneau explique l'outil ; la barre du bas ne sert qu'aux messages.

## Pièges

- Sous Windows, modifier les fichiers avec les outils Edit et Write, jamais avec PowerShell : PowerShell 5 lit l'UTF-8 comme de l'ANSI et casse les accents.

- Le dessin est gardé dans `localStorage` : après avoir changé `sample.js` ou `templates.js`, rouvrir le modèle par le menu Modèles pour le voir.
- Les tests de rendu comparent des fragments de SVG arrondis au centième : changer une taille de police casse leurs valeurs attendues.
- Retirer un élément d'interface, c'est aussi retirer ses restes : chercher son identifiant dans tout le dépôt (texte dans `fr.js`, constante, règle CSS).
- Un attribut `data-*` écouté par un parent ne se réutilise pas ailleurs : un clic dans la petite fenêtre d'options remonte jusqu'à la barre d'outils, qui réagit à tout `data-tool` (d'où `data-for` sur la fenêtre).
