"use client";

import {
  Eye,
  EyeSlash,
  EnvelopeSimple,
  LockKey,
  User,
  ArrowRight,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthProvider";

interface AuthPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = "login" | "signup";

// ─── Password strength ─────────────────────────────────────────────────────────
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
  return { score, ...levels[Math.max(Math.min(score, 5) - 1, 0)] };
}

// ─── Google SVG ────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

// ─── Input field ───────────────────────────────────────────────────────────────
function Field({
  id, label, type = "text", value, onChange, placeholder, error,
  icon, right, autoComplete, disabled,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder: string; error?: string;
  icon: React.ReactNode; right?: React.ReactNode; autoComplete?: string; disabled?: boolean;
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
          id={id} type={type} value={value} autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={[
            "w-full pl-10 py-3 text-sm font-medium rounded-xl transition-all outline-none",
            "bg-white/[0.04] border placeholder:text-zinc-600 disabled:opacity-50",
            "focus:bg-white/[0.07] focus:ring-2",
            right ? "pr-11" : "pr-4",
            error
              ? "border-red-500/40 focus:border-red-500/60 focus:ring-red-500/20"
              : "border-white/[0.08] focus:border-accent/40 focus:ring-accent/15",
          ].join(" ")}
        />
        {right && <div className="absolute right-1 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-xs text-red-400"
          >
            ⚠ {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export function AuthPanel({ isOpen, onClose }: AuthPanelProps) {
  const { login, signup, loginWithGoogle, error, clearError } = useAuth();

  const [mode, setMode]                       = useState<Mode>("login");
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [isLoading, setIsLoading]             = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [infoMessage, setInfoMessage]         = useState<string | null>(null);
  const [errors, setErrors]                   = useState<Record<string, string>>({});

  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  
  const [isEmailEntered, setIsEmailEntered]   = useState(false);
  const [isMobile, setIsMobile]               = useState(true);

  const pwStrength       = getPasswordStrength(password);
  const googleInit       = useRef(false);
  const clearField       = (k: string) => setErrors((p) => ({ ...p, [k]: "" }));
  const validateEmail    = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  // ── Google SDK ───────────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isOpen) return;
    clearError();
    setInfoMessage(null);
    
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const render = () => {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const google   = (window as any).google;
      if (!clientId || !google?.accounts?.id) return false;
      try {
        if (!googleInit.current) {
          google.accounts.id.initialize({
            client_id: clientId,
            auto_select: false,
            callback: async (resp: any) => {
              setIsGoogleLoading(true);
              const ok = await loginWithGoogle(resp.credential);
              setIsGoogleLoading(false);
              if (ok) onClose();
            },
          });
          googleInit.current = true;
        }
        const el = document.getElementById("google-ol-main");
        if (!el) return false;
        google.accounts.id.renderButton(el, {
          theme: "filled_black",
          size: "large",
          width: el.parentElement?.clientWidth ?? 440,
          shape: "rectangular",
        });
        return true;
      } catch (e) {
        console.error("Google SDK:", e);
        return false;
      }
    };

    const timer = setTimeout(() => {
      if (!render()) {
        const iv = setInterval(() => { if (render()) clearInterval(iv); }, 300);
        const cleanup = setTimeout(() => clearInterval(iv), 5000);
        return () => { clearInterval(iv); clearTimeout(cleanup); };
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkMobile);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleContinueEmail = () => {
    clearError(); setInfoMessage(null);
    if (!email) {
      setErrors({ email: "E-mail é obrigatório" });
      return;
    }
    if (!validateEmail(email)) {
      setErrors({ email: "E-mail inválido" });
      return;
    }
    setErrors({});
    setIsEmailEntered(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isEmailEntered) {
      handleContinueEmail();
      return;
    }

    clearError(); setInfoMessage(null);
    const errs: Record<string, string> = {};

    if (!password)            errs.password = "Senha é obrigatória";
    else if (password.length < 6) errs.password = "Mínimo 6 caracteres";

    if (mode === "signup") {
      if (!name)              errs.name    = "Nome é obrigatório";
      if (!confirm)           errs.confirm = "Confirme sua senha";
      else if (password !== confirm) errs.confirm = "Senhas não coincidem";
    }

    if (Object.keys(errs).length) { setErrors(errs); return; }

    setIsLoading(true);
    const ok = mode === "login"
      ? await login(email, password)
      : await signup(name, email, password);
    setIsLoading(false);
    if (ok) onClose();
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrors({});
    clearError();
    setInfoMessage(null);
    setShowPassword(false);
    setShowConfirm(false);
    setIsEmailEntered(false);
  };

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Fullscreen backdrop with background image (Mobile) or dark overlay (Desktop) ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100]"
            style={{
              backgroundImage: isMobile ? "url('/fundo-login.webp')" : "none",
              backgroundColor: !isMobile ? "rgba(0,0,0,0.75)" : "transparent",
              backdropFilter: !isMobile ? "blur(4px)" : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
            onClick={onClose}
          >
            {/* Dark overlay sobre a imagem apenas no mobile */}
            {isMobile && (
              <div
                className="absolute inset-0"
                style={{ background: "rgba(0,0,0,0.45)" }}
              />
            )}
          </motion.div>

          {/* ── Card responsivo: bottom sheet no mobile, sidebar no desktop ── */}
          <motion.div
            role="dialog"
            aria-label="Autenticação"
            initial={isMobile ? { y: "100%", x: 0 } : { x: "100%", y: 0 }}
            animate={{ y: 0, x: 0 }}
            exit={isMobile ? { y: "100%" } : { x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed z-[100] overflow-hidden bottom-0 left-0 right-0 sm:top-0 sm:bottom-0 sm:left-auto sm:w-[420px]"
            style={{
              background: isMobile 
                ? "linear-gradient(180deg, #111217 0%, #0d0e14 100%)" 
                : "linear-gradient(rgba(17,18,23,0.7), rgba(13,14,20,0.85)), url('/fundo-login.webp')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              borderRadius: isMobile ? "24px 24px 0 0" : "0",
              borderTop: isMobile ? "1px solid rgba(255,255,255,0.08)" : "none",
              borderLeft: !isMobile ? "1px solid rgba(255,255,255,0.08)" : "none",
              boxShadow: isMobile ? "0 -20px 80px rgba(0,0,0,0.7)" : "-20px 0 60px rgba(0,0,0,0.5)",
              maxHeight: isMobile ? "92dvh" : "100dvh",
            }}
          >
            {/* Faixa vermelha no topo do card */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: "linear-gradient(90deg, #ff334b, #ff7a45, #ff334b)" }}
            />

            {/* Handle drag indicator (só mobile) */}
            {isMobile && (
              <div className="flex justify-center pt-3 pb-1">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.15)" }}
                />
              </div>
            )}

            {/* Scrollable content */}
            <div className="overflow-y-auto" style={{ maxHeight: isMobile ? "calc(92dvh - 24px)" : "100dvh" }}>

              {/* Header */}
              <div className="px-6 pt-4 pb-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                  >
                    <h2 className="text-[22px] font-extrabold text-white leading-tight">
                      Faça login ou cadastre-se
                    </h2>
                    <p className="text-zinc-500 text-sm mt-1">
                      {mode === "login"
                        ? "Acesse ofertas exclusivas para membros"
                        : "Junte-se a compradores inteligentes do Brasil"}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Content */}
              <div className="px-6 pb-8 space-y-5">

                {/* Alerts */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      className="flex items-start gap-3 p-4 rounded-xl"
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
                    >
                      <span className="text-red-400 text-lg leading-none">⚠</span>
                      <p className="text-red-400 text-sm flex-1">{error}</p>
                      <button onClick={clearError} className="text-red-400/40 hover:text-red-400 text-sm">✕</button>
                    </motion.div>
                  )}
                  {infoMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-start gap-3 p-4 rounded-xl"
                      style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}
                    >
                      <p className="text-blue-400 text-sm flex-1">{infoMessage}</p>
                      <button onClick={() => setInfoMessage(null)} className="text-blue-400/40 hover:text-blue-400 text-sm">✕</button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Form Flow (Email primeiro, depois restante) */}
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {/* Email */}
                  <Field
                    id="auth-email" label="E-mail" type="email"
                    value={email} onChange={(v) => { setEmail(v); clearField("email"); }}
                    placeholder="seu@email.com" error={errors.email}
                    autoComplete="email" icon={<EnvelopeSimple size={16} />}
                  />

                  <AnimatePresence mode="wait">
                    {!isEmailEntered ? (
                      <motion.div
                        key="email-step"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <motion.button
                          type="button" 
                          onClick={handleContinueEmail}
                          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                          className="w-full py-3.5 mt-2 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                          style={{
                            background: "linear-gradient(135deg, #ff334b 0%, #e61932 100%)",
                            boxShadow: "0 4px 18px rgba(255,51,75,0.35)",
                          }}
                        >
                          Continuar
                          <ArrowRight size={15} weight="bold" />
                        </motion.button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="password-step"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4 pt-1"
                      >
                        {/* Nome — só no signup */}
                        <AnimatePresence>
                          {mode === "signup" && (
                            <motion.div
                              key="name-field"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22 }}
                              style={{ overflow: "hidden" }}
                            >
                              <div className="pb-0">
                                <Field
                                  id="auth-name" label="Nome completo"
                                  value={name} onChange={(v) => { setName(v); clearField("name"); }}
                                  placeholder="João Silva" error={errors.name}
                                  icon={<User size={16} />}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Senha */}
                        <div className="space-y-1.5">
                          <Field
                            id="auth-password" label="Senha" type={showPassword ? "text" : "password"}
                            value={password} onChange={(v) => { setPassword(v); clearField("password"); }}
                            placeholder="••••••••" error={errors.password}
                            autoComplete={mode === "login" ? "current-password" : "new-password"}
                            icon={<LockKey size={16} />}
                            right={
                              <button type="button" onClick={() => setShowPassword(!showPassword)}
                                className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
                                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                                {showPassword ? <EyeSlash size={15} /> : <Eye size={15} />}
                              </button>
                            }
                          />
                          <AnimatePresence>
                            {mode === "signup" && password && pwStrength && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}
                                className="space-y-1"
                              >
                                <div className="flex gap-1 pt-1">
                                  {[1,2,3,4,5].map((i) => (
                                    <motion.div key={i} className="flex-1 h-1 rounded-full"
                                      animate={{ backgroundColor: i <= pwStrength.score ? pwStrength.color : "rgba(255,255,255,0.08)" }}
                                      transition={{ duration: 0.3 }} />
                                  ))}
                                </div>
                                <p className="text-[11px] font-semibold" style={{ color: pwStrength.color }}>
                                  {pwStrength.label}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Confirmar senha — só no signup */}
                        <AnimatePresence>
                          {mode === "signup" && (
                            <motion.div
                              key="confirm-field"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22 }}
                              style={{ overflow: "hidden" }}
                            >
                              <div className="space-y-1.5">
                                <Field
                                  id="auth-confirm" label="Confirmar senha" type={showConfirm ? "text" : "password"}
                                  value={confirm} onChange={(v) => { setConfirm(v); clearField("confirm"); }}
                                  placeholder="Repita a senha" error={errors.confirm}
                                  autoComplete="new-password" icon={<LockKey size={16} />}
                                  right={
                                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                      className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
                                      aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}>
                                      {showConfirm ? <EyeSlash size={15} /> : <Eye size={15} />}
                                    </button>
                                  }
                                />
                                <AnimatePresence>
                                  {confirm && (
                                    <motion.p
                                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                      className={`text-[11px] font-semibold ${password === confirm ? "text-green-400" : "text-orange-400"}`}
                                    >
                                      {password === confirm ? "✓ Senhas coincidem" : "✗ Senhas não coincidem"}
                                    </motion.p>
                                  )}
                                </AnimatePresence>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Esqueci senha — só no login */}
                        <AnimatePresence>
                          {mode === "login" && (
                            <motion.div
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              className="flex justify-end -mt-1"
                            >
                              <button type="button"
                                onClick={() => { clearError(); setInfoMessage("Para redefinir sua senha, entre em contato com nosso suporte."); }}
                                className="text-xs font-semibold text-accent hover:text-accent/70 transition-colors"
                              >
                                Esqueci minha senha
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Submit */}
                        <motion.button
                          type="submit" disabled={isLoading || isGoogleLoading}
                          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                          className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            background: "linear-gradient(135deg, #ff334b 0%, #e61932 100%)",
                            boxShadow: "0 4px 18px rgba(255,51,75,0.35)",
                          }}
                        >
                          {isLoading ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                          ) : (
                            <>
                              {mode === "login" ? "Entrar na conta" : "Criar minha conta"}
                              <ArrowRight size={15} weight="bold" />
                            </>
                          )}
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>

                {/* Toggle login/signup */}
                <AnimatePresence>
                  {isEmailEntered && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: "auto" }} 
                      exit={{ opacity: 0, height: 0 }}
                      className="text-center pb-2 overflow-hidden"
                    >
                      <AnimatePresence mode="wait">
                        {mode === "login" ? (
                          <motion.p key="to-signup"
                            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }} className="text-sm text-zinc-500"
                          >
                            Não tem conta?{" "}
                            <button onClick={() => switchMode("signup")}
                              className="text-white font-semibold hover:text-accent transition-colors">
                              Criar conta grátis →
                            </button>
                          </motion.p>
                        ) : (
                          <motion.p key="to-login"
                            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }} className="text-sm text-zinc-500"
                          >
                            Já tem conta?{" "}
                            <button onClick={() => switchMode("login")}
                              className="text-white font-semibold hover:text-accent transition-colors">
                              Entrar →
                            </button>
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                  <span className="text-[11px] font-medium text-zinc-600 uppercase tracking-widest">
                    OU
                  </span>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                </div>

                {/* ── Google button & Terms (Moveu pro fim) ── */}
                <div className="space-y-3 pb-2">
                  <div className="relative h-[50px] rounded-xl overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center gap-3 bg-white rounded-xl text-gray-800 font-bold text-sm pointer-events-none select-none z-0">
                      <GoogleIcon />
                      {isGoogleLoading ? "Aguarde..." : "Continuar com Google"}
                    </div>
                    {isGoogleLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white rounded-xl z-20">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-gray-200 border-t-gray-700 rounded-full"
                        />
                      </div>
                    )}
                    {!isGoogleLoading && (
                      <div
                        id="google-ol-main"
                        className="absolute inset-0 z-10 overflow-hidden"
                        style={{ opacity: 0.002, cursor: "pointer" }}
                      />
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-600 text-center leading-relaxed px-2">
                    Ao continuar, você concorda com nossos{" "}
                    <button type="button" className="text-zinc-400 hover:text-accent underline underline-offset-2 transition-colors">
                      termos de uso
                    </button>
                    {" "}e{" "}
                    <button type="button" className="text-zinc-400 hover:text-accent underline underline-offset-2 transition-colors">
                      política de privacidade
                    </button>
                  </p>
                </div>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
