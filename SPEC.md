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
| Réglage d'un outil | Petite fenêtre verticale à côté de l'outil (simple, double, triple, coin plein ou haché pour l'outil Liaison, élément de l'outil Atome, taille de l'outil Cycle, groupe de l'outil Groupe, doublet ou électron seul, charge +1 ou −1, δ+ ou δ−, flèche courbe à 2 ou 1 électron, type de flèche de réaction) ; l'icône montre le choix. Maj + clic donne l'autre choix des outils à deux choix |
| Interface | Ce que l'outil va dessiner se choisit dans la petite fenêtre à côté de l'outil ; ce qui est sélectionné se règle dans le panneau ; sans sélection, le panneau explique l'outil ; la barre du bas ne sert qu'aux messages. Barre du haut : sélecteur Mécanisme \| Montage \| Exercice ▾ (menu : Nomenclature, Mécanismes), annuler, Modèles, Fichier, et Copier l'image en bouton principal. Sur un téléphone, le sélecteur montre les noms sans icônes. Maquettes : https://claude.ai/artifact/8dfrzyt2TVefRm6GXTwstX |
| Montages de laboratoire | Mode « Montage » séparé (sélecteur Mécanisme \| Montage dans la barre du haut) avec ses outils par famille de verrerie ; même document que le mécanisme. Pièces aimantées aux rodages ; un montage assemblé se déplace d'un bloc. Une famille garde son icône (une pièce haute serait illisible en 22 pixels) |
| Exercices de nomenclature | Troisième choix du sélecteur (Mécanisme \| Montage \| Exercice) ; molécules générées, nommées selon le manuel du cours ; voir la section « Exercices de nomenclature » |
| Exercices de mécanisme | Le bouton Exercice ouvre un menu : Nomenclature, Mécanismes. Un numéro est un mécanisme complet dont des parties sont cachées ; voir la section « Exercices de mécanisme » |
| Technique | Site statique sans build ni dépendance ; JavaScript en modules avec JSDoc `// @ts-check` ; tests `node --test` |

## Ce que l'app dessine

- **Formule topologique** : carbones implicites, angles de 120°, longueur constante, hétéroatomes avec leurs H (OH, NH₂, HO– inversé). Un carbone se marque C s'il a deux liaisons identiques en ligne (O=C=O) ou s'il est dans une molécule d'une seule liaison (H₂C=O) (GR-2.1.2). L'outil Atome a aussi **R**, un groupe quelconque, sans H (RO–OR).
- **Doublets libres** accrochés à l'atome, en deux points au-dessus, en dessous, à gauche ou à droite du symbole.
- **Charges formelles** « + », « − », « 2+ » en exposant en haut à droite, sans cercle ; **δ+ / δ−** accrochés à l'atome : l'outil δ pose le signe choisi, et un clic sur le même signe l'enlève.
- **Grille hexagonale** au fond, de côté égal à la liaison : un atome, une liaison, une chaîne ou un cycle posés sur le fond s'y accrochent, et le zigzag suit ses arêtes. Glisser reste libre (pas de 15°).
- **Flèches courbes** : source = doublet, liaison ou électron seul ; cible = atome, liaison ou liaison en formation ; pleine (2 e⁻) ou demi-flèche (1 e⁻) ; elles suivent les molécules.
- **Copier-coller** : Ctrl+C copie la sélection (toute la molécule pour un atome ou une liaison, avec ses doublets, charges et flèches courbes internes) ; Ctrl+V colle une copie décalée d'une liaison, sur la grille, déjà sélectionnée. Sans sélection, Ctrl+C copie l'image.
- **Texte** libre (« + », légende) : taille réglable dans le panneau avec − et +, par pas de 2 points.
- **Flèche de réaction** distincte : → ⇌ ↔ ⇒ et pas de réaction, choisi avant de tracer et changeable ensuite dans le panneau ; conditions au-dessus et en dessous, liées à la flèche ; H2O devient H₂O.

## Règles de dessin (IUPAC 2008 « GR », stéréo 2006 « ST »)

