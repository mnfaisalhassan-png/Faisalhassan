import React from 'react';
import { Button } from '../components/ui/Button';
import { PageView } from '../types';
import { ArrowLeft, Shield } from 'lucide-react';

interface SecuritySettingsPageProps {
  onNavigate: (page: PageView) => void;
}

export const SecuritySettingsPage: React.FC<SecuritySettingsPageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
            <div className="bg-red-500/10 p-3 rounded-lg">
                <Shield className="h-6 w-6 text-red-500" />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Security Settings</h1>
                <p className="text-gray-500">Manage your account security preferences.</p>
            </div>
        </div>
        <Button variant="secondary" onClick={() => onNavigate('election-overview')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Main
        </Button>
      </div>
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <p className="text-gray-600">This page is under construction. Security options will be available here soon.</p>
      </div>
    </div>
  );
};
