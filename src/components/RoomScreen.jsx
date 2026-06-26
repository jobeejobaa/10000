import { useState, useEffect, useRef } from 'react';
import { useRoom } from '../hooks/useRoom.js';
import './RoomScreen.css';

const SESSION_KEY = 'le10k_session';

export function RoomScreen({ onGameStart, onQuit, gameMode = 'sheet', autoRejoin = null }) {
  const [tab, setTab] = useState('create');          // 'create' | 'join'
  const [name, setName] = useState(autoRejoin?.playerName ?? '');
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const startedRef = useRef(false);

  const { uid, roomCode, roomData, error, createRoom, joinRoom, rejoinRoom, startGame, leaveRoom } = useRoom();

  const isHost = roomData?.host === uid;
  const players = roomData
    ? (roomData.playerOrder || []).map((id) => ({
        uid: id,
        name: roomData.playerNames?.[id] ?? id,
        isHost: id === roomData.host,
      }))
    : [];

  // ── Rejoin automatique si on revient sur une salle en cours ──────────────
  useEffect(() => {
    if (!autoRejoin || !uid) return;
    setLoading(true);
    rejoinRoom(autoRejoin.code).then((ok) => {
      setLoading(false);
      if (!ok) {
        localStorage.removeItem(SESSION_KEY);
        onQuit(); // salle introuvable ou joueur pas dedans
      }
    });
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Si on revient sur une salle TERMINÉE → effacer + quitter
  useEffect(() => {
    if (autoRejoin && roomData?.status === 'finished') {
      localStorage.removeItem(SESSION_KEY);
      leaveRoom();
      onQuit();
    }
  }, [roomData?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quand la partie démarre, on remonte les données à App (dans un effect, pas dans le render)
  useEffect(() => {
    if (roomData?.status === 'playing' && uid && roomCode && !startedRef.current) {
      startedRef.current = true;
      onGameStart({ roomCode, uid, roomData, leaveRoom });
    }
  }, [roomData?.status, uid, roomCode]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    const code = await createRoom(name.trim(), gameMode);
    if (code) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode: code, playerName: name.trim(), mode: gameMode }));
    }
    setLoading(false);
  }

  async function handleJoin() {
    if (!name.trim() || !codeInput.trim()) return;
    setLoading(true);
    const ok = await joinRoom(codeInput, name.trim());
    if (ok) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode: codeInput.toUpperCase().trim(), playerName: name.trim(), mode: gameMode }));
    }
    setLoading(false);
  }

  async function handleStart() {
    setLoading(true);
    await startGame();
    setLoading(false);
  }

  function handleLeave() {
    localStorage.removeItem(SESSION_KEY);
    leaveRoom();
    onQuit();
  }

  // ── Salle d'attente ──────────────────────────────────────────────────────
  if (roomCode && roomData) {
    return (
      <div className="room-screen">
        <header className="room-screen__header">
          <span className="room-screen__header-title">Le 10 000</span>
          <button type="button" className="room-screen__quit" onClick={handleLeave}>
            ✕ Quitter
          </button>
        </header>

        <div className="room-screen__content">
          <div className="room-screen__code-box">
            <p className="room-screen__code-label">Code de la salle</p>
            <p className="room-screen__code">{roomCode}</p>
            <p className="room-screen__code-hint">Donne ce code aux autres joueurs</p>
          </div>

          <div className="room-screen__players">
            <p className="room-screen__section-label">Joueurs connectés ({players.length})</p>
            {players.map((p) => (
              <div key={p.uid} className={`room-screen__player${p.uid === uid ? ' room-screen__player--me' : ''}`}>
                <span className="room-screen__player-name">{p.name}</span>
                {p.isHost && <span className="room-screen__badge">Hôte</span>}
                {p.uid === uid && <span className="room-screen__badge room-screen__badge--me">Moi</span>}
              </div>
            ))}
          </div>

          {isHost ? (
            <button
              type="button"
              className="room-screen__start-btn"
              onClick={handleStart}
              disabled={players.length < 2 || loading}
            >
              {players.length < 2 ? 'En attente d\'un autre joueur…' : 'Lancer la partie'}
            </button>
          ) : (
            <p className="room-screen__waiting">En attente que l'hôte lance la partie…</p>
          )}
        </div>
      </div>
    );
  }

  // ── Chargement rejoin ────────────────────────────────────────────────────
  if (autoRejoin && loading) {
    return (
      <div className="room-screen">
        <header className="room-screen__header">
          <span className="room-screen__header-title">Le 10 000</span>
        </header>
        <div className="room-screen__content">
          <p style={{ color: 'var(--color-cream-dim)', textAlign: 'center', marginTop: '3rem' }}>
            Reconnexion à la salle {autoRejoin.code}…
          </p>
        </div>
      </div>
    );
  }

  // ── Écran créer / rejoindre ──────────────────────────────────────────────
  return (
    <div className="room-screen">
      <header className="room-screen__header">
        <span className="room-screen__header-title">Le 10 000</span>
        <button type="button" className="room-screen__quit" onClick={onQuit}>
          ✕ Quitter
        </button>
      </header>

      <div className="room-screen__content">
        <div className="room-screen__tabs">
          <button
            type="button"
            className={`room-screen__tab${tab === 'create' ? ' room-screen__tab--active' : ''}`}
            onClick={() => setTab('create')}
          >
            Créer une salle
          </button>
          <button
            type="button"
            className={`room-screen__tab${tab === 'join' ? ' room-screen__tab--active' : ''}`}
            onClick={() => setTab('join')}
          >
            Rejoindre
          </button>
        </div>

        <div className="room-screen__form">
          <label className="room-screen__label">Ton prénom</label>
          <input
            type="text"
            className="room-screen__input"
            placeholder="Ex : Johanna"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
          />

          {tab === 'join' && (
            <>
              <label className="room-screen__label">Code de la salle</label>
              <input
                type="text"
                className="room-screen__input room-screen__input--code"
                placeholder="Ex : ABCD"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                maxLength={4}
                autoCapitalize="characters"
              />
            </>
          )}

          {error && <p className="room-screen__error">{error}</p>}

          <button
            type="button"
            className="room-screen__cta"
            onClick={tab === 'create' ? handleCreate : handleJoin}
            disabled={!name.trim() || (tab === 'join' && codeInput.length < 4) || loading || !uid}
          >
            {loading ? 'Connexion…' : tab === 'create' ? 'Créer la salle' : 'Rejoindre'}
          </button>
        </div>
      </div>
    </div>
  );
}
