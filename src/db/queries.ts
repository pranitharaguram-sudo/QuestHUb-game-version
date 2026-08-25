import { db } from "./index.ts";
import { users, tasks } from "./schema.ts";
import { eq, desc } from "drizzle-orm";

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  try {
    const existing = await db.select().from(users).where(eq(users.id, uid));
    if (existing.length > 0) {
      if (displayName && displayName.trim() && displayName !== existing[0].username) {
        const updated = await db
          .update(users)
          .set({
            username: displayName.trim(),
            avatarName: displayName.trim(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, uid))
          .returning();
        return updated[0];
      }
      return existing[0];
    }

    const username = displayName?.trim() || email.split("@")[0] || "Traveler";
    const inserted = await db
      .insert(users)
      .values({
        id: uid,
        email,
        username,
        avatarName: username,
        level: 1,
        xp: 0,
        streakCurrent: 0,
        streakBest: 0,
        worldXp: {
          growth: 0,
          social: 0,
          wellbeing: 0,
          adventure: 0,
        },
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email,
          username,
          avatarName: username,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Start every new account with empty tasks (no dummy pre-seeded tasks)
    return inserted[0];
  } catch (error) {
    console.error("Database error in getOrCreateUser:", error);
    throw new Error("Failed to get or create user profile", { cause: error });
  }
}

export async function getUserProfile(uid: string) {
  try {
    const userRes = await db.select().from(users).where(eq(users.id, uid));
    if (userRes.length === 0) return null;

    const userTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, uid))
      .orderBy(desc(tasks.createdAt));

    return {
      user: userRes[0],
      tasks: userTasks,
    };
  } catch (error) {
    console.error("Database error in getUserProfile:", error);
    throw new Error("Failed to fetch user profile", { cause: error });
  }
}

export async function updateUserStats(
  uid: string,
  stats: {
    level?: number;
    xp?: number;
    streakCurrent?: number;
    streakBest?: number;
    worldXp?: any;
    avatarName?: string;
  }
) {
  try {
    const updatePayload: any = { updatedAt: new Date() };
    if (stats.level !== undefined) updatePayload.level = stats.level;
    if (stats.xp !== undefined) updatePayload.xp = stats.xp;
    if (stats.streakCurrent !== undefined) updatePayload.streakCurrent = stats.streakCurrent;
    if (stats.streakBest !== undefined) updatePayload.streakBest = stats.streakBest;
    if (stats.worldXp !== undefined) updatePayload.worldXp = stats.worldXp;
    if (stats.avatarName !== undefined) updatePayload.avatarName = stats.avatarName;

    const res = await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, uid))
      .returning();
    return res[0];
  } catch (error) {
    console.error("Database error in updateUserStats:", error);
    throw new Error("Failed to update user stats", { cause: error });
  }
}

export async function createQuestTask(
  userId: string,
  taskData: {
    id: string;
    title: string;
    category: string;
    priority: string;
    difficulty: string;
    due: string;
    notes?: string;
  }
) {
  try {
    const res = await db
      .insert(tasks)
      .values({
        id: taskData.id,
        userId,
        title: taskData.title,
        category: taskData.category,
        priority: taskData.priority,
        difficulty: taskData.difficulty,
        due: taskData.due,
        notes: taskData.notes,
        completed: false,
      })
      .returning();
    return res[0];
  } catch (error) {
    console.error("Database error in createQuestTask:", error);
    throw new Error("Failed to create task", { cause: error });
  }
}

export async function updateQuestTask(
  userId: string,
  taskId: string,
  taskData: {
    title?: string;
    category?: string;
    priority?: string;
    difficulty?: string;
    due?: string;
    completed?: boolean;
    completedAt?: string;
    notes?: string;
  }
) {
  try {
    const payload: any = { updatedAt: new Date() };
    if (taskData.title !== undefined) payload.title = taskData.title;
    if (taskData.category !== undefined) payload.category = taskData.category;
    if (taskData.priority !== undefined) payload.priority = taskData.priority;
    if (taskData.difficulty !== undefined) payload.difficulty = taskData.difficulty;
    if (taskData.due !== undefined) payload.due = taskData.due;
    if (taskData.completed !== undefined) payload.completed = taskData.completed;
    if (taskData.completedAt !== undefined) payload.completedAt = taskData.completedAt;
    if (taskData.notes !== undefined) payload.notes = taskData.notes;

    const res = await db
      .update(tasks)
      .set(payload)
      .where(eq(tasks.id, taskId))
      .returning();
    return res[0];
  } catch (error) {
    console.error("Database error in updateQuestTask:", error);
    throw new Error("Failed to update task", { cause: error });
  }
}

export async function deleteQuestTask(userId: string, taskId: string) {
  try {
    await db.delete(tasks).where(eq(tasks.id, taskId));
    return { success: true };
  } catch (error) {
    console.error("Database error in deleteQuestTask:", error);
    throw new Error("Failed to delete task", { cause: error });
  }
}
