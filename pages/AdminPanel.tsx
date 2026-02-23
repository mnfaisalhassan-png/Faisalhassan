
import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, AuditLog, ALL_PERMISSIONS, Permission } from '../types';
import { storageService } from '../services/storage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
    Trash2, UserPlus, Shield, User as UserIcon, AlertTriangle, 
    Lock, Activity, Monitor, Clock, Zap, Users, Unlock, Ban, Eye, CheckCircle, Save, Terminal,
    CheckSquare, Square, BarChart3
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';

interface AdminPanelProps {
  currentUser: User;
}

// Permission Constants
const PERMISSIONS: Record<string, {id: Permission, label: string}[]> = {
    MENU: [
        { id: 'view_election_overview', label: 'Election Overview' },
        { id: 'view_voter_registry', label: 'Voter Registry' },
        { id: 'view_party_distribution', label: 'Party Distribution' },
        { id: 'view_chat', label: 'Community Chat' },
        { id: 'view_tasks', label: 'Task Management' },
        { id: 'view_notepad', label: 'Campaign Notes' },
        { id: 'view_admin_panel', label: 'Admin Panel' },
        { id: 'view_change_password', label: 'Change Password Page' }
    ],
    ACTIONS: [
        { id: 'action_create_voter', label: 'Show Registration Form (Create New)' },
        { id: 'action_edit_voter', label: 'Show Edit Voter Form (Enable Editing)' },
        { id: 'view_voter_profile', label: 'Show Voter Profile (Read Only)' },
        { id: 'action_delete_voter', label: 'Delete Member' },
        { id: 'action_export_data', label: 'Export Data (CSV/PDF)' },
    ],
    METRICS: [
        { id: 'view_metric_total_registered', label: 'Show Total Registered' },
        { id: 'view_metric_votes_cast', label: 'Show Votes Cast' },
        { id: 'view_metric_pending_votes', label: 'Show Pending Votes' },
        { id: 'view_metric_candidate_sheema', label: 'Show Candidate Seema' },
        { id: 'view_metric_candidate_sadiq', label: 'Show Shadda elections' },
        { id: 'view_metric_total_male_voters', label: 'Show Male Voters for Seema' },
        { id: 'view_metric_total_female_voters', label: 'Show Female Voters for Seema' },,
        { id: 'view_metric_r_roshi', label: 'Show R-Roshi Status' },
        { id: 'view_metric_rf_seema', label: 'Show RF-Seema' },
        { id: 'view_metric_island_turnout', label: 'Show Voter Turnout by Island' }
    ],
    FORM_ACCESS: [
        { id: 'edit_voter_identity', label: 'Edit Identity (ID, Name, Gender)' },
        { id: 'edit_voter_location', label: 'Edit Location (Address, Island)' },
        { id: 'edit_voter_contact', label: 'Edit Contact Info' },
        { id: 'edit_voter_party', label: 'Edit Registrar Party' },
        { id: 'edit_voter_status', label: 'Edit Voting Status' },
        // Granular Campaign Permissions
        { id: 'edit_voter_sheema', label: 'Edit Sheema Checkbox' },
        { id: 'edit_voter_shadda', label: 'Edit Shadda Checkbox' },
        { id: 'edit_voter_rroshi', label: 'Edit R-Roshi Checkbox' },
        { id: 'edit_voter_communicated', label: 'Edit Communicated Checkbox' },
        
        { id: 'edit_voter_notes', label: 'Edit Notepad' },
    ]
};

const getAllPermissionIds = (): Permission[] => ALL_PERMISSIONS;


