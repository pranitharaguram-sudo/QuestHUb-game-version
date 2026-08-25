import React, { useState, useRef, useEffect } from "react";
import { Sparkles, X, ArrowUp, Plus, Bot, MessageSquare, BookOpen, Gift, AlertCircle } from "lucide-react";
import { IMAGES } from "../assets";
import { WorldKey, QuestTask, UserAccount } from "../types";

interface Message {
  id: string;
  role: "assistant" | "user";
  text: string;
  timestamp: string;
  suggestedQuest?: {
    title: string;
    category: WorldKey;
    difficulty: "easy" | "medium" | "hard";
  };
  isRewardNotice?: boolean;
}

interface CompanionChatDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  isDark: boolean;
  account: UserAccount;
  onAddQuest: (task: Omit<QuestTask, "id" | "completed">) => void;
  onOpenProfile?: () => void;
  activeHelpTask?: QuestTask | null;
  onClearHelpTask?: () => void;
}

export const CompanionChatDrawer: React.FC<CompanionChatDrawerProps> = ({
  isOpen,
  onToggle,
  isDark,
  account,
  onAddQuest,
  onOpenProfile,
  activeHelpTask,
  onClearHelpTask,
}) => {
  const username = account.avatarName || account.username || "Traveler";
  const profileAnswers = account.profileAnswers;

  // Calculate days since user completed a task in their chosen priority
  const daysSincePriorityCompleted = React.useMemo(() => {
    if (!profileAnswers?.priorityCategory) return 0;
    const priority = profileAnswers.priorityCategory;
    const completedTasks = account.tasks.filter(
      (t) => t.completed && t.category === priority && t.completedAt
    );
    if (completedTasks.length === 0) return 8; // > 1 week

    const sorted = [...completedTasks].sort(
      (a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()
    );
    const lastDate = new Date(sorted[0].completedAt!);
    const diffDays = Math.floor(
      (new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays;
  }, [account.tasks, profileAnswers]);

  // Initial welcome message with inactivity check if > 7 days
  const [messages, setMessages] = useState<Message[]>(() => {
    let initialGreeting = `Good day, ${username}. I am your quest companion, mentor, and planner. What shall we forge or plan today?`;
    if (profileAnswers?.priorityCategory && daysSincePriorityCompleted > 7) {
      initialGreeting = `Hey, life's been busy but let's not forget ${profileAnswers.priorityCategory}! I am here to help you get back into flow with a gentle quest.`;
    }
    return [
      {
        id: "msg_welcome",
        role: "assistant",
        text: initialGreeting,
        timestamp: "Just now",
      },
    ];
  });

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastLevelTracked, setLastLevelTracked] = useState(account.level);
  const [lastHandledHelpTaskId, setLastHandledHelpTaskId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // When a task is created or planning help is requested for a quest
  useEffect(() => {
    if (activeHelpTask && activeHelpTask.id !== lastHandledHelpTaskId) {
      setLastHandledHelpTaskId(activeHelpTask.id);
      const helpOfferMsg: Message = {
        id: "msg_help_" + Date.now(),
        role: "assistant",
        text: `✨ I noticed you forged the quest "${activeHelpTask.title}". Do you want me to help you plan this? Let me know if you would like a schedule or milestone breakdown!`,
        timestamp: "Just now",
      };
      setMessages((prev) => [...prev, helpOfferMsg]);
    }
  }, [activeHelpTask, lastHandledHelpTaskId]);

  // Detect Level Up (every 100 XP) and deliver hobby-based fun treat reward
  useEffect(() => {
    if (account.level > lastLevelTracked) {
      setLastLevelTracked(account.level);
      const hobbiesText = profileAnswers?.hobbies || "creative discovery";
      const rewardMsg: Message = {
        id: "msg_levelup_" + Date.now(),
        role: "assistant",
        text: `🎉 Next level achieved, Let's do something fun as a treat! Since you enjoy ${hobbiesText}, take 20 minutes today to indulge in a relaxing hobby session or creative treat. You've earned this victory!`,
        timestamp: "Just now",
        isRewardNotice: true,
        suggestedQuest: {
          title: `Reward Treat: 25 min ${hobbiesText.slice(0, 25)}`,
          category: "adventure", // All mini-quests contribute to adventure XP
          difficulty: "easy",
        },
      };
      setMessages((prev) => [...prev, rewardMsg]);
    }
  }, [account.level, lastLevelTracked, profileAnswers]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const promptToSend = customPrompt || inputText;
    const cleanText = promptToSend.trim();
    if (!cleanText || isLoading) return;

    const userMsg: Message = {
      id: "msg_" + Date.now(),
      role: "user",
      text: cleanText,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputText("");
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        text: m.text,
      }));

      const res = await fetch("/api/companion/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: cleanText,
          history,
          username,
          profileAnswers,
          level: account.level,
          xp: account.xp,
          taskStats: {
            daysSincePriorityCompleted,
            justLeveledUp: account.level > lastLevelTracked,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      const replyText =
        data.reply || `I hear you, ${username}. Let us forge this path forward.`;

      // Check if reply contains a quest suggestion
      let suggestedQuest: Message["suggestedQuest"] | undefined = undefined;
      const lower = replyText.toLowerCase();
      if (
        lower.includes("quest:") ||
        cleanText.toLowerCase().includes("suggest") ||
        cleanText.toLowerCase().includes("quest") ||
        cleanText.toLowerCase().includes("schedule") ||
        cleanText.toLowerCase().includes("plan")
      ) {
        // All mini-quests contribute to adventure XP
        suggestedQuest = {
          title: cleanText.length < 40 ? cleanText : "Mini-Quest: " + cleanText.slice(0, 30),
          category: "adventure",
          difficulty: "easy",
        };
      }

      const botMsg: Message = {
        id: "msg_bot_" + Date.now(),
        role: "assistant",
        text: replyText,
        timestamp: "Just now",
        suggestedQuest,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: "msg_err_" + Date.now(),
          role: "assistant",
          text: `I stand by your side, ${username}. Let us continue crafting your path and schedules.`,
          timestamp: "Just now",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (promptText: string) => {
    handleSendMessage(undefined, promptText);
  };

  return (
    <>
      {/* FLOATING CHATBOT ICON (Right Side of Dashboard) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          id="companion-chat-toggle"
          aria-label="Open AI Companion Chat"
          className={`fixed right-6 bottom-24 sm:bottom-28 z-40 p-1.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group border-2 flex items-center justify-center ${
            isDark
              ? "bg-[#231238] border-amber-400 text-amber-300 shadow-purple-950/80"
              : "bg-[#FBF8F2] border-[#6B1724] text-[#6B1724] shadow-stone-900/20"
          }`}
          title="Speak with your AI Companion"
        >
          <div className="relative w-12 h-12 rounded-full overflow-hidden border">
            <img
              src={IMAGES.companionAvatar}
              alt="AI Companion"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>

          <span
            className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shadow ${
              isDark ? "bg-amber-400 text-stone-950" : "bg-[#6B1724] text-[#FDFBF7]"
            }`}
          >
            ✦
          </span>
        </button>
      )}

      {/* FLOATING COMPANION CHAT CARD */}
      {isOpen && (
        <div
          className={`fixed right-4 sm:right-6 bottom-4 sm:bottom-6 z-50 w-[92vw] sm:w-96 max-w-sm rounded-3xl border shadow-2xl transition-all duration-300 flex flex-col overflow-hidden animate-pop-in ${
            isDark
              ? "bg-[#231238]/95 border-purple-500/40 text-[#FDFBF7] shadow-purple-950/70 backdrop-blur-2xl"
              : "bg-[#FBF8F2] border-[#DDD1B8] text-stone-900 shadow-2xl backdrop-blur-xl"
          }`}
          style={{ height: "490px" }}
        >
          {/* Header with Companion Avatar and Traveler Profile Indicator */}
          <div
            className={`p-3.5 border-b flex items-center justify-between ${
              isDark
                ? "bg-[#1c0e2e]/90 border-purple-500/30"
                : "bg-[#FAF6EE] border-[#DDD1B8]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-amber-400/80 shrink-0 shadow">
                <img
                  src={IMAGES.companionAvatar}
                  alt="AI Companion"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-cinzel text-xs font-bold tracking-wide">
                    Companion Guide
                  </h3>
                  <Sparkles size={12} className="text-amber-500" />
                </div>
                <p
                  className={`text-[11px] font-cormorant font-semibold truncate max-w-[170px] ${
                    isDark ? "text-purple-200/80" : "text-stone-600"
                  }`}
                >
                  Guide for {username} • Focus: {profileAnswers?.priorityCategory || "Growth"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onOpenProfile && (
                <button
                  onClick={onOpenProfile}
                  className={`p-1.5 rounded-lg text-[10px] font-cinzel font-bold border transition ${
                    isDark
                      ? "border-purple-400/30 text-purple-200 hover:bg-purple-900/60"
                      : "border-[#DDD1B8] text-stone-700 hover:bg-[#EAE2D2]"
                  }`}
                  title="View Profile Answers"
                >
                  Profile
                </button>
              )}
              <button
                onClick={onToggle}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                  isDark
                    ? "hover:bg-purple-900/60 text-purple-200"
                    : "hover:bg-[#EAE2D2] text-stone-700"
                }`}
                aria-label="Close Chat"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Quick Starter Chips: Study Schedules, Plans, Treat Ideas */}
          <div className="px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto text-[10px] font-cinzel no-scrollbar border-b border-inherit/10">
            <button
              onClick={() => handleQuickPrompt("Generate a 3-day study schedule aligned with my dream life")}
              className={`shrink-0 px-2 py-0.5 rounded-full border transition flex items-center gap-1 ${
                isDark
                  ? "bg-purple-900/40 border-purple-400/30 text-amber-200 hover:border-amber-400"
                  : "bg-[#FAF6EE] border-[#DDD1B8] text-stone-800 hover:border-[#6B1724]"
              }`}
            >
              <BookOpen size={10} />
              <span>Study Schedule</span>
            </button>
            <button
              onClick={() => handleQuickPrompt(`Suggest a fun treat mini-activity based on my hobbies: ${profileAnswers?.hobbies || "reading"}`)}
              className={`shrink-0 px-2 py-0.5 rounded-full border transition flex items-center gap-1 ${
                isDark
                  ? "bg-purple-900/40 border-purple-400/30 text-amber-200 hover:border-amber-400"
                  : "bg-[#FAF6EE] border-[#DDD1B8] text-stone-800 hover:border-[#6B1724]"
              }`}
            >
              <Gift size={10} />
              <span>Hobby Treat</span>
            </button>
            <button
              onClick={() => handleQuickPrompt(`How can I make progress in ${profileAnswers?.priorityCategory || "my priority"} today?`)}
              className={`shrink-0 px-2 py-0.5 rounded-full border transition ${
                isDark
                  ? "bg-purple-900/40 border-purple-400/30 text-amber-200 hover:border-amber-400"
                  : "bg-[#FAF6EE] border-[#DDD1B8] text-stone-800 hover:border-[#6B1724]"
              }`}
            >
              ✨ Today's Quests
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 font-cormorant text-sm">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isUser ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] p-3 rounded-2xl border text-xs sm:text-sm font-semibold leading-relaxed shadow-sm whitespace-pre-wrap ${
                      isUser
                        ? isDark
                          ? "bg-purple-900/80 border-purple-400/40 text-amber-100 rounded-br-none"
                          : "bg-[#6B1724] border-[#53101B] text-[#FDFBF7] rounded-br-none"
                        : msg.isRewardNotice
                        ? isDark
                          ? "bg-amber-950/80 border-amber-400/60 text-amber-200 rounded-bl-none"
                          : "bg-[#FFF9EE] border-amber-300 text-stone-900 rounded-bl-none"
                        : isDark
                        ? "bg-[#180b2a]/90 border-purple-500/30 text-purple-100 rounded-bl-none"
                        : "bg-[#FAF6EE] border-[#DDD1B8] text-stone-900 rounded-bl-none"
                    }`}
                  >
                    <p>{msg.text}</p>

                    {/* Optional Quick Add as Quest Button */}
                    {msg.suggestedQuest && (
                      <div className="mt-2 pt-2 border-t border-inherit/20 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-cinzel uppercase opacity-80">
                          Suggested Quest
                        </span>
                        <button
                          onClick={() => {
                            if (msg.suggestedQuest) {
                              onAddQuest({
                                title: msg.suggestedQuest.title,
                                category: msg.suggestedQuest.category,
                                priority: "medium",
                                difficulty: msg.suggestedQuest.difficulty,
                                due: new Date().toISOString().split("T")[0],
                              });
                            }
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-cinzel font-bold flex items-center gap-1 transition shadow ${
                            isDark
                              ? "bg-amber-400 text-stone-950 hover:bg-amber-300"
                              : "bg-[#6B1724] text-[#FDFBF7] hover:bg-[#58131E]"
                          }`}
                        >
                          <Plus size={10} />
                          <span>Forge Quest</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs font-cinzel opacity-70 p-2">
                <span className="animate-spin">⏳</span>
                <span>Companion is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Input Form */}
          <form
            onSubmit={(e) => handleSendMessage(e)}
            className={`p-2.5 border-t flex items-center gap-2 ${
              isDark
                ? "bg-[#1c0e2e]/90 border-purple-500/30"
                : "bg-[#FAF6EE] border-[#DDD1B8]"
            }`}
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="message your companion"
              className={`flex-1 py-2 px-3.5 rounded-full border text-xs font-semibold focus:outline-none transition ${
                isDark
                  ? "bg-[#150926] border-purple-500/40 text-amber-200 placeholder-purple-400/50 focus:border-amber-400"
                  : "bg-[#FBF8F2] border-[#DDD1B8] text-stone-900 placeholder-stone-500 focus:border-[#6B1724]"
              }`}
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition shadow-md shrink-0 hover:scale-105 active:scale-95 disabled:opacity-40 ${
                isDark
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 hover:from-amber-400 hover:to-amber-500"
                  : "bg-[#6B1724] hover:bg-[#58131E] text-[#FDFBF7]"
              }`}
              title="Send Message"
            >
              <ArrowUp size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
