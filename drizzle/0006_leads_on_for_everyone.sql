-- The Leads Tool is on for everyone with access (the Full Platform, a
-- trial or a paid plan); the admin's switch only takes it away. Clients
-- brought over from the old site were left off, so they're turned on.
UPDATE "clients" SET "leads_enabled" = true WHERE "leads_enabled" = false;
