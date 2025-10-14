<script lang="ts">
	import { cn } from "$lib/utils/cn";

	interface Props {
		class?: string;
		[key: string]: any;
	}

	let { class: className, ...restProps }: Props = $props();
</script>

<thead class={cn("[&_tr]:border-b", className)} {...restProps}>
	<slot />
</thead>
