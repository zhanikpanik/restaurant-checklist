<script lang="ts">
	import Card from './ui/card.svelte';
	import Button from './ui/button.svelte';
	import Badge from './ui/badge.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		order: any;
	}

	let { order }: Props = $props();

	const statusVariant = $derived(order.status === 'pending' ? 'secondary' :
	                      order.status === 'sent' ? 'default' : 'outline');
	const statusText = $derived(order.status === 'pending' ? 'Ожидает' :
	                   order.status === 'sent' ? 'Отправлен' : 'Доставлен');

	let expanded = $state(false);
</script>

<Card class="p-3 space-y-3">
	<!-- Header -->
	<div class="flex justify-between items-start gap-2">
		<div class="flex-1 min-w-0">
			<h2 class="text-base font-semibold truncate">
				{order.departmentEmoji} {order.departmentName}
			</h2>
			<div class="flex items-center gap-2 mt-0.5">
				<span class="text-xs text-muted-foreground">#{order.orderId}</span>
				<span class="text-xs text-muted-foreground">•</span>
				<span class="text-xs text-muted-foreground">{order.displayDate}</span>
			</div>
		</div>
		<Badge variant={statusVariant} class="flex-shrink-0">{statusText}</Badge>
	</div>

	<!-- Compact Stats -->
	<div class="flex items-center gap-3 text-sm">
		<div class="flex items-center gap-1">
			<span class="font-semibold">{order.totalItems}</span>
			<span class="text-muted-foreground text-xs">товаров</span>
		</div>
		<div class="w-px h-4 bg-border"></div>
		<div class="flex items-center gap-1">
			<span class="font-semibold">{order.totalQuantity}</span>
			<span class="text-muted-foreground text-xs">единиц</span>
		</div>
		<div class="w-px h-4 bg-border"></div>
		<div class="flex items-center gap-1">
			<span class="font-semibold">{order.categories?.length || 0}</span>
			<span class="text-muted-foreground text-xs">категорий</span>
		</div>
	</div>

	<!-- Categories & Products -->
	<div>
		<button
			class="w-full text-left text-xs font-medium px-2 py-1.5 hover:bg-muted rounded-md transition-colors flex justify-between items-center"
			on:click={() => expanded = !expanded}
		>
			<span>Товары ({order.totalItems})</span>
			<svg class={cn("w-3.5 h-3.5 transition-transform", expanded && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>

		{#if expanded}
			<div class="mt-2 space-y-2">
				{#if order.categories && order.categories.length > 0}
					{#each order.categories as category}
						<div class="border rounded-md p-2 space-y-1.5">
							<div class="flex justify-between items-center">
								<h4 class="font-medium text-xs">🏷️ {category.categoryName}</h4>
								{#if category.supplier}
									<span class="text-[10px] text-muted-foreground">📞 {category.supplier.name}</span>
								{:else}
									<span class="text-[10px] text-destructive">⚠️ Нет поставщика</span>
								{/if}
							</div>
							<div class="space-y-0.5">
								{#each category.items.slice(0, 5) as item}
									<div class="flex justify-between text-xs">
										<span class="truncate mr-2">{item.name}</span>
										<Badge variant="outline" class="text-[10px] h-5">{item.quantity} {item.unit}</Badge>
									</div>
								{/each}
								{#if category.items.length > 5}
									<div class="text-[10px] text-muted-foreground italic">
										+ еще {category.items.length - 5}
									</div>
								{/if}
							</div>
						</div>
					{/each}
				{:else}
					<p class="text-xs text-muted-foreground">Нет товаров</p>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Actions -->
	<div class="flex gap-2 pt-1">
		<Button variant="outline" size="sm" class="flex-1 h-9 text-xs" onclick={() => window.location.href = `/order-details?orderId=${order.orderId}`}>
			👁️ Детали
		</Button>
		<Button variant="ghost" size="sm" class="flex-1 h-9 text-xs">
			📄 Excel
		</Button>
	</div>
</Card>
