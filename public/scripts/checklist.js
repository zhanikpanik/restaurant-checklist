// Bar Inventory Checklist - Client-side JavaScript
// Updated to use server-side API routes (fixes CORS issues)

// Product data structure
let productData = [];
let shoppingListData = [];
let isShoppingListMode = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize product data from the DOM
    initializeProductData();
    setupEventListeners();
    
    // Initialize Poster API connection (via server-side routes)
    initializePosterAPI();
});

function initializeProductData() {
    // Get all product items from the inventory view
    const productItems = document.querySelectorAll('#inventoryView .product-item');
    productData = Array.from(productItems).map(item => {
        const productId = parseInt(item.dataset.productId);
        const quantityText = item.querySelector('.text-lg.font-semibold').textContent.trim();
        const [quantity, unit] = quantityText.split(' ');
        
        return {
            id: productId,
            name: item.querySelector('h3').textContent,
            quantity: parseFloat(quantity) || 0,
            unit: unit,
            minQuantity: 0, // Will be set from Poster API
            checked: false
        };
    });

    // Initialize shopping list data with zero quantities
    shoppingListData = productData.map(product => ({
        ...product,
        shoppingQuantity: 0
    }));
}

function setupEventListeners() {
    // Create shopping list button
    const createShoppingListBtn = document.getElementById('createShoppingListBtn');
    if (createShoppingListBtn) {
        createShoppingListBtn.addEventListener('click', function() {
            switchToShoppingListMode();
        });
    }

    // WhatsApp button
    const sendWhatsAppBtn = document.getElementById('sendWhatsAppBtn');
    if (sendWhatsAppBtn) {
        sendWhatsAppBtn.addEventListener('click', function() {
            sendToWhatsApp();
        });
    }

    // Save shopping list button
    const saveShoppingListBtn = document.getElementById('saveShoppingListBtn');
    if (saveShoppingListBtn) {
        saveShoppingListBtn.addEventListener('click', function() {
            saveShoppingList();
        });
    }

    // Cancel shopping list button
    const cancelShoppingListBtn = document.getElementById('cancelShoppingListBtn');
    if (cancelShoppingListBtn) {
        cancelShoppingListBtn.addEventListener('click', function() {
            switchToInventoryMode();
        });
    }

    // Search functionality
    const productSearchInput = document.getElementById('productSearchInput');
    if (productSearchInput) {
        productSearchInput.addEventListener('input', function() {
            filterProducts(this.value.trim());
        });
        
        // Clear search on Escape key
        productSearchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                clearSearch();
            }
        });
    }

    // Clear search button
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            clearSearch();
        });
    }

    // Plus button event listeners (for shopping list mode)
    document.querySelectorAll('.plus-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = parseInt(this.dataset.productId);
            updateShoppingQuantity(productId, 1);
        });
    });

    // Minus button event listeners (for shopping list mode)
    document.querySelectorAll('.minus-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = parseInt(this.dataset.productId);
            updateShoppingQuantity(productId, -1);
        });
    });

    // Quantity input field event listeners (for direct input)
    document.querySelectorAll('.quantity-input').forEach(input => {
        // Handle direct input changes
        input.addEventListener('input', function() {
            const productId = parseInt(this.dataset.productId);
            const value = parseFloat(this.value) || 0;
            setShoppingQuantity(productId, value);
        });

        // Handle focus - select all text for easy editing
        input.addEventListener('focus', function() {
            this.select();
        });

        // Handle Enter key - move to next input
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const inputs = Array.from(document.querySelectorAll('.quantity-input'));
                const currentIndex = inputs.indexOf(this);
                const nextInput = inputs[currentIndex + 1];
                if (nextInput) {
                    nextInput.focus();
                } else {
                    this.blur(); // Remove focus if it's the last input
                }
            }
        });

        // Format number on blur (optional - shows 3 decimal places)
        input.addEventListener('blur', function() {
            const value = parseFloat(this.value) || 0;
            if (value > 0) {
                this.value = value.toFixed(3);
            } else {
                this.value = '0';
            }
        });
    });
}

