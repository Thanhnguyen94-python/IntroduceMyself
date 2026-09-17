# lib - Tầng xử lý dữ liệu và tiện ích

Chứa các module kỹ thuật không phụ thuộc UI.

## Trách nhiệm
- Loader JSON.
- Validator schema.
- Normalizer/migration (tương thích dữ liệu cũ).
- Helper format ngày tháng, tag, phân loại.

## Nguyên tắc
- Thuần logic, dễ test.
- API hàm ổn định để giảm ảnh hưởng dây chuyền.
