import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  addExpense,
  addFixedExpense,
  confirmDailySavings,
  copyPreviousMonthSetup,
  createNotification,
  deleteCategoryById,
  deleteExpense,
  deleteFixedExpense,
  getUserSnapshot,
  markNotificationsRead,
  updateCategoryById,
  updateExpense,
  updateFixedExpense,
  updateUserPreferences,
  upsertCategory,
  upsertMonthlyBudget,
} from './src/db/finance.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const isValidMonth = (month: unknown): month is string =>
  typeof month === 'string' && /^\d{4}-\d{2}$/.test(month);

const isValidDate = (date: unknown): date is string =>
  typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);

const isPositiveNumber = (val: unknown): val is number =>
  typeof val === 'number' && Number.isFinite(val) && val > 0;

const isNonNegativeNumber = (val: unknown): val is number =>
  typeof val === 'number' && Number.isFinite(val) && val >= 0;

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/snapshot', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const rawMonth = req.query.month;
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const month = isValidMonth(rawMonth) ? rawMonth : defaultMonth;

    const snapshot = await getUserSnapshot(dbUser.id, month);
    res.json({
      user: dbUser,
      month,
      ...snapshot,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to load financial data';
    res.status(500).json({ error: msg });
  }
});

app.put('/api/budget', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const { month, salary, savingsTarget, customDailyLimit } = req.body ?? {};
    if (!isValidMonth(month)) {
      return res.status(400).json({ error: 'Invalid month format (expected YYYY-MM).' });
    }
    if (!isNonNegativeNumber(salary) || !isNonNegativeNumber(savingsTarget)) {
      return res.status(400).json({ error: 'Salary and savings target must be non-negative numbers.' });
    }
    if (customDailyLimit !== null && customDailyLimit !== undefined && !isPositiveNumber(customDailyLimit)) {
      return res.status(400).json({ error: 'Custom daily limit must be a positive number or null.' });
    }

    const updated = await upsertMonthlyBudget(dbUser.id, month, {
      salary,
      savingsTarget,
      customDailyLimit: customDailyLimit ?? null,
    });
    res.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update monthly budget';
    res.status(500).json({ error: msg });
  }
});

app.post('/api/budget/copy-previous', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const { month } = req.body ?? {};
    if (!isValidMonth(month)) {
      return res.status(400).json({ error: 'Invalid month format.' });
    }
    const copied = await copyPreviousMonthSetup(dbUser.id, month);
    if (!copied) {
      return res.status(404).json({ error: 'No previous month configuration found.' });
    }
    res.json(copied);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to copy previous month';
    res.status(500).json({ error: msg });
  }
});

app.post('/api/fixed-expenses', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const { month, name, amount } = req.body ?? {};
    if (!isValidMonth(month) || typeof name !== 'string' || !name.trim() || !isPositiveNumber(amount)) {
      return res.status(400).json({ error: 'Valid month, name, and positive amount are required.' });
    }
    const item = await addFixedExpense(dbUser.id, month, name.trim(), amount);
    res.status(201).json(item);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to add fixed expense';
    res.status(500).json({ error: msg });
  }
});

app.put('/api/fixed-expenses/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const id = Number(req.params.id);
    const { name, amount } = req.body ?? {};
    if (!Number.isInteger(id) || typeof name !== 'string' || !name.trim() || !isPositiveNumber(amount)) {
      return res.status(400).json({ error: 'Valid ID, name, and positive amount are required.' });
    }
    const updated = await updateFixedExpense(dbUser.id, id, { name: name.trim(), amount });
    if (!updated) {
      return res.status(404).json({ error: 'Fixed expense not found.' });
    }
    res.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update fixed expense';
    res.status(500).json({ error: msg });
  }
});

app.delete('/api/fixed-expenses/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid fixed expense ID.' });
    }
    const deleted = await deleteFixedExpense(dbUser.id, id);
    if (!deleted) {
      return res.status(404).json({ error: 'Fixed expense not found.' });
    }
    res.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to delete fixed expense';
    res.status(500).json({ error: msg });
  }
});

app.post('/api/expenses', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const { amount, category, description, occurredAt } = req.body ?? {};
    if (
      !isPositiveNumber(amount) ||
      typeof category !== 'string' ||
      !category.trim() ||
      typeof occurredAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(occurredAt)
    ) {
      return res.status(400).json({ error: 'Valid positive amount, category, and date/time are required.' });
    }
    const created = await addExpense(dbUser.id, {
      amount,
      category: category.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      occurredAt,
    });
    res.status(201).json(created);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create expense';
    res.status(500).json({ error: msg });
  }
});

