import { SVGProps } from "react";

export default function NoControlii(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
      {...props}
    >
      <path d='M3 17.9799L5.54999 17.9899C6.45999 17.9899 7.31 17.5399 7.81 16.7899L14.2 7.20994C14.7 6.45994 15.55 5.99993 16.46 6.00993L21.01 6.02994' />
      <path d='M19 19.98L21 17.98' />
      <path d='M8.89001 8.61993L7.81 7.11993C7.3 6.40993 6.47999 5.98993 5.60999 5.99993L3 6.00994' />
      <path d='M12.97 15.3799L14.19 16.9499C14.7 17.6099 15.5 17.9999 16.34 17.9999L21.01 17.9799' />
      <path d='M21 6.02002L19 4.02002' />
    </svg>
  );
}
