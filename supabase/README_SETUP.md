# Supabase setup quick notes

## Local CLI commands

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
npm run seed:content:supabase
```

## RLS admin mapping (required)

After migration, map each admin profile to a Supabase Auth user:

```sql
update public.admin_profiles
set auth_user_id = '<auth_user_uuid>'
where username = 'admin';
```

Only rows with `is_active = true`, `role = 'admin'`, and matching `auth_user_id = auth.uid()` can read/write:
- `public.career_journey`
- `public.projects`
- `public.showcase_products`

## Important folders

- `supabase/migrations`: SQL migrations tracked in Git

## CI/CD

GitHub Actions workflow:
- `.github/workflows/supabase-db-push.yml`

This workflow runs migration push when `supabase/**` changes on `main`.
