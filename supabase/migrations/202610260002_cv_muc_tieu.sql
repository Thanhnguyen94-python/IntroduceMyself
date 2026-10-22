-- Mục tiêu nghề nghiệp (CV): bản trên Supabase chưa có nội dung -> điền bản đã cập nhật (7 năm, AI = cắm linh kiện tự động).
-- Date: 2026-10-26. Chỉ điền khi đang trống, không đè nội dung đã nhập.
update public.site_content set
  payload = jsonb_set(payload, '{profile,muc_tieu}', jsonb_build_object(
    'vi', $t$Kỹ sư Trưởng / Trưởng nhóm SMT với 10 năm kinh nghiệm thực chiến trong vận hành, lập trình và cân bằng dây chuyền SMT & AI (cắm linh kiện tự động), cùng 7 năm quản lý đội ngũ kỹ thuật. Sở hữu thế mạnh về phân tích nguyên nhân gốc rễ (RCA), tối ưu phần mềm chuyên dụng (Panasonic DGS, GC-2000, GerberTool) và tự động hóa công cụ làm việc. Mục tiêu ứng tuyển vị trí quản lý/kỹ sư chuyên sâu nhằm tối ưu hóa hiệu suất sản xuất, giảm thiểu rủi ro sự cố và nâng cao năng lực chuyên môn cho đội ngũ kỹ thuật viên.$t$,
    'en', $t$Senior SMT Programming & Line Balance Engineer with 10 years of hands-on experience in SMT & auto-insertion (AI) manufacturing and 7 years of technical team management. Expert in root cause analysis (RCA), SMT software optimization (Panasonic DGS, NPM, GC-2000, GerberTool), and developing custom internal tools. Seeking to leverage data-driven optimization, automation skills, and continuous improvement (Kaizen) to drive operational excellence and lead high-performing engineering teams.$t$)),
  updated_at = now()
where config_key = 'primary'
  and coalesce(payload #>> '{profile,muc_tieu,vi}', '') = '';
