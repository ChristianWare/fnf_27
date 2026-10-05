import { SVGProps } from "react";

export default function Rule(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={1.5}
      strokeLinecap='round'
      {...props}
    >
      <path d='M5 17H19C21 17 22 16 22 14V10C22 8 21 7 19 7H5C3 7 2 8 2 10V14C2 16 3 17 5 17Z' />
      <path d='M18 7V12' />
      <path d='M6 7V11' />
      <path d='M10.05 7L10 12' />
      <path d='M14 7V10' />
    </svg>
  );
}
