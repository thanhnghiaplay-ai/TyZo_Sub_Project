export function BrandMark({ title, small = false }: { title?: string; small?: boolean }) {
  return (
    <svg
      className={small ? "brand-mark brand-mark-sm" : "brand-mark"}
      viewBox="0 0 80 80"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <rect className="brand-plate" x="8" y="18" width="64" height="44" rx="8" />
      <rect className="brand-frame" x="8" y="18" width="64" height="44" rx="8" />
      <path className="brand-play" d="M33 30.5v19l17-9.5-17-9.5z" />
    </svg>
  );
}
