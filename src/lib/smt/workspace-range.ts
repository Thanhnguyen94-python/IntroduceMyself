import { DEMO_EVENTS, demoWindow, eventRange } from "@/lib/smt/demo";
import { resolveRange } from "@/lib/smt/workspace-metrics";
import { addDays } from "@/lib/smt/types";
import type { WorkspaceCtx } from "@/lib/smt/workspace";

// Kỳ xem của /smt: demo bắt đầu từ đầu bộ demo; thực tế xem tối đa 1 năm gần nhất.
export function earliestDate(ctx: WorkspaceCtx) {
  return ctx.demo ? (ctx.meta?.from ?? demoWindow(ctx.today).from) : addDays(ctx.today, -364);
}

export function workspaceRange(ctx: WorkspaceCtx, key: string | string[] | undefined) {
  return resolveRange(typeof key === "string" ? key : undefined, ctx.today, earliestDate(ctx));
}

export function demoEvents(ctx: WorkspaceCtx) {
  if (!ctx.demo) return [];
  const win = { from: earliestDate(ctx), to: ctx.today };
  return DEMO_EVENTS.map((e) => ({ id: e.id, line: e.line, title: e.title, ...eventRange(e, win) })).filter((e) => e.from <= win.to);
}
