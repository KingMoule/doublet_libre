# SPEC — Doublet libre

Éditeur web gratuit pour dessiner des mécanismes de chimie organique, pensé d'abord pour les étudiants depuis l'abandon de ChemSketch gratuit (2026).
Proposition complète, avec la recherche sur ChemDraw, ChemSketch, Kekule.js et l'IUPAC : https://claude.ai/artifact/YERTS84ftfKtSyN5jv4F6S

## Décisions

| Sujet | Décision |
|---|---|
| Public | Étudiants d'abord |
| Vérifications pédagogiques | Dans la première version, en avertissements non bloquants |
| Remise des travaux | Image collée dans Word ou Google Docs (PNG et SVG ré-éditable) |
| Licence | MIT, dépôt public |
| Appareils | Ordinateur d'abord ; tablette plus tard |
| Langue | Français ; tous les textes dans `src/i18n/fr.js` |
| Réglage d'un outil | Petite fenêtre verticale à côté de l'outil (simple, double, triple, coin plein ou haché pour l'outil Liaison, élément de l'outil Atome, taille de l'outil Cycle, groupe de l'outil Groupe) ; l'icône montre le choix |
| Montages de laboratoire | Mode « Montage » séparé (bouton dans la barre du haut) avec ses outils par famille de verrerie ; même document que le mécanisme. Pièces aimantées aux rodages ; un montage assemblé se déplace d'un bloc. Une famille garde son icône (une pièce haute serait illisible en 22 pixels) |
| Technique | Site statique sans build ni dépendance ; JavaScript en modules avec JSDoc `// @ts-check` ; tests `node --test` |

## Ce que l'app dessine

- **Formule topologique** : carbones implicites, angles de 120°, longueur constante, hétéroatomes avec leurs H (OH, NH₂, HO– inversé).
- **Doublets libres** accrochés à l'atome, en deux points au-dessus, en dessous, à gauche ou à droite du symbole.
- **Charges formelles** « + », « − », « 2+ » en exposant en haut à droite, sans cercle ; **δ+ / δ−** accrochés à l'atome.
- **Grille hexagonale** au fond, de côté égal à la liaison : un atome, une liaison, une chaîne ou un cycle posés sur le fond s'y accrochent, et le zigzag suit ses arêtes. Glisser reste libre (pas de 15°).
- **Flèches courbes** : source = doublet, liaison ou électron seul ; cible = atome, liaison ou liaison en formation ; pleine (2 e⁻) ou demi-flèche (1 e⁻) ; elles suivent les molécules.
- **Copier-coller** : Ctrl+C copie la sélection (toute la molécule pour un atome ou une liaison, avec ses doublets, charges et flèches courbes internes) ; Ctrl+V colle une copie décalée d'une liaison, sur la grille, déjà sélectionnée. Sans sélection, Ctrl+C copie l'image.
- **Texte** libre (« + », légende) : taille réglable dans le panneau avec − et +, par pas de 2 points.
- **Flèche de réaction** distincte : → ⇌ ↔ ⇒ et pas de réaction ; conditions au-dessus et en dessous, liées à la flèche ; H2O devient H₂O.

## Règles de dessin (IUPAC 2008 « GR », stéréo 2006 « ST »)

- Automatique : zigzag à 120° (GR-3.2.1) ; carbone sans étiquette dès qu'il est lié (GR-2.1.2) ; HO– quand la liaison part à droite (GR-2.1.6) ; charge en haut à droite (GR-5.1) ; doublets sur les axes du symbole (GR-5.2) ; double liaison décalée vers le côté substitué, centrée pour un C=O de cétone (GR-1.10) ; bout étroit du coin sur le centre stéréogène (ST-0.3).
- Avertissement (`src/checks.js`) : octet dépassé, C ou N à cinq liaisons compris (S, P, Si et I exemptés, GR-8.2) ; flèche probablement inversée (part d'un atome +, arrive sur un atome −) ; charge non conservée de part et d'autre d'une flèche de réaction ; ↔ entre structures au squelette σ différent ; charges formelles et partielles sur une même molécule (GR-5.6). Une flèche ne peut pas partir d'un H ou d'un H⁺ : l'outil n'accepte que des électrons comme départ.
- Style : conditions tout au-dessus ou réparties ; doublet en trait (non IUPAC) en option.

## Format de fichier

JSON `.doublet.json` : objets à plat reliés par identifiants (`atoms`, `bonds`, `marks`, `curvedArrows`, `reactionArrows`, `texts`, `apparatus`). Une pièce de verrerie garde sa sorte, sa position et son angle ; un fichier sans `apparatus` (avant les montages) s'ouvre sans pièce. Une flèche courbe référence des électrons (`{mark}`, `{bond}`, `{atom}`, `{between}`), jamais des coordonnées. Voir les types JSDoc de `src/model.js`.

## Phases

Chaque phase se termine par une vérification qu'on peut lancer.

| Phase | Contenu | Vérification | État |
|---|---|---|---|
| 0 | Modèle, rendu SVG, zoom, annuler ; essai de Kekule.js | 28 tests verts ; exemple SN2 rendu | faite |
| 1 | Chaînes, cycles 3 à 8 et benzène, coins, sélection multiple, gomme | Tests de géométrie ; éthanol, cyclohexanone, bromoéthane dessinés | faite |
| 2 | Outil Atome (atome isolé, élément au choix) ; outils doublet, électron seul, charge, δ ; rotation autour de l'atome | Tests de placement ; figure SN2 sans flèches refaite dans l'app | faite |
| 3 | Outil flèche courbe : ancrage, pleine ou demi, poignées, liaison en formation | Test : SN2 dessinée, molécule déplacée, flèches accrochées | faite |
| 4 | Outil flèche de réaction : types, conditions, étapes numérotées ; outil Texte (« + ») | Figure SN2 complète refaite dans l'app | faite |
| 5 | Enregistrer/ouvrir, SVG ré-éditable, PNG 300 ppp, copier vers Word et Google Docs | Aller-retour JSON et SVG sans perte | faite |
| 6 | Vérifications pédagogiques (liste ci-dessus) | Une erreur d'étudiant typique par test ; aucune sur la SN2 correcte | faite |
| 7 | Outil Groupe (Ph, OMe, OEt, CO₂H, CHO, CN, NO₂, OAc, Boc, dessinés en entier) ; menu Modèles : SN2, SN1, E2, E1, addition électrophile, addition nucléophile au carbonyle (les cycles restent à l'outil Cycle) | Chaque groupe et chaque modèle s'insère sans avertissement | faite |
| 8 | Tablette et stylet : pincer pour zoomer, deux doigts pour déplacer la vue, outils à toucher qui agissent au relâchement, cibles agrandies au doigt, élément d'un atome changeable dans le panneau | Test du pincement ; scénario tactile : pincement sans effet de bord, dessin et changement d'élément au doigt | faite |
| 9 | Mode exercice, mode présentation, import SMILES/MOL, interface en anglais (un chantier à la fois) | — | plus tard |
| 10 | Montages de laboratoire : mode Montage, 33 pièces en cinq familles (synthèse, distillation, séparation, verrerie, chauffage et support), rodages aimantés, modèles reflux, distillation simple et Dean-Stark | Tests d'emboîtement ; reflux monté au doigt, déplacé d'un bloc, détaché, tourné | faite |
