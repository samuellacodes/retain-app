type BudgetCardProps = {
  budget: string;
  spent: number;
  remaining: number;
  money: (amount: number) => string;
  onEdit: () => void;
};

export default function BudgetCard({ budget, spent, remaining, money, onEdit }: BudgetCardProps) {
  const percentageUsed = budget ? `${Math.max(0, Math.round(spent / Number(budget || 1) * 100))}%` : "—";

  return (
    <div className="panel budget-card">
      <p className="eyebrow">MONTHLY PLAN</p>
      <h2>{budget ? money(Number(budget)) : "Set your budget"}</h2>
      <p className="muted">Your spending limit for this month</p>
      <div className="budget-ring"><div><strong>{percentageUsed}</strong><span>used</span></div></div>
      <div className="budget-line"><span>Spent</span><strong>{money(spent)}</strong></div>
      <div className="budget-line"><span>Remaining</span><strong className={remaining < 0 ? "text-danger" : ""}>{budget ? money(remaining) : "—"}</strong></div>
      <button className="secondary-btn full-btn" onClick={onEdit}>{budget ? "Update budget" : "Create budget"} →</button>
    </div>
  );
}
