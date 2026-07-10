export const gbp = (n: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(n);

export const num = (n: number) => new Intl.NumberFormat('en-GB').format(n);

export const carTitle = (c: { make: string; model: string }) => `${c.make} ${c.model}`;
