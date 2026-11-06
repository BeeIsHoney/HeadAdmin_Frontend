export const formatMMK = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return '0 Ks';
  }
  return `${new Intl.NumberFormat('en-US').format(Number(amount))} Ks`;
};

export const formatUSD = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return '$0.00';
  }
  return `$${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount))}`;
};

export const formatCurrency = (amount: number | null | undefined, currency = 'Ks'): string => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return `0 ${currency}`;
  }
  return `${new Intl.NumberFormat('en-US').format(Number(amount))} ${currency}`;
};

export const formatAdaptiveUSD = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return '$0';
  }
  const val = Number(amount);
  const absVal = Math.abs(val);

  let fractionDigits = 2;
  if (absVal >= 1000) {
    fractionDigits = 0;
  } else if (absVal >= 100) {
    fractionDigits = 1;
  } else {
    fractionDigits = 2;
  }

  return `$${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(val)}`;
};

