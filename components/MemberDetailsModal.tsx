import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, User, MapPin, Phone, CreditCard, Map } from 'lucide-react';
import { supabase } from '../services/storage';

interface MemberDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  voterId: string | null;
}

interface VoterDBRecord {
  id: string;
  id_card_number: string;
  full_name: string;
  gender: string;
  address: string;
  island: string;
  phone_number: string;
}

export const MemberDetailsModal: React.FC<MemberDetailsModalProps> = ({ isOpen, onClose, voterId }) => {
  const [voter, setVoter] = useState<VoterDBRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchVoterDetails = async () => {
      if (!voterId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('voters')
          .select('*')
          .eq('id', voterId)
          .single();

        if (error) throw error;
        setVoter(data);
      } catch (error) {
        console.error('Error fetching voter details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && voterId) {
      fetchVoterDetails();
    } else {
      setVoter(null);
    }
  }, [isOpen, voterId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-800">Member Details</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 min-h-[300px]">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p className="text-sm">Loading details...</p>
                </div>
              ) : voter ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-1">
                        <CreditCard className="h-3 w-3" /> ID Card
                      </label>
                      <p className="font-mono text-gray-900 font-medium">{voter.id_card_number}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-1">
                        <User className="h-3 w-3" /> Full Name
                      </label>
                      <p className="text-gray-900 font-medium">{voter.full_name}</p>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-1">
                        <User className="h-3 w-3" /> Gender
                      </label>
                      <p className="text-gray-900 font-medium">{voter.gender || '-'}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-1">
                        <MapPin className="h-3 w-3" /> Address
                      </label>
                      <p className="text-gray-900 font-medium">{voter.address}</p>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-1">
                        <Map className="h-3 w-3" /> Island
                      </label>
                      <p className="text-gray-900 font-medium">{voter.island}</p>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-1">
                        <Phone className="h-3 w-3" /> Contact No
                      </label>
                      <p className="text-gray-900 font-medium">{voter.phone_number || '-'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <p>No details found.</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
