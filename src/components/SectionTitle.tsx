import React from 'react';
interface SectionTitleProps {
  children: React.ReactNode;
  subtitle?: string;
  className?: string;
}
export const SectionTitle: React.FC<SectionTitleProps> = ({
  children,
  subtitle,
  className = ''
}) => {
  return <div className={`mb-6 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-900">{children}</h2>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>;
};