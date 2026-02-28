import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { User, VoterRecord } from '../types';
import { storageService } from '../services/storage';
import { Target, Users, Search } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';

interface LiveResultsPageProps {
  currentUser: User;
}

const ProgressBar = ({ label, count, percentage, colorClass, onClick }: { label: string, count: number, percentage: number, colorClass: string, onClick: () => void }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
    <div className="flex justify-between items-center mb-2">
      <h3 className="font-bold text-gray-700">{label}</h3>
      <span className={`font-bold text-lg ${colorClass.replace('bg-', 'text-')}`}>{percentage.toFixed(1)}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
      <div 
        className={`h-4 rounded-full transition-all duration-500 ease-out ${colorClass}`}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
    <p className="text-right text-sm text-gray-500 mt-2">{count} votes</p>
  </div>
);

export const LiveResultsPage: React.FC<LiveResultsPageProps> = () => {
  const [voters, setVoters] = useState<VoterRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{title: string, voters: VoterRecord[]}>({title: '', voters: []});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const voterData = await storageService.getVoters();
        setVoters(voterData);
      } catch (error) {
        console.error("Failed to fetch voters:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const votedVoters = voters.filter(v => v.hasVoted);
    const totalVoted = votedVoters.length;
    const maleVoted = votedVoters.filter(v => v.gender === 'Male');
    const femaleVoted = votedVoters.filter(v => v.gender === 'Female');
    const malePercentage = totalVoted > 0 ? (maleVoted.length / totalVoted) * 100 : 0;
    const femalePercentage = totalVoted > 0 ? (femaleVoted.length / totalVoted) * 100 : 0;
    return { totalVoted, maleVoted, femaleVoted, malePercentage, femalePercentage };
  }, [voters]);

  const openModal = (gender: 'Male' | 'Female') => {
    const filteredVoters = gender === 'Male' ? stats.maleVoted : stats.femaleVoted;
    setModalData({ title: `${gender} Voters`, voters: filteredVoters });
    setIsModalOpen(true);
  };

  const filteredModalVoters = useMemo(() => {
    return modalData.voters.filter(v => 
      (v.fullName && v.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (v.idCardNumber && v.idCardNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (v.island && v.island.name && v.island.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [modalData.voters, searchTerm]);

  if (isLoading) {
    return <div className="text-center p-8">Loading Live Results...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-emerald-green/10 p-3 rounded-lg"><Target className="h-6 w-6 text-emerald-green" /></div>
        <div>
          <motion.h1 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold text-gray-800 flex items-center gap-2"
          >
            Live Election Results
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </motion.h1>
          <p className="text-gray-500">Vote counts are updated automatically. Click on a bar to see details.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProgressBar label="Male Votes" count={stats.maleVoted.length} percentage={stats.malePercentage} colorClass="bg-blue-500" onClick={() => openModal('Male')} />
        <ProgressBar label="Female Votes" count={stats.femaleVoted.length} percentage={stats.femalePercentage} colorClass="bg-pink-500" onClick={() => openModal('Female')} />
      </div>

      <div className="mt-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
        <div>
          <h4 className="text-sm font-medium text-gray-500">Total Votes Cast</h4>
          <p className="text-3xl font-bold text-gray-800">{stats.totalVoted}</p>
        </div>
        <div className="bg-gray-100 p-4 rounded-lg"><Users className="h-8 w-8 text-gray-500" /></div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalData.title}>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input 
            type="text"
            placeholder="Search by Name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
              <tr>
                <th scope="col" className="px-6 py-3">ID Card</th>
                <th scope="col" className="px-6 py-3">Full Name</th>
                <th scope="col" className="px-6 py-3">Address</th>
                <th scope="col" className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredModalVoters.map(voter => (
                <tr key={voter.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{voter.idCardNumber}</td>
                  <td className="px-6 py-4">{voter.fullName}</td>
                  <td className="px-6 py-4">{voter.address}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${voter.hasVoted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {voter.hasVoted ? 'Voted' : 'Eligible'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
};
