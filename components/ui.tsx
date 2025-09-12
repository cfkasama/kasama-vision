import clsx from "clsx";

export function Card({ className, children }:{ className?:string; children:React.ReactNode }) {
  return <div className={clsx("rounded-xl border bg-white p-4 shadow-sm", className)}>{children}</div>;
}
export function Pill({ children, color="gray" }:{ children:React.ReactNode; color?: "gray"|"gold"|"green"|"orange" }) {
  const map = { gray:"bg-gray-100 text-gray-700", gold:"bg-yellow-100 text-yellow-800", green:"bg-green-100 text-green-800", orange:"bg-orange-100 text-orange-800" } as const;
  return <span className={clsx("inline-flex rounded-full px-2 py-0.5 text-[11px]", map[color])}>{children}</span>;
}
export function Chip({ children }:{ children:React.ReactNode }) {
  return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{children}</span>;
}
