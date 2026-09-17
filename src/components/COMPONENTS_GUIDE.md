# components - Thành phần tái sử dụng

Mục tiêu: chia nhỏ UI để tái sử dụng và dễ test.

## Nhóm component dự kiến
- `Hero`, `Highlights`, `SkillMatrix`
- `Timeline`, `TimelineModal`
- `ProjectCard`, `ProjectFilters`, `ProjectGallery`
- `DocsList`, `DocCard`
- `ThemeToggle`, `FloatingContactWidget`

## Quy tắc
- Component chỉ nhận data qua props typed rõ ràng.
- Không gọi dữ liệu file trực tiếp trong component trình bày.
- Ưu tiên accessibility: keyboard focus, aria-label, contrast.
