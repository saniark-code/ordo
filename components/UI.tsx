
import React from 'react';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({ onClick, children, variant = 'primary', className = '' }) => {
  const base = "px-10 py-5 rounded-full text-sm font-medium transition-all duration-700 ease-[cubic-bezier(0.2, 0.8, 0.2, 1)]";
  const styles = {
    primary: "bg-[#2A2826] text-white hover:opacity-95 active:scale-[0.98] shadow-2xl shadow-black/10 tracking-wide",
    secondary: "bg-white text-[#2A2826] border border-gray-100 hover:bg-gray-50 active:scale-[0.98] shadow-sm tracking-wide",
    ghost: "bg-transparent text-[#2A2826] hover:bg-black/5 active:scale-[0.98] tracking-wide",
  };

  return (
    <button onClick={onClick} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
};

interface CardProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ onClick, children, className = '' }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-[40px] p-8 shadow-sm hover:shadow-xl transition-all duration-1000 cursor-pointer border border-transparent hover:border-gray-50 ${className}`}
    >
      {children}
    </div>
  );
};
