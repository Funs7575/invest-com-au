interface Props {
  eyebrow: string;
  title: string;
  sub?: string;
}

export default function SectionHeading({ eyebrow, title, sub }: Props) {
  return (
    <div className="mb-6 md:mb-8">
      <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">{eyebrow}</p>
      <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">{title}</h2>
      {sub && <p className="text-sm text-slate-500 mt-1 leading-relaxed">{sub}</p>}
    </div>
  );
}
