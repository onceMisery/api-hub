import { PropsWithChildren } from "react";

export function PanelCard({ children }: PropsWithChildren) {
  return <div className="rounded-3xl border border-white/10 bg-white/70 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">{children}</div>;
}
