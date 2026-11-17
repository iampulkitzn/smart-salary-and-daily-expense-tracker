import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  categories,
  confirmedSavings,
  expenses,
  fixedExpenses,
  monthlyBudgets,
  notifications,
  users,
} from './schema.ts';

export async function getUserSnapshot(userId: number, month: string) {
  try {
    const [budgetRows, fixedRows, categoryRows, monthExpenseRows, allExpenseRows, savingsRows, notifRows, allBudgets] =
      await Promise.all([
        db
          .select()
          .from(monthlyBudgets)
          .where(and(eq(monthlyBudgets.userId, userId), eq(monthlyBudgets.month, month)))
          .limit(1),
        db
          .select()
          .from(fixedExpenses)
          .where(and(eq(fixedExpenses.userId, userId), eq(fixedExpenses.month, month)))
          .orderBy(fixedExpenses.id),
        db.select().from(categories).where(eq(categories.userId, userId)).orderBy(categories.id),
        db
          .select()
          .from(expenses)
          .where(and(eq(expenses.userId, userId), eq(expenses.month, month)))
          .orderBy(desc(expenses.occurredAt), desc(expenses.id)),
        db
          .select()
          .from(expenses)
          .where(eq(expenses.userId, userId))
          .orderBy(desc(expenses.occurredAt), desc(expenses.id))
          .limit(500),
        db
          .select()
          .from(confirmedSavings)
          .where(eq(confirmedSavings.userId, userId))
          .orderBy(desc(confirmedSavings.date)),
        db
          .select()
          .from(notifications)
          .where(eq(notifications.userId, userId))
          .orderBy(desc(notifications.id))
          .limit(30),
        db
          .select()
          .from(monthlyBudgets)
          .where(eq(monthlyBudgets.userId, userId))
          .orderBy(desc(monthlyBudgets.month)),
      ]);

    const allFixed = await db.select().from(fixedExpenses).where(eq(fixedExpenses.userId, userId));

    return {
      budget: budgetRows[0] ?? null,
      fixedExpenses: fixedRows,
      categories: categoryRows,
      monthExpenses: monthExpenseRows,
      allExpenses: allExpenseRows,
      confirmedSavings: savingsRows,
      notifications: notifRows,
      allBudgets,
      allFixedExpenses: allFixed,
    };
  } catch (error) {
    console.error('Database error in getUserSnapshot:', error);
    throw new Error('Failed to load financial dashboard data.', { cause: error });
  }
}

