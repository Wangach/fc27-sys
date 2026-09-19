import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import PageHeader from '../../components/PageHeader';
import StatusPill from '../../components/StatusPill';
import { dateTime, kes } from '../../utils/format';

export default function MyGamesPage() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get('/matches/mine').then((response) => setRows(response.data.matches));
  }, []);

  return (
    <>
      <PageHeader title="My Games" subtitle="Complete match history, results, teams used and game type." />
      <div className="space-y-3">
        {rows.map((row) => {
          const match = row.match;
          const [a, b] = match.participants;
          const myCharge = match.charges?.find((charge) => charge.customerId === row.customerId);

          return (
            <div key={row.id} className="panel p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs text-white/30">
                    {match.matchCode} • {dateTime(match.playedAt)} • {match.matchType.name}
                  </div>
                  <div className="mt-1 text-xl font-black">
                    {a.customer.displayName}{' '}
                    <span className="mx-2 text-volt">
                      {a.score} : {b.score}
                    </span>{' '}
                    {b.customer.displayName}
                  </div>
                  <div className="mt-1 text-xs text-white/40">
                    {a.team || '—'} vs {b.team || '—'}
                  </div>

                  {match.drawResolution === 'HALF_HALF' && (
                    <div className="mt-2 text-xs font-bold text-amber-200">
                      Draw payment: Half-Half
                      {myCharge ? ` • Your share ${kes(myCharge.amount)}` : ''}
                    </div>
                  )}

                  {match.drawResolution === 'SUPER_LOSER' && (
                    <div className="mt-2 text-xs font-bold text-orange-200">
                      Super-looser tiebreak: {match.superLoserPlayerOneScore}:{match.superLoserPlayerTwoScore}
                      {myCharge ? ` • You were charged ${kes(myCharge.amount)}` : ' • No game charge to you'}
                    </div>
                  )}
                </div>
                <StatusPill value={row.result} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
