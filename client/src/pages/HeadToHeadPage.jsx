import { useEffect, useMemo, useState } from 'react';
import { faGamepad, faFutbol, faTrophy, faArrowTrendUp } from '@fortawesome/free-solid-svg-icons';
import { api } from '../api/client';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import { dateTime } from '../utils/format';

export default function HeadToHeadPage() {
  const [players, setPlayers] = useState([]);
  const [playerOneId, setPlayerOneId] = useState('');
  const [playerTwoId, setPlayerTwoId] = useState('');
  const [comparison, setComparison] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/customers')
      .then((response) => setPlayers(response.data.customers))
      .catch((err) => setError(err.response?.data?.message || 'Could not load players.'));
  }, []);

  const compare = async () => {
    if (!playerOneId || !playerTwoId) return setError('Select two players to compare.');
    if (playerOneId === playerTwoId) return setError('Choose two different players.');
    setLoading(true);
    setError('');
    setComparison(null);
    try {
      const response = await api.get('/stats/head-to-head', { params: { playerOneId, playerTwoId } });
      setComparison(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not calculate head-to-head statistics.');
    } finally {
      setLoading(false);
    }
  };

  return <>
    <PageHeader
      eyebrow="MATCH ANALYSIS"
      title="Head-to-Head"
      subtitle="Compare two players using their direct meetings, goals, overall records and an explainable matchup estimate."
    />

    <div className="grid gap-5 xl:grid-cols-2">
      <PlayerPicker label="Player one" players={players} value={playerOneId} onChange={setPlayerOneId} excludeId={playerTwoId} />
      <PlayerPicker label="Player two" players={players} value={playerTwoId} onChange={setPlayerTwoId} excludeId={playerOneId} />
    </div>

    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button className="btn-primary" onClick={compare} disabled={loading || !playerOneId || !playerTwoId}>
        {loading ? 'Comparing…' : 'Compare players'}
      </button>
      {error && <span className="text-sm text-red-300">{error}</span>}
    </div>

    {comparison && <Comparison data={comparison} />}
  </>;
}

function PlayerPicker({ label, players, value, onChange, excludeId }) {
  const [query, setQuery] = useState('');
  const selected = players.find((player) => player.id === value);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return players
      .filter((player) => player.id !== excludeId)
      .filter((player) => !term || `${player.displayName} ${player.customerCode} ${player.favoriteTeam || ''}`.toLowerCase().includes(term))
      .slice(0, 8);
  }, [players, query, excludeId]);

  return <section className="panel p-5">
    <label className="label">{label}</label>
    <input className="field" placeholder="Search player name or code…" value={query} onChange={(event) => setQuery(event.target.value)} />
    {selected && <div className="mt-3 rounded-xl border border-volt/30 bg-volt/[.07] p-3">
      <div className="text-xs font-black uppercase tracking-wider text-volt">Selected</div>
      <div className="mt-1 font-black">{selected.displayName}</div>
      <div className="text-xs text-white/35">{selected.customerCode} • {selected.favoriteTeam || 'No favourite team'}</div>
    </div>}
    <div className="mt-3 max-h-52 space-y-1 overflow-y-auto">
      {filtered.map((player) => <button
        key={player.id}
        type="button"
        className={`w-full rounded-xl px-3 py-2.5 text-left transition ${value === player.id ? 'bg-volt text-arena-950' : 'bg-white/[.035] hover:bg-white/[.07]'}`}
        onClick={() => { onChange(player.id); setQuery(player.displayName); }}
      >
        <div className="font-bold">{player.displayName}</div>
        <div className={`text-xs ${value === player.id ? 'text-arena-950/60' : 'text-white/35'}`}>{player.customerCode} • {player.favoriteTeam || 'No favourite team'}</div>
      </button>)}
      {!filtered.length && <div className="rounded-xl bg-white/[.025] p-3 text-sm text-white/35">No matching players.</div>}
    </div>
  </section>;
}

