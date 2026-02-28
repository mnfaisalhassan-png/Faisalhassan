
export type UserRole = 'superadmin' | 'admin' | 'candidate' | 'mamdhoob' | 'user';

export type PageView =
  // Dashboard
  | 'election-overview'
  | 'live-results'
  | 'turnout-analytics'
  | 'quick-summary'
  // Voter Management
  | 'voter-registry'
  | 'add-voter'
  | 'import-export-voters'
  | 'search-filter-voters'
  | 'suspended-inactive-voters'
  // Candidates & Parties
  | 'candidates'
  | 'party-distribution'
  | 'candidate-performance'
  // Results & Reports
  | 'real-time-results'
  | 'detailed-reports'
  | 'export-results'
  | 'historical-data'
  // Communication
  | 'community-chat'
  | 'announcements'
  | 'campaign-notes'
  // System & Settings
  | 'profile'
  | 'change-password'
  | 'user-roles-permissions'
  | 'security-settings'
  | 'audit-logs'
  // Legacy
  | 'login'
  | 'dashboard' // This is now voter-registry
  | 'registrar-party' // This is now party-distribution
  | 'chat' // This is now community-chat
  | 'tasks' // This will be removed
  | 'notepad' // This is now campaign-notes
  | 'admin-panel' // This is now user-roles-permissions
  | 'kudafari-election';

export interface User {
  id: string;
  username: string;
  password?: string; // stored plainly for this demo requirement, usually hashed
  fullName: string;
  role: UserRole;
  email?: string;
  isBlocked?: boolean; // New field for security lockout
  permissions?: string[]; // Granular access control
  menuAccess?: string[]; // Menu visibility control
  profilePictureUrl?: string; // URL for the user's profile picture
}

export type Voter = {
    id: string;
    id_card_number: string;
    full_name: string;
    address: string;
    contact_number?: string;
    voting_status: 'Voted' | 'Not Voted';
    notepad?: string;
};

export interface VoterRecord {
  id: string;
  idCardNumber: string; // Must start with A
  fullName: string;
  gender?: 'Male' | 'Female';
  address: string;
  island: { id: string; name: string };
  phoneNumber?: string;
  hasVoted: boolean;
  votingBoxNumber?: string;
  registrarParty?: string;
  sheema?: boolean;
  sadiq?: boolean;
  rRoshi?: boolean;
  imran?: boolean;
  communicated?: boolean;
  shfaa?: boolean;
  mashey?: boolean;
  notes?: string | string[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedToUserId: string;
  assignedByUserId: string; // Admin who created it
  status: 'pending' | 'completed';
  createdAt: number;
  // Joins (filled optionally)
  assignedToName?: string;
  assignedByName?: string;
}

export interface AppNote {
  id: string;
  userId: string;
  userName: string;
  title: string;
  content: string;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'gray';
  createdAt: number;
  updatedAt: number;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  performedBy: string; // User ID
  performedByName?: string;
  timestamp: number;
}

export const ALL_PERMISSIONS = [
  // Dashboard
  'view_election_overview',
  'view_live_results',
  'view_turnout_analytics',
  'view_quick_summary',
  // Voter Management
  'view_voter_registry',
  'view_add_voter',
  'view_import_export_voters',
  'view_search_filter_voters',
  'view_suspended_inactive_voters',
  // Candidates & Parties
  'view_candidates',
  'view_party_distribution',
  'view_candidate_performance',
  // Results & Reports
  'view_real_time_results',
  'view_detailed_reports',
  'view_export_results',
  'view_historical_data',
  // Communication
  'view_chat',
  'view_announcements',
  'view_notepad',
  // System & Settings
  'view_change_password',
  'view_admin_panel',
  'view_security_settings',
  'view_audit_logs',
  'action_update_profile_picture',
  'action_create_announcement',
  'action_edit_announcement',
  'action_delete_announcement',
  'view_metric_candidate_shafaa',
  'view_metric_candidate_mashey',
  'view_metric_candidate_imran',
  'view_metric_voting_box_number',
  'edit_voter_shafaa',
  'edit_voter_mashey',
  'edit_voter_imran',
  'edit_voting_box_number',
  'action_create_candidate',
  'action_view_candidate',
  'action_edit_candidate',
  'action_delete_candidate'
] as const;

export type Permission = typeof ALL_PERMISSIONS[number];

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'General' | 'Urgent' | 'Election Day' | 'System Update';
  author: string;
  date: string;
  isPinned: boolean;
  isUrgent: boolean;
}

export interface Candidate {
  id: string;
  created_at: string;
  candidate_no: number;
  id_card_number: string;
  full_name: string;
  gender: 'Male' | 'Female';
  address: string;
  island: { id: string; name: string };
  contact_no: string;
  represent_party: { id: string; name: string };
  profile_picture_url?: string;
  title: { id: string; name: string };
  island_id?: string;
  represent_party_id?: string;
  title_id?: string;
  total_votes?: number;
}
