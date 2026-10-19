import { configureStore, createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Expense } from "./types";

export type ExpenseState = {
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
    resetExpenses: () => initialState,
    addExpense: (state, action: PayloadAction<Expense>) => { state.items.unshift(action.payload); },
    updateExpense: (state, action: PayloadAction<Expense>) => {
      const index = state.items.findIndex((expense) => expense._id === action.payload._id);
      if (index !== -1) state.items[index] = action.payload;
    },
    removeExpense: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((expense) => expense._id !== action.payload);
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

export const {
  setExpenses,
  resetExpenses,
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
} = expenseSlice.actions;

export const store = configureStore({ reducer: { expenses: expenseSlice.reducer } });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const selectVisibleExpenses = createSelector(
  [(state: RootState) => state.expenses],
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
