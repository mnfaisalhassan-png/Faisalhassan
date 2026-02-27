import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CandidateListPage } from './candidates/list/CandidateListPage';

import { CandidateProfilePage } from './candidates/profile';
import { User } from '../types';

interface CandidatesPageProps {
  currentUser: User;
}

export const CandidatesPage: React.FC<CandidatesPageProps> = ({ currentUser }) => {
  return (
    <Routes>
      <Route path="/" element={<CandidateListPage currentUser={currentUser} />} />

      <Route path="/profile/:id" element={<CandidateProfilePage currentUser={currentUser} />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};
