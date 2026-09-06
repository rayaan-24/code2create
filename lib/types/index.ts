export type UserRole = 'student' | 'faculty' | 'staff' | 'visitor' | 'admin';

export interface UserPreferences {
  language: string;
  voiceModel: string;
  voiceEnabled: boolean;
  notifications: {
    email: boolean;
    push: boolean;
    sound: boolean;
  };
  appearance: 'dark-glass' | 'glass-luminous';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  community: string;
  year?: string;
  avatarUrl?: string;
  preferences: UserPreferences;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
  createdAt: string;
  tags?: string[];
  unreadCount?: number;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface SourceItem {
  id: string;
  title: string;
  sourceDocument: string;
  pageOrSection?: string;
  confidenceScore: number;
  verifiedAt: string;
}

export interface ProcedureItem {
  id: string;
  title: string;
  category: string;
  responsibleOffice: string;
  location: string;
  hours: string;
  requiredDocuments: string[];
  steps: string[];
  contactEmail?: string;
}

export interface LocationItem {
  id: string;
  name: string;
  building: string;
  floor: string;
  room: string;
  category: string;
  operatingHours: string;
  accessible: boolean;
  description?: string;
}

export interface PersonItem {
  id: string;
  name: string;
  role: string;
  department: string;
  office: string;
  building: string;
  email: string;
  phone?: string;
  availability: 'Available' | 'In Class' | 'Busy' | 'Office Hours Only';
  officeHours?: string;
  avatar?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  category: 'Academic' | 'Administration' | 'Student Services' | 'IT & Labs' | 'Facilities' | 'Health & Emergency';
  department: string;
  location: string;
  hours: string;
  contactEmail?: string;
  isUrgent?: boolean;
}

export interface NavigationRoute {
  id: string;
  startPoint: string;
  destination: string;
  etaMinutes: number;
  distanceMeters: number;
  floorChanges: string[];
  steps: {
    instruction: string;
    distance: string;
    landmark?: string;
  }[];
}

export interface StructuredDataPayload {
  type: 'procedure' | 'location' | 'person' | 'service' | 'navigation' | 'generic';
  procedure?: ProcedureItem;
  location?: LocationItem;
  person?: PersonItem;
  service?: ServiceItem;
  navigationRoute?: NavigationRoute;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  structuredData?: StructuredDataPayload;
  sources?: SourceItem[];
  isStreaming?: boolean;
}

export interface AdminMetric {
  totalKnowledgeItems: number;
  verifiedItems: number;
  pendingReview: number;
  expiredItems: number;
  activeUsersToday: number;
  systemHealth: 'Optimal' | 'Degraded' | 'Offline';
}

export interface VerificationItem {
  id: string;
  title: string;
  type: 'procedure' | 'document' | 'location' | 'service';
  submittedBy: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'normal' | 'urgent' | 'critical';
  category: string;
  timestamp: string;
  department: string;
}
