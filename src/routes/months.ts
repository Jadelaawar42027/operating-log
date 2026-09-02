import { Router } from "express";
import { prisma } from "../lib/prisma";
import { isValidMonthString } from "../lib/dates";
import { ah } from "../lib/asyncHandler";

export const monthsRouter = Router();

const CATEGORIES = ["People", "Travel", "Experiences", "Health", "Wealth", "Work"] as const;
type CategoryName = (typeof CATEGORIES)[number];

monthsRouter.get("/:month", ah(async (req, res) => {
  const { month } = req.params;
  if (!isValidMonthString(month)) {
    return res.status(400).json({ error: "month must be YYYY-MM" });
  }

  const [review, scores] = await Promise.all([
    prisma.monthReview.findUnique({ where: { month } }),
    prisma.monthCategoryScore.findMany({ where: { month } }),
  ]);

  const categories: Record<string, { score: number; notes: string }> = {};
  for (const cat of CATEGORIES) categories[cat] = { score: 0, notes: "" };
  for (const s of scores) categories[s.category] = { score: s.score, notes: s.notes };

  res.json({
    month,
    win: review?.win ?? "",
    miss: review?.miss ?? "",
    income: review?.income ?? null,
    networth: review?.networth ?? null,
    nextFocus: review?.nextFocus ?? "",
    updatedAt: review?.updatedAt ?? null,
    categories,
  });
}));

monthsRouter.put("/:month", ah(async (req, res) => {
  const { month } = req.params;
  if (!isValidMonthString(month)) {
    return res.status(400).json({ error: "month must be YYYY-MM" });
  }

  const { win, miss, income, networth, nextFocus } = req.body ?? {};
  const data: Record<string, unknown> = {};
  if (typeof win === "string") data.win = win;
  if (typeof miss === "string") data.miss = miss;
  if (income === null || typeof income === "number") data.income = income;
  if (networth === null || typeof networth === "number") data.networth = networth;
  if (typeof nextFocus === "string") data.nextFocus = nextFocus;

  const review = await prisma.monthReview.upsert({
    where: { month },
    create: { month, ...data },
    update: data,
  });

  res.json(review);
}));

monthsRouter.put("/:month/categories/:category", ah(async (req, res) => {
  const { month, category } = req.params;
  if (!isValidMonthString(month)) {
    return res.status(400).json({ error: "month must be YYYY-MM" });
  }
  if (!CATEGORIES.includes(category as CategoryName)) {
    return res.status(400).json({ error: `category must be one of ${CATEGORIES.join(", ")}` });
  }

  const { score, notes } = req.body ?? {};
  const data: Record<string, unknown> = {};
  if (typeof score === "number") {
    if (score < 0 || score > 10) {
      return res.status(400).json({ error: "score must be between 0 and 10" });
    }
    data.score = score;
  }
  if (typeof notes === "string") data.notes = notes;

  const result = await prisma.monthCategoryScore.upsert({
    where: { month_category: { month, category: category as CategoryName } },
    create: { month, category: category as CategoryName, score: (data.score as number) ?? 0, notes: (data.notes as string) ?? "" },
    update: data,
  });

  res.json(result);
}));
