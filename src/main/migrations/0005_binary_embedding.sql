-- Clear all chunks: previous ubinary BLOB format is incompatible with BIT_BLOB vector format.
-- Documents will be re-indexed on next upload.
DELETE FROM chunks;
