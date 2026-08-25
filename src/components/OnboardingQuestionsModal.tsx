import React, { useState } from "react";
import { Sparkles, Compass, Heart, Users, Flame, Check, ArrowRight } from "lucide-react";
import { WorldKey, UserProfileAnswers } from "../types";

interface OnboardingQuestionsModalProps {
  isDark: boolean;
  username: string;
  initialAnswers?: UserProfileAnswers;
  onSave: (answers: UserProfileAnswers) => void;
  onClose?: () => void;
  isEditing?: boolean;
}

const PRIORITY_OPTIONS: {
  key: WorldKey;
  label: string;
  desc: string;
  icon: any;
  color: string;
}[] = [
  {
    key: "growth",
    label: "Growth",
    desc: "Skills, knowledge, study, career & personal mastery",
    icon: Compass,
    color: "text-emerald-500",
  },
  {
    key: "wellbeing",
    label: "Wellbeing",
    desc: "Health, mindfulness, workouts & restorative rest",
    icon: Heart,
    color: "text-rose-500",
  },
  {
    key: "social",
    label: "Social",
    desc: "Family, friendships, community & deep connections",
    icon: Users,
    color: "text-sky-500",
  },
  {
    key: "adventure",
    label: "Adventure",
    desc: "Exploration, creative projects, travel & new experiences",
    icon: Flame,
    color: "text-amber-500",
  },
];

