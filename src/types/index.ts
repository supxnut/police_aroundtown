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

export interface Case {
  id: number;
  case_number: string;
  title: string;
  description: string;
  suspect_name: string;
  officer_in_charge: string;
  status: 'open' | 'closed' | 'pending';
  date?: string;
  fine?: number;
  reporter_name?: string;
  officer_discord_id?: string;
  officer_rank?: string;
  received_time?: string;
  closed_time?: string;
  duration?: string;
  created_at?: string;
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
