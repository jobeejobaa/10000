/**
 * Logique de calcul des points pour le jeu du 10 000 (version 5 dés).
 *
 * Toutes les fonctions ici sont pures : elles ne touchent jamais au DOM,
 * ne lisent ni n'écrivent d'état global. Elles prennent des données en entrée
 * et renvoient un résultat. C'est ce qui les rend faciles à tester
 * et impossible à casser par accident depuis l'UI.
 */

export const MINIMUM_SCORE_TO_OPEN = 500;
export const TARGET_SCORE = 10000;
export const TRIPLE_FARKLE_PENALTY = -1000;

/**
 * Compte le nombre d'occurrences de chaque face (1 à 6) dans un tableau de dés.
 * @param {number[]} dice
 * @returns {number[]} tableau de taille 7, index 0 inutilisé, counts[face] = occurrences
 */
function countFaces(dice) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const value of dice) {
    counts[value] += 1;
  }
  return counts;
}

/**
 * Calcule les points d'un brelan (3, 4 ou 5 exemplaires de la même face).
 * Le brelan de base vaut 1000 pour les 1, et face * 100 pour les autres faces.
 * Un 4e dé identique ajoute la moitié du brelan (×1.5), un 5e double le brelan (×2).
 * Exemple : 3×5 = 500, 4×5 = 750, 5×5 = 1000.
 */
function scoreSetOfFace(face, count) {
  if (count < 3) return 0;
  const base = face === 1 ? 1000 : face * 100;
  if (count === 3) return base;
  if (count === 4) return Math.floor(base * 3 / 2); // base + base/2
  return base * 2; // count === 5
}

/**
 * Calcule le score d'une sélection de dés, et indique si la sélection
 * est "valide" (c'est-à-dire que tous les dés sélectionnés contribuent
 * effectivement à un score - aucun dé ne doit être mis de côté pour rien).
 *
 * @param {number[]} dice - les valeurs des dés sélectionnés (1 à 5 dés)
 * @returns {{ points: number, isFullyScoring: boolean, breakdown: string[] }}
 */
export function scoreSelection(dice) {
  if (!dice || dice.length === 0) {
    return { points: 0, isFullyScoring: false, breakdown: [] };
  }

  const sorted = [...dice].sort((a, b) => a - b);
  const breakdown = [];

  // Cas spécial : suites complètes sur les 5 dés (1-2-3-4-5 ou 2-3-4-5-6)
  const sortedStr = sorted.join(',');
  if (dice.length === 5 && (sortedStr === '1,2,3,4,5' || sortedStr === '2,3,4,5,6')) {
    const label = sortedStr === '1,2,3,4,5' ? 'Suite 1-2-3-4-5' : 'Suite 2-3-4-5-6';
    return {
      points: 1000,
      isFullyScoring: true,
      breakdown: [`${label} : 1000 points`],
    };
  }

  const counts = countFaces(dice);
  let total = 0;

  // Brelans, carrés, et "5 identiques" (de 3 à 5 dés de la même face)
  for (let face = 1; face <= 6; face++) {
    if (counts[face] >= 3) {
      const pts = scoreSetOfFace(face, counts[face]);
      total += pts;
      breakdown.push(`${counts[face]} x ${face} : ${pts} points`);
      counts[face] = 0; // ces dés sont consommés, ne pas les recompter en isolé
    }
  }

  // 1 isolés restants : 100 points chacun
  if (counts[1] > 0) {
    const pts = counts[1] * 100;
    total += pts;
    breakdown.push(`${counts[1]} x 1 (isolé) : ${pts} points`);
    counts[1] = 0;
  }

  // 5 isolés restants : 50 points chacun
  if (counts[5] > 0) {
    const pts = counts[5] * 50;
    total += pts;
    breakdown.push(`${counts[5]} x 5 (isolé) : ${pts} points`);
    counts[5] = 0;
  }

  // S'il reste des dés non utilisés (ex: un 2, un 3, un 4 isolés), la sélection
  // contient des dés inutiles : ce n'est pas une mise de côté valable.
  const leftover = counts.slice(2).reduce((sum, c) => sum + c, 0) + counts[1] + counts[5];
  const isFullyScoring = total > 0 && leftover === 0;

  return { points: total, isFullyScoring, breakdown };
}

/**
 * Détermine si un lancer de dés contient au moins une combinaison qui rapporte
 * des points. Si non, c'est un farkle : le tour s'arrête, les points sont perdus.
 *
 * @param {number[]} dice
 * @returns {boolean}
 */
export function hasScoringOption(dice) {
  return scoreSelection(dice).points > 0;
}

/**
 * Génère un lancer aléatoire de n dés (valeurs de 1 à 6).
 * @param {number} count
 * @returns {number[]}
 */
export function rollDice(count) {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
}

/**
 * Détermine si un joueur a ouvert son score (a validé au moins un tour ≥ 500 sans bust).
 * Fonction partagée entre le mode local (ScoreSheet) et le mode Firebase (useRoom),
 * pour garantir un comportement identique dans les deux modes.
 *
 * @param {Array<{ points: number|null, isBust: boolean }>} entries - historique des tours du joueur
 * @returns {boolean}
 */
export function hasPlayerOpened(entries) {
  return entries.some(
    (e) => e.points !== null && e.points >= MINIMUM_SCORE_TO_OPEN && !e.isBust
  );
}
