import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  Moon,
  Plus,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  confirmSavings,
  copyPreviousMonth,
  createExpense,
  createFixedExpense,
  editExpense,
  fetchSnapshot,
  markAllNotificationsRead,
  pushNotification,
  removeCategory,
  removeExpense,
  removeFixedExpense,
  saveCategory,
  saveMonthlyBudget,
  updateCategory,
  updateSettings,
} from './lib/api';
import {
  computeMetrics,
  formatCurrency,
  getCurrentMonthStr,
  getLocalTodayStr,
} from './lib/calculations';
import type { ExpenseItem, SnapshotResponse } from './types/finance';
import { SignInScreen } from './components/SignInScreen';
import { DashboardView } from './components/DashboardView';
import { AnalyticsView } from './components/AnalyticsView';
import { TransactionsView } from './components/TransactionsView';
import { SettingsBudgetView } from './components/SettingsBudgetView';
import { ExpenseModal } from './components/ExpenseModal';
import { NotificationsDrawer } from './components/NotificationsDrawer';

type TabKey = 'dashboard' | 'analytics' | 'transactions' | 'settings';

function Workspace() {
  const { user, loading, logout, getIdToken } = useAuth();
  const [month, setMonth] = useState<string>(getCurrentMonthStr());
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [snapshot, setSnapshot] = useState<SnapshotResponse | null>(null);
  const [fetching, setFetching] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [confirmingSavings, setConfirmingSavings] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const lastAlertKeyRef = useRef<string>('');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    setLoadError(null);
    try {
      const token = await getIdToken();
      const data = await fetchSnapshot(token, month);
      setSnapshot(data);
      if (data.user.theme === 'dark' || data.user.theme === 'light') {
        setTheme(data.user.theme);
      }
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load financial data.');
    } finally {
      setFetching(false);
    }
  }, [user, month, getIdToken]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const metrics = useMemo(() => {
    if (!snapshot) return null;
    return computeMetrics(snapshot, getLocalTodayStr());
  }, [snapshot]);

  const triggerBudgetAlertIfNeeded = useCallback(
    async (updatedSnapshot: SnapshotResponse) => {
      if (!updatedSnapshot.user.notificationsEnabled) return;
      const todayStr = getLocalTodayStr();
      const m = computeMetrics(updatedSnapshot, todayStr);
      if (m.dailyLimit <= 0) return;

      const cur = updatedSnapshot.user.currency || 'INR';
      let alertPayload: { type: string; title: string; message: string } | null = null;

      if (m.todaySpent > m.dailyLimit) {
        alertPayload = {
          type: 'exceeded',
          title: 'Daily Spending Limit Exceeded',
          message: `You exceeded your daily limit by ${formatCurrency(m.todayExceededBy, cur)} today.`,
        };
      } else if (m.todayRatio >= 70) {
        alertPayload = {
          type: 'warning',
          title: m.todayRatio >= 99.99 ? 'Daily Limit Reached' : 'Daily Budget Warning',
          message:
            m.todayRatio >= 99.99
              ? `You reached 100% of your ${formatCurrency(m.dailyLimit, cur)} daily limit.`
              : `You have used ${Math.round(m.todayRatio)}% of today's budget. Only ${formatCurrency(m.todayRemaining, cur)} remains.`,
        };
      } else if (m.monthlyUtilizationPct >= 80 && m.availableMonthlyBudget > 0) {
        alertPayload = {
          type: 'monthly_warning',
          title: 'Monthly Budget Warning',
          message: `Monthly spending has reached ${Math.round(m.monthlyUtilizationPct)}% of your available monthly budget.`,
        };
      }

      if (!alertPayload) return;
      const key = `${todayStr}:${alertPayload.type}:${Math.round(m.todaySpent)}`;
      if (lastAlertKeyRef.current === key) return;
      lastAlertKeyRef.current = key;

      try {
        const token = await getIdToken();
        await pushNotification(token, { ...alertPayload, date: todayStr });
        if (
          updatedSnapshot.user.browserNotificationsEnabled &&
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          new Notification(alertPayload.title, { body: alertPayload.message });
        }
      } catch {
        // Non-blocking notification error
      }
    },
    [getIdToken]
  );

  const handleSaveExpense = async (payload: {
    id?: number;
    amount: number;
    category: string;
    description: string;
    occurredAt: string;
  }) => {
    const token = await getIdToken();
    if (payload.id) {
      await editExpense(token, payload.id, payload);
    } else {
      await createExpense(token, payload);
    }
    const fresh = await fetchSnapshot(token, month);
    setSnapshot(fresh);
    await triggerBudgetAlertIfNeeded(fresh);
    const refreshed = await fetchSnapshot(token, month);
    setSnapshot(refreshed);
  };

  const handleDeleteExpense = async (id: number) => {
    const token = await getIdToken();
    await removeExpense(token, id);
    await loadData();
  };

  const handleConfirmTodaySavings = async () => {
    if (!metrics || !snapshot) return;
    setConfirmingSavings(true);
    try {
      const token = await getIdToken();
      const todayStr = getLocalTodayStr();
      await confirmSavings(token, { date: todayStr, amount: metrics.todayPotentialSavings });
      if (snapshot.user.notificationsEnabled) {
        await pushNotification(token, {
          type: 'savings',
          title: 'Daily Savings Confirmed',
          message: `Great! You saved ${formatCurrency(metrics.todayPotentialSavings, snapshot.user.currency)} today.`,
          date: todayStr,
        });
      }
      await loadData();
    } finally {
      setConfirmingSavings(false);
    }
  };

  const handleToggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (user) {
      try {
        const token = await getIdToken();
        await updateSettings(token, { theme: next });
      } catch {
        // Ignore transient theme save errors
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Loading workspace...
        </div>
      </div>
    );
  }

  if (!user) {
    return <SignInScreen />;
  }

  const unreadCount = snapshot?.notifications.filter((n) => !n.isRead).length ?? 0;

  const navItems: Array<{ key: TabKey; label: string; icon: typeof LayoutDashboard }> = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'transactions', label: 'Transactions', icon: ListOrdered },
    { key: 'settings', label: 'Salary & Settings', icon: Settings },
  ];

  const pageTitle = navItems.find((item) => item.key === activeTab)?.label ?? 'Dashboard';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
        <div className="h-16 px-6 flex items-center border-b border-slate-200 dark:border-slate-800">
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap">
            RupeeLedger
          </span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
              {user.displayName || 'Personal Account'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-full bg-white dark:bg-slate-900 h-full flex flex-col border-r border-slate-200 dark:border-slate-800">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <span className="text-lg font-bold text-slate-900 dark:text-slate-50">
                RupeeLedger
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.key);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      active
                        ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:pl-60 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50 truncate">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <input
              type="month"
              value={month}
              onChange={(e) => {
                if (e.target.value) setMonth(e.target.value);
              }}
              aria-label="Select month"
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200"
            />

            <button
              type="button"
              onClick={() => setNotificationsOpen(true)}
              aria-label="Notifications"
              className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-mono font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label="Toggle light or dark mode"
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingExpense(null);
                setExpenseModalOpen(true);
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Expense</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto pb-24">
          {loadError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center justify-between gap-4">
              <p className="text-sm text-red-700 dark:text-red-300">{loadError}</p>
              <button
                type="button"
                onClick={() => void loadData()}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {fetching && !snapshot ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                />
              ))}
            </div>
          ) : snapshot && metrics ? (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  snapshot={snapshot}
                  metrics={metrics}
                  onAddExpense={() => {
                    setEditingExpense(null);
                    setExpenseModalOpen(true);
                  }}
                  onNavigate={setActiveTab}
                  onConfirmTodaySavings={handleConfirmTodaySavings}
                  confirmingSavings={confirmingSavings}
                />
              )}

              {activeTab === 'analytics' && (
                <AnalyticsView snapshot={snapshot} metrics={metrics} />
              )}

              {activeTab === 'transactions' && (
                <TransactionsView
                  expenses={snapshot.allExpenses}
                  categories={snapshot.categories}
                  currency={snapshot.user.currency}
                  onAddExpense={() => {
                    setEditingExpense(null);
                    setExpenseModalOpen(true);
                  }}
                  onEditExpense={(exp) => {
                    setEditingExpense(exp);
                    setExpenseModalOpen(true);
                  }}
                  onDeleteExpense={handleDeleteExpense}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsBudgetView
                  snapshot={snapshot}
                  metrics={metrics}
                  onSaveBudget={async (payload) => {
                    const token = await getIdToken();
                    await saveMonthlyBudget(token, { month, ...payload });
                    await loadData();
                  }}
                  onCopyPreviousMonth={async () => {
                    const token = await getIdToken();
                    await copyPreviousMonth(token, month);
                    await loadData();
                  }}
                  onAddFixedExpense={async (name, amount) => {
                    const token = await getIdToken();
                    await createFixedExpense(token, { month, name, amount });
                    await loadData();
                  }}
                  onDeleteFixedExpense={async (id) => {
                    const token = await getIdToken();
                    await removeFixedExpense(token, id);
                    await loadData();
                  }}
                  onSaveCategoryLimit={async (id, monthlyLimit) => {
                    const token = await getIdToken();
                    await updateCategory(token, id, { monthlyLimit });
                    await loadData();
                  }}
                  onCreateCategory={async (name, monthlyLimit, color) => {
                    const token = await getIdToken();
                    await saveCategory(token, { name, monthlyLimit, color });
                    await loadData();
                  }}
                  onDeleteCategory={async (id) => {
                    const token = await getIdToken();
                    await removeCategory(token, id);
                    await loadData();
                  }}
                  onUpdateSettings={async (payload) => {
                    const token = await getIdToken();
                    await updateSettings(token, payload);
                    await loadData();
                  }}
                />
              )}
            </>
          ) : null}
        </main>
      </div>

      {/* Floating Add Expense Button */}
      <button
        type="button"
        onClick={() => {
          setEditingExpense(null);
          setExpenseModalOpen(true);
        }}
        aria-label="Add expense"
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold shadow-lg transition-transform hover:scale-105 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>Add Expense</span>
      </button>

      {/* Modals & Drawers */}
      <ExpenseModal
        open={expenseModalOpen}
        onClose={() => {
          setExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
        categories={snapshot?.categories ?? []}
        editingExpense={editingExpense}
        currency={snapshot?.user.currency ?? 'INR'}
      />

      <NotificationsDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={snapshot?.notifications ?? []}
        onMarkAllRead={async () => {
          const token = await getIdToken();
          await markAllNotificationsRead(token);
          await loadData();
        }}
        onMarkOneRead={async (id) => {
          const token = await getIdToken();
          await markAllNotificationsRead(token, id);
          await loadData();
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Workspace />
    </AuthProvider>
  );
}
