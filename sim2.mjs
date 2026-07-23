import { rollDice, scoreSelection, hasScoringOption, MINIMUM_SCORE_TO_OPEN } from './src/game/scoring.js';
import { bestSelection } from './src/game/bot.js';

// Replicate useTurn state machine exactly, then GameScreen's canBank derivation
function createInitial() {
  return { phase: 'ready', dice: [], selectedIndices: [], turnScore: 0, diceAvailableForRoll: 5 };
}
function roll(prev) {
  if (prev.phase !== 'ready') return prev;
  const newDice = rollDice(prev.diceAvailableForRoll);
  if (!hasScoringOption(newDice)) return { ...prev, phase: 'farkled', dice: newDice, selectedIndices: [] };
  const autoSelected = bestSelection(newDice);
  return { ...prev, phase: 'rolled', dice: newDice, selectedIndices: autoSelected };
}
function rollWithSelection(prev) {
  if (prev.phase !== 'rolled') return prev;
  const selectedValues = prev.selectedIndices.map(i => prev.dice[i]);
  const { points, isFullyScoring } = scoreSelection(selectedValues);
  if (!isFullyScoring || points === 0) return prev;
  const remainingCount = prev.dice.length - prev.selectedIndices.length;
  const diceToRoll = remainingCount === 0 ? 5 : remainingCount;
  const newDice = rollDice(diceToRoll);
  const newTurnScore = prev.turnScore + points;
  if (!hasScoringOption(newDice)) {
    return { ...prev, phase: 'farkled', dice: newDice, selectedIndices: [], turnScore: newTurnScore, diceAvailableForRoll: diceToRoll };
  }
  const autoSelected = bestSelection(newDice);
  return { ...prev, phase: 'rolled', dice: newDice, selectedIndices: autoSelected, turnScore: newTurnScore, diceAvailableForRoll: diceToRoll };
}

let anomalies = 0;
for (let sim = 0; sim < 50000; sim++) {
  let turn = createInitial();
  const playerScore = Math.floor(Math.random() * 8000); // already opened, mid-game
  const hasOpened = true;
  let rollNum = 0;
  turn = roll(turn);
  rollNum = 1;
  while (turn.phase === 'rolled' && rollNum < 6) {
    rollNum++;
    turn = rollWithSelection(turn);
    if (turn.phase !== 'rolled') break;

    // Now replicate GameScreen derived values
    const scoringDice = turn.selectedIndices.map(i => turn.dice[i]);
    const nonScoringDice = turn.dice.filter((_, i) => !turn.selectedIndices.includes(i));
    const selectionScore = scoreSelection(scoringDice).points;
    const totalIfBank = turn.turnScore + selectionScore;
    const isHotDice = nonScoringDice.length === 0;
    const wouldBust = hasOpened && (playerScore + totalIfBank) > 10000;
    const isWinningBank = hasOpened && (playerScore + totalIfBank) === 10000;
    const canBank = totalIfBank > 0 && (!isHotDice || isWinningBank) && (hasOpened || totalIfBank >= MINIMUM_SCORE_TO_OPEN) && !wouldBust;

    if (rollNum >= 2 && !isHotDice && !wouldBust && !canBank) {
      anomalies++;
      if (anomalies <= 5) {
        console.log('ANOMALY', JSON.stringify({ rollNum, turn, selectionScore, totalIfBank, isHotDice, wouldBust, playerScore }));
      }
    }
  }
}
console.log('anomalies:', anomalies);
