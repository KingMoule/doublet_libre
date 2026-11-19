# Doublet libre

Éditeur web gratuit pour dessiner des mécanismes de chimie organique : formules topologiques selon l'IUPAC, doublets libres, charges, δ+/δ−, flèches courbes accrochées aux électrons et flèche de réaction avec ses conditions. Pensé d'abord pour les étudiants.

*Les électrons bougent, le logiciel est libre.*

## Lancer

Aucune installation : il faut seulement Node 20 ou plus récent.

```bash
node scripts/serve.mjs
```

Puis ouvrir http://localhost:8765.

## Tests

```bash
node --test
```

## Structure

```
index.html          page et styles (thèmes clair et sombre)
src/
  editor.js         outils, souris, clavier, panneau de propriétés
  render.js         mise en page et rendu SVG (fonctions pures)
  model.js          document, modifications, historique, validation
  chem.js           valence, H implicites, texte chimique
  geometry.js       vecteurs, angles, secteurs libres
  sample.js         exemple SN2
  i18n/fr.js        textes de l'interface
tests/              tests node:test
scripts/serve.mjs   serveur local d'aperçu
```

Ce que l'app doit faire et dans quel ordre : [SPEC.md](SPEC.md).

## Licence

MIT
