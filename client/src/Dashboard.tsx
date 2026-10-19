import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import AdminDashboard from "./components/AdminDashboard";
import BudgetCard from "./components/BudgetCard";
import BudgetPage from "./components/BudgetPage";
import Empty from "./components/Empty";
import ExpenseFilters from "./components/ExpenseFilters";
import ExpenseForm from "./components/ExpenseForm";
import ExpenseList from "./components/ExpenseList";
import Stat from "./components/Stat";
import {
  addExpense,
  removeExpense,
  selectVisibleExpenses,
  setExpenses,
  setMonth,
  updateExpense,
  type ExpenseState,
} from "./store";
import { API, type AdminInsights, type Category, type Expense, type ExpenseFormValues } from "./types";

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, search, category, paymentMethod, startDate, endDate, sort, month, currentPage, pageSize } = useSelector(
    (state: { expenses: ExpenseState }) => state.expenses
  );
  const visible = useSelector(selectVisibleExpenses);
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const displayPage = Math.min(currentPage, pageCount);
  const pageItems = visible.slice((displayPage - 1) * pageSize, displayPage * pageSize);
  const page = location.pathname === "/admin" ? "admin" :
    location.pathname === "/expenses" ? "expenses" :
    location.pathname === "/budget" ? "budget" : "overview";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [budget, setBudget] = useState("");
  const [budgetInput, setBudgetInput] = useState("");
  const [loadedBudgetMonth, setLoadedBudgetMonth] = useState("");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ExpenseFormValues>({ title: "", amount: "", category: "Food", date: new Date().toISOString().slice(0, 10), paymentMethod: "Cash", description: "", notes: "" });
  const [adminData, setAdminData] = useState<AdminInsights | null>(null);
  const [adminCategories, setAdminCategories] = useState<Category[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const request = useCallback(async (path: string, options: RequestInit = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || `Request failed (${response.status})`);
    return data;
  }, [token]);

  useEffect(() => {
    let active = true;
    void request("/api/expenses").then(async (data) => {
      if (!active) return;
      dispatch(setExpenses(Array.isArray(data) ? data : data.expenses || data.data || []));
      try {
        const categories = await request("/api/categories");
        if (active) setExpenseCategories(categories);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load categories");
      }
    }).catch((err) => {
      if (active) setError(err instanceof Error ? err.message : "Could not load expenses");
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [dispatch, request]);

  useEffect(() => {
    let active = true;
    void request(`/api/budgets/${month}`).then((budgetData) => {
      if (!active) return;
      const amount = Number(budgetData.budget);
      setBudget(amount > 0 ? String(amount) : "");
      setBudgetInput(amount > 0 ? String(amount) : "");
      setLoadedBudgetMonth(month);
      setError("");
    }).catch((err) => {
      if (active) setError(err instanceof Error ? err.message : "Could not load monthly budget");
    });

    return () => { active = false; };
  }, [month, request]);

  const loadAdminData = useCallback(async () => {
    const [insights, categories, expenses] = await Promise.all([
      request("/api/admin/insights"),
      request("/api/categories"),
      request("/api/expenses"),
    ]);
    setAdminData(insights);
    setAdminCategories(categories);
    setExpenseCategories(categories);
    dispatch(setExpenses(Array.isArray(expenses) ? expenses : expenses.expenses || expenses.data || []));
  }, [dispatch, request]);

  useEffect(() => {
    if (page !== "admin" || user?.role !== "admin") return;

    let active = true;
    void Promise.all([
      request("/api/admin/insights"),
      request("/api/categories"),
      request("/api/expenses"),
    ]).then(([insights, categories, expenses]) => {
      if (active) {
        setAdminData(insights);
        setAdminCategories(categories);
        setExpenseCategories(categories);
        dispatch(setExpenses(Array.isArray(expenses) ? expenses : expenses.expenses || expenses.data || []));
      }
    }).catch((err) => {
      if (active) setError(err instanceof Error ? err.message : "Could not load admin data");
    });

    return () => { active = false; };
  }, [dispatch, page, request, user?.role]);

  const categories = useMemo(() => ["All", ...new Set(items.map((e) => e.category).filter(Boolean))], [items]);
  const expenseCategoryOptions = [...new Set([
    "Food", "Transport", "Housing", "Shopping", "Health", "Education", "Entertainment", "Bills", "Other",
    ...expenseCategories.map((item) => item.name),
  ])];
  const monthExpenses = items.filter((expense) => expense.date.slice(0, 7) === month);
  const total = monthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const budgetIsLoaded = loadedBudgetMonth === month;
  const selectedBudget = budgetIsLoaded ? budget : "";
  const selectedBudgetInput = budgetIsLoaded ? budgetInput : "";
  const remaining = Number(selectedBudget || 0) - total;
  const highest = [...monthExpenses].sort((a, b) => b.amount - a.amount)[0];
  const byCategory = Object.entries(monthExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category || "Other"] = (acc[e.category || "Other"] || 0) + Number(e.amount || 0);
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);

  async function saveExpense(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const payload = { ...form, amount: Number(form.amount) };
      const result = await request(editing ? `/api/expenses/${editing._id}` : "/api/expenses", {
        method: editing ? "PUT" : "POST", body: JSON.stringify(payload),
      });
      const expense = result.expense || result.data || result;
      if (editing) dispatch(updateExpense(expense)); else dispatch(addExpense(expense));
      setFormOpen(false); setEditing(null);
      setForm({ title: "", amount: "", category: "Food", date: new Date().toISOString().slice(0, 10), paymentMethod: "Cash", description: "", notes: "" });
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save expense"); }
  }

  async function deleteExpense(id: string) {
    if (!confirm("Delete this expense?")) return;
    try { await request(`/api/expenses/${id}`, { method: "DELETE" }); dispatch(removeExpense(id)); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not delete expense"); }
  }

  async function saveBudget(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await request(`/api/budgets/${month}`, {
        method: "PUT",
        body: JSON.stringify({ amount: Number(budgetInput) }),
      });
      setBudget(budgetInput);
      setLoadedBudgetMonth(month);
      navigate("/overview");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save budget"); }
  }

  async function saveCategory(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await request(editingCategory ? `/api/categories/${editingCategory._id}` : "/api/categories", {
        method: editingCategory ? "PUT" : "POST",
        body: JSON.stringify(categoryForm),
      });
      setCategoryForm({ name: "", description: "" });
      setEditingCategory(null);
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save category");
    }
  }

  async function deleteCategory(category: Category) {
    if (!confirm(`Delete "${category.name}"? Expenses using it will be moved to Uncategorized.`)) return;
    setError("");
    try {
      await request(`/api/categories/${category._id}`, { method: "DELETE" });
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete category");
    }
  }

  function editExpense(expense: Expense) {
    setEditing(expense);
    setForm({ title: expense.title, amount: String(expense.amount), category: expense.category, date: expense.date?.slice(0, 10) || "", paymentMethod: expense.paymentMethod || "Cash", description: expense.description || "", notes: expense.notes || "" });
    setFormOpen(true);
  }

  function updateFormField(field: keyof ExpenseFormValues, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const money = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount);
  const heading = page === "overview" ? "Overview" : page === "expenses" ? "Your expenses" : page === "budget" ? "Monthly budget" : "Admin insights";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><span className="brand-mark small">R</span><span>retain<span className="brand-dot">.</span></span></div>
        <p className="nav-caption">WORKSPACE</p>
        <button className={`nav-link ${page === "overview" ? "active" : ""}`} onClick={() => navigate("/overview")}>▦ <span>Overview</span></button>
        <button className={`nav-link ${page === "expenses" ? "active" : ""}`} onClick={() => navigate("/expenses")}>↗ <span>Expenses</span></button>
        <button className={`nav-link ${page === "budget" ? "active" : ""}`} onClick={() => navigate("/budget")}>◷ <span>Budget planner</span></button>
        {user?.role === "admin" && <><p className="nav-caption admin-caption">ADMINISTRATION</p><button className={`nav-link ${page === "admin" ? "active" : ""}`} onClick={() => navigate("/admin")}>▤ <span>Admin insights</span></button></>}
        <div className="sidebar-bottom"><div className="user-avatar">{user?.name?.slice(0, 1).toUpperCase() || "U"}</div><div className="user-info"><strong>{user?.name || "User"}</strong><span>{user?.role || "Member"}</span></div><button className="logout-btn" title="Sign out" onClick={logout}>↗</button></div>
      </aside>
      <main className="main-panel">
        <header className="topbar"><div><p className="eyebrow">PERSONAL FINANCE</p><h1>{heading}</h1></div><div className="topbar-right">{page !== "admin" && <label className="month-picker">Report month<input type="month" value={month} onChange={(event) => dispatch(setMonth(event.target.value))} /></label>}<div className="user-avatar">{user?.name?.slice(0, 1).toUpperCase() || "U"}</div></div></header>
        {error && <div className="notice-error">{error}<button onClick={() => setError("")}>×</button></div>}
        {page === "budget" && <BudgetPage
          month={month}
          amount={selectedBudgetInput}
          loaded={budgetIsLoaded}
          spent={total}
          remaining={remaining}
          onAmountChange={setBudgetInput}
          onSubmit={saveBudget}
          money={money}
        />}
        {page === "admin" && <section className="stats-grid"><Stat label="Registered users" value={String(adminData?.registeredUsers ?? "—")} /><Stat label="All expenses" value={String(adminData?.expenseCount ?? "—")} /><Stat label="Total expense value" value={typeof adminData?.totalExpenseValue === "number" ? money(adminData.totalExpenseValue) : "—"} /><Stat label="Expenses this month" value={String(adminData?.currentMonthExpenseCount ?? "—")} /></section>}
        {page !== "budget" && page !== "admin" && <>
          <section className="stats-grid">
            <Stat label="Total spent this month" value={money(total)} detail={`${monthExpenses.length} transactions · ${new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`} />
            <Stat label="Budget remaining" value={selectedBudget ? money(remaining) : "Set a budget"} detail={selectedBudget ? remaining < 0 ? "Over budget" : remaining < Number(selectedBudget) * 0.2 ? "Budget running low" : "You're on track" : "Create a monthly plan"} />
            <Stat label="Highest expense" value={highest ? money(highest.amount) : money(0)} detail={highest?.title || "No expenses yet"} />
            <Stat label="Total transactions" value={String(items.length)} detail="Across all time" />
          </section>
          <section className="content-grid">
            <div className="panel category-panel"><div className="panel-heading"><div><p className="eyebrow">YOUR HABITS</p><h2>Spending by category</h2></div><span className="soft-tag">{new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span></div>
              {byCategory.length ? <div className="category-list">{byCategory.map(([name, amount], index) => <div className="category-row" key={name}><div className={`category-icon color-${index % 5}`}>{["◈", "⌂", "✦", "◉", "◇"][index % 5]}</div><div className="category-details"><div className="category-label"><strong>{name}</strong><span>{money(amount)}</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${total ? Math.min(100, amount / total * 100) : 0}%` }} /></div></div></div>)}</div> : <Empty message="Your category breakdown will appear after you add expenses." />}
            </div>
            <BudgetCard budget={selectedBudget} spent={total} remaining={remaining} money={money} onEdit={() => navigate("/budget")} />
          </section>
        </>}
        {page === "admin" && <AdminDashboard
          data={adminData}
          categories={adminCategories}
          editingCategory={editingCategory}
          categoryForm={categoryForm}
          money={money}
          onSaveCategory={saveCategory}
          onDeleteCategory={(category) => void deleteCategory(category)}
          onEditCategory={(category) => { setEditingCategory(category); setCategoryForm({ name: category.name, description: category.description }); }}
          onCancelEdit={() => { setEditingCategory(null); setCategoryForm({ name: "", description: "" }); }}
          onCategoryFormChange={setCategoryForm}
        />}
        {page !== "budget" && <section className="panel expenses-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">TRANSACTION HISTORY</p><h2>{page === "admin" ? "Your recent expenses" : page === "expenses" ? "All expenses" : "Recent expenses"}</h2></div>
            <button className="primary-btn compact" onClick={() => { setEditing(null); setForm({ title: "", amount: "", category: "Food", date: new Date().toISOString().slice(0, 10), paymentMethod: "Cash", description: "", notes: "" }); setFormOpen(true); }}>+ Add expense</button>
          </div>
          <ExpenseFilters
            search={search}
            category={category}
            categories={categories}
            paymentMethod={paymentMethod}
            startDate={startDate}
            endDate={endDate}
            sort={sort}
          />
          {formOpen && <ExpenseForm
            form={form}
            categories={expenseCategoryOptions}
            editing={Boolean(editing)}
            onSubmit={saveExpense}
            onChange={updateFormField}
            onClose={() => setFormOpen(false)}
          />}
          <ExpenseList
            expenses={page === "overview" ? visible.slice(0, 5) : pageItems}
            loading={loading}
            view={page}
            pageSize={pageSize}
            currentPage={displayPage}
            pageCount={pageCount}
            visibleCount={visible.length}
            money={money}
            onEdit={editExpense}
            onDelete={(id) => void deleteExpense(id)}
            onViewAll={() => navigate("/expenses")}
          />
        </section>}
        <footer className="app-footer">Made for clearer money habits <span>·</span> Retain © {new Date().getFullYear()}</footer>
      </main>
    </div>
  );
}
