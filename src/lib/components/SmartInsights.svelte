<script lang="ts">
  import { onMount } from "svelte";
  import { supabase } from "$lib/services/supabase";

  interface Insight {
    type: string;
    severity: "critical" | "high" | "medium" | "low";
    title: string;
    message: string;
    data: Record<string, unknown>;
  }

  let insights: Insight[] = [];
  let loading = true;

  const severityColors = {
    critical: "bg-red-500/10 border-red-500 text-red-400",
    high: "bg-orange-500/10 border-orange-500 text-orange-400", 
    medium: "bg-yellow-500/10 border-yellow-500 text-yellow-400",
    low: "bg-blue-500/10 border-blue-500 text-blue-400"
  };

  const severityIcons = {
    critical: "⚠️",
    high: "🔥", 
    medium: "💡",
    low: "ℹ️"
  };

  onMount(async () => {
    await loadInsights();
  });

  async function loadInsights() {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const response = await fetch("/api/insights", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        insights = result.insights || [];
      }
    } catch (error) {
      console.error("Failed to load insights:", error);
    } finally {
      loading = false;
    }
  }
</script>

{#if loading}
  <div class="bg-card p-4 rounded-lg border animate-pulse">
    <div class="h-4 bg-accent/20 rounded w-32 mb-3"></div>
    <div class="space-y-2">
      <div class="h-3 bg-accent/20 rounded w-full"></div>
      <div class="h-3 bg-accent/20 rounded w-3/4"></div>
    </div>
  </div>
{:else if insights.length > 0}
  <div class="space-y-3">
    <h3 class="text-lg font-semibold">Smart Insights</h3>
    {#each insights as insight (insight.title)}
      <div class="p-4 rounded-lg border-l-4 {severityColors[insight.severity]}">
        <div class="flex items-start gap-3">
          <span class="text-lg">{severityIcons[insight.severity]}</span>
          <div class="flex-1">
            <h4 class="font-medium text-sm">{insight.title}</h4>
            <p class="text-xs mt-1 opacity-90">{insight.message}</p>
          </div>
        </div>
      </div>
    {/each}
  </div>
{:else}
  <div class="bg-card p-4 rounded-lg border text-center">
    <p class="text-muted-foreground text-sm">No insights available yet. Add more transactions to get personalized recommendations.</p>
  </div>
{/if}
