export const APP_NAME = 'NEXORA';
export const APP_TAGLINE = 'Your Community. One Intelligent Interface.';
export const APP_SUBTITLE =
  'Understand your community. Find the right information, people and places. Get things done.';

export const NAV_LINKS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'AI Assistant', href: '/chat', icon: 'MessageSquare' },
  { label: 'Indoor Map', href: '/map', icon: 'MapPin' },
  { label: 'Directory', href: '/people', icon: 'Users' },
  { label: 'Services', href: '/services', icon: 'Compass' },
  { label: 'Profile', href: '/profile', icon: 'User' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
] as const;

export const COMMUNITY_ROLES = [
  { id: 'student', label: 'Student', description: 'Undergraduate, graduate, or research scholar' },
  { id: 'faculty', label: 'Faculty', description: 'Professors, lecturers, and academic instructors' },
  { id: 'staff', label: 'Staff', description: 'Administrative, technical, and facilities team' },
  { id: 'visitor', label: 'Visitor / Guest', description: 'Prospective student, visiting scholar, or guest' },
] as const;

export const SERVICE_CATEGORIES = [
  'All',
  'Academic',
  'Administration',
  'Student Services',
  'IT & Labs',
  'Facilities',
  'Health & Emergency',
] as const;
