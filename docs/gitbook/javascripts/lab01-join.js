/* A small, deterministic JOIN simulation. No data leaves the browser. */
(function () {
  'use strict';

  const customers = [
    { id: 1, name: 'Maya' },
    { id: 2, name: 'Amir' },
    { id: 3, name: 'Noa' }
  ];
  const orders = [
    { id: 101, customerId: 1, status: 'completed' },
    { id: 102, customerId: 1, status: 'pending' },
    { id: 103, customerId: 2, status: 'completed' }
  ];
  const items = [
    { orderId: 101, product: 'Book' },
    { orderId: 101, product: 'Keyboard' },
    { orderId: 102, product: 'Lamp' },
    { orderId: 103, product: 'Notebook' }
  ];

  function buildRows(joinType, completedOnly) {
    if (!['left', 'inner'].includes(joinType)) throw new Error('Unknown join type');
    const rows = [];
    for (const customer of customers) {
      const matchingOrders = orders.filter((order) => order.customerId === customer.id);
      const candidates = matchingOrders.length ? matchingOrders : (joinType === 'left' ? [null] : []);
      for (const order of candidates) {
        const matchingItems = order ? items.filter((item) => item.orderId === order.id) : [];
        const joinedItems = matchingItems.length ? matchingItems : (joinType === 'left' ? [null] : []);
        for (const item of joinedItems) {
          // SQL WHERE removes NULL as well as non-matching values.
          if (completedOnly && (!order || order.status !== 'completed')) continue;
          rows.push({ customer, order, item });
        }
      }
    }
    return rows;
  }

  function countCustomers(rows) {
    return new Set(rows.map((row) => row.customer.id)).size;
  }

  // Expose the pure computation for local tests, without adding a browser global.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buildRows, countCustomers };
  }
  if (typeof document === 'undefined') return;

  function init() {
    const root = document.getElementById('lab01-join-explorer');
    if (!root || root.dataset.initialized === 'true') return;
    root.dataset.initialized = 'true';
    root.classList.add('join-explorer');
    root.innerHTML = `
      <div class="join-explorer__intro">
        <p class="join-explorer__eyebrow">INTERACTIVE EXAMPLE</p>
        <p>Predict who stays in the result, then change the join and filter to check.</p>
      </div>
      <div class="join-explorer__source" aria-label="Example source data">
        <div><strong>Customers</strong><span>Maya · Amir · Noa</span></div>
        <div><strong>Orders</strong><span>Maya: 101 completed, 102 pending<br>Amir: 103 completed<br>Noa: no orders</span></div>
        <div><strong>Items</strong><span>Order 101: Book, Keyboard<br>Order 102: Lamp<br>Order 103: Notebook</span></div>
      </div>
      <div class="join-explorer__controls">
        <div><label for="lab01-join-type">Join type</label>
          <select id="lab01-join-type"><option value="left">LEFT JOIN</option><option value="inner">INNER JOIN</option></select>
        </div>
        <div><label for="lab01-join-filter">WHERE filter</label>
          <select id="lab01-join-filter"><option value="all">No status filter</option><option value="completed">Completed orders only</option></select>
        </div>
      </div>
      <p class="join-explorer__result-label" id="lab01-join-summary" role="status" aria-live="polite"></p>
      <div class="join-explorer__table-wrap" role="region" aria-label="Joined result table" tabindex="0">
        <table><caption>Joined result — item matches and any unmatched rows kept by LEFT JOIN</caption><thead><tr><th scope="col">Customer</th><th scope="col">Order</th><th scope="col">Status</th><th scope="col">Item</th></tr></thead><tbody></tbody></table>
      </div>
      <p class="join-explorer__explanation"></p>
      <details class="join-explorer__sql"><summary>See the SQL</summary><pre><code></code></pre></details>
      <p class="join-explorer__note">This is a small browser simulation, not a PostgreSQL query. NULL means there is no matching value.</p>`;

    const joinSelect = root.querySelector('#lab01-join-type');
    const filterSelect = root.querySelector('#lab01-join-filter');
    const code = root.querySelector('code');
    const body = root.querySelector('tbody');
    const summary = root.querySelector('#lab01-join-summary');
    const explanation = root.querySelector('.join-explorer__explanation');

    function render() {
      const isLeft = joinSelect.value === 'left';
      const completedOnly = filterSelect.value === 'completed';
      const rows = buildRows(joinSelect.value, completedOnly);
      const join = isLeft ? 'LEFT JOIN' : 'INNER JOIN';
      code.textContent = `SELECT c.full_name, o.order_id, o.status, i.product_name\nFROM customers c\n${join} orders o ON o.customer_id = c.customer_id\n${join} order_items i ON i.order_id = o.order_id${completedOnly ? "\nWHERE o.status = 'completed'" : ''};`;
      body.replaceChildren();
      for (const row of rows) {
        const tr = document.createElement('tr');
        for (const value of [row.customer.name, row.order ? row.order.id : null, row.order ? row.order.status : null, row.item ? row.item.product : null]) {
          const cell = document.createElement('td');
          cell.textContent = value === null ? 'NULL' : String(value);
          if (value === null) cell.className = 'join-explorer__null';
          tr.appendChild(cell);
        }
        body.appendChild(tr);
      }
      summary.textContent = `${rows.length} result rows · ${countCustomers(rows)} distinct customers`;
      let message = 'Order 101 has two items, so Maya and that order appear twice. COUNT(*) counts joined rows, not orders or customers.';
      if (completedOnly) message += isLeft
        ? " The WHERE condition removes Noa's NULL order too; it is not TRUE for NULL."
        : ' The WHERE condition removes Maya’s pending order.';
      else message += isLeft
        ? ' LEFT JOIN keeps Noa, with NULL in the order and item columns.'
        : ' INNER JOIN removes Noa because she has no matching order.';
      explanation.textContent = message;
    }
    joinSelect.addEventListener('change', render);
    filterSelect.addEventListener('change', render);
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
