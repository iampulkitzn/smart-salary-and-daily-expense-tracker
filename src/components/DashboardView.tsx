import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Plus,
  ShieldCheck,
  XOctagon,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency, getLocalTodayStr, type ComputedMetrics } from '../lib/calculations';
import type { ExpenseItem, SnapshotResponse } from '../types/finance';

interface DashboardViewProps {
  snapshot: SnapshotResponse;
  metrics: ComputedMetrics;
  onAddExpense: () => void;
  onNavigate: (tab: 'dashboard' | 'analytics' | 'transactions' | 'settings') => void;
  onConfirmTodaySavings: () => Promise<void>;
  confirmingSavings: boolean;
}

export function DashboardView({
  snapshot,
  metrics,
  onAddExpense,
  onNavigate,
  onConfirmTodaySavings,
  confirmingSavings,
}: DashboardViewProps) {
  const cur = snapshot.user.currency || 'INR';
  const todayStr = getLocalTodayStr();
  const isCurrentMonth = snapshot.month === todayStr.slice(0, 7);

  const alertStyles = {
    nominal: {
      box: 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900',
      text: 'text-emerald-800 dark:text-emerald-300',
      bar: 'bg-emerald-600 dark:bg-emerald-500',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
    },
    warning: {
      box: 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900',
      text: 'text-amber-800 dark:text-amber-300',
      bar: 'bg-amber-500 dark:bg-amber-400',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />,
    },
    exceeded: {
      box: 'bg-red-50/80 dark:bg-red-950/30 border-red-200 dark:border-red-900',
      text: 'text-red-800 dark:text-red-300',
      bar: 'bg-red-600 dark:bg-red-500',
      icon: <XOctagon className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />,
    },
  }[metrics.alertStatus];

  const recentExpenses: ExpenseItem[] = snapshot.monthExpenses.slice(0, 6);
  const progressPct = Math.min(100, Math.round(metrics.todayRatio));
  const monthlyProgressPct = Math.min(100, Math.round(metrics.monthlyUtilizationPct));

  return (
    <div className="space-y-8">
      {/* Smart Daily Budget Alert Banner */}
      <section
        className={`rounded-xl border p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 ${alertStyles.box}`}
      >
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="mt-0.5">{alertStyles.icon}</div>
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className={alertStyles.text}>{metrics.alertLabel}</span>
              <span aria-hidden="true" className="text-slate-400">
                ·
              </span>
              <span className="text-slate-600 dark:text-slate-400 font-mono tabular-nums">
                {Math.round(metrics.todayRatio)}% of daily limit used
              </span>
            </div>
            <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100">
              {metrics.alertMessage}
            </p>
            {metrics.todayPotentialSavings > 0 && metrics.dailyLimit > 0 && isCurrentMonth && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                {snapshot.user.autoSavingsTracking
                  ? `Great! Auto-tracking ${formatCurrency(metrics.todayPotentialSavings, cur)} in daily savings today.`
                  : metrics.todayConfirmedAmount !== null
                    ? `Great! You confirmed ${formatCurrency(metrics.todayConfirmedAmount, cur)} saved today.`
                    : `Unspent today: ${formatCurrency(metrics.todayPotentialSavings, cur)} (confirm below to count as actual savings).`}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {metrics.salary <= 0 && (
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer"
            >
              Set Monthly Salary
            </button>
          )}
          {!snapshot.user.autoSavingsTracking &&
            isCurrentMonth &&
            metrics.dailyLimit > 0 &&
            metrics.todayPotentialSavings > 0 && (
              <button
                type="button"
                onClick={onConfirmTodaySavings}
                disabled={confirmingSavings}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  {metrics.todayConfirmedAmount !== null
                    ? 'Update Confirmed Savings'
                    : `Confirm ${formatCurrency(metrics.todayPotentialSavings, cur)} Saved`}
                </span>
              </button>
            )}
          <button
            type="button"
            onClick={onAddExpense}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Expense</span>
          </button>
        </div>
      </section>

      {/* Primary KPI Grid: Monthly Salary & Daily Control */}
      <section className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1.5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Monthly Salary
            </p>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
              {formatCurrency(metrics.salary, cur)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {metrics.daysInMonth} days in month
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1.5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Fixed Monthly Expenses
            </p>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
              {formatCurrency(metrics.totalFixedExpenses, cur)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {snapshot.fixedExpenses.length} recurring item
              {snapshot.fixedExpenses.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1.5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Monthly Savings Target
            </p>
            <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
              {formatCurrency(metrics.savingsTarget, cur)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Reserved from salary</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1.5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Available Monthly Budget
            </p>
            <p
              className={`text-2xl font-bold font-mono tabular-nums ${
                metrics.rawAvailableMonthlyBudget < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-900 dark:text-slate-50'
              }`}
            >
              {formatCurrency(metrics.availableMonthlyBudget, cur)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Salary − Fixed − Target
            </p>
          </div>
        </div>

        {/* Today's Spending & Savings Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Today&apos;s Spending Limit
              </p>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {metrics.isCustomDailyLimit ? 'Custom' : `÷ ${metrics.remainingDays}d`}
              </span>
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
              {formatCurrency(metrics.dailyLimit, cur)}
            </p>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${alertStyles.bar}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1.5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Today&apos;s Total Spending
            </p>
            <p
              className={`text-2xl font-bold font-mono tabular-nums ${
                metrics.alertStatus === 'exceeded'
                  ? 'text-red-600 dark:text-red-400'
                  : metrics.alertStatus === 'warning'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-900 dark:text-slate-50'
              }`}
            >
              {formatCurrency(metrics.todaySpent, cur)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {Math.round(metrics.todayRatio)}% utilized today
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1.5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Remaining Daily Budget
            </p>
            <p
              className={`text-2xl font-bold font-mono tabular-nums ${
                metrics.todayExceededBy > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-900 dark:text-slate-50'
              }`}
            >
              {metrics.todayExceededBy > 0
                ? `−${formatCurrency(metrics.todayExceededBy, cur)}`
                : formatCurrency(metrics.todayRemaining, cur)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {metrics.todayExceededBy > 0 ? 'Exceeded today' : 'Left for today'}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1.5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Today&apos;s Savings
            </p>
            <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
              {formatCurrency(metrics.todaySavings, cur)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {snapshot.user.autoSavingsTracking ? 'Auto-tracked' : 'Confirmed savings'}
            </p>
          </div>
        </div>

        {/* Monthly Totals & Savings Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Monthly Total Spending
              </p>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {Math.round(metrics.monthlyUtilizationPct)}% of budget
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
                {formatCurrency(metrics.monthlyTotalSpending, cur)}
              </p>
              <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                of {formatCurrency(metrics.availableMonthlyBudget, cur)}
              </p>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  metrics.monthlyUtilizationPct > 100
                    ? 'bg-red-600'
                    : metrics.monthlyUtilizationPct >= 80
                      ? 'bg-amber-500'
                      : 'bg-teal-600'
                }`}
                style={{ width: `${monthlyProgressPct}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1.5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Monthly Savings
            </p>
            <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
              {formatCurrency(metrics.monthlySavings, cur)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Weekly savings: {formatCurrency(metrics.weeklySavings, cur)}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1.5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Cumulative Total Savings
            </p>
            <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
              {formatCurrency(metrics.totalSavings, cur)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {snapshot.user.autoSavingsTracking
                ? 'Automatic tracking active'
                : 'Confirmed daily entries only'}
            </p>
          </div>
        </div>
      </section>

      {/* Main Chart + Category-Based Budgeting */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                Daily Expenses vs. Limit
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Daily spending across the month compared to your{' '}
                <span className="font-mono tabular-nums">{formatCurrency(metrics.dailyLimit, cur)}</span>{' '}
                limit
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline whitespace-nowrap cursor-pointer"
            >
              <span>Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.dailySeries} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0), cur)}
                  labelFormatter={(label) => `Day ${label}`}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                {metrics.dailyLimit > 0 && (
                  <ReferenceLine
                    y={metrics.dailyLimit}
                    stroke="#D97706"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                  />
                )}
                <Bar dataKey="spent" name="Spent" radius={[4, 4, 0, 0]}>
                  {metrics.dailySeries.map((entry) => (
                    <Cell
                      key={entry.date}
                      fill={
                        metrics.dailyLimit > 0 && entry.spent > metrics.dailyLimit
                          ? '#DC2626'
                          : metrics.dailyLimit > 0 && entry.spent >= metrics.dailyLimit * 0.7
                            ? '#D97706'
                            : '#0F766E'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category-Based Budgeting */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                Category Budgets
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Monthly spending against category limits
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline whitespace-nowrap cursor-pointer"
            >
              Manage Limits
            </button>
          </div>

          <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
            {metrics.categoryBreakdown.map((cat) => {
              const barPct = cat.monthlyLimit > 0 ? Math.min(100, Math.round(cat.pct)) : 0;
              return (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {cat.name}
                      </span>
                    </div>
                    <div className="font-mono tabular-nums text-slate-600 dark:text-slate-300 shrink-0">
                      <span
                        className={
                          cat.status === 'exceeded'
                            ? 'text-red-600 dark:text-red-400 font-semibold'
                            : cat.status === 'warning'
                              ? 'text-amber-600 dark:text-amber-400 font-semibold'
                              : ''
                        }
                      >
                        {formatCurrency(cat.spent, cur)}
                      </span>
                      {cat.monthlyLimit > 0 ? (
                        <span className="text-slate-400 dark:text-slate-500">
                          {' '}
                          / {formatCurrency(cat.monthlyLimit, cur)}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500"> · No cap</span>
                      )}
                    </div>
                  </div>
                  {cat.monthlyLimit > 0 && (
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          cat.status === 'exceeded'
                            ? 'bg-red-600'
                            : cat.status === 'warning'
                              ? 'bg-amber-500'
                              : 'bg-teal-600'
                        }`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recent Transactions */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
              Recent Transactions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Latest manual expense entries for this month
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('transactions')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline whitespace-nowrap cursor-pointer"
          >
            <span>View All History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentExpenses.length === 0 ? (
          <div className="py-8 text-center space-y-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No expenses logged for this month yet.
            </p>
            <button
              type="button"
              onClick={onAddExpense}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log First Expense</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 pr-4 font-medium">Description</th>
                  <th className="py-2.5 px-4 font-medium">Category</th>
                  <th className="py-2.5 px-4 font-medium">Date &amp; Time</th>
                  <th className="py-2.5 pl-4 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {recentExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 pr-4 text-slate-900 dark:text-slate-100 font-medium">
                      {exp.description || exp.category}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                      {exp.category}
                    </td>
                    <td className="py-2.5 px-4 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {exp.occurredAt.replace('T', ' ').slice(0, 16)}
                    </td>
                    <td className="py-2.5 pl-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(exp.amount, cur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
