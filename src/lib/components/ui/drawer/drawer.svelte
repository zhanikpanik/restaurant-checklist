<script lang="ts">
	import { Drawer as DrawerPrimitive } from "vaul-svelte";
	import type { WithElementRef } from "bits-ui";

	type $$Props = WithElementRef<DrawerPrimitive.RootProps>;

	export let shouldScaleBackground: $$Props["shouldScaleBackground"] = true;
	export let open: $$Props["open"] = undefined;
	export let onOpenChange: $$Props["onOpenChange"] = undefined;
	export let activeSnapPoint: $$Props["activeSnapPoint"] = undefined;
	export let onActiveSnapPointChange: $$Props["onActiveSnapPointChange"] = undefined;
	export let closeThreshold: $$Props["closeThreshold"] = undefined;
	export let onClose: $$Props["onClose"] = undefined;
	export let onDrag: $$Props["onDrag"] = undefined;
	export let onRelease: $$Props["onRelease"] = undefined;
	export let snapPoints: $$Props["snapPoints"] = undefined;
	export let fadeFromIndex: $$Props["fadeFromIndex"] = undefined;
	export let openFocus: $$Props["openFocus"] = undefined;
	export let closeFocus: $$Props["closeFocus"] = undefined;
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
