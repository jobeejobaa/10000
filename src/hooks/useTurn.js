import { useState, useCallback } from 'react';
import { rollDice, scoreSelection, hasScoringOption } from '../game/scoring.js';

/**
 * Phases possibles d'un tour :
 * - 'ready'    : en attente du premier lancer
 * - 'rolled'   : dés lancés, le joueur doit sélectionner une combinaison
 * - 'farkled'  : aucune combinaison possible, le tour est terminé (perdu)
 * - 'banked'   : le joueur a choisi de s'arrêter, le tour est terminé (gagné)
 */

const INITIAL_DICE_COUNT = 5;

function createInitialTurnState() {
  return {
    phase: 'ready',
    dice: [],
    selectedIndices: [],
    turnScore: 0,
    diceAvailableForRoll: INITIAL_DICE_COUNT,
    lastRollBreakdown: [],
  };
}

export function useTurn() {
  const [turn, setTurn] = useState(createInitialTurnState);

  const roll = useCallback(() => {
    setTurn((prev) => {
      const newDice = rollDice(prev.diceAvailableForRoll);
      const farkled = !hasScoringOption(newDice);
      return {
        ...prev,
        phase: farkled ? 'farkled' : 'rolled',
        dice: newDice,
        selectedIndices: [],
        lastRollBreakdown: [],
      };
    });
  }, []);

  const toggleDieSelection = useCallback((index) => {
    setTurn((prev) => {
      if (prev.phase !== 'rolled') return prev;
      const isSelected = prev.selectedIndices.includes(index);
      const selectedIndices = isSelected
        ? prev.selectedIndices.filter((i) => i !== index)
        : [...prev.selectedIndices, index];
      return { ...prev, selectedIndices };
    });
  }, []);

  /**
   * Renvoie le résultat du scoring pour la sélection actuelle.
   * Utilisé par l'UI pour activer/désactiver le bouton "mettre de côté".
   */
  const getSelectionScore = useCallback(() => {
    const selectedValues = turn.selectedIndices.map((i) => turn.dice[i]);
    return scoreSelection(selectedValues);
  }, [turn.dice, turn.selectedIndices]);

  /**
   * Met de côté les dés sélectionnés (doit former une combinaison valable),
   * ajoute leurs points au score du tour, et prépare la relance des dés restants.
   * Si tous les dés sont mis de côté (hot dice), recharge un lancer de 5 dés.
   */
  const setAsideSelection = useCallback(() => {
    setTurn((prev) => {
      const selectedValues = prev.selectedIndices.map((i) => prev.dice[i]);
      const { points, isFullyScoring, breakdown } = scoreSelection(selectedValues);
      if (!isFullyScoring || points === 0) return prev;

      const remainingCount = prev.dice.length - prev.selectedIndices.length;
      const nextDiceAvailable = remainingCount === 0 ? INITIAL_DICE_COUNT : remainingCount;

      return {
        ...prev,
        phase: 'ready', // prêt à relancer (ou le joueur peut s'arrêter ici)
        dice: [],
        selectedIndices: [],
        turnScore: prev.turnScore + points,
        diceAvailableForRoll: nextDiceAvailable,
        lastRollBreakdown: breakdown,
      };
    });
  }, []);

  /**
   * Action atomique pour le bot : sélectionne les dés aux indices donnés
   * et les met de côté en un seul setState (évite les problèmes de batching React).
   * @param {number[]} indices
   */
  const selectAndSetAside = useCallback((indices) => {
    setTurn((prev) => {
      const selectedValues = indices.map((i) => prev.dice[i]);
      const { points, isFullyScoring, breakdown } = scoreSelection(selectedValues);
      if (!isFullyScoring || points === 0) return prev;
      const remainingCount = prev.dice.length - indices.length;
      const nextDiceAvailable = remainingCount === 0 ? INITIAL_DICE_COUNT : remainingCount;
      return {
        ...prev,
        phase: 'ready',
        dice: [],
        selectedIndices: [],
        turnScore: prev.turnScore + points,
        diceAvailableForRoll: nextDiceAvailable,
        lastRollBreakdown: breakdown,
      };
    });
  }, []);

  /**
   * Le joueur choisit de s'arrêter et de garder les points accumulés ce tour.
   */
  const bank = useCallback(() => {
    setTurn((prev) => ({ ...prev, phase: 'banked' }));
  }, []);

  const resetTurn = useCallback(() => {
    setTurn(createInitialTurnState());
  }, []);

  return {
    turn,
    roll,
    toggleDieSelection,
    getSelectionScore,
    setAsideSelection,
    selectAndSetAside,
    bank,
    resetTurn,
  };
}
