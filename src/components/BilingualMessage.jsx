import React from 'react';

/**
 * BilingualMessage Component
 * Render english text only, completely disabling bilingual selectors/toggles
 */
const BilingualMessage = ({ englishText, className = '' }) => {
  return (
    <div className={`bilingual-message ${className}`}>
      <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
        {englishText}
      </div>
    </div>
  );
};

export default BilingualMessage;
