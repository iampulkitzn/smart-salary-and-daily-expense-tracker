import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency, type ComputedMetrics } from '../lib/calculations';
import type { SnapshotResponse } from '../types/finance';

interface AnalyticsViewProps {
  snapshot: SnapshotResponse;
  metrics: ComputedMetrics;
}

export function AnalyticsView({ snapshot, metrics }: AnalyticsViewProps) {
  const cur = snapshot.user.currency || 'INR';
  const activeCategories = metrics.categoryBreakdown.filter((c) => c.spent > 0);

  const utilizationData = [
    {
      name: 'Fixed Bills',
      amount: metrics.totalFixedExpenses,
      color: '#475569',
    },
    {
      name: 'Daily Spending',
      amount: metrics.monthlyTotalSpending,
      color: '#0F766E',
    },
    {
      name: 'Monthly Savings',
      amount: metrics.monthlySavings,
      color: '#16A34A',
    },
    {
      name: 'Remaining Budget',
      amount: Math.max(0, metrics.monthlyRemainingBudget),
      color: '#0284C7',
    },
  ].filter((d) => d.amount > 0);

  return (
    <div className="space-y-6">
      {/* Top Utilization Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Budget Utilization
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
            {Math.round(metrics.monthlyUtilizationPct)}%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {formatCurrency(metrics.monthlyTotalSpending, cur)} spent
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Avg. Daily Spend
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
            {formatCurrency(
              metrics.daysInMonth > 0 ? metrics.monthlyTotalSpending / metrics.daysInMonth : 0,
              cur
            )}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            vs {formatCurrency(metrics.dailyLimit, cur)} daily limit
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Weekly Savings (7d)
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatCurrency(metrics.weeklySavings, cur)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Trailing 7-day window</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Monthly Savings
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatCurrency(metrics.monthlySavings, cur)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Target: {formatCurrency(metrics.savingsTarget, cur)}
          </p>
        </div>
      </section>

      {/* Row 1: Daily Expenses + Weekly Expenses */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
              Daily Expense Trend
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Day-by-day spending against daily limit threshold
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.dailySeries} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0), cur)}
                  labelFormatter={(label) => `Day ${label}`}
                />
                {metrics.dailyLimit > 0 && (
                  <ReferenceLine y={metrics.dailyLimit} stroke="#D97706" strokeDasharray="4 4" />
                )}
                <Bar dataKey="spent" name="Daily Expense" radius={[4, 4, 0, 0]}>
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

        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
              Weekly Spending &amp; Savings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Weekly totals across the selected month
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.weeklySeries} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0), cur)} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="spent" name="Spent" fill="#0F766E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="savings" name="Saved" fill="#16A34A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Row 2: Category-wise Expenses + Month-over-Month Comparison */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
              Category-wise Expenses
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Distribution across spending categories
            </p>
          </div>

          {activeCategories.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
              Log expenses in this month to view category distribution.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activeCategories}
                      dataKey="spent"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {activeCategories.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0), cur)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {activeCategories
                  .slice()
                  .sort((a, b) => b.spent - a.spent)
                  .map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-slate-700 dark:text-slate-300 truncate">
                          {cat.name}
                        </span>
                      </div>
                      <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100 shrink-0">
                        {formatCurrency(cat.spent, cur)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
              Monthly Spending &amp; Savings Comparison
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Compare expenses and savings across recent months
            </p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metrics.monthlyComparison}
                margin={{ top: 10, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0), cur)} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="spent" name="Monthly Expenses" fill="#0F766E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="savings" name="Monthly Savings" fill="#16A34A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Row 3: Salary Allocation & Budget Utilization */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
            Salary &amp; Budget Allocation
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            How your monthly income is distributed across fixed commitments, spending, and savings
          </p>
        </div>

        {utilizationData.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enter your monthly salary and expenses to visualize budget allocation.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {utilizationData.map((item) => (
              <div
                key={item.name}
                className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5"
              >
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.name}</span>
                </div>
                <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
                  {formatCurrency(item.amount, cur)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
