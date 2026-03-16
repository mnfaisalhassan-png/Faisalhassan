import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Archive, Users, FileText, Clock, Filter, 
  Search, FileSpreadsheet, File as FileIcon,
  History, Shield, AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Types & Mock Data ---

interface ArchivedElection {
  id: string;
  name: string;
  year: number;
  date: string;
  totalVoters: number;
  turnout: number;
  winner: string;
  status: 'Archived';
}

interface ArchivedVoter {
  id: string;
  idCard: string;
  name: string;
  island: string;
  electionYear: number;
  voted: boolean;
}

interface PastResult {
  id: string;
  electionName: string;
  candidate: string;
  party: string;
  votes: number;
  percentage: number;
  year: number;
}

const MOCK_ELECTIONS: ArchivedElection[] = [
  { id: '1', name: 'Kudafari Council Election 2021', year: 2021, date: '2021-04-10', totalVoters: 1250, turnout: 85.4, winner: 'Ahmed Ali (MDP)', status: 'Archived' },
  { id: '2', name: 'Kudafari Council Election 2017', year: 2017, date: '2017-05-06', totalVoters: 1100, turnout: 78.2, winner: 'Mohamed Rasheed (PPM)', status: 'Archived' },
  { id: '3', name: 'Parliamentary Election 2019', year: 2019, date: '2019-04-06', totalVoters: 1200, turnout: 81.5, winner: 'Ali Hussain (JP)', status: 'Archived' },
];

const MOCK_RESULTS: PastResult[] = [
  { id: '1', electionName: 'Kudafari Council Election 2021', candidate: 'Ahmed Ali', party: 'MDP', votes: 540, percentage: 45.2, year: 2021 },
  { id: '2', electionName: 'Kudafari Council Election 2021', candidate: 'Fathimath Niza', party: 'PPM', votes: 480, percentage: 40.1, year: 2021 },
  { id: '3', electionName: 'Kudafari Council Election 2017', candidate: 'Mohamed Rasheed', party: 'PPM', votes: 450, percentage: 42.5, year: 2017 },
];

const MOCK_VOTERS: ArchivedVoter[] = [
  { id: '1', idCard: 'A000001', name: 'Ibrahim Mohamed', island: 'Kudafari', electionYear: 2021, voted: true },
  { id: '2', idCard: 'A000002', name: 'Aminath Ahmed', island: 'Kudafari', electionYear: 2021, voted: true },
  { id: '3', idCard: 'A000003', name: 'Hassan Ali', island: 'Male', electionYear: 2017, voted: false },
  { id: '4', idCard: 'A000004', name: 'Zahira Hussain', island: 'Kudafari', electionYear: 2019, voted: true },
];

// --- Components ---

