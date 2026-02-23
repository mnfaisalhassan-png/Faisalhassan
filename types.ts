
export type UserRole = 'superadmin' | 'admin' | 'candidate' | 'mamdhoob' | 'user';

export type PageView = 'login' | 'dashboard' | 'election-overview' | 'registrar-party' | 'chat' | 'tasks' | 'notepad' | 'admin-panel' | 'profile' | 'kudafari-election';

export interface User {
  id: string;
  username: string;
  password?: string; // stored plainly for this demo requirement, usually hashed
  fullName: string;
  role: UserRole;
  email?: string;
  isBlocked?: boolean; // New field for security lockout
  permissions?: string[]; // Granular access control
  profilePictureUrl?: string; // URL for the user's profile picture
}

export interface VoterRecord {
  id: string;
  idCardNumber: string; // Must start with A
  fullName: string;
  gender?: 'Male' | 'Female';
  address: string;
  island: string;
  phoneNumber?: string;
  hasVoted: boolean;
  registrarParty?: string;
  sheema?: boolean;
  sadiq?: boolean;
  rRoshi?: boolean;
  imran?: boolean;
  communicated?: boolean;
  notes?: string;
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
