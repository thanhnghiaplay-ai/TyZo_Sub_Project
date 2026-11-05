import type { ReactNode } from "react";
import { ROLE_LABEL, type StaffRole } from "@/lib/staff-role";
import { badgeStyle, type BadgeStyleId } from "@/lib/badge-styles";

export function RoleMark({ rank, styleId }: { rank: StaffRole | null; styleId: string }) {
  const style = badgeStyle(styleId);
  const label = rank ? ROLE_LABEL[rank] : "Người dùng";
  return <span className={"role-mark role-mark-" + style}><b>{label}</b></span>;
}

export function AccountCard({
  rank,
  styleId,
  className = "",
  children,
}: {
  rank: StaffRole | null;
  styleId: string;
  className?: string;
  children: ReactNode;
}) {
  const style: BadgeStyleId = badgeStyle(styleId);
  return (
    <article data-badge={style} data-rank={rank ?? "user"} className={"account-card rounded-2xl border border-line bg-card p-4 " + className}>
      <RoleMark rank={rank} styleId={style} />
      {children}
    </article>
  );
}