const SummaryCard = ({ title, value, icon: Icon, subtext, color }: { title: string, value: string, icon: any, subtext: string, color: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between"
  >
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      <p className="text-xs text-gray-400 mt-2">{subtext}</p>
    </div>
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon className="h-6 w-6 text-white" />
    </div>
  </motion.div>
);

export const HistoricalDataPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'elections' | 'results' | 'voters' | 'notes' | 'logs'>('elections');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // --- Export Functions ---
  const exportToCSV = () => {
    const ws = XLSX.utils.json_to_sheet(activeTab === 'elections' ? MOCK_ELECTIONS : activeTab === 'results' ? MOCK_RESULTS : MOCK_VOTERS);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HistoricalData");
    XLSX.writeFile(wb, `historical_data_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`Historical Data Report - ${activeTab.toUpperCase()}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

    let head: string[][] = [];
    let body: any[][] = [];

    if (activeTab === 'elections') {
        head = [['Name', 'Year', 'Date', 'Voters', 'Turnout', 'Winner']];
        body = MOCK_ELECTIONS.map(e => [e.name, e.year, e.date, e.totalVoters, `${e.turnout}%`, e.winner]);
    } else if (activeTab === 'results') {
        head = [['Election', 'Candidate', 'Party', 'Votes', '%', 'Year']];
        body = MOCK_RESULTS.map(r => [r.electionName, r.candidate, r.party, r.votes, `${r.percentage}%`, r.year]);
    } else if (activeTab === 'voters') {
        head = [['ID Card', 'Name', 'Island', 'Year', 'Voted']];
        body = MOCK_VOTERS.map(v => [v.idCard, v.name, v.island, v.electionYear, v.voted ? 'Yes' : 'No']);
    }

    autoTable(doc, {
        head: head,
        body: body,
        startY: 30,
        theme: 'grid',
        headStyles: { fillColor: [63, 81, 181] }
    });

    doc.save(`historical_report_${activeTab}.pdf`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <History className="mr-3 h-6 w-6 text-indigo-600" />
            Historical Data Archive
          </h1>
          <p className="text-gray-500 mt-1">Access read-only records of past elections, voter registries, and audit logs.</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard 
          title="Archived Elections" 
          value="12" 
          icon={Archive} 
          subtext="Since 2008" 
          color="bg-blue-500" 
        />
        <SummaryCard 
          title="Archived Voters" 
          value="4,520" 
          icon={Users} 
          subtext="Total unique records" 
          color="bg-emerald-500" 
        />
        <SummaryCard 
          title="Archived Reports" 
          value="85" 
          icon={FileText} 
          subtext="PDFs & Spreadsheets" 
          color="bg-purple-500" 
        />
        <SummaryCard 
          title="Last Archive" 
          value="Oct 2023" 
          icon={Clock} 
          subtext="System Auto-Archive" 
          color="bg-amber-500" 
        />
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px] flex flex-col">
        
        {/* Toolbar */}
        <div className="border-b border-gray-200 p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gray-50/50">
            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-200/50 p-1 rounded-lg overflow-x-auto max-w-full">
                {[
                    { id: 'elections', label: 'Archived Elections', icon: Archive },
                    { id: 'results', label: 'Past Results', icon: TrophyIcon },
                    { id: 'voters', label: 'Archived Voters', icon: Users },
                    { id: 'notes', label: 'Campaign Notes', icon: FileText },
                    { id: 'logs', label: 'Audit Logs', icon: Shield },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                            activeTab === tab.id 
                            ? 'bg-white text-indigo-600 shadow-sm' 
                            : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                        }`}
                    >
                        <tab.icon className="h-4 w-4 mr-2" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 w-full lg:w-auto">
                <div className="relative flex-grow lg:flex-grow-0 lg:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                        placeholder="Search records..." 
                        className="pl-9 h-9 bg-white" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select 
                    className="h-9 w-32 bg-white" 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(e.target.value)}
                >
                    <option value="All">All Years</option>
                    <option value="2023">2023</option>
                    <option value="2021">2021</option>
                    <option value="2019">2019</option>
                    <option value="2017">2017</option>
                </Select>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Filter className="h-4 w-4 text-gray-500" />
                </Button>
            </div>
        </div>

        {/* Content */}
        <div className="p-0 flex-grow overflow-auto">
            {activeTab === 'elections' && (
                <Table>
                    <Thead>
                        <tr>
                            <Th>Election Name</Th>
                            <Th>Year</Th>
                            <Th>Date</Th>
                            <Th>Total Voters</Th>
                            <Th>Turnout</Th>
                            <Th>Winner</Th>
                            <Th>Status</Th>
                        </tr>
                    </Thead>
                    <Tbody>
                        {MOCK_ELECTIONS.filter(e => selectedYear === 'All' || e.year.toString() === selectedYear).map((election) => (
                            <tr key={election.id} className="hover:bg-gray-50 transition-colors">
                                <Td className="font-medium text-indigo-600">{election.name}</Td>
                                <Td>{election.year}</Td>
                                <Td>{election.date}</Td>
                                <Td>{election.totalVoters.toLocaleString()}</Td>
                                <Td>
                                    <div className="flex items-center">
                                        <span className="mr-2">{election.turnout}%</span>
                                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${election.turnout}%` }}></div>
                                        </div>
                                    </div>
                                </Td>
                                <Td>{election.winner}</Td>
                                <Td><span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium border border-gray-200">Archived</span></Td>
                            </tr>
                        ))}
                    </Tbody>
                </Table>
            )}

            {activeTab === 'results' && (
                <Table>
                    <Thead>
                        <tr>
                            <Th>Election</Th>
                            <Th>Candidate</Th>
                            <Th>Party</Th>
                            <Th>Votes</Th>
                            <Th>Percentage</Th>
                            <Th>Year</Th>
                        </tr>
                    </Thead>
                    <Tbody>
                        {MOCK_RESULTS.filter(r => selectedYear === 'All' || r.year.toString() === selectedYear).map((result) => (
                            <tr key={result.id} className="hover:bg-gray-50 transition-colors">
                                <Td className="font-medium">{result.electionName}</Td>
                                <Td>{result.candidate}</Td>
                                <Td><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">{result.party}</span></Td>
                                <Td>{result.votes}</Td>
                                <Td>{result.percentage}%</Td>
                                <Td>{result.year}</Td>
                            </tr>
                        ))}
                    </Tbody>
                </Table>
            )}

            {activeTab === 'voters' && (
                <Table>
                    <Thead>
                        <tr>
                            <Th>ID Card</Th>
                            <Th>Full Name</Th>
                            <Th>Island</Th>
                            <Th>Election Year</Th>
                            <Th>Voted Status</Th>
                        </tr>
                    </Thead>
                    <Tbody>
                        {MOCK_VOTERS.filter(v => selectedYear === 'All' || v.electionYear.toString() === selectedYear).map((voter) => (
                            <tr key={voter.id} className="hover:bg-gray-50 transition-colors">
                                <Td className="font-mono text-xs text-gray-500">{voter.idCard}</Td>
                                <Td className="font-medium">{voter.name}</Td>
                                <Td>{voter.island}</Td>
                                <Td>{voter.electionYear}</Td>
                                <Td>
                                    {voter.voted ? (
                                        <span className="flex items-center text-green-600 text-xs font-medium"><div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></div>Voted</span>
                                    ) : (
                                        <span className="flex items-center text-red-500 text-xs font-medium"><div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></div>Did Not Vote</span>
                                    )}
                                </Td>
                            </tr>
                        ))}
                    </Tbody>
                </Table>
            )}

            {(activeTab === 'notes' || activeTab === 'logs') && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <AlertCircle className="h-12 w-12 mb-3 opacity-20" />
                    <p>No archived {activeTab === 'notes' ? 'campaign notes' : 'audit logs'} found for the selected period.</p>
                </div>
            )}
        </div>
        
        {/* Footer / Pagination Mock */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between items-center text-xs text-gray-500">
            <span>Showing 1-10 of 50 records</span>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>Previous</Button>
                <Button variant="outline" size="sm">Next</Button>
            </div>
        </div>
      </div>
    </div>
  );
};

// --- Helper Components for Table ---
const Table = ({ children }: { children: React.ReactNode }) => (
    <table className="min-w-full divide-y divide-gray-200">{children}</table>
);
const Thead = ({ children }: { children: React.ReactNode }) => (
    <thead className="bg-gray-50">{children}</thead>
);
const Tbody = ({ children }: { children: React.ReactNode }) => (
    <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>
);
const Th = ({ children }: { children: React.ReactNode }) => (
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{children}</th>
);
const Td = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-700 ${className}`}>{children}</td>
);

// Missing Icon
const TrophyIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
);
