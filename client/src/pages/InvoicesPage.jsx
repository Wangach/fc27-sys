import { useEffect, useState } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import { kes, dateTime } from "../utils/format";
export default function InvoicesPage() {
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const load = () =>
    Promise.all([api.get("/customers"), api.get("/invoices")]).then(
      ([c, i]) => {
        setCustomers(c.data.customers);
        setInvoices(i.data.invoices);
      },
    );
  useEffect(() => {
    load();
  }, []);
  const generate = async () => {
    if (!customerId) return;
    await api.post(`/invoices/${customerId}`);
    await load();
  };
  const pdfUrl = (id) =>
    `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/invoices/${id}/pdf`;
  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Each invoice snapshots outstanding game debt and outstanding purchase debt, then combines them into one total."
      />
      <div className="panel mb-5 flex flex-col gap-3 p-4 md:flex-row">
        <select
          className="field md:max-w-md"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        >
          <option value="">Choose customer to invoice</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.displayName}
            </option>
          ))}
        </select>
        <button
          className="btn-primary"
          onClick={generate}
          disabled={!customerId}
        >
          Generate invoice
        </button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Game debt</th>
              <th>Purchase debt</th>
              <th>Total</th>
              <th>Generated</th>
              <th>PDF</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id}>
                <td>{i.invoiceNumber}</td>
                <td className="font-bold">{i.customer.displayName}</td>
                <td>{kes(i.gameDebtTotal)}</td>
                <td>{kes(i.purchaseDebtTotal)}</td>
                <td className="text-lg font-black text-volt">
                  {kes(i.grandTotal)}
                </td>
                <td>{dateTime(i.createdAt)}</td>
                <td>
                  <a
                    className="font-bold text-volt"
                    href={pdfUrl(i.id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open PDF
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
