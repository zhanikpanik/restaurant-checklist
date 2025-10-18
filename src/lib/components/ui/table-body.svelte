<script lang="ts">
	import { cn } from "$lib/utils/cn";

	let { class: className, ...restProps } = $props();
</script>

<tbody class={cn("[&_tr:last-child]:border-0", className)} {...restProps}>
	<slot />
</tbody>
