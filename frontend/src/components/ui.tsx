import type { Opt } from "../lib/options";

export function Pills({ opts, selected, onToggle }: {
  opts: Opt[]; selected: string[]; onToggle: (v: string) => void;
}) {
  return (
    <div className="pills">
      {opts.map((o) => (
        <button key={o.v} type="button"
          className={"pill" + (o.surprise ? " surprise" : "")}
          aria-pressed={selected.includes(o.v)}
          onClick={() => onToggle(o.v)}>
          <span className="emo">{o.e}</span>{o.v}
        </button>
      ))}
    </div>
  );
}

export function Seg({ opts, value, onChange }: {
  opts: readonly string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="seg">
      {opts.map((o) => (
        <button key={o} type="button" aria-pressed={value === o}
          onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}

export function AgePills({ value, onChange, min = 1, max = 16 }: {
  value: number; onChange: (n: number) => void; min?: number; max?: number;
}) {
  const ages = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className="age-row">
      {ages.map((a) => (
        <button key={a} type="button" className="pill age" aria-pressed={value === a}
          onClick={() => onChange(a)}>{a}</button>
      ))}
    </div>
  );
}

export function toggle(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}
