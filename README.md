# Le 10 000 — jeu de dés (version 5 dés)

Jeu du 10 000 en React, jouable à 1-4 joueurs. Secoue le téléphone pour lancer les dés.
Déployé sur Vercel : [10000-tau.vercel.app](https://10000-tau.vercel.app)

## Modes de jeu

**1 joueur** — toi contre un bot. Le bot joue automatiquement avec une stratégie adaptative (seuil de score selon le nombre de dés restants).

**2-4 joueurs, "On joue ici !"** — tous les joueurs partagent le même téléphone, tour par tour. Dés virtuels, scores calculés automatiquement.

**2-4 joueurs, "J'ai mes dés !"** — chacun joue avec ses vrais dés, l'appli sert de feuille de score numérique. Saisie manuelle des points tour par tour, validation que les scores sont multiples de 50, 3 farkles consécutifs = −1000 pts.

## Règles implémentées

- 5 dés
- 1 seul = 100 pts, 5 seul = 50 pts
- Brelan (3 identiques) = valeur × 100 (brelan de 1 = 1000 pts)
- Carré (4 identiques) = brelan × 2, cinq identiques = brelan × 3
- Suite 1-2-3-4-5 = 500 pts
- Farkle (aucune combinaison au lancer) = tour arrêté, points du tour perdus
- 3 farkles consécutifs = −1000 pts sur le score total
- 500 points minimum sur un même tour pour ouvrir son score
- Premier joueur à atteindre 10 000 points gagne

## Historique des parties

Les résultats sont sauvegardés dans le `localStorage` du navigateur. La page d'accueil affiche les 2 dernières parties et un bouton "Historique des parties" donne accès à tout l'historique (50 parties max).

## PWA — installation sur téléphone

L'app est installable sur l'écran d'accueil comme une vraie app (via `vite-plugin-pwa`), jouable hors-ligne après une première visite.

- **Android/Chrome** : bandeau "Ajouter à l'écran d'accueil" ou menu ⋮ → "Installer l'application"
- **iPhone/Safari** : bouton Partager → "Sur l'écran d'accueil"

## Lancer le projet en local

```bash
npm install
npm run dev
```

## Lancer les tests

```bash
npm test
```

49 tests couvrent la logique de scoring, de gestion de partie et le comportement du bot (`src/game/`), indépendamment de l'UI.

## Structure du projet

```
src/
  game/
    scoring.js        calcul des combinaisons et des points
    gameState.js      gestion de partie : joueurs, tours, victoire
    bot.js            logique du bot : meilleure sélection + décision roll/bank
  hooks/
    useTurn.js            pilote le déroulement d'un tour
    useShakeDetection.js  détection de la secousse via l'accéléromètre
  components/
    SetupScreen       écran d'accueil : config joueurs, mode, historique
    GameScreen        écran de jeu numérique (dés virtuels)
    ScoreSheet        feuille de score pour dés physiques
    GameHistory       historique des parties
    Scoreboard, GameBoard, Die, WinnerScreen...
  utils/
    history.js        sauvegarde/chargement de l'historique (localStorage)
  App.jsx             orchestration des écrans
```

## Déploiement

```bash
npm run build
vercel --prod
```

## Pistes d'amélioration futures

- Multijoueur réseau (WebSockets / Action Cable) — chaque joueur sur son propre téléphone
- Animation 3D des dés
- Son au lancer / à la victoire
- Sauvegarde de partie en cours
