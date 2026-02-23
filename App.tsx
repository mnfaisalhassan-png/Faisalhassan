
import React, { useState, useEffect } from 'react';
import { storageService } from './services/storage';
import { User, PageView } from './types';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AdminPanel } from './pages/AdminPanel';
import { ElectionOverview } from './pages/VotingStatus';
import { ChatPage } from './pages/ChatPage';
import { TasksPage } from './pages/TasksPage';
import { RegistrarPartyPage } from './pages/RegistrarPartyPage';
import { NotepadPage } from './pages/NotepadPage';
import { KudafariElectionPage } from './pages/KudafariElectionPage';
import { Layout } from './components/Layout';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Lock, CheckCircle } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<PageView>('login');
  const [isLoading, setIsLoading] = useState(true);
  const [targetVoterId, setTargetVoterId] = useState<string | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);

  useEffect(() => {
    const initApp = async () => {
        // Init storage/db connection if needed
        await storageService.init();

        // Check for existing session (local storage)
        const storedUser = storageService.getCurrentUser();
        if (storedUser) {
            setUser(storedUser);
            setCurrentPage('election-overview');
        }
        setIsLoading(false);
    };
    initApp();
  }, []);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    storageService.setCurrentUser(loggedInUser);
    setCurrentPage('election-overview');

    // Show welcome message
    setWelcomeMessage(`Hello! ${loggedInUser.username} Great to see you again,`);
    setTimeout(() => setWelcomeMessage(null), 4000);
  };

  const handleLogout = () => {
    setUser(null);
    storageService.setCurrentUser(null);
    setCurrentPage('login');
  };

  const handleUpdateProfile = async (newPassword: string, newName: string) => {
    if (!user) return;
    
    try {
        const updatedUser = { ...user, fullName: newName, password: newPassword };
        
        // Update in DB
        await storageService.updateUser(updatedUser);
        
        // Update local state
        setUser(updatedUser);
        storageService.setCurrentUser(updatedUser);
        
        alert("Profile updated successfully!");
    } catch (e) {
        alert("Failed to update profile: " + (e as Error).message);
    }
  };

  const handleVoterClick = (voterId: string) => {
      setTargetVoterId(voterId);
      setCurrentPage('dashboard');
  };

  // Simple Page Router
  const renderContent = () => {
    if (currentPage === 'dashboard') {
      return (
        <Dashboard 
            currentUser={user!} 
            initialVoterId={targetVoterId}
            onClearInitialVoter={() => setTargetVoterId(null)}
        />
      );
    }
    if (currentPage === 'election-overview') {
      return <ElectionOverview currentUser={user!} onVoterClick={handleVoterClick} />;
    }
    if (currentPage === 'registrar-party') {
      return <RegistrarPartyPage currentUser={user!} />;
    }
    if (currentPage === 'chat') {
        return <ChatPage currentUser={user!} />;
    }
    if (currentPage === 'tasks') {
        return <TasksPage currentUser={user!} />;
    }
    if (currentPage === 'notepad') {
        return <NotepadPage currentUser={user!} />;
    }
    if (currentPage === 'kudafari-election') {
        return <KudafariElectionPage currentUser={user!} onVoterClick={handleVoterClick} />;
    }
    if (currentPage === 'admin-panel') {
      // Access Control: Super Admin or Admin role
      // Note: AdminPanel component handles granular permission (Read-only vs Write)
      const isAuthorized = user?.role === 'superadmin' || user?.role === 'admin' || (user?.username || '').toLowerCase() === 'faisalhassan';
      
      if (!isAuthorized) {
         // Redirect unauthorized
         return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8">
                <div className="bg-red-100 p-4 rounded-full mb-4">
                    <Lock className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
                <p className="text-gray-500 mt-2">You do not have permission to view the Admin Panel.</p>
                <Button variant="secondary" className="mt-6" onClick={() => setCurrentPage('election-overview')}>
                    Return to Dashboard
                </Button>
            </div>
         );
      }
      return <AdminPanel currentUser={user!} />;
    }
    if (currentPage === 'profile') {
      return (
        <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200">
           <div className="text-center mb-6">
              <div className="mx-auto h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                 <Lock className="h-8 w-8 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
           </div>
           
           <ProfileForm 
             user={user!} 
             onUpdate={handleUpdateProfile} 
           />
        </div>
      );
    }
    return <div>Page not found</div>;
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || currentPage === 'login') {
    return (
        <Login 
          onLoginSuccess={handleLoginSuccess} 
        />
    );
  }

  return (
    <>
        {welcomeMessage && (
            <div className="fixed top-6 right-6 z-[100] animate-slide-up">
                 <div className="bg-white rounded-xl shadow-2xl border border-green-100 p-4 flex items-center gap-4 pr-6 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
                    <div className="bg-green-100 p-2 rounded-full">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm">Welcome Back</h3>
                        <p className="text-sm text-gray-600 font-medium">{welcomeMessage}</p>
                    </div>
                 </div>
            </div>
        )}
        <Layout 
        user={user} 
        activePage={currentPage} 
        onNavigate={setCurrentPage} 
        onLogout={handleLogout}
        >
        {renderContent()}
        </Layout>
    </>
  );
};

// Internal Profile Form Component
const ProfileForm = ({ user, onUpdate }: { user: User, onUpdate: (p: string, n: string) => void }) => {
    const [name, setName] = useState(user.fullName);
    const [pass, setPass] = useState(user.password || '');
    
    return (
        <div className="space-y-4">
            <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} />
            <Input label="New Password" value={pass} onChange={e => setPass(e.target.value)} />
            <Button onClick={() => onUpdate(pass, name)} className="w-full">Update Profile</Button>
        </div>
    );
};

export default App;
