-- An admin's own questions for one client, uploaded as a .md file on
-- their Files tab. Empty for everyone else, who get the standard questions.
ALTER TABLE "questionnaires" ADD COLUMN "custom" jsonb;