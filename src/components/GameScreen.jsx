import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { GameBoard } from './GameBoard.jsx';
import { Scoreboard } from './Scoreboard.jsx';
import { useTurn } from '../hooks/useTurn.js';
import { useShakeDetection } from '../hooks/useShakeDetection.js';
import { getCurrentPlayer, MINIMUM_SCORE_TO_OPEN } from '../game/gameState.js';
import { scoreSelection } from '../game/scoring.js';
import { decideBotAction } from '../game/bot.js';
import './GameScreen.css';

const BOT_ROLL_DELAY = 900;
const BOT_DECIDE_DELAY = 800;

// Durées de l'animation en ms
const ROLLING_DURATION = 500;    // animation des dés qui roulent
const PAUSE_ON_BOARD = 500;      // pause où les dés scorants sont visibles en or
const TOTAL_SHOW = ROLLING_DURATION + PAUSE_ON_BOARD; // 1000ms avant envol

export function GameScreen({ game, onTurnEnd, onQuit, onTurnProgress }) {
  const { turn, roll, rollWithSelection, bankWithSelection, resetTurn } = useTurn();
  const [isRolling, setIsRolling] = useState(false);
  // true = tous les dés affichés sur le plateau (phase intermédiaire avant l'envol)
  const [showAllOnBoard, setShowAllOnBoard] = useState(false);
  // IDs des toasts "mis de côté" accumulés dans le tour (pour dismiss au changement de tour)
  const asideToastIdsRef = useRef([]);
  const currentPlayer = getCurrentPlayer(game);
  const isBot = currentPlayer.isBot;

  useEffect(() => {
    resetTurn();
  }, [game.turnCount, resetTurn]);

  // ── Calculs dérivés ──────────────────────────────────────────────────────────
  const scoringDice = turn.selectedIndices.map((i) => turn.dice[i]);
  const nonScoringDice = turn.dice.filter((_, i) => !turn.selectedIndices.includes(i));
  const selectionScore = turn.phase === 'rolled' ? scoreSelection(scoringDice).points : 0;

  const totalIfBank = turn.turnScore + selectionScore;
  const remainingDiceCount = nonScoringDice.length === 0 ? 5 : nonScoringDice.length;
  const isHotDice = turn.phase === 'rolled' && nonScoringDice.length === 0;
  const wouldBust = currentPlayer.hasOpenedScore && (currentPlayer.score + totalIfBank) > 10000;
  const isWinningBank = currentPlayer.hasOpenedScore && totalIfBank === 10000;
  const canBank = turn.phase === 'rolled' && !showAllOnBoard
    && totalIfBank > 0 && (!isHotDice || isWinningBank)
    && (currentPlayer.hasOpenedScore || totalIfBank >= MINIMUM_SCORE_TO_OPEN)
    && !wouldBust;

  // ── Lancers avec animation en 2 temps ────────────────────────────────────────
  /**
   * Lance les dés depuis la phase 'ready'.
   * 1) isRolling = true  → animation des dés (500ms)
   * 2) Pause courte où les dés scorants brillent en or sur le plateau (500ms)
   * 3) showAllOnBoard = false → les dés scorants s'envolent vers la zone aside
   */
  const doRoll = useCallback(() => {
    if (turn.phase !== 'ready' || showAllOnBoard) return;
    setShowAllOnBoard(true);
    setIsRolling(true);
    roll();
    setTimeout(() => setIsRolling(false), ROLLING_DURATION);
    setTimeout(() => setShowAllOnBoard(false), TOTAL_SHOW);
  }, [turn.phase, showAllOnBoard, roll]);

  /**
   * Met de côté les dés scorants ET relance les restants (ou 5 si hot dice).
   * Même séquence d'animation que doRoll.
   */
  // Pas de useCallback — fonction normale pour toujours lire les valeurs du rendu courant
  function doRollWithSelection() {
    if (turn.phase !== 'rolled' || showAllOnBoard) return;
    const diceSidelined = turn.selectedIndices.map(i => turn.dice[i]);
    const scoreSidelined = scoreSelection(diceSidelined).points;
    if (diceSidelined.length > 0 && !isBot) {
      const id = toast.info(
        <span>Mis de côté 🎲 {diceSidelined.join(' · ')} &nbsp;<strong>+{scoreSidelined} pts</strong></span>,
        { autoClose: 5000 }
      );
      if (id) asideToastIdsRef.current.push(id);
    }
    setShowAllOnBoard(true);
    setIsRolling(true);
    rollWithSelection();
    setTimeout(() => setIsRolling(false), ROLLING_DURATION);
    setTimeout(() => setShowAllOnBoard(false), TOTAL_SHOW);
  }

  // Secouement : fonctionne pour le premier lancer ET les relances
  const handleShake = useCallback(() => {
    if (turn.phase === 'ready') doRoll();
    else if (turn.phase === 'rolled') doRollWithSelection();
  }, [turn.phase, doRoll, doRollWithSelection]);

  const { isSupported, permissionState, requestPermission } = useShakeDetection(handleShake);
  const needsPermissionPrompt = isSupported && permissionState === 'unknown';
  const shakeIsActive = isSupported && (permissionState === 'granted' || permissionState === 'not-required');

  // ── Sync état du tour vers Firebase (vue spectateur multijoueur) ──────────
  useEffect(() => {
    if (!onTurnProgress || isBot) return;
    if (turn.phase === 'rolled') {
      onTurnProgress({
        phase: 'rolled',
        dice: turn.dice,
        selectedIndices: turn.selectedIndices,
        turnScore: turn.turnScore,
        selectionScore,
        totalIfBank,
        showAllOnBoard,
      });
    } else if (turn.phase === 'farkled') {
      onTurnProgress({ phase: 'farkled', dice: turn.dice, selectedIndices: [] });
    }
  // onTurnProgress et les valeurs dérivées (selectionScore, totalIfBank…) changent à chaque
  // rendu — les inclure créerait des boucles infinies. On réagit uniquement aux phases clés.
  }, [turn.phase, showAllOnBoard]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Victoire exacte à 10 000 : bank automatique ──────────────────────────────
  useEffect(() => {
    if (turn.phase !== 'rolled' || showAllOnBoard || !isWinningBank) return;
    const timeout = setTimeout(() => onTurnEnd(totalIfBank, false), 1200);
    return () => clearTimeout(timeout);
  // totalIfBank est recalculé à chaque rendu — l'inclure déclencherait l'effet en boucle.
  // On réagit sur isWinningBank (dérivé stable) et on lit totalIfBank via la closure du rendu courant.
  }, [turn.phase, showAllOnBoard, isWinningBank]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Bust : fin de tour auto quand on dépasse 10 000 (pas un farkle) ─────────
  useEffect(() => {
    if (turn.phase !== 'rolled' || showAllOnBoard || !wouldBust) return;
    const timeout = setTimeout(() => onTurnEnd(totalIfBank, false), 1500);
    return () => clearTimeout(timeout);
  // Même raison que ci-dessus : totalIfBank et onTurnEnd sont stables dans la pratique
  // mais formellement recréés — les exclure évite des re-souscriptions inutiles.
  }, [turn.phase, showAllOnBoard, wouldBust]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tour du bot ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isBot) return;

    if (turn.phase === 'ready') {
      const timer = setTimeout(doRoll, BOT_ROLL_DELAY);
      return () => clearTimeout(timer);
    }

    if (turn.phase === 'rolled' && !showAllOnBoard && !wouldBust && !isWinningBank) {
      const decision = decideBotAction(totalIfBank, remainingDiceCount, currentPlayer);
      const timer = setTimeout(() => {
        if (decision === 'bank') bankWithSelection();
        else doRollWithSelection();
      }, BOT_DECIDE_DELAY);
      return () => clearTimeout(timer);
    }
  // doRoll/doRollWithSelection sont recréés à chaque rendu (fonctions non-mémoïsées) ;
  // les inclure causerait une boucle. On se synchronise sur les états qui changent réellement.
  }, [turn.phase, isBot, showAllOnBoard, wouldBust]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toasts ───────────────────────────────────────────────────────────────────

  // Dismiss tous les toasts de jeu à chaque nouveau tour
  useEffect(() => {
    asideToastIdsRef.current.forEach(id => toast.dismiss(id));
    asideToastIdsRef.current = [];
    toast.dismiss('hot-dice');
    toast.dismiss('bust');
    toast.dismiss('farkle');
    toast.dismiss('winning-bank');
  }, [game.turnCount]);



  // Hot dice
  useEffect(() => {
    if (isBot || showAllOnBoard || isWinningBank) return;
    if (isHotDice) {
      toast('🔥 Hot dice ! Tous tes dés ont scoré — relance les 5 !', {
        toastId: 'hot-dice',
        autoClose: 5000,
      });
    }
  }, [isHotDice, showAllOnBoard, isWinningBank, isBot]);

  // Bust
  useEffect(() => {
    if (isBot || showAllOnBoard) return;
    if (wouldBust && turn.phase === 'rolled') {
      toast.error('💥 Tu dépasses 10 000 — ton tour est annulé !', {
        toastId: 'bust',
        autoClose: 5000,
      });
    }
  }, [wouldBust, turn.phase, showAllOnBoard, isBot]);

  // Victoire exacte
  useEffect(() => {
    if (isBot || showAllOnBoard) return;
    if (isWinningBank) {
      toast.success('🎉 10 000 points pile — tu gagnes !', {
        toastId: 'winning-bank',
        autoClose: false,
      });
    }
  }, [isWinningBank, showAllOnBoard, isBot]);

  // Farkle
  useEffect(() => {
    if (isBot) return;
    if (turn.phase === 'farkled') {
      toast.error('Farkle ! Aucune combinaison possible, les points du tour sont perdus.', {
        toastId: 'farkle',
        autoClose: 5000,
      });
    }
  }, [turn.phase, isBot]);

  // Shake permission (toast avec bouton "Activer")
  useEffect(() => {
    if (isBot) return;
    if (needsPermissionPrompt) {
      toast.info(
        ({ closeToast }) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span>Active la détection de mouvement pour secouer et lancer les dés</span>
            <button
              type="button"
              onClick={() => { requestPermission(); closeToast(); }}
              style={{
                alignSelf: 'flex-start',
                padding: '4px 14px',
                borderRadius: '6px',
                border: 'none',
                background: '#fff',
                color: '#111',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Activer
            </button>
          </div>
        ),
        {
          toastId: 'shake-permission',
          autoClose: false,
          closeOnClick: false,
        }
      );
    } else {
      toast.dismiss('shake-permission');
    }
  }, [needsPermissionPrompt, isBot, requestPermission]);

  // ── Dés affichés sur le plateau ──────────────────────────────────────────────
  // showAllOnBoard=true → tous les dés (scorants=or, autres=estompés)
  // showAllOnBoard=false en phase rolled → seulement les dés restants
  const boardDice = turn.phase === 'rolled'
    ? (showAllOnBoard ? turn.dice : nonScoringDice)
    : turn.dice;
  const boardSelected = turn.phase === 'rolled' && showAllOnBoard ? turn.selectedIndices : [];

  return (
    <div className="game-screen">
      <header className="game-screen__header">
        <span className="game-screen__header-title">Le 10 000</span>
        <button type="button" className="game-screen__quit" onClick={onQuit}>
          ✕ Quitter
        </button>
      </header>

      <div className="game-screen__content">

        <Scoreboard
          players={game.players}
          currentPlayerIndex={game.currentPlayerIndex}
          consecutiveFarkles={game.consecutiveFarkles ?? []}
        />

        <p className="game-screen__turn-label">
          {isBot ? `🤖 ${currentPlayer.name} réfléchit…` : `Au tour de ${currentPlayer.name}`}
        </p>

        {/* ── Plateau ── */}
        <GameBoard
          dice={boardDice}
          selectedIndices={boardSelected}
          canSelect={false}
          onToggleDie={() => {}}
          isRolling={isRolling}
          shakeIsActive={turn.phase === 'ready' && !isBot && shakeIsActive}
        />

        {/* ── Score du tour ── */}
        <div className="game-screen__turn-score">
          <span className="game-screen__turn-score-label">Points du tour</span>
          <span className="game-screen__turn-score-value">
            {turn.phase === 'rolled' && !showAllOnBoard ? totalIfBank : turn.turnScore}
          </span>
        </div>

        {/* ── Message minimum score ── */}
        {!isBot && turn.phase === 'ready' && turn.turnScore === 0 && !currentPlayer.hasOpenedScore && (
          <p className="game-screen__message">
            Il te faut {MINIMUM_SCORE_TO_OPEN} pts minimum pour entrer dans la partie.
          </p>
        )}

        {/* ── Boutons ── */}
        {!isBot && (
          <div className="game-screen__controls">
            {turn.phase === 'ready' && (
              <button
                type="button"
                className={`game-screen__btn game-screen__btn--primary${!shakeIsActive ? ' game-screen__btn--pulse' : ''}`}
                onClick={doRoll}
              >
                Lancer les dés
              </button>
            )}

            {turn.phase === 'rolled' && !showAllOnBoard && (
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
                {!isWinningBank && (wouldBust ? (
                  <button
                    type="button"
                    className="game-screen__btn game-screen__btn--secondary"
                    onClick={() => onTurnEnd(totalIfBank, false)}
                  >
                    Fin de tour →
                  </button>
                ) : (
                  <button
                    type="button"
                    className="game-screen__btn game-screen__btn--primary"
                    onClick={doRollWithSelection}
                  >
                    {isHotDice ? '🔥 Relancer 5 dés' : `Relancer ${remainingDiceCount} dé${remainingDiceCount > 1 ? 's' : ''}`}
                  </button>
                ))}
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
