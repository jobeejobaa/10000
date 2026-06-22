import './Die.css';

const PIP_LAYOUTS = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 25], [72, 25], [28, 50], [72, 50], [28, 75], [72, 75]],
};

/**
 * Affiche un dé avec ses points (pips), façon dé physique plutôt qu'un simple chiffre.
 * @param {number} value - valeur du dé, 1 à 6
 * @param {boolean} selected - si le dé est mis de côté par le joueur
 * @param {boolean} disabled - si le dé n'est pas cliquable (déjà mis de côté / pas de lancer en cours)
 * @param {() => void} onToggle
 */
export function Die({ value, selected, disabled, onToggle }) {
  const pips = PIP_LAYOUTS[value] || [];

  return (
    <button
      type="button"
      className={`die${selected ? ' die--selected' : ''}`}
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`Dé valeur ${value}${selected ? ', sélectionné' : ''}`}
    >
      <svg viewBox="0 0 100 100" className="die__face" aria-hidden="true">
        <rect x="4" y="4" width="92" height="92" rx="16" className="die__rect" />
        {pips.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="7" className="die__pip" />
        ))}
      </svg>
    </button>
  );
}
