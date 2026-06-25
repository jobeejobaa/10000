/**
 * useRoom — gestion d'une salle multijoueur Firebase Realtime Database.
 *
 * Structure dans Firebase :
 *   rooms/{code}/
 *     host        : uid du créateur
 *     status      : 'waiting' | 'playing' | 'finished'
 *     mode        : 'game' | 'sheet'
 *     playerOrder : [uid, uid, ...]
 *     playerNames : { [uid]: string }
 *
 *   Mode 'sheet' — gameState :
 *     currentTurnIndex, entries, consecutiveFarkles, winner (uid)
 *
 *   Mode 'game' — gameState :
 *     game : { players, currentPlayerIndex, turnCount, winnerIndex }
 *            (même structure que createGame() local)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { ref, set, get, onValue, update, serverTimestamp } from 'firebase/database';
import { db, signInAnon } from '../firebase.js';
import { createGame, applyTurnResult, isGameOver } from '../game/gameState.js';
import { TARGET_SCORE, MINIMUM_SCORE_TO_OPEN, TRIPLE_FARKLE_PENALTY } from '../game/scoring.js';

function generateCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
}

export function useRoom(initialCode = null) {
  const [uid, setUid] = useState(null);
  const [roomCode, setRoomCode] = useState(initialCode);
  const [roomData, setRoomData] = useState(null);
  const [error, setError] = useState(null);
  const unsubRef = useRef(null);

  useEffect(() => {
    signInAnon().then((user) => setUid(user.uid)).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!roomCode) return;
    const roomRef = ref(db, `rooms/${roomCode}`);
    unsubRef.current = onValue(roomRef, (snap) => setRoomData(snap.val()));
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [roomCode]);

  const createRoom = useCallback(async (playerName, mode = 'sheet') => {
    if (!uid) return;
    setError(null);
    const code = generateCode();
    await set(ref(db, `rooms/${code}`), {
      host: uid,
      status: 'waiting',
      mode,
      playerOrder: [uid],
      playerNames: { [uid]: playerName },
      createdAt: serverTimestamp(),
    });
    setRoomCode(code);
    return code;
  }, [uid]);

  const joinRoom = useCallback(async (code, playerName) => {
    if (!uid) return;
    setError(null);
    const upper = code.toUpperCase().trim();
    const snap = await get(ref(db, `rooms/${upper}`));
    if (!snap.exists()) { setError('Salle introuvable. Vérifie le code.'); return false; }
    const data = snap.val();
    if (data.status !== 'waiting') { setError('Cette partie a déjà commencé.'); return false; }
    const currentOrder = data.playerOrder || [];
    if (!currentOrder.includes(uid)) {
      await update(ref(db, `rooms/${upper}`), {
        [`playerNames/${uid}`]: playerName,
        playerOrder: [...currentOrder, uid],
      });
    }
    setRoomCode(upper);
    return true;
  }, [uid]);

  /** Lance la partie — initialise gameState selon le mode de la salle. */
  const startGame = useCallback(async () => {
    if (!roomCode || !roomData) return;
    const order = roomData.playerOrder;
    const mode = roomData.mode ?? 'sheet';

    if (mode === 'game') {
      // Crée un objet game standard avec les joueurs de la salle
      const playerDefs = order.map((id) => ({ name: roomData.playerNames[id], isBot: false }));
      const game = createGame(playerDefs);
      await update(ref(db, `rooms/${roomCode}`), {
        status: 'playing',
        'gameState/game': game,
      });
    } else {
      // Mode feuille de score
      const entries = {};
      const consecutiveFarkles = {};
      order.forEach((id) => { entries[id] = []; consecutiveFarkles[id] = 0; });
      await update(ref(db, `rooms/${roomCode}`), {
        status: 'playing',
        'gameState/currentTurnIndex': 0,
        'gameState/entries': entries,
        'gameState/consecutiveFarkles': consecutiveFarkles,
        'gameState/winner': null,
      });
    }
  }, [roomCode, roomData]);

  /** Mode 'game' — soumet le résultat d'un tour (turnScore, farkled). */
  const submitGameTurn = useCallback(async (turnScore, farkled) => {
    if (!roomCode || !roomData || !uid) return;
    const order = roomData.playerOrder;
    const currentGame = roomData.gameState?.game;
    if (!currentGame) return;

    // Sécurité : seul le joueur actif peut écrire
    const currentUid = order[currentGame.currentPlayerIndex];
    if (currentUid !== uid) return;

    const newGame = applyTurnResult(currentGame, turnScore, farkled);
    const updates = { 'gameState/game': newGame };
    if (isGameOver(newGame)) updates.status = 'finished';
    await update(ref(db, `rooms/${roomCode}`), updates);
  }, [roomCode, roomData, uid]);

  /** Mode 'sheet' — soumet un score (points) ou farkle (null). */
  const submitTurn = useCallback(async (points) => {
    if (!roomCode || !roomData || !uid) return;
    const gs = roomData.gameState;
    const order = roomData.playerOrder;
    const currentIndex = gs.currentTurnIndex;
    const currentUid = order[currentIndex];
    if (currentUid !== uid) return;

    const isFarkle = points === null;
    const prevEntries = gs.entries?.[uid] ?? [];
    const prevTotal = prevEntries.length > 0 ? prevEntries[prevEntries.length - 1].total : 0;
    const playerHasOpened = prevEntries.some((e) => e.points !== null && e.points >= MINIMUM_SCORE_TO_OPEN && !e.isBust);
    // Les farkles ne comptent qu'une fois entré en jeu
    const prevFarkles = gs.consecutiveFarkles?.[uid] ?? 0;
    const newFarkleCount = isFarkle && playerHasOpened ? prevFarkles + 1 : isFarkle ? prevFarkles : 0;
    const isTripleFarkle = playerHasOpened && newFarkleCount >= 3;
    let newTotal = isFarkle ? prevTotal : prevTotal + points;
    if (isTripleFarkle) newTotal += TRIPLE_FARKLE_PENALTY;

    // Règle bust : dépasser 10 000 annule le tour (score inchangé, pas de farkle)
    const isBust = !isFarkle && !isTripleFarkle && newTotal > TARGET_SCORE;
    if (isBust) newTotal = prevTotal;

    const newEntry = {
      points: points ?? null,
      total: newTotal,
      penalty: isTripleFarkle,
      farkleStreak: isFarkle ? (isTripleFarkle ? 0 : newFarkleCount) : 0,
      isBust,
    };

    const allEntries = [...prevEntries, newEntry];
    const hasOpened = allEntries.some((e) => e.points !== null && e.points >= MINIMUM_SCORE_TO_OPEN && !e.isBust);
    const isWinner = hasOpened && newTotal === TARGET_SCORE;
    const nextTurnIndex = (currentIndex + 1) % order.length;

    const updates = {
      [`gameState/entries/${uid}`]: allEntries,
      [`gameState/consecutiveFarkles/${uid}`]: isTripleFarkle ? 0 : newFarkleCount,
      'gameState/currentTurnIndex': isWinner ? currentIndex : nextTurnIndex,
      'gameState/winner': isWinner ? uid : (gs.winner ?? null),
    };
    if (isWinner) updates.status = 'finished';
    await update(ref(db, `rooms/${roomCode}`), updates);
  }, [roomCode, roomData, uid]);

  const leaveRoom = useCallback(() => {
    if (unsubRef.current) unsubRef.current();
    setRoomCode(null);
    setRoomData(null);
  }, []);

  return { uid, roomCode, roomData, error, createRoom, joinRoom, startGame, submitGameTurn, submitTurn, leaveRoom };
}
