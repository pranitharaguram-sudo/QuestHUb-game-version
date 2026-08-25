import React, { useState } from "react";
import { Sparkles, Shield, User, ArrowRight, CheckCircle2 } from "lucide-react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleAuthProvider } from "../lib/firebase";

interface LoginPageProps {
  isDark: boolean;
  onLoginSuccess: (userProfile: any, token: string) => void;
  onContinueAsGuest: (username: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  isDark,
  onLoginSuccess,
  onContinueAsGuest,
}) => {
  const [guestName, setGuestName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Post-authentication username onboarding step
  const [pendingAuth, setPendingAuth] = useState<{
    user: any;
    idToken: string;
  } | null>(null);
  const [chosenUsername, setChosenUsername] = useState("");

  // Google Sign In connected to Cloud SQL via Firebase Auth
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();

      const suggestedName =
        result.user.displayName ||
        result.user.email?.split("@")[0] ||
        "Traveler";

      // Advance to the username selection step
      setChosenUsername(suggestedName);
      setPendingAuth({
        user: result.user,
        idToken,
      });
    } catch (err: any) {
      console.error("Login error:", err);
      setErrorMsg(err.message || "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Submit the chosen username after authentication
  const handleCompleteAuthWithUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingAuth || !chosenUsername.trim()) return;

    try {
      setLoading(true);
      setErrorMsg(null);

      // Synchronize with Cloud SQL backend
      const res = await fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pendingAuth.idToken}`,
        },
        body: JSON.stringify({
          displayName: chosenUsername.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to synchronize cloud account profile");
      }

      const profileData = await res.json();
      onLoginSuccess(profileData, pendingAuth.idToken);
    } catch (err: any) {
      console.error("Auth sync error:", err);
      setErrorMsg(err.message || "Failed to set username. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    onContinueAsGuest(guestName.trim());
  };

  return (
    <div
      className={`min-h-screen w-full flex items-center justify-center p-4 transition-colors duration-500 font-sans ${
        isDark
          ? "bg-[#140824] text-[#FDFBF7]"
          : "bg-[#F5EFE6] text-stone-900"
      }`}
    >
      {/* Background Subtle Ambience Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full blur-3xl opacity-30 ${
            isDark ? "bg-purple-600/40" : "bg-amber-300/40"
          }`}
        />
      </div>

      {/* Main Login Card - Plain Parchment / Twilight Purple */}
      <div
        className={`relative z-10 w-full max-w-md rounded-3xl border p-8 shadow-2xl transition-all duration-300 ${
          isDark
            ? "bg-[#231238]/95 border-purple-500/30 text-[#FDFBF7] shadow-purple-950/50"
            : "bg-[#FBF8F2] border-[#DDD1B8] text-stone-900 shadow-stone-400/20"
        }`}
      >
        {/* Emblem & Logo Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg transform transition hover:scale-105 ${
                isDark
                  ? "bg-purple-900/60 border border-purple-400/40 text-amber-300"
                  : "bg-[#6B1724] text-[#FDFBF7]"
              }`}
            >
              🏰
            </div>
          </div>

          <h1 className="font-cinzel text-2xl font-extrabold tracking-wider mt-2">
            PlanoQuest
          </h1>
          <p
            className={`font-cormorant text-base italic font-semibold ${
              isDark ? "text-purple-200/80" : "text-stone-700"
            }`}
          >
            {pendingAuth
              ? "Set your Traveler identity to begin your quest log"
              : "Forge your daily quests and conquer the four realms."}
          </p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold text-center">
            {errorMsg}
          </div>
        )}

        {/* POST-AUTH USERNAME SETUP STEP */}
        {pendingAuth ? (
          <form onSubmit={handleCompleteAuthWithUsername} className="space-y-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
              <div className="text-left font-medium">
                <span className="font-bold">Signed In:</span>{" "}
                {pendingAuth.user.email || "Google Account"}
              </div>
            </div>

            <div>
              <label
                className={`block text-[11px] uppercase font-bold mb-1.5 font-cinzel tracking-wider ${
                  isDark ? "text-purple-200/90" : "text-stone-700"
                }`}
              >
                Choose Your Traveler Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  value={chosenUsername}
                  onChange={(e) => setChosenUsername(e.target.value)}
                  placeholder="Enter your traveler name..."
                  className={`w-full py-3 pl-10 pr-4 rounded-xl border text-sm font-semibold focus:outline-none transition ${
                    isDark
                      ? "bg-[#180b2a] border-purple-500/40 text-amber-200 focus:border-amber-400 placeholder-purple-400/40"
                      : "bg-[#FAF6EE] border-[#DDD1B8] text-stone-900 focus:border-[#6B1724] placeholder-stone-400"
                  }`}
                />
                <User
                  size={16}
                  className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                    isDark ? "text-purple-400" : "text-stone-500"
                  }`}
                />
              </div>
              <p
                className={`text-[11px] mt-1.5 font-medium ${
                  isDark ? "text-purple-300/60" : "text-stone-500"
                }`}
              >
                New accounts start fresh with 0 XP, Level 1, and an empty quest log.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !chosenUsername.trim()}
              className={`w-full py-3.5 px-4 rounded-2xl font-cinzel font-bold text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 ${
                isDark
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-amber-900/30"
                  : "bg-[#6B1724] hover:bg-[#58131E] text-[#FDFBF7] shadow-[#6B1724]/20"
              }`}
            >
              {loading ? (
                <span className="animate-spin inline-block mr-2">⏳</span>
              ) : (
                <>
                  <span>Begin Adventure</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setPendingAuth(null)}
              className={`w-full text-center text-xs font-semibold py-1 transition ${
                isDark
                  ? "text-purple-300/70 hover:text-purple-200"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Use a different account
            </button>
          </form>
        ) : (
          /* INITIAL SIGN IN VIEW */
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className={`w-full py-3.5 px-4 rounded-2xl font-cinzel font-bold text-xs tracking-wider uppercase transition flex items-center justify-center gap-3 shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 ${
                isDark
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-amber-900/30"
                  : "bg-[#6B1724] hover:bg-[#58131E] text-[#FDFBF7] shadow-[#6B1724]/20"
              }`}
            >
              {loading ? (
                <span className="animate-spin inline-block mr-2">⏳</span>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Sign In with Google</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div
                className={`h-[1px] flex-1 ${
                  isDark ? "bg-purple-500/20" : "bg-[#DDD1B8]"
                }`}
              />
              <span
                className={`font-cinzel text-[10px] uppercase font-bold tracking-widest ${
                  isDark ? "text-purple-300/60" : "text-stone-400"
                }`}
              >
                Or Continue as Traveler
              </span>
              <div
                className={`h-[1px] flex-1 ${
                  isDark ? "bg-purple-500/20" : "bg-[#DDD1B8]"
                }`}
              />
            </div>

            {/* Traveler Quick Start Form */}
            <form onSubmit={handleGuestSubmit} className="space-y-3">
              <div>
                <label
                  className={`block text-[10px] uppercase font-bold mb-1.5 font-cinzel tracking-wider ${
                    isDark ? "text-purple-200/70" : "text-stone-600"
                  }`}
                >
                  Traveler Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Roland, Eleanor..."
                    className={`w-full py-2.5 pl-9 pr-3 rounded-xl border text-xs font-semibold focus:outline-none transition ${
                      isDark
                        ? "bg-[#180b2a] border-purple-500/30 text-amber-200 focus:border-amber-400 placeholder-purple-400/40"
                        : "bg-[#FAF6EE] border-[#DDD1B8] text-stone-900 focus:border-[#6B1724] placeholder-stone-400"
                    }`}
                  />
                  <User
                    size={14}
                    className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                      isDark ? "text-purple-400" : "text-stone-500"
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!guestName.trim()}
                className={`w-full py-2.5 px-4 rounded-xl border font-cinzel font-bold text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 ${
                  isDark
                    ? "bg-purple-900/40 hover:bg-purple-900/70 border-purple-500/30 text-purple-200"
                    : "bg-[#FAF6EE] hover:bg-[#F2ECE0] border-[#DDD1B8] text-stone-800"
                }`}
              >
                <span>Enter World</span>
                <ArrowRight size={13} />
              </button>
            </form>
          </div>
        )}

        {/* Feature Badges Footer */}
        <div
          className={`mt-6 pt-4 border-t flex items-center justify-center gap-4 text-[10px] font-cinzel tracking-wider ${
            isDark
              ? "border-purple-500/20 text-purple-300/60"
              : "border-[#DDD1B8] text-stone-500"
          }`}
        >
          <div className="flex items-center gap-1">
            <Shield size={12} className="text-amber-500" />
            <span>Cloud SQL Sync</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Sparkles size={12} className="text-amber-500" />
            <span>Persistent Session</span>
          </div>
        </div>
      </div>
    </div>
  );
};
