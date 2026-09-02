import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

async function main() {
  const existing = await prisma.habit.count();
  if (existing > 0) {
    console.log(`Habits already seeded (${existing} found). Skipping.`);
    return;
  }

  for (let i = 0; i < DEFAULT_HABITS.length; i++) {
    const h = DEFAULT_HABITS[i];
    await prisma.habit.create({
      data: {
        label: h.label,
        type: h.type,
        target: h.target ?? null,
        sortOrder: i,
      },
    });
  }
  console.log(`Seeded ${DEFAULT_HABITS.length} default habits.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
