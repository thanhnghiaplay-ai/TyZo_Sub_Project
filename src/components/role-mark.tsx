import type { ReactNode } from "react";
import { ROLE_LABEL, type StaffRole } from "@/lib/staff-role";
import { badgeStyle, type BadgeStyleId } from "@/lib/badge-styles";

export type MarkRank = StaffRole | "ctv";

const MARK_ORDER: MarkRank[] = ["chu", "quan-ly", "ho-tro", "ctv"];

function markLabel(rank: MarkRank | null) {
  if (rank === "ctv") return "Cộng tác";
  if (rank) return ROLE_LABEL[rank];
  return "Người dùng";
}

export function orderedMarks(ranks: Array<MarkRank | null | undefined>) {
  const have = new Set(ranks.filter((rank): rank is MarkRank => Boolean(rank)));
  return MARK_ORDER.filter((rank) => have.has(rank));
}

export function RoleMark({ rank, styleId }: { rank: MarkRank | null; styleId: string }) {
  const style = badgeStyle(styleId);
  return <span data-rank={rank ?? "user"} className={"role-mark role-mark-" + style}><b>{markLabel(rank)}</b></span>;
}

export function AccountCard({
  rank,
  extra,
  styleId,
  className = "",
  children,
}: {
  rank: MarkRank | null;
  extra?: Array<MarkRank | null | undefined>;
  styleId: string;
  className?: string;
  children: ReactNode;
}) {
  const style: BadgeStyleId = badgeStyle(styleId);
  const ranks = orderedMarks([rank, ...(extra ?? [])]);
  const top = ranks[0] ?? "user";
  return (
    <article data-badge={style} data-rank={top} data-marks={ranks.length > 1 ? ranks.length : 1} className={"account-card rounded-2xl border border-line bg-card p-4 " + className}>
      {ranks.length > 1 ? (
        <div className={"role-row role-row-" + style}>
          {ranks.map((item) => <RoleMark key={item} rank={item} styleId={style} />)}
        </div>
      ) : (
        <RoleMark rank={ranks[0] ?? null} styleId={style} />
      )}
      {children}
    </article>
  );
}