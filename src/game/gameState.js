import { MINIMUM_SCORE_TO_OPEN, TARGET_SCORE, TRIPLE_FARKLE_PENALTY } from './scoring.js';

/**
 * Crée l'état initial d'une partie.
 * @param {Array<string | { name: string, isBot?: boolean }>} playerDefs
 */
export function createGame(playerDefs) {
  return {
    players: playerDefs.map((def) => {
      const name = typeof def === 'string' ? def : def.name;
      const isBot = typeof def === 'string' ? false : (def.isBot ?? false);
      return { name, isBot, score: 0, hasOpenedScore: false };
    }),
    currentPlayerIndex: 0,
    turnCount: 0,
    winnerIndex: null,
    consecutiveFarkles: playerDefs.map(() => 0),
  };
}

/**
 * Applique le résultat d'un tour terminé (farkle ou arrêt volontaire) à la partie,
 * et passe au joueur suivant. Ne mute jamais l'objet reçu : renvoie un nouvel état.
 *
 * @param {object} game - état de la partie
 * @param {number} turnScore - points accumulés pendant le tour
 * @param {boolean} farkled - true si le tour s'est terminé par un farkle
 * @returns {object} nouvel état de la partie
 */
export function applyTurnResult(game, turnScore, farkled) {
  const players = game.players.map((p) => ({ ...p }));
  const player = players[game.currentPlayerIndex];
  const idx = game.currentPlayerIndex;

  // Farkles consécutifs (Firebase peut renvoyer undefined si tableau absent)
  const consecutiveFarkles = [...(game.consecutiveFarkles ?? players.map(() => 0))];

  if (farkled) {
    consecutiveFarkles[idx] += 1;
    if (consecutiveFarkles[idx] >= 3) {
      // Triple farkle : pénalité -1000, remise à zéro du compteur
      player.score += TRIPLE_FARKLE_PENALTY;
      consecutiveFarkles[idx] = 0;
    }
  } else {
    consecutiveFarkles[idx] = 0;
    const potentialScore = player.score + turnScore;
    const isBust = potentialScore > TARGET_SCORE;

    if (!isBust) {
      if (!player.hasOpenedScore) {
        if (turnScore >= MINIMUM_SCORE_TO_OPEN) {
          player.hasOpenedScore = true;
          player.score = potentialScore;
        }
        // Sous le minimum pour ouvrir : rien ne change
      } else {
        player.score = potentialScore;
      }
    }
    // Bust (dépasse 10 000) : score inchangé, pas de pénalité
  }

  // Victoire = tomber pile sur 10 000 (pas au-dessus)
  const winnerIndex =
    player.hasOpenedScore && player.score === TARGET_SCORE ? game.currentPlayerIndex : null;

  const nextPlayerIndex =
    winnerIndex === null ? (game.currentPlayerIndex + 1) % players.length : game.currentPlayerIndex;

  return {
    players,
    currentPlayerIndex: nextPlayerIndex,
    turnCount: game.turnCount + 1,
    winnerIndex,
    consecutiveFarkles,
  };
}

export function getCurrentPlayer(game) {
  return game.players[game.currentPlayerIndex];
}

export function isGameOver(game) {
  // Firebase supprime les null → winnerIndex peut revenir undefined ; on couvre les deux
  return game.winnerIndex != null;
}

export { MINIMUM_SCORE_TO_OPEN, TARGET_SCORE, TRIPLE_FARKLE_PENALTY };
