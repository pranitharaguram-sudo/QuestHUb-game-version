import React, { useState, useEffect, useMemo } from "react";
import { IMAGES } from "./assets";
import { WorldKey, PriorityLevel, DifficultyLevel, QuestTask, ThemeMode, UserAccount } from "./types";
import { LoginPage } from "./components/LoginPage";
import { auth } from "./lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  Menu,
  Sparkles,
  Check,
  Plus,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Flame,
  Clock,
  Trash2,
  Layers,
  CheckCircle2,
  Target,
  Globe,
  LogOut,
  Edit3,
  User,
  UserPlus,
  Briefcase,
  Users,
  Compass,
  Heart,
  Save,
} from "lucide-react";

// =====================================================================
// CONSTANTS & WORLDS CONFIGURATION
// =====================================================================
export const WORLDS_CONFIG: Record<
  WorldKey,
  {
    key: WorldKey;
    label: string;
    displayTitle: string;
    subtitle: string;
    sketchTitle: string;
    description: string;
    icon: string;
    lightColor: string;
    darkAuraColor: string;
    nightGlowColor: string;
    image: string;
  }
> = {
  growth: {
    key: "growth",
    label: "Growth",
    displayTitle: "CAREER / GROWTH",
    subtitle: "Build your legacy",
    sketchTitle: "Castle",
    description: "Career mastery, skills, leadership, and personal legacy.",
    icon: "🏰",
    lightColor: "#6B1724", // Burgundy
    darkAuraColor: "#F59E0B", // Gold glow in dark mode
    nightGlowColor: "rgba(245, 158, 11, 0.9)",
    image: IMAGES.islandGrowth,
  },
  wellbeing: {
    key: "wellbeing",
    label: "Wellness",
    displayTitle: "WELLNESS / SHRINE",
    subtitle: "Fuel your vitality",
    sketchTitle: "Shrine",
    description: "Health, mindfulness, fitness, and inner equilibrium.",
    icon: "🌲",
    lightColor: "#15803D", // Dark Forest Green
    darkAuraColor: "#22C55E", // Green glow in dark mode
    nightGlowColor: "rgba(34, 197, 94, 0.9)",
    image: IMAGES.islandWellbeing,
  },
  social: {
    key: "social",
    label: "Social",
    displayTitle: "SOCIAL / VILLAGE",
    subtitle: "Nurture relationships",
    sketchTitle: "Village",
    description: "Friendships, family bonds, community, and fellowship.",
    icon: "🏘️",
    lightColor: "#1E3A8A", // Deep Navy
    darkAuraColor: "#F472B6", // Subtle Pink glow with village lights in dark mode
    nightGlowColor: "rgba(244, 114, 182, 0.9)",
    image: IMAGES.islandSocial,
  },
  adventure: {
    key: "adventure",
    label: "Adventure",
    displayTitle: "ADVENTURE / HARBOUR",
    subtitle: "Explore the unknown",
    sketchTitle: "Harbour & Ship",
    description: "Travel, daring pursuits, exploration, and uncharted horizons.",
    icon: "⛵",
    lightColor: "#0D9488", // Deep Teal
    darkAuraColor: "#38BDF8", // Cyan / detailed harbor glow in dark mode
    nightGlowColor: "rgba(56, 189, 248, 0.9)",
    image: IMAGES.islandAdventure,
  },
};

// Priority Colors Config
export const PRIORITY_CONFIG: Record<
  PriorityLevel,
  {
    label: string;
    lightRing: string; // Solid dark aesthetic in light mode
    darkRing: string; // Pastel / Neon in dark mode
    score: number;
  }
> = {
  urgent: {
    label: "High",
    lightRing: "#6B1724", // Burgundy
    darkRing: "#F43F5E", // Neon Rose
    score: 3,
  },
  high: {
    label: "High",
    lightRing: "#6B1724", // Burgundy
    darkRing: "#F43F5E", // Neon Rose
    score: 3,
  },
  medium: {
    label: "Medium",
    lightRing: "#B45309", // Amber
    darkRing: "#FBBF24", // Neon Amber
    score: 2,
  },
  low: {
    label: "Low",
    lightRing: "#15803D", // Dark Forest Green
    darkRing: "#34D399", // Neon Emerald
    score: 1,
  },
};

export const DIFFICULTY_CONFIG: Record<DifficultyLevel, { label: string; xp: number }> = {
  easy: { label: "Novice", xp: 15 },
  medium: { label: "Adept", xp: 30 },
  hard: { label: "Master", xp: 60 },
  legendary: { label: "Legendary", xp: 100 },
};

export type PageView = "dashboard" | "worlds" | "all_tasks";

const uid = () => "q_" + Math.random().toString(36).substring(2, 9);

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(d.getDate() + days);
  return next;
}

// Sound synthesized for subtle feedback
function playTone(freq: number, durationMs = 120, type: OscillatorType = "sine") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch (e) {}
}

function playCompletionChime() {
  playTone(523.25, 100);
  setTimeout(() => playTone(659.25, 100), 70);
  setTimeout(() => playTone(783.99, 140), 140);
  setTimeout(() => playTone(1046.5, 260), 220);
}

// Get the highest priority ring for calendar cell
function getPriorityRingForDate(tasks: QuestTask[], dateStr: string, isDark: boolean): string | null {
  const activeTasks = (tasks || []).filter((t) => t.due === dateStr && !t.completed);
  if (activeTasks.length === 0) return null;

  let highestScore = 0;
  let ring = isDark ? "#FBBF24" : "#B45309";

  for (const t of activeTasks) {
    const conf = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;
    if (conf.score > highestScore) {
      highestScore = conf.score;
      ring = isDark ? conf.darkRing : conf.lightRing;
    }
  }
  return ring;
}

// Default initial tasks for new account (starts empty)
const createInitialTasks = (_userName = "Traveler", _baseDate = new Date()): QuestTask[] => {
  return [];
};

