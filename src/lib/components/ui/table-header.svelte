<script lang="ts">
	import { cn } from "$lib/utils/cn";

	let { class: className, ...restProps } = $props();
</script>

<thead class={cn("[&_tr]:border-b", className)} {...restProps}>
	<slot />
</thead>
