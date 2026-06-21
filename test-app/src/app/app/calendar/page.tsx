"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const PRIORITY_DOT: Record<string, string> = {
  Low: "bg-slate-400",
  Medium: "bg-amber-400",
  High: "bg-red-500",
};

export default function CalendarPage() {
  const { state, hydrated } = useStore();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const tasksByDate = useMemo(() => {
    const map: Record<string, typeof state.tasks> = {};
    for (const task of state.tasks) {
      if (task.dueDate) {
        if (!map[task.dueDate]) map[task.dueDate] = [];
        map[task.dueDate].push(task);
      }
    }
    return map;
  }, [state.tasks]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  function prevMonth() {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="calendar-heading">
        Calendar
      </h1>
      <p className="mt-1 text-sm text-slate-500">See your tasks by due date.</p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            data-testid="calendar-prev"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Previous
          </button>
          <h2 className="text-lg font-semibold text-slate-900" data-testid="calendar-month-label">
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={nextMonth}
            data-testid="calendar-next"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Next
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-px">
          {DAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-slate-500">
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="min-h-[80px] bg-slate-50/50 p-1" />;
            }
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayTasks = tasksByDate[dateStr] ?? [];
            const isToday = dateStr === todayStr;

            return (
              <div
                key={dateStr}
                data-testid={`calendar-day-${dateStr}`}
                className={`min-h-[80px] border border-slate-100 p-1 ${isToday ? "bg-brand-50" : "bg-white"}`}
              >
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  isToday ? "bg-brand-600 font-bold text-white" : "text-slate-700"
                }`}>
                  {day}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {dayTasks.slice(0, 3).map((task) => {
                    const project = state.projects.find((p) => p.id === task.projectId);
                    return (
                      <Link
                        key={task.id}
                        href={`/app/${task.projectId}`}
                        className={`flex items-center gap-1 rounded px-1 py-0.5 text-xs hover:bg-slate-100 ${
                          task.completed ? "text-slate-400 line-through" : "text-slate-700"
                        }`}
                      >
                        <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} />
                        <span className="truncate">{task.title}</span>
                      </Link>
                    );
                  })}
                  {dayTasks.length > 3 && (
                    <p className="px-1 text-[10px] text-slate-400">+{dayTasks.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {hydrated && (
        <div className="mt-6" data-testid="upcoming-tasks">
          <h2 className="text-lg font-semibold text-slate-900">Upcoming tasks</h2>
          {(() => {
            const upcoming = state.tasks
              .filter((t) => !t.completed && t.dueDate && t.dueDate >= todayStr)
              .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
              .slice(0, 10);

            if (upcoming.length === 0) {
              return (
                <p className="mt-3 text-sm text-slate-500">No upcoming tasks with due dates.</p>
              );
            }

            return (
              <ul className="mt-3 space-y-2">
                {upcoming.map((task) => {
                  const project = state.projects.find((p) => p.id === task.projectId);
                  return (
                    <li key={task.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`inline-block h-2 w-2 rounded-full ${PRIORITY_DOT[task.priority]}`} />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{task.title}</p>
                          <p className="text-xs text-slate-500">{project?.title ?? "Unknown project"}</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">{task.dueDate}</span>
                    </li>
                  );
                })}
              </ul>
            );
          })()}
        </div>
      )}
    </div>
  );
}