app.put('/api/expenses/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const id = Number(req.params.id);
    const { amount, category, description, occurredAt } = req.body ?? {};
    if (
      !Number.isInteger(id) ||
      !isPositiveNumber(amount) ||
      typeof category !== 'string' ||
      !category.trim() ||
      typeof occurredAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(occurredAt)
    ) {
      return res.status(400).json({ error: 'Valid ID, positive amount, category, and date/time are required.' });
    }
    const updated = await updateExpense(dbUser.id, id, {
      amount,
      category: category.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      occurredAt,
    });
    if (!updated) {
      return res.status(404).json({ error: 'Expense not found.' });
    }
    res.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update expense';
    res.status(500).json({ error: msg });
  }
});

app.delete('/api/expenses/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid expense ID.' });
    }
    const deleted = await deleteExpense(dbUser.id, id);
    if (!deleted) {
      return res.status(404).json({ error: 'Expense not found.' });
    }
    res.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to delete expense';
    res.status(500).json({ error: msg });
  }
});

app.post('/api/categories', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const { name, monthlyLimit, color } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required.' });
    }
    const limit = typeof monthlyLimit === 'number' && Number.isFinite(monthlyLimit) && monthlyLimit >= 0 ? monthlyLimit : 0;
    const hexColor = typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#0F766E';
    const created = await upsertCategory(dbUser.id, {
      name: name.trim(),
      monthlyLimit: limit,
      color: hexColor,
    });
    res.status(201).json(created);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to save category';
    res.status(500).json({ error: msg });
  }
});

app.put('/api/categories/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid category ID.' });
    }
    const { name, monthlyLimit, color } = req.body ?? {};
    const updated = await updateCategoryById(dbUser.id, id, {
      ...(typeof name === 'string' && name.trim() ? { name: name.trim() } : {}),
      ...(isNonNegativeNumber(monthlyLimit) ? { monthlyLimit } : {}),
      ...(typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color) ? { color } : {}),
    });
    if (!updated) {
      return res.status(404).json({ error: 'Category not found.' });
    }
    res.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update category';
    res.status(500).json({ error: msg });
  }
});

app.delete('/api/categories/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid category ID.' });
    }
    const deleted = await deleteCategoryById(dbUser.id, id);
    if (!deleted) {
      return res.status(404).json({ error: 'Category not found.' });
    }
    res.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to delete category';
    res.status(500).json({ error: msg });
  }
});

app.post('/api/savings/confirm', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const { date, amount } = req.body ?? {};
    if (!isValidDate(date) || !isNonNegativeNumber(amount)) {
      return res.status(400).json({ error: 'Valid date and non-negative amount are required.' });
    }
    const record = await confirmDailySavings(dbUser.id, date, amount);
    res.json(record);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to confirm savings';
    res.status(500).json({ error: msg });
  }
});

app.put('/api/settings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const { currency, notificationsEnabled, browserNotificationsEnabled, autoSavingsTracking, theme } =
      req.body ?? {};
    const updated = await updateUserPreferences(dbUser.id, {
      ...(typeof currency === 'string' && currency.trim() ? { currency: currency.trim() } : {}),
      ...(typeof notificationsEnabled === 'boolean' ? { notificationsEnabled } : {}),
      ...(typeof browserNotificationsEnabled === 'boolean'
        ? { browserNotificationsEnabled }
        : {}),
      ...(typeof autoSavingsTracking === 'boolean' ? { autoSavingsTracking } : {}),
      ...(theme === 'light' || theme === 'dark' ? { theme } : {}),
    });
    res.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update settings';
    res.status(500).json({ error: msg });
  }
});

app.post('/api/notifications', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const { type, title, message, date } = req.body ?? {};
    if (
      typeof type !== 'string' ||
      typeof title !== 'string' ||
      typeof message !== 'string' ||
      !isValidDate(date)
    ) {
      return res.status(400).json({ error: 'Invalid notification payload.' });
    }
    const created = await createNotification(dbUser.id, { type, title, message, date });
    res.status(201).json(created);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to save notification';
    res.status(500).json({ error: msg });
  }
});

app.post('/api/notifications/read', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const id = req.body?.id !== undefined ? Number(req.body.id) : undefined;
    await markNotificationsRead(dbUser.id, Number.isInteger(id) ? id : undefined);
    res.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to mark notifications read';
    res.status(500).json({ error: msg });
  }
});

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
