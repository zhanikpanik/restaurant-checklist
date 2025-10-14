<script lang="ts">
	import { cn } from "$lib/utils/cn";

	interface Props {
		class?: string;
		[key: string]: any;
	}

	let { class: className, ...restProps }: Props = $props();
</script>

<td class={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)} {...restProps}>
	<slot />
</td>
