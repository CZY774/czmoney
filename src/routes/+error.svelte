<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";

  $: status = $page.status;
  $: message = $page.error?.message;

  interface ErrorInfo {
    title: string;
    description: string;
    emoji: string;
    color: string;
  }

  function getErrorInfo(status: number): ErrorInfo {
    const errors: Record<number, ErrorInfo> = {
      400: {
        title: "Bad Request",
        description:
          "The request could not be understood by the server. Please check your input and try again.",
        emoji: "❌",
        color: "text-red-500",
      },
      401: {
        title: "Unauthorized",
        description:
          "You need to be logged in to access this page. Please sign in to continue.",
        emoji: "🔒",
        color: "text-yellow-500",
      },
      403: {
        title: "Access Forbidden",
        description:
          "You don't have permission to access this resource. Please check your credentials.",
        emoji: "🚫",
        color: "text-orange-500",
      },
      404: {
        title: "Page Not Found",
        description:
          "The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.",
        emoji: "🔍",
        color: "text-blue-500",
      },
      408: {
        title: "Request Timeout",
        description:
          "The request took too long to process. Please check your connection and try again.",
        emoji: "⏱️",
        color: "text-purple-500",
      },
      429: {
        title: "Too Many Requests",
        description:
          "You've made too many requests in a short time. Please wait a moment before trying again.",
        emoji: "🐌",
        color: "text-pink-500",
      },
      500: {
        title: "Internal Server Error",
        description:
          "We're experiencing some technical difficulties. Please try again in a few moments.",
        emoji: "⚠️",
        color: "text-red-500",
      },
      502: {
        title: "Bad Gateway",
        description:
          "The server is temporarily unavailable. Please try again later.",
        emoji: "🔧",
        color: "text-orange-500",
      },
      503: {
        title: "Service Unavailable",
        description:
          "The service is temporarily down for maintenance. Please check back soon.",
        emoji: "🛠️",
        color: "text-yellow-500",
      },
      504: {
        title: "Gateway Timeout",
        description:
          "The server took too long to respond. Please try again later.",
        emoji: "⏰",
        color: "text-purple-500",
      },
    };

    return (
      errors[status] || {
        title: "Something Went Wrong",
        description:
          "An unexpected error occurred. Please try refreshing the page or contact support.",
        emoji: "💥",
        color: "text-gray-500",
      }
    );
  }

  $: errorInfo = getErrorInfo(status);
</script>

<svelte:head>
  <title>Error {status} - CZmoneY</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-background px-4">
  <div class="text-center space-y-8 p-8 max-w-2xl">
    <!-- Error Icon/Emoji -->
    <div class="space-y-4">
      <div class="text-8xl animate-bounce">{errorInfo.emoji}</div>
      <div class="space-y-2">
        <h1 class="text-7xl font-bold {errorInfo.color}">{status}</h1>
        <h2 class="text-3xl font-semibold text-foreground">
          {errorInfo.title}
        </h2>
      </div>
    </div>

    <!-- Error Description -->
    <div class="space-y-4">
      <p class="text-muted-foreground text-lg max-w-xl mx-auto">
        {errorInfo.description}
      </p>

      {#if message}
        <details class="text-sm text-muted-foreground">
          <summary
            class="cursor-pointer hover:text-foreground inline-flex items-center gap-2"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Technical Details
          </summary>
          <div
            class="mt-4 p-4 bg-card rounded-lg border border-border text-left"
          >
            <p class="font-mono text-xs break-all">{message}</p>
          </div>
        </details>
      {/if}
    </div>

    <!-- Action Buttons -->
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <button
        on:click={() => history.back()}
        class="px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors font-medium"
      >
        ← Go Back
      </button>

      <button
        on:click={() => window.location.reload()}
        class="px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors font-medium"
      >
        🔄 Reload Page
      </button>

      <button
        on:click={() => goto(resolve("/"))}
        class="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
      >
        🏠 Go Home
      </button>
    </div>

    <!-- Help Section -->
    <div class="pt-8 border-t border-border">
      <p class="text-sm text-muted-foreground">
        {#if status === 401}
          Try <a href={resolve("/auth/login")} class="text-primary hover:underline"
            >signing in</a
          >
          or
          <a href={resolve("/auth/register")} class="text-primary hover:underline"
            >creating an account</a
          >
        {:else if status === 404}
          Check the URL or browse from the <a
            href={resolve("/")}
            class="text-primary hover:underline">home page</a
          >
        {:else if status >= 500}
          If the problem persists, please try again later or contact support
        {:else}
          Need help? Try refreshing the page or clearing your browser cache
        {/if}
      </p>
    </div>
  </div>
</div>

<style>
  details[open] summary {
    margin-bottom: 0.5rem;
  }

  @keyframes bounce {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-20px);
    }
  }

  .animate-bounce {
    animation: bounce 2s infinite;
  }
</style>
