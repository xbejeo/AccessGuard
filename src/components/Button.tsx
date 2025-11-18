import React from 'react';
type ButtonVariant = 'primary' | 'secondary' | 'success';
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  children: React.ReactNode;
}
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  fullWidth = false,
  children,
  className = '',
  ...props
}) => {
  const baseStyles = 'px-4 py-3 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50';
  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'border border-gray-300 hover:bg-gray-100 text-gray-800 focus:ring-gray-400',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
  };
  const widthStyles = fullWidth ? 'w-full' : '';
  return <button className={`${baseStyles} ${variantStyles[variant]} ${widthStyles} ${className}`} {...props}>
      {children}
    </button>;
};