- Automatique : zigzag à 120° (GR-3.2.1) ; carbone sans étiquette dès qu'il est lié (GR-2.1.2) ; HO– quand la liaison part à droite (GR-2.1.6) ; charge en haut à droite (GR-5.1) ; doublets sur les axes du symbole (GR-5.2) ; double liaison décalée vers le côté substitué, centrée pour un C=O de cétone (GR-1.10) ; bout étroit du coin sur le centre stéréogène (ST-0.3).
- Avertissement (`src/checks.js`) : octet dépassé, C ou N à cinq liaisons compris (S, P, Si et I exemptés, GR-8.2) ; flèche probablement inversée (part d'un atome +, arrive sur un atome −) ; charge non conservée de part et d'autre d'une flèche de réaction ; ↔ entre structures au squelette σ différent ; charges formelles et partielles sur une même molécule (GR-5.6). Une flèche ne peut pas partir d'un H ou d'un H⁺ : l'outil n'accepte que des électrons comme départ.
- Style : conditions tout au-dessus ou réparties ; doublet en trait (non IUPAC) en option.

## Format de fichier

JSON `.doublet.json` : objets à plat reliés par identifiants (`atoms`, `bonds`, `marks`, `curvedArrows`, `reactionArrows`, `texts`, `apparatus`). Une pièce de verrerie garde sa sorte, sa position et son angle ; un fichier sans `apparatus` (avant les montages) s'ouvre sans pièce. Une flèche courbe référence des électrons (`{mark}`, `{bond}`, `{atom}`, `{between}`), jamais des coordonnées. Voir les types JSDoc de `src/model.js`.

## Exercices de nomenclature

Le mode Exercice montre une molécule à nommer ou un nom à dessiner. Les molécules sont générées selon le niveau choisi : une famille de la section 2.5 du manuel du cours, ou un mélange. Une série compte dix molécules, avec le score à la fin. Son lien (niveau et graine) se partage pour un devoir. Le dessin enregistré de l'étudiant n'est pas touché.

**Règles suivies** : celles du manuel (Girouard, Marrano et Lapierre, *Chimie organique*, 3e éd., chapitre 2, section 2.5), même là où l'IUPAC 2013 a changé. La chaîne principale porte d'abord le plus de liaisons multiples, puis elle est la plus longue ; un cycle plus court que la plus longue chaîne devient un substituant ; on écrit « phényloxy ». Un test cite la section du manuel et la règle IUPAC 2013 (P-x), avec l'écart s'il y en a un.

**Nommeur** (`src/naming/namer.js`, pur) : il suit l'ordre du manuel.
1. Fonction prioritaire (figure 2.21) : aldéhyde > cétone > alcool > alcène = alcyne > alkyles, aryles, halogènes, alkoxy et nitro, tous de même rang.
2. Chaîne principale : celle qui porte la fonction prioritaire, puis le plus de liaisons multiples, puis la plus longue, puis le plus de ramifications.
3. Numérotation : les plus petits indices à la fonction prioritaire, puis aux liaisons multiples (à l'alcène en cas d'égalité), puis aux substituants comparés au premier point de différence, puis au substituant cité en premier selon l'ordre alphabétique.

Ces critères sont des listes ordonnées : une famille y ajoute des entrées et du vocabulaire, pas un nouveau chemin dans le code. Le nommeur rend le nom en morceaux (préfixes, chaîne, insaturations, suffixe). L'orthographe française (élision, « a » d'euphonie, indices omis) vit dans une seule fonction, le vocabulaire dans `fr.js`. S'il reste deux noms possibles après tous les critères, le manuel ne tranche pas : le générateur rejette la molécule.

**Correction**
- Un dessin se compare sur le graphe (atomes liés, ordre des liaisons), jamais sur les coordonnées. Les H, les doublets et les coins sont ignorés ; les deux formes de Kekulé du benzène et les deux écritures du nitro se valent. Un dessin faux est nommé par l'app : « Votre dessin : 2-méthylhexane ».
- Un nom se compare au nom attendu et aux autres noms acceptés : o-, m-, p- ; « oxyde de … et de … » ; noms familiers retenus par le manuel (toluène, phénol…, éthylène, allène, acétylène). Majuscules, apostrophes, tirets et espaces sont normalisés.
- Comptent, avec une remarque : un nom sans accents ; un nom juste mal ponctué (« 2-3-diméthylpentane » : la remarque rappelle les virgules entre les chiffres et les traits d'union entre chiffres et lettres, manuel 2.5.1) ; une voyelle de liaison oubliée ou en trop (« oct-1-èn-3,4-dione », « hex-2,4-diène », « pentandial » : la remarque rappelle le e qui tombe ou reste et le « a » devant diène, manuel 2.5.4 et 2.5.8) ; le nom systématique d'un benzène là où le manuel attend le nom familier (« 1-bromo-3-méthylbenzène » pour « 3-bromotoluène »).
- Ne compte pas : un nom familier que l'IUPAC ne retient pas (acétone, alcool isopropylique, éther diéthylique). La remarque donne le nom systématique.
- Un nom faux se compare aux noms qu'on obtient en brisant une règle à la fois (autre chaîne, numérotation inverse, somme des indices, ordre alphabétique…) : la remarque nomme la règle.
- La solution montre le dessin avec la chaîne principale numérotée, et les étapes du nom.

**Générateur** (`src/naming/generate.js`) : la molécule se dessine pendant qu'elle pousse (zigzag à 120°, droite autour d'une triple liaison, cycles réguliers). Une branche qui en chevauche une autre est abandonnée.

