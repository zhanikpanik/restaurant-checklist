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

<Card class="p-4 space-y-4">
	<!-- Header -->
	<div class="flex justify-between items-start">
		<div>
			<h2 class="text-lg font-semibold">
				{order.departmentEmoji} {order.departmentName}
				<span class="text-sm font-normal text-muted-foreground">#{order.orderId}</span>
			</h2>
			<p class="text-xs text-muted-foreground mt-1">{order.displayDate}</p>
		</div>
		<Badge variant={statusVariant}>{statusText}</Badge>
	</div>

	<!-- Stats -->
	<div class="grid grid-cols-3 gap-4 py-3 px-2 bg-muted/50 rounded-lg">
		<div>
			<div class="text-xs text-muted-foreground">Товаров</div>
			<div class="text-xl font-bold">{order.totalItems}</div>
		</div>
		<div>
			<div class="text-xs text-muted-foreground">Единиц</div>
			<div class="text-xl font-bold">{order.totalQuantity}</div>
		</div>
		<div>
			<div class="text-xs text-muted-foreground">Категорий</div>
			<div class="text-xl font-bold">{order.categories?.length || 0}</div>
		</div>
	</div>

	<!-- Categories & Products -->
	<div>
		<button
			class="w-full text-left text-sm font-medium p-2 hover:bg-muted rounded-lg transition-colors flex justify-between items-center"
			on:click={() => expanded = !expanded}
		>
			<span>Показать товары ({order.totalItems})</span>
			<svg class={cn("w-4 h-4 transition-transform", expanded && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>

		{#if expanded}
			<div class="mt-2 space-y-2">
				{#if order.categories && order.categories.length > 0}
					{#each order.categories as category}
						<div class="border rounded-lg p-3 space-y-2">
							<div class="flex justify-between items-center">
								<h4 class="font-semibold text-sm">🏷️ {category.categoryName}</h4>
								{#if category.supplier}
									<span class="text-xs text-muted-foreground">📞 {category.supplier.name}</span>
								{:else}
									<span class="text-xs text-destructive">⚠️ Нет поставщика</span>
								{/if}
							</div>
							<div class="space-y-1">
								{#each category.items.slice(0, 5) as item}
									<div class="flex justify-between text-sm">
										<span>{item.name}</span>
										<Badge variant="outline" class="text-xs">{item.quantity} {item.unit}</Badge>
									</div>
								{/each}
								{#if category.items.length > 5}
									<div class="text-xs text-muted-foreground italic">
										+ еще {category.items.length - 5} товаров
									</div>
								{/if}
							</div>
						</div>
					{/each}
				{:else}
					<p class="text-sm text-muted-foreground">Нет товаров</p>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Actions -->
	<div class="flex justify-end gap-2">
		{#if order.status === 'pending'}
			<Button size="sm">📤 Отправить</Button>
		{/if}
		<Button variant="outline" size="sm">👁️ Детали</Button>
		<Button variant="ghost" size="sm">📄 Excel</Button>
	</div>
</Card>
