import React, { useEffect, useState } from 'react';
import { storageService } from '../services/storage';
import { AuditLog, User } from '../types';
import { RefreshCw, Search, Filter, Download } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuditLogsPageProps {
  currentUser: User;
}

export const AuditLogsPage: React.FC<AuditLogsPageProps> = ({ currentUser }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await storageService.getAuditLogs(100);
      setLogs(data);
    } catch (error) {
      console.error("Failed to fetch audit logs", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.performedByName && log.performedByName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500 mt-1">Track system activities and user actions</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchLogs} 
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh Logs"
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search logs..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                <Filter className="h-4 w-4" />
                Filter
            </button>
        </div>
      </div>

      {/* Data Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    Loading logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Search className="h-8 w-8 mb-2 opacity-20" />
                      <p>No audit logs found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => (
                  <tr 
                    key={log.id || index}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="py-3 px-6 whitespace-nowrap">
                      <span className="font-mono text-xs text-gray-500">{formatDate(log.timestamp)}</span>
                    </td>
                    <td className="py-3 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${log.action.includes('DELETE') ? 'bg-red-100 text-red-800' : 
                          log.action.includes('CREATE') ? 'bg-green-100 text-green-800' : 
                          log.action.includes('UPDATE') ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                          {(log.performedByName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{log.performedByName || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-6">
                      <p className="text-sm text-gray-600 max-w-md truncate group-hover:whitespace-normal group-hover:overflow-visible group-hover:z-10 relative">
                        {log.details}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {!isLoading && filteredLogs.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center">
                <span className="text-xs text-gray-500">Showing {filteredLogs.length} entries</span>
                <div className="flex gap-1">
                    <button className="px-3 py-1 text-xs border border-gray-200 rounded bg-white text-gray-600 disabled:opacity-50" disabled>Previous</button>
                    <button className="px-3 py-1 text-xs border border-gray-200 rounded bg-white text-gray-600 disabled:opacity-50" disabled>Next</button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
