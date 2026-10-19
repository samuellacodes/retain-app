import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { configureStore, createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";
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
type Category = { _id: string; name: string; description: string };
type CategoryInsight = { category: string; usageCount: number; totalSpent: number };
type AdminInsights = {
  registeredUsers: number;
  expenseCount: number;
  totalExpenseValue: number;
  currentMonthExpenseCount: number;
  spendingByCategory: CategoryInsight[];
  topFiveCategories: CategoryInsight[];
  bottomFiveCategories: CategoryInsight[];
  recentExpenses: Array<Expense & { user: Pick<User, "name" | "email"> | null; createdAt: string }>;
  recentUsers: Array<User & { createdAt: string }>;
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

type ExpenseState = {
  items: Expense[];
  search: string;
  category: string;
  paymentMethod: string;
  startDate: string;
  endDate: string;
  sort: string;
  month: string;
  currentPage: number;
  pageSize: number;
};
const today = new Date();
const initialState: ExpenseState = {
  items: [],
  search: "",
  category: "All",
  paymentMethod: "All",
  startDate: "",
  endDate: "",
  sort: "newest",
  month: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
  currentPage: 1,
  pageSize: 10,
};

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
    setSearch: (state, action: PayloadAction<string>) => { state.search = action.payload; state.currentPage = 1; },
    setCategory: (state, action: PayloadAction<string>) => { state.category = action.payload; state.currentPage = 1; },
    setPaymentMethod: (state, action: PayloadAction<string>) => { state.paymentMethod = action.payload; state.currentPage = 1; },
    setStartDate: (state, action: PayloadAction<string>) => { state.startDate = action.payload; state.currentPage = 1; },
    setEndDate: (state, action: PayloadAction<string>) => { state.endDate = action.payload; state.currentPage = 1; },
    setSort: (state, action: PayloadAction<string>) => { state.sort = action.payload; state.currentPage = 1; },
    setMonth: (state, action: PayloadAction<string>) => { state.month = action.payload; },
    setCurrentPage: (state, action: PayloadAction<number>) => { state.currentPage = action.payload; },
    setPageSize: (state, action: PayloadAction<number>) => { state.pageSize = action.payload; state.currentPage = 1; },
  },
});

const {
  setExpenses,
  addExpense,
  updateExpense,
  removeExpense,
  setSearch,
  setCategory,
  setPaymentMethod,
  setStartDate,
  setEndDate,
  setSort,
  setMonth,
  setCurrentPage,
  setPageSize,
} =
  expenseSlice.actions;
