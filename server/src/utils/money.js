export const money = (value) => Number(value || 0);
export const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;
