"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  Expand,
  FileWarning,
  Target,
  TimerReset,
  TrendingUp,
  LayoutDashboard,
  Rows3,
} from "lucide-react";

const TIMEZONE = "Africa/Kinshasa";
const DEADLINE = "2026-04-30T23:59:59+01:00";
const TRACKING_START = "2026-04-30T00:01:00+01:00";
const VIEW_ROTATION_MS = 12000;

type ClientStatus = "not_submitted" | "pending" | "submitted";
type ViewMode = "executive" | "detailed";

type UiClient = {
  id: number;
  name: string;
  owner: string;
  status: ClientStatus;
  notes: string;
};

const statusMeta: Record<
  ClientStatus,
  {
    label: string;
    badge: string;
    card: string;
    dot: string;
  }
> = {
  not_submitted: {
    label: "Non déposé",
    badge: "bg-red-500/15 text-red-200 border-red-400/30",
    card: "border-red-400/20 bg-red-500/10",
    dot: "bg-red-400",
  },
  pending: {
    label: "En attente du dépôt",
    badge: "bg-amber-500/15 text-amber-100 border-amber-400/30",
    card: "border-amber-400/20 bg-amber-500/10",
    dot: "bg-amber-300",
  },
  submitted: {
    label: "Déjà déposé",
    badge: "bg-emerald-500/15 text-emerald-100 border-emerald-400/30",
    card: "border-emerald-400/20 bg-emerald-500/10",
    dot: "bg-emerald-300",
  },
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
  const now = new Date();
  const diff = new Date(targetDate).getTime() - now.getTime();

  if (diff <= 0) {
    return {
      total: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      expired: true,
    };
  }

  const totalSeconds = Math.floor(diff / 1000);

  return {
    total: diff,
    days: Math.floor(totalSeconds / (24 * 3600)),
    hours: Math.floor((totalSeconds % (24 * 3600)) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: false,
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <Card className="rounded-3xl border-white/15 bg-slate-900/55 shadow-2xl backdrop-blur-md">
      <CardContent className="p-6 xl:p-8">
        <div className="text-sm uppercase tracking-[0.25em] text-slate-100 xl:text-base">
          {label}
        </div>
        <div className={`mt-3 text-5xl font-black xl:text-7xl 2xl:text-8xl ${accent}`}>
          {pad(value)}
        </div>
      </CardContent>
    </Card>
  );
}

function CountdownBoard() {
  const [remaining, setRemaining] = useState(getRemaining(DEADLINE));

  useEffect(() => {
    const id = setInterval(() => setRemaining(getRemaining(DEADLINE)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center gap-3 text-white xl:mb-10">
        <Clock3 className="h-8 w-8" />
        <div>
          <div className="text-2xl font-semibold xl:text-3xl">
            {remaining.expired ? "Échéance atteinte" : "Compte à rebours avant clôture fiscale"}
          </div>
          <div className="text-base text-slate-100 xl:text-lg">
            Date limite : 30 avril 2026 à 23:59 (heure de Kinshasa)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4 xl:gap-6">
        <MetricCard label="Jours" value={remaining.days} accent="text-white" />
        <MetricCard label="Heures" value={remaining.hours} accent="text-sky-200" />
        <MetricCard label="Minutes" value={remaining.minutes} accent="text-violet-200" />
        <MetricCard label="Secondes" value={remaining.seconds} accent="text-red-200" />
      </div>
    </div>
  );
}

function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <Card className="rounded-3xl border-white/15 bg-slate-900/55 shadow-2xl backdrop-blur-md xl:col-span-5">
      <CardContent className="p-5 xl:p-6">
        <div className="mb-3 flex items-center justify-between text-sm text-white xl:text-base">
          <span>Progression globale</span>
          <span className="font-bold">{percentage}%</span>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-400 via-sky-300 to-emerald-300 transition-all duration-700"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </CardContent>
    </Card>
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
      <CardContent className="p-5 xl:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-slate-200 xl:text-sm">
              {title}
            </div>
            <div className={`mt-2 text-3xl font-black xl:text-4xl ${accent}`}>{value}</div>
            <div className="mt-1 text-sm text-slate-100/80 xl:text-base">{subtitle}</div>
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
    const submitted = clients.filter((c) => c.status === "submitted").length;
    const pending = clients.filter((c) => c.status === "pending").length;
    const notSubmitted = clients.filter((c) => c.status === "not_submitted").length;
    const completionRate = total === 0 ? 0 : Math.round((submitted / total) * 100);

    return {
      total,
      submitted,
      pending,
      notSubmitted,
      completionRate,
    };
  }, [clients]);

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
      <KpiCard
        title="Total dossiers"
        value={stats.total}
        subtitle="Portefeuille suivi"
        icon={<Building2 className="h-6 w-6" />}
        accent="text-white"
      />
      <KpiCard
        title="Déjà déposés"
        value={stats.submitted}
        subtitle="Dossiers clôturés"
        icon={<CheckCircle2 className="h-6 w-6" />}
        accent="text-emerald-200"
      />
      <KpiCard
        title="En attente"
        value={stats.pending}
        subtitle="Prêts ou en cours"
        icon={<TimerReset className="h-6 w-6" />}
        accent="text-amber-100"
      />
      <KpiCard
        title="Non déposés"
        value={stats.notSubmitted}
        subtitle="Points critiques"
        icon={<AlertTriangle className="h-6 w-6" />}
        accent="text-red-200"
      />
      <KpiCard
        title="Taux d’avancement"
        value={`${stats.completionRate}%`}
        subtitle="Progression globale"
        icon={<TrendingUp className="h-6 w-6" />}
        accent="text-sky-200"
      />

      <ProgressBar percentage={stats.completionRate} />

      {stats.notSubmitted > 5 && (
        <Card className="rounded-3xl border-red-400/30 bg-red-500/10 backdrop-blur-md xl:col-span-5">
          <CardContent className="p-4 text-white">
            ⚠️ Attention : plusieurs dossiers critiques restent non déposés.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PriorityStrip({ clients }: { clients: UiClient[] }) {
  const urgentClients = useMemo(() => {
    return clients
      .filter((c) => c.status !== "submitted")
      .sort((a, b) => {
        const order = { not_submitted: 0, pending: 1, submitted: 2 };
        return order[a.status] - order[b.status] || a.name.localeCompare(b.name);
      });
  }, [clients]);

  if (urgentClients.length === 0) {
    return (
      <Card className="rounded-[2rem] border-emerald-300/30 bg-emerald-500/10 backdrop-blur-md">
        <CardContent className="flex items-center gap-3 p-6">
          <CheckCircle2 className="h-6 w-6 text-emerald-200" />
          <div>
            <div className="text-lg font-bold text-emerald-100 xl:text-xl">
              Tous les dossiers visibles sont déposés
            </div>
            <div className="text-sm text-emerald-100/80 xl:text-base">
              Aucun dossier critique à afficher pour le moment.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-[2rem] border-white/15 bg-slate-900/55 backdrop-blur-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-xl text-white xl:text-2xl">
          <FileWarning className="h-6 w-6 text-red-200" />
          Bandeau de vigilance opérationnelle
        </CardTitle>
      </CardHeader>

      <CardContent className="pb-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-slate-950/35 py-4">
          <motion.div
            className="flex gap-4 px-4"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
          >
            {[...urgentClients, ...urgentClients].map((client, index) => {
              const meta = statusMeta[client.status];
              return (
                <div
                  key={`${client.id}-${index}`}
                  className={`min-w-[320px] rounded-2xl border px-4 py-3 ${meta.card}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate text-base font-bold text-white xl:text-lg">
                      {client.name}
                    </div>
                    <Badge className={`rounded-full border px-3 py-1 text-xs ${meta.badge}`}>
                      {meta.label}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-slate-100/85">
                    {client.owner || "Pôle non renseigné"}
                  </div>
                  {client.notes ? (
                    <div className="mt-2 line-clamp-2 text-sm text-slate-50/90">
                      {client.notes}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusColumn({
  title,
  icon,
  clients,
  status,
}: {
  title: string;
  icon: React.ReactNode;
  clients: UiClient[];
  status: ClientStatus;
}) {
  const filtered = useMemo(
    () => clients.filter((client) => client.status === status),
    [clients, status]
  );

  const meta = statusMeta[status];

  return (
    <Card className="h-full rounded-[2rem] border-white/15 bg-slate-900/55 backdrop-blur-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-3 text-xl text-white xl:text-2xl">
          <div className="flex items-center gap-3">
            {icon}
            {title}
          </div>
          <Badge className={`rounded-full border px-3 py-1 text-sm ${meta.badge}`}>
            {filtered.length}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="h-[52vh]">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/20 p-6 text-slate-100/80">
                Aucun dossier dans cette catégorie.
              </div>
            ) : (
              filtered.map((client) => (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-3xl border p-4 ${meta.card}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span className={`h-3.5 w-3.5 shrink-0 rounded-full ${meta.dot}`} />
                        <div className="truncate text-lg font-bold text-white xl:text-xl">
                          {client.name}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-slate-100/85 xl:text-base">
                        Pôle : {client.owner || "Non renseigné"}
                      </div>
                      {client.notes ? (
                        <div className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-50/90 xl:text-base">
                          {client.notes}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function RotatingSpotlight({ clients }: { clients: UiClient[] }) {
  const rotatingClients = useMemo(() => {
    return clients
      .filter((c) => c.status !== "submitted")
      .sort((a, b) => {
        const order = { not_submitted: 0, pending: 1, submitted: 2 };
        return order[a.status] - order[b.status] || a.name.localeCompare(b.name);
      });
  }, [clients]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (rotatingClients.length <= 1) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % rotatingClients.length);
    }, 5000);
    return () => clearInterval(id);
  }, [rotatingClients]);

  if (rotatingClients.length === 0) return null;

  const client = rotatingClients[index % rotatingClients.length];
  const meta = statusMeta[client.status];

  return (
    <Card className="rounded-[2rem] border-white/15 bg-slate-900/55 backdrop-blur-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-3 text-xl text-white xl:text-2xl">
          <Target className="h-6 w-6 text-sky-200" />
          Focus opérationnel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          <motion.div
            key={client.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            className={`rounded-3xl border p-6 ${meta.card}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-2xl font-black text-white xl:text-3xl">{client.name}</div>
                <div className="mt-2 text-sm text-slate-100/85 xl:text-base">
                  Pôle : {client.owner || "Non renseigné"}
                </div>
                {client.notes ? (
                  <div className="mt-4 text-base leading-relaxed text-slate-50/95 xl:text-lg">
                    {client.notes}
                  </div>
                ) : (
                  <div className="mt-4 text-base leading-relaxed text-slate-100/70 xl:text-lg">
                    Aucun commentaire opérationnel renseigné.
                  </div>
                )}
              </div>
              <Badge className={`rounded-full border px-4 py-2 text-sm xl:text-base ${meta.badge}`}>
                {meta.label}
              </Badge>
            </div>
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

function ViewPill({ mode }: { mode: ViewMode }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-slate-900/55 px-4 py-3 text-white backdrop-blur-md">
      <div className="flex items-center gap-2">
        {mode === "executive" ? (
          <LayoutDashboard className="h-4 w-4" />
        ) : (
          <Rows3 className="h-4 w-4" />
        )}
        <span className="text-sm xl:text-base">
          {mode === "executive" ? "Vue exécutive" : "Vue détaillée"}
        </span>
      </div>
    </div>
  );
}

export default function TvPage() {
  const [clients, setClients] = useState<UiClient[]>([]);
  const [now, setNow] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("executive");

  const enterFullscreen = async () => {
    const elem = document.documentElement;
    if (document.fullscreenElement) return;

    try {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      }
    } catch (error) {
      console.error("Impossible de passer en plein écran :", error);
    }
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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
      .channel("tv-realtime-clients-premium")
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

  const showTrackingBoard = useMemo(() => {
    return now.getTime() >= new Date(TRACKING_START).getTime();
  }, [now]);

  useEffect(() => {
    if (!showTrackingBoard) return;

    const id = setInterval(() => {
      setViewMode((prev) => (prev === "executive" ? "detailed" : "executive"));
    }, VIEW_ROTATION_MS);

    return () => clearInterval(id);
  }, [showTrackingBoard]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white">
      <div className="absolute inset-0">
        <Image
          src="/bg-bdo-tv.png"
          alt="Fond BDO TV"
          fill
          priority
          className="object-cover"
        />
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.18),rgba(15,23,42,0.48))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.10),transparent_26%),radial-gradient(circle_at_center,rgba(59,130,246,0.10),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(220,38,38,0.10),transparent_26%)]" />
      <div className="absolute inset-0 animate-pulse opacity-10 bg-[radial-gradient(circle_at_30%_30%,white,transparent_40%)]" />

      <div className="relative z-10 min-h-screen p-5 xl:p-8 2xl:p-10">
        <div className="mb-6 flex items-center justify-between gap-6 xl:mb-8">
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
                Tableau exécutif de pilotage en temps réel
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {showTrackingBoard && <ViewPill mode={viewMode} />}

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

        <AnimatePresence mode="wait">
          {!showTrackingBoard ? (
            <motion.div
              key="countdown-only"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex min-h-[78vh] items-center justify-center"
            >
              <div className="w-full max-w-7xl">
                <Card className="rounded-[2rem] border-white/20 bg-slate-900/55 shadow-2xl backdrop-blur-xl">
                  <CardContent className="p-8 xl:p-12 2xl:p-16">
                    <CountdownBoard />
                    <div className="mt-8 max-w-5xl text-lg leading-relaxed text-slate-50/95 xl:mt-10 xl:text-2xl">
                      Ce tableau de bord basculera automatiquement en mode suivi opérationnel
                      détaillé à partir du
                      <span className="font-semibold text-white"> 30 avril 2026 à 00:01</span>,
                      tout en conservant le compte à rebours jusqu’à l’échéance finale du
                      <span className="font-semibold text-white"> 30 avril 2026 à 23:59</span>.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              className="space-y-6"
            >
              {viewMode === "executive" ? (
                <>
                  <div className="grid items-start gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                    <Card className="rounded-[2rem] border-white/20 bg-slate-900/55 backdrop-blur-xl">
                      <CardContent className="p-6 xl:p-8">
                        <CountdownBoard />
                      </CardContent>
                    </Card>

                    <RotatingSpotlight clients={clients} />
                  </div>

                  <ExecutiveSummary clients={clients} />

                  <PriorityStrip clients={clients} />

                  <Card className="rounded-[2rem] border-white/20 bg-slate-900/55">
                    <CardContent className="space-y-3 p-6 xl:p-7">
                      <div className="text-lg font-bold text-white xl:text-2xl">
                        Référentiel de lecture opérationnelle
                      </div>
                      <div className="grid gap-3 text-sm text-slate-50/95 xl:grid-cols-4 xl:text-base">
                        <div className="flex items-center gap-3">
                          <span className="h-4 w-4 rounded-full bg-red-400" />
                          Dossier non encore déposé
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="h-4 w-4 rounded-full bg-amber-300" />
                          Dossier en cours de finalisation
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="h-4 w-4 rounded-full bg-emerald-300" />
                          Dossier déjà traité
                        </div>
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-4 w-4 text-sky-200" />
                          Pilotage en temps réel multi-écrans
                        </div>
                      </div>
                      <Separator className="bg-white/15" />
                      <div className="text-sm leading-7 text-slate-50/90 xl:text-base">
                        Affichage conçu pour télévision grand format, avec hiérarchie visuelle
                        exécutive, mise en avant des urgences et lecture instantanée de
                        l’avancement global.
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <div className="grid gap-6 xl:grid-cols-3">
                    <StatusColumn
                      title="Non déposés"
                      icon={<AlertTriangle className="h-6 w-6 text-red-200" />}
                      clients={clients}
                      status="not_submitted"
                    />
                    <StatusColumn
                      title="En attente"
                      icon={<TimerReset className="h-6 w-6 text-amber-100" />}
                      clients={clients}
                      status="pending"
                    />
                    <StatusColumn
                      title="Déjà déposés"
                      icon={<CheckCircle2 className="h-6 w-6 text-emerald-200" />}
                      clients={clients}
                      status="submitted"
                    />
                  </div>

                  <Card className="rounded-[2rem] border-white/20 bg-slate-900/55 backdrop-blur-md">
                    <CardContent className="p-6 text-slate-50/95 xl:p-7 xl:text-lg">
                      Vue détaillée active : cette séquence met en avant la répartition complète
                      des dossiers par état, pour une lecture opérationnelle immédiate en salle.
                    </CardContent>
                  </Card>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}