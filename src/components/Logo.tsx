import React from 'react';
import { Link } from 'react-router-dom';
import { Ticket } from 'lucide-react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export default function Logo({ className = "h-12", showText = true }: LogoProps) {
  return (
    <Link to="/" className={`flex items-center gap-1 sm:gap-2 ${className}`}>
      <div className="relative flex items-center justify-center p-0.5 rounded-lg bg-primary/10 sm:p-2 sm:rounded-xl">
        <Ticket className="h-3.5 w-3.5 text-primary fill-primary/20 sm:h-6 sm:w-6" />
        <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_10px_rgba(255,215,0,0.5)] sm:-top-1 sm:-right-1 sm:h-3 sm:w-3" />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="text-[13px] font-black tracking-tighter text-primary sm:text-xl">
            RIFAS<span className="text-gold">ANGOLA</span>
          </span>
          <span className="text-[6px] font-bold tracking-[0.05em] text-zinc-500 uppercase sm:text-[8px] sm:tracking-[0.2em]">
            Fábio Revoada 046
          </span>
        </div>
      )}
    </Link>
  );
}
