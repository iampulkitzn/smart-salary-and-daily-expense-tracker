export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  currency: string;
  notificationsEnabled: boolean;
  browserNotificationsEnabled: boolean;
  autoSavingsTracking: boolean;
  theme: 'light' | 'dark' | string;
}

export interface MonthlyBudget {
  id: number;
  userId: number;
  month: string;
  salary: number;
  savingsTarget: number;
  customDailyLimit: number | null;
  updatedAt?: string;
}

export interface FixedExpense {
  id: number;
  userId: number;
  month: string;
  name: string;
  amount: number;
}

export interface CategoryItem {
  id: number;
  userId: number;
  name: string;
  monthlyLimit: number;
  color: string;
  isDefault: boolean;
}

export interface ExpenseItem {
  id: number;
  userId: number;
  amount: number;
  category: string;
  description: string;
  occurredAt: string;
  date: string;
  month: string;
}

export interface ConfirmedSaving {
  id: number;
  userId: number;
  date: string;
  month: string;
  amount: number;
}

export interface NotificationItem {
  id: number;
  userId: number;
  type: 'warning' | 'exceeded' | 'savings' | 'monthly_warning' | 'monthly_summary' | string;
  title: string;
  message: string;
  isRead: boolean;
  date: string;
  createdAt?: string;
}

export interface SnapshotResponse {
  user: UserProfile;
  month: string;
  budget: MonthlyBudget | null;
  fixedExpenses: FixedExpense[];
  categories: CategoryItem[];
  monthExpenses: ExpenseItem[];
  allExpenses: ExpenseItem[];
  confirmedSavings: ConfirmedSaving[];
  notifications: NotificationItem[];
  allBudgets: MonthlyBudget[];
  allFixedExpenses: FixedExpense[];
}
