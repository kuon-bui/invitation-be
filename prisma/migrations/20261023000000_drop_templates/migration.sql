-- DropForeignKey
ALTER TABLE "invitations" DROP CONSTRAINT "invitations_templateId_fkey";

-- DropTable
DROP TABLE "templates";
