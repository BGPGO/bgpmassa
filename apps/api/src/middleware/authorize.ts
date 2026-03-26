import type { Request, Response, NextFunction } from "express";
import type { Permission } from "@bgpmassa/shared";
import { prisma } from "../config/database";

/**
 * Requires that req.params.instanceId or req.body.instanceId is set.
 * Checks that the authenticated user has the specified permission on that instance.
 */
export function authorize(permission: Permission) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const instanceId = req.params.instanceId || req.body.instanceId;
    if (!instanceId) {
      res.status(400).json({ error: "instanceId é obrigatório" });
      return;
    }

    // SUPERADMIN bypasses permission checks
    if (req.user.role === "SUPERADMIN") {
      next();
      return;
    }

    const perm = await prisma.userInstancePermission.findUnique({
      where: { userId_instanceId: { userId: req.user.sub, instanceId } },
    });

    if (!perm || !perm[permission as keyof typeof perm]) {
      res.status(403).json({ error: "Permissão insuficiente para esta instância" });
      return;
    }

    next();
  };
}
