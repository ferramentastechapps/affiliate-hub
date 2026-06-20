"use client";

import {
  X,
  Eye,
  EyeSlash,
  EnvelopeSimple,
  LockKey,
  User,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthProvider";

interface AuthPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthTab = "login" | "signup";

// ─── Password strength ───────────────────────────────────────────────────────
function getPasswordStrength(pw: string) {
  if (!pw) return null;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const levels = [
    { label: "Muito fraca",  color: "#ef4444" },
    { label: "Fraca",        color: "#f97316" },
    { label: "Razoável",     color: "#eab308" },
    { label: "Forte",        color: "#22c55e" },
    { label: "Muito forte",  color: "#10b981" },
  ];
  const idx = Math.min(score, 5) - 1;
  return { score, ...levels[Math.max(idx, 0)] };
}

// ─── Google SVG logo ─────────────────────────────────────────────────────────
function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

// ─── Reusable Input ───────────────────────────────────────────────────────────
function FormField({
  id, label, type = "text", value, onChange, placeholder, error,
  icon, rightElement, autoComplete,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder: string; error?: string;
  icon: React.ReactNode; rightElement?: React.ReactNode; autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500">
        {label}
      </label>
      <div className="relative group">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-accent transition-colors pointer-events-none">
          {icon}
        </div>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={[
            "w-full pl-10 py-3 text-sm font-medium rounded-xl transition-all outline-none",
            "bg-white/[0.04] border placeholder:text-zinc-600",
            "focus:bg-white/[0.07] focus:ring-2 focus:ring-offset-0",
            rightElement ? "pr-11" : "pr-4",
            error
              ? "border-red-500/40 focus:border-red-500/60 focus:ring-red-500/20 bg-red-500/[0.03]"
              : "border-white/[0.08] focus:border-accent/40 focus:ring-accent/15",
          ].join(" ")}
        />
        {rightElement && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2">{rightElement}</div>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-red-400 flex items-center gap-1"
          >
            <span>⚠</span> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AuthPanel({ isOpen, onClose }: AuthPanelProps) {
  const { login, signup, loginWithGoogle, error, clearError } = useAuth();

  const [activeTab, setActiveTab]               = useState<AuthTab>("login");
  const [showPassword, setShowPassword]         = useState(false);
  const [showConfirm, setShowConfirm]           = useState(false);
  const [isLoading, setIsLoading]               = useState(false);
  const [isGoogleLoading, setIsGoogleLoading]   = useState(false);
  const [infoMessage, setInfoMessage]           = useState<string | null>(null);
  const [errors, setErrors]                     = useState<Record<string, string>>({});

  // Login
  const [loginEmail, setLoginEmail]             = useState("");
  const [loginPassword, setLoginPassword]       = useState("");
  const [rememberMe, setRememberMe]             = useState(false);

  // Signup
  const [signupName, setSignupName]             = useState("");
  const [signupEmail, setSignupEmail]           = useState("");
  const [signupPassword, setSignupPassword]     = useState("");
  const [signupConfirm, setSignupConfirm]       = useState("");
  const [acceptTerms, setAcceptTerms]           = useState(false);

  const pwStrength = getPasswordStrength(signupPassword);

  // ── Google SDK init ─────────────────────────────────────────────────────────
  // initialize() só pode ser chamado UMA vez por sessão — usamos ref para garantir isso
  const googleInitialized = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    clearError();
    setInfoMessage(null);

    const renderButton = () => {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const google   = (window as any).google;
      if (!clientId || !google?.accounts?.id) return false;

      try {
        // Só inicializa uma vez durante toda a sessão da página
        if (!googleInitialized.current) {
          google.accounts.id.initialize({
            client_id: clientId,
            auto_select: false,
            callback: async (resp: any) => {
              setIsGoogleLoading(true);
              clearError();
              const ok = await loginWithGoogle(resp.credential);
              setIsGoogleLoading(false);
              if (ok) onClose();
            },
          });
          googleInitialized.current = true;
        }

        // Renderiza apenas no container do tab ativo (o outro não está no DOM)
        const overlayId = activeTab === "login" ? "google-ol-login" : "google-ol-signup";
        const el = document.getElementById(overlayId);
        if (!el) return false;

        google.accounts.id.renderButton(el, {
          theme: "filled_black",
          size: "large",
          width: el.parentElement?.clientWidth ?? 440,
          shape: "rectangular",
        });

        return true;
      } catch (e) {
        console.error("Google SDK error:", e);
        return false;
      }
    };

    // Aguarda 180ms para a animação do AnimatePresence terminar antes de buscar o DOM
    const timer = setTimeout(() => {
      if (!renderButton()) {
        const interval = setInterval(() => {
          if (renderButton()) clearInterval(interval);
        }, 300);
        // Limpa após 5s para evitar loop infinito
        const cleanup = setTimeout(() => clearInterval(interval), 5000);
        return () => { clearInterval(interval); clearTimeout(cleanup); };
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [isOpen, activeTab]);

  // ── Validation helpers ──────────────────────────────────────────────────────
  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const clearField    = (key: string) => setErrors((p) => ({ ...p, [key]: "" }));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError(); setInfoMessage(null);
    const errs: Record<string, string> = {};
    if (!loginEmail)                    errs.loginEmail    = "E-mail é obrigatório";
    else if (!validateEmail(loginEmail)) errs.loginEmail   = "E-mail inválido";
    if (!loginPassword)                 errs.loginPassword = "Senha é obrigatória";
    else if (loginPassword.length < 6)  errs.loginPassword = "Mínimo 6 caracteres";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setIsLoading(true);
    const ok = await login(loginEmail, loginPassword);
    setIsLoading(false);
    if (ok) onClose();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError(); setInfoMessage(null);
    const errs: Record<string, string> = {};
    if (!signupName)                     errs.signupName    = "Nome é obrigatório";
    if (!signupEmail)                    errs.signupEmail   = "E-mail é obrigatório";
    else if (!validateEmail(signupEmail)) errs.signupEmail  = "E-mail inválido";
    if (!signupPassword)                 errs.signupPassword = "Senha é obrigatória";
    else if (signupPassword.length < 6)  errs.signupPassword = "Mínimo 6 caracteres";
    if (!signupConfirm)                  errs.signupConfirm  = "Confirme sua senha";
    else if (signupPassword !== signupConfirm) errs.signupConfirm = "Senhas não coincidem";
    if (!acceptTerms)                    errs.acceptTerms   = "Aceite os termos para continuar";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setIsLoading(true);
    const ok = await signup(signupName, signupEmail, signupPassword);
    setIsLoading(false);
    if (ok) onClose();
  };

  const switchTab = (tab: AuthTab) => {
    setActiveTab(tab);
    setErrors({});
    clearError();
    setInfoMessage(null);
  };

  // ── Google Button with invisible SDK overlay ─────────────────────────────────
  const GoogleButton = ({ overlayId, label }: { overlayId: string; label: string }) => (
    <div className="relative h-[50px] rounded-xl overflow-hidden">
      {/* Visible styled layer */}
      <div
        className="absolute inset-0 flex items-center justify-center gap-3 bg-white rounded-xl text-gray-800 font-semibold text-sm pointer-events-none select-none z-0"
        aria-hidden
      >
        <GoogleIcon size={20} />
        {isGoogleLoading ? "Aguarde..." : label}
      </div>

      {/* Loading spinner overlay */}
      {isGoogleLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white rounded-xl z-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            className="w-5 h-5 border-2 border-gray-200 border-t-gray-700 rounded-full"
          />
        </div>
      )}

      {/* Invisible Google SDK button intercepts all clicks */}
      {!isGoogleLoading && (
        <div
          id={overlayId}
          className="absolute inset-0 z-10 overflow-hidden"
          style={{ opacity: 0.002, cursor: "pointer" }}
        />
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
            onClick={onClose}
          />

          {/* Slide panel */}
          <motion.aside
            role="dialog"
            aria-label="Autenticação"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[430px] z-50 flex flex-col overflow-hidden"
            style={{
              background: "linear-gradient(180deg, #0d0e14 0%, #0a0b10 100%)",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
            }}
          >
            {/* Top accent gradient bar */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: "linear-gradient(90deg, #ff334b, #ff7a45, #ff334b)" }}
            />

            {/* Subtle glow behind header */}
            <div
              className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 50% -20%, rgba(255,51,75,0.08) 0%, transparent 70%)" }}
            />

            <div className="flex flex-col h-full overflow-y-auto scrollbar-hide">

              {/* ── Header ── */}
              <header className="flex items-center justify-between px-6 pt-7 pb-5 relative">
                <img src="/logo economizei.webp?v=2" alt="Economizei" className="h-11 w-auto object-contain" />
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.1, rotate: 90, backgroundColor: "rgba(255,255,255,0.12)" }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  aria-label="Fechar"
                >
                  <X size={15} weight="bold" />
                </motion.button>
              </header>

              {/* ── Welcome ── */}
              <div className="px-6 pb-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                  >
                    <h2 className="text-[22px] font-extrabold text-white leading-tight">
                      {activeTab === "login" ? "Bem‑vindo de volta! 👋" : "Crie sua conta grátis ✨"}
                    </h2>
                    <p className="text-zinc-500 text-sm mt-1">
                      {activeTab === "login"
                        ? "Acesse ofertas exclusivas para membros"
                        : "Junte-se a compradores inteligentes do Brasil"}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* ── Tabs ── */}
              <div className="px-6 pb-5">
                <div
                  className="flex p-1 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  {(["login", "signup"] as AuthTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => switchTab(tab)}
                      className="relative flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors"
                    >
                      {activeTab === tab && (
                        <motion.div
                          layoutId="activeTabBg"
                          className="absolute inset-0 rounded-lg"
                          style={{
                            background: "linear-gradient(135deg, rgba(255,51,75,0.15), rgba(255,51,75,0.05))",
                            border: "1px solid rgba(255,51,75,0.2)",
                          }}
                          transition={{ type: "spring", stiffness: 420, damping: 30 }}
                        />
                      )}
                      <span className={`relative z-10 transition-colors ${activeTab === tab ? "text-white" : "text-zinc-500 hover:text-zinc-400"}`}>
                        {tab === "login" ? "Entrar" : "Criar conta"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Content ── */}
              <div className="flex-1 px-6">
                {/* Global alerts */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      className="flex items-start gap-3 p-4 mb-5 rounded-xl"
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
                    >
                      <span className="text-red-400 text-lg leading-none">⚠</span>
                      <p className="text-red-400 text-sm flex-1">{error}</p>
                      <button onClick={clearError} className="text-red-400/50 hover:text-red-400 transition-colors text-sm ml-1">✕</button>
                    </motion.div>
                  )}
                  {infoMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-start gap-3 p-4 mb-5 rounded-xl"
                      style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}
                    >
                      <span className="text-blue-400 text-sm flex-1">{infoMessage}</span>
                      <button onClick={() => setInfoMessage(null)} className="text-blue-400/50 hover:text-blue-400 text-sm">✕</button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {/* ══ LOGIN FORM ══════════════════════════════════════════════ */}
                  {activeTab === "login" ? (
                    <motion.form
                      key="login"
                      initial={{ opacity: 0, x: -18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 18 }}
                      transition={{ duration: 0.16 }}
                      onSubmit={handleLogin}
                      className="space-y-4"
                      noValidate
                    >
                      {/* Google */}
                      <GoogleButton overlayId="google-ol-login" label="Continuar com Google" />

                      {/* Divider */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                        <span className="text-[11px] font-medium text-zinc-600 uppercase tracking-widest">ou</span>
                        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                      </div>

                      {/* Email */}
                      <FormField
                        id="login-email" label="E-mail" type="email"
                        value={loginEmail} onChange={(v) => { setLoginEmail(v); clearField("loginEmail"); }}
                        placeholder="seu@email.com" error={errors.loginEmail}
                        autoComplete="email"
                        icon={<EnvelopeSimple size={16} />}
                      />

                      {/* Password */}
                      <FormField
                        id="login-password" label="Senha" type={showPassword ? "text" : "password"}
                        value={loginPassword} onChange={(v) => { setLoginPassword(v); clearField("loginPassword"); }}
                        placeholder="••••••••" error={errors.loginPassword}
                        autoComplete="current-password"
                        icon={<LockKey size={16} />}
                        rightElement={
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
                            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                          >
                            {showPassword ? <EyeSlash size={15} /> : <Eye size={15} />}
                          </button>
                        }
                      />

                      {/* Remember + Forgot */}
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox" checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded"
                            style={{ accentColor: "#ff334b" }}
                          />
                          <span className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">Lembrar de mim</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => { clearError(); setInfoMessage("Para redefinir sua senha, entre em contato com nosso suporte."); }}
                          className="text-xs font-semibold text-accent hover:text-accent/70 transition-colors"
                        >
                          Esqueci minha senha
                        </button>
                      </div>

                      {/* Submit */}
                      <motion.button
                        type="submit"
                        disabled={isLoading || isGoogleLoading}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3.5 rounded-xl font-bold text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        style={{
                          background: "linear-gradient(135deg, #ff334b 0%, #e61932 100%)",
                          boxShadow: "0 4px 18px rgba(255,51,75,0.35)",
                        }}
                      >
                        {isLoading ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mx-auto"
                          />
                        ) : "Entrar na conta"}
                      </motion.button>
                    </motion.form>

                  ) : (
                  /* ══ SIGNUP FORM ════════════════════════════════════════════ */
                    <motion.form
                      key="signup"
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -18 }}
                      transition={{ duration: 0.16 }}
                      onSubmit={handleSignup}
                      className="space-y-4"
                      noValidate
                    >
                      {/* Google */}
                      <GoogleButton overlayId="google-ol-signup" label="Cadastrar com Google" />

                      {/* Divider */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                        <span className="text-[11px] font-medium text-zinc-600 uppercase tracking-widest">ou preencha abaixo</span>
                        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                      </div>

                      {/* Name */}
                      <FormField
                        id="signup-name" label="Nome completo"
                        value={signupName} onChange={(v) => { setSignupName(v); clearField("signupName"); }}
                        placeholder="João Silva" error={errors.signupName}
                        icon={<User size={16} />}
                      />

                      {/* Email */}
                      <FormField
                        id="signup-email" label="E-mail" type="email"
                        value={signupEmail} onChange={(v) => { setSignupEmail(v); clearField("signupEmail"); }}
                        placeholder="seu@email.com" error={errors.signupEmail}
                        autoComplete="email"
                        icon={<EnvelopeSimple size={16} />}
                      />

                      {/* Password + strength */}
                      <div className="space-y-1.5">
                        <FormField
                          id="signup-password" label="Senha" type={showPassword ? "text" : "password"}
                          value={signupPassword} onChange={(v) => { setSignupPassword(v); clearField("signupPassword"); }}
                          placeholder="Mínimo 6 caracteres" error={errors.signupPassword}
                          icon={<LockKey size={16} />}
                          rightElement={
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
                              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                            >
                              {showPassword ? <EyeSlash size={15} /> : <Eye size={15} />}
                            </button>
                          }
                        />
                        {/* Strength bars */}
                        <AnimatePresence>
                          {signupPassword && pwStrength && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-1 overflow-hidden"
                            >
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((i) => (
                                  <motion.div
                                    key={i}
                                    className="flex-1 h-1 rounded-full"
                                    animate={{ backgroundColor: i <= pwStrength.score ? pwStrength.color : "rgba(255,255,255,0.08)" }}
                                    transition={{ duration: 0.3 }}
                                  />
                                ))}
                              </div>
                              <p className="text-[11px] font-semibold" style={{ color: pwStrength.color }}>
                                {pwStrength.label}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Confirm password */}
                      <div className="space-y-1.5">
                        <FormField
                          id="signup-confirm" label="Confirmar senha" type={showConfirm ? "text" : "password"}
                          value={signupConfirm} onChange={(v) => { setSignupConfirm(v); clearField("signupConfirm"); }}
                          placeholder="Repita a senha" error={errors.signupConfirm}
                          icon={<LockKey size={16} />}
                          rightElement={
                            <button
                              type="button"
                              onClick={() => setShowConfirm(!showConfirm)}
                              className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
                              aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
                            >
                              {showConfirm ? <EyeSlash size={15} /> : <Eye size={15} />}
                            </button>
                          }
                        />
                        {/* Match indicator */}
                        <AnimatePresence>
                          {signupConfirm && !errors.signupConfirm && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className={`text-[11px] font-semibold ${signupPassword === signupConfirm ? "text-green-400" : "text-orange-400"}`}
                            >
                              {signupPassword === signupConfirm ? "✓ Senhas coincidem" : "✗ Senhas não coincidem"}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Terms */}
                      <div className="space-y-1">
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input
                            type="checkbox" checked={acceptTerms}
                            onChange={(e) => { setAcceptTerms(e.target.checked); clearField("acceptTerms"); }}
                            className="w-4 h-4 mt-0.5 rounded flex-shrink-0"
                            style={{ accentColor: "#ff334b" }}
                          />
                          <span className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors leading-relaxed">
                            Aceito os{" "}
                            <button type="button" className="text-accent hover:underline font-semibold">termos de uso</button>
                            {" "}e{" "}
                            <button type="button" className="text-accent hover:underline font-semibold">política de privacidade</button>
                          </span>
                        </label>
                        <AnimatePresence>
                          {errors.acceptTerms && (
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              className="text-xs text-red-400 pl-7">
                              ⚠ {errors.acceptTerms}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Submit */}
                      <motion.button
                        type="submit"
                        disabled={isLoading || isGoogleLoading}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3.5 rounded-xl font-bold text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        style={{
                          background: "linear-gradient(135deg, #ff334b 0%, #e61932 100%)",
                          boxShadow: "0 4px 18px rgba(255,51,75,0.35)",
                        }}
                      >
                        {isLoading ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mx-auto"
                          />
                        ) : "Criar minha conta"}
                      </motion.button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Security footer ── */}
              <footer className="px-6 py-5 mt-4">
                <div
                  className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <ShieldCheck size={14} className="text-zinc-500 flex-shrink-0" />
                  <span className="text-[11px] text-zinc-600">
                    Protegido com criptografia SSL 256-bit · Seus dados estão seguros
                  </span>
                </div>
              </footer>

            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
