-- ============================================
-- Notifications table for hawl reminders
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lholhmitmrybxfbbcaiq/sql
-- ============================================

-- In-app notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('zakat_due', 'hawl_imminent', 'hawl_approaching', 'hawl_reminder', 'hawl_started', 'hawl_reset')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE NOT is_read;

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Email log (tracks what was sent to avoid duplicates)
CREATE TABLE email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_log_user ON email_log(user_id);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email log"
  ON email_log FOR SELECT
  USING (auth.uid() = user_id);
