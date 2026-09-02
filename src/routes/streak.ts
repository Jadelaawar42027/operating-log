import { Router } from "express";
import { computeStreak } from "../lib/streak";
import { ah } from "../lib/asyncHandler";

export const streakRouter = Router();

streakRouter.get("/", ah(async (_req, res) => {
  const streak = await computeStreak();
  res.json({ streak });
}));
