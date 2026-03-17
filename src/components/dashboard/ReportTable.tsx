'use client';

import { Button, Pagination, Table } from '@velocityuikit/velocityui';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export interface ReportTableColumn {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface ReportTableProps {
  columns: ReportTableColumn[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  onSort?: (key: string, dir: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRowClick?: (row: any) => void;
  loading?: boolean;
}

function toTableColumns(
  columns: ReportTableColumn[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRowClick?: (row: any) => void
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base: any[] = columns.map((col) => ({
    key: col.key,
    header: col.header,
    sortable: col.sortable ?? false,
    render: col.render
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (value: unknown, row: any) => col.render!(value, row)
      : undefined,
  }));
  if (onRowClick) {
    base.push({
      key: '_action',
      header: '',
      sortable: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const tableColumns = toTableColumns(columns, onRowClick);

  return (
    <motion.div
      initial={mounted ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="pulse-chart-container"
      style={{ position: 'relative' }}
    >
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(10, 10, 15, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            zIndex: 10,
          }}
        >
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
