
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { storageService } from '../services/storage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Lock, User as UserIcon, AlertCircle, Database, Shield, Info, Vote, ChevronRight } from 'lucide-react';

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
      } catch (e: any) {
          console.error("System Check Error:", e);
          if (e.message && (e.message.includes('relation') || e.message.includes('does not exist'))) {
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
      } catch (e: any) {
          setError("Failed to create admin: " + e.message);
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
    <div className="min-h-screen flex overflow-hidden bg-gray-50">
      {/* Left Side - Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary-900 overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-primary-900 to-indigo-900 opacity-90 z-10"></div>
         {/* Animated Background Elements */}
         <div className="absolute top-0 left-0 w-full h-full z-0">
             <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-particles"></div>
             <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-particles" style={{animationDelay: '5s'}}></div>
             <div className="absolute top-[50%] left-[50%] w-[30%] h-[30%] bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-particles" style={{animationDelay: '10s'}}></div>
             <div className="absolute bottom-[20%] left-[10%] w-[40%] h-[40%] bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-particles" style={{animationDelay: '15s'}}></div>
         </div>
         
         <div className="relative z-20 flex flex-col justify-center px-12 text-white">
            <div className="mb-6">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 mb-6 shadow-xl">
                    <Vote className="w-8 h-8 text-primary-300" />
                </div>
                <h1 className="text-5xl font-bold mb-4 tracking-tight">Democracy <br/> Digitalized.</h1>
                <p className="text-lg text-primary-100 max-w-md font-light leading-relaxed">
                    The official voter management and real-time analytics platform for the N.Kudafari Council Election 2026.
                </p>
            </div>
            
            <div className="mt-12 flex items-center space-x-4">
                 <div className="flex -space-x-4">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="w-10 h-10 rounded-full border-2 border-primary-900 bg-primary-200 flex items-center justify-center text-primary-800 text-xs font-bold">
                            {String.fromCharCode(64+i)}
                        </div>
                    ))}
                 </div>
                 <div className="text-sm font-medium text-primary-200">
                    Trusted by Council Members
                 </div>
            </div>
         </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 relative">
          <div className="w-full max-w-md space-y-8 animate-fade-in">
              <div className="text-center lg:text-left">
                  {/* Attractive Animated Icon */}
                  <div className="lg:hidden mx-auto w-16 h-16 bg-gradient-to-br from-primary-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-primary-500/40 animate-float">
                      <Vote className="w-8 h-8 text-white" />
                  </div>
                  
                  {/* Enhanced Title with Shadow and Gradient */}
                  <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 animate-slide-up">
                      {setupRequired === 'create-admin' ? (
                          <span className="text-gray-900">Initialize System</span>
                      ) : (
                          <span className="block">
                              <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 drop-shadow-sm">
                                Welcome back
                              </span>
                              <br/>
                              <span className="text-xl md:text-2xl text-primary-700 font-bold mt-2 block drop-shadow-md tracking-tight">
                                  (N.Kudafari Council Election @2026)
                              </span>
                          </span>
                      )}
                  </h2>
                  <p className="mt-2 text-sm text-gray-500">
                      {setupRequired === 'create-admin' 
                        ? 'Create the first administrator account to begin.' 
                        : 'Please enter your credentials to access the dashboard.'}
                  </p>
              </div>

              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
                  <form className="space-y-6" onSubmit={setupRequired === 'create-admin' ? handleCreateAdmin : handleSubmit}>
                      {error && (
                        <div className={`rounded-lg p-4 border animate-slide-up ${isBlocked ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-100'}`}>
                            <div className="flex items-start">
                                <AlertCircle className={`h-5 w-5 mt-0.5 ${isBlocked ? 'text-red-600' : 'text-yellow-600'}`} />
                                <div className={`ml-3 text-sm font-medium ${isBlocked ? 'text-red-800' : 'text-yellow-800'}`}>
                                    {error}
                                </div>
                            </div>
                        </div>
                      )}

                      {setupRequired === 'create-admin' ? (
                          <div className="space-y-4">
                              <Input label="Admin Name" value={newAdminName} onChange={e => setNewAdminName(e.target.value)} required placeholder="Full Name" />
                              <Input label="Username" value={newAdminUser} onChange={e => setNewAdminUser(e.target.value)} required placeholder="username" />
                              <Input label="Password" type="password" value={newAdminPass} onChange={e => setNewAdminPass(e.target.value)} required placeholder="••••••••" />
                          </div>
                      ) : (
                          <div className="space-y-4">
                              <div className="space-y-1">
                                  <label className="text-sm font-medium text-gray-700">Username</label>
                                  <div className="relative">
                                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                          <UserIcon className="h-5 w-5 text-gray-400" />
                                      </div>
                                      <input 
                                          type="text" 
                                          value={username}
                                          onChange={e => setUsername(e.target.value)}
                                          className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-gray-50 focus:bg-white"
                                          placeholder="Enter username"
                                          required
                                          disabled={isBlocked}
                                      />
                                  </div>
                              </div>

                              <div className="space-y-1">
                                  <div className="flex justify-between">
                                      <label className="text-sm font-medium text-gray-700">Password</label>
                                      {!setupRequired && (
                                          <button type="button" onClick={() => setShowForgotMessage(true)} className="text-sm font-medium text-primary-600 hover:text-primary-500">
                                              Forgot password?
                                          </button>
                                      )}
                                  </div>
                                  <div className="relative">
                                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                          <Lock className="h-5 w-5 text-gray-400" />
                                      </div>
                                      <input 
                                          type="password" 
                                          value={password}
                                          onChange={e => setPassword(e.target.value)}
                                          className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-gray-50 focus:bg-white"
                                          placeholder="••••••••"
                                          required
                                          disabled={isBlocked}
                                      />
                                  </div>
                              </div>
                          </div>
                      )}

                      {showForgotMessage && (
                          <div className="rounded-lg bg-blue-50 p-4 border border-blue-100 animate-slide-up">
                              <div className="flex">
                                  <Info className="h-5 w-5 text-blue-500" />
                                  <div className="ml-3 text-sm text-blue-700">
                                      Please contact the System Administrator to reset your credentials.
                                  </div>
                              </div>
                          </div>
                      )}

                      <Button 
                          type="submit" 
                          className={`w-full h-12 text-base shadow-lg transition-all transform hover:-translate-y-0.5 ${isBlocked ? 'bg-gray-400 cursor-not-allowed hover:bg-gray-400 hover:translate-y-0 shadow-none' : 'shadow-primary-500/30'}`}
                          isLoading={isLoading}
                          disabled={isBlocked}
                      >
                          {setupRequired === 'create-admin' ? 'Create System Admin' : 'Login'}
                          {setupRequired !== 'create-admin' && <ChevronRight className="ml-2 h-4 w-4" />}
                      </Button>
                  </form>
              </div>
              
              <div className="text-center">
                  <p className="text-xs text-gray-400 leading-relaxed">

                      <br/>
                      <span className="opacity-80">Developed by: ffflllaxss</span>
                  </p>
              </div>
          </div>
      </div>
    </div>
  );
};
