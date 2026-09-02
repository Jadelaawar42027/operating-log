import { Router } from "express";
import { computeStreak, getDaySummary } from "../lib/streak";
import { todayDateString } from "../lib/dates";
import { ah } from "../lib/asyncHandler";

export const summaryRouter = Router();

// Bot-friendly digest for a future SMS bot to call every evening.
summaryRouter.get("/today", ah(async (_req, res) => {
  const date = todayDateString();
  const [{ habits }, streak] = await Promise.all([getDaySummary(date), computeStreak()]);
  res.json({ date, habits, streak });
}));
