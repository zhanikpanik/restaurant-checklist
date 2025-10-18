<script lang="ts">
	import { cn } from "$lib/utils/cn";

	let { class: className, ...restProps } = $props();
</script>

<tr class={cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)} {...restProps}>
	<slot />
</tr>
