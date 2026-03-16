import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  Users, Vote, TrendingUp, MapPin, Filter, 
  FileSpreadsheet, File as FileIcon, ArrowUpRight, ArrowDownRight, Activity 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { storageService } from '../services/storage';
import { VoterRecord } from '../types';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Components ---

const SummaryCard = ({ title, value, subtext, icon: Icon, trend, color }: { title: string, value: string, subtext: string, icon: any, trend?: { value: number, isPositive: boolean }, color: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
        <Icon className={`h-6 w-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      {trend && (
        <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${trend.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {trend.isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
          {Math.abs(trend.value)}%
        </div>
      )}
    </div>
    <div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-xs text-gray-400 mt-2">{subtext}</p>
    </div>
  </motion.div>
);

export const TurnoutAnalyticsPage: React.FC = () => {
  const [voters, setVoters] = useState<VoterRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterIsland, setFilterIsland] = useState<string>('All');
  const [filterGender, setFilterGender] = useState<string>('All');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await storageService.getVoters();
        setVoters(data);
      } catch (error) {
        console.error("Failed to fetch voters", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const allIslands = useMemo(() => {
    const islands = new Set<string>();
    voters.forEach(v => {
      if (v.island?.name) islands.add(v.island.name);
    });
    return Array.from(islands).sort();
  }, [voters]);

  // --- Calculations ---

  const filteredVoters = useMemo(() => {
    return voters.filter(v => {
      if (filterIsland !== 'All' && v.island.name !== filterIsland) return false;
      if (filterGender !== 'All' && v.gender !== filterGender) return false;
      return true;
    });
  }, [voters, filterIsland, filterGender]);

  const stats = useMemo(() => {
    const total = filteredVoters.length;
    const voted = filteredVoters.filter(v => v.hasVoted).length;
    const turnout = total > 0 ? (voted / total) * 100 : 0;

    // Gender Stats
    const maleVoters = filteredVoters.filter(v => v.gender === 'Male');
    const femaleVoters = filteredVoters.filter(v => v.gender === 'Female');
    
    const maleVoted = maleVoters.filter(v => v.hasVoted).length;
    const femaleVoted = femaleVoters.filter(v => v.hasVoted).length;

    const maleTurnout = maleVoters.length > 0 ? (maleVoted / maleVoters.length) * 100 : 0;
    const femaleTurnout = femaleVoters.length > 0 ? (femaleVoted / femaleVoters.length) * 100 : 0;

    // Island Stats
    const islandStats: Record<string, { total: number, voted: number }> = {};
    filteredVoters.forEach(v => {
      const islandName = v.island.name || 'Unknown';
      if (!islandStats[islandName]) islandStats[islandName] = { total: 0, voted: 0 };
      islandStats[islandName].total++;
      if (v.hasVoted) islandStats[islandName].voted++;
    });

    let highestIsland = { name: 'N/A', percentage: 0 };
    Object.entries(islandStats).forEach(([name, stat]) => {
      const percentage = stat.total > 0 ? (stat.voted / stat.total) * 100 : 0;
      if (percentage > highestIsland.percentage) {
        highestIsland = { name, percentage };
      }
    });

    return {
      total,
      voted,
      turnout,
      maleTurnout,
      femaleTurnout,
      highestIsland,
      islandStats
    };
  }, [filteredVoters]);

  // --- Chart Data Preparation ---

  const islandChartData = useMemo(() => {
    return Object.entries(stats.islandStats).map(([name, stat]) => ({
      name,
      Turnout: stat.total > 0 ? parseFloat(((stat.voted / stat.total) * 100).toFixed(1)) : 0,
      Voted: stat.voted,
      Total: stat.total
    })).sort((a, b) => b.Turnout - a.Turnout);
  }, [stats.islandStats]);

  const genderChartData = useMemo(() => {
    const maleVoted = filteredVoters.filter(v => v.gender === 'Male' && v.hasVoted).length;
    const femaleVoted = filteredVoters.filter(v => v.gender === 'Female' && v.hasVoted).length;
    return [
      { name: 'Male', value: maleVoted, color: '#3B82F6' },
      { name: 'Female', value: femaleVoted, color: '#EC4899' }
    ];
  }, [filteredVoters]);

  // Mock Trend Data (since we might not have historical timestamps for all votes in this demo)
  const trendData = [
    { time: '08:00', votes: 120 },
    { time: '10:00', votes: 350 },
    { time: '12:00', votes: 580 },
    { time: '14:00', votes: 720 },
    { time: '16:00', votes: 890 },
    { time: '18:00', votes: 1050 },
  ];

  // --- Export Functions ---

  const exportToCSV = () => {
    const data = [
      ['Metric', 'Value'],
      ['Total Registered Voters', stats.total],
      ['Total Votes Cast', stats.voted],
      ['Overall Turnout', `${stats.turnout.toFixed(2)}%`],
      ['Male Turnout', `${stats.maleTurnout.toFixed(2)}%`],
      ['Female Turnout', `${stats.femaleTurnout.toFixed(2)}%`],
      ['Highest Performing Island', `${stats.highestIsland.name} (${stats.highestIsland.percentage.toFixed(2)}%)`],
      [],
      ['Island', 'Total Voters', 'Votes Cast', 'Turnout %'],
      ...islandChartData.map(i => [i.name, i.Total, i.Voted, `${i.Turnout}%`])
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TurnoutAnalytics");
    XLSX.writeFile(wb, `turnout_analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Turnout Analytics Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

    // Summary Table
    autoTable(doc, {
      startY: 30,
      head: [['Metric', 'Value']],
      body: [
        ['Total Registered Voters', stats.total],
        ['Total Votes Cast', stats.voted],
        ['Overall Turnout', `${stats.turnout.toFixed(2)}%`],
        ['Male Turnout', `${stats.maleTurnout.toFixed(2)}%`],
        ['Female Turnout', `${stats.femaleTurnout.toFixed(2)}%`],
        ['Highest Performing Island', `${stats.highestIsland.name} (${stats.highestIsland.percentage.toFixed(2)}%)`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [63, 81, 181] }
    });

    // Island Table
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Island', 'Total Voters', 'Votes Cast', 'Turnout %']],
      body: islandChartData.map(i => [i.name, i.Total, i.Voted, `${i.Turnout}%`]),
      theme: 'striped',
      headStyles: { fillColor: [63, 81, 181] }
    });

    doc.save("turnout_analytics_report.pdf");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Activity className="mr-3 h-6 w-6 text-indigo-600" />
            Turnout Analytics
          </h1>
          <p className="text-gray-500 mt-1">Real-time insights into voting participation and demographic trends.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV} className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" onClick={exportToPDF} className="flex items-center gap-2">
                <FileIcon className="h-4 w-4" /> Export PDF
            </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
            <Filter className="h-4 w-4" /> Filters:
        </div>
        <Select 
            value={filterIsland} 
            onChange={(e) => setFilterIsland(e.target.value)}
            className="w-40"
        >
            <option value="All">All Islands</option>
            {allIslands.map(island => (
                <option key={island} value={island}>{island}</option>
            ))}
        </Select>
        <Select 
            value={filterGender} 
            onChange={(e) => setFilterGender(e.target.value)}
            className="w-40"
        >
            <option value="All">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
        </Select>
        <div className="ml-auto text-sm text-gray-400">
            Data updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SummaryCard 
          title="Total Registered Voters" 
          value={stats.total.toLocaleString()} 
          subtext="Eligible voters in registry" 
          icon={Users} 
          color="bg-blue-500"
        />
        <SummaryCard 
          title="Total Votes Cast" 
          value={stats.voted.toLocaleString()} 
          subtext="Ballots received so far" 
          icon={Vote} 
          color="bg-indigo-500"
          trend={{ value: 12, isPositive: true }}
        />
        <SummaryCard 
          title="Overall Turnout" 
          value={`${stats.turnout.toFixed(1)}%`} 
          subtext="Percentage of registered voters" 
          icon={TrendingUp} 
          color="bg-emerald-500"
          trend={{ value: 5.2, isPositive: true }}
        />
        <SummaryCard 
          title="Male Turnout" 
          value={`${stats.maleTurnout.toFixed(1)}%`} 
          subtext="Male participation rate" 
          icon={Users} 
          color="bg-cyan-500"
        />
        <SummaryCard 
          title="Female Turnout" 
          value={`${stats.femaleTurnout.toFixed(1)}%`} 
          subtext="Female participation rate" 
          icon={Users} 
          color="bg-pink-500"
        />
        <SummaryCard 
          title="Highest Performing Island" 
          value={stats.highestIsland.name} 
          subtext={`${stats.highestIsland.percentage.toFixed(1)}% turnout rate`} 
          icon={MapPin} 
          color="bg-amber-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Turnout by Island (Bar Chart) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Turnout by Island</h3>
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={islandChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            cursor={{fill: 'transparent'}}
                        />
                        <Legend />
                        <Bar dataKey="Turnout" fill="#4F46E5" name="Turnout %" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Voting Trend (Area Chart) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Voting Trend (Today)</h3>
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorVotes" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="time" />
                        <YAxis />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="votes" stroke="#8884d8" fillOpacity={1} fill="url(#colorVotes)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Gender Distribution (Pie Chart) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Gender Distribution (Voted)</h3>
            <div className="h-80 w-full flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={genderChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {genderChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

      </div>
    </div>
  );
};
