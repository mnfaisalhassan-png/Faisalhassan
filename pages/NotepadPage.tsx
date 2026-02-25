
import React, { useState, useEffect, useRef } from 'react';
import { User, AppNote } from '../types';
import { storageService } from '../services/storage';
import { aiService } from '../services/ai';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TextArea } from '../components/ui/TextArea';
import { Modal } from '../components/ui/Modal';
import { 
  StickyNote, Plus, Trash2, Calendar, 
  Database, Terminal, Search, Lock, User as UserIcon,
  Mic, Volume2, StopCircle, Loader2
} from 'lucide-react';

interface NotepadPageProps {
  currentUser: User;
}

export const NotepadPage: React.FC<NotepadPageProps> = ({ currentUser }) => {
  const [notes, setNotes] = useState<AppNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<AppNote | null>(null);
  
  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<AppNote | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<AppNote['color']>('yellow');
  
  // AI State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  // Error State
  const [dbError, setDbError] = useState(false);

  const colors: Record<string, string> = {
      yellow: 'bg-yellow-100 border-yellow-200 text-yellow-900 hover:bg-yellow-50',
      blue: 'bg-blue-100 border-blue-200 text-blue-900 hover:bg-blue-50',
      green: 'bg-green-100 border-green-200 text-green-900 hover:bg-green-50',
      pink: 'bg-pink-100 border-pink-200 text-pink-900 hover:bg-pink-50',
      purple: 'bg-purple-100 border-purple-200 text-purple-900 hover:bg-purple-50',
      gray: 'bg-gray-100 border-gray-200 text-gray-900 hover:bg-gray-50',
  };

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const data = await storageService.getAppNotes();
      setNotes(data);
      setDbError(false);
    } catch (e) {
      console.error("Fetch Notes Error:", e);
      if (
        e.code === '42P01' || 
        (e.message && (
            e.message.includes('relation "app_notes" does not exist') || 
            e.message.includes('Could not find the table') || 
            e.message.includes('schema cache')
        ))
      ) {
          setDbError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleOpenCreate = () => {
    setEditingNote(null);
    setTitle('');
    setContent('');
    setColor('yellow');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (note: AppNote) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setColor(note.color);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
      if (!title.trim()) return;

      // Check ownership if editing
      if (editingNote && editingNote.userId !== currentUser.id) {
          alert("You can only edit notes you created.");
          return;
      }

      try {
          if (editingNote) {
              await storageService.updateAppNote({
                  ...editingNote,
                  title,
                  content,
                  color,
                  updatedAt: Date.now()
              });
          } else {
              await storageService.createAppNote({
                  userId: currentUser.id,
                  userName: currentUser.fullName,
                  title,
                  content,
                  color,
              });
          }
          await fetchNotes();
          setIsModalOpen(false);
      } catch (e) {
          console.error(e);
          alert("Failed to save note");
      }
  };

  // AI Features
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          try {
            setIsTranscribing(true);
            const text = await aiService.transcribeAudio(base64Audio);
            setContent(prev => prev + (prev ? '\n' : '') + text);
          } catch (e) {
            console.error(e);
            alert("Transcription failed. Please try again.");
          } finally {
            setIsTranscribing(false);
          }
        };
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (e) {
      console.error(e);
      alert("Microphone access denied. Please allow microphone access to use this feature.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current = null;
    }
  };

  const handleAiEnhance = async (action: 'summarize' | 'fix' | 'expand') => {
    if (!content.trim()) return;
    setIsThinking(true);
    try {
        let prompt = "";
        if (action === 'summarize') prompt = `Summarize the following text concisely:\n\n${content}`;
        if (action === 'fix') prompt = `Fix grammar and spelling in the following text, keeping the tone professional:\n\n${content}`;
        if (action === 'expand') prompt = `Expand on the following notes with relevant details and professional tone:\n\n${content}`;

        const result = await aiService.generateFastResponse(prompt);
        setContent(result);
    } catch (e) {
        console.error(e);
        alert("AI processing failed.");
    } finally {
        setIsThinking(false);
    }
  };

  const handleSpeak = async () => {
      if (!content.trim() || isSpeaking) return;
      setIsSpeaking(true);
      try {
          await aiService.speak(content);
      } catch (e) {
          console.error(e);
          alert("Text-to-speech failed.");
      } finally {
          setIsSpeaking(false);
      }
  };

  const promptDelete = (e: React.MouseEvent | null, note: AppNote) => {
      if (e) e.stopPropagation();
      
      const isOwner = note.userId === currentUser.id;
      if (!isOwner) {
          alert("Access Denied: Only the note owner can delete this.");
          return;
      }

      setNoteToDelete(note);
      setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
      if (!noteToDelete) return;
      
      try {
          await storageService.deleteAppNote(noteToDelete.id);
          setNotes(prev => prev.filter(n => n.id !== noteToDelete.id));
          
          // If the deleted note was open in the modal, close the modal
          if (isModalOpen && editingNote?.id === noteToDelete.id) {
              setIsModalOpen(false);
          }
          
          setIsDeleteModalOpen(false);
          setNoteToDelete(null);
      } catch (e) {
          console.error(e);
          alert("Failed to delete note");
      }
  };

  const filteredNotes = notes.filter(n => 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Derived state for modal
  const isOwnerOfEditing = editingNote ? editingNote.userId === currentUser.id : true; // New note is owner
  const isReadOnly = editingNote && !isOwnerOfEditing;

  if (dbError) {
      return (
        <div className="flex flex-col h-[calc(100vh-6rem)] max-w-5xl mx-auto p-4 items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-md border border-red-200 max-w-2xl w-full text-center">
                <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <Database className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Notepad System Unavailable</h2>
                <p className="text-gray-600 mb-6">
                    The <code>app_notes</code> table is missing. <br/>
                    Please run the SQL below in your Supabase SQL Editor.
                </p>
                
                <div className="bg-gray-800 rounded-md p-4 w-full relative group text-left mb-6">
                    <div className="absolute top-2 right-2 text-xs text-gray-400 flex items-center">
                        <Terminal className="w-3 h-3 mr-1" /> SQL
                    </div>
                    <code className="text-xs text-green-400 whitespace-pre-wrap break-all font-mono">
{`create table if not exists app_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id),
  user_name text,
  title text not null,
  content text,
  color text default 'yellow',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table app_notes enable row level security;
create policy "Public Access Notes" on app_notes for all using (true) with check (true);`}
                    </code>
                </div>
                
                <Button onClick={() => fetchNotes()}>
                    I've ran the SQL, Retry Connection
                </Button>
            </div>
        </div>
      );
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <StickyNote className="mr-3 h-6 w-6 text-yellow-500 shadow-sm" />
                    Campaign Notepad
                </h1>
                <p className="text-gray-500 mt-1">Shared sticky notes for team collaboration.</p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
                 <div className="relative flex-1 md:flex-none">
                     <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                     <input 
                        type="text"
                        placeholder="Search notes..."
                        className="pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm w-full md:w-64 focus:ring-primary-500 focus:border-primary-500"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                     />
                 </div>
                 <Button onClick={handleOpenCreate}>
                     <Plus className="h-5 w-5 mr-1" /> Add Note
                 </Button>
            </div>
        </div>

        {isLoading ? (
            <div className="p-10 text-center text-gray-500">Loading notes...</div>
        ) : filteredNotes.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                <div className="bg-yellow-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <StickyNote className="h-8 w-8 text-yellow-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No notes yet</h3>
                <p className="text-gray-500 mt-1 mb-4">Create a note to share information with the team.</p>
                <Button variant="secondary" onClick={handleOpenCreate}>Create First Note</Button>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredNotes.map(note => {
                    const isOwner = note.userId === currentUser.id;
                    const canDelete = isOwner;

                    return (
                        <div 
                            key={note.id}
                            onClick={() => handleOpenEdit(note)}
                            className={`
                                relative group p-6 rounded-xl border shadow-sm transition-all duration-300 
                                hover:shadow-md hover:-translate-y-1 cursor-pointer min-h-[200px] flex flex-col
                                ${colors[note.color] || colors.yellow}
                            `}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg leading-tight line-clamp-2 pr-6">{note.title}</h3>
                                {canDelete && (
                                    <button 
                                        onClick={(e) => promptDelete(e, note)}
                                        className="absolute top-4 right-4 p-1.5 rounded-full bg-white/50 text-gray-600 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-white hover:text-red-600 transition-all shadow-sm"
                                        title="Delete Note"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            
                            <p className="text-sm opacity-80 whitespace-pre-wrap line-clamp-6 flex-1 font-medium">
                                {note.content}
                            </p>
                            
                            <div className="mt-4 pt-4 border-t border-black/5 flex justify-between items-center text-xs opacity-60">
                                <span className="flex items-center" title={`Created by ${note.userName}`}>
                                    {isOwner ? (
                                        <UserIcon className="h-3 w-3 mr-1" />
                                    ) : (
                                        <span className="font-semibold mr-1">{note.userName}</span>
                                    )}
                                    {isOwner && "Me"}
                                </span>
                                <span className="flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {new Date(note.updatedAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}

        {/* Create/Edit Modal */}
        <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={
                isReadOnly ? (
                    <div className="flex items-center gap-2">
                        <span>View Note</span>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex items-center">
                            <Lock className="w-3 h-3 mr-1"/> Read Only
                        </span>
                    </div>
                ) : (
                    editingNote ? 'Edit Note' : 'New Sticky Note'
                )
            }
            footer={
                <div className="w-full flex justify-between items-center">
                    <div>
                        {editingNote && isOwnerOfEditing && !isReadOnly && (
                            <Button 
                                variant="danger" 
                                onClick={(e) => promptDelete(e, editingNote)}
                                className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 shadow-none"
                            >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                         <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                            {isReadOnly ? 'Close' : 'Cancel'}
                         </Button>
                         {!isReadOnly && <Button onClick={handleSave}>Save Note</Button>}
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                {isReadOnly && (
                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border flex items-center">
                        <UserIcon className="h-3 w-3 mr-2" />
                        Created by: <strong className="ml-1">{editingNote?.userName}</strong>
                    </div>
                )}
                <Input 
                    label="Title" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    placeholder="Note Title"
                    autoFocus={!isReadOnly}
                    disabled={isReadOnly}
                    className={isReadOnly ? 'bg-gray-50' : ''}
                />
                
                <div className="relative">
                    <TextArea 
                        label="Content" 
                        value={content} 
                        onChange={e => setContent(e.target.value)} 
                        placeholder="Write something..."
                        rows={8}
                        disabled={isReadOnly || isTranscribing || isThinking}
                        className={isReadOnly ? 'bg-gray-50' : ''}
                    />
                    
                    {/* AI Toolbar */}
                    {!isReadOnly && (
                        <div className="absolute top-8 right-2 flex gap-1">
                            {isRecording ? (
                                <button 
                                    onClick={handleStopRecording}
                                    className="p-1.5 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors animate-pulse"
                                    title="Stop Recording"
                                >
                                    <StopCircle className="h-4 w-4" />
                                </button>
                            ) : (
                                <button 
                                    onClick={handleStartRecording}
                                    className="p-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                                    title="Dictate Note (Gemini Flash)"
                                    disabled={isTranscribing}
                                >
                                    {isTranscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                                </button>
                            )}
                            
                            <button 
                                onClick={handleSpeak}
                                className="p-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                                title="Read Aloud (Gemini TTS)"
                                disabled={isSpeaking || !content}
                            >
                                {isSpeaking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                            </button>

                            <div className="h-6 w-px bg-gray-300 mx-1 self-center"></div>

                            <button 
                                onClick={() => handleAiEnhance('fix')}
                                className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors"
                                title="Fix Grammar (Gemini Flash Lite)"
                                disabled={isThinking || !content}
                            >
                                {isThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="text-xs font-bold">Fix</span>}
                            </button>
                            <button 
                                onClick={() => handleAiEnhance('summarize')}
                                className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors"
                                title="Summarize (Gemini Flash Lite)"
                                disabled={isThinking || !content}
                            >
                                {isThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="text-xs font-bold">Sum</span>}
                            </button>
                        </div>
                    )}
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                    <div className="flex gap-3">
                        {Object.keys(colors).map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => !isReadOnly && setColor(c as AppNote['color'])}
                                disabled={isReadOnly}
                                className={`
                                    w-8 h-8 rounded-full border-2 transition-transform focus:outline-none
                                    ${c === 'yellow' ? 'bg-yellow-200' : ''}
                                    ${c === 'blue' ? 'bg-blue-200' : ''}
                                    ${c === 'green' ? 'bg-green-200' : ''}
                                    ${c === 'pink' ? 'bg-pink-200' : ''}
                                    ${c === 'purple' ? 'bg-purple-200' : ''}
                                    ${c === 'gray' ? 'bg-gray-200' : ''}
                                    ${color === c ? 'border-gray-500 scale-110 ring-2 ring-offset-2 ring-gray-300' : 'border-transparent'}
                                    ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 cursor-pointer'}
                                `}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            title="Confirm Deletion"
            footer={
                <>
                    <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={executeDelete}>Delete Note</Button>
                </>
            }
        >
             <div className="flex flex-col items-center justify-center text-center p-4">
                 <div className="bg-red-100 p-3 rounded-full mb-4">
                     <Trash2 className="h-6 w-6 text-red-600" />
                 </div>
                 <h3 className="text-lg font-bold text-gray-900">Are you sure you want to delete this note?</h3>
                 <p className="text-sm text-gray-500 mt-2">
                    This action cannot be undone. The note will be permanently removed for all users.
                 </p>
             </div>
        </Modal>
    </div>
  );
};
