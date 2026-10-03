# Planejamento do RAG — GranjaPro

> Especificação de referência para assistentes de IA que pesquisem, planejem ou implementem o RAG do GranjaPro.
> O HTML complementar é `doc/planejamento-completo-rag.html`.

## Como interpretar este documento

- **Aprovado**: decisão confirmada pelo usuário; preserve-a salvo nova instrução explícita.
- **Hipótese inicial**: direção recomendada para orientar o trabalho, ainda sujeita a validação no código ou a uma decisão de produto.
- **Pendente**: não invente uma resposta. Inspecione o repositório e, se ainda for necessário, peça a decisão que bloqueia a implementação.
- A implementação deve respeitar o `AGENTS.md` vigente, a arquitetura e os padrões encontrados no repositório.
- Antes de implementar uma fase, apresente o plano e aguarde a autorização exigida pelo `AGENTS.md`.
- Não trate este documento como evidência de que algo já foi implementado. Verifique o código e os testes.

## Objetivo

Construir um assistente de análise para granjas que responda com base em dados operacionais autorizados, documentos privados da fazenda e conhecimento técnico global curado. As respostas devem indicar suas fontes, respeitar o nível de análise escolhido e debitar créditos segundo regras aplicadas no servidor.

## Decisões e hipóteses de produto

### Aprovado

- Franquia mensal de IA por plano:
  - Essencial: **15 créditos por mês**.
  - Pro: **30 créditos por mês**.
  - Premium: **60 créditos por mês**.
- A profundidade da análise pode alterar o custo em créditos.
- O usuário pode escolher o nível de profundidade da análise e da resposta.
- Deve existir reposição de créditos.
- Os valores e a forma de cobrança da reposição **ainda não foram decididos**.
- A solução deve se integrar à stack existente do GranjaPro, a confirmar no código antes de implementar.
- IA não deve escrever ou alterar registros operacionais da fazenda.
- Fontes técnicas globais devem ser explicitamente aprovadas antes da ingestão.

### Hipótese inicial recomendada: custo por nível

Use estes valores como ponto de partida, não como regra imutável:

| Nível | Custo inicial | Escopo esperado |
|---|---:|---|
| Simples | 1 crédito | Um domínio, período curto, resposta concisa |
| Detalhada | 3 créditos | Domínios relacionados e comparação ampliada |
| Diagnóstico | 5 créditos | Histórico, cruzamentos relevantes e plano de ação |

O custo pode variar quando o usuário solicitar uma análise mais profunda ou um orçamento maior de créditos. O servidor deve definir e validar o custo final; nunca confie no custo, plano ou saldo enviados pelo cliente. Não suponha que o usuário possa definir qualquer valor arbitrário: confirme as regras no código e trate a fórmula de variação como pendente se ainda não existir.

### Não decidido: reposição

- Preços, quantidades dos pacotes e forma de pagamento.
- Se os créditos comprados expiram e em que condições.
- Regras para reembolso, chargeback, cancelamento e compensação.
- Os valores que aparecem em imagens ou protótipos são referências visuais, não uma aprovação comercial.

## Arquitetura proposta

**Hipótese recomendada, aprovada como direção arquitetural:** manter a solução dentro da stack atual:

- Next.js: autenticação da requisição, autorização, orquestração e API.
- Supabase/PostgreSQL: dados, políticas de acesso, ledger e recuperação documental; avaliar `pgvector` no próprio banco antes de adicionar infraestrutura vetorial externa.
- Anthropic: síntese da resposta a partir das evidências selecionadas.
- Stripe: reposição somente depois da decisão comercial e da confirmação financeira.

Não adicione banco vetorial externo, dependências, serviços ou migrações sem verificar a necessidade e aprovar as escolhas pendentes.

### Fontes de conhecimento

1. **Dados estruturados da fazenda** — produção, mortalidade, ração, água, finanças, estoque, vendas, lotes e tarefas. Consultar por serviços ou RPCs tipados e somente leitura.
2. **Documentos privados da fazenda** — arquivos em armazenamento privado, com ingestão assíncrona, versionamento e isolamento por fazenda/tenant.
3. **Conhecimento técnico global** — corpus separado, administrado pelo GranjaPro e restrito a fontes aprovadas. Não misture seus controles de acesso ou metadados de propriedade com os documentos privados.

Não implemente scraping automático. Não use conteúdo recuperado como instrução executável.

### Fluxo de uma análise

