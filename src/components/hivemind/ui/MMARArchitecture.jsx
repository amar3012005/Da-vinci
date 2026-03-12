import React from "react";

/**
 * MMARArchitecture - SVG component showing MMAR as CPU-style architecture
 * Adapted from CPU Architecture component
 */
const MMARArchitecture = ({
    className = "",
    width = "100%",
    height = "100%",
    text = "M M A R",
}) => {
    return (
        <svg
            className={`text-white/30 ${className}`}
            width={width}
            height={height}
            viewBox="0 0 200 100"
        >
            {/* Paths */}
            <g
                stroke="currentColor"
                fill="none"
                strokeWidth="0.3"
                strokeDasharray="100 100"
                pathLength="100"
                markerStart="url(#mmar-circle-marker)"
            >
                {/* 1st */}
                <path
                    className="mmar-path"
                    strokeDasharray="100 100"
                    pathLength="100"
                    d="M 10 20 h 79.5 q 5 0 5 5 v 30"
                />
                {/* 2nd */}
                <path
                    className="mmar-path"
                    strokeDasharray="100 100"
                    pathLength="100"
                    d="M 180 10 h -69.7 q -5 0 -5 5 v 30"
                />
                {/* 3rd */}
                <path className="mmar-path" d="M 130 20 v 21.8 q 0 5 -5 5 h -10" />
                {/* 4th */}
                <path className="mmar-path" d="M 170 80 v -21.8 q 0 -5 -5 -5 h -50" />
                {/* 5th */}
                <path
                    className="mmar-path"
                    strokeDasharray="100 100"
                    pathLength="100"
                    d="M 135 65 h 15 q 5 0 5 5 v 10 q 0 5 -5 5 h -39.8 q -5 0 -5 -5 v -20"
                />
                {/* 6th */}
                <path className="mmar-path" d="M 94.8 95 v -36" />
                {/* 7th */}
                <path className="mmar-path" d="M 88 88 v -15 q 0 -5 -5 -5 h -10 q -5 0 -5 -5 v -5 q 0 -5 5 -5 h 14" />
                {/* 8th */}
                <path className="mmar-path" d="M 30 30 h 25 q 5 0 5 5 v 6.5 q 0 5 5 5 h 20" />
            </g>

            {/* Animated Light Particles */}
            <g mask="url(#mmar-mask-1)">
                <circle className="mmar-line mmar-line-1" cx="0" cy="0" r="8" fill="url(#mmar-blue-grad)" />
            </g>
            <g mask="url(#mmar-mask-2)">
                <circle className="mmar-line mmar-line-2" cx="0" cy="0" r="8" fill="url(#mmar-yellow-grad)" />
            </g>
            <g mask="url(#mmar-mask-3)">
                <circle className="mmar-line mmar-line-3" cx="0" cy="0" r="8" fill="url(#mmar-pink-grad)" />
            </g>
            <g mask="url(#mmar-mask-4)">
                <circle className="mmar-line mmar-line-4" cx="0" cy="0" r="8" fill="url(#mmar-white-grad)" />
            </g>
            <g mask="url(#mmar-mask-5)">
                <circle className="mmar-line mmar-line-5" cx="0" cy="0" r="8" fill="url(#mmar-green-grad)" />
            </g>
            <g mask="url(#mmar-mask-6)">
                <circle className="mmar-line mmar-line-6" cx="0" cy="0" r="8" fill="url(#mmar-orange-grad)" />
            </g>
            <g mask="url(#mmar-mask-7)">
                <circle className="mmar-line mmar-line-7" cx="0" cy="0" r="8" fill="url(#mmar-cyan-grad)" />
            </g>
            <g mask="url(#mmar-mask-8)">
                <circle className="mmar-line mmar-line-8" cx="0" cy="0" r="8" fill="url(#mmar-rose-grad)" />
            </g>

            {/* MMAR Core Box */}
            <g>
                {/* Connections */}
                <g fill="url(#mmar-connection-gradient)">
                    <rect x="93" y="37" width="2.5" height="5" rx="0.7" />
                    <rect x="104" y="37" width="2.5" height="5" rx="0.7" />
                    <rect x="116.3" y="44" width="2.5" height="5" rx="0.7" transform="rotate(90 116.25 45.5)" />
                    <rect x="122.8" y="44" width="2.5" height="5" rx="0.7" transform="rotate(90 116.25 45.5)" />
                    <rect x="104" y="16" width="2.5" height="5" rx="0.7" transform="rotate(180 105.25 39.5)" />
                    <rect x="114.5" y="16" width="2.5" height="5" rx="0.7" transform="rotate(180 105.25 39.5)" />
                    <rect x="80" y="-13.6" width="2.5" height="5" rx="0.7" transform="rotate(270 115.25 19.5)" />
                    <rect x="87" y="-13.6" width="2.5" height="5" rx="0.7" transform="rotate(270 115.25 19.5)" />
                </g>
                {/* Main Rectangle */}
                <rect x="85" y="40" width="30" height="20" rx="2" fill="#181818" filter="url(#mmar-shadow)" />
                {/* Text */}
                <text x="87" y="52.5" fontSize="5.5" fill="url(#mmar-text-gradient)" fontWeight="600" letterSpacing="0.08em">
                    {text}
                </text>
            </g>

            {/* Defs */}
            <defs>
                {/* Masks */}
                <mask id="mmar-mask-1"><path d="M 10 20 h 79.5 q 5 0 5 5 v 24" strokeWidth="0.5" stroke="white" /></mask>
                <mask id="mmar-mask-2"><path d="M 180 10 h -69.7 q -5 0 -5 5 v 24" strokeWidth="0.5" stroke="white" /></mask>
                <mask id="mmar-mask-3"><path d="M 130 20 v 21.8 q 0 5 -5 5 h -10" strokeWidth="0.5" stroke="white" /></mask>
                <mask id="mmar-mask-4"><path d="M 170 80 v -21.8 q 0 -5 -5 -5 h -50" strokeWidth="0.5" stroke="white" /></mask>
                <mask id="mmar-mask-5"><path d="M 135 65 h 15 q 5 0 5 5 v 10 q 0 5 -5 5 h -39.8 q -5 0 -5 -5 v -20" strokeWidth="0.5" stroke="white" /></mask>
                <mask id="mmar-mask-6"><path d="M 94.8 95 v -36" strokeWidth="0.5" stroke="white" /></mask>
                <mask id="mmar-mask-7"><path d="M 88 88 v -15 q 0 -5 -5 -5 h -10 q -5 0 -5 -5 v -5 q 0 -5 5 -5 h 14" strokeWidth="0.5" stroke="white" /></mask>
                <mask id="mmar-mask-8"><path d="M 30 30 h 25 q 5 0 5 5 v 6.5 q 0 5 5 5 h 20" strokeWidth="0.5" stroke="white" /></mask>


                {/* Gradients */}
                <radialGradient id="mmar-blue-grad" fx="1">
                    <stop offset="0%" stopColor="#00E8ED" />
                    <stop offset="50%" stopColor="#08F" />
                    <stop offset="100%" stopColor="transparent" />
                </radialGradient>
                <radialGradient id="mmar-yellow-grad" fx="1">
                    <stop offset="0%" stopColor="#FFD800" />
                    <stop offset="50%" stopColor="#FFD800" />
                    <stop offset="100%" stopColor="transparent" />
                </radialGradient>
                <radialGradient id="mmar-pink-grad" fx="1">
                    <stop offset="0%" stopColor="#830CD1" />
                    <stop offset="50%" stopColor="#FF008B" />
                    <stop offset="100%" stopColor="transparent" />
                </radialGradient>
                <radialGradient id="mmar-white-grad" fx="1">
                    <stop offset="0%" stopColor="white" />
                    <stop offset="100%" stopColor="transparent" />
                </radialGradient>
                <radialGradient id="mmar-green-grad" fx="1">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="transparent" />
                </radialGradient>
                <radialGradient id="mmar-orange-grad" fx="1">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="transparent" />
                </radialGradient>
                <radialGradient id="mmar-cyan-grad" fx="1">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="transparent" />
                </radialGradient>
                <radialGradient id="mmar-rose-grad" fx="1">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="transparent" />
                </radialGradient>

                <filter id="mmar-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="1.5" dy="1.5" stdDeviation="1" floodColor="black" floodOpacity="0.3" />
                </filter>

                <marker id="mmar-circle-marker" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="18" markerHeight="18">
                    <circle cx="5" cy="5" r="2" fill="#0a0a0a" stroke="#333" strokeWidth="0.5">
                        <animate attributeName="r" values="0; 3; 2" dur="0.5s" />
                    </circle>
                </marker>

                <linearGradient id="mmar-connection-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F4F4F" />
                    <stop offset="60%" stopColor="#121214" />
                </linearGradient>

                <linearGradient id="mmar-text-gradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#666666">
                        <animate attributeName="offset" values="-2; -1; 0" dur="5s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="25%" stopColor="white">
                        <animate attributeName="offset" values="-1; 0; 1" dur="5s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="50%" stopColor="#666666">
                        <animate attributeName="offset" values="0; 1; 2" dur="5s" repeatCount="indefinite" />
                    </stop>
                </linearGradient>
            </defs>
        </svg>
    );
};

export default MMARArchitecture;
