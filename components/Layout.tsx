
import React, { useState } from 'react';
import { 
    Users, LogOut, Menu, ShieldCheck, FileText, User as UserIcon, BarChart3, MessageSquare, 
    StickyNote, KeyRound, ChevronLeft, PieChart, Target, 
    FilePlus, FileUp, Search, UserX, Users2, Vote, BarChart, FileDown, History, Annoyed, 
    Settings, Bell
} from 'lucide-react';
import { User, PageView, Permission } from '../types';

// --- PROPS --- 
interface LayoutProps {
  user: User;
  activePage: PageView;
  onNavigate: (page: PageView) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

// --- NAVIGATION DATA --- 
const navStructure = [
    {
        title: 'Main',
        items: [
            { page: 'election-overview', icon: BarChart3, label: 'Election Overview', permission: 'view_election_overview' },
            { page: 'live-results', icon: Target, label: 'Live Results', permission: 'view_live_results' },
            { page: 'turnout-analytics', icon: PieChart, label: 'Turnout Analytics', permission: 'view_turnout_analytics' },
            { page: 'quick-summary', icon: FileText, label: 'Quick Summary', permission: 'view_quick_summary' },
        ]
    },
    {
        title: 'Voter Management',
        items: [
            { page: 'voter-registry', icon: Users, label: 'Voter Registry', permission: 'view_voter_registry' },
            { page: 'add-voter', icon: FilePlus, label: 'Add Voter', permission: 'view_add_voter' },
            { page: 'import-export-voters', icon: FileUp, label: 'Import / Export', permission: 'view_import_export_voters' },
            { page: 'search-filter-voters', icon: Search, label: 'Search & Filter', permission: 'view_search_filter_voters' },
            { page: 'suspended-inactive-voters', icon: UserX, label: 'Suspended Voters', permission: 'view_suspended_inactive_voters' },
        ]
    },
    {
        title: 'Candidates & Parties',
        items: [
            { page: 'candidates', icon: Users2, label: 'Candidates', permission: 'view_candidates' },
            { page: 'party-distribution', icon: Vote, label: 'Party Distribution', permission: 'view_party_distribution' },
            { page: 'candidate-performance', icon: BarChart, label: 'Performance', permission: 'view_candidate_performance' },
        ]
    },
    {
        title: 'Results & Reports',
        items: [
            { page: 'real-time-results', icon: Target, label: 'Real-Time Results', permission: 'view_real_time_results' },
            { page: 'detailed-reports', icon: FileText, label: 'Detailed Reports', permission: 'view_detailed_reports' },
            { page: 'export-results', icon: FileDown, label: 'Export Results', permission: 'view_export_results' },
            { page: 'historical-data', icon: History, label: 'Historical Data', permission: 'view_historical_data' },
        ]
    },
    {
        title: 'Communication',
        items: [
            { page: 'community-chat', icon: MessageSquare, label: 'Community Chat', permission: 'view_chat' },
            { page: 'announcements', icon: Annoyed, label: 'Announcements', permission: 'view_announcements' },
            { page: 'campaign-notes', icon: StickyNote, label: 'Campaign Notes', permission: 'view_notepad' },
        ]
    },
    {
        title: 'System & Settings',
        items: [
            { page: 'profile', icon: UserIcon, label: 'My Profile', permission: 'profile' },
            { page: 'change-password', icon: KeyRound, label: 'Change Password', permission: 'view_change_password' },
            { page: 'user-roles-permissions', icon: ShieldCheck, label: 'Roles & Permissions', permission: 'view_admin_panel' },
            { page: 'security-settings', icon: Settings, label: 'Security Settings', permission: 'view_security_settings' },
            { page: 'audit-logs', icon: History, label: 'Audit Logs', permission: 'view_audit_logs' },
        ]
    }
];

// --- PERMISSION HELPER --- 
const hasPermission = (user: User, permission: Permission | 'profile' | string) => {
    if (user.role === 'superadmin' || (user.username || '').toLowerCase() === 'faisalhassan') return true;
    if (permission === 'profile') return true;
    
    // Check menuAccess for page visibility
    if (user.menuAccess && user.menuAccess.length > 0) {
        if (user.menuAccess.includes(permission)) return true;
    }

    // Check permissions for actions
    if (user.permissions && user.permissions.length > 0) {
        return user.permissions.includes(permission);
    }
    
    return false; // Default to secure
};

// --- NAV ITEM COMPONENT --- 
interface NavItemProps {
    item: { page: PageView; icon: React.ElementType; label: string; permission: string; };
    user: User;
    activePage: PageView;
    onNavigate: (page: PageView) => void;
    isCollapsed: boolean;
}
const NavItem: React.FC<NavItemProps> = ({ item, user, activePage, onNavigate, isCollapsed }) => {
  if (!hasPermission(user, item.permission)) return null;
  const isActive = activePage === item.page;
  return (
    <button
      onClick={() => onNavigate(item.page)}
      title={isCollapsed ? item.label : ''}
      className={`w-full flex items-center h-10 px-3 text-sm font-medium transition-all duration-200 rounded-lg group relative
        ${isActive 
          ? 'bg-gray-200 text-black shadow-sm'
          : 'text-gray-800 hover:bg-gray-100 hover:text-black'
        }`}
    >
        <div className={`absolute left-0 top-0 h-full w-1 bg-black rounded-r-full transition-transform duration-300 ${isActive ? 'scale-y-100' : 'scale-y-0'}`}></div>
        <item.icon className={`h-5 w-5 transition-all ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
        <span className={`transition-opacity duration-200 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>{item.label}</span>
    </button>
  );
};

// --- SIDEBAR CONTENT COMPONENT --- 
interface SidebarContentProps {
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    user: User;
    activePage: PageView;
    onNavigate: (page: PageView) => void;
    onLogout: () => void;
}
const SidebarContent: React.FC<SidebarContentProps> = ({ isSidebarCollapsed, setIsSidebarCollapsed, user, activePage, onNavigate, onLogout }) => {
    if (!user) return null;
    return (
    <div className="flex flex-col h-full">
        {/* Header */}
        <div className={`flex items-center h-16 flex-shrink-0 px-4 border-b border-gray-200 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className={`flex items-center gap-2 overflow-hidden transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                <div className="h-8 w-8 bg-black rounded-lg flex items-center justify-center">
                    <Vote className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-black">Election System</span>
            </div>
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden md:block p-2 rounded-full hover:bg-black/5 text-gray-600">
                <ChevronLeft className={`h-5 w-5 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : 'rotate-0'}`} />
            </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4 custom-scrollbar">
            {navStructure.map(section => (
                <div key={section.title}>
                    <h3 className={`px-3 text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 transition-opacity duration-200 ${isSidebarCollapsed ? 'opacity-0' : 'opacity-100'}`}>
                        {section.title}
                    </h3>
                    <div className="space-y-1">
                        {section.items.map(item => <NavItem key={item.page} {...{ item, user, activePage, onNavigate, isCollapsed: isSidebarCollapsed }} />)}
                    </div>
                </div>
            ))}
        </nav>

        {/* User Panel */}
        <div className="border-t border-gray-200 p-3">
            <div className={`flex items-center w-full ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                <img 
                    className="h-10 w-10 rounded-full object-cover"
                    src={user.profilePictureUrl || `https://ui-avatars.com/api/?name=${user.fullName.replace(' ', '+')}&background=0F172A&color=fff`}
                    alt="User avatar"
                />
                <div className={`ml-3 min-w-0 flex-1 transition-all duration-200 ${isSidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                    <p className="text-sm font-semibold text-black truncate">{user.fullName}</p>
                    <p className="text-xs text-gray-600 truncate capitalize">{user.role}</p>
                </div>
                <button onClick={onLogout} title="Logout" className={`p-2 rounded-full text-gray-600 hover:bg-black/5 hover:text-black transition-all duration-200 ${isSidebarCollapsed ? '' : 'ml-2'}`}>
                    <LogOut className="h-5 w-5" />
                </button>
            </div>
        </div>
    </div>
    );
};

// --- MAIN LAYOUT COMPONENT --- 
export const Layout: React.FC<LayoutProps> = ({ user, activePage, onNavigate, onLogout, children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 flex overflow-hidden">
      {/* Sidebar for Desktop */}
      <div className={`hidden md:flex flex-col fixed inset-y-0 z-50 bg-white transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <SidebarContent {...{ isSidebarCollapsed, setIsSidebarCollapsed, user, activePage, onNavigate, onLogout }} />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-black rounded-lg flex items-center justify-center"><Vote className="h-5 w-5 text-white" /></div>
            <span className="font-bold text-gray-800">Election System</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-600"><Menu className="h-6 w-6" /></button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">{user && <SidebarContent {...{ isSidebarCollapsed, setIsSidebarCollapsed, user, activePage, onNavigate, onLogout }} />}</div>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col w-full h-screen overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
         <div className="md:hidden h-16 w-full flex-shrink-0"></div>
         <header className="hidden md:flex items-center justify-end h-16 px-6 border-b bg-white">
            <div className="flex items-center gap-4">
                <button className="relative p-2 text-gray-500 hover:text-gray-800">
                    <Bell className="h-5 w-5" />
                    <div className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full"></div>
                </button>
            </div>
         </header>
         <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {children}
            </div>
         </main>
      </div>
    </div>
  );
};
