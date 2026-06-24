import { useState } from 'react';
import './SetupScreen.css';

const MAX_PLAYERS = 4;

export function SetupScreen({ onStart }) {
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState(['', '', '', '']);

  function handleNameChange(index, value) {
    setNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleStart() {
    if (playerCount === 1) {
      // Mode solo : le joueur humain affronte un bot
      const humanName = names[0].trim() || 'Joueur 1';
      onStart([
        { name: humanName, isBot: false },
        { name: '🤖 Bot', isBot: true },
      ]);
    } else {
      // Mode multijoueur : que des humains
      const playerDefs = Array.from({ length: playerCount }, (_, i) => ({
        name: names[i].trim() || `Joueur ${i + 1}`,
        isBot: false,
      }));
      onStart(playerDefs);
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
        Commencer la partie
      </button>
    </div>
  );
}
