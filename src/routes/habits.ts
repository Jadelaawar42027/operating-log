import { Router } from "express";
import { prisma } from "../lib/prisma";
import { ah } from "../lib/asyncHandler";

export const habitsRouter = Router();

habitsRouter.get("/", ah(async (req, res) => {
  const activeOnly = req.query.active === "true";
  const habits = await prisma.habit.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { sortOrder: "asc" },
  });
  res.json(habits);
}));

habitsRouter.post("/", ah(async (req, res) => {
  const { label, type, target, sortOrder, active } = req.body ?? {};

  if (typeof label !== "string" || !label.trim()) {
    return res.status(400).json({ error: "label is required" });
  }
  if (type !== "check" && type !== "number") {
    return res.status(400).json({ error: 'type must be "check" or "number"' });
  }

  let nextSortOrder = sortOrder;
  if (typeof nextSortOrder !== "number") {
    const max = await prisma.habit.aggregate({ _max: { sortOrder: true } });
    nextSortOrder = (max._max.sortOrder ?? -1) + 1;
  }

  const habit = await prisma.habit.create({
    data: {
      label: label.trim(),
      type,
      target: type === "number" && typeof target === "number" ? target : null,
      sortOrder: nextSortOrder,
      active: typeof active === "boolean" ? active : true,
    },
  });
  res.status(201).json(habit);
}));

habitsRouter.patch("/:id", ah(async (req, res) => {
  const { id } = req.params;
  const { label, type, target, sortOrder, active } = req.body ?? {};

  const existing = await prisma.habit.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Habit not found" });

  const data: Record<string, unknown> = {};
  if (typeof label === "string") data.label = label.trim();
  if (type === "check" || type === "number") data.type = type;
  if (target === null || typeof target === "number") data.target = target;
  if (typeof sortOrder === "number") data.sortOrder = sortOrder;
  if (typeof active === "boolean") data.active = active;

  const habit = await prisma.habit.update({ where: { id }, data });
  res.json(habit);
}));

habitsRouter.delete("/:id", ah(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.habit.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Habit not found" });

  await prisma.habit.delete({ where: { id } });
  res.status(204).send();
}));
