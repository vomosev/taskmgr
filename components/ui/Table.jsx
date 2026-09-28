'use client';

import React from 'react';

/**
 * Shared Table primitive.
 *
 * columns: [{ key, header, align?: 'start'|'end'|'center', wrap?: boolean, width?: 'sm'|'md'|'lg' }]
 * rows: array of row objects
 * renderCell: (row, column, rowIndex) => ReactNode  (falls back to row[column.key])
 */
export default function Table({
  columns = [],
  rows = [],
  renderCell,
  emptyMessage = 'Nothing to show yet.',
  loading = false,
  skeletonRows = 4,
  caption,
  getRowKey,
}) {
  const safeColumns = Array.isArray(columns) ? columns : [];
  const safeRows = Array.isArray(rows) ? rows : [];
  const colCount = safeColumns.length || 1;

  const alignClass = (align) => {
    if (align === 'end') return 'table__cell--end';
    if (align === 'center') return 'table__cell--center';
    return '';
  };

  const cellClasses = (column) =>
    ['table__cell', alignClass(column.align), column.wrap ? 'break-word' : '']
      .filter(Boolean)
      .join(' ');

  const headClasses = (column) =>
    ['table__head-cell', alignClass(column.align), column.width ? `table__col--${column.width}` : '']
      .filter(Boolean)
      .join(' ');

  const resolveCell = (row, column, rowIndex) => {
    if (typeof renderCell === 'function') {
      const output = renderCell(row, column, rowIndex);
      if (output !== undefined) return output;
    }
    const value = row ? row[column.key] : undefined;
    if (value === null || value === undefined || value === '') return '—';
    return value;
  };

  const rowKey = (row, index) => {
    if (typeof getRowKey === 'function') {
      const key = getRowKey(row, index);
      if (key !== undefined && key !== null) return String(key);
    }
    if (row && (row.id !== undefined && row.id !== null)) return String(row.id);
    return `row-${index}`;
  };

  return (
    <div className="table-wrap" role="region" aria-busy={loading ? 'true' : 'false'} tabIndex={0}>
      <table className="table">
        {caption ? <caption className="table__caption">{caption}</caption> : null}
        <thead className="table__head">
          <tr>
            {safeColumns.map((column) => (
              <th key={column.key} scope="col" className={headClasses(column)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="table__body">
          {loading
            ? Array.from({ length: Math.max(1, skeletonRows) }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} className="table__row table__row--skeleton">
                  {safeColumns.map((column) => (
                    <td key={column.key} className="table__cell">
                      <span className="skeleton skeleton--text" aria-hidden="true" />
                      <span className="visually-hidden">Loading</span>
                    </td>
                  ))}
                </tr>
              ))
            : null}

          {!loading && safeRows.length === 0 ? (
            <tr className="table__row table__row--empty">
              <td className="table__cell table__cell--empty" colSpan={colCount}>
                <p className="table__empty-message">{emptyMessage}</p>
              </td>
            </tr>
          ) : null}

          {!loading &&
            safeRows.map((row, rowIndex) => (
              <tr key={rowKey(row, rowIndex)} className="table__row">
                {safeColumns.map((column) => (
                  <td key={column.key} className={cellClasses(column)} data-label={typeof column.header === 'string' ? column.header : undefined}>
                    {resolveCell(row, column, rowIndex)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export { Table };