// =====================================================================
// MAIN APPLICATION COMPONENT
// =====================================================================
export default function App() {
  const [currentPage, setCurrentPage] = useState<PageView>("dashboard");
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Authentication & Account State
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem("questhub_auth_token") || null;
  });
  const [currentAccount, setCurrentAccount] = useState<UserAccount | null>(() => {
    const savedActive = localStorage.getItem("questhub_active_account");
    if (savedActive) {
      try {
        return JSON.parse(savedActive);
      } catch (e) {}
    }
    return null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Synchronize Firebase auth state automatically across sessions
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          setAuthToken(token);
          localStorage.setItem("questhub_auth_token", token);

          // Fetch or synchronize cloud profile from Cloud SQL
          const res = await fetch("/api/auth/sync", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              displayName: firebaseUser.displayName,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const u = data.user;
            const mappedAccount: UserAccount = {
              id: u.id,
              username: u.username || firebaseUser.displayName || "Traveler",
              avatarName: u.avatarName || u.username || "Traveler",
              level: u.level || 1,
              xp: u.xp || 0,
              streakCurrent: u.streakCurrent ?? 0,
              streakBest: u.streakBest ?? 0,
              worldXp: u.worldXp || { growth: 0, social: 0, wellbeing: 0, adventure: 0 },
              tasks: (data.tasks || []).map((t: any) => ({
                id: t.id,
                title: t.title,
                category: t.category,
                priority: t.priority,
                difficulty: t.difficulty,
                due: t.due,
                completed: t.completed,
                completedAt: t.completedAt,
                notes: t.notes,
              })),
              updatedAt: new Date().toISOString(),
            };
            setCurrentAccount(mappedAccount);
            localStorage.setItem("questhub_active_account", JSON.stringify(mappedAccount));
          }
        } catch (err) {
          console.error("Cloud session sync error:", err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time ticking clock
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Save current account locally and synchronize to Cloud SQL backend
  const saveAccountState = async (acc: UserAccount) => {
    setCurrentAccount(acc);
    localStorage.setItem("questhub_active_account", JSON.stringify(acc));

    // Save to all accounts map in localStorage
    try {
      const allSaved = localStorage.getItem("questhub_all_accounts");
      const accountsList: UserAccount[] = allSaved ? JSON.parse(allSaved) : [];
      const idx = accountsList.findIndex((a) => a.username.toLowerCase() === acc.username.toLowerCase());
      if (idx >= 0) {
        accountsList[idx] = acc;
      } else {
        accountsList.push(acc);
      }
      localStorage.setItem("questhub_all_accounts", JSON.stringify(accountsList));
    } catch (e) {}

    // Cloud SQL backend synchronization if authenticated
    if (authToken) {
      try {
        await fetch("/api/profile/stats", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            level: acc.level,
            xp: acc.xp,
            streakCurrent: acc.streakCurrent,
            streakBest: acc.streakBest,
            worldXp: acc.worldXp,
            avatarName: acc.avatarName,
          }),
        });
      } catch (e) {
        console.error("Cloud SQL sync stats failed:", e);
      }
    }
  };

  // Glow aura triggers upon quest completion (2 seconds)
  const [glowingWorld, setGlowingWorld] = useState<WorldKey | null>(null);
  const [xpBanner, setXpBanner] = useState<{ amount: number; world: WorldKey } | null>(null);

  // World Details modal
  const [inspectingWorld, setInspectingWorld] = useState<WorldKey | null>(null);

  // Calendar Modal & Selected Task to Edit
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<QuestTask | null>(null);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    playTone(720, 50);
  };

  const tasks = currentAccount ? currentAccount.tasks : [];

  // Toggle Quest Completion
  const handleToggleTask = (id: string) => {
    if (!currentAccount) return;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const willComplete = !task.completed;
    const diffMeta = DIFFICULTY_CONFIG[task.difficulty || "medium"];
    const xpReward = diffMeta.xp;
    const completedAtStr = willComplete ? todayKey(now) : undefined;

    if (willComplete) {
      playCompletionChime();

      // Trigger 2-second glowing aura ring / gold shower
      setGlowingWorld(task.category);
      setXpBanner({ amount: xpReward, world: task.category });
      setTimeout(() => setGlowingWorld(null), 2000);
      setTimeout(() => setXpBanner(null), 1900);

      // Increment world XP and avatar level in real time
      const nextWorldXp = {
        ...currentAccount.worldXp,
        [task.category]: (currentAccount.worldXp[task.category] || 0) + xpReward,
      };
      const nextTotalXp = currentAccount.xp + xpReward;
      const nextLevel = Math.floor(nextTotalXp / 150) + 1;

      const nextTasks = tasks.map((t) =>
        t.id === id
          ? { ...t, completed: true, completedAt: completedAtStr }
          : t
      );

      saveAccountState({
        ...currentAccount,
        xp: nextTotalXp,
        level: nextLevel,
        worldXp: nextWorldXp,
        tasks: nextTasks,
      });
    } else {
      playTone(320, 60);
      const nextTasks = tasks.map((t) =>
        t.id === id
          ? { ...t, completed: false, completedAt: undefined }
          : t
      );
      saveAccountState({
        ...currentAccount,
        tasks: nextTasks,
      });
    }

    // Backend Cloud SQL sync
    if (authToken) {
      fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          completed: willComplete,
          completedAt: completedAtStr || null,
        }),
      }).catch((e) => console.error("Cloud SQL task toggle sync error:", e));
    }
  };

  // Add new quest
  const handleAddTask = (newTaskData: Omit<QuestTask, "id" | "completed">) => {
    if (!currentAccount) return;
    const newTask: QuestTask = {
      id: uid(),
      completed: false,
      ...newTaskData,
    };
    saveAccountState({
      ...currentAccount,
      tasks: [newTask, ...currentAccount.tasks],
    });
    playTone(640, 100);

    // Backend Cloud SQL sync
    if (authToken) {
      fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          id: newTask.id,
          title: newTask.title,
          category: newTask.category,
          priority: newTask.priority,
          difficulty: newTask.difficulty,
          due: newTask.due,
          notes: newTask.notes,
        }),
      }).catch((e) => console.error("Cloud SQL task create sync error:", e));
    }
  };

  // Update existing quest from Calendar or Task Editor
  const handleSaveEditedTask = (updated: QuestTask) => {
    if (!currentAccount) return;
    const nextTasks = currentAccount.tasks.map((t) => (t.id === updated.id ? updated : t));
    saveAccountState({
      ...currentAccount,
      tasks: nextTasks,
    });
    setEditingTask(null);
    playTone(580, 80);

    // Backend Cloud SQL sync
    if (authToken) {
      fetch(`/api/tasks/${updated.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: updated.title,
          category: updated.category,
          priority: updated.priority,
          difficulty: updated.difficulty,
          due: updated.due,
          notes: updated.notes,
        }),
      }).catch((e) => console.error("Cloud SQL task update sync error:", e));
    }
  };

  // Delete quest
  const handleDeleteTask = (id: string) => {
    if (!currentAccount) return;
    saveAccountState({
      ...currentAccount,
      tasks: currentAccount.tasks.filter((t) => t.id !== id),
    });
    if (editingTask?.id === id) setEditingTask(null);
    playTone(240, 80);

    // Backend Cloud SQL sync
    if (authToken) {
      fetch(`/api/tasks/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }).catch((e) => console.error("Cloud SQL task delete sync error:", e));
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {}
    setCurrentAccount(null);
    setAuthToken(null);
    localStorage.removeItem("questhub_active_account");
    localStorage.removeItem("questhub_auth_token");
    setIsMenuOpen(false);
    playTone(360, 100);
  };

  // Switch or Create account
  const handleSelectOrCreateAccount = (username: string) => {
    const clean = username.trim();
    if (!clean) return;

    // Check localStorage existing accounts
    try {
      const allSaved = localStorage.getItem("questhub_all_accounts");
      const accountsList: UserAccount[] = allSaved ? JSON.parse(allSaved) : [];
      const existing = accountsList.find((a) => a.username.toLowerCase() === clean.toLowerCase());
      if (existing) {
        saveAccountState(existing);
        return;
      }
    } catch (e) {}

    // Create fresh account
    const newAcc: UserAccount = {
      id: "acc_" + Math.random().toString(36).substring(2, 9),
      username: clean,
      avatarName: clean,
      level: 1,
      xp: 0,
      streakCurrent: 0,
      streakBest: 0,
      worldXp: { growth: 0, social: 0, wellbeing: 0, adventure: 0 },
      tasks: [],
      updatedAt: new Date().toISOString(),
    };
    saveAccountState(newAcc);
  };

  // Today's tasks for Worlds Left Column (no XP indicator)
  const todayStr = todayKey(now);
  const todayActiveTasks = useMemo(() => {
    return tasks.filter((t) => !t.completed && (t.due === todayStr || t.due < todayStr));
  }, [tasks, todayStr]);

  // All active tasks
  const allActiveTasks = useMemo(() => {
    return tasks.filter((t) => !t.completed);
  }, [tasks]);

  const isDark = theme === "dark";

  // If user is not signed in, show the plain parchment / purple Login Page
  if (!currentAccount) {
    return (
      <LoginPage
        isDark={isDark}
        onLoginSuccess={(profileData, token) => {
          setAuthToken(token);
          localStorage.setItem("questhub_auth_token", token);
          const u = profileData.user;
          const mappedAccount: UserAccount = {
            id: u.id,
            username: u.username || "Traveler",
            avatarName: u.avatarName || u.username || "Traveler",
            level: u.level || 1,
            xp: u.xp || 0,
            streakCurrent: u.streakCurrent ?? 0,
            streakBest: u.streakBest ?? 0,
            worldXp: u.worldXp || { growth: 0, social: 0, wellbeing: 0, adventure: 0 },
            tasks: (profileData.tasks || []).map((t: any) => ({
              id: t.id,
              title: t.title,
              category: t.category,
              priority: t.priority,
              difficulty: t.difficulty,
              due: t.due,
              completed: t.completed,
              completedAt: t.completedAt,
              notes: t.notes,
            })),
            updatedAt: new Date().toISOString(),
          };
          saveAccountState(mappedAccount);
        }}
        onContinueAsGuest={(guestUsername) => {
          handleSelectOrCreateAccount(guestUsername);
        }}
      />
    );
  }

  // Dashboard Backgrounds
  const bgDashboard = isDark ? IMAGES.dashBgDark : IMAGES.dashBgLight;

  return (
    <div
      className={`min-h-screen w-full flex flex-col ${
        isDark
          ? "theme-dark bg-[#0d0714] text-[#FDFBF7]"
          : "theme-light bg-[#F5EFE6] text-stone-900"
      } select-none transition-colors duration-300 font-cormorant`}
    >
      {/* Floating XP Reward Notification Banner */}
      {xpBanner && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-float-up text-center">
          <div
            className={`px-5 py-2 rounded-full font-cinzel font-bold text-xs tracking-wider shadow-2xl backdrop-blur-md flex items-center gap-2 border ${
              isDark
                ? "bg-[#2A1544]/95 border-amber-400 text-amber-200"
                : "bg-[#FBF8F2] border-[#6B1724] text-[#6B1724]"
            }`}
          >
            <span>✨ +{xpBanner.amount} XP awarded to {WORLDS_CONFIG[xpBanner.world].label}!</span>
          </div>
        </div>
      )}

      {/* =====================================================================
          TOP NAVIGATION BAR (Across Dashboard, Worlds, and All Tasks)
          - Left: Dropdown Menu (Dashboard, Worlds, All Tasks, Sign Out)
          - Center: QuestHub Brand
          - Right: Date / Level / Streak & Star Icon
          ===================================================================== */}
      <header
        className={`h-14 px-6 border-b flex items-center justify-between z-30 shrink-0 ${
          isDark
            ? "bg-[#160b24]/90 border-purple-500/20 backdrop-blur-md text-[#FDFBF7]"
            : "bg-[#FBF8F2] border-[#E5DBC7] shadow-sm text-stone-900"
        }`}
      >
        {/* Top Left: Dropdown Menu Trigger & Logo */}
        <div className="flex items-center gap-3.5 relative">
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className={`p-2 rounded-xl transition flex items-center justify-center shadow-sm border ${
              isDark
                ? "bg-[#26133C] border-purple-400/30 text-amber-300 hover:border-amber-400"
                : "bg-[#6B1724] border-[#53101B] text-[#FDFBF7] hover:bg-[#58131E]"
            }`}
            title="Navigation Menu"
          >
            <Menu size={18} />
          </button>

          {/* 4-Option Dropdown Menu (Includes Sign Out) */}
          {isMenuOpen && (
            <DropdownNavMenu
              isDark={isDark}
              currentPage={currentPage}
              currentUser={currentAccount?.username || "Guest"}
              onSelectPage={(page) => {
                setCurrentPage(page);
                setIsMenuOpen(false);
              }}
              onSignOut={handleSignOut}
            />
          )}

          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                isDark ? "bg-amber-400/20 text-amber-300" : "bg-[#6B1724] text-[#FDFBF7]"
              }`}
            >
              ⚔️
            </span>
            <span className="font-cinzel text-base font-bold tracking-widest text-inherit">
              QuestHub
            </span>
          </div>
        </div>

        {/* Top Right: User Level, Streak, Date & Theme Toggle */}
        <div className="flex items-center gap-3">
          {currentAccount && (
            <div className="hidden sm:flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  isDark
                    ? "bg-[#231238] border-purple-500/30 text-amber-300"
                    : "bg-[#F5EFE6] border-[#DDD1B8] text-stone-800"
                }`}
              >
                <Flame size={13} className={isDark ? "text-amber-400 fill-amber-400" : "text-[#6B1724] fill-[#6B1724]"} />
                <span className="font-cinzel text-[11px] font-bold">Lv {currentAccount.level}</span>
              </div>

              <div
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${
                  isDark
                    ? "bg-[#231238] border-purple-500/30 text-amber-300"
                    : "bg-[#F5EFE6] border-[#DDD1B8] text-stone-800"
                }`}
              >
                <span className="font-cinzel text-[11px]">🔥 {currentAccount.streakCurrent}d Streak</span>
              </div>
            </div>
          )}

          {/* Star Icon Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition shadow-sm border ${
              isDark
                ? "bg-[#26133C] border-purple-400/40 text-amber-300 hover:border-amber-300"
                : "bg-[#6B1724] border-[#53101B] text-[#FDFBF7] hover:bg-[#58131E]"
            }`}
            title={`Switch to ${isDark ? "Light Parchment" : "Twilight Dark"} Mode`}
          >
            <Sparkles size={15} />
          </button>
        </div>
      </header>

      {/* =====================================================================
          PAGE 1: MINIMALIST DASHBOARD
          - Light Mode: "light dashboard.png" full visible with cream parchment atmosphere
          - Floating tabs: Solid cream with subtle border
          - Buttons: Solid burgundy with cream text
          - Top Greeting: "Welcome, Arjun"
          - Task-input at the top
          - Generous open center space for background visibility
          - Bottom: Weekly strip pinned at the very end
          ===================================================================== */}
      {currentPage === "dashboard" && (
        <main
          className="flex-1 flex flex-col justify-between p-6 sm:p-10 relative bg-cover bg-center overflow-y-auto"
          style={{ backgroundImage: `url(${bgDashboard})` }}
        >
          {/* Subtle Scrim that keeps the background image fully visible */}
          <div
            className={`absolute inset-0 pointer-events-none ${
              isDark ? "bg-[#0d0714]/65 backdrop-blur-[0.5px]" : "bg-[#F5EFE6]/35"
            }`}
          />

          {/* TOP SECTION: Greeting & Floating Task Input Bar */}
          <div className="relative z-10 max-w-2xl mx-auto w-full space-y-4 pt-2">
            {/* Minimalist Greeting Message */}
            <div className="text-center space-y-0.5">
              <h1 className="font-cinzel text-2xl sm:text-3xl font-extrabold tracking-wide drop-shadow-sm">
                Welcome, {currentAccount?.avatarName || "Traveler"}
              </h1>
              <p className="text-sm font-cormorant font-semibold opacity-85">
                Chart your journey, forge your daily quests, and expand your realm.
              </p>
            </div>

            {/* Floating Task Input Bar (Solid Cream in Light, Glass Purple in Dark) */}
            <FloatingTaskInputBar
              isDark={isDark}
              onAddTask={handleAddTask}
              defaultDue={todayKey(now)}
            />
          </div>

          {/* CENTER SPATIOUS AREA: Kept wide open for background artwork */}
          <div className="relative z-10 text-center py-12 pointer-events-none" />

          {/* BOTTOM SECTION: Weekly Strip Calendar (Solid Cream in Light, Glass Purple in Dark) */}
          <div className="relative z-10 max-w-2xl mx-auto w-full pb-2">
            <div
              className={`p-4 rounded-3xl border shadow-xl transition ${
                isDark
                  ? "bg-[#231238]/85 border-purple-500/30 backdrop-blur-xl text-[#FDFBF7]"
                  : "bg-[#FBF8F2] border-[#DDD1B8] text-stone-900"
              }`}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="font-cinzel text-xs font-bold uppercase tracking-widest text-inherit">
                  Weekly Schedule
                </span>
                <button
                  onClick={() => setIsCalendarOpen(true)}
                  className={`text-xs font-bold flex items-center gap-1.5 transition ${
                    isDark ? "text-amber-300 hover:text-amber-200" : "text-[#6B1724] hover:underline"
                  }`}
                >
                  <CalendarIcon size={14} />
                  <span>Expand to Full Month</span>
                </button>
              </div>

              {/* Sunday-to-Saturday Weekly Strip with Solid Dark / Pastel Rings */}
              <CleanWeeklyStrip
                tasks={tasks}
                currentNow={now}
                isDark={isDark}
                onSelectDate={(dateStr) => {
                  setCalendarSelectedDate(dateStr);
                  setIsCalendarOpen(true);
                }}
              />
            </div>
          </div>
        </main>
      )}

      {/* =====================================================================
          PAGE 2: WORLDS PAGE
          - Header: Title saying "Your worlds" strictly (no subtitle)
          - Full screen game visuals with S-curved mountain road
          - Left column: List of today's tasks floating on top (no XP indicators)
          - Beside each island: Name of island + Subtitle + Progress Bar (Level & XP)
          - Light mode: Gold shower sparkle over completed realm
          - Dark mode: Nighttime in islands with lights, glowing path, and specific glowing auras (Growth: Gold, Wellness: Green, Social: Pink with lights, Adventure: Harbor cyan)
          ===================================================================== */}
      {currentPage === "worlds" && (
        <main
          className={`flex-1 flex flex-col p-6 sm:p-8 relative bg-cover bg-center overflow-y-auto ${
            isDark ? "bg-[#11081e]" : "bg-[#F5EFE6]"
          }`}
          style={{
            backgroundImage: `url(${isDark ? IMAGES.worldsBgDark : IMAGES.worldsBgLight})`,
          }}
        >
          {/* Subtle Ambient Overlay */}
          <div
            className={`absolute inset-0 pointer-events-none ${
              isDark ? "bg-[#0d0714]/60" : "bg-[#F5EFE6]/30"
            }`}
          />

          <div className="relative z-10 flex-1 flex flex-col">
            {/* Header: Title "Your worlds" strictly */}
            <div className="mb-4">
              <h1 className="font-cinzel text-2xl sm:text-3xl font-extrabold tracking-widest text-inherit">
                Your worlds
              </h1>
            </div>

            {/* Layout Grid: Left Floating Today's Tasks | Right Mountain Path & 4 Floating Realms */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Today's Tasks Floating Panel (No XP indicators) */}
              <div
                className={`lg:col-span-4 rounded-3xl border p-4 shadow-2xl flex flex-col max-h-[75vh] ${
                  isDark
                    ? "bg-[#231238]/90 border-purple-500/30 backdrop-blur-xl text-[#FDFBF7]"
                    : "bg-[#FBF8F2] border-[#DDD1B8] text-stone-900"
                }`}
              >
                <div
                  className={`flex items-center justify-between pb-3 mb-3 border-b ${
                    isDark ? "border-purple-500/20" : "border-[#E5DBC7]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      size={16}
                      className={isDark ? "text-amber-400" : "text-[#6B1724]"}
                    />
                    <span className="font-cinzel text-xs font-bold uppercase tracking-wider">
                      Today's Tasks
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-cinzel ${
                      isDark
                        ? "bg-purple-900/60 text-amber-300 border border-purple-500/30"
                        : "bg-[#6B1724] text-[#FDFBF7]"
                    }`}
                  >
                    {todayActiveTasks.length}
                  </span>
                </div>

                {/* Today's Tasks List (No XP indicator) */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {todayActiveTasks.length === 0 ? (
                    <div className="text-center py-10 px-3 text-stone-500 text-xs italic">
                      No pending tasks for today. Forge quests on the dashboard.
                    </div>
                  ) : (
                    todayActiveTasks.map((t) => {
                      const world = WORLDS_CONFIG[t.category] || WORLDS_CONFIG.growth;

                      return (
                        <div
                          key={t.id}
                          className={`p-3 rounded-2xl border transition flex items-start gap-3 shadow-sm group ${
                            isDark
                              ? "bg-[#1c0e2e]/85 border-purple-500/20 hover:border-purple-400"
                              : "bg-[#FAF6EE] border-[#E8DEC8] hover:border-[#6B1724]/40"
                          }`}
                        >
                          {/* Quick Check-Off Circle */}
                          <button
                            onClick={() => handleToggleTask(t.id)}
                            className={`w-5 h-5 mt-0.5 rounded-full border flex items-center justify-center transition shrink-0 ${
                              isDark
                                ? "border-amber-400/70 hover:bg-amber-400 hover:text-stone-950 text-amber-400"
                                : "border-[#6B1724] hover:bg-[#6B1724] hover:text-[#FDFBF7] text-[#6B1724]"
                            }`}
                            title="Complete Task"
                          >
                            <Check size={12} strokeWidth={3} />
                          </button>

                          <div className="flex-1 min-w-0">
                            {/* Category Badge: Burgundy circle with Cream Icon in light mode, Gold in dark mode */}
                            <div className="flex items-center gap-1.5 mb-1">
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                                  isDark ? "bg-amber-400/20 text-amber-300" : "bg-[#6B1724] text-[#FDFBF7]"
                                }`}
                              >
                                {world.icon}
                              </span>
                              <span className="text-[11px] font-bold font-cinzel tracking-wider opacity-90">
                                {world.label}
                              </span>
                            </div>

                            <h5 className="text-xs font-semibold leading-snug truncate">
                              {t.title}
                            </h5>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right / Full Page: S-Curved Mountain Road with 4 Floating Realms & Progress Bars */}
              <div
                className={`lg:col-span-8 relative min-h-[640px] p-6 rounded-3xl border backdrop-blur-sm overflow-hidden flex flex-col justify-between ${
                  isDark
                    ? "bg-[#180b2a]/60 border-purple-500/20"
                    : "bg-[#FBF8F2]/70 border-[#DDD1B8]"
                }`}
              >
                {/* Winding Mountain Road S-Curve SVG */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="lightRoadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#C4B598" stopOpacity="0.9" />
                      <stop offset="50%" stopColor="#9C8B72" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#C4B598" stopOpacity="0.9" />
                    </linearGradient>

                    <linearGradient id="darkGlowingRoadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.9" />
                      <stop offset="35%" stopColor="#22C55E" stopOpacity="0.9" />
                      <stop offset="70%" stopColor="#F472B6" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.9" />
                    </linearGradient>
                  </defs>

                  {/* S-Curved Realistic Pathway connecting the 4 realms */}
                  <path
                    d="M 280,60 Q 420,170 330,270 T 210,400 T 360,540"
                    fill="none"
                    stroke={isDark ? "url(#darkGlowingRoadGrad)" : "url(#lightRoadGrad)"}
                    strokeWidth={isDark ? "8" : "12"}
                    strokeLinecap="round"
                    strokeDasharray={isDark ? "4 8" : "6 8"}
                    className={isDark ? "animate-glowing-path" : ""}
                  />
                </svg>

                {/* 1. TOP: GROWTH (Castle) */}
                <div className="relative flex justify-center z-10">
                  <FloatingRealmRow
                    isDark={isDark}
                    worldKey="growth"
                    world={WORLDS_CONFIG.growth}
                    xp={currentAccount?.worldXp.growth || 0}
                    isGlowing={glowingWorld === "growth"}
                    onClick={() => setInspectingWorld("growth")}
                  />
                </div>

                {/* 2. MIDDLE-LEFT: WELLNESS (Shrine) */}
                <div className="relative flex justify-start z-10 px-4">
                  <FloatingRealmRow
                    isDark={isDark}
                    worldKey="wellbeing"
                    world={WORLDS_CONFIG.wellbeing}
                    xp={currentAccount?.worldXp.wellbeing || 0}
                    isGlowing={glowingWorld === "wellbeing"}
                    onClick={() => setInspectingWorld("wellbeing")}
                  />
                </div>

                {/* 3. MIDDLE-RIGHT: SOCIAL (Village with night lights in dark mode) */}
                <div className="relative flex justify-end z-10 px-4">
                  <FloatingRealmRow
                    isDark={isDark}
                    worldKey="social"
                    world={WORLDS_CONFIG.social}
                    xp={currentAccount?.worldXp.social || 0}
                    isGlowing={glowingWorld === "social"}
                    onClick={() => setInspectingWorld("social")}
                  />
                </div>

                {/* 4. BOTTOM: ADVENTURE (Harbour & Ship) */}
                <div className="relative flex justify-center z-10">
                  <FloatingRealmRow
                    isDark={isDark}
                    worldKey="adventure"
                    world={WORLDS_CONFIG.adventure}
                    xp={currentAccount?.worldXp.adventure || 0}
                    isGlowing={glowingWorld === "adventure"}
                    onClick={() => setInspectingWorld("adventure")}
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* =====================================================================
          PAGE 3: ALL ACTIVE TASKS
          ===================================================================== */}
      {currentPage === "all_tasks" && (
        <main
          className="flex-1 flex flex-col p-6 sm:p-10 relative bg-cover bg-center overflow-y-auto"
          style={{ backgroundImage: `url(${bgDashboard})` }}
        >
          <div
            className={`absolute inset-0 pointer-events-none ${
              isDark ? "bg-[#0d0714]/80 backdrop-blur-[1px]" : "bg-[#F5EFE6]/80 backdrop-blur-[1px]"
            }`}
          />

          <div className="relative z-10 max-w-3xl mx-auto w-full space-y-4">
            <div
              className={`flex items-center justify-between pb-3 border-b ${
                isDark ? "border-purple-500/20" : "border-[#DDD1B8]"
              }`}
            >
              <div>
                <h2 className="font-cinzel text-xl font-bold">
                  Active Quests Master List
                </h2>
                <p className="text-xs opacity-75 font-cormorant font-semibold">
                  {allActiveTasks.length} active quests in journey
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {allActiveTasks.length === 0 ? (
                <div
                  className={`p-10 rounded-3xl border text-center ${
                    isDark ? "bg-[#231238]/60 border-purple-500/20" : "bg-[#FBF8F2] border-[#DDD1B8]"
                  }`}
                >
                  <p className="text-sm opacity-70">All tasks completed! Forge more from the dashboard.</p>
                </div>
              ) : (
                allActiveTasks.map((task) => {
                  const world = WORLDS_CONFIG[task.category] || WORLDS_CONFIG.growth;
                  const prioMeta = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                  const ringColor = isDark ? prioMeta.darkRing : prioMeta.lightRing;

                  return (
                    <div
                      key={task.id}
                      className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 shadow-sm ${
                        isDark
                          ? "bg-[#231238]/85 border-purple-500/30 hover:border-purple-400"
                          : "bg-[#FBF8F2] border-[#DDD1B8] hover:border-[#6B1724]"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                          onClick={() => handleToggleTask(task.id)}
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition shrink-0 ${
                            isDark
                              ? "border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-stone-950"
                              : "border-[#6B1724] text-[#6B1724] hover:bg-[#6B1724] hover:text-[#FDFBF7]"
                          }`}
                          title="Complete Quest"
                        >
                          <Check size={12} />
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {/* Category Icon Badge */}
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                                isDark ? "bg-amber-400/20 text-amber-300" : "bg-[#6B1724] text-[#FDFBF7]"
                              }`}
                            >
                              {world.icon}
                            </span>
                            <span className="text-[11px] font-cinzel font-bold">
                              {world.label}
                            </span>

                            {/* Solid Ring Priority Tag */}
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-bold font-cinzel"
                              style={{
                                border: `1.5px solid ${ringColor}`,
                                color: ringColor,
                              }}
                            >
                              {prioMeta.label}
                            </span>

                            <span className="text-[11px] opacity-70 flex items-center gap-1 font-sans">
                              <Clock size={11} />
                              {task.due}
                            </span>
                          </div>

                          <h4 className="text-xs sm:text-sm font-semibold truncate">
                            {task.title}
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingTask(task)}
                          className="p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/10 transition"
                          title="Edit Quest"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:text-red-500 transition"
                          title="Delete Quest"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      )}

      {/* =====================================================================
          FROSTED GLASSMORPHIC FULL MONTH CALENDAR MODAL
          ===================================================================== */}
      {isCalendarOpen && (
        <FrostedGlassCalendarModal
          isDark={isDark}
          tasks={tasks}
          currentNow={now}
          initialSelectedDate={calendarSelectedDate}
          onClose={() => setIsCalendarOpen(false)}
          onToggleTask={handleToggleTask}
          onSelectTaskToEdit={(task) => setEditingTask(task)}
          onAddTask={(dateStr) => {
            handleAddTask({
              title: "New Quest",
              category: "growth",
              priority: "medium",
              difficulty: "medium",
              due: dateStr,
            });
          }}
        />
      )}

      {/* =====================================================================
          INTERACTIVE TASK EDIT MODAL
          - When clicked on a particular task from calendar or master list
          ===================================================================== */}
      {editingTask && (
        <TaskEditModal
          isDark={isDark}
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={handleSaveEditedTask}
          onDelete={(id) => handleDeleteTask(id)}
        />
      )}

      {/* =====================================================================
          WORLD COMPLETED ARCHIVE MODAL
          ===================================================================== */}
      {inspectingWorld && (
        <WorldDetailsModal
          isDark={isDark}
          worldKey={inspectingWorld}
          world={WORLDS_CONFIG[inspectingWorld]}
          worldXp={currentAccount?.worldXp[inspectingWorld] || 0}
          tasks={tasks.filter((t) => t.category === inspectingWorld)}
          onClose={() => setInspectingWorld(null)}
        />
      )}

      {/* =====================================================================
          USER ACCOUNT SWITCH / CREATE MODAL (When signed out)
          ===================================================================== */}
      {isAuthModalOpen && (
        <AccountAuthModal
          isDark={isDark}
          currentUsername={currentAccount?.username}
          onSelectOrCreate={handleSelectOrCreateAccount}
          onClose={() => {
            if (currentAccount) setIsAuthModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

// =====================================================================
// COMPONENT: 4-OPTION DROPDOWN NAVIGATION MENU (Includes Sign Out)
// =====================================================================
function DropdownNavMenu({
  isDark,
  currentPage,
  currentUser,
  onSelectPage,
  onSignOut,
}: {
  isDark: boolean;
  currentPage: PageView;
  currentUser: string;
  onSelectPage: (page: PageView) => void;
  onSignOut: () => void;
}) {
  return (
    <div
      className={`absolute top-12 left-0 w-60 rounded-2xl border shadow-2xl backdrop-blur-2xl p-2 z-50 animate-pop-in ${
        isDark
          ? "bg-[#231238]/95 border-purple-500/40 text-[#FDFBF7]"
          : "bg-[#FBF8F2] border-[#DDD1B8] text-stone-900"
      }`}
    >
      <div className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 font-cinzel opacity-70">
        Traveler: {currentUser}
      </div>

      <button
        onClick={() => onSelectPage("dashboard")}
        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition ${
          currentPage === "dashboard"
            ? isDark
              ? "bg-purple-900/70 text-amber-200 border border-purple-400/40"
              : "bg-[#6B1724] text-[#FDFBF7]"
            : "hover:bg-black/5 opacity-85 hover:opacity-100"
        }`}
      >
        <Target size={15} className={isDark ? "text-amber-400" : "text-inherit"} />
        <span className="font-cinzel">Dashboard</span>
      </button>

      <button
        onClick={() => onSelectPage("worlds")}
        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition ${
          currentPage === "worlds"
            ? isDark
              ? "bg-purple-900/70 text-amber-200 border border-purple-400/40"
              : "bg-[#6B1724] text-[#FDFBF7]"
            : "hover:bg-black/5 opacity-85 hover:opacity-100"
        }`}
      >
        <Globe size={15} className={isDark ? "text-amber-400" : "text-inherit"} />
        <span className="font-cinzel">Worlds</span>
      </button>

      <button
        onClick={() => onSelectPage("all_tasks")}
        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition ${
          currentPage === "all_tasks"
            ? isDark
              ? "bg-purple-900/70 text-amber-200 border border-purple-400/40"
              : "bg-[#6B1724] text-[#FDFBF7]"
            : "hover:bg-black/5 opacity-85 hover:opacity-100"
        }`}
      >
        <Layers size={15} className={isDark ? "text-amber-400" : "text-inherit"} />
        <span className="font-cinzel">All Active Tasks</span>
      </button>

      <div className={`my-1 border-t ${isDark ? "border-purple-500/20" : "border-[#E5DBC7]"}`} />

      {/* Sign Out Option */}
      <button
        onClick={onSignOut}
        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition text-red-600 hover:bg-red-500/10`}
      >
        <LogOut size={15} />
        <span className="font-cinzel">Sign Out</span>
      </button>
    </div>
  );
}

// =====================================================================
// COMPONENT: FLOATING TASK INPUT BAR (Solid Cream in Light, Glass Purple in Dark)
// =====================================================================
function FloatingTaskInputBar({
  isDark,
  onAddTask,
  defaultDue,
}: {
  isDark: boolean;
  onAddTask: (data: Omit<QuestTask, "id" | "completed">) => void;
  defaultDue: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<WorldKey>("growth");
  const [priority, setPriority] = useState<PriorityLevel>("medium");
  const [due, setDue] = useState(defaultDue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddTask({
      title: title.trim(),
      category,
      priority,
      difficulty: priority === "high" || priority === "urgent" ? "hard" : priority === "medium" ? "medium" : "easy",
      due: due || defaultDue,
    });

    setTitle("");
    setIsExpanded(false);
  };

  return (
    <div
      className={`rounded-2xl border p-3.5 shadow-xl transition-all duration-200 ${
        isDark
          ? "bg-[#231238]/85 border-purple-500/30 backdrop-blur-xl text-[#FDFBF7]"
          : "bg-[#FBF8F2] border-[#DDD1B8] text-stone-900"
      }`}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Sleek One-Line Input */}
        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
              isDark ? "bg-amber-400/20 text-amber-300" : "bg-[#6B1724] text-[#FDFBF7]"
            }`}
          >
            ⚔️
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!isExpanded) setIsExpanded(true);
            }}
            onFocus={() => setIsExpanded(true)}
            placeholder="Forge a new quest..."
            className="flex-1 bg-transparent text-xs sm:text-sm placeholder-stone-400 focus:outline-none font-semibold font-cormorant"
          />
          {!isExpanded && (
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                isDark
                  ? "bg-purple-800 text-amber-200 hover:bg-purple-700"
                  : "bg-[#6B1724] text-[#FDFBF7] hover:bg-[#58131E]"
              }`}
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* Expanded Form Options */}
        {isExpanded && (
          <div
            className={`pt-3 border-t space-y-3 animate-pop-in ${
              isDark ? "border-purple-500/20" : "border-[#E5DBC7]"
            }`}
          >
            {/* Category Selector */}
            <div>
              <label className="block text-[10px] uppercase font-bold mb-1 font-cinzel opacity-80">
                World Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(Object.keys(WORLDS_CONFIG) as WorldKey[]).map((wKey) => {
                  const w = WORLDS_CONFIG[wKey];
                  const isSelected = category === wKey;
                  return (
                    <button
                      key={wKey}
                      type="button"
                      onClick={() => setCategory(wKey)}
                      className={`p-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition border ${
                        isSelected
                          ? isDark
                            ? "bg-purple-800 border-amber-400 text-amber-200 shadow"
                            : "bg-[#6B1724] border-[#53101B] text-[#FDFBF7]"
                          : isDark
                          ? "bg-[#180b2a]/60 border-purple-500/20 text-stone-400 hover:text-stone-200"
                          : "bg-[#FAF6EE] border-[#E8DEC8] text-stone-700 hover:border-[#6B1724]/40"
                      }`}
                    >
                      <span>{w.icon}</span>
                      <span className="font-cinzel text-[10px]">{w.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority & Deadline in 2 Columns */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold mb-1 font-cinzel opacity-80">
                  Priority
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(["high", "medium", "low"] as PriorityLevel[]).map((p) => {
                    const meta = PRIORITY_CONFIG[p];
                    const isSelected = priority === p;
                    const ringColor = isDark ? meta.darkRing : meta.lightRing;

                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`py-1.5 rounded-lg text-[10px] font-bold uppercase transition border ${
                          isSelected
                            ? isDark
                              ? "bg-purple-900/80 text-amber-200 border-amber-400"
                              : "bg-[#6B1724] text-[#FDFBF7] border-[#6B1724]"
                            : isDark
                            ? "bg-[#180b2a]/60 border-purple-500/20 text-stone-400"
                            : "bg-[#FAF6EE] border-[#E8DEC8] text-stone-600"
                        }`}
                        style={{
                          borderColor: isSelected ? ringColor : undefined,
                        }}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold mb-1 font-cinzel opacity-80">
                  Deadline
                </label>
                <input
                  type="date"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  className={`w-full py-1.5 px-2.5 rounded-lg border text-xs font-semibold focus:outline-none ${
                    isDark
                      ? "bg-[#180b2a] border-purple-500/30 text-amber-200 focus:border-amber-400"
                      : "bg-[#FAF6EE] border-[#DDD1B8] text-stone-900 focus:border-[#6B1724]"
                  }`}
                />
              </div>
            </div>

            {/* Actions: Burgundy Button in Light Mode */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="px-3 py-1 text-xs opacity-70 hover:opacity-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className={`px-4 py-1.5 rounded-xl font-cinzel font-bold text-xs shadow-md disabled:opacity-50 transition ${
                  isDark
                    ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950"
                    : "bg-[#6B1724] hover:bg-[#58131E] text-[#FDFBF7]"
                }`}
              >
                + Forge Quest
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

// =====================================================================
// COMPONENT: CLEAN WEEKLY STRIP (Solid Rings in Dark Aesthetic / Pastel)
// =====================================================================
function CleanWeeklyStrip({
  tasks,
  currentNow,
  isDark,
  onSelectDate,
}: {
  tasks: QuestTask[];
  currentNow: Date;
  isDark: boolean;
  onSelectDate: (dateStr: string) => void;
}) {
  const weekDays = useMemo(() => {
    const today = currentNow;
    const dayOfWeek = today.getDay(); // 0 is Sunday
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - dayOfWeek);

    const days = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const fullDateStr = todayKey(d);
      const ringColor = getPriorityRingForDate(tasks, fullDateStr, isDark);
      const isToday = fullDateStr === todayKey(currentNow);

      days.push({
        dayName: dayNames[i],
        dayNum: d.getDate(),
        fullDate: fullDateStr,
        isToday,
        ringColor,
      });
    }
    return days;
  }, [tasks, currentNow, isDark]);

  return (
    <div className="grid grid-cols-7 gap-2">
      {weekDays.map((d) => (
        <button
          key={d.fullDate}
          onClick={() => onSelectDate(d.fullDate)}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition border relative ${
            d.isToday
              ? isDark
                ? "bg-purple-900/50 border-amber-400 text-amber-200 shadow-md"
                : "bg-[#FAF6EE] border-[#6B1724] text-stone-950 font-bold shadow-sm"
              : isDark
              ? "bg-[#180b2a]/50 border-purple-500/20 text-stone-300 hover:border-purple-400"
              : "bg-[#FAF6EE]/80 border-[#E8DEC8] text-stone-700 hover:border-[#6B1724]/40"
          }`}
        >
          <span className="text-[10px] font-bold opacity-60 uppercase font-cinzel">{d.dayName}</span>

          {/* Date Number with Solid Priority Ring */}
          <div
            className="w-8 h-8 mt-1 rounded-full flex items-center justify-center text-xs font-bold transition"
            style={{
              border: d.ringColor ? `2.5px solid ${d.ringColor}` : "1.5px solid transparent",
              boxShadow: d.ringColor ? `0 0 6px ${d.ringColor}40` : undefined,
            }}
          >
            {d.dayNum}
          </div>
        </button>
      ))}
    </div>
  );
}

