'use client';

interface DPLogoProps {
    size?: number;
    className?: string;
}

// Clean, simple DP logo with blue gradient
export function DPLogo({ size = 40, className = '' }: DPLogoProps) {
    const width = size * 2;
    const height = size;

    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 80 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="dpBlueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
            </defs>

            {/* D - simple rounded rectangle with cutout */}
            <path
                d="M4 4 L4 36 L18 36 C30 36 36 28 36 20 C36 12 30 4 18 4 L4 4 Z
           M10 10 L16 10 C24 10 28 14 28 20 C28 26 24 30 16 30 L10 30 L10 10 Z"
                fill="url(#dpBlueGradient)"
                fillRule="evenodd"
            />

            {/* P - simple with rounded bowl */}
            <path
                d="M42 4 L42 36 L48 36 L48 24 L58 24 C68 24 74 19 74 13 C74 7 68 4 58 4 L42 4 Z
           M48 10 L56 10 C62 10 66 11 66 13.5 C66 16 62 18 56 18 L48 18 L48 10 Z"
                fill="url(#dpBlueGradient)"
                fillRule="evenodd"
            />
        </svg>
    );
}
