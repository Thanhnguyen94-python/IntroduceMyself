# Supabase setup quick notes

## Local CLI commands

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```

## Important folders

- `supabase/migrations`: SQL migrations tracked in Git

## CI/CD

GitHub Actions workflow:
- `.github/workflows/supabase-db-push.yml`

This workflow runs migration push when `supabase/**` changes on `main`.
