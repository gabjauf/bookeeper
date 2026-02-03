import { app } from 'electron';
import path from 'path';

export const BOOK_PATH = path.join(app.getPath('userData'), 'books');
export const THUMBNAIL_PATH = path.join(app.getPath('userData'), 'thumbnails');
export const SYNC_CONFIG_PATH = path.join(app.getPath('userData'), 'sync-config.json');
export const DB_EXPORT_PATH = path.join(app.getPath('userData'), 'db-exports');
