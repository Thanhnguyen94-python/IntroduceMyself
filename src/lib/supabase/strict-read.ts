// Supabase là nguồn dữ liệu duy nhất trên web thật.
// File JSON trong src/content chỉ dùng khi chạy local chưa cấu hình Supabase (hoặc bảng còn trống lúc khởi tạo).
// Trên production, đọc Supabase lỗi thì phải báo lỗi – không lặng lẽ trả nội dung cũ trong code,
// vì Admin mở nội dung cũ đó rồi bấm Lưu sẽ ghi đè (và xoá) dữ liệu thật.

export function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

export function assertReadable(table: string, client: unknown, error?: { message: string } | null) {
  if (!isProductionRuntime()) return;
  if (!client) throw new Error(`Supabase chưa được cấu hình (đọc ${table}).`);
  if (error) throw new Error(`Đọc Supabase thất bại (${table}): ${error.message}`);
}

// Bảng trống trên production: tạm hiện dữ liệu mẫu trong code nhưng ghi log để biết cần nhập vào Admin.
export function warnEmpty(table: string) {
  if (isProductionRuntime()) console.warn(`[${table}] Supabase chưa có dữ liệu – đang dùng dữ liệu mẫu trong code.`);
}
