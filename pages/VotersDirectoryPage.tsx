import { User } from '../types';
import { Dashboard } from './Dashboard';

interface VotersDirectoryPageProps {
  currentUser: User;
  initialVoterId: string | null;
  onClearInitialVoter: () => void;
}

export const VotersDirectoryPage: React.FC<VotersDirectoryPageProps> = ({ currentUser, initialVoterId, onClearInitialVoter }) => {
  return <Dashboard currentUser={currentUser} initialVoterId={initialVoterId} onClearInitialVoter={onClearInitialVoter} />;
};
