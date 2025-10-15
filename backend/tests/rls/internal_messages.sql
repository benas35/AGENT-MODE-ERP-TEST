BEGIN;

SELECT plan(7);

-- Seed minimal org and profiles
INSERT INTO organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000111', 'Messaging Test Org')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, org_id, role, first_name, last_name, active)
VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000111', 'SERVICE_ADVISOR', 'Advisor', 'One', true),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000111', 'TECHNICIAN', 'Tech', 'Two', true),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000111', 'MANAGER', 'Manager', 'Three', true),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000111', 'SERVICE_ADVISOR', 'Advisor', 'Alt', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO message_threads (id, org_id, work_order_id, participants, last_message_at)
VALUES (
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000111',
  NULL,
  ARRAY[
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000203'
  ]::uuid[],
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO internal_messages (id, org_id, thread_id, sender_id, recipient_id, body, priority)
VALUES (
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000111',
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000202',
  'Torque spec double-check',
  'normal'
)
ON CONFLICT (id) DO NOTHING;

-- Test 1: participant can read thread messages
SET LOCAL ROLE authenticated;
PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
SELECT is(
  (SELECT count(*) FROM internal_messages WHERE id = '00000000-0000-0000-0000-000000000401'),
  1,
  'Participant can read thread message'
);
RESET ROLE;

-- Test 2: non-participant cannot read thread messages
SET LOCAL ROLE authenticated;
PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000204', true);
PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
SELECT is(
  (SELECT count(*) FROM internal_messages WHERE id = '00000000-0000-0000-0000-000000000401'),
  0,
  'Non participant cannot read thread message'
);
RESET ROLE;

-- Test 3: sender can update their message
SET LOCAL ROLE authenticated;
PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
SELECT lives_ok(
  $$UPDATE internal_messages SET body = 'Updated torque spec' WHERE id = '00000000-0000-0000-0000-000000000401'$$,
  'Sender can update their message'
);
RESET ROLE;

-- Test 4: unrelated user cannot update message
SET LOCAL ROLE authenticated;
PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000204', true);
PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
SELECT throws_like(
  $$UPDATE internal_messages SET body = 'Should fail' WHERE id = '00000000-0000-0000-0000-000000000401'$$,
  '%new row violates row-level security policy%',
  'Non participant update is rejected'
);
RESET ROLE;

-- Test 5: unread count helper only counts unread for recipients
SET LOCAL ROLE authenticated;
PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000202', true);
PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
SELECT is(
  (SELECT internal_message_unread_count()),
  1,
  'Recipient sees one unread message'
);
RESET ROLE;

-- Test 6: per-thread unread counts surface expected totals
SET LOCAL ROLE authenticated;
PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000202', true);
PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
SELECT is(
  (
    SELECT unread FROM internal_message_unread_counts()
    WHERE thread_id = '00000000-0000-0000-0000-000000000301'
  ),
  1,
  'Per-thread unread count returns expected value'
);
RESET ROLE;

-- Test 7: mark_internal_messages_read marks message
SET LOCAL ROLE authenticated;
PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000202', true);
PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
SELECT is(
  (SELECT mark_internal_messages_read('00000000-0000-0000-0000-000000000301', ARRAY['00000000-0000-0000-0000-000000000401']::uuid[])),
  1,
  'Read receipt function updates one message'
);
RESET ROLE;

SELECT finish();

ROLLBACK;
