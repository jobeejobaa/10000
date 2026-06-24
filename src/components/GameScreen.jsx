import { useState, useEffect, useCallback } from 'react';
import { GameBoard } from './GameBoard.jsx';
import { Scoreboard } from './Scoreboard.jsx';
import { ShakePermissionBanner } from './ShakePermissionBanner.jsx';
import { useTurn } from '../hooks/useTurn.js';
import { useShakeDetection } from '../hooks/useShakeDetection.js';
import { getCurrentPlayer, MINIMUM_SCORE_TO_OPEN } from '../game/gameState.js';
import { bestSelection, decideBotAction } from '../game/bot.js';
import './GameScreen.css';

// Délais d'animation pour le bot (en ms) — assez lents pour être lisibles
const BOT_ROLL_DELAY = 900;
const BOT_DECIDE_DELAY = 800;

export function GameScreen({ game, onTurnEnd, onQuit }) {
  const { turn, roll, toggleDieSelection, getSelectionScore, setAsideSelection, selectAndSetAside, bank, resetTurn } =
    useTurn();
  const [isRolling, setIsRolling] = useState(false);

  const currentPlayer = getCurrentPlayer(game);
  const isBot = currentPlayer.isBot;

  // Réinitialise le tour à chaque nouveau tour (turnCount change même en mode 1 joueur).
  useEffect(() => {
    resetTurn();
  }, [game.turnCount, resetTurn]);

  const handleRoll = useCallback(() => {
    if (turn.phase !== 'ready') return;
    setIsRolling(true);
    roll();
    setTimeout(() => setIsRolling(false), 500);
  }, [turn.phase, roll]);

  const { isSupported, permissionState, requestPermission } = useShakeDetection(handleRoll);
  const needsPermissionPrompt = isSupported && permissionState === 'unknown';
  const shakeIsActive = isSupported && (permissionState === 'granted' || permissionState === 'not-required');

  // Fin de tour automatique sur farkle ou bank
  useEffect(() => {
    if (turn.phase === 'farkled') {
      const timeout = setTimeout(() => onTurnEnd(0, true), 1400);
      return () => clearTimeout(timeout);
    }
    if (turn.phase === 'banked') {
      onTurnEnd(turn.turnScore, false);
    }
  }, [turn.phase, turn.turnScore, onTurnEnd]);

  // ── Automatisation du tour bot ──────────────────────────────────────────────
  useEffect(() => {
    if (!isBot) return;

    // Phase 'ready' : le bot décide de lancer ou de s'arrêter
    if (turn.phase === 'ready') {
      const decision = decideBotAction(turn.turnScore, turn.diceAvailableForRoll, currentPlayer);
      const timer = setTimeout(() => {
        if (decision === 'bank') bank();
        else handleRoll();
      }, BOT_ROLL_DELAY);
      return () => clearTimeout(timer);
    }

    // Phase 'rolled' : le bot sélectionne la meilleure combinaison et la met de côté
    if (turn.phase === 'rolled') {
      const timer = setTimeout(() => {
        const indices = bestSelection(turn.dice);
        if (indices.length > 0) selectAndSetAside(indices);
      }, BOT_DECIDE_DELAY);
      return () => clearTimeout(timer);
    }
  }, [turn.phase, isBot]); // eslint-disable-line react-hooks/exhaustive-deps
  // Note : on exclut volontairement turn.dice, turn.turnScore etc. des dépendances
  // pour éviter de déclencher deux fois la même action. Le bot réagit uniquement
  // aux changements de phase.

  const selection = getSelectionScore();
  const canRoll = turn.phase === 'ready';
  const canBank = turn.phase === 'ready' && turn.turnScore > 0
    && (currentPlayer.hasOpenedScore || turn.turnScore >= MINIMUM_SCORE_TO_OPEN);
  const canSetAside = turn.phase === 'rolled' && selection.isFullyScoring && selection.points > 0;

  return (
    <div className="game-screen">
      <header className="game-screen__header">
        <span className="game-screen__header-title">Le 10 000</span>
        <button type="button" className="game-screen__quit" onClick={onQuit}>
          ✕ Quitter
        </button>
      </header>

      <div className="game-screen__content">

      {needsPermissionPrompt && !isBot && <ShakePermissionBanner onRequestPermission={requestPermission} />}

      <Scoreboard players={game.players} currentPlayerIndex={game.currentPlayerIndex} />

      <p className="game-screen__turn-label">
        {isBot ? `🤖 ${currentPlayer.name} réfléchit…` : `Au tour de ${currentPlayer.name}`}
      </p>

      <GameBoard
        dice={turn.dice}
        selectedIndices={turn.selectedIndices}
        canSelect={!isBot && turn.phase === 'rolled'}
        onToggleDie={toggleDieSelection}
        isRolling={isRolling}
        shakeIsActive={!isBot && shakeIsActive}
      />

      <div className="game-screen__turn-score">
        <span className="game-screen__turn-score-label">Points du tour</span>
        <span className="game-screen__turn-score-value">{turn.turnScore}</span>
      </div>

      {!isBot && turn.phase === 'ready' && turn.turnScore > 0 && !currentPlayer.hasOpenedScore && turn.turnScore < MINIMUM_SCORE_TO_OPEN && (
        <p className="game-screen__message">
          Il te faut {MINIMUM_SCORE_TO_OPEN} pts pour entrer dans la partie — continue à lancer !
        </p>
      )}

      {turn.phase === 'farkled' && (
        <p className="game-screen__message game-screen__message--danger">
          Farkle ! Aucune combinaison possible, les points du tour sont perdus.
        </p>
      )}

      {!isBot && turn.phase === 'rolled' && !canSetAside && selection.points === 0 && turn.selectedIndices.length > 0 && (
        <p className="game-screen__message">
          Cette sélection ne rapporte aucun point. Choisis des dés qui forment une combinaison valable.
        </p>
      )}

      {!isBot && turn.phase === 'rolled' && selection.points > 0 && !selection.isFullyScoring && (
        <p className="game-screen__message">
          Il reste des dés sélectionnés qui ne comptent pas. Retire-les avant de valider.
        </p>
      )}

      {/* Les boutons sont masqués pendant le tour du bot */}
      {!isBot && (
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
      )}

      </div>
    </div>
  );
}
