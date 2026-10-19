import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { Provider, useDispatch, useSelector } from "react-redux";
import "./App.css";

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

type User = { _id?: string; id?: string; name: string; email: string; role: string };
type Expense = {
  _id: string;
  title: string;
  description?: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod?: string;
  notes?: string;
};

type AuthValue = {
  user: User | null;
  token: string;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem("retain-token") || "");
  const [user, setUser] = useState<User | null>(() => {
    try {
      return JSON.parse(localStorage.getItem("retain-user") || "null");
    } catch {
      return null;
    }
  });

  async function authRequest(path: string, body: object) {
    const response = await fetch(`${API}/api/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || "Request failed");
    const receivedToken = data.token || data.accessToken;
    const receivedUser = data.user || data.data?.user;
    if (!receivedToken || !receivedUser) {
      throw new Error("The server response did not include a token and user.");
    }
    localStorage.setItem("retain-token", receivedToken);
    localStorage.setItem("retain-user", JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);
  }

  const value: AuthValue = {
    user, token,
    login: (email, password) => authRequest("login", { email, password }),
    register: (name, email, password) => authRequest("register", { name, email, password }),
    logout: () => {
      localStorage.removeItem("retain-token");
      localStorage.removeItem("retain-user");
      setToken("");
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

type ExpenseState = { items: Expense[]; search: string; category: string; sort: string };
const initialState: ExpenseState = { items: [], search: "", category: "All", sort: "newest" };

const expenseSlice = createSlice({
  name: "expenses",
  initialState,
  reducers: {
    setExpenses: (state, action: PayloadAction<Expense[]>) => { state.items = action.payload; },
    addExpense: (state, action: PayloadAction<Expense>) => { state.items.unshift(action.payload); },
    updateExpense: (state, action: PayloadAction<Expense>) => {
      const index = state.items.findIndex((e) => e._id === action.payload._id);
      if (index !== -1) state.items[index] = action.payload;
    },
    removeExpense: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((e) => e._id !== action.payload);
    },
    setSearch: (state, action: PayloadAction<string>) => { state.search = action.payload; },
    setCategory: (state, action: PayloadAction<string>) => { state.category = action.payload; },
    setSort: (state, action: PayloadAction<string>) => { state.sort = action.payload; },
  },
});

const { setExpenses, addExpense, updateExpense, removeExpense, setSearch, setCategory, setSort } =
  expenseSlice.actions;
const store = configureStore({ reducer: { expenses: expenseSlice.reducer } });

function AuthScreen() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isRegister) await register(name, email, password);
      else await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-mark">R</div>
        <p className="eyebrow">YOUR MONEY, IN FOCUS</p>
        <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
        <p className="muted">{isRegister ? "Start building better money habits." : "Sign in to see where your money goes."}</p>
        <form onSubmit={submit} className="auth-form">
          {isRegister && <label>Full name<input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" /></label>}
          <label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required placeholder="At least 8 characters" /></label>
          {error && <p className="error">{error}</p>}
          <button className="primary-btn" disabled={busy}>{busy ? "Please wait..." : isRegister ? "Create account" : "Sign in"}</button>
        </form>
        <p className="switch-auth">{isRegister ? "Already have an account?" : "New to Retain?"} <button onClick={() => { setIsRegister(!isRegister); setError(""); }}>{isRegister ? "Sign in" : "Create an account"}</button></p>
      </section>
      <aside className="auth-art">
        <div className="art-orb orb-one" /><div className="art-orb orb-two" />
        <span className="art-label">A LITTLE MORE CLARITY.</span>
        <h2>Make your money<br />work for <em>you.</em></h2>
        <p>Track your spending. Set your goals. Feel more in control.</p>
        <div className="art-mini-card"><span>Monthly spending</span><strong>Know your numbers.</strong><div className="mini-bars"><i /><i /><i /><i /><i /><i /><i /></div></div>
      </aside>
    </main>
  );
}

function Dashboard() {
  const { user, token, logout } = useAuth();
  const dispatch = useDispatch();
  const { items, search, category, sort } = useSelector(
    (state: { expenses: ExpenseState }) => state.expenses
  );
  const [page, setPage] = useState<"overview" | "expenses" | "budget" | "admin">("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [budget, setBudget] = useState("");
  const [budgetInput, setBudgetInput] = useState("");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", category: "Food", date: new Date().toISOString().slice(0, 10), paymentMethod: "Cash", description: "", notes: "" });
  const [adminData, setAdminData] = useState<Record<string, unknown> | null>(null);

  async function request(path: string, options: RequestInit = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || `Request failed (${response.status})`);
    return data;
  }

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const data = await request("/api/expenses");
      dispatch(setExpenses(Array.isArray(data) ? data : data.expenses || data.data || []));
      try {
        const budgetData = await request(`/api/budgets?month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}`);
        const amount = budgetData.amount ?? budgetData.budget?.amount ?? budgetData.data?.amount;
        if (amount !== undefined) { setBudget(String(amount)); setBudgetInput(String(amount)); }
      } catch { /* Budget can be configured below. */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load expenses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, [token]);

  useEffect(() => {
    if (page === "admin" && user?.role === "admin") {
      void request("/api/admin/insights").then((data) => setAdminData(data.insights || data)).catch((err) => setError(err.message));
    }
  }, [page]);

  const categories = useMemo(() => ["All", ...new Set(items.map((e) => e.category).filter(Boolean))], [items]);
  const visible = useMemo(() => {
    const filtered = items.filter((e) =>
      `${e.title} ${e.description || ""} ${e.category}`.toLowerCase().includes(search.toLowerCase()) &&
      (category === "All" || e.category === category)
    );
    return filtered.sort((a, b) => sort === "oldest" ? Date.parse(a.date) - Date.parse(b.date) :
      sort === "amount-high" ? b.amount - a.amount : sort === "amount-low" ? a.amount - b.amount :
      Date.parse(b.date) - Date.parse(a.date));
  }, [items, search, category, sort]);

  const monthExpenses = items.filter((e) => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const total = monthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const remaining = Number(budget || 0) - total;
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
    try {
      await request("/api/budgets", { method: "POST", body: JSON.stringify({ amount: Number(budgetInput), month: new Date().getMonth() + 1, year: new Date().getFullYear() }) });
      setBudget(budgetInput); setPage("overview");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save budget"); }
  }

  function editExpense(expense: Expense) {
    setEditing(expense);
    setForm({ title: expense.title, amount: String(expense.amount), category: expense.category, date: expense.date?.slice(0, 10) || "", paymentMethod: expense.paymentMethod || "Cash", description: expense.description || "", notes: expense.notes || "" });
    setFormOpen(true);
  }

  const money = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount);
  const heading = page === "overview" ? "Overview" : page === "expenses" ? "Your expenses" : page === "budget" ? "Monthly budget" : "Admin insights";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><span className="brand-mark small">R</span><span>retain<span className="brand-dot">.</span></span></div>
        <p className="nav-caption">WORKSPACE</p>
        <button className={`nav-link ${page === "overview" ? "active" : ""}`} onClick={() => setPage("overview")}>▦ <span>Overview</span></button>
        <button className={`nav-link ${page === "expenses" ? "active" : ""}`} onClick={() => setPage("expenses")}>↗ <span>Expenses</span></button>
        <button className={`nav-link ${page === "budget" ? "active" : ""}`} onClick={() => setPage("budget")}>◷ <span>Budget planner</span></button>
        {user?.role === "admin" && <><p className="nav-caption admin-caption">ADMINISTRATION</p><button className={`nav-link ${page === "admin" ? "active" : ""}`} onClick={() => setPage("admin")}>▤ <span>Admin insights</span></button></>}
        <div className="sidebar-bottom"><div className="user-avatar">{user?.name?.slice(0, 1).toUpperCase() || "U"}</div><div className="user-info"><strong>{user?.name || "User"}</strong><span>{user?.role || "Member"}</span></div><button className="logout-btn" title="Sign out" onClick={logout}>↗</button></div>
      </aside>
      <main className="main-panel">
        <header className="topbar"><div><p className="eyebrow">PERSONAL FINANCE</p><h1>{heading}</h1></div><div className="topbar-right"><span className="today-pill">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span><div className="user-avatar">{user?.name?.slice(0, 1).toUpperCase() || "U"}</div></div></header>
        {error && <div className="notice-error">{error}<button onClick={() => setError("")}>×</button></div>}
        {page === "budget" && <section className="panel budget-panel"><p className="eyebrow">PLAN AHEAD</p><h2>Set your monthly budget</h2><p className="muted">Choose a limit that works for you this month.</p><form onSubmit={saveBudget} className="budget-form"><label>Budget amount (USD)<input type="number" min="0" step="0.01" required value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} placeholder="e.g. 500" /></label><button className="primary-btn">Save budget</button></form><div className="budget-summary"><span>Spent this month</span><strong>{money(total)}</strong><span>Budget remaining</span><strong>{money(remaining)}</strong></div></section>}
        {page === "admin" && <section className="stats-grid"><Stat label="Registered users" value={String(adminData?.registeredUsers ?? "—")} /><Stat label="All expenses" value={String(adminData?.expenseCount ?? "—")} /><Stat label="Total expense value" value={typeof adminData?.totalExpenseValue === "number" ? money(adminData.totalExpenseValue) : "—"} /><Stat label="Expenses this month" value={String(adminData?.currentMonthExpenseCount ?? "—")} /></section>}
        {page !== "budget" && page !== "admin" && <>
          <section className="stats-grid">
            <Stat label="Total spent this month" value={money(total)} detail={`${monthExpenses.length} transactions`} />
            <Stat label="Budget remaining" value={budget ? money(remaining) : "Set a budget"} detail={budget ? remaining < 0 ? "Over budget" : remaining < Number(budget) * 0.2 ? "Budget running low" : "You're on track" : "Create a monthly plan"} />
            <Stat label="Highest expense" value={highest ? money(highest.amount) : money(0)} detail={highest?.title || "No expenses yet"} />
            <Stat label="Total transactions" value={String(items.length)} detail="Across all time" />
          </section>
          <section className="content-grid">
            <div className="panel category-panel"><div className="panel-heading"><div><p className="eyebrow">YOUR HABITS</p><h2>Spending by category</h2></div><span className="soft-tag">This month</span></div>
              {byCategory.length ? <div className="category-list">{byCategory.map(([name, amount], index) => <div className="category-row" key={name}><div className={`category-icon color-${index % 5}`}>{["◈", "⌂", "✦", "◉", "◇"][index % 5]}</div><div className="category-details"><div className="category-label"><strong>{name}</strong><span>{money(amount)}</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${total ? Math.min(100, amount / total * 100) : 0}%` }} /></div></div></div>)}</div> : <Empty message="Your category breakdown will appear after you add expenses." />}
            </div>
            <div className="panel budget-card"><p className="eyebrow">MONTHLY PLAN</p><h2>{budget ? money(Number(budget)) : "Set your budget"}</h2><p className="muted">Your spending limit for this month</p><div className="budget-ring"><div><strong>{budget ? `${Math.max(0, Math.round(total / Number(budget || 1) * 100))}%` : "—"}</strong><span>used</span></div></div><div className="budget-line"><span>Spent</span><strong>{money(total)}</strong></div><div className="budget-line"><span>Remaining</span><strong className={remaining < 0 ? "text-danger" : ""}>{budget ? money(remaining) : "—"}</strong></div><button className="secondary-btn full-btn" onClick={() => setPage("budget")}>{budget ? "Update budget" : "Create budget"} →</button></div>
          </section>
        </>}
        {page === "admin" && <section className="panel"><div className="panel-heading"><div><p className="eyebrow">ADMINISTRATION</p><h2>Category usage</h2></div></div>{Array.isArray(adminData?.spendingByCategory) && (adminData.spendingByCategory as Array<{ _id?: string; category?: string; total?: number; count?: number }>).map((c, i) => <div className="category-row" key={c._id || c.category || i}><div className="category-details"><div className="category-label"><strong>{c.category || c._id || "Other"}</strong><span>{c.count ?? 0} expenses · {money(c.total ?? 0)}</span></div></div></div>)}{!adminData && <Empty message="Loading platform insights…" />}</section>}
        {page !== "budget" && <section className="panel expenses-panel"><div className="panel-heading"><div><p className="eyebrow">TRANSACTION HISTORY</p><h2>{page === "admin" ? "Your recent expenses" : page === "expenses" ? "All expenses" : "Recent expenses"}</h2></div><button className="primary-btn compact" onClick={() => { setEditing(null); setForm({ title: "", amount: "", category: "Food", date: new Date().toISOString().slice(0, 10), paymentMethod: "Cash", description: "", notes: "" }); setFormOpen(true); }}>+ Add expense</button></div>
          <div className="filters"><input aria-label="Search expenses" placeholder="Search expenses..." value={search} onChange={(e) => dispatch(setSearch(e.target.value))} /><select aria-label="Filter category" value={category} onChange={(e) => dispatch(setCategory(e.target.value))}>{categories.map((c) => <option key={c}>{c}</option>)}</select><select aria-label="Sort expenses" value={sort} onChange={(e) => dispatch(setSort(e.target.value))}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="amount-high">Highest amount</option><option value="amount-low">Lowest amount</option></select></div>
          {formOpen && <form className="expense-form" onSubmit={saveExpense}><div className="form-title"><h3>{editing ? "Edit expense" : "New expense"}</h3><button type="button" className="close-btn" onClick={() => setFormOpen(false)}>×</button></div><div className="form-grid"><label>Title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Groceries" /></label><label>Amount (USD)<input type="number" required min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label><label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{["Food", "Transport", "Housing", "Shopping", "Health", "Education", "Entertainment", "Bills", "Other"].map((c) => <option key={c}>{c}</option>)}</select></label><label>Date<input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label>Payment method<select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>{["Cash", "Card", "Mobile Money", "Bank Transfer", "Other"].map((p) => <option key={p}>{p}</option>)}</select></label><label>Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><label className="wide-label">Notes<input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label></div><div className="form-actions"><button type="button" className="secondary-btn" onClick={() => setFormOpen(false)}>Cancel</button><button className="primary-btn">{editing ? "Save changes" : "Save expense"}</button></div></form>}
          {loading ? <Empty message="Loading your expenses…" /> : visible.length ? <div className="table-wrap"><table><thead><tr><th>EXPENSE</th><th>CATEGORY</th><th>DATE</th><th>PAYMENT</th><th>AMOUNT</th><th>ACTIONS</th></tr></thead><tbody>{(page === "overview" ? visible.slice(0, 5) : visible).map((e) => <tr key={e._id}><td><strong>{e.title}</strong><small>{e.description || e.notes || "Personal expense"}</small></td><td><span className="category-pill">{e.category}</span></td><td>{e.date ? new Date(e.date).toLocaleDateString() : "—"}</td><td>{e.paymentMethod || "—"}</td><td className="amount-cell">{money(e.amount)}</td><td><button className="table-action" onClick={() => editExpense(e)} title="Edit">✎</button><button className="table-action danger-action" onClick={() => void deleteExpense(e._id)} title="Delete">×</button></td></tr>)}</tbody></table></div> : <Empty message="No expenses found. Add your first expense to get started." />}
          <div className="panel-footer"><span>Showing {visible.length ? (page === "overview" ? Math.min(visible.length, 5) : visible.length) : 0} of {visible.length} matching expenses</span><button onClick={() => setPage("expenses")} className="text-btn">View all expenses →</button></div>
        </section>}
        <footer className="app-footer">Made for clearer money habits <span>·</span> Retain © {new Date().getFullYear()}</footer>
      </main>
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <article className="stat-card"><p>{label}</p><strong>{value}</strong>{detail && <span>{detail}</span>}</article>;
}
function Empty({ message }: { message: string }) { return <div className="empty-state"><span>◌</span><p>{message}</p></div>; }

function RootApp() {
  const { user, token } = useAuth();
  return token && user ? <Dashboard /> : <AuthScreen />;
}

export default function App() {
  return <AuthProvider><Provider store={store}><RootApp /></Provider></AuthProvider>;
}
