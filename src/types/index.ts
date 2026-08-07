export interface User {
  id: number;
  discord_id: string;
  fullname: string;
  rank: string;
  start_date: string;
  avatar: string;
  active: number;
  isAdmin: boolean;
  total_hours?: number;
  total_cases?: number;
  created_at?: string;
}

export interface DutyLog {
  id: number;
  user_id: number;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  fullname?: string;
  rank?: string;
  created_at?: string;
}

export interface HelperUser {
  id?: string;
  name?: string;
  avatar?: string;
  discord_id?: string;
}

export interface Case {
  id: number;
  case_number: string;
  caseId?: string;
  title: string;
  type?: string;
  case_type?: string;
  caseType?: string;
  description: string;
  suspect_name: string;
  officer_in_charge: string;
  officerName?: string;
  officer_discord_id?: string;
  officerDiscordId?: string;
  officerId?: string;
  officer_avatar?: string;
  officerAvatar?: string;
  assistant_officer?: string;
  helpers?: HelperUser[] | string[];
  image?: string;
  discord_message_id?: string;
  discordMessageId?: string;
  messageId?: string;
  guild_id?: string;
  guildId?: string;
  status: 'open' | 'closed' | 'pending';
  date?: string;
  fine?: number;
  reporter_name?: string;
  officer_rank?: string;
  received_time?: string;
  closed_time?: string;
  duration?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  has_alert?: boolean;
  alert_type?: string | null;
  alert_message?: string | null;
  alert_status?: string | null;
}

export interface OfficerTypeStat {
  type: string;
  selfCount: number;
  helperCount: number;
  totalCount: number;
}

export interface OfficerStatsSummary {
  officerId: string;
  officerName: string;
  breakdown: OfficerTypeStat[];
  totalAllCases: number;
}

export interface Activity {
  id: number;
  title: string;
  description: string;
  reward: string;
  image: string;
  question?: string;
  options?: string[] | string;
  start_date: string;
  end_date: string;
  status: 'active' | 'finished';
  has_joined?: boolean;
  user_answer?: string;
  created_at?: string;
}

export interface ActivityHistoryItem {
  id: number;
  activity_id: number;
  title: string;
  description: string;
  reward: string;
  image: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at?: string;
}

export interface ShopItem {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  status: 'available' | 'out_of_stock';
  created_at?: string;
}

export interface SystemLog {
  id: number;
  admin_discord_id: string;
  action: string;
  date: string;
  time: string;
  affected_user: string;
  created_at?: string;
}

export interface Announcement {
  id: number;
  title: string;
  message: string;
  type: 'announcement' | 'activity' | 'system';
  created_at?: string;
}
