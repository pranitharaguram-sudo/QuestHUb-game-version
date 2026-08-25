import React from "react";
import { User, Compass, Heart, Users, Flame, Sparkles, X, Edit3, Award } from "lucide-react";
import { UserAccount, WorldKey } from "../types";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  account: UserAccount;
  onOpenEditProfile: () => void;
}

const CATEGORY_ICONS: Record<WorldKey, any> = {
  growth: Compass,
  wellbeing: Heart,
  social: Users,
  adventure: Flame,
};

const CATEGORY_NAMES: Record<WorldKey, string> = {
  growth: "Growth & Mastery",
  wellbeing: "Wellbeing & Vitality",
  social: "Social & Connection",
  adventure: "Adventure & Creativity",
};

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  isDark,
  account,
  onOpenEditProfile,
}) => {
  if (!isOpen) return null;

  const answers = account.profileAnswers;
  const priorityKey: WorldKey = answers?.priorityCategory || "growth";
  const PriorityIcon = CATEGORY_ICONS[priorityKey] || Compass;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 ${
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
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-cinzel text-lg font-bold border shadow ${
                isDark
                  ? "bg-purple-900/70 border-amber-400/60 text-amber-300"
                  : "bg-[#FAF6EE] border-[#6B1724]/40 text-[#6B1724]"
              }`}
            >
              {(account.avatarName || account.username || "T")[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-cinzel text-base sm:text-lg font-bold tracking-wide">
                  {account.avatarName || account.username}
                </h2>
                <span
                  className={`text-[10px] font-cinzel font-bold px-2 py-0.5 rounded-full border ${
                    isDark
                      ? "bg-amber-400/20 text-amber-300 border-amber-400/30"
                      : "bg-[#6B1724]/10 text-[#6B1724] border-[#6B1724]/20"
                  }`}
                >
                  Lvl {account.level} ({account.xp} XP)
                </span>
              </div>
              <p
                className={`text-xs font-cormorant font-semibold ${
                  isDark ? "text-purple-200/80" : "text-stone-600"
                }`}
              >
                Traveler Profile & Intentions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              isDark
                ? "hover:bg-purple-900/60 text-purple-200"
                : "hover:bg-[#EAE2D2] text-stone-700"
            }`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Profile Details Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Question 1: Priority */}
          <div
            className={`p-4 rounded-2xl border transition ${
              isDark
                ? "bg-[#18092c]/70 border-purple-500/30"
                : "bg-[#FAF6EE] border-[#E8DEC8]"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-cinzel text-xs font-bold uppercase tracking-wider opacity-70">
                1. Priority Realm
              </span>
              <span
                className={`text-[10px] font-cinzel font-bold uppercase px-2 py-0.5 rounded-full ${
                  isDark ? "bg-amber-400/20 text-amber-300" : "bg-[#6B1724]/10 text-[#6B1724]"
                }`}
              >
                Active Focus
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isDark
                    ? "bg-amber-400 text-stone-950"
                    : "bg-[#6B1724] text-[#FDFBF7]"
                }`}
              >
                <PriorityIcon size={18} />
              </div>
              <div>
                <h4 className="font-cinzel text-sm font-bold capitalize">
                  {CATEGORY_NAMES[priorityKey]}
                </h4>
                <p
                  className={`text-xs font-cormorant font-semibold ${
                    isDark ? "text-purple-200/70" : "text-stone-600"
                  }`}
                >
                  Tracked weekly by your AI companion
                </p>
              </div>
            </div>
          </div>

          {/* Question 2: Hobbies */}
          <div
            className={`p-4 rounded-2xl border transition ${
              isDark
                ? "bg-[#18092c]/70 border-purple-500/30"
                : "bg-[#FAF6EE] border-[#E8DEC8]"
            }`}
          >
            <span className="font-cinzel text-xs font-bold uppercase tracking-wider opacity-70 block mb-1.5">
              2. Hobbies & Passions
            </span>
            <p className="font-cormorant text-sm sm:text-base font-semibold leading-relaxed">
              {answers?.hobbies || (
                <span className="italic opacity-50">No hobbies listed yet. Click edit below to add.</span>
              )}
            </p>
          </div>

          {/* Question 3: Next Focus Towards Dream Life */}
          <div
            className={`p-4 rounded-2xl border transition ${
              isDark
                ? "bg-[#18092c]/70 border-purple-500/30"
                : "bg-[#FAF6EE] border-[#E8DEC8]"
            }`}
          >
            <span className="font-cinzel text-xs font-bold uppercase tracking-wider opacity-70 block mb-1.5">
              3. Next Focus Towards Dream Life
            </span>
            <p className="font-cormorant text-sm sm:text-base font-semibold leading-relaxed">
              {answers?.dreamLife || (
                <span className="italic opacity-50">No next focus specified yet. Click edit below to add.</span>
              )}
            </p>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={() => {
                onClose();
                onOpenEditProfile();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-cinzel font-bold border flex items-center gap-1.5 transition ${
                isDark
                  ? "border-amber-400/40 text-amber-300 hover:bg-amber-400/10"
                  : "border-[#6B1724]/40 text-[#6B1724] hover:bg-[#6B1724]/10"
              }`}
            >
              <Edit3 size={13} />
              <span>Edit Profile Answers</span>
            </button>

            <button
              onClick={onClose}
              className={`px-5 py-2 rounded-xl text-xs font-cinzel font-bold transition shadow ${
                isDark
                  ? "bg-purple-900/80 hover:bg-purple-800 text-purple-100"
                  : "bg-[#6B1724] hover:bg-[#58131E] text-[#FDFBF7]"
              }`}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
