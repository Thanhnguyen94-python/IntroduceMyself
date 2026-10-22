-- Nội dung CV / giới thiệu: cân bằng chuyền theo số liệu có bối cảnh, bỏ claim tuyệt đối, thêm Ngoại ngữ.
-- Date: 2026-10-26
-- Chỉ thay đúng các dòng cũ (tìm theo nội dung); dòng nào đã sửa tay trong Admin và không còn khớp thì giữ nguyên.
-- Chạy lại nhiều lần vẫn an toàn.

-- Thay mỗi phần tử khớp mẫu LIKE `pat` trong mảng jsonb bằng các phần tử của `repl` (giữ thứ tự).
create or replace function pg_temp.swap_lines(arr jsonb, pat text, repl jsonb) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_agg(q.v order by q.ord, q.sub), '[]'::jsonb)
  from (
    select t.ord, r.sub, r.v
    from jsonb_array_elements(arr) with ordinality as t(val, ord)
    cross join lateral (
      select 0::bigint as sub, t.val as v where (t.val #>> '{}') not like pat
      union all
      select rr.k, rr.rv from jsonb_array_elements(repl) with ordinality as rr(rv, k) where (t.val #>> '{}') like pat
    ) as r
  ) as q
$$;

-- ===== Hành trình =====
-- Genbyte: Cpk + "Yield mẫu 100%" -> phạm vi rõ ràng + bối cảnh cân bằng chuyền ít máy / đa model
update public.career_journey set
  achievements_vi = pg_temp.swap_lines(achievements_vi, 'Duy trì chỉ số Cpk%Yield%', jsonb_build_array(
    $t$Duy trì Cpk >1,33 cho các thông số quy trình chính; các lô mẫu NPI phục vụ audit đạt yield yêu cầu, giúp sản phẩm mới được khách hàng phê duyệt.$t$,
    $t$Chuyền ít máy mounter nhưng nhiều mã hàng: cân bằng chuyền bằng số liệu Cycle time từng máy (phân bổ linh kiện, tách/gộp chương trình theo nhóm model) và cập nhật CT chuẩn cho Planner để kế hoạch bám sát năng lực thực tế.$t$)),
  achievements_en = pg_temp.swap_lines(achievements_en, 'Sustained Cpk >1.33 and trial yield%', jsonb_build_array(
    $t$Sustained Cpk >1.33 on key process parameters; NPI audit lots met customer yield requirements, securing new-product approval.$t$,
    $t$On a line with few mounters but many models: balanced the line from per-machine cycle-time data (component allocation, program split/merge by model family) and kept standard CTs updated for Planning so schedules matched real capacity.$t$)),
  updated_at = now()
where company ilike '%GENBYTE%';

-- Samsung: giữ số thật >95% / >98%, thêm bối cảnh chuyền nhiều mounter + công thức
update public.career_journey set
  achievements_vi = pg_temp.swap_lines(achievements_vi, 'Duy trì chỉ số cân bằng chuyền (Line Balancing)%', jsonb_build_array(
    $t$Chuyền nhiều máy mounter: duy trì hiệu suất cân bằng chuyền trung bình >95% trên toàn bộ mã hàng (KPI >90%), mã tiêu chuẩn đạt >98% – tính theo LB = ΣCT / (số máy × CT máy chậm nhất).$t$)),
  achievements_en = pg_temp.swap_lines(achievements_en, 'Maintained an average Line Balancing efficiency%', jsonb_build_array(
    $t$Multi-mounter lines: kept average line-balance efficiency >95% across all models (KPI >90%), >98% on standard models – LB = ΣCT / (machines × bottleneck CT).$t$)),
  updated_at = now()
where company ilike '%SAMSUNG%';

-- Novas: "cắt giảm 100% thời gian" -> mô tả đúng việc làm được
update public.career_journey set
  improvements_vi = pg_temp.swap_lines(improvements_vi, 'Chế tạo thiết bị đếm linh kiện cầm tay%', jsonb_build_array(
    $t$Chế tạo thiết bị đếm linh kiện cầm tay trực tiếp trên chuyền, kiểm kê số lượng ngay trên feeder, không cần tháo cuộn liệu khỏi chuyền.$t$)),
  updated_at = now()
where company ilike '%NOVAS%';

-- ===== Thông tin chung (site_content 'primary') =====
update public.site_content set
  payload = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          payload,
          '{profile,slogan}',
          jsonb_build_object(
            'vi', $t$10 năm cân bằng & tối ưu dây chuyền SMT bằng số liệu – Cycle time, Cpk, yield – không bằng cảm tính.$t$,
            'en', $t$10 years balancing and optimizing SMT lines with data – cycle time, Cpk, yield – not guesswork.$t$)),
        '{profile,muc_tieu}',
        jsonb_build_object(
          'vi', replace(replace(coalesce(payload #>> '{profile,muc_tieu,vi}', ''), 'SMT/AI, cùng 6 năm', 'SMT & AI (cắm linh kiện tự động), cùng 7 năm'), '6 năm quản lý', '7 năm quản lý'),
          'en', replace(replace(coalesce(payload #>> '{profile,muc_tieu,en}', ''), 'SMT/AI manufacturing and 6 years', 'SMT & auto-insertion (AI) manufacturing and 7 years'), '6 years of technical team management', '7 years of technical team management'))),
      '{highlights}',
      jsonb_build_object(
        'vi', jsonb_build_array(
          $t$10 năm thực chiến SMT & AI (cắm linh kiện tự động); 7 năm quản lý đội ngũ kỹ sư.$t$,
          $t$Cân bằng chuyền bằng số liệu: >95% (KPI 90%) ở chuyền nhiều mounter tại Samsung; chuyền ít máy, đa model tại Genbyte thì tối ưu theo CT từng máy và cập nhật CT chuẩn cho Planner.$t$,
          $t$2 lần setup nhà máy mới từ đầu (Novas, Genbyte): lắp đặt, lập trình full-line, đưa chuyền vào vận hành đúng tiến độ.$t$,
          $t$Kiểm soát Cpk >1,33 và dẫn dắt NPI / audit khách hàng; mạnh RCA tại chỗ, đào tạo kỹ thuật viên và công nhân.$t$,
          $t$Thành thạo Panasonic DGS, NPM, GC-2000, GerberTool, SketchUp 3D; tự viết tool tự động hoá công việc hằng ngày.$t$),
        'en', jsonb_build_array(
          $t$10 years in SMT & auto-insertion (AI); 7 years leading engineering teams.$t$,
          $t$Data-driven line balancing: >95% (KPI 90%) on multi-mounter lines at Samsung; on few-machine, high-mix lines at Genbyte, optimized per-machine CT and kept standard CTs updated for Planning.$t$,
          $t$Set up 2 new factories from scratch (Novas, Genbyte): installation, full-line programming, on-time line commissioning.$t$,
          $t$Held Cpk >1.33 and led NPI / customer audits; strong on-site RCA, technician and operator training.$t$,
          $t$Proficient in Panasonic DGS, NPM, GC-2000, GerberTool, SketchUp 3D; build tools to automate daily work.$t$))),
    '{languages}',
    jsonb_build_object(
      'vi', jsonb_build_array(
        $t$Tiếng Việt: bản ngữ.$t$,
        $t$Tiếng Anh chuyên ngành: đọc hiểu manual thiết bị, datasheet, tiêu chuẩn IPC; viết báo cáo kỹ thuật / 8D; vận hành phần mềm & máy giao diện tiếng Anh. Giao tiếp: cơ bản.$t$),
      'en', jsonb_build_array(
        $t$Vietnamese: native.$t$,
        $t$Technical English: reads equipment manuals, datasheets and IPC standards; writes technical / 8D reports; operates English-interface software and machines. Conversation: basic.$t$))),
  updated_at = now()
where config_key = 'primary';
