import type { Express } from "express";
import fs from "fs";
import path from "path";

interface SkillManifest {
  name: string;
  version: string;
  routePrefix: string;
  enabled: boolean;
  queues?: string[];
  dependsOn?: string[];
}

/**
 * Auto-discovers all skill directories, reads their skill.json manifest,
 * and registers their routers with the Express app.
 *
 * To add a new skill:
 * 1. Create a folder under src/skills/<skill-name>/
 * 2. Add a skill.json manifest
 * 3. Export a router from <skill-name>.router.ts
 * 4. The registry will auto-mount it — no manual imports needed
 */
export async function loadSkills(app: Express): Promise<void> {
  const skillsDir = __dirname;
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const skillDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  // Sort by dependsOn to ensure correct loading order
  const manifests: (SkillManifest & { dir: string })[] = [];

  for (const dir of skillDirs) {
    const manifestPath = path.join(skillsDir, dir, "skill.json");
    if (!fs.existsSync(manifestPath)) continue;

    const manifest: SkillManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    if (!manifest.enabled) {
      console.log(`[Skills] Skipping disabled skill: ${manifest.name}`);
      continue;
    }
    manifests.push({ ...manifest, dir });
  }

  for (const manifest of manifests) {
    try {
      const routerPath = path.join(skillsDir, manifest.dir, `${manifest.dir}.router`);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { router } = require(routerPath);
      app.use(manifest.routePrefix, router);
      console.log(`[Skills] Loaded: ${manifest.name} @ ${manifest.routePrefix}`);
    } catch (err) {
      console.error(`[Skills] Failed to load ${manifest.name}:`, err);
    }
  }
}
