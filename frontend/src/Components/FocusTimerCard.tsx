"use client";

import { useEffect, useRef, useState } from "react";
import { Text, HStack, IconButton } from "@/ui";
import { FaPlay, FaPause, FaRedoAlt } from "react-icons/fa";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  FOCUS_TIMER_STORAGE_KEY,
  FOCUS_TIMER_CHANGED_EVENT,
  type FocusTimerPersistV2,
} from "@/lib/focusTimerStorage";
import { notifyFocusTimerDone } from "@/lib/notifyFocusTimerDone";
/** Полный круг = 1 час; 0 = ручка вверху, дуга появляется по мере выбора */
const FOCUS_MAX_SEC = 3600;
const FOCUS_DEFAULT_SEC = 0;
/** Запас сверху в единицах viewBox: ручка r=8 + stroke + drop-shadow выходят выше y=0 */
const FOCUS_VB_PAD_TOP = 20;
const FOCUS_VBX = 0;
const FOCUS_VBY = -FOCUS_VB_PAD_TOP;
const FOCUS_VBW = 120;
const FOCUS_VBH = 120 + FOCUS_VB_PAD_TOP;

type Phase = "setting" | "running" | "paused" | "done";

type PersistV2 = FocusTimerPersistV2;

function clampSelected(n: number) {
  return Math.min(FOCUS_MAX_SEC, Math.max(0, Math.round(n)));
}

function snapToMinute(sec: number) {
  return clampSelected(Math.round(sec / 60) * 60);
}

function pointerToSeconds(clientX: number, clientY: number, svg: SVGSVGElement): number {
  const rect = svg.getBoundingClientRect();
  const sx = ((clientX - rect.left) / rect.width) * FOCUS_VBW + FOCUS_VBX;
  const sy = ((clientY - rect.top) / rect.height) * FOCUS_VBH + FOCUS_VBY;
  const x = sx - 60;
  const y = sy - 60;
  let theta = Math.atan2(x, -y);
  if (theta < 0) theta += 2 * Math.PI;
  const fraction = theta / (2 * Math.PI);
  const raw = fraction * FOCUS_MAX_SEC;
  return snapToMinute(raw);
}

