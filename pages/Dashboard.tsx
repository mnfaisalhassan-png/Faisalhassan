
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

interface DashboardProps {
  currentUser: User;
  initialVoterId?: string | null;
  onClearInitialVoter?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ currentUser, initialVoterId, onClearInitialVoter }) => {
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
  // Super Admin: Role is 'superadmin' OR username is 'faisalhassan' (case insensitive)
  const isSuperAdmin = currentUser.role === 'superadmin' || (currentUser.username || '').toLowerCase() === 'faisalhassan';
  
  // Helper to check granular permissions (fallback to role logic if permissions missing)
  const hasPermission = (perm: string) => {
      if (isSuperAdmin) return true;
      if (currentUser.role === 'admin') return true; // Admins default to all if permissions not set

      if (currentUser.permissions && currentUser.permissions.length > 0) {
          return currentUser.permissions.includes(perm);
      }
      
      // FALLBACK for legacy users based on role
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
  
  // CAPABILITIES DEFINITION - Granular
  const canCreate = hasPermission('action_create_voter');
  const canExport = hasPermission('action_export_data');
  const canDelete = isSuperAdmin || hasPermission('action_delete_voter');
  
  // View/Edit Permissions
  const canViewProfile = hasPermission('view_voter_profile');
  const canEditMaster = hasPermission('action_edit_voter');
  
  // Granular Field Permissions
  const canEditIdentity = hasPermission('edit_voter_identity'); 
  const canEditContact = hasPermission('edit_voter_contact');
  const canEditLocation = hasPermission('edit_voter_location'); 
  const canEditParty = hasPermission('edit_voter_party');
  const canEditNotes = hasPermission('edit_voter_notes');
  const canEditVoted = hasPermission('edit_voter_status');
  
  // Granular Campaign Permissions (with backward compatibility fallback)
  const canEditSheema = hasPermission('edit_voter_sheema') || hasPermission('edit_voter_campaign');
  const canEditShadda = hasPermission('edit_voter_shadda') || hasPermission('edit_voter_campaign');
  const canEditRRoshi = hasPermission('edit_voter_rroshi') || hasPermission('edit_voter_campaign');
  const canEditCommunicated = hasPermission('edit_voter_communicated') || hasPermission('edit_voter_campaign');

  // Read Only Mode Logic:
  // If creating new -> Not read only (assuming you can create)
  // If editing existing -> Must have 'action_edit_voter' permission. 
  // If 'action_edit_voter' is present, granular permissions further restrict specific fields.
  const isReadOnlyMode = formMode === 'edit' && !canEditMaster;

  // Load Data
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
        
        // Set defaults if lists are empty but we have data
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

  // Handle Initial Voter Deep Link
  useEffect(() => {
    if (initialVoterId && voters.length > 0) {
        const targetVoter = voters.find(v => v.id === initialVoterId);
        if (targetVoter) {
            handleSelectVoter(targetVoter);
            if (onClearInitialVoter) onClearInitialVoter();
        }
    }
  }, [initialVoterId, voters]);

  // Auto-focus search input on load
  useEffect(() => {
    if (viewMode === 'list' || viewMode === 'households') {
      setTimeout(() => searchInputRef.current?.focus(), 100); // Small delay to ensure it's rendered
    }
  }, [viewMode]);

  // Voice Search Handler
  const handleVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Voice search is not supported in this browser. Please use Chrome, Edge, or Safari.");
        return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US'; // Default to English

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

  // WhatsApp Handler
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

  // Note Handlers
  const handleAddNote = () => {
    if (!noteInput.trim()) return;
    const cleanNote = noteInput.replace(/,/g, ' ').trim(); // Replace commas in text to avoid breaking CSV
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

  // Filtered List
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

    // Sort A-Z by Address, then by Name
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

  // Households Grouping Logic
  const households = useMemo(() => {
      const groups: Record<string, VoterRecord[]> = {};
      filteredVoters.forEach(v => {
          const key = v.address || 'Unknown Address';
          if (!groups[key]) groups[key] = [];
          groups[key].push(v);
      });
      return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredVoters]);

  // Export CSV Handler
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
            `"${(v.notes || '').replace(/"/g, '""')}"` // Escape quotes
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

  // Export PDF/Print Handler
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
                // Auto print and close
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    setIsExportMenuOpen(false);
  };

  // Form Reset
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
    // Permission Check: Must have "View Voter Profile" permission
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
    setViewMode('form'); // Switch to form view
  };

  const handleCreateNew = () => {
    if (!canCreate) {
        setNotification({ msg: 'Access Denied: You do not have permission to create new records.', type: 'error' });
        setTimeout(() => setNotification(null), 3000);
        return;
    }
    resetForm();
    setViewMode('form'); // Switch to form view
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
    
    // Validation only applies if user has permission to edit those fields
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
            notes, // Saves as comma separated string
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        let logError: any = null;

        if (formMode === 'create') {
            if (!canCreate) {
                // Double check to prevent unauthorized access, though UI should hide it.
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
                 // Log changes
                 logError = await storageService.createAuditLog('update_voter', `Updated voter ${fullName} (${idCardNumber}). Status: ${hasVoted ? 'Voted' : 'Eligible'}`, currentUser);
                 setNotification({ msg: 'Record updated successfully!', type: 'success' });
             }
        }
        
        // Check for missing audit log table error
        if (logError && (logError.code === '42P01' || logError.code === 'PGRST205' || (logError.message && logError.message.includes('audit_logs')))) {
             setShowColumnError(true);
             // We still refresh data because the primary action (updateVoter) likely succeeded
        }

        await refreshData();
        setShowSaveConfirm(false);
        setViewMode('list');
        resetForm();

    } catch (error: any) {
        console.error(error);
        // Error code 42703 is undefined_column in Postgres
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
          
          // Attempt to log but handle silently if table missing, the user will see it on save next time
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

  // --- List Management Handlers ---

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

  // --- PROGRESS BAR CALCULATION FOR DIRECTORY VIEW ---
  const totalVoters = voters.length;
  const votedCount = voters.filter(v => v.hasVoted).length;
  const progressPct = totalVoters > 0 ? Math.round((votedCount / totalVoters) * 100) : 0;

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)] h-[calc(100vh-6rem)]">
      {/* Top Notification Area */}
      {notification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg flex items-center animate-fade-in ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle className="h-4 w-4 mr-2"/> : <AlertTriangle className="h-4 w-4 mr-2"/>}
            <span className="text-sm font-medium">{notification.msg}</span>
        </div>
      )}

      {/* VIEW MODE: LIST or HOUSEHOLDS */}
      {(viewMode === 'list' || viewMode === 'households') && (
          <div className="flex flex-col bg-white shadow-sm rounded-lg border border-gray-200 h-full overflow-hidden">
             
             {/* Header & Actions */}
             <div className="p-6 border-b border-gray-200 shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                            <UserIcon className="h-6 w-6 mr-2 text-primary-600"/>
                            Voters Directory
                        </h2>
                        
                        {/* Compact Progress Bar */}
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
                        {/* View Switcher */}
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

                        {/* Export Menu */}
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
                                <Plus className="h-5 w-5 mr-2" /> New
                            </Button>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input 
                            ref={searchInputRef}
                            type="text"
                            className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all"
                            placeholder={viewMode === 'households' ? "Search for address or person..." : "Search by name, ID, island, or address..."}
                            value={searchQuery}
                            onChange={e => {
                                setSearchQuery(e.target.value);
                                if (!showSearchDropdown) setShowSearchDropdown(true);
                            }}
                            onFocus={() => setShowSearchDropdown(true)}
                            onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)} // Delay to allow click on dropdown
                        />
                        {showSearchDropdown && searchQuery && filteredVoters.length > 0 && (
                            <div className="absolute z-30 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                                {filteredVoters.slice(0, 10).map(voter => (
                                    <div
                                        key={voter.id}
                                        className="px-4 py-3 hover:bg-primary-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                        onMouseDown={() => { // Use onMouseDown to fire before onBlur
                                            handleSelectVoter(voter);
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
                        <button 
                            onClick={handleVoiceSearch}
                            className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-gray-100 text-gray-400'}`}
                            title="Voice Search"
                        >
                            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </button>
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-lg self-start sm:self-auto">
                        {(['all', 'eligible', 'voted'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition-all ${
                                    filterStatus === status 
                                    ? 'bg-white text-gray-900 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
             </div>

             {/* Content Area: Table or Households */}
             <div className="bg-gray-50 flex-1 overflow-y-auto">
                 {isLoading ? (
                     <div className="p-10 text-center text-gray-500">Loading data...</div>
                 ) : filteredVoters.length === 0 ? (
                     <div className="p-10 text-center text-gray-500">No voters found matching your criteria.</div>
                 ) : viewMode === 'households' ? (
                     /* HOUSEHOLD GRID VIEW */
                     <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                         {households.map(([addressName, members]) => {
                             const houseVoted = members.filter(m => m.hasVoted).length;
                             const houseTotal = members.length;
                             const housePct = Math.round((houseVoted / houseTotal) * 100);
                             
                             return (
                                 <div key={addressName} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                                     <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                         <div className="flex items-center">
                                             <Home className="h-4 w-4 text-gray-400 mr-2" />
                                             <h3 className="font-bold text-gray-900 truncate max-w-[150px]" title={addressName}>{addressName}</h3>
                                         </div>
                                         <div className="flex items-center text-xs font-medium">
                                             <span className={`mr-2 ${housePct === 100 ? 'text-green-600' : 'text-gray-500'}`}>
                                                 {houseVoted}/{houseTotal} Voted
                                             </span>
                                             <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                 <div className={`h-full ${housePct === 100 ? 'bg-green-500' : 'bg-primary-500'}`} style={{width: `${housePct}%`}}></div>
                                             </div>
                                         </div>
                                     </div>
                                     <div className="divide-y divide-gray-100 flex-1">
                                         {members.map(member => (
                                             <div 
                                                key={member.id} 
                                                onClick={() => handleSelectVoter(member)}
                                                className={`px-4 py-3 flex justify-between items-center group ${canViewProfile ? 'cursor-pointer hover:bg-gray-50' : 'opacity-80'}`}
                                             >
                                                 <div className="flex items-center">
                                                     <div className={`h-2 w-2 rounded-full mr-3 flex-shrink-0 ${member.hasVoted ? 'bg-green-500' : 'bg-yellow-400'}`}></div>
                                                     <div>
                                                         <div className="text-sm font-medium text-gray-900">{member.fullName}</div>
                                                         <div className="text-xs text-gray-500">{member.idCardNumber}</div>
                                                     </div>
                                                 </div>
                                                 {member.phoneNumber && (
                                                     <button
                                                        onClick={(e) => openWhatsApp(e, member)}
                                                        className="p-1.5 rounded-full text-green-600 bg-green-50 opacity-0 group-hover:opacity-100 hover:bg-green-100 transition-all"
                                                        title="Message on WhatsApp"
                                                     >
                                                         <MessageCircle className="h-4 w-4" />
                                                     </button>
                                                 )}
                                             </div>
                                         ))}
                                     </div>
                                 </div>
                             );
                         })}
                     </div>
                 ) : (
                     /* LIST TABLE VIEW */
                     <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voter Details</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Island</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attributes</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredVoters.map((voter) => (
                                    <tr 
                                        key={voter.id} 
                                        className={`transition-colors ${canViewProfile ? 'cursor-pointer hover:bg-gray-50' : 'opacity-80'}`}
                                        onClick={() => handleSelectVoter(voter)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{voter.fullName}</div>
                                                    <div className="text-sm text-gray-500 font-mono flex items-center gap-2">
                                                        {voter.idCardNumber}
                                                        {voter.gender && (
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                                                                voter.gender === 'Male' 
                                                                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                                                : 'bg-pink-50 text-pink-700 border-pink-200'
                                                            }`}>
                                                                {voter.gender}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {voter.address && (
                                                        <div className="text-xs text-gray-400 mt-1 md:hidden">
                                                            <MapPin className="h-3 w-3 inline mr-1" />
                                                            {voter.address}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col text-sm text-gray-700">
                                                <div className="flex items-center">
                                                    <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                                                    {voter.island}
                                                </div>
                                                {voter.address && (
                                                    <span className="text-xs text-gray-500 ml-5 truncate max-w-[150px]" title={voter.address}>
                                                        {voter.address}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {voter.hasVoted ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Voted
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    Eligible
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex space-x-2">
                                                {voter.sheema && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                                        Sheema
                                                    </span>
                                                )}
                                                {voter.sadiq && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                        Shadda
                                                    </span>
                                                )}
                                                {voter.rRoshi && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-100">
                                                        R-Roshi
                                                    </span>
                                                )}
                                                {voter.communicated && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100">
                                                        Comm.
                                                    </span>
                                                )}
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-600 border border-gray-100">
                                                    {voter.registrarParty || 'Independent'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-3">
                                                {voter.phoneNumber && (
                                                    <button 
                                                        onClick={(e) => openWhatsApp(e, voter)}
                                                        className="text-gray-400 hover:text-green-600 transition-colors p-1"
                                                        title="WhatsApp"
                                                    >
                                                        <MessageCircle className="h-5 w-5" />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteClick(voter.id);
                                                        }}
                                                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                                        title="Delete Record"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </button>
                                                )}
                                                {/* Everyone can view details, editing permission handled inside form */}
                                                <div className={`text-primary-600 ${canViewProfile ? 'hover:text-primary-900' : 'opacity-20 cursor-not-allowed'}`}>
                                                    <ChevronRight className="h-5 w-5 ml-auto" />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                 )}
             </div>
             
             {/* Footer Stats */}
             <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-500 flex justify-between items-center shrink-0">
                 <div>
                     {filteredVoters.length === voters.length ? (
                         <span>Total Registered Voters: <strong>{voters.length}</strong></span>
                     ) : (
                         <span>
                             Showing <strong>{filteredVoters.length}</strong> results 
                             <span className="text-gray-400 mx-1">/</span> 
                             {voters.length} Total
                         </span>
                     )}
                 </div>
             </div>
          </div>
      )}

      {/* VIEW MODE: FORM (COMPACT, ANIMATED, GLASS) */}
      {viewMode === 'form' && (
        <div className="flex flex-1 flex-col bg-gray-50/50 overflow-hidden relative rounded-xl border border-gray-200/50 shadow-2xl h-full animate-fade-in backdrop-blur-sm">
            {/* Background Gradient Mesh */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-30 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl animate-float"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
            </div>

            {/* Form Header - Compact Glass */}
            <div className="px-6 py-4 bg-white/70 backdrop-blur-md border-b border-white/50 flex justify-between items-center shrink-0 shadow-sm z-20">
                <div className="flex items-center">
                    <button 
                        onClick={handleBackToList}
                        className="mr-4 p-2 rounded-full bg-white/50 hover:bg-white text-gray-600 hover:text-gray-900 transition-all shadow-sm hover:shadow group"
                    >
                        <ArrowLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 flex items-center">
                            {formMode === 'create' ? 'Registration' : (
                                isReadOnlyMode ? 'Voter Profile (Read Only)' : 'Edit Voter'
                            )}
                        </h1>
                        {formMode === 'edit' && (
                            <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
                                {idCardNumber}
                                {hasVoted && <CheckCircle className="h-3 w-3 text-green-500 ml-1" />}
                            </span>
                        )}
                    </div>
                </div>
                {formMode === 'edit' && (
                    <div className="flex items-center space-x-2">
                        {phoneNumber && (
                            <Button 
                                onClick={(e) => openWhatsApp(e, { phoneNumber, fullName, hasVoted })}
                                variant="secondary"
                                size="sm"
                                className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300 shadow-sm"
                            >
                                <MessageCircle className="h-4 w-4 mr-1.5" /> WhatsApp
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Form Content - Compact & Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar relative z-10">
                <div className="max-w-3xl mx-auto space-y-4">
                    {/* Access Level Banners */}
                    {isReadOnlyMode && (
                         <div className="bg-gray-50/80 backdrop-blur-sm border border-gray-200 rounded-xl p-3 flex items-center shadow-sm animate-slide-up">
                            <Info className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0" />
                            <p className="text-xs text-gray-700 font-medium">
                                View Only Access: You do not have permission to edit voter details.
                            </p>
                        </div>
                    )}
                    
                    {/* Main Grid Layout - Ultra Compact */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        
                        {/* Column 1: Identity (Spans 2 cols on mobile, 2 on desktop) */}
                        <div className="md:col-span-2 bg-white/60 backdrop-blur-md rounded-2xl p-4 border border-white/60 shadow-sm animate-slide-up" style={{animationDelay: '0ms'}}>
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                                <Fingerprint className="h-3 w-3 mr-1.5" /> Identity
                            </h3>
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <Input 
                                        label="ID Card" 
                                        placeholder="AXXXXXX" 
                                        value={idCardNumber} 
                                        onChange={e => setIdCardNumber(e.target.value)}
                                        error={errors.idCardNumber}
                                        disabled={isReadOnlyMode || !canEditIdentity}
                                        className="h-8 text-xs bg-white/80"
                                    />
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
                                        <div className={`flex bg-gray-100/50 rounded-lg p-0.5 border border-gray-200/50 ${isReadOnlyMode || !canEditIdentity ? 'opacity-50' : ''}`}>
                                            {['Male', 'Female'].map(g => (
                                                <button
                                                    key={g}
                                                    type="button"
                                                    onClick={() => !isReadOnlyMode && canEditIdentity && setGender(g)}
                                                    disabled={isReadOnlyMode || !canEditIdentity}
                                                    className={`flex-1 py-0.5 text-[10px] font-medium rounded-md transition-all ${
                                                        gender === g 
                                                        ? 'bg-white shadow-sm text-primary-700' 
                                                        : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                                >
                                                    {g}
                                                </button>
                                            ))}
                                        </div>
                                        {errors.gender && <p className="mt-1 text-[10px] text-red-600">{errors.gender}</p>}
                                    </div>
                                </div>
                                <Input 
                                    label="Full Name" 
                                    placeholder="Official Name" 
                                    value={fullName} 
                                    onChange={e => setFullName(e.target.value)}
                                    error={errors.fullName}
                                    disabled={isReadOnlyMode || !canEditIdentity}
                                    className="h-8 text-xs bg-white/80"
                                />
                                <Input 
                                    label="Contact" 
                                    placeholder="Phone Number" 
                                    value={phoneNumber} 
                                    onChange={e => setPhoneNumber(e.target.value)}
                                    disabled={isReadOnlyMode || !canEditContact}
                                    className="h-8 text-xs bg-white/80"
                                    icon={<Phone className="h-3 w-3 text-gray-400" />}
                                />
                            </div>
                        </div>

                        {/* Column 2: Location (Spans 2 cols) */}
                        <div className="md:col-span-2 bg-white/60 backdrop-blur-md rounded-2xl p-4 border border-white/60 shadow-sm animate-slide-up" style={{animationDelay: '100ms'}}>
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                                <Map className="h-3 w-3 mr-1.5" /> Residence
                            </h3>
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="col-span-2">
                                        <Input 
                                            label="Address" 
                                            placeholder="House / Apartment" 
                                            value={address} 
                                            onChange={e => setAddress(e.target.value)}
                                            error={errors.address}
                                            disabled={isReadOnlyMode || !canEditLocation}
                                            className="h-8 text-xs bg-white/80"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Island</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-grow">
                                                <select 
                                                    className={`block w-full h-8 pl-2 pr-8 text-xs border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white/80 ${isReadOnlyMode || !canEditLocation ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                    value={island}
                                                    onChange={e => setIsland(e.target.value)}
                                                    disabled={isReadOnlyMode || !canEditLocation}
                                                >
                                                    {islands.map(isl => <option key={isl} value={isl}>{isl}</option>)}
                                                </select>
                                            </div>
                                            {isSuperAdmin && canEditLocation && !isReadOnlyMode && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => { setManageTarget('island'); setEditingItemIndex(null); }}
                                                    className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                                                    title="Manage Islands"
                                                >
                                                    <Settings className="h-3 w-3" />
                                                </button>
                                            )}
                                            <button 
                                                type="button" 
                                                onClick={() => setIsAddIslandModalOpen(true)}
                                                className="p-1.5 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-lg transition-colors border border-primary-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={isReadOnlyMode || !canEditLocation}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Campaign & Voting Status - Full Width Container */}
                        <div className="md:col-span-4 bg-white/60 backdrop-blur-md rounded-2xl p-4 border border-white/60 shadow-sm animate-slide-up" style={{animationDelay: '200ms'}}>
                            <div className="flex flex-col md:flex-row gap-4">
                                {/* Left Side: Party & Chips */}
                                <div className="flex-1">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                                        <Award className="h-3 w-3 mr-1.5" /> Campaign Data
                                    </h3>
                                    
                                    <div className="mb-3">
                                        <label className="block text-[10px] font-medium text-gray-500 mb-1">Registrar Party</label>
                                        <div className="flex gap-2">
                                            <select 
                                                className={`block w-full h-8 text-xs border border-gray-300 rounded-lg bg-white/80 ${isReadOnlyMode || !canEditParty ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                value={registrarParty}
                                                onChange={e => setRegistrarParty(e.target.value)}
                                                disabled={isReadOnlyMode || !canEditParty}
                                            >
                                                {parties.map(party => <option key={party} value={party}>{party}</option>)}
                                            </select>
                                            {isSuperAdmin && canEditParty && !isReadOnlyMode && (
                                                <button onClick={() => { setManageTarget('party'); setEditingItemIndex(null); }} className="p-1.5 bg-gray-100 rounded-lg text-gray-600">
                                                    <Settings className="h-3 w-3" />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => setIsAddPartyModalOpen(true)} 
                                                className="p-1.5 bg-primary-50 text-primary-600 rounded-lg border border-primary-200 disabled:opacity-50 disabled:cursor-not-allowed" 
                                                disabled={isReadOnlyMode || !canEditParty}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Compact Chips Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {[
                                            { label: 'Sheema', state: sheema, setter: setSheema, color: 'purple', icon: Sparkles, perm: canEditSheema },
                                            { label: 'Shadda', state: sadiq, setter: setSadiq, color: 'indigo', icon: ShieldCheck, perm: canEditShadda },
                                            { label: 'R-Roshi', state: rRoshi, setter: setRRoshi, color: 'rose', icon: Award, perm: canEditRRoshi },
                                            { label: 'Comm.', state: communicated, setter: setCommunicated, color: 'orange', icon: MessageCircle, perm: canEditCommunicated },
                                        ].map((item) => (
                                            <button
                                                key={item.label}
                                                type="button"
                                                onClick={() => !isReadOnlyMode && item.perm && item.setter(!item.state)}
                                                disabled={isReadOnlyMode || !item.perm}
                                                className={`
                                                    relative group flex items-center justify-center px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 border
                                                    ${item.state 
                                                        ? `bg-${item.color}-100 border-${item.color}-300 text-${item.color}-700 shadow-sm` 
                                                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                                    }
                                                    ${isReadOnlyMode || !item.perm ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                                `}
                                            >
                                                <item.icon className={`w-3 h-3 mr-1 ${item.state ? 'opacity-100' : 'opacity-50'}`} />
                                                {item.label}
                                                {item.state && <span className={`absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-${item.color}-500 animate-pulse`}></span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="w-px bg-gray-200 hidden md:block"></div>

                                {/* Right Side: Voting Switch & Notes */}
                                <div className="flex-1 flex flex-col justify-between">
                                    <div className="mb-3">
                                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                                            <CheckCircle className="h-3 w-3 mr-1.5" /> Voting Status
                                        </h3>
                                        
                                        <div 
                                            onClick={() => !isReadOnlyMode && canEditVoted && setHasVoted(!hasVoted)}
                                            className={`
                                                cursor-pointer relative w-full h-10 rounded-lg border transition-all duration-300 flex items-center px-1 shadow-inner
                                                ${hasVoted 
                                                    ? 'bg-green-50 border-green-400' 
                                                    : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
                                                }
                                                ${isReadOnlyMode || !canEditVoted ? 'opacity-60 cursor-not-allowed' : ''}
                                            `}
                                        >
                                            <div className={`
                                                absolute w-[calc(50%-4px)] h-8 rounded-md shadow-sm transition-all duration-500 flex items-center justify-center font-bold text-xs tracking-wide z-10
                                                ${hasVoted 
                                                    ? 'left-[calc(50%+2px)] bg-green-500 text-white translate-x-0' 
                                                    : 'left-1 bg-white text-gray-500 translate-x-0'
                                                }
                                            `}>
                                                {hasVoted ? 'VOTED' : 'PENDING'}
                                            </div>
                                            <div className="w-full flex justify-between px-6 text-[10px] font-bold text-gray-400 pointer-events-none uppercase tracking-widest z-0">
                                                <span>No</span>
                                                <span>Yes</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Comma Separated Note Tagger */}
                                    <div className="mt-auto">
                                        <div className="flex items-center gap-2 mb-1">
                                            <StickyNote className="h-3 w-3 text-gray-400" />
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Notepad (Comma Separated)</span>
                                        </div>
                                        <div className={`bg-white/80 border border-gray-300 rounded-lg p-1.5 min-h-[60px] ${isReadOnlyMode || !canEditNotes ? 'opacity-75 bg-gray-50' : ''}`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <input 
                                                    type="text" 
                                                    value={noteInput}
                                                    onChange={(e) => setNoteInput(e.target.value)}
                                                    onKeyDown={handleNoteKeyDown}
                                                    placeholder={!isReadOnlyMode && canEditNotes ? "Add a brief note..." : "View only"}
                                                    className="flex-1 text-[10px] border-none bg-transparent focus:ring-0 p-0.5 placeholder-gray-400"
                                                    disabled={isReadOnlyMode || !canEditNotes}
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={handleAddNote}
                                                    disabled={isReadOnlyMode || !canEditNotes || !noteInput.trim()}
                                                    className="p-0.5 text-primary-600 hover:bg-primary-50 rounded disabled:opacity-50"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {notes.split(',').filter(n => n.trim()).map((note, idx) => (
                                                    <div key={idx} className="flex items-center bg-yellow-50 text-yellow-800 text-[10px] px-1.5 py-0.5 rounded border border-yellow-200 shadow-sm animate-fade-in">
                                                        <span>{note.trim()}</span>
                                                        <button 
                                                            onClick={() => handleRemoveNote(idx)}
                                                            className="ml-1 text-yellow-600 hover:text-red-600 focus:outline-none"
                                                            disabled={isReadOnlyMode || !canEditNotes}
                                                        >
                                                            <X className="h-2.5 w-2.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {notes.length === 0 && <span className="text-[10px] text-gray-400 italic p-0.5">No notes added.</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Actions (Fixed Bottom) */}
            <div className="px-6 py-4 bg-white/80 backdrop-blur-xl border-t border-white/50 flex justify-between items-center z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] shrink-0">
                <div>
                   {formMode === 'edit' && canDelete && (
                       <Button variant="danger" size="sm" onClick={() => handleDeleteClick()} className="bg-red-50 text-red-600 hover:bg-red-100 border-red-100 shadow-none">
                           <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                       </Button>
                   )}
                </div>
                <div className="flex space-x-3">
                   <Button variant="secondary" onClick={handleBackToList} className="border-gray-300 hover:bg-white bg-white/50">
                       {isReadOnlyMode ? 'Back' : 'Cancel'}
                   </Button>
                   {!isReadOnlyMode && (
                        <Button onClick={handleSaveClick} className="shadow-lg shadow-primary-500/30 min-w-[120px] bg-gradient-to-r from-primary-600 to-primary-500 border-none">
                            <Save className="h-4 w-4 mr-2" />
                            {formMode === 'create' ? 'Register' : 'Save Changes'}
                        </Button>
                   )}
                </div>
            </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal 
        isOpen={showSaveConfirm} 
        onClose={() => setShowSaveConfirm(false)}
        title="Confirm Save"
        footer={
            <>
                <Button variant="secondary" onClick={() => setShowSaveConfirm(false)}>No, Go Back</Button>
                <Button onClick={confirmSave}>Yes, Save Record</Button>
            </>
        }
      >
          <div className="flex items-start">
             <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                <Save className="h-6 w-6 text-blue-600" />
             </div>
             <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <p className="text-sm text-gray-500">
                    You are about to save this voter record. Please confirm that all details are correct.
                </p>
                <div className="mt-2 text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-gray-500">Name:</span> {fullName}</div>
                        <div><span className="text-gray-500">ID:</span> {idCardNumber}</div>
                        <div><span className="text-gray-500">Gender:</span> {gender || '-'}</div>
                        <div><span className="text-gray-500">Party:</span> {registrarParty}</div>
                        <div><span className="text-gray-500">Sheema:</span> {sheema ? 'Yes' : 'No'}</div>
                        <div><span className="text-gray-500">Shadda:</span> {sadiq ? 'Yes' : 'No'}</div>
                        <div><span className="text-gray-500">R-Roshi:</span> {rRoshi ? 'Yes' : 'No'}</div>
                        <div><span className="text-gray-500">Communicated:</span> {communicated ? 'Yes' : 'No'}</div>
                        {notes && (
                            <div className="col-span-2 text-gray-500 italic mt-1 border-t pt-1">
                                Notes: {notes.split(',').filter(Boolean).map(n => n.trim()).join(', ')}
                            </div>
                        )}
                        <div className="col-span-2 text-center mt-2 border-t pt-2 font-semibold">
                            Status: <span className={hasVoted ? 'text-green-600' : 'text-yellow-600'}>{hasVoted ? 'Voted' : 'Eligible'}</span>
                        </div>
                    </div>
                </div>
             </div>
          </div>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={showDeleteConfirm} 
        onClose={() => setShowDeleteConfirm(false)}
        title="Confirm Deletion"
        footer={
            <>
                <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                <Button variant="danger" onClick={executeDelete}>Delete Record</Button>
            </>
        }
      >
          <div className="flex items-start">
             <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <Trash2 className="h-6 w-6 text-red-600" />
             </div>
             <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Do you want to delete this record?
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    This action cannot be undone. This will permanently remove the voter from the database.
                  </p>
                  <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-md p-2">
                     <div className="flex">
                        <ShieldCheck className="h-5 w-5 text-yellow-500 mr-2" />
                        <span className="text-xs text-yellow-800 font-medium pt-0.5">
                            Only Super Admin has the right to delete records.
                        </span>
                     </div>
                  </div>
                </div>
             </div>
          </div>
      </Modal>

      {/* Add Island Modal */}
      <Modal
        isOpen={isAddIslandModalOpen}
        onClose={() => setIsAddIslandModalOpen(false)}
        title="Add New Island"
        footer={
            <>
                <Button variant="secondary" onClick={() => setIsAddIslandModalOpen(false)}>Cancel</Button>
                <Button onClick={handleAddIsland}>Add Island</Button>
            </>
        }
      >
          <div className="space-y-4">
              <p className="text-sm text-gray-500">Enter the name of the new island to add it to the system list.</p>
              <Input 
                  label="Island Name"
                  value={newIslandName}
                  onChange={e => setNewIslandName(e.target.value)}
                  placeholder="e.g. Dhidhdhoo"
                  icon={<MapPin className="h-5 w-5 text-gray-400" />}
              />
          </div>
      </Modal>

      {/* Add Party Modal */}
      <Modal
        isOpen={isAddPartyModalOpen}
        onClose={() => setIsAddPartyModalOpen(false)}
        title="Add New Party"
        footer={
            <>
                <Button variant="secondary" onClick={() => setIsAddPartyModalOpen(false)}>Cancel</Button>
                <Button onClick={handleAddParty}>Add Party</Button>
            </>
        }
      >
          <div className="space-y-4">
              <p className="text-sm text-gray-500">Enter the name of the new political party to add it to the list.</p>
              <Input 
                  label="Party Name"
                  value={newPartyName}
                  onChange={e => setNewPartyName(e.target.value)}
                  placeholder="e.g. New Democratic Front"
                  icon={<Flag className="h-5 w-5 text-gray-400" />}
              />
          </div>
      </Modal>

      {/* List Management Modal */}
      <Modal
            isOpen={!!manageTarget}
            onClose={() => {
                setManageTarget(null);
                setEditingItemIndex(null);
            }}
            title={manageTarget === 'island' ? 'Manage Islands' : 'Manage Parties'}
            footer={
                <Button variant="secondary" onClick={() => setManageTarget(null)}>Close</Button>
            }
        >
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 pr-1">
                {(manageTarget === 'island' ? islands : parties).map((item, index) => (
                    <div key={index} className="py-3 flex items-center justify-between group">
                        {editingItemIndex === index ? (
                            <div className="flex-1 flex items-center space-x-2">
                                <Input 
                                    value={editingItemValue}
                                    onChange={(e) => setEditingItemValue(e.target.value)}
                                    className="h-8 text-sm"
                                    autoFocus
                                />
                                <button onClick={() => saveManagedItem(index)} className="p-1 text-green-600 hover:bg-green-50 rounded"><CheckCircle className="h-4 w-4"/></button>
                                <button onClick={() => setEditingItemIndex(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="h-4 w-4"/></button>
                            </div>
                        ) : (
                            <>
                                <span className="text-sm text-gray-700 font-medium">{item}</span>
                                <div className="flex space-x-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => {
                                            setEditingItemIndex(index);
                                            setEditingItemValue(item);
                                        }}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                        title="Edit"
                                        disabled
                                    >
                                        <Edit2 className="h-3 w-3" />
                                    </button>
                                    <button 
                                        onClick={() => deleteManagedItem(index)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
                {(manageTarget === 'island' ? islands : parties).length === 0 && <p className="text-gray-400 text-sm text-center py-4">No items found.</p>}
            </div>
      </Modal>

      {/* Database Column Error Modal */}
      <Modal
        isOpen={showColumnError}
        onClose={() => setShowColumnError(false)}
        title="Database Update Required"
        footer={
            <Button onClick={() => setShowColumnError(false)}>Close</Button>
        }
      >
          <div className="flex flex-col items-center justify-center p-2">
            <div className="bg-orange-100 p-3 rounded-full mb-4">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Missing Database Columns or Table</h3>
            <p className="text-sm text-gray-600 text-center mb-4">
                The database is missing required tables or columns (e.g., 'audit_logs'). <br/>
                Please run the following command in your Supabase SQL Editor to fix this.
            </p>
            
            <div className="bg-gray-800 rounded-md p-4 w-full relative group">
                <div className="absolute top-2 right-2 text-xs text-gray-400 flex items-center">
                    <Terminal className="w-3 h-3 mr-1" /> SQL
                </div>
                <code className="text-xs text-green-400 whitespace-pre-wrap break-all font-mono">
{`ALTER TABLE voters ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE voters ADD COLUMN IF NOT EXISTS communicated boolean default false;
ALTER TABLE voters ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE voters ADD COLUMN IF NOT EXISTS r_roshi boolean default false;

CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid default gen_random_uuid() primary key,
    action text,
    details text,
    performed_by uuid,
    performed_by_name text,
    created_at timestamptz default now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Audit Logs" ON audit_logs;
CREATE POLICY "Public Access Audit Logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);`}
                </code>
            </div>
          </div>
      </Modal>
    </div>
  );
};
