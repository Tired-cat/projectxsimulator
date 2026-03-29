import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a marketing analytics tutor helping a student with a budget allocation simulation.

The student has a $20,000 budget to allocate across 4 channels (TikTok, Instagram, Facebook, Newspaper) selling 3 products (Bottle $10, Cushion $50, Chair $500).

They are building a "Reasoning Board" with 4 blocks:
- Descriptive: What happened? (observations from the data)
- Diagnostic: Why did it happen? (root cause analysis)
- Predictive: What will happen? (forecasting outcomes)
- Prescriptive: What should we do? (recommendations)

Your role:
- Give constructive feedback on their reasoning
- Point out gaps or logical inconsistencies
- Suggest evidence they might be missing
- Help them think critically about channel performance vs revenue quality
- Be encouraging but intellectually rigorous
- Keep responses concise (2-3 paragraphs max)
- Never give them the "answer" directly — guide them to discover it

The key insight they should discover: channels that generate high views/clicks (like TikTok) may primarily sell low-value products (Bottles), while channels with fewer clicks (like Newspaper) may sell high-value products (Chairs). Revenue ≠ volume.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build context message from simulation state
    let contextMessage = "";
    if (context) {
      const parts: string[] = [];

      if (context.board) {
        const b = context.board;
        for (const block of ["descriptive", "diagnostic", "predictive", "prescriptive"]) {
          const chips = b[block] || [];
          if (chips.length > 0) {
            const chipLabels = chips.map((c: any) => `"${c.label}: ${c.value}"`).join(", ");
            parts.push(`${block.charAt(0).toUpperCase() + block.slice(1)} block: ${chipLabels}`);
          } else {
            parts.push(`${block.charAt(0).toUpperCase() + block.slice(1)} block: (empty)`);
          }
        }
      }

      if (context.channelSpend) {
        const s = context.channelSpend;
        parts.push(`Budget allocation: TikTok $${s.tiktok}, Instagram $${s.instagram}, Facebook $${s.facebook}, Newspaper $${s.newspaper}`);
      }

      if (context.totals) {
        parts.push(`Current total revenue: $${context.totals.totalRevenue?.toLocaleString() || 0}`);
      }

      if (context.writtenDiagnosis) {
        parts.push(`Written diagnosis: "${context.writtenDiagnosis}"`);
      }

      contextMessage = "\n\n[CURRENT STUDENT STATE]\n" + parts.join("\n");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + contextMessage },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact your instructor." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
