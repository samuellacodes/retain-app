export type User = { _id?: string; id?: string; name: string; email: string; role: string };

export type Expense = {
  _id: string;
  title: string;
  description?: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod?: string;
  notes?: string;
};

export type ExpenseFormValues = {
  title: string;
  amount: string;
  category: string;
  date: string;
  paymentMethod: string;
  description: string;
  notes: string;
};

export type Category = { _id: string; name: string; description: string };
export type CategoryInsight = { category: string; usageCount: number; totalSpent: number };

export type AdminInsights = {
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

export const API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
