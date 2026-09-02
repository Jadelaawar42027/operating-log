import path from "path";
import express, { NextFunction, Request, Response } from "express";
import { requireApiKey } from "./middleware/auth";
import { habitsRouter } from "./routes/habits";
import { daysRouter } from "./routes/days";
import { weeksRouter } from "./routes/weeks";
import { monthsRouter } from "./routes/months";
import { streakRouter } from "./routes/streak";
import { summaryRouter } from "./routes/summary";
import { healthRouter } from "./routes/health";
import { seedDefaultHabitsIfEmpty } from "./lib/seed";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());

// No auth required — used by Railway's healthcheck.
app.use("/api/health", healthRouter);

app.use("/api/habits", requireApiKey, habitsRouter);
app.use("/api/days", requireApiKey, daysRouter);
app.use("/api/weeks", requireApiKey, weeksRouter);
app.use("/api/months", requireApiKey, monthsRouter);
app.use("/api/streak", requireApiKey, streakRouter);
app.use("/api/summary", requireApiKey, summaryRouter);

app.use(express.static(path.join(__dirname, "..", "public")));

// Catches errors forwarded via next(err) from async routes so a single
// failed request (e.g. a transient DB hiccup) returns 500 instead of
// crashing the process via an unhandled rejection.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

async function start() {
  await seedDefaultHabitsIfEmpty();
  app.listen(PORT, () => {
    console.log(`Operating Log listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
