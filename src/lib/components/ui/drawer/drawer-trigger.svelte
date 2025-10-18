<script lang="ts">
	import { Drawer as DrawerPrimitive } from "vaul-svelte";

	type $$Props = DrawerPrimitive.TriggerProps;
</script>

<DrawerPrimitive.Trigger {...$$restProps}>
	<slot />
</DrawerPrimitive.Trigger>
