import React from 'react';

export const RasaLogo = ({ className = "w-8 h-8", color = "currentColor" }) => (
    <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        {/* Main R/WiFi Shape */}
        <path
            d="M22 18V82H78V72H36V18H22Z"
            fill={color}
        />
        <path
            d="M44 18V56H78V46H58V18H44Z"
            fill={color}
        />
        <path
            d="M66 18V32H78V18H66Z"
            fill={color}
        />

        {/* Rounded Outer Arcs approximation */}
        <path
            d="M22 18C52.9279 18 78 43.0721 78 74V82H64V74C64 50.804 45.196 32 22 32V18Z"
            fill={color}
        />
        <path
            d="M22 42C39.6731 42 54 56.3269 54 74V82H40V74C40 64.0589 31.9411 56 22 56V42Z"
            fill={color}
        />

        {/* Bottom Right Dot/Semi-circle */}
        <path
            d="M78 82C78 76.4772 82.4772 72 88 72H92V82H78Z"
            fill={color}
        />
    </svg>
);

/**
 * Revised RasaLogo to match screenshot even better
 * It's a vertical bar with three arcs.
 */
export const RasaLogoPrecise = ({ className = "w-8 h-8", color = "currentColor" }) => (
    <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        {/* The vertical spine on the left */}
        <rect x="15" y="15" width="12" height="70" rx="2" fill={color} />

        {/* Top Arc */}
        <path
            d="M27 15H50C69.33 15 85 30.67 85 50V65H73V50C73 37.3 62.7 27 50 27H27V15Z"
            fill={color}
        />

        {/* Middle Arc */}
        <path
            d="M27 38H45C54.9411 38 63 46.0589 63 56V65H51V56C51 52.6863 48.3137 50 45 50H27V38Z"
            fill={color}
        />

        {/* Bottom Segment */}
        <rect x="27" y="60" width="15" height="12" rx="2" fill={color} />

        {/* Bottom Right Semi-Circle/Dot */}
        <path
            d="M75 85C75 79.4772 79.4772 75 85 75C90.5228 75 95 79.4772 95 85H75Z"
            fill={color}
        />
    </svg>
);

export const RasaBrand = () => (
    <div className="flex flex-col items-start">
        <div className="text-[26px] font-black tracking-[-0.02em] text-slate-800 leading-[0.9] uppercase">RASA</div>
        <div className="text-[16px] font-black tracking-[0.2em] text-brand-orange leading-[1] uppercase">WIRELESS</div>
        <div className="flex items-center gap-2 mt-2 w-full">
            <div className="h-[1.5px] bg-brand-orange flex-1 opacity-40"></div>
            <div className="text-[7px] font-black tracking-[0.3em] text-brand-muted uppercase whitespace-nowrap">Wireless Simplified</div>
            <div className="h-[1.5px] bg-brand-orange flex-1 opacity-40"></div>
        </div>
    </div>
);

export const RasaLogoLockup = () => (
    <div className="flex items-center gap-4 bg-white/40 p-3 rounded-2xl border border-white/60 shadow-sm backdrop-blur-sm">
        <div className="bg-brand-orange w-16 h-16 rounded-2xl shadow-xl shadow-brand-orange/30 flex items-center justify-center text-white shrink-0">
            <RasaLogoPrecise className="w-11 h-11" color="white" />
        </div>
        <RasaBrand />
    </div>
);
