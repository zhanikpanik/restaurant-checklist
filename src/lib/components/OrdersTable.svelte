<script lang="ts">
	import Table from './ui/table.svelte';
	import TableHeader from './ui/table-header.svelte';
	import TableBody from './ui/table-body.svelte';
	import TableRow from './ui/table-row.svelte';
	import TableHead from './ui/table-head.svelte';
	import TableCell from './ui/table-cell.svelte';
	import Button from './ui/button.svelte';
	import Badge from './ui/badge.svelte';
	import Card from './ui/card.svelte';
	import OrderDetailsDrawer from './OrderDetailsDrawer.svelte';
	import OrderActionsDrawer from './OrderActionsDrawer.svelte';
	import { cn } from '$lib/utils/cn';

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
		orders: Order[];
		onDelete?: (orderId: number) => void;
	}

	let { orders, onDelete }: Props = $props();

	// Drawer state
	let detailsDrawerOpen = $state(false);
	let actionsDrawerOpen = $state(false);
	let selectedOrder = $state<Order | null>(null);

	// Sorting state
	let sortKey = $state<keyof Order>('orderId');
	let sortDirection = $state<'asc' | 'desc'>('desc');

	// Sorted orders
	const sortedOrders = $derived.by(() => {
		return [...orders].sort((a, b) => {
			let aVal = a[sortKey];
			let bVal = b[sortKey];

			if (typeof aVal === 'string') {
				aVal = aVal.toLowerCase();
				bVal = bVal.toLowerCase();
			}

			if (sortDirection === 'asc') {
				return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
			} else {
				return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
			}
		});
	});

	function handleSort(key: keyof Order) {
		if (key === sortKey) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDirection = 'asc';
		}
	}

	function openDetailsDrawer(order: Order) {
		selectedOrder = order;
		detailsDrawerOpen = true;
	}

	function openActionsDrawer(order: Order, event: MouseEvent) {
		event.stopPropagation();
		selectedOrder = order;
		actionsDrawerOpen = true;
	}

	function handleDelete(orderId: number) {
		onDelete?.(orderId);
	}

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

	function getSortIcon(key: keyof Order) {
		if (sortKey !== key) return '⇅';
		return sortDirection === 'asc' ? '↑' : '↓';
	}
</script>

