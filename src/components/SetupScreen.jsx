import { useState } from 'react';
import { loadHistory, formatRelativeDate } from '../utils/history.js';
import './SetupScreen.css';

const MAX_PLAYERS = 4;

export function SetupScreen({ onStart, onShowHistory }) {
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState(['', '', '', '']);
  const [mode, setMode] = useState('game');

  const recentGames = loadHistory().slice(0, 2);

  function handleNameChange(index, value) {
    setNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleStart() {
    if (playerCount === 1) {
      const humanName = names[0].trim() || 'Joueur 1';
      onStart([
        { name: humanName, isBot: false },
        { name: '🤖 Bot', isBot: true },
      ], 'game');
    } else {
      const playerDefs = Array.from({ length: playerCount }, (_, i) => ({
        name: names[i].trim() || `Joueur ${i + 1}`,
        isBot: false,
      }));
      onStart(playerDefs, mode);
    }
  }

  return (
    <div className="setup">
      <h1 className="setup__title">Le 10 000</h1>
      <p className="setup__subtitle">Secoue ton téléphone pour lancer les dés</p>

      <div className="setup__section">
        <p className="setup__label">Nombre de joueurs</p>
        <div className="setup__count-row">
          {Array.from({ length: MAX_PLAYERS }, (_, i) => i + 1).map((count) => (
            <button
              key={count}
              type="button"
              className={`setup__count-btn${count === playerCount ? ' setup__count-btn--selected' : ''}`}
              onClick={() => setPlayerCount(count)}
            >
              {count}
            </button>
          ))}
        </div>
        {playerCount === 1 && (
          <p className="setup__hint">Toi contre le bot 🤖</p>
        )}
      </div>

      {playerCount >= 2 && (
        <div className="setup__section">
          <p className="setup__label">Mode de jeu</p>
          <div className="setup__mode-row">
            <button
              type="button"
              className={`setup__mode-btn${mode === 'game' ? ' setup__mode-btn--selected' : ''}`}
              onClick={() => setMode('game')}
            >
              <span className="setup__mode-icon">📱</span>
              <span className="setup__mode-label">On joue ici !</span>
              <span className="setup__mode-desc">Secoue le téléphone, on gère tout</span>
            </button>
            <button
              type="button"
              className={`setup__mode-btn${mode === 'sheet' ? ' setup__mode-btn--selected' : ''}`}
              onClick={() => setMode('sheet')}
            >
              <span className="setup__mode-icon">🎲</span>
              <span className="setup__mode-label">J'ai mes dés !</span>
              <span className="setup__mode-desc">Tes dés + notre appli = parfait</span>
            </button>
          </div>
        </div>
      )}

      <div className="setup__section">
        {Array.from({ length: playerCount }, (_, i) => (
          <input
            key={i}
            type="text"
            className="setup__name-input"
            placeholder={`Joueur ${i + 1}`}
            value={names[i]}
            onChange={(e) => handleNameChange(i, e.target.value)}
            maxLength={20}
          />
        ))}
      </div>

      <button type="button" className="setup__start-btn" onClick={handleStart}>
        Lancer la partie
      </button>

      {/* Dernières parties */}
      {recentGames.length > 0 && (
        <div className="setup__recent">
          <p className="setup__label">Dernières parties</p>
          {recentGames.map((entry) => (
            <div key={entry.id} className="setup__recent-card">
              <div className="setup__recent-header">
                <span className="setup__recent-winner">🏆 {entry.winner}</span>
                <span className="setup__recent-date">{formatRelativeDate(entry.date)}</span>
              </div>
              <p className="setup__recent-players">
                {entry.players.map((p) => p.name).join(' · ')}
              </p>
            </div>
          ))}
          <button type="button" className="setup__history-cta" onClick={onShowHistory}>
            Historique des parties 🏆 →
          </button>
        </div>
      )}
    </div>
  );
}
