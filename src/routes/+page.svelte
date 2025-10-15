<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { getSession } from "$lib/services/supabase";
  import Button from "$lib/components/ui/button.svelte";
  import Card from "$lib/components/ui/card.svelte";
  
  let user = null;
  let loading = true;

  onMount(async () => {
    const { data } = await getSession();
    user = data.session?.user;
    
    if (user) {
      goto('/dashboard');
      return;
    }
    
    loading = false;
  });
</script>

<svelte:head>
  <title>CZmoneY - Your Personal Finance Companion</title>
  <meta name="description" content="Take control of your finances with CZmoneY. Track expenses, save wisely, and build wealth with AI-powered insights." />
</svelte:head>

{#if loading}
  <div class="flex items-center justify-center min-h-screen">
    <div class="animate-pulse text-xl">Loading...</div>
  </div>
{:else}
  <!-- Landing Page -->
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
    <!-- Hero Section -->
    <div class="relative">
      <div class="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-emerald-600/10"></div>
      <div class="relative px-6 py-20 text-center">
        <div class="max-w-4xl mx-auto">
          <div class="mb-8">
            <div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full mb-6">
              <span class="text-3xl">💰</span>
            </div>
            <h1 class="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-400 via-emerald-400 to-blue-400 bg-clip-text text-transparent mb-6">
              CZmoneY
            </h1>
            <p class="text-xl md:text-2xl text-slate-300 mb-4">
              Your Personal Finance Companion
            </p>
            <p class="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Welcome back to smart money management. Don't spend too much, always save wisely, and let AI guide your financial journey.
            </p>
          </div>
          
          <div class="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              on:click={() => goto('/auth/register')}
              className="h-14 px-8 text-lg bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700"
            >
              Start Your Journey
            </Button>
            <Button 
              on:click={() => goto('/auth/login')}
              variant="outline"
              className="h-14 px-8 text-lg border-slate-600 hover:bg-slate-800"
            >
              Welcome Back
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Features Section -->
    <div class="px-6 py-16">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-bold text-slate-100 mb-4">
            Why Choose CZmoneY?
          </h2>
          <p class="text-slate-400 text-lg">
            Because every rupiah matters, and every decision shapes your future
          </p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="p-8 bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-blue-700/30 hover:border-blue-600/50 transition-all">
            <div class="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
              <span class="text-2xl">🎯</span>
            </div>
            <h3 class="text-xl font-bold text-blue-100 mb-4">Smart Tracking</h3>
            <p class="text-blue-200/70 leading-relaxed">
              Track every transaction with ease. Categorize expenses, monitor income, and watch your financial patterns unfold with beautiful charts.
            </p>
          </Card>
          
          <Card className="p-8 bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 border-emerald-700/30 hover:border-emerald-600/50 transition-all">
            <div class="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
              <span class="text-2xl">🤖</span>
            </div>
            <h3 class="text-xl font-bold text-emerald-100 mb-4">AI Insights</h3>
            <p class="text-emerald-200/70 leading-relaxed">
              Get personalized financial advice powered by AI. Understand your spending habits and receive actionable tips to improve your financial health.
            </p>
          </Card>
          
          <Card className="p-8 bg-gradient-to-br from-purple-900/30 to-purple-800/20 border-purple-700/30 hover:border-purple-600/50 transition-all">
            <div class="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-6">
              <span class="text-2xl">📱</span>
            </div>
            <h3 class="text-xl font-bold text-purple-100 mb-4">Offline Ready</h3>
            <p class="text-purple-200/70 leading-relaxed">
              Works everywhere, even without internet. Your data syncs automatically when you're back online. Never miss tracking an expense again.
            </p>
          </Card>
        </div>
      </div>
    </div>

    <!-- Wisdom Section -->
    <div class="px-6 py-16">
      <div class="max-w-4xl mx-auto">
        <Card className="p-12 bg-gradient-to-r from-slate-800/50 to-slate-700/50 border-slate-600/50 text-center">
          <div class="w-20 h-20 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-8">
            <span class="text-3xl">💡</span>
          </div>
          <h2 class="text-3xl font-bold text-slate-100 mb-6">Financial Wisdom</h2>
          <blockquote class="text-2xl text-slate-300 italic leading-relaxed mb-8">
            "The habit of saving is itself an education; it fosters every virtue, teaches self-denial, cultivates the sense of order, trains to forethought, and so broadens the mind."
          </blockquote>
          <p class="text-slate-400">— T.T. Munger</p>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div>
              <div class="text-3xl font-bold text-emerald-400 mb-2">Save</div>
              <p class="text-slate-400">Every rupiah saved is a step toward financial freedom</p>
            </div>
            <div>
              <div class="text-3xl font-bold text-blue-400 mb-2">Track</div>
              <p class="text-slate-400">What gets measured gets managed</p>
            </div>
            <div>
              <div class="text-3xl font-bold text-purple-400 mb-2">Grow</div>
              <p class="text-slate-400">Small consistent actions lead to big results</p>
            </div>
          </div>
        </Card>
      </div>
    </div>

    <!-- CTA Section -->
    <div class="px-6 py-16">
      <div class="max-w-2xl mx-auto text-center">
        <h2 class="text-3xl font-bold text-slate-100 mb-4">
          Ready to Take Control?
        </h2>
        <p class="text-slate-400 text-lg mb-8">
          Join thousands who've transformed their financial lives. Start your journey today.
        </p>
        
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            on:click={() => goto('/auth/register')}
            className="h-16 px-10 text-xl bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
          >
            <span class="mr-2">🚀</span>
            Get Started Free
          </Button>
          <Button 
            on:click={() => goto('/auth/login')}
            variant="outline"
            className="h-16 px-10 text-xl border-slate-600 hover:bg-slate-800"
          >
            <span class="mr-2">👋</span>
            Sign In
          </Button>
        </div>
        
        <p class="text-slate-500 text-sm mt-6">
          Free forever • No credit card required • Your data stays private
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-6 py-8 border-t border-slate-800">
      <div class="max-w-4xl mx-auto text-center">
        <p class="text-slate-500">
          Built with ❤️ for smart money management • 
          <span class="text-slate-400 font-medium">Remember: Don't spend too much, always save wisely</span>
        </p>
      </div>
    </div>
  </div>
{/if}