**Contenu** : les molécules sont générées ; aucun exercice n'est recopié du manuel. Les tests décrivent leurs molécules en SMILES (un sous-ensemble lu par `src/naming/graph.js`, qui servira aussi à l'import SMILES de la phase 9).

**Niveaux**, un par famille du manuel, livrés dans cet ordre :

| Niveau | Le générateur tire | Règles propres | Erreurs reconnues |
|---|---|---|---|
| Alcanes (2.5.1) | Chaîne de 4 à 10 C, 1 à 4 ramifications : méthyle à butyle, isopropyle, isobutyle, sec-butyle, tert-butyle | Préfixes multiplicatifs ; ordre alphabétique sans di-, sec- ni tert-, mais avec iso- | Chaîne pas la plus longue ; numérotation inverse ; somme des indices ; ordre alphabétique ; di- compté |
| Cycloalcanes (2.5.2) | Cycle de 3 à 8 C avec 1 à 3 ramifications, ou cycloalkyle sur une chaîne plus longue | Cyclo- ; un seul substituant sans indice ; cycle plus court que la chaîne = cycloalkyle | Numérotation du cycle ; cycle et chaîne inversés ; « 1-méthylcyclohexane » |
| Halogénés (2.5.3) | F, Cl, Br, I sur ces squelettes | Fluoro, chloro, bromo, iodo, au rang des alkyles | Halogène numéroté en priorité ; ordre alphabétique |
| Alcènes (2.5.4) | 1 à 3 doubles liaisons dans la chaîne ou un cycle | -ène, indice du premier carbone ; « a » devant un multiplicatif ; pas d'indice en C2-C3 ni pour un cycloalcène simple ; 1-2 dans un cycle | Numérotation pour les substituants ; deux indices (« pent-1,2-ène ») ; cycle numéroté 1-6 |
| Alcynes (2.5.5) | 1 ou 2 triples liaisons, seules ou avec des doubles | Le plus de liaisons multiples, même dans une chaîne plus courte ; -én-…-yne ; l'alcène d'abord à égalité ; « a » seulement si l'alcène est multiplié ; -ène-…-diyne | Chaîne la plus longue sans toutes les liaisons multiples ; alcyne d'abord à égalité |
| Benzéniques (2.5.6) | Benzène avec 1 à 3 groupes : alkyles, halogènes, nitro, et ceux qui donnent un nom familier (CH₃ d'abord ; OH, NH₂, OCH₃, CHO, COOH, COCH₃, CN avec leur fonction, 2.5.7 à 2.5.10) ; phényle ou benzyle sur une chaîne | Le groupe du nom familier prend l'indice 1 ; entre deux, la priorité (figure 2.21) ; répété, on revient à benzène ; o-, m-, p- acceptés | Nom familier mal choisi ; indice 1 au mauvais groupe ; numérotation |
| Éthers (2.5.7) | 1 ou 2 alkoxy (méthoxy à hexyloxy, phényloxy, benzyloxy) sur une chaîne ou un cycle | La plus longue chaîne de carbones est la chaîne principale ; alkoxy jusqu'à 4 C, alkyloxy au-delà ; « oxyde de … et de … » accepté pour un éther simple | O compté dans la chaîne ; chaîne principale du côté court ; « méthyloxy », « pentoxy » |
| Alcools (2.5.8) | 1 à 3 OH sur des carbones sp³, avec ou sans liaisons multiples | -ol avant les liaisons multiples ; élision (« hex-4-én-3-ol ») et « e » rendu devant un multiplicatif (« heptane-2,5-diol ») ; méthanol, éthanol et cycle simple sans indice ; hydroxy- en substituant | Indice donné à l'alcène ; « heptol » |
| Aldéhydes (2.5.9) | 1 ou 2 CHO en bout de chaîne, ou CHO sur un cycle | -al sans indice ; -dial ; -carbaldéhyde sur un cycle ; hydroxy- et oxo- en substituants | « butan-1-al » ; numérotation par l'autre bout ; alcool en suffixe ; « cyclohexanal » |
| Cétones (2.5.10) | 1 ou 2 C=O dans la chaîne ou un cycle ; acétophénone | -one, -dione ; sans indice quand le C=O n'a qu'une place (propanone, butanone : avec l'indice, le nom compte aussi) ou seul sur un cycle ; oxo- sous un aldéhyde | Numérotation ; alcool en suffixe ; « cyclohexan-1-one » ; acétone |
| Mélange | Plusieurs familles à la fois | Priorités de la figure 2.21 | Celles des familles |

**Hors programme** : la stéréo (E/Z, R/S : chapitre 3) ; les ramifications complexes entre parenthèses (rubriques Enrichissement) ; les ramifications insaturées (vinyle, allyle, éthynyle) ; les éthers cycliques ; les fonctions de l'annexe C en ligne (acides, esters, amides, amines, nitriles, halogénures d'acide, thiols), sauf comme noms familiers du benzène (aniline, acide benzoïque, benzonitrile).

## Exercices de mécanisme

Le menu Exercice ouvre aussi Mécanismes : des mécanismes à compléter, sur les alcènes, sans réarrangement (chapitre 7 du manuel) :
- **Addition de HX** (HCl, HBr, HI), en deux étapes par le carbocation (figure 7.6) ;
- **Hydratation acide** (H₂O, H₂SO₄), en trois étapes (figure 7.14) : alcène + H₃O⁺ → carbocation + H₂O → ion oxonium + H₂O (le solvant, une base) ⇌ alcool + H₃O⁺ régénéré.
- **Addition de X₂** (Br₂, Cl₂ ; CH₂Cl₂), en deux étapes par l'ion ponté (figures 7.23 et 7.24) :
  - alcène + X–X, polarisé par induction → ion bromonium ou chloronium (un cycle de trois, X⁺) + X⁻ ;
  - X⁻ ouvre le pont sur le carbone le plus substitué → dihalogénure vicinal (addition anti).
  
  Le pont se ferme sur l'un ou l'autre carbone : la flèche π fait la liaison avec l'autre.

Les réactions dont le cours ne demande pas le mécanisme se font en **réaction globale**. Le manuel écrit leurs conditions sur la flèche :
- **hydroboration-oxydation**, « 1) BH₃ 2) H₂O₂, OH⁻ », anti-Markovnikov (figure 7.15) ;
- **hydrogénation catalytique**, « H₂, Pt » (figure 7.19) ;
- **oxydation douce**, « KMnO₄, H₂O, OH⁻ », qui donne un diol vicinal (figure 7.26) ;
- **époxydation**, « MCPBA » (figure 7.32) ;
- **ozonolyse réductrice**, « 1) O₃ 2) Zn, H₃O⁺ » (figure 7.30) ;
- **oxydation forte**, « KMnO₄ conc., H₃O⁺ », ou ozonolyse oxydante « 1) O₃ 2) H₂O₂, H₃O⁺ » : les acides, et CO₂ et H₂O pour un CH₂ (figures 7.28 et 7.30).

