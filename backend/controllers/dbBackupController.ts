import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../database/db';

export const dbBackupController = {
  async exportBackup(req: AuthRequest, res: Response) {
    try {
      const tables = [
        'users',
        'duty_logs',
        'cases',
        'activities',
        'activity_join',
        'activity_history',
        'shop_items',
        'logs',
        'discord_logs',
        'announcements',
        'case_alerts',
        'evidence',
        'wanted',
        'settings',
        'roles'
      ];

      const backupData: Record<string, any[]> = {};

      for (const table of tables) {
        try {
          const rows = await query(`SELECT * FROM ${table}`);
          backupData[table] = Array.isArray(rows) ? rows : [];
        } catch (_) {
          backupData[table] = [];
        }
      }

      const payload = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        tables: backupData
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="mdt_database_backup_${Date.now()}.json"`);
      return res.send(JSON.stringify(payload, null, 2));
    } catch (error: any) {
      console.error('[DB Backup] Export Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async importBackup(req: AuthRequest, res: Response) {
    try {
      const backupData = req.body;
      if (!backupData || !backupData.tables || typeof backupData.tables !== 'object') {
        return res.status(400).json({ success: false, message: 'Invalid backup file format' });
      }

      const tablesData = backupData.tables;
      let totalRestored = 0;

      for (const [tableName, rows] of Object.entries(tablesData)) {
        if (!Array.isArray(rows) || rows.length === 0) continue;

        // Verify valid table name to prevent SQL injection
        const allowedTables = [
          'users', 'duty_logs', 'cases', 'activities', 'activity_join',
          'activity_history', 'shop_items', 'logs', 'discord_logs',
          'announcements', 'case_alerts', 'evidence', 'wanted', 'settings', 'roles'
        ];
        if (!allowedTables.includes(tableName)) continue;

        for (const row of rows) {
          if (!row || typeof row !== 'object') continue;
          const keys = Object.keys(row);
          if (keys.length === 0) continue;

          const columns = keys.join(', ');
          const placeholders = keys.map(() => '?').join(', ');
          const values = keys.map(k => row[k] === undefined ? null : (typeof row[k] === 'object' ? JSON.stringify(row[k]) : row[k]));

          try {
            // Attempt insert
            await query(
              `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`,
              values
            );
            totalRestored++;
          } catch (insertError) {
            // If conflict/duplicate key, update non-primary fields
            try {
              if (row.id) {
                const updateKeys = keys.filter(k => k !== 'id');
                if (updateKeys.length > 0) {
                  const setClause = updateKeys.map(k => `${k} = ?`).join(', ');
                  const updateValues = updateKeys.map(k => row[k] === undefined ? null : (typeof row[k] === 'object' ? JSON.stringify(row[k]) : row[k]));
                  updateValues.push(row.id);

                  await query(
                    `UPDATE ${tableName} SET ${setClause} WHERE id = ?`,
                    updateValues
                  );
                  totalRestored++;
                }
              }
            } catch (_) {}
          }
        }
      }

      return res.json({
        success: true,
        message: `Database imported successfully (${totalRestored} records processed)`,
      });
    } catch (error: any) {
      console.error('[DB Backup] Import Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};
