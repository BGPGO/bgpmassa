import { prisma } from "../../config/database";

/**
 * Appends the user's signature to a message body if one is configured.
 * Format: {body}\n\n-- {signature}
 */
export async function applySignature(
  userId: string,
  body: string
): Promise<{ body: string; signatureApplied: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { signature: true },
  });

  if (!user?.signature?.trim()) {
    return { body, signatureApplied: false };
  }

  return {
    body: `${body}\n\n-- ${user.signature}`,
    signatureApplied: true,
  };
}
