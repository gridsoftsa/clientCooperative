export type CommunicationTypeValue =
  | 'notice'
  | 'news'
  | 'circular'
  | 'announcement'
  | 'event'
  | 'birthday'

export type CommunicationStatusValue =
  | 'draft'
  | 'scheduled'
  | 'published'
  | 'expired'
  | 'archived'

export type CommunicationAudienceTypeValue =
  | 'all'
  | 'org_unit'
  | 'role'
  | 'org_office'
  | 'user'

export interface CommunicationAttachment {
  id: number
  kind: 'file' | 'link' | string
  title?: string | null
  original_name?: string | null
  mime_type?: string | null
  size_bytes?: number | null
  external_url?: string | null
  download_url?: string | null
  view_url?: string | null
}

export interface CommunicationItem {
  id: number
  type: CommunicationTypeValue
  type_label: string
  status: CommunicationStatusValue
  status_label?: string
  title: string
  summary?: string | null
  body?: string | null
  is_featured: boolean
  is_important: boolean
  requires_read_confirmation: boolean
  reminders_enabled?: boolean
  reminder_interval_days?: number
  reminder_max_count?: number
  published_at?: string | null
  expires_at?: string | null
  scheduled_at?: string | null
  event_starts_at?: string | null
  event_ends_at?: string | null
  event_location?: string | null
  author?: { id: number, name: string } | null
  org_unit?: { id: number, name: string } | null
  attachments: CommunicationAttachment[]
  is_read?: boolean
  is_confirmed?: boolean
  confirmed_reads_count?: number
  audiences?: Array<{ audience_type: CommunicationAudienceTypeValue, audience_id: number | null }>
  can_view_engagement?: boolean
  engagement?: CommunicationEngagement
}

export interface CommunicationEngagementAudienceMember {
  user_id: number
  name: string
  email?: string | null
  read_at?: string | null
  confirmed_at?: string | null
  has_read: boolean
  has_confirmed: boolean
  reminders_sent_count: number
  reminders: Array<{ reminder_number: number, sent_at?: string | null }>
}

export interface CommunicationEngagement {
  audience_total: number
  read_count: number
  confirmed_count: number
  pending_read_count: number
  pending_confirmation_count: number
  reminders_sent_total: number
  audience: CommunicationEngagementAudienceMember[]
}

export interface CommunicationReminderSettings {
  reminder_default_interval_days: number
  reminder_default_max_count: number
  reminder_interval_options: number[]
  reminder_max_count_options: number[]
  reminder_interval_choices: Array<{ value: number, label: string }>
  reminder_max_count_choices: Array<{ value: number, label: string }>
}

export interface CommunicationSettingsPayload {
  reminder_default_interval_days: number
  reminder_default_max_count: number
  reminder_interval_options: number[]
  reminder_max_count_options: number[]
}

export interface CommunicationDashboard {
  stats: {
    birthdays_today: number
    events_today: number
    unread: number
  }
  birthdays_today: Array<{ id: number, name: string, org_unit?: string | null }>
  upcoming_events: CommunicationItem[]
  important: CommunicationItem[]
}

export interface CreateCommunicationPayload {
  type: CommunicationTypeValue
  title: string
  summary?: string
  body?: string
  is_featured?: boolean
  is_important?: boolean
  requires_read_confirmation?: boolean
  notify_internal?: boolean
  notify_email?: boolean
  reminders_enabled?: boolean
  reminder_interval_days?: number
  reminder_max_count?: number
  publish_now?: boolean
  scheduled_at?: string | null
  expires_at?: string | null
  org_unit_id?: number | null
  event_starts_at?: string | null
  event_ends_at?: string | null
  event_location?: string | null
  audiences: Array<{ audience_type: CommunicationAudienceTypeValue, audience_id?: number | null }>
  links?: Array<{ url: string, title?: string }>
}
