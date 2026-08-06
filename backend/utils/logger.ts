import fs from 'fs';
import path from 'path';

const logsDir = path.join(process.cwd(), 'backend', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export const logEvent = (level: 'INFO' | 'WARN' | 'ERROR', message: string) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  console.log(logMessage.trim());

  const logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);
  fs.appendFile(logFile, logMessage, (err) => {
    if (err) console.error("Failed to write to log file:", err);
  });
};
