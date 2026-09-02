import { prisma } from "./prisma";
import { addDays, formatDateOnly, parseDateOnly, todayDateString } from "./dates";

export type HabitStatus = "done" | "pending" | "value-so-far";

export interface HabitDaySummary {
  id: string;
  label: string;
  type: "check" | "number";
  target: number | null;
  completed: boolean | null;
  value: number | null;
  status: HabitStatus;
}

function summarizeHabit(
  habit: { id: string; label: string; type: string; target: number | null },
  log: { completed: boolean | null; value: number | null } | undefined
): HabitDaySummary {
  const completed = log?.completed ?? null;
  const value = log?.value ?? null;

  let status: HabitStatus;
  let isDone: boolean;

  if (habit.type === "check") {
    isDone = completed === true;
    status = isDone ? "done" : "pending";
  } else {
    const meetsTarget = value !== null && (habit.target == null || value >= habit.target);
    isDone = meetsTarget;
    if (isDone) status = "done";
    else if (value !== null) status = "value-so-far";
    else status = "pending";
  }

  return {
    id: habit.id,
    label: habit.label,
    type: habit.type as "check" | "number",
    target: habit.target,
    completed,
    value,
    status,
  };
}

export async function getDaySummary(dateStr: string): Promise<{ habits: HabitDaySummary[]; allComplete: boolean }> {
  const habits = await prisma.habit.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  if (habits.length === 0) return { habits: [], allComplete: false };

  const logs = await prisma.habitLog.findMany({ where: { date: parseDateOnly(dateStr) } });
  const logsByHabit = new Map(logs.map((l) => [l.habitId, l]));

  const summaries = habits.map((h) => summarizeHabit(h, logsByHabit.get(h.id)));
  const allComplete = summaries.every((s) => s.status === "done");
  return { habits: summaries, allComplete };
}

export async function computeStreak(): Promise<number> {
  const today = todayDateString();
  const { allComplete: todayComplete } = await getDaySummary(today);

  let cursorStr = todayComplete ? today : formatDateOnly(addDays(parseDateOnly(today), -1));
  let streak = 0;

  while (true) {
    const { allComplete } = await getDaySummary(cursorStr);
    if (!allComplete) break;
    streak++;
    cursorStr = formatDateOnly(addDays(parseDateOnly(cursorStr), -1));
    if (streak > 3650) break; // sanity guard
  }

  return streak;
}
