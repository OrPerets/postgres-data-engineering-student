/* Lab 01: illustrative PostgreSQL aggregate-window calculations in the browser.
   These are deterministic teaching examples, not a live database connection. */
(function (root, factory) {
  'use strict';
  const family = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = family;
  if (root) {
    root.Lab01FunctionFamilies = root.Lab01FunctionFamilies || {};
    root.Lab01FunctionFamilies.aggregate = family;
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const orders = [
    { id: 101, value: 300 }, { id: 102, value: 200 },
    { id: 103, value: 200 }, { id: 104, value: 400 },
    { id: 134, value: 120 }
  ];
  const windowSpec = 'PARTITION BY customer_id\n  ORDER BY order_date, order_id\n  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW';
  const format = (number) => Number.isInteger(number) ? String(number) : number.toFixed(2);
  const rounded = (number) => number.toFixed(2) + ' (rounded)';
  const total = (values) => values.reduce((sum, n) => sum + n, 0);
  const variance = (values, sample) => {
    if (sample && values.length < 2) return null;
    const mean = total(values) / values.length;
    return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - (sample ? 1 : 0));
  };
  const models = [
    {
      id: 'sum', name: 'SUM', call: 'SUM(revenue)',
      explanation: 'Adds revenue from the first order through the current order.',
      compute: (values) => ({ result: format(total(values)), detail: values.join(' + ') + ' = ' + format(total(values)) })
    },
    {
      id: 'avg', name: 'AVG', call: 'AVG(revenue)',
      explanation: 'Finds the average revenue in the current frame. AVG ignores NULL values.',
      compute: (values) => ({ result: rounded(total(values) / values.length), detail: '(' + values.join(' + ') + ') ÷ ' + values.length + ' = ' + rounded(total(values) / values.length) })
    },
    {
      id: 'count', name: 'COUNT', call: 'COUNT(*)',
      explanation: 'Counts the rows in the current frame. COUNT(*) includes rows even when a value is NULL.',
      compute: (values) => ({ result: String(values.length), detail: values.length + (values.length === 1 ? ' order is' : ' orders are') + ' in this frame.' })
    },
    {
      id: 'min', name: 'MIN', call: 'MIN(revenue)',
      explanation: 'Finds the smallest non-NULL revenue in the current frame.',
      compute: (values) => ({ result: format(Math.min(...values)), detail: 'Smallest of ' + values.join(', ') + ' = ' + format(Math.min(...values)) })
    },
    {
      id: 'max', name: 'MAX', call: 'MAX(revenue)',
      explanation: 'Finds the largest non-NULL revenue in the current frame.',
      compute: (values) => ({ result: format(Math.max(...values)), detail: 'Largest of ' + values.join(', ') + ' = ' + format(Math.max(...values)) })
    },
    {
      id: 'stddev_pop', name: 'STDDEV_POP', call: 'STDDEV_POP(revenue)',
      explanation: 'Measures the population standard deviation of non-NULL revenues in the frame.',
      compute: (values) => ({ result: rounded(Math.sqrt(variance(values, false))), detail: 'Square root of the population variance for ' + values.length + (values.length === 1 ? ' revenue.' : ' revenues.') })
    },
    {
      id: 'stddev_samp', name: 'STDDEV_SAMP', call: 'STDDEV_SAMP(revenue)',
      explanation: 'Measures sample standard deviation; fewer than two non-NULL values produce NULL.',
      compute: (values) => ({ result: values.length < 2 ? 'NULL' : rounded(Math.sqrt(variance(values, true))), detail: values.length < 2 ? 'One value is not enough for sample standard deviation.' : 'Square root of the sample variance: divide the squared deviations by ' + (values.length - 1) + '.' })
    },
    {
      id: 'var_pop', name: 'VAR_POP', call: 'VAR_POP(revenue)',
      explanation: 'Measures population variance of non-NULL revenues in the current frame.',
      compute: (values) => ({ result: rounded(variance(values, false)), detail: 'Sum squared deviations from the frame average, then divide by ' + values.length + '.' })
    },
    {
      id: 'var_samp', name: 'VAR_SAMP', call: 'VAR_SAMP(revenue)',
      explanation: 'Measures sample variance; fewer than two non-NULL values produce NULL.',
      compute: (values) => ({ result: values.length < 2 ? 'NULL' : rounded(variance(values, true)), detail: values.length < 2 ? 'One value is not enough for sample variance.' : 'Sum squared deviations from the frame average, then divide by ' + (values.length - 1) + '.' })
    },
    {
      id: 'bool_or', name: 'BOOL_OR', call: 'BOOL_OR(revenue >= 400)',
      explanation: 'Tests whether any non-NULL condition in the frame is true.',
      compute: (values) => ({ result: values.some(value => value >= 400) ? 'TRUE' : 'FALSE', detail: 'Does any frame revenue reach 400? ' + values.map(value => value + (value >= 400 ? ' ≥ 400' : ' < 400')).join('; ') + '.' })
    },
    {
      id: 'bool_and', name: 'BOOL_AND', call: 'BOOL_AND(revenue >= 200)',
      explanation: 'Tests whether all non-NULL conditions in the frame are true.',
      compute: (values) => ({ result: values.every(value => value >= 200) ? 'TRUE' : 'FALSE', detail: 'Does every frame revenue reach 200? ' + values.map(value => value + (value >= 200 ? ' ≥ 200' : ' < 200')).join('; ') + '.' })
    },
    {
      id: 'array_agg', name: 'ARRAY_AGG', call: 'ARRAY_AGG(order_id)',
      explanation: 'Collects the order IDs in the ordered current frame into an array.',
      compute: (_values, included) => ({ result: '[' + included.map(order => order.id).join(', ') + ']', detail: 'Collect the IDs in frame order, from the first order through the current order.' })
    },
    {
      id: 'string_agg', name: 'STRING_AGG', call: "STRING_AGG(order_id::text, ', ')",
      explanation: 'Joins the order IDs in the ordered current frame into text.',
      compute: (_values, included) => ({ result: included.map(order => order.id).join(', '), detail: 'Convert each ID to text and join frame IDs with a comma and a space.' })
    }
  ];
  return {
    id: 'aggregate',
    title: 'Aggregate windows',
    functions: models.map((model) => ({
      id: model.id, name: model.name,
      syntax: model.call + ' OVER (\n  ' + windowSpec + '\n)',
      explanation: model.explanation,
      steps: orders.map((_order, index) => {
        const included = orders.slice(0, index + 1);
        const outcome = model.compute(included.map(order => order.value), included);
        return {
          rows: orders.map((row, i) => ({ id: row.id, value: row.value, role: i === index ? 'current' : i < index ? 'contributing' : 'outside' })),
          result: outcome.result,
          detail: outcome.detail
        };
      })
    }))
  };
});
