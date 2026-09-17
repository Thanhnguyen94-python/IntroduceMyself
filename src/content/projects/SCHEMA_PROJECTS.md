# content/projects

## File chính
- `projects.json`

## Schema tối thiểu
- `schemaVersion`
- `items[]`: `id`, `slug`, `title`, `category`, `status`, `summary`, `techStack[]`, `gallery[]`, `documents[]`, `lessonsLearned[]`, `createdAt`, `updatedAt`

## Quy tắc
- `slug` duy nhất, immutable sau khi public.
- `category` dùng enum cố định để filter ổn định.
