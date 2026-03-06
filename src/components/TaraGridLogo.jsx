import React from 'react';

/**
 * TaraGridLogo
 * Recreates the technical logo grid system design from reference image
 * Night mode greyscale theme with TARA as the central element
 */
const TaraGridLogo = () => {
    return (
        <div className="relative w-full max-w-4xl mx-auto bg-[#0a0a0a] overflow-hidden">
            {/* Main SVG grid system */}
            <svg viewBox="0 0 800 600" className="w-full h-auto">
                <defs>
                    {/* Hatched pattern for measurement blocks */}
                    <pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8">
                        <line x1="0" y1="0" x2="8" y2="8" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
                        <line x1="2" y1="0" x2="10" y2="8" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
                        <line x1="4" y1="0" x2="12" y2="8" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
                    </pattern>
                    
                    {/* Hatched pattern - opposite direction */}
                    <pattern id="hatch-reverse" patternUnits="userSpaceOnUse" width="8" height="8">
                        <line x1="8" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
                        <line x1="6" y1="0" x2="-2" y2="8" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
                        <line x1="4" y1="0" x2="-4" y2="8" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
                    </pattern>

                    {/* Glow filter */}
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>

                {/* Background grid - vertical lines */}
                <g className="opacity-[0.08]">
                    {[...Array(17)].map((_, i) => (
                        <line
                            key={`v-${i}`}
                            x1={50 + i * 50}
                            y1="50"
                            x2={50 + i * 50}
                            y2="550"
                            stroke="rgba(255,255,255,0.3)"
                            strokeWidth="0.5"
                        />
                    ))}
                </g>

                {/* Background grid - horizontal lines */}
                <g className="opacity-[0.08]">
                    {[...Array(11)].map((_, i) => (
                        <line
                            key={`h-${i}`}
                            x1="50"
                            y1={50 + i * 50}
                            x2="750"
                            y2={50 + i * 50}
                            stroke="rgba(255,255,255,0.3)"
                            strokeWidth="0.5"
                        />
                    ))}
                </g>

                {/* Diagonal construction lines */}
                <g className="opacity-[0.15]">
                    {/* Main diagonals for T */}
                    <line x1="200" y1="200" x2="200" y2="400" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
                    <line x1="180" y1="200" x2="220" y2="200" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
                    <line x1="170" y1="190" x2="230" y2="410" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
                    
                    {/* Diagonals for first A */}
                    <line x1="250" y1="400" x2="300" y2="200" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
                    <line x1="350" y1="400" x2="300" y2="200" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
                    <line x1="240" y1="410" x2="310" y2="190" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
                    <line x1="360" y1="410" x2="290" y2="190" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
                    
                    {/* Cross bar for A */}
                    <line x1="265" y1="320" x2="335" y2="320" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
                    <line x1="255" y1="310" x2="345" y2="330" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />

                    {/* Diagonals for second T */}
                    <line x1="400" y1="200" x2="400" y2="400" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
                    <line x1="380" y1="200" x2="420" y2="200" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
                    <line x1="370" y1="190" x2="430" y2="410" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />

                    {/* Diagonals for second A */}
                    <line x1="450" y1="400" x2="500" y2="200" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
                    <line x1="550" y1="400" x2="500" y2="200" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
                    <line x1="440" y1="410" x2="510" y2="190" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
                    <line x1="560" y1="410" x2="490" y2="190" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
                    
                    {/* Cross bar for second A */}
                    <line x1="465" y1="320" x2="535" y2="320" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
                    <line x1="455" y1="310" x2="545" y2="330" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />

                    {/* Extended construction lines */}
                    <line x1="150" y1="150" x2="250" y2="450" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                    <line x1="650" y1="150" x2="550" y2="450" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                    <line x1="200" y1="100" x2="200" y2="500" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                    <line x1="500" y1="100" x2="500" y2="500" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                </g>

                {/* Center dashed line */}
                <line x1="150" y1="305" x2="650" y2="305" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" strokeDasharray="4,4" />

                {/* TARA Letters - filled with semi-transparent white */}
                <g fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5">
                    {/* T */}
                    <path d="M 180 200 L 220 200 L 220 215 L 207.5 215 L 207.5 400 L 192.5 400 L 192.5 215 L 180 215 Z" />
                    
                    {/* First A */}
                    <path d="M 250 400 L 300 200 L 315 200 L 350 400 L 335 400 L 325 360 L 275 360 L 265 400 Z M 285 320 L 300 260 L 315 320 Z" />
                    
                    {/* Second T */}
                    <path d="M 380 200 L 420 200 L 420 215 L 407.5 215 L 407.5 400 L 392.5 400 L 392.5 215 L 380 215 Z" />
                    
                    {/* Second A */}
                    <path d="M 450 400 L 500 200 L 515 200 L 550 400 L 535 400 L 525 360 L 475 360 L 465 400 Z M 485 320 L 500 260 L 515 320 Z" />
                </g>

                {/* Measurement blocks with hatched pattern */}
                {/* Top center block - 4x */}
                <rect x="275" y="160" width="100" height="20" fill="url(#hatch)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
                <text x="325" y="150" textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.5)" fontFamily="monospace">4x</text>

                {/* Top left block - 3x */}
                <rect x="100" y="180" width="20" height="40" fill="url(#hatch-reverse)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" transform="rotate(-30 110 200)" />
                <text x="90" y="190" textAnchor="end" fontSize="12" fill="rgba(255,255,255,0.5)" fontFamily="monospace" transform="rotate(-30 85 195)">3x</text>

                {/* Left side blocks - x */}
                <rect x="130" y="280" width="20" height="20" fill="url(#hatch-reverse)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
                <text x="120" y="295" textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.5)" fontFamily="monospace">x</text>

                <rect x="130" y="380" width="20" height="20" fill="url(#hatch-reverse)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
                <text x="120" y="395" textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.5)" fontFamily="monospace">x</text>

                {/* Top right small blocks - x */}
                <rect x="470" y="170" width="15" height="15" fill="url(#hatch)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" transform="rotate(25 477.5 177.5)" />
                <text x="485" y="160" textAnchor="start" fontSize="10" fill="rgba(255,255,255,0.5)" fontFamily="monospace" transform="rotate(25 490 162)">x</text>

                <rect x="530" y="170" width="15" height="15" fill="url(#hatch)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" transform="rotate(-25 537.5 177.5)" />
                <text x="545" y="160" textAnchor="start" fontSize="10" fill="rgba(255,255,255,0.5)" fontFamily="monospace" transform="rotate(-25 550 162)">x</text>

                {/* Right side block - x */}
                <rect x="650" y="280" width="20" height="20" fill="url(#hatch)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
                <text x="680" y="295" textAnchor="start" fontSize="10" fill="rgba(255,255,255,0.5)" fontFamily="monospace">x</text>

                {/* Bottom center block - x */}
                <rect x="390" y="450" width="20" height="20" fill="url(#hatch)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
                <text x="400" y="480" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.5)" fontFamily="monospace">x</text>

                {/* Angle indicators */}
                {/* Top right angle - 68.2° */}
                <path d="M 520 250 A 60 60 0 0 1 560 220" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
                <line x1="500" y1="250" x2="520" y2="250" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                <line x1="500" y1="250" x2="560" y2="220" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                <text x="545" y="245" fontSize="11" fill="rgba(255,255,255,0.5)" fontFamily="monospace">68.2°</text>

                {/* Bottom right angle - 25.7° */}
                <path d="M 580 400 A 80 80 0 0 1 640 415" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
                <line x1="550" y1="400" x2="580" y2="400" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                <line x1="550" y1="400" x2="640" y2="415" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                <text x="615" y="425" fontSize="11" fill="rgba(255,255,255,0.5)" fontFamily="monospace">25.7°</text>

                {/* Bottom angle - 111.8° */}
                <path d="M 470 420 A 50 50 0 0 1 520 400" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
                <text x="485" y="435" fontSize="11" fill="rgba(255,255,255,0.5)" fontFamily="monospace">111.8°</text>

                {/* Registration mark (®) styled element */}
                <g transform="translate(580, 210)">
                    <circle cx="0" cy="0" r="12" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
                    <text x="0" y="4" textAnchor="middle" fontSize="14" fill="rgba(255,255,255,0.5)" fontFamily="monospace" fontWeight="bold">R</text>
                </g>

                {/* Additional construction lines extending outward */}
                <line x1="200" y1="150" x2="200" y2="100" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                <line x1="500" y1="150" x2="500" y2="100" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                <line x1="150" y1="300" x2="100" y2="300" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                <line x1="650" y1="300" x2="700" y2="300" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
            </svg>
        </div>
    );
};

export default TaraGridLogo;
