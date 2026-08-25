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
