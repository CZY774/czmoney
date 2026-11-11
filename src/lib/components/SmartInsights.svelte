<script lang="ts">
  import { onMount } from "svelte";
  import { supabase } from "$lib/services/supabase";
  import { localDateString } from "$lib/utils/localDate";
  import { readPageCache, writePageCache } from "$lib/stores/pageCache";

  interface Insight {
    type: string;
    severity: "critical" | "high" | "medium" | "low";
    title: string;
    message: string;
    data: Record<string, unknown>;
  }

  let insights: Insight[] = [];
  let loading = true;

  // Severity is carried by shape and label. Color only reinforces it.
  const severityMeta = {
    critical: { label: "Critical", shape: "bg-critical [clip-path:polygon(50%_4%,100%_96%,0_96%)]" },
    high: { label: "High", shape: "bg-serious [clip-path:polygon(50%_4%,100%_96%,0_96%)]" },
    medium: { label: "Medium", shape: "rounded-full bg-warning" },
    low: { label: "Low", shape: "rounded-full border-[1.5px] border-ink-3" },
  };

  onMount(() => {
    void loadInsights();
  });

  async function loadInsights() {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const cacheKey = `insights:${session.session?.user.id}:${localDateString()}`;
      const cached = readPageCache<Insight[]>(cacheKey);
      if (cached) {
        insights = [...cached];
        loading = false;
      }

      const response = await fetch(`/api/insights?today=${localDateString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        insights = result.insights || [];
        writePageCache(cacheKey, [...insights]);
      }
    } catch (error) {
      console.error("Failed to load insights:", error);
    } finally {
      loading = false;
    }
  }
</script>

{#if loading}
  <div class="animate-pulse space-y-3" aria-hidden="true">
    <div class="h-4 w-32 rounded bg-muted"></div>
    <div class="h-3 w-full rounded bg-muted"></div>
    <div class="h-3 w-3/4 rounded bg-muted"></div>
  </div>
{:else if insights.length > 0}
  <section aria-labelledby="h-insights">
    <div class="flex items-baseline justify-between gap-4 pb-4">
      <h2 id="h-insights" class="text-[15px] font-semibold">Insights</h2>
      <span class="font-mono text-xs text-ink-3">{insights.length}</span>
    </div>
    <ul>
      {#each insights as insight (insight.title)}
        {@const meta = severityMeta[insight.severity]}
        <li class="grid grid-cols-[78px_minmax(0,1fr)] gap-3 border-t border-border py-3.5">
          <span class="flex items-center gap-2 pt-0.5 font-mono text-[11px] tracking-[0.06em] text-ink-2 uppercase">
            <i class="inline-block size-[9px] flex-none {meta.shape}"></i>{meta.label}
          </span>
          <div class="min-w-0">
            <p class="font-medium">{insight.title}</p>
            <p class="mt-1 text-[13.5px] leading-normal text-ink-2">{insight.message}</p>
          </div>
        </li>
      {/each}
    </ul>
  </section>
{/if}
