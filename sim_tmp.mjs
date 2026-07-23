import { rollDice, scoreSelection, hasScoringOption, MINIMUM_SCORE_TO_OPEN } from './src/game/scoring.js';
import { bestSelection } from './src/game/bot.js';

let stats = { totalRolls2plus: 0, hotDiceBlocks: 0, otherBlocks: 0, canBankTrue: 0 };

for (let sim = 0; sim < 20000; sim++) {
  let diceCount = 5;
  let turnScore = 0;
  let hasOpened = Math.random() < 0.5; // simulate mid-game
  let rollNum = 0;
  while (true) {
    rollNum++;
    const dice = rollDice(diceCount);
    if (!hasScoringOption(dice)) break; // farkle
    const sel = bestSelection(dice);
    const selVals = sel.map(i => dice[i]);
    const { points } = scoreSelection(selVals);
    const nonScoringCount = dice.length - sel.length;
    const isHotDice = nonScoringCount === 0;
    const newTurnScore = turnScore + points;

    if (rollNum >= 2) {
      stats.totalRolls2plus++;
      const totalIfBank = newTurnScore;
      const wouldBust = hasOpened && (totalIfBank) > 10000; // simplified, ignoring player.score baseline
      const canBank = totalIfBank > 0 && (!isHotDice) && (hasOpened || totalIfBank >= MINIMUM_SCORE_TO_OPEN) && !wouldBust;
      if (!canBank) {
        if (isHotDice) stats.hotDiceBlocks++;
        else stats.otherBlocks++;
      } else {
        stats.canBankTrue++;
      }
    }

    turnScore = newTurnScore;
    diceCount = nonScoringCount === 0 ? 5 : nonScoringCount;
    if (rollNum > 8) break; // safety
    // continue rolling regardless (simulate always rerolling to explore deep turns)
  }
}
console.log(stats);
