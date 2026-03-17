'use client';

import { Button, Input, Select } from '@velocityuikit/velocityui';
import type { SelectOption } from '@velocityuikit/velocityui';

const DIMENSION_OPTIONS: SelectOption[] = [
  { value: '', label: 'Dimension' },
  { value: 'browser', label: 'Browser' },
  { value: 'os', label: 'OS' },
  { value: 'device', label: 'Device' },
  { value: 'country', label: 'Country' },
  { value: 'language', label: 'Language' },
  { value: 'referrer', label: 'Referrer' },
];

interface DimensionFilterProps {
  dimension?: string;
  value?: string;
  onChange: (dimension: string | undefined, value: string | undefined) => void;
}

export function DimensionFilter({
  dimension,
  value = '',
  onChange,
}: DimensionFilterProps) {
  function handleDimensionChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    onChange(v || undefined, undefined);
  }

  function handleValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    onChange(dimension, v || undefined);
  }

  function handleClear() {
    onChange(undefined, undefined);
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flexWrap: 'wrap',
      }}
    >
      <Select
        options={DIMENSION_OPTIONS}
        value={dimension ?? ''}
        onChange={handleDimensionChange}
        placeholder="Dimension"
        size="sm"
        style={{ minWidth: 140 }}
      />
      <Input
        type="text"
        value={value}
        onChange={handleValueChange}
        placeholder="Filter value"
        size="sm"
        style={{ width: 160 }}
      />
      <Button variant="ghost" size="sm" onClick={handleClear}>
        Clear
      </Button>
    </div>
  );
}
