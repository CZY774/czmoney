# UI Components Usage Guide

## Toast Notifications

Global toast notifications that appear in the top-right corner.

### Usage

```svelte
<script>
  import { toast } from "$lib/stores/toast";

  function handleSuccess() {
    toast.success("Transaction saved successfully!");
  }

  function handleError() {
    toast.error("Failed to save transaction", "Error");
  }

  function handleWarning() {
    toast.warning("Please check your input");
  }

  function handleInfo() {
    toast.info("Syncing data...");
  }
</script>
```

### API

- `toast.success(message, title?)` - Green success toast
- `toast.error(message, title?)` - Red error toast
- `toast.warning(message, title?)` - Yellow warning toast
- `toast.info(message, title?)` - Blue info toast

Auto-dismisses after 5 seconds by default.

---

## Modal Dialog

Reusable modal dialog component.

### Usage

```svelte
<script>
  import Modal from "$lib/components/Modal.svelte";

  let modalOpen = false;
</script>

<button on:click={() => modalOpen = true}>Open Modal</button>

<Modal
  bind:open={modalOpen}
  title="Add Transaction"
  description="Fill in the details below"
  size="md"
  on:close={() => console.log("Modal closed")}
>
  <!-- Modal content -->
  <form>
    <input type="text" placeholder="Amount" />
  </form>

  <!-- Optional footer slot -->
  <div slot="footer" class="flex gap-2 justify-end">
    <button on:click={() => modalOpen = false}>Cancel</button>
    <button class="bg-primary text-white">Save</button>
  </div>
</Modal>
```

### Props

- `open` (boolean) - Controls modal visibility
- `title` (string) - Modal title
- `description` (string) - Optional subtitle
- `size` ("sm" | "md" | "lg") - Modal width

### Events

- `on:close` - Fired when modal is closed

---

## Confirm Dialog

Beautiful confirmation dialog for destructive actions.

### Usage

```svelte
<script>
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";

  let confirmOpen = false;
  let loading = false;

  async function handleDelete() {
    loading = true;
    await deleteTransaction();
    loading = false;
    confirmOpen = false;
  }
</script>

<button on:click={() => confirmOpen = true}>Delete</button>

<ConfirmDialog
  bind:open={confirmOpen}
  title="Delete Transaction?"
  message="This action cannot be undone. Are you sure?"
  confirmText="Delete"
  cancelText="Cancel"
  variant="danger"
  {loading}
  on:confirm={handleDelete}
  on:cancel={() => console.log("Cancelled")}
/>
```

### Props

- `open` (boolean) - Controls dialog visibility
- `title` (string) - Dialog title
- `message` (string) - Confirmation message
- `confirmText` (string) - Confirm button text
- `cancelText` (string) - Cancel button text
- `variant` ("danger" | "warning" | "info") - Visual style
- `loading` (boolean) - Shows loading state on confirm button

### Events

- `on:confirm` - Fired when user confirms
- `on:cancel` - Fired when user cancels

---

## Alert

Inline alert component for displaying messages.

### Usage

```svelte
<script>
  import Alert from "$lib/components/Alert.svelte";
</script>

<Alert
  type="success"
  title="Success!"
  message="Your changes have been saved."
  dismissible={true}
  autoDismiss={true}
  duration={5000}
/>

<!-- Or with slot content -->
<Alert type="error" title="Error">
  <p>Something went wrong. Please try again.</p>
  <button>Retry</button>
</Alert>
```

### Props

- `type` ("success" | "error" | "warning" | "info") - Alert style
- `title` (string) - Alert title
- `message` (string) - Alert message
- `dismissible` (boolean) - Show close button (default: true)
- `autoDismiss` (boolean) - Auto-dismiss after duration (default: false)
- `duration` (number) - Auto-dismiss duration in ms (default: 5000)

### Events

- `on:dismiss` - Fired when alert is dismissed

---

## Error Page

Custom error page is automatically shown for HTTP errors (404, 500, etc.).

Located at: `src/routes/+error.svelte`

Features:
- Beautiful error messages for common HTTP status codes
- Animated emoji icons
- Helpful action buttons (Go Back, Reload, Go Home)
- Context-aware help text
- Technical details in collapsible section

---

## Styling

All components use your app's design tokens:

- `bg-background` - Main background
- `bg-card` - Card background
- `bg-accent` - Hover states
- `text-foreground` - Primary text
- `text-muted-foreground` - Secondary text
- `border-border` - Borders
- `bg-primary` - Primary buttons
- `text-primary-foreground` - Primary button text

Colors are defined in `app.css` and match your dark sleek theme.
