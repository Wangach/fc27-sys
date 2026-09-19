import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
export default function StatCard({ icon, label, value, hint }) {
  return <div className="panel panel-cut relative overflow-hidden p-5">
    <div className="absolute right-0 top-0 h-20 w-20 bg-volt/5 blur-2xl" />
    <div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-[.17em] text-white/40">{label}</span>{icon && <FontAwesomeIcon icon={icon} className="text-volt" />}</div>
    <div className="mt-4 text-3xl font-black tracking-tight">{value}</div>{hint && <div className="mt-1 text-xs text-white/35">{hint}</div>}
  </div>;
}
