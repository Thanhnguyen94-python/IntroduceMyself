# content/experience

## File chính
- `experience.json`

## Schema tối thiểu
- `schemaVersion`
- `items[]`: `id`, `company`, `role`, `startDate`, `endDate`, `isCurrent`, `equipmentTags[]`, `responsibilities[]`, `problemRootCauseAction[]`, `trainingActivities[]`, `achievements[]`, `improvements[]`, `images[]`

## `images[]`
- Mỗi phần tử gồm:
	- `src`: đường dẫn ảnh (ví dụ: `/assets/images/experience/ten-anh.jpg`)
	- `description`: nội dung song ngữ
		- `vi`: mô tả tiếng Việt
		- `en`: mô tả tiếng Anh

## Quy tắc
- Giữ `id` ổn định, không tái sử dụng.
- Mốc thời gian theo ISO date nếu có ngày/tháng.
