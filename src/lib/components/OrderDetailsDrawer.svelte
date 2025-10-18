<script lang="ts">
	import * as Drawer from './ui/drawer';
	import Button from './ui/button.svelte';
	import Badge from './ui/badge.svelte';

	interface Order {
		orderId: number;
		departmentEmoji: string;
		departmentName: string;
		displayDate: string;
		status: 'pending' | 'sent' | 'delivered';
		totalItems: number;
		totalQuantity: number;
		categories?: Array<{
			categoryName: string;
			supplier: { name: string } | null;
			items: Array<{
				name: string;
				quantity: number;
				unit: string;
			}>;
		}>;
	}

	interface Props {
		open: boolean;
		order: Order | null;
		onClose: () => void;
		onDelete?: (orderId: number) => void;
	}

	let { open = $bindable(false), order, onClose, onDelete }: Props = $props();

	function getStatusBadge(status: string) {
		switch(status) {
			case 'pending':
				return { variant: 'secondary' as const, text: '⏳ Ожидает' };
			case 'sent':
				return { variant: 'default' as const, text: '📤 Отправлен' };
			case 'delivered':
				return { variant: 'outline' as const, text: '✅ Доставлен' };
			default:
				return { variant: 'secondary' as const, text: status };
		}
	}

	function handleViewFull() {
		if (order) {
			window.location.href = `/order-details?orderId=${order.orderId}`;
		}
	}

	function handleExport() {
		alert('Excel export coming soon');
	}

	function handleDelete() {
		if (order && confirm(`Удалить заказ #${order.orderId}?`)) {
			onDelete?.(order.orderId);
			onClose();
		}
	}
</script>

<Drawer.Root bind:open shouldScaleBackground={true}>
	<Drawer.Content class="max-h-[85vh]">
		{#if order}
			<Drawer.Header>
				<div class="flex items-center justify-between gap-2 mb-2">
					<Drawer.Title class="text-xl">
						<span class="text-primary">#{order.orderId}</span>
						<span class="ml-2">{order.departmentEmoji}</span>
						<span class="ml-2">{order.departmentName}</span>
					</Drawer.Title>
					<Badge variant={getStatusBadge(order.status).variant}>
						{getStatusBadge(order.status).text}
					</Badge>
				</div>
				<Drawer.Description class="text-left">
					{order.displayDate} • {order.totalItems} товаров • {order.totalQuantity.toFixed(1)} единиц
				</Drawer.Description>
			</Drawer.Header>

			<!-- Scrollable content -->
			<div class="overflow-y-auto px-4 pb-4 max-h-[50vh]">
				{#if order.categories && order.categories.length > 0}
					{#each order.categories as category}
						<div class="mb-4 border-b pb-3 last:border-b-0">
							<div class="flex items-center justify-between mb-2">
								<h3 class="font-semibold text-sm">{category.categoryName}</h3>
								{#if category.supplier}
									<span class="text-xs text-muted-foreground">
										🏢 {category.supplier.name}
									</span>
								{/if}
							</div>
							<div class="space-y-1">
								{#each category.items as item}
									<div class="flex items-center justify-between text-sm py-1">
										<span class="flex-1">{item.name}</span>
										<span class="font-semibold tabular-nums">
											{item.quantity.toFixed(1)} {item.unit}
										</span>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				{:else}
					<div class="text-center text-muted-foreground py-8">
						Нет данных о категориях
					</div>
				{/if}
			</div>

			<Drawer.Footer class="pt-2">
				<div class="flex gap-2">
					<Button variant="default" class="flex-1" onclick={handleViewFull}>
						👁️ Полный просмотр
					</Button>
					<Button variant="outline" class="flex-1" onclick={handleExport}>
						📄 Excel
					</Button>
				</div>
				<Button variant="destructive" class="w-full" onclick={handleDelete}>
					🗑️ Удалить заказ
				</Button>
			</Drawer.Footer>
		{/if}
	</Drawer.Content>
</Drawer.Root>
