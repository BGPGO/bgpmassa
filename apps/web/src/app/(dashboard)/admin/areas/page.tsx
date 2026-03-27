"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Layers, Plus, Trash2, Users, ChevronDown, ChevronRight,
  UserPlus, Eye, X, Shield, Tag,
} from "lucide-react";
import { api } from "../../../../lib/api-client";
import { useInstancesStore } from "../../../../store/instances.store";
import { cn } from "../../../../lib/utils";

interface Area {
  id: string;
  instanceId: string;
  name: string;
  patterns: string[];
  _count?: { userAreas: number; conversations: number };
}

interface AreaMember {
  id: string;
  role: "MEMBER" | "AREA_ADMIN";
  user: { id: string; name: string; email: string; role: string };
}

interface CrossVisibility {
  id: string;
  user: { id: string; name: string; email: string };
  grantedBy: { id: string; name: string };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AreasPage() {
  const { instances, fetchInstances } = useInstancesStore();
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>("");
  const [areas, setAreas] = useState<Area[]>([]);
  const [expandedArea, setExpandedArea] = useState<string | null>(null);
  const [members, setMembers] = useState<Record<string, AreaMember[]>>({});
  const [visibilities, setVisibilities] = useState<Record<string, CrossVisibility[]>>({});
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaPatterns, setNewAreaPatterns] = useState("");
  const [patternInput, setPatternInput] = useState("");

  const [addMemberAreaId, setAddMemberAreaId] = useState<string | null>(null);
  const [addMemberUserId, setAddMemberUserId] = useState("");
  const [addMemberRole, setAddMemberRole] = useState<"MEMBER" | "AREA_ADMIN">("MEMBER");

  const [addVisAreaId, setAddVisAreaId] = useState<string | null>(null);
  const [addVisUserId, setAddVisUserId] = useState("");

  useEffect(() => {
    fetchInstances();
    api.get<User[]>("/api/users").then(({ data }) => setAllUsers(data));
  }, [fetchInstances]);

  useEffect(() => {
    if (instances.length > 0 && !selectedInstanceId) {
      setSelectedInstanceId(instances[0].id);
    }
  }, [instances, selectedInstanceId]);

  const fetchAreas = useCallback(async () => {
    if (!selectedInstanceId) return;
    const { data } = await api.get<Area[]>(`/api/areas?instanceId=${selectedInstanceId}`);
    setAreas(data);
  }, [selectedInstanceId]);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  async function loadMembers(areaId: string) {
    const { data } = await api.get<AreaMember[]>(`/api/areas/${areaId}/members`);
    setMembers((prev) => ({ ...prev, [areaId]: data }));
    const { data: vis } = await api.get<CrossVisibility[]>(`/api/areas/${areaId}/visibility`);
    setVisibilities((prev) => ({ ...prev, [areaId]: vis }));
  }

  function toggleExpand(areaId: string) {
    if (expandedArea === areaId) {
      setExpandedArea(null);
    } else {
      setExpandedArea(areaId);
      loadMembers(areaId);
    }
  }

