'use client';

import { Button, Pagination, Table } from '@velocityuikit/velocityui';
import { motion } from 'framer-motion';

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
}

function toTableColumns(
  columns: ReportTableColumn[],
  onRowClick?: (row: any) => void
) {
  const base: any[] = columns.map((col) => ({
    key: col.key,
    header: col.header,
    sortable: col.sortable ?? false,
    render: col.render
      ? (value: unknown, row: any) => col.render!(value, row)
      : undefined,
  }));
  if (onRowClick) {
    base.push({
      key: '_action',
      header: '',
      sortable: false,
      render: (_: unknown, row: any) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onRowClick(row);
          }}
        >
          View
        </Button>
      ),
    });
  }
  return base;
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
}: ReportTableProps) {
  const tableColumns = toTableColumns(columns, onRowClick);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="pulse-chart-container pulse-report-table-shell"
    >
      {loading && (
        <div className="pulse-loading-overlay">
          <div
            style={{
              width: 32,
              height: 32,
              border: '3px solid var(--pulse-border)',
              borderTopColor: 'var(--pulse-accent)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>
      )}
      <Table
        columns={tableColumns}
        data={data as Record<string, unknown>[]}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        className="pulse-report-table"
        size="sm"
      />
      {totalPages > 1 && onPageChange && (
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={onPageChange}
          />
        </div>
      )}
    </motion.div>
  );
}
