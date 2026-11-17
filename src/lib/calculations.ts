import type { SnapshotResponse } from '../types/finance';

export function getLocalTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLocalDateTimeStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

export function getCurrentMonthStr(): string {
  return getLocalTodayStr().slice(0, 7);
}

export function getDaysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate();
}

export function getRemainingDaysInMonth(month: string, todayStr: string): number {
  const daysInMonth = getDaysInMonth(month);
  const currentMonth = todayStr.slice(0, 7);
  if (month === currentMonth) {
    const todayDay = Number(todayStr.slice(8, 10)) || 1;
    return Math.max(1, daysInMonth - todayDay + 1);
  }
  return daysInMonth;
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const hasDecimals = Math.abs(safeAmount - Math.round(safeAmount)) > 0.005;
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0,
    }).format(safeAmount);
  } catch {
    return `₹${safeAmount.toFixed(hasDecimals ? 2 : 0)}`;
  }
}

export function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export type AlertStatus = 'nominal' | 'warning' | 'exceeded';

export interface ComputedMetrics {
  salary: number;
  totalFixedExpenses: number;
  savingsTarget: number;
  rawAvailableMonthlyBudget: number;
  availableMonthlyBudget: number;
  daysInMonth: number;
  remainingDays: number;
  autoDailyLimit: number;
  dailyLimit: number;
  isCustomDailyLimit: boolean;
  todaySpent: number;
  todayRemaining: number;
  todayExceededBy: number;
  todayRatio: number;
  alertStatus: AlertStatus;
  alertLabel: string;
  alertMessage: string;
  todayPotentialSavings: number;
  todayConfirmedAmount: number | null;
  todaySavings: number;
  weeklySavings: number;
  monthlySavings: number;
  totalSavings: number;
  monthlyTotalSpending: number;
  monthlyRemainingBudget: number;
  monthlyUtilizationPct: number;
  categoryBreakdown: Array<{
    id: number;
    name: string;
    color: string;
    spent: number;
    monthlyLimit: number;
    pct: number;
    status: AlertStatus;
  }>;
  dailySeries: Array<{
    day: string;
    date: string;
    spent: number;
    limit: number;
    saved: number;
  }>;
  weeklySeries: Array<{
    week: string;
    spent: number;
    savings: number;
  }>;
  monthlyComparison: Array<{
    month: string;
    label: string;
    salary: number;
    fixed: number;
    spent: number;
    savings: number;
  }>;
}

