-- CreateEnum
CREATE TYPE "HabitType" AS ENUM ('check', 'number');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('People', 'Travel', 'Experiences', 'Health', 'Wealth', 'Work');

-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "HabitType" NOT NULL,
    "target" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitLog" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "completed" BOOLEAN,
    "value" DOUBLE PRECISION,

    CONSTRAINT "HabitLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Week" (
    "weekStart" DATE NOT NULL,
    "sidequestDone" BOOLEAN NOT NULL DEFAULT false,
    "sidequestNote" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Week_pkey" PRIMARY KEY ("weekStart")
);

-- CreateTable
CREATE TABLE "MonthReview" (
    "month" TEXT NOT NULL,
    "win" TEXT NOT NULL DEFAULT '',
    "miss" TEXT NOT NULL DEFAULT '',
    "income" DOUBLE PRECISION,
    "networth" DOUBLE PRECISION,
    "nextFocus" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthReview_pkey" PRIMARY KEY ("month")
);

-- CreateTable
CREATE TABLE "MonthCategoryScore" (
    "month" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "MonthCategoryScore_pkey" PRIMARY KEY ("month","category")
);

-- CreateIndex
CREATE UNIQUE INDEX "HabitLog_habitId_date_key" ON "HabitLog"("habitId", "date");

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
