// @ts-check
/**
 * Textes de l’interface, en français.
 * Pour ajouter une langue : copier ce fichier (en.js), traduire les valeurs, changer l’import dans editor.js.
 */
/** @param {number} q */
const signed = (q) => (q > 0 ? `+${q}` : q < 0 ? `−${-q}` : '0');

export const fr = {
  appName: 'Doublet libre',
  badge: 'Version 1',
  canvasLabel: 'Zone de dessin du mécanisme',
  toolsLabel: 'Outils',
  /** @type {{benzene: string, size: (n: number) => string}} */
  ringNames: { benzene: 'Benzène', size: (n) => `Cycle à ${n}` },
  bondNames: { 1: 'Simple', 2: 'Double', 3: 'Triple', wedge: 'Coin plein : sort du plan', hash: 'Coin haché : entre dans le plan' },
  tools: {
    select: 'Sélection', bond: 'Liaison', chain: 'Chaîne', ring: 'Cycle', atom: 'Atome',
    lonePair: 'Doublet', charge: 'Charge', partial: 'Charge partielle', group: 'Groupe', curved: 'Flèche courbe',
    rxn: 'Flèche de réaction', text: 'Texte', erase: 'Gomme',
  },
  toolKeys: {
    select: 'V', bond: 'B', chain: 'Z', ring: 'R', atom: 'A', lonePair: 'L', charge: 'Q', partial: 'D', group: 'G', curved: 'F',
    rxn: 'W', text: 'T', erase: 'E',
  },
  actions: {
    undo: 'Annuler', redo: 'Rétablir', fit: 'Recentrer', templates: 'Modèles', clear: 'Nouveau',
    file: 'Fichier', open: 'Ouvrir…', save: 'Enregistrer', png: 'Exporter en PNG', svg: 'Exporter en SVG', copy: 'Copier l’image',
  },
  files: {
    saved: 'Enregistré : mecanisme.doublet.json, dans vos téléchargements.',
    copied: 'Image copiée : collez-la dans Word ou Google Docs.',
    copyFailed: 'Le navigateur a refusé la copie. Utilisez plutôt Fichier → Exporter en PNG.',
    badFile: 'Ce fichier n’est pas un dessin de Doublet libre (.doublet.json, ou SVG exporté par l’app).',
    /** @param {string} name */
    opened: (name) => `Ouvert : ${name}`,
  },
  status: {
    select: 'Glissez une molécule pour la déplacer, le fond pour sélectionner ; Maj + clic ajoute un élément. Ctrl+C, Ctrl+V : copier, coller. Espace + glisser : déplacer la vue ; molette : zoomer.',
    bond: 'Type au choix à côté de l’outil. Cliquez sur le fond ou un atome pour poser une liaison, sur une liaison pour lui donner ce type (en simple : changer son ordre). Un coin part étroit de l’atome de départ ; recliquez-le pour le retourner.',
    chain: 'Glissez depuis un atome ou le fond : la chaîne suit en zigzag, un atome tous les 35 points environ.',
    ring: 'Cliquez sur le fond pour un cycle isolé, sur une liaison pour un cycle accolé, sur un atome pour l’y accrocher. Touches 3 à 8 pour la taille.',
    selectTouch: 'Glissez une molécule pour la déplacer, le fond pour sélectionner. Deux doigts : pincer pour zoomer, glisser pour déplacer la vue. Touchez un atome pour changer son élément dans le panneau.',
    erase: 'Cliquez sur un objet pour l’effacer.',
    atom: 'Cliquez sur le fond pour poser un atome seul, sur un atome pour changer son élément. Élément au choix à côté de l’outil ; les H implicites s’ajoutent seuls.',
    lonePair: 'Cliquez sur un atome pour ajouter un doublet libre, Maj + clic pour un électron seul. Ils se placent dans l’espace libre.',
    charge: 'Cliquez sur un atome pour +1, Maj + clic pour −1. Les H implicites s’ajustent.',
    partial: 'Cliquez sur un atome : δ+, puis δ−, puis rien.',
    group: 'Cliquez sur un atome pour y accrocher le groupe choisi à côté de l’outil, dessiné en entier. Il part dans la direction libre de l’atome, en zigzag.',
    rxn: 'Glissez sur le fond pour tracer une flèche de réaction (clic : flèche de longueur standard), puis écrivez ses conditions dans le panneau.',
    text: 'Cliquez sur le fond pour poser un « + », puis changez le texte dans le panneau.',
    curved: 'Glissez d’un doublet (ou de son atome) ou d’une liaison vers un atome, une liaison, ou le milieu de deux atomes pour une liaison qui se forme. Maj : demi-flèche (1 électron).',
    hover: {
      atom: 'Atome : tapez C, N, O, S, F, P, H, B (Br), L (Cl) ou I pour changer l’élément, + ou − pour la charge, Suppr pour l’effacer. Alt + glisser déplace l’atome seul.',
      bond: 'Liaison : tapez 1, 2 ou 3 pour l’ordre, W pour un coin plein, H pour un coin haché, Suppr pour l’effacer.',
      mark: 'Glissez pour faire tourner autour de l’atome. Suppr pour effacer.',
      charge: 'Glissez la charge pour la faire tourner autour de l’atome.',
      curved: 'Flèche courbe : cliquez pour la sélectionner, puis courbez-la avec ses poignées carrées.',
      handle: 'Glissez la poignée pour changer la courbure.',
      rxn: 'Flèche de réaction : cliquez pour modifier son type et ses conditions, glissez pour la déplacer.',
      text: 'Texte : glissez pour le déplacer.',
    },
  },
  panel: {
    nothing: 'Rien de sélectionné',
    intro: 'Cliquez sur un objet du dessin pour voir et changer ses propriétés.',
    /** @param {{atoms: unknown[], bonds: unknown[], curvedArrows: unknown[]}} d */
    counts: (d) => `${d.atoms.length} atomes · ${d.bonds.length} liaisons · ${d.curvedArrows.length} flèches courbes`,
    phaseTitle: 'Dans cette version',
    phaseItems: [
      'Molécules selon les règles de base de l’IUPAC : liaisons, chaînes, cycles, atomes, groupes.',
      'Modèles : SN2, SN1, E2, E1, addition électrophile, addition nucléophile sur un carbonyle.',
      'Doublets, charges, δ, flèches courbes accrochées aux électrons, flèches de réaction.',
      'Avertissements : octet dépassé, flèche inversée, charge non conservée, résonance mal employée.',
      'Fichier : enregistrer, ouvrir, exporter en PNG ou en SVG, copier l’image.',
    ],
    shortcutsTitle: 'Raccourcis',
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
    element: 'Élément',
    charge: 'Charge',
    hydrogens: 'H implicites',
    order: 'Ordre',
    stereo: 'Stéréo',
    stereoNames: { none: 'Simple', wedge: 'Coin plein', hash: 'Coin haché' },
    addLonePair: 'Ajouter un doublet',
    removeLonePair: 'Retirer un doublet',
    electrons: 'Électrons',
    electronsTwo: '2 · pleine',
    electronsOne: '1 · demi-flèche',
    source: 'Source',
    target: 'Cible',
    resetBend: 'Courbure par défaut',
    kind: 'Type',
    above: 'Au-dessus (réactifs, catalyseur)',
    below: 'En dessous (solvant, température, durée)',
    formatHint: 'Les chiffres qui suivent un symbole passent en indice : H2O devient H₂O. ^+ met en exposant. Entrée ajoute une ligne, pour les étapes « 1. … 2. … ».',
    insert: 'Insérer',
    textLabel: 'Texte',
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
    /** @param {{element: string, electrons: number}} p */
    octet: (p) => `${p.element} porte ${p.electrons} électrons : c’est plus que l’octet (8 au plus, sauf pour S, P et I).`,
    arrowDirection: () => 'Flèche probablement inversée : elle part d’un atome chargé + ou arrive sur un atome chargé −. Les électrons vont du site riche vers le site pauvre.',
    mixedCharges: () => 'Charges formelles et charges partielles sur la même molécule : n’en montrez qu’une sorte (IUPAC GR-5.6).',
    /** @param {{left: number, right: number}} p */
    charge: (p) => `Charge totale ${signed(p.left)} avant la flèche et ${signed(p.right)} après : elle doit se conserver.`,
    resonance: () => '↔ relie des formes de résonance, qui gardent les mêmes atomes et les mêmes liaisons σ. Pour une réaction, utilisez → ou ⇌.',
  },
  kinds: {
    forward: 'Réaction →', equilibrium: 'Équilibre ⇌', resonance: 'Résonance ↔', retro: 'Rétrosynthèse ⇒', noReaction: 'Pas de réaction',
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
