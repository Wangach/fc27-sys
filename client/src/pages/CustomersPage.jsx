import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';

export default function CustomersPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');

  const load = () => api.get('/customers').then((response) => setRows(response.data.customers));
  useEffect(() => { load(); }, []);

  const shown = rows.filter((player) => `${player.displayName} ${player.customerCode} ${player.phone || ''}`.toLowerCase().includes(search.toLowerCase()));

  return <>
    <PageHeader title="Players" subtitle="Search players and open their full competitive and transaction metadata." />
    <div className="panel mb-5 p-4">
      <input className="field max-w-lg" placeholder="Search player, code or phone…" value={search} onChange={(event) => setSearch(event.target.value)} />
      <p className="mt-2 text-xs text-white/35">Click a player name to open their metadata in a new tab.</p>
      {user.role === 'ADMIN' && <p className="mt-1 text-xs text-white/25">New players are created from User Management so every customer receives a secure login.</p>}
    </div>
    <div className="table-wrap">
      <table className="data-table">
        <thead><tr><th>Player</th><th>Code</th><th>Favourite team</th><th>Phone</th><th>Email</th></tr></thead>
        <tbody>{shown.map((player) => <tr key={player.id}>
          <td>
            <Link
              to={`/staff/players/${player.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-black text-volt hover:underline"
            >
              {player.displayName}
            </Link>
          </td>
          <td>{player.customerCode}</td>
          <td>{player.favoriteTeam || '—'}</td>
          <td>{player.phone || '—'}</td>
          <td>{player.email || '—'}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </>;
}
