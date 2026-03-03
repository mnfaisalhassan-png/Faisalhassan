import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Vote, TrendingUp, Activity, AlertTriangle, 
  CheckCircle, Clock, ArrowRight, User
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { storageService } from '../services/storage';
import { VoterRecord, Candidate, AuditLog, PageView } from '../types';
import { Button } from '../components/ui/Button';

// --- Types ---

interface QuickSummaryPageProps {
  currentUser: any;
  onNavigate: (page: PageView) => void;
}

// --- Components ---

const KPICard = ({ title, value, subtext, icon: Icon, color, trend }: { title: string, value: string, subtext?: string, icon: any, color: string, trend?: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full relative overflow-hidden"
  >
    <div className={`absolute top-0 right-0 p-4 opacity-10 ${color.replace('bg-', 'text-')}`}>
      <Icon className="h-16 w-16" />
    </div>
    <div className="relative z-10">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
          <Icon className={`h-6 w-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        {trend && (
          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {subtext && <p className="text-xs text-gray-400 mt-2">{subtext}</p>}
    </div>
  </motion.div>
);

const AlertItem = ({ type, message, time }: { type: 'warning' | 'info' | 'critical', message: string, time: string }) => {
  const colors = {
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    critical: 'bg-red-50 text-red-700 border-red-200'
  };
  const icons = {
    warning: AlertTriangle,
    info: CheckCircle,
    critical: AlertTriangle
  };
  const Icon = icons[type];

  return (
    <div className={`flex items-start p-3 rounded-lg border ${colors[type]} mb-3 last:mb-0`}>
      <Icon className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
      <div className="flex-grow">
        <p className="text-sm font-medium">{message}</p>
        <p className="text-xs opacity-70 mt-1">{time}</p>
      </div>
    </div>
  );
};

const ActivityItem = ({ action, user, time }: { action: string, user: string, time: string }) => (
  <div className="flex items-center py-3 border-b border-gray-100 last:border-0">
    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center mr-3 text-gray-500">
      <User className="h-4 w-4" />
    </div>
    <div className="flex-grow">
      <p className="text-sm text-gray-800"><span className="font-medium">{user}</span> {action}</p>
      <p className="text-xs text-gray-400">{time}</p>
    </div>
  </div>
);

export const QuickSummaryPage: React.FC<QuickSummaryPageProps> = ({ currentUser, onNavigate }) => {
  const [voters, setVoters] = useState<VoterRecord[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Candidate Keys Mapping (Must match CandidatePerformancePage)
  const CANDIDATE_KEYS = [
    { key: 'sheema', label: 'Seema Adam', party: "People's National Congress" },
    { key: 'shfaa', label: 'Aishath Shafaza', party: "People's National Congress" },
    { key: 'mashey', label: 'Aishath Masheea', party: "People's National Congress" },
    { key: 'zuheyru', label: 'Mohamed Yoonus', party: "People's National Congress" },
    { key: 'shadda', label: 'Shahudha Mohamed' },
    { key: 'mahfooz', label: 'Mahfooz' },
    { key: 'faiga', label: 'Faiga' },
    { key: 'jabir', label: 'Jabir' },
    { key: 'mihana', label: 'Milhana Ibrahim', party: "Maldives Development Alliance" },
    { key: 'zahura', label: 'Zahura' },
    { key: 'zulaikha', label: 'Zulaikha' },
    { key: 'sodhiq', label: 'Sodhiq', party: "Independent" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [votersData, candidatesData, logsData] = await Promise.all([
          storageService.getVoters(),
          storageService.getCandidates(),
          storageService.getAuditLogs(5)
        ]);
        setVoters(votersData);
        setCandidates(candidatesData);
        setAuditLogs(logsData);
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- Calculations ---

  const stats = useMemo(() => {
    const totalVoters = voters.length;
    const votedVoters = voters.filter(v => v.hasVoted);
    const totalVotes = votedVoters.length;
    const turnoutPercentage = totalVoters > 0 ? (totalVotes / totalVoters) * 100 : 0;
    
    const maleVotes = votedVoters.filter(v => v.gender === 'Male').length;
    const femaleVotes = votedVoters.filter(v => v.gender === 'Female').length;

    // Calculate votes per candidate
    const candidateVotes = CANDIDATE_KEYS.map(c => {
      const count = voters.filter(v => (v as any)[c.key] === true).length;
      return {
        name: c.label,
        votes: count,
        key: c.key
      };
    }).sort((a, b) => b.votes - a.votes);

    const leadingCandidate = candidateVotes.length > 0 ? candidateVotes[0] : { name: 'N/A', votes: 0 };

    // Island Turnout
    const islandStats: Record<string, { total: number, voted: number }> = {};
    voters.forEach(v => {
      const islandName = v.island.name || 'Unknown';
      if (!islandStats[islandName]) islandStats[islandName] = { total: 0, voted: 0 };
      islandStats[islandName].total++;
      if (v.hasVoted) islandStats[islandName].voted++;
    });

    const topIslands = Object.entries(islandStats)
      .map(([name, stat]) => ({
        name,
        turnout: stat.total > 0 ? (stat.voted / stat.total) * 100 : 0,
        votes: stat.voted,
        total: stat.total
      }))
      .sort((a, b) => b.turnout - a.turnout)
      .slice(0, 5);

    return {
      totalVoters,
      totalVotes,
      turnoutPercentage,
      maleVotes,
      femaleVotes,
      leadingCandidate,
      candidateVotes,
      topIslands
    };
  }, [voters]);

  // --- Alerts Logic (Mock) ---
  const alerts = useMemo(() => {
    const list = [];
    if (stats.turnoutPercentage < 20) {
      list.push({ type: 'warning', message: 'Low voter turnout detected (< 20%)', time: 'Just now' });
    }
    if (stats.totalVoters === 0) {
      list.push({ type: 'critical', message: 'No voters registered in the system', time: 'System Alert' });
    }
    // Add a generic system alert for demo
    list.push({ type: 'info', message: 'System backup completed successfully', time: '2 hours ago' });
    return list as { type: 'warning' | 'info' | 'critical', message: string, time: string }[];
  }, [stats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Activity className="mr-3 h-6 w-6 text-indigo-600" />
            Quick Summary
          </h1>
          <p className="text-gray-500 mt-1">Real-time snapshot of election performance and system status.</p>
        </div>
        <Button onClick={() => onNavigate('detailed-reports')} className="flex items-center gap-2">
          View Full Reports <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard 
          title="Registered Voters" 
          value={stats.totalVoters.toLocaleString()} 
          icon={Users} 
          color="bg-blue-500" 
        />
        <KPICard 
          title="Votes Cast" 
          value={stats.totalVotes.toLocaleString()} 
          icon={Vote} 
          color="bg-indigo-500" 
          trend="+12% today"
        />
        <KPICard 
          title="Turnout" 
          value={`${stats.turnoutPercentage.toFixed(1)}%`} 
          icon={TrendingUp} 
          color="bg-emerald-500" 
        />
        <KPICard 
          title="Male Votes" 
          value={stats.maleVotes.toLocaleString()} 
          icon={User} 
          color="bg-cyan-500" 
        />
        <KPICard 
          title="Female Votes" 
          value={stats.femaleVotes.toLocaleString()} 
          icon={User} 
          color="bg-pink-500" 
        />
        <KPICard 
          title="Leading Candidate" 
          value={stats.leadingCandidate.name.split(' ')[0]} 
          subtext={`${stats.leadingCandidate.votes} votes`}
          icon={Activity} 
          color="bg-amber-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart Section */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Candidate Performance Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Votes per Candidate</h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.candidateVotes.slice(0, 8)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={60} />
                            <YAxis tick={{fontSize: 12}} />
                            <Tooltip 
                                cursor={{fill: 'transparent'}}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Bar dataKey="votes" fill="#4F46E5" radius={[4, 4, 0, 0]}>
                                {stats.candidateVotes.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#F59E0B' : '#4F46E5'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Island Turnout Table */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Top Island Turnout</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Island</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Votes / Total</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turnout %</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {stats.topIslands.map((island, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{island.name}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{island.votes} / {island.total}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700 font-bold">{island.turnout.toFixed(1)}%</td>
                                    <td className="px-4 py-3">
                                        <div className="w-24 bg-gray-200 rounded-full h-1.5">
                                            <div 
                                                className={`h-1.5 rounded-full ${island.turnout >= 50 ? 'bg-green-500' : 'bg-yellow-500'}`} 
                                                style={{ width: `${island.turnout}%` }}
                                            ></div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* Sidebar Section */}
        <div className="space-y-6">
            
            {/* Turnout Progress */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Overall Turnout</h3>
                <div className="flex items-end gap-2 mb-2">
                    <span className="text-4xl font-bold text-indigo-600">{stats.turnoutPercentage.toFixed(1)}%</span>
                    <span className="text-sm text-gray-500 mb-1">completed</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 mb-4">
                    <div 
                        className="bg-indigo-600 h-3 rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${stats.turnoutPercentage}%` }}
                    ></div>
                </div>
                <p className="text-xs text-gray-500 text-center">Target: 85% turnout by 4:00 PM</p>
            </div>

            {/* System Alerts */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">System Alerts</h3>
                    <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Live</span>
                </div>
                <div className="space-y-3">
                    {alerts.map((alert, idx) => (
                        <AlertItem key={idx} {...alert} />
                    ))}
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
                <div className="max-h-[300px] overflow-y-auto pr-2">
                    {auditLogs.length > 0 ? (
                        auditLogs.map((log) => (
                            <ActivityItem 
                                key={log.id} 
                                action={log.action.replace(/_/g, ' ')} 
                                user={log.performedByName || 'Unknown'} 
                                time={new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                            />
                        ))
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-4">No recent activity recorded.</p>
                    )}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
