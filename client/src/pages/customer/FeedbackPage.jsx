import { useEffect, useState } from "react";
import { api } from "../../api/client";
import PageHeader from "../../components/PageHeader";
import StatusPill from "../../components/StatusPill";
import { dateTime } from "../../utils/format";
export default function FeedbackPage() {
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState({
    type: "COMPLAINT",
    subject: "",
    message: "",
  });
  const [reply, setReply] = useState({});
  const load = () =>
    api.get("/tickets/mine").then((r) => setTickets(r.data.tickets));
  useEffect(() => {
    load();
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    await api.post("/tickets", form);
    setForm({ ...form, subject: "", message: "" });
    load();
  };
  return (
    <>
      <PageHeader
        title="Feedback"
        subtitle="Send a complaint or suggestion and follow the response from the club team."
      />
      <form onSubmit={submit} className="panel mb-6 p-5">
        <div className="grid gap-4 md:grid-cols-[180px_1fr]">
          <div>
            <label className="label">Type</label>
            <select
              className="field"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option>COMPLAINT</option>
              <option>SUGGESTION</option>
            </select>
          </div>
          <div>
            <label className="label">Subject</label>
            <input
              required
              className="field"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>
        </div>
        <label className="label mt-4">Message</label>
        <textarea
          required
          className="field min-h-28"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
        <button className="btn-primary mt-4">Send feedback</button>
      </form>
      <div className="space-y-4">
        {tickets.map((t) => (
          <div key={t.id} className="panel p-5">
            <div className="flex justify-between gap-3">
              <div>
                <div className="eyebrow">{t.type}</div>
                <h2 className="font-black">{t.subject}</h2>
              </div>
              <StatusPill value={t.status} />
            </div>
            <div className="mt-4 space-y-2">
              {t.messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-2xl rounded-xl p-3 text-sm ${m.sender.role === "CUSTOMER" ? "bg-white/[.05]" : "ml-auto bg-volt/10"}`}
                >
                  <div className="mb-1 text-[10px] text-white/30">
                    {m.sender.username} • {dateTime(m.createdAt)}
                  </div>
                  {m.message}
                </div>
              ))}
            </div>
            {t.status !== "CLOSED" && (
              <div className="mt-4 flex gap-2">
                <input
                  className="field"
                  placeholder="Add a message…"
                  value={reply[t.id] || ""}
                  onChange={(e) =>
                    setReply({ ...reply, [t.id]: e.target.value })
                  }
                />
                <button
                  className="btn-secondary"
                  onClick={async () => {
                    if (!reply[t.id]?.trim()) return;
                    await api.post(`/tickets/${t.id}/messages`, {
                      message: reply[t.id],
                    });
                    setReply({ ...reply, [t.id]: "" });
                    load();
                  }}
                >
                  Send
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
