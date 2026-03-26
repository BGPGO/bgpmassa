# Skills — Módulos de IA para o Claude Code

Esta pasta armazena as skills do **Claude Code** (comportamentos/agentes de IA), separadas dos módulos de API backend que ficam em `apps/api/src/skills/`.

## Diferença importante

| Pasta | Tipo | O que faz |
|---|---|---|
| `skills/` (esta pasta) | Skills de IA | Instrui o Claude Code como se comportar. Ativadas via `/comando` no chat. |
| `apps/api/src/skills/` | Módulos de API | Rotas Express, serviços, processadores Bull. Código que roda no servidor. |

## Skills de IA disponíveis

### `/code-reviewer`
**Arquivo:** `.claude/commands/code-reviewer.md`

Revisão de código focada no projeto. Prioridade: Segurança → Performance → Correção → Manutenibilidade.

Coberturas especializadas para este projeto:
- Prisma N+1 queries e índices faltantes
- Middleware `authenticate`/`authorize` ausente nas rotas
- Corridas de condição nos Bull jobs do `response-timer`
- XSS em componentes Next.js
- Segredos hardcoded fora do `env.ts`

**Como usar:**
```
/code-reviewer
> Revise apps/api/src/skills/messages/messages.service.ts
```

---

### `/ralph-plan`
**Arquivo:** `.claude/commands/ralph-plan.md`

Assistente de planejamento interativo. Use **antes** de implementar qualquer feature não-trivial. Guia você pelas perguntas certas, pesquisa o código existente, e produz um plano com tarefas específicas e verificáveis.

**Como usar:**
```
/ralph-plan
> Quero adicionar suporte a mensagens de imagem no envio via Z-API
```

---

## Como adicionar mais skills

1. Crie uma pasta aqui: `skills/minha-skill/SKILL.md`
2. Crie o comando em `.claude/commands/minha-skill.md` com o conteúdo adaptado ao projeto
3. O Claude Code vai reconhecer automaticamente como `/minha-skill`

## Estrutura de cada skill

```
skills/
└── nome-da-skill/
    ├── SKILL.md        # Definição original da skill
    └── rules/          # (opcional) Regras detalhadas referenciadas pelo SKILL.md
```

O arquivo registrado em `.claude/commands/` é a versão adaptada ao contexto do BGP Massa.
