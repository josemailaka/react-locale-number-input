# Publier le package sur npm (sur votre compte)

## 0. À modifier une seule fois avant la première publication

Dans `package.json` :

| Champ | Valeur actuelle | À remplacer par |
| --- | --- | --- |
| `name` | `react-locale-number-input` | Ce nom est libre sur npm au moment de la création. Gardez-le, ou utilisez un nom avec scope : `@votre-pseudo-npm/react-number-input` |
| `author` | `YOUR NAME <you@example.com>` | Votre nom et votre email |
| `repository.url`, `homepage`, `bugs.url` | `YOUR_GITHUB_USER` | L'URL de votre dépôt GitHub |

Dans `LICENSE`, remplacez `YOUR NAME`. **Gardez la ligne « INOVUA TRADING »** : la licence MIT
l'impose, car le code est dérivé du leur.

Pour vérifier qu'un nom est libre :

```powershell
npm view react-locale-number-input   # « 404 Not Found » = nom libre
```

> Avec un nom à scope (`@pseudo/...`), le champ `publishConfig.access: "public"` est déjà configuré.
> Sans lui, npm refuserait la publication gratuite.

## 1. Créer et sécuriser le compte npm

1. Créez un compte sur https://www.npmjs.com/signup et validez votre email.
2. Activez l'authentification à deux facteurs (2FA) dans *Account → Two-Factor Authentication*.
   npm l'exige pour publier.

## 2. Première publication (depuis votre PC)

```powershell
nvm use 26.3.0
cd D:\inovua-reactdatagrid-master\react-locale-number-input

npm login            # ouvre le navigateur pour se connecter
npm whoami           # doit afficher votre pseudo npm

npm run verify       # typecheck + tests + build + vérification du package
npm pack --dry-run   # relisez la liste des fichiers publiés

npm publish          # npm vous demande le code 2FA
```

`npm publish` lance automatiquement :

1. `prepublishOnly` : typecheck et tests. Si un test échoue, la publication est annulée.
2. `prepack` : `npm run build`, qui régénère `dist/`.

Le package est ensuite visible sur `https://www.npmjs.com/package/react-locale-number-input`.

## 3. Publier une nouvelle version

npm refuse de republier un numéro de version déjà publié. Suivez le versionnement sémantique :

```powershell
npm version patch    # 1.0.0 -> 1.0.1 : correction de bug
npm version minor    # 1.0.0 -> 1.1.0 : nouvelle fonctionnalité compatible
npm version major    # 1.0.0 -> 2.0.0 : changement cassant
# (dans un dépôt git, cela crée aussi le commit et le tag v1.0.1)

npm publish
```

Pensez à compléter `CHANGELOG.md` avant de publier.

Pour publier une version de test sans qu'elle devienne la version par défaut :

```powershell
npm version prerelease --preid beta   # 1.0.1-beta.0
npm publish --tag beta                # installable avec : npm i react-locale-number-input@beta
```

## 4. (Recommandé) Publication automatique depuis GitHub, sans token

Le workflow `.github/workflows/publish.yml` publie le package à chaque *Release* GitHub. Il utilise
le **Trusted Publishing** de npm (OIDC) : aucun mot de passe ni token n'est stocké dans GitHub, et la
page npm affiche un badge de provenance qui prouve que le package vient de votre dépôt.

1. Poussez le projet sur GitHub, dans le dépôt indiqué par `repository.url`. L'URL doit correspondre
   exactement, sinon la vérification de provenance échoue.
2. Faites la **première publication à la main** (étape 2) pour créer le package sur npm.
3. Sur npmjs.com, ouvrez le package, puis *Settings → Trusted Publisher → GitHub Actions*, et
   renseignez :
   - Organization or user : votre pseudo GitHub
   - Repository : `react-locale-number-input`
   - Workflow filename : `publish.yml`
4. Ensuite, pour chaque version :

```powershell
npm version patch
git push --follow-tags
```

   Puis sur GitHub, créez une *Release* à partir du tag `v1.0.1`. Le workflow lance les tests, construit
   le package et le publie.

Le workflow `ci.yml` lance aussi `npm run verify` sur Node 22, 24 et 26 à chaque push ou pull request.

## 5. En cas de problème

| Erreur | Cause / solution |
| --- | --- |
| `E403 You do not have permission to publish` | Le nom est déjà pris : changez `name` |
| `E403 ... cannot publish over the previously published versions` | Augmentez la version avec `npm version patch` |
| `E402 Payment Required` | Package à scope sans `--access public`. C'est déjà géré par `publishConfig` |
| `EOTP` / demande de code | Saisissez le code 2FA de votre application d'authentification |
| `ENEEDAUTH` | Lancez `npm login` |
| Erreur de provenance dans GitHub Actions | `repository.url` ne correspond pas au dépôt GitHub |

Pour retirer une version publiée par erreur (possible seulement dans les 72 heures) :
`npm unpublish react-locale-number-input@1.0.1`. Sinon, utilisez
`npm deprecate react-locale-number-input@1.0.1 "message"`.