export const OnboardingQuestionsModal: React.FC<OnboardingQuestionsModalProps> = ({
  isDark,
  username,
  initialAnswers,
  onSave,
  onClose,
  isEditing = false,
}) => {
  const [priorityCategory, setPriorityCategory] = useState<WorldKey>(
    initialAnswers?.priorityCategory || "growth"
  );
  const [hobbies, setHobbies] = useState(initialAnswers?.hobbies || "");
  const [dreamLife, setDreamLife] = useState(initialAnswers?.dreamLife || "");
  const [step, setStep] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hobbies.trim() || !dreamLife.trim()) return;

    onSave({
      priorityCategory,
      hobbies: hobbies.trim(),
      dreamLife: dreamLife.trim(),
      completedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div
        className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 ${
          isDark
            ? "bg-[#1f0d34]/95 border-purple-500/40 text-[#FDFBF7] shadow-purple-950/80"
            : "bg-[#FBF8F2] border-[#DDD1B8] text-stone-900"
        }`}
      >
        {/* Header */}
        <div
          className={`p-5 sm:p-6 border-b flex items-center justify-between ${
            isDark
              ? "bg-[#18092c] border-purple-500/30"
              : "bg-[#FAF6EE] border-[#DDD1B8]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner ${
                isDark
                  ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                  : "bg-[#6B1724]/10 text-[#6B1724] border border-[#6B1724]/20"
              }`}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="font-cinzel text-base sm:text-lg font-bold tracking-wide">
                {isEditing ? "Traveler Profile & Intent" : "Welcome, Traveler"}
              </h2>
              <p
                className={`text-xs font-cormorant font-semibold ${
                  isDark ? "text-purple-200/80" : "text-stone-600"
                }`}
              >
                {isEditing
                  ? `Refine your answers for ${username}`
                  : `Help your AI Companion get to know ${username}`}
              </p>
            </div>
          </div>

          {onClose && isEditing && (
            <button
              onClick={onClose}
              className={`text-xs font-cinzel font-bold px-3 py-1.5 rounded-xl border transition ${
                isDark
                  ? "border-purple-400/30 hover:bg-purple-900/50 text-purple-200"
                  : "border-[#DDD1B8] hover:bg-[#EAE2D2] text-stone-700"
              }`}
            >
              Close
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
          {/* Question 1: Priority Category */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-cinzel text-xs sm:text-sm font-bold tracking-wide flex items-center gap-1.5">
                <span className="opacity-60">1.</span> What is your current area of priority?
              </label>
              <span
                className={`text-[11px] font-bold uppercase tracking-wider font-cinzel px-2 py-0.5 rounded-full ${
                  isDark
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                    : "bg-[#6B1724]/10 text-[#6B1724] border border-[#6B1724]/20"
                }`}
              >
                Required
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRIORITY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = priorityCategory === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setPriorityCategory(opt.key)}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all duration-200 ${
                      isSelected
                        ? isDark
                          ? "bg-purple-900/60 border-amber-400 shadow-md ring-1 ring-amber-400"
                          : "bg-[#FAF6EE] border-[#6B1724] shadow-md ring-1 ring-[#6B1724]"
                        : isDark
                        ? "bg-[#18092c]/50 border-purple-500/20 hover:border-purple-400/50"
                        : "bg-[#FAF6EE]/60 border-[#E8DEC8] hover:border-[#6B1724]/40"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? isDark
                            ? "bg-amber-400 text-stone-950"
                            : "bg-[#6B1724] text-[#FDFBF7]"
                          : isDark
                          ? "bg-purple-950/60 text-purple-300"
                          : "bg-[#EAE2D2] text-stone-700"
                      }`}
                    >
                      <Icon size={16} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-cinzel text-xs font-bold uppercase tracking-wider">
                          {opt.label}
                        </span>
                        {isSelected && <Check size={14} className={isDark ? "text-amber-300" : "text-[#6B1724]"} />}
                      </div>
                      <p
                        className={`text-[11px] font-cormorant font-semibold line-clamp-2 mt-0.5 leading-snug ${
                          isDark ? "text-purple-200/70" : "text-stone-600"
                        }`}
                      >
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question 2: Hobbies */}
          <div className="space-y-2">
            <label className="font-cinzel text-xs sm:text-sm font-bold tracking-wide flex items-center gap-1.5">
              <span className="opacity-60">2.</span> What are your hobbies?
            </label>
            <input
              type="text"
              required
              value={hobbies}
              onChange={(e) => setHobbies(e.target.value)}
              placeholder="e.g. Reading fantasy books, guitar, running, digital painting, cooking..."
              className={`w-full py-2.5 px-4 rounded-2xl border text-xs sm:text-sm font-medium focus:outline-none transition ${
                isDark
                  ? "bg-[#160829] border-purple-500/40 text-amber-100 placeholder-purple-400/40 focus:border-amber-400"
                  : "bg-[#FAF6EE] border-[#DDD1B8] text-stone-900 placeholder-stone-400 focus:border-[#6B1724]"
              }`}
            />
            <p
              className={`text-[11px] font-cormorant font-semibold ${
                isDark ? "text-purple-300/60" : "text-stone-500"
              }`}
            >
              Your AI companion uses these to generate treat activities when you level up!
            </p>
          </div>

          {/* Question 3: Next Focus Towards Dream Life */}
          <div className="space-y-2">
            <label className="font-cinzel text-xs sm:text-sm font-bold tracking-wide flex items-center gap-1.5">
              <span className="opacity-60">3.</span> Describe your next focus that would move you towards your dream life
            </label>
            <textarea
              required
              rows={3}
              value={dreamLife}
              onChange={(e) => setDreamLife(e.target.value)}
              placeholder="e.g. Completing my web development certification, establishing a 6 AM morning routine, launching my creative portfolio..."
              className={`w-full py-2.5 px-4 rounded-2xl border text-xs sm:text-sm font-medium focus:outline-none transition resize-none ${
                isDark
                  ? "bg-[#160829] border-purple-500/40 text-amber-100 placeholder-purple-400/40 focus:border-amber-400"
                  : "bg-[#FAF6EE] border-[#DDD1B8] text-stone-900 placeholder-stone-400 focus:border-[#6B1724]"
              }`}
            />
            <p
              className={`text-[11px] font-cormorant font-semibold ${
                isDark ? "text-purple-300/60" : "text-stone-500"
              }`}
            >
              Used to generate tailored Adventure mini-quests and align your daily guidance.
            </p>
          </div>

          {/* Action / Submit Buttons */}
          <div className="pt-3 border-t border-inherit/20 flex items-center justify-between gap-3">
            {onClose && isEditing ? (
              <button
                type="button"
                onClick={onClose}
                className={`px-5 py-2.5 rounded-2xl text-xs font-cinzel font-bold border transition ${
                  isDark
                    ? "border-purple-400/30 hover:bg-purple-900/40 text-purple-200"
                    : "border-[#DDD1B8] hover:bg-[#EAE2D2] text-stone-700"
                }`}
              >
                Cancel
              </button>
            ) : (
              <div className="text-[11px] font-cormorant font-semibold opacity-70">
                All 3 responses will be securely saved to your profile
              </div>
            )}

            <button
              type="submit"
              disabled={!hobbies.trim() || !dreamLife.trim()}
              className={`px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-cinzel font-bold flex items-center gap-2 transition shadow-lg hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 cursor-pointer ${
                isDark
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 shadow-amber-500/20 hover:from-amber-300 hover:to-amber-400"
                  : "bg-[#6B1724] hover:bg-[#58131E] text-[#FDFBF7] shadow-[#6B1724]/20"
              }`}
            >
              <Check size={16} />
              <span>{isEditing ? "Submit & Save Changes" : "Submit Answers & Start"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
