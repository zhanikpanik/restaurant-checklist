# Batch Save Implementation for Products Tab

## Changes to make in manager.astro:

### 1. Add Save Button (after line 165)

Add this button after the "🤖 Категоризировать все" button:

```html
<button 
    id="saveCategoriesBtn"
    onclick="savePendingChanges()" 
    class="hidden px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg"
    title="Сохранить все изменения категорий"
>
    💾 Сохранить <span id="pendingCount" class="ml-1 bg-green-800 px-2 rounded-full">0</span>
</button>
```

### 2. Replace updateProductCategory function (starting at line 1599)

Replace the entire function with:

```javascript
// Track pending category changes
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
    select.classList.add('border-2', 'border-yellow-400');
    
    // Update save button
    updateSaveButton();
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
            showToast(`✅ Сохранено ${successful} изменений`, 'success');
        } else {
            showToast(`⚠️ Сохранено: ${successful}, Ошибок: ${failed}`, 'warning');
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
}

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
```

### 3. Update the dropdown rendering (in displayCustomProducts function)

Find where the category dropdown is rendered and add `data-original-value`:

```javascript
<select 
    id="category-select-${product.product_id}" 
    data-product-id="${product.product_id}" 
    data-product-name="${product.name}"
    data-original-value="${product.category_id || ''}"
    onchange="updateProductCategory(this)" 
    class="px-2 py-1 border border-gray-300 rounded text-sm"
>
    <!-- options here -->
</select>
```

### 4. Add warning when leaving page with unsaved changes

Add this at the end of the script section:

```javascript
// Warn user if leaving with unsaved changes
window.addEventListener('beforeunload', (e) => {
    if (Object.keys(pendingChanges).length > 0) {
        e.preventDefault();
        e.returnValue = 'У вас есть несохраненные изменения. Вы уверены, что хотите покинуть страницу?';
        return e.returnValue;
    }
});
```

## Benefits:

✅ **Performance**: Saves all changes in one batch (parallel requests)
✅ **UX**: Clear visual feedback (yellow border on changed dropdowns)
✅ **Safety**: Warns before leaving with unsaved changes
✅ **Convenience**: Ctrl+S keyboard shortcut
✅ **Feedback**: Shows count of pending changes

