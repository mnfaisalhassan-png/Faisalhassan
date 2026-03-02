import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { Users, Trophy, TrendingUp, Vote, Activity, AlertCircle } from 'lucide-react';
import { storageService } from '../services/storage';
import { VoterRecord, Candidate } from '../types';
import { motion } from 'framer-motion';

// Candidate Keys Mapping (from types.ts)
const CANDIDATE_KEYS = [
    { key: 'sheema', label: 'Sheema' },
    { key: 'sadiq', label: 'Sadiq' },
    { key: 'rRoshi', label: 'R-Roshi' },
    { key: 'shfaa', label: 'Shafaa' },
    { key: 'mashey', label: 'Mashey' },
    { key: 'zuheyru', label: 'Zuheyru' },
    { key: 'mahfooz', label: 'Mahfooz' },
    { key: 'faiga', label: 'Faiga' },
    { key: 'jabir', label: 'Jabir' },
    { key: 'mihana', label: 'Mihana' },
    { key: 'zahura', label: 'Zahura' },
    { key: 'zulaikha', label: 'Zulaikha' },
    { key: 'sodhiq', label: 'Sodhiq' },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57', '#ffc0cb', '#f4ca16', '#e91e63'];

interface CandidatePerformancePageProps {
  currentUser: any; // Using any to avoid strict type checking for now, but ideally User
}

export const CandidatePerformancePage: React.FC<CandidatePerformancePageProps> = ({ currentUser }) => {
  const [voters, setVoters] = useState<VoterRecord[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [votersData, candidatesData] = await Promise.all([
          storageService.getVoters(),
          storageService.getCandidates()
        ]);
        setVoters(votersData);
        setCandidates(candidatesData);
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compute Stats
  const stats = useMemo(() => {
    const totalVoters = voters.length;
    const votedCount = voters.filter(v => v.hasVoted).length;
    const turnoutPercentage = totalVoters > 0 ? (votedCount / totalVoters) * 100 : 0;

    // Calculate votes per candidate key
    const candidateVotes = CANDIDATE_KEYS.map(c => {
      const count = voters.filter(v => (v as any)[c.key] === true).length;
      
      // Try to find matching candidate details from DB
      const dbCandidate = candidates.find(cand => 
        cand.full_name.toLowerCase().includes(c.label.toLowerCase()) || 
        cand.full_name.toLowerCase().includes(c.key.toLowerCase())
      );

      return {
        key: c.key,
        name: dbCandidate ? dbCandidate.full_name : c.label,
        party: dbCandidate?.represent_party?.name || 'Unknown',
        votes: count,
        percentage: votedCount > 0 ? (count / votedCount) * 100 : 0,
        photoUrl: dbCandidate?.profile_picture_url
      };
    }).sort((a, b) => b.votes - a.votes);

    const leadingCandidate = candidateVotes.length > 0 ? candidateVotes[0] : null;

    // Party Distribution
    const partyVotes: Record<string, number> = {};
    candidateVotes.forEach(c => {
        if (c.votes > 0) {
            partyVotes[c.party] = (partyVotes[c.party] || 0) + c.votes;
        }
    });
    
    const partyData = Object.entries(partyVotes).map(([name, value]) => ({ name, value }));

    return {
      totalVoters,
      votedCount,
      turnoutPercentage,
      candidateVotes,
      leadingCandidate,
      partyData
    };
  }, [voters, candidates]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Candidate Performance</h1>
            <p className="text-gray-500 text-sm">Real-time analysis of candidate support and voting trends.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-sm font-medium text-gray-600">
            Last Updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg"
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-indigo-100 text-sm font-medium mb-1">Leading Candidate</p>
                    <h3 className="text-2xl font-bold">{stats.leadingCandidate?.name || 'N/A'}</h3>
                    <p className="text-indigo-200 text-xs mt-1">{stats.leadingCandidate?.party}</p>
                </div>
                <div className="bg-white/20 p-2 rounded-lg">
                    <Trophy className="h-6 w-6 text-white" />
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                <div>
                    <span className="text-3xl font-bold">{stats.leadingCandidate?.votes || 0}</span>
                    <span className="text-indigo-200 text-xs ml-2">votes</span>
                </div>
                <div className="text-right">
                    <span className="text-lg font-bold">{stats.leadingCandidate?.percentage.toFixed(1)}%</span>
                    <span className="text-indigo-200 text-xs block">of total cast</span>
                </div>
            </div>
        </motion.div>

        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200"
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">Total Votes Cast</p>
                    <h3 className="text-3xl font-bold text-gray-900">{stats.votedCount}</h3>
                </div>
                <div className="bg-green-100 p-2 rounded-lg">
                    <Vote className="h-6 w-6 text-green-600" />
                </div>
            </div>
            <div className="mt-4">
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${stats.turnoutPercentage}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    <span className="font-bold text-gray-900">{stats.turnoutPercentage.toFixed(1)}%</span> turnout from {stats.totalVoters} registered voters
                </p>
            </div>
        </motion.div>

        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200"
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">Active Candidates</p>
                    <h3 className="text-3xl font-bold text-gray-900">{stats.candidateVotes.length}</h3>
                </div>
                <div className="bg-blue-100 p-2 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                </div>
            </div>
            <div className="mt-4 flex -space-x-2 overflow-hidden">
                {stats.candidateVotes.slice(0, 5).map((c, i) => (
                    <div key={c.key} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 overflow-hidden">
                        {c.photoUrl ? <img src={c.photoUrl} alt={c.name} className="h-full w-full object-cover" /> : c.name.charAt(0)}
                    </div>
                ))}
                {stats.candidateVotes.length > 5 && (
                    <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500">
                        +{stats.candidateVotes.length - 5}
                    </div>
                )}
            </div>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-indigo-600" />
                Vote Distribution by Candidate
            </h3>
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.candidateVotes} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            cursor={{fill: 'transparent'}}
                        />
                        <Bar dataKey="votes" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={20}>
                            {stats.candidateVotes.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
                Party Share
            </h3>
            <div className="h-80 w-full flex items-center justify-center">
                {stats.partyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={stats.partyData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {stats.partyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="text-center text-gray-400">
                        <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>No party data available</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-lg font-bold text-gray-900">Detailed Performance Metrics</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Votes</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Share</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {stats.candidateVotes.map((candidate, index) => (
                        <tr key={candidate.key} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${index < 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                                    {index + 1}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="h-8 w-8 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden mr-3">
                                        {candidate.photoUrl ? (
                                            <img src={candidate.photoUrl} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-gray-400 font-bold text-xs">
                                                {candidate.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-50 text-blue-800">
                                    {candidate.party}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">
                                {candidate.votes}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                {candidate.percentage.toFixed(1)}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="w-24 bg-gray-200 rounded-full h-1.5 mx-auto overflow-hidden">
                                    <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${candidate.percentage}%` }}></div>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};
