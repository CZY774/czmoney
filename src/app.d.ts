import type { User } from "@supabase/supabase-js";

declare global {
  namespace App {
    interface Locals {
      user?: User;
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface PageData {}
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Error {}
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Platform {}
  }
}

export {};
