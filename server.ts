import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import {
  getOrCreateUser,
  getUserProfile,
  updateUserStats,
  createQuestTask,
  updateQuestTask,
  deleteQuestTask,
} from "./src/db/queries.ts";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// -------------------------------------------------------------
// API ROUTES (PROTECTED WITH CLOUD SQL & FIREBASE AUTH)
// -------------------------------------------------------------
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Sync / create authenticated user from Google Sign In
app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const email = req.user!.email || `${uid}@user.questhub`;
    const displayName = req.user!.name || req.body.displayName || email.split("@")[0];

    const user = await getOrCreateUser(uid, email, displayName);
    const profile = await getUserProfile(uid);
    res.json(profile || { user, tasks: [] });
  } catch (error: any) {
    console.error("Auth sync error:", error);
    res.status(500).json({ error: error.message || "Failed to sync user" });
  }
});

// Get user profile & tasks
app.get("/api/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const profile = await getUserProfile(uid);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json(profile);
  } catch (error: any) {
    console.error("Fetch profile error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch profile" });
  }
});

// Update user stats (XP, level, streak, world XP, avatar name)
app.put("/api/profile/stats", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const updated = await updateUserStats(uid, req.body);
    res.json(updated);
  } catch (error: any) {
    console.error("Update stats error:", error);
    res.status(500).json({ error: error.message || "Failed to update stats" });
  }
});

// Create task
app.post("/api/tasks", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const created = await createQuestTask(uid, req.body);
    res.status(201).json(created);
  } catch (error: any) {
    console.error("Create task error:", error);
    res.status(500).json({ error: error.message || "Failed to create task" });
  }
});

// Update task
app.put("/api/tasks/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const taskId = req.params.id;
    const updated = await updateQuestTask(uid, taskId, req.body);
    res.json(updated);
  } catch (error: any) {
    console.error("Update task error:", error);
    res.status(500).json({ error: error.message || "Failed to update task" });
  }
});

// Delete task
app.delete("/api/tasks/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const taskId = req.params.id;
    const result = await deleteQuestTask(uid, taskId);
    res.json(result);
  } catch (error: any) {
    console.error("Delete task error:", error);
    res.status(500).json({ error: error.message || "Failed to delete task" });
  }
});

// AI Companion Chat endpoint
app.post("/api/companion/chat", async (req, res) => {
  try {
    const { message, history, username, profileAnswers, level, xp, taskStats } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        reply: `Greetings, ${username || "Traveler"}. I am your steadfast quest companion. What quest shall we forge together today?`,
      });
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    // Build context-aware system prompt
    let profileContext = "";
    if (profileAnswers) {
      profileContext = `
TRAVELER PROFILE & USER INTENT:
- Current Priority Realm: ${profileAnswers.priorityCategory || "Growth"}
- Hobbies & Interests: ${profileAnswers.hobbies || "Exploring and learning"}
- Next Focus Towards Dream Life: ${profileAnswers.dreamLife || "A balanced, purposeful and thriving life"}
- Current Level: ${level || 1} (${xp || 0} XP total)
`;
    }

    let activityContext = "";
    if (taskStats) {
      activityContext = `
TASK & ACTIVITY CONTEXT:
- Days since last completed task in chosen priority (${profileAnswers?.priorityCategory || "Growth"}): ${taskStats.daysSincePriorityCompleted ?? "unknown"}
- Just leveled up: ${taskStats.justLeveledUp ? "YES" : "NO"}
`;
    }

    const systemInstruction = `You are an intelligent, wise, and deeply supportive fantasy quest companion, personal mentor, and study/life planner living inside the chat for ${username || "Traveler"}.
${profileContext}
${activityContext}

CORE BEHAVIORS & SPECIAL INSTRUCTIONS:
1. Planning Assistance: When a task is created or discussed, ask the user if they need help planning or breaking it down. ONLY create full study schedules, routines, workout splits, or timetables when the user explicitly asks for or confirms they want help planning it. When they do ask, provide structured, highly practical timetables and actionable steps aligned with their next focus towards dream life.
2. Inactivity Check: If the context indicates it has been more than 7 days since they completed a task under their chosen priority category, gently include or open with: "Hey, life's been busy but let's not forget your focus on ${profileAnswers?.priorityCategory || "your priority realm"}!"
3. Level Up Celebration (100 XP intervals): If the user just reached a new level or asks for their level reward, celebrate with: "Next level achieved, Let's do something fun as a treat!" followed by a personalized, creative mini-activity designed around their actual hobbies (${profileAnswers?.hobbies || "their hobbies"}).
4. Voice & Tone: Warm, engaging, supportive, and subtly heroic. Speak concisely and clearly (or provide formatted bullet points/timetables when generating schedules or plans). If suggesting quests, give clear titles so the traveler can forge them directly (and note that mini-quests contribute to Adventure XP).`;

    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const h of history.slice(-8)) {
        contents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }],
        });
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || `May your steps be swift and resolute, ${username || "Traveler"}.`;
    res.json({ reply });
  } catch (error: any) {
    console.error("Gemini Companion error:", error);
    res.json({
      reply: `I stand with you, ${req.body?.username || "traveler"}. The mystic winds fluctuated momentarily, but I am ready. What shall we plan or forge next?`,
    });
  }
});


// -------------------------------------------------------------
// VITE INTEGRATION
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`QuestHub Cloud SQL server listening on port ${PORT}`);
  });
}

startServer();
