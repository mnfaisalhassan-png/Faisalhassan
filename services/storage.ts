
import { createClient } from '@supabase/supabase-js';
import { STORAGE_KEYS } from '../constants';
import { User, VoterRecord, ChatMessage, Task, AuditLog, AppNote, Announcement, Candidate } from '../types';
import { MOCK_ANNOUNCEMENTS } from './mock-data';

// Supabase Configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const storageService = {
  // --- SESSION MANAGEMENT (Local Storage) ---
  
  init: async () => {
    console.log("Supabase Service Initialized");
    // We defer setup checks to the Login component to provide UI feedback
  },

  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  // --- SYSTEM CHECKS ---

  hasUsers: async (): Promise<boolean> => {
    // Check if users table exists and has data
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error; // Will throw if table missing
    return (count || 0) > 0;
  },

  // --- USERS (Supabase) ---

  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }
    return data.map((u: Record<string, unknown>) => ({
      id: u.id,
      username: u.username,
      password: u.password,
      fullName: u.full_name,
      role: u.role,
      email: u.email,
      isBlocked: u.is_blocked || false,
      permissions: u.permissions || [],
      profilePictureUrl: u.profile_picture_url
    }));
  },

  createUser: async (user: User) => {
    const { error } = await supabase.from('users').insert([{
      username: user.username,
      password: user.password,
      full_name: user.fullName,
      role: user.role,
      is_blocked: user.isBlocked || false,
      permissions: user.permissions || [],
      profile_picture_url: user.profilePictureUrl
    }]);
    if (error) throw error;
  },

  updateUser: async (user: User) => {
    const { error } = await supabase.from('users').update({
      username: user.username,
      password: user.password,
      full_name: user.fullName,
      role: user.role,
      is_blocked: user.isBlocked,
      permissions: user.permissions || [],
      profile_picture_url: user.profilePictureUrl
    }).eq('id', user.id);
    if (error) throw error;
  },

  updateUserBlockStatus: async (userId: string, isBlocked: boolean) => {
    const { error } = await supabase.from('users').update({
        is_blocked: isBlocked
    }).eq('id', userId);
    if (error) throw error;
  },

  deleteUser: async (id: string) => {
    // Manually delete dependent records because default tables don't always have ON DELETE CASCADE set up
    await supabase.from('messages').delete().eq('user_id', id);
    await supabase.from('tasks').delete().eq('assigned_to', id);
    await supabase.from('tasks').delete().eq('assigned_by', id);
    await supabase.from('app_notes').delete().eq('user_id', id);

    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
  },

  // --- VOTERS (Supabase) ---

  getVoters: async (): Promise<VoterRecord[]> => {
    const { data, error } = await supabase.from('voters').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching voters:', error);
      return [];
    }
    return data.map((v: Record<string, unknown>) => ({
      id: v.id,
      idCardNumber: v.id_card_number,
      fullName: v.full_name,
      gender: v.gender,
      address: v.address,
      island: v.island,
      phoneNumber: v.phone_number,
      hasVoted: v.has_voted,
      registrarParty: v.registrar_party,
      sheema: v.sheema,
      sadiq: v.shadda,
      rRoshi: v.r_roshi,
      communicated: v.communicated,
      notes: v.notes,
      createdAt: new Date(v.created_at).getTime(),
      updatedAt: v.updated_at ? new Date(v.updated_at).getTime() : Date.now()
    }));
  },

  createVoter: async (voter: VoterRecord) => {
    const { error } = await supabase.from('voters').insert([{
      id_card_number: voter.idCardNumber,
      full_name: voter.fullName,
      gender: voter.gender,
      address: voter.address,
      island: voter.island,
      phone_number: voter.phoneNumber,
      has_voted: voter.hasVoted,
      registrar_party: voter.registrarParty,
      sheema: voter.sheema,
      shadda: voter.sadiq,
      r_roshi: voter.rRoshi,
      communicated: voter.communicated,
      notes: voter.notes,
      created_at: new Date().toISOString()
    }]);
    if (error) throw error;
  },

  updateVoter: async (voter: VoterRecord) => {
    const { error } = await supabase.from('voters').update({
      id_card_number: voter.idCardNumber,
      full_name: voter.fullName,
      gender: voter.gender,
      address: voter.address,
      island: voter.island,
      phone_number: voter.phoneNumber,
      has_voted: voter.hasVoted,
      registrar_party: voter.registrarParty,
      sheema: voter.sheema,
      shadda: voter.sadiq,
      r_roshi: voter.rRoshi,
      communicated: voter.communicated,
      notes: voter.notes,
      updated_at: new Date().toISOString()
    }).eq('id', voter.id);
    if (error) throw error;
  },

  deleteVoter: async (id: string) => {
    const { error } = await supabase.from('voters').delete().eq('id', id);
    if (error) throw error;
  },

  getPartyStats: async (): Promise<Record<string, { total: number; voted: number }>> => {
    const { data, error } = await supabase.rpc('get_party_stats');

    if (error) {
      console.error('Error fetching party stats:', error);
      return {};
    }

    const stats: Record<string, { total: number; voted: number }> = {};
    data.forEach((row: { registrar_party: string; total_voters: number; voted_voters: number }) => {
      stats[row.registrar_party] = {
        total: row.total_voters,
        voted: row.voted_voters,
      };
    });
    return stats;
  },

  // --- SETTINGS: ISLANDS & PARTIES (Supabase) ---

  getIslands: async (): Promise<{ id: string; name: string }[]> => {
    const { data, error } = await supabase.from('islands').select('id, name').order('name');
    if (error) {
      console.error('Error fetching islands:', error);
      return [];
    }
    return data;
  },

  addIsland: async (name: string) => {
    const { error } = await supabase.from('islands').insert([{ name }]);
    if (error) throw error;
  },

  deleteIsland: async (id: string) => {
    const { error } = await supabase.from('islands').delete().eq('id', id);
    if (error) throw error;
  },

  getParties: async (): Promise<{ id: string; name: string }[]> => {
    const { data, error } = await supabase.from('parties').select('id, name').order('name');
    if (error) {
      console.error('Error fetching parties:', error);
      return [];
    }
    return data;
  },

  addParty: async (name: string) => {
    const { error } = await supabase.from('parties').insert([{ name }]);
    if (error) throw error;
  },

  deleteParty: async (id: string) => {
    const { error } = await supabase.from('parties').delete().eq('id', id);
    if (error) throw error;
  },

  updateIsland: async (id: string, newName: string) => {
    const { error } = await supabase.from('islands').update({ name: newName }).eq('id', id);
    if (error) throw error;
  },

  updateParty: async (id: string, newName: string) => {
    const { error } = await supabase.from('parties').update({ name: newName }).eq('id', id);
    if (error) throw error;
  },

  getTitles: async (): Promise<{ id: string; name: string }[]> => {
    const { data, error } = await supabase.from('titles').select('id, name').order('name');
    if (error) {
      console.error('Error fetching titles:', error);
      return [];
    }
    return data;
  },

  addTitle: async (name: string) => {
    const { error } = await supabase.from('titles').insert([{ name }]);
    if (error) throw error;
  },

  deleteTitle: async (id: string) => {
    const { error } = await supabase.from('titles').delete().eq('id', id);
    if (error) throw error;
  },

  updateTitle: async (id: string, newName: string) => {
    const { error } = await supabase.from('titles').update({ name: newName }).eq('id', id);
    if (error) throw error;
  },

  // --- SETTINGS: ELECTION CONFIG ---

  getElectionSettings: async (): Promise<{ electionStart: number, electionEnd: number }> => {
    const { data, error } = await supabase.from('settings').select('*');
    
    // Default: April 4th, 2026, 8:00 AM - 4:00 PM
    const defaults = {
        electionStart: new Date('2026-04-04T08:00:00').getTime(),
        electionEnd: new Date('2026-04-04T16:00:00').getTime()
    };

    if (error || !data) return defaults;

    const startRow = data.find((r: { key: string }) => r.key === 'election_start');
    const endRow = data.find((r: { key: string }) => r.key === 'election_end');

    return {
        electionStart: startRow ? parseInt(startRow.value) : defaults.electionStart,
        electionEnd: endRow ? parseInt(endRow.value) : defaults.electionEnd
    };
  },

  updateElectionSettings: async (start: number, end: number) => {
    const { error } = await supabase.from('settings').upsert([
        { key: 'election_start', value: start.toString() },
        { key: 'election_end', value: end.toString() }
    ], { onConflict: 'key' });
    
    if (error) throw error;
  },

  // --- CHAT MESSAGES (Supabase) ---
  
  getMessages: async (limit = 50): Promise<ChatMessage[]> => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }

    if (!data) return [];

    return data.reverse().map((m: Record<string, unknown>) => ({
      id: m.id,
      userId: m.user_id,
      userName: m.user_name,
      content: m.content,
      createdAt: new Date(m.created_at).getTime()
    }));
  },

  sendMessage: async (userId: string, userName: string, content: string) => {
    const { error } = await supabase.from('messages').insert([{
      user_id: userId,
      user_name: userName,
      content: content,
      created_at: new Date().toISOString()
    }]);
    
    if (error) throw error;
  },

  deleteMessage: async (messageId: string) => {
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) throw error;
  },

  // --- TASKS (Supabase) ---

  getTasks: async (): Promise<Task[]> => {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_to_user:users!tasks_assigned_to_fkey(full_name),
        assigned_by_user:users!tasks_assigned_by_fkey(full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((t: Record<string, unknown>) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      assignedToUserId: t.assigned_to,
      assignedByUserId: t.assigned_by,
      status: t.status,
      createdAt: new Date(t.created_at).getTime(),
      assignedToName: t.assigned_to_user?.full_name,
      assignedByName: t.assigned_by_user?.full_name
    }));
  },

  createTask: async (task: Partial<Task>) => {
    const { error } = await supabase.from('tasks').insert([{
      title: task.title,
      description: task.description,
      assigned_to: task.assignedToUserId,
      assigned_by: task.assignedByUserId,
      status: 'pending',
      created_at: new Date().toISOString()
    }]);
    if (error) throw error;
  },

  updateTaskStatus: async (taskId: string, status: 'pending' | 'completed') => {
    const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId);
    if (error) throw error;
  },

  deleteTask: async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
  },

  // --- APP NOTES (Supabase) ---

  getAppNotes: async (): Promise<AppNote[]> => {
    const { data, error } = await supabase
      .from('app_notes')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return data.map((n: Record<string, unknown>) => ({
      id: n.id,
      userId: n.user_id,
      userName: n.user_name,
      title: n.title,
      content: n.content,
      color: n.color,
      createdAt: new Date(n.created_at).getTime(),
      updatedAt: new Date(n.updated_at).getTime()
    }));
  },

  createAppNote: async (note: Partial<AppNote>) => {
    const { error } = await supabase.from('app_notes').insert([{
      user_id: note.userId,
      user_name: note.userName,
      title: note.title,
      content: note.content,
      color: note.color,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }]);
    if (error) throw error;
  },

  updateAppNote: async (note: AppNote) => {
    const { error } = await supabase.from('app_notes').update({
      title: note.title,
      content: note.content,
      color: note.color,
      updated_at: new Date().toISOString()
    }).eq('id', note.id);
    if (error) throw error;
  },

  deleteAppNote: async (id: string) => {
    const { error } = await supabase.from('app_notes').delete().eq('id', id);
    if (error) throw error;
  },

  // --- AUDIT LOGS ---

  getAuditLogs: async (limit = 100): Promise<AuditLog[]> => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
        // Fail silently if table doesn't exist yet
        return [];
    }

    return data.map((l: Record<string, unknown>) => ({
      id: l.id,
      action: l.action,
      details: l.details,
      performedBy: l.performed_by,
      performedByName: l.performed_by_name,
      timestamp: new Date(l.created_at).getTime()
    }));
  },

  createAuditLog: async (action: string, details: string, user: User) => {
    // Attempt to log, but don't crash app if it fails. Return error for handling if critical.
    const { error } = await supabase.from('audit_logs').insert([{
      action,
      details,
      performed_by: user.id,
      performed_by_name: user.fullName,
      created_at: new Date().toISOString()
    }]);
    
    if (error) {
        console.error("Failed to write audit log:", error);
        return error;
    }
    return null;
  },

  // --- ANNOUNCEMENTS (Supabase) ---

  getAnnouncements: async (): Promise<Announcement[]> => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
      // Fallback to mock data if table doesn't exist yet, to prevent app crash during dev
      return MOCK_ANNOUNCEMENTS;
    }

    if (!data) return [];

    return data.map((a: Record<string, unknown>) => ({
      id: a.id as string,
      title: a.title as string,
      content: a.content as string,
      category: a.category as Announcement['category'],
      author: a.author as string,
      date: a.date as string,
      isPinned: a.is_pinned as boolean,
      isUrgent: a.is_urgent as boolean
    }));
  },

  createAnnouncement: async (announcement: Omit<Announcement, 'id'>): Promise<Announcement> => {
    const { data, error } = await supabase
      .from('announcements')
      .insert([{
        title: announcement.title,
        content: announcement.content,
        category: announcement.category,
        author: announcement.author,
        date: announcement.date,
        is_pinned: announcement.isPinned,
        is_urgent: announcement.isUrgent
      }])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      title: data.title,
      content: data.content,
      category: data.category,
      author: data.author,
      date: data.date,
      isPinned: data.is_pinned,
      isUrgent: data.is_urgent
    };
  },

  updateAnnouncement: async (announcement: Announcement): Promise<Announcement> => {
    const { data, error } = await supabase
      .from('announcements')
      .update({
        title: announcement.title,
        content: announcement.content,
        category: announcement.category,
        author: announcement.author,
        date: announcement.date,
        is_pinned: announcement.isPinned,
        is_urgent: announcement.isUrgent
      })
      .eq('id', announcement.id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      title: data.title,
      content: data.content,
      category: data.category,
      author: data.author,
      date: data.date,
      isPinned: data.is_pinned,
      isUrgent: data.is_urgent
    };
  },

  deleteAnnouncement: async (id: string): Promise<void> => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) throw error;
  },

  uploadProfilePicture: async (userId: string, file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `profile-pictures/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  // --- CANDIDATES (Supabase) ---

  getCandidates: async (): Promise<Candidate[]> => {
    const { data, error } = await supabase.from('candidates').select(`
      *,
      islands (id, name),
      parties (id, name),
      titles (id, name)
    `);
    if (error) {
      console.error('Error fetching candidates:', error);
      return [];
    }
    // Filter out any null or undefined entries in the data array
    const validData = data.filter(Boolean);

    const getRelation = (rel: { id: string; name: string } | { id: string; name: string }[] | null) => {
      if (!rel) return { id: '', name: '' };
      if (Array.isArray(rel)) {
        return rel.length > 0 ? { id: rel[0].id, name: rel[0].name } : { id: '', name: '' };
      }
      return { id: rel.id, name: rel.name };
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return validData.map((c: Record<string, any>) => {
      return {
        id: c.id,
        created_at: c.created_at,
        candidate_no: c.candidate_no,
        id_card_number: c.id_card_number,
        full_name: c.full_name,
        gender: c.gender,
        address: c.address,
        island: getRelation(c.islands),
        contact_no: c.contact_no,
        represent_party: getRelation(c.parties),
        profile_picture_url: c.profile_picture_url,
        title: getRelation(c.titles)
      };
    });
  },

  createCandidate: async (candidate: Partial<Candidate>) => {
    const { error } = await supabase.from('candidates').insert([{
      candidate_no: candidate.candidate_no,
      id_card_number: candidate.id_card_number,
      full_name: candidate.full_name,
      gender: candidate.gender,
      address: candidate.address,
      island_id: candidate.island_id,
      contact_no: candidate.contact_no,
      represent_party_id: candidate.represent_party_id,
      profile_picture_url: candidate.profile_picture_url,
      title_id: candidate.title_id
    }]);
    if (error) throw error;
  },

  updateCandidate: async (id: string, candidate: Partial<Candidate>) => {
    const { error } = await supabase.from('candidates').update({
      candidate_no: candidate.candidate_no,
      id_card_number: candidate.id_card_number,
      full_name: candidate.full_name,
      gender: candidate.gender,
      address: candidate.address,
      island_id: candidate.island_id,
      contact_no: candidate.contact_no,
      represent_party_id: candidate.represent_party_id,
      profile_picture_url: candidate.profile_picture_url,
      title_id: candidate.title_id
    }).eq('id', id);
    if (error) throw error;
  },

  deleteCandidate: async (candidate: Candidate) => {
    // First, attempt to delete the profile picture from storage if it exists
    if (candidate.profile_picture_url) {
      try {
        // Use a more robust method to extract the file path from the full public URL
        const BUCKET_NAME = 'candidate-pictures';
        const url = new URL(candidate.profile_picture_url);
        const pathParts = url.pathname.split(`/${BUCKET_NAME}/`);
        const filePath = pathParts[1];

        if (filePath) {
            const { error: deleteError } = await supabase.storage
              .from(BUCKET_NAME)
              .remove([filePath]);

            if (deleteError) {
              // Log the error but don't stop the process. The DB record is more important.
              console.error(`Could not delete profile picture '${filePath}' from storage:`, deleteError.message);
            }
        }
      } catch (storageError) {
          console.error('An unexpected error occurred during profile picture deletion:', storageError);
      }
    }

    // ALWAYS proceed to delete the candidate record from the database
    const { error: dbError } = await supabase.from('candidates').delete().eq('id', candidate.id);
    if (dbError) {
        console.error('Error deleting candidate from database:', dbError);
        throw dbError; // This is the critical error to throw
    }
  },

  uploadCandidateProfilePicture: async (candidateId: string, file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${candidateId.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('candidate-pictures')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('candidate-pictures')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
};
