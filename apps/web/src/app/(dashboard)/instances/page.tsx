"use client";

import { useEffect, useState, useCallback } from "react";
import { Smartphone, RefreshCw, Wifi, WifiOff, QrCode, Copy, Check, Plus, Trash2 } from "lucide-react";
import { api } from "../../../lib/api-client";

interface Instance {
  id: string;
  name: string;
  phoneNumber: string | null;
  status: "CONNECTED" | "DISCONNECTED" | "QRCODE_PENDING";
  zapiInstanceId: string;
}

interface SyncResult {
  ok: boolean;
  imported: number;
}

export default function InstancesPage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [syncResults, setSyncResults] = useState<Record<string, number>>({});
  const [qrData, setQrData] = useState<Record<string, string>>({});
  const [showQr, setShowQr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, Instance["status"]>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", zapiInstanceId: "", zapiToken: "" });

  const fetchInstances = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Instance[]>("/api/instances");
      setInstances(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  async function checkStatus(instance: Instance) {
    try {
      const { data } = await api.get<{ status: Instance["status"] }>(`/api/instances/${instance.id}/status`);
      setStatusMap((prev) => ({ ...prev, [instance.id]: data.status }));
    } catch {
      // ignore
    }
  }

  async function syncChats(instance: Instance) {
    setSyncing((prev) => ({ ...prev, [instance.id]: true }));
    try {
      const { data } = await api.post<SyncResult>(`/api/instances/${instance.id}/sync`);
      setSyncResults((prev) => ({ ...prev, [instance.id]: data.imported }));
    } catch (err) {
      alert("Erro ao sincronizar: " + (err as Error).message);
    } finally {
      setSyncing((prev) => ({ ...prev, [instance.id]: false }));
    }
  }

  async function loadQrCode(instance: Instance) {
    try {
      const { data } = await api.get<{ value: string }>(`/api/instances/${instance.id}/qrcode`);
      setQrData((prev) => ({ ...prev, [instance.id]: data.value }));
      setShowQr(instance.id);
    } catch (err) {
      alert("Erro ao carregar QR Code: " + (err as Error).message);
    }
  }

  function copyWebhookUrl(instance: Instance) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const url = `${apiUrl}/api/webhooks/zapi/${instance.zapiInstanceId}`;
    navigator.clipboard.writeText(url);
    setCopied(instance.id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/api/instances", form);
      setForm({ name: "", zapiInstanceId: "", zapiToken: "" });
      setShowCreate(false);
      await fetchInstances();
    } catch (err) {
      alert("Erro ao criar instância: " + (err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(instance: Instance) {
    if (!confirm(`Remover instância "${instance.name}"?`)) return;
    try {
      await api.delete(`/api/instances/${instance.id}`);
      await fetchInstances();
    } catch (err) {
      alert("Erro ao remover: " + (err as Error).message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Carregando instâncias...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Instâncias WhatsApp</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie as conexões Z-API e sincronize conversas</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90"
        >
          <Plus className="w-4 h-4" />
          Nova instância
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 p-4 border border-gray-200 rounded-xl bg-gray-50">
          <h2 className="font-medium text-gray-800 mb-3">Nova instância Z-API</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              required
              placeholder="Nome (ex: Operações)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            <input
              required
              placeholder="Instance ID (Z-API)"
              value={form.zapiInstanceId}
              onChange={(e) => setForm((f) => ({ ...f, zapiInstanceId: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            <input
              required
              placeholder="Token (Z-API)"
              value={form.zapiToken}
              onChange={(e) => setForm((f) => ({ ...f, zapiToken: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            <div className="sm:col-span-3 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-1.5 text-sm bg-brand text-white rounded-lg disabled:opacity-50"
              >
                {creating ? "Criando..." : "Criar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {instances.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Nenhuma instância configurada.</p>
          <p className="text-sm mt-1">Clique em "Nova instância" para adicionar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {instances.map((instance) => {
            const currentStatus = statusMap[instance.id] || instance.status;
            const isConnected = currentStatus === "CONNECTED";
            const isSyncing = syncing[instance.id];
            const syncCount = syncResults[instance.id];

            return (
              <div key={instance.id} className="border border-gray-200 rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isConnected ? "bg-green-100" : "bg-gray-100"}`}>
                    <Smartphone className={`w-5 h-5 ${isConnected ? "text-green-600" : "text-gray-400"}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{instance.name}</span>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                        isConnected
                          ? "bg-green-100 text-green-700"
                          : currentStatus === "QRCODE_PENDING"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-600"
                      }`}>
                        {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        {isConnected ? "Conectado" : currentStatus === "QRCODE_PENDING" ? "Aguardando QR" : "Desconectado"}
                      </span>
                      {syncCount !== undefined && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {syncCount} conversas importadas
                        </span>
                      )}
                    </div>
                    {instance.phoneNumber && (
                      <p className="text-sm text-gray-500 mt-0.5">{instance.phoneNumber}</p>
                    )}

                    {/* Webhook URL */}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-400">Webhook URL:</span>
                      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 truncate max-w-xs">
                        {process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/webhooks/zapi/{instance.zapiInstanceId}
                      </code>
                      <button
                        onClick={() => copyWebhookUrl(instance)}
                        className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                        title="Copiar URL"
                      >
                        {copied === instance.id ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => checkStatus(instance)}
                      className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1"
                      title="Verificar status"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Status
                    </button>

                    <button
                      onClick={() => loadQrCode(instance)}
                      className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1"
                      title="Ver QR Code"
                    >
                      <QrCode className="w-3 h-3" />
                      QR Code
                    </button>

                    <button
                      onClick={() => syncChats(instance)}
                      disabled={isSyncing}
                      className="px-2.5 py-1.5 text-xs bg-brand text-white rounded-lg hover:bg-brand/90 disabled:opacity-50 flex items-center gap-1"
                      title="Sincronizar conversas do WhatsApp"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
                      {isSyncing ? "Sincronizando..." : "Sincronizar"}
                    </button>

                    <button
                      onClick={() => handleDelete(instance)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      title="Remover instância"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* QR Code modal */}
                {showQr === instance.id && qrData[instance.id] && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-start gap-4">
                      <img
                        src={qrData[instance.id]}
                        alt="QR Code"
                        className="w-40 h-40 border border-gray-200 rounded-lg"
                      />
                      <div className="text-sm text-gray-600">
                        <p className="font-medium text-gray-800 mb-1">Como conectar:</p>
                        <ol className="list-decimal list-inside space-y-1 text-xs">
                          <li>Abra o WhatsApp no celular</li>
                          <li>Toque em <strong>Dispositivos conectados</strong></li>
                          <li>Toque em <strong>Conectar dispositivo</strong></li>
                          <li>Aponte a câmera para este QR Code</li>
                        </ol>
                        <button
                          onClick={() => setShowQr(null)}
                          className="mt-3 text-xs text-gray-400 hover:text-gray-600"
                        >
                          Fechar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Webhook instructions */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        <p className="font-medium mb-1">Como configurar o webhook no Z-API:</p>
        <ol className="list-decimal list-inside space-y-1 text-xs text-blue-700">
          <li>Acesse o painel do Z-API</li>
          <li>Selecione a instância</li>
          <li>Vá em <strong>Webhooks</strong> e cole a URL copiada acima</li>
          <li>Ative os eventos: <em>On Message Received</em> e <em>On Message Sent</em></li>
          <li>Clique em "Sincronizar" para importar as conversas existentes</li>
        </ol>
      </div>
    </div>
  );
}
