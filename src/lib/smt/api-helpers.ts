import { NextResponse } from "next/server";
import { SmtValidationError } from "@/lib/smt/datasets";
import { NeedGrantError } from "@/lib/smt/delete-grants";

// Trả lỗi thống nhất cho các API /smt:
//  - NeedGrantError -> 403 {code: "need_grant"}: giao diện hỏi trợ lý có muốn gửi yêu cầu xin quyền xoá không.
//  - Lỗi nhập liệu / quyền -> 400, lỗi khác -> 500.
export function apiFail(error: unknown, fallback: string) {
  if (error instanceof NeedGrantError) return NextResponse.json({ code: "need_grant", message: error.message }, { status: 403 });
  const status = error instanceof SmtValidationError ? 400 : 500;
  return NextResponse.json({ message: error instanceof Error ? error.message : fallback }, { status });
}

export const deny = (message: string, status = 403) => NextResponse.json({ message }, { status });
