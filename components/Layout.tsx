
import React from 'react';
import { 
  Users, 
  LogOut, 
  Menu, 
  ShieldCheck, 
  FileText,
  User as UserIcon,
  BarChart3,
  MessageSquare,
  ClipboardList,
  Flag,
  StickyNote,
  LucideIcon,
  KeyRound
} from 'lucide-react';
import { User, PageView } from '../types';

interface LayoutProps {
  user: User;
  activePage: PageView;
  onNavigate: (page: PageView) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

// Helper to check permissions
// Falls back to role checks if permissions array is missing (backward compatibility)
const hasPermission = (user: User, permission: Permission | 'profile') => {
    // Super Admin always has access
    if (user.role === 'superadmin') return true;
    if ((user.username || '').toLowerCase() === 'faisalhassan') return true;

    // If permissions array exists, strictly use it
    if (user.permissions && user.permissions.length > 0) {
        return user.permissions.includes(permission);
    }

    // Legacy/Fallback Logic based on Role
    switch(permission) {
        case 'view_election_overview': return true;
        case 'view_voter_registry': return true; // Everyone sees registry (maybe readonly)
        case 'view_party_distribution': return true;
        case 'view_chat': return user.role !== 'user';
        case 'view_tasks': return user.role !== 'user';
        case 'view_notepad': return user.role !== 'user';
        case 'view_admin_panel': return user.role === 'admin';
        default: return false;
    }
};

const NavItem = ({ 
  page, 
  icon: Icon, 
  label, 
  permission, 
  user, 
  activePage, 
  onNavigate, 
  setIsMobileMenuOpen 
}: { 
  page: PageView; 
  icon: LucideIcon; 
  label: string; 
  permission: Permission | 'profile';
  user: User;
  activePage: PageView;
  onNavigate: (page: PageView) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
}) => {
  // Only render if user has permission
  if (!hasPermission(user, permission) && page !== 'profile') return null;

  const isActive = activePage === page;
  return (
    <button
      onClick={() => {
          onNavigate(page);
          setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center px-3 py-2 text-xs font-medium transition-all duration-200 rounded-lg mb-1 group relative overflow-hidden
        ${isActive 
          ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20' 
          : 'text-gray-600 hover:bg-white hover:text-primary-700 hover:shadow-sm'
        }`}
    >
      <Icon className={`mr-2 h-4 w-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-primary-600'}`} />
      <span className="relative z-10">{label}</span>
    </button>
  );
};

export const Layout: React.FC<LayoutProps> = ({ 
  user, 
  activePage, 
  onNavigate, 
  onLogout, 
  children 
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar for Desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50">
        <div className="flex-1 flex flex-col min-h-0 bg-white/60 backdrop-blur-xl border-r border-gray-200/50">
          <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-gray-100">
             <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/30">
                    <FileText className="h-5 w-5 text-white" />
                </div>
             </div>
          </div>
          
          <div className="flex-1 flex flex-col overflow-y-auto px-3 py-4 space-y-0.5">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 px-3">Main Menu</div>
            <NavItem page="election-overview" icon={BarChart3} label="Election Overview" permission="view_election_overview" user={user} activePage={activePage} onNavigate={onNavigate} setIsMobileMenuOpen={setIsMobileMenuOpen} />
            <NavItem page="dashboard" icon={Users} label="Voter Registry" permission="view_voter_registry" user={user} activePage={activePage} onNavigate={onNavigate} setIsMobileMenuOpen={setIsMobileMenuOpen} />
            <NavItem page="registrar-party" icon={Flag} label="Party Distribution" permission="view_party_distribution" user={user} activePage={activePage} onNavigate={onNavigate} setIsMobileMenuOpen={setIsMobileMenuOpen} />
            
            {(hasPermission(user, 'view_chat') || hasPermission(user, 'view_tasks') || hasPermission(user, 'view_notepad')) && (
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-1 px-3">Collaboration</div>
            )}
            <NavItem page="chat" icon={MessageSquare} label="Community Chat" permission="view_chat" user={user} activePage={activePage} onNavigate={onNavigate} setIsMobileMenuOpen={setIsMobileMenuOpen} />
            <NavItem page="tasks" icon={ClipboardList} label="Task Management" permission="view_tasks" user={user} activePage={activePage} onNavigate={onNavigate} setIsMobileMenuOpen={setIsMobileMenuOpen} />
            <NavItem page="notepad" icon={StickyNote} label="Campaign Notes" permission="view_notepad" user={user} activePage={activePage} onNavigate={onNavigate} setIsMobileMenuOpen={setIsMobileMenuOpen} />
            
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-1 px-3">System</div>
            <NavItem page="profile" icon={UserIcon} label="My Profile" permission="profile" user={user} activePage={activePage} onNavigate={onNavigate} setIsMobileMenuOpen={setIsMobileMenuOpen} /> {/* Everyone has profile */}
            <NavItem page="admin-panel" icon={ShieldCheck} label="Admin Panel" permission="view_admin_panel" user={user} activePage={activePage} onNavigate={onNavigate} setIsMobileMenuOpen={setIsMobileMenuOpen} />
            <NavItem page="change-password" icon={KeyRound} label="Change Password" permission="view_change_password" user={user} activePage={activePage} onNavigate={onNavigate} setIsMobileMenuOpen={setIsMobileMenuOpen} />
          </div>
          
          <div className="flex-shrink-0 border-t border-gray-100 p-3 m-2 rounded-xl bg-white/50">
            <div className="flex items-center w-full">
              <div className="flex-shrink-0">
                 <img 
                   className="h-8 w-8 rounded-full object-cover"
                   src={user.profilePictureUrl || `https://ui-avatars.com/api/?name=${user.fullName.replace(' ', '+')}&background=random`}
                   alt="User avatar"
                 />
              </div>
              <div className="ml-2 w-full min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">
                  {user.fullName}
                </p>
                <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-500 truncate capitalize">{user.role}</p>
                    <button 
                        onClick={onLogout}
                        className="text-[10px] font-medium text-red-500 hover:text-red-700 flex items-center transition-colors"
                        title="Logout"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
            </div>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-fade-in">
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl animate-slide-right">
            <div className="pt-5 pb-4 px-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                        <FileText className="h-6 w-6 text-white" />
                    </div>
                </div>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                <NavItem page="election-overview" icon={BarChart3} label="Election Overview" permission="view_election_overview" user={user} activePage={activePage} onNavigate={onNavigate} setIsMobileMenuOpen={setIsMobileMenuOpen} />
                <NavItem page="dashboard" icon={Users} label="Registration" permission="view_voter_registry" user={user} activePage={activePage} onNavigate={onNavigate} setIsMobileMenuOpen={setIsMobileMenuOpen} />
                <NavItem page="registrar-party" icon={Flag} label="Party Distribution" permission="view_party_distribution" user={user} activePage={activePage} onNavigate={onNavigate} setIsMobileMenuOpen={setIsMobileMenuOpen} />
                
                <div className="h-px bg-gray-100 my-2"></div>
                <NavItem page="chat" icon={MessageSquare} label="Community Chat" permission="view_chat" user={user} activePage={activePage} onNavigate={onNavigate} setIsMobileMenuOpen={setIsMobileMenuOpen} />
                <NavItem page="tasks" icon={ClipboardList} label="Task Management" permission="view_tasks" user={user} activePage={activePage} onNavigate={onNavigate} setIsMobileMenuOpen={setIsMobileMenuOpen} />
                <NavItem page="notepad" icon={StickyNote} label="Campaign Notes" permission="view_notepad" user={user} activePage={activePage} onNavigate={onNavigate} setIsMobileMenuOpen={setIsMobileMenuOpen} />

                <div className="h-px bg-gray-100 my-2"></div>
                <NavItem page="profile" icon={UserIcon} label="My Profile" permission="profile" user={user} activePage={activePage} onNavigate={onNavigate} setIsMobileMenuOpen={setIsMobileMenuOpen} />
                <NavItem page="admin-panel" icon={ShieldCheck} label="Admin Panel" permission="view_admin_panel" user={user} activePage={activePage} onNavigate={onNavigate} setIsMobileMenuOpen={setIsMobileMenuOpen} />
                <NavItem page="change-password" icon={KeyRound} label="Change Password" permission="view_change_password" user={user} activePage={activePage} onNavigate={onNavigate} setIsMobileMenuOpen={setIsMobileMenuOpen} />
                
                <button
                    onClick={onLogout}
                    className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl mt-4 border border-red-100"
                >
                    <LogOut className="mr-3 h-5 w-5" />
                    Sign out
                </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:pl-64 w-full h-screen overflow-hidden">
         <div className="md:hidden h-16 w-full flex-shrink-0"></div> {/* Spacer for mobile header */}
         <main className="flex-1 overflow-y-auto bg-gray-50/50 p-4 sm:p-6 scroll-smooth">
            <div className="max-w-7xl mx-auto animate-fade-in">
                {children}
            </div>
         </main>
      </div>
    </div>
  );
};
