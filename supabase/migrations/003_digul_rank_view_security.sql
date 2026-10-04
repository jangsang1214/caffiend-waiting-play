-- Keep weekly ranking view aligned with caller permissions.
alter view public.digul_weekly_ranked set (security_invoker = true);

comment on view public.digul_weekly_ranked is
  'Weekly DIGUL ranks; queried through the server-side Edge Function.';
