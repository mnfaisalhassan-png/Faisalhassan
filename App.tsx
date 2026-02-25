
import React, { useState, useEffect } from 'react';
import { storageService } from './services/storage';
import { User, PageView } from './types';
import { Login } from './pages/Login';
import { VotersDirectoryPage } from './pages/VotersDirectoryPage';
import { AdminPanel } from './pages/AdminPanel';
import { ElectionOverview } from './pages/VotingStatus';
import { ChatPage } from './pages/ChatPage';

import { RegistrarPartyPage } from './pages/RegistrarPartyPage';
import { NotepadPage } from './pages/NotepadPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { KudafariElectionPage } from './pages/KudafariElectionPage';
import { AddVoterPage } from './pages/AddVoterPage';
import { LiveResultsPage } from './pages/LiveResultsPage';
import { QuickSummaryPage } from './pages/QuickSummaryPage';
import { SecuritySettingsPage } from './pages/SecuritySettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { TasksPage } from './pages/TasksPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { Layout } from './components/Layout';


import { CheckCircle } from 'lucide-react';

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

  const handleUpdateProfile = async (newProfilePicture: string | null): Promise<boolean> => {
    if (!user) return false;
    
    try {
        const updatedUser = { ...user, profilePictureUrl: newProfilePicture || user.profilePictureUrl };
        
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

  const handleChangePassword = async (currentPassword: string, newPassword: string): Promise<{success: boolean, message: string}> => {
    if (!user) return { success: false, message: 'You must be logged in to change your password.' };

    // NOTE: In a real application, this check would be against a hashed password on a secure backend.
    if (user.password !== currentPassword) {
        return { success: false, message: 'The current password you entered is incorrect. Please try again.' };
    }

    if (user.password === newPassword) {
        return { success: false, message: 'The new password cannot be the same as the old password.' };
    }

    try {
        const updatedUser = { ...user, password: newPassword };
        
        // Update in the database
        await storageService.updateUser(updatedUser);
        
        // Update the user state in the app and in local storage
        setUser(updatedUser);
        storageService.setCurrentUser(updatedUser);
        
        return { success: true, message: 'Your password has been updated successfully!' };
    } catch (e) {
        console.error("Password update failed:", e);
        return { success: false, message: 'An unexpected error occurred while updating your password.' };
    }
  };

  const handleVoterClick = (voterId: string) => {
      setTargetVoterId(voterId);
      setCurrentPage('dashboard');
  };

  // Simple Page Router
  const renderContent = () => {
    switch (currentPage) {
      // Dashboard
      case 'election-overview': return <ElectionOverview currentUser={user!} onVoterClick={handleVoterClick} />;
            case 'live-results': return <LiveResultsPage currentUser={user!} />;
      case 'turnout-analytics': return <PlaceholderPage title="Turnout Analytics" />;
            case 'quick-summary': return <QuickSummaryPage onNavigate={setCurrentPage} />;

      // Voter Management
      case 'voter-registry': return <VotersDirectoryPage currentUser={user!} initialVoterId={targetVoterId} onClearInitialVoter={() => setTargetVoterId(null)} />;
            case 'add-voter': return <AddVoterPage currentUser={user!} />;
      case 'import-export-voters': return <PlaceholderPage title="Import / Export Voters" />;
      case 'search-filter-voters': return <PlaceholderPage title="Search & Filter" />;
      case 'suspended-inactive-voters': return <PlaceholderPage title="Suspended / Inactive Voters" />;

      // Candidates & Parties
      case 'candidates': return <PlaceholderPage title="Candidates" />;
      case 'party-distribution': return <RegistrarPartyPage currentUser={user!} />;
      case 'candidate-performance': return <PlaceholderPage title="Candidate Performance" />;

      // Results & Reports
      case 'real-time-results': return <PlaceholderPage title="Real-Time Results" />;
      case 'detailed-reports': return <PlaceholderPage title="Detailed Reports" />;
      case 'export-results': return <PlaceholderPage title="Export Results" />;
      case 'historical-data': return <PlaceholderPage title="Historical Data" />;

      // Communication
      case 'community-chat': 
        if (!user) return <PlaceholderPage title="Login Required" />;
        return <ChatPage currentUser={user} />;
      case 'announcements': return <AnnouncementsPage currentUser={user!} />;
      case 'campaign-notes': return <NotepadPage currentUser={user!} />;
      case 'tasks': return <TasksPage currentUser={user!} />;

      // System & Settings
      case 'profile': return <ProfilePage user={user!} onUpdate={handleUpdateProfile} />;
      case 'change-password': return <ChangePasswordPage currentUser={user!} onChangePassword={handleChangePassword} />;
      case 'user-roles-permissions': return <AdminPanel currentUser={user!} />;
            case 'security-settings': return <SecuritySettingsPage onNavigate={setCurrentPage} />;
      case 'audit-logs': return <AuditLogsPage currentUser={user!} />;

      // Legacy & Default
      case 'kudafari-election': return <KudafariElectionPage currentUser={user!} onVoterClick={handleVoterClick} />;
      default: return <ElectionOverview currentUser={user!} onVoterClick={handleVoterClick} />;
    }
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


export default App;
