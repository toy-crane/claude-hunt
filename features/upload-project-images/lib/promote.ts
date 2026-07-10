/**
 * 지정한 슬롯을 배열 맨 앞(대표 자리)으로 옮긴다. 나머지 슬롯의 상대
 * 순서와 객체 동일성은 보존한다 — edit-form이 onChange 결과를 id로
 * 재조합하므로 슬롯 객체를 새로 만들면 안 된다.
 */
export function promoteToPrimary<T extends { id: string }>(
  slots: T[],
  id: string
): T[] {
  const index = slots.findIndex((slot) => slot.id === id);
  if (index <= 0) {
    return slots;
  }
  const target = slots[index];
  if (!target) {
    return slots;
  }
  return [target, ...slots.filter((slot) => slot.id !== id)];
}
