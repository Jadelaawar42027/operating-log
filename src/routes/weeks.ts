import { Router } from "express";
import { prisma } from "../lib/prisma";
import { addDays, formatDateOnly, isValidDateString, mondayOf, parseDateOnly } from "../lib/dates";
import { ah } from "../lib/asyncHandler";

export const weeksRouter = Router();

weeksRouter.get("/:weekStart", ah(async (req, res) => {
  const raw = req.params.weekStart;
  if (!isValidDateString(raw)) {
    return res.status(400).json({ error: "weekStart must be YYYY-MM-DD" });
  }
  const weekStart = mondayOf(raw);
  const weekStartDate = parseDateOnly(weekStart);
  const dayStrings = Array.from({ length: 7 }, (_, i) => formatDateOnly(addDays(weekStartDate, i)));

  const [habits, week, logs] = await Promise.all([
    prisma.habit.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.week.findUnique({ where: { weekStart: weekStartDate } }),
    prisma.habitLog.findMany({
      where: {
        date: { gte: weekStartDate, lte: parseDateOnly(dayStrings[6]) },
      },
    }),
  ]);

  const logsByDate: Record<string, Record<string, { completed: boolean | null; value: number | null }>> = {};
  for (const day of dayStrings) logsByDate[day] = {};
  for (const log of logs) {
    const dayStr = formatDateOnly(log.date);
    if (!logsByDate[dayStr]) logsByDate[dayStr] = {};
    logsByDate[dayStr][log.habitId] = { completed: log.completed, value: log.value };
  }

  res.json({
    weekStart,
    days: dayStrings.map((date) => ({ date, logs: logsByDate[date] })),
    habits,
    sidequestDone: week?.sidequestDone ?? false,
    sidequestNote: week?.sidequestNote ?? "",
  });
}));

weeksRouter.put("/:weekStart", ah(async (req, res) => {
  const raw = req.params.weekStart;
  if (!isValidDateString(raw)) {
    return res.status(400).json({ error: "weekStart must be YYYY-MM-DD" });
  }
  const weekStart = mondayOf(raw);
  const weekStartDate = parseDateOnly(weekStart);

  const { sidequestDone, sidequestNote } = req.body ?? {};
  if (sidequestDone === undefined && sidequestNote === undefined) {
    return res.status(400).json({ error: "sidequestDone or sidequestNote is required" });
  }

  const data: { sidequestDone?: boolean; sidequestNote?: string } = {};
  if (sidequestDone !== undefined) {
    if (typeof sidequestDone !== "boolean") {
      return res.status(400).json({ error: "sidequestDone must be boolean" });
    }
    data.sidequestDone = sidequestDone;
  }
  if (sidequestNote !== undefined) {
    if (typeof sidequestNote !== "string") {
      return res.status(400).json({ error: "sidequestNote must be a string" });
    }
    data.sidequestNote = sidequestNote;
  }

  const week = await prisma.week.upsert({
    where: { weekStart: weekStartDate },
    create: {
      weekStart: weekStartDate,
      sidequestDone: data.sidequestDone ?? false,
      sidequestNote: data.sidequestNote ?? "",
    },
    update: data,
  });

  res.json(week);
}));
