import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * HivemindButton
 * 
 * A button that navigates to hivemind.davinciai.eu
 * Can be placed anywhere in your application.
 * 
 * Usage:
 * import HivemindButton from './components/hivemind/HivemindButton';
 * 
 * <HivemindButton />
 * <HivemindButton variant="primary" />
 * <HivemindButton className="custom-class" />
 */
const HivemindButton = ({ 
  children = 'Go to Hivemind', 
  variant = 'default',
  className = '',
  ...props 
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    // Navigate to hivemind subdomain
    window.location.href = 'https://hivemind.davinciai.eu';
  };

  const baseStyles = 'px-6 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105';
  
  const variants = {
    default: 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/25',
    outline: 'border-2 border-purple-500 text-purple-400 hover:bg-purple-500/10',
    ghost: 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10',
  };

  return (
    <button
      onClick={handleClick}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default HivemindButton;