function switchToShoppingListMode() {
    isShoppingListMode = true;
    
    // Hide inventory view, show shopping list view
    document.getElementById('inventoryView').classList.add('hidden');
    document.getElementById('shoppingListView').classList.remove('hidden');
    
    // Hide create button, show shopping list actions
    document.getElementById('createShoppingListBtn').classList.add('hidden');
    document.getElementById('shoppingListActions').classList.remove('hidden');
    
    // Reset shopping quantities to 0
    shoppingListData.forEach(item => {
        item.shoppingQuantity = 0;
    });
    
    // Update all quantity inputs to 0
    document.querySelectorAll('#shoppingListView .quantity-input').forEach(input => {
        input.value = '0';
    });
    
    // Also update any legacy quantity displays (if they exist)
    document.querySelectorAll('#shoppingListView .quantity-display').forEach(display => {
        const productId = parseInt(display.closest('.product-item').dataset.productId);
        const product = shoppingListData.find(p => p.id === productId);
        if (product) {
            display.textContent = `0 ${product.unit}`;
        }
    });
    
    // Clear search and focus on search input
    const productSearchInput = document.getElementById('productSearchInput');
    if (productSearchInput) {
        productSearchInput.value = '';
        filterProducts(''); // Reset product visibility
        // Focus on search input after a short delay to ensure visibility
        setTimeout(() => {
            productSearchInput.focus();
        }, 100);
    }
    
    console.log('Режим создания закупки активирован');
}

function switchToInventoryMode() {
    isShoppingListMode = false;
    
    // Show inventory view, hide shopping list view
    document.getElementById('inventoryView').classList.remove('hidden');
    document.getElementById('shoppingListView').classList.add('hidden');
    
    // Show create button, hide shopping list actions
    document.getElementById('createShoppingListBtn').classList.remove('hidden');
    document.getElementById('shoppingListActions').classList.add('hidden');
    
    console.log('Вернулись к просмотру инвентаря');
}

function updateShoppingQuantity(productId, change) {
    const shoppingItem = shoppingListData.find(p => p.id === productId);
    if (shoppingItem) {
        // Fixed 0.5 step increment for all products
        const increment = change * 0.5;
        
        const newQuantity = Math.max(0, shoppingItem.shoppingQuantity + increment);
        setShoppingQuantity(productId, newQuantity);
    }
}

function setShoppingQuantity(productId, quantity) {
    const shoppingItem = shoppingListData.find(p => p.id === productId);
    if (shoppingItem) {
        const newQuantity = Math.max(0, parseFloat(quantity) || 0);
        shoppingItem.shoppingQuantity = newQuantity;
        
        // Update both the input field and any display elements
        const productItem = document.querySelector(`#shoppingListView [data-product-id="${productId}"]`);
        const quantityInput = productItem.querySelector('.quantity-input');
        
        if (quantityInput) {
            quantityInput.value = newQuantity > 0 ? newQuantity.toString() : '0';
        }
        
        // Also update any legacy quantity displays (if they exist)
        const quantityDisplay = productItem.querySelector('.quantity-display');
        if (quantityDisplay) {
            quantityDisplay.textContent = `${newQuantity} ${shoppingItem.unit}`;
        }
        
        // Log for debugging
        if (quantity > 0) {
            console.log(`${shoppingItem.name}: ${newQuantity} ${shoppingItem.unit}`);
        }
    }
}

function saveShoppingList() {
    // Get products that have quantities > 0
    const itemsToOrder = shoppingListData.filter(item => item.shoppingQuantity > 0);
    
    if (itemsToOrder.length === 0) {
        console.log('Добавьте товары в закупку!');
        return;
    }
    
    // Determine department (default to 'bar' for backward compatibility)
    const department = window.currentDepartment || 'bar';
    const departmentName = department === 'kitchen' ? 'Кухня' : 'Бар';
    
    // Create shopping list data
    const shoppingList = {
        timestamp: new Date().toISOString(),
        department: department,
        departmentName: departmentName,
        items: itemsToOrder.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.shoppingQuantity,
            unit: item.unit
        })),
        totalItems: itemsToOrder.length,
        totalQuantity: itemsToOrder.reduce((sum, item) => sum + item.shoppingQuantity, 0),
        status: 'pending'
    };
    
    // TODO: Send to Poster API (if purchase order endpoints become available)
    // createPosterPurchaseOrder(shoppingList);
    
    // Save to department-specific localStorage
    const storageKey = `${department}ShoppingList`;
    localStorage.setItem(storageKey, JSON.stringify(shoppingList));
    
    console.log(`Закупка для ${departmentName.toLowerCase()} сохранена: ${itemsToOrder.length} товаров`);
    
    // Log the shopping list for now
    console.log(`${departmentName} Shopping List:`, shoppingList);
    
    // Switch back to inventory mode
    switchToInventoryMode();
}

