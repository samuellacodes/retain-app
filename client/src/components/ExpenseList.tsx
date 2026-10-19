import { useDispatch } from "react-redux";
import { setCurrentPage, setPageSize } from "../store";
import type { Expense } from "../types";
import Empty from "./Empty";

type ExpenseListProps = {
  expenses: Expense[];
  loading: boolean;
  view: "overview" | "expenses" | "admin";
  pageSize: number;
  currentPage: number;
  pageCount: number;
  visibleCount: number;
  money: (amount: number) => string;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onViewAll: () => void;
};

export default function ExpenseList({
  expenses,
  loading,
  view,
  pageSize,
  currentPage,
  pageCount,
  visibleCount,
  money,
  onEdit,
  onDelete,
  onViewAll,
}: ExpenseListProps) {
  const dispatch = useDispatch();

  return (
    <>
      {loading ? <Empty message="Loading your expenses…" /> : expenses.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>EXPENSE</th><th>CATEGORY</th><th>DATE</th><th>PAYMENT</th><th>AMOUNT</th><th>ACTIONS</th></tr></thead>
            <tbody>{expenses.map((expense) => (
              <tr key={expense._id}>
                <td><strong>{expense.title}</strong><small>{expense.description || expense.notes || "Personal expense"}</small></td>
                <td><span className="category-pill">{expense.category}</span></td>
                <td>{expense.date ? new Date(expense.date).toLocaleDateString() : "—"}</td>
                <td>{expense.paymentMethod || "—"}</td>
                <td className="amount-cell">{money(expense.amount)}</td>
                <td>
                  <button className="table-action" onClick={() => onEdit(expense)} title="Edit">✎</button>
                  <button className="table-action danger-action" onClick={() => onDelete(expense._id)} title="Delete">×</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <Empty message="No expenses found. Add your first expense to get started." />}
      {view === "expenses" && visibleCount > 0 && (
        <div className="pagination">
          <label>Rows per page
            <select value={pageSize} onChange={(event) => dispatch(setPageSize(Number(event.target.value)))}>
              {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <span>Page {currentPage} of {pageCount}</span>
          <div className="pagination-actions">
            <button className="secondary-btn" disabled={currentPage === 1} onClick={() => dispatch(setCurrentPage(currentPage - 1))}>Previous</button>
            <button className="secondary-btn" disabled={currentPage === pageCount} onClick={() => dispatch(setCurrentPage(currentPage + 1))}>Next</button>
          </div>
        </div>
      )}
      <div className="panel-footer">
        <span>Showing {visibleCount ? (view === "overview" ? Math.min(visibleCount, 5) : Math.min(pageSize, visibleCount - (currentPage - 1) * pageSize)) : 0} of {visibleCount} matching expenses</span>
        <button onClick={onViewAll} className="text-btn">View all expenses →</button>
      </div>
    </>
  );
}
