export default function PageHeader({ eyebrow = 'FC ARENA', title, subtitle, action }) {
  return <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div><div className="eyebrow">{eyebrow}</div><h1 className="mt-1 text-3xl font-black uppercase tracking-tight md:text-4xl">{title}</h1>{subtitle && <p className="mt-2 max-w-3xl text-sm text-white/50">{subtitle}</p>}</div>
    {action}
  </div>;
}
