# Agenda no Cloudflare D1

A agenda usa `APPOINTMENTS_DB` quando o binding D1 estiver configurado. Enquanto ele nao existir, o sistema continua usando o KV atual como fallback para nao interromper o site.

## Criar o banco

```powershell
npx wrangler d1 create barbearia-assis-agenda
```

Copie o `database_id` exibido pelo Wrangler.

## Configurar o binding

Adicione em `wrangler.jsonc`, no nivel principal:

```jsonc
"d1_databases": [
  {
    "binding": "APPOINTMENTS_DB",
    "database_name": "barbearia-assis-agenda",
    "database_id": "COLE_O_DATABASE_ID_AQUI",
    "migrations_dir": "migrations"
  }
],
```

## Aplicar a estrutura

```powershell
npx wrangler d1 migrations apply barbearia-assis-agenda --remote
```

## Validar e publicar

```powershell
npm run build
npm run deploy
```

Na primeira leitura da agenda depois do D1 estar ativo, o sistema importa automaticamente os agendamentos e bloqueios existentes no KV para o D1 e grava a marca `kv_migrated_v1` em `app_meta`. O KV continua guardando as configuracoes do site e o R2 continua guardando imagens.