export async function upsertMonthlyBudget(
  userId: number,
  month: string,
  data: { salary: number; savingsTarget: number; customDailyLimit: number | null }
) {
  try {
    const result = await db
      .insert(monthlyBudgets)
      .values({
        userId,
        month,
        salary: data.salary,
        savingsTarget: data.savingsTarget,
        customDailyLimit: data.customDailyLimit,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [monthlyBudgets.userId, monthlyBudgets.month],
        set: {
          salary: data.salary,
          savingsTarget: data.savingsTarget,
          customDailyLimit: data.customDailyLimit,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database error in upsertMonthlyBudget:', error);
    throw new Error('Failed to save monthly budget.', { cause: error });
  }
}

export async function copyPreviousMonthSetup(userId: number, targetMonth: string) {
  try {
    const previousBudgets = await db
      .select()
      .from(monthlyBudgets)
      .where(eq(monthlyBudgets.userId, userId))
      .orderBy(desc(monthlyBudgets.month));

    const prev = previousBudgets.find((b) => b.month < targetMonth);
    if (!prev) {
      return null;
    }

    const copiedBudget = await upsertMonthlyBudget(userId, targetMonth, {
      salary: prev.salary,
      savingsTarget: prev.savingsTarget,
      customDailyLimit: prev.customDailyLimit,
    });

    const prevFixed = await db
      .select()
      .from(fixedExpenses)
      .where(and(eq(fixedExpenses.userId, userId), eq(fixedExpenses.month, prev.month)));

    const existingTargetFixed = await db
      .select()
      .from(fixedExpenses)
      .where(and(eq(fixedExpenses.userId, userId), eq(fixedExpenses.month, targetMonth)));

    if (existingTargetFixed.length === 0 && prevFixed.length > 0) {
      await db.insert(fixedExpenses).values(
        prevFixed.map((item) => ({
          userId,
          month: targetMonth,
          name: item.name,
          amount: item.amount,
        }))
      );
    }

    return copiedBudget;
  } catch (error) {
    console.error('Database error in copyPreviousMonthSetup:', error);
    throw new Error('Failed to copy previous month setup.', { cause: error });
  }
}

export async function addFixedExpense(userId: number, month: string, name: string, amount: number) {
  try {
    const result = await db
      .insert(fixedExpenses)
      .values({ userId, month, name, amount })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database error in addFixedExpense:', error);
    throw new Error('Failed to add fixed expense.', { cause: error });
  }
}

export async function updateFixedExpense(
  userId: number,
  id: number,
  data: { name: string; amount: number }
) {
  try {
    const result = await db
      .update(fixedExpenses)
      .set({ name: data.name, amount: data.amount })
      .where(and(eq(fixedExpenses.id, id), eq(fixedExpenses.userId, userId)))
      .returning();
    return result[0] ?? null;
  } catch (error) {
    console.error('Database error in updateFixedExpense:', error);
    throw new Error('Failed to update fixed expense.', { cause: error });
  }
}

export async function deleteFixedExpense(userId: number, id: number) {
  try {
    const result = await db
      .delete(fixedExpenses)
      .where(and(eq(fixedExpenses.id, id), eq(fixedExpenses.userId, userId)))
      .returning();
    return result[0] ?? null;
  } catch (error) {
    console.error('Database error in deleteFixedExpense:', error);
    throw new Error('Failed to delete fixed expense.', { cause: error });
  }
}

export async function addExpense(
  userId: number,
  data: { amount: number; category: string; description: string; occurredAt: string }
) {
  try {
    const date = data.occurredAt.slice(0, 10);
    const month = data.occurredAt.slice(0, 7);
    const result = await db
      .insert(expenses)
      .values({
        userId,
        amount: data.amount,
        category: data.category,
        description: data.description,
        occurredAt: data.occurredAt,
        date,
        month,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database error in addExpense:', error);
    throw new Error('Failed to log expense.', { cause: error });
  }
}

export async function updateExpense(
  userId: number,
  id: number,
  data: { amount: number; category: string; description: string; occurredAt: string }
) {
  try {
    const date = data.occurredAt.slice(0, 10);
    const month = data.occurredAt.slice(0, 7);
    const result = await db
      .update(expenses)
      .set({
        amount: data.amount,
        category: data.category,
        description: data.description,
        occurredAt: data.occurredAt,
        date,
        month,
      })
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .returning();
    return result[0] ?? null;
  } catch (error) {
    console.error('Database error in updateExpense:', error);
    throw new Error('Failed to update expense.', { cause: error });
  }
}

export async function deleteExpense(userId: number, id: number) {
  try {
    const result = await db
      .delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .returning();
    return result[0] ?? null;
  } catch (error) {
    console.error('Database error in deleteExpense:', error);
    throw new Error('Failed to delete expense.', { cause: error });
  }
}

export async function upsertCategory(
  userId: number,
  data: { name: string; monthlyLimit: number; color: string }
) {
  try {
    const result = await db
      .insert(categories)
      .values({
        userId,
        name: data.name,
        monthlyLimit: data.monthlyLimit,
        color: data.color,
        isDefault: false,
      })
      .onConflictDoUpdate({
        target: [categories.userId, categories.name],
        set: {
          monthlyLimit: data.monthlyLimit,
          color: data.color,
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database error in upsertCategory:', error);
    throw new Error('Failed to save category.', { cause: error });
  }
}

export async function updateCategoryById(
  userId: number,
  id: number,
  data: { name?: string; monthlyLimit?: number; color?: string }
) {
  try {
    const result = await db
      .update(categories)
      .set({
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.monthlyLimit !== undefined ? { monthlyLimit: data.monthlyLimit } : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
      })
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning();
    return result[0] ?? null;
  } catch (error) {
    console.error('Database error in updateCategoryById:', error);
    throw new Error('Failed to update category.', { cause: error });
  }
}

export async function deleteCategoryById(userId: number, id: number) {
  try {
    const result = await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning();
    return result[0] ?? null;
  } catch (error) {
    console.error('Database error in deleteCategoryById:', error);
    throw new Error('Failed to delete category.', { cause: error });
  }
}

export async function confirmDailySavings(userId: number, date: string, amount: number) {
  try {
    const month = date.slice(0, 7);
    const result = await db
      .insert(confirmedSavings)
      .values({ userId, date, month, amount })
      .onConflictDoUpdate({
        target: [confirmedSavings.userId, confirmedSavings.date],
        set: { amount },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database error in confirmDailySavings:', error);
    throw new Error('Failed to confirm daily savings.', { cause: error });
  }
}

export async function updateUserPreferences(
  userId: number,
  data: {
    currency?: string;
    notificationsEnabled?: boolean;
    browserNotificationsEnabled?: boolean;
    autoSavingsTracking?: boolean;
    theme?: string;
  }
) {
  try {
    const result = await db
      .update(users)
      .set({
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
        ...(data.notificationsEnabled !== undefined
          ? { notificationsEnabled: data.notificationsEnabled }
          : {}),
        ...(data.browserNotificationsEnabled !== undefined
          ? { browserNotificationsEnabled: data.browserNotificationsEnabled }
          : {}),
        ...(data.autoSavingsTracking !== undefined
          ? { autoSavingsTracking: data.autoSavingsTracking }
          : {}),
        ...(data.theme !== undefined ? { theme: data.theme } : {}),
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database error in updateUserPreferences:', error);
    throw new Error('Failed to update user preferences.', { cause: error });
  }
}

export async function createNotification(
  userId: number,
  data: { type: string; title: string; message: string; date: string }
) {
  try {
    const result = await db
      .insert(notifications)
      .values({
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        date: data.date,
        isRead: false,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database error in createNotification:', error);
    throw new Error('Failed to create notification.', { cause: error });
  }
}

export async function markNotificationsRead(userId: number, id?: number) {
  try {
    if (id !== undefined) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
    } else {
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
    }
    return { ok: true };
  } catch (error) {
    console.error('Database error in markNotificationsRead:', error);
    throw new Error('Failed to update notifications.', { cause: error });
  }
}
