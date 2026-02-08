const fs = require('fs');
const path = require('path');

const managerPath = path.join(__dirname, '..', 'src', 'pages', 'manager.astro');
let content = fs.readFileSync(managerPath, 'utf8');

console.log('📝 Applying batch save feature...\n');

// 1. Add Save Button after line 165 (after the Категоризировать все button)
const buttonToAdd = `								<button 
									id="saveCategoriesBtn"
									onclick="savePendingChanges()" 
									class="hidden px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg shadow-sm"
									title="Сохранить все изменения категорий"
								>
									💾 Сохранить <span id="pendingCount" class="ml-1 bg-green-800 px-2 rounded-full text-xs">0</span>
								</button>
`;

const categorizeBtnPattern = /(\s+<button[^>]+onclick="bulkCategorizeProducts\(\)"[\s\S]+?<\/button>)/;
const match = content.match(categorizeBtnPattern);
if (match) {
    content = content.replace(match[0], match[0] + '\n' + buttonToAdd);
    console.log('✅ Added Save button to UI');
} else {
    console.log('❌ Could not find location to add Save button');
}

// 2. Replace updateProductCategory function
const oldFunction = /\/\/ Update product category manually[\s\S]*?async function updateProductCategory\(select\)[\s\S]*?\n\t\t\t\}/;

const newFunctions = `// Track pending category changes
			let pendingChanges = {};

			// Update product category (track change, don't save yet)
			function updateProductCategory(select) {
				const productId = select.dataset.productId;
				const productName = select.dataset.productName;
				const categoryId = select.value;
				
				if (!productId) return;
				
				// Track the change
				pendingChanges[productId] = {
					productId: parseInt(productId),
					productName: productName,
					categoryId: categoryId ? parseInt(categoryId) : null,
					originalValue: select.dataset.originalValue
				};
				
				// Mark dropdown as changed
				select.classList.add('border-2', 'border-yellow-400', 'bg-yellow-50');
				
				// Update save button
				updateSaveButton();
				
				console.log(\`📝 Tracked change for \${productName}: category \${categoryId}\`);
			}

			// Update the save button visibility and count
			function updateSaveButton() {
				const changeCount = Object.keys(pendingChanges).length;
				const saveBtn = document.getElementById('saveCategoriesBtn');
				const countSpan = document.getElementById('pendingCount');
				
				if (changeCount > 0) {
					saveBtn.classList.remove('hidden');
					countSpan.textContent = changeCount;
				} else {
					saveBtn.classList.add('hidden');
					pendingChanges = {};
				}
			}

			// Save all pending changes at once
			async function savePendingChanges() {
				const changes = Object.values(pendingChanges);
				
				if (changes.length === 0) {
					showToast('Нет изменений для сохранения', 'info');
					return;
				}
				
				const saveBtn = document.getElementById('saveCategoriesBtn');
				const originalText = saveBtn.innerHTML;
				saveBtn.disabled = true;
				saveBtn.innerHTML = '⏳ Сохранение...';
				
				console.log(\`💾 Saving \${changes.length} category changes...\`);
				
				try {
					// Save all changes in parallel
					const results = await Promise.allSettled(
						changes.map(change =>
							fetch('/api/categorize-product', {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify(change)
							}).then(r => r.json())
						)
					);
					
					// Count successes and failures
					const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
					const failed = results.length - successful;
					
					// Show results
					if (failed === 0) {
						showToast(\`✅ Сохранено \${successful} изменений\`, 'success');
						console.log(\`✅ Successfully saved \${successful} changes\`);
					} else {
						showToast(\`⚠️ Сохранено: \${successful}, Ошибок: \${failed}\`, 'warning');
						console.log(\`⚠️ Saved: \${successful}, Failed: \${failed}\`);
					}
					
					// Clear pending changes
					pendingChanges = {};
					updateSaveButton();
					
					// Reload products to show updated data
					await loadCustomProducts();
					
				} catch (error) {
					console.error('Error saving changes:', error);
					showToast('Ошибка при сохранении изменений', 'error');
				} finally {
					saveBtn.disabled = false;
					saveBtn.innerHTML = originalText;
				}
			}`;

content = content.replace(oldFunction, newFunctions);
console.log('✅ Replaced updateProductCategory with batch save logic');

// 3. Add keyboard shortcut and beforeunload warning
const endOfScriptPattern = /(\s+<\/script>[\s\S]*?<\/html>)/;
const shortcutsCode = `
			// Add keyboard shortcut: Ctrl+S to save
			document.addEventListener('keydown', (e) => {
				if ((e.ctrlKey || e.metaKey) && e.key === 's') {
					const activeTab = document.querySelector('.tab-content:not(.hidden)');
					if (activeTab && activeTab.id === 'content-products') {
						e.preventDefault();
						savePendingChanges();
					}
				}
			});

			// Warn user if leaving with unsaved changes
			window.addEventListener('beforeunload', (e) => {
				if (Object.keys(pendingChanges).length > 0) {
					e.preventDefault();
					e.returnValue = 'У вас есть несохраненные изменения. Вы уверены, что хотите покинуть страницу?';
					return e.returnValue;
				}
			});
`;

const scriptEndMatch = content.match(endOfScriptPattern);
if (scriptEndMatch) {
    content = content.replace('</script>', shortcutsCode + '\n\t\t</script>');
    console.log('✅ Added keyboard shortcuts and page leave warning');
} else {
    console.log('❌ Could not add keyboard shortcuts');
}

// 4. Update dropdown rendering to include data-original-value
// Find the category dropdown in displayCustomProducts
const dropdownPattern = /(data-product-name="\$\{product\.name\}")/g;
content = content.replace(
    dropdownPattern,
    '$1\n\t\t\t\t\t\t\t\t\t\t\tdata-original-value="${product.category_id || \'\'}"'
);
console.log('✅ Added data-original-value to dropdowns');

// Write the updated content
fs.writeFileSync(managerPath, content, 'utf8');

console.log('\n🎉 Batch save feature applied successfully!');
console.log('\n📋 Features added:');
console.log('   • 💾 Save button (appears when changes are made)');
console.log('   • 📝 Visual feedback (yellow border on changed dropdowns)');
console.log('   • ⌨️  Ctrl+S keyboard shortcut');
console.log('   • ⚠️  Warning before leaving page with unsaved changes');
console.log('   • 📊 Counter showing number of pending changes');
console.log('\n✨ Reload your browser to see the changes!');