// =====================================================================
// COMPONENT: FLOATING REALM ROW (Island Artwork + Name + Progress Bar)
// =====================================================================
function FloatingRealmRow({
  isDark,
  worldKey,
  world,
  xp,
  isGlowing,
  onClick,
}: {
  isDark: boolean;
  worldKey: WorldKey;
  world: (typeof WORLDS_CONFIG)[WorldKey];
  xp: number;
  isGlowing: boolean;
  onClick: () => void;
}) {
  const level = Math.floor(xp / 100) + 1;
  const progressInLevel = xp % 100;
  const auraGlowColor = isDark ? world.darkAuraColor : "#D4AF37";

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer flex items-center gap-4 p-3 rounded-2xl border transition-all duration-300 hover:scale-105 shadow-xl relative ${
        isDark
          ? "bg-[#231238]/90 border-purple-500/40 backdrop-blur-xl text-[#FDFBF7]"
          : "bg-[#FBF8F2] border-[#DDD1B8] text-stone-900"
      }`}
      style={{
        boxShadow: isGlowing ? `0 0 35px ${auraGlowColor}` : undefined,
      }}
      title={`Click to inspect ${world.label} history and milestones`}
    >
      {/* 2-Second Glowing Aura Burst / Night Ring / Gold Shower */}
      {isGlowing && (
        <>
          <div
            className="absolute -inset-2 rounded-3xl animate-aura-burst pointer-events-none"
            style={{ color: auraGlowColor }}
          />
          {/* Light mode gold shower sparkle */}
          {!isDark && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-1/4 text-amber-500 text-xs animate-gold-shower">✨</div>
              <div className="absolute top-2 left-1/2 text-amber-400 text-sm animate-gold-shower">✨</div>
              <div className="absolute top-1 left-3/4 text-amber-600 text-xs animate-gold-shower">✨</div>
            </div>
          )}
        </>
      )}

      {/* Floating Island Artwork Container */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 shrink-0 shadow-lg"
        style={{
          borderColor: isGlowing ? auraGlowColor : isDark ? "rgba(168, 85, 247, 0.4)" : "#DDD1B8",
        }}
      >
        <img
          src={world.image}
          alt={world.label}
          className={`w-full h-full object-cover transition duration-300 ${
            isDark ? "brightness-90 contrast-110" : "brightness-100"
          }`}
          referrerPolicy="no-referrer"
        />

        {/* Nighttime warm window lights overlay in Dark Mode */}
        {isDark && (
          <div className="absolute inset-0 bg-gradient-to-t from-purple-950/80 via-transparent to-transparent pointer-events-none">
            {worldKey === "social" && (
              <div className="absolute bottom-2 left-3 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_#FBBF24] animate-pulse" />
            )}
            {worldKey === "growth" && (
              <div className="absolute top-4 left-6 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_#FBBF24] animate-pulse" />
            )}
          </div>
        )}
      </div>

      {/* Island Information & Progress Bar Beside the Island */}
      <div className="flex-1 min-w-[160px] sm:min-w-[200px]">
        {/* Category Icon + Title */}
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
              isDark ? "bg-amber-400/20 text-amber-300" : "bg-[#6B1724] text-[#FDFBF7]"
            }`}
          >
            {world.icon}
          </span>
          <span className="font-cinzel text-xs sm:text-sm font-bold tracking-wider">
            {world.displayTitle}
          </span>
        </div>

        {/* Subtitle */}
        <p className="text-xs font-cormorant font-semibold opacity-75 mb-2">
          {world.subtitle}
        </p>

        {/* Progress Bar (Level & Accumulated XP) */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-cinzel font-bold mb-1 opacity-90">
            <span>Level {level}</span>
            <span>
              {progressInLevel}/100 <span className="opacity-60 text-[10px]">XP</span>
            </span>
          </div>

          <div
            className={`w-full h-2 rounded-full overflow-hidden border ${
              isDark ? "bg-[#11071c] border-purple-500/30" : "bg-[#EAE2D2] border-[#DDD1B8]"
            }`}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressInLevel}%`,
                backgroundColor: isDark ? auraGlowColor : "#6B1724",
                boxShadow: isDark ? `0 0 10px ${auraGlowColor}` : undefined,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// COMPONENT: FROSTED GLASSMORPHIC FULL MONTH CALENDAR MODAL
// =====================================================================
function FrostedGlassCalendarModal({
  isDark,
  tasks,
  currentNow,
  initialSelectedDate,
  onClose,
  onToggleTask,
  onSelectTaskToEdit,
  onAddTask,
}: {
  isDark: boolean;
  tasks: QuestTask[];
  currentNow: Date;
  initialSelectedDate: string | null;
  onClose: () => void;
  onToggleTask: (id: string) => void;
  onSelectTaskToEdit: (task: QuestTask) => void;
  onAddTask: (dateStr: string) => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(
    initialSelectedDate || todayKey(currentNow)
  );
  const [viewMonth, setViewMonth] = useState(() => {
    const d = initialSelectedDate ? new Date(initialSelectedDate) : currentNow;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const monthYearStr = viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const prevMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const nextMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));

  // Generate Month Grid
  const calendarCells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells = [];

    // Prev month trailing
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, d);
      const fullDateStr = todayKey(prevDate);
      cells.push({
        dayNum: d,
        fullDate: fullDateStr,
        isCurrentMonth: false,
        isToday: fullDateStr === todayKey(currentNow),
        ringColor: getPriorityRingForDate(tasks, fullDateStr, isDark),
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(year, month, d);
      const fullDateStr = todayKey(curDate);
      cells.push({
        dayNum: d,
        fullDate: fullDateStr,
        isCurrentMonth: true,
        isToday: fullDateStr === todayKey(currentNow),
        ringColor: getPriorityRingForDate(tasks, fullDateStr, isDark),
      });
    }

    // Trailing days
    const totalSlots = Math.ceil(cells.length / 7) * 7;
    const remaining = totalSlots - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const fullDateStr = todayKey(nextDate);
      cells.push({
        dayNum: d,
        fullDate: fullDateStr,
        isCurrentMonth: false,
        isToday: fullDateStr === todayKey(currentNow),
        ringColor: getPriorityRingForDate(tasks, fullDateStr, isDark),
      });
    }

    return cells;
  }, [viewMonth, tasks, currentNow, isDark]);

  const tasksForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return tasks.filter((t) => t.due === selectedDate);
  }, [tasks, selectedDate]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-pop-in">
      <div
        className={`w-full max-w-xl rounded-3xl border p-6 shadow-2xl backdrop-blur-2xl flex flex-col max-h-[88vh] overflow-y-auto ${
          isDark
            ? "bg-[#231238]/95 border-purple-500/40 text-[#FDFBF7]"
            : "bg-[#FBF8F2] border-[#DDD1B8] text-stone-900"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between pb-3 border-b ${
            isDark ? "border-purple-500/20" : "border-[#E5DBC7]"
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className={`p-1.5 rounded-lg transition ${
                isDark ? "bg-[#160a24] text-amber-300 hover:bg-purple-900" : "bg-[#FAF6EE] hover:bg-[#EAE2D2]"
              }`}
            >
              <ChevronLeft size={16} />
            </button>
            <h3 className="font-cinzel text-base font-bold">
              {monthYearStr}
            </h3>
            <button
              onClick={nextMonth}
              className={`p-1.5 rounded-lg transition ${
                isDark ? "bg-[#160a24] text-amber-300 hover:bg-purple-900" : "bg-[#FAF6EE] hover:bg-[#EAE2D2]"
              }`}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              isDark ? "bg-[#160a24] text-stone-300 hover:bg-purple-900" : "bg-[#FAF6EE] hover:bg-[#EAE2D2]"
            }`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Day Name Labels */}
        <div className="grid grid-cols-7 gap-1 text-center py-2 text-[10px] font-bold uppercase font-cinzel opacity-70">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Month Cells Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarCells.map((cell) => {
            const isSelected = selectedDate === cell.fullDate;

            return (
              <button
                key={cell.fullDate}
                onClick={() => setSelectedDate(cell.fullDate)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center transition p-1 relative border ${
                  isSelected
                    ? isDark
                      ? "bg-purple-900/90 border-amber-400 text-amber-200 shadow-md"
                      : "bg-[#6B1724] border-[#53101B] text-[#FDFBF7] shadow-md"
                    : cell.isToday
                    ? isDark
                      ? "bg-purple-950/80 border-amber-400/60 text-amber-300"
                      : "bg-[#FAF6EE] border-[#6B1724] font-bold text-stone-900"
                    : cell.isCurrentMonth
                    ? isDark
                      ? "bg-[#1c0e2e]/60 border-purple-500/20 text-stone-200 hover:bg-purple-900/40"
                      : "bg-[#FAF6EE] border-[#E8DEC8] text-stone-800 hover:border-[#6B1724]/40"
                    : "opacity-30 border-transparent"
                }`}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition"
                  style={{
                    border: cell.ringColor ? `2.5px solid ${cell.ringColor}` : "1.5px solid transparent",
                    boxShadow: cell.ringColor ? `0 0 6px ${cell.ringColor}50` : undefined,
                  }}
                >
                  {cell.dayNum}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Date Drawer: Interactive Task List & Edit On Click */}
        {selectedDate && (
          <div
            className={`mt-4 p-4 rounded-2xl border space-y-3 ${
              isDark
                ? "bg-[#180b2a]/90 border-purple-500/30"
                : "bg-[#FAF6EE] border-[#DDD1B8]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-cinzel text-xs font-bold">
                Quests for {selectedDate}
              </span>
              <button
                onClick={() => onAddTask(selectedDate)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-cinzel flex items-center gap-1 transition ${
                  isDark
                    ? "bg-purple-800 text-amber-200 hover:bg-purple-700"
                    : "bg-[#6B1724] text-[#FDFBF7] hover:bg-[#58131E]"
                }`}
              >
                <Plus size={12} />
                <span>Add Quest</span>
              </button>
            </div>

            {/* Task list for selected date */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {tasksForSelectedDate.length === 0 ? (
                <p className="text-xs opacity-60 italic py-2">No quests scheduled for this day.</p>
              ) : (
                tasksForSelectedDate.map((t) => {
                  const world = WORLDS_CONFIG[t.category] || WORLDS_CONFIG.growth;
                  return (
                    <div
                      key={t.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition hover:scale-[1.01] ${
                        isDark
                          ? "bg-[#231238] border-purple-500/20"
                          : "bg-[#FBF8F2] border-[#E8DEC8]"
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <button
                          onClick={() => onToggleTask(t.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            t.completed
                              ? isDark
                                ? "bg-amber-500 border-amber-400 text-stone-950"
                                : "bg-[#6B1724] border-[#6B1724] text-[#FDFBF7]"
                              : "border-stone-400"
                          }`}
                        >
                          {t.completed && <Check size={10} />}
                        </button>

                        {/* Category badge */}
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] shrink-0 ${
                            isDark ? "bg-amber-400/20 text-amber-300" : "bg-[#6B1724] text-[#FDFBF7]"
                          }`}
                        >
                          {world.icon}
                        </span>

                        {/* Title - Click opens Edit modal */}
                        <span
                          onClick={() => onSelectTaskToEdit(t)}
                          className={`text-xs truncate cursor-pointer hover:underline font-semibold ${
                            t.completed ? "line-through opacity-50" : ""
                          }`}
                          title="Click to edit quest details"
                        >
                          {t.title}
                        </span>
                      </div>

                      <button
                        onClick={() => onSelectTaskToEdit(t)}
                        className="p-1 rounded opacity-60 hover:opacity-100 hover:text-amber-500 transition shrink-0"
                        title="Edit Quest"
                      >
                        <Edit3 size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// COMPONENT: TASK EDIT MODAL (Opens when clicking any task in Calendar)
// =====================================================================
function TaskEditModal({
  isDark,
  task,
  onClose,
  onSave,
  onDelete,
}: {
  isDark: boolean;
  task: QuestTask;
  onClose: () => void;
  onSave: (updated: QuestTask) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [category, setCategory] = useState<WorldKey>(task.category);
  const [priority, setPriority] = useState<PriorityLevel>(task.priority);
  const [due, setDue] = useState(task.due);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      ...task,
      title: title.trim(),
      category,
      priority,
      difficulty: priority === "high" || priority === "urgent" ? "hard" : priority === "medium" ? "medium" : "easy",
      due,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-pop-in">
      <div
        className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl backdrop-blur-2xl ${
          isDark
            ? "bg-[#231238]/95 border-purple-500/40 text-[#FDFBF7]"
            : "bg-[#FBF8F2] border-[#DDD1B8] text-stone-900"
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b mb-4">
          <div className="flex items-center gap-2">
            <Edit3 size={16} className={isDark ? "text-amber-400" : "text-[#6B1724]"} />
            <h3 className="font-cinzel text-base font-bold">
              Edit Quest Details
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center opacity-70 hover:opacity-100"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase font-bold mb-1 font-cinzel opacity-80">
              Quest Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full p-2 rounded-xl border text-xs font-semibold focus:outline-none ${
                isDark
                  ? "bg-[#180b2a] border-purple-500/30 text-amber-200 focus:border-amber-400"
                  : "bg-[#FAF6EE] border-[#DDD1B8] text-stone-900 focus:border-[#6B1724]"
              }`}
              placeholder="Quest title..."
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-[10px] uppercase font-bold mb-1 font-cinzel opacity-80">
              World Realm
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(WORLDS_CONFIG) as WorldKey[]).map((wKey) => {
                const w = WORLDS_CONFIG[wKey];
                const isSelected = category === wKey;
                return (
                  <button
                    key={wKey}
                    type="button"
                    onClick={() => setCategory(wKey)}
                    className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition border ${
                      isSelected
                        ? isDark
                          ? "bg-purple-800 border-amber-400 text-amber-200"
                          : "bg-[#6B1724] border-[#53101B] text-[#FDFBF7]"
                        : isDark
                        ? "bg-[#180b2a]/60 border-purple-500/20 text-stone-400"
                        : "bg-[#FAF6EE] border-[#E8DEC8] text-stone-700"
                    }`}
                  >
                    <span>{w.icon}</span>
                    <span className="font-cinzel text-[11px]">{w.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold mb-1 font-cinzel opacity-80">
                Priority
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(["high", "medium", "low"] as PriorityLevel[]).map((p) => {
                  const meta = PRIORITY_CONFIG[p];
                  const isSelected = priority === p;
                  const ringColor = isDark ? meta.darkRing : meta.lightRing;

                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-1 rounded-lg text-[10px] font-bold uppercase transition border ${
                        isSelected
                          ? isDark
                            ? "bg-purple-900 text-amber-200 border-amber-400"
                            : "bg-[#6B1724] text-[#FDFBF7] border-[#6B1724]"
                          : isDark
                          ? "bg-[#180b2a]/60 border-purple-500/20 text-stone-400"
                          : "bg-[#FAF6EE] border-[#E8DEC8] text-stone-600"
                      }`}
                      style={{
                        borderColor: isSelected ? ringColor : undefined,
                      }}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold mb-1 font-cinzel opacity-80">
                Due Date
              </label>
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className={`w-full py-1.5 px-2.5 rounded-lg border text-xs font-semibold focus:outline-none ${
                  isDark
                    ? "bg-[#180b2a] border-purple-500/30 text-amber-200 focus:border-amber-400"
                    : "bg-[#FAF6EE] border-[#DDD1B8] text-stone-900 focus:border-[#6B1724]"
                }`}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t">
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 rounded-xl font-bold transition flex items-center gap-1"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs opacity-70 hover:opacity-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className={`px-4 py-1.5 rounded-xl font-cinzel font-bold text-xs shadow-md transition flex items-center gap-1.5 ${
                  isDark
                    ? "bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950"
                    : "bg-[#6B1724] hover:bg-[#58131E] text-[#FDFBF7]"
                }`}
              >
                <Save size={13} />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// =====================================================================
// COMPONENT: WORLD DETAILS & COMPLETED ARCHIVE MODAL
// =====================================================================
function WorldDetailsModal({
  isDark,
  worldKey,
  world,
  worldXp,
  tasks,
  onClose,
}: {
  isDark: boolean;
  worldKey: WorldKey;
  world: (typeof WORLDS_CONFIG)[WorldKey];
  worldXp: number;
  tasks: QuestTask[];
  onClose: () => void;
}) {
  const completedTasks = tasks.filter((t) => t.completed);
  const level = Math.floor(worldXp / 100) + 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-pop-in">
      <div
        className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl backdrop-blur-2xl flex flex-col max-h-[85vh] overflow-y-auto ${
          isDark
            ? "bg-[#231238]/95 border-purple-500/40 text-[#FDFBF7]"
            : "bg-[#FBF8F2] border-[#DDD1B8] text-stone-900"
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${
                isDark ? "bg-purple-900/60 border-purple-400" : "bg-[#6B1724] text-[#FDFBF7] border-[#53101B]"
              }`}
            >
              {world.icon}
            </div>
            <div>
              <h3 className="font-cinzel text-base font-bold">
                {world.label} Realm ({world.sketchTitle})
              </h3>
              <p className="text-xs font-cormorant font-semibold opacity-75">{world.subtitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center opacity-70 hover:opacity-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Realm Stats Summary */}
        <div className="grid grid-cols-3 gap-3 my-4">
          <div
            className={`p-3 rounded-2xl border text-center ${
              isDark ? "bg-[#180b2a]/80 border-purple-500/20" : "bg-[#FAF6EE] border-[#E8DEC8]"
            }`}
          >
            <span className="text-[10px] uppercase font-bold opacity-70 block font-cinzel">
              Realm Level
            </span>
            <span className="font-cinzel text-base font-black">Level {level}</span>
          </div>

          <div
            className={`p-3 rounded-2xl border text-center ${
              isDark ? "bg-[#180b2a]/80 border-purple-500/20" : "bg-[#FAF6EE] border-[#E8DEC8]"
            }`}
          >
            <span className="text-[10px] uppercase font-bold opacity-70 block font-cinzel">
              Total XP
            </span>
            <span className="font-cinzel text-base font-black">{worldXp} XP</span>
          </div>

          <div
            className={`p-3 rounded-2xl border text-center ${
              isDark ? "bg-[#180b2a]/80 border-purple-500/20" : "bg-[#FAF6EE] border-[#E8DEC8]"
            }`}
          >
            <span className="text-[10px] uppercase font-bold opacity-70 block font-cinzel">
              Completed
            </span>
            <span className="font-cinzel text-base font-black">{completedTasks.length}</span>
          </div>
        </div>

        {/* Completed Quests Archive */}
        <div>
          <h4 className="font-cinzel text-xs font-bold uppercase tracking-wider mb-2 opacity-90">
            Completed Quests Archive
          </h4>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {completedTasks.length === 0 ? (
              <p className="text-xs opacity-60 italic py-4 text-center">
                No quests completed in this realm yet. Forge quests on the dashboard to build its legacy!
              </p>
            ) : (
              completedTasks.map((t) => (
                <div
                  key={t.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                    isDark ? "bg-[#180b2a]/80 border-purple-500/20" : "bg-[#FAF6EE] border-[#E8DEC8]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold">{t.title}</span>
                      <div className="text-[10px] opacity-60 font-sans">
                        Completed {t.completedAt || "recently"}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold font-cinzel text-amber-500">
                    +{DIFFICULTY_CONFIG[t.difficulty || "medium"].xp} XP
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// COMPONENT: ACCOUNT AUTH / SWITCH MODAL
// =====================================================================
function AccountAuthModal({
  isDark,
  currentUsername,
  onSelectOrCreate,
  onClose,
}: {
  isDark: boolean;
  currentUsername?: string;
  onSelectOrCreate: (username: string) => void;
  onClose: () => void;
}) {
  const [usernameInput, setUsernameInput] = useState("");
  const [knownAccounts, setKnownAccounts] = useState<string[]>(() => {
    try {
      const allSaved = localStorage.getItem("questhub_all_accounts");
      if (allSaved) {
        const list: UserAccount[] = JSON.parse(allSaved);
        return list.map((a) => a.username);
      }
    } catch (e) {}
    return ["Arjun"];
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    onSelectOrCreate(usernameInput.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-pop-in">
      <div
        className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl backdrop-blur-2xl text-center space-y-4 ${
          isDark
            ? "bg-[#231238]/95 border-purple-500/40 text-[#FDFBF7]"
            : "bg-[#FBF8F2] border-[#DDD1B8] text-stone-900"
        }`}
      >
        <div className="flex justify-center">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow ${
              isDark ? "bg-amber-400/20 text-amber-300" : "bg-[#6B1724] text-[#FDFBF7]"
            }`}
          >
            ⚔️
          </div>
        </div>

        <div>
          <h3 className="font-cinzel text-lg font-bold">
            Traveler Account
          </h3>
          <p className="text-xs font-cormorant font-semibold opacity-75">
            Create your username or choose an existing account to synchronize your realms.
          </p>
        </div>

        {/* Existing Accounts List */}
        {knownAccounts.length > 0 && (
          <div className="space-y-1.5 text-left">
            <span className="text-[10px] font-bold uppercase font-cinzel opacity-70">
              Select Profile
            </span>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {knownAccounts.map((name) => (
                <button
                  key={name}
                  onClick={() => onSelectOrCreate(name)}
                  className={`w-full p-2 rounded-xl text-xs font-semibold flex items-center justify-between transition border ${
                    currentUsername === name
                      ? isDark
                        ? "bg-purple-900 border-amber-400 text-amber-200"
                        : "bg-[#6B1724] text-[#FDFBF7]"
                      : isDark
                      ? "bg-[#180b2a]/60 border-purple-500/20 hover:bg-purple-900/40"
                      : "bg-[#FAF6EE] border-[#E8DEC8] hover:border-[#6B1724]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <User size={14} />
                    <span className="font-cinzel font-bold">{name}</span>
                  </div>
                  <span className="text-[10px] opacity-70">Load Realms</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Create New Account Form */}
        <form onSubmit={handleCreate} className="space-y-3 pt-2">
          <div className="text-left">
            <label className="block text-[10px] uppercase font-bold mb-1 font-cinzel opacity-70">
              Or Enter New Username
            </label>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="e.g. Eleanor, Roland..."
              className={`w-full p-2.5 rounded-xl border text-xs font-semibold focus:outline-none ${
                isDark
                  ? "bg-[#180b2a] border-purple-500/30 text-amber-200 focus:border-amber-400"
                  : "bg-[#FAF6EE] border-[#DDD1B8] text-stone-900 focus:border-[#6B1724]"
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={!usernameInput.trim()}
            className={`w-full py-2 rounded-xl font-cinzel font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50 ${
              isDark
                ? "bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950"
                : "bg-[#6B1724] hover:bg-[#58131E] text-[#FDFBF7]"
            }`}
          >
            <UserPlus size={14} />
            <span>Enter World</span>
          </button>
        </form>
      </div>
    </div>
  );
}
