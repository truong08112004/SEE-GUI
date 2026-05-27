-- Reset + Seed SQL (safe against duplicate swimlanes)
-- Project: cc285261-639e-458d-9024-9a40f7ac70e0
--
-- What it does:
-- - Deletes ALL tasks (and related assignments/dependencies) for the project
-- - Deletes ALL swimlanes for the project
-- - Re-creates standard swimlanes (Backlog, Todo, In Progress, Review, Done) with fixed ids
-- - Re-creates 35 demo ecommerce tasks with fixed ids
-- - Assigns tasks round-robin to existing demo users BY EMAIL (does NOT create users)
--
-- Run in Supabase SQL Editor.

begin;

-- =========================
-- 0) Delete old project data
-- =========================
with project_tasks as (
  select id
  from public.tasks
  where project_id = 'cc285261-639e-458d-9024-9a40f7ac70e0'
)
delete from public.task_assignments ta
using project_tasks pt
where ta.task_id = pt.id;

with project_tasks as (
  select id
  from public.tasks
  where project_id = 'cc285261-639e-458d-9024-9a40f7ac70e0'
)
delete from public.task_dependencies td
using project_tasks pt
where td.task_id = pt.id
   or td.depends_on_task_id = pt.id;

delete from public.tasks
where project_id = 'cc285261-639e-458d-9024-9a40f7ac70e0';

delete from public.swimlanes
where project_id = 'cc285261-639e-458d-9024-9a40f7ac70e0';

-- (Optional) If you also want to reset membership, uncomment:
-- delete from public.project_members where project_id = 'cc285261-639e-458d-9024-9a40f7ac70e0';

-- =========================
-- 1) Re-create swimlanes
-- =========================
insert into public.swimlanes (id, project_id, name, position)
values
  ('11111111-1111-1111-1111-111111111111', 'cc285261-639e-458d-9024-9a40f7ac70e0', 'Backlog', 0),
  ('22222222-2222-2222-2222-222222222222', 'cc285261-639e-458d-9024-9a40f7ac70e0', 'Todo', 1),
  ('33333333-3333-3333-3333-333333333333', 'cc285261-639e-458d-9024-9a40f7ac70e0', 'In Progress', 2),
  ('44444444-4444-4444-4444-444444444444', 'cc285261-639e-458d-9024-9a40f7ac70e0', 'Review', 3),
  ('55555555-5555-5555-5555-555555555555', 'cc285261-639e-458d-9024-9a40f7ac70e0', 'Done', 4);

