import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { User, Candidate } from '../../../types';
import { storageService } from '../../../services/storage';

interface CandidateProfilePageProps {
  currentUser: User;
}

export const CandidateProfilePage: React.FC<CandidateProfilePageProps> = () => {
  const { id } = useParams<{ id: string }>();
  const [candidate, setCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    const fetchCandidate = async () => {
      if (id) {
        const candidates = await storageService.getCandidates();
        const selectedCandidate = candidates.find(c => c.id === id);
        setCandidate(selectedCandidate || null);
      }
    };
    fetchCandidate();
  }, [id]);

  if (!candidate) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-8">
          <div className="flex items-center space-x-6 mb-8">
            <img 
              className="h-32 w-32 rounded-full object-cover border-4 border-gray-200"
              src={candidate.profile_picture_url || 'https://via.placeholder.com/150'}
              alt={`${candidate.full_name}'s profile picture`}
            />
            <div>
              <h1 className="text-4xl font-bold text-gray-800">{candidate.full_name}</h1>
              <p className="text-xl text-gray-600">{candidate.title?.name || 'N/A'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-200 pt-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Personal Information</h3>
              <div className="space-y-3">
                <p><strong className="w-32 inline-block">Candidate No:</strong> {candidate.candidate_no}</p>
                <p><strong className="w-32 inline-block">ID Card No:</strong> {candidate.id_card_number}</p>
                <p><strong className="w-32 inline-block">Gender:</strong> {candidate.gender}</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Contact & Location</h3>
              <div className="space-y-3">
                <p><strong className="w-32 inline-block">Contact No:</strong> {candidate.contact_no}</p>
                <p><strong className="w-32 inline-block">Address:</strong> {candidate.address}</p>
                <p><strong className="w-32 inline-block">Island:</strong> {candidate.island?.name || 'N/A'}</p>
              </div>
            </div>
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Political Details</h3>
              <div className="space-y-3">
                <p><strong className="w-32 inline-block">Party:</strong> {candidate.represent_party?.name || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};