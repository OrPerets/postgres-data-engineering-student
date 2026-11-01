/* Verify the visual journey independently against the classroom PostgreSQL data. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { buildJourney, buildAnimationLesson, buildGroupMemoryLesson, sourceData, workedExampleSql } = require('../docs/gitbook/javascripts/lab01-order-journey.js');

const root = path.resolve(__dirname, '..');
const practiceAssets = path.join(root, 'docs/gitbook/assets/lab01-practice');
const orderColumns = ['order_id', 'customer_id', 'order_date', 'status'];
const itemColumns = ['order_id', 'line_no', 'product_name', 'category', 'quantity', 'unit_price', 'discount_pct'];
const joinedColumns = ['customer_id', 'full_name', 'city', 'order_id', 'order_date', 'status', 'line_no', 'product_name', 'category', 'quantity', 'unit_price', 'discount_pct'];
const groupedColumns = ['customer_id', 'order_id', 'order_date', 'revenue'];
const resultColumns = [...groupedColumns, 'running_total'];
const numericColumns = new Set(['customer_id', 'order_id', 'line_no', 'quantity', 'unit_price', 'discount_pct', 'line_revenue', 'revenue', 'running_total', 'default_date', 'explicit_rows', 'default_unique']);

function project(rows, columns) {
  return rows.map(row => Object.fromEntries(columns.map(column => {
    assert.ok(Object.hasOwn(row, column), `Missing column ${column}`);
    let value = row[column];
    if (value !== null && numericColumns.has(column)) value = Number(value);
    if (column === 'order_date' && value instanceof Date) value = value.toISOString().slice(0, 10);
    return [column, value];
  })));
}

const joinedSql = `
  SELECT c.customer_id, c.full_name, c.city,
         o.order_id, o.order_date::text AS order_date, o.status,
         i.line_no, i.product_name, i.category, i.quantity,
         i.unit_price, i.discount_pct
    FROM customers AS c
    JOIN orders AS o ON o.customer_id = c.customer_id
    JOIN order_items AS i ON i.order_id = o.order_id
   WHERE c.customer_id = 1`;
const groupedCte = `WITH order_totals AS (
  SELECT o.customer_id, o.order_id, o.order_date,
         SUM(i.quantity * i.unit_price * (1 - COALESCE(i.discount_pct, 0) / 100.0)) AS revenue
    FROM orders AS o
    JOIN order_items AS i ON i.order_id = o.order_id
   WHERE o.customer_id = 1 AND o.status = 'completed'
   GROUP BY o.customer_id, o.order_id, o.order_date
)`;

test('the focused JOIN animation matches each of five lines exactly once', () => {
  const lessons = buildAnimationLesson();
  assert.deepEqual(lessons.map(lesson => lesson.key), ['join', 'group', 'window']);
  const expectedIds = ['101-1', '101-2', '102-1', '102-2', '103-1'];
  for (const lesson of lessons) {
    assert.deepEqual(lesson.subset.orderIds, [101, 102, 103]);
    assert.deepEqual(lesson.subset.lineIds, expectedIds);
    assert.deepEqual(lesson.steps[0].outputs, []);
    assert.equal(lesson.steps[0].active, null);
  }
  const steps = lessons[0].steps;
  assert.deepEqual(steps.map(step => step.index), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(steps.map(step => step.outputs.length), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(steps.slice(1).map(step => step.active.line_id), expectedIds);
  for (const step of steps.slice(1)) {
    const row = step.outputs[step.active.output_index];
    assert.equal(`${row.order_id}-${row.line_no}`, step.active.line_id);
    assert.equal(row.order_id, step.active.order_id);
    assert.equal(row.line_no, step.active.line_no);
    const ids = step.outputs.map(output => `${output.order_id}-${output.line_no}`);
    assert.deepEqual(ids, expectedIds.slice(0, step.index));
    assert.equal(new Set(ids).size, ids.length, 'a line cannot arrive twice');
  }
  assert.deepEqual(steps.at(-1).outputs.map(row => row.order_id), [101, 101, 102, 102, 103]);
  assert.deepEqual(steps.at(-1).outputs.map(row => row.line_revenue), [100, 200, 150, 50, 200]);
});

const groupLineIds = ['101-1', '101-2', '102-1', '102-2', '103-1'];
const groupOrderIds = [101, 101, 102, 102, 103];
const groupAmounts = [100, 200, 150, 50, 200];
const groupTotals = [{ order_id: 101, revenue: 300 }, { order_id: 102, revenue: 200 }, { order_id: 103, revenue: 200 }];
const resourceKeys = ['rowsRead', 'lookups', 'groupsCreated', 'storedMembers', 'updates'];

function resources(step) {
  return resourceKeys.map(key => step.stats[key]);
}

function assertEmission(lesson) {
  const emits = lesson.steps.filter(step => step.phase === 'emit');
  assert.equal(emits.length, 3);
  const finishedAssignment = lesson.steps.at(-4);
  assert.deepEqual(finishedAssignment.outputs, [], 'working sums are not output rows');
  assert.deepEqual(project(finishedAssignment.groups, ['order_id', 'revenue']), groupTotals);
  for (const [index, step] of emits.entries()) {
    assert.equal(step.active.kind, 'emit');
    assert.equal(step.active.order_id, groupTotals[index].order_id);
    assert.equal(step.active.output_index, index);
    assert.deepEqual(project(step.outputs, ['order_id', 'revenue']), groupTotals.slice(0, index + 1));
    assert.deepEqual(step.groups, finishedAssignment.groups, 'emitting output does not re-add contributions');
    assert.deepEqual(step.stats, finishedAssignment.stats, 'emitting output does not re-read source rows');
  }
  for (const step of lesson.steps.filter(step => step.phase !== 'emit')) {
    assert.deepEqual(step.outputs, [], `${step.phase}: final output stays withheld`);
  }
}

test('two-pass GROUP BY discovers empty groups before assigning members and emitting output', () => {
  const lesson = buildGroupMemoryLesson();
  assert.equal(lesson.key, 'group');
  assert.equal(lesson.method, 'two_pass');
  assert.deepEqual(buildAnimationLesson().find(item => item.key === 'group'), lesson);
  assert.deepEqual(lesson.steps.map(step => step.index), Array.from({ length: 14 }, (_, index) => index));
  assert.deepEqual(lesson.steps.map(step => step.phase), [
    'ready', ...Array(5).fill('discover'), ...Array(5).fill('assign'), ...Array(3).fill('emit'),
  ]);
  assert.deepEqual(lesson.steps[0].groups, []);
  assert.deepEqual(lesson.steps[0].outputs, []);
  assert.equal(lesson.steps[0].active, null);
  const discovery = lesson.steps.slice(1, 6);
  assert.deepEqual(discovery.map(step => step.active.line_id), groupLineIds);
  assert.deepEqual(discovery.map(step => step.active.newGroup), [true, false, true, false, true]);
  assert.deepEqual(discovery.map(step => step.groups.map(group => group.order_id)), [
    [101], [101], [101, 102], [101, 102], [101, 102, 103],
  ]);
  for (const step of discovery) {
    assert.equal(step.active.kind, 'discover');
    for (const group of step.groups) {
      assert.equal(group.revenue, 0, 'discovery allocates a group without precomputing its sum');
      assert.deepEqual(group.members, [], 'discovery does not retain contributions yet');
    }
  }
  const assignment = lesson.steps.slice(6, 11);
  assert.deepEqual(assignment.map(step => step.active.line_id), groupLineIds);
  assert.deepEqual(assignment.map(step => step.active.order_id), groupOrderIds);
  assert.deepEqual(assignment.map(step => step.active.previousTotal), [0, 100, 0, 150, 0]);
  assert.deepEqual(assignment.map(step => step.active.nextTotal), [100, 300, 150, 200, 200]);
  assert.deepEqual(assignment.map(step => step.groups.map(group => group.revenue)), [
    [100, 0, 0], [300, 0, 0], [300, 150, 0], [300, 200, 0], [300, 200, 200],
  ]);
  for (const [index, step] of assignment.entries()) {
    assert.equal(step.active.kind, 'assign');
    assert.deepEqual(step.groups.map(group => group.order_id), [101, 102, 103]);
    const members = step.groups.flatMap(group => group.members);
    assert.deepEqual(members.map(member => member.line_id), groupLineIds.slice(0, index + 1));
    assert.deepEqual(members.map(member => member.line_revenue), groupAmounts.slice(0, index + 1));
    assert.equal(new Set(members.map(member => member.line_id)).size, index + 1);
    for (const group of step.groups) {
      assert.ok(group.members.every(member => Number(member.line_id.split('-')[0]) === group.order_id));
      assert.equal(group.revenue, group.members.reduce((sum, member) => sum + member.line_revenue, 0));
    }
  }
  assert.deepEqual(lesson.steps.map(resources), [
    [0, 0, 0, 0, 0],
    [1, 1, 1, 0, 0], [2, 2, 1, 0, 0], [3, 3, 2, 0, 0], [4, 4, 2, 0, 0], [5, 5, 3, 0, 0],
    [6, 6, 3, 1, 1], [7, 7, 3, 2, 2], [8, 8, 3, 3, 3], [9, 9, 3, 4, 4], [10, 10, 3, 5, 5],
    [10, 10, 3, 5, 5], [10, 10, 3, 5, 5], [10, 10, 3, 5, 5],
  ]);
  assertEmission(lesson);
});

test('one-pass SUM looks up each source once and retains sums without member references', () => {
  const lesson = buildGroupMemoryLesson('one_pass');
  assert.equal(lesson.method, 'one_pass');
  assert.deepEqual(buildAnimationLesson({ groupMethod: 'one_pass' }).find(item => item.key === 'group'), lesson);
  assert.deepEqual(lesson.steps.map(step => step.index), Array.from({ length: 14 }, (_, index) => index));
  assert.deepEqual(lesson.steps.map(step => step.phase), [
    'ready', 'lookup', 'assign', 'lookup', 'assign', 'lookup', 'assign', 'lookup', 'assign', 'lookup', 'assign', 'emit', 'emit', 'emit',
  ]);
  assert.deepEqual(lesson.steps[0].groups, []);
  const lookups = lesson.steps.filter(step => step.phase === 'lookup');
  const assignments = lesson.steps.filter(step => step.phase === 'assign');
  assert.deepEqual(lookups.map(step => step.active.line_id), groupLineIds);
  assert.deepEqual(assignments.map(step => step.active.line_id), groupLineIds);
  assert.deepEqual(lookups.map(step => step.active.newGroup), [true, false, true, false, true]);
  assert.deepEqual(lookups.map(step => step.groups.map(group => group.order_id)), [
    [101], [101], [101, 102], [101, 102], [101, 102, 103],
  ]);
  assert.deepEqual(lookups.map(step => step.groups.map(group => group.revenue)), [
    [0], [100], [300, 0], [300, 150], [300, 200, 0],
  ]);
  assert.deepEqual(assignments.map(step => step.groups.map(group => group.revenue)), [
    [100], [300], [300, 150], [300, 200], [300, 200, 200],
  ]);
  for (const step of lesson.steps) {
    assert.ok(step.groups.every(group => group.members.length === 0), 'SUM state does not retain the original members');
  }
  for (const step of assignments) {
    assert.equal(step.active.nextTotal - step.active.previousTotal, step.active.line_revenue);
  }
  assert.deepEqual(lesson.steps.map(resources), [
    [0, 0, 0, 0, 0],
    [1, 1, 1, 0, 0], [1, 1, 1, 0, 1], [2, 2, 1, 0, 1], [2, 2, 1, 0, 2], [3, 3, 2, 0, 2],
    [3, 3, 2, 0, 3], [4, 4, 2, 0, 3], [4, 4, 2, 0, 4], [5, 5, 3, 0, 4], [5, 5, 3, 0, 5],
    [5, 5, 3, 0, 5], [5, 5, 3, 0, 5], [5, 5, 3, 0, 5],
  ]);
  assertEmission(lesson);
  assert.deepEqual(lesson.steps.at(-1).outputs, buildGroupMemoryLesson('two_pass').steps.at(-1).outputs);
});

test('GROUP BY replays isolate working memory, member references, counters, and method selection', () => {
  const originalSource = structuredClone(sourceData);
  for (const method of ['two_pass', 'one_pass']) {
    const lesson = buildGroupMemoryLesson(method);
    const original = structuredClone(lesson);
    const fresh = buildGroupMemoryLesson(method);
    assert.notEqual(lesson.steps[6].groups, lesson.steps[7].groups);
    assert.notEqual(lesson.steps[6].stats, lesson.steps[7].stats);
    const mutations = [
      () => { lesson.steps[6].groups[0].revenue = -999; },
      () => { lesson.steps[6].stats.rowsRead = -999; },
      () => { lesson.steps[6].groups[0].members.push({ line_id: 'bad', line_revenue: -999 }); },
      () => { lesson.steps.at(-1).outputs[0].revenue = -999; },
    ];
    for (const mutate of mutations) {
      try { mutate(); } catch (error) { assert.ok(error instanceof TypeError); }
    }
    assert.deepEqual(lesson.steps[7], original.steps[7]);
    assert.deepEqual(fresh, original);
    assert.deepEqual(buildGroupMemoryLesson(method), original);
    assert.deepEqual(sourceData, originalSource);
    assert.deepEqual(fresh.steps[0].groups, []);
    assert.deepEqual(fresh.steps[0].outputs, []);
    assert.deepEqual(resources(fresh.steps[0]), [0, 0, 0, 0, 0]);
  }
  assert.throws(() => buildGroupMemoryLesson('unsupported'), RangeError);
  assert.throws(() => buildAnimationLesson({ groupMethod: 'unsupported' }), RangeError);
});

test('running-window animation grows its frame one order at a time and retains all orders', () => {
  const windowLesson = buildAnimationLesson().find(lesson => lesson.key === 'window');
  assert.deepEqual(windowLesson.steps.map(step => step.index), [0, 1, 2, 3]);
  assert.deepEqual(windowLesson.steps.map(step => step.outputs.length), [0, 1, 2, 3]);
  assert.deepEqual(windowLesson.steps.slice(1).map(step => step.active.frameIds), [[101], [101, 102], [101, 102, 103]]);
  assert.deepEqual(windowLesson.steps.slice(1).map(step => step.active.order_id), [101, 102, 103]);
  const finalRows = [
    { order_id: 101, revenue: 300, running_total: 300 },
    { order_id: 102, revenue: 200, running_total: 500 },
    { order_id: 103, revenue: 200, running_total: 700 },
  ];
  for (const step of windowLesson.steps) {
    assert.deepEqual(project(step.outputs, ['order_id', 'revenue', 'running_total']), finalRows.slice(0, step.index));
  }
});

test('replay starts empty and snapshot changes cannot corrupt another frame or the source data', () => {
  const originalSource = structuredClone(sourceData);
  const first = buildAnimationLesson();
  const originalLesson = structuredClone(first);
  const second = buildAnimationLesson();
  assert.deepEqual(second, originalLesson);
  assert.notEqual(first, second);
  // A renderer may annotate its current row. That must not alter a later
  // snapshot, another replay, or the immutable classroom fixture.
  try { first[0].steps[1].outputs[0].line_revenue = -999; } catch (error) {
    assert.ok(error instanceof TypeError, 'frozen snapshots may reject mutation');
  }
  assert.deepEqual(first[0].steps[2], originalLesson[0].steps[2]);
  assert.deepEqual(second, originalLesson);
  assert.deepEqual(buildAnimationLesson(), originalLesson);
  assert.deepEqual(sourceData, originalSource);
  for (const lesson of second) {
    assert.deepEqual(lesson.steps[0].outputs, []);
    assert.equal(lesson.steps[0].active, null);
  }
});

test('Lab 01 journey agrees with PostgreSQL at every transformation', async t => {
  const { PGlite } = await import(pathToFileURL(path.join(practiceAssets, 'pglite/index.js')).href);
  const db = new PGlite();
  const query = async sql => (await db.query(sql)).rows;
  try {
    for (const file of ['01_schema.sql', '02_seed.sql']) {
      await db.exec(await fs.readFile(path.join(root, 'labs/01-relational-sql/sql', file), 'utf8'));
    }
    const stages = buildJourney();
    const byKey = Object.fromEntries(stages.map(stage => [stage.key, stage]));

    await t.test('the fixture is the actual six-order, eight-item customer-1 subset', async () => {
      const customer = (await query('SELECT customer_id, full_name, city FROM customers WHERE customer_id = 1'))[0];
      const orders = await query('SELECT order_id, customer_id, order_date::text AS order_date, status FROM orders WHERE customer_id = 1 ORDER BY order_date, order_id');
      const items = await query('SELECT i.* FROM order_items AS i JOIN orders AS o USING (order_id) WHERE o.customer_id = 1 ORDER BY i.order_id, i.line_no');
      assert.deepEqual(sourceData.customer, customer);
      assert.deepEqual(project(sourceData.orders, orderColumns), project(orders, orderColumns));
      assert.deepEqual(project(sourceData.items, itemColumns), project(items, itemColumns));
      assert.equal(orders.length, 6);
      assert.equal(items.length, 8);
      assert.equal(orders.find(row => row.order_id === 105).status, 'cancelled');
      assert.deepEqual(project(byKey.source.before.rows, orderColumns), project(orders, orderColumns));
      assert.deepEqual(project(byKey.source.after.rows, itemColumns), project(items, itemColumns));
      assert.deepEqual(project(byKey.join.before.rows, orderColumns), project(orders, orderColumns));
    });

    await t.test('six states expose the intended grain and row counts', () => {
      assert.deepEqual(stages.map(stage => stage.key), ['source', 'join', 'filter', 'revenue', 'group', 'window']);
      assert.deepEqual(stages.map(stage => [stage.before.rows.length, stage.after.rows.length]), [[6, 8], [6, 8], [8, 7], [7, 7], [7, 5], [5, 5]]);
      for (const stage of stages) {
        for (const table of [stage.before, stage.after]) {
          assert.ok(table.grain, `${stage.key}: grain is explicit`);
          assert.ok(table.columns.length, `${stage.key}: table has semantic columns`);
          for (const row of table.rows) {
            for (const column of table.columns) assert.ok(Object.hasOwn(row, column.key), `${stage.key}: ${column.key} exists`);
          }
        }
      }
    });

    await t.test('JOIN fans orders out to actual lines and WHERE removes cancelled order 105', async () => {
      const joined = await query(`${joinedSql} ORDER BY o.order_date, o.order_id, i.line_no`);
      const filtered = await query(`${joinedSql} AND o.status = 'completed' ORDER BY o.order_date, o.order_id, i.line_no`);
      assert.deepEqual(project(byKey.join.after.rows, joinedColumns), project(joined, joinedColumns));
      assert.deepEqual(project(byKey.filter.before.rows, joinedColumns), project(joined, joinedColumns));
      assert.deepEqual(project(byKey.filter.after.rows, joinedColumns), project(filtered, joinedColumns));
      assert.equal(joined.filter(row => row.order_id === 101).length, 2);
      assert.equal(joined.filter(row => row.order_id === 102).length, 2);
      assert.equal(joined.filter(row => row.order_id === 105).length, 1);
      assert.ok(byKey.filter.after.rows.every(row => row.order_id !== 105));
    });

    await t.test('line revenue handles NULL and a percentage discount without changing grain', async () => {
      const expected = await query(`SELECT *, quantity * unit_price * (1 - COALESCE(discount_pct, 0) / 100.0) AS line_revenue
        FROM (${joinedSql} AND o.status = 'completed') AS completed
        ORDER BY order_date, order_id, line_no`);
      assert.deepEqual(project(byKey.revenue.before.rows, joinedColumns), project(expected, joinedColumns));
      assert.deepEqual(project(byKey.revenue.after.rows, [...joinedColumns, 'line_revenue']), project(expected, [...joinedColumns, 'line_revenue']));
      const nullDiscount = byKey.revenue.after.rows.find(row => row.order_id === 101 && row.line_no === 1);
      assert.equal(nullDiscount.discount_pct, null);
      assert.equal(nullDiscount.line_revenue, 100);
      assert.equal(byKey.revenue.after.rows.find(row => row.order_id === 134).line_revenue, 120);
      const rawNull = (await query('SELECT quantity * unit_price * (1 - discount_pct / 100.0) AS unprotected FROM order_items WHERE order_id = 101 AND line_no = 1'))[0];
      assert.equal(rawNull.unprotected, null);
    });

    await t.test('GROUP BY collapses seven lines to five orders and OVER retains those orders', async () => {
      const expected = await query(`${groupedCte}
        SELECT customer_id, order_id, order_date::text AS order_date, revenue,
               SUM(revenue) OVER (PARTITION BY customer_id ORDER BY order_date, order_id
                 ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
          FROM order_totals ORDER BY order_date, order_id`);
      assert.deepEqual(project(byKey.group.after.rows, groupedColumns), project(expected, groupedColumns));
      assert.deepEqual(project(byKey.window.before.rows, groupedColumns), project(expected, groupedColumns));
      assert.deepEqual(project(byKey.window.after.rows, resultColumns), project(expected, resultColumns));
      assert.deepEqual(expected.map(row => Number(row.order_id)), [101, 102, 103, 104, 134]);
      assert.deepEqual(expected.map(row => Number(row.revenue)), [300, 200, 200, 400, 120]);
      assert.deepEqual(expected.map(row => Number(row.running_total)), [300, 500, 700, 1100, 1220]);
      assert.equal(Number(expected[0].revenue), 100 + 200);
    });

    await t.test('date-only default includes both peers, while unique ordering matches explicit ROWS', async () => {
      const result = await query(`${groupedCte}
        SELECT order_id,
               SUM(revenue) OVER (PARTITION BY customer_id ORDER BY order_date) AS default_date,
               SUM(revenue) OVER (PARTITION BY customer_id ORDER BY order_date, order_id
                 ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS explicit_rows,
               SUM(revenue) OVER (PARTITION BY customer_id ORDER BY order_date, order_id) AS default_unique
          FROM order_totals ORDER BY order_date, order_id`);
      assert.deepEqual(result.map(row => Number(row.default_date)), [300, 700, 700, 1100, 1220]);
      assert.deepEqual(result.map(row => Number(row.explicit_rows)), [300, 500, 700, 1100, 1220]);
      assert.deepEqual(result.map(row => Number(row.default_unique)), result.map(row => Number(row.explicit_rows)));
    });

    await t.test('exported and downloadable worked examples execute to the displayed final table', async () => {
      const download = await fs.readFile(path.join(root, 'docs/gitbook/assets/lab01-journey/worked-example.sql'), 'utf8');
      for (const [name, sql] of [['model SQL', workedExampleSql], ['download', download]]) {
        assert.ok(typeof sql === 'string' && sql.trim(), `${name} exists`);
        const results = await db.exec(sql);
        assert.equal(results.length, 1, `${name} is one runnable worked example`);
        assert.deepEqual(project(results[0].rows, resultColumns), project(byKey.window.after.rows, resultColumns), name);
      }
    });

    await t.test('the three focused animation results match real PostgreSQL on the stated subset', async () => {
      const lessons = Object.fromEntries(buildAnimationLesson().map(lesson => [lesson.key, lesson]));
      const matched = await query(`SELECT o.order_id, i.line_no, i.product_name,
        i.quantity * i.unit_price * (1 - COALESCE(i.discount_pct, 0) / 100.0) AS line_revenue
        FROM orders AS o JOIN order_items AS i ON o.order_id = i.order_id
        WHERE o.order_id IN (101, 102, 103) ORDER BY o.order_id, i.line_no`);
      const grouped = await query(`SELECT o.order_id,
        SUM(i.quantity * i.unit_price * (1 - COALESCE(i.discount_pct, 0) / 100.0)) AS revenue
        FROM orders AS o JOIN order_items AS i ON o.order_id = i.order_id
        WHERE o.order_id IN (101, 102, 103) GROUP BY o.order_id ORDER BY o.order_id`);
      const running = await query(`${groupedCte}
        SELECT order_id, revenue,
          SUM(revenue) OVER (PARTITION BY customer_id ORDER BY order_date, order_id
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
        FROM order_totals WHERE order_id IN (101, 102, 103) ORDER BY order_date, order_id`);
      assert.deepEqual(project(lessons.join.steps.at(-1).outputs, ['order_id', 'line_no', 'product_name', 'line_revenue']), project(matched, ['order_id', 'line_no', 'product_name', 'line_revenue']));
      for (const method of ['two_pass', 'one_pass']) {
        assert.deepEqual(project(buildGroupMemoryLesson(method).steps.at(-1).outputs, ['order_id', 'revenue']), project(grouped, ['order_id', 'revenue']), `${method}: SQL-equivalent final output`);
      }
      assert.deepEqual(project(lessons.window.steps.at(-1).outputs, ['order_id', 'revenue', 'running_total']), project(running, ['order_id', 'revenue', 'running_total']));
    });
  } finally {
    await db.close();
  }
});
