import React from 'react';
import { PageView } from '../types';
import { FileText, ArrowRight } from 'lucide-react';

interface QuickSummaryPageProps {
  onNavigate: (page: PageView) => void;
}

export const QuickSummaryPage: React.FC<QuickSummaryPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quick Summary</h1>
          <p className="text-gray-500 mt-1">Overview of key election metrics</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="mx-auto h-16 w-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-indigo-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Summary Dashboard</h3>
        <p className="text-gray-500 max-w-md mx-auto mb-6">
          This page provides a quick summary of the election status, including total votes, turnout percentage, and leading candidates.
        </p>
        <button 
          onClick={() => onNavigate('election-overview')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Go to Overview
          <ArrowRight className="ml-2 h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
