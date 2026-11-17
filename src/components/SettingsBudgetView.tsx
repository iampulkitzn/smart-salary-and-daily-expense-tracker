import React, { useEffect, useState } from 'react';
import { Bell, Check, Copy, Plus, Trash2 } from 'lucide-react';
import { formatCurrency, formatMonthLabel, type ComputedMetrics } from '../lib/calculations';
import type { SnapshotResponse } from '../types/finance';

interface SettingsBudgetViewProps {
  snapshot: SnapshotResponse;
  metrics: ComputedMetrics;
  onSaveBudget: (payload: {
    salary: number;
    savingsTarget: number;
    customDailyLimit: number | null;
  }) => Promise<void>;
  onCopyPreviousMonth: () => Promise<void>;
  onAddFixedExpense: (name: string, amount: number) => Promise<void>;
  onDeleteFixedExpense: (id: number) => Promise<void>;
  onSaveCategoryLimit: (id: number, monthlyLimit: number) => Promise<void>;
  onCreateCategory: (name: string, monthlyLimit: number, color: string) => Promise<void>;
  onDeleteCategory: (id: number) => Promise<void>;
  onUpdateSettings: (payload: {
    currency?: string;
    notificationsEnabled?: boolean;
    browserNotificationsEnabled?: boolean;
    autoSavingsTracking?: boolean;
    theme?: string;
  }) => Promise<void>;
}

