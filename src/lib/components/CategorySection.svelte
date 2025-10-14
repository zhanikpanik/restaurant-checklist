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

	// Calculate total quantity across all items
	const totalQuantity = $derived(category.items.reduce((sum, item) => sum + item.quantity, 0));

	// Get color scheme based on supplier status
	const colorScheme = $derived.by(() => {
		if (hasSupplier && hasPhone) {
			return {
				border: 'border-l-green-500',
				bg: 'bg-green-50/50 dark:bg-green-950/20',
				badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
			};
		} else if (hasSupplier && !hasPhone) {
			return {
				border: 'border-l-orange-500',
				bg: 'bg-orange-50/50 dark:bg-orange-950/20',
				badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
			};
		} else {
			return {
				border: 'border-l-red-500',
				bg: 'bg-red-50/50 dark:bg-red-950/20',
				badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
			};
		}
	});

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

<Card class={cn("overflow-hidden border-l-4 shadow-sm hover:shadow-md transition-all duration-200", colorScheme.border)}>
	<!-- Category Header -->
	<button
		class={cn(
			"w-full text-left p-4 hover:bg-accent/50 transition-all duration-200 border-b",
			colorScheme.bg
		)}
		onclick={toggleExpanded}
		type="button"
		data-category-toggle
		aria-expanded={expanded}
	>
		<div class="flex items-center justify-between gap-3">
			<div class="flex-1 min-w-0">
				<div class="flex items-center gap-2 mb-2 flex-wrap">
					<h3 class="font-semibold text-base">🏷️ {category.categoryName}</h3>
					<Badge variant="secondary" class="text-xs">
						{category.items.length} {category.items.length === 1 ? 'товар' : 'товара'}
					</Badge>
					<Badge class={cn("text-xs font-mono", colorScheme.badge)}>
						∑ {totalQuantity}
					</Badge>
				</div>
				<div class="text-xs flex flex-col gap-1">
					{#if hasSupplier}
						<div class="flex items-center gap-1.5">
							<span class="text-green-600 dark:text-green-400">✓</span>
							<span class="font-medium">{category.supplier?.name}</span>
						</div>
						{#if hasPhone}
							<div class="flex items-center gap-1.5 text-muted-foreground">
								<span>📱</span>
								<span class="font-mono">{category.supplier?.phone}</span>
							</div>
						{:else}
							<div class="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
								<span>⚠️</span>
								<span>Нет телефона</span>
							</div>
						{/if}
					{:else}
						<div class="flex items-center gap-1.5 text-red-600 dark:text-red-400">
							<span>⚠️</span>
							<span class="font-medium">Без поставщика</span>
						</div>
					{/if}
				</div>
			</div>
			<div class="flex flex-col items-end gap-2">
				<svg
					class={cn(
						"w-6 h-6 text-muted-foreground transition-all duration-300",
						expanded && "rotate-180"
					)}
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
				</svg>
			</div>
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
