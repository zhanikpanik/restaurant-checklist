<script lang="ts">
	import { cn } from "$lib/utils/cn";

	interface Props {
		class?: string;
		[key: string]: any;
	}

	let { class: className, ...restProps }: Props = $props();
</script>

<tbody class={cn("[&_tr:last-child]:border-0", className)} {...restProps}>
	<slot />
</tbody>
