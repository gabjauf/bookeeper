import { app } from 'electron';
import path from 'path';

export const BOOK_PATH = path.join(app.getPath('userData'), 'books');
export const THUMBNAIL_PATH = path.join(app.getPath('userData'), 'thumbnails');
