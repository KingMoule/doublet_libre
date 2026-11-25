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
  modes: { mechanism: 'Mécanisme', setup: 'Montage' },
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
  /** @param {number} q */
  chargeText: (q) => (q === 0 ? '0' : `${Math.abs(q) > 1 ? Math.abs(q) : ''}${q > 0 ? '+' : '−'}`),
};
