<script lang="ts">
	import { cn } from "$lib/utils/cn";

	interface Props {
		class?: string;
		onclick?: ((event: MouseEvent) => void) | undefined;
	}

	let { class: className, onclick }: Props = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
	onclick={onclick}
>
	<slot />
</div>
