import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
      <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" transform="rotate(60 12 12)" />
      <path d="M3 12a9 90 0 1 0 18 0a9 9 0 0 0 -18 0" transform="rotate(120 12 12)" />
    </svg>
  );
}
