import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { faUsers, faGamepad, faCoins, faComments } from '@fortawesome/free-solid-svg-icons';
import { api } from '../api/client';
import { kes, dateTime } from '../utils/format';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';

export default function StaffDashboard() {
  const [data, setData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [playerSearch, setPlayerSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/stats/admin-dashboard'), api.get('/customers')])
      .then(([dashboard, customers]) => {
        setData(dashboard.data);
        setPlayers(customers.data.customers);
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load dashboard.'));
  }, []);

  const searchResults = useMemo(() => {
    const term = playerSearch.trim().toLowerCase();
    if (!term) return [];
    return players
      .filter((player) => `${player.displayName} ${player.customerCode} ${player.phone || ''} ${player.favoriteTeam || ''}`.toLowerCase().includes(term))
      .slice(0, 8);
  }, [players, playerSearch]);

  if (error) return <div className="panel p-5 text-red-300">{error}</div>;
  if (!data) return <div className="text-volt">Loading dashboard…</div>;

  return <>
    <PageHeader title="Club Control Centre" subtitle="Live operations, finance and competitive performance in one view." />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={faUsers} label="Active players" value={data.customers} />
      <StatCard icon={faGamepad} label="Games today" value={data.matchesToday} />
      <StatCard icon={faCoins} label="Outstanding debt" value={kes(data.totalDebt)} />
      <StatCard icon={faComments} label="Open tickets" value={data.openTickets} />
    </div>

    <section className="panel mt-6 p-5">
      <div className="mb-4">
        <h2 className="font-black uppercase">Player search</h2>
        <p className="text-xs text-white/35">Search a player and click their name to open full metadata in a new tab.</p>
      </div>
      <input className="field max-w-xl" placeholder="Search player, customer code, team or phone…" value={playerSearch} onChange={(event) => setPlayerSearch(event.target.value)} />
      {playerSearch && <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {searchResults.map((player) => <Link
          key={player.id}
          to={`/staff/players/${player.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-white/[.07] bg-white/[.03] p-3 transition hover:border-volt/50 hover:bg-white/[.06]"
        >
          <div className="font-black text-volt">{player.displayName}</div>
          <div className="mt-1 text-xs text-white/35">{player.customerCode} • {player.favoriteTeam || 'No favourite team'}</div>
        </Link>)}
        {!searchResults.length && <div className="text-sm text-white/35">No matching players.</div>}
      </div>}
    </section>

    <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
      <section className="panel p-5">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-black uppercase">Recent matches</h2><span className="eyebrow">Latest results</span></div>
        <div className="space-y-3">{data.recentMatches.map((match) => {
          const [a, b] = match.participants;
          return <div key={match.id} className="flex items-center justify-between rounded-xl bg-white/[.035] p-4">
            <div><div className="text-xs text-white/35">{match.matchType.name} • {dateTime(match.playedAt)}</div><div className="mt-1 font-bold">{a?.customer.displayName} <span className="text-volt">{a?.score}</span> — <span className="text-volt">{b?.score}</span> {b?.customer.displayName}</div></div>
            <span className="text-xs font-black text-white/25">{match.matchCode}</span>
          </div>;
        })}</div>
      </section>

      <section className="panel p-5">
        <div className="mb-4"><h2 className="font-black uppercase">Top players</h2><span className="text-xs text-white/35">League points</span></div>
        <div className="space-y-2">{data.leaderboard.map((row) => <div key={row.customerId} className="grid grid-cols-[40px_1fr_auto] items-center gap-2 rounded-xl bg-white/[.035] p-3"><div className="text-xl font-black text-volt">#{row.rank}</div><div><div className="font-bold">{row.name}</div><div className="text-xs text-white/35">{row.wins}W {row.draws}D {row.losses}L</div></div><div className="text-xl font-black">{row.points}</div></div>)}</div>
      </section>
    </div>

    <section className="panel mt-6 p-5">
      <h2 className="mb-4 font-black uppercase">Recent payments</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.recentPayments.map((payment) => <div key={payment.id} className="rounded-xl border border-white/[.06] p-4"><div className="font-bold">{payment.customer.displayName}</div><div className="mt-2 text-2xl font-black text-volt">{kes(payment.amount)}</div><div className="mt-1 text-xs text-white/35">{payment.purpose.replaceAll('_', ' ')} • {dateTime(payment.createdAt)}</div></div>)}</div>
    </section>
  </>;
}
