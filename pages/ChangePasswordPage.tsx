import React, { useState } from 'react';
import { User } from '../types';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { KeyRound, Eye, EyeOff } from 'lucide-react';

interface ChangePasswordPageProps {
  currentUser: User;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<{success: boolean, message: string}>;
}

export const ChangePasswordPage: React.FC<ChangePasswordPageProps> = ({ onChangePassword }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!currentPassword) newErrors.currentPassword = 'Current password is required.';
    if (!newPassword) {
      newErrors.newPassword = 'New password is required.';
    } else {
      if (newPassword.length < 8) newErrors.newPassword = 'Password must be at least 8 characters long.';
      else if (!/[A-Z]/.test(newPassword)) newErrors.newPassword = 'Password must contain an uppercase letter.';
      else if (!/[a-z]/.test(newPassword)) newErrors.newPassword = 'Password must contain a lowercase letter.';
      else if (!/[0-9]/.test(newPassword)) newErrors.newPassword = 'Password must contain a number.';
      else if (!/[^A-Za-z0-9]/.test(newPassword)) newErrors.newPassword = 'Password must contain a special character.';
    }
    if (newPassword !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus(null);
    if (validate()) {
      setIsSubmitting(true);
      const result = await onChangePassword(currentPassword, newPassword);
      setSubmitStatus({ type: result.success ? 'success' : 'error', message: result.message });
      if (result.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      <div className="text-center mb-6">
        <div className="mx-auto h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
          <KeyRound className="h-8 w-8 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Change Your Password</h2>
        <p className="text-sm text-gray-500 mt-1">For your security, please choose a strong password.</p>
      </div>

      {submitStatus && (
        <div className={`p-3 rounded-lg text-sm text-center mb-4 ${submitStatus.type === 'success' ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`}>
          {submitStatus.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Current Password"
          type={showCurrent ? 'text' : 'password'}
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          error={errors.currentPassword}
          rightIcon={<button type="button" onClick={() => setShowCurrent(!showCurrent)}>{showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
        />
        <Input
          label="New Password"
          type={showNew ? 'text' : 'password'}
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          error={errors.newPassword}
          rightIcon={<button type="button" onClick={() => setShowNew(!showNew)}>{showNew ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
        />
        <Input
          label="Confirm New Password"
          type={showConfirm ? 'text' : 'password'}
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          rightIcon={<button type="button" onClick={() => setShowConfirm(!showConfirm)}>{showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
        />
        <Button type="submit" isLoading={isSubmitting} className="w-full">Update Password</Button>
      </form>
    </div>
  );
};