const ROLE_DEFAULTS: Record<UserRole, Permission[]> = {
    superadmin: getAllPermissionIds(),
    admin: getAllPermissionIds(),
    candidate: [
        'view_election_overview', 'view_voter_registry', 'view_party_distribution', 'view_chat', 'view_tasks', 'view_notepad',
        'view_voter_profile', 'action_edit_voter', // Can view and edit
        'edit_voter_status', 'edit_voter_notes',
        'edit_voter_sheema', 'edit_voter_shadda', 'edit_voter_rroshi', 'edit_voter_communicated',
        // Metrics
        'view_metric_total_registered', 'view_metric_votes_cast', 'view_metric_pending_votes',
        'view_metric_candidate_sheema', 'view_metric_candidate_shadda',
        'view_metric_r_roshi', 'view_metric_rf_seema', 'view_metric_island_turnout'
    ],
    mamdhoob: [
        'view_election_overview', 'view_voter_registry', 'view_party_distribution', 'view_chat', 'view_notepad',
        'view_voter_profile', 'action_edit_voter', 
        'edit_voter_status', 'edit_voter_notes',
        // Metrics
        'view_metric_total_registered', 'view_metric_votes_cast', 'view_metric_pending_votes',
        'view_metric_candidate_sheema', 'view_metric_candidate_shadda'
    ],
    user: [
        'view_election_overview', 'view_voter_registry', 'view_party_distribution', 
        'view_voter_profile',
        // Metrics - Basic Only
        'view_metric_total_registered', 'view_metric_votes_cast', 'view_metric_pending_votes'
    ]
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'logs'>('overview');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  
  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [isBlockedForm, setIsBlockedForm] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Loading States
  const [isSaving, setIsSaving] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null); // Track individual action loading

  // Error State
  const [showSchemaError, setShowSchemaError] = useState(false);

  // Super Admin Check (Case Insensitive)
  // Grants write access to system users.
  const isSuperAdmin = useMemo(() => {
    return currentUser.role === 'superadmin' || (currentUser.username || '').toLowerCase() === 'faisalhassan';
  }, [currentUser]);

  const refreshData = async () => {
      try {
        const uData = await storageService.getUsers();
        setUsers(uData);
        
        const lData = await storageService.getAuditLogs(200);
        setLogs(lData);
      } catch (e) {
        console.error("Failed to refresh admin data", e);
      }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 15000);
    return () => clearInterval(interval);
  }, []);

  // --- Derived Metrics ---
  const userActivityMap = useMemo(() => {
      const map = new Map<string, number>();
      logs.forEach(log => {
          const current = map.get(log.performedBy) || 0;
          if (log.timestamp > current) {
              map.set(log.performedBy, log.timestamp);
          }
      });
      return map;
  }, [logs]);

  const activeUsersToday = useMemo(() => {
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      return Array.from(userActivityMap.values()).filter((ts: number) => ts > oneDayAgo).length;
  }, [userActivityMap]);

  const onlineNow = useMemo(() => {
      const fiveMinsAgo = Date.now() - (5 * 60 * 1000);
      return Array.from(userActivityMap.values()).filter((ts: number) => ts > fiveMinsAgo).length;
  }, [userActivityMap]);

  const getUserStatus = (userId: string) => {
      const lastActive = userActivityMap.get(userId);
      if (!lastActive) return 'offline';
      
      const diff = Date.now() - lastActive;
      if (diff < 5 * 60 * 1000) return 'online'; // 5 mins
      if (diff < 60 * 60 * 1000) return 'away'; // 1 hour
      return 'offline';
  };

  const formatLastActive = (userId: string) => {
      const lastActive = userActivityMap.get(userId);
      if (!lastActive) return 'Never';
      
      const diff = Date.now() - lastActive;
      if (diff < 60 * 1000) return 'Just now';
      if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}h ago`;
      return new Date(lastActive).toLocaleDateString();
  };

  // --- Handlers ---

  const handleOpenCreate = () => {
    if (!isSuperAdmin) {
        alert("Access Denied: Only Super Admin can create users.");
        return;
    }
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setFullName('');
    setRole('user');
    setIsBlockedForm(false);
    setSelectedPermissions(ROLE_DEFAULTS['user']); // Default permissions for new user
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setUsername(user.username);
    setPassword(isSuperAdmin ? (user.password || '') : ''); // Show password for Super Admin, blank otherwise
    setFullName(user.fullName);
    setRole(user.role);
    setIsBlockedForm(user.isBlocked || false);
    // If permissions are set in DB, use them. Else fall back to role defaults.
    setSelectedPermissions(user.permissions && user.permissions.length > 0 ? user.permissions : ROLE_DEFAULTS[user.role]);
    setIsModalOpen(true);
  };

  // When Role changes in the form, optionally update permissions to defaults
  const handleRoleChange = (newRole: UserRole) => {
      setRole(newRole);
      // Automatically reset permissions to standard role defaults when role switches
      // This provides a good DX. Admin can then customize.
      setSelectedPermissions(ROLE_DEFAULTS[newRole]);
  };

  const togglePermission = (permId: string) => {
      if (selectedPermissions.includes(permId)) {
          setSelectedPermissions(selectedPermissions.filter(p => p !== permId));
      } else {
          setSelectedPermissions([...selectedPermissions, permId]);
      }
  };

  const handleDelete = async (userId: string) => {
    if (!isSuperAdmin) return;
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
        const userToDelete = users.find(u => u.id === userId);
        await storageService.deleteUser(userId);
        await storageService.createAuditLog('delete_user', `Deleted user: ${userToDelete?.username || 'Unknown'}`, currentUser);
        await refreshData();
    } catch (e: any) {
        alert("Failed to delete: " + e.message);
    }
  };

  const handleUnblock = async (user: User) => {
      if (!isSuperAdmin) return;
      if (!confirm(`Are you sure you want to unblock ${user.username}?`)) return;
      
      setProcessingUserId(user.id);
      try {
          await storageService.updateUserBlockStatus(user.id, false);
          await storageService.createAuditLog('admin_unblock', `Unblocked account: ${user.username}`, currentUser);
          await refreshData();
          if (editingUser && editingUser.id === user.id) {
              setIsBlockedForm(false);
          }
      } catch (e: any) {
          console.error("Unblock Error:", e);
           if (
              e.code === '23514' || 
              e.code === '42703' || 
              e.code === 'PGRST204' || 
              e.message?.includes('is_blocked') ||
              e.message?.includes('schema cache')
          ) {
              setShowSchemaError(true);
          } else {
              alert("Failed to unblock: " + e.message);
          }
      } finally {
        setProcessingUserId(null);
      }
  };

  const handleBlock = async (user: User) => {
      if (!isSuperAdmin) return;
      if (!confirm(`Are you sure you want to block ${user.username}? They will be unable to login.`)) return;
      
      setProcessingUserId(user.id);
      try {
          await storageService.updateUserBlockStatus(user.id, true);
          await storageService.createAuditLog('admin_block', `Blocked account: ${user.username}`, currentUser);
          await refreshData();
          if (editingUser && editingUser.id === user.id) {
              setIsBlockedForm(true);
          }
      } catch (e: any) {
          console.error("Block Error:", e);
           if (
              e.code === '23514' || 
              e.code === '42703' || 
              e.code === 'PGRST204' || 
              e.message?.includes('is_blocked') ||
              e.message?.includes('schema cache')
          ) {
              setShowSchemaError(true);
          } else {
              alert("Failed to block: " + e.message);
          }
      } finally {
        setProcessingUserId(null);
      }
  };

  const handleSave = async () => {
    if (!isSuperAdmin) {
        alert("Permission Denied: Only Super Admin can perform this action.");
        return;
    }
    
    // Validation
    if (!username.trim() || !fullName.trim()) {
        alert("Full Name and Username are required.");
        return;
    }
    
    // Check if creating new user without password
    if (!editingUser && !password.trim()) {
        alert("Password is required when creating a new user.");
        return;
    }

    // Password validation for new password
    if (password.trim() && password.trim().length < 8) {
        alert("New password must be at least 8 characters long.");
        return;
    }

    setIsSaving(true);

    try {
        const userData = {
            username: username.trim(),
            fullName: fullName.trim(),
            role: role,
            isBlocked: isBlockedForm,
            permissions: selectedPermissions
        };

        if (editingUser) {
          // Update existing user
          const updateData: Partial<User> = {
            ...editingUser,
            ...userData,
          };

          // Only include password in the update if a new one is provided.
          if (password.trim()) {
            updateData.password = password.trim();
          } else {
            delete updateData.password;
          }
          
          await storageService.updateUser(updateData as User);
          
          await storageService.createAuditLog('update_user', `Updated profile for: ${userData.username}`, currentUser);
        } else {
          // Create new user
          await storageService.createUser({
            id: '', // Backend handles ID generation
            ...userData,
            password: password.trim()
          });
          
          await storageService.createAuditLog('create_user', `Created user: ${userData.username} as ${userData.role}`, currentUser);
        }
        
        await refreshData();
        setIsModalOpen(false);
        setEditingUser(null);
        setPassword('');
    } catch (e: any) {
        console.error("Save Error:", e);
        
        // Comprehensive check for database schema errors
        if (
            e.code === '23514' || // Check constraint violation
            e.code === '42703' || // Undefined column
            e.code === 'PGRST204' || // Column not found in schema cache
            e.message?.includes('users_role_check') || 
            e.message?.includes('is_blocked') ||
            e.message?.includes('permissions') || 
            e.message?.includes('schema cache')
        ) {
            setShowSchemaError(true);
        } else {
            alert("Error saving user: " + (e.message || "Unknown error"));
        }
    } finally {
        setIsSaving(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const styles = {
        superadmin: 'bg-red-100 text-red-800 border-red-200',
        admin: 'bg-purple-100 text-purple-800 border-purple-200',
        mamdhoob: 'bg-blue-100 text-blue-800 border-blue-200',
        candidate: 'bg-orange-100 text-orange-800 border-orange-200',
        user: 'bg-green-100 text-green-800 border-green-200'
    };
    return styles[role] || styles.user;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
              <div className="bg-red-600 p-2 rounded-lg text-white">
                  <Shield className="h-6 w-6" />
              </div>
              <div>
                  <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${isSuperAdmin ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                    {isSuperAdmin ? 'Super Admin Access' : 'Read-Only Access'}
                  </span>
              </div>
          </div>
          <p className="text-gray-500 mt-1 ml-11">Monitor system health, activity, and user access levels.</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
             {['overview', 'users', 'logs'].map((tab) => (
                 <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all capitalize ${
                        activeTab === tab 
                        ? 'bg-gray-900 text-white shadow-md' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                 >
                     {tab}
                 </button>
             ))}
        </div>
      </div>

      {activeTab === 'overview' && (
          <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                          <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Users</span>
                          <Users className="h-5 w-5 text-blue-500" />
                      </div>
                      <span className="text-3xl font-bold text-gray-900">{users.length}</span>
                  </div>
                  
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                          <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Active Today</span>
                          <Activity className="h-5 w-5 text-green-500" />
                      </div>
                      <span className="text-3xl font-bold text-gray-900">{activeUsersToday}</span>
                      <span className="text-xs text-green-600 mt-1">{onlineNow} online now</span>
                  </div>

                  <div 
                    onClick={() => setShowBlockedModal(true)}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col cursor-pointer hover:shadow-md hover:border-red-200 transition-all group"
                  >
                      <div className="flex items-center justify-between mb-4">
                          <span className="text-gray-500 text-xs font-bold uppercase tracking-wider group-hover:text-red-500 transition-colors">Blocked Accounts</span>
                          <Lock className="h-5 w-5 text-red-500" />
                      </div>
                      <span className="text-3xl font-bold text-gray-900">{users.filter(u => u.isBlocked).length}</span>
                      <span className="text-xs text-red-400 mt-1 group-hover:underline flex items-center">
                          Requires attention 
                          <Users className="h-3 w-3 ml-1" />
                      </span>
                  </div>

                  <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-5 rounded-2xl shadow-lg flex flex-col text-white">
                      <div className="flex items-center justify-between mb-4">
                          <span className="text-gray-300 text-xs font-bold uppercase tracking-wider">System Status</span>
                          <Zap className="h-5 w-5 text-yellow-400" />
                      </div>
                      <span className="text-xl font-bold">Operational</span>
                      <span className="text-xs text-gray-400 mt-1">Database Connected</span>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Recent Activity Feed */}
                  <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                          <h3 className="font-bold text-gray-900 flex items-center">
                              <Activity className="h-4 w-4 mr-2 text-primary-600" /> 
                              Recent System Activity
                          </h3>
                          <button onClick={() => setActiveTab('logs')} className="text-xs text-primary-600 hover:underline">View All</button>
                      </div>
                      <div className="divide-y divide-gray-50">
                          {logs.slice(0, 8).map(log => (
                              <div key={log.id} className="px-6 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3">
                                  <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                                      log.action.includes('delete') || log.action.includes('block') ? 'bg-red-500' : 
                                      log.action.includes('create') || log.action.includes('unblock') ? 'bg-green-500' : 'bg-blue-500'
                                  }`}></div>
                                  <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900">
                                          <span className="font-bold">{log.performedByName}</span> 
                                          <span className="font-normal text-gray-500 mx-1">performed</span> 
                                          <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{log.action}</span>
                                      </p>
                                      <p className="text-xs text-gray-500 truncate mt-0.5">{log.details}</p>
                                  </div>
                                  <span className="text-xs text-gray-400 whitespace-nowrap">
                                      {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                              </div>
                          ))}
                          {logs.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">No activity recorded yet.</div>}
                      </div>
                  </div>

                  {/* Online Users List */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                          <h3 className="font-bold text-gray-900 flex items-center">
                              <Monitor className="h-4 w-4 mr-2 text-green-600" /> 
                              Active Users (24h)
                          </h3>
                      </div>
                      <div className="flex-1 overflow-y-auto max-h-[400px] p-2">
                          {users
                            .filter(u => userActivityMap.has(u.id))
                            .sort((a,b) => (userActivityMap.get(b.id)||0) - (userActivityMap.get(a.id)||0))
                            .map(u => {
                                const status = getUserStatus(u.id);
                                return (
                                    <div key={u.id} className="flex items-center p-3 hover:bg-gray-50 rounded-xl transition-colors">
                                        <div className="relative">
                                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                                {u.fullName.charAt(0)}
                                            </div>
                                            <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                                                status === 'online' ? 'bg-green-500' : status === 'away' ? 'bg-yellow-500' : 'bg-gray-300'
                                            }`}></div>
                                        </div>
                                        <div className="ml-3 flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{u.fullName}</p>
                                            <p className="text-xs text-gray-500 flex items-center">
                                                {status === 'online' ? <span className="text-green-600 font-medium">Online Now</span> : `Active ${formatLastActive(u.id)}`}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                            {users.filter(u => userActivityMap.has(u.id)).length === 0 && (
                                <div className="p-8 text-center text-gray-400 text-sm">No active users found in logs.</div>
                            )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'users' && (
          <div className="space-y-4">
              <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-800">User Management</h2>
                  {isSuperAdmin && (
                      <Button onClick={handleOpenCreate} className="shadow-lg shadow-green-500/20 bg-green-600 hover:bg-green-700 text-white border-transparent">
                        <UserPlus className="h-4 w-4 mr-2" /> New User
                      </Button>
                  )}
              </div>
              
              <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User Profile</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Access Role</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map(user => {
                        const status = getUserStatus(user.id);
                        return (
                          <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${user.isBlocked ? 'bg-red-50 hover:bg-red-100' : ''}`}>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="relative">
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold border ${user.isBlocked ? 'bg-red-100 text-red-600 border-red-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                        {user.isBlocked ? <Lock className="h-4 w-4"/> : <span className="text-xs">{user.fullName.charAt(0)}</span>}
                                    </div>
                                    {status === 'online' && !user.isBlocked && <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>}
                                </div>
                                <div className="ml-3">
                                  <div className={`text-sm font-medium ${user.isBlocked ? 'text-red-900' : 'text-gray-900'}`}>{user.fullName}</div>
                                  <div className="text-[10px] text-gray-500">@{user.username}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <span className={`px-2 py-0.5 inline-flex text-[10px] font-medium rounded-full border capitalize ${getRoleBadge(user.role)}`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                                {user.isBlocked ? (
                                    <span className="flex items-center text-red-600 font-bold text-[10px]">
                                        <Lock className="w-3 h-3 mr-1"/> Blocked
                                    </span>
                                ) : (
                                    status === 'online' 
                                        ? <span className="text-green-600 font-bold flex items-center text-[10px]"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>Online</span> 
                                        : <span className="flex items-center text-[10px]"><Clock className="w-3 h-3 mr-1 opacity-50"/> {formatLastActive(user.id)}</span>
                                )}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-xs font-medium">
                                <div className="flex items-center justify-end gap-2">
                                    <button onClick={() => handleOpenEdit(user)} className="text-blue-600 hover:text-blue-900 font-medium flex items-center text-[10px]">
                                        {isSuperAdmin ? 'Edit' : <><Eye className="h-3 w-3 mr-1"/> View</>}
                                    </button>
                                    
                                    {isSuperAdmin && user.isBlocked && (
                                        <button 
                                            onClick={() => handleUnblock(user)} 
                                            disabled={processingUserId === user.id}
                                            className={`inline-flex items-center px-2 py-0.5 border border-transparent text-[10px] font-medium rounded text-white shadow-sm ${processingUserId === user.id ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                                        >
                                            {processingUserId === user.id ? <div className="w-3 h-3 border-2 border-t-transparent border-white rounded-full animate-spin mr-1"></div> : <Unlock className="h-3 w-3 mr-1" />}
                                            Unblock
                                        </button>
                                    )}

                                    {isSuperAdmin && !user.isBlocked && user.username.toLowerCase() !== 'faisalhassan' && user.id !== currentUser.id && (
                                        <button 
                                            onClick={() => handleBlock(user)} 
                                            disabled={processingUserId === user.id}
                                            className="text-orange-600 hover:text-orange-900 font-medium" 
                                            title="Block User"
                                        >
                                            {processingUserId === user.id ? <div className="w-3 h-3 border-2 border-t-transparent border-orange-600 rounded-full animate-spin"></div> : <Ban className="h-3 w-3 inline" />}
                                        </button>
                                    )}
                                    
                                    {isSuperAdmin && user.username.toLowerCase() !== 'faisalhassan' && user.id !== currentUser.id && (
                                        <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900 font-medium ml-1 text-[10px]">Delete</button>
                                    )}
                                </div>
                            </td>
                          </tr>
                        );
                    })}
                  </tbody>
                </table>
              </div>
          </div>
      )}

      {/* EDIT/CREATE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={
            <div className="flex items-center">
                {editingUser ? <UserIcon className="h-5 w-5 mr-2 text-gray-500" /> : <UserPlus className="h-5 w-5 mr-2 text-primary-600" />}
                {editingUser ? (isSuperAdmin ? 'Edit User Profile' : 'View User Profile') : 'Create New User'}
            </div>
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Close</Button>
            {isSuperAdmin && (
                <Button onClick={handleSave} isLoading={isSaving} disabled={isSaving} type="button">
                    <Save className="h-4 w-4 mr-2" />
                    {editingUser ? 'Save Changes' : 'Create User'}
                </Button>
            )}
          </>
        }
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {/* Basic Info */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Credentials</h3>
              <Input 
                label="Full Name" 
                value={fullName} 
                onChange={e => setFullName(e.target.value)} 
                disabled={!isSuperAdmin || isSaving}
                placeholder="John Doe"
              />
              <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Username" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    disabled={!isSuperAdmin || isSaving}
                    placeholder="johndoe"
                  />
                  <Input 
                    label="Set New Password"
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    type="text" 
                    placeholder={editingUser ? "Leave blank to keep current" : "Required"} 
                    disabled={!isSuperAdmin || isSaving}
                  />
              </div>
          </div>
          
          {/* Status Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center">
                <div className={`p-2 rounded-full mr-3 ${isBlockedForm ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {isBlockedForm ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-900">{isBlockedForm ? 'Account Blocked' : 'Account Active'}</p>
                    <p className="text-xs text-gray-500">{isBlockedForm ? 'User cannot login' : 'User has full access'}</p>
                </div>
            </div>
            <button 
                type="button"
                disabled={!isSuperAdmin || isSaving}
                onClick={() => isSuperAdmin && setIsBlockedForm(!isBlockedForm)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isBlockedForm ? 'bg-red-600' : 'bg-green-600'} ${(!isSuperAdmin || isSaving) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isBlockedForm ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Primary Role</label>
            <div className="grid grid-cols-1 gap-2">
                {[
                    {id: 'superadmin', label: 'Super Admin', desc: 'Full system control', icon: Shield, color: 'text-red-600', bg: 'bg-red-50'},
                    {id: 'admin', label: 'Administrator', desc: 'Manage voter data', icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50'},
                    {id: 'candidate', label: 'Candidate', desc: 'View data & edit notes', icon: Monitor, color: 'text-orange-600', bg: 'bg-orange-50'},
                    {id: 'mamdhoob', label: 'Mamdhoob', desc: 'Voting status & notes', icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50'},
                    {id: 'user', label: 'Standard User', desc: 'Basic read-only access', icon: UserIcon, color: 'text-green-600', bg: 'bg-green-50'},
                ].map((r) => (
                    <label 
                        key={r.id} 
                        className={`flex items-center p-2 border rounded-lg transition-all ${isSuperAdmin && !isSaving ? 'cursor-pointer hover:bg-gray-50' : 'cursor-not-allowed opacity-75'} ${role === r.id ? `${r.bg} border-current ring-1 ring-offset-1` : ''}`}
                        onClick={() => {
                            if (isSuperAdmin && !isSaving) {
                                handleRoleChange(r.id as any);
                            }
                        }}
                    >
                        <input 
                            type="radio" 
                            name="role" 
                            value={r.id} 
                            checked={role === r.id} 
                            onChange={() => {}} 
                            disabled={!isSuperAdmin || isSaving} 
                            className="sr-only" 
                        />
                        <r.icon className={`h-5 w-5 mr-3 ${r.color}`} />
                        <div>
                            <div className={`text-sm font-medium ${r.color}`}>{r.label}</div>
                            <div className="text-xs text-gray-500">{r.desc}</div>
                        </div>
                        {role === r.id && <div className="ml-auto w-2 h-2 rounded-full bg-current text-gray-900"></div>}
                    </label>
                ))}
            </div>
          </div>

          {/* Granular Permissions */}
          <div className="border-t border-gray-200 pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Granular Permissions</label>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  
                  {/* Menu Section */}
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase">
                      Menu Access
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-2">
                      {PERMISSIONS.MENU.map(perm => (
                          <div 
                              key={perm.id}
                              onClick={() => isSuperAdmin && !isSaving && togglePermission(perm.id)}
                              className={`flex items-center p-2 rounded cursor-pointer transition-colors ${selectedPermissions.includes(perm.id) ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-600'}`}
                          >
                              {selectedPermissions.includes(perm.id) ? <CheckSquare className="h-4 w-4 mr-2 text-primary-600" /> : <Square className="h-4 w-4 mr-2 text-gray-400" />}
                              <span className="text-xs font-medium">{perm.label}</span>
                          </div>
                      ))}
                  </div>

                  {/* Actions Section */}
                  <div className="bg-gray-50 px-3 py-2 border-y border-gray-200 text-xs font-bold text-gray-500 uppercase">
                      Global Actions & Visibility
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-2">
                      {PERMISSIONS.ACTIONS.map(perm => (
                          <div 
                              key={perm.id}
                              onClick={() => isSuperAdmin && !isSaving && togglePermission(perm.id)}
                              className={`flex items-center p-2 rounded cursor-pointer transition-colors ${selectedPermissions.includes(perm.id) ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-600'}`}
                          >
                              {selectedPermissions.includes(perm.id) ? <CheckSquare className="h-4 w-4 mr-2 text-primary-600" /> : <Square className="h-4 w-4 mr-2 text-gray-400" />}
                              <span className="text-xs font-medium">{perm.label}</span>
                          </div>
                      ))}
                  </div>

                  {/* Metrics Section */}
                  <div className="bg-gray-50 px-3 py-2 border-y border-gray-200 text-xs font-bold text-gray-500 uppercase">
                      Election Overview Metrics
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-2">
                      {PERMISSIONS.METRICS.map(perm => (
                          <div 
                              key={perm.id}
                              onClick={() => isSuperAdmin && !isSaving && togglePermission(perm.id)}
                              className={`flex items-center p-2 rounded cursor-pointer transition-colors ${selectedPermissions.includes(perm.id) ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-600'}`}
                          >
                              {selectedPermissions.includes(perm.id) ? <CheckSquare className="h-4 w-4 mr-2 text-primary-600" /> : <Square className="h-4 w-4 mr-2 text-gray-400" />}
                              <span className="text-xs font-medium">{perm.label}</span>
                          </div>
                      ))}
                  </div>

                  {/* Form Fields Section */}
                  <div className="bg-gray-50 px-3 py-2 border-y border-gray-200 text-xs font-bold text-gray-500 uppercase">
                      Voter Form Edit Access
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-2">
                      {PERMISSIONS.FORM_ACCESS.map(perm => (
                          <div 
                              key={perm.id}
                              onClick={() => isSuperAdmin && !isSaving && togglePermission(perm.id)}
                              className={`flex items-center p-2 rounded cursor-pointer transition-colors ${selectedPermissions.includes(perm.id) ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-600'}`}
                          >
                              {selectedPermissions.includes(perm.id) ? <CheckSquare className="h-4 w-4 mr-2 text-primary-600" /> : <Square className="h-4 w-4 mr-2 text-gray-400" />}
                              <span className="text-xs font-medium">{perm.label}</span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>

        </div>
      </Modal>
      
      {/* Blocked Accounts Modal */}
      <Modal
            isOpen={showBlockedModal}
            onClose={() => setShowBlockedModal(false)}
            title={
                <div className="flex items-center gap-2 text-red-600">
                    <Lock className="h-5 w-5" />
                    <span className="text-lg font-bold">Blocked Accounts</span>
                </div>
            }
            footer={<Button variant="secondary" onClick={() => setShowBlockedModal(false)}>Close</Button>}
        >
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {users.filter(u => u.isBlocked).length === 0 ? (
                    <div className="text-center py-8">
                        <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Unlock className="h-6 w-6 text-green-600" />
                        </div>
                        <p className="text-gray-900 font-medium">No blocked accounts</p>
                        <p className="text-sm text-gray-500">All users have active access.</p>
                    </div>
                ) : (
                    users.filter(u => u.isBlocked).map(user => (
                        <div key={user.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center text-red-600 border border-red-100">
                                     <Lock className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900">{user.fullName}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">@{user.username}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getRoleBadge(user.role)}`}>{user.role}</span>
                                    </div>
                                </div>
                            </div>
                            {isSuperAdmin && (
                                <Button 
                                    size="sm" 
                                    onClick={() => handleUnblock(user)} 
                                    disabled={processingUserId === user.id}
                                    className={`shadow-green-200 ${processingUserId === user.id ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                                >
                                    {processingUserId === user.id ? (
                                        <div className="w-3 h-3 border-2 border-t-transparent border-white rounded-full animate-spin mr-1.5"></div>
                                    ) : (
                                        <Unlock className="h-3 w-3 mr-1.5" />
                                    )}
                                    Unblock
                                </Button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </Modal>

      {/* SCHEMA ERROR MODAL */}
      <Modal
        isOpen={showSchemaError}
        onClose={() => setShowSchemaError(false)}
        title="Database Update Required"
        footer={<Button onClick={() => setShowSchemaError(false)}>Close</Button>}
      >
          <div className="text-center p-2">
            <div className="bg-orange-100 p-3 rounded-full mb-4 inline-block"><AlertTriangle className="h-8 w-8 text-orange-600" /></div>
            <p className="text-sm text-gray-600 mb-2">The database needs a small update to support user blocking and permissions.</p>
            <p className="text-xs text-gray-500 mb-4">Please copy the SQL below and run it in your Supabase SQL Editor.</p>
            
            <div className="bg-gray-800 rounded-md p-4 text-left relative group">
                <div className="absolute top-2 right-2 text-xs text-gray-400 flex items-center"><Terminal className="w-3 h-3 mr-1" /> SQL</div>
                <code className="text-xs text-green-400 break-all font-mono whitespace-pre-wrap select-all">
{`-- 1. Add missing column for blocking users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked boolean default false;

-- 2. Add missing column for granular permissions
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions text[];

-- 3. Update role constraint to include all roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('superadmin', 'admin', 'candidate', 'mamdhoob', 'user'));

-- 4. Reload Schema Cache (Supabase specific)
-- NOTIFY pgrst, 'reload config';`}
                </code>
            </div>
            
            <div className="mt-4 text-xs text-gray-500">
                After running this, try creating/saving the user again.
            </div>
          </div>
      </Modal>
    </div>
  );
};
