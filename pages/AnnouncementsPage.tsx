import React, { useState, useEffect } from 'react';
import { User, Announcement } from '../types';
import { supabase } from '../services/storage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TextArea } from '../components/ui/TextArea';
import { Modal } from '../components/ui/Modal';
import { Search, Plus, Megaphone, Pin, AlertCircle, Calendar, User as UserIcon, Loader2 } from 'lucide-react';

interface AnnouncementsPageProps {
  currentUser: User;
}

export const AnnouncementsPage: React.FC<AnnouncementsPageProps> = ({ currentUser }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase.from('announcements').select('*');
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSave = async (announcementData: Omit<Announcement, 'id' | 'author' | 'date'> & { id?: string }) => {
    try {
      const { id, isPinned, isUrgent, ...rest } = announcementData;

      const payload = {
        ...rest,
        is_pinned: isPinned,
        is_urgent: isUrgent,
        author: currentUser.fullName,
        date: new Date().toISOString(),
      };

      if (editingAnnouncement) {
        const { error } = await supabase.from('announcements').update(payload).eq('id', editingAnnouncement.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('announcements').insert([payload]);
        if (error) throw error;
      }
      
      fetchAnnouncements();
      setIsModalOpen(false);
      setEditingAnnouncement(null);
    } catch (error) {
      console.error('Failed to save announcement:', error);
      alert(`Error: Could not save the announcement. Please check the console for details and ensure the database table is set up correctly.\n\n${(error as Error).message}`);
    }
  };

  const handleDelete = async () => {
    if (announcementToDelete) {
      const { error } = await supabase.from('announcements').delete().eq('id', announcementToDelete.id);
      if (error) throw error;
      fetchAnnouncements();
      setIsDeleteModalOpen(false);
      setAnnouncementToDelete(null);
    }
  };

  const openCreateModal = () => {
    setEditingAnnouncement(null);
    setIsModalOpen(true);
  };

  const openEditModal = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setIsModalOpen(true);
  };

  const openDeleteModal = (announcement: Announcement) => {
    setAnnouncementToDelete(announcement);
    setIsDeleteModalOpen(true);
  };

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';

  const filteredAnnouncements = announcements.filter(item => {
    const lowercasedQuery = searchQuery.toLowerCase();
    const matchesSearch = 
      item.title.toLowerCase().includes(lowercasedQuery) || 
      item.category.toLowerCase().includes(lowercasedQuery) ||
      new Date(item.date).toLocaleDateString().includes(lowercasedQuery);

    const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const getCategoryTheme = (category: Announcement['category']) => {
    switch (category) {
      case 'Urgent': return { border: 'border-l-red-500', bg: 'bg-red-50', text: 'text-red-800' };
      case 'Election Day': return { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-800' };
      case 'System Update': return { border: 'border-l-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-800' };
      default: return { border: 'border-l-green-500', bg: 'bg-green-50', text: 'text-green-800' };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <span className="ml-3 text-gray-500">Loading Announcements...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 bg-navy-50 min-h-screen">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Megaphone className="h-8 w-8 mr-3 text-primary-600" />
              Announcements
            </h1>
            <p className="text-gray-500 mt-1">Official election updates and notices.</p>
          </div>
          {isAdmin && (
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-2" />
              Create Announcement
            </Button>
          )}
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-grow w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input 
              placeholder="Search by title, category, or date..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full bg-white rounded-lg"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            {['All', 'General', 'Urgent', 'Election Day', 'System Update'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  filterCategory === cat 
                    ? 'bg-primary-600 text-white shadow-md' 
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Announcements Grid */}
        <div className="grid gap-6">
          {filteredAnnouncements.length > 0 ? (
            filteredAnnouncements.map((item) => {
              const theme = getCategoryTheme(item.category);
              return (
                <div 
                  key={item.id} 
                  className={`bg-white rounded-xl border border-l-4 ${theme.border} p-5 transition-all hover:shadow-lg hover:border-primary-300`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      {item.isUrgent && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${theme.bg} ${theme.text}`}>
                          URGENT
                        </span>
                      )}
                      <span className={`text-xs font-bold ${theme.text}`}>{item.category}</span>
                    </div>
                    {item.isPinned && (
                      <span className="flex items-center text-xs font-medium text-amber-600">
                        <Pin className="h-4 w-4 mr-1.5 fill-current" /> Pinned
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-gray-800 mb-2">{item.title}</h3>
                  
                  <div className="flex items-center text-xs text-gray-500 mb-3 space-x-4">
                    <span className="flex items-center">
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                      {new Date(item.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    <span className="flex items-center">
                      <UserIcon className="h-3.5 w-3.5 mr-1.5" />
                      Posted by {item.author}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 leading-relaxed line-clamp-2">{item.content}</p>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-2">
                    <Button variant="outline" size="sm">View More</Button>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-primary-600" onClick={() => openEditModal(item)}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-red-600" onClick={() => openDeleteModal(item)}>Delete</Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-800">No announcements found</h3>
              <p className="text-gray-500 mt-1">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <AnnouncementModal
          announcement={editingAnnouncement}
          onClose={() => {
            setIsModalOpen(false);
            setEditingAnnouncement(null);
          }}
          onSave={handleSave}
        />
      )}

      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Deletion"
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={handleDelete}>Delete</Button>
            </>
          }
        >
          <div className="flex items-center">
            <AlertCircle className="h-10 w-10 text-red-500 mr-4" />
            <p>Are you sure you want to delete this announcement? This action cannot be undone.</p>
          </div>
        </Modal>
      )}
    </div>
  );
};

interface AnnouncementModalProps {
  announcement: Announcement | null;
  onClose: () => void;
  onSave: (announcementData: Omit<Announcement, 'id' | 'author' | 'date'> & { id?: string }) => void;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ announcement, onClose, onSave }) => {
  const [title, setTitle] = useState(announcement?.title || '');
  const [content, setContent] = useState(announcement?.content || '');
  const [category, setCategory] = useState(announcement?.category || 'General');
  const [isPinned, setIsPinned] = useState(announcement?.isPinned || false);
  const [isUrgent, setIsUrgent] = useState(announcement?.isUrgent || false);

  const handleSubmit = () => {
    onSave({ id: announcement?.id, title, content, category, isPinned, isUrgent });
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={announcement ? 'Edit Announcement' : 'Create Announcement'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <TextArea label="Content" value={content} onChange={(e) => setContent(e.target.value)} rows={5} />
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as Announcement['category'])} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
            <option>General</option>
            <option>Urgent</option>
            <option>Election Day</option>
            <option>System Update</option>
          </select>
        </div>
        <div className="flex items-center">
          <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
          <label className="ml-2 block text-sm text-gray-900">Pin Announcement</label>
        </div>
        <div className="flex items-center">
          <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
          <label className="ml-2 block text-sm text-gray-900">Mark as Urgent</label>
        </div>
      </div>
    </Modal>
  );
};
