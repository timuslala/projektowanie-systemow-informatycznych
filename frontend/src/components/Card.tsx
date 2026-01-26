import type { ReactNode, FC, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    className?: string;
    title?: string;
    description?: string;
}

export const Card: FC<CardProps> = ({ children, className = '', title, description, ...props }) => {
    return (
        <div className={`card-base p-8 bg-white ${className}`} {...props}>
            {(title || description) && (
                <div className="mb-6">
                    {title && <h3 className="text-2xl font-bold text-slate-900 mb-2">{title}</h3>}
                    {description && <p className="text-slate-500 text-sm">{description}</p>}
                </div>
            )}
            {children}
        </div>
    );
};
