// @ts-check
/**
 * Textes de l’interface, en français.
 * Pour ajouter une langue : copier ce fichier (en.js), traduire les valeurs, changer l’import dans editor.js.
 */
/** @param {number} q */
const signed = (q) => (q > 0 ? `+${q}` : q < 0 ? `−${-q}` : '0');
/** French plural: 0 and 1 take the singular. @param {number} n @param {string} one @param {string} [many] */
const count = (n, one, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

export const fr = {
  appName: 'Doublet libre',
  modeLabel: 'Mode',
  modes: { mechanism: 'Mécanisme', setup: 'Montage', exercise: 'Exercice' },
  canvasLabel: 'Zone de dessin du mécanisme',
  toolsLabel: 'Outils',
  /** @type {{benzene: string, size: (n: number) => string}} */
  ringNames: { benzene: 'Benzène', size: (n) => `Cycle à ${n}` },
  bondNames: { 1: 'Simple', 2: 'Double', 3: 'Triple', wedge: 'Coin plein', hash: 'Coin haché' },
  bondHints: { wedge: 'sort du plan', hash: 'entre dans le plan' },
  /** The two choices of the Doublet, Charge, δ and curved-arrow tools, in their option window. */
  variants: {
    lonePair: { lonePair: 'Doublet', radical: 'Électron seul' },
    charge: { '+1': '+1', '-1': '−1' },
    partial: { 'δ+': 'Positive', 'δ−': 'Négative' },
    curved: { 2: '2 électrons', 1: '1 électron' },
  },
  tools: {
    select: 'Sélection', bond: 'Liaison', chain: 'Chaîne', ring: 'Cycle', atom: 'Atome',
    lonePair: 'Doublet', charge: 'Charge', partial: 'Charge partielle', group: 'Groupe', curved: 'Flèche courbe',
    rxn: 'Flèche de réaction', text: 'Texte', erase: 'Gomme', synthesis: 'Synthèse', distillation: 'Distillation', separation: 'Séparation', glassware: 'Verrerie', heating: 'Chauffage et support',
  },
  toolKeys: {
    select: 'V', bond: 'B', chain: 'Z', ring: 'R', atom: 'A', lonePair: 'L', charge: 'Q', partial: 'D', group: 'G', curved: 'F',
    rxn: 'W', text: 'T', erase: 'E', synthesis: 'S', distillation: 'K', separation: 'P', glassware: 'X', heating: 'H',
  },
  pieceNames: {
    flask: 'Ballon', flask3: 'Ballon tricol', allihn: 'Réfrigérant à boules', addfunnel: 'Ampoule d’addition (isobare)',
    claisen: 'Adaptateur de Claisen', dryingtube: 'Tube de garde (CaCl₂)', deanstark: 'Dean-Stark', stopper: 'Bouchon',
    vigreux: 'Colonne de Vigreux', head: 'Tête de distillation', thermometer: 'Thermomètre', liebig: 'Réfrigérant droit',
    adapter: 'Allonge coudée', vacadapter: 'Allonge à vide', soxhlet: 'Extracteur de Soxhlet', rotavap: 'Évaporateur rotatif',
    sepfunnel: 'Ampoule à décanter', funnel: 'Entonnoir', filterpaper: 'Papier filtre plissé', buchner: 'Büchner', filterflask: 'Fiole à vide',
    heatgun: 'Pistolet à air chaud',
    beaker: 'Bécher', erlenmeyer: 'Erlenmeyer', cylinder: 'Éprouvette graduée', testtube: 'Tube à essai', pipette: 'Pipette jaugée',
    burette: 'Burette', thiele: 'Tube de Thiele',
    mantle: 'Chauffe-ballon', stirrer: 'Plaque chauffante agitatrice', burner: 'Bec Bunsen', tripod: 'Trépied et toile métallique', bath: 'Cristallisoir (bain)', stand: 'Support', clamp: 'Pince', ring: 'Anneau de fer',
  },
  actions: {
    setups: 'Montages',
    undo: 'Annuler', redo: 'Rétablir', fit: 'Recentrer', templates: 'Modèles', clear: 'Nouveau',
    file: 'Fichier', open: 'Ouvrir…', save: 'Enregistrer', export: 'Exporter', png: 'Image PNG', svg: 'Image SVG', copy: 'Copier l’image',
  },
  zoom: { label: 'Zoom', in: 'Zoom avant', out: 'Zoom arrière' },
  files: {
    kept: 'Dessin gardé dans ce navigateur',
    saved: 'Enregistré : mecanisme.doublet.json, dans vos téléchargements.',
    copied: 'Image copiée : collez-la dans Word ou Google Docs.',
    copyFailed: 'Le navigateur a refusé la copie. Utilisez plutôt Fichier → Image PNG.',
    badFile: 'Ce fichier n’est pas un dessin de Doublet libre (.doublet.json, ou SVG exporté par l’app).',
    /** @param {string} name */
    opened: (name) => `Ouvert : ${name}`,
  },
  /** How to use each tool, shown in the panel when nothing is selected: two or three steps. */
  steps: {
    select: [
      'Glissez une molécule pour la déplacer (Alt : l’atome seul), ou le fond pour sélectionner ce qu’il entoure.',
      'Cliquez sur un objet pour le régler dans ce panneau ; Maj + clic l’ajoute à la sélection.',
      'Espace + glisser déplace la vue ; la molette zoome.',
    ],
    selectTouch: [
      'Glissez une molécule pour la déplacer, ou le fond pour sélectionner ce qu’il entoure.',
      'Touchez un objet pour le régler dans ce panneau.',
      'Deux doigts : pincer pour zoomer, glisser pour déplacer la vue.',
    ],
    selectSetup: [
      'Glissez une pièce pour déplacer tout son montage, ou le fond pour sélectionner ce qu’il entoure.',
      'Touchez une pièce pour la tourner ou la détacher dans ce panneau.',
    ],
    bond: [
      'Choisissez le type dans la petite fenêtre à côté de l’outil.',
      'Cliquez sur le fond ou sur un atome : la liaison part de là. Sur une liaison déjà dessinée, elle prend ce type (en simple : son ordre change).',
      'Un coin part étroit de l’atome de départ ; recliquez-le pour le retourner.',
    ],
    chain: [
      'Glissez depuis un atome ou depuis le fond.',
      'La chaîne suit en zigzag : un atome tous les 35 points environ.',
    ],
    ring: [
      'Choisissez la taille dans la petite fenêtre à côté de l’outil, ou tapez 3 à 8.',
      'Cliquez sur le fond pour un cycle seul, sur une liaison pour un cycle accolé, sur un atome pour l’y accrocher.',
    ],
    atom: [
      'Choisissez l’élément dans la petite fenêtre à côté de l’outil.',
      'Cliquez sur le fond pour poser un atome seul, sur un atome pour changer son élément.',
      'Les H implicites s’ajoutent seuls.',
    ],
    group: [
      'Choisissez le groupe dans la petite fenêtre à côté de l’outil.',
      'Cliquez sur un atome : le groupe s’y accroche, dessiné en entier, dans la direction libre.',
    ],
    lonePair: [
      'Choisissez Doublet ou Électron seul dans la petite fenêtre à côté de l’outil.',
      'Cliquez sur un atome ; Maj + clic donne l’autre choix.',
      'Ils se placent dans l’espace libre ; glissez-les pour les faire tourner autour de l’atome.',
    ],
    charge: [
      'Choisissez +1 ou −1 dans la petite fenêtre à côté de l’outil.',
      'Cliquez sur un atome ; Maj + clic donne l’autre signe. Les H implicites s’ajustent.',
    ],
    partial: [
      'Choisissez δ+ ou δ− dans la petite fenêtre à côté de l’outil.',
      'Cliquez sur un atome pour le poser, recliquez pour l’enlever ; Maj + clic donne l’autre signe.',
      'Glissez le δ pour le faire tourner autour de l’atome.',
    ],
    curved: [
      'Choisissez 2 électrons ou 1 électron (demi-flèche) dans la petite fenêtre à côté de l’outil.',
      'Glissez d’un doublet (ou de son atome) ou d’une liaison vers un atome, une liaison, ou le milieu de deux atomes pour une liaison qui se forme. Maj : l’autre choix.',
      'Sélectionnée, la flèche se courbe avec ses poignées carrées.',
    ],
    rxn: [
      'Choisissez le type dans la petite fenêtre à côté de l’outil : réaction, équilibre, résonance…',
      'Glissez sur le fond pour tracer la flèche ; un clic donne une flèche de longueur standard.',
      'Écrivez ensuite ses conditions dans ce panneau, où le type se change aussi.',
    ],
    text: [
      'Cliquez sur le fond pour poser un « + ».',
      'Changez le texte et sa taille dans ce panneau.',
    ],
    erase: [
      'Cliquez sur un objet pour l’effacer.',
      'Annuler (Ctrl+Z) le remet.',
    ],
    synthesis: [
      'Choisissez la pièce dans la petite fenêtre à côté de l’outil.',
      'Touchez le fond pour la poser.',
      'Touchez le rodage libre d’une pièce pour l’y emboîter.',
    ],
    distillation: [
      'Choisissez la pièce dans la petite fenêtre à côté de l’outil.',
      'Touchez le fond pour la poser.',
      'Touchez le rodage libre d’une pièce pour l’y emboîter : elle en prend l’angle.',
    ],
    separation: [
      'Choisissez la pièce dans la petite fenêtre à côté de l’outil.',
      'Touchez le fond pour la poser.',
      'Touchez le goulot d’une fiole pour y mettre une tige, un entonnoir pour y mettre le papier ; le pistolet à air chaud se pose librement.',
    ],
    glassware: [
      'Choisissez la pièce dans la petite fenêtre à côté de l’outil.',
      'Touchez le fond pour la poser.',
      'Touchez le dessus d’une plaque ou d’un trépied pour l’y mettre, le goulot d’un récipient pour y plonger une pipette ou une burette.',
    ],
    heating: [
      'Choisissez la pièce dans la petite fenêtre à côté de l’outil.',
      'Touchez le fond pour la poser, ou sous un ballon ou un cristallisoir pour l’y placer.',
      'Bec Bunsen, support, pince et anneau se placent librement.',
    ],
  },
  status: {
    hover: {
      atom: 'Atome : tapez son symbole (B pour Br, L pour Cl), + ou − pour la charge, Suppr pour l’effacer.',
      bond: 'Liaison : 1, 2 ou 3 pour l’ordre, W pour un coin plein, H pour un coin haché, Suppr pour l’effacer.',
      mark: 'Glissez pour faire tourner autour de l’atome ; Suppr pour effacer.',
      charge: 'Glissez la charge pour la faire tourner autour de l’atome.',
      curved: 'Flèche courbe : cliquez pour la sélectionner, puis courbez-la avec ses poignées carrées.',
      handle: 'Glissez la poignée pour changer la courbure.',
      rxn: 'Flèche de réaction : cliquez pour régler son type et ses conditions, glissez pour la déplacer.',
      text: 'Texte : glissez pour le déplacer.',
      piece: 'Pièce : glissez pour déplacer tout le montage ; près d’une pièce compatible, elle s’y emboîte.',
      loosePiece: 'Pièce libre : glissez pour la placer ; elle ne s’emboîte à aucune pièce.',
    },
  },
  panel: {
    toolTitle: 'Outil',
    howTo: 'Comment faire',
    checkTitle: 'Vérification',
    setupTip: 'Un montage tout fait ? Reflux, distillation simple et Dean-Stark sont dans Modèles.',
    /** @param {{atoms: unknown[], bonds: unknown[], curvedArrows: unknown[]}} d */
    counts: (d) => [count(d.atoms.length, 'atome'), count(d.bonds.length, 'liaison'), count(d.curvedArrows.length, 'flèche courbe', 'flèches courbes')].join(' · '),
    /** @param {{apparatus: unknown[], texts: unknown[]}} d */
    setupCounts: (d) => `${count(d.apparatus.length, 'pièce')} · ${count(d.texts.length, 'texte')}`,
    newsTitle: 'Nouveautés',
    phaseItems: [
      'Molécules selon les règles de base de l’IUPAC : liaisons, chaînes, cycles, atomes, groupes.',
      'Modèles : SN2, SN1, E2, E1, addition électrophile, addition nucléophile sur un carbonyle.',
      'Doublets, charges, δ, flèches courbes accrochées aux électrons, flèches de réaction.',
      'Avertissements : octet dépassé, flèche inversée, charge non conservée, résonance mal employée.',
      'Fichier : enregistrer, ouvrir, exporter en PNG ou en SVG, copier l’image.',
      'Mode Montage : 37 pièces de verrerie qui s’emboîtent aux rodages, pour dessiner reflux, distillation, filtration, extraction et titrage.',
      'Mode Exercice : des séries de dix alcanes, cycloalcanes ou halogénés à nommer ou à dessiner, corrigées règle par règle selon le manuel, avec la solution numérotée.',
      'Interface revue : ce panneau explique chaque outil ; boutons de zoom ; Copier l’image en haut à droite. Doublet, Charge, δ, Flèche courbe et Flèche de réaction ont leur petite fenêtre. L’outil δ pose le signe choisi, et un second clic l’enlève.',
    ],
    shortcutsTitle: 'Raccourcis clavier',
    shortcuts: [
      'Ctrl+Z, Ctrl+Y : annuler, rétablir',
      'Ctrl+S, Ctrl+O : enregistrer, ouvrir',
      'Ctrl+C, Ctrl+V : copier, coller la sélection (sans sélection, Ctrl+C copie l’image)',
      'Suppr : effacer ce qui est survolé ou sélectionné ; Échap : désélectionner',
      'Espace + glisser : déplacer la vue ; molette : zoomer',
      'Lettre affichée sur un outil : le choisir',
    ],
    nextTitle: 'Ensuite',
    nextItems: [
      'Mode exercice préparé par le prof, mode présentation, tablette, interface en anglais.',
    ],
    titles: {
      atom: 'Atome', bond: 'Liaison', mark: 'Annotation', charge: 'Charge formelle',
      curved: 'Flèche courbe', handle: 'Flèche courbe', rxn: 'Flèche de réaction', text: 'Texte',
    },
    selectionTitle: 'Sélection',
    escHint: 'Échap pour désélectionner',
    activeTool: 'Outil actif :',
    seeHelp: 'voir l’aide',
    element: 'Élément',
    charge: 'Charge formelle',
    chargeMinus: 'Charge −1',
    chargePlus: 'Charge +1',
    lonePairs: 'Doublets libres',
    hydrogens: 'H implicites',
    bondKind: 'Type de liaison',
    keysAtom: 'Au clavier : tapez son symbole (B pour Br, L pour Cl), + ou − pour la charge.',
    keysBond: 'Recliquez le coin choisi pour le retourner. Au clavier : 1, 2, 3, W ou H.',
    addLonePair: 'Ajouter un doublet',
    removeLonePair: 'Retirer un doublet',
    electrons: 'Électrons',
    electronsTwo: 'Pleine',
    electronsOne: 'Demi-flèche',
    bendHint: 'Glissez ses poignées carrées pour la courber.',
    sign: 'Signe',
    source: 'Source',
    target: 'Cible',
    resetBend: 'Courbure par défaut',
    kind: 'Type',
    above: 'Au-dessus (réactifs, catalyseur)',
    below: 'En dessous (solvant, température, durée)',
    formatHint: 'H2O devient H₂O ; ^+ met en exposant ; Entrée ajoute une ligne, pour les étapes « 1. … 2. … ».',
    insert: 'Insérer',
    textLabel: 'Texte',
    textSize: 'Taille',
    smaller: 'Plus petit',
    bigger: 'Plus grand',
    textHint: 'Glissez le texte pour le déplacer. Les chiffres qui suivent un symbole passent en indice : H2O devient H₂O.',
    rotate: 'Orientation',
    turnLeft: 'Tourner de −15°',
    turnRight: 'Tourner de +15°',
    detach: 'Détacher du montage',
    pieceHint: 'Glissez-la pour déplacer tout le montage ; près d’une pièce compatible, elle s’y emboîte.',
    looseHint: 'Glissez-la pour la placer : elle ne s’emboîte à aucune pièce.',
    remove: 'Supprimer',
    copy: 'Copier',
    paste: 'Coller',
    markNames: { lonePair: 'Doublet libre', radical: 'Électron célibataire', partial: 'Charge partielle' },
    rotateHint: 'Glissez-la dans le dessin pour la faire tourner autour de son atome.',
    /** @param {number} n */
    group: (n) => `${n} éléments sélectionnés`,
    groupHint: 'Glissez l’un d’eux pour les déplacer ensemble. Suppr pour les effacer, Ctrl+C puis Ctrl+V pour les copier.',
  },
  groupNames: { Ph: 'Ph', OMe: 'OMe', OEt: 'OEt', CO2H: 'CO₂H', CHO: 'CHO', CN: 'CN', NO2: 'NO₂', OAc: 'OAc', Boc: 'Boc' },
  setupNames: { reflux: 'Montage à reflux', distillation: 'Distillation simple', deanStark: 'Dean-Stark' },
  setupLabels: { waterIn: 'entrée d’eau', waterOut: 'sortie d’eau' },
  templateNames: {
    sn2: 'SN2 : bromoéthane + HO⁻',
    sn1: 'SN1 : bromure de tert-butyle + H₂O',
    e2: 'E2 : bromoéthane + HO⁻',
    e1: 'E1 : bromure de tert-butyle + H₂O',
    electrophilicAddition: 'Addition électrophile : propène + HBr',
    carbonylAddition: 'Addition nucléophile sur la propanone',
  },
  warnings: {
    /** @param {number} n */
    title: (n) => (n === 1 ? '1 avertissement' : `${n} avertissements`),
    none: 'Aucun problème repéré : octets, sens des flèches et charges sont cohérents.',
    /** @param {{element: string, electrons: number}} p */
    octet: (p) => `${p.element} porte ${p.electrons} électrons : c’est plus que l’octet (8 au plus, sauf pour S, P et I).`,
    arrowDirection: () => 'Flèche probablement inversée : elle part d’un atome chargé + ou arrive sur un atome chargé −. Les électrons vont du site riche vers le site pauvre.',
    mixedCharges: () => 'Charges formelles et charges partielles sur la même molécule : n’en montrez qu’une sorte (IUPAC GR-5.6).',
    /** @param {{left: number, right: number}} p */
    charge: (p) => `Charge totale ${signed(p.left)} avant la flèche et ${signed(p.right)} après : elle doit se conserver.`,
    resonance: () => '↔ relie des formes de résonance, qui gardent les mêmes atomes et les mêmes liaisons σ. Pour une réaction, utilisez → ou ⇌.',
  },
  kinds: {
    forward: 'Réaction', equilibrium: 'Équilibre', resonance: 'Résonance', retro: 'Rétrosynthèse', noReaction: 'Pas de réaction',
  },
  anchor: {
    /** @param {string} el */ lonePair: (el) => `doublet de ${el}`,
    /** @param {string} el */ radical: (el) => `électron de ${el}`,
    /** @param {string} x @param {string} y */ bond: (x, y) => `liaison ${x}–${y}`,
    /** @param {string} el */ atom: (el) => `atome ${el}`,
    /** @param {string} x @param {string} y */ between: (x, y) => `nouvelle liaison ${x}–${y}`,
    unknown: 'introuvable',
  },
  // Vocabulary of the names the exercises check (textbook, ch. 2, section 2.5).
  naming: {
    // Chain stems by number of carbons, from one (tableau 2.3).
    stems: ['méth', 'éth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'déc', 'undéc', 'dodéc', 'tridéc', 'tétradéc', 'pentadéc', 'hexadéc'],
    // Multiplying prefixes by count (tableau 2.5).
    multipliers: ['', '', 'di', 'tri', 'tétra', 'penta', 'hexa', 'hepta', 'octa', 'nona', 'déca'],
    halo: { F: 'fluoro', Cl: 'chloro', Br: 'bromo', I: 'iodo' },
    isopropyl: 'isopropyl', isobutyl: 'isobutyl', secButyl: 'sec-butyl', tertButyl: 'tert-butyl',
    // Written in italics and left out of the alphabetical order (2.5.1, règle 3d).
    italic: ['sec-', 'tert-'],
    cyclo: 'cyclo', ane: 'ane', yl: 'yl', ene: 'ène', yne: 'yne',
    // -ène before a single -yne: hex-1-én-5-yne (2.5.5).
    en: 'én',
    // Benzene rings (2.5.6, tableaux 2.6 and 2.7): the parents, the prefixes, o-, m-, p- by the second locant.
    benzene: 'benzène', toluene: 'toluène', nitro: 'nitro', phenyl: 'phényl', benzyl: 'benzyl',
    omp: { 2: ['o', 'ortho'], 3: ['m', 'méta'], 4: ['p', 'para'] },
    // A group alone on a benzene ring that gives it a familiar name, at locant 1 (tableau 2.7).
    retained: [
      { prefix: 'méthyl', word: 'toluène', group: 'Le méthyle' },
      { prefix: 'méthoxy', word: 'anisole', group: 'Le groupe méthoxy' },
      { prefix: '', word: 'phénol', group: 'Le groupe OH' },
    ],
    phenol: 'phénol',
    // Alcohols (2.5.8): the suffix, and the familiar names the textbook does not accept (alcool isopropylique).
    ol: 'ol', alcohol: 'alcool', ique: 'ique',
    // Ethers (2.5.7, tableau 2.8): alkoxy up to butoxy, then alkyloxy; « oxyde de … et de … » for a simple ether.
    oxy: 'oxy', oxide: 'oxyde', of: 'de ', ofElided: 'd’', and: 'et',
    // Before a multiplied -ène: buta-1,3-diène (2.5.4).
    euphonic: 'a',
    // What a wrong name breaks, by rule (namer.wrongNames), with the textbook section.
    rules: {
      chain: 'La chaîne principale est la plus longue chaîne de carbones (2.5.1).',
      branches: 'Entre deux chaînes aussi longues, la chaîne principale est celle qui porte le plus de ramifications (2.5.1).',
      ringChain: 'Un cycle est la chaîne principale s’il compte plus de carbones que la plus longue chaîne ; sinon, il devient un substituant cycloalkyle (2.5.2).',
      numbering: 'On numérote dans le sens qui donne les plus petits indices à l’ensemble des substituants (2.5.1).',
      sum: 'Les indices se comparent au premier chiffre qui diffère, jamais en les additionnant (2.5.1).',
      alphabeticalNumbering: 'À indices égaux, le plus petit va au substituant cité en premier selon l’ordre alphabétique (2.5.1).',
      alphabetical: 'Les substituants se citent par ordre alphabétique, sans compter di-, tri-, sec- ni tert- ; iso- compte (2.5.1).',
      multiplier: 'Des substituants identiques se regroupent : leurs indices, puis di-, tri-, tétra- devant leur nom (2.5.1).',
      locant: 'Un seul substituant sur un cycle ou sur l’éthane ne prend pas d’indice (2.5.2).',
      unsaturationFirst: 'La numérotation donne d’abord les plus petits indices aux liaisons doubles, avant les substituants (2.5.4).',
      bothLocants: 'On écrit seulement l’indice du premier carbone d’une liaison double ou triple : pent-2-ène, hex-1-yne (2.5.4).',
      euphony: 'Devant diène, diyne, triène…, le nom de la chaîne prend un a : buta-1,3-diène, octa-3,5-diyne (2.5.4).',
      eneFirst: 'À égalité d’indices, le plus petit va à la liaison double, citée avant la triple : hex-1-én-5-yne (2.5.5).',
      enElision: 'Devant un seul -yne, -ène perd son e final et son accent devient aigu : hept-1-én-5-yne (2.5.5).',
      alkoxy: 'Jusqu’à 4 carbones, on écrit alkoxy (méthoxy à butoxy) ; à partir de 5, alkyloxy (pentyloxy) (2.5.7).',
      principalFirst: 'La fonction prioritaire, ici l’alcool, prend le plus petit indice, avant les liaisons multiples (2.5.8).',
      olStem: 'Devant -ol, la chaîne garde son « an » : heptan-3-ol, pas hept-3-ol (2.5.8).',
      olElision: 'Devant -ol, -ène et -yne perdent leur e : hex-4-én-2-ol, pent-4-yn-2-ol (2.5.8).',
      diolStem: 'Devant -diol, la chaîne garde son e : heptane-2,5-diol (2.5.8).',
      familiar: 'Nom familier : selon les règles de l’UICPA, on donne le nom systématique (2.5.8).',
      ringDoubleBond: 'Dans un cycle, les deux carbones de la liaison double portent des numéros qui se suivent : 1 et 2 (2.5.4).',
    },
    // How a right name is written, when it counts with a remark (naming/check.js).
    remarks: {
      accents: 'Attention aux accents.',
      commas: 'Les chiffres se séparent par des virgules (2.5.1).',
      hyphens: 'Un trait d’union sépare les chiffres des lettres (2.5.1).',
      punctuation: 'Vérifiez les virgules et les traits d’union (2.5.1).',
      retained: 'Juste selon l’IUPAC, mais le manuel attend le nom familier (2.5.6).',
    },
  },
  // The Exercice mode: a series of molecules to name or to draw (naming/exercise.js).
  exercise: {
    title: 'Exercice de nomenclature',
    /** @param {number} n */ seriesOf: (n) => `Série de ${n} molécules`,
    level: 'Niveau',
    levels: { alkanes: 'Alcanes (2.5.1)', cycloalkanes: 'Cycloalcanes (2.5.2)', halogens: 'Halogénés (2.5.3)', alkenes: 'Alcènes (2.5.4)', alkynes: 'Alcynes (2.5.5)', aromatics: 'Benzéniques (2.5.6)', ethers: 'Éthers (2.5.7)', alcohols: 'Alcools (2.5.8)' },
    /** @param {number} k @param {number} n */ question: (k, n) => `Question ${k} sur ${n}`,
    nameIt: 'Nommez cette molécule selon les règles de l’UICPA.',
    drawIt: 'Dessinez :',
    drawHelp: 'Dessinez la molécule avec les outils à gauche, puis vérifiez.',
    answer: 'Votre réponse',
    placeholder: 'ex. 2-méthylpentane',
    check: 'Vérifier',
    clear: 'Effacer le dessin',
    solution: 'Solution',
    next: 'Suivant',
    score: 'Voir le score',
    firstCheck: 'Suivant s’active après une vérification ou la solution. Seule la première vérification compte dans le score.',
    right: 'Bonne réponse',
    remark: 'Compté bon, avec une remarque',
    wrongRule: 'Une règle est brisée',
    wrong: 'Ce n’est pas le nom attendu',
    tryAgain: 'Vérifiez dans l’ordre : la chaîne principale, la numérotation, puis l’ordre alphabétique des substituants.',
    /** @param {string} name */ write: (name) => `On écrit : ${name}.`,
    emptyName: 'Tapez un nom avant de vérifier.',
    emptyDraw: 'Dessinez d’abord la molécule.',
    /** @param {string} name */ drawnRight: (name) => `C’est bien le ${name}.`,
    drawnWrong: 'Ce n’est pas la molécule demandée',
    /** @param {string} name */ yourDrawing: (name) => `Votre dessin : ${name}.`,
    /** @param {number} a @param {number} b */ carbons: (a, b) => `Votre dessin compte ${a} carbone${a > 1 ? 's' : ''} ; il en faut ${b}.`,
    others: 'Vérifiez les atomes autres que le carbone : l’outil Atome change l’élément d’un atome.',
    place: 'Les atomes sont les bons, mais pas à leur place : vérifiez la numérotation de la chaîne principale.',
    doubles: 'Vérifiez les liaisons doubles et triples : leur nombre et leur place.',
    steps: {
      /** @param {boolean} ring @param {number} n @param {string} name @param {'principal' | 'multiples' | 'longest'} why */
      parent: (ring, n, name, why) => (ring ? `Chaîne principale : le cycle de ${n} carbones, ${name}.`
        : `Chaîne principale : ${{ principal: 'celle qui porte l’OH', multiples: 'celle qui porte les liaisons multiples', longest: 'la plus longue' }[why]}, ${n} carbone${n > 1 ? 's' : ''}, ${name}.`),
      /** @param {number[]} at */ alcohol: (at) => `Fonction prioritaire : alcool, suffixe -ol en ${at.join(' et ')}.`,
      /** @param {string} group @param {string} word */
      retained: (group, word) => `${group} donne au benzène son nom familier, ${word} : il prend l’indice 1.`,
      /** @param {string} list */ prefixes: (list) => `Substituants et indices : ${list}.`,
      none: 'Aucun substituant.',
      /** @param {string} name @param {number[]} locants */ at: (name, locants) => `${name} en ${locants.join(' et ')}`,
      /** @param {string} name */ name: (name) => `Nom : ${name}.`,
    },
    done: 'Série terminée',
    again: 'Recommencer la série',
    newSeries: 'Nouvelle série',
    nameDir: 'nommer',
    drawDir: 'dessiner',
    withRemark: 'avec remarque',
    /** @param {number} k @param {number} n @param {string} level @param {number} seed */
    status: (k, n, level, seed) => `Question ${k} sur ${n} · ${level} · graine ${seed}`,
    /** @param {number} good @param {number} n */ scoreStatus: (good, n) => `Score : ${good} sur ${n}`,
  },
  /** @param {number} q */
  chargeText: (q) => (q === 0 ? '0' : `${Math.abs(q) > 1 ? Math.abs(q) : ''}${q > 0 ? '+' : '−'}`),
};
