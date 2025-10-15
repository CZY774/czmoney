<script>
  import { goto } from "$app/navigation";
  import Button from "$lib/components/ui/button.svelte";
  import Card from "$lib/components/ui/card.svelte";
</script>

<svelte:head>
  <title>CZmoneY - Your Personal Finance Companion</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-background via-slate-900 to-background">
  <!-- Hero Section -->
  <div class="relative overflow-hidden">
    <div class="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]"></div>
    <div class="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/80"></div>
    
    <div class="relative container mx-auto px-4 py-20 text-center">
      <!-- Logo -->
      <div class="flex justify-center mb-8">
        <div class="w-20 h-20 bg-gradient-to-r from-primary to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl">
          <span class="text-primary-foreground font-bold text-2xl">CZ</span>
        </div>
      </div>

      <!-- Main Heading -->
      <h1 class="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
        CZmoneY
      </h1>
      
      <p class="text-xl md:text-2xl text-muted-foreground mb-4 font-light">
        Your Personal Finance Companion
      </p>
      
      <p class="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
        Take control of your finances with AI-powered insights, offline-first design, and beautiful analytics.
      </p>
      
      <!-- CTA Buttons -->
      <div class="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
        <Button 
          className="px-8 py-4 text-lg font-semibold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          on:click={() => goto('/auth/register')}
        >
          Get Started Free
        </Button>
        
        <Button 
          className="px-8 py-4 text-lg font-semibold bg-transparent border-2 border-border hover:bg-accent hover:text-accent-foreground"
          on:click={() => goto('/auth/login')}
        >
          Sign In
        </Button>
      </div>

      <!-- Feature Grid -->
      <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-all duration-300 group">
          <div class="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">Smart Analytics</h3>
          <p class="text-muted-foreground">Beautiful charts and AI-powered insights to understand your spending patterns.</p>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-all duration-300 group">
          <div class="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">Offline First</h3>
          <p class="text-muted-foreground">Works perfectly offline. Your data syncs automatically when you're back online.</p>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-all duration-300 group">
          <div class="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">Secure & Private</h3>
          <p class="text-muted-foreground">Your financial data is encrypted and stored securely. Only you have access.</p>
        </Card>
      </div>
    </div>
  </div>

  <!-- Features Section -->
  <div class="py-20 bg-accent/5">
    <div class="container mx-auto px-4">
      <div class="text-center mb-16">
        <h2 class="text-3xl md:text-4xl font-bold mb-4">Everything you need</h2>
        <p class="text-xl text-muted-foreground max-w-2xl mx-auto">
          From expense tracking to AI insights, all the tools for financial success.
        </p>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="text-center p-6">
          <div class="w-16 h-16 bg-gradient-to-r from-primary to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
            </svg>
          </div>
          <h3 class="text-lg font-semibold mb-2">Expense Tracking</h3>
          <p class="text-muted-foreground text-sm">Track every transaction with smart categorization</p>
        </div>

        <div class="text-center p-6">
          <div class="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
          </div>
          <h3 class="text-lg font-semibold mb-2">Savings Goals</h3>
          <p class="text-muted-foreground text-sm">Set and track your monthly savings targets</p>
        </div>

        <div class="text-center p-6">
          <div class="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          </div>
          <h3 class="text-lg font-semibold mb-2">AI Insights</h3>
          <p class="text-muted-foreground text-sm">Get personalized financial advice powered by AI</p>
        </div>

        <div class="text-center p-6">
          <div class="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
            </svg>
          </div>
          <h3 class="text-lg font-semibold mb-2">Export Data</h3>
          <p class="text-muted-foreground text-sm">Download your financial data anytime as CSV</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <footer class="py-12 border-t border-border">
    <div class="container mx-auto px-4 text-center">
      <div class="flex justify-center mb-4">
        <div class="w-10 h-10 bg-gradient-to-r from-primary to-blue-600 rounded-lg flex items-center justify-center">
          <span class="text-primary-foreground font-bold">CZ</span>
        </div>
      </div>
      <p class="text-muted-foreground mb-4">Built with ❤️ for better financial management</p>
      <p class="text-muted-foreground/60 text-sm">© 2024 CZmoneY. All rights reserved.</p>
    </div>
  </footer>
</div>