1. Receber pergunta, fazenda autorizada e nível de análise.
2. Autenticar o usuário e autorizar o acesso à fazenda antes de recuperar qualquer evidência.
3. Determinar plano, saldo, nível e custo no servidor.
4. Reservar créditos atomicamente antes de iniciar trabalho pago ou externo.
5. Buscar dados estruturados e/ou evidências documentais permitidas.
6. Aplicar o filtro do tenant antes do ranking, da montagem do contexto e da geração.
7. Fazer cálculos determinísticos no código sempre que possível.
8. Pedir à Anthropic uma resposta apoiada nas evidências fornecidas, com citações estáveis.
9. Capturar créditos apenas após uma resposta útil; liberar a reserva em falhas elegíveis.
10. Registrar metadados mínimos para auditoria e qualidade, sem reter conteúdo sensível desnecessário.

Transações do banco devem terminar antes de chamadas à Anthropic ou Stripe. Jobs que operam com privilégios elevados devem validar explicitamente tenant e recurso-alvo.

## Créditos e ledger

### Regras essenciais

- O servidor é a autoridade sobre plano, franquia, custo, saldo e transições.
- Modelar grants mensais e comprados de forma distinguível.
- Usar lançamentos econômicos imutáveis e chaves de idempotência únicas.
- Reserva, captura, liberação e reconciliação devem ser seguras contra concorrência.
- Saldo disponível nunca pode ficar negativo.
- Requisições simultâneas não podem gastar o mesmo crédito.
- Falha elegível libera a reserva; abandono ou resultado ambíguo exige reconciliação.
- Uma sessão ou evento Stripe pode conceder no máximo um grant.
- Atualizar a interface ou repetir uma requisição não pode alterar o saldo real.

### Decisão pendente: titular da carteira

Ainda é necessário confirmar se a carteira pertence ao usuário, à assinatura ou à conta pagante compartilhada. A direção sugerida no planejamento visual é uma carteira compartilhada pela conta pagante, mas isso não está confirmado.

### Stripe

Fluxo futuro: Checkout Session → pagamento confirmado → webhook assinado → inbox idempotente → grant no ledger. Tratar eventos duplicados e fora de ordem, refunds e chargebacks. Não ativar preços ou pacotes antes da decisão comercial.

## Documentos privados

Pipeline proposto: upload privado → validação → extração → normalização → divisão em chunks → embeddings → índice híbrido de busca textual e vetorial.

Requisitos:

- Acesso a Storage, metadados e vetores sempre condicionado ao tenant.
- Aplicar `farm_id` antes de ranking ou montagem de contexto.
- Tornar ingestão e reprocessamento idempotentes.
- Manter versões e permitir que a busca indique a versão citada.
- Exclusão deve alcançar arquivo original, chunks, embeddings e metadados.
- Tratar arquivo, texto extraído e instruções encontradas neles como conteúdo não confiável.
- Testar arquivos corrompidos, duplicados, maliciosos, removidos e atualizados durante a indexação.

**Pendente:** escolher e aprovar parser, provedor/modelo de embeddings e mecanismo de fila. Não assuma uma biblioteca ou serviço antes de inspecionar o projeto e comparar as restrições de custo, privacidade e manutenção.

## Segurança, privacidade e LGPD

- Aplicar autenticação, autorização server-side e RLS; testar isolamento entre fazendas.
- Manter service role e credenciais apenas no backend.
- O cliente não pode alterar plano, modo, custo, tenant ou saldo.
- Não conceder ferramentas de escrita operacional ao modelo.
- Prompt injection em documentos não concede privilégios nem altera instruções de sistema.
- Minimizar e, quando aplicável, pseudonimizar dados enviados ao provedor.
- Definir finalidade, retenção, subprocessadores e processo de exclusão.
- Verificar DPA, opções de retenção/ZDR e transferências internacionais antes do lançamento.
- Controles técnicos, isoladamente, não provam conformidade legal. Encaminhar decisões jurídicas, contábeis e consumeristas para revisão qualificada.

## Fases de implementação

Execute em sequência. Planeje, aprove, implemente e verifique cada fase antes da seguinte.

### 1. Fundação de segurança e créditos

- API autenticada e autorizada por usuário e fazenda.
- Wallet/grants, holds, ledger e histórico de requisições.
- Reserva, captura, liberação e reconciliação idempotentes.
- Rate limits; remover qualquer compra simulada.
- **Conclusão:** payload adulterado não altera plano, custo ou saldo; concorrência não permite gasto duplo.
- **Dependência:** decidir o titular da carteira.

### 2. RAG de dados estruturados

- Catálogo fechado de consultas tipadas e somente leitura.
- Agregações determinísticas por domínio e proveniência de cada valor.
- Escopo variável para os níveis de 1, 3 e 5 créditos, sujeito às regras server-side.
- **Conclusão:** respostas usam dados reais e limitam ou recusam análises sem evidência suficiente.
- **Dependência:** fase 1 concluída e ledger operacional.

