"use client";

import { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, User, PenLine, KeyRound } from "lucide-react";
import { useAuthStore } from "../../../../store/auth.store";
import { api } from "../../../../lib/api-client";
import { cn } from "../../../../lib/utils";

type FeedbackState = { type: "success" | "error"; message: string } | null;

interface FormState {
  name: string;
  signature: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const { user, loadMe } = useAuthStore();

  const [form, setForm] = useState<FormState>({
    name: "",
    signature: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<FeedbackState>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      name: user?.name ?? "",
      signature: user?.signature ?? "",
    }));
  }, [user]);

  function setField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function showFeedback(
    setter: React.Dispatch<React.SetStateAction<FeedbackState>>,
    feedback: FeedbackState
  ) {
    setter(feedback);
    setTimeout(() => setter(null), 4000);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      showFeedback(setProfileFeedback, { type: "error", message: "O nome não pode ser vazio." });
      return;
    }
    setSavingProfile(true);
    try {
      await api.patch(`/api/users/${user?.id}`, {
        name: form.name.trim(),
        signature: form.signature.trim() || null,
      });
      await loadMe();
      showFeedback(setProfileFeedback, {
        type: "success",
        message: "Perfil atualizado com sucesso!",
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Erro ao salvar perfil.";
      showFeedback(setProfileFeedback, { type: "error", message: msg });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!form.newPassword) {
      showFeedback(setPasswordFeedback, {
        type: "error",
        message: "Digite a nova senha.",
      });
      return;
    }
    if (form.newPassword.length < 6) {
      showFeedback(setPasswordFeedback, {
        type: "error",
        message: "A senha deve ter ao menos 6 caracteres.",
      });
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      showFeedback(setPasswordFeedback, {
        type: "error",
        message: "As senhas não coincidem.",
      });
      return;
    }
    setSavingPassword(true);
    try {
      await api.patch(`/api/users/${user?.id}`, {
        password: form.newPassword,
      });
      setField("currentPassword", "");
      setField("newPassword", "");
      setField("confirmPassword", "");
      showFeedback(setPasswordFeedback, {
        type: "success",
        message: "Senha alterada com sucesso!",
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Erro ao alterar senha.";
      showFeedback(setPasswordFeedback, { type: "error", message: msg });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Configurações de Perfil</h1>

        {/* Profile info card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-5">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
              <User className="w-4 h-4 text-brand" />
            </div>
            <h2 className="font-semibold text-gray-800 text-sm">Informações pessoais</h2>
          </div>

          <form onSubmit={handleSaveProfile} className="px-5 py-5 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nome completo
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
                placeholder="Seu nome"
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={user?.email ?? ""}
                readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-500 bg-gray-50 cursor-not-allowed"
              />
            </div>

            {/* Signature */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Assinatura
              </label>
              <textarea
                value={form.signature}
                onChange={(e) => setField("signature", e.target.value)}
                placeholder="ex: João Silva | Atendimento BGP"
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Adicionada automaticamente ao final das suas mensagens.
              </p>
              {form.signature.trim() && (
                <div className="mt-2 p-3 bg-wa-msg-out border border-green-200 rounded-lg">
                  <p className="text-xs font-medium text-gray-600 mb-1">Prévia da mensagem:</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {"Olá, tudo bem?\n\n-- "}
                    {form.signature}
                  </p>
                </div>
              )}
            </div>

            {/* Feedback */}
            {profileFeedback && (
              <div
                className={cn(
                  "flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg",
                  profileFeedback.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                )}
              >
                {profileFeedback.type === "success" ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                {profileFeedback.message}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="bg-brand hover:bg-brand-dark text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {savingProfile && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {savingProfile ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </form>
        </div>

        {/* Change password card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-orange-500" />
            </div>
            <h2 className="font-semibold text-gray-800 text-sm">Alterar senha</h2>
          </div>

          <form onSubmit={handleChangePassword} className="px-5 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nova senha
              </label>
              <input
                type="password"
                value={form.newPassword}
                onChange={(e) => setField("newPassword", e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirmar nova senha
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setField("confirmPassword", e.target.value)}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
              />
            </div>

            {/* Feedback */}
            {passwordFeedback && (
              <div
                className={cn(
                  "flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg",
                  passwordFeedback.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                )}
              >
                {passwordFeedback.type === "success" ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                {passwordFeedback.message}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingPassword}
                className="bg-gray-800 hover:bg-gray-900 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {savingPassword && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {savingPassword ? "Alterando..." : "Alterar senha"}
              </button>
            </div>
          </form>
        </div>

        {/* Role badge */}
        <div className="mt-4 flex items-center gap-2">
          <PenLine className="w-3.5 h-3.5 text-gray-400" />
          <p className="text-xs text-gray-400">
            Função:{" "}
            <span className="font-medium text-gray-500">
              {user?.role === "SUPERADMIN"
                ? "Super Admin"
                : user?.role === "ADMIN"
                ? "Administrador"
                : "Atendente"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
