# Tester le package

## Prérequis

- **Node.js 22.18 ou plus récent** (le projet est développé et testé avec **Node 26**). Les outils
  (Vite 8, Vitest 5, tsup 9) ne fonctionnent pas avec Node 16 ou 18.
- Avec nvm-windows :

```powershell
nvm use 26.3.0
node -v   # v26.3.0
```

> Le dépôt `inovua-reactdatagrid-master` a besoin de Node 16, et ce package de Node 22 ou plus.
> Pensez à changer de version avec `nvm use` quand vous passez d'un projet à l'autre.

## 1. Installer

```powershell
cd D:\inovua-reactdatagrid-master\react-locale-number-input
npm install
```

npm 11 peut afficher `allow-scripts ... esbuild`. Ce n'est pas bloquant : le binaire esbuild est
fourni par un paquet optionnel. Pour approuver ses scripts quand même : `npm approve-scripts esbuild`.

## 2. Tests automatiques

```powershell
npm test               # lance tous les tests une fois (Vitest + jsdom)
npm run test:watch     # relance les tests à chaque modification
npm run test:coverage  # rapport de couverture dans coverage/
npm run typecheck      # vérification TypeScript
```

Les tests se trouvent dans `test/` :

- `utils.test.ts` : parsing, formatage, séparateurs par locale, devises. Ce sont les tests de
  l'ancien code, plus les tests `ro-RO` qui étaient désactivés.
- `NumberInput.test.tsx` : comportement du composant (saisie, locale fr-FR, précision, min/max,
  flèches, molette, spinner maintenu, bouton effacer, mode contrôlé, formulaire, API ref).

## 3. Tester à la main dans le navigateur (playground)

```powershell
npm run dev
```

Le navigateur s'ouvre sur http://localhost:5173. La page `demo/main.tsx` montre le composant dans
toutes ses configurations : contrôlé et non contrôlé, plusieurs locales, devises, min/max, thèmes,
RTL, formulaire. Le journal `onChange` s'affiche en bas de page. Le code source est rechargé à chaud.

Points à vérifier :

| Action | Résultat attendu |
| --- | --- |
| Taper `12.5` dans un champ `fr-FR` | Affiche `12,5`, `onChange(12.5)` |
| Taper une lettre | Ignorée |
| Flèche haut / bas, puis avec Shift | ±1, puis ±10 |
| Maintenir la flèche du spinner | La valeur défile, puis s'arrête au relâchement |
| Molette sur le champ focalisé | ±1, sans faire défiler la page |
| Taper `500` dans un champ min 10 / max 100 puis Tab | Devient `100` |
| `-` au milieu du nombre | Le signe s'inverse |
| Escape après une modification | La valeur d'avant revient |
| Bouton × | Le champ est vidé et `onChange(null)` est appelé |

## 4. Construire et vérifier le package final

```powershell
npm run build          # génère dist/ (ESM, CJS, .d.ts, CSS)
npm run check:package  # publint + arethetypeswrong : vérifie exports et types
npm run verify         # typecheck + tests + build + check:package
```

## 5. Tester le package dans une autre application AVANT de le publier

C'est le test le plus fiable, parce qu'il installe exactement le fichier qui sera envoyé sur npm.

```powershell
# dans le dossier du package
npm pack
# crée react-locale-number-input-1.0.0.tgz (le build est lancé automatiquement)

# dans une application de test (par ex. créée avec : npm create vite@latest test-app -- --template react-ts)
cd ..\test-app
npm install ..\react-locale-number-input\react-locale-number-input-1.0.0.tgz
```

Puis dans `src/App.tsx` :

```tsx
import { NumberInput } from 'react-locale-number-input';
import 'react-locale-number-input/index.css';

export default function App() {
  return <NumberInput locale="fr-FR" format="currency" defaultValue={1234.5} onChange={console.log} />;
}
```

`npm pack --dry-run` affiche la liste des fichiers qui seront publiés, sans créer d'archive.

Autre méthode, plus rapide quand vous modifiez souvent le code : `npm link`.

```powershell
cd react-locale-number-input; npm run build; npm link
cd ..\test-app; npm link react-locale-number-input
```

Attention : avec `npm link`, l'application peut charger deux copies de React. L'erreur
« Invalid hook call » vient de là. `npm pack` évite ce problème.
