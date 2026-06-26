import { useState, useEffect, useCallback } from 'react';
import { GameBoard } from './GameBoard.jsx';
import { Scoreboard } from './Scoreboard.jsx';
import { Die } from './Die.jsx';
import { ShakePermissionBanner } from './ShakePermissionBanner.jsx';
import { useTurn } from '../hooks/useTurn.js';
import { useShakeDetection } from '../hooks/useShakeDetection.js';
import { getCurrentPlayer, MINIMUM_SCORE_TO_OPEN } from '../game/gameState.js';
import { scoreSelection } from '../game/scoring.js';
import { decideBotAction } from '../game/bot.js';
import './GameScreen.css';

// Délais d'animation pour le bot (en ms)
const BOT_ROLL_DELAY = 900;
const BOT_DECIDE_DELAY = 800;

export function GameScreen({ game, onTurnEnd, onQuit }) {
  const { turn, roll, rollWithSelection, bankWithSelection, resetTurn } = useTurn();
  const [isRolling, setIsRolling] = useState(false);

  const currentPlayer = getCurrentPlayer(game);
  const isBot = currentPlayer.isBot;

  // Réinitialise le tour à chaque nouveau joueur
  useEffect(() => {
    resetTurn();
  }, [game.turnCount, resetTurn]);

  // ── Calculs dérivés ─────────────────────────────────────────────────────────
  // Dés scorants (auto-sélectionnés) vs dés restants à relancer
  const scoringDice = turn.selectedIndices.map((i) => turn.dice[i]);
  const nonScoringDice = turn.dice.filter((_, i) => !turn.selectedIndices.includes(i));
  const selectionScore = turn.phase === 'rolled'
    ? scoreSelection(scoringDice).points
    : 0;
  const totalIfBank = turn.turnScore + selectionScore;
  const remainingDiceCount = nonScoringDice.length === 0 ? 5 : nonScoringDice.length; // 5 si hot dice

  const isHotDice = turn.phase === 'rolled' && nonScoringDice.length === 0;
  const wouldBust = currentPlayer.hasOpenedScore && (currentPlayer.score + totalIfBank) > 10000;
  const canBank = turn.phase === 'rolled'
    && totalIfBank > 0
    && !isHotDice
    && (currentPlayer.hasOpenedScore || totalIfBank >= MINIMUM_SCORE_TO_OPEN)
    && !wouldBust;

  // ── Actions humain ───────────────────────────────────────────────────────────
  const handleRoll = useCallback(() => {
    if (turn.phase !== 'ready') return;
    setIsRolling(true);
    roll();
    setTimeout(() => setIsRolling(false), 500);
  }, [turn.phase, roll]);

  const handleRollWithSelection = useCallback(() => {
    if (turn.phase !== 'rolled') return;
    setIsRolling(true);
    rollWithSelection();
    setTimeout(() => setIsRolling(false), 500);
  }, [turn.phase, rollWithSelection]);

  // Secouement : lance les dés en phase 'ready', relance en phase 'rolled'
  const handleShake = useCallback(() => {
    if (turn.phase === 'ready') handleRoll();
    else if (turn.phase === 'rolled') handleRollWithSelection();
  }, [turn.phase, handleRoll, handleRollWithSelection]);

  const { isSupported, permissionState, requestPermission } = useShakeDetection(handleShake);
  const needsPermissionPrompt = isSupported && permissionState === 'unknown';
  const shakeIsActive = isSupported && (permissionState === 'granted' || permissionState === 'not-required');

  // ── Fin de tour automatique ──────────────────────────────────────────────────
  useEffect(() => {
    if (turn.phase === 'farkled') {
      const timeout = setTimeout(() => onTurnEnd(0, true), 1400);
      return () => clearTimeout(timeout);
    }
    if (turn.phase === 'banked') {
      onTurnEnd(turn.turnScore, false);
    }
  }, [turn.phase, turn.turnScore, onTurnEnd]);

  // ── Tour du bot ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isBot) return;

    // Phase 'ready' : le bot lance toujours au début du tour
    if (turn.phase === 'ready') {
      const timer = setTimeout(handleRoll, BOT_ROLL_DELAY);
      return () => clearTimeout(timer);
    }

    // Phase 'rolled' : auto-sélection déjà faite, bot décide de relancer ou garder
    if (turn.phase === 'rolled') {
      const potentialScore = totalIfBank;
      const decision = decideBotAction(potentialScore, remainingDiceCount, currentPlayer);
      const timer = setTimeout(() => {
        if (decision === 'bank') {
          bankWithSelection();
        } else {
          setIsRolling(true);
          rollWithSelection();
          setTimeout(() => setIsRolling(false), 500);
        }
      }, BOT_DECIDE_DELAY);
      return () => clearTimeout(timer);
    }
  }, [turn.phase, isBot]); // eslint-disable-line react-hooks/exhaustive-deps

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

        <Scoreboard
          players={game.players}
          currentPlayerIndex={game.currentPlayerIndex}
          consecutiveFarkles={game.consecutiveFarkles ?? []}
        />

        <p className="game-screen__turn-label">
          {isBot ? `🤖 ${currentPlayer.name} réfléchit…` : `Au tour de ${currentPlayer.name}`}
        </p>

        {/* ── Zone "mis de côté" — dés scorants auto-sélectionnés ── */}
        {turn.phase === 'rolled' && scoringDice.length > 0 && (
          <div className="game-screen__aside-zone">
            <span className="game-screen__aside-label">Mis de côté</span>
            <div className="game-screen__aside-dice">
              {scoringDice.map((value, i) => (
                <Die
                  key={i}
                  value={value}
                  selected={true}
                  disabled={true}
                  onToggle={() => {}}
                />
              ))}
            </div>
            <span className="game-screen__aside-score">+{selectionScore} pts</span>
          </div>
        )}

        {/* ── Plateau — dés restants à relancer ── */}
        <GameBoard
          dice={turn.phase === 'rolled' ? nonScoringDice : turn.dice}
          selectedIndices={[]}
          canSelect={false}
          onToggleDie={() => {}}
          isRolling={isRolling}
          shakeIsActive={turn.phase === 'ready' && !isBot && shakeIsActive}
        />

        {/* ── Score du tour ── */}
        <div className="game-screen__turn-score">
          <span className="game-screen__turn-score-label">Points du tour</span>
          <span className="game-screen__turn-score-value">
            {turn.phase === 'rolled' ? totalIfBank : turn.turnScore}
          </span>
        </div>

        {/* ── Messages ── */}
        {!isBot && turn.phase === 'ready' && turn.turnScore === 0 && !currentPlayer.hasOpenedScore && (
          <p className="game-screen__message">
            Il te faut {MINIMUM_SCORE_TO_OPEN} pts minimum pour entrer dans la partie.
          </p>
        )}

        {!isBot && isHotDice && (
          <p className="game-screen__message game-screen__message--gold">
            🔥 Hot dice ! Tous tes dés ont scoré — relance les 5 !
          </p>
        )}

        {!isBot && !isHotDice && wouldBust && turn.phase === 'rolled' && (
          <p className="game-screen__message game-screen__message--danger">
            ⚠️ Si tu gardes, tu dépasses 10 000 — ton tour serait annulé !
          </p>
        )}

        {turn.phase === 'farkled' && (
          <p className="game-screen__message game-screen__message--danger">
            Farkle ! Aucune combinaison possible, les points du tour sont perdus.
          </p>
        )}

        {/* ── Boutons ── */}
        {!isBot && (
          <div className="game-screen__controls">
            {turn.phase === 'ready' && (
              <button
                type="button"
                className={`game-screen__btn game-screen__btn--primary${!shakeIsActive ? ' game-screen__btn--pulse' : ''}`}
                onClick={handleRoll}
              >
                Lancer les dés
              </button>
            )}

            {turn.phase === 'rolled' && (
              <>
                {canBank && (
                  <button
                    type="button"
                    className="game-screen__btn game-screen__btn--gold"
                    onClick={bankWithSelection}
                  >
                    Garder {totalIfBank} pts
                  </button>
                )}
                <button
                  type="button"
                  className="game-screen__btn game-screen__btn--primary"
                  onClick={handleRollWithSelection}
                >
                  {isHotDice ? '🔥 Relancer 5 dés' : `Relancer ${remainingDiceCount} dé${remainingDiceCount > 1 ? 's' : ''}`}
                </button>
              </>
            )}

            {turn.phase === 'farkled' && (
              <button
                type="button"
                className="game-screen__btn game-screen__btn--secondary"
                onClick={() => onTurnEnd(0, true)}
              >
                Tour suivant →
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
