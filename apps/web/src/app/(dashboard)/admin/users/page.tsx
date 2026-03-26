"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, Trash2, ToggleLeft, ToggleRight, AlertCircle, CheckCircle } from "lucide-react";
import { api } from "../../../../lib/api-client";
import { cn } from "../../../../lib/utils";
import { useAuthStore } from "../../../../store/auth.store";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string;
  role: "SUPERADMIN" | "ADMIN" | "AGENT";
  isActive: boolean;
  createdAt: string;
  signature?: string;
}

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "Super Admin",
  ADMIN: "Administrador",
  AGENT: "Atendente",
};

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: "bg-purple-100 text-purple-700",
  ADMIN: "bg-blue-100 text-blue-700",
  AGENT: "bg-gray-100 text-gray-600",
};

interface CreateForm {
  email: string;
  name: string;
  password: string;
  role: "ADMIN" | "AGENT";
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuthStore();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [form, setForm] = useState<CreateForm>({ email: "", name: "", password: "", role: "AGENT" });

  useEffect(() => {
    if (!currentUser) return;
    if (!["ADMIN", "SUPERADMIN"].includes(currentUser.role)) {
      router.push("/conversations");
      return;
    }
    load();
  }, [currentUser]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/api/users");
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }

  function setField(k: keyof CreateForm, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function showMsg(type: "success" | "error", msg: string) {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.name || !form.password) {
      showMsg("error", "Preencha todos os campos.");
      return;
    }
    setCreating(true);
    try {
      await api.post("/api/users", form);
      showMsg("success", "Usuário criado com sucesso!");
      setForm({ email: "", name: "", password: "", role: "AGENT" });
      setShowForm(false);
      load();
    } catch (err: unknown) {
      showMsg("error", (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Erro ao criar usuário.");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(user: User) {
    try {
      await api.patch(`/api/users/${user.id}`, { isActive: !user.isActive });
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
    } catch {
      showMsg("error", "Erro ao atualizar usuário.");
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Desativar ${user.name}?`)) return;
    try {
      await api.delete(`/api/users/${user.id}`);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isActive: false } : u));
    } catch {
      showMsg("error", "Erro ao remover usuário.");
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Gerenciar Usuários</h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo usuário
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={cn(
            "flex items-center gap-2 text-sm px-4 py-3 rounded-lg mb-4 border",
            feedback.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
          )}>
            {feedback.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {feedback.msg}
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
            <h2 className="font-semibold text-gray-800 text-sm mb-4">Novo usuário</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Nome completo"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Senha</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Função</label>
                <select
                  value={form.role}
                  onChange={(e) => setField("role", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand bg-white"
                >
                  <option value="AGENT">Atendente</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
                >
                  {creating && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {creating ? "Criando..." : "Criar usuário"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {users.map((u) => (
                <div key={u.id} className={cn("flex items-center gap-3 px-5 py-3.5", !u.isActive && "opacity-50")}>
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-gray-600">
                      {u.name[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", ROLE_COLORS[u.role])}>
                        {ROLE_LABELS[u.role]}
                      </span>
                      {!u.isActive && (
                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Inativo</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  {u.id !== currentUser?.id && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggleActive(u)}
                        title={u.isActive ? "Desativar" : "Ativar"}
                        className="p-1.5 text-gray-400 hover:text-brand transition-colors rounded-lg hover:bg-gray-50"
                      >
                        {u.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        title="Remover"
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
