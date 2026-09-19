import { useEffect, useState } from "react";
import { api } from "../../api/client";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import StatusPill from "../../components/StatusPill";
import {
  faGamepad,
  faReceipt,
  faCoins,
} from "@fortawesome/free-solid-svg-icons";
import { kes, dateTime } from "../../utils/format";
export default function MyDebtsPage() {
  const [account, setAccount] = useState(null);
  const [debts, setDebts] = useState([]);
  useEffect(() => {
    Promise.all([
      api.get("/finance/my-summary"),
      api.get("/finance/my-purchase-debts"),
    ]).then(([a, d]) => {
      setAccount(a.data.account);
      setDebts(d.data.debts);
    });
  }, []);
  if (!account) return <div className="text-volt">Loading debts…</div>;
  return (
    <>
      <PageHeader
        title="My Debts"
        subtitle="Game debt and non-game purchase debt remain separate but combine into your total amount due."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={faGamepad}
          label="Game debt"
          value={kes(account.gameDebt)}
        />
        <StatCard
          icon={faReceipt}
          label="Purchase debt"
          value={kes(account.purchaseDebt)}
        />
        <StatCard
          icon={faCoins}
          label="Total due"
          value={kes(account.totalDebt)}
          hint={
            account.unappliedCredit
              ? `Unapplied credit ${kes(account.unappliedCredit)}`
              : null
          }
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="panel p-5">
          <h2 className="mb-4 font-black uppercase">
            Outstanding game charges
          </h2>
          <div className="space-y-2">
            {account.gameItems
              .filter((x) => x.outstanding > 0)
              .map((x) => (
                <div
                  key={x.id}
                  className="flex justify-between rounded-xl bg-white/[.035] p-3"
                >
                  <div>
                    <div className="font-bold">{x.matchCode}</div>
                    <div className="text-xs text-white/30">
                      {dateTime(x.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-volt">
                      {kes(x.outstanding)}
                    </div>
                    <div className="text-xs text-white/30">
                      of {kes(x.original)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
        <section className="panel p-5">
          <h2 className="mb-4 font-black uppercase">Purchase debts</h2>
          <div className="space-y-2">
            {debts.map((d) => (
              <div key={d.id} className="rounded-xl bg-white/[.035] p-3">
                <div className="flex justify-between gap-3">
                  <div>
                    <div className="font-bold">{d.debtCode}</div>
                    <div className="text-sm text-white/60">{d.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-volt">
                      {kes(d.outstanding)}
                    </div>
                    <StatusPill value={d.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
