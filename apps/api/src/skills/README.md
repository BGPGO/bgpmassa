# Skills

Each folder here is a self-contained feature module ("skill").

## Structure of a skill

```
skills/
└── my-skill/
    ├── skill.json              # Manifest (required)
    ├── my-skill.router.ts      # Express router (required — must export { router })
    ├── my-skill.controller.ts  # Request/response handlers
    ├── my-skill.service.ts     # Business logic
    └── my-skill.processor.ts  # Bull queue processor (optional)
```

## skill.json manifest

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "routePrefix": "/api/my-skill",
  "enabled": true,
  "queues": [],
  "dependsOn": []
}
```

| Field | Description |
|---|---|
| `name` | Unique skill identifier |
| `version` | Skill version |
| `routePrefix` | Express route prefix |
| `enabled` | Set to `false` to disable without deleting |
| `queues` | Bull queue names this skill registers |
| `dependsOn` | Skills that must be loaded before this one |

## Adding your own skills

1. Create a new folder: `src/skills/<your-skill>/`
2. Add a `skill.json` manifest
3. Create `<your-skill>.router.ts` exporting `{ router }`
4. The skill registry (`src/skills/index.ts`) will auto-discover and mount it

## Built-in skills

| Skill | Route Prefix | Description |
|---|---|---|
| `auth` | `/api/auth` | Login, refresh token, logout |
| `users` | `/api/users` | User CRUD, signature management |
| `instances` | `/api/instances` | Z-API instance management |
| `permissions` | `/api/permissions` | User-instance permission grants |
| `conversations` | `/api/conversations` | Conversation list and status |
| `messages` | `/api/messages` | Send/receive messages with signature |
| `webhooks` | `/api/webhooks` | Z-API inbound webhook receiver |
| `response-timer` | `/api/response-timers` | SLA timer engine and alerts |
| `auto-messages` | `/api/auto-messages` | Automatic message rules |
| `notifications` | `/api/notifications` | In-app notifications |