// Search Functions
function filterProducts(searchTerm) {
    const productItems = document.querySelectorAll('#productsList .product-item');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const searchResultsCount = document.getElementById('searchResultsCount');
    const searchResultsText = document.getElementById('searchResultsText');
    
    if (!searchTerm) {
        // Show all products if search is empty
        productItems.forEach(item => {
            item.style.display = 'flex';
        });
        
        // Hide clear button and results count
        if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
        if (searchResultsCount) searchResultsCount.classList.add('hidden');
        return;
    }
    
    // Show clear button
    if (clearSearchBtn) clearSearchBtn.classList.remove('hidden');
    
    // Filter products
    let visibleCount = 0;
    const searchTermLower = searchTerm.toLowerCase();
    
    productItems.forEach(item => {
        const productName = item.querySelector('h3').textContent.toLowerCase();
        const matches = productName.includes(searchTermLower);
        
        if (matches) {
            item.style.display = 'flex';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Show search results count
    if (searchResultsCount && searchResultsText) {
        if (visibleCount === 0) {
            searchResultsText.textContent = `Товары не найдены для "${searchTerm}"`;
            searchResultsText.className = 'text-red-600';
        } else {
            searchResultsText.textContent = `Найдено ${visibleCount} товар${getProductCountSuffix(visibleCount)} для "${searchTerm}"`;
            searchResultsText.className = 'text-green-600';
        }
        searchResultsCount.classList.remove('hidden');
    }
}

function clearSearch() {
    const productSearchInput = document.getElementById('productSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const searchResultsCount = document.getElementById('searchResultsCount');
    
    // Clear input
    if (productSearchInput) {
        productSearchInput.value = '';
        productSearchInput.focus();
    }
    
    // Hide clear button and results count
    if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
    if (searchResultsCount) searchResultsCount.classList.add('hidden');
    
    // Show all products
    filterProducts('');
    
    console.log('Поиск очищен');
}

function getProductCountSuffix(count) {
    if (count % 10 === 1 && count % 100 !== 11) {
        return '';
    } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
        return 'а';
    } else {
        return 'ов';
    }
}

// WhatsApp Integration
function sendToWhatsApp() {
    // Get products that have quantities > 0
    const itemsToOrder = shoppingListData.filter(item => item.shoppingQuantity > 0);
    
    if (itemsToOrder.length === 0) {
        console.log('Добавьте товары в закупку!');
        return;
    }
    
    // Determine department (default to 'bar' for backward compatibility)
    const department = window.currentDepartment || 'bar';
    const departmentName = department === 'kitchen' ? 'Кухня' : 'Бар';
    const departmentEmoji = department === 'kitchen' ? '🍳' : '🍷';
    
    // Generate WhatsApp message
    const message = generateWhatsAppMessage(itemsToOrder, departmentName, departmentEmoji);
    
    const buyerPhone = "996557957457";
    const encodedMessage = encodeURIComponent(message);
    
    // Detect if user is on mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    let whatsappUrl;
    if (isMobile) {
        // For mobile devices - use WhatsApp app scheme
        whatsappUrl = `whatsapp://send?phone=${buyerPhone}&text=${encodedMessage}`;
    } else {
        // For desktop - use WhatsApp Web
        whatsappUrl = `https://web.whatsapp.com/send?phone=${buyerPhone}&text=${encodedMessage}`;
    }
    
    // Try to open WhatsApp
    const whatsappWindow = window.open(whatsappUrl, '_blank');
    
    // Fallback for mobile if WhatsApp app isn't installed
    if (isMobile && !whatsappWindow) {
        // Use wa.me as fallback
        const fallbackUrl = `https://wa.me/${buyerPhone}?text=${encodedMessage}`;
        window.open(fallbackUrl, '_blank');
    }
    
    // Log success
    console.log(`Список отправлен в WhatsApp (${itemsToOrder.length} товаров)`);
    
    // Auto-save the shopping list too
    saveShoppingList();
}

function generateWhatsAppMessage(items, departmentName, departmentEmoji) {
    const today = new Date().toLocaleDateString('ru-RU');
    let message = `SHOPPING LIST - ${today}\n\n`;
    
    message += `${departmentName.toUpperCase()} NEEDS:\n`;
    
    // Add items with urgency marking (using simpler symbols)
    items.forEach(item => {
        const urgentMark = item.quantity <= 0 ? ' *URGENT*' : '';
        message += `- ${item.name} - ${item.shoppingQuantity} ${item.unit}${urgentMark}\n`;
    });
    
    message += `\nTOTAL ITEMS: ${items.length}\n`;
    
    // Add urgent items summary
    const urgentItems = items.filter(item => item.quantity <= 0);
    if (urgentItems.length > 0) {
        message += `URGENT: ${urgentItems.map(item => item.name).join(', ')}\n`;
    }
    
    message += `\nReply when ordered!`;
    
    return message;
}

// ✅ Poster API Functions (using server-side API routes to avoid CORS)
async function initializePosterAPI() {
    try {
        console.log('🔄 Initializing Poster API connection via server routes...');
        
        // Test connection using server-side API route
        const token = '305185:07928627ec76d09e589e1381710e55da';
        const baseUrl = 'https://joinposter.com/api';
        const response = await fetch(`${baseUrl}/storage.getInventoryIngredients?token=${token}&storage_id=2`);
        const connectionResult = await response.json();
        
        if (connectionResult.success) {
            console.log('✅ Poster API connected successfully!');
            console.log('Account info:', connectionResult.account);
            
            // Load products from Poster
            await fetchPosterProducts();
            
            console.log('Подключение к Poster API успешно!');
        } else {
            throw new Error(connectionResult.error || 'Connection failed');
        }
    } catch (error) {
        console.error('❌ Poster API initialization failed:', error);
        console.error('Ошибка подключения к Poster API: ' + error.message);
    }
}

async function fetchPosterProducts() {
    try {
        console.log('🔄 Fetching real ingredients from Poster...');
        
        // Use the new ingredients endpoint that actually works
        const token = '305185:07928627ec76d09e589e1381710e55da';
        const baseUrl = 'https://joinposter.com/api';
        const response = await fetch(`${baseUrl}/storage.getInventoryIngredients?token=${token}&storage_id=2`);
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Real ingredients fetched:', result.data);
            
            if (result.count === 0) {
                console.log('ℹ️ No ingredients found in Poster');
                console.log('Ингредиенты не найдены в Poster');
            } else {
                console.log(`Found ${result.count} real ingredients in Poster`);
                console.log(`✅ Загружено ${result.count} реальных ингредиентов из Poster!`);
                
                // Log the real data
                console.log('Your real Poster inventory:', result.data);
                
                // Show detailed info about real vs displayed data
                const realItems = result.data.map(item => `${item.name}: ${item.quantity} ${item.unit}`).join(', ');
                console.log('Real inventory quantities:', realItems);
            }
        } else {
            throw new Error(result.error || 'Failed to fetch ingredients');
        }
    } catch (error) {
        console.error('❌ Error fetching Poster ingredients:', error);
        console.error('Ошибка загрузки ингредиентов из Poster: ' + error.message);
    }
}

async function fetchPosterCategories() {
    try {
        console.log('🔄 Fetching categories from Poster via server route...');
        
        // Use server-side API route to fetch categories
        const response = await fetch('/api/test-poster-categories');
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Categories fetched:', result.data);
            return result.data;
        } else {
            throw new Error(result.error || 'Failed to fetch categories');
        }
    } catch (error) {
        console.error('❌ Error fetching Poster categories:', error);
        throw error;
    }
}

// Helper function to update UI with real Poster products (optional)
function updateUIWithPosterProducts(posterProducts) {
    if (!posterProducts || posterProducts.length === 0) {
        return;
    }
    
    console.log('🔄 Updating UI with Poster products...');
    
    // TODO: Replace mock data with real Poster products
    // This would involve updating the DOM elements with real product data
    // For now, just log the data
    console.log('Poster products to integrate:', posterProducts);
}

// Legacy functions (placeholder - these endpoints don't exist in your Poster account)
async function updatePosterInventory(productId, quantity) {
    console.warn('updatePosterInventory: This feature is not available in your Poster account');
    throw new Error('Inventory update not supported by your Poster account');
}

async function createPosterPurchaseOrder(shoppingList) {
    console.warn('createPosterPurchaseOrder: This feature is not available in your Poster account');
    console.log('Shopping list would be:', shoppingList);
    throw new Error('Purchase orders not supported by your Poster account');
}

// Notification system removed

// Export functions for potential use in other modules
window.BarInventory = {
    switchToShoppingListMode,
    switchToInventoryMode,
    updateShoppingQuantity,
    saveShoppingList,
    sendToWhatsApp,
    generateWhatsAppMessage,
    filterProducts,
    clearSearch,
    initializePosterAPI,
    fetchPosterProducts,
    fetchPosterCategories
}; 