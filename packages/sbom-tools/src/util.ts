export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  includeKeys: readonly K[],
): Pick<T, K> {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => includeKeys.includes(key as K)),
  ) as Pick<T, K>;
}

export function deduplicateArray<
  T extends Record<string, unknown>,
  K extends keyof T = keyof T,
>(array: readonly T[], byKeys: readonly K[] | null = null): T[] {
  const existingValues = new Set<string>();
  const ret: T[] = [];
  for (const item of array) {
    const key = JSON.stringify(byKeys ? pick(item, byKeys) : item);
    if (existingValues.has(key)) continue;
    existingValues.add(key);
    ret.push(item);
  }
  return ret;
}
