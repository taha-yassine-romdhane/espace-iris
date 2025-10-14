import React from 'react';

interface RomCubeLogoProps {
  size?: number;
  className?: string;
}

const RomCubeLogo: React.FC<RomCubeLogoProps> = ({ size = 48, className = "" }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="cubeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor:'#f8f9fa', stopOpacity:1}} />
          <stop offset="100%" style={{stopColor:'#e9ecef', stopOpacity:1}} />
        </linearGradient>
      </defs>
      
      {/* Cube Base */}
      <g transform="translate(24,24)">
        {/* Back faces (darker) */}
        <path
          d="M-8,-8 L8,-8 L12,-4 L-4,-4 Z"
          fill="#6c757d"
          stroke="#000"
          strokeWidth="1.5"
        />
        <path
          d="M8,-8 L8,8 L12,12 L12,-4 Z"
          fill="#495057"
          stroke="#000"
          strokeWidth="1.5"
        />
        
        {/* Front faces (lighter) */}
        <path
          d="M-8,-8 L-8,8 L8,8 L8,-8 Z"
          fill="url(#cubeGradient)"
          stroke="#000"
          strokeWidth="2"
        />
        <path
          d="M-8,8 L8,8 L12,12 L-4,12 Z"
          fill="#dee2e6"
          stroke="#000"
          strokeWidth="1.5"
        />
        <path
          d="M8,-8 L8,8 L12,12 L12,-4 Z"
          fill="#ced4da"
          stroke="#000"
          strokeWidth="1.5"
        />
        
        {/* Corner highlights */}
        <circle cx="-8" cy="-8" r="1" fill="#000" />
        <circle cx="8" cy="-8" r="1" fill="#000" />
        <circle cx="-8" cy="8" r="1" fill="#000" />
        <circle cx="8" cy="8" r="1" fill="#000" />
        
        {/* Center dot for dimension */}
        <circle cx="0" cy="0" r="1.5" fill="#343a40" />
      </g>
    </svg>
  );
};

export default RomCubeLogo;