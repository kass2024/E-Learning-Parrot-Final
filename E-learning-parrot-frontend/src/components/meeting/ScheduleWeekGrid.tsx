import { useCallback, useMemo, useRef, useState } from "react";
import { DateTime } from "luxon";

import type { AvailableScheduleRow } from "@/api/axios";
import {
  bookingsForDate,
  dateBookingStatus,
  dateKey,
  getTimeSlotsForDate,
  isDateBlocked,
  meetingDurationMinutes,
  scheduleWindowMinutes,
  schedulesForDate,
  type BookedMeetingSlot,
  type MeetingCalendarConfig,
} from "@/lib/meetingScheduleUtils";
import { cn } from "@/lib/utils";

const GRID_START_HOUR = 6;
const GRID_END_HOUR = 21;
const HOUR_HEIGHT = 48;
const SNAP_MINUTES = 30;

export type WeekTimeSelection = {
  date: Date;
  startTime: string;
  endTime: string;
};

type ScheduleWeekGridProps = {
  weekStart: Date;
  schedules: AvailableScheduleRow[];
  calendar: MeetingCalendarConfig;
  bookedSlots?: BookedMeetingSlot[];
  adminZone: string;
  isCohort?: boolean;
  selectedDate?: Date | null;
  onSelectRange: (selection: WeekTimeSelection) => void;
  onSelectDay: (date: Date) => void;
};

function parseTimeParts(time: string | null | undefined) {
  const raw = String(time ?? "").slice(0, 5);
  const [h, m] = raw.split(":").map((v) => Number(v) || 0);
  return { hour: h, minute: m };
}

