// @ts-check
/**
 * Textes de l’interface, en français.
 * Pour ajouter une langue : copier ce fichier (en.js), traduire les valeurs, changer l’import dans editor.js.
 */
export const fr = {
  appName: 'Doublet libre',
  badge: 'Prototype · phase 0',
  canvasLabel: 'Zone de dessin du mécanisme',
  toolsLabel: 'Outils',
  tools: { select: 'Sélection', bond: 'Liaison', erase: 'Gomme' },
  toolKeys: { select: 'V', bond: 'B', erase: 'E' },
  actions: {
    undo: 'Annuler', redo: 'Rétablir', fit: 'Recentrer', sample: 'Exemple SN2', clear: 'Nouveau', proposal: 'Proposition',
  },
  status: {
    select: 'Glissez une molécule pour la déplacer : les flèches courbes suivent. Glissez le fond pour vous déplacer, molette pour zoomer, Ctrl+Z pour annuler.',
    bond: 'Cliquez sur le fond pour poser une liaison, sur un atome pour en ajouter une, sur une liaison pour changer son ordre. Glissez pour choisir la direction.',
    erase: 'Cliquez sur un objet pour l’effacer.',
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
    phaseTitle: 'Dans ce prototype',
    phaseItems: [
      'Le modèle du document et son rendu selon les règles de base de l’IUPAC.',
      'Des flèches courbes accrochées aux électrons : déplacez le bromoéthane, elles suivent.',
      'Zoom, déplacement de la vue, annuler et rétablir.',
      'L’outil Liaison et les raccourcis clavier, en avant-goût de la phase 1.',
    ],
    nextTitle: 'Prochaines phases',
    nextItems: [
      'Phase 1 : chaînes, cycles, sélection de plusieurs objets.',
      'Phase 2 : outils Doublet, Charge et δ.',
      'Phase 3 : outil Flèche courbe.',
      'Phase 4 : outil Flèche de réaction.',
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
    formatHint: 'Les chiffres qui suivent un symbole passent en indice : H2O devient H₂O. ^+ met en exposant.',
    insert: 'Insérer',
    textLabel: 'Texte',
    remove: 'Supprimer',
    markNames: { lonePair: 'Doublet libre', radical: 'Électron célibataire', partial: 'Charge partielle' },
    rotateHint: 'Glissez-la dans le dessin pour la faire tourner autour de son atome.',
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
