import type { ReactNode } from "react";
import { SectionArt } from "./art";

export default function PageHero({ kind, eyebrow, title, tease }: {
  kind: string; eyebrow: string; title: ReactNode; tease: string;
}) {
  return (
    <section className="page-hero">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="ph-title">{title}</h1>
        <p className="ph-tease">{tease}</p>
      </div>
      <div className="ph-art"><SectionArt kind={kind} /></div>
    </section>
  );
}
