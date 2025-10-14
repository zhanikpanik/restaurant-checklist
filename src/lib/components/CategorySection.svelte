<script lang="ts">
	import Card from './ui/card.svelte';
	import Button from './ui/button.svelte';
	import Badge from './ui/badge.svelte';
	import Table from './ui/table.svelte';
	import TableHeader from './ui/table-header.svelte';
	import TableBody from './ui/table-body.svelte';
	import TableRow from './ui/table-row.svelte';
	import TableHead from './ui/table-head.svelte';
	import TableCell from './ui/table-cell.svelte';
	import { cn } from '$lib/utils/cn';

	interface Item {
		name: string;
		quantity: number;
		unit: string;
	}

	interface Supplier {
		id?: number;
		name?: string;
		phone?: string;
	}

	interface Category {
		categoryId: number;
		categoryName: string;
		items: Item[];
		supplier?: Supplier;
	}

	interface Props {
		category: Category;
		orderId: number;
		onSendToSupplier?: (orderId: number, categoryIds: number[], supplierName: string, supplierId: number) => void;
		onAssignSupplier?: (categoryId: number, categoryName: string) => void;
	}

	let { category, orderId, onSendToSupplier, onAssignSupplier }: Props = $props();

	let expanded = $state(true);

	const hasSupplier = $derived(category.supplier && category.supplier.name);
	const hasPhone = $derived(hasSupplier && category.supplier?.phone);

	function toggleExpanded() {
		expanded = !expanded;
	}

	function handleSendToSupplier() {
		if (hasSupplier && hasPhone && category.supplier) {
			onSendToSupplier?.(orderId, [category.categoryId], category.supplier.name!, category.supplier.id!);
		}
	}

	function handleAssignSupplier() {
		onAssignSupplier?.(category.categoryId, category.categoryName);
	}
</script>

<Card class="overflow-hidden">
	<!-- Category Header -->
	<button
		class="w-full text-left p-4 hover:bg-accent/50 transition-colors border-b"
		onclick={toggleExpanded}
		type="button"
	>
		<div class="flex items-center justify-between gap-3">
			<div class="flex-1 min-w-0">
				<div class="flex items-center gap-2 mb-1">
					<h3 class="font-semibold text-base">🏷️ {category.categoryName}</h3>
					<Badge variant="secondary" class="text-xs">
						{category.items.length}
					</Badge>
				</div>
				<div class="text-xs text-muted-foreground">
					{#if hasSupplier}
						<span>📦 {category.supplier?.name}</span>
						{#if hasPhone}
							<span> • 📱 {category.supplier?.phone}</span>
						{:else}
							<span class="text-destructive"> • ⚠️ Нет телефона</span>
						{/if}
					{:else}
						<span class="text-destructive">⚠️ Без поставщика</span>
					{/if}
				</div>
			</div>
			<svg
				class={cn(
					"w-5 h-5 text-muted-foreground transition-transform flex-shrink-0",
					expanded && "rotate-180"
				)}
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</div>
	</button>

	{#if expanded}
		<!-- Items Table -->
		<div class="hidden md:block">
			<Table>
				<TableHeader>
					<TableRow class="hover:bg-transparent">
						<TableHead class="w-[60px]">#</TableHead>
						<TableHead>Товар</TableHead>
						<TableHead class="text-right w-[120px]">Количество</TableHead>
						<TableHead class="w-[100px]">Ед.изм</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each category.items as item, index}
						<TableRow>
							<TableCell class="text-muted-foreground text-xs">{index + 1}</TableCell>
							<TableCell class="font-medium">{item.name}</TableCell>
							<TableCell class="text-right font-semibold tabular-nums">{item.quantity}</TableCell>
							<TableCell class="text-muted-foreground">{item.unit}</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</div>

		<!-- Mobile List -->
		<div class="md:hidden divide-y">
			{#each category.items as item}
				<div class="flex justify-between items-center p-4 active:bg-accent/50 transition-colors">
					<span class="text-sm font-medium flex-1 truncate mr-3">{item.name}</span>
					<span class="text-sm font-semibold tabular-nums whitespace-nowrap">
						{item.quantity} {item.unit}
					</span>
				</div>
			{/each}
		</div>

		<!-- Action Button -->
		<div class="p-4 border-t bg-muted/30">
			{#if hasSupplier && hasPhone}
				<Button
					class="w-full bg-green-600 hover:bg-green-700 text-white"
					onclick={handleSendToSupplier}
				>
					📱 Отправить поставщику
				</Button>
			{:else if hasSupplier && !hasPhone}
				<Button class="w-full" variant="secondary" disabled>
					📱 Нет телефона
				</Button>
			{:else}
				<Button
					class="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
					onclick={handleAssignSupplier}
				>
					🔗 Назначить поставщика
				</Button>
			{/if}
		</div>
	{/if}
</Card>
