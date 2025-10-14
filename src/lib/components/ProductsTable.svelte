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

	interface Product {
		id: number | string;
		name?: string;
		product_name?: string;
		section_name?: string;
		unit?: string;
		category_id?: number;
		type: 'section' | 'custom';
	}

	interface Category {
		id: number;
		name: string;
	}

	interface Props {
		products: Product[];
		categories: Category[];
		onCategoryChange: (productId: number | string, categoryId: string, type: 'section' | 'custom') => void;
		onDelete?: (productId: number | string, productName: string, type: 'section' | 'custom') => void;
	}

	let { products, categories, onCategoryChange, onDelete }: Props = $props();

	// Separate products by type
	const sectionProducts = $derived(products.filter(p => p.type === 'section'));
	const customProducts = $derived(products.filter(p => p.type === 'custom'));

	function getProductName(product: Product): string {
		return product.name || product.product_name || 'Без названия';
	}
</script>

{#if products.length === 0}
	<div class="text-center py-12">
		<div class="text-6xl mb-4">📦</div>
		<p class="text-xl font-semibold mb-2">Нет товаров</p>
		<p class="text-muted-foreground">Синхронизируйте секции из Poster или добавьте товары вручную</p>
	</div>
{:else}
	<!-- Section Products -->
	{#if sectionProducts.length > 0}
		<div class="mb-8">
			<h4 class="text-lg font-semibold mb-3">📦 Товары из секций Poster</h4>

			<!-- Desktop Table -->
			<div class="hidden md:block">
				<Card class="overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead class="w-[40%]">Название</TableHead>
								<TableHead class="w-[25%]">Секция</TableHead>
								<TableHead class="w-[10%]">Ед. изм.</TableHead>
								<TableHead class="w-[25%]">Категория</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each sectionProducts as product (product.id)}
								<TableRow>
									<TableCell class="font-medium">{getProductName(product)}</TableCell>
									<TableCell class="text-muted-foreground">{product.section_name || 'Без секции'}</TableCell>
									<TableCell class="text-muted-foreground">{product.unit || 'шт'}</TableCell>
									<TableCell>
										<select
											value={product.category_id || ''}
											onchange={(e) => onCategoryChange(product.id, e.currentTarget.value, 'section')}
											class="w-full text-xs px-2 py-1.5 border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
										>
											<option value="">Без категории</option>
											{#each categories as cat}
												<option value={cat.id}>{cat.name}</option>
											{/each}
										</select>
									</TableCell>
								</TableRow>
							{/each}
						</TableBody>
					</Table>
				</Card>
			</div>

			<!-- Mobile Cards -->
			<div class="md:hidden space-y-3">
				{#each sectionProducts as product (product.id)}
					<Card class="p-4">
						<div class="flex justify-between items-start mb-3">
							<div class="flex-1">
								<div class="font-medium mb-1">{getProductName(product)}</div>
								<div class="text-sm text-muted-foreground">{product.section_name || 'Без секции'}</div>
							</div>
							<Badge variant="outline" class="ml-2">{product.unit || 'шт'}</Badge>
						</div>
						<div>
							<label class="text-xs text-muted-foreground mb-1 block">Категория</label>
							<select
								value={product.category_id || ''}
								onchange={(e) => onCategoryChange(product.id, e.currentTarget.value, 'section')}
								class="w-full text-sm px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
							>
								<option value="">Без категории</option>
								{#each categories as cat}
									<option value={cat.id}>{cat.name}</option>
								{/each}
							</select>
						</div>
					</Card>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Custom Products -->
	{#if customProducts.length > 0}
		<div class="mb-8">
			<h4 class="text-lg font-semibold mb-3">📝 Кастомные товары</h4>

			<!-- Desktop Table -->
			<div class="hidden md:block">
				<Card class="overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead class="w-[35%]">Название</TableHead>
								<TableHead class="w-[20%]">Секция</TableHead>
								<TableHead class="w-[10%]">Ед. изм.</TableHead>
								<TableHead class="w-[25%]">Категория</TableHead>
								<TableHead class="w-[10%]">Действия</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each customProducts as product (product.id)}
								<TableRow>
									<TableCell class="font-medium">{getProductName(product)}</TableCell>
									<TableCell class="text-muted-foreground">{product.section_name || 'Без секции'}</TableCell>
									<TableCell class="text-muted-foreground">{product.unit || 'шт'}</TableCell>
									<TableCell>
										<select
											value={product.category_id || ''}
											onchange={(e) => onCategoryChange(product.id, e.currentTarget.value, 'custom')}
											class="w-full text-xs px-2 py-1.5 border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
										>
											<option value="">Без категории</option>
											{#each categories as cat}
												<option value={cat.id}>{cat.name}</option>
											{/each}
										</select>
									</TableCell>
									<TableCell>
										{#if onDelete}
											<Button
												variant="destructive"
												size="sm"
												onclick={() => onDelete(product.id, getProductName(product), 'custom')}
												class="h-7 text-xs"
											>
												🗑️
											</Button>
										{/if}
									</TableCell>
								</TableRow>
							{/each}
						</TableBody>
					</Table>
				</Card>
			</div>

			<!-- Mobile Cards -->
			<div class="md:hidden space-y-3">
				{#each customProducts as product (product.id)}
					<Card class="p-4">
						<div class="flex justify-between items-start mb-3">
							<div class="flex-1">
								<div class="font-medium mb-1">{getProductName(product)}</div>
								<div class="text-sm text-muted-foreground">{product.section_name || 'Без секции'}</div>
							</div>
							<Badge variant="outline" class="ml-2">{product.unit || 'шт'}</Badge>
						</div>
						<div class="mb-3">
							<label class="text-xs text-muted-foreground mb-1 block">Категория</label>
							<select
								value={product.category_id || ''}
								onchange={(e) => onCategoryChange(product.id, e.currentTarget.value, 'custom')}
								class="w-full text-sm px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
							>
								<option value="">Без категории</option>
								{#each categories as cat}
									<option value={cat.id}>{cat.name}</option>
								{/each}
							</select>
						</div>
						{#if onDelete}
							<Button
								variant="destructive"
								onclick={() => onDelete(product.id, getProductName(product), 'custom')}
								class="w-full"
							>
								🗑️ Удалить
							</Button>
						{/if}
					</Card>
				{/each}
			</div>
		</div>
	{/if}
{/if}
