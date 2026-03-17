'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Title, Accordion, Badge } from '@velocityuikit/velocityui';
import { PageTransition } from '@/components/motion';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { ReportTable } from '@/components/dashboard/ReportTable';
import { subDays, startOfDay, endOfDay, parseISO, format } from 'date-fns';

interface EventsRow {
  name: string;
  count: number;
  uniqueTriggers: number;
}

interface PropertyValue {
  value: string;
  count: number;
}

interface PropertyBreakdown {
  key: string;
  values: PropertyValue[];
}

interface EventDetails {
  name: string;
  count: number;
  uniqueTriggers: number;
  propertyBreakdown: PropertyBreakdown[];
}

export default function EventsPage() {
  const searchParams = useSearchParams();
  const siteId = searchParams.get('siteId') || '';

  const [from, setFrom] = useState(() =>
    format(startOfDay(subDays(new Date(), 30)), 'yyyy-MM-dd')
  );
  const [to, setTo] = useState(() =>
    format(endOfDay(new Date()), 'yyyy-MM-dd')
  );
  const [data, setData] = useState<EventsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const fromISO = startOfDay(parseISO(from)).toISOString();
      const toISO = endOfDay(parseISO(to)).toISOString();
      const params = new URLSearchParams({ siteId, from: fromISO, to: toISO });
      const res = await fetch(`/api/reports/events?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [siteId, from, to]);

  const fetchEventDetails = useCallback(
    async (eventName: string) => {
      if (!siteId) return;
      setDetailsLoading(true);
      setSelectedEvent(null);
      try {
        const fromISO = startOfDay(parseISO(from)).toISOString();
        const toISO = endOfDay(parseISO(to)).toISOString();
        const params = new URLSearchParams({
          siteId,
          from: fromISO,
          to: toISO,
          name: eventName,
        });
        const res = await fetch(`/api/reports/events?${params}`);
        if (res.ok) {
          const json = await res.json();
          setSelectedEvent(json);
        }
      } catch {
        // silently fail
      } finally {
        setDetailsLoading(false);
      }
    },
    [siteId, from, to]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDateChange = (newFrom: string, newTo: string) => {
    setFrom(newFrom);
    setTo(newTo);
    setSelectedEvent(null);
  };

  const handleRowClick = (row: object) => {
    const name = (row as Record<string, unknown>).name as string;
    if (name) fetchEventDetails(name);
  };

  const columns = [
    { key: 'name', header: 'Event Name' },
    { key: 'count', header: 'Count' },
    { key: 'uniqueTriggers', header: 'Unique Triggers' },
  ];

  const accordionItems =
    selectedEvent?.propertyBreakdown.map((pb) => ({
      value: pb.key,
      title: pb.key,
      content: (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            padding: '0.5rem 0',
          }}
        >
          {pb.values.map((v) => (
            <Badge key={v.value} variant="info" size="sm">
              {v.value}: {v.count}
            </Badge>
          ))}
        </div>
      ),
    })) ?? [];

  return (
    <PageTransition>
      <div className="pulse-page">
        <div className="pulse-page-header">
          <Title level="h1" size="lg">
            Events
          </Title>
          <DateRangePicker from={from} to={to} onChange={handleDateChange} />
        </div>

        <div className="pulse-section">
          <ReportTable
            columns={columns}
            data={data}
            loading={loading}
            onRowClick={handleRowClick}
          />
        </div>

        {(selectedEvent || detailsLoading) && (
          <div className="pulse-section">
            {detailsLoading ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--pulse-text-secondary)',
                }}
              >
                Loading event details...
              </div>
            ) : selectedEvent && accordionItems.length > 0 ? (
              <Accordion items={accordionItems} multiple defaultValue={[]} />
            ) : selectedEvent && accordionItems.length === 0 ? (
              <div
                style={{
                  padding: '1rem',
                  color: 'var(--pulse-text-secondary)',
                }}
              >
                No property breakdown for this event.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
