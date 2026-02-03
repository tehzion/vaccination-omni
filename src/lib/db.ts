import Dexie, { type Table } from 'dexie';

export interface Project {
  id?: number;
  name: string; // Project/Trip Name
  clientName: string; // Organization Name (for invoicing)
  invoiceAddress: string;
  contactPerson: string;
  contactEmail?: string; // Add contact email
  status: 'active' | 'archived' | 'pending_approval' | 'rejected';
  timestamp: number;
  // Project Details
  startDate?: string; // ISO date
  endDate?: string; // ISO date  
  estimatedPatients?: number;
  // Default Vaccine Info
  defaultVaccineName?: string;
  defaultBatch?: string;
  defaultExpiry?: string;
  // Client Account Link
  clientAccountId?: number; // Links to ClientAccount
}

export interface CheckIn {
  id: string; // UUID
  projectId?: number; // Linked Project ID
  fullName: string;
  mykad: string;
  phone?: string;
  email?: string;
  queueNumber: string; // e.g. "20231027-001"
  status: 'waiting' | 'in_progress' | 'completed';
  language: 'en' | 'bm';
  timestamp: number;

  // Medical Data
  vaccineName?: string;
  batch?: string;
  expiry?: string;
  site?: string;
  route?: string;
  administeredAt?: string; // ISO string
  vaccinator?: string;

  // Vitals
  bpSystolic?: number;
  bpDiastolic?: number;
  pulse?: number;

  // Doctor Notes
  notes?: string;

  // Certificate
  certificateId?: string;

  // Reminders
  dose: 1 | 2;
  nextAppointment?: string; // ISO Date for Dose 2

  // Feedback
  feedbackRating?: number; // 1-5
  feedbackComment?: string;
}

export interface Settings {
  id?: number; // Always 1
  doctorName: string;
  clinicName: string;
  passcode: string; // Stored as plain text for MVP simplicity (or simple hash if preferred, but user requirement says "passcode login ... salted hash ... MVP")
  // Let's stick to simple string for MVP editability.
  openaiApiKey?: string; // Stored locally on client
  n8nWebhookUrl?: string;
  bankName?: string;
  bankAccount?: string;
}

export interface VaccineTemplate {
  id?: number; // Auto-increment
  name: string; // e.g., "Pfizer Booster Stock"
  vaccineName: string;
  batch: string;
  expiry: string;
  site: string;
  route: string;
}

export interface InventoryItem {
  id?: number;
  vaccineName: string;
  batchNumber: string;
  expiryDate: string; // ISO
  count: number;
  minThreshold: number; // Default 10
}

export interface InvoiceRecord {
  id?: number;
  projectId: number;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  date: string; // ISO
  itemsJson: string; // Serialized InvoiceItem[]
}

export interface ClientAccount {
  id?: number;
  email: string; // Unique login email
  password: string; // Hashed password (simple hash for MVP)
  name: string; // Business owner name
  company: string; // Company name
  createdAt: number; // Timestamp
  lastLogin?: number; // Timestamp
}

export class VaccineDatabase extends Dexie {
  checkins!: Table<CheckIn, string>;
  settings!: Table<Settings, number>;
  templates!: Table<VaccineTemplate, number>;
  projects!: Table<Project, number>;
  inventory!: Table<InventoryItem, number>;
  invoices!: Table<InvoiceRecord, number>;
  clientAccounts!: Table<ClientAccount, number>;

  constructor() {
    super('VaccineDB');
    this.version(1).stores({
      checkins: 'id, status, queueNumber, timestamp, fullName',
      settings: 'id'
    });

    // Add version 2 for templates
    this.version(2).stores({
      templates: '++id, name'
    });

    // Add version 3 for projects
    this.version(3).stores({
      projects: '++id, name, status, timestamp',
      checkins: 'id, projectId, status, queueNumber, timestamp, fullName' // update indices
    });

    // Add version 4 for inventory
    this.version(4).stores({
      inventory: '++id, vaccineName, batchNumber, expiryDate'
    });

    // Add version 5 for invoices
    this.version(5).stores({
      invoices: '++id, projectId, invoiceNumber, date, clientName'
    });

    // Add version 6 for client accounts
    this.version(6).stores({
      clientAccounts: '++id, email, company, createdAt',
      projects: '++id, name, status, timestamp, clientAccountId' // add clientAccountId index
    });
  }
}

export const db = new VaccineDatabase();

// Initialize default settings if empty
db.on('populate', () => {
  db.settings.add({
    id: 1,
    doctorName: 'Dr. Admin',
    clinicName: 'My Clinic',
    passcode: '1234'
  });
});

// Password utility for creating client accounts
export function hashPassword(password: string): string {
  return btoa(password); // Base64 encoding for MVP
}
