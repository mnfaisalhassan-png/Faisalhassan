
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { storageService } from '../services/storage';
import { Button } from '../components/ui/Button';
import { Lock, User as UserIcon, AlertCircle, Database, Info, Vote, ChevronRight } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

interface LoginAttempt {
    count: number;
    timestamp: number;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSystem, setIsCheckingSystem] = useState(true);
  
  // Setup States
  const [setupRequired, setSetupRequired] = useState<'none' | 'create-admin' | 'db-error'>('none');
  
  // Forgot Password Message State
  const [showForgotMessage, setShowForgotMessage] = useState(false);

  // Create Admin Form State
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');

  useEffect(() => {
    checkSystem();
  }, []);

  const checkSystem = async () => {
      setIsCheckingSystem(true);
      try {
          const hasUsers = await storageService.hasUsers();
          if (!hasUsers) {
              setSetupRequired('create-admin');
          } else {
              setSetupRequired('none');
          }
      } catch (e) {
          const error = e as { message?: string };
          console.error("System Check Error:", error);
          if (error.message && (error.message.includes('relation') || error.message.includes('does not exist'))) {
             setSetupRequired('db-error');
          } else {
             setSetupRequired('none');
          }
      } finally {
          setIsCheckingSystem(false);
      }
  };

  // --- Local Storage Helpers for Security ---
  const getLoginAttempts = (): Record<string, LoginAttempt> => {
      try {
          const data = localStorage.getItem('vf_login_attempts');
          return data ? JSON.parse(data) : {};
      } catch { return {}; }
  };

  const updateAttempts = (user: string, count: number) => {
      const all = getLoginAttempts();
      all[user] = { count, timestamp: Date.now() };
      localStorage.setItem('vf_login_attempts', JSON.stringify(all));
  };

  const clearAttempts = (user: string) => {
      const all = getLoginAttempts();
      if (all[user]) {
          delete all[user];
          localStorage.setItem('vf_login_attempts', JSON.stringify(all));
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsBlocked(false);
    setShowForgotMessage(false);
    setIsLoading(true);

    try {
        const users = await storageService.getUsers();
        // Identify the user by username regardless of password to check status
        const targetUser = users.find(u => u.username === username);

        // 1. Check DB Block Status First
        if (targetUser && targetUser.isBlocked) {
            setError('User is blocked by security reasons.');
            setIsBlocked(true);
            setIsLoading(false);
            return;
        }

        // 2. Check Password Match
        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
            // SUCCESS
            if (user.isBlocked) {
                // If by chance DB says blocked but we got here (race condition or manual bypass), fail it.
                setError('User is blocked by security reasons.');
                setIsBlocked(true);
            } else {
                clearAttempts(username);
                onLoginSuccess(user);
            }
        } else {
            // FAIL
            // Check Local attempts first
            const allAttempts = getLoginAttempts();
            const userAttempt = allAttempts[username];
            const currentCount = (userAttempt?.count || 0) + 1;
            updateAttempts(username, currentCount);
            
            if (currentCount >= 3) {
                const blockMsg = 'You have entered the wrong password 3 times. Your account has been blocked for security reasons.';
                setError(blockMsg);
                setIsBlocked(true);
                
                // If user exists in DB, Lock them in DB
                if (targetUser) {
                     await storageService.updateUserBlockStatus(targetUser.id, true);
                     // Log Security Event
                     const systemUser = { id: targetUser.id, fullName: 'System Security', role: 'superadmin' } as unknown as User;
                     storageService.createAuditLog(
                        'security_lockout', 
                        `Account '${username}' blocked due to 3 failed login attempts.`, 
                        systemUser
                    ).catch(console.error);
                }

            } else {
                setError(`Invalid credentials. ${3 - currentCount} attempts remaining.`);
            }
        }
    } catch (e) {
        console.error(e);
        setError('Connection failed or Database error.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!newAdminUser || !newAdminPass || !newAdminName) return;
      
      setIsLoading(true);
      try {
          const adminUser: User = {
              id: '', 
              username: newAdminUser,
              password: newAdminPass,
              fullName: newAdminName,
              role: 'admin'
          };
          await storageService.createUser(adminUser);
          const users = await storageService.getUsers();
          const created = users.find(u => u.username === newAdminUser);
          if (created) onLoginSuccess(created);
          else {
              setSetupRequired('none');
              setUsername(newAdminUser);
          }
      } catch (e) {
          setError("Failed to create admin: " + (e as Error).message);
      } finally {
          setIsLoading(false);
      }
  };

  if (isCheckingSystem) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium animate-pulse">Initializing System...</p>
        </div>
      );
  }

  // --- DATABASE ERROR ---
  if (setupRequired === 'db-error') {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white max-w-2xl w-full p-8 rounded-2xl shadow-xl border border-red-100 text-center">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <Database className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Database Connection Required</h2>
                <p className="text-gray-600 mb-6">Connect your Supabase project to proceed.</p>
                <div className="bg-gray-900 text-left p-4 rounded-lg overflow-x-auto mb-6">
                     <code className="text-xs text-green-400 font-mono">-- Run SQL setup script provided in previous steps --</code>
                </div>
                <Button onClick={() => window.location.reload()}>Retry Connection</Button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0f172a]">
      {/* Background Gradients/Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-900/20 blur-[120px] animate-pulse" style={{animationDuration: '15s'}}></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-indigo-900/20 blur-[120px] animate-pulse" style={{animationDelay: '5s', animationDuration: '15s'}}></div>
        <div className="absolute top-[40%] left-[40%] w-[40%] h-[40%] rounded-full bg-cyan-900/10 blur-[100px] animate-pulse" style={{animationDelay: '2s', animationDuration: '10s'}}></div>
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md p-6">
        {/* Soft gradient glow behind card */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 blur-3xl transform scale-105 opacity-40 -z-10 rounded-3xl"></div>
        
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 overflow-hidden relative">
            {/* Glossy highlight */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

            {/* Header */}
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 mb-6 animate-float">
                    <Vote className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight mb-2">
                    {setupRequired === 'create-admin' ? 'Initialize System' : 'Welcome Back'}
                </h2>
                <p className="text-slate-400 text-sm font-medium">
                    {setupRequired === 'create-admin' 
                      ? 'Create the first administrator account.' 
                      : 'N.Kudafari Council Election 2026'}
                </p>
            </div>

            {/* Form */}
            <form className="space-y-6" onSubmit={setupRequired === 'create-admin' ? handleCreateAdmin : handleSubmit}>
                {/* Error Display */}
                {error && (
                    <div className={`rounded-xl p-4 border backdrop-blur-md flex items-start ${isBlocked ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-amber-500/10 border-amber-500/20 text-amber-200'}`}>
                        <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                        <div className="ml-3 text-sm font-medium">{error}</div>
                    </div>
                )}

                {/* Inputs */}
                {setupRequired === 'create-admin' ? (
                     <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">Admin Name</label>
                            <input 
                                value={newAdminName} 
                                onChange={e => setNewAdminName(e.target.value)} 
                                className="block w-full px-4 py-3.5 bg-white border border-transparent rounded-xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-400 focus:outline-none text-slate-900 placeholder-slate-400 transition-all font-medium"
                                placeholder="Full Name"
                                required 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">Username</label>
                            <input 
                                value={newAdminUser} 
                                onChange={e => setNewAdminUser(e.target.value)} 
                                className="block w-full px-4 py-3.5 bg-white border border-transparent rounded-xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-400 focus:outline-none text-slate-900 placeholder-slate-400 transition-all font-medium"
                                placeholder="username"
                                required 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">Password</label>
                            <input 
                                type="password"
                                value={newAdminPass} 
                                onChange={e => setNewAdminPass(e.target.value)} 
                                className="block w-full px-4 py-3.5 bg-white border border-transparent rounded-xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-400 focus:outline-none text-slate-900 placeholder-slate-400 transition-all font-medium"
                                placeholder="••••••••"
                                required 
                            />
                        </div>
                     </div>
                ) : (
                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">Username</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <UserIcon className="h-5 w-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                                </div>
                                <input 
                                    type="text" 
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3.5 bg-white border border-transparent rounded-xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-400 focus:outline-none text-slate-900 placeholder-slate-400 transition-all shadow-sm font-medium"
                                    placeholder="Enter username"
                                    required
                                    disabled={isBlocked}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between mb-1.5 ml-1">
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Password</label>
                                {!setupRequired && (
                                    <button type="button" onClick={() => setShowForgotMessage(true)} className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
                                        Forgot password?
                                    </button>
                                )}
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                                </div>
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3.5 bg-white border border-transparent rounded-xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-400 focus:outline-none text-slate-900 placeholder-slate-400 transition-all shadow-sm font-medium"
                                    placeholder="••••••••"
                                    required
                                    disabled={isBlocked}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Forgot Password Message */}
                {showForgotMessage && (
                    <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 animate-fade-in">
                        <div className="flex">
                            <Info className="h-5 w-5 text-blue-400 shrink-0" />
                            <div className="ml-3 text-sm text-blue-200">
                                Please contact the System Administrator to reset your credentials.
                            </div>
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <Button 
                    type="submit" 
                    className={`w-full h-14 text-base font-bold tracking-wide shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all transform hover:scale-[1.02] active:scale-[0.98] rounded-xl ${isBlocked ? 'bg-slate-700 cursor-not-allowed text-slate-400 shadow-none' : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-none'}`}
                    isLoading={isLoading}
                    disabled={isBlocked}
                >
                    {setupRequired === 'create-admin' ? 'Create System Admin' : 'Sign In'}
                    {setupRequired !== 'create-admin' && <ChevronRight className="ml-2 h-5 w-5" />}
                </Button>
            </form>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8">
            <p className="text-xs text-slate-500 font-medium tracking-wide">
                SECURE ELECTION SYSTEM DEVELOPED BY• @FFFLLLAXSS 2026.
            </p>
        </div>
      </div>
    </div>
  );
};
