import { money, roundMoney } from "../utils/money.js";

export function getLoserPayCharges({
  playerOneId,
  playerTwoId,
  playerOneScore,
  playerTwoScore,
  loserFee,
  drawResolution,
  superLoserPlayerOneScore,
  superLoserPlayerTwoScore,
}) {
  const normalFee = money(loserFee);
  if (normalFee <= 0) return [];

  if (playerOneScore !== playerTwoScore) {
    return [
      {
        customerId: playerOneScore < playerTwoScore ? playerOneId : playerTwoId,
        amount: roundMoney(normalFee),
      },
    ];
  }

  if (!drawResolution) {
    const error = new Error(
      "A loser-pay draw requires a Half-Half or Super-looser decision.",
    );
    error.code = "DRAW_RESOLUTION_REQUIRED";
    throw error;
  }

  if (drawResolution === "HALF_HALF") {
    // Keep the two allocations exact even if the configured fee contains odd cents.
    const playerOneAmount = roundMoney(normalFee / 2);
    const playerTwoAmount = roundMoney(normalFee - playerOneAmount);
    return [
      { customerId: playerOneId, amount: playerOneAmount },
      { customerId: playerTwoId, amount: playerTwoAmount },
    ];
  }

  if (drawResolution === "SUPER_LOSER") {
    if (
      !Number.isInteger(superLoserPlayerOneScore) ||
      !Number.isInteger(superLoserPlayerTwoScore)
    ) {
      const error = new Error(
        "Super-looser requires a new score for both players.",
      );
      error.code = "SUPER_LOSER_SCORES_REQUIRED";
      throw error;
    }
    if (superLoserPlayerOneScore === superLoserPlayerTwoScore) {
      const error = new Error(
        "The Super-looser score cannot also be a draw. Enter a decisive score.",
      );
      error.code = "SUPER_LOSER_DRAW_NOT_ALLOWED";
      throw error;
    }
    const loserId =
      superLoserPlayerOneScore < superLoserPlayerTwoScore
        ? playerOneId
        : playerTwoId;
    return [{ customerId: loserId, amount: roundMoney(normalFee * 2) }];
  }

  const error = new Error("Unsupported draw resolution.");
  error.code = "INVALID_DRAW_RESOLUTION";
  throw error;
}
