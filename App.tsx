
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

  const handleUpdateProfile = async (newPassword: string, newName: string, newProfilePicture: string | null): Promise<boolean> => {
    if (!user) return false;
    
    try {
        const updatedUser = { ...user, fullName: newName, password: newPassword, profilePictureUrl: newProfilePicture || user.profilePictureUrl };
        
        // Update in DB
        // NOTE: This requires a `profile_picture_url` TEXT column in the `users` table.
        await storageService.updateUser(updatedUser);
        
        // Update local state
        setUser(updatedUser);
        storageService.setCurrentUser(updatedUser);
        
        return true;
    } catch (e) {
        console.error("Failed to update profile:", e);
        return false;
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
const ProfileForm = ({ user, onUpdate }: { user: User, onUpdate: (p: string, n: string, pp: string | null) => Promise<boolean> }) => {
    const [name, setName] = useState(user.fullName);
    const [pass, setPass] = useState(user.password || '');
    const [profilePic, setProfilePic] = useState<string | null>(user.profilePictureUrl || null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

    useEffect(() => {
        // Sync state if the user prop changes from parent (e.g., after a successful update)
        setProfilePic(user.profilePictureUrl || null);
        setName(user.fullName);
        setPass(user.password || '');
    }, [user]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setProfilePic(event.target?.result as string);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        setIsUpdating(true);
        setUpdateStatus(null);
        const success = await onUpdate(pass, name, profilePic);
        if (success) {
            setUpdateStatus({ type: 'success', message: 'Profile updated successfully!' });
        } else {
            setUpdateStatus({ type: 'error', message: 'Update failed. The database may need to be updated to support profile pictures.' });
        }
        setIsUpdating(false);
        setTimeout(() => setUpdateStatus(null), 5000); // Clear message after 5s
    };
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                    <img 
                        src={profilePic || `https://ui-avatars.com/api/?name=${user.fullName.replace(' ', '+')}&background=random`}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover border-4 border-indigo-200 shadow-md"
                    />
                    <label htmlFor="profile-pic-upload" className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700 transition-transform transform hover:scale-110">
                        <Lock className="h-4 w-4" />
                        <input id="profile-pic-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                </div>
            </div>

            {updateStatus && (
                <div className={`p-3 rounded-lg text-sm text-center ${updateStatus.type === 'success' ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`}>
                    {updateStatus.message}
                </div>
            )}

            <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} />
            <Input label="New Password" value={pass} onChange={e => setPass(e.target.value)} />
            <Button onClick={handleSubmit} isLoading={isUpdating} className="w-full">Update Profile</Button>
        </div>
    );
};

export default App;
