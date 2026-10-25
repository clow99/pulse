import type { SVGProps } from 'react';

const paths: Record<string, string> = {
  overview: 'M3 12h4l3-8 4 16 3-8h4',
  portfolio: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  pages: 'M14 2H5v20h14V7z M14 2v6h5 M8 12h8 M8 16h6',
  events: 'M13 2 4 14h7l-1 8 10-13h-7z',
  funnels: 'M3 4h18l-7 8v7l-4 2v-9z',
  acquisition: 'M4 17 10 11l4 3 6-10 M14 4h6v6',
  technology: 'M5 3h14v13H5z M2 20h20 M9 16v4 M15 16v4',
  revenue: 'M12 2v20 M17 6H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6',
  uptime: 'M3 12h4l3-8 4 16 3-8h4',
  performance: 'M5 19a9 9 0 1 1 14 0 M12 13l5-5 M6 15h1 M17 15h1',
  insights: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z',
  refresh:
    'M20 7v5h-5 M4 17v-5h5 M5 7a8 8 0 0 1 13-2l2 3 M4 16l2 3a8 8 0 0 0 13-2',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',
  arrow: 'M5 12h14 M14 7l5 5-5 5',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  close: 'm6 6 12 12 M6 18 18 6',
  logout: 'M9 4H4v16h5 M10 12h11 M16 7l5 5-5 5',
  calendar: 'M8 2v4 M16 2v4 M3 10h18 M4 4h16v17H4z M8 14h2 M14 14h2',
  search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  globe:
    'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M3 12h18 M12 3a17 17 0 0 1 0 18 17 17 0 0 1 0-18',
  check: 'm5 12 4 4L19 6',
};

export function DashboardIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.overview} />
    </svg>
  );
}
