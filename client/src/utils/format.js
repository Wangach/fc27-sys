export const kes = (value = 0) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 2 }).format(Number(value || 0));
export const dateTime = (value) => value ? new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
export const dateOnly = (value) => value ? new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date(value)) : '—';
