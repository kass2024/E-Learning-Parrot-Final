import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Video,
} from "lucide-react";

import type { AvailableScheduleRow } from "@/api/axios";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { HUB } from "@/lib/hubConfig";
import ParrotLogo from "@/components/ParrotLogo";
import {
  buildTimezoneOptions,
  dateHasAvailability,
  getBrowserTimezone,
  getTimeSlotsForDate,
  isDateBlocked,
  isMonthBlocked,
  listUpcomingBookableDays,
  monthHasBookableDates,
  resolveLearnerTimezone,
  resolveMeetingSchedules,
  resolveDurationSchedule,
  scheduleDurationLabel,
  timezoneDisplayLabel,
  dateKey,
  type MeetingCalendarConfig,
  type MeetingTimeSlot,
  type BookedMeetingSlot,
} from "@/lib/meetingScheduleUtils";
import { cn } from "@/lib/utils";

type TimezoneOption = {
  iana: string;
  label: string;
};

type MeetingSchedulePickerProps = {
  schedules: AvailableScheduleRow[];
  calendar: MeetingCalendarConfig;
  bookedSlots?: BookedMeetingSlot[];
  learnerTimezone: string | null;
  timezoneOptions: TimezoneOption[];
  onTimezoneChange: (iana: string) => void;
  selectedSlot: MeetingTimeSlot | null;
  onSelectSlot: (slot: MeetingTimeSlot | null) => void;
  onContinue: () => void;
  preview?: boolean;
  /** When set, replaces hub branding in the sidebar. */
  brand?: {
    name: string;
    company?: string | null;
    tagline?: string | null;
    contactEmail?: string | null;
    logoUrl?: string | null;
  };
};

