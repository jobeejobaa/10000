import { useState, useEffect, useCallback } from 'react';
import { GameBoard } from './GameBoard.jsx';
import { Scoreboard } from './Scoreboard.jsx';
import { ShakePermissionBanner } from './ShakePermissionBanner.jsx';
import { useTurn } from '../hooks/useTurn.js';
import { useShakeDetection } from '../hooks/useShakeDetection.js';
import { getCurrentPlayer } from '../game/gameState.js';
import './GameScreen.css';

export function GameScreen({ game, onTurnEnd }) {
  const { turn, roll, toggleDieSelection, getSelectionScore, setAsideSelection, bank, resetTurn } =
    useTurn();
  const [isRolling, setIsRolling] = useState(false);

  const currentPlayer = getCurrentPlayer(game);

  // Réinitialise le tour quand on passe au joueur suivant.
  useEffect(() => {
    resetTurn();
  }, [game.currentPlayerIndex, resetTurn]);

  const handleRoll = useCallback(() => {
    if (turn.phase !== 'ready') return;
    setIsRolling(true);
    roll();
    setTimeout(() => setIsRolling(false), 500);
  }, [turn.phase, roll]);

  const { isSupported, permissionState, requestPermission } = useShakeDetection(handleRoll);
  const needsPermissionPrompt = isSupported && permissionState === 'unknown';
  const shakeIsActive = isSupported && (permissionState === 'granted' || permissionState === 'not-required');

  // Fin de tour automatique sur farkle : on notifie le parent après un court délai
  // pour laisser le temps au message de s'afficher.
  useEffect(() => {
    if (turn.phase === 'farkled') {
      const timeout = setTimeout(() => onTurnEnd(0, true), 1400);
      return () => clearTimeout(timeout);
    }
    if (turn.phase === 'banked') {
      onTurnEnd(turn.turnScore, false);
    }
  }, [turn.phase, turn.turnScore, onTurnEnd]);

  const selection = getSelectionScore();
  const canRoll = turn.phase === 'ready';
  const canBank = turn.phase === 'ready' && turn.turnScore > 0;
  const canSetAside = turn.phase === 'rolled' && selection.isFullyScoring && selection.points > 0;

  return (
    <div className="game-screen">
      {needsPermissionPrompt && <ShakePermissionBanner onRequestPermission={requestPermission} />}

      <Scoreboard players={game.players} currentPlayerIndex={game.currentPlayerIndex} />

      <p className="game-screen__turn-label">Au tour de {currentPlayer.name}</p>

      <GameBoard
        dice={turn.dice}
        selectedIndices={turn.selectedIndices}
        canSelect={turn.phase === 'rolled'}
        onToggleDie={toggleDieSelection}
        isRolling={isRolling}
        shakeIsActive={shakeIsActive}
      />

      <div className="game-screen__turn-score">
        <span className="game-screen__turn-score-label">Points du tour</span>
        <span className="game-screen__turn-score-value">{turn.turnScore}</span>
      </div>

      {turn.phase === 'farkled' && (
        <p className="game-screen__message game-screen__message--danger">
          Farkle ! Aucune combinaison possible, les points du tour sont perdus.
        </p>
      )}

      {turn.phase === 'rolled' && !canSetAside && selection.points === 0 && turn.selectedIndices.length > 0 && (
        <p className="game-screen__message">
          Cette sélection ne rapporte aucun point. Choisis des dés qui forment une combinaison valable.
        </p>
      )}

      {turn.phase === 'rolled' && selection.points > 0 && !selection.isFullyScoring && (
        <p className="game-screen__message">
          Il reste des dés sélectionnés qui ne comptent pas. Retire-les avant de valider.
        </p>
      )}

      <div className="game-screen__controls">
        {turn.phase === 'rolled' && (
          <button
            type="button"
            className="game-screen__btn game-screen__btn--secondary"
            onClick={setAsideSelection}
            disabled={!canSetAside}
          >
            Mettre de côté ({selection.points} pts)
          </button>
        )}

        {canRoll && (
          <button
            type="button"
            className={`game-screen__btn game-screen__btn--primary${!shakeIsActive ? ' game-screen__btn--pulse' : ''}`}
            onClick={handleRoll}
          >
            Lancer les dés
          </button>
        )}

        {canBank && (
          <button type="button" className="game-screen__btn game-screen__btn--gold" onClick={bank}>
            Garder {turn.turnScore} points
          </button>
        )}
      </div>
    </div>
  );
}
