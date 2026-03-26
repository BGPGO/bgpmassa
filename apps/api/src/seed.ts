import "dotenv/config";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface InstanceConfig {
  name: string;
  zapiInstanceId: string;
  zapiToken: string;
}

/**
 * Reads all ZAPI_INSTANCE_n_* env vars and returns the configured instances.
 * Pattern: ZAPI_INSTANCE_1_NAME, ZAPI_INSTANCE_1_ID, ZAPI_INSTANCE_1_TOKEN
 */
function readInstanceConfigs(): InstanceConfig[] {
  const configs: InstanceConfig[] = [];
  let i = 1;

  while (true) {
    const name = process.env[`ZAPI_INSTANCE_${i}_NAME`];
    const id = process.env[`ZAPI_INSTANCE_${i}_ID`];
    const token = process.env[`ZAPI_INSTANCE_${i}_TOKEN`];

    if (!name && !id && !token) break;

    if (!name || !id || !token) {
      console.warn(`[Seed] Instância ${i} incompleta — precisa de NAME, ID e TOKEN. Pulando.`);
      i++;
      continue;
    }

    configs.push({ name, zapiInstanceId: id, zapiToken: token });
    i++;
  }

  return configs;
}

async function main() {
  // ── 1. Admin user ────────────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@bgpmassa.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Bgp@2025!";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      name: "Admin BGP",
      role: "SUPERADMIN",
    },
  });

  console.log(`[Seed] Admin: ${admin.email}`);

  // ── 2. Instâncias Z-API ───────────────────────────────────────────────────
  const instanceConfigs = readInstanceConfigs();

  if (instanceConfigs.length === 0) {
    console.warn("[Seed] Nenhuma instância configurada. Defina ZAPI_INSTANCE_1_NAME/ID/TOKEN no .env");
  }

  for (const config of instanceConfigs) {
    const instance = await prisma.instance.upsert({
      where: { zapiInstanceId: config.zapiInstanceId },
      update: { zapiToken: config.zapiToken, name: config.name },
      create: {
        name: config.name,
        zapiInstanceId: config.zapiInstanceId,
        zapiToken: config.zapiToken,
        webhookSecret: crypto.randomBytes(32).toString("hex"),
        status: "DISCONNECTED",
      },
    });

    // Permissão total ao admin em todas as instâncias
    await prisma.userInstancePermission.upsert({
      where: { userId_instanceId: { userId: admin.id, instanceId: instance.id } },
      update: { canRead: true, canWrite: true, canManage: true },
      create: {
        userId: admin.id,
        instanceId: instance.id,
        canRead: true,
        canWrite: true,
        canManage: true,
      },
    });

    console.log(`[Seed] Instância "${instance.name}" registrada (${instance.zapiInstanceId})`);
    console.log(`       Webhook → POST http://SEU_SERVIDOR/api/webhooks/zapi/${instance.zapiInstanceId}`);
  }

  console.log(`\n[Seed] Pronto!`);
  console.log(`  Login : ${adminEmail}`);
  console.log(`  Senha : ${adminPassword}`);
  console.log(`\n  Lembre de configurar os webhooks acima no painel Z-API de cada número.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
