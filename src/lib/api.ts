import type {
  CategoryItem,
  ConfirmedSaving,
  ExpenseItem,
  FixedExpense,
  MonthlyBudget,
  NotificationItem,
  SnapshotResponse,
  UserProfile,
} from '../types/finance';

async function apiRequest<T>(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export function fetchSnapshot(token: string, month: string): Promise<SnapshotResponse> {
  return apiRequest<SnapshotResponse>(`/api/snapshot?month=${encodeURIComponent(month)}`, token);
}

export function saveMonthlyBudget(
  token: string,
  payload: { month: string; salary: number; savingsTarget: number; customDailyLimit: number | null }
): Promise<MonthlyBudget> {
  return apiRequest<MonthlyBudget>('/api/budget', token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function copyPreviousMonth(token: string, month: string): Promise<MonthlyBudget> {
  return apiRequest<MonthlyBudget>('/api/budget/copy-previous', token, {
    method: 'POST',
    body: JSON.stringify({ month }),
  });
}

export function createFixedExpense(
  token: string,
  payload: { month: string; name: string; amount: number }
): Promise<FixedExpense> {
  return apiRequest<FixedExpense>('/api/fixed-expenses', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateFixedExpense(
  token: string,
  id: number,
  payload: { name: string; amount: number }
): Promise<FixedExpense> {
  return apiRequest<FixedExpense>(`/api/fixed-expenses/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function removeFixedExpense(token: string, id: number): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`/api/fixed-expenses/${id}`, token, {
    method: 'DELETE',
  });
}

export function createExpense(
  token: string,
  payload: { amount: number; category: string; description: string; occurredAt: string }
): Promise<ExpenseItem> {
  return apiRequest<ExpenseItem>('/api/expenses', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function editExpense(
  token: string,
  id: number,
  payload: { amount: number; category: string; description: string; occurredAt: string }
): Promise<ExpenseItem> {
  return apiRequest<ExpenseItem>(`/api/expenses/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function removeExpense(token: string, id: number): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`/api/expenses/${id}`, token, {
    method: 'DELETE',
  });
}

export function saveCategory(
  token: string,
  payload: { name: string; monthlyLimit: number; color: string }
): Promise<CategoryItem> {
  return apiRequest<CategoryItem>('/api/categories', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateCategory(
  token: string,
  id: number,
  payload: { name?: string; monthlyLimit?: number; color?: string }
): Promise<CategoryItem> {
  return apiRequest<CategoryItem>(`/api/categories/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function removeCategory(token: string, id: number): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`/api/categories/${id}`, token, {
    method: 'DELETE',
  });
}

export function confirmSavings(
  token: string,
  payload: { date: string; amount: number }
): Promise<ConfirmedSaving> {
  return apiRequest<ConfirmedSaving>('/api/savings/confirm', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateSettings(
  token: string,
  payload: {
    currency?: string;
    notificationsEnabled?: boolean;
    browserNotificationsEnabled?: boolean;
    autoSavingsTracking?: boolean;
    theme?: string;
  }
): Promise<UserProfile> {
  return apiRequest<UserProfile>('/api/settings', token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function pushNotification(
  token: string,
  payload: { type: string; title: string; message: string; date: string }
): Promise<NotificationItem> {
  return apiRequest<NotificationItem>('/api/notifications', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function markAllNotificationsRead(token: string, id?: number): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>('/api/notifications/read', token, {
    method: 'POST',
    body: JSON.stringify(id !== undefined ? { id } : {}),
  });
}
