export type WorldKey = "growth" | "social" | "wellbeing" | "adventure";
export type PriorityLevel = "urgent" | "high" | "medium" | "low";
export type DifficultyLevel = "easy" | "medium" | "hard" | "legendary";
export type ThemeMode = "light" | "dark";

export interface QuestTask {
  id: string;
  title: string;
  category: WorldKey;
  priority: PriorityLevel;
  difficulty: DifficultyLevel;
  due: string; // YYYY-MM-DD
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export interface WorldDefinition {
  key: WorldKey;
  label: string;
  sketchTitle: string;
  subtitle: string;
  description: string;
  iconName: string;
  color: string;
  lightAuraColor: string;
  darkAuraColor: string;
  image: string;
}

export interface UserProfileAnswers {
  priorityCategory: WorldKey;
  hobbies: string;
  dreamLife: string;
  completedAt?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  avatarName: string;
  level: number;
  xp: number;
  streakCurrent: number;
  streakBest: number;
  worldXp: Record<WorldKey, number>;
  tasks: QuestTask[];
  profileAnswers?: UserProfileAnswers;
  updatedAt: string;
}
