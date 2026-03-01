
import React, { useEffect, useState } from 'react';
import { storageService } from '../services/storage';
import { VoterRecord, User } from '../types';
import { 
  Users, CheckCircle, XCircle, CheckSquare, ShieldCheck,
  Search, ArrowLeft, MapPin, Flag,
  FileText, Download, FileSpreadsheet,
  Star, HeartHandshake, Eye
} from 'lucide-react';

import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { MemberDetailsModal } from '../components/MemberDetailsModal';
import { motion } from 'framer-motion';
import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';





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
    refetchTrigger?: number;
}

export const ElectionOverview: React.FC<ElectionOverviewProps> = ({ currentUser, onVoterClick, refetchTrigger }) => {
  const [voters, setVoters] = useState<VoterRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'seema' | 'shadda' | 'rRois' | 'rfSeema' | 'total' | 'voted' | 'pending' | 'male' | 'female' | 'shafaa' | 'mashey' | 'zuheyru' | 'mahfooz' | 'faiga' | 'jabir' | 'mihana' | 'zahura' | 'zulaikha' | 'sodhiq' | null>(null);
  const [selectedIsland, setSelectedIsland] = useState<string | null>(null);
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Export State
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Admin Config Modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  // Member Details Modal State
  const [isMemberDetailsModalOpen, setIsMemberDetailsModalOpen] = useState(false);
  const [memberDetailsVoterId, setMemberDetailsVoterId] = useState<string | null>(null);

  const handleViewMemberDetails = (voterId: string) => {
    setMemberDetailsVoterId(voterId);
    setIsMemberDetailsModalOpen(true);
  };

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
  }, [refetchTrigger]);

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

  const shafaaStats = calculateCandidateStats(v => v.shfaa);
  const masheyStats = calculateCandidateStats(v => v.mashey);
  const shafaaOverallPct = totalVoters > 0 ? Math.round((shafaaStats.total / totalVoters) * 100) : 0;
  const masheyOverallPct = totalVoters > 0 ? Math.round((masheyStats.total / totalVoters) * 100) : 0;
  
  const zuheyruStats = calculateCandidateStats(v => v.zuheyru);
  const mahfoozStats = calculateCandidateStats(v => v.mahfooz);
  const faigaStats = calculateCandidateStats(v => v.faiga);
  const jabirStats = calculateCandidateStats(v => v.jabir);
  const mihanaStats = calculateCandidateStats(v => v.mihana);
  const zahuraStats = calculateCandidateStats(v => v.zahura);
  const zulaikhaStats = calculateCandidateStats(v => v.zulaikha);
  const sodhiqStats = calculateCandidateStats(v => v.sodhiq);
  
  const zuheyruOverallPct = totalVoters > 0 ? Math.round((zuheyruStats.total / totalVoters) * 100) : 0;
  const mahfoozOverallPct = totalVoters > 0 ? Math.round((mahfoozStats.total / totalVoters) * 100) : 0;
  const faigaOverallPct = totalVoters > 0 ? Math.round((faigaStats.total / totalVoters) * 100) : 0;
  const jabirOverallPct = totalVoters > 0 ? Math.round((jabirStats.total / totalVoters) * 100) : 0;
  const mihanaOverallPct = totalVoters > 0 ? Math.round((mihanaStats.total / totalVoters) * 100) : 0;
  const zahuraOverallPct = totalVoters > 0 ? Math.round((zahuraStats.total / totalVoters) * 100) : 0;
  const zulaikhaOverallPct = totalVoters > 0 ? Math.round((zulaikhaStats.total / totalVoters) * 100) : 0;
  const sodhiqOverallPct = totalVoters > 0 ? Math.round((sodhiqStats.total / totalVoters) * 100) : 0;

  // Group by Island
  const islandStats = voters.reduce((acc, curr) => {
    let islandName = (curr.island || 'Unknown').trim();

    // Normalize N.Kudafari variations to fix duplicates
    // This handles "N. Kudafari", "N.Kudafari ", "n.kudafari", etc.
    if (islandName.toLowerCase().replace(/\s/g, '') === 'n.kudafari') {
        islandName = 'N.Kudafari';
    }

    if (!acc[islandName]) {
      acc[islandName] = { total: 0, voted: 0 };
    }
    acc[islandName].total++;
    if (curr.hasVoted) acc[islandName].voted++;
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
        if (activeFilter === 'shafaa' && !v.shfaa) return false;
        if (activeFilter === 'mashey' && !v.mashey) return false;
        if (activeFilter === 'zuheyru' && !v.zuheyru) return false;
        if (activeFilter === 'mahfooz' && !v.mahfooz) return false;
        if (activeFilter === 'faiga' && !v.faiga) return false;
        if (activeFilter === 'jabir' && !v.jabir) return false;
        if (activeFilter === 'mihana' && !v.mihana) return false;
        if (activeFilter === 'zahura' && !v.zahura) return false;
        if (activeFilter === 'zulaikha' && !v.zulaikha) return false;
        if (activeFilter === 'sodhiq' && !v.sodhiq) return false;
        if (activeFilter === 'male' && v.gender !== 'Male') return false;
        if (activeFilter === 'female' && v.gender !== 'Female') return false;
        if (activeFilter === 'voted' && !v.hasVoted) return false;
        if (activeFilter === 'pending' && v.hasVoted) return false;
    }
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
            (v.fullName && v.fullName.toLowerCase().includes(q)) ||
            (v.idCardNumber && v.idCardNumber.toLowerCase().includes(q)) ||
            (v.island && v.island.name && v.island.name.toLowerCase().includes(q)) ||
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
        case 'shafaa': return { title: 'Shafaa Voters List', icon: <CheckSquare className="mr-2 h-5 w-5 text-teal-600"/> };
        case 'mashey': return { title: 'Mashey Voters List', icon: <CheckSquare className="mr-2 h-5 w-5 text-cyan-600"/> };
        case 'zuheyru': return { title: 'Zuheyru Voters List', icon: <CheckSquare className="mr-2 h-5 w-5 text-blue-600"/> };
        case 'mahfooz': return { title: 'Mahfooz Voters List', icon: <CheckSquare className="mr-2 h-5 w-5 text-green-600"/> };
        case 'faiga': return { title: 'Faiga Voters List', icon: <CheckSquare className="mr-2 h-5 w-5 text-pink-600"/> };
        case 'jabir': return { title: 'Jabir Voters List', icon: <CheckSquare className="mr-2 h-5 w-5 text-purple-600"/> };
        case 'mihana': return { title: 'Mihana Voters List', icon: <CheckSquare className="mr-2 h-5 w-5 text-orange-600"/> };
        case 'zahura': return { title: 'Zahura Voters List', icon: <CheckSquare className="mr-2 h-5 w-5 text-rose-600"/> };
        case 'zulaikha': return { title: 'Zulaikha Voters List', icon: <CheckSquare className="mr-2 h-5 w-5 text-indigo-600"/> };
        case 'sodhiq': return { title: 'Sodhiq Voters List', icon: <CheckSquare className="mr-2 h-5 w-5 text-teal-600"/> };
        case 'male': return { title: 'Male Voters List', icon: <Users className="mr-2 h-5 w-5 text-blue-600"/> };
        case 'female': return { title: 'Female Voters List', icon: <Users className="mr-2 h-5 w-5 text-pink-600"/> };
        case 'total': return { title: 'Total Voters List', icon: <Users className="mr-2 h-5 w-5 text-slate-600"/> };
        case 'voted': return { title: 'Votes Cast List', icon: <CheckCircle className="mr-2 h-5 w-5 text-primary-600"/> };
        case 'pending': return { title: 'Pending Votes List', icon: <XCircle className="mr-2 h-5 w-5 text-red-600"/> };
        default: return { title: 'Voters List', icon: <Users className="mr-2 h-5 w-5 text-gray-600"/> };
    }
  };

  const handleFilterClick = (filter: 'seema' | 'shadda' | 'rRois' | 'rfSeema' | 'total' | 'voted' | 'pending' | 'male' | 'female' | 'shafaa' | 'mashey' | 'zuheyru' | 'mahfooz' | 'faiga' | 'jabir' | 'mihana' | 'zahura' | 'zulaikha' | 'sodhiq') => {
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
                             onChange={e => {
                                 setSearchQuery(e.target.value);
                                 if (!showSearchDropdown) setShowSearchDropdown(true);
                             }}
                             onFocus={() => setShowSearchDropdown(true)}
                             onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                             autoFocus
                         />
                         {showSearchDropdown && searchQuery && filteredList.length > 0 && (
                            <div className="absolute z-30 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                {filteredList.slice(0, 10).map(voter => (
                                    <div
                                        key={voter.id}
                                        className="px-4 py-3 hover:bg-primary-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                        onMouseDown={() => {
                                            if (onVoterClick) onVoterClick(voter.id);
                                            setSearchQuery('');
                                            setShowSearchDropdown(false);
                                        }}
                                    >
                                        <p className="font-semibold text-sm text-gray-800">{voter.fullName}</p>
                                        <p className="text-xs text-gray-500">{voter.idCardNumber} &bull; {voter.address}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/80">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Voter</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
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
                                            <span className="font-medium">{voter.island.name}</span>
                                            <span className="text-xs text-gray-400">{voter.address}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${voter.hasVoted ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                            {voter.hasVoted ? 'Voted' : 'Eligible'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleViewMemberDetails(voter.id);
                                            }}
                                            className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                            title="View Details"
                                        >
                                            <Eye className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Member Details Modal */}
            <MemberDetailsModal
                isOpen={isMemberDetailsModalOpen}
                onClose={() => setIsMemberDetailsModalOpen(false)}
                voterId={memberDetailsVoterId}
            />
        </div>
      );
  }

  // Dashboard View
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
            <motion.h1 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-xl font-bold text-gray-900 tracking-tight"
            >
                N.Kudafari Council Election 2026
            </motion.h1>
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
      <div className="space-y-8">
          {/* General Stats */}
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
          </div>

          {/* People's National Congress */}
          <div>
              <h2 className="text-lg font-bold text-primary-800 mb-4 border-b border-primary-100 pb-2">People's National Congress</h2>
              
              <div className="space-y-6">
                  {/* Council Member */}
                  <div>
                      <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wider flex items-center">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                          Council Member
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
                          {hasPermission('view_metric_candidate_shafaa') && (
                              <StatCard 
                                title="Shafaa Selection (Council Member)" 
                                value={shafaaStats.total} 
                                subValue={`${shafaaOverallPct}%`}
                                icon={CheckSquare} 
                                color="blue" 
                                onClick={() => handleFilterClick('shafaa')}
                              />
                          )}
                          {hasPermission('view_metric_candidate_zuheyru') && (
                              <StatCard 
                                title="Zuheyru Selection (Council Member)" 
                                value={zuheyruStats.total} 
                                subValue={`${zuheyruOverallPct}%`}
                                icon={CheckSquare} 
                                color="blue" 
                                onClick={() => handleFilterClick('zuheyru')}
                              />
                          )}
                      </div>
                  </div>

                  {/* WDC Members */}
                  <div>
                      <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wider flex items-center">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                          WDC Members
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
                          {/* WDC President (Seema) */}
                          {hasPermission('view_metric_candidate_sheema') && (
                              <StatCard 
                                title="Seema Selections (WDC President)" 
                                value={seemaStats.total} 
                                subValue={`${seemaOverallPct}%`}
                                icon={CheckSquare} 
                                color="rose" 
                                onClick={() => handleFilterClick('seema')}
                              />
                          )}
                          {hasPermission('view_metric_candidate_sadiq') && (
                              <StatCard 
                                title="Shadda Selection (WDC Member)" 
                                value={shaddaStats.total} 
                                subValue={`${shaddaOverallPct}%`}
                                icon={ShieldCheck} 
                                color="indigo" 
                                onClick={() => handleFilterClick('shadda')}
                              />
                          )}
                          {hasPermission('view_metric_candidate_mashey') && (
                              <StatCard 
                                title="Mashey Selection (WDC Member)" 
                                value={masheyStats.total} 
                                subValue={`${masheyOverallPct}%`}
                                icon={CheckSquare} 
                                color="green" 
                                onClick={() => handleFilterClick('mashey')}
                              />
                          )}
                      </div>
                  </div>
              </div>
          </div>

          {/* Maldives Development Alliance */}
          <div>
              <h2 className="text-lg font-bold text-primary-800 mb-4 border-b border-primary-100 pb-2">Maldives Development Alliance</h2>
              
              <div className="space-y-6">
                  {/* Council Members */}
                  <div>
                      <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wider flex items-center">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                          Council Members
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
                          {hasPermission('view_metric_candidate_mahfooz') && (
                              <StatCard 
                                title="Mahfooz (Council President)" 
                                value={mahfoozStats.total} 
                                subValue={`${mahfoozOverallPct}%`}
                                icon={CheckSquare} 
                                color="green" 
                                onClick={() => handleFilterClick('mahfooz')}
                              />
                          )}
                          {hasPermission('view_metric_candidate_jabir') && (
                              <StatCard 
                                title="Jabir Selection (Council Member)" 
                                value={jabirStats.total} 
                                subValue={`${jabirOverallPct}%`}
                                icon={CheckSquare} 
                                color="purple" 
                                onClick={() => handleFilterClick('jabir')}
                              />
                          )}
                          {hasPermission('view_metric_candidate_faiga') && (
                              <StatCard 
                                title="Faiga Selection (Council Member)" 
                                value={faigaStats.total} 
                                subValue={`${faigaOverallPct}%`}
                                icon={CheckSquare} 
                                color="pink" 
                                onClick={() => handleFilterClick('faiga')}
                              />
                          )}
                      </div>
                  </div>

                  {/* WDC Members */}
                  <div>
                      <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wider flex items-center">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                          WDC Members
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
                          {hasPermission('view_metric_candidate_mihana') && (
                              <StatCard 
                                title="Mihana Selection (WDC President)" 
                                value={mihanaStats.total} 
                                subValue={`${mihanaOverallPct}%`}
                                icon={CheckSquare} 
                                color="orange" 
                                onClick={() => handleFilterClick('mihana')}
                              />
                          )}
                          {hasPermission('view_metric_candidate_zahura') && (
                              <StatCard 
                                title="Zahura Selection (WDC Member)" 
                                value={zahuraStats.total} 
                                subValue={`${zahuraOverallPct}%`}
                                icon={CheckSquare} 
                                color="rose" 
                                onClick={() => handleFilterClick('zahura')}
                              />
                          )}
                          {hasPermission('view_metric_candidate_zulaikha') && (
                              <StatCard 
                                title="Zulaikha Selection (WDC Member)" 
                                value={zulaikhaStats.total} 
                                subValue={`${zulaikhaOverallPct}%`}
                                icon={CheckSquare} 
                                color="indigo" 
                                onClick={() => handleFilterClick('zulaikha')}
                              />
                          )}
                      </div>
                  </div>
              </div>
          </div>

          {/* Independent */}
          <div>
              <h2 className="text-lg font-bold text-primary-800 mb-4 border-b border-primary-100 pb-2">Independent</h2>
              
              <div className="space-y-6">
                  {/* Council President */}
                  <div>
                      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
                          {hasPermission('view_metric_candidate_sodhiq') && (
                              <StatCard 
                                title="Sodhiq (Council President)" 
                                value={sodhiqStats.total} 
                                subValue={`${sodhiqOverallPct}%`}
                                icon={CheckSquare} 
                                color="teal" 
                                onClick={() => handleFilterClick('sodhiq')}
                              />
                          )}
                      </div>
                  </div>
              </div>
          </div>

          {/* Additional Insights */}
          <div>
              <h2 className="text-lg font-bold text-gray-700 mb-4 border-b border-gray-200 pb-2">Additional Insights</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
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
              </div>
          </div>
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

      {/* Member Details Modal */}
      <MemberDetailsModal
        isOpen={isMemberDetailsModalOpen}
        onClose={() => setIsMemberDetailsModalOpen(false)}
        voterId={memberDetailsVoterId}
      />
    </div>
  );
};
