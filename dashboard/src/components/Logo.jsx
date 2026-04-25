export default function Logo({ className }) {
  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox="0 0 1024 1024" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Rounded Background */}
      <rect width="1024" height="1024" rx="220" fill="#CC997E" />
      
      {/* Textured overlay (subtle grain) */}
      <filter id="noiseFilter">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.05" />
        </feComponentTransfer>
      </filter>
      <rect width="1024" height="1024" rx="220" filter="url(#noiseFilter)" opacity="0.5" />

      {/* "QI" Typography */}
      <g transform="translate(220, 280)">
        {/* The Q */}
        <path 
          d="M394.5 244.5C394.5 315.745 363.31 379.704 313.388 423.518L405 515L360 560L266.082 466.082C246.336 477.589 224.673 484.5 201.5 484.5C87.9964 484.5 -4.5 376.504 -4.5 244.5C-4.5 112.496 87.9964 4.5 201.5 4.5C315.004 4.5 407.5 112.496 407.5 244.5H394.5ZM115 244.5C115 304.977 153.727 354.5 201.5 354.5C249.273 354.5 288 304.977 288 244.5C288 184.023 249.273 134.5 201.5 134.5C153.727 134.5 115 184.023 115 244.5Z" 
          fill="#1A1A1A"
        />
        {/* The I */}
        <rect x="440" y="5" width="85" height="480" fill="#1A1A1A" />
      </g>
    </svg>
  );
}
