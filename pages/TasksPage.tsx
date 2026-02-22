
import React, { useState, useEffect, useMemo } from 'react';
import { User, Task } from '../types';
import { storageService } from '../services/storage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TextArea } from '../components/ui/TextArea';
import { Modal } from '../components/ui/Modal';
import { 
  ClipboardList, Plus, CheckCircle, Circle, 
  Trash2, User as UserIcon, Calendar, 
  Database, Terminal, AlertTriangle, Shield,
  Filter, LayoutGrid, List as ListIcon, Clock,
  CheckSquare, BarChart3, ArrowRight
} from 'lucide-react';

interface TasksPageProps {
  currentUser: User;
}

export const TasksPage: React.FC<TasksPageProps> = ({ currentUser }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // View State
  const [viewFilter, setViewFilter] = useState<'all' | 'mine'>('mine');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Create Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  
  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  
  // Error / Setup State
  const [dbError, setDbError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isSuperAdmin = currentUser.role === 'superadmin' || currentUser.username.toLowerCase() === 'faisalhassan';
  const isAdmin = isSuperAdmin || currentUser.role === 'admin';
  const isCandidate = currentUser.role === 'candidate';
  const canViewAll = isAdmin || isCandidate;

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const tasksData = await storageService.getTasks();
      setTasks(tasksData);
      setDbError(false);
    } catch (e: any) {
      console.error("Fetch Tasks Error:", e);
      if (
        e.code === '42P01' || 
        (e.message && (
            e.message.includes('relation "tasks" does not exist') || 
            e.message.includes('Could not find the table') || 
            e.message.includes('schema cache')
        ))
      ) {
          setDbError(true);
      } else {
          setErrorMsg("Failed to load tasks.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  useEffect(() => {
    if (isModalOpen && isAdmin) {
      const fetchUsers = async () => {
        try {
          const usersData = await storageService.getUsers();
          setUsers(usersData);
        } catch (error) {
          console.error("Failed to load users for dropdown:", error);
        }
      };
      fetchUsers();
    }
  }, [isModalOpen, isAdmin]);

  // --- DERIVED DATA ---
  const filteredTasks = useMemo(() => {
      return tasks.filter(t => {
          // Visibility Logic:
          // Admins & Candidates: Can see all if they choose 'all' view
          // Normal Users: Can ONLY see their own tasks
          
          if (!canViewAll && t.assignedToUserId !== currentUser.id) {
              return false;
          }

          const matchesView = viewFilter === 'all' ? true : t.assignedToUserId === currentUser.id;
          const matchesStatus = statusFilter === 'all' ? true : t.status === statusFilter;
          return matchesView && matchesStatus;
      });
  }, [tasks, viewFilter, statusFilter, currentUser.id, canViewAll]);

  const stats = useMemo(() => {
      const relevantTasks = canViewAll ? tasks : tasks.filter(t => t.assignedToUserId === currentUser.id);
      
      const myTasks = tasks.filter(t => t.assignedToUserId === currentUser.id);
      const myCompleted = myTasks.filter(t => t.status === 'completed').length;
      
      const totalCompleted = relevantTasks.filter(t => t.status === 'completed').length;
      
      return {
          total: relevantTasks.length,
          completed: totalCompleted,
          pending: relevantTasks.length - totalCompleted,
          myTotal: myTasks.length,
          myCompleted: myCompleted,
          myPending: myTasks.length - myCompleted,
          completionRate: relevantTasks.length > 0 ? Math.round((totalCompleted / relevantTasks.length) * 100) : 0
      };
  }, [tasks, currentUser.id, canViewAll]);

  // --- ACTIONS ---

  const handleCreateTask = async () => {
    setFormError(null);
    if (!newTaskTitle.trim()) {
        setFormError("Task title is required.");
        return;
    }
    if (!assignedUserId) {
        setFormError("Please select a user to assign the task to.");
        return;
    }

    if (isAdmin && users.length > 0) {
        const me = users.find(u => u.id === currentUser.id);
        if (!me) {
            setFormError("Session Error: Your account ID mismatch. Please Sign Out and Log In again.");
            return;
        }
    }

    try {
      await storageService.createTask({
        title: newTaskTitle,
        description: newTaskDesc || '',
        assignedToUserId: assignedUserId,
        assignedByUserId: currentUser.id
      });
      handleCloseModal();
      fetchData();
    } catch (e: any) {
      console.error("Create Task Error:", e);
      const msg = e.message || "Failed to save task.";
      if (
        msg.includes('Could not find the table') || 
        msg.includes('schema cache') || 
        msg.includes('relation "tasks" does not exist')
      ) {
          setDbError(true);
          setIsModalOpen(false);
          return;
      }
      setFormError(msg);
    }
  };

  const handleCloseModal = () => {
      setIsModalOpen(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setFormError(null);
      setAssignedUserId(''); 
  };

  const handleToggleStatus = async (task: Task) => {
    // Only assignee can complete their task
    if (task.assignedToUserId !== currentUser.id) return;

    try {
      const newStatus = task.status === 'pending' ? 'completed' : 'pending';
      await storageService.updateTaskStatus(task.id, newStatus);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    } catch (e) {
      alert("Failed to update status");
      fetchData();
    }
  };

  const initiateDeleteTask = (taskId: string) => {
    if (!isAdmin) return;
    setTaskToDelete(taskId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete || !isAdmin) return;

    try {
      await storageService.deleteTask(taskToDelete);
      setTasks(prev => prev.filter(t => t.id !== taskToDelete));
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
    } catch (e) {
      alert("Failed to delete task");
    }
  };

  if (dbError) {
      return (
        <div className="flex flex-col h-[calc(100vh-6rem)] max-w-5xl mx-auto p-4 items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-md border border-red-200 max-w-2xl w-full text-center">
                <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <Database className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Task System Unavailable</h2>
                <p className="text-gray-600 mb-6">The task database table is missing.</p>
                <div className="bg-gray-800 rounded-md p-4 w-full relative group text-left mb-6">
                    <div className="absolute top-2 right-2 text-xs text-gray-400 flex items-center"><Terminal className="w-3 h-3 mr-1" /> SQL</div>
                    <code className="text-xs text-green-400 whitespace-pre-wrap break-all font-mono">
{`create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  assigned_to uuid references users(id),
  assigned_by uuid references users(id),
  status text default 'pending',
  created_at timestamptz default now()
);
alter table tasks enable row level security;
create policy "Public Access Tasks" on tasks for all using (true) with check (true);`}
                    </code>
                </div>
                <Button onClick={() => fetchData()}>Retry Connection</Button>
            </div>
        </div>
      );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ClipboardList className="mr-3 h-8 w-8 text-primary-600"/>
            Task Center
          </h1>
          <p className="text-gray-500 mt-2">Manage election logistics and team assignments.</p>
        </div>
        <div className="flex gap-3">
             {isAdmin && (
                <Button onClick={() => setIsModalOpen(true)} className="shadow-lg shadow-primary-500/20">
                    <Plus className="h-5 w-5 mr-2" /> Assign Task
                </Button>
             )}
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Progress Ring Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex items-center relative overflow-hidden">
               <div className="absolute right-0 top-0 h-full w-2 bg-gradient-to-b from-primary-400 to-primary-600"></div>
               <div className="flex-1">
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                       {canViewAll ? 'System Completion' : 'My Completion'}
                   </p>
                   <h3 className="text-3xl font-bold text-gray-900">{stats.completionRate}%</h3>
                   <p className="text-xs text-gray-500 mt-1">{stats.completed} of {stats.total} tasks done</p>
               </div>
               <div className="h-16 w-16 relative">
                   <svg className="w-full h-full transform -rotate-90">
                       <circle cx="32" cy="32" r="28" stroke="#f3f4f6" strokeWidth="6" fill="transparent" />
                       <circle cx="32" cy="32" r="28" stroke="#16a34a" strokeWidth="6" fill="transparent" strokeDasharray={2 * Math.PI * 28} strokeDashoffset={2 * Math.PI * 28 * (1 - stats.completionRate / 100)} className="transition-all duration-1000 ease-out" />
                   </svg>
               </div>
          </div>

          {/* My Workload */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col justify-center">
               <div className="flex justify-between items-center mb-2">
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">My Workload</p>
                   <UserIcon className="h-4 w-4 text-primary-500" />
               </div>
               <div className="flex items-end gap-2">
                   <h3 className="text-3xl font-bold text-gray-900">{stats.myPending}</h3>
                   <span className="text-sm text-gray-500 mb-1.5">pending tasks</span>
               </div>
               <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
                   <div className="bg-primary-500 h-1.5 rounded-full" style={{width: `${stats.myTotal > 0 ? (stats.myCompleted/stats.myTotal)*100 : 0}%`}}></div>
               </div>
          </div>

          {/* Pending Overview */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col justify-center">
               <div className="flex justify-between items-center mb-2">
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                       {canViewAll ? 'System Pending' : 'Total Pending'}
                   </p>
                   <Clock className="h-4 w-4 text-orange-500" />
               </div>
               <div className="flex items-end gap-2">
                   <h3 className="text-3xl font-bold text-gray-900">{stats.pending}</h3>
                   <span className="text-sm text-gray-500 mb-1.5">tasks remaining</span>
               </div>
               <div className="flex gap-1 mt-3">
                   {[1,2,3,4,5].map(i => (
                       <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= (stats.pending > 5 ? 5 : stats.pending) ? 'bg-orange-300' : 'bg-gray-100'}`}></div>
                   ))}
               </div>
          </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-gray-200 pb-1">
           <div className="flex gap-6">
                <button 
                    onClick={() => setViewFilter('mine')}
                    className={`pb-3 text-sm font-medium transition-all relative ${viewFilter === 'mine' ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    My Tasks
                    {viewFilter === 'mine' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-600 rounded-t-full"></span>}
                </button>
                {canViewAll && (
                    <button 
                        onClick={() => setViewFilter('all')}
                        className={`pb-3 text-sm font-medium transition-all relative ${viewFilter === 'all' ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        All Tasks
                        {viewFilter === 'all' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-600 rounded-t-full"></span>}
                    </button>
                )}
           </div>

           <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                {(['all', 'pending', 'completed'] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                            statusFilter === s 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {s}
                    </button>
                ))}
           </div>
      </div>

      {/* Task Grid */}
      <div className="bg-gray-50/50 rounded-3xl min-h-[400px]">
        {isLoading ? (
            <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div></div>
        ) : filteredTasks.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center opacity-60">
                <div className="bg-gray-100 p-6 rounded-full mb-4">
                    <CheckSquare className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">All Caught Up!</h3>
                <p className="text-gray-500 max-w-sm mt-2">There are no tasks matching your filters. {isAdmin && "Create a new task to get started."}</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTasks.map(task => {
                    const isAssignedToMe = task.assignedToUserId === currentUser.id;
                    const isCompleted = task.status === 'completed';
                    
                    return (
                        <div 
                            key={task.id} 
                            className={`
                                group relative bg-white rounded-2xl p-5 border transition-all duration-300 hover:shadow-lg hover:-translate-y-1
                                ${isCompleted ? 'border-gray-200 bg-gray-50/50' : 'border-gray-200'}
                            `}
                        >
                            {/* Status Stripe */}
                            <div className={`absolute left-0 top-6 w-1 h-12 rounded-r-full ${isCompleted ? 'bg-green-500' : 'bg-yellow-400'}`}></div>

                            <div className="flex justify-between items-start mb-3 pl-3">
                                <span className={`
                                    px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                                    ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}
                                `}>
                                    {task.status}
                                </span>
                                {isAdmin && (
                                    <button 
                                        onClick={() => initiateDeleteTask(task.id)}
                                        className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            <div className="pl-3 mb-4 min-h-[80px]">
                                <h3 className={`font-bold text-gray-900 leading-snug mb-2 ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                                    {task.title}
                                </h3>
                                <p className="text-sm text-gray-500 line-clamp-2">{task.description || 'No additional details provided.'}</p>
                            </div>

                            <div className="pl-3 pt-4 border-t border-gray-100 flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm" title={`Assigned to ${task.assignedToName}`}>
                                        {task.assignedToName?.charAt(0) || '?'}
                                    </div>
                                    <div className="flex flex-col ml-2">
                                        <span className="text-[10px] text-gray-400 uppercase">Assigned To</span>
                                        <span className="text-xs font-semibold text-gray-700 max-w-[80px] truncate">{task.assignedToName}</span>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => handleToggleStatus(task)}
                                    disabled={!isAssignedToMe}
                                    className={`
                                        rounded-lg p-2 transition-all flex items-center gap-2
                                        ${!isAssignedToMe 
                                            ? 'opacity-30 cursor-not-allowed' 
                                            : isCompleted 
                                                ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                                                : 'bg-gray-100 text-gray-600 hover:bg-primary-600 hover:text-white'
                                        }
                                    `}
                                >
                                    {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                    {isCompleted ? <span className="text-xs font-bold">Done</span> : <span className="text-xs font-bold">Complete</span>}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </div>

      {/* CREATE TASK MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Create New Assignment"
        footer={
          <>
            <Button variant="secondary" onClick={handleCloseModal}>Cancel</Button>
            <Button onClick={handleCreateTask}>Assign Task</Button>
          </>
        }
      >
        <div className="space-y-4">
            {formError && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-md">
                    <div className="flex">
                        <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                        <p className="text-sm text-red-700">{formError}</p>
                    </div>
                </div>
            )}
            <Input 
                label="Task Title"
                placeholder="e.g. Verify ID cards for Block A"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                autoFocus
                error={formError && !newTaskTitle ? "Title is required" : undefined}
            />
            <TextArea 
                label="Description & Instructions"
                placeholder="Provide detailed instructions for the assignee..."
                value={newTaskDesc}
                onChange={e => setNewTaskDesc(e.target.value)}
                rows={4}
            />
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                <div className="relative">
                    <select 
                        className={`block w-full border rounded-lg shadow-sm py-2.5 px-3 focus:outline-none text-sm bg-white appearance-none ${
                            !assignedUserId && formError 
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                            : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                        }`}
                        value={assignedUserId}
                        onChange={e => {
                            setAssignedUserId(e.target.value);
                            if(e.target.value) setFormError(null);
                        }}
                    >
                        <option value="">Select a team member...</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>
                                {u.fullName} ({u.role})
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <UserIcon className="h-4 w-4" />
                    </div>
                </div>
            </div>
        </div>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
        footer={
            <>
                <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                <Button variant="danger" onClick={confirmDeleteTask}>Delete Task</Button>
            </>
        }
      >
          <div className="flex flex-col items-center justify-center text-center p-4">
             <div className="bg-red-100 p-3 rounded-full mb-4">
                 <Trash2 className="h-6 w-6 text-red-600" />
             </div>
             <h3 className="text-lg font-bold text-gray-900">Delete this task?</h3>
             <p className="text-sm text-gray-500 mt-2">
                Are you sure you want to delete this task? This action cannot be undone.
             </p>
          </div>
      </Modal>
    </div>
  );
};
