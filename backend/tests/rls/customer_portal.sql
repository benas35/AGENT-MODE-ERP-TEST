BEGIN;

SELECT plan(6);

-- Base data -------------------------------------------------------------
INSERT INTO organizations (id, name)
VALUES ('10000000-0000-0000-0000-000000000001', 'Portal Test Org')
ON CONFLICT (id) DO NOTHING;

INSERT INTO customers (id, org_id, first_name, last_name, email, phone)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Portal',
  'Customer',
  'portal@example.com',
  '+37060000001'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO customers (id, org_id, first_name, last_name, email, phone)
VALUES (
  '20000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  'Second',
  'Customer',
  'other@example.com',
  '+37060000002'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, org_id, role, first_name, last_name, active)
VALUES (
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'SERVICE_ADVISOR',
  'Portal',
  'Advisor',
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO work_orders (id, org_id, customer_id, status, title, created_by)
VALUES (
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'IN_PROGRESS',
  'Portal Approval Flow',
  '30000000-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO customer_notification_preferences (id, org_id, customer_id)
VALUES (
  '50000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001'
)
ON CONFLICT (customer_id) DO NOTHING;

INSERT INTO customer_messages (id, org_id, work_order_id, customer_id, sender_profile_id, direction, body)
VALUES (
  '60000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'staff',
  'Brakes need replacement approval'
)
ON CONFLICT (id) DO NOTHING;

-- Test 1: staff member can insert new customer message
SET LOCAL ROLE authenticated;
PERFORM set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
SELECT lives_ok(
  $$INSERT INTO customer_messages (org_id, work_order_id, customer_id, sender_profile_id, direction, body)
    VALUES (
      '10000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001',
      'staff',
      'Parts are ready for installation'
    )$$,
  'Advisor can insert staff-originated message'
);
RESET ROLE;

-- Test 2: portal customer can read staff message
SET LOCAL ROLE anon;
PERFORM set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
PERFORM set_config('request.jwt.claim.role', 'customer_portal', true);
PERFORM set_config(
  'request.jwt.claims',
  '{"role":"customer_portal","customer_id":"20000000-0000-0000-0000-000000000001","org_id":"10000000-0000-0000-0000-000000000001"}',
  true
);
SELECT is(
  (
    SELECT count(*)
    FROM customer_messages
    WHERE work_order_id = '40000000-0000-0000-0000-000000000001'
  ),
  2,
  'Customer sees staff messages for their work order'
);
RESET ROLE;

-- Test 3: portal customer cannot see other customer messages
INSERT INTO customer_messages (id, org_id, work_order_id, customer_id, sender_profile_id, direction, body)
VALUES (
  '60000000-0000-0000-0000-000000000099',
  '10000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000001',
  'staff',
  'Message for different customer'
)
ON CONFLICT (id) DO NOTHING;

SET LOCAL ROLE anon;
PERFORM set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
PERFORM set_config('request.jwt.claim.role', 'customer_portal', true);
PERFORM set_config(
  'request.jwt.claims',
  '{"role":"customer_portal","customer_id":"20000000-0000-0000-0000-000000000001","org_id":"10000000-0000-0000-0000-000000000001"}',
  true
);
SELECT is(
  (
    SELECT count(*)
    FROM customer_messages
    WHERE customer_id = '20000000-0000-0000-0000-000000000001'
  ),
  2,
  'Customer does not see messages for other customers'
);
RESET ROLE;

-- Test 4: portal customer can insert response
SET LOCAL ROLE anon;
PERFORM set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
PERFORM set_config('request.jwt.claim.role', 'customer_portal', true);
PERFORM set_config(
  'request.jwt.claims',
  '{"role":"customer_portal","customer_id":"20000000-0000-0000-0000-000000000001","org_id":"10000000-0000-0000-0000-000000000001"}',
  true
);
SELECT lives_ok(
  $$INSERT INTO customer_messages (org_id, work_order_id, customer_id, direction, body)
    VALUES (
      '10000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      'customer',
      'I approve the additional brake work'
    )$$,
  'Customer can create their own message'
);
RESET ROLE;

-- Test 5: portal customer cannot insert for other customer
SET LOCAL ROLE anon;
PERFORM set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
PERFORM set_config('request.jwt.claim.role', 'customer_portal', true);
PERFORM set_config(
  'request.jwt.claims',
  '{"role":"customer_portal","customer_id":"20000000-0000-0000-0000-000000000001","org_id":"10000000-0000-0000-0000-000000000001"}',
  true
);
SELECT throws_like(
  $$INSERT INTO customer_messages (org_id, work_order_id, customer_id, direction, body)
    VALUES (
      '10000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000002',
      'customer',
      'Should not work'
    )$$,
  '%new row violates row-level security policy%',
  'Customer cannot create message for another account'
);
RESET ROLE;

-- Test 6: approval RPC updates status for valid request
SET LOCAL ROLE anon;
PERFORM set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
PERFORM set_config('request.jwt.claim.role', 'customer_portal', true);
PERFORM set_config(
  'request.jwt.claims',
  '{"role":"customer_portal","customer_id":"20000000-0000-0000-0000-000000000001","org_id":"10000000-0000-0000-0000-000000000001"}',
  true
);
SELECT is(
  (
    SELECT (customer_portal_update_work_order(
      '40000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      'APPROVED',
      'Go ahead'
    )->>'new_status')
  ),
  'APPROVED',
  'Customer approval RPC transitions status'
);
RESET ROLE;

SELECT finish();

ROLLBACK;

