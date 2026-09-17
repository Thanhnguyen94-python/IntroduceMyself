# content/docs

## File chính
- `docs.json`

## Schema tối thiểu
- `schemaVersion`
- `items[]`: `id`, `slug`, `title`, `topic`, `visibility`, `summary`, `fileUrl`, `downloadable`, `tags[]`, `publishedAt`, `updatedAt`

## Quy tắc
- `visibility`: `public` | `private`.
- Tài liệu private không public trực tiếp URL nhạy cảm trong dữ liệu công khai (nếu yêu cầu bảo mật cao).
