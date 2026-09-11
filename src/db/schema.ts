import { pgTable, text, serial, timestamp } from 'drizzle-orm/pg-core';

// Users table (integrated with Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Calibration labels table
export const labels = pgTable('labels', {
  id: serial('id').primaryKey(),
  noLabel: text('no_label').notNull().unique(),
  status: text('status').notNull().default('Menunggu Sertifikat'),
  pdfSource: text('pdf_source'),
  pdfUrl: text('pdf_url'),
  pdfDriveUrl: text('pdf_drive_url'),
  pdfOriginalUrl: text('pdf_original_url'),
  pdfName: text('pdf_name'),
  calibratedAt: text('calibrated_at'),
  validUntil: text('valid_until'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Folders for organizing labels
export const labelFolders = pgTable('label_folders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#3b82f6'),
  labelIds: text('label_ids'), // JSON string of label strings
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Stored label print templates
export const templates = pgTable('templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  data: text('data').notNull(), // JSON string
  updatedAt: timestamp('updated_at').defaultNow(),
});

// General app settings
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(), // JSON string
  updatedAt: timestamp('updated_at').defaultNow(),
});
