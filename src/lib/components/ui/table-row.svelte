<script lang="ts">
	import { cn } from "$lib/utils/cn";

	interface Props {
		class?: string;
		[key: string]: any;
	}

	let { class: className, ...restProps }: Props = $props();
</script>

<tr class={cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)} {...restProps}>
	<slot />
</tr>
