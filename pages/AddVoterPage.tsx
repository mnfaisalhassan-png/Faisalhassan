import React, { useState, useEffect } from 'react';
import { User, VoterRecord } from '../types';
import { storageService } from '../services/storage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { TagInput } from '../components/ui/TagInput';
import { Search, User as UserIcon, CheckCircle, AlertTriangle, Fingerprint, Map, Phone, StickyNote, Vote, Loader, Check, X } from 'lucide-react';

interface AddVoterPageProps {
  currentUser: User;
}

export const AddVoterPage: React.FC<AddVoterPageProps> = ({ currentUser }) => {
  const [allVoters, setAllVoters] = useState<VoterRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredVoters, setFilteredVoters] = useState<VoterRecord[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedVoter, setSelectedVoter] = useState<VoterRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Form Fields
  const [idCardNumber, setIdCardNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);

  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [idLookupStatus, setIdLookupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    const fetchVoters = async () => {
      const voters = await storageService.getVoters();
      setAllVoters(voters);
    };
    fetchVoters();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const filtered = allVoters.filter(v => 
        v.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.idCardNumber.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredVoters(filtered);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [searchQuery, allVoters]);

  const handleIdCardChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newId = e.target.value;
    setIdCardNumber(newId);

    if (newId.length > 5) { // Example validation
      setIdLookupStatus('loading');
      try {
        const response = await fetch(`https://api.example.com/voter-info/${newId}`);
        if (!response.ok) throw new Error('Voter not found');
        const data = await response.json();
        setFullName(data.fullName || '');
        setAddress(data.address || '');
        setIdLookupStatus('success');
      } catch {
        setIdLookupStatus('error');
      }
    }
  };

  const handleSelectVoter = (voter: VoterRecord) => {
    setSelectedVoter(voter);
    setIdCardNumber(voter.idCardNumber);
    setFullName(voter.fullName);
    setAddress(voter.address);
    setPhoneNumber(voter.phoneNumber || '');
    setHasVoted(voter.hasVoted);
    setNotes(Array.isArray(voter.notes) ? voter.notes : (voter.notes ? [voter.notes] : []));
    setShowForm(true);
    setShowDropdown(false);
    setSearchQuery('');
  };

  const handleConfirmSave = async () => {
    setIsConfirmModalOpen(false);
    if (!selectedVoter) {
      setNotification({ msg: 'No voter selected for update.', type: 'error' });
      return;
    }

    try {
      const updatedVoterData: VoterRecord = {
        ...selectedVoter,
        idCardNumber,
        fullName,
        address,
        phoneNumber,
        hasVoted,
        notes: notes,
        updatedAt: Date.now(),
      };

      await storageService.updateVoter(updatedVoterData);
      await storageService.createAuditLog('update_voter', `Updated voter ${fullName} (${idCardNumber})`, currentUser);
      setNotification({ msg: 'Voter information updated successfully!', type: 'success' });
      setAllVoters(prev => prev.map(v => v.id === updatedVoterData.id ? updatedVoterData : v));

      setTimeout(() => {
        setNotification(null);
        setShowForm(false);
        setSelectedVoter(null);
      }, 2000);

    } catch (error) {
      console.error("Failed to save voter:", error);
      setNotification({ msg: 'Failed to save changes. Please try again.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const FormField = ({ icon: Icon, label, children, className }: { icon: React.ElementType, label: string, children: React.ReactNode, className?: string }) => (
    <div className={className}>
        <label className="flex items-center text-sm font-medium text-gray-500 mb-1"><Icon className="h-4 w-4 mr-2 text-gray-400" />{label}</label>
        {children}
    </div>
  );

  const IdCardInputIcon = () => {
    switch (idLookupStatus) {
      case 'loading': return <Loader className="h-5 w-5 text-gray-400 animate-spin" />;
      case 'success': return <Check className="h-5 w-5 text-green-500" />;
      case 'error': return <X className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
        {notification && (
            <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg flex items-center animate-fade-in ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                {notification.type === 'success' ? <CheckCircle className="h-4 w-4 mr-2"/> : <AlertTriangle className="h-4 w-4 mr-2"/>}
                <span className="text-sm font-medium">{notification.msg}</span>
            </div>
        )}

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Add or Update Voter</h1>
            <p className="text-gray-500 mb-6">Search for an existing voter by name or ID to update their details.</p>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input type="text" placeholder="Search by Name or ID Card..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                {showDropdown && filteredVoters.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                        <ul className="max-h-60 overflow-y-auto">
                            {filteredVoters.map(voter => (
                                <li key={voter.id} onClick={() => handleSelectVoter(voter)} className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
                                    {voter.fullName} ({voter.idCardNumber})
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>

        {showForm && selectedVoter && (
            <div className="mt-6 bg-white p-8 rounded-xl shadow-sm border border-gray-200 animate-fade-in">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Voter Registration Form</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField icon={Fingerprint} label="ID Card" className="md:col-span-2">
                        <div className="relative">
                                                        <Input value={idCardNumber} onChange={handleIdCardChange} readOnly />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2"><IdCardInputIcon /></div>
                        </div>
                    </FormField>
                    <FormField icon={UserIcon} label="Full Name"><Input value={fullName} onChange={e => setFullName(e.target.value)} readOnly /></FormField>
                    <FormField icon={Map} label="Address"><Input value={address} onChange={e => setAddress(e.target.value)} readOnly /></FormField>
                    <FormField icon={Phone} label="Contact"><Input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} readOnly /></FormField>
                    <FormField icon={Vote} label="Voting Status">
                        <div className="flex items-center h-10 px-3 rounded-md border bg-gray-50">
                            <input type="checkbox" id="hasVotedCheckbox" checked={hasVoted} onChange={e => setHasVoted(e.target.checked)} className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                            <label htmlFor="hasVotedCheckbox" className="ml-3 text-sm text-gray-700">Has Voted</label>
                        </div>
                    </FormField>
                    <FormField icon={StickyNote} label="Notepad" className="md:col-span-2">
                        <TagInput value={notes} onChange={setNotes} placeholder="Add a note..."/>
                    </FormField>
                </div>
                <div className="mt-8 flex justify-end gap-3">
                    <Button variant="secondary" onClick={() => { setShowForm(false); setSelectedVoter(null); }}>Cancel</Button>
                    <Button onClick={() => setIsConfirmModalOpen(true)}>Save Changes</Button>
                </div>
            </div>
        )}

        <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Confirm Changes">
            <p className="text-gray-600 mb-6">Are you sure you want to save these changes to the voter's record?</p>
            <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
                <Button onClick={handleConfirmSave}>Confirm</Button>
            </div>
        </Modal>
    </div>
  );
};
