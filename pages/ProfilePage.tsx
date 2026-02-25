import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Button } from '../components/ui/Button';


interface ProfilePageProps {
  user: User;
  onUpdate: (newProfilePicture: string | null) => Promise<boolean>;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUpdate }) => {
    const [profilePic, setProfilePic] = useState<string | null>(user.profilePictureUrl || null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

    useEffect(() => {
        const updateProfilePic = () => {
            setProfilePic(user.profilePictureUrl || null);
        };
        updateProfilePic();
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
        const success = await onUpdate(profilePic);
        if (success) {
            setUpdateStatus({ type: 'success', message: 'Profile picture updated successfully!' });
        } else {
            setUpdateStatus({ type: 'error', message: 'Update failed. Please try again.' });
        }
        setIsUpdating(false);
        setTimeout(() => setUpdateStatus(null), 5000);
    };
    
    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">My Profile</h1>
                <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                        <img 
                            src={profilePic || `https://ui-avatars.com/api/?name=${user.fullName.replace(' ', '+')}&background=random`}
                            alt="Profile"
                            className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 shadow-md"
                        />
                    </div>
                    
                    {user.permissions?.includes('action_update_profile_picture') && (
                        <>
                            <input id="profile-pic-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            <label htmlFor="profile-pic-upload" className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg text-sm">
                                Upload / Change Photo
                            </label>
                        </>
                    )}
                </div>

                <div className="mt-8 space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-500">Full Name</label>
                        <p className="text-lg font-semibold text-gray-800">{user.fullName}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500">Username</label>
                        <p className="text-lg font-semibold text-gray-800">{user.username}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500">Role</label>
                        <p className="text-lg font-semibold text-gray-800 capitalize">{user.role}</p>
                    </div>
                </div>

                {updateStatus && (
                    <div className={`mt-6 p-3 rounded-lg text-sm text-center ${updateStatus.type === 'success' ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`}>
                        {updateStatus.message}
                    </div>
                )}

                <div className="mt-8 border-t pt-6 flex justify-end">
                    {user.permissions?.includes('action_update_profile_picture') && (
                        <Button onClick={handleSubmit} isLoading={isUpdating}>Update Picture</Button>
                    )}
                </div>
            </div>
        </div>
    );
};
