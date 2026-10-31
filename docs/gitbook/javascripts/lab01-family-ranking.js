/* Fixed-data PostgreSQL window-function models; no query is executed. */
(function (root, factory) {
  'use strict';
  const models = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = models;
  if (root && root.document) {
    root.Lab01FunctionFamilies = root.Lab01FunctionFamilies || {};
    root.Lab01FunctionFamilies.ranking = models.ranking;
    root.Lab01FunctionFamilies.distribution = models.distribution;
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  // The lesson's completed orders for customer 1. Date is not used as an
  // ordering key here: these examples deliberately rank by revenue.
  const orders = [
    { id: 101, value: 300 }, { id: 102, value: 200 },
    { id: 103, value: 200 }, { id: 104, value: 400 },
    { id: 134, value: 120 }
  ].sort(function (a, b) { return b.value - a.value || a.id - b.id; });
  const n = orders.length;
  const orderWithId = 'PARTITION BY customer_id ORDER BY revenue DESC, order_id';
  const orderByRevenue = 'PARTITION BY customer_id ORDER BY revenue DESC';

  function firstPeer(i) {
    return orders.findIndex(function (row) { return row.value === orders[i].value; });
  }
  function lastPeer(i) {
    let result = i;
    while (result + 1 < n && orders[result + 1].value === orders[i].value) result += 1;
    return result;
  }
  function rank(i) { return firstPeer(i) + 1; }
  function denseRank(i) {
    return new Set(orders.slice(0, i + 1).map(function (row) { return row.value; })).size;
  }
  function bucket(i, numBuckets) {
    // PostgreSQL puts the extra rows in the earliest buckets.
    const whole = Math.floor(n / numBuckets);
    const largerBuckets = n % numBuckets;
    const largerRows = (whole + 1) * largerBuckets;
    return i < largerRows
      ? Math.floor(i / (whole + 1)) + 1
      : largerBuckets + Math.floor((i - largerRows) / whole) + 1;
  }
  function makeRows(i, showPeers, showBuckets) {
    return orders.map(function (row, index) {
      const role = index === i ? 'Current'
        : showPeers && row.value === orders[i].value ? 'Peer'
        : index < i ? 'Earlier' : 'Later';
      const item = { id: row.id, value: row.value, role: role };
      if (showBuckets) item.annotation = 'Bucket ' + bucket(index, 2);
      return item;
    });
  }
  function format(value) {
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
  }
  function makeSteps(kind) {
    return orders.map(function (current, i) {
      let result, detail;
      switch (kind) {
        case 'row_number':
          result = i + 1;
          detail = 'Position ' + (i + 1) + ' in the revenue-descending order. The order ID breaks revenue ties.';
          break;
        case 'rank':
          result = rank(i);
          detail = 'The first position of this revenue peer group is ' + result + '. The next group starts after all its rows.';
          break;
        case 'dense_rank':
          result = denseRank(i);
          detail = 'This is distinct revenue level ' + result + '; peer groups are counted without gaps.';
          break;
        case 'percent_rank':
          result = n === 1 ? 0 : (rank(i) - 1) / (n - 1);
          detail = '(rank − 1) ÷ (rows − 1) = (' + rank(i) + ' − 1) ÷ (' + n + ' − 1) = ' + format(result) + '.';
          break;
        case 'cume_dist':
          result = (lastPeer(i) + 1) / n;
          detail = (lastPeer(i) + 1) + ' rows come before or are peers of this row: ' + (lastPeer(i) + 1) + ' ÷ ' + n + ' = ' + format(result) + '.';
          break;
        case 'ntile':
          result = bucket(i, 2);
          detail = 'Five ordered rows fill two buckets as evenly as possible: sizes 3 and 2. The tied 200 orders are split between buckets.';
          break;
        default: throw new Error('Unknown function: ' + kind);
      }
      return {
        rows: makeRows(i, !['row_number', 'ntile'].includes(kind), kind === 'ntile'),
        result: format(result),
        detail: detail
      };
    });
  }
  function definition(id, name, syntax, explanation) {
    return { id: id, name: name, syntax: syntax, explanation: explanation, steps: makeSteps(id) };
  }
  return {
    ranking: {
      id: 'ranking', title: 'Ranking functions', functions: [
        definition('row_number', 'ROW_NUMBER', 'ROW_NUMBER() OVER (' + orderWithId + ')', 'Give every order a unique position. A unique order ID makes tied revenues reproducible.'),
        definition('rank', 'RANK', 'RANK() OVER (' + orderByRevenue + ')', 'Give equal revenues the same rank; leave gaps after ties.'),
        definition('dense_rank', 'DENSE_RANK', 'DENSE_RANK() OVER (' + orderByRevenue + ')', 'Give equal revenues the same rank, without gaps between revenue levels.')
      ]
    },
    distribution: {
      id: 'distribution', title: 'Distribution and buckets', functions: [
        definition('percent_rank', 'PERCENT_RANK', 'PERCENT_RANK() OVER (' + orderByRevenue + ')', 'Show the relative rank from 0 to 1; peers share the same result.'),
        definition('cume_dist', 'CUME_DIST', 'CUME_DIST() OVER (' + orderByRevenue + ')', 'Show the proportion of rows that precede or are peers of the current row.'),
        definition('ntile', 'NTILE', 'NTILE(2) OVER (' + orderWithId + ')', 'Divide ordered rows into two near-equal buckets. The ID fixes tied-row order; buckets can split ties.')
      ]
    }
  };
});
