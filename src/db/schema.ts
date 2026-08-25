import { pgTable, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";

// Users table storing user profile, stats, level, xp, streak, and world progress
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Firebase Auth UID
  email: text("email").notNull(),
  username: text("username").notNull(),
  avatarName: text("avatar_name").notNull(),
  level: integer("level").default(1).notNull(),
  xp: integer("xp").default(0).notNull(),
  streakCurrent: integer("streak_current").default(0).notNull(),
  streakBest: integer("streak_best").default(0).notNull(),
  worldXp: jsonb("world_xp").default({
    growth: 0,
    social: 0,
    wellbeing: 0,
    adventure: 0,
  }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tasks table storing quests linked to user id
export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(), // 'growth' | 'social' | 'wellbeing' | 'adventure'
  priority: text("priority").notNull(), // 'urgent' | 'high' | 'medium' | 'low'
  difficulty: text("difficulty").notNull(), // 'easy' | 'medium' | 'hard' | 'legendary'
  due: text("due").notNull(), // YYYY-MM-DD
  completed: boolean("completed").default(false).notNull(),
  completedAt: text("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
