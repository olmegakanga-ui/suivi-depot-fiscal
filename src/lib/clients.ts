import { supabase } from "./supabase";

export type ClientStatus = "not_submitted" | "pending" | "submitted";

export type ClientRecord = {
  id: number;
  nom_client: string;
  pole: string | null;
  statut: ClientStatus;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function getClients() {
  const { data, error } = await supabase
    .from("clients_depot")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data as ClientRecord[];
}

export async function addClient(payload: {
  nom_client: string;
  pole?: string;
  statut: ClientStatus;
  notes?: string;
}) {
  const { data, error } = await supabase
    .from("clients_depot")
    .insert([
      {
        nom_client: payload.nom_client,
        pole: payload.pole ?? null,
        statut: payload.statut,
        notes: payload.notes ?? null,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as ClientRecord;
}

export async function updateClient(
  id: number,
  patch: {
    nom_client?: string;
    pole?: string;
    statut?: ClientStatus;
    notes?: string;
  }
) {
  const { data, error } = await supabase
    .from("clients_depot")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ClientRecord;
}

export async function deleteClient(id: number) {
  const { error } = await supabase
    .from("clients_depot")
    .delete()
    .eq("id", id);

  if (error) throw error;
}