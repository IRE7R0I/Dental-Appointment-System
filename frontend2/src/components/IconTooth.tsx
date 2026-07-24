import React from 'react';

interface IconToothProps {
  size?: number;
  className?: string;
  fill?: string;
  style?: React.CSSProperties;
}

export function IconTooth({ size = 18, className = '', fill = 'none', style }: IconToothProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M4 8C4 5.5 5.5 4 8 4C9.5 4 11 5 12 6C13 5 14.5 4 16 4C18.5 4 20 5.5 20 8C20 12 18 15 17 18.5C16.8 19.2 16.5 20 15.5 20C14.5 20 14 18 13.5 16.5C13 15 11 15 10.5 16.5C10 18 9.5 20 8.5 20C7.5 20 7.2 19.2 7 18.5C6 15 4 12 4 8Z" />
    </svg>
  );
}