function minutesToTime(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function snapMinutes(raw: number) {
  const min = GRID_START_HOUR * 60;
  const max = GRID_END_HOUR * 60;
  const clamped = Math.max(min, Math.min(max, raw));
  return Math.round(clamped / SNAP_MINUTES) * SNAP_MINUTES;
}

function yToMinutes(y: number) {
  return snapMinutes(GRID_START_HOUR * 60 + (y / HOUR_HEIGHT) * 60);
}

function blockStyle(startMin: number, endMin: number) {
  const gridStart = GRID_START_HOUR * 60;
  const top = ((startMin - gridStart) / 60) * HOUR_HEIGHT;
  const height = ((endMin - startMin) / 60) * HOUR_HEIGHT;
  return { top: Math.max(0, top), height: Math.max(24, height) };
}

function getWeekDays(weekStart: Date, zone: string) {
  const start = DateTime.fromJSDate(weekStart, { zone }).startOf("day");
  return Array.from({ length: 7 }, (_, i) => start.plus({ days: i }).toJSDate());
}

export function ScheduleWeekGrid({
  weekStart,
  schedules,
  calendar,
  bookedSlots = [],
  adminZone,
  isCohort = false,
  selectedDate,
  onSelectRange,
  onSelectDay,
}: ScheduleWeekGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ dayIndex: number; startMin: number; endMin: number } | null>(
    null
  );

  const days = useMemo(() => getWeekDays(weekStart, adminZone), [weekStart, adminZone]);
  const todayStart = DateTime.now().setZone(adminZone).startOf("day");

  const isPastDay = (day: Date) =>
    DateTime.fromJSDate(day, { zone: adminZone }).startOf("day") < todayStart;
  const todayKey = todayStart.toFormat("yyyy-MM-dd");
  const totalHeight = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_HEIGHT;
  const hours = Array.from(
    { length: GRID_END_HOUR - GRID_START_HOUR },
    (_, i) => GRID_START_HOUR + i
  );

  const nowLine = useMemo(() => {
    const now = DateTime.now().setZone(adminZone);
    const todayIdx = days.findIndex((d) => dateKey(d, adminZone) === todayKey);
    if (todayIdx < 0) return null;
    const mins = now.hour * 60 + now.minute;
    if (mins < GRID_START_HOUR * 60 || mins > GRID_END_HOUR * 60) return null;
    const top = ((mins - GRID_START_HOUR * 60) / 60) * HOUR_HEIGHT;
    return { dayIndex: todayIdx, top };
  }, [days, adminZone, todayKey]);

  const finishDrag = useCallback(
    (dayIndex: number, startMin: number, endMin: number) => {
      const lo = Math.min(startMin, endMin);
      const hi = Math.max(startMin, endMin);
      const end = hi <= lo ? lo + SNAP_MINUTES : hi;
      onSelectRange({
        date: days[dayIndex],
        startTime: minutesToTime(lo),
        endTime: minutesToTime(Math.min(end, GRID_END_HOUR * 60)),
      });
      setDrag(null);
    },
    [days, onSelectRange]
  );

  const handlePointerDown = (dayIndex: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || isPastDay(days[dayIndex])) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const startMin = yToMinutes(y);
    setDrag({ dayIndex, startMin, endMin: startMin });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (dayIndex: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag || drag.dayIndex !== dayIndex) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setDrag({ ...drag, endMin: yToMinutes(y) });
  };

  const handlePointerUp = (dayIndex: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag || drag.dayIndex !== dayIndex) return;
    finishDrag(dayIndex, drag.startMin, drag.endMin);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div ref={gridRef} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid shrink-0 grid-cols-[56px_repeat(7,1fr)] border-b border-slate-200 bg-white">
        <div className="border-r border-slate-100" />
        {days.map((day) => {
          const key = dateKey(day, adminZone);
          const dt = DateTime.fromJSDate(day, { zone: adminZone });
          const isToday = key === todayKey;
          const isSelected =
            selectedDate && dateKey(selectedDate, adminZone) === key;
          const blocked = !isCohort && isDateBlocked(day, calendar, adminZone);
          const past = isPastDay(day);
          const hasAvailability = schedulesForDate(schedules, day, adminZone).length > 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                "flex flex-col items-center border-r border-slate-100 py-2 transition-colors last:border-r-0 hover:bg-slate-50",
                isSelected && "bg-[#38761D]/8",
                (blocked || past) && "opacity-60"
              )}
            >
              <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
                {dt.toFormat("ccc")}
              </span>
              <span
                className={cn(
                  "mt-0.5 flex h-9 w-9 items-center justify-center rounded-full text-lg font-medium",
                  isToday && "bg-[#38761D] text-white",
                  !isToday && isSelected && "bg-[#38761D]/15 text-[#38761D]",
                  !isToday && !isSelected && "text-slate-800"
                )}
              >
                {dt.day}
              </span>
              {!isCohort && blocked && (
                <span className="mt-0.5 text-[0.6rem] font-medium text-red-500">Closed</span>
              )}
              {!blocked && hasAvailability && (
                <span className="mt-1 h-1 w-1 rounded-full bg-emerald-500" />
              )}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          className="grid grid-cols-[56px_repeat(7,1fr)]"
          style={{ minHeight: totalHeight + 8 }}
        >
          <div className="relative border-r border-slate-100 bg-slate-50/50">
            {hours.map((hour) => (
              <div
                key={hour}
                className="relative border-b border-slate-100 pr-2 text-right text-[0.65rem] text-slate-400"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="absolute -top-2 right-2">
                  {DateTime.fromObject({ hour }).toFormat("h a")}
                </span>
              </div>
            ))}
          </div>

          {days.map((day, dayIndex) => {
            const key = dateKey(day, adminZone);
            const blocked = !isCohort && isDateBlocked(day, calendar, adminZone);
            const past = isPastDay(day);
            const daySchedules = schedulesForDate(schedules, day, adminZone);
            const dayBookings = !isCohort ? bookingsForDate(day, bookedSlots, adminZone) : [];

            return (
              <div
                key={key}
                className={cn(
                  "relative border-r border-slate-100 last:border-r-0",
                  blocked && "bg-red-50/30",
                  past && !blocked && "bg-slate-50/60"
                )}
                style={{ height: totalHeight }}
              >
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="border-b border-slate-100/80"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}

                {!blocked &&
                  daySchedules.map((schedule) => {
                    const window = scheduleWindowMinutes(schedule, key, adminZone);
                    if (!window) return null;
                    const style = blockStyle(window.startMin, window.endMin);
                    const start = parseTimeParts(schedule.start_time);
                    const end = parseTimeParts(schedule.end_time);
                    const status = isCohort
                      ? "bookable"
                      : dateBookingStatus(schedules, day, adminZone, calendar, bookedSlots);
                    const remaining = isCohort
                      ? 0
                      : getTimeSlotsForDate(day, [schedule], adminZone, bookedSlots).length;
                    const statusLabel =
                      status === "past_day"
                        ? "Ended — hidden on booking"
                        : status === "exhausted"
                          ? "No times left today"
                          : remaining > 0
                            ? `${remaining} open on booking`
                            : "Open for booking";
                    return (
                      <button
                        key={schedule.id}
                        type="button"
                        className={cn(
                          "absolute inset-x-0.5 z-10 overflow-hidden rounded-md border px-1.5 py-0.5 text-left text-[0.65rem] font-medium shadow-sm transition",
                          status === "bookable"
                            ? "border-[#38761D]/25 bg-[#38761D]/12 text-[#38761D] hover:bg-[#38761D]/20"
                            : "border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                        style={style}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRange({
                            date: day,
                            startTime: `${String(start.hour).padStart(2, "0")}:${String(start.minute).padStart(2, "0")}`,
                            endTime: `${String(end.hour).padStart(2, "0")}:${String(end.minute).padStart(2, "0")}`,
                          });
                        }}
                      >
                        <span className="block truncate">
                          {String(schedule.start_time).slice(0, 5)} -{" "}
                          {String(schedule.end_time).slice(0, 5)}
                        </span>
                        {isCohort ? (
                          <span className="block truncate opacity-80">Cohort session</span>
                        ) : (
                          <span className="block truncate opacity-80">{statusLabel}</span>
                        )}
                      </button>
                    );
                  })}

                {!isCohort &&
                  dayBookings.map((slot) => {
                    try {
                      const dt = DateTime.fromISO(slot.starts_at, { zone: "utc" }).setZone(
                        adminZone
                      );
                      const duration = meetingDurationMinutes(
                        daySchedules.find((s) => s.id === slot.schedule_id) ?? daySchedules[0]
                      );
                      const startMin = dt.hour * 60 + dt.minute;
                      const style = blockStyle(startMin, startMin + duration);
                      return (
                        <div
                          key={`${slot.registration_id}-${slot.starts_at}`}
                          className="absolute inset-x-0.5 z-20 overflow-hidden rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[0.65rem] font-medium text-amber-950"
                          style={style}
                          title={slot.full_name ?? undefined}
                        >
                          <span className="block truncate">{dt.toFormat("h:mm a")}</span>
                          <span className="block truncate opacity-90">
                            {slot.full_name || "Booked"}
                          </span>
                        </div>
                      );
                    } catch {
                      return null;
                    }
                  })}

                {drag?.dayIndex === dayIndex && (
                  <div
                    className="pointer-events-none absolute inset-x-1 z-30 rounded-md border-2 border-dashed border-[#38761D] bg-[#38761D]/15"
                    style={blockStyle(
                      Math.min(drag.startMin, drag.endMin),
                      Math.max(drag.startMin, drag.endMin) || drag.startMin + SNAP_MINUTES
                    )}
                  />
                )}

                {nowLine?.dayIndex === dayIndex && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-40 flex items-center"
                    style={{ top: nowLine.top }}
                  >
                    <div className="h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#E01C21]" />
                    <div className="h-0.5 flex-1 bg-[#E01C21]" />
                  </div>
                )}

                {!blocked && !past && (
                  <div
                    className="absolute inset-0 z-0 cursor-crosshair"
                    onPointerDown={(e) => handlePointerDown(dayIndex, e)}
                    onPointerMove={(e) => handlePointerMove(dayIndex, e)}
                    onPointerUp={(e) => handlePointerUp(dayIndex, e)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function getMondayWeekStart(date: Date, zone: string): Date {
  const dt = DateTime.fromJSDate(date, { zone }).startOf("day");
  const daysFromMonday = dt.weekday === 7 ? 6 : dt.weekday - 1;
  return dt.minus({ days: daysFromMonday }).toJSDate();
}
