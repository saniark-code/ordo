
import React from 'react';

interface LogoProps {
  animated?: boolean;
  align?: 'chaos' | 'order';
}

export const Logo: React.FC<LogoProps> = ({ animated = false, align = 'order' }) => {
  const lineClasses = "h-[1px] bg-[#333333] rounded-full transition-all duration-1000 ease-ordo";
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${lineClasses} ${align === 'chaos' ? 'w-28 translate-x-2' : 'w-24'}`} />
      <div className={`${lineClasses} ${align === 'chaos' ? 'w-16 -translate-x-4' : 'w-20'}`} />
      <div className={`${lineClasses} ${align === 'chaos' ? 'w-32 translate-x-1' : 'w-16'}`} />
      <div className={`${lineClasses} ${align === 'chaos' ? 'w-14 -translate-x-2' : 'w-12'}`} />
      <div className={`${lineClasses} ${align === 'chaos' ? 'w-20 translate-x-4' : 'w-8'}`} />
    </div>
  );
};
