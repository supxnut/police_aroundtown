import { query, queryOne } from '../database/db';

export interface ActivityRow {
  id: number;
  title: string;
  description: string;
  reward: string;
  image: string;
  question?: string;
  options?: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'finished';
  created_at?: string;
  has_joined?: boolean;
  user_answer?: string;
}

export interface ActivityHistoryRow {
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

export const activityModel = {
  async getActiveForPolice(userId: number): Promise<ActivityRow[]> {
    const activities: ActivityRow[] = await query("SELECT * FROM activities WHERE status = 'active' ORDER BY id DESC");
    
    // Check which ones the police officer has already joined and their answer
    const joinedRows: { activity_id: number; answer: string }[] = await query(
      'SELECT activity_id, answer FROM activity_join WHERE user_id = ?',
      [userId]
    );
    const joinedMap = new Map(joinedRows.map(r => [r.activity_id, r.answer]));

    return activities.map(act => ({
      ...act,
      has_joined: joinedMap.has(act.id),
      user_answer: joinedMap.get(act.id) || ''
    }));
  },

  async getAllForAdmin(): Promise<ActivityRow[]> {
    return await query('SELECT * FROM activities ORDER BY id DESC');
  },

  async findById(id: number): Promise<ActivityRow | null> {
    return await queryOne('SELECT * FROM activities WHERE id = ?', [id]);
  },

  async joinActivity(activityId: number, userId: number, answer: string = ''): Promise<boolean> {
    const existing = await queryOne(
      'SELECT * FROM activity_join WHERE activity_id = ? AND user_id = ?',
      [activityId, userId]
    );

    if (existing) {
      throw new Error('คุณได้ส่งคำตอบ/โหวตสำหรับกิจกรรมนี้ไปแล้ว!');
    }

    const activity = await this.findById(activityId);
    if (!activity || activity.status !== 'active') {
      throw new Error('กิจกรรมนี้ปิดรับการตอบคำถาม/โหวตแล้ว');
    }

    await query('INSERT INTO activity_join (activity_id, user_id, answer) VALUES (?, ?, ?)', [activityId, userId, answer]);
    return true;
  },

  async getJoinedUsers(activityId: number): Promise<any[]> {
    return await query(`
      SELECT u.id, u.fullname, u.rank, u.avatar, j.answer, j.joined_at
      FROM activity_join j
      JOIN users u ON j.user_id = u.id
      WHERE j.activity_id = ?
      ORDER BY j.joined_at ASC
    `, [activityId]);
  },

  async create(data: { title: string; description: string; reward: string; image?: string; question?: string; options?: string; start_date: string; end_date: string; status?: string }): Promise<number> {
    const image = data.image || 'https://images.unsplash.com/photo-1508847154043-be5407fcaa5a?w=600';
    const status = data.status || 'active';
    const question = data.question || 'โปรดโหวตหรือตอบคำถามสำหรับกิจกรรมนี้';
    const options = data.options || '["เห็นด้วย / เข้าร่วม", "ไม่เห็นด้วย / ไม่สะดวก", "ข้อเสนอแนะเพิ่มเติม"]';
    const result = await query(
      'INSERT INTO activities (title, description, reward, image, question, options, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data.title, data.description, data.reward, image, question, options, data.start_date, data.end_date, status]
    );
    return result.insertId;
  },

  async update(id: number, data: { title?: string; description?: string; reward?: string; image?: string; question?: string; options?: string; start_date?: string; end_date?: string; status?: 'active' | 'finished' }): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;

    const title = data.title ?? existing.title;
    const description = data.description ?? existing.description;
    const reward = data.reward ?? existing.reward;
    const image = data.image ?? existing.image;
    const question = data.question ?? existing.question ?? 'โปรดโหวตหรือตอบคำถามสำหรับกิจกรรมนี้';
    const options = data.options ?? existing.options ?? '["เห็นด้วย / เข้าร่วม", "ไม่เห็นด้วย / ไม่สะดวก", "ข้อเสนอแนะเพิ่มเติม"]';
    const start_date = data.start_date ?? existing.start_date;
    const end_date = data.end_date ?? existing.end_date;
    const status = data.status ?? existing.status;

    const result = await query(
      'UPDATE activities SET title = ?, description = ?, reward = ?, image = ?, question = ?, options = ?, start_date = ?, end_date = ?, status = ? WHERE id = ?',
      [title, description, reward, image, question, options, start_date, end_date, status, id]
    );

    // If status changed to finished, archive to activity_history
    if (status === 'finished' && existing.status !== 'finished') {
      await query(
        'INSERT INTO activity_history (activity_id, title, description, reward, image, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, title, description, reward, image, start_date, end_date, 'finished']
      );
    }

    return result.affectedRows > 0;
  },

  async delete(id: number): Promise<boolean> {
    const result = await query('DELETE FROM activities WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async getHistory(): Promise<ActivityHistoryRow[]> {
    return await query('SELECT * FROM activity_history ORDER BY id DESC');
  }
};
