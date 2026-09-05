# Barbearia Assis

Site institucional com painel administrativo e solicitação de agendamento pelo WhatsApp. Esta versão foi preparada para funcionar no plano gratuito do Cloudflare Workers.

## Arquitetura

- React 19, TypeScript, TanStack Start e Tailwind CSS.
- Cloudflare Workers para SSR, páginas e APIs.
- Workers KV para configurações públicas e controle de tentativas de login.
- Cloudflare R2 para imagens enviadas pelo painel.
- Zod para validação no navegador e no servidor.
- Nenhum dado do cliente ou agendamento é armazenado.

O cliente escolhe serviço, profissional, data e horário e abre uma mensagem pronta no WhatsApp. A solicitação somente é confirmada quando o barbeiro responde.

## Requisitos

- Node.js 22 ou superior.
- Conta gratuita no Cloudflare.
- Wrangler autenticado.

## Instalação

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

Sem senha configurada, o painel `/admin` abre livremente somente quando `ENVIRONMENT=development`.

## Preparar o Cloudflare

Entre na sua conta:

```bash
npx wrangler login
```

Crie o armazenamento das configurações:

```bash
npx wrangler kv namespace create SITE_CONFIG
```

O comando exibirá um ID. Abra `wrangler.jsonc` e substitua:

```text
COLE_AQUI_O_ID_DO_KV
```

Crie o bucket para as imagens:

```bash
npx wrangler r2 bucket create barbearia-assis-assets
```

O nome deve continuar igual ao informado em `wrangler.jsonc`.

## Senha administrativa

Gere o hash da senha:

```bash
node -e "const {scryptSync,randomBytes}=require('crypto');const p=process.argv[1];const s=randomBytes(16).toString('hex');console.log('scrypt:'+s+':'+scryptSync(p,s,64).toString('hex'))" "SUA-SENHA-AQUI"
```

Gere o segredo da sessão:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Cadastre os dois valores como secrets. Cada comando solicitará o valor no terminal:

```bash
npx wrangler secret put ADMIN_PASSWORD_HASH
npx wrangler secret put ADMIN_SESSION_SECRET
```

Nunca coloque esses valores no GitHub ou diretamente no `wrangler.jsonc`.

## Publicar gratuitamente

Primeiro confirme a qualidade do projeto:

```bash
npm run lint
npm test
npm run build
```

Depois publique:

```bash
npm run deploy
```

O Cloudflare fornecerá um endereço semelhante a:

```text
https://barbearia-assis.seu-subdominio.workers.dev
```

Copie esse endereço para `SITE_URL` em `wrangler.jsonc` e execute novamente:

```bash
npm run deploy
```

## Primeiro acesso

1. Abra `https://SEU-ENDERECO/admin`.
2. Entre com a senha usada para criar o hash.
3. Cadastre endereço, contatos, profissionais, serviços, preços e horários reais.
4. Envie as fotos.
5. Clique em **Salvar alterações**.
6. Confira o site em uma janela anônima.

As mudanças do painel são gravadas no KV e aparecem sem commit ou novo deploy. As imagens ficam no R2 e são servidas pelo próprio domínio do site em `/uploads/`.

## Desenvolvimento local

Copie `.dev.vars.example` para `.dev.vars`. Se quiser testar com senha, preencha os dois segredos nesse arquivo. O KV e o R2 são simulados localmente pelo ambiente do Cloudflare.

```bash
npm run dev
```

Arquivos locais e dados simulados do Wrangler não devem ser enviados ao GitHub.

## Segurança

- Senha validada somente no servidor.
- Hash scrypt e comparação resistente a timing attack.
- Sessão assinada, cookie HttpOnly, Secure em produção e expiração de seis horas.
- Proteção CSRF.
- Limite de seis tentativas de login por dez minutos e por IP, registrado no KV.
- Upload limitado a JPEG, PNG e WebP de até 3 MB.
- Verificação da assinatura binária da imagem.
- CSP e cabeçalhos de segurança aplicados pelo Worker.
- Painel marcado como `noindex, nofollow, noarchive`.

## Backup

No painel, abra **Configurações**:

- **Exportar JSON** baixa uma cópia da configuração.
- **Importar backup** valida e carrega um arquivo anterior.
- **Restaurar padrão** volta para a configuração inicial.

Depois de importar ou restaurar, clique em **Salvar alterações**.

## SEO

O projeto gera metadados, URL canônica, Open Graph, JSON-LD, sitemap e robots.txt. Depois da publicação:

1. Cadastre o domínio no Google Search Console.
2. Envie `https://SEU-ENDERECO/sitemap.xml`.
3. Cadastre ou atualize o Perfil da Empresa no Google.
4. Mantenha nome, endereço e telefone iguais no site e no Google.
5. Use somente fotos e avaliações reais.

## Limitações

- Não existe agenda central em tempo real.
- Um horário exibido pode já ter sido combinado fora do site.
- O barbeiro confirma a solicitação pelo WhatsApp.
- O plano gratuito possui limites, mas eles são amplos para o tráfego normal de uma barbearia.

