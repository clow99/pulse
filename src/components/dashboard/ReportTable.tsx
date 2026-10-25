'use client';

import { Button, Pagination } from '@velocityuikit/velocityui';
import { DashboardIcon } from './DashboardIcon';

export interface ReportTableColumn {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface ReportTableProps {
  columns: ReportTableColumn[];
  data: any[];
  onSort?: (key: string, dir: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: any) => void;
  loading?: boolean;
  label?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ReportTable({
  columns,
  data,
  onSort,
  sortKey,
  sortDir,
  page = 1,
  totalPages = 1,
  onPageChange,
  onRowClick,
  loading = false,
  label = 'Report results',
  emptyTitle = 'No results for this period',
  emptyDescription = 'Try a wider date range or adjust your filters.',
}: ReportTableProps) {
  return (
    <div
      className="pulse-chart-container pulse-report-table-shell"
      aria-busy={loading}
    >
      {loading && (
        <div className="pulse-loading-overlay" role="status">
          <span className="pulse-spinner" aria-hidden="true" />
          <span>Loading report…</span>
        </div>
      )}
      <div
        className="pulse-table-scroll pulse-report-table"
        role="region"
        aria-label={label}
        tabIndex={0}
        inert={loading}
      >
        <table aria-label={label}>
          <thead>
            <tr>
              {columns.map((column) => {
                const sorted = sortKey === column.key;
                const nextDirection =
                  sorted && sortDir === 'asc' ? 'desc' : 'asc';
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      column.sortable && onSort
                        ? sorted
                          ? sortDir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                        : undefined
                    }
                  >
                    {column.sortable && onSort ? (
                      <button
                        type="button"
                        className="pulse-table-sort"
                        onClick={() => onSort(column.key, nextDirection)}
                        aria-label={`Sort by ${column.header}, ${nextDirection === 'asc' ? 'ascending' : 'descending'}`}
                      >
                        {column.header}
                        <span aria-hidden="true">
                          {sorted ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              {onRowClick && <th scope="col">Details</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render
                      ? column.render(row[column.key], row)
                      : typeof row[column.key] === 'number'
                        ? row[column.key].toLocaleString()
                        : (row[column.key] ?? '—')}
                  </td>
                ))}
                {onRowClick && (
                  <td>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRowClick(row)}
                      aria-label={`View ${String(row[columns[0]?.key] ?? 'details')}`}
                    >
                      View
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && !data.length && (
        <div className="pulse-table-empty" role="status">
          <DashboardIcon name="search" width={28} height={28} />
          <h2>{emptyTitle}</h2>
          <p>{emptyDescription}</p>
        </div>
      )}
      {!!data.length && totalPages > 1 && onPageChange && (
        <div className="pulse-table-pagination" inert={loading}>
          <span>
            Page {page} of {totalPages}
          </span>
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}
