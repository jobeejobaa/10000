const STORAGE_KEY = 'jeu10000_history';
const MAX_ENTRIES = 50;

/**
 * @typedef {{ name: string, score: number, isWinner: boolean }} HistoryPlayer
 * @typedef {{ id: number, date: string, mode: 'game'|'sheet', winner: string, players: HistoryPlayer[] }} HistoryEntry
 */

/** @returns {HistoryEntry[]} */
export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

/** @param {HistoryEntry} entry */
export function saveToHistory(entry) {
  try {
    const history = loadHistory();
    history.unshift({ ...entry, id: Date.now() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_ENTRIES)));
  } catch {
    // localStorage indisponible (mode privé, quota) → on ignore silencieusement
  }
}

/** @param {string} isoDate @returns {string} */
export function formatRelativeDate(isoDate) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 2) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} jours`;
  return new Date(isoDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