function formatMmSs(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

type Props = {
  isDark: boolean;
  glassClass: string;
};

export function FocusTimerCard({ isDark, glassClass }: Props) {
  const { t } = useLanguage();
  const svgRef = useRef<SVGSVGElement>(null);
  const endsAtRef = useRef<number | null>(null);
  const dragRef = useRef(false);

  const [hydrated, setHydrated] = useState(false);
  const [phase, setPhase] = useState<Phase>("setting");
  const [selectedSec, setSelectedSec] = useState(FOCUS_DEFAULT_SEC);
  const [totalSec, setTotalSec] = useState(FOCUS_DEFAULT_SEC);
  const [remainingSec, setRemainingSec] = useState(FOCUS_DEFAULT_SEC);
  const [endsAt, setEndsAt] = useState<number | null>(null);

  useEffect(() => {
    endsAtRef.current = endsAt;
  }, [endsAt]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(FOCUS_TIMER_STORAGE_KEY);
      if (!raw) {
        setHydrated(true);
        return;
      }
      const p = JSON.parse(raw) as PersistV2 | { seconds?: number; running?: boolean; savedAt?: number };
      if ((p as PersistV2).v !== 2) {
        setHydrated(true);
        return;
      }
      const v = p as PersistV2;
      const sel = clampSelected(Number(v.selectedSec) || 0);
      const tot = clampSelected(Number(v.totalSec) || sel);
      let rem = Math.max(0, Math.floor(Number(v.remainingSec) || 0));
      const ph = v.phase;
      let end = typeof v.endsAt === "number" ? v.endsAt : null;

      if (ph === "running" && end != null) {
        rem = Math.max(0, Math.ceil((end - Date.now()) / 1000));
        if (rem <= 0) {
          setPhase("done");
          setSelectedSec(sel);
          setTotalSec(tot);
          setRemainingSec(0);
          setEndsAt(null);
          endsAtRef.current = null;
          setHydrated(true);
          return;
        }
      }

      setSelectedSec(sel);
      setTotalSec(tot);
      setRemainingSec(rem);

      if (ph === "running" && end != null && rem > 0) {
        setPhase("running");
        setEndsAt(end);
        endsAtRef.current = end;
      } else if (ph === "paused" && rem > 0) {
        setPhase("paused");
        setEndsAt(null);
        endsAtRef.current = null;
      } else if (ph === "done") {
        setPhase("done");
        setRemainingSec(0);
        setEndsAt(null);
        endsAtRef.current = null;
      } else {
        setPhase("setting");
        setRemainingSec(sel);
        setTotalSec(sel);
        setEndsAt(null);
        endsAtRef.current = null;
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      const payload: PersistV2 = {
        v: 2,
        phase,
        selectedSec,
        totalSec,
        remainingSec,
        endsAt,
      };
      localStorage.setItem(FOCUS_TIMER_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [hydrated, phase, selectedSec, totalSec, remainingSec, endsAt]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyFromJson = (newValue: string) => {
      try {
        const v = JSON.parse(newValue) as PersistV2;
        if (v.v !== 2) return;
        const sel = clampSelected(Number(v.selectedSec) || 0);
        const tot = clampSelected(Number(v.totalSec) || sel);
        let rem = Math.max(0, Math.floor(Number(v.remainingSec) || 0));
        const ph = v.phase;
        let end = typeof v.endsAt === "number" ? v.endsAt : null;
        if (ph === "running" && end != null) {
          rem = Math.max(0, Math.ceil((end - Date.now()) / 1000));
        }
        setPhase(ph);
        setSelectedSec(sel);
        setTotalSec(tot);
        setRemainingSec(rem);
        setEndsAt(end);
        endsAtRef.current = end;
      } catch {
        /* ignore */
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== FOCUS_TIMER_STORAGE_KEY || !e.newValue) return;
      applyFromJson(e.newValue);
    };
    const onSameTab = () => {
      const raw = localStorage.getItem(FOCUS_TIMER_STORAGE_KEY);
      if (raw) applyFromJson(raw);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(FOCUS_TIMER_CHANGED_EVENT, onSameTab);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(FOCUS_TIMER_CHANGED_EVENT, onSameTab);
    };
  }, []);

  useEffect(() => {
    if (phase !== "running") return;
    const tick = () => {
      const endAt = endsAtRef.current;
      if (endAt == null) return;
      const rem = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemainingSec(rem);
      if (rem <= 0) {
        setPhase("done");
        setEndsAt(null);
        endsAtRef.current = null;
        notifyFocusTimerDone(endAt, t("dashboard.focusTimerDoneTitle"), t("dashboard.focusTimerDoneBody"));
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [phase, t]);

  const canDrag = phase === "setting";
  const circumference = 2 * Math.PI * 52;

  /** Доля полного «часового» круга (0–1): и дуга, и ручка в одной шкале, чтобы при 30 мин не было полного кольца при старте. */
  let strokeDash: number;
  let dialFrac: number;
  if (phase === "setting") {
    dialFrac = selectedSec / FOCUS_MAX_SEC;
    strokeDash = dialFrac * circumference;
  } else {
    const rem = phase === "done" ? 0 : remainingSec;
    dialFrac = rem / FOCUS_MAX_SEC;
    strokeDash = dialFrac * circumference;
  }

  /* Верх круга = 0, по часовой (y вниз в SVG): согласовано с atan2 в pointerToSeconds и с rotate(-90) у колец. */
  const alpha = dialFrac * 2 * Math.PI;
  const hx = 60 + 52 * Math.sin(alpha);
  const hy = 60 - 52 * Math.cos(alpha);

  const strokeColor = isDark ? "#50BFA0" : "#1F6A5C";
  const trackColor = isDark ? "#103E36" : "#e2e8f0";

  const centerSec =
    phase === "setting" ? selectedSec : phase === "done" ? 0 : remainingSec;

  const onPointerDown = (e: React.PointerEvent) => {
    if (!canDrag) return;
    const svg = svgRef.current;
    if (!svg) return;
    dragRef.current = true;
    svg.setPointerCapture(e.pointerId);
    setSelectedSec(pointerToSeconds(e.clientX, e.clientY, svg));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !canDrag) return;
    const svg = svgRef.current;
    if (!svg) return;
    setSelectedSec(pointerToSeconds(e.clientX, e.clientY, svg));
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = false;
    const svg = svgRef.current;
    if (svg?.hasPointerCapture(e.pointerId)) {
      svg.releasePointerCapture(e.pointerId);
    }
    setTotalSec(selectedSec);
    setRemainingSec(selectedSec);
  };

  const toggleRun = async () => {
    if (typeof window !== "undefined" && typeof Notification !== "undefined" && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        /* ignore */
      }
    }

    if (phase === "running") {
      const end = endsAtRef.current;
      if (end != null) {
        setRemainingSec(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
      }
      setPhase("paused");
      setEndsAt(null);
      endsAtRef.current = null;
      return;
    }

    if (phase === "paused") {
      const r = Math.max(1, remainingSec);
      setRemainingSec(r);
      const end = Date.now() + r * 1000;
      setEndsAt(end);
      endsAtRef.current = end;
      setPhase("running");
      return;
    }

    if (phase === "done") {
      if (selectedSec <= 0) return;
      const dur = clampSelected(selectedSec);
      setTotalSec(dur);
      setRemainingSec(dur);
      const end = Date.now() + dur * 1000;
      setEndsAt(end);
      endsAtRef.current = end;
      setPhase("running");
      return;
    }

    /* setting */
    if (selectedSec <= 0) return;
    const dur = clampSelected(selectedSec);
    setTotalSec(dur);
    setRemainingSec(dur);
    const end = Date.now() + dur * 1000;
    setEndsAt(end);
    endsAtRef.current = end;
    setPhase("running");
  };

  const resetAll = () => {
    setPhase("setting");
    setEndsAt(null);
    endsAtRef.current = null;
    setSelectedSec(FOCUS_DEFAULT_SEC);
    setTotalSec(FOCUS_DEFAULT_SEC);
    setRemainingSec(FOCUS_DEFAULT_SEC);
    try {
      localStorage.removeItem(FOCUS_TIMER_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const subLabel =
    phase === "done"
      ? t("dashboard.focusTimerDoneLabel")
      : phase === "setting"
        ? t("dashboard.focusTimerSetLabel")
        : t("dashboard.focusTimerRemainingLabel");

  return (
    <div className={`rounded-lg p-6 ${glassClass}`}>
      <Text className="text-sm font-bold text-[#1C1E1C] dark:text-white mb-0.5">{t("dashboard.focusTimer")}</Text>
      <Text className="text-xs text-[#1F6A5C]/70 dark:text-[#F4F3F4]/45 mb-1.5">{t("dashboard.focusTimerDragHint")}</Text>
      <div className="relative mx-auto w-[160px] select-none touch-none overflow-visible">
        <div className="relative h-[160px] w-full overflow-visible">
        <svg
          ref={svgRef}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={FOCUS_MAX_SEC}
          aria-valuenow={phase === "setting" ? selectedSec : remainingSec}
          aria-label={t("dashboard.focusTimer")}
          className={`absolute bottom-0 left-0 right-0 h-[160px] w-full overflow-visible ${canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
          viewBox={`${FOCUS_VBX} ${FOCUS_VBY} ${FOCUS_VBW} ${FOCUS_VBH}`}
          preserveAspectRatio="xMidYMid meet"
          overflow="visible"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {/* Поворот только у обводки: начало stroke вверху; без CSS rotate на <svg> — координаты клика совпадают с viewBox. */}
          <g transform="rotate(-90 60 60)">
            <circle cx="60" cy="60" r="52" fill="none" stroke={trackColor} strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke={strokeColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${circumference}`}
            />
          </g>
          {canDrag ? (
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke={isDark ? "rgba(255,255,255,0.14)" : "rgba(15, 62, 54, 0.12)"}
              strokeWidth="14"
              className="pointer-events-none"
            />
          ) : null}
          <circle
            cx={hx}
            cy={hy}
            r={canDrag ? 8 : 6}
            fill={strokeColor}
            stroke={isDark ? "rgba(255,255,255,0.92)" : "#ffffff"}
            strokeWidth={canDrag ? 2.5 : 1.5}
            className="pointer-events-none drop-shadow-sm"
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 bottom-0 left-0 right-0 top-0 flex flex-col items-center justify-center">
          <Text className="text-2xl font-mono font-semibold text-[#1C1E1C] dark:text-white tabular-nums px-1">
            {formatMmSs(centerSec)}
          </Text>
          <Text className="text-xs text-[#1F6A5C]/70 dark:text-[#F4F3F4]/45 mt-0.5">{subLabel}</Text>
        </div>
        </div>
      </div>
      <HStack spacing={3} justify="center" className="mt-4">
        <IconButton
          aria-label={phase === "running" ? t("dashboard.pause") : t("dashboard.play")}
          icon={phase === "running" ? <FaPause /> : <FaPlay />}
          onClick={toggleRun}
          disabled={phase !== "running" && phase !== "paused" && selectedSec <= 0}
          className="rounded-full bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white"
        />
        <IconButton
          aria-label={t("dashboard.reset")}
          icon={<FaRedoAlt />}
          onClick={resetAll}
          variant="outline"
          className="rounded-full border-[#1F6A5C]/25 dark:border-[#103E36]"
        />
      </HStack>
    </div>
  );
}