export function computeMetrics(
  snapshot: SnapshotResponse,
  todayStr = getLocalTodayStr()
): ComputedMetrics {
  const { month, budget, fixedExpenses, categories, monthExpenses, allExpenses, confirmedSavings, user, allBudgets, allFixedExpenses } =
    snapshot;

  const salary = budget?.salary ?? 0;
  const savingsTarget = budget?.savingsTarget ?? 0;
  const totalFixedExpenses = fixedExpenses.reduce((sum, item) => sum + item.amount, 0);

  const rawAvailableMonthlyBudget = salary - totalFixedExpenses - savingsTarget;
  const availableMonthlyBudget = Math.max(0, rawAvailableMonthlyBudget);

  const daysInMonth = getDaysInMonth(month);
  const remainingDays = getRemainingDaysInMonth(month, todayStr);

  // Formula: Daily Spending Limit = Available Monthly Budget / Number of Remaining Days
  const autoDailyLimit = remainingDays > 0 ? availableMonthlyBudget / remainingDays : 0;
  const isCustomDailyLimit = budget?.customDailyLimit != null && budget.customDailyLimit > 0;
  const dailyLimit = isCustomDailyLimit ? budget!.customDailyLimit! : autoDailyLimit;

  const todayExpenses = monthExpenses.filter((e) => e.date === todayStr);
  const todaySpent = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  const todayRemaining = Math.max(0, dailyLimit - todaySpent);
  const todayExceededBy = Math.max(0, todaySpent - dailyLimit);
  const todayRatio = dailyLimit > 0 ? (todaySpent / dailyLimit) * 100 : todaySpent > 0 ? 101 : 0;

  let alertStatus: AlertStatus = 'nominal';
  let alertLabel = 'Within Budget';
  let alertMessage = '';

  const cur = user.currency || 'INR';

  if (dailyLimit <= 0 && salary <= 0) {
    alertStatus = 'nominal';
    alertLabel = 'Setup Needed';
    alertMessage = 'Configure your monthly salary to activate automatic daily spending limits.';
  } else if (todaySpent > dailyLimit) {
    alertStatus = 'exceeded';
    alertLabel = 'Limit Exceeded';
    alertMessage = `You exceeded your daily limit by ${formatCurrency(todayExceededBy, cur)}.`;
  } else if (todayRatio >= 70) {
    alertStatus = 'warning';
    alertLabel = todayRatio >= 99.99 ? 'Daily Limit Reached' : 'Approaching Limit';
    alertMessage =
      todayRatio >= 99.99
        ? 'Your daily spending limit has been reached.'
        : `Warning: Only ${formatCurrency(todayRemaining, cur)} remains for today.`;
  } else {
    alertStatus = 'nominal';
    alertLabel = 'Within Budget';
    alertMessage =
      todaySpent === 0
        ? `You have ${formatCurrency(dailyLimit, cur)} available to spend today.`
        : `You stayed within your budget — ${formatCurrency(todayRemaining, cur)} remaining today.`;
  }

  const todayPotentialSavings = Math.max(0, dailyLimit - todaySpent);
  const todayConfirmedEntry = confirmedSavings.find((s) => s.date === todayStr) ?? null;
  const todayConfirmedAmount = todayConfirmedEntry ? todayConfirmedEntry.amount : null;

  const todaySavings = user.autoSavingsTracking
    ? todayPotentialSavings
    : todayConfirmedAmount ?? 0;

  // Build daily map for selected month
  const dailySpentMap = new Map<string, number>();
  for (const exp of monthExpenses) {
    dailySpentMap.set(exp.date, (dailySpentMap.get(exp.date) ?? 0) + exp.amount);
  }

  const confirmedByDate = new Map<string, number>();
  for (const cs of confirmedSavings) {
    confirmedByDate.set(cs.date, cs.amount);
  }

  const currentMonth = todayStr.slice(0, 7);
  const todayDayNum = Number(todayStr.slice(8, 10)) || daysInMonth;
  const maxActiveDay = month === currentMonth ? todayDayNum : month < currentMonth ? daysInMonth : 0;

  const dailySeries: ComputedMetrics['dailySeries'] = [];
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const dayPad = String(dayNum).padStart(2, '0');
    const dateKey = `${month}-${dayPad}`;
    const spent = dailySpentMap.get(dateKey) ?? 0;
    let saved = 0;
    if (user.autoSavingsTracking) {
      if (dayNum <= maxActiveDay && dailyLimit > 0 && spent <= dailyLimit) {
        // Count auto-savings on elapsed days where user stayed under limit (only if salary configured or expenses logged)
        if (salary > 0 || isCustomDailyLimit) {
          saved = Math.max(0, dailyLimit - spent);
        }
      }
    } else {
      saved = confirmedByDate.get(dateKey) ?? 0;
    }
    dailySeries.push({
      day: String(dayNum),
      date: dateKey,
      spent,
      limit: Math.round(dailyLimit * 100) / 100,
      saved: Math.round(saved * 100) / 100,
    });
  }

  // Weekly breakdown within selected month
  const weeklyBuckets = [
    { week: 'Week 1 (1–7)', spent: 0, savings: 0 },
    { week: 'Week 2 (8–14)', spent: 0, savings: 0 },
    { week: 'Week 3 (15–21)', spent: 0, savings: 0 },
    { week: 'Week 4 (22–28)', spent: 0, savings: 0 },
    { week: 'Week 5 (29+)', spent: 0, savings: 0 },
  ];

  for (const d of dailySeries) {
    const dayNum = Number(d.day);
    const idx = Math.min(4, Math.floor((dayNum - 1) / 7));
    weeklyBuckets[idx].spent += d.spent;
    weeklyBuckets[idx].savings += d.saved;
  }

  const weeklySeries = weeklyBuckets.filter((_, idx) => idx < 4 || daysInMonth > 28);

  // Weekly savings: last 7 days ending at todayStr (or current week bucket)
  const todayDateObj = new Date(`${todayStr}T00:00:00`);
  const sevenDaysAgo = new Date(todayDateObj);
  sevenDaysAgo.setDate(todayDateObj.getDate() - 6);
  const sevenDaysAgoStr = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysAgo.getDate()).padStart(2, '0')}`;

  let weeklySavings = 0;
  if (user.autoSavingsTracking) {
    weeklySavings = dailySeries
      .filter((d) => d.date >= sevenDaysAgoStr && d.date <= todayStr)
      .reduce((sum, d) => sum + d.saved, 0);
  } else {
    weeklySavings = confirmedSavings
      .filter((s) => s.date >= sevenDaysAgoStr && s.date <= todayStr)
      .reduce((sum, s) => sum + s.amount, 0);
  }

  const monthlySavings = dailySeries.reduce((sum, d) => sum + d.saved, 0);

  // Total Savings across all time
  let totalSavings = 0;
  if (user.autoSavingsTracking) {
    // Confirmed past + auto-tracked active months
    const otherConfirmed = confirmedSavings
      .filter((s) => s.month !== month)
      .reduce((sum, s) => sum + s.amount, 0);
    totalSavings = monthlySavings + otherConfirmed;
  } else {
    totalSavings = confirmedSavings.reduce((sum, s) => sum + s.amount, 0);
  }

  const monthlyTotalSpending = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const monthlyRemainingBudget = availableMonthlyBudget - monthlyTotalSpending;
  const monthlyUtilizationPct =
    availableMonthlyBudget > 0 ? (monthlyTotalSpending / availableMonthlyBudget) * 100 : 0;

  // Category breakdown
  const spentByCat = new Map<string, number>();
  for (const exp of monthExpenses) {
    spentByCat.set(exp.category, (spentByCat.get(exp.category) ?? 0) + exp.amount);
  }

  const categoryBreakdown = categories.map((cat) => {
    const spent = spentByCat.get(cat.name) ?? 0;
    const pct = cat.monthlyLimit > 0 ? (spent / cat.monthlyLimit) * 100 : 0;
    let status: AlertStatus = 'nominal';
    if (cat.monthlyLimit > 0) {
      if (spent > cat.monthlyLimit) status = 'exceeded';
      else if (pct >= 70) status = 'warning';
    }
    return {
      id: cat.id,
      name: cat.name,
      color: cat.color,
      spent,
      monthlyLimit: cat.monthlyLimit,
      pct,
      status,
    };
  });

  // Include any expenses whose category was deleted
  for (const [catName, spent] of spentByCat.entries()) {
    if (!categories.some((c) => c.name === catName)) {
      categoryBreakdown.push({
        id: -1,
        name: catName,
        color: '#64748B',
        spent,
        monthlyLimit: 0,
        pct: 0,
        status: 'nominal',
      });
    }
  }

  // Monthly comparison across months
  const monthsSet = new Set<string>([month]);
  for (const b of allBudgets) monthsSet.add(b.month);
  for (const e of allExpenses) monthsSet.add(e.month);

  const sortedMonths = Array.from(monthsSet).sort().slice(-6);
  const monthlyComparison = sortedMonths.map((m) => {
    const b = allBudgets.find((item) => item.month === m);
    const fixed = allFixedExpenses
      .filter((item) => item.month === m)
      .reduce((sum, item) => sum + item.amount, 0);
    const spent = allExpenses
      .filter((item) => item.month === m)
      .reduce((sum, item) => sum + item.amount, 0);
    const confSaved = confirmedSavings
      .filter((item) => item.month === m)
      .reduce((sum, item) => sum + item.amount, 0);
    const sal = b?.salary ?? 0;
    const sav =
      m === month
        ? monthlySavings
        : user.autoSavingsTracking
          ? Math.max(0, sal - fixed - spent)
          : confSaved;

    return {
      month: m,
      label: formatMonthLabel(m).split(' ')[0].slice(0, 3) + ' ' + m.slice(2, 4),
      salary: sal,
      fixed,
      spent,
      savings: Math.round(sav),
    };
  });

  return {
    salary,
    totalFixedExpenses,
    savingsTarget,
    rawAvailableMonthlyBudget,
    availableMonthlyBudget,
    daysInMonth,
    remainingDays,
    autoDailyLimit,
    dailyLimit,
    isCustomDailyLimit,
    todaySpent,
    todayRemaining,
    todayExceededBy,
    todayRatio,
    alertStatus,
    alertLabel,
    alertMessage,
    todayPotentialSavings,
    todayConfirmedAmount,
    todaySavings,
    weeklySavings,
    monthlySavings,
    totalSavings,
    monthlyTotalSpending,
    monthlyRemainingBudget,
    monthlyUtilizationPct,
    categoryBreakdown,
    dailySeries,
    weeklySeries,
    monthlyComparison,
  };
}
