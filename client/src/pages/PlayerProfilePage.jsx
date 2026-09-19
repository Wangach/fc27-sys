import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGamepad,
  faTrophy,
  faArrowTrendUp,
  faHandshake,
  faSkullCrossbones,
} from "@fortawesome/free-solid-svg-icons";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import StatusPill from "../components/StatusPill";
import { kes, dateTime } from "../utils/format";

export default function PlayerProfilePage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    api
      .get(`/customers/${id}/insights`)
      .then((response) => setData(response.data))
      .catch((err) =>
        setError(
          err.response?.data?.message || "Could not load player profile.",
        ),
      );
  }, [id]);

  if (error) return <div className="panel p-5 text-red-300">{error}</div>;
  if (!data) return <div className="text-volt">Loading player metadata…</div>;

  const { customer, stats, recentTransactions, recentGames } = data;

  return (
    <>
      <PageHeader
        eyebrow="PLAYER METADATA"
        title={customer.displayName}
        subtitle={`${customer.customerCode} • Favourite team: ${customer.favoriteTeam || "Not set"} • Rank ${stats.rank ? `#${stats.rank}` : "—"}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={faGamepad} label="Games played" value={stats.played} />
        <StatCard icon={faTrophy} label="Games won" value={stats.wins} />
        <StatCard
          icon={faSkullCrossbones}
          label="Games lost"
          value={stats.losses}
        />
        <StatCard icon={faHandshake} label="Games drawn" value={stats.draws} />
        <StatCard
          icon={faArrowTrendUp}
          label="Win probability"
          value={`${stats.winProbability}%`}
          hint="Historical win rate"
        />
      </div>

      <section className="panel mt-6 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-black uppercase">Player details</h2>
            <p className="text-xs text-white/35">
              Account and competitive metadata
            </p>
          </div>
          <div className="text-right text-xs text-white/35">
            {stats.points} pts • GF {stats.gf} • GA {stats.ga} • GD{" "}
            {stats.gd >= 0 ? "+" : ""}
            {stats.gd}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metadata label="Customer code" value={customer.customerCode} />
          <Metadata
            label="Favourite team"
            value={customer.favoriteTeam || "Not set"}
          />
          <Metadata label="Phone" value={customer.phone || "—"} />
          <Metadata label="Email" value={customer.email || "—"} />
          <Metadata label="Username" value={customer.user?.username || "—"} />
          <Metadata
            label="Account status"
            value={customer.user?.status || "—"}
          />
          <Metadata
            label="League rank"
            value={stats.rank ? `#${stats.rank}` : "—"}
          />
          <Metadata label="Win rate" value={`${stats.winRate}%`} />
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="panel p-5">
          <div className="mb-4">
            <h2 className="font-black uppercase">Recent games</h2>
            <p className="text-xs text-white/35">Latest 5 active matches</p>
          </div>
          {recentGames.length ? (
            <div className="space-y-3">
              {recentGames.map((game) => (
                <div
                  key={game.id}
                  className="rounded-xl border border-white/[.06] bg-white/[.025] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-white/35">
                        {dateTime(game.playedAt)} • {game.matchType.name} •{" "}
                        {game.matchCode}
                      </div>
                      <div className="mt-1 font-bold">
                        {customer.displayName}{" "}
                        <span className="text-volt">
                          {game.score} : {game.opponent?.score ?? "—"}
                        </span>{" "}
                        {game.opponent?.name || "Unknown opponent"}
                      </div>
                      <div className="mt-1 text-xs text-white/35">
                        {game.team || "No team"} vs{" "}
                        {game.opponent?.team || "No team"}
                      </div>
                    </div>
                    <StatusPill value={game.result} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/35">No games recorded yet.</p>
          )}
        </section>

        <section className="panel p-5">
          <div className="mb-4">
            <h2 className="font-black uppercase">Recent transactions</h2>
            <p className="text-xs text-white/35">Latest 5 payment records</p>
          </div>
          {recentTransactions.length ? (
            <div className="space-y-3">
              {recentTransactions.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-xl border border-white/[.06] bg-white/[.025] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-bold">{payment.paymentNumber}</div>
                      <div className="mt-1 text-xs text-white/35">
                        {payment.purpose.replaceAll("_", " ")} •{" "}
                        {payment.method} • {dateTime(payment.createdAt)}
                      </div>
                      {payment.reference && (
                        <div className="mt-1 text-xs text-white/30">
                          Ref: {payment.reference}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-black text-volt">
                        {kes(payment.amount)}
                      </div>
                      <div className="mt-1">
                        <StatusPill value={payment.status} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/35">
              No transactions recorded yet.
            </p>
          )}
        </section>
      </div>
    </>
  );
}

function Metadata({ label, value }) {
  return (
    <div className="rounded-xl bg-white/[.035] p-4">
      <div className="text-[11px] font-black uppercase tracking-[.14em] text-white/35">
        {label}
      </div>
      <div className="mt-1 break-words font-bold">{value}</div>
    </div>
  );
}
