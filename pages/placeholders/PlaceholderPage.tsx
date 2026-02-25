import React from 'react';

import { PageView } from '../../types';

interface PlaceholderPageProps {
  title: string;
  onNavigate: (page: PageView) => void;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, onNavigate }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h1 className="text-4xl font-bold text-deep-navy mb-4">{title}</h1>
            <p className="text-lg text-gray-600">This page is under construction.</p>
      <button 
        onClick={() => onNavigate('election-overview')}
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Go Back
      </button>
    </div>
  );
};
