import { SVGProps } from "react";

export default function Hammer(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 16 16'
      fill='currentColor'
      stroke='none'
      {...props}
    >
      <path d='M16 8L13 11L10 10L6 6L5 3L8 0L11 1L15 5L16 8Z' />
      <path d='M0 13L5.08579 7.91418L8.08579 10.9142L3 16L0 13Z' />
    </svg>
  );
}
