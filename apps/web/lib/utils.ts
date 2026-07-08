export function classNames(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatRiskScore(score: number): { label: string; color: string } {
  if (score <= 30) return { label: 'Best', color: 'bg-emerald-500 text-emerald-50' };
  if (score <= 65) return { label: 'Better', color: 'bg-amber-500 text-amber-50' };
  return { label: 'Worst', color: 'bg-red-500 text-red-50' };
}
