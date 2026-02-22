
import React, { useEffect, useState } from 'react';
import { storageService } from '../services/storage';
import { VoterRecord, User } from '../types';
import { 
  Users, CheckCircle, XCircle, CheckSquare, ShieldCheck,
  Search, ArrowLeft, MapPin, Flag,
  FileText, Download, FileSpreadsheet,
  Star, HeartHandshake
} from 'lucide-react';

import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ... (rest of the imports)

// ... (rest of the component)



// Animated Counter Component
const CountUp: React.FC<{ end: number, duration?: number, className?: string }> = ({ end, duration = 2000, className }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number | null = null;
        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            // Ease out quart
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            
            setCount(Math.floor(easeProgress * end));

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }, [end, duration]);

    return <span className={className}>{count}</span>;
};

interface StatCardProps {
  title: string;
  value: number;
  subValue?: string;
  icon: React.ElementType;
  color: string;
  onClick: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subValue, icon: Icon, color, onClick }) => {
  const colorStyles: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-primary-50 text-primary-600 border-primary-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    purple: 'bg-slate-50 text-slate-600 border-slate-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    pink: 'bg-pink-50 text-pink-600 border-pink-200',
    rose: 'bg-rose-50 text-rose-600 border-rose-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  };
  const style = colorStyles[color] || colorStyles.blue;
  
  return (
    <div onClick={onClick} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between h-full">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wide">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-lg font-bold text-gray-900"><CountUp end={value} /></h3>
            {subValue && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${style}`}>{subValue}</span>}
          </div>
        </div>
        <div className={`p-1.5 rounded-lg ${style} group-hover:scale-110 transition-transform`}>
            <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
};

interface ElectionOverviewProps {
    currentUser: User;
    onVoterClick?: (id: string) => void;
}

export const ElectionOverview: React.FC<ElectionOverviewProps> = ({ currentUser, onVoterClick }) => {
  const [voters, setVoters] = useState<VoterRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'seema' | 'shadda' | 'rRois' | 'rfSeema' | 'imran' | 'total' | 'voted' | 'pending' | 'male' | 'female' | null>(null);
  const [selectedIsland, setSelectedIsland] = useState<string | null>(null);
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Export State
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Admin Config Modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  // --- PERMISSIONS LOGIC ---
  const hasPermission = (perm: string) => {
      // Super Admin/Admin always true
      if (currentUser.role === 'superadmin' || currentUser.role === 'admin' || (currentUser.username || '').toLowerCase() === 'faisalhassan') return true;
      
      // If granular permissions exist, respect them
      if (currentUser.permissions && currentUser.permissions.length > 0) {
          return currentUser.permissions.includes(perm);
      }
      
      // Fallback for backward compatibility (legacy accounts)
      const isStandardUser = currentUser.role === 'user';
      if (['view_metric_total_registered', 'view_metric_votes_cast', 'view_metric_pending_votes'].includes(perm)) return true;
      
      // Candidates/Mamdhoob see everything else by default in legacy mode
      if (!isStandardUser) return true;
      
      return false;
  };

  const fetchData = async () => {
    try {
        const votersData = await storageService.getVoters();
        setVoters(votersData);
    } catch (e) {
        console.error("Error fetching data:", e);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // General Stats
  const totalVoters = voters.length;
  const votedCount = voters.filter(v => v.hasVoted).length;
  const pendingCount = totalVoters - votedCount;
  const percentage = totalVoters > 0 ? Math.round((votedCount / totalVoters) * 100) : 0;

  const maleVotersForSeema = voters.filter(v => v.sheema && v.gender === 'Male').length;
  const femaleVotersForSeema = voters.filter(v => v.sheema && v.gender === 'Female').length;
  const maleVotersForSeemaOverallPct = totalVoters > 0 ? Math.round((maleVotersForSeema / totalVoters) * 100) : 0;
  const femaleVotersForSeemaOverallPct = totalVoters > 0 ? Math.round((femaleVotersForSeema / totalVoters) * 100) : 0;

  // Candidate Stats Logic
  const calculateCandidateStats = (filterFn: (v: VoterRecord) => boolean | undefined) => {
      const group = voters.filter(filterFn);
      const total = group.length;
      const voted = group.filter(v => v.hasVoted).length;
      const pct = total > 0 ? Math.round((voted / total) * 100) : 0;
      return { total, voted, pct };
  };

  const seemaStats = calculateCandidateStats(v => v.sheema);
  const shaddaStats = calculateCandidateStats(v => v.sadiq);
  const rRoisStats = calculateCandidateStats(v => v.rRoshi);
  const rfSeemaStats = calculateCandidateStats(v => v.rRoshi && v.sheema);
  const seemaOverallPct = totalVoters > 0 ? Math.round((seemaStats.total / totalVoters) * 100) : 0;
  const shaddaOverallPct = totalVoters > 0 ? Math.round((shaddaStats.total / totalVoters) * 100) : 0;
  const rRoisOverallPct = totalVoters > 0 ? Math.round((rRoisStats.total / totalVoters) * 100) : 0;
  const rfSeemaOverallPct = totalVoters > 0 ? Math.round((rfSeemaStats.total / totalVoters) * 100) : 0;

  // Group by Island
  const islandStats = voters.reduce((acc, curr) => {
    if (!acc[curr.island]) {
      acc[curr.island] = { total: 0, voted: 0 };
    }
    acc[curr.island].total++;
    if (curr.hasVoted) acc[curr.island].voted++;
    return acc;
  }, {} as Record<string, { total: number; voted: number }>);

  // List View Filter Logic
  const filteredList = voters.filter(v => {
    if (selectedIsland) return v.island === selectedIsland;
    if (selectedParty) return (v.registrarParty || 'Unknown') === selectedParty;
    if (activeFilter) {
        if (activeFilter === 'seema' && !v.sheema) return false;
        if (activeFilter === 'shadda' && !v.sadiq) return false;
        if (activeFilter === 'rRois' && !v.rRoshi) return false;
        if (activeFilter === 'rfSeema' && (!v.rRoshi || !v.sheema)) return false; 
        if (activeFilter === 'imran' && !v.imran) return false;
        if (activeFilter === 'male' && v.gender !== 'Male') return false;
        if (activeFilter === 'female' && v.gender !== 'Female') return false;
        if (activeFilter === 'voted' && !v.hasVoted) return false;
        if (activeFilter === 'pending' && v.hasVoted) return false;
    }
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
            v.fullName.toLowerCase().includes(q) ||
            v.idCardNumber.toLowerCase().includes(q) ||
            v.island.toLowerCase().includes(q) ||
            (v.address && v.address.toLowerCase().includes(q))
        );
    }
    return true;
  }).sort((a, b) => (a.address || '').localeCompare(b.address || ''));

  const getHeaderInfo = () => {
    if (selectedIsland) return { title: `${selectedIsland} Voters`, icon: <MapPin className="mr-2 h-5 w-5 text-primary-600"/> };
    if (selectedParty) return { title: `${selectedParty} Members`, icon: <Flag className="mr-2 h-5 w-5 text-pink-600"/> };
    switch(activeFilter) {
        case 'seema': return { title: 'Seema Voters List', icon: <CheckSquare className="mr-2 h-5 w-5 text-rose-600"/> };
        case 'shadda': return { title: 'Shadda Voters List', icon: <ShieldCheck className="mr-2 h-5 w-5 text-indigo-600"/> };
        case 'rRois': return { title: 'R-Rois Voters List', icon: <Star className="mr-2 h-5 w-5 text-orange-600"/> };
        case 'rfSeema': return { title: 'RF - Seema Voters List', icon: <HeartHandshake className="mr-2 h-5 w-5 text-pink-600"/> };
        case 'imran': return { title: 'Imran Voters List', icon: <CheckSquare className="mr-2 h-5 w-5 text-green-600"/> };
        case 'male': return { title: 'Male Voters List', icon: <Users className="mr-2 h-5 w-5 text-blue-600"/> };
        case 'female': return { title: 'Female Voters List', icon: <Users className="mr-2 h-5 w-5 text-pink-600"/> };
        case 'total': return { title: 'Total Voters List', icon: <Users className="mr-2 h-5 w-5 text-slate-600"/> };
        case 'voted': return { title: 'Votes Cast List', icon: <CheckCircle className="mr-2 h-5 w-5 text-primary-600"/> };
        case 'pending': return { title: 'Pending Votes List', icon: <XCircle className="mr-2 h-5 w-5 text-red-600"/> };
        default: return { title: 'Voters List', icon: <Users className="mr-2 h-5 w-5 text-gray-600"/> };
    }
  };

  const handleFilterClick = (filter: 'seema' | 'shadda' | 'rRois' | 'rfSeema' | 'imran' | 'total' | 'voted' | 'pending' | 'male' | 'female') => {
      setSelectedIsland(null);
      setSelectedParty(null);
      setActiveFilter(filter);
      setTimeout(() => document.getElementById('voter-list')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleExportList = (format: 'excel' | 'pdf') => {
      const data = filteredList.map(v => ({
          'Full Name': v.fullName,
          'ID Card': v.idCardNumber,
          'Gender': v.gender,
          'Island': v.island,
          'Address': v.address,
          'Contact': v.contactNumber || '',
          'Party': v.registrarParty || '',
          'Has Voted': v.hasVoted ? 'Yes' : 'No',
          'Seema': v.sheema ? 'Yes' : 'No',
          'Shadda': v.sadiq ? 'Yes' : 'No',
          'R-Roshi': v.rRoshi ? 'Yes' : 'No',
          'Communicated': v.communicated ? 'Yes' : 'No',
          'Notes': v.notes || ''
      }));

      if (format === 'excel') {
          const ws = utils.json_to_sheet(data);
          const wb = utils.book_new();
          utils.book_append_sheet(wb, ws, 'Voters List');
          writeFile(wb, `Voters_List_${new Date().toISOString().split('T')[0]}.xlsx`);
      } else {
          const doc = new jsPDF('l', 'mm', 'a4');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (doc as any).autoTable({
              head: [Object.keys(data[0])],
              body: data.map(Object.values),
              styles: { fontSize: 8 },
              headStyles: { fillColor: [22, 163, 74] }
          });
          doc.save(`Voters_List_${new Date().toISOString().split('T')[0]}.pdf`);
      }
      setIsExportMenuOpen(false);
  };

  if (isLoading) return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
          <div className="w-16 h-16 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium">Loading Live Data...</p>
      </div>
  );

  // Render List View
  if (activeFilter || selectedIsland || selectedParty) {
      const headerInfo = getHeaderInfo();
      return (
        <div id="voter-list" className="space-y-6 max-w-7xl mx-auto animate-fade-in">
            {/* Header with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center">
                    <button 
                        onClick={() => { setActiveFilter(null); setSelectedIsland(null); setSelectedParty(null); setSearchQuery(''); }}
                        className="mr-6 flex items-center px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium shadow-sm transition-all focus:outline-none"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                            {headerInfo.icon} {headerInfo.title}
                        </h1>
                    </div>
                </div>
                
                <div className="relative">
                    <Button variant="secondary" size="sm" onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} className="text-xs">
                        <Download className="h-3 w-3 mr-1.5" /> Export List
                    </Button>
                    {isExportMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                            <div className="py-1">
                                <button 
                                    onClick={() => handleExportList('excel')} 
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" /> Excel (.xlsx)
                                </button>
                                <button 
                                    onClick={() => handleExportList('pdf')} 
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    <FileText className="h-4 w-4 mr-2 text-red-600" /> PDF (.pdf)
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Glass Table Container */}
            <div className="bg-white/80 backdrop-blur-md shadow-lg rounded-2xl border border-white overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="relative">
                         <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                         <input 
                             type="text"
                             className="block w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                             placeholder="Search in this list..."
                             value={searchQuery}
                             onChange={e => setSearchQuery(e.target.value)}
                             autoFocus
                         />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/80">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Voter</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white/50">
                            {filteredList.map((voter) => (
                                <tr key={voter.id} className="hover:bg-primary-50/50 transition-colors cursor-pointer" onClick={() => onVoterClick && onVoterClick(voter.id)}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-gray-200 to-gray-100 flex items-center justify-center text-gray-600 font-bold mr-3">
                                                {voter.fullName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-gray-900">{voter.fullName}</div>
                                                <div className="text-xs text-gray-500 font-mono">{voter.idCardNumber}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{voter.island}</span>
                                            <span className="text-xs text-gray-400">{voter.address}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${voter.hasVoted ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                            {voter.hasVoted ? 'Voted' : 'Eligible'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      );
  }

  // Dashboard View
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">N.Kudafari Council Election 2026</h1>
            <p className="text-gray-500 flex items-center mt-1">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Live Status
            </p>
        </div>
        <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-black">@{currentUser.username}</span>
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">{currentUser.role}</span>
        </div>
      </div>



      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
          {hasPermission('view_metric_total_registered') && (
              <StatCard 
                title="Total Voters" 
                value={totalVoters} 
                icon={Users} 
                color="purple" 
                onClick={() => handleFilterClick('total')}
              />
          )}
          {hasPermission('view_metric_votes_cast') && (
              <StatCard 
                title="Votes Cast" 
                value={votedCount} 
                subValue={`${percentage}%`} 
                icon={CheckCircle} 
                color="green" 
                onClick={() => handleFilterClick('voted')}
              />
          )}
          {hasPermission('view_metric_pending_votes') && (
              <StatCard 
                title="Pending Votes" 
                value={pendingCount} 
                icon={XCircle} 
                color="red" 
                onClick={() => handleFilterClick('pending')}
              />
          )}
          
          {hasPermission('view_metric_candidate_sheema') && (
              <StatCard 
                title="Seema Selections" 
                value={seemaStats.total} 
                subValue={`${seemaOverallPct}%`}
                icon={CheckSquare} 
                color="rose" 
                onClick={() => handleFilterClick('seema')}
              />
          )}

          {hasPermission('view_metric_total_male_voters') && (
              <StatCard 
                title="Male Voters for Seema" 
                value={maleVotersForSeema} 
                subValue={`${maleVotersForSeemaOverallPct}%`}
                icon={Users} 
                color="blue" 
                onClick={() => handleFilterClick('male')}
              />
          )}

          {hasPermission('view_metric_total_female_voters') && (
              <StatCard 
                title="Female Voters for Seema" 
                value={femaleVotersForSeema} 
                subValue={`${femaleVotersForSeemaOverallPct}%`}
                icon={Users} 
                color="pink" 
                onClick={() => handleFilterClick('female')}
              />
          )}

          {hasPermission('view_metric_candidate_sadiq') && (
              <StatCard 
                title="Shadda Selections" 
                value={shaddaStats.total} 
                subValue={`${shaddaOverallPct}%`}
                icon={ShieldCheck} 
                color="indigo" 
                onClick={() => handleFilterClick('shadda')}
              />
          )}

          {hasPermission('view_metric_r_roshi') && (
              <StatCard 
                title="R-Rois Selections" 
                value={rRoisStats.total} 
                subValue={`${rRoisOverallPct}%`}
                icon={Star} 
                color="orange" 
                onClick={() => handleFilterClick('rRois')}
              />
          )}

          {hasPermission('view_metric_rf_seema') && (
              <StatCard 
                title="RF-Seema Selections" 
                value={rfSeemaStats.total} 
                subValue={`${rfSeemaOverallPct}%`}
                icon={HeartHandshake} 
                color="pink" 
                onClick={() => handleFilterClick('rfSeema')}
              />
          )}
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
           {/* Island List Mini - REMOVED */}
      </div>

      {/* Island Stats Section */}
      {hasPermission('view_metric_island_turnout') && (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
              <MapPin className="h-4 w-4 mr-1.5 text-primary-600" /> 
              Voter Turnout by Island
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(islandStats)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([name, stats]) => {
                      const p = stats.total > 0 ? Math.round((stats.voted / stats.total) * 100) : 0;
                      return (
                          <div 
                              key={name} 
                              className="bg-gray-50 rounded-lg p-2 border border-gray-100 hover:shadow-md transition-all cursor-pointer"
                              onClick={() => { setSelectedIsland(name); setTimeout(() => document.getElementById('voter-list')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
                          >
                              <div className="flex justify-between items-start mb-1">
                                  <span className="font-semibold text-gray-800 truncate pr-1 text-xs" title={name}>{name}</span>
                                  <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${p >= 50 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                      {p}%
                                  </span>
                              </div>
                              <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                  <span>Voted: {stats.voted}</span>
                                  <span>Total: {stats.total}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
                                  <div 
                                      className={`h-full rounded-full ${p >= 50 ? 'bg-green-500' : 'bg-yellow-500'}`} 
                                      style={{ width: `${p}%` }}
                                  ></div>
                              </div>
                          </div>
                      );
                  })}
          </div>
      </div>
      )}

      {/* Admin Election Config Modal */}
      {currentUser.role === 'admin' && (
        <Modal 
            isOpen={isConfigModalOpen} 
            onClose={() => setIsConfigModalOpen(false)}
            title="Configure Election Schedule"
            footer={
                <>
                    <Button variant="secondary" size="sm" onClick={() => setIsConfigModalOpen(false)}>Cancel</Button>
                    <Button size="sm" onClick={() => { /* Logic from prev implementation */ }}>Save Schedule</Button>
                </>
            }
        >
           {/* Config Form Content */}
           <div className="space-y-4">
               <p className="text-sm text-gray-500">Manage the election timeline for the countdown timer.</p>
               <input type="datetime-local" className="w-full border p-2 rounded" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} />
               <input type="datetime-local" className="w-full border p-2 rounded" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} />
           </div>
        </Modal>
      )}
    </div>
  );
};
