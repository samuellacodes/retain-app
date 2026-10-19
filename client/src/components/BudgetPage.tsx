type BudgetPageProps = {
  month: string;
  amount: string;
  loaded: boolean;
  spent: number;
  remaining: number;
  onAmountChange: (amount: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  money: (amount: number) => string;
};

export default function BudgetPage({
  month,
  amount,
  loaded,
  spent,
  remaining,
  onAmountChange,
  onSubmit,
  money,
}: BudgetPageProps) {
  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <section className="panel budget-panel">
      <p className="eyebrow">PLAN AHEAD · {monthLabel}</p>
      <h2>Set your monthly budget</h2>
      <p className="muted">Choose a limit that works for you this month.</p>
      <form onSubmit={onSubmit} className="budget-form">
        <label>Budget amount (USD)<input type="number" min="0" step="0.01" required disabled={!loaded} value={amount} onChange={(event) => onAmountChange(event.target.value)} placeholder="e.g. 500" /></label>
        <button className="primary-btn" disabled={!loaded}>Save budget</button>
      </form>
      <div className="budget-summary"><span>Spent this month</span><strong>{money(spent)}</strong><span>Budget remaining</span><strong>{money(remaining)}</strong></div>
    </section>
  );
}
