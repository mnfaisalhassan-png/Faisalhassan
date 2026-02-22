export const STORAGE_KEYS = {
  USERS: 'vf_users',
  VOTERS: 'vf_voters',
  CURRENT_USER: 'vf_current_user_session',
  ISLANDS: 'vf_islands',
  PARTIES: 'vf_parties'
};

export const ADMIN_CREDENTIALS = {
  username: 'faisalhassan',
  password: 'FaisalHassan'
};

export const ISLANDS = [
  'Male',
  'Hulhumale',
  'Villingili',
  'Addu City',
  'Fuvahmulah',
  'Kulhudhuffushi',
  'Thinadhoo',
  'Naifaru'
];

export const DEFAULT_PARTIES = [
  'Independent',
  'MDP',
  'PPM',
  'PNC',
  'Democrats',
  'JP',
  'MDA',
  'Adhaalath'
];

export const PERMISSIONS = {
  METRICS: [
    { id: 'view_metric_total_registered', label: 'Total Registered' },
    { id: 'view_metric_votes_cast', label: 'Votes Cast' },
    { id: 'view_metric_pending_votes', label: 'Pending Votes' },
    { id: 'view_metric_candidate_sheema', label: 'Candidate: Seema' },
    { id: 'view_metric_candidate_sadiq', label: 'Shadda elections' },
    { id: 'view_metric_total_male_voters', label: 'Total Male Voters' },
    { id: 'view_metric_total_female_voters', label: 'Total Female Voters' },
    { id: 'view_metric_r_roshi', label: 'R-Roshi' },
    { id: 'view_metric_rf_seema', label: 'RF-Seema' },
    { id: 'view_metric_island_turnout', label: 'Island Turnout' },
  ],
  ACTIONS: [],
  FORM_ACCESS: [],
};