**Table des réactions** (`src/mechanism/reactions.js`, pur) : le résultat net de chaque réaction sur les deux carbones de la double liaison. Pour une addition, ce que reçoit chacun, celui qui porte le plus de H d'abord ; ou un O qui les ponte ; ou une coupure, avec un C=O sur chacun. La table donne :
- les produits dessinés ;
- la correction du style Substrat ;
- les choix du style Réactifs ;
- le retour « autre réaction ».

Une égalité entre deux carbones différents n'est écartée que si la réaction y met deux groupes différents. Un réarrangement n'est écarté que là où il y a un carbocation.

**Un numéro** est un mécanisme complet dont des parties sont cachées : les états (réactifs, intermédiaires, produit) entre des flèches de réaction, et les flèches courbes de chaque étape, chacune avec son rôle (π vers le H d'un acide, H–Y vers Y, un nucléophile vers C⁺, l'eau qui arrache un H de l'oxonium). Le style dit ce qui est donné :

| Style | Donné | Demandé |
|---|---|---|
| Flèches | Tous les états | Les flèches courbes de chaque étape |
| Structures | Les réactifs et les flèches de l'étape 1 | Chaque intermédiaire (C⁺ et X⁻ ; puis l'oxonium), puis le produit |
| Complet | Les réactifs et les flèches de réaction | Tout |
| Produit | Les réactifs et une flèche de réaction | Le produit majeur, ou les produits d'une coupure |
| Réactifs (réaction globale) | L'alcène et le produit, « ? » sur la flèche | Les conditions, à toucher parmi quatre : celles de la réaction, et celles de trois autres réactions de la table qui donnent autre chose sur cet alcène |
| Substrat (réaction globale) | Les conditions et le produit | L'alcène de départ : tout alcène que la réaction transforme en ce produit est juste |