<!-- Desktop Table View -->
<div class="hidden lg:block">
	<Card class="overflow-hidden">
		<Table>
			<TableHeader>
				<TableRow class="hover:bg-transparent">
					<TableHead class="w-[80px] cursor-pointer select-none" onclick={() => handleSort('orderId')}>
						<div class="flex items-center gap-1">
							<span class="text-xs font-bold uppercase">#</span>
							<span class="text-xs opacity-50">{getSortIcon('orderId')}</span>
						</div>
					</TableHead>
					<TableHead class="cursor-pointer select-none" onclick={() => handleSort('departmentName')}>
						<div class="flex items-center gap-1">
							<span class="text-xs font-bold uppercase">Отдел</span>
							<span class="text-xs opacity-50">{getSortIcon('departmentName')}</span>
						</div>
					</TableHead>
					<TableHead class="cursor-pointer select-none" onclick={() => handleSort('displayDate')}>
						<div class="flex items-center gap-1">
							<span class="text-xs font-bold uppercase">Дата</span>
							<span class="text-xs opacity-50">{getSortIcon('displayDate')}</span>
						</div>
					</TableHead>
					<TableHead class="cursor-pointer select-none" onclick={() => handleSort('status')}>
						<div class="flex items-center gap-1">
							<span class="text-xs font-bold uppercase">Статус</span>
							<span class="text-xs opacity-50">{getSortIcon('status')}</span>
						</div>
					</TableHead>
					<TableHead class="text-right cursor-pointer select-none" onclick={() => handleSort('totalItems')}>
						<div class="flex items-center justify-end gap-1">
							<span class="text-xs font-bold uppercase">Товаров</span>
							<span class="text-xs opacity-50">{getSortIcon('totalItems')}</span>
						</div>
					</TableHead>
					<TableHead class="text-right cursor-pointer select-none" onclick={() => handleSort('totalQuantity')}>
						<div class="flex items-center justify-end gap-1">
							<span class="text-xs font-bold uppercase">Единиц</span>
							<span class="text-xs opacity-50">{getSortIcon('totalQuantity')}</span>
						</div>
					</TableHead>
					<TableHead class="text-right">
						<span class="text-xs font-bold uppercase">Действия</span>
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{#each sortedOrders as order (order.orderId)}
					<TableRow class="cursor-pointer" onclick={() => openDetailsDrawer(order)}>
						<TableCell class="font-semibold text-primary">#{order.orderId}</TableCell>
						<TableCell>
							<div class="flex items-center gap-2">
								<span>{order.departmentEmoji}</span>
								<span class="font-medium">{order.departmentName}</span>
							</div>
						</TableCell>
						<TableCell class="text-muted-foreground">{order.displayDate}</TableCell>
						<TableCell>
							<Badge variant={getStatusBadge(order.status).variant}>
								{getStatusBadge(order.status).text}
							</Badge>
						</TableCell>
						<TableCell class="text-right font-semibold tabular-nums">{order.totalItems}</TableCell>
						<TableCell class="text-right font-semibold tabular-nums">{order.totalQuantity.toFixed(1)}</TableCell>
						<TableCell class="text-right" onclick={(e) => e.stopPropagation()}>
							<div class="flex items-center justify-end gap-2">
								<Button
									variant="ghost"
									size="sm"
									class="h-8 text-xs"
									onclick={(e) => openActionsDrawer(order, e)}
								>
									⋯
								</Button>
							</div>
						</TableCell>
					</TableRow>
				{/each}
			</TableBody>
		</Table>
	</Card>
</div>

<!-- Mobile Card View -->
<div class="lg:hidden space-y-3">
	{#each sortedOrders as order (order.orderId)}
		<Card
			class="p-4 cursor-pointer transition-all active:scale-[0.98]"
			onclick={() => openDetailsDrawer(order)}
		>
			<!-- Header -->
			<div class="flex items-start justify-between gap-2 mb-3">
				<div class="flex items-center gap-2 flex-1 min-w-0">
					<span class="text-sm font-bold text-primary">#{order.orderId}</span>
					<span class="text-base">{order.departmentEmoji}</span>
					<span class="font-semibold truncate">{order.departmentName}</span>
				</div>
				<Badge variant={getStatusBadge(order.status).variant} class="flex-shrink-0">
					{getStatusBadge(order.status).text}
				</Badge>
			</div>

			<!-- Meta Info -->
			<div class="text-sm text-muted-foreground mb-3">
				{order.displayDate} • {order.totalItems} товаров • {order.totalQuantity.toFixed(1)} единиц
			</div>

			<!-- Actions -->
			<div class="flex gap-2 pt-3 border-t" onclick={(e) => e.stopPropagation()}>
				<Button
					variant="outline"
					size="sm"
					class="flex-1 min-h-[44px]"
					onclick={(e) => openActionsDrawer(order, e)}
				>
					⋯ Действия
				</Button>
			</div>
		</Card>
	{/each}
</div>

<!-- Drawers -->
<OrderDetailsDrawer
	bind:open={detailsDrawerOpen}
	order={selectedOrder}
	onClose={() => detailsDrawerOpen = false}
	onDelete={handleDelete}
/>

<OrderActionsDrawer
	bind:open={actionsDrawerOpen}
	order={selectedOrder}
	onClose={() => actionsDrawerOpen = false}
	onViewDetails={(orderId) => {
		const order = orders.find(o => o.orderId === orderId);
		if (order) openDetailsDrawer(order);
	}}
	onDelete={handleDelete}
/>
