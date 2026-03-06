const K = 32; // Standard K-factor

/**
 * Calculate ELO rating change.
 * Returns the change amount (positive for win, negative for loss).
 */
export function calculateEloChange(playerRating: number, opponentRating: number, won: boolean): number {
  const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const actual = won ? 1 : 0;
  return Math.round(K * (actual - expected));
}
