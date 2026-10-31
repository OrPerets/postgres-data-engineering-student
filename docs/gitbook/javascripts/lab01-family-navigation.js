/* Browser-only, deterministic models for the Lab 01 function-family explorer. */
(function () {
  'use strict';

  // One customer's completed orders, sorted by date and then unique order ID.
  const orders = Object.freeze([
    { id: 101, value: 300 },
    { id: 102, value: 200 },
    { id: 103, value: 200 },
    { id: 104, value: 400 },
    { id: 134, value: 120 }
  ]);
  const orderClause = 'PARTITION BY customer_id ORDER BY order_date, order_id';
  const fullFrame = 'ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING';

  function offsetSteps(direction) {
    return orders.map(function (current, index) {
      const sourceIndex = index + direction;
      const source = orders[sourceIndex];
      const sourceLabel = direction < 0 ? 'Previous' : 'Next';
      return {
        rows: orders.map(function (order, rowIndex) {
          return {
            id: order.id,
            value: order.value,
            role: rowIndex === index ? 'Current' : rowIndex === sourceIndex ? sourceLabel : 'Other'
          };
        }),
        result: source ? String(source.value) : 'NULL',
        detail: source
          ? `Order ${current.id} reads ${sourceLabel.toLowerCase()} order ${source.id}: ${source.value}.`
          : `Order ${current.id} has no ${sourceLabel.toLowerCase()} order in this partition, so the result is NULL.`
      };
    });
  }

  function valueSteps(sourceIndex, position) {
    const source = orders[sourceIndex];
    return orders.map(function (current, index) {
      return {
        rows: orders.map(function (order, rowIndex) {
          let role = 'In frame';
          if (rowIndex === index && rowIndex === sourceIndex) role = 'Current · Source';
          else if (rowIndex === index) role = 'Current';
          else if (rowIndex === sourceIndex) role = 'Source';
          return { id: order.id, value: order.value, role: role };
        }),
        result: String(source.value),
        detail: `For current order ${current.id}, the full-partition frame includes all five orders. The ${position} order is ${source.id}, with revenue ${source.value}.`
      };
    });
  }

  const offsets = {
    id: 'offsets',
    title: 'Previous and next rows',
    functions: [
      {
        id: 'lag', name: 'LAG',
        syntax: `LAG(revenue) OVER (${orderClause})`,
        explanation: 'Read the revenue from the previous existing order in this customer’s partition. The first order has no previous row, so its result is NULL.',
        steps: offsetSteps(-1)
      },
      {
        id: 'lead', name: 'LEAD',
        syntax: `LEAD(revenue) OVER (${orderClause})`,
        explanation: 'Read the revenue from the next existing order in this customer’s partition. The last order has no next row, so its result is NULL.',
        steps: offsetSteps(1)
      }
    ]
  };

  const values = {
    id: 'values',
    title: 'First, last and nth values',
    functions: [
      {
        id: 'first_value', name: 'FIRST_VALUE',
        syntax: `FIRST_VALUE(revenue) OVER (${orderClause} ${fullFrame})`,
        explanation: 'Read the first value in the full customer frame. A frame can contain fewer rows if a different frame is specified.',
        steps: valueSteps(0, 'first')
      },
      {
        id: 'last_value', name: 'LAST_VALUE',
        syntax: `LAST_VALUE(revenue) OVER (${orderClause} ${fullFrame})`,
        explanation: 'Read the last value in the full customer frame. Without this explicit full frame, the ordered default ends at the current row’s last peer.',
        steps: valueSteps(4, 'last')
      },
      {
        id: 'nth_value', name: 'NTH_VALUE',
        syntax: `NTH_VALUE(revenue, 3) OVER (${orderClause} ${fullFrame})`,
        explanation: 'Read the third value in the full customer frame. NTH_VALUE returns NULL if the requested position is outside the frame.',
        steps: valueSteps(2, 'third')
      }
    ]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = { offsets, values };
  if (typeof window !== 'undefined') {
    window.Lab01FunctionFamilies = window.Lab01FunctionFamilies || {};
    window.Lab01FunctionFamilies.offsets = offsets;
    window.Lab01FunctionFamilies.values = values;
  }
})();
