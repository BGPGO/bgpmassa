import "dotenv/config";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { ZApiClient } from "./lib/zapi-client";

const prisma = new PrismaClient();

interface InstanceConfig {
  name: string;
  zapiInstanceId: string;
  zapiToken: string;
}

interface UserConfig {
  name: string;
  email: string;
  password: string;
  role: "SUPERADMIN" | "ADMIN" | "AGENT";
}

/**
 * Lê ZAPI_INSTANCE_n_NAME/ID/TOKEN do ambiente.
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

/**
 * Lê SEED_USER_n_NAME/EMAIL/PASSWORD/ROLE do ambiente.
 * Usado para criar usuários adicionais sem hardcodar credenciais no código.
 */
function readUserConfigs(): UserConfig[] {
  const users: UserConfig[] = [];
  let i = 1;
  while (true) {
    const name = process.env[`SEED_USER_${i}_NAME`];
    const email = process.env[`SEED_USER_${i}_EMAIL`];
    const password = process.env[`SEED_USER_${i}_PASSWORD`];
    const role = (process.env[`SEED_USER_${i}_ROLE`] || "AGENT") as UserConfig["role"];
    if (!name && !email) break;
    if (!name || !email || !password) {
      console.warn(`[Seed] Usuário ${i} incompleto — precisa de NAME, EMAIL e PASSWORD. Pulando.`);
      i++;
      continue;
    }
    users.push({ name, email, password, role });
    i++;
  }
  return users;
}

async function main() {
  const appUrl = (process.env.APP_URL || "http://localhost:3001").replace(/\/$/, "");

  // ── 1. Admin principal ───────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@bgpmassa.com" },
    update: {},
    create: {
      email: "admin@bgpmassa.com",
      passwordHash: await bcrypt.hash("Bgp@2025!", 12),
      name: "Admin BGP",
      role: "SUPERADMIN",
    },
  });
  console.log(`[Seed] Admin: ${admin.email}`);

  // ── 2. Usuários adicionais (via SEED_USER_n env vars) ────────────────────
  const extraUsers = readUserConfigs();
  for (const u of extraUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash: await bcrypt.hash(u.password, 12),
        name: u.name,
        role: u.role,
      },
    });
    console.log(`[Seed] Usuário: ${user.email} (${user.role})`);
  }

  // ── 3. Instâncias Z-API ──────────────────────────────────────────────────
  const instanceConfigs = readInstanceConfigs();
  if (instanceConfigs.length === 0) {
    console.warn("[Seed] Nenhuma instância configurada. Defina ZAPI_INSTANCE_1_NAME/ID/TOKEN.");
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

    // Permissão total ao admin
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

    // Permissão de leitura/escrita para usuários adicionais
    const allExtra = await prisma.user.findMany({ where: { email: { in: extraUsers.map(u => u.email) } } });
    for (const u of allExtra) {
      await prisma.userInstancePermission.upsert({
        where: { userId_instanceId: { userId: u.id, instanceId: instance.id } },
        update: {},
        create: {
          userId: u.id,
          instanceId: instance.id,
          canRead: true,
          canWrite: true,
          canManage: u.role === "ADMIN" || u.role === "SUPERADMIN",
        },
      });
    }

    const webhookUrl = `${appUrl}/api/webhooks/zapi/${config.zapiInstanceId}`;
    console.log(`[Seed] Instância "${instance.name}" (${instance.zapiInstanceId})`);
    console.log(`       Webhook → ${webhookUrl}`);

    // Tenta registrar o webhook automaticamente no Z-API
    try {
      const zapiClient = new ZApiClient(config.zapiInstanceId, config.zapiToken);
      await zapiClient.setWebhook(webhookUrl);
      console.log(`       ✓ Webhook registrado automaticamente no Z-API`);
    } catch (err) {
      console.warn(`       ⚠ Não foi possível registrar automaticamente — configure manualmente no painel Z-API`);
      console.warn(`         ${(err as Error).message}`);
    }
  }

  console.log(`\n[Seed] Pronto!`);
  console.log(`  Admin  : admin@bgpmassa.com / Bgp@2025!`);
  console.log(`  App URL: ${appUrl}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
