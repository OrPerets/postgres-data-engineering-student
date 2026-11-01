/* A deterministic teaching model of the lab's synthetic customer-1 records.
   These snapshots explain logical row transformations, not a PostgreSQL plan. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root && root.document) api.mount(root.document);
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  function freeze(value) {
    Object.values(value).forEach(item => { if (item && typeof item === 'object') freeze(item); });
    return Object.freeze(value);
  }
  const sourceData = freeze({
    customer: { customer_id: 1, full_name: 'Dana Cohen', city: 'Haifa' },
    orders: [
      { order_id: 101, customer_id: 1, order_date: '2026-01-05', status: 'completed' },
      { order_id: 102, customer_id: 1, order_date: '2026-02-05', status: 'completed' },
      { order_id: 103, customer_id: 1, order_date: '2026-02-05', status: 'completed' },
      { order_id: 104, customer_id: 1, order_date: '2026-03-01', status: 'completed' },
      { order_id: 105, customer_id: 1, order_date: '2026-03-08', status: 'cancelled' },
      { order_id: 134, customer_id: 1, order_date: '2026-03-27', status: 'completed' }
    ],
    items: [
      { order_id: 101, line_no: 1, product_name: 'Novel', category: 'books', quantity: 1, unit_price: 100, discount_pct: null },
      { order_id: 101, line_no: 2, product_name: 'Mouse', category: 'electronics', quantity: 1, unit_price: 200, discount_pct: 0 },
      { order_id: 102, line_no: 1, product_name: 'Novel', category: 'books', quantity: 1, unit_price: 150, discount_pct: 0 },
      { order_id: 102, line_no: 2, product_name: 'Lamp', category: 'home', quantity: 1, unit_price: 50, discount_pct: 0 },
      { order_id: 103, line_no: 1, product_name: 'Mouse', category: 'electronics', quantity: 2, unit_price: 100, discount_pct: 0 },
      { order_id: 104, line_no: 1, product_name: 'Desk', category: 'home', quantity: 1, unit_price: 400, discount_pct: 0 },
      { order_id: 105, line_no: 1, product_name: 'Novel', category: 'books', quantity: 1, unit_price: 300, discount_pct: 0 },
      { order_id: 134, line_no: 1, product_name: 'Mouse', category: 'electronics', quantity: 1, unit_price: 150, discount_pct: 20 }
    ]
  });

  const workedExampleSql = `-- Synthetic Lab 01 data: follow customer 1 from orders to running revenue.
-- Read-only example. Logical teaching stages do not describe a physical plan.
WITH customer_orders AS (
    SELECT c.customer_id, c.full_name, c.city,
           o.order_id, o.order_date, o.status
    FROM customers AS c
    JOIN orders AS o ON o.customer_id = c.customer_id
    WHERE c.customer_id = 1
), joined_lines AS (
    SELECT o.*, i.line_no, i.product_name, i.category,
           i.quantity, i.unit_price, i.discount_pct
    FROM customer_orders AS o
    LEFT JOIN order_items AS i ON i.order_id = o.order_id
), completed_lines AS (
    SELECT * FROM joined_lines WHERE status = 'completed'
), line_revenue AS (
    SELECT *, COALESCE(quantity * unit_price *
        (1 - COALESCE(discount_pct, 0) / 100.0), 0) AS line_revenue
    FROM completed_lines
), order_revenue AS (
    SELECT customer_id, order_id, order_date, SUM(line_revenue) AS revenue
    FROM line_revenue
    GROUP BY customer_id, order_id, order_date
)
SELECT customer_id, order_id, order_date, revenue,
       SUM(revenue) OVER (
           PARTITION BY customer_id
           ORDER BY order_date, order_id
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS running_total
FROM order_revenue
ORDER BY customer_id, order_date, order_id;
`;

  const column = (key, label) => ({ key, label });
  const orderColumns = [column('order_id', 'Order'), column('order_date', 'Date'), column('status', 'Status')];
  const itemColumns = [column('order_id', 'Order'), column('line_no', 'Line'), column('product_name', 'Product'), column('quantity', 'Qty'), column('unit_price', 'Price'), column('discount_pct', 'Discount %')];
  const joinedColumns = [column('order_id', 'Order'), column('line_no', 'Line'), column('product_name', 'Product'), column('status', 'Status')];
  const revenueColumns = [column('order_id', 'Order'), column('line_no', 'Line'), column('quantity', 'Qty'), column('unit_price', 'Price'), column('discount_pct', 'Discount %'), column('line_revenue', 'Revenue')];
  const groupedColumns = [column('order_id', 'Order'), column('order_date', 'Date'), column('revenue', 'Revenue')];
  const table = (label, grain, columns, rows) => ({ label, grain, columns, rows });
  const prediction = (prompt, options, correctId, explanation) => ({ prompt, options: options.map(([id, label]) => ({ id, label })), correctId, explanation });

  function buildJourney() {
    const orders = sourceData.orders.map(row => ({ ...row }));
    const items = sourceData.items.map(row => ({ ...row }));
    const joined = orders.flatMap(order => items.filter(item => item.order_id === order.order_id).map(item => ({ ...sourceData.customer, ...order, ...item })));
    const completed = joined.filter(row => row.status === 'completed');
    const revenues = completed.map(row => ({ ...row, line_revenue: row.quantity * row.unit_price * (1 - (row.discount_pct ?? 0) / 100) }));
    const grouped = [];
    revenues.forEach(row => {
      let order = grouped.find(item => item.order_id === row.order_id);
      if (!order) { order = { customer_id: row.customer_id, order_id: row.order_id, order_date: row.order_date, revenue: 0 }; grouped.push(order); }
      order.revenue += row.line_revenue;
    });
    grouped.sort((a, b) => a.order_date.localeCompare(b.order_date) || a.order_id - b.order_id);
    let total = 0;
    const windowed = grouped.map(row => ({ ...row, running_total: total += row.revenue }));
    const sourceOrders = table('Orders', 'one row per order', orderColumns, orders);
    const sourceItems = table('Item lines · separate source table', 'one row per item line', itemColumns, items);
    const joinedTable = table('Joined rows', 'one row per matching item line', joinedColumns, joined);
    const completedTable = table('Completed lines', 'one row per completed-order item line', joinedColumns, completed);
    const revenueTable = table('Line revenue', 'one row per completed-order item line', revenueColumns, revenues);
    const groupedTable = table('Order revenue', 'one row per completed order', groupedColumns, grouped);
    const windowTable = table('Running revenue', 'one row per completed order', [column('order_id', 'Order'), column('revenue', 'Revenue'), column('running_total', 'Running total')], windowed);
    const traces = (fn) => Object.fromEntries(orders.map(order => [order.order_id, fn(order)]));
    const itemCount = order => items.filter(item => item.order_id === order.order_id).length;
    const removed = 'Order 105 was cancelled. Its line is removed by the completed-order filter and contributes no revenue to this calculation.';
    return [
      {
        key: 'source', title: 'Sources', kicker: 'Start with the row identity',
        explanation: 'Orders and item lines are separate source tables. The order ID connects them; an item line is identified by both order ID and line number.',
        sql: 'SELECT * FROM orders WHERE customer_id = 1;\n-- Inspect order_items for these order IDs separately.',
        before: sourceOrders, after: sourceItems,
        change: { kind: 'source', summary: 'Two source tables, two different row grains. The arrow here means inspect the related table, not transform orders into items.' },
        trace: traces(order => `Order ${order.order_id}: one order row links to ${itemCount(order)} item ${itemCount(order) === 1 ? 'line' : 'lines'}. The customer is still Dana Cohen.`),
        prediction: prediction('An item-line row represents…', [['order', 'a whole order'], ['line', 'one product line within an order'], ['customer', 'one customer']], 'line', 'An order can contain several product lines. The composite key (order_id, line_no) identifies each line.')
      },
      {
        key: 'join', title: 'JOIN', kicker: 'Watch an order expand',
        explanation: 'Match orders to their item lines. Repeated order IDs show multiple products, not extra orders. The customer join adds the same customer details to each row.',
        sql: 'FROM customers AS c\nJOIN orders AS o ON o.customer_id = c.customer_id\nLEFT JOIN order_items AS i ON i.order_id = o.order_id\n-- Focus on customer 1.',
        before: sourceOrders, after: joinedTable,
        change: { kind: 'expand', summary: '6 orders → 8 joined rows. Orders 101 and 102 each appear twice because each has two item lines.' },
        trace: traces(order => `Order ${order.order_id} expands from 1 order row to ${itemCount(order)} joined ${itemCount(order) === 1 ? 'row' : 'rows'}. Count order IDs distinctly when the question asks for orders.`),
        prediction: prediction('Customer 1 has six orders and eight matching item lines. How many rows does this join produce?', [['six', '6 rows'], ['eight', '8 rows'], ['fortyeight', '48 rows']], 'eight', 'The join returns one row for each matching item line: 2 + 2 + 1 + 1 + 1 + 1 = 8. Six distinct order IDs remain.')
      },
      {
        key: 'filter', title: 'Completed filter', kicker: 'Keep the intended business population',
        explanation: 'Revenue in this activity counts completed orders. Apply that rule to the joined rows before calculating revenue.',
        sql: "WHERE status = 'completed'",
        before: joinedTable, after: completedTable,
        change: { kind: 'filter', summary: '8 joined rows → 7 completed-order lines. The line for cancelled order 105 leaves the result.' },
        trace: traces(order => order.status === 'cancelled' ? removed : `Order ${order.order_id} is completed: all ${itemCount(order)} of its item ${itemCount(order) === 1 ? 'line stays' : 'lines stay'} in the result.`),
        prediction: prediction('What happens to the line for cancelled order 105?', [['keep', 'Keep it because it has an item'], ['remove', 'Remove it because the order is cancelled'], ['zero', 'Keep it and replace its status with NULL']], 'remove', 'The predicate is FALSE for order 105, so its row is excluded. A product line does not override the completed-order revenue rule.')
      },
      {
        key: 'revenue', title: 'Line revenue', kicker: 'Calculate without changing the grain',
        explanation: 'Multiply quantity by price after discount. Only this lab’s discount rule treats a NULL discount as zero; NULL does not mean zero in general.',
        sql: 'COALESCE(quantity * unit_price *\n  (1 - COALESCE(discount_pct, 0) / 100.0), 0) AS line_revenue',
        before: table('Completed item values', completedTable.grain, itemColumns, completed), after: revenueTable,
        change: { kind: 'calculate', summary: '7 rows → 7 rows. A calculated column changes values, not how many item lines exist.' },
        trace: traces(order => order.status === 'cancelled' ? removed : revenues.filter(row => row.order_id === order.order_id).map(row => `Line ${row.line_no}: ${row.quantity} × ${row.unit_price} × (1 − ${row.discount_pct === null ? '0 [NULL discount]' : row.discount_pct}/100) = ${row.line_revenue}`).join('; ') + '.'),
        prediction: prediction('Order 101’s Novel has quantity 1, price 100 and NULL discount. What is its line revenue under the lab rule?', [['null', 'NULL'], ['zero', '0'], ['hundred', '100']], 'hundred', 'COALESCE(discount_pct, 0) uses zero discount, so 1 × 100 × (1 − 0/100) = 100. Order 134 separately illustrates a 20% discount: 150 × 0.8 = 120.')
      },
      {
        key: 'group', title: 'GROUP BY order', kicker: 'Bring the lines back together',
        explanation: 'Collect each order’s item lines and sum their revenue. The grouped result now has the grain needed by an order-level window.',
        sql: 'SELECT customer_id, order_id, order_date, SUM(line_revenue) AS revenue\nFROM line_revenue\nGROUP BY customer_id, order_id, order_date',
        before: revenueTable, after: groupedTable,
        change: { kind: 'collapse', summary: '7 completed item lines → 5 completed orders. Order revenues are 300, 200, 200, 400 and 120 in date-and-ID order.' },
        trace: traces(order => order.status === 'cancelled' ? removed : `${revenues.filter(row => row.order_id === order.order_id).map(row => row.line_revenue).join(' + ')} = ${grouped.find(row => row.order_id === order.order_id).revenue}. ${itemCount(order)} item ${itemCount(order) === 1 ? 'line becomes' : 'lines become'} one row for order ${order.order_id}.`),
        prediction: prediction('After grouping the seven completed item lines by order, how many rows remain?', [['seven', '7 item-line rows'], ['five', '5 completed-order rows'], ['one', '1 customer row']], 'five', 'There are five distinct completed order IDs: 101, 102, 103, 104 and 134. GROUP BY order merges only lines from the same order; it does not merge all of the customer’s orders.')
      },
      {
        key: 'window', title: 'Running total', kicker: 'Add history while keeping each order',
        explanation: 'Order by date and the unique order ID. The explicit ROWS frame adds revenues from the first order through the current one, keeping one output row per completed order.',
        sql: 'SUM(revenue) OVER (\n  PARTITION BY customer_id ORDER BY order_date, order_id\n  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\n) AS running_total',
        before: groupedTable, after: windowTable,
        change: { kind: 'preserve', summary: '5 order rows → 5 order rows. The running totals are 300, 500, 700, 1,100 and 1,220. Window calculations preserve the order grain.' },
        trace: traces(order => {
          if (order.status === 'cancelled') return removed;
          const index = windowed.findIndex(row => row.order_id === order.order_id);
          return `Order ${order.order_id}: ${windowed.slice(0, index + 1).map(row => row.revenue).join(' + ')} = ${windowed[index].running_total}. The frame includes orders ${windowed.slice(0, index + 1).map(row => row.order_id).join(', ')}.`;
        }),
        prediction: prediction('The grouped input has five orders. How many rows does SUM(revenue) OVER (…) return?', [['one', '1 customer row'], ['five', '5 order rows with a new running-total column'], ['seven', '7 item-line rows']], 'five', 'A window adds a value beside each input order. It does not collapse the five orders. Orders 102 and 103 share a date; ordering by date and ID gives them a stable order.')
      }
    ];
  }

  // Resource counters describe the operations and retained state in these
  // teaching algorithms. They are not PostgreSQL timings or memory bytes.
  function buildGroupMemoryLesson(method = 'two_pass') {
    if (!['two_pass', 'one_pass'].includes(method)) throw new RangeError(`Unknown GROUP BY model: ${method}`);
    const orderIds = [101, 102, 103];
    const lines = buildJourney().find(stage => stage.key === 'revenue').after.rows
      .filter(row => orderIds.includes(row.order_id));
    const groups = [], outputs = [], steps = [];
    const stats = { rowsRead: 0, lookups: 0, groupsCreated: 0, storedMembers: 0, updates: 0 };
    function save(phase, active, status, equation = '') {
      steps.push({ index: steps.length, phase, active: active ? { ...active } : null, status, equation,
        groups: groups.map(group => ({ ...group, members: group.members.map(member => ({ ...member })) })),
        outputs: outputs.map(row => ({ ...row })), stats: { ...stats } });
    }
    const identity = (row, index) => ({ line_id: `${row.order_id}-${row.line_no}`, order_id: row.order_id,
      line_no: row.line_no, line_revenue: row.line_revenue, output_index: index });
    save('ready', null, method === 'two_pass'
      ? 'Memory and output start empty. First discover the order keys; then assign the lines.'
      : 'Memory and output start empty. Read each line once and keep a sum for its order.');
    function locate(row, index, phase) {
      stats.rowsRead++; stats.lookups++;
      let group = groups.find(item => item.order_id === row.order_id);
      const newGroup = !group;
      if (newGroup) { group = { order_id: row.order_id, revenue: 0, members: [] }; groups.push(group); stats.groupsCreated++; }
      const active = { ...identity(row, index), kind: phase, newGroup, group_index: groups.indexOf(group) };
      save(phase, active, newGroup
        ? `Read line ${active.line_id}: create a memory entry for order ${row.order_id}. No result row yet.`
        : `Read line ${active.line_id}: order ${row.order_id} already has a memory entry. Reuse it.`,
      newGroup ? `Key ${row.order_id} → create group` : `Key ${row.order_id} → existing group`);
    }
    function assign(row, index) {
      if (method === 'two_pass') { stats.rowsRead++; stats.lookups++; }
      const group = groups.find(item => item.order_id === row.order_id);
      const previousTotal = group.revenue;
      group.revenue += row.line_revenue; stats.updates++;
      if (method === 'two_pass') { group.members.push({ line_id: `${row.order_id}-${row.line_no}`, line_revenue: row.line_revenue }); stats.storedMembers++; }
      save('assign', { ...identity(row, index), kind: 'assign', group_index: groups.indexOf(group), previousTotal, nextTotal: group.revenue },
        method === 'two_pass'
          ? `Assign line ${row.order_id}-${row.line_no} to its group. Retain its member reference and update the sum to ${group.revenue}.`
          : `Add ${row.line_revenue} to order ${row.order_id}: keep sum ${group.revenue}, without retaining this line as a member.`,
        `Order ${row.order_id}: ${previousTotal} + ${row.line_revenue} = ${group.revenue}`);
    }
    if (method === 'two_pass') {
      lines.forEach((row, index) => locate(row, index, 'discover'));
      lines.forEach(assign);
    } else lines.forEach((row, index) => { locate(row, index, 'lookup'); assign(row, index); });
    groups.forEach((group, index) => {
      outputs.push({ order_id: group.order_id, revenue: group.revenue });
      save('emit', { kind: 'emit', order_id: group.order_id, output_index: index, group_index: index, revenue: group.revenue },
        `All lines are processed. Emit order ${group.order_id} with revenue ${group.revenue} from memory to the output.`,
        `Order ${group.order_id} → output ${group.revenue}`);
    });
    return { key: 'group', title: 'GROUP BY', method,
      subset: { orderIds: [...orderIds], lineIds: lines.map(row => `${row.order_id}-${row.line_no}`) }, steps };
  }

  function buildAnimationLesson(options = {}) {
    const all = buildJourney();
    const orderIds = [101, 102, 103];
    const lines = all.find(stage => stage.key === 'revenue').after.rows
      .filter(row => orderIds.includes(row.order_id))
      .map(row => ({ order_id: row.order_id, line_no: row.line_no, product_name: row.product_name, line_revenue: row.line_revenue }));
    const subset = () => ({ orderIds: [...orderIds], lineIds: lines.map(row => `${row.order_id}-${row.line_no}`) });
    const activeLine = (row, index) => ({ order_id: row.order_id, line_no: row.line_no, line_id: `${row.order_id}-${row.line_no}`, output_index: index });
    const initial = status => ({ index: 0, status, active: null, outputs: [], equation: '' });
    const join = [initial('Three orders meet five item lines. Follow one matching pair into the result.')];
    lines.forEach((row, index) => {
      join.push({ index: index + 1, status: `Order ${row.order_id} matches line ${row.line_no}: ${row.product_name}. ${index + 1} joined ${index === 0 ? 'row has' : 'rows have'} arrived.`, active: activeLine(row, index), outputs: lines.slice(0, index + 1).map(line => ({ ...line })), equation: `Order ${row.order_id} + line ${row.line_no} → joined row ${index + 1}` });

    });
    const orders = all.find(stage => stage.key === 'window').after.rows.filter(row => orderIds.includes(row.order_id));
    const windowSteps = [initial('Keep all three orders. Grow the frame to add their revenues one at a time.')];
    orders.forEach((row, index) => {
      const frame = orders.slice(0, index + 1);
      windowSteps.push({ index: index + 1, status: `The frame reaches order ${row.order_id}: ${frame.map(order => order.revenue).join(' + ')} = ${row.running_total}. All three order rows stay.`, active: { order_id: row.order_id, position: index, frameIds: frame.map(order => order.order_id) }, outputs: frame.map(order => ({ order_id: order.order_id, revenue: order.revenue, running_total: order.running_total })), equation: `${frame.map(order => order.revenue).join(' + ')} = ${row.running_total}` });
    });
    return [
      { key: 'join', title: 'JOIN', subset: subset(), steps: join },
      buildGroupMemoryLesson(options.groupMethod ?? 'two_pass'),
      { key: 'window', title: 'Window', subset: subset(), steps: windowSteps }
    ];
  }

  function mount(doc) {
    function init() {
      const host = doc.getElementById('lab01-order-journey');
      if (!host || host.dataset.ready === 'true') return;
      const lessons = buildAnimationLesson();
      let groupMethod = 'two_pass';
      const lines = lessons[0].steps[5].outputs;
      const orderRows = [
        { order_id: 101, date: 'Jan 5', revenue: 300 },
        { order_id: 102, date: 'Feb 5', revenue: 200 },
        { order_id: 103, date: 'Feb 5', revenue: 200 }
      ];
      const SVG = 'http://www.w3.org/2000/svg';
      const reduced = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
      let concept = 0, step = 0, progress = 0, inFlight = false, running = false, auto = false;
      let raf = null, delay = null, lastTime = null, epoch = 0, sceneWidth = 0, scene, svg, motion = null;
      host.classList.add('order-journey');
      host.setAttribute('role', 'region'); host.setAttribute('aria-label', 'Watch SQL transform rows');
      host.innerHTML = `
        <div class="order-journey__tabs" role="tablist" aria-label="SQL animation"></div>
        <div class="order-journey__group-tools" data-group-tools hidden><label for="lab01-group-method">GROUP BY model</label><select id="lab01-group-method" data-group-method><option value="two_pass">Create groups, then assign</option><option value="one_pass">One-pass SUM</option></select><div class="order-journey__memory-stats" aria-label="Illustrated work and retained state"><span>Reads <b data-group-stat="rowsRead">0</b></span><span>Groups <b data-group-stat="groupsCreated">0</b></span><span>Member refs <b data-group-stat="storedMembers">0</b></span></div></div>
        <div class="order-journey__scene" role="tabpanel" id="lab01-animation-scene"></div>
        <p class="order-journey__caption" id="lab01-animation-caption" aria-live="polite" aria-atomic="true"></p>
        <div class="order-journey__controls"><div role="group" aria-label="Animation controls"><button type="button" data-animation-action="replay" title="Return to the beginning">↺ Replay</button><button type="button" data-animation-action="play" aria-pressed="false">▶ Play</button><button type="button" data-animation-action="next">Next →</button></div><span data-animation-progress></span></div>
        <p class="order-journey__subset">Actual lab subset: orders 101, 102 and 103 · 5 item lines. This browser animation does not execute SQL.</p>
        <details class="order-journey__details"><summary>Details &amp; SQL</summary><p data-animation-detail></p><div class="order-journey__accessible-data"></div><pre><code data-animation-sql></code></pre></details>`;
      const find = selector => host.querySelector(selector);
      scene = find('.order-journey__scene');
      const tabs = find('.order-journey__tabs');
      const play = find('[data-animation-action="play"]');
      const next = find('[data-animation-action="next"]');
      const replay = find('[data-animation-action="replay"]');
      const caption = find('.order-journey__caption');
      lessons.forEach((lesson, i) => {
        const button = doc.createElement('button'); button.type = 'button'; button.setAttribute('role', 'tab');
        button.id = `lab01-animation-tab-${lesson.key}`; button.dataset.animationConcept = lesson.key;
        button.setAttribute('aria-controls', 'lab01-animation-scene'); button.textContent = lesson.title;
        button.addEventListener('click', () => changeConcept(i));
        button.addEventListener('keydown', event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const target = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (i + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
          changeConcept(target); tabs.children[target].focus();
        });
        tabs.append(button);
      });
      function element(tag, attrs, text) {
        const node = doc.createElementNS(SVG, tag);
        Object.entries(attrs || {}).forEach(([key, value]) => node.setAttribute(key, String(value)));
        if (text !== undefined) node.textContent = String(text);
        return node;
      }
      function add(tag, attrs, text, parent = svg) { const node = element(tag, attrs, text); parent.append(node); return node; }
      function text(x, y, value, cls = '', parent = svg, anchor = 'start') { return add('text', { x, y, class: cls, 'text-anchor': anchor }, value, parent); }
      function card(x, y, w, h, top, bottom, cls = '', parent = svg) {
        const group = add('g', { class: `journey-card ${cls}` }, undefined, parent);
        add('rect', { x, y, width: w, height: h, rx: 7 }, undefined, group);
        text(x + 12, y + (h <= 44 ? 16 : 20), top, 'journey-card__title', group);
        if (bottom) text(x + 12, y + h - 9, bottom, 'journey-card__sub', group);
        return group;
      }
      function bezier(a, b, c, d, t) {
        const u = 1 - t;
        return { x: u*u*u*a.x + 3*u*u*t*b.x + 3*u*t*t*c.x + t*t*t*d.x, y: u*u*u*a.y + 3*u*u*t*b.y + 3*u*t*t*c.y + t*t*t*d.y };
      }
      function curve(a, d, bend = .45) {
        const dx = d.x - a.x;
        return { a, b: { x: a.x + dx*bend, y: a.y }, c: { x: d.x - dx*bend, y: d.y }, d };
      }
      function path(curveData) { const { a,b,c,d } = curveData; return `M ${a.x} ${a.y} C ${b.x} ${b.y} ${c.x} ${c.y} ${d.x} ${d.y}`; }
      function token(label, width = 58) {
        const group = add('g', { class: 'journey-token', 'data-animation-token': '', transform: 'translate(0 0)' });
        add('rect', { x: -width/2, y: -15, width, height: 30, rx: 15 }, undefined, group);
        text(0, 5, label, '', group, 'middle'); return group;
      }
      const currentLesson = () => lessons[concept];
      const snapshot = () => currentLesson().steps[step];
      function layout() {
        const w = Math.max(280, Math.round(scene.getBoundingClientRect().width || 760));
        return { w, mobile: w < 600, h: w < 600 ? (currentLesson().key === 'group' ? 520 : 480) : 424 };
      }
      function renderScene() {
        const geometry = layout(), { w, mobile, h } = geometry;
        sceneWidth = w; scene.replaceChildren();
        svg = element('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h, role: 'img', 'aria-labelledby': 'lab01-animation-caption', 'data-animation-svg': currentLesson().key });
        scene.append(svg); motion = null;
        const active = inFlight ? currentLesson().steps[step + 1].active : null;
        const key = currentLesson().key;
        if (key === 'join') drawJoin(geometry, active);
        else if (key === 'group') drawGroup(geometry, active);
        else drawWindow(geometry, active);
        if (inFlight) drawMotion(progress);
      }
      function drawJoin({ w, mobile }, active) {
        const orders = orderRows.map((row, i) => ({ ...row, x: mobile ? 12 : 24, y: mobile ? 50 + i*67 : 78 + i*106, w: mobile ? w*.36 - 12 : w*.22, h: mobile ? 46 : 54 }));
        const items = lines.map((row, i) => ({ ...row, x: mobile ? w*.53 : w*.37, y: mobile ? 40+i*49 : 58+i*62, w: mobile ? w*.47-12 : w*.25, h: mobile ? 40 : 48 }));
        const outputs = lines.map((row, i) => ({ ...row, x: mobile ? (i%2 ? w/2+6 : 12) : w*.73, y: mobile ? 324+Math.floor(i/2)*49 : 58+i*62, w: mobile ? w/2-18 : w*.27-24, h: mobile ? 40 : 48 }));
        const routes = items.map(item => {
          const order = orders.find(row => row.order_id === item.order_id);
          const output = outputs[items.indexOf(item)];
          const pair = curve({ x: order.x+order.w, y: order.y+order.h/2 }, { x: item.x, y: item.y+item.h/2 });
          const delivery = mobile
            ? { a: { x: item.x, y: item.y+item.h/2 }, b: { x: w*.47, y: item.y+item.h/2 }, c: { x: w*.47, y: 299 }, d: { x: output.x+output.w/2, y: output.y } }
            : curve({ x: item.x+item.w, y: item.y+item.h/2 }, { x: output.x, y: output.y+output.h/2 });
          add('path', { d: path(pair), class: 'journey-ribbon' });
          if (!mobile) add('path', { d: path(delivery), class: 'journey-ribbon journey-ribbon--result' });
          return { pair, delivery };
        });
        text(orders[0].x, mobile ? 24 : 31, 'Orders · 3', 'journey-heading');
        text(items[0].x, mobile ? 24 : 31, 'Item lines · 5', 'journey-heading');
        text(outputs[0].x, mobile ? 310 : 31, 'Joined rows', 'journey-heading');
        orders.forEach(order => card(order.x, order.y, order.w, order.h, `Order ${order.order_id}`, order.date, active && active.order_id === order.order_id ? 'is-active' : ''));
        items.forEach((item, i) => card(item.x, item.y, item.w, item.h, `${item.order_id} · line ${item.line_no}`, item.product_name, active && active.output_index === i ? 'is-active' : ''));
        outputs.forEach((output, i) => {
          if (i < step) card(output.x, output.y, output.w, output.h, `${output.order_id} · line ${output.line_no}`, output.product_name, 'is-result');
          else {
            add('rect', { x: output.x, y: output.y, width: output.w, height: output.h, rx: 7, class: 'journey-slot' });
            text(output.x+output.w/2, output.y+output.h/2+4, `Result ${i+1}`, 'journey-slot-label', svg, 'middle');
          }
        });
        if (active) {
          const route = routes[active.output_index];
          const pair = add('path', { d: path(route.pair), class: 'journey-ribbon journey-ribbon--active', 'data-animation-ribbon': '' });
          const delivery = add('path', { d: path(route.delivery), class: 'journey-ribbon journey-ribbon--active' });
          motion = { type: 'join', ...route, pairNode: pair, deliveryNode: delivery, token: token(`${active.order_id}/${active.line_no}`, 62) };
        }
      }
      function drawGroup({ w, mobile, h }, active) {
        const state = snapshot();
        const sourceW = mobile ? w*.38-12 : w*.24-22;
        const sourceX = mobile ? 12 : 22, memoryX = mobile ? w*.47 : w*.34;
        const memoryW = mobile ? w*.53-12 : w*.35;
        const outputX = mobile ? 12 : w*.78, outputW = mobile ? (w-44)/3 : w*.22-18;
        const sources = lines.map((row, i) => ({ ...row, x: sourceX, y: 78+i*(mobile ? 48 : 53), w: sourceW, h: 41 }));
        const groupGeometry = index => ({ x: memoryX, y: 82+index*(mobile ? 88 : 91), w: memoryW, h: mobile ? 76 : 78 });
        const outputGeometry = index => ({ x: mobile ? 12+index*(outputW+10) : outputX, y: mobile ? 413 : 98+index*85, w: outputW, h: mobile ? 58 : 62 });
        const phaseNames = { ready: 'Ready · memory is empty', discover: '1 · Discover groups', lookup: 'Read key · find or create', assign: groupMethod === 'two_pass' ? '2 · Assign members' : 'Update the sum', emit: groupMethod === 'two_pass' ? '3 · Emit output' : 'Emit output' };
        const nextState = active ? currentLesson().steps[step+1] : state;
        text(12, 23, phaseNames[nextState.phase], 'journey-phase');
        text(sourceX, 55, 'Input · 5 lines', 'journey-heading');
        text(memoryX, 55, 'Working memory', 'journey-heading');
        text(mobile ? 12 : outputX, mobile ? 394 : 55, 'Output', 'journey-heading');
        add('rect', { x: memoryX-5, y: 68, width: memoryW+10, height: mobile ? 280 : 299, rx: 9, class: 'journey-memory-zone' });
        if (!state.groups.length) {
          text(memoryX+memoryW/2, 185, 'No groups yet', 'journey-empty-note', svg, 'middle');
          text(memoryX+memoryW/2, 206, 'Created on key arrival', 'journey-empty-note', svg, 'middle');
        }
        if (!state.outputs.length) {
          const x = mobile ? 12 : outputX, y = mobile ? 409 : 74;
          add('rect', { x, y, width: mobile ? w-24 : outputW, height: mobile ? 66 : 286, rx: 8, class: 'journey-output-zone' });
          text(mobile ? w/2 : outputX+outputW/2, mobile ? 434 : 190, 'No output yet', 'journey-empty-note', svg, 'middle');
          if (!mobile) text(outputX+outputW/2, 211, 'Emit after all lines', 'journey-empty-note', svg, 'middle');
        }
        sources.forEach((source, index) => {
          const id = `${source.order_id}-${source.line_no}`;
          const assigned = state.stats.updates > index;
          const cls = active && active.line_id === id ? 'is-active' : assigned ? 'is-read' : '';
          const node = card(source.x, source.y, source.w, source.h, id, String(source.line_revenue), cls);
          node.dataset.groupInput = id;
        });
        const groupNodes = [];
        state.groups.forEach((group, index) => {
          const box = groupGeometry(index);
          const node = add('g', { class: `journey-memory-group${active && active.order_id === group.order_id ? ' is-active' : ''}`, 'data-memory-group': group.order_id });
          add('rect', { x: box.x, y: box.y, width: box.w, height: box.h, rx: 7 }, undefined, node);
          text(box.x+10, box.y+19, `Key ${group.order_id}`, 'journey-memory-key', node);
          const discoveredOnly = groupMethod === 'two_pass' && state.stats.updates === 0;
          text(box.x+10, box.y+41, discoveredOnly ? 'No members yet' : `SUM ${group.revenue}`, 'journey-memory-sum', node);
          const members = group.members.map(member => member.line_revenue).join(' · ');
          text(box.x+10, box.y+box.h-10, groupMethod === 'one_pass' ? 'Key + sum only' : members ? `Members: ${members}` : 'Members: —', 'journey-memory-members', node);
          groupNodes[index] = node;
        });
        state.outputs.forEach((row, index) => {
          const box = outputGeometry(index);
          const node = card(box.x, box.y, box.w, box.h, `Order ${row.order_id}`, `SUM ${row.revenue}`, 'is-result');
          node.dataset.groupOutput = row.order_id;
        });
        text(w/2, h-16, state.equation || 'Keys and sums live in memory before output.', 'journey-memory-equation', svg, 'middle');
        if (!active) return;
        const box = groupGeometry(active.group_index);
        let route, label, destinationNode = groupNodes[active.group_index] || null, destinationGeometry = box;
        if (active.kind === 'emit') {
          const output = outputGeometry(active.output_index);
          route = curve({ x: box.x+box.w, y: box.y+box.h/2 }, mobile
            ? { x: output.x+output.w/2, y: output.y } : { x: output.x, y: output.y+output.h/2 });
          label = String(active.revenue); destinationNode = null; destinationGeometry = output;
        } else {
          const source = sources[active.output_index];
          route = curve({ x: source.x+source.w, y: source.y+source.h/2 }, { x: box.x, y: box.y+box.h/2 });
          label = active.kind === 'assign' ? String(active.line_revenue) : String(active.order_id);
        }
        let allocation = null;
        if (active.newGroup) allocation = add('rect', { x: box.x, y: box.y, width: box.w, height: box.h, rx: 7, class: 'journey-allocation', opacity: 0, 'data-allocation-preview': '' });
        const ribbon = add('path', { d: path(route), class: 'journey-ribbon journey-ribbon--active', 'data-animation-ribbon': '' });
        motion = { type: 'group', route, ribbon, token: token(label, 52), destinationNode, destinationGeometry, allocation };
      }
      function drawWindow({ w, mobile, h }, active) {
        const left = mobile ? 12 : 34, top = mobile ? 88 : 81, rowHeight = mobile ? 90 : 77;
        const col1 = mobile ? 24 : 65, col2 = mobile ? w*.43 : w*.43, col3 = mobile ? w*.79 : w*.8;
        const frameWidth = mobile ? w*.64 : w*.61;
        text(col1, 35, 'Order', 'journey-heading'); text(col2, 35, 'Revenue', 'journey-heading'); text(col3, 35, 'Running total', 'journey-heading', svg, 'middle');
        text(left, 61, 'ROWS: first order → current order', 'journey-frame-note');
        orderRows.forEach((row, i) => add('rect', { x: left, y: top+i*rowHeight, width: w-left*2, height: rowHeight-5, rx: 7, class: 'journey-window-row' }));
        const frame = add('rect', { x: left, y: top, width: frameWidth, height: Math.max(0, step*rowHeight-5), rx: 7, class: 'journey-frame', 'data-animation-frame': '', opacity: step ? 1 : 0 });
        const outline = add('rect', { x: left, y: top+Math.max(0, step-1)*rowHeight, width: w-left*2, height: rowHeight-5, rx: 7, class: 'journey-current', 'data-animation-current': '', opacity: step ? 1 : 0 });
        orderRows.forEach((row, i) => {
          const y = top+i*rowHeight;
          text(col1, y+28, row.order_id, 'journey-order-id'); text(col1, y+49, row.date, 'journey-row-date');
          text(col2, y+37, row.revenue, 'journey-number');
          const result = snapshot().outputs.find(item => item.order_id === row.order_id);
          text(col3, y+37, result ? result.running_total : '—', `journey-number${result ? ' is-filled' : ' is-empty'}`, svg, 'middle');
        });
        const equation = text(w/2, mobile ? 408 : h-46, snapshot().equation || 'The frame starts empty.', 'journey-equation', svg, 'middle');
        text(w/2, mobile ? 440 : h-19, 'ORDER BY order_date, order_id', 'journey-order-note', svg, 'middle');
        if (active) motion = { type: 'window', frame, outline, equation, top, rowHeight };
      }
      function drawMotion(t) {
        if (!motion) return;
        const eased = t*t*(3-2*t);
        if (motion.type === 'join') {
          let point;
          if (t < .3) { const c = motion.pair; point = bezier(c.a,c.b,c.c,c.d,t/.3); }
          else { const c = motion.delivery; point = bezier(c.a,c.b,c.c,c.d,(t-.3)/.7); }
          motion.token.setAttribute('transform', `translate(${point.x} ${point.y})`);
          motion.pairNode.setAttribute('stroke-dashoffset', String(-t*120));
          motion.deliveryNode.setAttribute('stroke-dashoffset', String(-t*120));
        } else if (motion.type === 'group') {
          const c = motion.route, point = bezier(c.a,c.b,c.c,c.d,eased);
          motion.token.setAttribute('transform', `translate(${point.x} ${point.y})`);
          motion.ribbon.setAttribute('stroke-dashoffset', String(-t*120));
          const d = motion.destinationGeometry, scale = t > .76 ? 1 + Math.sin((t-.76)/.24*Math.PI)*.045 : 1;
          const cx = d.x+d.w/2, cy = d.y+d.h/2;
          if (motion.destinationNode) motion.destinationNode.setAttribute('transform', `translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`);
          if (motion.allocation) motion.allocation.setAttribute('opacity', String(Math.max(0, (t-.65)/.35)));
        } else {
          const { top, rowHeight } = motion;
          motion.frame.setAttribute('opacity', '1');
          motion.frame.setAttribute('height', String(Math.max(0, (step+eased)*rowHeight-5)));
          motion.outline.setAttribute('opacity', '1');
          motion.outline.setAttribute('y', String(top+(Math.max(0,step-1)+(step ? eased : 0))*rowHeight));
          const nextState = currentLesson().steps[step+1];
          motion.equation.textContent = nextState.equation.replace(/= .+$/, '= ?');
        }
      }
      function syncControls() {
        const end = step === currentLesson().steps.length-1 && !inFlight;
        play.textContent = running || auto ? 'Ⅱ Pause' : '▶ Play'; play.setAttribute('aria-pressed', String(running || auto));
        play.disabled = end; next.disabled = end;
        find('[data-animation-progress]').textContent = `${step} / ${currentLesson().steps.length-1} ${currentLesson().key === 'window' ? 'orders calculated' : currentLesson().key === 'group' ? 'actions' : 'lines arrived'}`;
        find('[data-group-tools]').hidden = currentLesson().key !== 'group';
        if (currentLesson().key === 'group') {
          host.dataset.groupMethod = groupMethod; host.dataset.groupPhase = snapshot().phase;
          host.querySelectorAll('[data-group-stat]').forEach(node => { node.textContent = snapshot().stats[node.dataset.groupStat]; });
        }
        host.dataset.animationState = running ? 'playing' : inFlight ? 'paused' : end ? 'complete' : 'ready';
        host.dataset.animationStep = String(step); host.dataset.animationConcept = currentLesson().key;
        tabs.querySelectorAll('button').forEach((button, i) => { button.setAttribute('aria-selected', String(i===concept)); button.tabIndex = i===concept ? 0 : -1; });
        scene.setAttribute('aria-labelledby', tabs.children[concept].id);
      }
      function refreshCaption() {
        if (inFlight) {
          const active = currentLesson().steps[step+1].active;
          caption.textContent = currentLesson().key === 'join' ? `Match order ${active.order_id} to line ${active.line_no}, then carry that pair into the result.` : currentLesson().key === 'group' ? active.kind === 'emit' ? `Carry order ${active.order_id}’s completed sum to the output.` : active.kind === 'assign' ? `Carry line ${active.line_id}’s ${active.line_revenue} into the memory entry for order ${active.order_id}.` : active.newGroup ? `Read key ${active.order_id}. Allocate a new group when the key arrives.` : `Read key ${active.order_id}. Find and reuse the group already in memory.` : `Grow the frame through order ${active.order_id}; its running total appears when the frame arrives.`;
        } else caption.textContent = snapshot().status;
      }
      function cancelTiming() {
        if (raf !== null) cancelAnimationFrame(raf); if (delay !== null) clearTimeout(delay);
        raf = null; delay = null; lastTime = null;
      }
      function pause() { cancelTiming(); running = false; auto = false; syncControls(); }
      function finish() {
        running = false; inFlight = false; progress = 0; lastTime = null; step++;
        if (currentLesson().key === 'group') details();
        renderScene(); refreshCaption(); syncControls();
        if (auto && step < currentLesson().steps.length-1) {
          const generation = epoch;
          delay = setTimeout(() => { delay = null; if (generation === epoch && auto) start(true); }, reduced.matches ? 1600 : currentLesson().key === 'group' ? 300 : 650);
        } else { auto = false; syncControls(); }
      }
      function start(continuePlaying) {
        cancelTiming(); auto = continuePlaying;
        if (step >= currentLesson().steps.length-1) { auto = false; syncControls(); return; }
        if (!inFlight) { inFlight = true; progress = 0; renderScene(); }
        running = true; refreshCaption(); syncControls();
        if (reduced.matches) { finish(); return; }
        const generation = epoch, duration = currentLesson().key === 'group' ? (currentLesson().steps[step+1].phase === 'assign' ? 1800 : 1100) : currentLesson().key === 'window' ? 2400 : 2200;
        function tick(time) {
          if (!running || generation !== epoch) return;
          if (lastTime !== null) progress = Math.min(1, progress+(time-lastTime)/duration);
          lastTime = time; drawMotion(progress);
          if (progress >= 1) { raf = null; finish(); } else raf = requestAnimationFrame(tick);
        }
        raf = requestAnimationFrame(tick);
      }
      function advance() {
        if (step >= currentLesson().steps.length-1) return;
        if (inFlight) { pause(); finish(); } else start(false);
      }
      function details() {
        const kind = currentLesson().key;
        const descriptions = {
          join: 'Each match keeps the order ID and line number. Orders 101 and 102 appear twice because each has two lines. LEFT JOIN would also retain an order without lines; this selected subset has a match for every order.',
          group: (groupMethod === 'two_pass' ? 'This two-pass teaching model first reads five keys to create groups, then reads the five lines again to retain member references and update sums. It keeps three key/sum entries plus five member references.' : 'This one-pass SUM model reads each of five lines once. It finds or creates a key, updates its sum, then discards the member reference. It retains three key/sum entries and no member list.') + ' Both models emit output only after processing all lines. Reads count input visits; Groups counts allocated key/sum entries; Member refs counts retained references, not copies of full rows. The illustrated counts and animation speed are not PostgreSQL memory bytes or measured runtime. SQL specifies the grouped result; PostgreSQL may choose a different physical algorithm. Line revenue already includes quantity and discount. The table below follows emitted output at the current step.',
          window: 'The ordered ROWS frame grows from the first order through the current row. SUM OVER adds a column and keeps three order rows. Orders 102 and 103 share a date; order_id breaks the tie. This is a logical illustration, not PostgreSQL’s physical execution plan.'
        };
        find('[data-animation-detail]').textContent = descriptions[kind];
        const container = find('.order-journey__accessible-data'); container.replaceChildren();
        const grid = doc.createElement('table'), cap = doc.createElement('caption'); cap.textContent = `${currentLesson().title} · ${kind === 'group' ? 'output emitted so far' : 'complete subset result'}`;
        const columns = kind === 'join' ? [['order_id','Order'],['line_no','Line'],['product_name','Product']] : kind === 'group' ? [['order_id','Order'],['revenue','Order revenue']] : [['order_id','Order'],['revenue','Revenue'],['running_total','Running total']];
        const head = doc.createElement('thead'), tr = doc.createElement('tr');
        columns.forEach(([,label]) => { const th = doc.createElement('th'); th.scope='col'; th.textContent=label; tr.append(th); }); head.append(tr);
        const body = doc.createElement('tbody'); (kind === 'group' ? snapshot().outputs : currentLesson().steps.at(-1).outputs).forEach(row => { const tr = doc.createElement('tr'); columns.forEach(([key],i) => { const cell=doc.createElement(i===0?'th':'td'); if (i===0) cell.scope='row'; cell.textContent=String(row[key]); tr.append(cell); }); body.append(tr); });
        grid.append(cap,head,body);
        if (kind === 'group') {
          const memoryTable = doc.createElement('table'), memoryCaption = doc.createElement('caption');
          memoryCaption.textContent = 'Working memory at this step · teaching model';
          const memoryHead = doc.createElement('thead'), memoryHeader = doc.createElement('tr');
          ['Order key', 'Current sum', 'Retained members'].forEach(label => { const th = doc.createElement('th'); th.scope='col'; th.textContent=label; memoryHeader.append(th); });
          memoryHead.append(memoryHeader);
          const memoryBody = doc.createElement('tbody');
          snapshot().groups.forEach(group => {
            const row = doc.createElement('tr');
            [group.order_id, group.revenue, group.members.map(member => `${member.line_id}: ${member.line_revenue}`).join(', ') || 'None'].forEach((value, index) => {
              const cell = doc.createElement(index ? 'td' : 'th'); if (!index) cell.scope='row'; cell.textContent=String(value); row.append(cell);
            });
            memoryBody.append(row);
          });
          memoryTable.append(memoryCaption,memoryHead,memoryBody); container.append(memoryTable);
        }
        container.append(grid);
        const sql = kind === 'join' ? `SELECT o.order_id, i.line_no, i.product_name
FROM orders AS o
LEFT JOIN order_items AS i ON i.order_id = o.order_id
WHERE o.customer_id = 1 AND o.order_id IN (101, 102, 103)
ORDER BY o.order_id, i.line_no;` : kind === 'group' ? `SELECT o.order_id, SUM(i.quantity * i.unit_price *
    (1 - COALESCE(i.discount_pct, 0) / 100.0)) AS revenue
FROM orders AS o
JOIN order_items AS i ON i.order_id = o.order_id
WHERE o.customer_id = 1 AND o.order_id IN (101, 102, 103)
  AND o.status = 'completed'
GROUP BY o.order_id
ORDER BY o.order_id;` : workedExampleSql.replace('WHERE c.customer_id = 1', 'WHERE c.customer_id = 1 AND o.order_id IN (101, 102, 103)');
        find('[data-animation-sql]').textContent = sql;
      }
      function reset() { pause(); epoch++; step=0; progress=0; inFlight=false; details(); renderScene(); refreshCaption(); syncControls(); }
      function changeConcept(i) { pause(); epoch++; concept=i; step=0; progress=0; inFlight=false; details(); renderScene(); refreshCaption(); syncControls(); }
      find('[data-group-method]').addEventListener('change', event => {
        pause(); epoch++; groupMethod = event.target.value; lessons[1] = buildGroupMemoryLesson(groupMethod);
        step=0; progress=0; inFlight=false; details(); renderScene(); refreshCaption(); syncControls();
      });
      play.addEventListener('click', () => { if (running || auto) pause(); else start(true); });
      next.addEventListener('click', advance); replay.addEventListener('click', reset);
      doc.addEventListener('visibilitychange', () => { if (doc.hidden) pause(); });
      if (typeof IntersectionObserver !== 'undefined') new IntersectionObserver(entries => { if (!entries[0].isIntersecting) pause(); }).observe(host);
      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { if (Math.abs(scene.getBoundingClientRect().width-sceneWidth)>2) renderScene(); }).observe(scene);
      if (reduced.addEventListener) reduced.addEventListener('change', () => { if (reduced.matches && inFlight) { pause(); finish(); } });
      host.dataset.ready = 'true'; details(); renderScene(); refreshCaption(); syncControls();
    }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init, { once: true }); else init();
    if (typeof document$ !== 'undefined') document$.subscribe(init);
  }
  return { buildJourney, sourceData, workedExampleSql, buildAnimationLesson, buildGroupMemoryLesson, mount };
});