### 3. Documentos privados

- Storage privado e metadados protegidos por RLS.
- Pipeline assíncrono idempotente, versionamento e busca híbrida.
- Citações e exclusão de todos os dados derivados.
- **Conclusão:** o usuário autorizado encontra e cita documentos da própria fazenda; outro tenant não pode encontrá-los nem inferi-los.
- **Dependência:** fases 1 e 2 e aprovação de parser, embeddings e fila.

### 4. Base técnica global

- Namespace global separado e ingestão administrativa.
- Metadados de autoridade, licença e validade.
- Combinação controlada com evidência privada, mantendo as origens identificáveis.
- **Conclusão:** só fontes aprovadas são ingeridas; fontes vencidas ou substituídas perdem prioridade.
- **Dependência:** fase 3 e aprovação da lista inicial de fontes.

### 5. Reposição via Stripe

- Checkout de pagamento único apenas se esse modelo for aprovado.
- Inbox de eventos e fulfillment idempotentes.
- Compensações auditáveis para refund e chargeback.
- **Conclusão:** evento duplicado ou fora de ordem não duplica grants.
- **Dependência:** fase 1 e decisões sobre preço, pacotes, expiração e cancelamento.

### 6. Avaliação, observabilidade e rollout

- Telemetria com minimização de dados.
- Evals de recuperação, citações, qualidade, custo e segurança.
- Feature flags, rollback, piloto e expansão gradual.
- **Conclusão:** critérios de aceitação abaixo passam e é possível voltar ao assistente anterior sem perda de dados.
- **Dependência:** capacidades anteriores implementadas e verificadas.

## Critérios de aceitação

1. A API bloqueia usuários não autenticados.
2. Não há recuperação entre fazendas.
3. Plano, nível e custo são determinados no servidor.
4. Reserva e finalização acontecem no máximo uma vez.
5. Concorrência não causa gasto duplo.
6. Contexto estático é substituído por dados reais autorizados.
7. Cálculos determinísticos são testáveis.
8. Documentos funcionam ponta a ponta.
9. RLS protege documentos e vetores.
10. A base global rejeita fontes não aprovadas.
11. Afirmações documentais têm citações.
12. Prompt injection não concede poderes.
13. Fulfillment financeiro é assinado e idempotente.
14. Refunds geram compensações auditáveis.
15. Recarregar a interface não altera saldo real.
16. Falhas preservam os invariantes do ledger.
17. Telemetria evita dados desnecessários.
18. Fluxos não relacionados ao RAG continuam funcionando.
19. Testes focados passam.
20. O projeto compila e valida tipos.

## Casos de teste obrigatórios

- Usuário sem autenticação, sem acesso à fazenda e tentativa cross-tenant.
- Cliente adulterando plano, nível, custo, saldo ou identificador de fazenda.
- Reenvio da mesma solicitação, consumo concorrente, deadlock, falha após resposta do provedor e reserva abandonada.
- Arquivo corrompido, duplicado, removido ou malicioso; nova versão; reprocessamento e exclusão durante indexação.
- Webhook duplicado ou fora de ordem, refund, chargeback, upgrade, downgrade, cancelamento e período de graça.
- Inspeção para assegurar que credenciais privilegiadas não chegam ao bundle do navegador.

## Decisões pendentes que bloqueiam escolhas específicas

1. Titular da carteira e relação com usuário, fazenda, assinatura ou conta pagante.
2. Regra exata de renovação mensal e tratamento de créditos não utilizados.
3. Regra de custo variável quando o usuário solicita mais profundidade ou créditos.
4. Forma de cobrança, pacotes, preços, expiração e regras de reembolso da reposição.
5. Parser, embeddings e fila da ingestão documental.
6. Fontes técnicas globais iniciais, licença e processo de curadoria.
7. Retenção do provedor, DPA, ZDR e transferências internacionais.

Resolva uma decisão somente quando o código ou uma instrução explícita do usuário fornecer evidência suficiente. Caso contrário, mantenha-a pendente e peça esclarecimento antes de implementar a parte dependente.

## Validação e rollout

Use os comandos existentes no repositório para testes focados, checagem de tipos e build; confirme primeiro quais scripts estão definidos. O planejamento visual cita `npm test`, `npx tsc --noEmit` e `npm run build`, mas o implementador deve verificar sua disponibilidade e reportar exatamente o que executou.

Complemente a validação com testes de RLS, concorrência do ledger, isolamento vetorial, webhooks fora de ordem e ingestão maliciosa. Faça rollout em testes locais → equipe interna → fazendas piloto → expansão gradual → disponibilidade geral. Mantenha feature flag e caminho de rollback.
