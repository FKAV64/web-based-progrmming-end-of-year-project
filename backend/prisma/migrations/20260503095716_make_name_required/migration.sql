
BEGIN;

-- Set a safe placeholder for existing rows that have NULL name values
UPDATE "users" SET "name" = 'Kullanıcı' WHERE "name" IS NULL;

-- Make the column required
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;

COMMIT;
