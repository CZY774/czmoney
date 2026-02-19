import { supabase } from "./supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

type SubscriptionCallback = () => void;

class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private callbacks: Map<string, Set<SubscriptionCallback>> = new Map();

  subscribe(
    channelName: string,
    table: string,
    userId: string,
    callback: SubscriptionCallback,
  ) {
    // Add callback to set
    if (!this.callbacks.has(channelName)) {
      this.callbacks.set(channelName, new Set());
    }
    this.callbacks.get(channelName)!.add(callback);

    // Create channel if doesn't exist
    if (!this.channels.has(channelName)) {
      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: table,
            filter: `user_id=eq.${userId}`,
          },
          () => {
            // Notify all callbacks
            this.callbacks.get(channelName)?.forEach((cb) => cb());
          },
        )
        .subscribe();

      this.channels.set(channelName, channel);
    }

    // Return unsubscribe function
    return () => this.unsubscribe(channelName, callback);
  }

  unsubscribe(channelName: string, callback: SubscriptionCallback) {
    const callbacks = this.callbacks.get(channelName);
    if (callbacks) {
      callbacks.delete(callback);

      // Remove channel if no more callbacks
      if (callbacks.size === 0) {
        const channel = this.channels.get(channelName);
        if (channel) {
          supabase.removeChannel(channel);
          this.channels.delete(channelName);
          this.callbacks.delete(channelName);
        }
      }
    }
  }

  cleanup() {
    // Remove all channels
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.callbacks.clear();
  }
}

export const realtimeManager = new RealtimeManager();
