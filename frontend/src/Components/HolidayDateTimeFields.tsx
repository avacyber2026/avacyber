"use client";

import { forwardRef, useEffect, useMemo, type ReactNode } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { format } from "date-fns";
import type { Locale as DateFnsLocale } from "date-fns";
import { cs, de, enUS, es, fr } from "date-fns/locale";
import { IoCalendarOutline, IoTimeOutline } from "react-icons/io5";
import "react-datepicker/dist/react-datepicker.css";
import "@/styles/holiday-datepicker.css";

const DF_LOCALES: Record<string, DateFnsLocale> = { en: enUS, cs, de, es, fr };

let localesRegistered = false;

function ensureLocalesRegistered() {
  if (localesRegistered || typeof window === "undefined") return;
  registerLocale("en", enUS);
  registerLocale("cs", cs);
  registerLocale("de", de);
  registerLocale("es", es);
  registerLocale("fr", fr);
  localesRegistered = true;
}

function parseYmd(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function mergeYmdHm(dateStr: string, timeStr: string): Date | null {
  const base = parseYmd(dateStr);
  if (!base) return null;
  const [hh, mm] = (timeStr || "00:00").split(":").map((x) => parseInt(x, 10));
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0, 0, 0);
}

type TriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  display: string;
  icon: "date" | "time";
  /** Место под крестик очистки react-datepicker (absolute справа) */
  reserveClearSpace?: boolean;
};

const HolidayPickerTrigger = forwardRef<HTMLButtonElement, TriggerProps>(function HolidayPickerTrigger(
  { display, icon, className = "", disabled, reserveClearSpace, ...rest },
  ref
) {
  const Icon = icon === "date" ? IoCalendarOutline : IoTimeOutline;
  return (
    <button
      type="button"
      ref={ref}
      disabled={disabled}
      className={[
        "flex h-[2.75rem] w-full min-w-0 items-center gap-2 rounded-md border px-2.5 py-0 text-left text-sm transition-colors sm:text-base",
        "border-[#1F6A5C]/20 bg-white text-[#103E36] hover:border-[#1F6A5C]/40 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-0",
        "dark:border-white/20 dark:bg-[#103E36] dark:text-[#F4F3F4] dark:hover:border-[#50BFA0]/35",
        reserveClearSpace ? "pr-9" : "pr-2.5",
        disabled ? "cursor-not-allowed opacity-50 hover:border-[#1F6A5C]/20 dark:hover:border-white/20" : "cursor-pointer",
        className,
      ].join(" ")}
      {...rest}
    >
      <Icon className="h-5 w-5 shrink-0 text-[#F4F3F4]/60 dark:text-[#F4F3F4]/80" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-left tabular-nums">{display}</span>
    </button>
  );
});

export interface HolidayDateTimeFieldsProps {
  holidayDate: string;
  holidayTime: string;
  onHolidayDateChange: (v: string) => void;
  onHolidayTimeChange: (v: string) => void;
  onEnableHoliday: () => void;
  localeCode: string;
  placeholderDate: string;
  placeholderTime: string;
  timeListCaption: string;
  /** Слот справа в той же строке (кнопка Save) */
  endAdornment?: ReactNode;
  className?: string;
}

export function HolidayDateTimeFields({
  holidayDate,
  holidayTime,
  onHolidayDateChange,
  onHolidayTimeChange,
  onEnableHoliday,
  localeCode,
  placeholderDate,
  placeholderTime,
  timeListCaption,
  endAdornment,
  className = "",
}: HolidayDateTimeFieldsProps) {
  useEffect(() => {
    ensureLocalesRegistered();
  }, []);

  const dfLocale = DF_LOCALES[localeCode] ?? enUS;
  const localeStr = localeCode in DF_LOCALES ? localeCode : "en";

  const selectedDate = useMemo(() => parseYmd(holidayDate), [holidayDate]);
  const selectedDateTime = useMemo(() => mergeYmdHm(holidayDate, holidayTime), [holidayDate, holidayTime]);

  const dateDisplay = useMemo(() => {
    if (!selectedDate) return placeholderDate;
    try {
      return format(selectedDate, "P", { locale: dfLocale });
    } catch {
      return holidayDate;
    }
  }, [selectedDate, holidayDate, placeholderDate, dfLocale]);

  const timeDisplay = useMemo(() => {
    if (!holidayDate) return placeholderTime;
    if (!selectedDateTime) return placeholderTime;
    try {
      return format(selectedDateTime, "HH:mm", { locale: dfLocale });
    } catch {
      return holidayTime || "00:00";
    }
  }, [holidayDate, holidayTime, selectedDateTime, placeholderTime, dfLocale]);

  return (
    <div
      className={[
        "flex w-full min-w-0 flex-row flex-nowrap items-stretch gap-2 overflow-x-auto sm:gap-3",
        "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        className,
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-1 basis-0">
        <DatePicker
          selected={selectedDate}
          onChange={(d: Date | null) => {
            onEnableHoliday();
            if (!d) {
              onHolidayDateChange("");
              return;
            }
            onHolidayDateChange(format(d, "yyyy-MM-dd"));
          }}
          locale={localeStr}
          dateFormat="yyyy-MM-dd"
          placeholderText={placeholderDate}
          customInput={<HolidayPickerTrigger display={dateDisplay} icon="date" reserveClearSpace />}
          calendarClassName="holiday-datepicker-calendar"
          popperClassName="holiday-datepicker-popper"
          popperPlacement="bottom-start"
          showPopperArrow={false}
          isClearable
          wrapperClassName="holiday-datepicker-field-wrap w-full min-w-0"
        />
      </div>
      <div className="flex min-w-0 flex-1 basis-0">
        <DatePicker
          selected={selectedDateTime}
          onChange={(d: Date | null) => {
            onEnableHoliday();
            if (!d || !holidayDate) return;
            onHolidayTimeChange(format(d, "HH:mm"));
          }}
          locale={localeStr}
          showTimeSelect
          showTimeSelectOnly
          timeIntervals={15}
          timeCaption={timeListCaption}
          dateFormat="HH:mm"
          placeholderText={placeholderTime}
          customInput={<HolidayPickerTrigger display={timeDisplay} icon="time" disabled={!holidayDate} />}
          calendarClassName="holiday-datepicker-calendar"
          popperClassName="holiday-datepicker-popper"
          popperPlacement="bottom-start"
          showPopperArrow={false}
          disabled={!holidayDate}
          wrapperClassName="holiday-datepicker-field-wrap w-full min-w-0"
        />
      </div>
      {endAdornment ? (
        <div className="flex shrink-0 items-stretch sm:items-stretch">{endAdornment}</div>
      ) : null}
    </div>
  );
}
