import { useState, useCallback } from 'react';
import { rollDice, scoreSelection, hasScoringOption } from '../game/scoring.js';
import { bestSelection } from '../game/bot.js';

/**
 * Phases possibles d'un tour :
 * - 'ready'    : en attente du premier lancer
 * - 'rolled'   : dés lancés, sélection automatique des dés scorants
 * - 'farkled'  : aucune combinaison possible, le tour est terminé (perdu)
 * - 'banked'   : le joueur a choisi de s'arrêter, le tour est terminé (gagné)
 */

const INITIAL_DICE_COUNT = 5;

function createInitialTurnState() {
  return {
    phase: 'ready',
    dice: [],
    selectedIndices: [],   // indices des dés scorants (auto-sélectionnés)
    turnScore: 0,          // points accumulés des lancers précédents CE tour
    diceAvailableForRoll: INITIAL_DICE_COUNT,
    lastRollBreakdown: [],
    lastSidedDice: [],     // dés mis de côté au dernier lancer (pour le toast)
    lastSidedScore: 0,
    sidedRollCount: 0,     // entier incrémenté à chaque rollWithSelection (primitif fiable)
  };
}

export function useTurn() {
  const [turn, setTurn] = useState(createInitialTurnState);

  /** Lance les dés et auto-sélectionne la meilleure combinaison scorante. */
  const roll = useCallback(() => {
    setTurn((prev) => {
      if (prev.phase !== 'ready') return prev;
      const newDice = rollDice(prev.diceAvailableForRoll);
      if (!hasScoringOption(newDice)) {
        return { ...prev, phase: 'farkled', dice: newDice, selectedIndices: [], lastRollBreakdown: [] };
      }
      const autoSelected = bestSelection(newDice);
      return { ...prev, phase: 'rolled', dice: newDice, selectedIndices: autoSelected, lastRollBreakdown: [] };
    });
  }, []);

  /**
   * Met de côté les dés auto-sélectionnés ET relance les restants en un seul setState.
   * Si tous les dés scorent (hot dice) → relance 5 nouveaux dés.
   */
  const rollWithSelection = useCallback(() => {
    setTurn((prev) => {
      if (prev.phase !== 'rolled') return prev;
      const selectedValues = prev.selectedIndices.map((i) => prev.dice[i]);
      const { points, isFullyScoring, breakdown } = scoreSelection(selectedValues);
      if (!isFullyScoring || points === 0) return prev;

      const remainingCount = prev.dice.length - prev.selectedIndices.length;
      const diceToRoll = remainingCount === 0 ? INITIAL_DICE_COUNT : remainingCount;
      const newDice = rollDice(diceToRoll);
      const newTurnScore = prev.turnScore + points;

      if (!hasScoringOption(newDice)) {
        return {
          ...prev,
          phase: 'farkled',
          dice: newDice,
          selectedIndices: [],
          turnScore: newTurnScore,
          diceAvailableForRoll: diceToRoll,
          lastRollBreakdown: breakdown,
          lastSidedDice: selectedValues,
          lastSidedScore: points,
          sidedRollCount: prev.sidedRollCount + 1,
        };
      }

      const autoSelected = bestSelection(newDice);
      return {
        ...prev,
        phase: 'rolled',
        dice: newDice,
        selectedIndices: autoSelected,
        turnScore: newTurnScore,
        diceAvailableForRoll: diceToRoll,
        lastRollBreakdown: breakdown,
        lastSidedDice: selectedValues,
        lastSidedScore: points,
        sidedRollCount: prev.sidedRollCount + 1,
      };
    });
  }, []);

  /**
   * Met de côté les dés auto-sélectionnés ET banque (arrêt volontaire).
   * turnScore final = accumulé + points de la sélection courante.
   */
  const bankWithSelection = useCallback(() => {
    setTurn((prev) => {
      if (prev.phase !== 'rolled') return prev;
      const selectedValues = prev.selectedIndices.map((i) => prev.dice[i]);
      const { points, isFullyScoring } = scoreSelection(selectedValues);
      if (!isFullyScoring || points === 0) return prev;
      return { ...prev, phase: 'banked', turnScore: prev.turnScore + points };
    });
  }, []);

  const resetTurn = useCallback(() => {
    setTurn(createInitialTurnState());
  }, []);

  return {
    turn,
    roll,
    rollWithSelection,
    bankWithSelection,
    resetTurn,
  };
}
