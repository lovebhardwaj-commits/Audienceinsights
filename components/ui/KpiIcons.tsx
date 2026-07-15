const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function ReachIcon() {
  return <svg {...base}><circle cx="9" cy="8" r="3" /><path d="M2.5 19c.5-3 2.8-5 6.5-5s6 2 6.5 5" /><path d="M16 11c2.2 0 3.8 1.5 4.2 3.5" /><circle cx="17" cy="7.5" r="2.5" /></svg>;
}

export function SpendIcon() {
  return <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M12 7v10" /><path d="M9.5 9.5c0-1.1 1.1-2 2.5-2s2.5.9 2.5 2-1.1 2-2.5 2-2.5.9-2.5 2 1.1 2 2.5 2 2.5-.9 2.5-2" /></svg>;
}

export function PercentIcon() {
  return <svg {...base}><line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg>;
}

export function TrendUpIcon() {
  return <svg {...base}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>;
}

export function OverlapIcon() {
  return <svg {...base}><circle cx="9.5" cy="12" r="6" opacity="0.5" /><circle cx="14.5" cy="12" r="6" opacity="0.5" /></svg>;
}

export function CountIcon() {
  return <svg {...base}><path d="M4 4h6v6H4z" /><path d="M14 4h6v6h-6z" /><path d="M4 14h6v6H4z" /><path d="M14 14h6v6h-6z" /></svg>;
}

export function ClockSmallIcon() {
  return <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
}

export function ChartBarIcon() {
  return <svg {...base}><rect x="3" y="12" width="4" height="8" rx="1" /><rect x="10" y="8" width="4" height="12" rx="1" /><rect x="17" y="4" width="4" height="16" rx="1" /></svg>;
}
