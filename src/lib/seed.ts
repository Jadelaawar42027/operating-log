import { prisma } from "./prisma";

const DEFAULT_HABITS: {
  label: string;
  type: "check" | "number";
  target?: number;
}[] = [
  { label: "Wake by 7:00", type: "check" },
  { label: "Two meals on plan", type: "check" },
  { label: "Workout done", type: "check" },
  { label: "Deep work hours", type: "number", target: 4 },
  { label: "Zero drift (no scroll spiral)", type: "check" },
  { label: "No negative self-talk", type: "check" },
  { label: "Stuck to today's calendar/plan", type: "check" },
];

export async function seedDefaultHabitsIfEmpty(): Promise<void> {
  const existing = await prisma.habit.count();
  if (existing > 0) return;

  await prisma.$transaction(
    DEFAULT_HABITS.map((h, i) =>
      prisma.habit.create({
        data: {
          label: h.label,
          type: h.type,
          target: h.target ?? null,
          sortOrder: i,
        },
      })
    )
  );
  console.log(`Seeded ${DEFAULT_HABITS.length} default habits.`);
}
