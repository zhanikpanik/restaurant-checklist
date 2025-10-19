<script lang="ts">
	import { Drawer as DrawerPrimitive } from "vaul-svelte";
	import type { WithElementRef } from "bits-ui";

	type $$Props = WithElementRef<DrawerPrimitive.RootProps>;

	export let shouldScaleBackground: $$Props["shouldScaleBackground"] = true;
	export let open: $$Props["open"];
	export let onOpenChange: $$Props["onOpenChange"];
	export let activeSnapPoint: $$Props["activeSnapPoint"];
	export let onActiveSnapPointChange: $$Props["onActiveSnapPointChange"];
	export let closeThreshold: $$Props["closeThreshold"];
	export let onClose: $$Props["onClose"];
	export let onDrag: $$Props["onDrag"];
	export let onRelease: $$Props["onRelease"];
	export let snapPoints: $$Props["snapPoints"];
	export let fadeFromIndex: $$Props["fadeFromIndex"];
	export let openFocus: $$Props["openFocus"];
	export let closeFocus: $$Props["closeFocus"];
	export let preventScrollRestoration: $$Props["preventScrollRestoration"] = true;
	export let dismissible: $$Props["dismissible"] = true;
	export let setBackgroundColorOnScale: $$Props["setBackgroundColorOnScale"] = true;
	export let scaledBackgroundColor: $$Props["scaledBackgroundColor"] = "hsl(0 0% 0%)";
</script>

<DrawerPrimitive.Root
	bind:open
	bind:activeSnapPoint
	{shouldScaleBackground}
	{onOpenChange}
	{onActiveSnapPointChange}
	{closeThreshold}
	{onClose}
	{onDrag}
	{onRelease}
	{snapPoints}
	{fadeFromIndex}
	{openFocus}
	{closeFocus}
	{preventScrollRestoration}
	{dismissible}
	{setBackgroundColorOnScale}
	{scaledBackgroundColor}
>
	<slot />
</DrawerPrimitive.Root>
