# CLAUDE.md — Site vitrine du Refuge de Saintines

## Contexte
- Site vitrine + réservation en direct du **Refuge de Saintines**, studio en location courte durée à Saintines (60410), proche CDG et Parc Astérix.
- Domaine : https://gite-refugedesaintines.com (fichier `CNAME`).
- Propriétaire : Marceau. **Il n'est pas développeur** : réponds en français, explique simplement, propose des alternatives et dis-le quand une idée est risquée ou trop complexe.
- Site jumeau : le portail voyageurs (`marceauht/guest-refugedesaintines`), même charte graphique.

## Stack
- HTML / CSS / JavaScript statiques. **Pas de build, pas de npm, pas de framework.** Ne pas en ajouter sans justification claire.
- JS en modules ES natifs : `assets/js/main.js` importe `assets/js/modules/*.js` (une fonction `initXxx()` par module, appelée au `DOMContentLoaded`).
- CSS : `assets/css/main.css` importe les autres fichiers via `@import`. Variables de couleurs et polices dans `assets/css/base.css` (`:root`).
- Librairies via CDN uniquement : Flatpickr 4.6.13 (calendrier, locale `fr`), Google Fonts (Cormorant Garamond + DM Sans).
- Réservation : Google Apps Script (le code du script **n'est pas dans ce repo**, il vit dans le compte Google de Marceau).

## Structure
- `index.html` : page unique (sections `#home`, `#logement`, `#galerie`, `#equipements`, `#localisation`, `#infos`, `#avis`, `#reco`, `#contact`).
- `cgv.html`, `rules.html` (règlement), `mentions-legales.html`, `politique-confidentialite.html`.
- `images/` : photos en `.webp` (`p1` à `p23`, `hero.webp`).
- `sitemap.xml`, `robots.txt`, `googleb7cd1898ebe68c89.html` (vérification Google Search Console, ne pas supprimer).

## Réservation (`assets/js/modules/reservation.js`)
- `SCRIPT_URL` = URL `/exec` du déploiement Apps Script. Si Marceau redéploie le script avec une nouvelle URL, il faut la changer ici.
- `GET SCRIPT_URL?action=blocked_dates` renvoie `{ blocked: [{ from: "AAAA-MM-JJ", to: "AAAA-MM-JJ" }] }`. `to` est le **jour de départ** : le code retire 1 jour pour que la nuit de départ reste libre.
- `POST SCRIPT_URL` (FormData) avec `date_arrivee` / `date_depart` au format **`JJ/MM/AAAA`**, réponse `{ success, message }`.
- Tarifs codés en dur en haut du fichier : 58 €/nuit, ménage 30 €, +10 € par adulte au-delà de 2, +10 € animal. Max 4 voyageurs (adultes + enfants).

## Pièges connus
- **Dates Flatpickr** : trois formats coexistent (ISO `AAAA-MM-JJ` venant d'Apps Script, objets `Date` dans Flatpickr, `JJ/MM/AAAA` envoyé au script). Toujours créer les dates avec `'T00:00:00'` (heure locale) pour éviter un décalage d'un jour lié au fuseau. Tester sur un changement de mois.
- **Changer un prix = plusieurs endroits** : `reservation.js`, le texte de `index.html` (hero, infos, récap prix), le JSON-LD en haut de `index.html` (`priceRange`) et `cgv.html`.
- Avis : la note et le nombre d'avis sont aussi dans le JSON-LD (`aggregateRating`) ; les mettre à jour en même temps que la section `#avis`.
- Le numéro de téléphone est écrit en dur à plusieurs endroits (HTML + messages d'erreur de `reservation.js`).
- `_headers` (règles de cache) n'a **aucun effet** : GitHub Pages ignore ce fichier et impose son propre cache (10 min).
- `accordion.js` contient une ancienne URL Apps Script (`FORM_ENDPOINT`) qui n'est plus utilisée. La seule URL active est celle de `reservation.js`.
- Tester toute modif en mobile : beaucoup de comportements spécifiques (`responsive.css`, `infoSheet.js` actif seulement sous 768 px).

## Déploiement
- Le repo est **public**. Ne jamais y mettre de secret, de mot de passe, d'IBAN ou de code d'accès.
- Hébergement : **GitHub Pages** (branche `main`, domaine via `CNAME`). Les pages légales et le pied de page mentionnent encore Infomaniak : à corriger.
- **Fusionner sur `main` = mettre en ligne** (en quelques minutes).
- Habitude de Marceau quand il travaille seul : `git add .` → `git commit -m "MàJ XXX"` → `git push`, directement sur `main` (donc en ligne tout de suite). Avec Claude, on passe par une branche + PR.
- Après la fusion d'une PR sur GitHub, Marceau doit faire `git pull` dans VS Code **avant** de modifier quoi que ce soit, sinon son prochain `git push` sera refusé. Le lui rappeler.
- `git add .` ajoute tout le dossier : vérifier qu'aucun fichier perso ou secret n'y traîne avant de pousser.
- **Travailler sur une branche + PR, et demander l'accord de Marceau avant tout push, merge ou mise en ligne.**

## Tester en local
- Marceau travaille sous **Windows avec VS Code**. Rendu en direct, depuis le dossier du projet :
  - terminal 1 : `npx serve . -p 8080` (site sur http://localhost:8080)
  - terminal 2 : `ngrok http 8080` (adresse publique temporaire, pratique pour tester sur téléphone)
- Ne pas ouvrir `index.html` en double-cliquant (`file://`) : les modules JS ne se chargent pas, il faut passer par `npx serve`.
- Quand tu donnes des commandes à Marceau, donne-les pour PowerShell, pas pour Linux/Mac.
- Le calendrier appelle le vrai Apps Script : ne pas envoyer de vraie demande de réservation en test sans prévenir Marceau.

## Conventions
- Textes, commentaires et messages de commit en français.
- Garder le style des fichiers existants (bandeaux de commentaires `/* ==== */`, une fonction `initXxx` par module).
- Images en `.webp`, avec `alt` et `loading="lazy"` hors hero.
