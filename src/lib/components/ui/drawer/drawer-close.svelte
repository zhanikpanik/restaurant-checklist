<script lang="ts">
	import { Drawer as DrawerPrimitive } from "vaul-svelte";

	type $$Props = DrawerPrimitive.CloseProps;
</script>

<DrawerPrimitive.Close {...$$restProps}>
	<slot />
</DrawerPrimitive.Close>
