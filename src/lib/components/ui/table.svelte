<script lang="ts">
	import { cn } from "$lib/utils/cn";

	let { class: className, ...restProps } = $props();
</script>

<div class="relative w-full overflow-auto">
	<table class={cn("w-full caption-bottom text-sm", className)} {...restProps}>
		<slot />
	</table>
</div>
