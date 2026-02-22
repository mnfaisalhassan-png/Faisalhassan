
import React, { useEffect, useState, useMemo } from 'react';
import { storageService } from '../services/storage';
import { VoterRecord, User } from '../types';
import { 
  Flag, Loader, ArrowLeft, Search, MapPin, Phone, 
  Download, FileSpreadsheet, Printer, PieChart, 
  TrendingUp, Users, BarChart3, ChevronRight 
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

interface RegistrarPartyPageProps {
  currentUser: User;
}

interface PartyStat {
  total: number;
  voted: number;
}

// Color mapping for parties to make UI vibrant
const PARTY_THEMES: Record<string, { bg: string, text: string, border: string, from: string, to: string }> = {
    'MDP': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', from: 'from-yellow-400', to: 'to-orange-500' },
    'PPM': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', from: 'from-pink-500', to: 'to-rose-600' },
    'PNC': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', from: 'from-cyan-400', to: 'to-blue-500' },
    'Democrats': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', from: 'from-sky-400', to: 'to-indigo-500' },
    'JP': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', from: 'from-red-500', to: 'to-red-700' },
    'MDA': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', from: 'from-orange-400', to: 'to-red-400' },
    'Adhaalath': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', from: 'from-green-500', to: 'to-emerald-700' },
    'Independent': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', from: 'from-gray-400', to: 'to-gray-600' },
    'Unknown': { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200', from: 'from-gray-300', to: 'to-gray-400' }
};

const DEFAULT_THEME = { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', from: 'from-indigo-400', to: 'to-purple-500' };

export const RegistrarPartyPage: React.FC<RegistrarPartyPageProps> = ({ currentUser }) => {
  const [voters, setVoters] = useState<VoterRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await storageService.getVoters();
        setVoters(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalVoters = voters.length;
  const isStandardUser = currentUser.role === 'user';

  // Stats Calculation
  const partyStats = useMemo(() => {
      return voters.reduce<Record<string, PartyStat>>((acc, curr) => {
        const party = curr.registrarParty || 'Unknown';
        if (!acc[party]) acc[party] = { total: 0, voted: 0 };
        acc[party].total++;
        if (curr.hasVoted) acc[party].voted++;
        return acc;
      }, {});
  }, [voters]);

  const sortedParties = useMemo(() => {
      return (Object.entries(partyStats) as [string, PartyStat][]).sort(([,a], [,b]) => b.total - a.total);
  }, [partyStats]);

  // Leading Party Logic
  const leadingParty = sortedParties.length > 0 ? sortedParties[0] : null;
  const highestTurnoutParty = useMemo(() => {
      let max = { name: '', pct: 0 };
      sortedParties.forEach(([name, stats]) => {
          const pct = stats.total > 0 ? (stats.voted / stats.total) : 0;
          if (pct > max.pct && stats.total > 5) { // Threshold to avoid 1/1 = 100% skew
              max = { name, pct };
          }
      });
      return max;
  }, [sortedParties]);


  // --- DETAILED VIEW LOGIC ---

  // Filter list for the detailed view
  const filteredList = useMemo(() => {
    if (!selectedParty) return [];
    return voters.filter(v => {
        const vParty = v.registrarParty || 'Unknown';
        if (vParty !== selectedParty) return false;
        
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
    });
  }, [selectedParty, voters, searchQuery]);

  // Island Breakdown for Selected Party
  const islandDistribution = useMemo(() => {
      if (!selectedParty) return [];
      const islands: Record<string, number> = {};
      voters.forEach(v => {
          if ((v.registrarParty || 'Unknown') === selectedParty) {
              const island = v.island || 'Unknown';
              islands[island] = (islands[island] || 0) + 1;
          }
      });
      return Object.entries(islands).sort(([,a], [,b]) => b - a);
  }, [selectedParty, voters]);

  // --- EXPORT HANDLERS ---

  const handleExportCSV = () => {
    const headers = ['ID Card', 'Full Name', 'Island', 'Address', 'Phone', 'Status'];
    const csvContent = [
        headers.join(','),
        ...filteredList.map(v => [
            `"${v.idCardNumber}"`,
            `"${v.fullName}"`,
            `"${v.island}"`,
            `"${v.address}"`,
            `"${v.phoneNumber || ''}"`,
            `"${v.hasVoted ? 'Voted' : 'Eligible'}"`
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedParty}_voters.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const tableRows = filteredList.map(v => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px;">${v.idCardNumber}</td>
            <td style="padding: 8px;">${v.fullName}</td>
            <td style="padding: 8px;">${v.island}</td>
            <td style="padding: 8px;">${v.address}</td>
            <td style="padding: 8px;">
                <span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; background-color: ${v.hasVoted ? '#dcfce7' : '#fef9c3'}; color: ${v.hasVoted ? '#166534' : '#854d0e'};">
                    ${v.hasVoted ? 'Voted' : 'Eligible'}
                </span>
            </td>
        </tr>
    `).join('');

    const content = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${selectedParty} List</title>
            <style>body{font-family:sans-serif;padding:20px}h1{margin-bottom:10px}table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;padding:8px;background-color:#f3f4f6;border-bottom:2px solid #ccc}td{color:#333}</style>
        </head>
        <body>
            <h1>${selectedParty} Members</h1>
            <table><thead><tr><th>ID</th><th>Name</th><th>Island</th><th>Address</th><th>Status</th></tr></thead><tbody>${tableRows}</tbody></table>
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
    setIsExportMenuOpen(false);
  };

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-full min-h-[50vh]">
            <Loader className="h-8 w-8 animate-spin text-primary-600" />
            <span className="ml-3 text-gray-500">Analyzing Registry...</span>
        </div>
    );
  }

  // --- VIEW: DETAILED LIST ---
  if (selectedParty) {
      const theme = PARTY_THEMES[selectedParty] || DEFAULT_THEME;
      
      return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center">
                    <button 
                        onClick={() => setSelectedParty(null)}
                        className="mr-4 p-2 rounded-full bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 transition-all shadow-sm group"
                    >
                        <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                            <span className={`inline-block w-3 h-8 rounded-full bg-gradient-to-b ${theme.from} ${theme.to} mr-3`}></span>
                            {selectedParty}
                        </h1>
                        <p className="text-sm text-gray-500 ml-6">
                            Analyzing {filteredList.length} members
                        </p>
                    </div>
                </div>

                {!isStandardUser && (
                    <div className="relative">
                        <Button variant="secondary" onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}>
                            <Download className="h-4 w-4 mr-2" /> Export
                        </Button>
                        {isExportMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsExportMenuOpen(false)}></div>
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200 py-1">
                                    <button onClick={handleExportCSV} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"><FileSpreadsheet className="h-4 w-4 mr-2 text-green-600"/> CSV</button>
                                    <button onClick={handleExportPDF} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"><Printer className="h-4 w-4 mr-2 text-gray-600"/> Print / PDF</button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col: Analytics */}
                <div className="space-y-6">
                     {/* Island Breakdown Chart */}
                     <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
                             <MapPin className="h-4 w-4 mr-2" /> Island Distribution
                        </h3>
                        <div className="space-y-3">
                             {islandDistribution.slice(0, 6).map(([island, count]) => {
                                 const pct = Math.round((count / filteredList.length) * 100);
                                 return (
                                     <div key={island}>
                                         <div className="flex justify-between text-xs mb-1">
                                             <span className="font-medium text-gray-700">{island}</span>
                                             <span className="text-gray-500">{count} ({pct}%)</span>
                                         </div>
                                         <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                             <div className={`h-full bg-gradient-to-r ${theme.from} ${theme.to}`} style={{ width: `${pct}%` }}></div>
                                         </div>
                                     </div>
                                 )
                             })}
                        </div>
                     </div>
                     
                     <div className="bg-gradient-to-br from-indigo-900 to-purple-900 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
                         <div className="relative z-10">
                            <h3 className="text-indigo-200 text-xs font-bold uppercase mb-1">Turnout Status</h3>
                            <div className="text-3xl font-bold mb-4">
                                {Math.round((partyStats[selectedParty].voted / partyStats[selectedParty].total) * 100)}%
                                <span className="text-sm font-normal text-indigo-300 ml-2">have voted</span>
                            </div>
                            <div className="flex gap-4 text-sm">
                                <div>
                                    <div className="text-2xl font-bold">{partyStats[selectedParty].voted}</div>
                                    <div className="text-indigo-300 text-xs">Voted</div>
                                </div>
                                <div className="h-10 w-px bg-white/20"></div>
                                <div>
                                    <div className="text-2xl font-bold">{partyStats[selectedParty].total - partyStats[selectedParty].voted}</div>
                                    <div className="text-indigo-300 text-xs">Pending</div>
                                </div>
                            </div>
                         </div>
                         <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
                             <TrendingUp className="h-32 w-32" />
                         </div>
                     </div>
                </div>

                {/* Right Col: Member List */}
                <div className="lg:col-span-2 flex flex-col h-full">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col h-full min-h-[500px]">
                        <div className="p-4 border-b border-gray-100">
                             <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                <input 
                                    type="text"
                                    className="block w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all"
                                    placeholder={`Search ${selectedParty} members...`}
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                             </div>
                        </div>
                        
                        <div className="flex-1 overflow-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Member</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Island</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-50">
                                    {filteredList.map((voter) => (
                                        <tr key={voter.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{voter.fullName}</div>
                                                    <div className="text-xs text-gray-500 font-mono">{voter.idCardNumber}</div>
                                                    {voter.address && (
                                                        <div className="flex items-center text-xs text-gray-400 mt-0.5">
                                                            <MapPin className="h-3 w-3 mr-1" />{voter.address}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{voter.island}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {voter.hasVoted ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                        Voted
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-800 border border-yellow-200">
                                                        Eligible
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredList.length === 0 && (
                                        <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-400">No members found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // --- VIEW: OVERVIEW DASHBOARD ---
  
  // Calculate Pie Chart Segments (Simple SVG logic)
  let cumulativePercent = 0;
  const pieSegments = sortedParties.map(([party, stats]) => {
      const percent = totalVoters > 0 ? stats.total / totalVoters : 0;
      const start = cumulativePercent;
      cumulativePercent += percent;
      const isLarge = percent > 0.5;
      
      const startX = Math.cos(2 * Math.PI * start) * 100;
      const startY = Math.sin(2 * Math.PI * start) * 100;
      const endX = Math.cos(2 * Math.PI * cumulativePercent) * 100;
      const endY = Math.sin(2 * Math.PI * cumulativePercent) * 100;

      // SVG Path command
      const pathData = totalVoters > 0 && percent < 1
        ? `M 0 0 L ${startX} ${startY} A 100 100 0 ${isLarge ? 1 : 0} 1 ${endX} ${endY} Z`
        : percent === 1 ? `M 0 0 m -100, 0 a 100,100 0 1,0 200,0 a 100,100 0 1,0 -200,0` : ''; // Handle 100% case or segments

      const theme = PARTY_THEMES[party] || DEFAULT_THEME;
      // Extract color from Tailwind class is hard in runtime JS without mapping, using generic fills based on index/theme
      // Simple Hack: Use a color map or hardcoded colors for SVG fills
      const fill = party === 'MDP' ? '#eab308' : party === 'PPM' ? '#db2777' : party === 'PNC' ? '#06b6d4' : party === 'Independent' ? '#9ca3af' : '#6366f1'; 
      
      return { party, pathData, fill };
  });

  return (
    <div className="space-y-8 animate-fade-in">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <Flag className="mr-3 h-8 w-8 text-primary-600"/>
                    Registrar Distribution
                </h1>
                <p className="text-gray-500 mt-2">Comprehensive breakdown of voters by political affiliation.</p>
            </div>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                {leadingParty && (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 min-w-[160px]">
                        <div className="text-xs text-gray-500 uppercase font-bold mb-1">Leading Party</div>
                        <div className="text-xl font-bold text-gray-900">{leadingParty[0]}</div>
                        <div className="text-xs text-green-600 flex items-center mt-1">
                            <Users className="h-3 w-3 mr-1" />
                            {Math.round((leadingParty[1].total / totalVoters) * 100)}% Share
                        </div>
                    </div>
                )}
                {highestTurnoutParty && (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 min-w-[160px]">
                         <div className="text-xs text-gray-500 uppercase font-bold mb-1">Highest Turnout</div>
                         <div className="text-xl font-bold text-gray-900">{highestTurnoutParty.name}</div>
                         <div className="text-xs text-blue-600 flex items-center mt-1">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {Math.round(highestTurnoutParty.pct * 100)}% Voted
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left: Visual Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col items-center justify-center min-h-[400px]">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                    <PieChart className="h-5 w-5 mr-2 text-gray-400" /> Market Share
                </h3>
                
                {/* Custom SVG Pie Chart */}
                <div className="relative w-64 h-64">
                    <svg viewBox="-100 -100 200 200" className="transform -rotate-90 w-full h-full drop-shadow-xl">
                        {pieSegments.map((seg, i) => (
                            <path 
                                key={seg.party} 
                                d={seg.pathData} 
                                fill={seg.fill} 
                                stroke="white" 
                                strokeWidth="2"
                                className="hover:opacity-80 transition-opacity cursor-pointer"
                                onClick={() => setSelectedParty(seg.party)}
                            />
                        ))}
                        {/* Center Hole for Doughnut Effect */}
                        <circle cx="0" cy="0" r="60" fill="white" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-bold text-gray-900">{totalVoters}</span>
                        <span className="text-xs text-gray-500 uppercase tracking-widest">Voters</span>
                    </div>
                </div>

                <div className="mt-8 w-full space-y-2">
                    {sortedParties.slice(0, 5).map(([party], i) => {
                         const color = party === 'MDP' ? 'bg-yellow-500' : party === 'PPM' ? 'bg-pink-600' : party === 'PNC' ? 'bg-cyan-500' : party === 'Independent' ? 'bg-gray-400' : 'bg-indigo-500'; 
                         return (
                             <div key={party} className="flex items-center text-sm">
                                 <span className={`w-3 h-3 rounded-full ${color} mr-2`}></span>
                                 <span className="flex-1 text-gray-600">{party}</span>
                             </div>
                         )
                    })}
                </div>
            </div>

            {/* Right: Party Cards Grid */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sortedParties.map(([party, stats]) => {
                     const theme = PARTY_THEMES[party] || DEFAULT_THEME;
                     const sharePct = totalVoters > 0 ? (stats.total / totalVoters) * 100 : 0;
                     const turnoutPct = stats.total > 0 ? (stats.voted / stats.total) * 100 : 0;

                     return (
                         <div 
                            key={party}
                            onClick={() => { setSelectedParty(party); setSearchQuery(''); }}
                            className={`
                                relative overflow-hidden rounded-2xl p-5 cursor-pointer transition-all duration-300
                                border ${theme.border} bg-white hover:shadow-lg hover:-translate-y-1 group
                            `}
                         >
                            {/* Gradient Background Header */}
                            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${theme.from} ${theme.to} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150`}></div>
                            
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className={`font-bold text-lg ${theme.text}`}>{party}</h3>
                                        <span className="text-xs text-gray-500 font-medium">{stats.total} Registered</span>
                                    </div>
                                    <div className={`h-10 w-10 rounded-full ${theme.bg} flex items-center justify-center ${theme.text} shadow-sm group-hover:scale-110 transition-transform`}>
                                        <Flag className="h-5 w-5" />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between text-xs mb-1 text-gray-500">
                                            <span>Share of Voters</span>
                                            <span>{sharePct.toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                                            <div className={`h-1.5 rounded-full bg-gradient-to-r ${theme.from} ${theme.to}`} style={{width: `${sharePct}%`}}></div>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <div className="flex justify-between text-xs mb-1 text-gray-500">
                                            <span>Turnout</span>
                                            <span>{Math.round(turnoutPct)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                                             <div className="h-1.5 rounded-full bg-gray-400" style={{width: `${turnoutPct}%`}}></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-end text-xs font-medium text-gray-400 group-hover:text-gray-600 transition-colors">
                                    View Details <ChevronRight className="h-3 w-3 ml-1" />
                                </div>
                            </div>
                         </div>
                     );
                })}
            </div>
        </div>
    </div>
  );
};
