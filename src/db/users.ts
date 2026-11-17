import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { categories, users } from './schema.ts';

const DEFAULT_CATEGORIES: Array<{ name: string; color: string }> = [
  { name: 'Food', color: '#0F766E' },
  { name: 'Shopping', color: '#2563EB' },
  { name: 'Transportation', color: '#D97706' },
  { name: 'Entertainment', color: '#7C3AED' },
  { name: 'Bills', color: '#DC2626' },
  { name: 'Education', color: '#0891B2' },
  { name: 'Healthcare', color: '#059669' },
  { name: 'Other', color: '#64748B' },
];

export async function getOrCreateUser(uid: string, email: string, displayName?: string | null) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName ?? null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(displayName ? { displayName } : {}),
        },
      })
      .returning();

    const user = result[0];

    const existingCats = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.userId, user.id))
      .limit(1);

    if (existingCats.length === 0) {
      await db
        .insert(categories)
        .values(
          DEFAULT_CATEGORIES.map((cat) => ({
            userId: user.id,
            name: cat.name,
            color: cat.color,
            monthlyLimit: 0,
            isDefault: true,
          }))
        )
        .onConflictDoNothing();
    }

    return user;
  } catch (error) {
    console.error('Database error in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}
