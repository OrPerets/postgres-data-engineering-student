/* Lab 02 browser simulations. They do not connect to PostgreSQL. */
(function () {
  'use strict';

  const partitions = [
    { name: 'sales_2024', start: '2024-01-01', end: '2025-01-01' },
    { name: 'sales_2025', start: '2025-01-01', end: '2026-01-01' },
    { name: 'sales_2026', start: '2026-01-01', end: '2027-01-01' }
  ];
  const ranges = {
    q1: { label: 'January–March 2025', start: '2025-01-01', end: '2025-04-01' },
    year: { label: 'All of 2025', start: '2025-01-01', end: '2026-01-01' },
    crossing: { label: 'Across 2024 and 2025', start: '2024-11-01', end: '2025-02-01' },
    full: { label: 'All of 2024–2026', start: '2024-01-01', end: '2027-01-01' },
    boundary: { label: 'Last day of 2025', start: '2025-12-31', end: '2026-01-01' },
    outside: { label: 'A date range in 2027', start: '2027-01-01', end: '2028-01-01' }
  };

  function isDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(value + 'T00:00:00Z');
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }

  // Half-open intervals overlap iff each starts before the other ends.
  function partitionMatches(start, end) {
    if (!isDate(start) || !isDate(end) || start >= end) throw new Error('Use valid dates with start before end.');
    return partitions.map(partition => ({ ...partition, eligible: start < partition.end && end > partition.start }));
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { partitionMatches };
  if (typeof document === 'undefined') return;

  function init() {
    const root = document.getElementById('lab02-partition-explorer');
    if (!root || root.dataset.initialized === 'true') return;
    root.dataset.initialized = 'true';
    root.classList.add('lab02-explorer');
    root.innerHTML = `
      <section class="lab02-explorer__partitions" aria-labelledby="lab02-pruning-title">
        <p class="lab02-explorer__eyebrow">BROWSER SIMULATION</p>
        <h3 id="lab02-pruning-title">Which partitions overlap?</h3>
        <p>Predict which yearly partitions match the date predicate, then choose a range.</p>
        <label for="lab02-date-range">Query date range</label>
        <select id="lab02-date-range">
          <option value="q1">January–March 2025</option>
          <option value="year">All of 2025</option>
          <option value="crossing">Across 2024 and 2025</option>
          <option value="full">All of 2024–2026</option>
          <option value="boundary">Last day of 2025</option>
          <option value="outside">A date range in 2027</option>
        </select>
        <p><strong>SQL predicate</strong></p>
        <pre class="lab02-explorer__query"><code></code></pre>
        <p class="lab02-explorer__explanation">The lower bound is inclusive (<code>&gt;=</code>); the upper bound is exclusive (<code>&lt;</code>).</p>
        <div class="lab02-explorer__partition-list" role="list" aria-label="Partition overlap results"></div>
        <p class="lab02-explorer__summary" role="status" aria-live="polite" aria-atomic="true"></p>
        <p class="lab02-explorer__note">This is an interval-overlap simulation, not a PostgreSQL execution plan. Actual pruning depends on the query and planner; use <code>EXPLAIN (ANALYZE, BUFFERS)</code> in the lab to verify. It covers only the three shown partitions.</p>
      </section>
      <section class="lab02-explorer__replication" aria-labelledby="lab02-replication-title">
        <h3 id="lab02-replication-title">What can a replica see?</h3>
        <p>Commit a sample write on the primary, then apply pending changes to the replica one at a time.</p>
        <div class="lab02-explorer__replication-grid">
          <div><strong>Primary</strong><span class="lab02-explorer__primary">No writes yet</span></div>
          <div><strong>Replica</strong><span class="lab02-explorer__replica">No writes yet</span></div>
        </div>
        <p class="lab02-explorer__replication-status" role="status" aria-live="polite" aria-atomic="true"></p>
        <div class="lab02-explorer__actions">
          <button type="button" data-action="write">Commit write on primary</button>
          <button type="button" data-action="apply">Apply next write on replica</button>
          <button type="button" data-action="reset">Reset</button>
        </div>
        <p class="lab02-explorer__note">This model pauses replay until you press Apply. Real asynchronous replay proceeds independently and may have delay; the example does not predict lag. A replica is read-only in this exercise, is not a backup, and does not provide automatic failover by itself.</p>
      </section>`;

    const select = root.querySelector('#lab02-date-range');
    const query = root.querySelector('.lab02-explorer__query code');
    const list = root.querySelector('.lab02-explorer__partition-list');
    const summary = root.querySelector('.lab02-explorer__summary');
    function renderPartitions() {
      const range = ranges[select.value];
      const matches = partitionMatches(range.start, range.end);
      query.textContent = `WHERE sale_date >= DATE '${range.start}'\n  AND sale_date < DATE '${range.end}'`;
      list.replaceChildren();
      for (const partition of matches) {
        const item = document.createElement('div');
        item.setAttribute('role', 'listitem');
        item.className = 'lab02-explorer__partition ' + (partition.eligible ? 'is-eligible' : 'is-pruned');
        const heading = document.createElement('strong');
        heading.textContent = partition.name;
        const bound = document.createElement('span');
        bound.textContent = `${partition.start} ≤ date < ${partition.end}`;
        const status = document.createElement('span');
        status.className = 'lab02-explorer__partition-status';
        status.textContent = partition.eligible ? 'Eligible' : 'Can be pruned';
        item.append(heading, bound, status);
        list.append(item);
      }
      const names = matches.filter(partition => partition.eligible).map(partition => partition.name);
      summary.textContent = names.length === 0 ? 'None of the three shown partitions overlap this range.' : names.length === matches.length ? `All three partitions are eligible: ${names.join(', ')}.` : `Eligible: ${names.join(', ')}. The other shown partitions can be pruned.`;
    }
    select.addEventListener('change', renderPartitions);
    renderPartitions();

    let primary = 0;
    let replica = 0;
    const primaryView = root.querySelector('.lab02-explorer__primary');
    const replicaView = root.querySelector('.lab02-explorer__replica');
    const status = root.querySelector('.lab02-explorer__replication-status');
    const write = root.querySelector('[data-action="write"]');
    const apply = root.querySelector('[data-action="apply"]');
    const reset = root.querySelector('[data-action="reset"]');
    const limit = 20;
    function renderReplication() {
      primaryView.textContent = `${primary} committed ${primary === 1 ? 'write' : 'writes'}`;
      replicaView.textContent = `${replica} applied ${replica === 1 ? 'write' : 'writes'}`;
      const pending = primary - replica;
      status.textContent = pending ? `${pending} ${pending === 1 ? 'write is' : 'writes are'} pending replay; the replica may show older data.` : 'No writes pending in this simulation; the replica has applied the same writes.';
      apply.disabled = pending === 0;
      write.disabled = primary >= limit;
      if (primary >= limit) status.textContent += ' Reset to try again.';
    }
    write.addEventListener('click', function () { if (primary < limit) primary += 1; renderReplication(); });
    apply.addEventListener('click', function () { if (replica < primary) replica += 1; renderReplication(); });
    reset.addEventListener('click', function () { primary = 0; replica = 0; renderReplication(); });
    renderReplication();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
