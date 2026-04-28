"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  Expand,
  FileCheck2,
  Landmark,
  TrendingUp,
  WalletCards,
  XCircle,
} from "lucide-react";

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

const TIMEZONE = "Africa/Kinshasa";
const DEADLINE = "2026-04-30T23:59:59+01:00";

function mapDbClientToUi(client: any): UiClient {
  return {
    id: client.id,
    nomClient: client.nom_client,
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

function getClientProgress(client: UiClient) {
  const steps = [
    {
      applicable: client.paiementIbpApplicable,
      value: client.paiementIbp,
    },
    {
      applicable: client.remplissageApplicable,
      value: client.remplissage,
    },
    {
      applicable: client.attestationEcApplicable,
      value: client.attestationEc,
    },
    {
      applicable: client.depotDgiApplicable,
      value: client.depotDgi,
    },
  ];

  const applicableSteps = steps.filter((step) => step.applicable);
  const completed = applicableSteps.filter((step) => step.value).length;
  const total = applicableSteps.length;

  return {
    completed,
    total,
    percentage: total === 0 ? 100 : Math.round((completed / total) * 100),
    isCritical: total > 0 && completed < total,
  };
}

function formatNowInKinshasa(date = new Date()) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function getRemaining(targetDate: string) {
  const diff = new Date(targetDate).getTime() - new Date().getTime();

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

  const totalSeconds = Math.floor(diff / 1000);

  return {
    days: Math.floor(totalSeconds / (24 * 3600)),
    hours: Math.floor((totalSeconds % (24 * 3600)) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function StepBadge({
  applicable,
  value,
}: {
  applicable: boolean;
  value: boolean;
}) {
  if (!applicable) {
    return (
      <div className="mx-auto flex min-w-[92px] items-center justify-center rounded-full border border-slate-300/30 bg-slate-500/20 px-4 py-2 font-bold text-slate-200">
        N/A
      </div>
    );
  }

  return value ? (
    <div className="mx-auto flex min-w-[92px] items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-500/25 px-4 py-2 font-bold text-emerald-100">
      <CheckCircle2 className="mr-2 h-4 w-4" />
      Oui
    </div>
  ) : (
    <div className="mx-auto flex min-w-[92px] items-center justify-center rounded-full border border-red-300/40 bg-red-500/25 px-4 py-2 font-bold text-red-100">
      <XCircle className="mr-2 h-4 w-4" />
      Non
    </div>
  );
}

function ClientProgress({ client }: { client: UiClient }) {
  const progress = getClientProgress(client);

  return (
    <div className="min-w-[150px]">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span
          className={
            progress.completed === progress.total
              ? "font-bold text-emerald-100"
              : "font-bold text-amber-100"
          }
        >
          {progress.completed}/{progress.total}
        </span>
        <span className="text-slate-100/80">{progress.percentage}%</span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={
            progress.percentage === 100
              ? "h-full rounded-full bg-emerald-400 transition-all duration-700"
              : progress.percentage >= 50
              ? "h-full rounded-full bg-amber-300 transition-all duration-700"
              : "h-full rounded-full bg-red-400 transition-all duration-700"
          }
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Card className="rounded-3xl border-white/15 bg-slate-900/55 shadow-2xl backdrop-blur-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-slate-200">
              {title}
            </div>
            <div className={`mt-2 text-3xl font-black ${accent}`}>{value}</div>
            <div className="mt-1 text-sm text-slate-100/80">{subtitle}</div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ExecutiveSummary({ clients }: { clients: UiClient[] }) {
  const stats = useMemo(() => {
    const total = clients.length;

    const applicableIbp = clients.filter((c) => c.paiementIbpApplicable);
    const applicableRemplissage = clients.filter((c) => c.remplissageApplicable);
    const applicableAttestation = clients.filter((c) => c.attestationEcApplicable);
    const applicableDepot = clients.filter((c) => c.depotDgiApplicable);

    const paiementOk = applicableIbp.filter((c) => c.paiementIbp).length;
    const remplissageOk = applicableRemplissage.filter((c) => c.remplissage).length;
    const attestationOk = applicableAttestation.filter((c) => c.attestationEc).length;
    const depotOk = applicableDepot.filter((c) => c.depotDgi).length;

    const critical = clients.filter((c) => getClientProgress(c).isCritical).length;

    const totalChecks =
      applicableIbp.length +
      applicableRemplissage.length +
      applicableAttestation.length +
      applicableDepot.length;

    const completedChecks =
      paiementOk + remplissageOk + attestationOk + depotOk;

    const completionRate =
      totalChecks === 0 ? 100 : Math.round((completedChecks / totalChecks) * 100);

    return {
      total,
      paiementOk,
      remplissageOk,
      attestationOk,
      depotOk,
      critical,
      completionRate,
    };
  }, [clients]);

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-7">
      <KpiCard
        title="Clients"
        value={stats.total}
        subtitle="Dossiers filtrés"
        icon={<Building2 className="h-6 w-6" />}
        accent="text-white"
      />
      <KpiCard
        title="Paiement IBP"
        value={stats.paiementOk}
        subtitle="Validés"
        icon={<WalletCards className="h-6 w-6" />}
        accent="text-emerald-200"
      />
      <KpiCard
        title="Remplissage"
        value={stats.remplissageOk}
        subtitle="Complétés"
        icon={<FileCheck2 className="h-6 w-6" />}
        accent="text-sky-200"
      />
      <KpiCard
        title="Attestation EC"
        value={stats.attestationOk}
        subtitle="Obtenues"
        icon={<CheckCircle2 className="h-6 w-6" />}
        accent="text-violet-200"
      />
      <KpiCard
        title="Dépôt DGI"
        value={stats.depotOk}
        subtitle="Effectués"
        icon={<Landmark className="h-6 w-6" />}
        accent="text-amber-100"
      />
      <KpiCard
        title="Retards"
        value={stats.critical}
        subtitle="Dossiers incomplets"
        icon={<AlertTriangle className="h-6 w-6" />}
        accent="text-red-200"
      />
      <KpiCard
        title="Avancement"
        value={`${stats.completionRate}%`}
        subtitle="Progression"
        icon={<TrendingUp className="h-6 w-6" />}
        accent="text-emerald-200"
      />
    </div>
  );
}

function CountdownMini() {
  const [remaining, setRemaining] = useState(getRemaining(DEADLINE));

  useEffect(() => {
    const id = setInterval(() => setRemaining(getRemaining(DEADLINE)), 1000);
    return () => clearInterval(id);
  }, []);

  const items = [
    { label: "Jours", value: remaining.days },
    { label: "Heures", value: remaining.hours },
    { label: "Minutes", value: remaining.minutes },
    { label: "Secondes", value: remaining.seconds },
  ];

  return (
    <Card className="relative overflow-hidden rounded-3xl border-2 border-red-400/70 bg-red-950/90 shadow-[0_0_55px_rgba(239,68,68,0.65)] backdrop-blur-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.35),transparent_45%)]" />
      <div className="absolute -right-16 -top-16 h-48 w-48 animate-spin rounded-full border-[18px] border-red-500/30 border-t-red-300/90 blur-[1px]" />
      <div className="absolute -left-20 bottom-0 h-56 w-56 animate-pulse rounded-full bg-red-500/25 blur-3xl" />

      <CardContent className="relative z-10 p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-300 bg-red-600 shadow-[0_0_35px_rgba(239,68,68,0.95)]">
              <div className="absolute h-20 w-20 animate-ping rounded-full bg-red-500/40" />
              <AlertTriangle className="relative z-10 h-9 w-9 text-white drop-shadow-[0_0_12px_rgba(255,255,255,1)]" />
            </div>

            <div>
              <div className="text-2xl font-black uppercase tracking-wide text-white drop-shadow-[0_4px_10px_rgba(0,0,0,1)]">
                Alerte échéance fiscale
              </div>
              <div className="mt-1 text-base font-bold text-red-100 drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
                Clôture le 30 avril 2026 à 23:59
              </div>
            </div>
          </div>

          <div className="rounded-full border border-red-200/50 bg-red-500/25 px-4 py-2 text-sm font-black uppercase tracking-[0.22em] text-red-50 shadow-[0_0_24px_rgba(239,68,68,0.75)]">
            Urgence
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 text-center">
          {items.map((item) => (
            <div
              key={item.label}
              className="animate-[pulse_1.4s_ease-in-out_infinite] rounded-3xl border border-red-300/60 bg-black/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_32px_rgba(127,29,29,0.75)]"
            >
              <div className="animate-[bounce_1.8s_infinite] text-5xl font-black leading-none text-red-200 drop-shadow-[0_0_16px_rgba(248,113,113,1)] xl:text-6xl">
                {pad(item.value)}
              </div>
              <div className="mt-3 text-[12px] font-black uppercase tracking-[0.22em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
                {item.label}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-full border border-red-300/40 bg-black/40 p-1">
          <div className="h-2 animate-pulse rounded-full bg-gradient-to-r from-red-700 via-red-300 to-white shadow-[0_0_22px_rgba(248,113,113,1)]" />
        </div>
      </CardContent>
    </Card>
  );
}

function FiltersPanel({
  bureauFilter,
  setBureauFilter,
  losFilter,
  setLosFilter,
  picFilter,
  setPicFilter,
  paiementFilter,
  setPaiementFilter,
  remplissageFilter,
  setRemplissageFilter,
  attestationFilter,
  setAttestationFilter,
  depotFilter,
  setDepotFilter,
  criticalOnly,
  setCriticalOnly,
  picOptions,
  filteredCount,
  totalCount,
}: {
  bureauFilter: string;
  setBureauFilter: (v: string) => void;
  losFilter: string;
  setLosFilter: (v: string) => void;
  picFilter: string;
  setPicFilter: (v: string) => void;
  paiementFilter: string;
  setPaiementFilter: (v: string) => void;
  remplissageFilter: string;
  setRemplissageFilter: (v: string) => void;
  attestationFilter: string;
  setAttestationFilter: (v: string) => void;
  depotFilter: string;
  setDepotFilter: (v: string) => void;
  criticalOnly: boolean;
  setCriticalOnly: (v: boolean) => void;
  picOptions: string[];
  filteredCount: number;
  totalCount: number;
}) {
  const reset = () => {
    setBureauFilter("all");
    setLosFilter("all");
    setPicFilter("all");
    setPaiementFilter("all");
    setRemplissageFilter("all");
    setAttestationFilter("all");
    setDepotFilter("all");
    setCriticalOnly(false);
  };

  return (
    <Card className="rounded-[2rem] border-white/15 bg-slate-900/55 shadow-2xl backdrop-blur-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-4 text-xl text-white xl:text-2xl">
          <span>Filtres de suivi</span>

          <button
            onClick={() => setCriticalOnly(!criticalOnly)}
            className={
              criticalOnly
                ? "rounded-2xl border border-red-300/40 bg-red-500/25 px-4 py-2 text-sm font-bold text-red-100 transition hover:bg-red-500/35"
                : "rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
            }
          >
            <AlertTriangle className="mr-2 inline h-4 w-4" />
            Retards critiques
          </button>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          <Select value={bureauFilter} onValueChange={setBureauFilter}>
            <SelectTrigger className="border-white/15 bg-white/10 text-white">
              <SelectValue placeholder="Bureau" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous bureaux</SelectItem>
              <SelectItem value="Kinshasa">Kinshasa</SelectItem>
              <SelectItem value="Lubumbashi">Lubumbashi</SelectItem>
            </SelectContent>
          </Select>

          <Select value={losFilter} onValueChange={setLosFilter}>
            <SelectTrigger className="border-white/15 bg-white/10 text-white">
              <SelectValue placeholder="LOS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes LOS</SelectItem>
              <SelectItem value="Audit">Audit</SelectItem>
              <SelectItem value="BSO">BSO</SelectItem>
              <SelectItem value="TAX">TAX</SelectItem>
            </SelectContent>
          </Select>

          <Select value={picFilter} onValueChange={setPicFilter}>
            <SelectTrigger className="border-white/15 bg-white/10 text-white">
              <SelectValue placeholder="PIC" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous PIC</SelectItem>
              {picOptions.map((pic) => (
                <SelectItem key={pic} value={pic}>
                  {pic}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={paiementFilter} onValueChange={setPaiementFilter}>
            <SelectTrigger className="border-white/15 bg-white/10 text-white">
              <SelectValue placeholder="Paiement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Paiement IBP</SelectItem>
              <SelectItem value="true">Oui</SelectItem>
              <SelectItem value="false">Non</SelectItem>
            </SelectContent>
          </Select>

          <Select value={remplissageFilter} onValueChange={setRemplissageFilter}>
            <SelectTrigger className="border-white/15 bg-white/10 text-white">
              <SelectValue placeholder="Remplissage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Remplissage</SelectItem>
              <SelectItem value="true">Oui</SelectItem>
              <SelectItem value="false">Non</SelectItem>
            </SelectContent>
          </Select>

          <Select value={attestationFilter} onValueChange={setAttestationFilter}>
            <SelectTrigger className="border-white/15 bg-white/10 text-white">
              <SelectValue placeholder="Attestation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Attestation EC</SelectItem>
              <SelectItem value="true">Oui</SelectItem>
              <SelectItem value="false">Non</SelectItem>
            </SelectContent>
          </Select>

          <Select value={depotFilter} onValueChange={setDepotFilter}>
            <SelectTrigger className="border-white/15 bg-white/10 text-white">
              <SelectValue placeholder="Dépôt DGI" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Dépôt DGI</SelectItem>
              <SelectItem value="true">Oui</SelectItem>
              <SelectItem value="false">Non</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="text-sm text-slate-100/80">
            Résultat :{" "}
            <span className="font-bold text-white">{filteredCount}</span> sur{" "}
            <span className="font-bold text-white">{totalCount}</span> client(s)
          </div>

          <button
            onClick={reset}
            className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20"
          >
            Réinitialiser
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function MonitoringTable({ clients }: { clients: UiClient[] }) {
  const orderedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const aProgress = getClientProgress(a);
      const bProgress = getClientProgress(b);

      return (
        aProgress.completed - bProgress.completed ||
        Number(a.depotDgi) - Number(b.depotDgi) ||
        a.nomClient.localeCompare(b.nomClient)
      );
    });
  }, [clients]);

  return (
    <Card className="rounded-[2rem] border-white/15 bg-slate-900/60 shadow-2xl backdrop-blur-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-3 text-2xl text-white">
          <div className="flex items-center gap-3">
            <FileCheck2 className="h-7 w-7 text-sky-200" />
            Tableau de suivi en temps réel
          </div>

          <Badge className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-base text-white">
            {orderedClients.length} clients
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[60vh] pr-3">
          <div className="overflow-hidden rounded-3xl border border-white/20">
            <table className="w-full border-collapse text-left text-base xl:text-lg">
              <thead className="sticky top-0 z-10 bg-slate-950/95 text-white backdrop-blur-md">
                <tr>
                  <th className="px-5 py-5 font-black">Nom du client</th>
                  <th className="px-5 py-5 font-black">Bureau</th>
                  <th className="px-5 py-5 font-black">LOS</th>
                  <th className="px-5 py-5 font-black">Person in charge</th>
                  <th className="px-5 py-5 text-center font-black">Paiement IBP</th>
                  <th className="px-5 py-5 text-center font-black">Remplissage</th>
                  <th className="px-5 py-5 text-center font-black">Attestation EC</th>
                  <th className="px-5 py-5 text-center font-black">Dépôt DGI</th>
                  <th className="px-5 py-5 text-center font-black">Progression</th>
                </tr>
              </thead>

              <tbody>
                {orderedClients.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-xl text-slate-200">
                      Aucun client ne correspond au filtre sélectionné.
                    </td>
                  </tr>
                ) : (
                  orderedClients.map((client, index) => (
                    <motion.tr
                      key={client.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.015, 0.3) }}
                      className="border-t border-white/10 bg-slate-900/35 text-white transition hover:bg-white/10"
                    >
                      <td className="max-w-[340px] px-5 py-5 font-bold">
                        <div className="truncate">{client.nomClient}</div>
                      </td>

                      <td className="px-5 py-5">
                        <Badge className="rounded-full border border-sky-200/30 bg-sky-500/20 px-4 py-2 text-sky-100">
                          {client.bureau}
                        </Badge>
                      </td>

                      <td className="px-5 py-5">
                        <Badge className="rounded-full border border-violet-200/30 bg-violet-500/20 px-4 py-2 text-violet-100">
                          {client.los}
                        </Badge>
                      </td>

                      <td className="max-w-[260px] px-5 py-5 text-slate-100">
                        <div className="truncate">
                          {client.personInCharge || "Non renseigné"}
                        </div>
                      </td>

                      <td className="px-5 py-5 text-center">
                        <StepBadge
                          applicable={client.paiementIbpApplicable}
                          value={client.paiementIbp}
                        />
                      </td>

                      <td className="px-5 py-5 text-center">
                        <StepBadge
                          applicable={client.remplissageApplicable}
                          value={client.remplissage}
                        />
                      </td>

                      <td className="px-5 py-5 text-center">
                        <StepBadge
                          applicable={client.attestationEcApplicable}
                          value={client.attestationEc}
                        />
                      </td>

                      <td className="px-5 py-5 text-center">
                        <StepBadge
                          applicable={client.depotDgiApplicable}
                          value={client.depotDgi}
                        />
                      </td>

                      <td className="px-5 py-5 text-center">
                        <ClientProgress client={client} />
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default function TvPage() {
  const [clients, setClients] = useState<UiClient[]>([]);
  const [now, setNow] = useState(new Date());

  const [bureauFilter, setBureauFilter] = useState("all");
  const [losFilter, setLosFilter] = useState("all");
  const [picFilter, setPicFilter] = useState("all");
  const [paiementFilter, setPaiementFilter] = useState("all");
  const [remplissageFilter, setRemplissageFilter] = useState("all");
  const [attestationFilter, setAttestationFilter] = useState("all");
  const [depotFilter, setDepotFilter] = useState("all");
  const [criticalOnly, setCriticalOnly] = useState(false);

  const enterFullscreen = async () => {
    const elem = document.documentElement;
    if (document.fullscreenElement) return;

    try {
      await elem.requestFullscreen();
    } catch (error) {
      console.error("Impossible de passer en plein écran :", error);
    }
  };

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
      .channel("tv-realtime-clients-monitoring")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients_depot" },
        refreshClients
      )
      .subscribe();

    const timer = setInterval(() => setNow(new Date()), 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, []);

  const picOptions = useMemo(() => {
    return Array.from(
      new Set(
        clients
          .map((client) => client.personInCharge)
          .filter((pic) => pic && pic.trim() !== "")
      )
    ).sort();
  }, [clients]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (bureauFilter !== "all" && client.bureau !== bureauFilter) return false;
      if (losFilter !== "all" && client.los !== losFilter) return false;
      if (picFilter !== "all" && client.personInCharge !== picFilter) return false;

      if (
        paiementFilter !== "all" &&
        client.paiementIbpApplicable &&
        String(client.paiementIbp) !== paiementFilter
      )
        return false;

      if (
        remplissageFilter !== "all" &&
        client.remplissageApplicable &&
        String(client.remplissage) !== remplissageFilter
      )
        return false;

      if (
        attestationFilter !== "all" &&
        client.attestationEcApplicable &&
        String(client.attestationEc) !== attestationFilter
      )
        return false;

      if (
        depotFilter !== "all" &&
        client.depotDgiApplicable &&
        String(client.depotDgi) !== depotFilter
      )
        return false;

      if (criticalOnly && !getClientProgress(client).isCritical) return false;

      return true;
    });
  }, [
    clients,
    bureauFilter,
    losFilter,
    picFilter,
    paiementFilter,
    remplissageFilter,
    attestationFilter,
    depotFilter,
    criticalOnly,
  ]);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden text-white">
      <div className="absolute inset-0">
        <Image
          src="/bg-bdo-tv.png"
          alt="Fond BDO TV"
          fill
          priority
          className="object-cover"
        />
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.25),rgba(15,23,42,0.62))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.10),transparent_26%),radial-gradient(circle_at_center,rgba(59,130,246,0.10),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(220,38,38,0.10),transparent_26%)]" />

      <div className="relative z-10 min-h-screen p-5 xl:p-8 2xl:p-10">
        <div className="mb-5 flex items-center justify-between gap-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-white/20 bg-white/95 shadow-xl xl:h-20 xl:w-20">
              <Image
                src="/logo-bdo.png"
                alt="Logo BDO"
                width={120}
                height={120}
                className="h-full w-full object-contain p-2"
                priority
              />
            </div>

            <div className="min-w-0">
              <div className="truncate text-2xl font-black tracking-tight text-white xl:text-4xl">
                BDO RDC — Suivi Dépôt États Financiers
              </div>
              <div className="text-sm text-slate-50/95 xl:text-lg">
                Suivi temps réel : IBP • Remplissage • Attestation EC • Dépôt DGI
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={enterFullscreen}
              className="rounded-2xl border border-white/20 bg-slate-900/55 px-4 py-3 text-white backdrop-blur-md transition hover:bg-slate-900/70"
            >
              <div className="flex items-center gap-2">
                <Expand className="h-4 w-4" />
                <span className="text-sm xl:text-base">Plein écran</span>
              </div>
            </button>

            <div className="rounded-2xl border border-white/20 bg-slate-900/55 px-5 py-3 text-right backdrop-blur-md">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-100/80 xl:text-sm">
                Heure locale
              </div>
              <div className="mt-1 text-sm font-medium text-white xl:text-lg">
                {formatNowInKinshasa(now)}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_0.42fr]">
          <ExecutiveSummary clients={filteredClients} />
          <CountdownMini />
        </div>

        <div className="mb-5">
          <FiltersPanel
            bureauFilter={bureauFilter}
            setBureauFilter={setBureauFilter}
            losFilter={losFilter}
            setLosFilter={setLosFilter}
            picFilter={picFilter}
            setPicFilter={setPicFilter}
            paiementFilter={paiementFilter}
            setPaiementFilter={setPaiementFilter}
            remplissageFilter={remplissageFilter}
            setRemplissageFilter={setRemplissageFilter}
            attestationFilter={attestationFilter}
            setAttestationFilter={setAttestationFilter}
            depotFilter={depotFilter}
            setDepotFilter={setDepotFilter}
            criticalOnly={criticalOnly}
            setCriticalOnly={setCriticalOnly}
            picOptions={picOptions}
            filteredCount={filteredClients.length}
            totalCount={clients.length}
          />
        </div>

        <MonitoringTable clients={filteredClients} />
      </div>
    </div>
  );
}