// The dashboard's icons: one line style, drawn on a 24px grid, colored by
// the text around them. Server and client components can both use them;
// pass the name (a string) when a server component hands one to a client
// component.

import type { ReactNode } from "react";

const paths = {
  home: (
    <path d='M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z' />
  ),
  status: (
    <>
      <rect x='3' y='3' width='18' height='18' rx='4' />
      <path d='M8 16V8M12 16v-5M16 16v-3' />
    </>
  ),
  file: (
    <>
      <path d='M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z' />
      <path d='M14 3v5h5M9 13h6M9 17h4' />
    </>
  ),
  clipboard: (
    <>
      <rect x='5' y='4' width='14' height='17' rx='2' />
      <path d='M9 4V3h6v1M9 11h6M9 15h4' />
    </>
  ),
  image: (
    <>
      <rect x='3' y='3' width='18' height='18' rx='4' />
      <circle cx='9' cy='9' r='2' />
      <path d='m21 15-4.5-4.5L6 21' />
    </>
  ),
  blueprint: (
    <>
      <path d='m12 3 9 5-9 5-9-5z' />
      <path d='m3 13 9 5 9-5' />
    </>
  ),
  palette: (
    <>
      <path d='M12 3a9 9 0 1 0 0 18c1.1 0 1.7-.9 1.4-1.8-.4-1.2.4-2.2 1.6-2.2H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10Z' />
      <circle cx='7.5' cy='11.5' r='1' />
      <circle cx='10' cy='7.5' r='1' />
      <circle cx='15' cy='7.5' r='1' />
    </>
  ),
  pen: (
    <>
      <path d='M4 20h4L19 9l-4-4L4 16z' />
      <path d='m13.5 6.5 4 4' />
    </>
  ),
  chart: (
    <>
      <path d='M3 20h18' />
      <path d='m4 15 5-5 4 4 7-7' />
      <path d='M15 7h5v5' />
    </>
  ),
  external: (
    <>
      <path d='M14 4h6v6M20 4l-9 9' />
      <path d='M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5' />
    </>
  ),
  target: (
    <>
      <circle cx='12' cy='12' r='9' />
      <circle cx='12' cy='12' r='5' />
      <circle cx='12' cy='12' r='1' />
    </>
  ),
  booking: (
    <>
      <rect x='3' y='5' width='18' height='16' rx='2' />
      <path d='M3 10h18M8 3v4M16 3v4' />
      <path d='m9 15 2 2 4-4' />
    </>
  ),
  card: (
    <>
      <rect x='3' y='5' width='18' height='14' rx='2' />
      <path d='M3 10h18M7 15h4' />
    </>
  ),
  message: <path d='M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.6A8 8 0 1 1 21 12Z' />,
  user: (
    <>
      <circle cx='12' cy='8' r='4' />
      <path d='M4 21a8 8 0 0 1 16 0' />
    </>
  ),
  logout: (
    <>
      <path d='M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3' />
      <path d='M10 17l-5-5 5-5M5 12h11' />
    </>
  ),
  menu: <path d='M4 7h16M4 12h16M4 17h10' />,
  close: <path d='M6 6l12 12M18 6 6 18' />,
  check: <path d='m5 12.5 4.5 4.5L19 7.5' />,
  clock: (
    <>
      <circle cx='12' cy='12' r='9' />
      <path d='M12 7v5l3 2' />
    </>
  ),
  lock: (
    <>
      <rect x='5' y='11' width='14' height='10' rx='2' />
      <path d='M8 11V8a4 4 0 0 1 8 0v3' />
    </>
  ),
  arrow: <path d='M5 12h14m-6-6 6 6-6 6' />,
  arrowUpRight: <path d='M7 17 17 7M8 7h9v9' />,
  plus: <path d='M12 5v14M5 12h14' />,
  upload: (
    <>
      <path d='M12 16V4m-5 5 5-5 5 5' />
      <path d='M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3' />
    </>
  ),
  trash: <path d='M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13' />,
  chevron: <path d='m6 9 6 6 6-6' />,
  send: (
    <>
      <path d='M21 3 10 14' />
      <path d='m21 3-7 18-4-7-7-4z' />
    </>
  ),
  star: (
    <path d='m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z' />
  ),
  phone: (
    <path d='M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2' />
  ),
  search: (
    <>
      <circle cx='11' cy='11' r='7' />
      <path d='m20 20-3.5-3.5' />
    </>
  ),
  globe: (
    <>
      <circle cx='12' cy='12' r='9' />
      <path d='M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18' />
    </>
  ),
  sparkle: (
    <path d='M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z' />
  ),
  info: (
    <>
      <circle cx='12' cy='12' r='9' />
      <path d='M12 11v5M12 8h.01' />
    </>
  ),
  mail: (
    <>
      <rect x='3' y='5' width='18' height='14' rx='2' />
      <path d='m3 7 9 6 9-6' />
    </>
  ),
  download: (
    <>
      <path d='M12 4v12m-5-5 5 5 5-5' />
      <path d='M4 20h16' />
    </>
  ),
  eye: (
    <>
      <path d='M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12Z' />
      <circle cx='12' cy='12' r='3' />
    </>
  ),
  bell: (
    <>
      <path d='M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8' />
      <path d='M10 20a2 2 0 0 0 4 0' />
    </>
  ),
  history: (
    <>
      <path d='M3 12a9 9 0 1 0 3-6.7L3 8' />
      <path d='M3 3v5h5M12 7v5l3 2' />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof paths;

export default function Icon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={1.8}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
      focusable='false'
      className={className}
    >
      {paths[name]}
    </svg>
  );
}