-- =========================
-- 2) Re-create tasks (35)
-- =========================
insert into public.tasks (
  id,
  project_id,
  swimlane_id,
  title,
  description,
  position,
  attr_afp, attr_input, attr_output, attr_enquiry, attr_file, attr_interface, attr_resource, attr_duration,
  estimated_effort_pm,
  attr_rely, attr_cplx, attr_acap, attr_pcap, attr_tool, attr_sced,
  start_date, end_date
)
values
  -- Done (finished)
  ('b0000000-0000-0000-0000-000000000001','cc285261-639e-458d-9024-9a40f7ac70e0','55555555-5555-5555-5555-555555555555','Set up Next.js app shell + routing','Seeded e-commerce task for demo dashboard and estimation.',0, 210,28,42,18,16,10,5,6, 5.96, 1.00,1.15,1.00,1.00,0.83,1.08, now()-interval '30 days', now()-interval '24 days'),
  ('b0000000-0000-0000-0000-000000000002','cc285261-639e-458d-9024-9a40f7ac70e0','55555555-5555-5555-5555-555555555555','Design system: buttons, inputs, layout','Seeded e-commerce task for demo dashboard and estimation.',1, 180,24,36,16,14,8,4,5, 5.46, 0.88,1.00,0.83,1.00,0.83,1.00, now()-interval '26 days', now()-interval '20 days'),
  ('b0000000-0000-0000-0000-000000000003','cc285261-639e-458d-9024-9a40f7ac70e0','55555555-5555-5555-5555-555555555555','Observability: error tracking + logs','Seeded e-commerce task for demo dashboard and estimation.',2, 130,14,20,10,10,5,3,3, 4.36, 1.00,0.88,1.00,1.15,1.15,1.00, now()-interval '18 days', now()-interval '15 days'),
  ('b0000000-0000-0000-0000-000000000004','cc285261-639e-458d-9024-9a40f7ac70e0','55555555-5555-5555-5555-555555555555','SEO: metadata + sitemap + robots','Seeded e-commerce task for demo dashboard and estimation.',3, 120,12,18,8,9,4,2,2, 4.06, 0.88,0.88,1.15,1.00,1.15,1.00, now()-interval '14 days', now()-interval '12 days'),
  ('b0000000-0000-0000-0000-000000000005','cc285261-639e-458d-9024-9a40f7ac70e0','55555555-5555-5555-5555-555555555555','Accessibility pass (WCAG basics)','Seeded e-commerce task for demo dashboard and estimation.',4, 140,16,22,10,11,5,3,3, 4.56, 1.00,1.00,1.00,1.00,1.15,1.00, now()-interval '12 days', now()-interval '9 days'),

  -- In Progress
  ('b0000000-0000-0000-0000-000000000006','cc285261-639e-458d-9024-9a40f7ac70e0','33333333-3333-3333-3333-333333333333','Product catalog page + filters','Seeded e-commerce task for demo dashboard and estimation.',5, 380,44,58,28,26,14,6,9, 8.86, 1.15,1.30,1.00,0.83,0.83,1.16, null, null),
  ('b0000000-0000-0000-0000-000000000007','cc285261-639e-458d-9024-9a40f7ac70e0','33333333-3333-3333-3333-333333333333','Cart: add/update/remove items','Seeded e-commerce task for demo dashboard and estimation.',6, 420,48,62,30,28,16,6,10, 9.46, 1.00,1.30,1.00,1.00,0.83,1.08, null, null),
  ('b0000000-0000-0000-0000-000000000008','cc285261-639e-458d-9024-9a40f7ac70e0','33333333-3333-3333-3333-333333333333','Auth: sign in / sign up / reset password','Seeded e-commerce task for demo dashboard and estimation.',7, 360,40,55,26,24,12,5,8, 8.36, 1.15,1.15,0.83,1.00,1.00,1.08, null, null),
  ('b0000000-0000-0000-0000-000000000009','cc285261-639e-458d-9024-9a40f7ac70e0','33333333-3333-3333-3333-333333333333','Security: rate limiting + input validation','Seeded e-commerce task for demo dashboard and estimation.',8, 240,26,40,18,16,10,6,6, 6.36, 1.15,1.15,1.00,1.00,0.83,1.16, null, null),
  ('b0000000-0000-0000-0000-000000000010','cc285261-639e-458d-9024-9a40f7ac70e0','33333333-3333-3333-3333-333333333333','Performance: image optimization + caching','Seeded e-commerce task for demo dashboard and estimation.',9, 260,30,44,20,18,10,5,6, 6.66, 1.00,1.15,1.00,1.00,1.15,1.08, null, null),

  -- Backlog / Todo / Review (remaining)
  ('b0000000-0000-0000-0000-000000000011','cc285261-639e-458d-9024-9a40f7ac70e0','11111111-1111-1111-1111-111111111111','Product detail page (PDP)','Seeded e-commerce task for demo dashboard and estimation.',10, 260,30,44,20,18,10,5,6, 6.66, 1.00,1.15,1.00,1.00,1.15,1.08, null, null),
  ('b0000000-0000-0000-0000-000000000012','cc285261-639e-458d-9024-9a40f7ac70e0','11111111-1111-1111-1111-111111111111','Search + autocomplete','Seeded e-commerce task for demo dashboard and estimation.',11, 240,26,40,18,16,10,5,5, 6.36, 0.88,1.00,1.15,1.00,1.15,1.00, null, null),
  ('b0000000-0000-0000-0000-000000000013','cc285261-639e-458d-9024-9a40f7ac70e0','11111111-1111-1111-1111-111111111111','Checkout: address + shipping method','Seeded e-commerce task for demo dashboard and estimation.',12, 650,72,86,40,38,22,7,14, 12.46, 1.15,1.50,1.00,0.83,0.83,1.23, null, null),
  ('b0000000-0000-0000-0000-000000000014','cc285261-639e-458d-9024-9a40f7ac70e0','11111111-1111-1111-1111-111111111111','Payments: Stripe integration','Seeded e-commerce task for demo dashboard and estimation.',13, 680,78,92,42,40,24,8,16, 13.06, 1.30,1.50,1.00,0.83,0.83,1.23, null, null),
  ('b0000000-0000-0000-0000-000000000015','cc285261-639e-458d-9024-9a40f7ac70e0','11111111-1111-1111-1111-111111111111','Order confirmation + email receipt','Seeded e-commerce task for demo dashboard and estimation.',14, 220,26,38,18,16,10,5,5, 6.16, 1.00,1.00,1.15,1.00,1.00,1.08, null, null),
  ('b0000000-0000-0000-0000-000000000016','cc285261-639e-458d-9024-9a40f7ac70e0','22222222-2222-2222-2222-222222222222','User account: order history','Seeded e-commerce task for demo dashboard and estimation.',15, 240,28,40,18,16,10,5,6, 6.36, 0.88,1.15,1.15,1.00,1.15,1.00, null, null),
  ('b0000000-0000-0000-0000-000000000017','cc285261-639e-458d-9024-9a40f7ac70e0','22222222-2222-2222-2222-222222222222','Admin: product CRUD','Seeded e-commerce task for demo dashboard and estimation.',16, 380,44,58,28,26,14,6,9, 8.86, 1.15,1.30,0.83,1.00,1.00,1.16, null, null),
  ('b0000000-0000-0000-0000-000000000018','cc285261-639e-458d-9024-9a40f7ac70e0','22222222-2222-2222-2222-222222222222','Admin: promotions/coupons','Seeded e-commerce task for demo dashboard and estimation.',17, 360,40,55,26,24,12,5,8, 8.36, 1.00,1.30,1.00,1.00,0.83,1.16, null, null),
  ('b0000000-0000-0000-0000-000000000019','cc285261-639e-458d-9024-9a40f7ac70e0','22222222-2222-2222-2222-222222222222','Admin: inventory + pricing rules','Seeded e-commerce task for demo dashboard and estimation.',18, 650,72,86,40,38,22,7,14, 12.46, 1.15,1.50,1.00,0.83,0.83,1.23, null, null),
  ('b0000000-0000-0000-0000-000000000020','cc285261-639e-458d-9024-9a40f7ac70e0','44444444-4444-4444-4444-444444444444','CI/CD: preview deployments','Seeded e-commerce task for demo dashboard and estimation.',19, 220,22,34,16,14,8,4,5, 5.96, 1.00,1.15,1.00,1.00,1.15,1.08, null, null),

  -- Extra tasks to reach 35
  ('b0000000-0000-0000-0000-000000000021','cc285261-639e-458d-9024-9a40f7ac70e0','11111111-1111-1111-1111-111111111111','Product catalog page + filters #2','Seeded e-commerce task for demo dashboard and estimation.',20, 420,48,62,30,28,16,6,10, 9.46, 1.00,1.30,1.00,1.00,0.83,1.08, null, null),
  ('b0000000-0000-0000-0000-000000000022','cc285261-639e-458d-9024-9a40f7ac70e0','11111111-1111-1111-1111-111111111111','Cart: add/update/remove items #2','Seeded e-commerce task for demo dashboard and estimation.',21, 380,44,58,28,26,14,6,9, 8.86, 1.15,1.30,1.00,0.83,0.83,1.16, null, null),
  ('b0000000-0000-0000-0000-000000000023','cc285261-639e-458d-9024-9a40f7ac70e0','11111111-1111-1111-1111-111111111111','Checkout: address + shipping method #2','Seeded e-commerce task for demo dashboard and estimation.',22, 680,78,92,42,40,24,8,16, 13.06, 1.30,1.50,1.00,0.83,0.83,1.23, null, null),
  ('b0000000-0000-0000-0000-000000000024','cc285261-639e-458d-9024-9a40f7ac70e0','22222222-2222-2222-2222-222222222222','Payments: Stripe integration #2','Seeded e-commerce task for demo dashboard and estimation.',23, 650,72,86,40,38,22,7,14, 12.46, 1.15,1.50,1.00,0.83,0.83,1.23, null, null),
  ('b0000000-0000-0000-0000-000000000025','cc285261-639e-458d-9024-9a40f7ac70e0','22222222-2222-2222-2222-222222222222','Security: rate limiting + input validation #2','Seeded e-commerce task for demo dashboard and estimation.',24, 260,30,44,20,18,10,5,6, 6.66, 1.00,1.15,1.15,1.00,1.00,1.16, null, null),
  ('b0000000-0000-0000-0000-000000000026','cc285261-639e-458d-9024-9a40f7ac70e0','44444444-4444-4444-4444-444444444444','Admin: product CRUD #2','Seeded e-commerce task for demo dashboard and estimation.',25, 360,40,55,26,24,12,5,8, 8.36, 1.15,1.30,0.83,1.00,1.00,1.16, null, null),
  ('b0000000-0000-0000-0000-000000000027','cc285261-639e-458d-9024-9a40f7ac70e0','44444444-4444-4444-4444-444444444444','Admin: promotions/coupons #2','Seeded e-commerce task for demo dashboard and estimation.',26, 380,44,58,28,26,14,6,9, 8.86, 1.00,1.30,1.00,1.00,0.83,1.16, null, null),
  ('b0000000-0000-0000-0000-000000000028','cc285261-639e-458d-9024-9a40f7ac70e0','44444444-4444-4444-4444-444444444444','Performance: image optimization + caching #2','Seeded e-commerce task for demo dashboard and estimation.',27, 240,26,40,18,16,10,5,6, 6.36, 1.00,1.15,1.00,1.00,1.15,1.08, null, null),
  ('b0000000-0000-0000-0000-000000000029','cc285261-639e-458d-9024-9a40f7ac70e0','44444444-4444-4444-4444-444444444444','CI/CD: preview deployments #2','Seeded e-commerce task for demo dashboard and estimation.',28, 220,22,34,16,14,8,4,5, 5.96, 0.88,1.00,1.00,1.15,1.15,1.00, null, null),
  ('b0000000-0000-0000-0000-000000000030','cc285261-639e-458d-9024-9a40f7ac70e0','22222222-2222-2222-2222-222222222222','Search + autocomplete #2','Seeded e-commerce task for demo dashboard and estimation.',29, 240,26,40,18,16,10,5,6, 6.36, 0.88,1.15,1.15,1.00,1.15,1.00, null, null),
  ('b0000000-0000-0000-0000-000000000031','cc285261-639e-458d-9024-9a40f7ac70e0','11111111-1111-1111-1111-111111111111','Order confirmation + email receipt #2','Seeded e-commerce task for demo dashboard and estimation.',30, 220,26,38,18,16,10,5,5, 6.16, 1.00,1.00,1.15,1.00,1.00,1.08, null, null),
  ('b0000000-0000-0000-0000-000000000032','cc285261-639e-458d-9024-9a40f7ac70e0','11111111-1111-1111-1111-111111111111','User account: order history #2','Seeded e-commerce task for demo dashboard and estimation.',31, 240,28,40,18,16,10,5,6, 6.36, 0.88,1.15,1.15,1.00,1.15,1.00, null, null),
  ('b0000000-0000-0000-0000-000000000033','cc285261-639e-458d-9024-9a40f7ac70e0','11111111-1111-1111-1111-111111111111','Auth: sign in / sign up / reset password #2','Seeded e-commerce task for demo dashboard and estimation.',32, 360,40,55,26,24,12,5,8, 8.36, 1.15,1.15,0.83,1.00,1.00,1.08, null, null),
  ('b0000000-0000-0000-0000-000000000034','cc285261-639e-458d-9024-9a40f7ac70e0','22222222-2222-2222-2222-222222222222','Admin: inventory + pricing rules #2','Seeded e-commerce task for demo dashboard and estimation.',33, 680,78,92,42,40,24,8,16, 13.06, 1.30,1.50,1.00,0.83,0.83,1.23, null, null),
  ('b0000000-0000-0000-0000-000000000035','cc285261-639e-458d-9024-9a40f7ac70e0','22222222-2222-2222-2222-222222222222','Set up Next.js app shell + routing #2','Seeded e-commerce task for demo dashboard and estimation.',34, 210,28,42,18,16,10,5,6, 5.96, 1.00,1.15,1.00,1.00,0.83,1.08, null, null);

-- =========================
-- 3) Assign tasks to existing users (email-based)
-- =========================
with demo_users as (
  select
    u.id,
    row_number() over (order by u.email) as rn
  from public.users u
  where u.email in (
    'demo+cc2852.1@example.com',
    'demo+cc2852.2@example.com',
    'demo+cc2852.3@example.com',
    'demo+cc2852.4@example.com',
    'demo+cc2852.5@example.com',
    'demo+cc2852.6@example.com',
    'demo+cc2852.7@example.com',
    'demo+cc2852.8@example.com',
    'demo+cc2852.9@example.com',
    'demo+cc2852.10@example.com'
  )
),
demo_user_count as (
  select count(*)::int as n from demo_users
)
insert into public.task_assignments (task_id, user_id)
select
  t.id as task_id,
  du.id as user_id
from public.tasks t
cross join demo_user_count duc
join demo_users du
  on duc.n > 0 and du.rn = ((t.position % duc.n) + 1)
where t.project_id = 'cc285261-639e-458d-9024-9a40f7ac70e0'
  and t.id::text like 'b0000000-0000-0000-0000-%';

commit;

