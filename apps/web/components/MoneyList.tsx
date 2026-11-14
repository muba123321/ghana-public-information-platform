import type { Currency } from '@gpip/core';
import { NotAvailable } from './NotAvailable';

type Budget = {
  kind: 'allocated' | 'released' | 'spent';
  amount: number;
  currency: Currency;
  fiscalYear: number | null;
  source: string;
};

const whole = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
/** Each amount in its own currency. Old cedis (before July 2007) are never added to Ghana cedis. */
export const formatMoney = (amount: number, currency: Currency) =>
  currency === 'GHS'
    ? `GH₵${whole.format(amount)}`
    : currency === 'USD'
      ? `US$${whole.format(amount)}`
      : `¢${whole.format(amount)} (old cedis)`;

const KINDS = [
  ['allocated', 'Allocated'],
  ['released', 'Released'],
  ['spent', 'Spent'],
] as const;

export function MoneyList({ budgets }: { budgets: Budget[] }) {
  return (
    <dl className="money">
      {KINDS.map(([kind, label]) => {
        const rows = budgets.filter((b) => b.kind === kind);
        return (
          <div key={kind}>
            <dt>{label}</dt>
            {rows.length === 0 ? (
              <dd>
                <NotAvailable what={label} />
              </dd>
            ) : (
              rows.map((b) => (
                <dd key={`${b.currency}-${b.fiscalYear}-${b.amount}`}>
                  <span className="money-amount">{formatMoney(b.amount, b.currency)}</span>
                  <span className="muted">
                    {b.fiscalYear ? ` in ${b.fiscalYear}` : ''} ({b.source})
                  </span>
                </dd>
              ))
            )}
          </div>
        );
      })}
    </dl>
  );
}
