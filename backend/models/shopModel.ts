import { query, queryOne } from '../database/db';

export interface ShopItemRow {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  status: 'available' | 'out_of_stock';
  created_at?: string;
}

export const shopModel = {
  async getAll(): Promise<ShopItemRow[]> {
    return await query('SELECT * FROM shop_items ORDER BY id DESC');
  },

  async findById(id: number): Promise<ShopItemRow | null> {
    return await queryOne('SELECT * FROM shop_items WHERE id = ?', [id]);
  },

  async create(data: { name: string; description: string; price: number; image?: string; status?: string }): Promise<number> {
    const image = data.image || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600';
    const status = data.status || 'available';
    const result = await query(
      'INSERT INTO shop_items (name, description, price, image, status) VALUES (?, ?, ?, ?, ?)',
      [data.name, data.description, data.price, image, status]
    );
    return result.insertId;
  },

  async update(id: number, data: { name?: string; description?: string; price?: number; image?: string; status?: 'available' | 'out_of_stock' }): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;

    const name = data.name ?? existing.name;
    const description = data.description ?? existing.description;
    const price = data.price ?? existing.price;
    const image = data.image ?? existing.image;
    const status = data.status ?? existing.status;

    const result = await query(
      'UPDATE shop_items SET name = ?, description = ?, price = ?, image = ?, status = ? WHERE id = ?',
      [name, description, price, image, status, id]
    );
    return result.affectedRows > 0;
  },

  async delete(id: number): Promise<boolean> {
    const result = await query('DELETE FROM shop_items WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};
