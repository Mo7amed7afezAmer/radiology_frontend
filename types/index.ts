export type UserRole = 'admin' | 'radiologist' | 'doctor' | 'patient';
export type ReportStatus = 'draft' | 'review' | 'signed' | 'final';

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface ReportItem {
  id?: number;
  sectionCode: string;
  sectionName: string;
  content: string;
  sortOrder: number;
}

export interface Template {
  id: number;
  title: string;
  modality: string;
  bodyPart: string;
  description: string;
  isGlobal: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  owner?: User;
  sections: TemplateSection[];
}

export interface TemplateSection {
  id: number;
  sectionCode: string;
  sectionName: string;
  defaultContent: string;
  sortOrder: number;
  isRequired: boolean;
}

export interface Report {
  id: number;
  patientName: string;
  accessionNumber: string;
  studyUid: string;
  status: ReportStatus;
  signedAt: string | null;
  createdAt: string;
  updatedAt: string;
  radiologist?: User;
  template?: Template;
  items: ReportItem[];
}

export interface AuthResponse {
  access_token: string;
  user: User;
}