export function SettingsBudgetView({
  snapshot,
  metrics,
  onSaveBudget,
  onCopyPreviousMonth,
  onAddFixedExpense,
  onDeleteFixedExpense,
  onSaveCategoryLimit,
  onCreateCategory,
  onDeleteCategory,
  onUpdateSettings,
}: SettingsBudgetViewProps) {
  const cur = snapshot.user.currency || 'INR';

  const [salary, setSalary] = useState(String(metrics.salary || ''));
  const [savingsTarget, setSavingsTarget] = useState(String(metrics.savingsTarget || ''));
  const [useCustomDaily, setUseCustomDaily] = useState(metrics.isCustomDailyLimit);
  const [customDailyLimit, setCustomDailyLimit] = useState(
    metrics.isCustomDailyLimit ? String(metrics.dailyLimit) : ''
  );
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetSavedMsg, setBudgetSavedMsg] = useState('');
  const [budgetError, setBudgetError] = useState('');

  const [fixedName, setFixedName] = useState('');
  const [fixedAmount, setFixedAmount] = useState('');
  const [addingFixed, setAddingFixed] = useState(false);

  const [categoryLimits, setCategoryLimits] = useState<Record<number, string>>({});
  const [newCatName, setNewCatName] = useState('');
  const [newCatLimit, setNewCatLimit] = useState('');
  const [newCatColor, setNewCatColor] = useState('#0F766E');

  useEffect(() => {
    setSalary(snapshot.budget?.salary ? String(snapshot.budget.salary) : '');
    setSavingsTarget(snapshot.budget?.savingsTarget ? String(snapshot.budget.savingsTarget) : '');
    const hasCustom = snapshot.budget?.customDailyLimit != null && snapshot.budget.customDailyLimit > 0;
    setUseCustomDaily(hasCustom);
    setCustomDailyLimit(hasCustom ? String(snapshot.budget!.customDailyLimit) : '');
  }, [snapshot.month, snapshot.budget]);

  useEffect(() => {
    const map: Record<number, string> = {};
    for (const c of snapshot.categories) {
      map[c.id] = c.monthlyLimit > 0 ? String(c.monthlyLimit) : '';
    }
    setCategoryLimits(map);
  }, [snapshot.categories]);

  const hasPreviousBudget = snapshot.allBudgets.some((b) => b.month < snapshot.month);

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBudgetError('');
    setBudgetSavedMsg('');

    const salNum = salary === '' ? 0 : Number(salary);
    const savNum = savingsTarget === '' ? 0 : Number(savingsTarget);
    const customNum = useCustomDaily && customDailyLimit !== '' ? Number(customDailyLimit) : null;

    if (!Number.isFinite(salNum) || salNum < 0) {
      setBudgetError('Monthly salary must be 0 or greater.');
      return;
    }
    if (!Number.isFinite(savNum) || savNum < 0) {
      setBudgetError('Monthly savings target must be 0 or greater.');
      return;
    }
    if (useCustomDaily && (customNum === null || !Number.isFinite(customNum) || customNum <= 0)) {
      setBudgetError('Custom daily limit must be greater than 0.');
      return;
    }

    setSavingBudget(true);
    try {
      await onSaveBudget({
        salary: salNum,
        savingsTarget: savNum,
        customDailyLimit: customNum,
      });
      setBudgetSavedMsg('Budget updated and daily limits recalculated.');
    } catch (err: unknown) {
      setBudgetError(err instanceof Error ? err.message : 'Failed to save budget.');
    } finally {
      setSavingBudget(false);
    }
  };

  const handleAddFixed = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(fixedAmount);
    if (!fixedName.trim() || !Number.isFinite(num) || num <= 0) return;
    setAddingFixed(true);
    try {
      await onAddFixedExpense(fixedName.trim(), num);
      setFixedName('');
      setFixedAmount('');
    } finally {
      setAddingFixed(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const lim = newCatLimit === '' ? 0 : Number(newCatLimit);
    if (!Number.isFinite(lim) || lim < 0) return;
    await onCreateCategory(newCatName.trim(), lim, newCatColor);
    setNewCatName('');
    setNewCatLimit('');
  };

  const handleBrowserNotifToggle = async () => {
    const next = !snapshot.user.browserNotificationsEnabled;
    if (next && typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        await onUpdateSettings({ browserNotificationsEnabled: false });
        return;
      }
    }
    await onUpdateSettings({ browserNotificationsEnabled: next });
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Monthly Salary & Daily Limit */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleBudgetSubmit}
          className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                Monthly Salary &amp; Daily Limit
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configuration for {formatMonthLabel(snapshot.month)}
              </p>
            </div>
            {hasPreviousBudget && !snapshot.budget && (
              <button
                type="button"
                onClick={onCopyPreviousMonth}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Previous Month</span>
              </button>
            )}
          </div>

          {budgetError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
              {budgetError}
            </div>
          )}
          {budgetSavedMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{budgetSavedMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Monthly Salary
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="e.g. 60000"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono tabular-nums text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Monthly Savings Target
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={savingsTarget}
                onChange={(e) => setSavingsTarget(e.target.value)}
                placeholder="e.g. 15000"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono tabular-nums text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Custom Daily Spending Limit
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Automatic formula:{' '}
                  <span className="font-mono tabular-nums">
                    {formatCurrency(metrics.autoDailyLimit, cur)} / day
                  </span>{' '}
                  ({metrics.remainingDays} days remaining)
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={useCustomDaily}
                onClick={() => setUseCustomDaily(!useCustomDaily)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
                  useCustomDaily ? 'bg-teal-700' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
                    useCustomDaily ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {useCustomDaily && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Override Daily Limit
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={customDailyLimit}
                  onChange={(e) => setCustomDailyLimit(e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-full sm:w-64 px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono tabular-nums text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingBudget}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white transition-colors disabled:opacity-60 cursor-pointer"
            >
              {savingBudget ? 'Saving...' : 'Save Monthly Budget'}
            </button>
          </div>
        </form>

        {/* Fixed Monthly Expenses */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                Fixed Monthly Expenses
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Rent, electricity, internet, EMIs
              </p>
            </div>
            <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {formatCurrency(metrics.totalFixedExpenses, cur)}
            </span>
          </div>

          <form onSubmit={handleAddFixed} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              required
              value={fixedName}
              onChange={(e) => setFixedName(e.target.value)}
              placeholder="e.g. Rent"
              className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <input
              type="number"
              required
              min="1"
              step="1"
              value={fixedAmount}
              onChange={(e) => setFixedAmount(e.target.value)}
              placeholder="Amount"
              className="w-full sm:w-28 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <button
              type="submit"
              disabled={addingFixed}
              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
            {snapshot.fixedExpenses.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No fixed expenses added for {formatMonthLabel(snapshot.month)}.
              </p>
            ) : (
              snapshot.fixedExpenses.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-800 dark:text-slate-200">{item.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                      {formatCurrency(item.amount, cur)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteFixedExpense(item.id)}
                      aria-label={`Remove ${item.name}`}
                      className="p-1 rounded-md text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Section 2: Category-Based Budgeting */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
              Expense Categories &amp; Monthly Budgets
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set monthly spending caps per category or add custom categories
            </p>
          </div>
        </div>

        <form onSubmit={handleAddCategory} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <input
            type="text"
            required
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="New category name (e.g. Fuel)"
            className="sm:col-span-5 px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
          <input
            type="number"
            min="0"
            step="1"
            value={newCatLimit}
            onChange={(e) => setNewCatLimit(e.target.value)}
            placeholder="Monthly limit (optional)"
            className="sm:col-span-4 px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
          <div className="sm:col-span-3 flex items-center gap-2">
            <input
              type="color"
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              aria-label="Category color"
              className="h-9 w-10 rounded border border-slate-200 dark:border-slate-800 bg-transparent cursor-pointer"
            />
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {snapshot.categories.map((cat) => (
            <div
              key={cat.id}
              className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {cat.name}
                  </span>
                </div>
                {!cat.isDefault && (
                  <button
                    type="button"
                    onClick={() => onDeleteCategory(cat.id)}
                    aria-label={`Delete ${cat.name}`}
                    className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={categoryLimits[cat.id] ?? ''}
                  onChange={(e) =>
                    setCategoryLimits((prev) => ({ ...prev, [cat.id]: e.target.value }))
                  }
                  placeholder="No cap"
                  className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = categoryLimits[cat.id] ? Number(categoryLimits[cat.id]) : 0;
                    if (Number.isFinite(val) && val >= 0) {
                      void onSaveCategoryLimit(cat.id, val);
                    }
                  }}
                  className="px-2.5 py-1.5 rounded text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: App Preferences */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
            Savings, Notifications &amp; Display Preferences
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Control automatic savings calculation, alerts, currency, and theme
          </p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <div className="py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Automatic Daily Savings Tracking
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                When off, unspent daily budget is only counted as actual savings when you confirm
                it.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={snapshot.user.autoSavingsTracking}
              onClick={() =>
                onUpdateSettings({ autoSavingsTracking: !snapshot.user.autoSavingsTracking })
              }
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
                snapshot.user.autoSavingsTracking
                  ? 'bg-emerald-600'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
                  snapshot.user.autoSavingsTracking ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                In-App Budget Alerts
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Trigger notifications when spending reaches 70%, exceeds 100%, or achieves savings
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={snapshot.user.notificationsEnabled}
              onClick={() =>
                onUpdateSettings({ notificationsEnabled: !snapshot.user.notificationsEnabled })
              }
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
                snapshot.user.notificationsEnabled
                  ? 'bg-teal-700'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
                  snapshot.user.notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Bell className="w-4 h-4 text-slate-500" />
                <span>Browser Push Notifications</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Send desktop/browser notifications using the Web Notifications API
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={snapshot.user.browserNotificationsEnabled}
              onClick={handleBrowserNotifToggle}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
                snapshot.user.browserNotificationsEnabled
                  ? 'bg-teal-700'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
                  snapshot.user.browserNotificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Currency</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Default currency is Indian Rupees (₹)
              </p>
            </div>
            <select
              value={snapshot.user.currency}
              onChange={(e) => onUpdateSettings({ currency: e.target.value })}
              className="w-full sm:w-48 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100"
            >
              <option value="INR">Indian Rupee (₹)</option>
              <option value="USD">US Dollar ($)</option>
              <option value="EUR">Euro (€)</option>
              <option value="GBP">British Pound (£)</option>
            </select>
          </div>
        </div>
      </section>
    </div>
  );
}
