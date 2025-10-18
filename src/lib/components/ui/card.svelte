<script lang="ts">
	import { cn } from "$lib/utils/cn";

	// Using Svelte 5 rest props pattern - this accepts all props
	let { class: className, ...restProps } = $props();
</script>

<div
	class={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
	{...restProps}
>
	<slot />
</div>
