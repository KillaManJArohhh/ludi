import type { DiceResult, GameConfig } from './types.js';

/** Roll dice using crypto random for fairness */
export function rollDice(mode: GameConfig['diceMode'], values?: number[]): DiceResult {
  if (values) {
    // Predetermined values (for testing or server-authoritative)
    return {
      values,
      isDouble: values.length === 2 && values[0] === values[1],
      hasSix: values.some(v => v === 6),
    };
  }

  const roll = (): number => {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      return (arr[0] % 6) + 1;
    }
    return Math.floor(Math.random() * 6) + 1;
  };

  if (mode === 'single') {
    const v = roll();
    return { values: [v], isDouble: false, hasSix: v === 6 };
  }

  const v1 = roll();
  const v2 = roll();
  return {
    values: [v1, v2],
    isDouble: v1 === v2,
    hasSix: v1 === 6 || v2 === 6,
  };
}

/** Check if dice grant an extra roll */
export function grantsExtraRoll(dice: DiceResult, mode: GameConfig['diceMode']): boolean {
  if (mode === 'single') {
    return dice.values[0] === 6;
  }
  // Double dice: any 6 grants extra roll
  return dice.hasSix;
}

/** Get the sum of dice values */
export function diceSum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
