"use client";

import { X, Eye, EyeSlash, GoogleLogo, EnvelopeSimple, LockKey, User } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface AuthPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthTab = "login" | "signup";

export function AuthPanel({ isOpen, onClose }: AuthPanelProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Validation states
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!loginEmail) newErrors.loginEmail = "E-mail é obrigatório";
    else if (!validateEmail(loginEmail)) newErrors.loginEmail = "E-mail inválido";
    
    if (!loginPassword) newErrors.loginPassword = "Senha é obrigatória";
    else if (loginPassword.length < 6) newErrors.loginPassword = "Senha deve ter no mínimo 6 caracteres";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    // TODO: Implementar lógica de login real
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    onClose();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!signupName) newErrors.signupName = "Nome é obrigatório";
    if (!signupEmail) newErrors.signupEmail = "E-mail é obrigatório";
    else if (!validateEmail(signupEmail)) newErrors.signupEmail = "E-mail inválido";
    
    if (!signupPassword) newErrors.signupPassword = "Senha é obrigatória";
    else if (signupPassword.length < 6) newErrors.signupPassword = "Senha deve ter no mínimo 6 caracteres";
    
    if (!signupConfirmPassword) newErrors.signupConfirmPassword = "Confirme sua senha";
    else if (signupPassword !== signupConfirmPassword) newErrors.signupConfirmPassword = "As senhas não coincidem";
    
    if (!acceptTerms) newErrors.acceptTerms = "Você deve aceitar os termos";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    // TODO: Implementar lógica de cadastro real
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    onClose();
  };

  const handleGoogleAuth = () => {
    // TODO: Implementar autenticação com Google
    console.log("Google auth");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-zinc-900 z-50 overflow-y-auto"
          >
            <div className="min-h-full flex flex-col">
              {/* Header */}
              <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-xl border-b border-white/10 z-10">
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-3">
                    <img src="/logo2.png" alt="Logo" className="h-8 w-auto" />
                    <h2 className="text-xl font-bold tracking-tight"></h2>
                  </div>
                  <motion.button
                    onClick={onClose}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                  >
                    <X size={20} weight="bold" />
                  </motion.button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-6 pb-4">
                  <button
                    onClick={() => {
                      setActiveTab("login");
                      setErrors({});
                    }}
                    className="relative flex-1 py-3 text-sm font-medium transition-colors"
                  >
                    <span className={activeTab === "login" ? "text-white" : "text-zinc-400"}>
                      Entrar
                    </span>
                    {activeTab === "login" && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("signup");
                      setErrors({});
                    }}
                    className="relative flex-1 py-3 text-sm font-medium transition-colors"
                  >
                    <span className={activeTab === "signup" ? "text-white" : "text-zinc-400"}>
                      Criar conta
                    </span>
                    {activeTab === "signup" && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-6">
                <AnimatePresence mode="wait">
                  {activeTab === "login" ? (
                    <motion.form
                      key="login"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleLogin}
                      className="space-y-5"
                    >
                      {/* Email */}
                      <div className="space-y-2">
                        <label htmlFor="login-email" className="text-sm font-medium text-zinc-300">
                          E-mail
                        </label>
                        <div className="relative">
                          <EnvelopeSimple size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <input
                            id="login-email"
                            type="email"
                            value={loginEmail}
                            onChange={(e) => {
                              setLoginEmail(e.target.value);
                              setErrors(prev => ({ ...prev, loginEmail: "" }));
                            }}
                            placeholder="seu@email.com"
                            autoComplete="email"
                            inputMode="email"
                            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all placeholder:text-zinc-500 text-base"
                          />
                        </div>
                        {errors.loginEmail && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-red-400"
                          >
                            {errors.loginEmail}
                          </motion.p>
                        )}
                      </div>

                      {/* Password */}
                      <div className="space-y-2">
                        <label htmlFor="login-password" className="text-sm font-medium text-zinc-300">
                          Senha
                        </label>
                        <div className="relative">
                          <LockKey size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            value={loginPassword}
                            onChange={(e) => {
                              setLoginPassword(e.target.value);
                              setErrors(prev => ({ ...prev, loginPassword: "" }));
                            }}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            className="w-full pl-12 pr-14 py-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all placeholder:text-zinc-500 text-base"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                          >
                            {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                        {errors.loginPassword && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-red-400"
                          >
                            {errors.loginPassword}
                          </motion.p>
                        )}
                      </div>

                      {/* Remember & Forgot */}
                      <div className="flex items-center justify-between gap-4">
                        <label className="flex items-center gap-3 cursor-pointer group min-h-[44px]">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-5 h-5 rounded border-white/20 bg-white/5 text-accent focus:ring-2 focus:ring-accent focus:ring-offset-0 cursor-pointer"
                          />
                          <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">
                            Lembrar de mim
                          </span>
                        </label>
                        <button
                          type="button"
                          className="text-sm text-accent hover:text-accent/80 transition-colors min-h-[44px] px-2"
                        >
                          Esqueci minha senha
                        </button>
                      </div>

                      {/* Submit Button */}
                      <motion.button
                        type="submit"
                        disabled={isLoading}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className="w-full py-4 bg-accent hover:bg-accent/90 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden min-h-[52px] text-base"
                      >
                        {isLoading ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mx-auto"
                          />
                        ) : (
                          "Entrar"
                        )}
                      </motion.button>

                      {/* Divider */}
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="px-4 bg-zinc-900 text-zinc-500">ou</span>
                        </div>
                      </div>

                      {/* Google Button */}
                      <motion.button
                        type="button"
                        onClick={handleGoogleAuth}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors flex items-center justify-center gap-3"
                      >
                        <GoogleLogo size={20} weight="bold" />
                        Continuar com Google
                      </motion.button>
                    </motion.form>
                  ) : (
                    <motion.form
                      key="signup"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleSignup}
                      className="space-y-5"
                    >
                      {/* Name */}
                      <div className="space-y-2">
                        <label htmlFor="signup-name" className="text-sm font-medium text-zinc-300">
                          Nome completo
                        </label>
                        <div className="relative">
                          <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <input
                            id="signup-name"
                            type="text"
                            value={signupName}
                            onChange={(e) => {
                              setSignupName(e.target.value);
                              setErrors(prev => ({ ...prev, signupName: "" }));
                            }}
                            placeholder="João Silva"
                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all placeholder:text-zinc-500"
                          />
                        </div>
                        {errors.signupName && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-red-400"
                          >
                            {errors.signupName}
                          </motion.p>
                        )}
                      </div>

                      {/* Email */}
                      <div className="space-y-2">
                        <label htmlFor="signup-email" className="text-sm font-medium text-zinc-300">
                          E-mail
                        </label>
                        <div className="relative">
                          <EnvelopeSimple size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <input
                            id="signup-email"
                            type="email"
                            value={signupEmail}
                            onChange={(e) => {
                              setSignupEmail(e.target.value);
                              setErrors(prev => ({ ...prev, signupEmail: "" }));
                            }}
                            placeholder="seu@email.com"
                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all placeholder:text-zinc-500"
                          />
                        </div>
                        {errors.signupEmail && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-red-400"
                          >
                            {errors.signupEmail}
                          </motion.p>
                        )}
                      </div>

                      {/* Password */}
                      <div className="space-y-2">
                        <label htmlFor="signup-password" className="text-sm font-medium text-zinc-300">
                          Senha
                        </label>
                        <div className="relative">
                          <LockKey size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <input
                            id="signup-password"
                            type={showPassword ? "text" : "password"}
                            value={signupPassword}
                            onChange={(e) => {
                              setSignupPassword(e.target.value);
                              setErrors(prev => ({ ...prev, signupPassword: "" }));
                            }}
                            placeholder="••••••••"
                            className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all placeholder:text-zinc-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                          >
                            {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                        {errors.signupPassword && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-red-400"
                          >
                            {errors.signupPassword}
                          </motion.p>
                        )}
                      </div>

                      {/* Confirm Password */}
                      <div className="space-y-2">
                        <label htmlFor="signup-confirm-password" className="text-sm font-medium text-zinc-300">
                          Confirmar senha
                        </label>
                        <div className="relative">
                          <LockKey size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <input
                            id="signup-confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            value={signupConfirmPassword}
                            onChange={(e) => {
                              setSignupConfirmPassword(e.target.value);
                              setErrors(prev => ({ ...prev, signupConfirmPassword: "" }));
                            }}
                            placeholder="••••••••"
                            className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all placeholder:text-zinc-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                          >
                            {showConfirmPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                        {errors.signupConfirmPassword && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-red-400"
                          >
                            {errors.signupConfirmPassword}
                          </motion.p>
                        )}
                      </div>

                      {/* Terms */}
                      <div className="space-y-2">
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={acceptTerms}
                            onChange={(e) => {
                              setAcceptTerms(e.target.checked);
                              setErrors(prev => ({ ...prev, acceptTerms: "" }));
                            }}
                            className="w-4 h-4 mt-0.5 rounded border-white/20 bg-white/5 text-accent focus:ring-2 focus:ring-accent focus:ring-offset-0 cursor-pointer flex-shrink-0"
                          />
                          <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">
                            Aceito os{" "}
                            <button type="button" className="text-accent hover:underline">
                              termos de uso
                            </button>{" "}
                            e{" "}
                            <button type="button" className="text-accent hover:underline">
                              política de privacidade
                            </button>
                          </span>
                        </label>
                        {errors.acceptTerms && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-red-400"
                          >
                            {errors.acceptTerms}
                          </motion.p>
                        )}
                      </div>

                      {/* Submit Button */}
                      <motion.button
                        type="submit"
                        disabled={isLoading}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className="w-full py-3 bg-accent hover:bg-accent/90 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                      >
                        {isLoading ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mx-auto"
                          />
                        ) : (
                          "Criar conta"
                        )}
                      </motion.button>

                      {/* Divider */}
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="px-4 bg-zinc-900 text-zinc-500">ou</span>
                        </div>
                      </div>

                      {/* Google Button */}
                      <motion.button
                        type="button"
                        onClick={handleGoogleAuth}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors flex items-center justify-center gap-3"
                      >
                        <GoogleLogo size={20} weight="bold" />
                        Cadastrar com Google
                      </motion.button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
