import type { InputHTMLAttributes, FC, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    leftIcon?: ReactNode;
}

export const Input: FC<InputProps> = ({
    label,
    error,
    leftIcon,
    className = '',
    id,
    ...props
}) => {
    return (
        <div className="w-full">
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
                    {label}
                </label>
            )}
            <div className="relative">
                {leftIcon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        {leftIcon}
                    </div>
                )}
                <input
                    id={id}
                    className={`
            w-full bg-white text-slate-900 border border-slate-200 rounded-lg
            focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none
            transition-all duration-200 placeholder-slate-400
            disabled:opacity-50 disabled:cursor-not-allowed
            ${leftIcon ? 'pl-10' : 'px-4'} py-2.5
            ${error ? 'border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
                    {...props}
                />
            </div>
            {error && (
                <p className="mt-1.5 text-sm text-[#ef4444]">{error}</p>
            )}
        </div>
    );
};
