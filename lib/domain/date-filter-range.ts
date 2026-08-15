function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMonthDateRange(selectedDate: Date, today = new Date()) {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const endDate = isCurrentMonth ? today : new Date(year, month + 1, 0);

  return {
    startDate: toLocalDateString(new Date(year, month, 1)),
    endDate: toLocalDateString(endDate),
  };
}
