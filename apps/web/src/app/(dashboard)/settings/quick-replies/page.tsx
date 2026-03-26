"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Zap, Download, X, Check } from "lucide-react";
import { api } from "../../../../lib/api-client";
import { cn } from "../../../../lib/utils";

interface QuickReply {
  id: string;
  title: string;
  shortcut: string;
  body: string;
  instanceId: string | null;
  isActive: boolean;
  createdBy: { id: string; name: string };
  instance: { id: string; name: string } | null;
}

interface Instance {
  id: string;
  name: string;
}

interface Suggestion {
  body: string;
  count: number;
  suggestedTitle: string;
  suggestedShortcut: string;
}

interface FormState {
  title: string;
  shortcut: string;
  body: string;
  instanceId: string;
}

const EMPTY_FORM: FormState = { title: "", shortcut: "", body: "", instanceId: "" };

export default function QuickRepliesPage() {
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Import from history modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importInstanceId, setImportInstanceId] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [qrRes, instRes] = await Promise.all([
        api.get("/api/quick-replies"),
        api.get("/api/instances"),
      ]);
      setQuickReplies(qrRes.data);
      const instData = instRes.data;
      setInstances(Array.isArray(instData) ? instData : instData.items ?? []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(qr: QuickReply) {
    setEditingId(qr.id);
    setForm({
      title: qr.title,
      shortcut: qr.shortcut,
      body: qr.body,
      instanceId: qr.instanceId ?? "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title || !form.shortcut || !form.body) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        shortcut: form.shortcut,
        body: form.body,
        instanceId: form.instanceId || null,
      };
      if (editingId) {
        await api.patch(`/api/quick-replies/${editingId}`, payload);
      } else {
        await api.post("/api/quick-replies", payload);
      }
      setShowForm(false);
      await fetchData();
    } catch (err) {
      console.error("Failed to save quick reply:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta resposta rápida?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/quick-replies/${id}`);
      setQuickReplies((prev) => prev.filter((qr) => qr.id !== id));
    } catch (err) {
      console.error("Failed to delete quick reply:", err);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleLoadSuggestions() {
    if (!importInstanceId) return;
    setLoadingSuggestions(true);
    setSuggestions([]);
    setSelectedSuggestions(new Set());
    try {
      const { data } = await api.get("/api/quick-replies/suggest", {
        params: { instanceId: importInstanceId },
      });
      setSuggestions(data);
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  function toggleSuggestion(index: number) {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  async function handleImportSelected() {
    if (selectedSuggestions.size === 0) return;
    setImporting(true);
    try {
      const toImport = Array.from(selectedSuggestions).map((i) => suggestions[i]);
      await Promise.all(
        toImport.map((s) =>
          api.post("/api/quick-replies", {
            title: s.suggestedTitle,
            shortcut: s.suggestedShortcut || "resposta",
            body: s.body,
            instanceId: importInstanceId || null,
          })
        )
      );
      setShowImportModal(false);
      await fetchData();
    } catch (err) {
      console.error("Failed to import quick replies:", err);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-brand" />
              Respostas Rápidas
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Use <code className="bg-gray-100 px-1 rounded text-xs">/atalho</code> no chat para inserir respostas pré-definidas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 px-3 py-2 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Importar do histórico
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 text-sm text-white bg-brand hover:bg-brand-dark px-3 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova resposta
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Create/Edit Form */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">
              {editingId ? "Editar resposta rápida" : "Nova resposta rápida"}
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Título
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Boas-vindas"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Atalho (sem barra)
                </label>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-brand/50">
                  <span className="px-2 py-2 text-sm text-gray-400 bg-gray-50 border-r border-gray-300">
                    /
                  </span>
                  <input
                    type="text"
                    value={form.shortcut}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        shortcut: e.target.value.replace(/[^a-z0-9]/gi, "").toLowerCase(),
                      }))
                    }
                    placeholder="oi"
                    className="flex-1 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Mensagem
              </label>
              <textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Olá! Seja bem-vindo ao atendimento BGP..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand/50 resize-none"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Instância (opcional — deixe vazio para global)
              </label>
              <select
                value={form.instanceId}
                onChange={(e) => setForm((f) => ({ ...f, instanceId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand/50"
              >
                <option value="">Global (todas as instâncias)</option>
                {instances.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-300 hover:border-gray-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!form.title || !form.shortcut || !form.body || saving}
                className={cn(
                  "text-sm text-white px-4 py-2 rounded-lg transition-colors",
                  form.title && form.shortcut && form.body && !saving
                    ? "bg-brand hover:bg-brand-dark"
                    : "bg-gray-300 cursor-not-allowed"
                )}
              >
                {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar"}
              </button>
            </div>
          </div>
        )}

        {/* Quick replies list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : quickReplies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Zap className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-sm font-medium text-gray-500">Nenhuma resposta rápida ainda</p>
            <p className="text-xs text-gray-400 mt-1">
              Crie respostas rápidas para agilizar o atendimento
            </p>
            <button
              onClick={openCreate}
              className="mt-4 flex items-center gap-1.5 text-sm text-brand hover:underline"
            >
              <Plus className="w-4 h-4" />
              Criar primeira resposta rápida
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {quickReplies.map((qr) => (
              <div
                key={qr.id}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-start gap-4 hover:border-gray-300 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-4 h-4 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-gray-800">{qr.title}</span>
                    <span className="text-xs font-mono text-brand bg-brand/10 px-1.5 py-0.5 rounded">
                      /{qr.shortcut}
                    </span>
                    {qr.instance && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                        {qr.instance.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{qr.body}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(qr)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(qr.id)}
                    disabled={deletingId === qr.id}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Excluir"
                  >
                    {deletingId === qr.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import from history modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Importar do histórico
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Selecione mensagens frequentes para criar respostas rápidas
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Instance selector */}
              <div className="flex items-end gap-3 mb-5">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Instância
                  </label>
                  <select
                    value={importInstanceId}
                    onChange={(e) => setImportInstanceId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand/50"
                  >
                    <option value="">Selecione uma instância</option>
                    {instances.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleLoadSuggestions}
                  disabled={!importInstanceId || loadingSuggestions}
                  className={cn(
                    "text-sm text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap",
                    importInstanceId && !loadingSuggestions
                      ? "bg-brand hover:bg-brand-dark"
                      : "bg-gray-300 cursor-not-allowed"
                  )}
                >
                  {loadingSuggestions ? "Buscando..." : "Buscar sugestões"}
                </button>
              </div>

              {/* Suggestions list */}
              {suggestions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-gray-600">
                      {suggestions.length} sugestões encontradas — selecione as que deseja importar
                    </p>
                    <button
                      onClick={() => {
                        if (selectedSuggestions.size === suggestions.length) {
                          setSelectedSuggestions(new Set());
                        } else {
                          setSelectedSuggestions(new Set(suggestions.map((_, i) => i)));
                        }
                      }}
                      className="text-xs text-brand hover:underline"
                    >
                      {selectedSuggestions.size === suggestions.length
                        ? "Desmarcar todos"
                        : "Selecionar todos"}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {suggestions.map((s, index) => (
                      <button
                        key={index}
                        onClick={() => toggleSuggestion(index)}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl border transition-all",
                          selectedSuggestions.has(index)
                            ? "border-brand bg-brand/5"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                              selectedSuggestions.has(index)
                                ? "border-brand bg-brand"
                                : "border-gray-300"
                            )}
                          >
                            {selectedSuggestions.has(index) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-semibold text-gray-700 truncate">
                                {s.suggestedTitle}
                              </span>
                              <span className="text-[10px] font-mono text-brand bg-brand/10 px-1.5 py-0.5 rounded shrink-0">
                                /{s.suggestedShortcut || "resposta"}
                              </span>
                              <span className="text-[10px] text-gray-400 shrink-0">
                                {s.count}x enviado
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate">{s.body}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!loadingSuggestions && suggestions.length === 0 && importInstanceId && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Clique em "Buscar sugestões" para analisar o histórico
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-gray-500">
                {selectedSuggestions.size} selecionada(s)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-300 hover:border-gray-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImportSelected}
                  disabled={selectedSuggestions.size === 0 || importing}
                  className={cn(
                    "text-sm text-white px-4 py-2 rounded-lg transition-colors",
                    selectedSuggestions.size > 0 && !importing
                      ? "bg-brand hover:bg-brand-dark"
                      : "bg-gray-300 cursor-not-allowed"
                  )}
                >
                  {importing
                    ? "Importando..."
                    : `Importar ${selectedSuggestions.size > 0 ? `${selectedSuggestions.size} ` : ""}selecionados`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