const store = configureStore({ reducer: { expenses: expenseSlice.reducer } });
const selectVisibleExpenses = createSelector(
  [(state: { expenses: ExpenseState }) => state.expenses],
  ({ items, search, category, paymentMethod, startDate, endDate, sort }) => {
    const filtered = items.filter((expense) =>
      `${expense.title} ${expense.description || ""} ${expense.category}`.toLowerCase().includes(search.toLowerCase()) &&
      (category === "All" || expense.category === category) &&
      (paymentMethod === "All" || expense.paymentMethod === paymentMethod) &&
      (!startDate || expense.date.slice(0, 10) >= startDate) &&
      (!endDate || expense.date.slice(0, 10) <= endDate)
    );

    return filtered.sort((a, b) => sort === "oldest" ? Date.parse(a.date) - Date.parse(b.date) :
      sort === "amount-high" ? b.amount - a.amount : sort === "amount-low" ? a.amount - b.amount :
      Date.parse(b.date) - Date.parse(a.date));
  }
);

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
  const { items, search, category, paymentMethod, startDate, endDate, sort, month, currentPage, pageSize } = useSelector(
    (state: { expenses: ExpenseState }) => state.expenses
  );
  const visible = useSelector(selectVisibleExpenses);
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const displayPage = Math.min(currentPage, pageCount);
  const pageItems = visible.slice((displayPage - 1) * pageSize, displayPage * pageSize);
  const [page, setPage] = useState<"overview" | "expenses" | "budget" | "admin">("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [budget, setBudget] = useState("");
  const [budgetInput, setBudgetInput] = useState("");
  const [loadedBudgetMonth, setLoadedBudgetMonth] = useState("");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", category: "Food", date: new Date().toISOString().slice(0, 10), paymentMethod: "Cash", description: "", notes: "" });
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
      setPage("overview");
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
        <header className="topbar"><div><p className="eyebrow">PERSONAL FINANCE</p><h1>{heading}</h1></div><div className="topbar-right">{page !== "admin" && <label className="month-picker">Report month<input type="month" value={month} onChange={(event) => dispatch(setMonth(event.target.value))} /></label>}<div className="user-avatar">{user?.name?.slice(0, 1).toUpperCase() || "U"}</div></div></header>
        {error && <div className="notice-error">{error}<button onClick={() => setError("")}>×</button></div>}
        {page === "budget" && <section className="panel budget-panel"><p className="eyebrow">PLAN AHEAD · {new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p><h2>Set your monthly budget</h2><p className="muted">Choose a limit that works for you this month.</p><form onSubmit={saveBudget} className="budget-form"><label>Budget amount (USD)<input type="number" min="0" step="0.01" required disabled={!budgetIsLoaded} value={selectedBudgetInput} onChange={(e) => setBudgetInput(e.target.value)} placeholder="e.g. 500" /></label><button className="primary-btn" disabled={!budgetIsLoaded}>Save budget</button></form><div className="budget-summary"><span>Spent this month</span><strong>{money(total)}</strong><span>Budget remaining</span><strong>{money(remaining)}</strong></div></section>}
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
            <div className="panel budget-card"><p className="eyebrow">MONTHLY PLAN</p><h2>{selectedBudget ? money(Number(selectedBudget)) : "Set your budget"}</h2><p className="muted">Your spending limit for this month</p><div className="budget-ring"><div><strong>{selectedBudget ? `${Math.max(0, Math.round(total / Number(selectedBudget || 1) * 100))}%` : "—"}</strong><span>used</span></div></div><div className="budget-line"><span>Spent</span><strong>{money(total)}</strong></div><div className="budget-line"><span>Remaining</span><strong className={remaining < 0 ? "text-danger" : ""}>{selectedBudget ? money(remaining) : "—"}</strong></div><button className="secondary-btn full-btn" onClick={() => setPage("budget")}>{selectedBudget ? "Update budget" : "Create budget"} →</button></div>
          </section>
        </>}
        {page === "admin" && <>
          <section className="content-grid admin-insights-grid">
            <div className="panel">
              <div className="panel-heading"><div><p className="eyebrow">PLATFORM</p><h2>Spending by category</h2></div></div>
              {adminData?.spendingByCategory.length ? adminData.spendingByCategory.map((item) => <div className="category-row" key={item.category}><div className="category-details"><div className="category-label"><strong>{item.category}</strong><span>{item.usageCount} expenses · {money(item.totalSpent)}</span></div></div></div>) : <Empty message="No category spending to show yet." />}
            </div>
            <div className="panel">
              <div className="panel-heading"><div><p className="eyebrow">MOST USED</p><h2>Top categories</h2></div></div>
              {adminData?.topFiveCategories.map((item, index) => <div className="category-row" key={item.category}><div className="category-details"><div className="category-label"><strong>{index + 1}. {item.category}</strong><span>{item.usageCount}</span></div></div></div>)}
              <div className="panel-heading admin-subheading"><div><p className="eyebrow">LEAST USED</p><h2>Bottom categories</h2></div></div>
              {adminData?.bottomFiveCategories.map((item) => <div className="category-row" key={item.category}><div className="category-details"><div className="category-label"><strong>{item.category}</strong><span>{item.usageCount}</span></div></div></div>)}
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading"><div><p className="eyebrow">CATEGORY SETUP</p><h2>{editingCategory ? "Edit category" : "Add a category"}</h2></div></div>
            <form className="category-form" onSubmit={saveCategory}>
              <label>Name<input required value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} /></label>
              <label>Description<input value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} /></label>
              <div className="form-actions">
                {editingCategory && <button type="button" className="secondary-btn" onClick={() => { setEditingCategory(null); setCategoryForm({ name: "", description: "" }); }}>Cancel edit</button>}
                <button className="primary-btn">{editingCategory ? "Save category" : "Add category"}</button>
              </div>
            </form>
            {adminCategories.map((item) => <div className="category-row admin-category-row" key={item._id}>
              <div className="category-details"><div className="category-label"><strong>{item.name}</strong><span>{item.description || "No description"}</span></div></div>
              <button className="table-action" onClick={() => { setEditingCategory(item); setCategoryForm({ name: item.name, description: item.description }); }}>Edit</button>
              <button className="table-action danger-action" onClick={() => void deleteCategory(item)} title={`Delete ${item.name}`}>×</button>
            </div>)}
          </section>
          <section className="content-grid admin-insights-grid">
            <div className="panel"><div className="panel-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Recently added expenses</h2></div></div>
              {adminData?.recentExpenses.length ? <div className="table-wrap"><table><thead><tr><th>EXPENSE</th><th>USER</th><th>CATEGORY</th><th>AMOUNT</th></tr></thead><tbody>{adminData.recentExpenses.map((item) => <tr key={item._id}><td>{item.title}</td><td>{item.user?.name || "Unknown"}</td><td>{item.category}</td><td>{money(item.amount)}</td></tr>)}</tbody></table></div> : <Empty message="No expenses recorded yet." />}
            </div>
            <div className="panel"><div className="panel-heading"><div><p className="eyebrow">NEW ACCOUNTS</p><h2>Recently registered users</h2></div></div>
              {adminData?.recentUsers.length ? <div className="table-wrap"><table><thead><tr><th>NAME</th><th>EMAIL</th><th>ROLE</th></tr></thead><tbody>{adminData.recentUsers.map((item) => <tr key={item.id || item._id}><td>{item.name}</td><td>{item.email}</td><td>{item.role}</td></tr>)}</tbody></table></div> : <Empty message="No users registered yet." />}
            </div>
          </section>
          {!adminData && <Empty message="Loading platform insights…" />}
        </>}
        {page !== "budget" && <section className="panel expenses-panel"><div className="panel-heading"><div><p className="eyebrow">TRANSACTION HISTORY</p><h2>{page === "admin" ? "Your recent expenses" : page === "expenses" ? "All expenses" : "Recent expenses"}</h2></div><button className="primary-btn compact" onClick={() => { setEditing(null); setForm({ title: "", amount: "", category: "Food", date: new Date().toISOString().slice(0, 10), paymentMethod: "Cash", description: "", notes: "" }); setFormOpen(true); }}>+ Add expense</button></div>
          <div className="filters">
            <input className="filter-search" aria-label="Search expenses" placeholder="Search expenses..." value={search} onChange={(e) => dispatch(setSearch(e.target.value))} />
            <select aria-label="Filter category" value={category} onChange={(e) => dispatch(setCategory(e.target.value))}>{categories.map((c) => <option key={c}>{c}</option>)}</select>
            <select aria-label="Filter payment method" value={paymentMethod} onChange={(e) => dispatch(setPaymentMethod(e.target.value))}>
              {["All", "Cash", "Card", "Mobile Money", "Bank Transfer", "Other"].map((method) => <option key={method}>{method}</option>)}
            </select>
            <input type="date" aria-label="Start date" value={startDate} onChange={(e) => dispatch(setStartDate(e.target.value))} />
            <input type="date" aria-label="End date" value={endDate} min={startDate || undefined} onChange={(e) => dispatch(setEndDate(e.target.value))} />
            <select aria-label="Sort expenses" value={sort} onChange={(e) => dispatch(setSort(e.target.value))}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="amount-high">Highest amount</option><option value="amount-low">Lowest amount</option></select>
          </div>
          {formOpen && <form className="expense-form" onSubmit={saveExpense}><div className="form-title"><h3>{editing ? "Edit expense" : "New expense"}</h3><button type="button" className="close-btn" onClick={() => setFormOpen(false)}>×</button></div><div className="form-grid"><label>Title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Groceries" /></label><label>Amount (USD)<input type="number" required min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label><label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{expenseCategoryOptions.map((name) => <option key={name}>{name}</option>)}</select></label><label>Date<input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label>Payment method<select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>{["Cash", "Card", "Mobile Money", "Bank Transfer", "Other"].map((p) => <option key={p}>{p}</option>)}</select></label><label>Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><label className="wide-label">Notes<input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label></div><div className="form-actions"><button type="button" className="secondary-btn" onClick={() => setFormOpen(false)}>Cancel</button><button className="primary-btn">{editing ? "Save changes" : "Save expense"}</button></div></form>}
          {loading ? <Empty message="Loading your expenses…" /> : visible.length ? <div className="table-wrap"><table><thead><tr><th>EXPENSE</th><th>CATEGORY</th><th>DATE</th><th>PAYMENT</th><th>AMOUNT</th><th>ACTIONS</th></tr></thead><tbody>{(page === "overview" ? visible.slice(0, 5) : pageItems).map((e) => <tr key={e._id}><td><strong>{e.title}</strong><small>{e.description || e.notes || "Personal expense"}</small></td><td><span className="category-pill">{e.category}</span></td><td>{e.date ? new Date(e.date).toLocaleDateString() : "—"}</td><td>{e.paymentMethod || "—"}</td><td className="amount-cell">{money(e.amount)}</td><td><button className="table-action" onClick={() => editExpense(e)} title="Edit">✎</button><button className="table-action danger-action" onClick={() => void deleteExpense(e._id)} title="Delete">×</button></td></tr>)}</tbody></table></div> : <Empty message="No expenses found. Add your first expense to get started." />}
          {page === "expenses" && visible.length > 0 && <div className="pagination">
            <label>Rows per page
              <select value={pageSize} onChange={(event) => dispatch(setPageSize(Number(event.target.value)))}>
                {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
            <span>Page {displayPage} of {pageCount}</span>
            <div className="pagination-actions">
              <button className="secondary-btn" disabled={displayPage === 1} onClick={() => dispatch(setCurrentPage(displayPage - 1))}>Previous</button>
              <button className="secondary-btn" disabled={displayPage === pageCount} onClick={() => dispatch(setCurrentPage(displayPage + 1))}>Next</button>
            </div>
          </div>}
          <div className="panel-footer"><span>Showing {visible.length ? (page === "overview" ? Math.min(visible.length, 5) : Math.min(pageSize, visible.length - (displayPage - 1) * pageSize)) : 0} of {visible.length} matching expenses</span><button onClick={() => setPage("expenses")} className="text-btn">View all expenses →</button></div>
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