**Générateur** (`src/mechanism/generate.js`) : les alcènes viennent du générateur de nomenclature, déjà dessinés et nommés ; il écarte ceux dont le H pourrait aller sur l'un ou l'autre carbone (sauf si les deux donnent le même produit) et ceux dont le carbocation se réarrangerait. La double liaison fait face aux réactifs, à sa droite : un alcène est dessiné en miroir au besoin. H₃O⁺ est dessiné H–O⁺(H)–H avec ses H, l'eau H₂O avec ses deux doublets, l'oxonium avec ses deux H ; la dernière étape de l'hydratation porte ⇌. Le style Produit de l'hydratation est la réaction globale : alcène + H₂O, H₂SO₄ sur la flèche (figure 7.13). Un niveau est une réaction et un style : Progressif (3 Flèches, 3 Structures, 2 Complet, 2 Produit ; pour une réaction globale, 4 Produit, 3 Réactifs, 3 Substrat) ou un style seul. Les alcènes ont 8 carbones au plus. Une réaction globale s'écrit en entier : l'alcène, ses conditions au-dessus et au-dessous d'une flèche assez longue pour elles, ses produits de gauche à droite.

**Correction** (`src/mechanism/check.js`, pur) : tout le dessin de l'étudiant, donné et ajouté, se compare au mécanisme attendu, état par état (découpés par les flèches de réaction), sur les graphes comme en nomenclature.
- Une flèche courbe se lit par les électrons qu'elle déplace (n'importe quel doublet d'un atome, ou une liaison) et par où ils vont. Une flèche vers un atome vaut la flèche vers la liaison qu'elle forme avec l'atome de départ (π vers le H, ou vers la liaison C–H en formation).
- Une molécule symétrique s'apparie de toutes les façons possibles (but-2-ène) ; on garde celle qui laisse le moins à dire.
- Un mécanisme peut s'écrire sur plusieurs lignes, une équation par ligne (figure 7.12). Des flèches de réaction à moins de deux liaisons et demie de hauteur l'une de l'autre sont sur la même ligne, et un atome appartient à la ligne la plus proche. Les avertissements de charge pèsent aussi chaque flèche sur sa ligne.
- Un électron célibataire fait partie de l'espèce : un radical sans son point, ou avec le point sur un autre atome, a son retour. Une demi-flèche se lit comme une flèche, et la correction dit quand il en faut une (un électron) ou une flèche complète (deux).
- Le premier écart est montré, avec son étape, et entouré sur le dessin.

**Interface** : deux menus dans le panneau, Réaction et Style (la nomenclature garde son menu Niveau). Le menu Style ne montre que les styles de la réaction ; un style qu'elle n'a pas revient à Progressif. En Réactifs, les quatre conditions sont des boutons : celui touché se marque juste ou faux, et le retour s'affiche dessous ; outils de la nomenclature plus Doublet, Charge et Flèche courbe ; Recommencer remet ce qui est donné ; la vue encadre tout le mécanisme attendu, la place à dessiner comprise, et deux liaisons de plus du côté où l'on dessine ; ce que dit le retour est entouré sur le dessin ; lien `#mecanisme-<réaction>-<style>-<graine>` (`#mecanisme-hydration-arrows-4821`).

