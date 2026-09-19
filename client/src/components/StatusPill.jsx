export default function StatusPill({ value }) {
  const good = ["ACTIVE", "PAID", "RESOLVED", "WIN"].includes(value);
  const warn = ["PARTIALLY_PAID", "IN_PROGRESS", "DRAW"].includes(value);
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${good ? "bg-volt/15 text-volt" : warn ? "bg-amber-400/15 text-amber-300" : "bg-white/10 text-white/60"}`}
    >
      {String(value || "").replaceAll("_", " ")}
    </span>
  );
}
