# Le 10 000 — jeu de dés (version 5 dés)

Jeu du 10 000 en React, jouable à 1-4 joueurs en local sur un même téléphone.
Plateau rond façon table de jeu, secoue le téléphone pour lancer les dés.

## Lancer le projet en local

```bash
npm install
npm run dev
```

Puis ouvre l'URL affichée (généralement `http://localhost:5173`).

## Tester le "secoue pour lancer" sur ton téléphone

L'API `DeviceMotion` qui détecte la secousse ne fonctionne que sur une connexion
**HTTPS** ou en localhost. Pour tester sur ton téléphone (pas juste sur ton ordi) :

```bash
npm run dev -- --host
```

Ça affichera une adresse réseau locale (`http://192.168.x.x:5173`). Si ton téléphone
est sur le même Wi-Fi, ça peut suffire — mais Safari sur iOS bloque souvent
DeviceMotion en HTTP non sécurisé. Pour un vrai test fiable sur iPhone, le plus simple
est de déployer sur Vercel (gratuit, HTTPS automatique) :

```bash
npm run build
npx vercel --prod
```

Sur iPhone, un bouton "Activer" apparaît au premier lancement : c'est la permission
obligatoire (iOS 13+) pour autoriser l'accès à l'accéléromètre. Sur Android et desktop,
ce bouton n'apparaît pas (la permission n'est pas requise).

Si l'appareil ne supporte pas du tout l'accéléromètre (desktop sans capteur), il n'y a
pas encore de bouton "lancer" cliquable de secours dans cette version — c'est la
prochaine amélioration à prévoir si tu veux que ça marche aussi au clavier/souris.

## Lancer les tests

```bash
npm test
```

34 tests couvrent toute la logique de scoring et de gestion de partie
(`src/game/scoring.js` et `src/game/gameState.js`), indépendamment de l'UI.

## Structure du projet

```
src/
  game/             logique pure du jeu (aucune dépendance React)
    scoring.js      calcul des combinaisons et des points
    gameState.js    gestion de partie : joueurs, tours, victoire
  hooks/
    useTurn.js          pilote le déroulement d'un tour (lancer/sélection/relance)
    useShakeDetection.js détection de la secousse via l'accéléromètre
  components/       composants d'affichage (plateau, dés, scoreboard, écrans)
  App.jsx           orchestre les 3 écrans : setup, jeu, victoire
```

## Règles implémentées

- 5 dés
- 1 seul = 100 pts, 5 seul = 50 pts
- Brelan (3 identiques) = valeur x100 (brelan de 1 = 1000 pts)
- Carré (4 identiques) = brelan x2, cinq identiques = brelan x3
- Suite 1-2-3-4-5 = 500 pts
- Farkle (aucune combinaison au lancer) = le tour s'arrête, points du tour perdus
- 500 points minimum sur un même tour pour démarrer son score
- Premier joueur à atteindre 10 000 points gagne

## Pistes d'amélioration (volontairement pas faites ici)

- Bouton de lancer manuel pour les appareils sans accéléromètre
- Animation 3D des dés (actuellement juste une rotation 2D au lancer)
- Sauvegarde de partie en cours (actuellement tout est perdu au rafraîchissement)
- Son au lancer / à la victoire

## PWA — installation sur téléphone

L'app est une PWA (via `vite-plugin-pwa`) : installable sur l'écran d'accueil et
jouable hors-ligne après une première visite.

```bash
npm run build
npm run preview
```

Sur le `npm run preview` (ou une fois déployé en HTTPS, ex. Vercel) :

- **Android/Chrome** : un bandeau "Ajouter à l'écran d'accueil" apparaît, ou via le
  menu ⋮ → "Installer l'application".
- **iPhone/Safari** : bouton Partager → "Sur l'écran d'accueil".

Ce que ça donne concrètement :

- icône d'app dédiée (vert feutre / dé crème, dans `public/icon-*.png`)
- lancement en plein écran, sans barre d'adresse (`display: standalone`)
- le service worker (généré dans `dist/sw.js` au build) précache tout l'app shell,
  donc le jeu reste jouable même sans réseau une fois ouvert une première fois
- mise à jour automatique du service worker à chaque nouveau déploiement
  (`registerType: 'autoUpdate'`)

Fichiers ajoutés : `public/icon-192.png`, `public/icon-512.png`,
`public/icon-512-maskable.png`, `public/apple-touch-icon.png`,
`public/favicon-32.png`, config PWA dans `vite.config.js`, meta tags iOS dans
`index.html`.
