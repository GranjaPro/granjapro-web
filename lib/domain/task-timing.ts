export const TASK_OVERDUE_GRACE_MINUTES = 60;

interface TaskMissedCheck {
  occurrenceDate: string;
  today: string;
  scheduledTime: string;
  currentMinutes: number;
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatTaskCompletionDate(completedAt: string): string {
  return new Date(completedAt)
    .toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(", ", " às ");
}

export function shouldMarkTaskOccurrenceMissed({
  occurrenceDate,
  today,
  scheduledTime,
  currentMinutes,
}: TaskMissedCheck): boolean {
  if (occurrenceDate < today) return true;
  if (occurrenceDate !== today || scheduledTime === "--:--") return false;

  const [hours, minutes] = scheduledTime.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return false;

  return hours * 60 + minutes + TASK_OVERDUE_GRACE_MINUTES < currentMinutes;
}
