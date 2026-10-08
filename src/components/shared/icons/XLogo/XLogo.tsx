// src/icons/XLogo/XLogo.tsx — the X (formerly Twitter) logo.
import { SVGProps } from "react";

export default function XLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 24 24'
      width='1em'
      height='1em'
      fill='currentColor'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path d='M17.53 3h3.07l-6.7 7.66L21.8 21h-6.17l-4.83-6.32L5.27 21H2.2l7.17-8.2L1.8 3h6.33l4.37 5.78L17.53 3Zm-1.08 16.16h1.7L7.1 4.74H5.28l11.17 14.42Z' />
    </svg>
  );
}