  async function createArea(e: React.FormEvent) {
    e.preventDefault();
    const patterns = newAreaPatterns
      .split(",")
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);
    await api.post("/api/areas", {
      instanceId: selectedInstanceId,
      name: newAreaName,
      patterns,
    });
    setNewAreaName("");
    setNewAreaPatterns("");
    setShowCreate(false);
    fetchAreas();
  }

  async function deleteArea(id: string, name: string) {
    if (!confirm(`Remover área "${name}"? Isso removerá todos os membros e visibilidades.`)) return;
    await api.delete(`/api/areas/${id}`);
    fetchAreas();
  }

  async function addMember(areaId: string) {
    if (!addMemberUserId) return;
    await api.post(`/api/areas/${areaId}/members`, {
      userId: addMemberUserId,
      role: addMemberRole,
    });
    setAddMemberAreaId(null);
    setAddMemberUserId("");
    loadMembers(areaId);
  }

  async function removeMember(areaId: string, userId: string) {
    await api.delete(`/api/areas/${areaId}/members/${userId}`);
    loadMembers(areaId);
  }

  async function changeRole(areaId: string, userId: string, role: "MEMBER" | "AREA_ADMIN") {
    await api.patch(`/api/areas/${areaId}/members/${userId}`, { role });
    loadMembers(areaId);
  }

  async function grantVisibility(areaId: string) {
    if (!addVisUserId) return;
    await api.post(`/api/areas/${areaId}/visibility`, { userId: addVisUserId });
    setAddVisAreaId(null);
    setAddVisUserId("");
    loadMembers(areaId);
  }

  async function revokeVisibility(areaId: string, userId: string) {
    await api.delete(`/api/areas/${areaId}/visibility/${userId}`);
    loadMembers(areaId);
  }

  async function updatePatterns(area: Area, patterns: string[]) {
    await api.patch(`/api/areas/${area.id}`, { patterns });
    fetchAreas();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Áreas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure áreas, membros e visibilidade de grupos por instância
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90"
        >
          <Plus className="w-4 h-4" />
          Nova área
        </button>
      </div>

      {/* Instance selector */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 mb-1 block">Instância</label>
        <select
          value={selectedInstanceId}
          onChange={(e) => setSelectedInstanceId(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
        >
          {instances.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-5 p-4 border border-gray-200 rounded-xl bg-gray-50">
          <h2 className="font-medium text-gray-800 mb-3">Nova área</h2>
          <form onSubmit={createArea} className="space-y-3">
            <input
              required
              placeholder="Nome da área (ex: Controladoria)"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            <div>
              <input
                placeholder="Padrões de nome separados por vírgula (ex: - controladoria, - financeiro)"
                value={newAreaPatterns}
                onChange={(e) => setNewAreaPatterns(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
              <p className="text-xs text-gray-400 mt-1">
                Grupos cujo nome contiver esses termos serão automaticamente associados a esta área.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-gray-500 px-3 py-1.5">
                Cancelar
              </button>
              <button type="submit" className="px-4 py-1.5 text-sm bg-brand text-white rounded-lg">
                Criar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Areas list */}
      {areas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Layers className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Nenhuma área configurada para esta instância.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {areas.map((area) => (
            <div key={area.id} className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
              {/* Area header */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 select-none"
                onClick={() => toggleExpand(area.id)}
              >
                {expandedArea === area.id ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
                <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-brand" />
                </div>
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{area.name}</span>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400">
                      <Users className="w-3 h-3 inline mr-1" />
                      {area._count?.userAreas ?? 0} membros
                    </span>
                    <span className="text-xs text-gray-400">
                      {area._count?.conversations ?? 0} grupos
                    </span>
                  </div>
                </div>
                {/* Patterns */}
                <div className="flex gap-1 flex-wrap max-w-xs">
                  {area.patterns.map((p) => (
                    <span key={p} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Tag className="w-2.5 h-2.5" />
                      {p}
                    </span>
                  ))}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteArea(area.id, area.name); }}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg ml-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Expanded content */}
              {expandedArea === area.id && (
                <div className="border-t border-gray-100 px-4 py-4 space-y-5">

                  {/* Patterns editor */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Tag className="w-3 h-3" /> Padrões de nome
                    </h3>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {area.patterns.map((p) => (
                        <span key={p} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          {p}
                          <button
                            onClick={() => updatePatterns(area, area.patterns.filter((x) => x !== p))}
                            className="hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!patternInput.trim()) return;
                        updatePatterns(area, [...area.patterns, patternInput.trim().toLowerCase()]);
                        setPatternInput("");
                      }}
                      className="flex gap-2"
                    >
                      <input
                        value={patternInput}
                        onChange={(e) => setPatternInput(e.target.value)}
                        placeholder="Adicionar padrão (ex: - bi)"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand/40"
                      />
                      <button type="submit" className="px-3 py-1.5 text-xs bg-brand text-white rounded-lg">
                        Adicionar
                      </button>
                    </form>
                  </div>

                  {/* Members */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                        <Users className="w-3 h-3" /> Membros
                      </h3>
                      <button
                        onClick={() => setAddMemberAreaId(area.id)}
                        className="text-xs text-brand hover:underline flex items-center gap-1"
                      >
                        <UserPlus className="w-3 h-3" /> Adicionar
                      </button>
                    </div>

                    {addMemberAreaId === area.id && (
                      <div className="flex gap-2 mb-2">
                        <select
                          value={addMemberUserId}
                          onChange={(e) => setAddMemberUserId(e.target.value)}
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                        >
                          <option value="">Selecionar usuário</option>
                          {allUsers.map((u) => (
                            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                          ))}
                        </select>
                        <select
                          value={addMemberRole}
                          onChange={(e) => setAddMemberRole(e.target.value as "MEMBER" | "AREA_ADMIN")}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                        >
                          <option value="MEMBER">Membro</option>
                          <option value="AREA_ADMIN">Admin de área</option>
                        </select>
                        <button
                          onClick={() => addMember(area.id)}
                          className="px-3 py-1.5 text-xs bg-brand text-white rounded-lg"
                        >
                          Adicionar
                        </button>
                        <button onClick={() => setAddMemberAreaId(null)} className="text-xs text-gray-400">
                          Cancelar
                        </button>
                      </div>
                    )}

                    {(members[area.id] ?? []).length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Nenhum membro ainda.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {(members[area.id] ?? []).map((m) => (
                          <div key={m.id} className="flex items-center gap-2 py-1">
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 shrink-0">
                              {m.user.name[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-800 truncate">{m.user.name}</p>
                              <p className="text-xs text-gray-400 truncate">{m.user.email}</p>
                            </div>
                            <select
                              value={m.role}
                              onChange={(e) => changeRole(area.id, m.user.id, e.target.value as "MEMBER" | "AREA_ADMIN")}
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full border-0 font-medium",
                                m.role === "AREA_ADMIN"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-gray-100 text-gray-600"
                              )}
                            >
                              <option value="MEMBER">Membro</option>
                              <option value="AREA_ADMIN">Admin de área</option>
                            </select>
                            <button
                              onClick={() => removeMember(area.id, m.user.id)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cross-area visibility */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Visibilidade cross-área
                      </h3>
                      <button
                        onClick={() => setAddVisAreaId(area.id)}
                        className="text-xs text-brand hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Conceder acesso
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">
                      Usuários de outras áreas que também podem ver os grupos desta área.
                    </p>

                    {addVisAreaId === area.id && (
                      <div className="flex gap-2 mb-2">
                        <select
                          value={addVisUserId}
                          onChange={(e) => setAddVisUserId(e.target.value)}
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                        >
                          <option value="">Selecionar usuário</option>
                          {allUsers.map((u) => (
                            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                          ))}
                        </select>
                        <button
                          onClick={() => grantVisibility(area.id)}
                          className="px-3 py-1.5 text-xs bg-brand text-white rounded-lg"
                        >
                          Conceder
                        </button>
                        <button onClick={() => setAddVisAreaId(null)} className="text-xs text-gray-400">
                          Cancelar
                        </button>
                      </div>
                    )}

                    {(visibilities[area.id] ?? []).length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Nenhum acesso cross-área configurado.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {(visibilities[area.id] ?? []).map((v) => (
                          <div key={v.id} className="flex items-center gap-2 py-1">
                            <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-800 truncate">{v.user.name}</p>
                              <p className="text-xs text-gray-400">concedido por {v.grantedBy.name}</p>
                            </div>
                            <button
                              onClick={() => revokeVisibility(area.id, v.user.id)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
