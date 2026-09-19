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
## guilde
Bạn có thể copy 1 item cũ rồi đổi các trường sau:

id → giá trị mới, duy nhất
slug → giá trị mới, duy nhất
title.vi, title.en
summary, objective, description
equipmentTags, gallery, attachments, lessonsLearned
Giữ category: "3d-jig" để nó nằm trong nhóm 3D/Jig
Chọn status phù hợp (completed/ongoing)
