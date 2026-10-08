// src/icons/Clock/Clock.tsx
import { SVGProps } from "react";

export default function Clock(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 24 24'
      width='1em'
      height='1em'
      fill='none'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
      className='lucide lucide-clock-icon'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <circle cx={12} cy={12} r={10} />
      <path d='M12 6v6l4 2' />
    </svg>
  );
}
