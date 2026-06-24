import { useState } from 'react';
import './SetupScreen.css';

const MAX_PLAYERS = 4;

export function SetupScreen({ onStart }) {
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState(['', '', '', '']);
  const [botFlags, setBotFlags] = useState([false, false, false, false]);

  function handleNameChange(index, value) {
    setNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function toggleBot(index) {
    setBotFlags((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }

  function handleStart() {
    const playerDefs = Array.from({ length: playerCount }, (_, i) => ({
      name: names[i].trim() || (botFlags[i] ? `Bot ${i + 1}` : `Joueur ${i + 1}`),
      isBot: botFlags[i],
    }));
    onStart(playerDefs);
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
      </div>

      <div className="setup__section">
        {Array.from({ length: playerCount }, (_, i) => (
          <div key={i} className="setup__player-row">
            <input
              type="text"
              className="setup__name-input"
              placeholder={botFlags[i] ? `Bot ${i + 1}` : `Joueur ${i + 1}`}
              value={names[i]}
              onChange={(e) => handleNameChange(i, e.target.value)}
              maxLength={20}
              disabled={botFlags[i]}
            />
            <button
              type="button"
              className={`setup__bot-toggle${botFlags[i] ? ' setup__bot-toggle--active' : ''}`}
              onClick={() => toggleBot(i)}
              title={botFlags[i] ? 'Passer en joueur humain' : 'Passer en bot'}
            >
              {botFlags[i] ? '🤖' : '🧑'}
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="setup__start-btn" onClick={handleStart}>
        Commencer la partie
      </button>
    </div>
  );
}
