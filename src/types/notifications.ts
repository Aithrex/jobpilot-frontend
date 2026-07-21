/**
 * Notification preferences. Backend: /api/resume/notifications/*.
 * Channels other than email surface as "coming soon" when `available` is false.
 */

export type NotificationChannel = 'email' | 'whatsapp' | 'sms' | 'push';

export interface NotificationChannelState {
  enabled: boolean;
  /** When false the channel is not yet live - render as "coming soon". */
  available: boolean;
  address?: string;
}

export interface NotificationQuietHours {
  enabled: boolean;
  /** 24h "HH:MM" local time. */
  start?: string;
  end?: string;
  timezone?: string;
}

export interface NotificationEvent {
  key: string;
  label: string;
  description?: string;
  enabled: boolean;
}

export interface NotificationPrefs {
  master_enabled: boolean;
  channels: Record<NotificationChannel, NotificationChannelState>;
  events: NotificationEvent[];
  quiet_hours: NotificationQuietHours;
}
