const active = new Set<symbol>();

/** Reference-counted across Studio, polish and live UI instances. */
export function holdPageActivity(): () => void {
  const key = Symbol("page-task");
  active.add(key);
  return () => { active.delete(key); };
}

export function hasPageActivity(): boolean {
  return active.size > 0;
}
