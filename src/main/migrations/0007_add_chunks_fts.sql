CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts
USING fts5(text, content='chunks', content_rowid='rowid', tokenize='porter unicode61');
--> statement-breakpoint
INSERT INTO chunks_fts(chunks_fts) VALUES('rebuild');
