import { useEffect, useState } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import StatusPill from "../components/StatusPill";
import { dateTime } from "../utils/format";
export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [reply, setReply] = useState({});
  const load = () =>
    api.get("/tickets").then((r) => setTickets(r.data.tickets));
  useEffect(() => {
    load();
  }, []);
  return (
    <>
      <PageHeader
        title="Complaints & Suggestions"
        subtitle="Track customer feedback as tickets with conversation history and resolution status."
      />
      <div className="space-y-4">
        {tickets.map((t) => (
          <div className="panel p-5" key={t.id}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="eyebrow">
                  {t.type} • {t.customer.displayName}
                </div>
                <h2 className="mt-1 text-xl font-black">{t.subject}</h2>
                <div className="mt-1 text-xs text-white/30">
                  Opened {dateTime(t.createdAt)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill value={t.status} />
                <select
                  className="field !w-auto !py-1.5 text-xs"
                  value={t.status}
                  onChange={async (e) => {
                    await api.patch(`/tickets/${t.id}/status`, {
                      status: e.target.value,
                    });
                    load();
                  }}
                >
                  <option>OPEN</option>
                  <option>IN_PROGRESS</option>
                  <option>RESOLVED</option>
                  <option>CLOSED</option>
                </select>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              {t.messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-2xl rounded-xl p-3 text-sm ${m.sender.role === "CUSTOMER" ? "bg-white/[.05]" : "ml-auto bg-volt/10"}`}
                >
                  <div className="mb-1 text-[10px] font-black uppercase tracking-wider text-white/35">
                    {m.sender.username} • {dateTime(m.createdAt)}
                  </div>
                  {m.message}
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                className="field"
                placeholder="Reply…"
                value={reply[t.id] || ""}
                onChange={(e) => setReply({ ...reply, [t.id]: e.target.value })}
              />
              <button
                className="btn-primary"
                onClick={async () => {
                  if (!reply[t.id]?.trim()) return;
                  await api.post(`/tickets/${t.id}/messages`, {
                    message: reply[t.id],
                  });
                  setReply({ ...reply, [t.id]: "" });
                  load();
                }}
              >
                Reply
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
