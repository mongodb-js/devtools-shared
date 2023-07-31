/**
 * Create an array of numbers.
 */
export function range(from: number, to: number): number[] {
  // TODO: make this inlined.
  const list = new Array(to - from + 1);

  for (let i = 0; i < list.length; i += 1) {
    list[i] = from + i;
  }
  return list;
}
