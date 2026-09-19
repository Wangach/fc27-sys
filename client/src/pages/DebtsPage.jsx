import { useEffect, useState } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import StatusPill from "../components/StatusPill";
import { kes, dateTime } from "../utils/format";
import { useAuth } from "../context/AuthContext";
export default function DebtsPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [debts, setDebts] = useState([]);
  const [form, setForm] = useState({
    customerId: "",
    description: "",
    amount: "",
  });
  const [error, setError] = useState("");
  const load = () =>
    Promise.all([
      api.get("/customers"),
      api.get("/finance/purchase-debts"),
    ]).then(([c, d]) => {
      setCustomers(c.data.customers);
      setDebts(d.data.debts);
    });
  useEffect(() => {
    load();
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/finance/purchase-debts", {
        ...form,
        amount: Number(form.amount),
      });
      setForm({ ...form, description: "", amount: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create debt.");
    }
  };
  return (
    <>
      <PageHeader
        title="Purchase Debts"
        subtitle="Non-game purchases remain separate from game debt and keep their own unique debt code and status."
      />
      <div className="grid gap-6 xl:grid-cols-[.7fr_1.3fr]">
        <form onSubmit={submit} className="panel p-5">
          <h2 className="mb-5 text-xl font-black uppercase">
            New purchase debt
          </h2>
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
            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
          >
            <option value="">Select</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName}
              </option>
            ))}
          </select>
          <label className="label">Description</label>
          <textarea
            required
            className="field mb-4 min-h-24"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <label className="label">Amount</label>
          <input
            required
            className="field"
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <button className="btn-primary mt-5 w-full">Create debt</button>
        </form>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Debt</th>
                <th>Customer</th>
                <th>Description</th>
                <th>Original</th>
                <th>Outstanding</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {debts.map((d) => (
                <tr key={d.id}>
                  <td>{d.debtCode}</td>
                  <td className="font-bold">{d.customer.displayName}</td>
                  <td>{d.description}</td>
                  <td>{kes(d.amount)}</td>
                  <td className="font-bold text-volt">{kes(d.outstanding)}</td>
                  <td>
                    <StatusPill value={d.status} />
                  </td>
                  <td>{dateTime(d.createdAt)}</td>
                  <td>
                    {user.role === "ADMIN" && d.status === "UNPAID" && (
                      <button
                        className="text-xs font-bold text-red-300"
                        onClick={async () => {
                          if (confirm("Cancel this debt?")) {
                            await api.post(
                              `/finance/purchase-debts/${d.id}/cancel`,
                            );
                            load();
                          }
                        }}
                      >
                        Cancel
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
