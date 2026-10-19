import type { ExpenseFormValues } from "../types";

type ExpenseFormProps = {
  form: ExpenseFormValues;
  categories: string[];
  editing: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onChange: (field: keyof ExpenseFormValues, value: string) => void;
  onClose: () => void;
};

export default function ExpenseForm({ form, categories, editing, onSubmit, onChange, onClose }: ExpenseFormProps) {
  return (
    <form className="expense-form" onSubmit={onSubmit}>
      <div className="form-title">
        <h3>{editing ? "Edit expense" : "New expense"}</h3>
        <button type="button" className="close-btn" onClick={onClose}>×</button>
      </div>
      <div className="form-grid">
        <label>Title<input required value={form.title} onChange={(event) => onChange("title", event.target.value)} placeholder="e.g. Groceries" /></label>
        <label>Amount (USD)<input type="number" required min="0.01" step="0.01" value={form.amount} onChange={(event) => onChange("amount", event.target.value)} /></label>
        <label>Category<select value={form.category} onChange={(event) => onChange("category", event.target.value)}>{categories.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label>Date<input type="date" required value={form.date} onChange={(event) => onChange("date", event.target.value)} /></label>
        <label>Payment method<select value={form.paymentMethod} onChange={(event) => onChange("paymentMethod", event.target.value)}>{["Cash", "Card", "Mobile Money", "Bank Transfer", "Other"].map((method) => <option key={method}>{method}</option>)}</select></label>
        <label>Description<input value={form.description} onChange={(event) => onChange("description", event.target.value)} /></label>
        <label className="wide-label">Notes<input value={form.notes} onChange={(event) => onChange("notes", event.target.value)} /></label>
      </div>
      <div className="form-actions">
        <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
        <button className="primary-btn">{editing ? "Save changes" : "Save expense"}</button>
      </div>
    </form>
  );
}
