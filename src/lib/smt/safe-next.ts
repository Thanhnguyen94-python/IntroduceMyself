// Đường dẫn quay lại sau đăng nhập: chỉ nhận đường dẫn nội bộ trong /smt (chặn open redirect).
export function safeSmtNext(value: string | string[] | undefined) {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/smt") && !v.startsWith("//") && !v.includes("\\") ? v : "/smt";
}
