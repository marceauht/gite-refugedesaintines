# Le Refuge de Saintines - Site statique

## Structure

- `index.html` : page principale
- `mentions-legales.html` : mentions legales
- `politique-confidentialite.html` : politique de confidentialite
- `assets/css/` : styles decoupes par responsabilite
  - `base.css` : variables, reset, typographie
  - `layout.css` : conteneurs et layout global
  - `components/` : styles par composant (nav, hero, accordions, popups, etc.)
  - `pages/home.css` : styles specifiques a la page d'accueil
  - `responsive.css` : media queries
  - `main.css` : point d'entree qui importe les fichiers CSS
- `assets/js/` : scripts decoupes en modules
  - `main.js` : entrypoint
  - `modules/` : navigation, accordions, popups, galerie, formulaire, map
- `images/` : assets visuels

## Modifier le contenu

- Textes et sections : `index.html`
- Mentions legales : `mentions-legales.html`
- Politique de confidentialite : `politique-confidentialite.html`

## Styles

- Styles globaux : `assets/css/base.css`
- Layout : `assets/css/layout.css`
- Composants : `assets/css/components/`
- Responsive : `assets/css/responsive.css`

## Scripts

- Point d'entree : `assets/js/main.js`
- Modules : `assets/js/modules/`

## Tester en local

Option simple (serveur local) :

```powershell
python -m http.server 8000
```

Puis ouvrir `http://localhost:8000`.

## Suppressions effectuees

- `style.css`, `responsive.css`, `script.js` : remplaces par la structure `assets/` modulaire.
- Styles `.loader .trail` + `@keyframes blink` : non utilises dans le HTML actuel.
