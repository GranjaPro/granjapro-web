import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const BASE_CONTEXT = `Você é o Assistente IA da Granja Pro, uma plataforma SaaS de gestão avícola (granja de galinhas poedeiras).
Sempre responda em português brasileiro.

Dados da granja:
- Aves ativas: ~10.650
- Produção média: ~4.200 ovos/dia
- Taxa de postura média: ~88%
- Mortalidade: ~0,89%/mês
- Custo de ração: ~R$ 18.750/mês
- Receita mensal: ~R$ 43.500
- 3 galpões ativos`;

const TIER_PROMPTS: Record<string, string> = {
  simple: `${BASE_CONTEXT}

INSTRUÇÕES DE RESPOSTA (modo simples):
- Seja breve e direto. Respostas curtas a médias.
- Vá direto ao ponto, sem rodeios.
- Use no máximo 2-4 bullets ou 1-2 parágrafos curtos.
- Não inclua planos de ação, recomendações extensas ou análises profundas.
- Responda como se estivesse mandando uma mensagem rápida para o avicultor.`,

  detailed: `${BASE_CONTEXT}

INSTRUÇÕES DE RESPOSTA (modo detalhado):
- Forneça uma análise detalhada e aprofundada do tema.
- Use dados, comparativos, porcentagens e contexto técnico.
- Estruture com títulos, subtítulos e bullets organizados.
- IMPORTANTE: NÃO diga ao usuário o que ele deve fazer. NÃO inclua plano de ação, recomendações ou sugestões de próximos passos.
- Apenas analise, explique e apresente os dados. O usuário decidirá o que fazer.
- Foque em: o que está acontecendo, por que está acontecendo, como os números se comparam.`,

  diagnostic: `${BASE_CONTEXT}

INSTRUÇÕES DE RESPOSTA (modo diagnóstico completo):
- Faça uma análise completa e exaustiva do caso.
- Use TODOS os dados disponíveis do sistema para contextualizar.
- Cruze informações: produção × mortalidade × custos × receita.
- Identifique causas raízes, padrões e correlações.
- Inclua um plano de ação detalhado com prioridades e passos concretos.
- Dê recomendações práticas, mensuráveis e com prazos quando possível.
- Formate com seções claras: Diagnóstico, Análise de Dados, Causas Identificadas, Plano de Ação, Resultados Esperados.
- Seja o mais completo possível — este é o nível premium de atendimento.`,
};

export async function POST(request: NextRequest) {
  try {
    const { messages, tier } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Choose model and max_tokens based on tier
    let model = "claude-haiku-4-5";
    let maxTokens = 1024;

    if (tier === "detailed") {
      model = "claude-sonnet-4-6";
      maxTokens = 2048;
    } else if (tier === "diagnostic") {
      model = "claude-sonnet-4-6";
      maxTokens = 4096;
    }

    // Build messages for Claude API
    const apiMessages: Anthropic.MessageParam[] = messages.map(
      (msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })
    );

    // Stream the response
    const stream = client.messages.stream({
      model,
      max_tokens: maxTokens,
      system: TIER_PROMPTS[tier] || TIER_PROMPTS.simple,
      messages: apiMessages,
    });

    // Create a ReadableStream that sends SSE events
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const data = JSON.stringify({ text: event.delta.text });
              controller.enqueue(
                encoder.encode(`data: ${data}\n\n`)
              );
            }
          }

          const finalMessage = await stream.finalMessage();
          const doneData = JSON.stringify({
            done: true,
            usage: {
              input_tokens: finalMessage.usage.input_tokens,
              output_tokens: finalMessage.usage.output_tokens,
            },
          });
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
          controller.close();
        } catch (err) {
          const errorData = JSON.stringify({
            error: err instanceof Error ? err.message : "Stream error",
          });
          controller.enqueue(
            encoder.encode(`data: ${errorData}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("AI API error:", error);

    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json(
        { error: "API key inválida ou não configurada" },
        { status: 401 }
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json(
        { error: "Limite de requisições atingido. Tente novamente em breve." },
        { status: 429 }
      );
    }

    return Response.json(
      { error: "Erro interno do assistente IA" },
      { status: 500 }
    );
  }
}
