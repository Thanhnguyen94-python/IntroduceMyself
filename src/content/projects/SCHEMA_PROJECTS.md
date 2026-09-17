# content/projects

## File chính
- `projects.json`

## Schema tối thiểu
- `schemaVersion`
- `items[]`: `id`, `slug`, `title`, `category`, `status`, `summary`, `objective`, `description`, `equipmentTags[]`, `gallery[]`, `attachments[]`, `lessonsLearned`

## attachments[]
- `label`: localized text (`vi`, `en`)
- `fileUrl`: đường dẫn public (ví dụ `/assets/docs/projects/file.pdf`)

## Quy tắc
- `slug` duy nhất, immutable sau khi public.
- `category` dùng enum cố định để filter ổn định.
