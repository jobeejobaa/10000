import { MINIMUM_SCORE_TO_OPEN, TARGET_SCORE } from './scoring.js';

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

  if (!farkled) {
    if (!player.hasOpenedScore) {
      if (turnScore >= MINIMUM_SCORE_TO_OPEN) {
        player.hasOpenedScore = true;
        player.score += turnScore;
      }
      // Si le score du tour est sous le minimum, le joueur ne gagne rien
      // mais ne perd rien non plus : il retentera sa chance au tour suivant.
    } else {
      player.score += turnScore;
    }
  }

  const winnerIndex =
    player.hasOpenedScore && player.score >= TARGET_SCORE ? game.currentPlayerIndex : null;

  const nextPlayerIndex =
    winnerIndex === null ? (game.currentPlayerIndex + 1) % players.length : game.currentPlayerIndex;

  return {
    players,
    currentPlayerIndex: nextPlayerIndex,
    turnCount: game.turnCount + 1,
    winnerIndex,
  };
}

export function getCurrentPlayer(game) {
  return game.players[game.currentPlayerIndex];
}

export function isGameOver(game) {
  // Firebase supprime les null → winnerIndex peut revenir undefined ; on couvre les deux
  return game.winnerIndex != null;
}

export { MINIMUM_SCORE_TO_OPEN, TARGET_SCORE };
