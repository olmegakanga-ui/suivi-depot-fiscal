"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import {
  addClient as addClientDb,
  deleteClient as deleteClientDb,
  updateClient as updateClientDb,
} from "@/lib/clients";

type ClientStatus = "not_submitted" | "pending" | "submitted";

type UiClient = {
  id: number;
  name: string;
  owner: string;
  status: ClientStatus;
  notes: string;
};

function mapDbClientToUi(client: any): UiClient {
  return {
    id: client.id,
    name: client.nom_client,
    owner: client.pole ?? "",
    status: client.statut,
    notes: client.notes ?? "",
  };
}

export default function AdminPage() {
  const [clients, setClients] = useState<UiClient[]>([]);
  const [saving, setSaving] = useState(false);
  const [newClient, setNewClient] = useState<UiClient>({
    id: 0,
    name: "",
    owner: "",
    status: "not_submitted",
    notes: "",
  });

  useEffect(() => {
    async function refreshClients() {
      const { data, error } = await supabase
        .from("clients_depot")
        .select("*")
        .order("updated_at", { ascending: false });

      if (!error) {
        setClients((data ?? []).map(mapDbClientToUi));
      }
    }

    refreshClients();

    const channel = supabase
      .channel("admin-realtime-clients")
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

  const updateClientLocal = async (id: number, patch: Partial<UiClient>) => {
    const current = clients.find((c) => c.id === id);
    if (!current) return;

    const payload = {
      nom_client: patch.name ?? current.name,
      pole: patch.owner ?? current.owner,
      statut: (patch.status ?? current.status) as ClientStatus,
      notes: patch.notes ?? current.notes,
    };

    const updated = await updateClientDb(id, payload);
    setClients((prev) => prev.map((c) => (c.id === id ? mapDbClientToUi(updated) : c)));
  };

  const addClientLocal = async () => {
    if (!newClient.name.trim()) return;

    setSaving(true);
    try {
      const created = await addClientDb({
        nom_client: newClient.name.trim(),
        pole: newClient.owner.trim(),
        statut: newClient.status,
        notes: newClient.notes.trim(),
      });

      setClients((prev) => [mapDbClientToUi(created), ...prev]);
      setNewClient({
        id: 0,
        name: "",
        owner: "",
        status: "not_submitted",
        notes: "",
      });
    } finally {
      setSaving(false);
    }
  };

  const removeClient = async (id: number) => {
    await deleteClientDb(id);
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-black">Administration — Dépôt des états financiers</h1>
          <p className="mt-2 text-slate-400">
            Cette page est réservée à la mise à jour des statuts visibles sur les TV.
          </p>
        </div>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Ajouter un client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Nom du client"
                value={newClient.name}
                onChange={(e) => setNewClient((p) => ({ ...p, name: e.target.value }))}
                className="border-white/10 bg-white/5"
              />
              <Input
                placeholder="Pôle / équipe"
                value={newClient.owner}
                onChange={(e) => setNewClient((p) => ({ ...p, owner: e.target.value }))}
                className="border-white/10 bg-white/5"
              />
            </div>

            <Select
              value={newClient.status}
              onValueChange={(v: ClientStatus) => setNewClient((p) => ({ ...p, status: v }))}
            >
              <SelectTrigger className="border-white/10 bg-white/5">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_submitted">Non déposé</SelectItem>
                <SelectItem value="pending">En attente du dépôt</SelectItem>
                <SelectItem value="submitted">Déjà déposé</SelectItem>
              </SelectContent>
            </Select>

            <Textarea
              placeholder="Notes"
              value={newClient.notes}
              onChange={(e) => setNewClient((p) => ({ ...p, notes: e.target.value }))}
              className="border-white/10 bg-white/5"
            />

            <Button onClick={addClientLocal} disabled={saving}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter le client
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {clients.map((client) => (
            <Card key={client.id} className="border-white/10 bg-white/5">
              <CardContent className="space-y-4 p-5">
                <Input
                  value={client.name}
                  onChange={(e) => updateClientLocal(client.id, { name: e.target.value })}
                  className="border-white/10 bg-white/5"
                />

                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    value={client.owner}
                    onChange={(e) => updateClientLocal(client.id, { owner: e.target.value })}
                    className="border-white/10 bg-white/5"
                  />

                  <Select
                    value={client.status}
                    onValueChange={(v: ClientStatus) =>
                      updateClientLocal(client.id, { status: v })
                    }
                  >
                    <SelectTrigger className="border-white/10 bg-white/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_submitted">Non déposé</SelectItem>
                      <SelectItem value="pending">En attente du dépôt</SelectItem>
                      <SelectItem value="submitted">Déjà déposé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Textarea
                  value={client.notes}
                  onChange={(e) => updateClientLocal(client.id, { notes: e.target.value })}
                  className="border-white/10 bg-white/5"
                />

                <div className="flex justify-end">
                  <Button variant="destructive" onClick={() => removeClient(client.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}