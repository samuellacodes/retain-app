type StatProps = { label: string; value: string; detail?: string };

export default function Stat({ label, value, detail }: StatProps) {
  return <article className="stat-card"><p>{label}</p><strong>{value}</strong>{detail && <span>{detail}</span>}</article>;
}
