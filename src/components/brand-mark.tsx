export function BrandMark({ title, small = false }: { title?: string; small?: boolean }) {
  return (
    <svg
      className={small ? "brand-mark brand-mark-sm" : "brand-mark"}
      viewBox="0 0 80 80"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <rect className="brand-halo" x="4" y="14" width="72" height="52" rx="10" />
      <rect className="brand-plate" x="8" y="18" width="64" height="44" rx="7" />
      <rect className="brand-frame" x="8" y="18" width="64" height="44" rx="7" />
      <path className="brand-play" d="M34 31v18l15-9-15-9z" />
    </svg>
  );
}
