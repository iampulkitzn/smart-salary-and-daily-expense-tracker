import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  currency: text('currency').notNull().default('INR'),
  notificationsEnabled: boolean('notifications_enabled').notNull().default(true),
  browserNotificationsEnabled: boolean('browser_notifications_enabled').notNull().default(false),
  autoSavingsTracking: boolean('auto_savings_tracking').notNull().default(false),
  theme: text('theme').notNull().default('light'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const monthlyBudgets = pgTable(
  'monthly_budgets',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    month: text('month').notNull(), // YYYY-MM
    salary: doublePrecision('salary').notNull().default(0),
    savingsTarget: doublePrecision('savings_target').notNull().default(0),
    customDailyLimit: doublePrecision('custom_daily_limit'),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [uniqueIndex('monthly_budgets_user_month_idx').on(table.userId, table.month)]
);

export const fixedExpenses = pgTable('fixed_expenses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  month: text('month').notNull(), // YYYY-MM
  name: text('name').notNull(),
  amount: doublePrecision('amount').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const categories = pgTable(
  'categories',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    monthlyLimit: doublePrecision('monthly_limit').notNull().default(0),
    color: text('color').notNull().default('#0F766E'),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [uniqueIndex('categories_user_name_idx').on(table.userId, table.name)]
);

export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  amount: doublePrecision('amount').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull().default(''),
  occurredAt: text('occurred_at').notNull(), // YYYY-MM-DDTHH:mm
  date: text('date').notNull(), // YYYY-MM-DD
  month: text('month').notNull(), // YYYY-MM
  createdAt: timestamp('created_at').defaultNow(),
});

export const confirmedSavings = pgTable(
  'confirmed_savings',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    date: text('date').notNull(), // YYYY-MM-DD
    month: text('month').notNull(), // YYYY-MM
    amount: doublePrecision('amount').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [uniqueIndex('confirmed_savings_user_date_idx').on(table.userId, table.date)]
);

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  type: text('type').notNull(), // warning | exceeded | savings | monthly_warning | monthly_summary
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  date: text('date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  monthlyBudgets: many(monthlyBudgets),
  fixedExpenses: many(fixedExpenses),
  categories: many(categories),
  expenses: many(expenses),
  confirmedSavings: many(confirmedSavings),
  notifications: many(notifications),
}));

export const monthlyBudgetsRelations = relations(monthlyBudgets, ({ one }) => ({
  user: one(users, {
    fields: [monthlyBudgets.userId],
    references: [users.id],
  }),
}));

export const fixedExpensesRelations = relations(fixedExpenses, ({ one }) => ({
  user: one(users, {
    fields: [fixedExpenses.userId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
}));

export const confirmedSavingsRelations = relations(confirmedSavings, ({ one }) => ({
  user: one(users, {
    fields: [confirmedSavings.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
