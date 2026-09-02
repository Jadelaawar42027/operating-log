import { Router } from "express";
import { prisma } from "../lib/prisma";
import { isValidDateString, parseDateOnly } from "../lib/dates";
import { ah } from "../lib/asyncHandler";

export const daysRouter = Router();

daysRouter.get("/:date", ah(async (req, res) => {
  const { date } = req.params;
  if (!isValidDateString(date)) {
    return res.status(400).json({ error: "date must be YYYY-MM-DD" });
  }

  const habits = await prisma.habit.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  const logs = await prisma.habitLog.findMany({
    where: { date: parseDateOnly(date) },
  });

  const logsByHabit: Record<string, { completed: boolean | null; value: number | null }> = {};
  for (const log of logs) {
    logsByHabit[log.habitId] = { completed: log.completed, value: log.value };
  }

  res.json({ date, habits, logs: logsByHabit });
}));

daysRouter.put("/:date/habits/:habitId", ah(async (req, res) => {
  const { date, habitId } = req.params;
  if (!isValidDateString(date)) {
    return res.status(400).json({ error: "date must be YYYY-MM-DD" });
  }

  const habit = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!habit) return res.status(404).json({ error: "Habit not found" });

  const { completed, value } = req.body ?? {};
  if (completed === undefined && value === undefined) {
    return res.status(400).json({ error: "completed or value is required" });
  }

  const data: { completed?: boolean | null; value?: number | null } = {};
  if (completed !== undefined) {
    if (completed !== null && typeof completed !== "boolean") {
      return res.status(400).json({ error: "completed must be boolean or null" });
    }
    data.completed = completed;
  }
  if (value !== undefined) {
    if (value !== null && typeof value !== "number") {
      return res.status(400).json({ error: "value must be a number or null" });
    }
    data.value = value;
  }

  const dateOnly = parseDateOnly(date);
  const log = await prisma.habitLog.upsert({
    where: { habitId_date: { habitId, date: dateOnly } },
    create: { habitId, date: dateOnly, ...data },
    update: data,
  });

  res.json(log);
}));
