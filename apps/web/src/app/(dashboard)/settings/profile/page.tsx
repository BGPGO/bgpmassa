"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "../../../../store/auth.store";
import { api } from "../../../../lib/api-client";

export default function ProfilePage() {
  const { user, loadMe } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [signature, setSignature] = useState(user?.signature || "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setSignature(user?.signature || "");
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/api/users/${user?.id}`, {
        name,
        signature: signature || null,
        ...(password ? { password } : {}),
      });
      await loadMe();
      setPassword("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-xl font-semibold mb-6">Meu Perfil</h1>

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">Nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Assinatura
          </label>
          <input
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="ex: João Silva | Atendimento"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p className="text-xs text-gray-500 mt-1">
            Será adicionada automaticamente ao final das suas mensagens.
          </p>
          {signature && (
            <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500">
              Prévia: Olá, tudo bem?{"\n\n"}-- {signature}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Nova senha (opcional)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Deixe em branco para não alterar"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-brand hover:bg-brand-dark text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors disabled:opacity-60"
        >
          {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar alterações"}
        </button>
      </form>
    </div>
  );
}
