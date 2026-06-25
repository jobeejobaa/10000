/**
 * useRoom — gestion d'une salle multijoueur Firebase Realtime Database.
 *
 * Structure dans Firebase :
 *   rooms/{code}/
 *     host        : uid du créateur
 *     status      : 'waiting' | 'playing' | 'finished'
 *     playerOrder : [uid, uid, ...]         // ordre des joueurs, fixé au lancement
 *     playerNames : { [uid]: string }       // uid → prénom
 *     gameState/
 *       currentTurnIndex   : number
 *       entries            : { [uid]: [{points, total, penalty, farkleStreak}] }
 *       consecutiveFarkles : { [uid]: number }
 *       winner             : uid | null
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { ref, set, get, onValue, update, serverTimestamp } from 'firebase/database';
import { db, signInAnon } from '../firebase.js';

const TARGET_SCORE = 10000;
const MINIMUM_SCORE_TO_OPEN = 500;
const TRIPLE_FARKLE_PENALTY = -1000;

/** Génère un code de salle à 4 lettres majuscules. */
function generateCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sans I et O pour éviter confusion
  return Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
}

export function useRoom() {
  const [uid, setUid] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [roomData, setRoomData] = useState(null);   // snapshot complet de la salle
  const [error, setError] = useState(null);
  const unsubRef = useRef(null);

  // Connexion anonyme au montage
  useEffect(() => {
    signInAnon().then((user) => setUid(user.uid)).catch((e) => setError(e.message));
  }, []);

  // Écoute en temps réel dès qu'on a un roomCode
  useEffect(() => {
    if (!roomCode) return;
    const roomRef = ref(db, `rooms/${roomCode}`);
    unsubRef.current = onValue(roomRef, (snap) => {
      setRoomData(snap.val());
    });
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [roomCode]);

  /** Crée une salle et y entre comme hôte. */
  const createRoom = useCallback(async (playerName) => {
    if (!uid) return;
    setError(null);
    const code = generateCode();
    await set(ref(db, `rooms/${code}`), {
      host: uid,
      status: 'waiting',
      playerOrder: [uid],
      playerNames: { [uid]: playerName },
      createdAt: serverTimestamp(),
    });
    setRoomCode(code);
    return code;
  }, [uid]);

  /** Rejoint une salle existante. */
  const joinRoom = useCallback(async (code, playerName) => {
    if (!uid) return;
    setError(null);
    const upper = code.toUpperCase().trim();
    const snap = await get(ref(db, `rooms/${upper}`));
    if (!snap.exists()) {
      setError('Salle introuvable. Vérifie le code.');
      return false;
    }
    const data = snap.val();
    if (data.status !== 'waiting') {
      setError('Cette partie a déjà commencé.');
      return false;
    }
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

  /** Lance la partie (hôte uniquement). */
  const startGame = useCallback(async () => {
    if (!roomCode || !roomData) return;
    const order = roomData.playerOrder;
    // Initialise le gameState
    const entries = {};
    const consecutiveFarkles = {};
    order.forEach((id) => {
      entries[id] = [];
      consecutiveFarkles[id] = 0;
    });
    await update(ref(db, `rooms/${roomCode}`), {
      status: 'playing',
      'gameState/currentTurnIndex': 0,
      'gameState/entries': entries,
      'gameState/consecutiveFarkles': consecutiveFarkles,
      'gameState/winner': null,
    });
  }, [roomCode, roomData]);

  /** Soumet un score (ou un farkle si points === null) pour le joueur courant. */
  const submitTurn = useCallback(async (points) => {
    if (!roomCode || !roomData || !uid) return;
    const gs = roomData.gameState;
    const order = roomData.playerOrder;
    const currentIndex = gs.currentTurnIndex;
    const currentUid = order[currentIndex];
    if (currentUid !== uid) return; // sécurité : seul le joueur actif peut soumettre

    const isFarkle = points === null;
    const prevFarkles = (gs.consecutiveFarkles?.[uid] ?? 0);
    const newFarkleCount = isFarkle ? prevFarkles + 1 : 0;
    const isTripleFarkle = newFarkleCount >= 3;

    const prevEntries = gs.entries?.[uid] ?? [];
    const prevTotal = prevEntries.length > 0 ? prevEntries[prevEntries.length - 1].total : 0;
    let newTotal = isFarkle ? prevTotal : prevTotal + points;
    if (isTripleFarkle) newTotal += TRIPLE_FARKLE_PENALTY;

    const newEntry = {
      points: points ?? null,
      total: newTotal,
      penalty: isTripleFarkle,
      farkleStreak: isFarkle ? (isTripleFarkle ? 0 : newFarkleCount) : 0,
    };

    // Vérifie victoire
    const allEntries = [...prevEntries, newEntry];
    const hasOpened = allEntries.some((e) => e.points !== null && e.points >= MINIMUM_SCORE_TO_OPEN);
    const isWinner = hasOpened && newTotal >= TARGET_SCORE;

    const nextTurnIndex = (currentIndex + 1) % order.length;

    const updates = {
      [`gameState/entries/${uid}`]: allEntries,
      [`gameState/consecutiveFarkles/${uid}`]: isTripleFarkle ? 0 : newFarkleCount,
      'gameState/currentTurnIndex': isWinner ? currentIndex : nextTurnIndex,
      'gameState/winner': isWinner ? uid : (gs.winner ?? null),
    };

    if (isWinner) {
      updates.status = 'finished';
    }

    await update(ref(db, `rooms/${roomCode}`), updates);
  }, [roomCode, roomData, uid]);

  /** Quitte et nettoie l'abonnement (ne supprime pas la salle). */
  const leaveRoom = useCallback(() => {
    if (unsubRef.current) unsubRef.current();
    setRoomCode(null);
    setRoomData(null);
  }, []);

  return {
    uid,
    roomCode,
    roomData,
    error,
    createRoom,
    joinRoom,
    startGame,
    submitTurn,
    leaveRoom,
  };
}
