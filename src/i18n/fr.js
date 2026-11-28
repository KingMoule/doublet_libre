// @ts-check
/**
 * Textes de l’interface, en français.
 * Pour ajouter une langue : copier ce fichier (en.js), traduire les valeurs, changer l’import dans editor.js.
 */
/** @param {number} q */
const signed = (q) => (q > 0 ? `+${q}` : q < 0 ? `−${-q}` : '0');
/** French plural: 0 and 1 take the singular. @param {number} n @param {string} one @param {string} [many] */
const count = (n, one, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
/** In mechanism messages: an atom with its article, and the group a product carries (Markovnikov). @type {Record<string, string>} */
const ELEMENTS = { Cl: 'le chlore', Br: 'le brome', I: 'l’iode', O: 'l’oxygène' };
/** @type {Record<string, string>} */
const GROUPS = { Cl: 'Le Cl', Br: 'Le Br', I: 'L’I', O: 'Le groupe OH' };

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
      'Menu Exercice, Nomenclature : des séries de dix molécules à nommer ou à dessiner, des alcanes aux cétones, corrigées règle par règle selon le manuel, avec la solution numérotée.',
      'Menu Exercice, Mécanismes : l’addition de HX, l’hydratation acide et l’addition de X₂ (par l’ion ponté) des alcènes à compléter (les flèches, les structures, le mécanisme complet ou le produit majeur), choisies dans les menus Réaction et Style, avec un retour précis sur chaque erreur.',
      'Mécanismes, réactions sans mécanisme : hydroboration, hydrogénation, oxydations douce et forte, ozonolyse, époxydation. Dessinez le produit, choisissez les conditions, ou retrouvez l’alcène de départ ; le retour dit ce que donnerait votre réponse.',
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
      { prefix: '', word: 'benzaldéhyde', group: 'Le groupe CHO' },
      { prefix: '', word: 'acétophénone', group: 'Le groupe COCH₃' },
    ],
    phenol: 'phénol', benzaldehyde: 'benzaldéhyde', acetophenone: 'acétophénone',
    // Ketones (2.5.10): -one, oxo- below an aldehyde; acétone, the familiar name the textbook does not accept.
    one: 'one', oxo: 'oxo', acetone: 'acétone',
    // Aldehydes (2.5.9): -al, -carbaldéhyde on a ring, hydroxy- below them; familiar names by carbons, from one.
    al: 'al', carbaldehyde: 'carbaldéhyde', hydroxy: 'hydroxy',
    familiarAldehydes: ['formaldéhyde', 'acétaldéhyde', 'propionaldéhyde', 'butyraldéhyde', 'valéraldéhyde'],
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
      eneFirst: 'À égalité d’indices, le plus petit va à la liaison double, citée avant la triple : hex-1-én-5-yne (2.5.5).',
      alkoxy: 'Jusqu’à 4 carbones, on écrit alkoxy (méthoxy à butoxy) ; à partir de 5, alkyloxy (pentyloxy) (2.5.7).',
      principalFirst: 'La fonction prioritaire (alcool, aldéhyde, cétone) prend le plus petit indice, avant les liaisons multiples (2.5.8 à 2.5.10).',
      priority: 'Le suffixe va à la fonction prioritaire : aldéhyde, puis cétone, puis alcool ; l’OH devient alors hydroxy- et le C=O oxo- (figure 2.21).',
      olStem: 'Devant -ol ou -one, la chaîne garde son « an » : heptan-3-ol, pentan-2-one (2.5.8, 2.5.10).',
      ringLocant: 'Sur un cycle, une seule fonction -ol ou -one est en 1 : son indice ne s’écrit pas (cyclohexanone) (2.5.8, 2.5.10).',
      familiar: 'Nom familier : selon les règles de l’UICPA, on donne le nom systématique (2.5.8 à 2.5.10).',
      alLocant: 'L’aldéhyde est toujours en bout de chaîne, en 1 : son indice ne s’écrit pas (butanal) (2.5.9).',
      carbaldehyde: 'Le carbone du CHO ne fait pas partie du cycle : on ajoute -carbaldéhyde au nom du cycle (cyclohexanecarbaldéhyde) (2.5.9).',
      ringDoubleBond: 'Dans un cycle, les deux carbones de la liaison double portent des numéros qui se suivent : 1 et 2 (2.5.4).',
    },
    // How a right name is written, when it counts with a remark (naming/check.js).
    remarks: {
      accents: 'Attention aux accents.',
      commas: 'Les chiffres se séparent par des virgules (2.5.1).',
      hyphens: 'Un trait d’union sépare les chiffres des lettres (2.5.1).',
      punctuation: 'Vérifiez les virgules et les traits d’union (2.5.1).',
      elision: 'Attention aux voyelles de liaison : hex-4-én-2-ol, heptane-2,5-diol, buta-1,3-diène (2.5.4, 2.5.8).',
      retained: 'Juste selon l’IUPAC, mais le manuel attend le nom familier (2.5.6).',
    },
  },
  // Mechanism exercises (mechanism/check.js): what is wrong, by finding. A missing or misplaced arrow is told by
  // what it does: pi (π to the H of an acid), leaving (H–Y to Y), attack (a nucleophile to C⁺), base (water takes an
  // H of an oxonium); source and target name the species (Br⁻, H₂O; HBr, H₃O⁺), el the atom receiving the electrons.
  mechanism: {
    title: 'Exercice de mécanisme',
    /** @param {number} n */ seriesOf: (n) => `Série de ${n} mécanismes`,
    // The two menus of the panel: the reaction, then the style.
    reactionMenu: 'Réaction', styleMenu: 'Style',
    reactions: {
      hx: 'Addition de HX', hydration: 'Hydratation acide', halogenation: 'Addition de X₂', hydroboration: 'Hydroboration-oxydation', hydrogenation: 'Hydrogénation catalytique',
      dihydroxylation: 'Oxydation douce (KMnO₄ dilué)', epoxidation: 'Époxydation', ozonolysis: 'Ozonolyse réductrice', cleavage: 'Oxydation forte (coupure)',
    },
    // Of a reaction, as a sentence names it: « le produit de l’hydratation acide ».
    of: {
      hx: 'de l’addition de HX', hydration: 'de l’hydratation acide', halogenation: 'de l’addition de X₂', hydroboration: 'de l’hydroboration-oxydation', hydrogenation: 'de l’hydrogénation',
      dihydroxylation: 'de l’oxydation douce', epoxidation: 'de l’époxydation', ozonolysis: 'de l’ozonolyse réductrice', cleavage: 'de l’oxydation forte',
    },
    // Over and under the arrow of a global reaction, as the textbook writes them (figures 7.15, 7.19, 7.26, 7.28,
    // 7.30, 7.31); a reaction with two ways to run it has both, the series takes turns.
    conditions: {
      // HX and the acid hydration, as a choice of the Réactifs style; X₂ in its inert solvent (figure 7.25).
      hx: [['HBr', '']], hydration: [['H₂O', 'H₂SO₄']], halogenation: [['Br₂', 'CH₂Cl₂']],
      hydroboration: [['1) BH₃', '2) H₂O₂, OH⁻']], hydrogenation: [['H₂', 'Pt']], dihydroxylation: [['KMnO₄', 'H₂O, OH⁻']], epoxidation: [['MCPBA', '']],
      ozonolysis: [['1) O₃', '2) Zn, H₃O⁺']], cleavage: [['KMnO₄ conc.', 'H₃O⁺'], ['1) O₃', '2) H₂O₂, H₃O⁺']],
    },
    // A product the namer leaves out (SPEC, Exercices de nomenclature, Hors programme), said by what it is.
    kinds: { acid: 'un acide carboxylique', oxirane: 'un oxirane', bridged: 'l’ion ponté' },
    levels: { progressive: 'Progressif', arrows: 'Flèches à compléter', structures: 'Structures à compléter', complete: 'Mécanisme complet', product: 'Produit majeur', reagents: 'Réactifs à choisir', substrate: 'Substrat de départ' },
    /** @param {string} alkene @param {string} reagent */ reaction: (alkene, reagent) => `${alkene} + ${reagent}`,
    prompts: {
      arrows: 'Dessinez les flèches courbes de chaque étape, du doublet ou de la liaison vers l’atome qui reçoit les électrons.',
      structures: 'Dessinez ce qui se forme entre les flèches de réaction : chaque intermédiaire, puis le produit.',
      complete: 'Dessinez le mécanisme : les flèches courbes de chaque étape, chaque intermédiaire, puis le produit.',
      product: 'Dessinez le ou les produits majeurs après la flèche de réaction.',
      reagents: 'Choisissez les conditions qui transforment cet alcène en ce produit.',
      substrate: 'Dessinez l’alcène de départ avant la flèche de réaction.',
    },
    help: 'Une flèche courbe part d’un doublet ou d’une liaison : l’outil Doublet en ajoute un sur un ion ou sur l’eau. Un H visé par une flèche se dessine (outil Atome).',
    // The Produit and Substrat styles, where nothing moves electrons.
    helpDraw: 'Dessinez avec les outils Chaîne, Cycle, Liaison et Atome ; deux produits se dessinent côte à côte, un + entre eux n’est pas nécessaire.',
    // The Réactifs style: four conditions to touch.
    helpPick: 'Touchez les conditions de votre choix : le retour dit ce qu’elles donneraient.',
    // Over the reaction arrows, as in the textbook: figure 7.6 for HX, figure 7.13 for the global hydration.
    slow: 'Étape lente', fast: 'Étape rapide', acid: 'H₂SO₄',
    // The reagent of an acid hydration, as the title writes it.
    water: 'H₂O (H₂SO₄)',
    restart: 'Recommencer',
    wrong: 'Pas tout à fait',
    /** @param {number} k */ step: (k) => `Étape ${k}`,
    /** @param {number} k the state @param {number} last the product's */ state: (k, last) => (k === 0 ? 'Réactifs' : k === last ? 'Produit' : `Après l’étape ${k}`),
    solution: {
      cations: { primary: 'primaire', secondary: 'secondaire', tertiary: 'tertiaire' },
      hx: {
        /** @param {string} x @param {string} cation */
        first: (x, cation) => `Étape 1, lente : le doublet π de l’alcène (nucléophile) attaque le H de H${x} (électrophile, δ+) ; la liaison H–${x} se rompt et ses électrons partent avec le ${x}. Le H se lie au carbone de la double liaison qui porte le plus de H : il se forme le carbocation ${cation}, le plus substitué possible (Markovnikov).`,
        /** @param {string} x @param {string} product */
        second: (x, product) => `Étape 2, rapide : un doublet de ${x}⁻ (nucléophile) attaque le carbocation (électrophile). Produit : ${product}.`,
        /** @param {string} x @param {string} product */
        product: (x, product) => `Le H se lie au carbone de la double liaison qui porte le plus de H, et le ${x} au carbone le plus substitué (Markovnikov). Produit : ${product}.`,
      },
      // Acid hydration, as the textbook tells it (figure 7.14).
      hydration: {
        /** @param {string} cation */
        first: (cation) => `Étape 1 : dans l’eau, l’acide sulfurique donne l’ion hydronium (H₂SO₄ + H₂O → HSO₄⁻ + H₃O⁺). Le doublet π de l’alcène (nucléophile) attaque un H de H₃O⁺ (électrophile) ; la liaison H–O se rompt vers l’oxygène et libère H₂O. Le H se lie au carbone de la double liaison qui porte le plus de H : il se forme le carbocation ${cation}, le plus substitué possible (Markovnikov).`,
        second: () => 'Étape 2 : un doublet de H₂O (nucléophile) attaque le carbocation (électrophile) : il se forme un ion oxonium, dont l’oxygène à trois liaisons porte une charge +.',
        /** @param {string} product */
        third: (product) => `Étape 3, un équilibre acide-base : une molécule d’eau du solvant (la base) arrache un H de l’ion oxonium, et la liaison O–H se rompt vers l’oxygène. L’acide H₃O⁺ est régénéré. Produit : ${product}.`,
        /** @param {string} product */
        product: (product) => `En milieu acide (H₂SO₄), l’eau s’additionne : le H va sur le carbone de la double liaison qui porte le plus de H, et le groupe OH sur le carbone le plus substitué (Markovnikov). Produit : ${product}.`,
      },
      // X₂, as figures 7.23 and 7.24 tell it.
      halogenation: {
        /** @param {string} x */
        first: (x) => `Étape 1 : à l’approche de l’alcène, la liaison ${x}–${x} se polarise (dipôle induit). Le doublet π (nucléophile) attaque le ${x} le plus proche (δ+, électrophile), et la liaison ${x}–${x} se rompt vers l’autre ${x}, qui part en ${x}⁻. Un doublet du ${x} attaqué se lie à l’autre carbone : il se forme l’ion ${x === 'Br' ? 'bromonium' : 'chloronium'}, un ion ponté où tous les atomes respectent l’octet, plus stable qu’un carbocation.`,
        /** @param {string} x @param {string} product */
        second: (x, product) => `Étape 2 : un doublet de ${x}⁻ (nucléophile) attaque le carbone le plus substitué de l’ion ponté (électrophile), du côté opposé au pont ; la liaison C–${x} du pont se rompt vers le ${x}. Les deux ${x} s’additionnent de part et d’autre de la double liaison (addition anti). Produit : ${product}.`,
        /** @param {string} x @param {string} product */
        product: (x, product) => `Un ${x} se lie à chaque carbone de la double liaison, par un ion ponté, de part et d’autre (addition anti). Produit : ${product}.`,
      },
      // The global reactions, one sentence each, then the products (empty when none can be named).
      /** @param {string} product */
      hydroboration: (product) => `BH₃ s’additionne sur la double liaison, puis H₂O₂ en milieu basique remplace le bore par un groupe OH : le groupe OH va sur le carbone de la double liaison qui porte le plus de H, et le H sur le plus substitué (anti-Markovnikov).${product ? ` Produit : ${product}.` : ''}`,
      /** @param {string} product */
      hydrogenation: (product) => `Le catalyseur (Pt, Pd ou Ni) fixe un H sur chaque carbone de la double liaison : l’alcène devient un alcane.${product ? ` Produit : ${product}.` : ''}`,
      /** @param {string} product */
      dihydroxylation: (product) => `Le permanganate dilué, en milieu basique et à froid, ajoute un groupe OH sur chaque carbone de la double liaison : un diol vicinal (oxydation douce).${product ? ` Produit : ${product}.` : ''}`,
      /** @param {string} product */
      epoxidation: (product) => `Le peracide (MCPBA) donne un de ses oxygènes aux deux carbones de la double liaison, liés à lui en un cycle de trois atomes : ${product || 'un oxirane'} (un époxyde).`,
      /** @param {string} product */
      ozonolysis: (product) => `L’ozone coupe la double liaison, puis le zinc en milieu acide, un réducteur, laisse un C=O sur chacun de ses deux carbones : les aldéhydes restent des aldéhydes (ozonolyse réductrice).${product ? ` Produits : ${product}.` : ''}`,
      /** @param {string} product */
      cleavage: (product) => `La double liaison se coupe et chacun de ses deux carbones reçoit un C=O ; dans ce milieu oxydant, un aldéhyde va jusqu’à l’acide carboxylique, et un CH₂ jusqu’à CO₂ et H₂O (oxydation forte, ou ozonolyse oxydante).${product ? ` Produits : ${product}.` : ''}`,
      // Back from the products to the alkene (Substrat): by what the reaction does.
      back: {
        /** @param {string} alkene */ add: (alkene) => `Pour remonter au substrat, on enlève ce que la réaction a ajouté et on remet la double liaison entre les deux carbones qui le portent. Substrat : ${alkene}.`,
        /** @param {string} alkene */ cut: (alkene) => `Pour remonter au substrat, on enlève les oxygènes des C=O et on relie leurs deux carbones par une double liaison (manuel, p. 342). Substrat : ${alkene}.`,
        /** @param {string} alkene */ any: (alkene) => `Plusieurs alcènes donnent cet alcane : une double liaison entre deux carbones voisins du squelette, n’importe où, est juste. Par exemple : ${alkene}.`,
      },
    },
    findings: {
      /** @param {{n: number}} p */ steps: ({ n }) => `Ce mécanisme compte ${n} étape${n > 1 ? 's' : ''} : une flèche de réaction par étape.`,
      /** @param {{name: string, last?: boolean}} p */
      missingSpecies: ({ name, last }) => (last ? `Il manque ${name || 'un produit'} parmi les produits.` : `Il manque ${name || 'une espèce'} : ce qui se forme à une étape reste dessiné jusqu’à ce qu’il réagisse.`),
      extraSpecies: () => 'Une espèce de trop : chacune vient de l’étape d’avant.',
      /** @param {{charged: string}} p */
      cationPosition: ({ charged }) => (charged === 'C+' ? 'Le H se lie au carbone de la double liaison qui porte le plus de H : le carbocation le plus substitué, le plus stable, se forme (Markovnikov).'
        : charged === 'O+' ? 'La charge + est sur l’atome qui fait une liaison de plus que d’habitude : l’oxygène à trois liaisons de l’ion oxonium.'
          : `La charge + est sur ${ELEMENTS[charged.slice(0, -1)] ?? charged} du pont, qui fait deux liaisons au lieu d’une.`),
      /** @param {{charged: string}} p */
      charge: ({ charged }) => `Vérifiez les charges : ${{ 'C+': 'le carbone qui a perdu la liaison π porte une charge +', 'O+': 'l’oxygène à trois liaisons de l’ion oxonium porte une charge +' }[charged]
        ?? (charged.endsWith('-') ? `l’ion ${charged.slice(0, -1)}⁻ porte une charge −`
          : charged.endsWith('+') ? `${ELEMENTS[charged.slice(0, -1)] ?? charged} du pont, à deux liaisons, porte une charge +` : 'cette espèce n’en porte pas')}.`,
      // The same atoms bonded otherwise: said by the rule of the reaction.
      /** @param {{name: string, group: string, reaction: string}} p */
      isomer: ({ name, group, reaction }) => `${name ? `Votre produit : ${name}. ` : ''}${({
        halogenation: `Un ${group} se lie à chacun des deux carbones de la double liaison.`,
        hydroboration: 'Le groupe OH se lie au carbone de la double liaison qui porte le plus de H (anti-Markovnikov).',
        dihydroxylation: 'Un groupe OH se lie à chacun des deux carbones de la double liaison.',
        epoxidation: 'L’oxygène se lie aux deux carbones de la double liaison.',
        hydrogenation: 'Un H se lie à chaque carbone de la double liaison : le squelette ne change pas.',
        ozonolysis: 'La double liaison se coupe : chacun de ses deux carbones reçoit un C=O.',
        cleavage: 'La double liaison se coupe : chacun de ses deux carbones reçoit un C=O.',
      })[reaction] ?? `${GROUPS[group] ?? group} se lie au carbone le plus substitué, celui du carbocation (Markovnikov).`}`,
      /** @param {{name: string, other: string, reaction: string}} p */
      otherReaction: ({ name, other, reaction }) => `${name ? `Votre produit : ${name}. ` : ''}C’est le produit ${fr.mechanism.of[other]}, pas celui ${fr.mechanism.of[reaction]}.`,
      // The Substrat style: what is drawn before the arrow.
      noAlkene: () => 'Dessinez un alcène, une seule molécule avec une seule double liaison C=C, avant la flèche de réaction.',
      undecided: () => 'Cet alcène donnerait deux produits en quantités semblables : ses deux carbones portent autant de H.',
      /** @param {{names: string}} p */
      otherAlkene: ({ names }) => (names ? `Votre alcène donnerait : ${names}.` : 'Votre alcène ne donnerait pas ces produits.'),
      // The Réactifs style: what the conditions chosen would give.
      /** @param {{names: string}} p */
      otherConditions: ({ names }) => (names ? `Avec ces conditions, on obtiendrait : ${names}.` : 'Ces conditions ne donneraient pas ce produit.'),
      /** @param {{name: string}} p */ otherSpecies: ({ name }) => `${name ? `Votre dessin : ${name}. ` : ''}Ce n’est pas l’espèce attendue ici.`,
      // pi: to the H of an acid, or to the nearer atom of X₂ (δ+ by induction, figure 7.23); leaving: a bond toward
      // one of its atoms, the bond written that atom last (H–Br, Br–Br, C–Br); bridge: a lone pair of the halogen
      // closing the ring of a bromonium ion; open: X⁻ opening it on the more substituted carbon (figure 7.24).
      missingArrow: {
        /** @param {{target: string, el: string}} p */
        pi: ({ target, el }) => (el === 'H' ? `Il manque la flèche du doublet π vers le H de ${target}.` : `Il manque la flèche du doublet π vers le ${el} le plus proche de ${target} (δ+).`),
        /** @param {{el: string, bond: string}} p */
        leaving: ({ el, bond }) => { const [first] = bond.split('–'); return `Il manque la flèche de la liaison ${bond} vers ${ELEMENTS[el] ?? el} : sans elle, le ${first} aurait ${first === 'C' ? 'cinq' : 'deux'} liaisons.`; },
        /** @param {{source: string}} p */ attack: ({ source }) => `Il manque la flèche d’un doublet de ${source} vers le carbocation.`,
        /** @param {{source: string}} p */ base: ({ source }) => `Il manque la flèche d’un doublet de ${source} (la base, le solvant) vers un H de l’ion oxonium.`,
        bridge: () => 'Il manque la flèche d’un doublet de l’halogène attaqué vers l’autre carbone de la double liaison : elle ferme le pont de l’ion ponté (figure 7.23).',
        /** @param {{source: string}} p */ open: ({ source }) => `Il manque la flèche d’un doublet de ${source} vers le carbone le plus substitué de l’ion ponté.`,
      },
      wrongTarget: {
        /** @param {{target: string, el: string}} p */
        pi: ({ target, el }) => (el === 'H' ? `Le doublet π attaque un H de ${target}, pauvre en électrons (δ+).` : `Le doublet π attaque le ${el} le plus proche de ${target}, rendu δ+ par induction.`),
        /** @param {{el: string, bond: string}} p */
        leaving: ({ el, bond }) => { const [first, second] = bond.split('–'); return first === second ? `Les électrons de la liaison ${bond} partent avec le ${el} le plus éloigné (δ−).` : `Les électrons de la liaison ${bond} partent avec ${ELEMENTS[el] ?? el}, plus électronégatif.`; },
        /** @param {{source: string}} p */ attack: ({ source }) => `${source} attaque le carbone qui porte la charge +.`,
        /** @param {{source: string}} p */ base: ({ source }) => `${source}, la base, arrache un H de l’ion oxonium : sa flèche pointe vers ce H.`,
        bridge: () => 'Un doublet de l’halogène attaqué se lie à l’autre carbone de la double liaison, pour fermer le pont.',
        /** @param {{source: string}} p */ open: ({ source }) => `${source} attaque le carbone le plus substitué de l’ion ponté, du côté opposé au pont (figure 7.24).`,
      },
      reversed: () => 'Une flèche part des électrons (un doublet ou une liaison) et pointe vers l’atome qui les reçoit.',
      markovnikovArrow: () => 'Le H se lie au carbone de la double liaison qui porte le plus de H (Markovnikov).',
      halfArrow: () => 'Deux électrons se déplacent : une flèche à pointe complète, pas une demi-flèche.',
      extraArrow: () => 'Une flèche de trop à cette étape.',
    },
  },
  // The Exercice mode: a series of molecules to name or to draw (naming/exercise.js).
  exercise: {
    // The two exercises of the Exercice menu.
    kinds: { naming: 'Nomenclature', mechanism: 'Mécanismes' },
    title: 'Exercice de nomenclature',
    /** @param {number} n */ seriesOf: (n) => `Série de ${n} molécules`,
    level: 'Niveau',
    levels: { alkanes: 'Alcanes (2.5.1)', cycloalkanes: 'Cycloalcanes (2.5.2)', halogens: 'Halogénés (2.5.3)', alkenes: 'Alcènes (2.5.4)', alkynes: 'Alcynes (2.5.5)', aromatics: 'Benzéniques (2.5.6)', ethers: 'Éthers (2.5.7)', alcohols: 'Alcools (2.5.8)', aldehydes: 'Aldéhydes (2.5.9)', ketones: 'Cétones (2.5.10)', mix: 'Mélange' },
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
    // No article before the name: it would need its gender and elision (la butanone, l’éthanol).
    /** @param {string} name */ drawnRight: (name) => `C’est bien la molécule demandée : ${name}.`,
    drawnWrong: 'Ce n’est pas la molécule demandée',
    /** @param {string} name */ yourDrawing: (name) => `Votre dessin : ${name}.`,
    /** @param {number} a @param {number} b */ carbons: (a, b) => `Votre dessin compte ${a} carbone${a > 1 ? 's' : ''} ; il en faut ${b}.`,
    others: 'Vérifiez les atomes autres que le carbone : l’outil Atome change l’élément d’un atome.',
    place: 'Les atomes sont les bons, mais pas à leur place : vérifiez la numérotation de la chaîne principale.',
    doubles: 'Vérifiez les liaisons doubles et triples : leur nombre et leur place.',
    steps: {
      /** @param {boolean} ring @param {number} n @param {string} name @param {string} why the principal group's suffix, 'multiples' or 'longest' */
      parent: (ring, n, name, why) => (ring ? `Chaîne principale : le cycle de ${n} carbones, ${name}.`
        : `Chaîne principale : ${/** @type {Record<string, string>} */ ({ ol: 'celle qui porte l’OH', al: 'celle qui porte le CHO', one: 'celle qui porte le C=O', multiples: 'celle qui porte les liaisons multiples', longest: 'la plus longue' })[why]}, ${n} carbone${n > 1 ? 's' : ''}, ${name}.`),
      // The principal group, by its suffix; written: whether the name shows its locant.
      principal: {
        /** @param {number[]} at @param {boolean} written */
        ol: (at, written) => `Fonction prioritaire : alcool, suffixe -ol en ${at.join(' et ')}${written ? '' : ' ; seule place possible, son indice ne s’écrit pas'}.`,
        al: () => 'Fonction prioritaire : aldéhyde, suffixe -al, toujours en bout de chaîne : son indice 1 ne s’écrit pas.',
        carbaldéhyde: () => 'Fonction prioritaire : aldéhyde sur un cycle, suffixe -carbaldéhyde ; le carbone du CHO ne compte pas dans le cycle.',
        /** @param {number[]} at @param {boolean} written */
        one: (at, written) => `Fonction prioritaire : cétone, suffixe -one en ${at.join(' et ')}${written ? '' : ' ; seule place possible, son indice ne s’écrit pas'}.`,
      },
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