export function MeetingSchedulePicker({
  schedules,
  calendar,
  bookedSlots = [],
  learnerTimezone,
  timezoneOptions,
  onTimezoneChange,
  selectedSlot,
  onSelectSlot,
  onContinue,
  preview = false,
  brand,
}: MeetingSchedulePickerProps) {
  const zone = resolveLearnerTimezone(learnerTimezone);
  const [month, setMonth] = useState(() => DateTime.now().setZone(zone).toJSDate());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [timezoneOpen, setTimezoneOpen] = useState(false);

  const sortedTimezoneOptions = useMemo(
    () => buildTimezoneOptions(timezoneOptions),
    [timezoneOptions]
  );

  const activeSchedules = useMemo(
    () => resolveMeetingSchedules(schedules),
    [schedules]
  );

  const hasNoSchedules = activeSchedules.length === 0;
  const CONTACT_EMAIL = (brand?.contactEmail || "").trim() || HUB.supportEmail;
  const brandCompany = (brand?.company || brand?.name || HUB.company).trim();
  const brandTagline = (brand?.tagline || "").trim() || HUB.tagline;
  const brandLogo = (brand?.logoUrl || "").trim();
  const brandAlt = brand?.name || HUB.name;

  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    return getTimeSlotsForDate(selectedDate, activeSchedules, zone, bookedSlots);
  }, [selectedDate, activeSchedules, zone, bookedSlots]);

  const upcomingDays = useMemo(
    () => listUpcomingBookableDays(activeSchedules, zone, calendar, bookedSlots, 14),
    [activeSchedules, zone, calendar, bookedSlots]
  );

  const durationSchedule = useMemo(
    () => resolveDurationSchedule(activeSchedules, selectedDate, selectedSlot, zone),
    [activeSchedules, selectedDate, selectedSlot, zone]
  );

  const monthBlocked = useMemo(
    () => isMonthBlocked(month, calendar, zone),
    [month, calendar, zone]
  );

  const monthBookable = useMemo(
    () => monthHasBookableDates(month, activeSchedules, zone, calendar, bookedSlots),
    [month, activeSchedules, zone, calendar, bookedSlots]
  );

  useEffect(() => {
    if (selectedDate) return;
    const today = DateTime.now().setZone(zone).startOf("day");
    for (let i = 0; i < 120; i++) {
      const candidateDt = today.plus({ days: i });
      const candidate = new Date(candidateDt.year, candidateDt.month - 1, candidateDt.day);
      if (dateHasAvailability(activeSchedules, candidate, zone, calendar, bookedSlots)) {
        setSelectedDate(candidate);
        setMonth(new Date(candidateDt.year, candidateDt.month - 1, 1));
        break;
      }
    }
  }, [activeSchedules, zone, calendar, bookedSlots, selectedDate]);

  useEffect(() => {
    const detected = getBrowserTimezone();
    if (detected && !learnerTimezone) {
      onTimezoneChange(detected);
    }
  }, [learnerTimezone, onTimezoneChange]);

  const goNextMonth = () => {
    const next = DateTime.fromJSDate(month, { zone }).plus({ months: 1 }).toJSDate();
    setMonth(next);
    setSelectedDate(undefined);
    onSelectSlot(null);
  };

  const goPrevMonth = () => {
    const prev = DateTime.fromJSDate(month, { zone }).minus({ months: 1 }).toJSDate();
    const now = DateTime.now().setZone(zone).startOf("month");
    if (DateTime.fromJSDate(prev, { zone }) < now) return;
    setMonth(prev);
    setSelectedDate(undefined);
    onSelectSlot(null);
  };

  const selectedDateLabel = selectedDate
    ? DateTime.fromISO(dateKey(selectedDate, zone), { zone }).toFormat("cccc, LLLL d")
    : null;

  const monthLabel = (() => {
    const key = dateKey(month, zone).slice(0, 7);
    return DateTime.fromISO(`${key}-01`, { zone }).toFormat("LLLL yyyy");
  })();

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/40">
      <div className="grid min-h-[520px] lg:grid-cols-[minmax(260px,300px)_1fr]">
        {/* Left: event details (Calendly-style) */}
        <aside className="border-b border-slate-200 bg-slate-50/50 p-6 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex justify-center lg:justify-start">
            {brandLogo ? (
              <img
                src={brandLogo}
                alt={brandAlt}
                className="h-12 w-12 rounded-full border border-slate-200 bg-white object-contain p-1 shadow-sm"
              />
            ) : (
              <ParrotLogo size="sm" alt={brandAlt} />
            )}
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {brandCompany}
          </p>
          <h2 className="mt-1 text-xl font-bold text-[var(--institution-primary,#38761D)] leading-snug">
            Book a meeting
          </h2>
          <p className="mt-2 text-sm text-slate-600">{brandTagline}</p>

          <ul className="mt-6 space-y-3 text-sm text-slate-700">
            <li className="flex items-start gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--institution-primary,#38761D)]" />
              <span>{scheduleDurationLabel(durationSchedule)}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Video className="mt-0.5 h-4 w-4 shrink-0 text-[var(--institution-primary,#38761D)]" />
              <span>Web conferencing details provided upon confirmation</span>
            </li>
          </ul>
        </aside>

        {/* Right: date & time selection */}
        <div className="flex flex-col p-6 md:p-8">
          <h3 className="text-lg font-bold text-[var(--institution-primary,#38761D)]">Select a Date &amp; Time</h3>

          {!hasNoSchedules && upcomingDays.length > 0 && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Open days ({upcomingDays.length})
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {upcomingDays.map((day) => {
                  const selected =
                    selectedDate != null && dateKey(selectedDate, zone) === day.dateKey;
                  return (
                    <button
                      key={day.dateKey}
                      type="button"
                      onClick={() => {
                        setSelectedDate(day.date);
                        setMonth(new Date(day.date.getFullYear(), day.date.getMonth(), 1));
                        onSelectSlot(null);
                      }}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-left text-xs font-semibold transition",
                        selected
                          ? "border-[var(--institution-primary,#38761D)] bg-[var(--institution-primary,#38761D)] text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-[var(--institution-primary,#38761D)]/40"
                      )}
                    >
                      <span className="block">{day.label}</span>
                      <span className={cn("block font-medium", selected ? "text-white/90" : "text-slate-500")}>
                        {day.slotCount} {day.slotCount === 1 ? "time" : "times"} · {day.timeRangeLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] leading-snug text-slate-500">
                Only days with remaining future times appear here and on the calendar. Morning
                windows disappear after those times pass.
              </p>
            </div>
          )}

          {hasNoSchedules ? (
            <div className="mt-8 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-8 text-center">
              <p className="text-slate-700 font-medium">
                For appointment scheduling, please contact us at
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="mt-1 text-sm font-semibold text-[var(--institution-primary,#38761D)] hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          ) : monthBlocked ? (
            <div className="mt-8 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-8 text-center">
              <p className="text-slate-700 font-medium">Bookings are closed for {monthLabel}.</p>
              <button
                type="button"
                onClick={goNextMonth}
                className="mt-3 text-sm font-semibold text-[var(--institution-primary,#38761D)] hover:underline"
              >
                View next month
              </button>
            </div>
          ) : !monthBookable ? (
            <div className="mt-8 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--institution-primary,#38761D)]/25 bg-[var(--institution-primary,#38761D)]/5 p-8 text-center">
              <p className="text-slate-800 font-semibold">No open dates in {monthLabel}</p>
              <p className="mt-2 text-sm text-slate-600">
                Availability was set for other days — try the next month, or ask the admin to add more slots.
              </p>
              <button
                type="button"
                onClick={goNextMonth}
                className="mt-4 rounded-full bg-[var(--institution-primary,#38761D)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                View next month
              </button>
            </div>
          ) : (
            <div
              className={cn(
                "mt-5 flex flex-1 flex-col gap-6 lg:flex-row lg:gap-0",
                selectedDate && "lg:divide-x lg:divide-slate-200"
              )}
            >
              {/* Calendar column */}
              <div className={cn("shrink-0", selectedDate ? "lg:pr-8" : "lg:pr-0")}>
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={goPrevMonth}
                    className="rounded-full p-2 hover:bg-slate-100"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4 text-[var(--institution-primary,#38761D)]" />
                  </button>
                  <span className="text-sm font-semibold text-[var(--institution-primary,#38761D)]">{monthLabel}</span>
                  <button
                    type="button"
                    onClick={goNextMonth}
                    className="rounded-full p-2 hover:bg-slate-100"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4 text-[var(--institution-primary,#38761D)]" />
                  </button>
                </div>

                <Calendar
                  mode="single"
                  month={month}
                  onMonthChange={setMonth}
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    onSelectSlot(null);
                  }}
                  disabled={(date) => {
                    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                    const dt = DateTime.fromISO(key, { zone }).startOf("day");
                    if (!dt.isValid || dt < DateTime.now().setZone(zone).startOf("day")) return true;
                    if (isDateBlocked(date, calendar, zone)) return true;
                    return !dateHasAvailability(activeSchedules, date, zone, calendar, bookedSlots);
                  }}
                  modifiers={{
                    available: (date) =>
                      dateHasAvailability(activeSchedules, date, zone, calendar, bookedSlots),
                  }}
                  modifiersClassNames={{
                    available:
                      "!relative !font-bold !text-[var(--institution-primary,#38761D)] !bg-[var(--institution-primary,#38761D)]/15 ring-2 ring-inset ring-[var(--institution-primary,#38761D)]/40 hover:!bg-[var(--institution-primary,#38761D)]/25 after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-[var(--institution-accent,#E01C21)] after:content-['']",
                  }}
                  className="p-0"
                  classNames={{
                    months: "w-full",
                    month: "w-full space-y-2",
                    caption: "hidden",
                    nav: "hidden",
                    head_cell: "text-slate-500 w-10 font-medium text-xs uppercase",
                    row: "flex w-full mt-1",
                    cell: "relative h-10 w-10 text-center text-sm p-0",
                    day: cn(
                      "h-10 w-10 p-0 font-medium rounded-full hover:bg-[var(--institution-primary,#0069FF)]/10",
                      "aria-selected:bg-[var(--institution-primary,#0069FF)] aria-selected:text-white aria-selected:hover:bg-[var(--institution-primary,#0069FF)]"
                    ),
                    day_disabled: "text-slate-300 opacity-55 hover:bg-transparent",
                    day_today: "font-bold text-[var(--institution-primary,#0069FF)]",
                  }}
                />

                <p className="mt-3 text-xs text-slate-600">
                  <span className="font-semibold text-[var(--institution-primary,#38761D)]">Highlighted</span>
                  {" "}dates still have open times — pick one, then choose a start time on the right.
                </p>

                <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-[var(--institution-primary,#38761D)]"
                    >
                      <Globe className="h-4 w-4" />
                      <span className="font-medium">{timezoneDisplayLabel(zone)}</span>
                      <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search time zone..." />
                      <CommandList>
                        <CommandEmpty>No time zone found.</CommandEmpty>
                        <CommandGroup>
                          {sortedTimezoneOptions.map((tz) => (
                            <CommandItem
                              key={tz.iana}
                              value={tz.label}
                              onSelect={() => {
                                onTimezoneChange(tz.iana);
                                onSelectSlot(null);
                                setTimezoneOpen(false);
                              }}
                            >
                              {tz.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time slots column (Calendly-style) */}
              {selectedDate && (
                <div className="flex min-h-[280px] flex-1 flex-col lg:pl-8">
                  {!selectedDateLabel ? null : timeSlots.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center text-center">
                      <p className="font-medium text-slate-700">No times left on this day</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {upcomingDays.length > 0
                          ? `Next open day: ${upcomingDays[0].label} (${upcomingDays[0].timeRangeLabel}).`
                          : `Try another highlighted date or email ${CONTACT_EMAIL}.`}
                      </p>
                      {upcomingDays[0] && (
                        <button
                          type="button"
                          className="mt-3 text-sm font-semibold text-[var(--institution-primary,#38761D)] hover:underline"
                          onClick={() => {
                            setSelectedDate(upcomingDays[0].date);
                            setMonth(
                              new Date(
                                upcomingDays[0].date.getFullYear(),
                                upcomingDays[0].date.getMonth(),
                                1
                              )
                            );
                            onSelectSlot(null);
                          }}
                        >
                          Jump to {upcomingDays[0].label}
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="mb-3 text-sm font-semibold text-[var(--institution-primary,#38761D)]">
                        {selectedDateLabel}
                      </p>
                      <div className="max-h-[340px] flex-1 space-y-2 overflow-y-auto pr-1">
                        {timeSlots.map((slot) => {
                          const isSelected =
                            selectedSlot?.startsAt === slot.startsAt &&
                            selectedSlot?.scheduleId === slot.scheduleId;
                          return (
                            <button
                              key={`${slot.scheduleId}-${slot.startsAt}`}
                              type="button"
                              onClick={() => onSelectSlot(isSelected ? null : slot)}
                              className={cn(
                                "w-full rounded-md border px-4 py-3 text-sm font-semibold transition-all",
                                isSelected
                                  ? "border-[var(--institution-primary,#0069FF)] bg-[var(--institution-primary,#0069FF)] text-white shadow-sm"
                                  : "border-[var(--institution-primary,#0069FF)]/40 bg-white text-[var(--institution-primary,#0069FF)] hover:border-[var(--institution-primary,#0069FF)] hover:bg-[var(--institution-primary,#0069FF)]/5"
                              )}
                            >
                              {slot.label}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedSlot && !preview && (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <Button
                type="button"
                onClick={onContinue}
                className="w-full rounded-md bg-[var(--institution-primary,#0069FF)] py-6 text-base font-semibold hover:bg-[var(--institution-primary-dark,#005bcc)]"
              >
                Continue
              </Button>
            </div>
          )}

          {preview && (
            <p className="mt-6 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
              Preview only - learners see this on the Meeting Registration page.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
