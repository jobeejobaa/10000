# Le 10 000 — jeu de dés (version 5 dés)

Jeu du 10 000 en React, jouable à 1-4 joueurs. Secoue le téléphone pour lancer les dés.
Déployé sur Vercel : [10000-tau.vercel.app](https://10000-tau.vercel.app)

## Modes de jeu

**1 joueur** — toi contre un bot. Le bot joue automatiquement avec une stratégie adaptative (seuil de score selon le nombre de dés restants).

**2-4 joueurs, "On joue ici !"** — tous les joueurs partagent le même téléphone, tour par tour. Dés virtuels, scores calculés automatiquement.

**2-4 joueurs, "J'ai mes dés !"** — chacun joue avec ses vrais dés, l'appli sert de feuille de score numérique. Saisie manuelle des points tour par tour.

**En ligne 🌐** — chaque joueur est sur son propre téléphone. Dés virtuels synchronisés en temps réel via Firebase. Le joueur en attente voit le plateau de l'adversaire en direct.

## Règles implémentées

- 5 dés
- 1 seul = 100 pts, 5 seul = 50 pts
- Brelan (3 identiques) = valeur × 100 (brelan de 1 = 1000 pts)
- Carré (4 identiques) = brelan × 1,5 — ex : 4×5 = 750 pts
- Cinq identiques = brelan × 2
- Suite 1-2-3-4-5 ou 2-3-4-5-6 = 1000 pts
- Quand tous les 5 dés scorent, les dés scorants sont automatiquement mis de côté et tous les 5 dés sont relancés (hot dice)
- Les dés scorants sont auto-sélectionnés (meilleure combinaison), pas de sélection manuelle
- Farkle (aucune combinaison au lancer) = tour arrêté, points du tour perdus, +1 croix
- 3 farkles consécutifs = −1000 pts sur le score total (uniquement après ouverture du score)
- 500 points minimum sur un même tour pour ouvrir son score
- Il faut tomber **exactement** sur 10 000 pour gagner
- Dépasser 10 000 = tour annulé, score inchangé, **pas** de farkle
- La partie s'arrête immédiatement dès qu'un joueur atteint 10 000 (pas de dernier tour)

## Auto-sélection et animation

Les dés scorants sont détectés automatiquement (meilleure combinaison via algorithme exhaustif). L'animation se déroule en 3 temps :

1. Les dés roulent sur le plateau (500 ms)
2. Les dés scorants brillent en or sur le plateau (500 ms)
3. Les dés scorants s'envolent vers la zone "Mis de côté" au-dessus du plateau avec un effet de rebond en cascade

Deux boutons seulement : **Relancer X dés** ou **Garder N pts**.

## Multijoueur en ligne

Chaque joueur rejoint la partie depuis son propre téléphone. Les scores et l'état du plateau se synchronisent en temps réel via **Firebase Realtime Database**.

- Le joueur en attente voit le plateau adverse mis à jour à chaque lancer (zone aside + dés restants + score du tour)
- Si tu fermes la page par erreur, une bannière "Reprendre la partie" apparaît au prochain lancement de l'app
- Si tu te souviens du code, tu peux aussi rejoindre manuellement : l'app te reconnecte même si la partie est déjà lancée (ton UID est reconnu)

### Mise en place Firebase (à faire une fois)

1. Va sur [console.firebase.google.com](https://console.firebase.google.com) et crée un projet
2. **Build → Realtime Database** → Créer une base de données → choisir une région → mode test
3. **Build → Authentication** → Méthode de connexion → Connexion anonyme → Activer
4. **⚙️ Paramètres du projet** → Ajouter une application Web → copie l'objet `firebaseConfig`
5. Colle ta config dans `src/firebase.js` (remplace les `'REMPLACE_MOI'`)
6. Dans Realtime Database → Règles :

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

### Utilisation

1. Un joueur sélectionne **"En ligne 🌐"** → **"Créer une salle"** → entre son prénom → reçoit un code à 4 lettres (ex : `KZAB`)
2. Les autres ouvrent l'app → **"Rejoindre"** → entrent le code et leur prénom
3. L'hôte voit tous les joueurs connectés et clique **"Lancer la partie"**
4. Chaque joueur joue son tour depuis son téléphone ; les autres voient le plateau en temps réel

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
    gameState.js      gestion de partie : joueurs, tours, victoire, bust
    bot.js            logique du bot : meilleure sélection + décision roll/bank
  hooks/
    useTurn.js            pilote le déroulement d'un tour (auto-sélection)
    useShakeDetection.js  détection de la secousse via l'accéléromètre
    useRoom.js            gestion de salle Firebase (créer, rejoindre, sync, vue spectateur)
  components/
    SetupScreen             écran d'accueil : config joueurs, mode, historique, reprise de partie
    GameScreen              écran de jeu numérique (dés virtuels, animation, bust)
    ScoreSheet              feuille de score locale (dés physiques)
    MultiplayerScoreSheet   feuille de score synchronisée Firebase
    MultiplayerGameScreen   jeu en ligne avec vue spectateur temps réel
    RoomScreen              création / connexion / reconnexion à une salle en ligne
    GameHistory             historique des parties
    Scoreboard, GameBoard, Die, WinnerScreen...
  utils/
    history.js        sauvegarde/chargement de l'historique (localStorage)
  firebase.js         initialisation Firebase (config à remplir)
  App.jsx             orchestration des écrans
```

## Déploiement

```bash
npm run build
vercel --prod
```
