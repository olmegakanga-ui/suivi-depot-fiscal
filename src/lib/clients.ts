import { supabase } from "./supabase";

export type Bureau = "Kinshasa" | "Lubumbashi";
export type LOS = "Audit" | "BSO" | "TAX";

export type ClientRecord = {
  id: number;
  nom_client: string;
  bureau: Bureau;
  los: LOS;
  person_in_charge: string | null;

  paiement_ibp: boolean;
  remplissage: boolean;
  attestation_ec: boolean;
  depot_dgi: boolean;

  paiement_ibp_applicable: boolean;
  remplissage_applicable: boolean;
  attestation_ec_applicable: boolean;
  depot_dgi_applicable: boolean;

  created_at?: string;
  updated_at?: string;
};

export async function addClient(payload: Partial<ClientRecord>) {
  const { data, error } = await supabase
    .from("clients_depot")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data as ClientRecord;
}

export async function updateClient(id: number, patch: Partial<ClientRecord>) {
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
  const { error } = await supabase.from("clients_depot").delete().eq("id", id);
  if (error) throw error;
}