**Retours** :
- espèce manquante, dite « parmi les produits » au dernier état, ou de trop ;
- + sur le mauvais carbone (Markovnikov) ;
- charge oubliée ;
- isomère du produit, dit selon la règle de la réaction (Markovnikov, anti-Markovnikov pour l'hydroboration, deux OH sur les deux carbones…) ;
- produit d'une autre réaction de la table sur le même alcène, nommée (« C'est le produit de l'hydratation acide, pas celui de l'hydroboration-oxydation ») ;
- autre espèce, nommée par le nommeur ; ce qu'il laisse de côté se dit par ce que c'est (CO₂, un acide carboxylique, un oxirane) ;
- flèche manquante ou mal dirigée, dite selon son rôle ;
- flèche à l'envers ;
- H sur le mauvais carbone de la double liaison ;
- demi-flèche ;
- flèche de trop ;
- en Substrat : pas d'alcène, un alcène qui donnerait deux produits, ou ce que donnerait l'alcène dessiné ;
- en Réactifs : ce que donneraient les conditions choisies.

**Conventions du manuel** (figure 7.6 et addition de HBr sur l'éthène) : la flèche π va vers le H (vers la liaison C–H en formation compte aussi) ; X⁻ porte ses quatre doublets et sa flèche part de l'un d'eux ; δ+ sous le H et δ− sous X, dessinés mais non exigés ; X⁻ reste dessiné à côté du carbocation (oublié, c'est faux) ; « Étape lente » et « Étape rapide » au-dessus des flèches de réaction, dessinées mais non vérifiées ; la solution nomme le nucléophile et l'électrophile de chaque étape.

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
| 9 | Mode présentation, import SMILES/MOL, interface en anglais (un chantier à la fois) | — | plus tard |
| 10 | Montages de laboratoire : mode Montage, 37 pièces en cinq familles (synthèse, distillation, séparation avec le pistolet à air chaud de la filtration à chaud, verrerie, chauffage et support avec le bec Bunsen, son trépied et l'anneau de fer), rodages aimantés, modèles reflux, distillation simple et Dean-Stark | Tests d'emboîtement ; reflux monté au doigt, déplacé d'un bloc, détaché, tourné | faite |
| 11 | Interface revue : barre du haut, outils en groupes, panneau de l'outil et de la sélection, zoom et barre du bas sur une ligne, petites fenêtres de Doublet, Charge, δ, Flèche courbe et Flèche de réaction | `edges.mjs` sur six tailles d'écran ; scénarios au doigt, sans Maj ; reflux monté en suivant les étapes du panneau | faite |
| 12 | Exercices de nomenclature (voir la section) : mode Exercice, d'abord alcanes, cycloalcanes et halogénés de bout en bout (graphe, nommeur, générateur, interface), puis une famille du manuel par PR, jusqu'aux cétones, et le Mélange | Par famille : molécules et noms en SMILES dans les tests, une erreur typique reconnue par règle ; une série faite dans l'app dans les deux sens | faite |
| 13 | Exercices de mécanisme (voir la section), preuve de concept sur l'addition de HX aux alcènes : correction, puis générateur et quatre styles de numéros, puis menu Exercice et interface | Chaque erreur typique donne son retour ; chaque mécanisme généré passe sa propre correction ; un numéro de chaque style fait dans l'app | faite |
| 14 | Hydratation acide dans les exercices de mécanisme : une correction qui ne dépend plus de HX, le générateur à deux réactions, deux menus (Réaction, Style) | Le mécanisme de la figure 7.14 juste, et chaque oubli typique (flèche de la base, + de l'oxonium, alcool anti-Markovnikov) avec son retour ; un numéro Flèches et un numéro Produit faits dans l’app | faite |
| 15 | Réactions des alcènes sans mécanisme (hydroboration, hydrogénation, oxydations douce et forte, ozonolyse, époxydation) : table du résultat net, styles Produit, Réactifs et Substrat | Chaque produit construit d'après sa figure ; un mauvais produit, un mauvais alcène et de mauvaises conditions avec leur retour, dans l'app ; `edges.mjs` vérifie la place de chaque style | faite |
| 16 | Addition de X₂ par l'ion ponté : la correction connaît le pont (se fermant sur l'un ou l'autre carbone), son ouverture sur le carbone le plus substitué, et dit chaque flèche par la liaison qu'elle rompt | Les figures 7.23 et 7.24 construites à la main ; chaque mécanisme généré passe sa propre correction ; un numéro Flèches fait dans l'app, avec le pont fermé sur l'autre carbone et Cl⁻ sur le mauvais | faite |
