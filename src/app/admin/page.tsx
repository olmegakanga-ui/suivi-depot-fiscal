"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Building2, RefreshCw, Search } from "lucide-react";
import {
  addClient as addClientDb,
  deleteClient as deleteClientDb,
  updateClient as updateClientDb,
} from "@/lib/clients";

type Bureau = "Kinshasa" | "Lubumbashi";
type LOS = "Audit" | "BSO" | "TAX";

type UiClient = {
  id: number;
  nomClient: string;
  bureau: Bureau;
  los: LOS;
  personInCharge: string;

  paiementIbp: boolean;
  remplissage: boolean;
  attestationEc: boolean;
  depotDgi: boolean;

  paiementIbpApplicable: boolean;
  remplissageApplicable: boolean;
  attestationEcApplicable: boolean;
  depotDgiApplicable: boolean;
};

const inputClass =
  "border-white/10 bg-slate-900 text-white placeholder:text-slate-400";

const selectTriggerClass = "border-white/10 bg-slate-900 text-white";

const selectContentClass = "border-white/10 bg-slate-900 text-white";

const emptyClient: UiClient = {
  id: 0,
  nomClient: "",
  bureau: "Kinshasa",
  los: "Audit",
  personInCharge: "",

  paiementIbp: false,
  remplissage: false,
  attestationEc: false,
  depotDgi: false,

  paiementIbpApplicable: true,
  remplissageApplicable: true,
  attestationEcApplicable: true,
  depotDgiApplicable: true,
};

function mapDbClientToUi(client: any): UiClient {
  return {
    id: client.id,
    nomClient: client.nom_client ?? "",
    bureau: client.bureau ?? "Kinshasa",
    los: client.los ?? "Audit",
    personInCharge: client.person_in_charge ?? "",

    paiementIbp: Boolean(client.paiement_ibp),
    remplissage: Boolean(client.remplissage),
    attestationEc: Boolean(client.attestation_ec),
    depotDgi: Boolean(client.depot_dgi),

    paiementIbpApplicable: client.paiement_ibp_applicable ?? true,
    remplissageApplicable: client.remplissage_applicable ?? true,
    attestationEcApplicable: client.attestation_ec_applicable ?? true,
    depotDgiApplicable: client.depot_dgi_applicable ?? true,
  };
}

function BooleanSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value ? "true" : "false"}
      onValueChange={(v) => onChange(v === "true")}
      disabled={disabled}
    >
      <SelectTrigger
        className={
          disabled
            ? "border-slate-500/30 bg-slate-800 text-slate-400"
            : value
            ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
            : "border-red-400/30 bg-red-500/10 text-red-100"
        }
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className={selectContentClass}>
        <SelectItem value="true">Oui</SelectItem>
        <SelectItem value="false">Non</SelectItem>
      </SelectContent>
    </Select>
  );
}

function ApplicabilitySelect({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Select
      value={value ? "true" : "false"}
      onValueChange={(v) => onChange(v === "true")}
    >
      <SelectTrigger
        className={
          value
            ? "border-sky-400/30 bg-sky-500/10 text-sky-100"
            : "border-slate-400/30 bg-slate-700 text-slate-200"
        }
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className={selectContentClass}>
        <SelectItem value="true">Applicable</SelectItem>
        <SelectItem value="false">N/A</SelectItem>
      </SelectContent>
    </Select>
  );
}

function getProgress(client: UiClient) {
  const steps = [
    { applicable: client.paiementIbpApplicable, value: client.paiementIbp },
    { applicable: client.remplissageApplicable, value: client.remplissage },
    { applicable: client.attestationEcApplicable, value: client.attestationEc },
    { applicable: client.depotDgiApplicable, value: client.depotDgi },
  ];

  const applicableSteps = steps.filter((step) => step.applicable);
  const completed = applicableSteps.filter((step) => step.value).length;
  const total = applicableSteps.length;

  return {
    completed,
    total,
    percentage: total === 0 ? 100 : Math.round((completed / total) * 100),
  };
}

function KpiCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number | string;
  subtitle: string;
}) {
  return (
    <Card className="border-white/10 bg-white/5">
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
          {title}
        </div>
        <div className="mt-2 text-3xl font-black text-white">{value}</div>
        <div className="mt-1 text-sm text-slate-400">{subtitle}</div>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const [clients, setClients] = useState<UiClient[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newClient, setNewClient] = useState<UiClient>(emptyClient);

  const refreshClients = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("clients_depot")
      .select("*")
      .order("updated_at", { ascending: false });

    if (!error) {
      setClients((data ?? []).map(mapDbClientToUi));
    } else {
      console.error("Erreur chargement clients :", error);
    }

    setLoading(false);
  };

  useEffect(() => {
    refreshClients();

    const channel = supabase
      .channel("admin-realtime-clients-monitoring")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients_depot" },
        refreshClients
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return clients;

    return clients.filter((client) => {
      return (
        client.nomClient.toLowerCase().includes(q) ||
        client.bureau.toLowerCase().includes(q) ||
        client.los.toLowerCase().includes(q) ||
        client.personInCharge.toLowerCase().includes(q)
      );
    });
  }, [clients, search]);

  const stats = useMemo(() => {
    const total = clients.length;

    const totalChecks = clients.reduce((sum, client) => {
      return (
        sum +
        Number(client.paiementIbpApplicable) +
        Number(client.remplissageApplicable) +
        Number(client.attestationEcApplicable) +
        Number(client.depotDgiApplicable)
      );
    }, 0);

    const completedChecks = clients.reduce((sum, client) => {
      return (
        sum +
        Number(client.paiementIbpApplicable && client.paiementIbp) +
        Number(client.remplissageApplicable && client.remplissage) +
        Number(client.attestationEcApplicable && client.attestationEc) +
        Number(client.depotDgiApplicable && client.depotDgi)
      );
    }, 0);

    const progress =
      totalChecks === 0 ? 100 : Math.round((completedChecks / totalChecks) * 100);

    const completedClients = clients.filter((client) => {
      const p = getProgress(client);
      return p.total > 0 && p.completed === p.total;
    }).length;

    return {
      total,
      completedClients,
      totalChecks,
      completedChecks,
      progress,
    };
  }, [clients]);

  const addClientLocal = async () => {
    if (!newClient.nomClient.trim()) return;

    setSaving(true);

    try {
      await addClientDb({
        nom_client: newClient.nomClient.trim(),
        bureau: newClient.bureau,
        los: newClient.los,
        person_in_charge: newClient.personInCharge.trim(),

        paiement_ibp: newClient.paiementIbp,
        remplissage: newClient.remplissage,
        attestation_ec: newClient.attestationEc,
        depot_dgi: newClient.depotDgi,

        paiement_ibp_applicable: newClient.paiementIbpApplicable,
        remplissage_applicable: newClient.remplissageApplicable,
        attestation_ec_applicable: newClient.attestationEcApplicable,
        depot_dgi_applicable: newClient.depotDgiApplicable,
      });

      setNewClient(emptyClient);
      await refreshClients();
    } catch (error) {
      console.error("Erreur ajout client :", error);
    } finally {
      setSaving(false);
    }
  };

  const updateClientLocal = async (id: number, patch: Partial<UiClient>) => {
    const current = clients.find((c) => c.id === id);
    if (!current) return;

    const updatedClient = {
      ...current,
      ...patch,
    };

    setClients((prev) =>
      prev.map((client) => (client.id === id ? updatedClient : client))
    );

    try {
      await updateClientDb(id, {
        nom_client: updatedClient.nomClient,
        bureau: updatedClient.bureau,
        los: updatedClient.los,
        person_in_charge: updatedClient.personInCharge,

        paiement_ibp: updatedClient.paiementIbp,
        remplissage: updatedClient.remplissage,
        attestation_ec: updatedClient.attestationEc,
        depot_dgi: updatedClient.depotDgi,

        paiement_ibp_applicable: updatedClient.paiementIbpApplicable,
        remplissage_applicable: updatedClient.remplissageApplicable,
        attestation_ec_applicable: updatedClient.attestationEcApplicable,
        depot_dgi_applicable: updatedClient.depotDgiApplicable,
      });
    } catch (error) {
      console.error("Erreur mise à jour client :", error);
      await refreshClients();
    }
  };

  const deleteClientLocal = async (id: number) => {
    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer ce client du suivi ?"
    );

    if (!confirmed) return;

    try {
      await deleteClientDb(id);
      setClients((prev) => prev.filter((client) => client.id !== id));
    } catch (error) {
      console.error("Erreur suppression client :", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-[1800px] space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-black text-white">
              Administration — Suivi dépôt états financiers
            </h1>
            <p className="mt-2 text-slate-400">
              Configuration des clients, critères applicables et avancement temps réel.
            </p>
          </div>

          <Button
            onClick={refreshClients}
            variant="secondary"
            className="w-fit"
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard title="Clients" value={stats.total} subtitle="Dossiers suivis" />
          <KpiCard
            title="Clients terminés"
            value={stats.completedClients}
            subtitle="100% des critères"
          />
          <KpiCard
            title="Critères applicables"
            value={stats.totalChecks}
            subtitle="Total à suivre"
          />
          <KpiCard
            title="Critères validés"
            value={stats.completedChecks}
            subtitle="Oui"
          />
          <KpiCard
            title="Avancement"
            value={`${stats.progress}%`}
            subtitle="Progression globale"
          />
        </div>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Building2 className="h-5 w-5" />
              Ajouter un client
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Input
                placeholder="Nom du client"
                value={newClient.nomClient}
                onChange={(e) =>
                  setNewClient((p) => ({ ...p, nomClient: e.target.value }))
                }
                className={inputClass}
              />

              <Select
                value={newClient.bureau}
                onValueChange={(v: Bureau) =>
                  setNewClient((p) => ({ ...p, bureau: v }))
                }
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Bureau" />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  <SelectItem value="Kinshasa">Kinshasa</SelectItem>
                  <SelectItem value="Lubumbashi">Lubumbashi</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={newClient.los}
                onValueChange={(v: LOS) =>
                  setNewClient((p) => ({ ...p, los: v }))
                }
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="LOS" />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  <SelectItem value="Audit">Audit</SelectItem>
                  <SelectItem value="BSO">BSO</SelectItem>
                  <SelectItem value="TAX">TAX</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Person in charge"
                value={newClient.personInCharge}
                onChange={(e) =>
                  setNewClient((p) => ({ ...p, personInCharge: e.target.value }))
                }
                className={inputClass}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 font-semibold text-white">Paiement IBP</div>
                <div className="space-y-3">
                  <ApplicabilitySelect
                    value={newClient.paiementIbpApplicable}
                    onChange={(v) =>
                      setNewClient((p) => ({ ...p, paiementIbpApplicable: v }))
                    }
                  />
                  <BooleanSelect
                    value={newClient.paiementIbp}
                    disabled={!newClient.paiementIbpApplicable}
                    onChange={(v) =>
                      setNewClient((p) => ({ ...p, paiementIbp: v }))
                    }
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 font-semibold text-white">Remplissage</div>
                <div className="space-y-3">
                  <ApplicabilitySelect
                    value={newClient.remplissageApplicable}
                    onChange={(v) =>
                      setNewClient((p) => ({ ...p, remplissageApplicable: v }))
                    }
                  />
                  <BooleanSelect
                    value={newClient.remplissage}
                    disabled={!newClient.remplissageApplicable}
                    onChange={(v) =>
                      setNewClient((p) => ({ ...p, remplissage: v }))
                    }
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 font-semibold text-white">Attestation EC</div>
                <div className="space-y-3">
                  <ApplicabilitySelect
                    value={newClient.attestationEcApplicable}
                    onChange={(v) =>
                      setNewClient((p) => ({ ...p, attestationEcApplicable: v }))
                    }
                  />
                  <BooleanSelect
                    value={newClient.attestationEc}
                    disabled={!newClient.attestationEcApplicable}
                    onChange={(v) =>
                      setNewClient((p) => ({ ...p, attestationEc: v }))
                    }
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 font-semibold text-white">Dépôt DGI</div>
                <div className="space-y-3">
                  <ApplicabilitySelect
                    value={newClient.depotDgiApplicable}
                    onChange={(v) =>
                      setNewClient((p) => ({ ...p, depotDgiApplicable: v }))
                    }
                  />
                  <BooleanSelect
                    value={newClient.depotDgi}
                    disabled={!newClient.depotDgiApplicable}
                    onChange={(v) =>
                      setNewClient((p) => ({ ...p, depotDgi: v }))
                    }
                  />
                </div>
              </div>
            </div>

            <Button onClick={addClientLocal} disabled={saving}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter le client
            </Button>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-slate-300" />
              <Input
                placeholder="Rechercher par client, bureau, LOS ou person in charge..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={inputClass}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-white">Liste des clients</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[1900px] border-collapse text-left text-sm text-white">
                <thead className="bg-slate-900 text-slate-200">
                  <tr>
                    <th className="px-4 py-4">Nom du client</th>
                    <th className="px-4 py-4">Bureau</th>
                    <th className="px-4 py-4">LOS</th>
                    <th className="px-4 py-4">PIC</th>
                    <th className="px-4 py-4">IBP applicable</th>
                    <th className="px-4 py-4">Paiement IBP</th>
                    <th className="px-4 py-4">Remplissage applicable</th>
                    <th className="px-4 py-4">Remplissage</th>
                    <th className="px-4 py-4">Attestation applicable</th>
                    <th className="px-4 py-4">Attestation EC</th>
                    <th className="px-4 py-4">DGI applicable</th>
                    <th className="px-4 py-4">Dépôt DGI</th>
                    <th className="px-4 py-4">Progression</th>
                    <th className="px-4 py-4 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td
                        colSpan={14}
                        className="px-4 py-8 text-center text-slate-400"
                      >
                        Aucun client ne correspond à votre recherche.
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((client) => {
                      const progress = getProgress(client);

                      return (
                        <tr
                          key={client.id}
                          className="border-t border-white/10 bg-slate-950/30 text-white"
                        >
                          <td className="px-4 py-4">
                            <Input
                              value={client.nomClient}
                              onChange={(e) =>
                                updateClientLocal(client.id, {
                                  nomClient: e.target.value,
                                })
                              }
                              className={`min-w-[220px] ${inputClass}`}
                            />
                          </td>

                          <td className="px-4 py-4">
                            <Select
                              value={client.bureau}
                              onValueChange={(v: Bureau) =>
                                updateClientLocal(client.id, { bureau: v })
                              }
                            >
                              <SelectTrigger className={`w-[150px] ${selectTriggerClass}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className={selectContentClass}>
                                <SelectItem value="Kinshasa">Kinshasa</SelectItem>
                                <SelectItem value="Lubumbashi">Lubumbashi</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>

                          <td className="px-4 py-4">
                            <Select
                              value={client.los}
                              onValueChange={(v: LOS) =>
                                updateClientLocal(client.id, { los: v })
                              }
                            >
                              <SelectTrigger className={`w-[120px] ${selectTriggerClass}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className={selectContentClass}>
                                <SelectItem value="Audit">Audit</SelectItem>
                                <SelectItem value="BSO">BSO</SelectItem>
                                <SelectItem value="TAX">TAX</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>

                          <td className="px-4 py-4">
                            <Input
                              value={client.personInCharge}
                              onChange={(e) =>
                                updateClientLocal(client.id, {
                                  personInCharge: e.target.value,
                                })
                              }
                              className={`min-w-[180px] ${inputClass}`}
                            />
                          </td>

                          <td className="px-4 py-4">
                            <ApplicabilitySelect
                              value={client.paiementIbpApplicable}
                              onChange={(v) =>
                                updateClientLocal(client.id, {
                                  paiementIbpApplicable: v,
                                })
                              }
                            />
                          </td>

                          <td className="px-4 py-4">
                            <BooleanSelect
                              value={client.paiementIbp}
                              disabled={!client.paiementIbpApplicable}
                              onChange={(v) =>
                                updateClientLocal(client.id, { paiementIbp: v })
                              }
                            />
                          </td>

                          <td className="px-4 py-4">
                            <ApplicabilitySelect
                              value={client.remplissageApplicable}
                              onChange={(v) =>
                                updateClientLocal(client.id, {
                                  remplissageApplicable: v,
                                })
                              }
                            />
                          </td>

                          <td className="px-4 py-4">
                            <BooleanSelect
                              value={client.remplissage}
                              disabled={!client.remplissageApplicable}
                              onChange={(v) =>
                                updateClientLocal(client.id, { remplissage: v })
                              }
                            />
                          </td>

                          <td className="px-4 py-4">
                            <ApplicabilitySelect
                              value={client.attestationEcApplicable}
                              onChange={(v) =>
                                updateClientLocal(client.id, {
                                  attestationEcApplicable: v,
                                })
                              }
                            />
                          </td>

                          <td className="px-4 py-4">
                            <BooleanSelect
                              value={client.attestationEc}
                              disabled={!client.attestationEcApplicable}
                              onChange={(v) =>
                                updateClientLocal(client.id, {
                                  attestationEc: v,
                                })
                              }
                            />
                          </td>

                          <td className="px-4 py-4">
                            <ApplicabilitySelect
                              value={client.depotDgiApplicable}
                              onChange={(v) =>
                                updateClientLocal(client.id, {
                                  depotDgiApplicable: v,
                                })
                              }
                            />
                          </td>

                          <td className="px-4 py-4">
                            <BooleanSelect
                              value={client.depotDgi}
                              disabled={!client.depotDgiApplicable}
                              onChange={(v) =>
                                updateClientLocal(client.id, { depotDgi: v })
                              }
                            />
                          </td>

                          <td className="px-4 py-4 text-slate-100">
                            {progress.completed}/{progress.total} —{" "}
                            {progress.percentage}%
                          </td>

                          <td className="px-4 py-4 text-right">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteClientLocal(client.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}