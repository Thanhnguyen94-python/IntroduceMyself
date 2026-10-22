"use client";

// Không đọc được Supabase (nguồn dữ liệu duy nhất): báo rõ + cho thử lại, không hiện nội dung cũ trong code.
export default function PortfolioError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="card mx-auto max-w-xl space-y-3 text-center">
      <h1 className="text-xl font-bold text-brand-600 dark:text-brand-300">Tạm thời chưa tải được dữ liệu</h1>
      <p className="muted text-sm">Máy chủ dữ liệu đang chậm hoặc gián đoạn. Vui lòng thử lại sau ít phút. · Data is temporarily unavailable, please retry.</p>
      <button type="button" onClick={reset} className="btn-primary">
        Thử lại · Retry
      </button>
    </section>
  );
}
