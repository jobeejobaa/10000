/**
 * Logique du bot pour le jeu du 10 000.
 *
 * Toutes les fonctions sont pures : pas de state React, pas d'effets de bord.
 * Le bot joue en deux temps à chaque lancer :
 *   1. Il choisit la meilleure sélection de dés à mettre de côté (bestSelection)
 *   2. Il décide ensuite de relancer ou s'arrêter (decideBotAction)
 */

import { scoreSelection } from './scoring.js';
import { MINIMUM_SCORE_TO_OPEN } from './scoring.js';

/**
 * Trouve la sélection d'indices de dés qui maximise les points,
 * en s'assurant que tous les dés sélectionnés contribuent au score
 * (isFullyScoring === true).
 *
 * Algorithme : teste toutes les sous-ensembles possibles (2^n, n ≤ 5 = max 32).
 *
 * @param {number[]} dice - les valeurs des dés lancés
 * @returns {number[]} indices à mettre de côté (tableau vide si aucune combo)
 */
export function bestSelection(dice) {
  const n = dice.length;
  let best = { points: 0, indices: [] };

  for (let mask = 1; mask < (1 << n); mask++) {
    const indices = [];
    const values = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        indices.push(i);
        values.push(dice[i]);
      }
    }
    const { points, isFullyScoring } = scoreSelection(values);
    if (isFullyScoring && points > best.points) {
      best = { points, indices };
    }
  }

  return best.indices;
}

/**
 * Décide si le bot doit relancer ('roll') ou s'arrêter ('bank').
 *
 * Stratégie :
 * - Hot dice (vient de tout mettre de côté) : relance toujours, c'est gratuit
 * - Pas encore ouvert son score : relance jusqu'à atteindre 500 minimum
 * - Peu de dés restants (≤ 2) : trop risqué → s'arrête
 * - Seuil adaptatif : plus de dés disponibles = plus audacieux
 *
 * @param {number} turnScore - points accumulés ce tour
 * @param {number} diceAvailable - dés restants disponibles pour la prochaine relance
 * @param {{ hasOpenedScore: boolean }} player - état du joueur courant
 * @returns {'roll' | 'bank'}
 */
export function decideBotAction(turnScore, diceAvailable, player) {
  // Hot dice : tous les dés ont scoré, on repart avec 5 dés sans rien risquer
  if (diceAvailable === 5 && turnScore > 0) return 'roll';

  // Pas encore d'ouverture : continuer jusqu'à atteindre le minimum
  if (!player.hasOpenedScore) {
    if (turnScore >= MINIMUM_SCORE_TO_OPEN) return 'bank';
    return 'roll';
  }

  // Trop peu de dés : probabilité de farkle trop élevée
  if (diceAvailable <= 2) return 'bank';

  // Seuil adaptatif : avec plus de dés, on peut viser plus haut
  const threshold = diceAvailable >= 4 ? 900 : 700;
  return turnScore >= threshold ? 'bank' : 'roll';
}