function Comparison({ data }) {
  const { playerOne, playerTwo, headToHead, prediction, recentMeetings } = data;
  return <div className="mt-7 space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={faGamepad} label="Direct meetings" value={headToHead.meetings} />
      <StatCard icon={faTrophy} label="Draws" value={headToHead.draws} />
      <StatCard icon={faFutbol} label={`${playerOne.displayName} goals`} value={headToHead.playerOneGoals} />
      <StatCard icon={faFutbol} label={`${playerTwo.displayName} goals`} value={headToHead.playerTwoGoals} />
    </div>

    <div className="grid gap-6 xl:grid-cols-[1fr_.72fr_1fr]">
      <PlayerComparisonCard
        player={playerOne}
        wins={headToHead.playerOneWins}
        goals={headToHead.playerOneGoals}
        directRate={headToHead.meetings ? headToHead.playerOneHeadToHeadWinRate : null}
        estimate={prediction.playerOneWinProbability}
      />

      <section className="panel flex flex-col justify-center p-5 text-center">
        <div className="eyebrow">Estimated outcome</div>
        <div className="mt-3 text-2xl font-black uppercase">{prediction.likelyOutcome}</div>
        {prediction.available && <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <Probability label={playerOne.displayName} value={prediction.playerOneWinProbability} />
          <Probability label="Draw" value={prediction.drawProbability} />
          <Probability label={playerTwo.displayName} value={prediction.playerTwoWinProbability} />
        </div>}
        <p className="mt-4 text-xs leading-5 text-white/35">{prediction.basis}</p>
        <p className="mt-2 text-[11px] text-white/25">This is a statistical estimate from recorded matches, not a guaranteed result.</p>
      </section>

      <PlayerComparisonCard
        player={playerTwo}
        wins={headToHead.playerTwoWins}
        goals={headToHead.playerTwoGoals}
        directRate={headToHead.meetings ? headToHead.playerTwoHeadToHeadWinRate : null}
        estimate={prediction.playerTwoWinProbability}
      />
    </div>

    <section className="panel p-5">
      <div className="mb-4">
        <h2 className="font-black uppercase">Recent meetings</h2>
        <p className="text-xs text-white/35">Latest 5 games between these two players</p>
      </div>
      {recentMeetings.length ? <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Date</th><th>Match</th><th>{playerOne.displayName}</th><th>Score</th><th>{playerTwo.displayName}</th><th>Type</th></tr></thead>
          <tbody>{recentMeetings.map((match) => <tr key={match.id}>
            <td>{dateTime(match.playedAt)}</td>
            <td className="font-bold">{match.matchCode}</td>
            <td>{match.playerOneTeam || '—'}</td>
            <td className="font-black text-volt">{match.playerOneScore} : {match.playerTwoScore}</td>
            <td>{match.playerTwoTeam || '—'}</td>
            <td>{match.matchType.name}</td>
          </tr>)}</tbody>
        </table>
      </div> : <div className="rounded-xl bg-white/[.03] p-5 text-sm text-white/40">These players have not faced each other yet. The estimate above therefore uses their overall records only.</div>}
    </section>
  </div>;
}

function PlayerComparisonCard({ player, wins, goals, directRate, estimate }) {
  const overall = player.overall;
  return <section className="panel panel-cut p-5">
    <div className="eyebrow">{player.customerCode}</div>
    <h2 className="mt-1 text-2xl font-black uppercase">{player.displayName}</h2>
    <div className="mt-1 text-xs text-white/35">Favourite team: {player.favoriteTeam || 'Not set'} • Rank {overall.rank ? `#${overall.rank}` : '—'}</div>
    <div className="mt-5 grid grid-cols-2 gap-3">
      <Metric label="H2H wins" value={wins} />
      <Metric label="H2H goals" value={goals} />
      <Metric label="H2H win rate" value={directRate == null ? '—' : `${directRate}%`} />
      <Metric label="Overall win rate" value={`${overall.winRate}%`} />
      <Metric label="Overall record" value={`${overall.wins}W ${overall.draws}D ${overall.losses}L`} />
      <Metric label="Matchup estimate" value={estimate == null ? '—' : `${estimate}%`} emphasis />
    </div>
  </section>;
}

function Metric({ label, value, emphasis = false }) {
  return <div className="rounded-xl bg-white/[.035] p-3">
    <div className="text-[10px] font-black uppercase tracking-[.12em] text-white/35">{label}</div>
    <div className={`mt-1 font-black ${emphasis ? 'text-xl text-volt' : 'text-lg'}`}>{value}</div>
  </div>;
}

function Probability({ label, value }) {
  return <div className="rounded-xl bg-white/[.04] p-2">
    <div className="truncate text-[10px] uppercase text-white/35">{label}</div>
    <div className="mt-1 font-black text-volt">{value}%</div>
  </div>;
}
