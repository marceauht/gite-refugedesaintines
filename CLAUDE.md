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
- Styles propres à une seule page (volumineux) : `assets/css/pages/<page>.css`, chargé uniquement par cette page (pas dans `main.css`, pour ne pas alourdir l'accueil). Ex. `pages/ma-reservation.css`. Les petites pages (CGV, règlement…) gardent leur `<style>` dans le HTML.
- Module propre à une seule page : chargé à la demande par `main.js` (`import()` conditionnel), ex. `modules/maReservation.js` sur `body.sejour-page`.
- Librairies via CDN uniquement : Flatpickr 4.6.13 (calendrier, locale `fr`), Google Fonts (Cormorant Garamond + DM Sans).
- Réservation : Google Apps Script. Marceau en garde une copie locale dans `GAS/gas.js`, **exclue de Git par `.gitignore`** (repo public : ce code ne doit jamais être publié ici). Elle n'est donc pas visible sur GitHub.

## Structure
- `index.html` : page unique (sections `#home`, `#logement`, `#galerie`, `#equipements`, `#localisation`, `#infos`, `#avis`, `#reco`, `#contact`).
- `cgv.html`, `rules.html` (règlement), `contrat.html` (contrat de location accepté en ligne), `mentions-legales.html`, `politique-confidentialite.html`.
- `images/` : photos en `.webp` (`p1` à `p23`, `hero.webp`).
- `images/email/` (JPG/PNG, pas de webp) et `contact.vcf` : utilisés par les **emails automatiques** du script (bannière, photo, icônes `ico-<nom>-<couleur>.png`, bouton « Ajouter aux contacts »). Ne pas renommer ni supprimer : les emails déjà envoyés pointent dessus.
- `sitemap.xml`, `robots.txt`, `googleb7cd1898ebe68c89.html` (vérification Google Search Console, ne pas supprimer).

## Réservation (`assets/js/modules/reservation.js`)
- Deux déploiements Apps Script : `SCRIPT_URL_PROD` (vrai site) et `SCRIPT_URL_TEST` (déploiement « Test »). Le site utilise le Test automatiquement en local (localhost, 192.168…, 10…), via ngrok, ou avec `?test` dans l'adresse : une mention « 🧪 Mode test » s'affiche alors sous les dates. Le Test écrit dans le **vrai** Sheet et envoie les vrais emails. Un déploiement est figé sur une version : après `clasp push`, créer une nouvelle version du déploiement concerné. Le code du script est dans le dépôt privé `marceauht/refuge-apps-script`.
- `GET SCRIPT_URL?action=blocked_dates` renvoie `{ blocked: [{ from: "AAAA-MM-JJ", to: "AAAA-MM-JJ" }] }` : séjours Airbnb, Booking (y compris leurs dates fermées, donc l'horizon de réservation) et réservations directes du Sheet (sauf Statut « ANNULÉE »). `to` est le **jour de départ**. Le site en déduit les nuits prises : l'arrivée est impossible un soir déjà pris, et le départ s'arrête à la première nuit prise (partir le jour où un autre arrive est permis). Jour même réservable jusqu'à 11 h (heure de Paris), vérifié aussi par le script. Si le chargement échoue, le calendrier reste verrouillé avec un bouton « Réessayer ».
- `POST SCRIPT_URL` (FormData : coordonnées, `date_arrivee` / `date_depart` au format **`JJ/MM/AAAA`**, `nb_adultes`, `nb_enfants`, `nb_bebes`, `lit_parapluie`, `consentement`, `mode` = test/reel, `retour` = adresse de la page). Le script revérifie les dates, recalcule le prix, bloque les dates 30 min (Statut « PAIEMENT EN COURS ») et répond `{ success, url }` : le site envoie alors le voyageur sur la page de paiement **Stripe** (carte, Apple Pay, Google Pay). Sinon `{ success: false, message }`.
- Retour de Stripe sur la même page : `?paiement=ok&session_id=…` → le site appelle `?action=statut&session_id=…` (réponse `{ statut: CONFIRMEE | PAIEMENT EN COURS | EXPIREE… }`) ; `?paiement=annule&ref=…` → `?action=annuler&ref=…` libère les dates. Le script vérifie aussi les paiements toutes les 5 min. Le paiement confirmé déclenche l'email de confirmation (contrat PDF joint). Le contrat est accepté en ligne avant le paiement (case à cocher du formulaire, horodatée par le script) : son texte est sur `contrat.html` et dans le modèle Google Doc « contrat-location-LRDS-TEMPLATE-v2 » qui sert à générer le PDF. **Les deux doivent rester identiques** (ainsi que le règlement en annexe 1). Plus de virement, de RIB ni de Swikly.
- Tarifs codés en dur en haut du fichier : 58 €/nuit, ménage 30 €, +10 € par nuit et par voyageur au-delà de 2 (adultes + enfants ; bébés de moins de 2 ans gratuits). Taxe de séjour comprise dans le prix, affichée en « dont taxe de séjour » : constantes `TAXE_*`, à garder identiques aux lignes `taxe_sejour_*` de l'onglet Paramètres du Sheet (le script fait le même calcul). Animaux non acceptés depuis octobre 2026 (sauf chiens guides et d'assistance) : le règlement de référence est la v2 d'octobre 2026, à garder identique sur `rules.html`, le portail, le contrat, Airbnb et Booking. Max 4 voyageurs (adultes + enfants).

## Pièges connus
- **Dates Flatpickr** : trois formats coexistent (ISO `AAAA-MM-JJ` venant d'Apps Script, objets `Date` dans Flatpickr, `JJ/MM/AAAA` envoyé au script). Toujours créer les dates avec `'T00:00:00'` (heure locale) pour éviter un décalage d'un jour lié au fuseau. Tester sur un changement de mois.
- **Changer un prix = plusieurs endroits** : `reservation.js`, l'onglet Paramètres du Sheet (le script recalcule le prix payé), le texte de `index.html` (hero, infos, récap prix), le JSON-LD en haut de `index.html` (`priceRange`) et `cgv.html`.
- Avis : la note et le nombre d'avis sont aussi dans le JSON-LD (`aggregateRating`) ; les mettre à jour en même temps que la section `#avis`.
- Le numéro de téléphone est écrit en dur à plusieurs endroits (HTML + messages d'erreur de `reservation.js`).
- `_headers` (règles de cache) n'a **aucun effet** : GitHub Pages ignore ce fichier et impose son propre cache (10 min).
- **Toute modif desktop doit aussi fonctionner en responsive.** Avant de proposer un changement, vérifier ce que `responsive.css` redéfinit pour les mêmes éléments (paliers : 1024, 900, 768 et 480 px), et tester au moins à 375 px (téléphone), 768 px (tablette) et 1280 px (ordinateur). Attention à `infoSheet.js`, actif seulement sous 768 px.

## Déploiement
- Le repo est **public**. Ne jamais y mettre de secret, de mot de passe, d'IBAN ou de code d'accès.
- Hébergement : **GitHub Pages** (branche `main`, domaine via `CNAME`).
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
