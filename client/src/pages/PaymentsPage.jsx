import { useEffect, useState } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import StatusPill from "../components/StatusPill";
import { kes, dateTime } from "../utils/format";
import { useAuth } from "../context/AuthContext";
export default function PaymentsPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [debts, setDebts] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customerId: "",
    amount: "",
    purpose: "GAME_DEBT",
    method: "M-Pesa",
    reference: "",
    targetPurchaseDebtId: "",
  });
  const load = () =>
    Promise.all([
      api.get("/customers"),
      api.get("/finance/payments"),
      api.get("/finance/purchase-debts"),
    ]).then(([c, p, d]) => {
      setCustomers(c.data.customers);
      setPayments(p.data.payments);
      setDebts(d.data.debts);
    });
  useEffect(() => {
    load();
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/finance/payments", {
        ...form,
        amount: Number(form.amount),
        targetPurchaseDebtId: form.targetPurchaseDebtId || undefined,
      });
      setForm({ ...form, amount: "", reference: "", targetPurchaseDebtId: "" });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Payment failed.");
    }
  };
  const relevantDebts = debts.filter(
    (d) =>
      d.customerId === form.customerId &&
      ["UNPAID", "PARTIALLY_PAID"].includes(d.status),
  );
  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle="Record customer payments and allocate them to game debt, purchase debt, or general credit."
      />
      <div className="grid gap-6 xl:grid-cols-[.75fr_1.25fr]">
        <form onSubmit={submit} className="panel p-5">
          <h2 className="mb-5 text-xl font-black uppercase">Record payment</h2>
          {error && (
            <div className="mb-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          <label className="label">Customer</label>
          <select
            required
            className="field mb-4"
            value={form.customerId}
            onChange={(e) =>
              setForm({
                ...form,
                customerId: e.target.value,
                targetPurchaseDebtId: "",
              })
            }
          >
            <option value="">Select</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName}
              </option>
            ))}
          </select>
          <label className="label">Payment purpose</label>
          <select
            className="field mb-4"
            value={form.purpose}
            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
          >
            <option value="GAME_DEBT">Game debt</option>
            <option value="PURCHASE_DEBT">Purchase debt</option>
            <option value="GENERAL_CREDIT">General credit</option>
          </select>
          {form.purpose === "PURCHASE_DEBT" && (
            <>
              <label className="label">Specific purchase debt (optional)</label>
              <select
                className="field mb-4"
                value={form.targetPurchaseDebtId}
                onChange={(e) =>
                  setForm({ ...form, targetPurchaseDebtId: e.target.value })
                }
              >
                <option value="">Auto — oldest outstanding first</option>
                {relevantDebts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.debtCode} — {d.description} — {kes(d.outstanding)}
                  </option>
                ))}
              </select>
            </>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Amount</label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                className="field"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Method</label>
              <select
                className="field"
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              >
                <option>M-Pesa</option>
                <option>Cash</option>
                <option>Bank Transfer</option>
                <option>Card</option>
              </select>
            </div>
          </div>
          <label className="label mt-4">Reference</label>
          <input
            className="field"
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
            placeholder="Optional transaction reference"
          />
          <button className="btn-primary mt-5 w-full">Record payment</button>
        </form>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Payment</th>
                <th>Customer</th>
                <th>Purpose</th>
                <th>Amount</th>
                <th>Unapplied</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.paymentNumber}</td>
                  <td className="font-bold">{p.customer.displayName}</td>
                  <td>{p.purpose.replaceAll("_", " ")}</td>
                  <td className="font-bold text-volt">{kes(p.amount)}</td>
                  <td>{kes(p.unappliedAmount)}</td>
                  <td>{p.method}</td>
                  <td>
                    <StatusPill value={p.status} />
                  </td>
                  <td>{dateTime(p.createdAt)}</td>
                  <td>
                    {user.role === "ADMIN" && p.status === "ACTIVE" && (
                      <button
                        className="text-xs font-bold text-red-300"
                        onClick={async () => {
                          if (confirm("Reverse this payment?")) {
                            await api.post(`/finance/payments/${p.id}/reverse`);
                            load();
                          }
                        }}
                      >
                        Reverse
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
