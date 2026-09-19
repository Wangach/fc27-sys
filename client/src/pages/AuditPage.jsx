import { useEffect, useState } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import { dateTime } from "../utils/format";
export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    api.get("/audit").then((r) => setLogs(r.data.logs));
  }, []);
  return (
    <>
      <PageHeader
        title="Audit Log"
        subtitle="Immutable operational history for sensitive account, match, payment and configuration actions."
      />
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>IP</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{dateTime(l.createdAt)}</td>
                <td>{l.user?.username || "System"}</td>
                <td className="font-bold">{l.action.replaceAll("_", " ")}</td>
                <td>
                  {l.entityType}
                  {l.entityId ? ` • ${l.entityId.slice(0, 8)}` : ""}
                </td>
                <td>{l.ipAddress || "—"}</td>
                <td>
                  <code className="text-xs text-white/45">
                    {l.metadata
                      ? JSON.stringify(l.metadata).slice(0, 120)
                      : "—"}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
