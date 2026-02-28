import React, { useState, useEffect } from 'react';
import { User, Candidate } from '../../../types';
import { storageService } from '../../../services/storage';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { PlusCircle, Edit, Trash2, Eye, User as UserIcon, Fingerprint, MapPin, Phone, Flag, Briefcase, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { ListManagementModal } from '../../../components/ui/ListManagementModal';

import { filterAndEnsureValidKeys } from '../../../lib/utils';



interface CandidatesPageProps {
  currentUser: User;
}

export const CandidateListPage: React.FC<CandidatesPageProps> = ({ currentUser }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [islands, setIslands] = useState<{ id: string; name: string }[]>([]);
  const [parties, setParties] = useState<{ id: string; name: string }[]>([]);
  const [titles, setTitles] = useState<{ id: string; name: string }[]>([]);
  const [manageListTarget, setManageListTarget] = useState<'island' | 'party' | 'title' | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const hasPermission = React.useCallback((permission: string) => {
    if (currentUser.role === 'superadmin') return true;
    return currentUser.permissions?.includes(permission);
  }, [currentUser]);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      const [candidatesData, islandsData, partiesData, titlesData] = await Promise.all([
        storageService.getCandidates(),
        storageService.getIslands(),
        storageService.getParties(),
        storageService.getTitles(),
      ]);
      console.log('Fetched Candidates:', candidatesData);
      console.log('Fetched Islands:', islandsData);
      console.log('Fetched Parties:', partiesData);
      console.log('Fetched Titles:', titlesData);

      setCandidates(candidatesData);
            setIslands(islandsData);
      setParties(partiesData);
      setTitles(titlesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingCandidate(null);
    setIsModalOpen(true);
  };

  const handleEdit = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setIsModalOpen(true);
  };

  const handleDelete = (candidate: Candidate) => {
    setCandidateToDelete(candidate);
  };

  const filteredCandidates = candidates.filter(candidate =>
    candidate.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleConfirmDelete = async () => {
    if (!candidateToDelete) return;

    try {
      await storageService.deleteCandidate(candidateToDelete);
      fetchCandidates();
      alert(`Successfully deleted candidate: ${candidateToDelete.full_name}`);
    } catch (error: unknown) {
      console.error('Error deleting candidate:', error);
      alert(`Failed to delete candidate. Error: ${(error as Error).message || 'An unknown error occurred.'}`);
    } finally {
      setCandidateToDelete(null);
    }
  };

  const handleSave = async (candidateData: Partial<Candidate>, profilePictureFile: File | null) => {
    if (!hasPermission('action_edit_candidate') && !hasPermission('action_create_candidate')) {
      alert('You do not have permission to save candidates.');
      return;
    }
    try {
      let profilePictureUrl = editingCandidate?.profile_picture_url || '';

      if (profilePictureFile) {
        // This assumes you have an uploadCandidateProfilePicture method in your storageService
        profilePictureUrl = await storageService.uploadCandidateProfilePicture(candidateData.id_card_number || 'new-candidate', profilePictureFile);
      }

      const finalCandidateData = { ...candidateData, profile_picture_url: profilePictureUrl };

      if (editingCandidate) {
        await storageService.updateCandidate(editingCandidate.id, finalCandidateData);
      } else {
        await storageService.createCandidate(finalCandidateData);
      }
      fetchCandidates();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving candidate:', error);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Candidates</h1>
        <div className="w-1/3">
          <Input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {hasPermission('action_create_candidate') && (
          <Button onClick={handleCreateNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Candidate
          </Button>
        )}
      </div>

      {isLoading ? (
        <p>Loading candidates...</p>
      ) : (
        <div className="space-y-8">
          {Object.entries(
            filteredCandidates.reduce((acc, candidate) => {
              const partyName = candidate.represent_party?.name || 'Independent';
              if (!acc[partyName]) acc[partyName] = [];
              acc[partyName].push(candidate);
              return acc;
            }, {} as Record<string, Candidate[]>)
          ).map(([partyName, partyCandidates]) => (
            <div key={partyName} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                  <Flag className="h-5 w-5 mr-2 text-indigo-600" />
                  {partyName}
                  <span className="ml-2 text-xs font-normal text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                    {partyCandidates.length} Candidates
                  </span>
                </h2>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">Photo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Island</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {partyCandidates.map((candidate) => (
                    <tr key={String(candidate.id)} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="h-8 w-8 rounded-full bg-gray-100 overflow-hidden border border-gray-200 flex items-center justify-center">
                            {candidate.profile_picture_url ? (
                                <img src={candidate.profile_picture_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <UserIcon className="h-4 w-4 text-gray-400" />
                            )}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{candidate.candidate_no}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{candidate.full_name}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{candidate.title?.name || ''}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{candidate.island?.name || ''}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{candidate.contact_no}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                            {hasPermission('action_view_candidate') && (
                                <Link to={`/candidates/profile/${candidate.id}`} className="text-gray-400 hover:text-gray-600">
                                    <Eye className="h-4 w-4" />
                                </Link>
                            )}
                            {hasPermission('action_edit_candidate') && (
                                <button onClick={() => handleEdit(candidate)} className="text-indigo-400 hover:text-indigo-600">
                                    <Edit className="h-4 w-4" />
                                </button>
                            )}
                            {hasPermission('action_delete_candidate') && (
                                <button onClick={() => handleDelete(candidate)} className="text-red-400 hover:text-red-600">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {filteredCandidates.length === 0 && (
             <div className="text-center py-10 bg-white rounded-lg shadow">
                <p className="text-gray-500">No candidates found matching your search.</p>
             </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <CandidateForm
          candidate={editingCandidate}
          islands={islands}
          parties={parties}
          titles={titles}
          onSave={handleSave}
          onClose={() => setIsModalOpen(false)}
          onManageList={setManageListTarget}
          canEdit={hasPermission('action_edit_candidate')}
        />
      )}

      {manageListTarget && (
        <ListManagementModal
          target={manageListTarget}
          items={filterAndEnsureValidKeys(manageListTarget === 'island' ? islands : manageListTarget === 'party' ? parties : titles)}
          onClose={() => setManageListTarget(null)}
          onSave={async () => {
            // Refetch all data to ensure lists are up to date
            await fetchCandidates();
            setManageListTarget(null);
          }}
        />
      )}

      {candidateToDelete && (
        <ConfirmationModal
          isOpen={!!candidateToDelete}
          onClose={() => setCandidateToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Confirm Deletion"
          message={`Are you sure you want to delete the candidate "${candidateToDelete.full_name}"? This action cannot be undone.`}
        />
      )}
    </div>
  );
};

interface CandidateFormProps {
  candidate: Candidate | null;
  islands: { id: string; name: string }[];
  parties: { id: string; name: string }[];
  titles: { id: string; name: string }[];
  onSave: (candidateData: Partial<Candidate>, profilePictureFile: File | null) => void;
  onClose: () => void;
  onManageList: (target: 'island' | 'party' | 'title') => void;
  canEdit?: boolean;
}

const FormField = ({ icon: Icon, label, children, className }: { icon: React.ElementType, label: string, children: React.ReactNode, className?: string }) => (
  <div className={className}>
      <label className="flex items-center text-sm font-medium text-gray-500 mb-1"><Icon className="h-4 w-4 mr-2 text-gray-400" />{label}</label>
      {children}
  </div>
);

type FormDataType = Omit<Partial<Candidate>, 'island' | 'represent_party' | 'title'> & {
  island_id: string;
  represent_party_id: string;
  title_id: string;
  total_votes?: number;
};

const CandidateForm: React.FC<CandidateFormProps> = ({ candidate, islands, parties, titles, onSave, onClose, onManageList, canEdit = true }) => {
  const safeParties = filterAndEnsureValidKeys(parties);
  const safeTitles = filterAndEnsureValidKeys(titles);
  const [formData, setFormData] = useState<FormDataType>({
    candidate_no: candidate?.candidate_no?.toString() ?? '',
    id_card_number: candidate?.id_card_number ?? '',
    full_name: candidate?.full_name ?? '',
    gender: candidate?.gender ?? 'Male',
    address: candidate?.address ?? '',
    island_id: candidate?.island?.id || (islands.length > 0 ? islands[0].id : ''),
    contact_no: candidate?.contact_no ?? '',
    represent_party_id: candidate?.represent_party?.id || (parties.length > 0 ? parties[0].id : ''),
    profile_picture_url: candidate?.profile_picture_url ?? '',
    title_id: candidate?.title?.id || (titles.length > 0 ? titles[0].id : ''),
    total_votes: candidate?.total_votes ?? 0,
  });
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(candidate?.profile_picture_url || null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePictureFile(file);
      setProfilePicturePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { candidate_no, island_id, represent_party_id, title_id, total_votes, ...rest } = formData;
    
    const candidateData: Partial<Candidate> = {
        ...rest,
        candidate_no: candidate_no ? parseInt(candidate_no, 10) : undefined,
        total_votes: total_votes ? Number(total_votes) : 0,
        island_id,
        represent_party_id,
        title_id
    };
    onSave(candidateData, profilePictureFile);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={candidate ? 'Edit Candidate' : 'Create New Candidate'} maxWidth="sm:max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        
        <div className="grid grid-cols-12 gap-6">
            {/* Left Column: Profile Picture & Key Identity */}
            <div className="col-span-12 sm:col-span-4 space-y-4">
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="h-28 w-28 rounded-full bg-white overflow-hidden border-4 border-white shadow-md mb-3">
                        {profilePicturePreview ? (
                            <img src={profilePicturePreview} alt="Profile preview" className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-300 bg-gray-100">
                                <UserIcon className="h-12 w-12" />
                            </div>
                        )}
                    </div>
                    <label className="cursor-pointer text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1 rounded-full transition-colors">
                        Change Photo
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                    {profilePictureFile && <span className="text-xs text-gray-400 mt-1 truncate max-w-full">{profilePictureFile.name}</span>}
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                    <FormField icon={Fingerprint} label="Candidate No">
                        <Input name="candidate_no" type="number" value={formData.candidate_no} onChange={handleChange} placeholder="#" className="bg-white" />
                    </FormField>
                    <FormField icon={Fingerprint} label="Total Votes">
                        <Input name="total_votes" type="number" value={formData.total_votes} onChange={handleChange} placeholder="0" className="bg-white" />
                    </FormField>
                </div>
            </div>

            {/* Right Column: Details */}
            <div className="col-span-12 sm:col-span-8 space-y-4">
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center border-b border-gray-100 pb-2">
                        <UserIcon className="h-3 w-3 mr-1.5" /> Personal Details
                    </h3>
                    <div className="space-y-3">
                        <FormField icon={Fingerprint} label="ID Card No">
                            <Input name="id_card_number" value={formData.id_card_number} onChange={handleChange} placeholder="AXXXXXX" className="bg-white" />
                        </FormField>
                        <FormField icon={UserIcon} label="Full Name">
                            <Input name="full_name" value={formData.full_name} onChange={handleChange} required placeholder="Full Name" className="text-lg font-medium" />
                        </FormField>
                        <div className="grid grid-cols-12 gap-3">
                            <div className="col-span-7">
                                <FormField icon={MapPin} label="Address">
                                    <Input name="address" value={formData.address} onChange={handleChange} placeholder="Residential Address" />
                                </FormField>
                            </div>
                            <div className="col-span-5">
                                <FormField icon={MapPin} label="Island">
                                    <div className="flex gap-1">
                                        <Select name="island_id" value={formData.island_id} onChange={handleChange} className="flex-grow">
                                            {islands.map(island => <option key={island.id} value={island.id}>{island.name}</option>)}
                                        </Select>
                                        {canEdit && (
                                            <Button type="button" variant="ghost" size="icon" onClick={() => onManageList('island')} className="h-9 w-9">
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                </FormField>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField icon={UserIcon} label="Gender">
                                <div className="flex items-center space-x-3 mt-1 bg-white p-2 rounded-md border border-gray-200">
                                    <label className="inline-flex items-center cursor-pointer">
                                        <input type="radio" name="gender" value="Male" checked={formData.gender === 'Male'} onChange={handleChange} className="form-radio h-3.5 w-3.5 text-indigo-600" />
                                        <span className="ml-1.5 text-sm text-gray-700">Male</span>
                                    </label>
                                    <label className="inline-flex items-center cursor-pointer">
                                        <input type="radio" name="gender" value="Female" checked={formData.gender === 'Female'} onChange={handleChange} className="form-radio h-3.5 w-3.5 text-pink-600" />
                                        <span className="ml-1.5 text-sm text-gray-700">Female</span>
                                    </label>
                                </div>
                            </FormField>
                            <FormField icon={Phone} label="Contact No">
                                <Input name="contact_no" value={formData.contact_no} onChange={handleChange} placeholder="Phone" />
                            </FormField>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center border-b border-gray-100 pb-2">
                        <Flag className="h-3 w-3 mr-1.5" /> Campaign Info
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        <FormField icon={Flag} label="Represent Party">
                            <div className="flex gap-1">
                                <Select name="represent_party_id" value={formData.represent_party_id} onChange={handleChange} className="flex-grow">
                                    {safeParties.map(party => <option key={party.id} value={party.id}>{party.name}</option>)}
                                </Select>
                                {canEdit && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => onManageList('party')} className="h-9 w-9">
                                        <Edit className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        </FormField>
                        <FormField icon={Briefcase} label="Title / Position">
                            <div className="flex gap-1">
                                <Select name="title_id" value={formData.title_id} onChange={handleChange} className="flex-grow font-medium">
                                    {safeTitles.map(title => <option key={title.id} value={title.id}>{title.name}</option>)}
                                </Select>
                                {canEdit && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => onManageList('title')} className="h-9 w-9">
                                        <Edit className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        </FormField>
                    </div>
                </div>
            </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-2 border-t border-gray-100 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-500/20">
            <Save className="h-4 w-4 mr-2" /> Save Candidate
          </Button>
        </div>
      </form>
    </Modal>
  );
};
