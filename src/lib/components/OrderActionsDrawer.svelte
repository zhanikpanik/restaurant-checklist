<script lang="ts">
	import * as Drawer from './ui/drawer';
	import Button from './ui/button.svelte';

	interface Order {
		orderId: number;
		departmentName: string;
	}

	interface Props {
		open: boolean;
		order: Order | null;
		onClose: () => void;
		onViewDetails: (orderId: number) => void;
		onDelete?: (orderId: number) => void;
	}

	let { open = $bindable(false), order, onClose, onViewDetails, onDelete }: Props = $props();

	function handleViewDetails() {
		if (order) {
			onViewDetails(order.orderId);
			onClose();
		}
	}

	function handleViewFull() {
		if (order) {
			window.location.href = `/order-details?orderId=${order.orderId}`;
		}
	}

	function handleExport() {
		alert('Excel export coming soon');
		onClose();
	}

	function handleDelete() {
		if (order && confirm(`Удалить заказ #${order.orderId}?`)) {
			onDelete?.(order.orderId);
			onClose();
		}
	}
</script>

<Drawer.Root bind:open>
	<Drawer.Content>
		{#if order}
			<Drawer.Header>
				<Drawer.Title>Заказ #{order.orderId}</Drawer.Title>
				<Drawer.Description>{order.departmentName}</Drawer.Description>
			</Drawer.Header>

			<div class="px-4 pb-4 space-y-2">
				<!-- iOS-style action list -->
				<Button
					variant="outline"
					class="w-full h-14 text-left justify-start text-base"
					onclick={handleViewDetails}
				>
					<span class="mr-3">👁️</span>
					<span>Быстрый просмотр</span>
				</Button>

				<Button
					variant="outline"
					class="w-full h-14 text-left justify-start text-base"
					onclick={handleViewFull}
				>
					<span class="mr-3">📋</span>
					<span>Полный просмотр</span>
				</Button>

				<Button
					variant="outline"
					class="w-full h-14 text-left justify-start text-base"
					onclick={handleExport}
				>
					<span class="mr-3">📄</span>
					<span>Экспорт в Excel</span>
				</Button>

				<Button
					variant="destructive"
					class="w-full h-14 text-left justify-start text-base mt-4"
					onclick={handleDelete}
				>
					<span class="mr-3">🗑️</span>
					<span>Удалить заказ</span>
				</Button>
			</div>

			<Drawer.Footer>
				<Button variant="outline" class="w-full" onclick={onClose}>
					Отмена
				</Button>
			</Drawer.Footer>
		{/if}
	</Drawer.Content>
</Drawer.Root>
