import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, VoterRecord } from '../types';
import { storageService } from '../services/storage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TextArea } from '../components/ui/TextArea';
import { Modal } from '../components/ui/Modal';
import { 
  Search, Plus, Save, Trash2, Edit2, 
  CheckCircle, XCircle, MapPin, Filter, 
  User as UserIcon, AlertTriangle, Flag, 
  CheckSquare, Info, Settings, X, ArrowLeft, ChevronRight,
  ShieldCheck, Eye, Terminal, Database, MessageCircle,
  Download, FileSpreadsheet, Printer, Mic, MicOff,
  Home, List, Sparkles, Phone, Award, Fingerprint, Map, StickyNote
} from 'lucide-react';

interface KudafariElectionPageProps {
  currentUser: User;
  initialVoterId?: string | null;
  onClearInitialVoter?: () => void;
}

export const KudafariElectionPage: React.FC<KudafariElectionPageProps> = ({ currentUser, initialVoterId, onClearInitialVoter }) => {
  const [voters, setVoters] = useState<VoterRecord[]>([]);
  const [islands, setIslands] = useState<string[]>([]);
  const [parties, setParties] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'eligible' | 'voted'>('all');
  
  // Voice Search State
  const [isListening, setIsListening] = useState(false);

  // View State: List vs Households vs Form
  const [viewMode, setViewMode] = useState<'list' | 'households' | 'form'>('list');

  // Export State
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Form State
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedVoterId, setSelectedVoterId] = useState<string | null>(null);
  
  // Form Fields
  const [idCardNumber, setIdCardNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [island, setIsland] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  
  // New Fields
  const [registrarParty, setRegistrarParty] = useState('');
  const [sheema, setSheema] = useState(false);
  const [sadiq, setSadiq] = useState(false);
  const [rRoshi, setRRoshi] = useState(false);
  const [communicated, setCommunicated] = useState(false);
  const [notes, setNotes] = useState('');
  const [noteInput, setNoteInput] = useState(''); // New state for individual note input

  // Validation & Modals
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [voterToDeleteId, setVoterToDeleteId] = useState<string | null>(null);

  // Add Island Modal State
  const [isAddIslandModalOpen, setIsAddIslandModalOpen] = useState(false);
  const [newIslandName, setNewIslandName] = useState('');

  // Add Party Modal State
  const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');

  // Manage List State (Admin Only)
  const [manageTarget, setManageTarget] = useState<'island' | 'party' | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editingItemValue, setEditingItemValue] = useState('');

  // Database Column Error State
  const [showColumnError, setShowColumnError] = useState(false);

  // --- PERMISSIONS LOGIC ---
  const isSuperAdmin = currentUser.role === 'superadmin' || (currentUser.username || '').toLowerCase() === 'faisalhassan';
  
  const hasPermission = (perm: string) => {
      if (isSuperAdmin) return true;
      if (currentUser.role === 'admin') return true;

      if (currentUser.permissions && currentUser.permissions.length > 0) {
          return currentUser.permissions.includes(perm);
      }
      
      if (currentUser.role === 'candidate') {
          return ['view_voter_profile', 'action_edit_voter', 'edit_voter_campaign', 'edit_voter_status', 'edit_voter_notes', 'edit_voter_sheema', 'edit_voter_shadda', 'edit_voter_rroshi', 'edit_voter_communicated'].includes(perm);
      }
      if (currentUser.role === 'mamdhoob') {
          return ['view_voter_profile', 'action_edit_voter', 'edit_voter_status', 'edit_voter_notes'].includes(perm);
      }
      if (currentUser.role === 'user') {
          return ['view_voter_profile'].includes(perm);
      }
      return false; 
  };
  
  const canCreate = hasPermission('action_create_voter');
  const canExport = hasPermission('action_export_data');
  const canDelete = isSuperAdmin || hasPermission('action_delete_voter');
  
  const canViewProfile = hasPermission('view_voter_profile');
  const canEditMaster = hasPermission('action_edit_voter');
  
  const canEditIdentity = hasPermission('edit_voter_identity'); 
  const canEditContact = hasPermission('edit_voter_contact');
  const canEditLocation = hasPermission('edit_voter_location'); 
  const canEditParty = hasPermission('edit_voter_party');
  const canEditNotes = hasPermission('edit_voter_notes');
  const canEditVoted = hasPermission('edit_voter_status');
  
  const canEditSheema = hasPermission('edit_voter_sheema') || hasPermission('edit_voter_campaign');
  const canEditShadda = hasPermission('edit_voter_shadda') || hasPermission('edit_voter_campaign');
  const canEditRRoshi = hasPermission('edit_voter_rroshi') || hasPermission('edit_voter_campaign');
  const canEditCommunicated = hasPermission('edit_voter_communicated') || hasPermission('edit_voter_campaign');

  const isReadOnlyMode = formMode === 'edit' && !canEditMaster;

  const refreshData = async () => {
    setIsLoading(true);
    try {
        const [v, i, p] = await Promise.all([
            storageService.getVoters(),
            storageService.getIslands(),
            storageService.getParties()
        ]);
        setVoters(v);
        setIslands(i);
        setParties(p);
        
        if (i.length > 0 && !island) setIsland(i[0]);
        if (p.length > 0 && !registrarParty) setRegistrarParty(p[0]);
        
    } catch (e) {
        console.error(e);
        setNotification({ msg: 'Failed to load data from server.', type: 'error' });
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (initialVoterId && voters.length > 0) {
        const targetVoter = voters.find(v => v.id === initialVoterId);
        if (targetVoter) {
            handleSelectVoter(targetVoter);
            if (onClearInitialVoter) onClearInitialVoter();
        }
    }
  }, [initialVoterId, voters]);

  useEffect(() => {
    if (viewMode === 'list' || viewMode === 'households') {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [viewMode]);

  const handleVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Voice search is not supported in this browser. Please use Chrome, Edge, or Safari.");
        return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        setIsListening(true);
    };

    recognition.onend = () => {
        setIsListening(false);
    };

    recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
    };

    recognition.start();
  };

  const openWhatsApp = (e: React.MouseEvent, v: { phoneNumber?: string, fullName: string, hasVoted: boolean }) => {
      e.stopPropagation();
      if (!v.phoneNumber) {
          alert("No phone number available for this voter.");
          return;
      }
      
      const firstName = v.fullName.split(' ')[0];
      const message = v.hasVoted 
        ? `Assalaam Alaikum ${firstName}, thank you for casting your vote in the N.Kudafari election! We appreciate your support.`
        : `Assalaam Alaikum ${firstName}, friendly reminder to head to the polls for the N.Kudafari election today. Your vote matters!`;
      
      const url = `https://wa.me/${v.phoneNumber}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
  };

  const handleAddNote = () => {
    if (!noteInput.trim()) return;
    const cleanNote = noteInput.replace(/,/g, ' ').trim();
    if (!cleanNote) return;

    const newNotes = notes ? `${notes},${cleanNote}` : cleanNote;
    setNotes(newNotes);
    setNoteInput('');
  };

  const handleRemoveNote = (indexToRemove: number) => {
    const parts = notes.split(',').map(s => s.trim()).filter(Boolean);
    parts.splice(indexToRemove, 1);
    setNotes(parts.join(','));
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          handleAddNote();
      }
  };

  const filteredVoters = useMemo(() => {
    const filtered = voters.filter(v => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        v.fullName.toLowerCase().includes(query) || 
        v.idCardNumber.toLowerCase().includes(query) ||
        v.island.toLowerCase().includes(query) ||
        (v.address && v.address.toLowerCase().includes(query));
      
      const matchesFilter = 
        filterStatus === 'all' ? true :
        filterStatus === 'voted' ? v.hasVoted :
        !v.hasVoted;

      return matchesSearch && matchesFilter;
    });

    return filtered.sort((a, b) => {
        const addrA = a.address || '';
        const addrB = b.address || '';
        const addressComparison = addrA.localeCompare(addrB);
        
        if (addressComparison !== 0) {
            return addressComparison;
        }
        
        return a.fullName.localeCompare(b.fullName);
    });
  }, [voters, searchQuery, filterStatus]);

  const households = useMemo(() => {
      const groups: Record<string, VoterRecord[]> = {};
      filteredVoters.forEach(v => {
          const key = v.address || 'Unknown Address';
          if (!groups[key]) groups[key] = [];
          groups[key].push(v);
      });
      return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredVoters]);

  const handleExportCSV = () => {
    const headers = ['ID Card', 'Full Name', 'Gender', 'Address', 'Island', 'Phone', 'Party', 'Status', 'Sheema', 'Shadda', 'R-Roshi', 'Communicated', 'Notes'];
    const csvContent = [
        headers.join(','),
        ...filteredVoters.map(v => [
            `"${v.idCardNumber}"`,
            `"${v.fullName}"`,
            `"${v.gender || ''}"`,
            `"${v.address}"`,
            `"${v.island}"`,
            `"${v.phoneNumber || ''}"`,
            `"${v.registrarParty || ''}"`,
            `"${v.hasVoted ? 'Voted' : 'Eligible'}"`,
            `"${v.sheema ? 'Yes' : 'No'}"`,
            `"${v.sadiq ? 'Yes' : 'No'}"`,
            `"${v.rRoshi ? 'Yes' : 'No'}"`,
            `"${v.communicated ? 'Yes' : 'No'}"`,
            `"${(v.notes || '').replace(/"/g, '""')}"`
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `voters_list_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Please allow popups to print the list.");
        return;
    }

    const tableRows = filteredVoters.map(v => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px;">${v.idCardNumber}</td>
            <td style="padding: 8px;">${v.fullName}</td>
            <td style="padding: 8px;">${v.gender || '-'}</td>
            <td style="padding: 8px;">${v.island}</td>
            <td style="padding: 8px;">${v.address}</td>
            <td style="padding: 8px;">${v.phoneNumber || '-'}</td>
            <td style="padding: 8px;">${v.registrarParty || '-'}</td>
            <td style="padding: 8px;">
                <span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; background-color: ${v.hasVoted ? '#dcfce7' : '#fef9c3'}; color: ${v.hasVoted ? '#166534' : '#854d0e'}">
                    ${v.hasVoted ? 'Voted' : 'Eligible'}
                </span>
            </td>
        </tr>
    `).join('');

    const content = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Voters List - Election 2026</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; }
                h1 { margin-bottom: 10px; color: #111; }
                .meta { margin-bottom: 20px; font-size: 12px; color: #666; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th { text-align: left; padding: 8px; background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb; font-weight: 600; color: #374151; }
                td { color: #1f2937; }
                @media print {
                    @page { margin: 1cm; size: landscape; }
                    body { -webkit-print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <h1>Voters Directory - N.Kudafari</h1>
            <div class="meta">
                <p>Generated on: ${new Date().toLocaleString()}</p>
                <p>Total Records: ${filteredVoters.length}</p>
                ${searchQuery ? `<p>Filter applied: "${searchQuery}"</p>` : ''}
            </div>
            <table>
                <thead>
                    <tr>
                        <th>ID Card</th>
                        <th>Full Name</th>
                        <th>Gender</th>
                        <th>Island</th>
                        <th>Address</th>
                        <th>Phone</th>
                        <th>Party</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    setIsExportMenuOpen(false);
  };

  const resetForm = () => {
    setFormMode('create');
    setSelectedVoterId(null);
    setIdCardNumber('');
    setFullName('');
    setGender('');
    setAddress('');
    setIsland(islands[0] || '');
    setPhoneNumber('');
    setHasVoted(false);
    setRegistrarParty(parties[0] || '');
    setSheema(false);
    setSadiq(false);
    setRRoshi(false);
    setCommunicated(false);
    setNotes('');
    setNoteInput('');
    setErrors({});
  };

  const handleSelectVoter = (voter: VoterRecord) => {
    if (!canViewProfile) {
        setNotification({ msg: 'Access Denied: You do not have permission to view voter details.', type: 'error' });
        setTimeout(() => setNotification(null), 3000);
        return;
    }

    setFormMode('edit');
    setSelectedVoterId(voter.id);
    setIdCardNumber(voter.idCardNumber);
    setFullName(voter.fullName);
    setGender(voter.gender || '');
    setAddress(voter.address);
    setIsland(voter.island);
    setPhoneNumber(voter.phoneNumber || '');
    setHasVoted(voter.hasVoted);
    setRegistrarParty(voter.registrarParty || parties[0] || '');
    setSheema(voter.sheema || false);
    setSadiq(voter.sadiq || false);
    setRRoshi(voter.rRoshi || false);
    setCommunicated(voter.communicated || false);
    setNotes(voter.notes || '');
    setErrors({});
    setViewMode('form');
  };

  const handleCreateNew = () => {
    if (!canCreate) {
        setNotification({ msg: 'Access Denied: You do not have permission to create new records.', type: 'error' });
        setTimeout(() => setNotification(null), 3000);
        return;
    }
    resetForm();
    setViewMode('form');
  };

  const handleBackToList = () => {
      setViewMode('list');
      resetForm();
  };

  const handleSaveClick = () => {
    if (isReadOnlyMode) {
        setNotification({ msg: 'View Only: You do not have permission to save changes.', type: 'error' });
        setTimeout(() => setNotification(null), 3000);
        return;
    }
    if (validate()) {
      setShowSaveConfirm(true);
    } else {
      setNotification({ msg: 'Please check the form for errors.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (canEditIdentity) {
        if (!idCardNumber.startsWith('A')) {
            newErrors.idCardNumber = 'ID Card Number must start with "A"';
        } else if (idCardNumber.length < 3) {
            newErrors.idCardNumber = 'ID Card Number is too short';
        }

        if (!fullName.trim()) {
            newErrors.fullName = 'Full Name cannot be empty';
        }

        if (!gender) {
            newErrors.gender = 'Gender is required';
        }
    }
    
    if (canEditLocation) {
        if (!address.trim()) {
            newErrors.address = 'Address is required';
        }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const confirmSave = async () => {
    try {
        const commonData = {
            idCardNumber,
            fullName,
            gender: (gender as 'Male' | 'Female') || undefined,
            address,
            island,
            phoneNumber,
            hasVoted,
            registrarParty,
            sheema,
            sadiq,
            rRoshi,
            communicated,
            notes,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        let logError: any = null;

        if (formMode === 'create') {
            if (!canCreate) {
                throw new Error("Permission denied: You do not have rights to create records.");
            }
            await storageService.createVoter({
                id: 'tmp', 
                ...commonData
            });
            logError = await storageService.createAuditLog('create_voter', `Created voter ${fullName} (${idCardNumber})`, currentUser);
            setNotification({ msg: 'Record created successfully!', type: 'success' });
        } else if (formMode === 'edit') {
             if (selectedVoterId) {
                 await storageService.updateVoter({
                    id: selectedVoterId,
                    ...commonData
                 });
                 logError = await storageService.createAuditLog('update_voter', `Updated voter ${fullName} (${idCardNumber}). Status: ${hasVoted ? 'Voted' : 'Eligible'}`, currentUser);
                 setNotification({ msg: 'Record updated successfully!', type: 'success' });
             }
        }
        
        if (logError && (logError.code === '42P01' || logError.code === 'PGRST205' || (logError.message && logError.message.includes('audit_logs')))) {
             setShowColumnError(true);
        }

        await refreshData();
        setShowSaveConfirm(false);
        setViewMode('list');
        resetForm();

    } catch (error: any) {
        console.error(error);
        const errMsg = error.message || '';
        if (error.code === '42703' || errMsg.includes('notes') || errMsg.includes('communicated') || errMsg.includes('gender') || errMsg.includes('r_roshi')) {
            setShowColumnError(true);
            setShowSaveConfirm(false);
        } else {
            setNotification({ msg: `Error saving record: ${errMsg}`, type: 'error' });
        }
    }
    
    if (!showColumnError) {
        setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleDeleteClick = (idToDelete?: string) => {
      if (!canDelete) {
          setNotification({ msg: 'Access Denied: Only Super Admin can delete records.', type: 'error' });
          setTimeout(() => setNotification(null), 3000);
          return;
      }
      
      const targetId = typeof idToDelete === 'string' ? idToDelete : selectedVoterId;
      if (!targetId) return;

      setVoterToDeleteId(targetId);
      setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
      if (!voterToDeleteId) return;

      try {
          const voter = voters.find(v => v.id === voterToDeleteId);
          await storageService.deleteVoter(voterToDeleteId);
          
          await storageService.createAuditLog('delete_voter', `Deleted voter ${voter?.fullName || 'Unknown'} (${voter?.idCardNumber || '?'})`, currentUser);
          
          await refreshData();
          
          if (viewMode === 'form' && selectedVoterId === voterToDeleteId) {
            resetForm();
            setViewMode('list');
          }
          
          setNotification({ msg: 'Record deleted.', type: 'success' });
      } catch (e) {
          console.error(e);
          setNotification({ msg: 'Failed to delete record.', type: 'error' });
      }

      setShowDeleteConfirm(false);
      setVoterToDeleteId(null);
      setTimeout(() => setNotification(null), 3000);
  };

  const handleAddIsland = async () => {
      if (!canEditLocation) return;
      if (!newIslandName.trim()) return;
      try {
        await storageService.addIsland(newIslandName.trim());
        await storageService.createAuditLog('add_island', `Added island: ${newIslandName.trim()}`, currentUser);
        await refreshData();
        setIsland(newIslandName.trim());
        setNewIslandName('');
        setIsAddIslandModalOpen(false);
        setNotification({ msg: 'Island added successfully!', type: 'success' });
      } catch (e) {
        setNotification({ msg: 'Failed to add island', type: 'error' });
      }
      setTimeout(() => setNotification(null), 3000);
    };

  const handleAddParty = async () => {
      if (!canEditParty) return;
      if (!newPartyName.trim()) return;
      try {
        await storageService.addParty(newPartyName.trim());
        await storageService.createAuditLog('add_party', `Added party: ${newPartyName.trim()}`, currentUser);
        await refreshData();
        setRegistrarParty(newPartyName.trim());
        setNewPartyName('');
        setIsAddPartyModalOpen(false);
        setNotification({ msg: 'Party added successfully!', type: 'success' });
      } catch(e) {
        setNotification({ msg: 'Failed to add party', type: 'error' });
      }
      setTimeout(() => setNotification(null), 3000);
    };

  const saveManagedItem = async (index: number) => {
      alert("Renaming items is disabled in this version.");
      setEditingItemIndex(null);
  }

  const deleteManagedItem = async (index: number) => {
    if (!canDelete) return;
    if(!window.confirm("Are you sure you want to delete this item?")) return;
    
    try {
        if (manageTarget === 'island') {
            const itemToDelete = islands[index];
            await storageService.deleteIsland(itemToDelete);
            await storageService.createAuditLog('delete_island', `Deleted island: ${itemToDelete}`, currentUser);
            if (island === itemToDelete) setIsland(islands[0] || '');
        } else {
            const itemToDelete = parties[index];
            await storageService.deleteParty(itemToDelete);
            await storageService.createAuditLog('delete_party', `Deleted party: ${itemToDelete}`, currentUser);
            if (registrarParty === itemToDelete) setRegistrarParty(parties[0] || '');
        }
        await refreshData();
        setNotification({ msg: 'Item deleted from list', type: 'success' });
    } catch (e) {
        setNotification({ msg: 'Failed to delete item', type: 'error' });
    }
    setTimeout(() => setNotification(null), 3000);
  }

  const totalVoters = voters.length;
  const votedCount = voters.filter(v => v.hasVoted).length;
  const progressPct = totalVoters > 0 ? Math.round((votedCount / totalVoters) * 100) : 0;

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)] h-[calc(100vh-6rem)]">
      {notification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg flex items-center animate-fade-in ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle className="h-4 w-4 mr-2"/> : <AlertTriangle className="h-4 w-4 mr-2"/>}
            <span className="text-sm font-medium">{notification.msg}</span>
        </div>
      )}

      {(viewMode === 'list' || viewMode === 'households') && (
          <div className="flex flex-col bg-white shadow-sm rounded-lg border border-gray-200 h-full overflow-hidden">
             
             <div className="p-6 border-b border-gray-200 shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                            <UserIcon className="h-6 w-6 mr-2 text-primary-600"/>
                            N.Kudafari Council Election 2026
                        </h2>
                        
                        <div className="mt-2 mb-1 max-w-md">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium text-gray-600">Voting Progress: <span className="text-primary-600">{progressPct}%</span></span>
                                <span className="text-gray-400">{votedCount}/{totalVoters} Voted</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-primary-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
                                title="List View"
                            >
                                <List className="h-5 w-5" />
                            </button>
                            <button 
                                onClick={() => setViewMode('households')}
                                className={`p-2 rounded-md transition-colors ${viewMode === 'households' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
                                title="Household (Geydhoshu) View"
                            >
                                <Home className="h-5 w-5" />
                            </button>
                        </div>

                        {canExport && (
                            <div className="relative">
                                <Button 
                                    variant="secondary" 
                                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                    className="whitespace-nowrap"
                                >
                                    <Download className="h-4 w-4 mr-2" /> Export
                                </Button>
                                {isExportMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setIsExportMenuOpen(false)}></div>
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200 py-1">
                                            <button 
                                                onClick={handleExportCSV} 
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                            >
                                                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600"/> Excel (CSV)
                                            </button>
                                            <button 
                                                onClick={handleExportPDF} 
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                            >
                                                <Printer className="h-4 w-4 mr-2 text-gray-600"/> Print / PDF
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {canCreate && (
                            <Button onClick={handleCreateNew}>
