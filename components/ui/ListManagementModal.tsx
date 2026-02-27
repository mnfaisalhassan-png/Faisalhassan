import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { storageService } from '../../services/storage';
import { Trash2, Edit } from 'lucide-react';

interface ListManagementModalProps {
  target: 'island' | 'party' | 'title';
  items: { id: string; name: string }[];
  onClose: () => void;
  onSave: () => void;
}

import { filterAndEnsureValidKeys } from '../../lib/utils';

export const ListManagementModal: React.FC<ListManagementModalProps> = ({ target, items, onClose, onSave }) => {
  const safeItems = filterAndEnsureValidKeys(items);
  
  const [newItem, setNewItem] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const handleAddItem = async () => {
    if (!newItem.trim()) return;
    try {
      if (target === 'island') {
        await storageService.addIsland(newItem.trim());
      } else if (target === 'party') {
        await storageService.addParty(newItem.trim());
      } else {
        await storageService.addTitle(newItem.trim());
      }
      setNewItem('');
      onSave();
    } catch (error) {
      console.error(`Error adding ${target}:`, error);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        if (target === 'island') {
          await storageService.deleteIsland(id);
        } else if (target === 'party') {
          await storageService.deleteParty(id);
        } else {
          await storageService.deleteTitle(id);
        }
        onSave();
      } catch (error) {
        console.error(`Error deleting ${target}:`, error);
      }
    }
  };

  const handleUpdateItem = async (id: string, oldName: string) => {
    if (!editingValue.trim() || editingValue.trim() === oldName) {
      setEditingIndex(null);
      return;
    }
    try {
      if (target === 'island') {
        await storageService.updateIsland(id, editingValue.trim());
      } else if (target === 'party') {
        await storageService.updateParty(id, editingValue.trim());
      } else {
        await storageService.updateTitle(id, editingValue.trim());
      }
      setEditingIndex(null);
      onSave();
    } catch (error) {
      console.error(`Error updating ${target}:`, error);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Manage ${target === 'island' ? 'Islands' : target === 'party' ? 'Parties' : 'Titles'}`}>
      <div className="space-y-4">
        <div className="flex space-x-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder={`New ${target}...`}
            className="flex-grow"
          />
          <Button onClick={handleAddItem}>Add</Button>
        </div>
        <div className="max-h-60 overflow-y-auto border rounded-md">
          <ul className="divide-y divide-gray-200">
            {safeItems.map((item, index) => (
              <li key={item.id} className="p-2 flex justify-between items-center">
                {editingIndex === index ? (
                  <Input
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    autoFocus
                    onBlur={() => handleUpdateItem(item.id, item.name)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateItem(item.id, item.name)}
                  />
                ) : (
                  <span>{item.name}</span>
                )}
                <div>
                  <button onClick={() => { setEditingIndex(index); setEditingValue(item.name); }} className="text-gray-500 hover:text-indigo-600 p-1">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDeleteItem(item.id, item.name)} className="text-gray-500 hover:text-red-600 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
};
