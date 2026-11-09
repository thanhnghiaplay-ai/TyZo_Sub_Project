import type { ReactNode } from "react";
import { ROLE_LABEL, type StaffRole } from "@/lib/staff-role";
import { badgeStyle, type BadgeStyleId } from "@/lib/badge-styles";

export type MarkRank = StaffRole | "ctv";

function markLabel(rank: MarkRank | null) {
  if (rank === "ctv") return "Cộng tác";
  if (rank) return ROLE_LABEL[rank];
  return "Người dùng";
}

export function RoleMark({ rank, styleId }: { rank: MarkRank | null; styleId: string }) {
  const style = badgeStyle(styleId);
  return <span className={"role-mark role-mark-" + style}><b>{markLabel(rank)}</b></span>;
}

export function AccountCard({
  rank,
  styleId,
  className = "",
  children,
}: {
  rank: MarkRank | null;
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
