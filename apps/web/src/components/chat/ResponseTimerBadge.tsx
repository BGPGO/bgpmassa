"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface Props {
  triggeredAt: string; // ISO date when last inbound message arrived
}

const THRESHOLDS = [15, 30, 60, 120, 240];

function getElapsedMinutes(triggeredAt: string): number {
  return Math.floor((Date.now() - new Date(triggeredAt).getTime()) / 60000);
}

function getThresholdColor(minutes: number): string {
  if (minutes >= 240) return "text-red-700 bg-red-100 border-red-300";
  if (minutes >= 120) return "text-red-600 bg-red-50 border-red-200";
  if (minutes >= 60) return "text-orange-600 bg-orange-50 border-orange-200";
  if (minutes >= 30) return "text-yellow-700 bg-yellow-50 border-yellow-200";
  return "text-gray-500 bg-gray-50 border-gray-200";
}

function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function ResponseTimerBadge({ triggeredAt }: Props) {
  const [elapsed, setElapsed] = useState(getElapsedMinutes(triggeredAt));

  useEffect(() => {
    const interval = setInterval(() => setElapsed(getElapsedMinutes(triggeredAt)), 30000);
    return () => clearInterval(interval);
  }, [triggeredAt]);

  const color = getThresholdColor(elapsed);

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${color}`}>
      <Clock className="w-3 h-3" />
      {formatElapsed(elapsed)}
    </span>
  );
}
