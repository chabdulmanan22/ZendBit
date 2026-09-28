import React, { useEffect } from 'react';

function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return <div className="toast-notification">{message}</div>;
}

export default Toast;
