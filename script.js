// ============================================
// AUTO-REFRESH SETTINGS
// ============================================

const REFRESH_INTERVAL = 30000; // 30 seconds
let refreshIntervalId = null;
let lastUpdateTime = null;
let allProducts = []; // Store all products
let currentSearchQuery = ''; // Store current search query
let currentPage = 1; // Current page number
let itemsPerPage = 10; // Items per page
let sortColumn = null; // Current sort column (null, 'title', or 'price')
let sortOrder = 'asc'; // Current sort order ('asc' or 'desc')
let currentEditingProduct = null; // Store product being edited

// ============================================
// FETCH PRODUCTS FROM API
// ============================================

async function fetchProducts() {
    try {
        const response = await fetch('https://api.escuelajs.co/api/v1/products');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const products = await response.json();
        allProducts = products; // Store all products
        filterAndDisplayProducts(); // Apply current search filter
        calculateStats(products);
        updateLastRefreshTime();
        
    } catch (error) {
        showError('Lỗi khi tải dữ liệu: ' + error.message);
        console.error('Error fetching products:', error);
    }
}

// ============================================
// DISPLAY PRODUCTS IN TABLE
// ============================================

function filterAndDisplayProducts() {
    // Filter products based on search query
    const filteredProducts = allProducts.filter(product => {
        if (!currentSearchQuery) return true;
        return product.title.toLowerCase().includes(currentSearchQuery.toLowerCase());
    });

    // Sort products if sort column is set
    let productsToDisplay = [...filteredProducts];
    if (sortColumn) {
        productsToDisplay.sort((a, b) => {
            let valueA = a[sortColumn];
            let valueB = b[sortColumn];

            // Handle different data types
            if (typeof valueA === 'string') {
                valueA = valueA.toLowerCase();
                valueB = valueB.toLowerCase();
                return sortOrder === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
            } else if (typeof valueA === 'number') {
                return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
            }
            return 0;
        });
    }

    // Reset to page 1 when search changes
    currentPage = 1;
    
    // Calculate pagination
    const totalPages = Math.ceil(productsToDisplay.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = productsToDisplay.slice(startIndex, endIndex);

    // Store the sorted/filtered products for export
    window.currentDisplayedProducts = productsToDisplay;

    displayProducts(paginatedProducts);
    updatePaginationControls(productsToDisplay.length, totalPages);
    
    // Show search results count if there's a search query
    const searchResultsEl = document.getElementById('searchResults');
    if (currentSearchQuery) {
        document.getElementById('resultCount').textContent = productsToDisplay.length;
        searchResultsEl.style.display = 'block';
    } else {
        searchResultsEl.style.display = 'none';
    }
}

function displayProducts(products) {
    const tbody = document.getElementById('productsBody');
    tbody.innerHTML = '';

    products.forEach((product) => {
        const row = document.createElement('tr');
        
        // Get the first image or use placeholder
        const imageUrl = product.images && product.images.length > 0 
            ? product.images[0] 
            : 'https://via.placeholder.com/80?text=No+Image';
        
        // Get category name
        const categoryName = product.category && product.category.name 
            ? product.category.name 
            : 'N/A';

        // Get description or use default message
        const description = product.description 
            ? product.description 
            : 'Không có mô tả';

        row.className = 'product-row';
        row.innerHTML = `
            <td class="product-id">${product.id}</td>
            <td class="product-title">${product.title}</td>
            <td class="product-price">$${product.price.toFixed(2)}</td>
            <td><span class="product-category">${categoryName}</span></td>
            <td style="text-align: center;">
                <img src="${imageUrl}" alt="${product.title}" class="product-image" 
                     title="${product.title}" 
                     onerror="this.src='https://via.placeholder.com/80?text=Error'">
            </td>
            <div class="tooltip-custom">
                <strong>Mô tả:</strong><br>${description}
            </div>
        `;
        
        // Add click event to open modal
        row.addEventListener('click', function() {
            openProductModal(product);
        });
        
        tbody.appendChild(row);
    });

    // Hide loading and show table
    document.getElementById('loadingSection').style.display = 'none';
    document.getElementById('tableSection').style.display = 'block';
    document.getElementById('statsSection').style.display = 'grid';
}

// ============================================
// OPEN PRODUCT MODAL
// ============================================

function openProductModal(product) {
    currentEditingProduct = product;
    
    // Populate view mode
    const categoryName = product.category && product.category.name ? product.category.name : 'N/A';
    const imageUrl = product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/400?text=No+Image';
    
    document.getElementById('detailId').textContent = product.id;
    document.getElementById('detailTitle').textContent = product.title;
    document.getElementById('detailPrice').textContent = '$' + product.price.toFixed(2);
    document.getElementById('detailCategory').textContent = categoryName;
    document.getElementById('detailDescription').textContent = product.description || 'Không có mô tả';
    document.getElementById('detailImage').src = imageUrl;
    
    // Reset to view mode
    resetModalToViewMode();
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
}

// ============================================
// RESET MODAL TO VIEW MODE
// ============================================

function resetModalToViewMode() {
    document.getElementById('viewMode').style.display = 'block';
    document.getElementById('editMode').style.display = 'none';
    document.getElementById('editToggleBtn').style.display = 'block';
    document.getElementById('saveBtn').style.display = 'none';
    document.getElementById('cancelEditBtn').style.display = 'none';
    document.getElementById('editError').style.display = 'none';
    document.getElementById('editSuccess').style.display = 'none';
}

// ============================================
// TOGGLE EDIT MODE
// ============================================

function toggleEditMode() {
    const viewMode = document.getElementById('viewMode');
    const editMode = document.getElementById('editMode');
    const editToggleBtn = document.getElementById('editToggleBtn');
    const saveBtn = document.getElementById('saveBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    
    if (editMode.style.display === 'none') {
        // Switch to edit mode
        viewMode.style.display = 'none';
        editMode.style.display = 'block';
        editToggleBtn.style.display = 'none';
        saveBtn.style.display = 'block';
        cancelEditBtn.style.display = 'block';
        
        // Populate edit form
        document.getElementById('editTitle').value = currentEditingProduct.title;
        document.getElementById('editPrice').value = currentEditingProduct.price;
        document.getElementById('editDescription').value = currentEditingProduct.description || '';
    }
}

// ============================================
// SAVE PRODUCT CHANGES
// ============================================

async function saveProductChanges() {
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu...';
    
    const title = document.getElementById('editTitle').value.trim();
    const price = parseFloat(document.getElementById('editPrice').value);
    const description = document.getElementById('editDescription').value.trim();
    
    // Validation
    if (!title) {
        showEditError('Tiêu đề không được để trống');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="bi bi-check"></i> Lưu';
        return;
    }
    
    if (isNaN(price) || price < 0) {
        showEditError('Giá phải là số dương');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="bi bi-check"></i> Lưu';
        return;
    }
    
    try {
        const response = await fetch(`https://api.escuelajs.co/api/v1/products/${currentEditingProduct.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                price: price,
                description: description,
                categoryId: currentEditingProduct.category?.id || 1
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const updatedProduct = await response.json();
        
        // Update local product
        currentEditingProduct.title = updatedProduct.title;
        currentEditingProduct.price = updatedProduct.price;
        currentEditingProduct.description = updatedProduct.description;
        
        // Update in allProducts array
        const index = allProducts.findIndex(p => p.id === currentEditingProduct.id);
        if (index !== -1) {
            allProducts[index] = currentEditingProduct;
        }
        
        showEditSuccess('Cập nhật sản phẩm thành công!');
        
        // Refresh display
        setTimeout(() => {
            filterAndDisplayProducts();
            resetModalToViewMode();
            
            // Update detail view
            document.getElementById('detailTitle').textContent = currentEditingProduct.title;
            document.getElementById('detailPrice').textContent = '$' + currentEditingProduct.price.toFixed(2);
            document.getElementById('detailDescription').textContent = currentEditingProduct.description || 'Không có mô tả';
        }, 1500);
        
    } catch (error) {
        showEditError('Lỗi khi cập nhật: ' + error.message);
        console.error('Error updating product:', error);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="bi bi-check"></i> Lưu';
    }
}

// ============================================
// SHOW EDIT ERROR
// ============================================

function showEditError(message) {
    const errorDiv = document.getElementById('editError');
    const successDiv = document.getElementById('editSuccess');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    successDiv.style.display = 'none';
}

// ============================================
// SHOW EDIT SUCCESS
// ============================================

function showEditSuccess(message) {
    const errorDiv = document.getElementById('editError');
    const successDiv = document.getElementById('editSuccess');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    errorDiv.style.display = 'none';
}

// ============================================
// CREATE PRODUCT FUNCTION
// ============================================

async function createNewProduct() {
    const submitBtn = document.getElementById('submitCreateBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang tạo...';
    
    const title = document.getElementById('createTitle').value.trim();
    const price = parseFloat(document.getElementById('createPrice').value);
    const description = document.getElementById('createDescription').value.trim();
    const categoryId = document.getElementById('createCategory').value;
    
    // Validation
    if (!title) {
        showCreateError('Tiêu đề không được để trống');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check"></i> Tạo Sản Phẩm';
        return;
    }
    
    if (isNaN(price) || price < 0) {
        showCreateError('Giá phải là số dương');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check"></i> Tạo Sản Phẩm';
        return;
    }
    
    if (!categoryId) {
        showCreateError('Vui lòng chọn danh mục');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check"></i> Tạo Sản Phẩm';
        return;
    }
    
    try {
        const response = await fetch('https://api.escuelajs.co/api/v1/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                price: price,
                description: description,
                categoryId: parseInt(categoryId),
                images: ['https://via.placeholder.com/400?text=' + encodeURIComponent(title)]
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const newProduct = await response.json();
        
        // Add to allProducts array
        if (!newProduct.category) {
            newProduct.category = { id: categoryId, name: getCategoryName(categoryId) };
        }
        if (!newProduct.images) {
            newProduct.images = ['https://via.placeholder.com/400?text=' + encodeURIComponent(title)];
        }
        
        allProducts.unshift(newProduct); // Add to beginning
        
        showCreateSuccess('Tạo sản phẩm thành công!');
        
        // Clear form
        document.getElementById('createProductForm').reset();
        
        // Close modal and refresh display after a delay
        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('createProductModal'));
            modal.hide();
            filterAndDisplayProducts();
        }, 1500);
        
    } catch (error) {
        showCreateError('Lỗi khi tạo sản phẩm: ' + error.message);
        console.error('Error creating product:', error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check"></i> Tạo Sản Phẩm';
    }
}

// ============================================
// GET CATEGORY NAME BY ID
// ============================================

function getCategoryName(categoryId) {
    const categoryMap = {
        '1': 'Electronics',
        '2': 'Furniture',
        '3': 'Shoes',
        '4': 'Miscellaneous',
        '5': 'Clothes'
    };
    return categoryMap[categoryId] || 'Unknown';
}

// ============================================
// SHOW CREATE ERROR
// ============================================

function showCreateError(message) {
    const errorDiv = document.getElementById('createError');
    const successDiv = document.getElementById('createSuccess');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    successDiv.style.display = 'none';
}

// ============================================
// SHOW CREATE SUCCESS
// ============================================

function showCreateSuccess(message) {
    const errorDiv = document.getElementById('createError');
    const successDiv = document.getElementById('createSuccess');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    errorDiv.style.display = 'none';
}

// ============================================
// TOGGLE SORT FUNCTION
// ============================================

function toggleSort(column) {
    // If clicking the same column, toggle sort order
    if (sortColumn === column) {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        // If clicking a different column, set it as sort column with asc order
        sortColumn = column;
        sortOrder = 'asc';
    }
    
    // Update sort icons
    updateSortIcons();
    
    // Re-filter and display with new sort
    filterAndDisplayProducts();
}

// ============================================
// UPDATE SORT ICONS
// ============================================

function updateSortIcons() {
    const titleIcon = document.getElementById('sort-title');
    const priceIcon = document.getElementById('sort-price');
    
    // Reset all icons
    [titleIcon, priceIcon].forEach(icon => {
        icon.classList.remove('active', 'asc', 'desc');
    });
    
    // Set active icon
    if (sortColumn === 'title') {
        titleIcon.classList.add('active', sortOrder);
    } else if (sortColumn === 'price') {
        priceIcon.classList.add('active', sortOrder);
    }
}

function updatePaginationControls(totalProducts, totalPages) {
    const paginationSection = document.getElementById('paginationSection');
    
    // Hide pagination if only one page or no products
    if (totalPages <= 1) {
        paginationSection.style.display = 'none';
        return;
    }
    
    paginationSection.style.display = 'block';
    
    // Update pagination info
    const startRecord = (currentPage - 1) * itemsPerPage + 1;
    const endRecord = Math.min(currentPage * itemsPerPage, totalProducts);
    
    document.getElementById('startRecord').textContent = startRecord;
    document.getElementById('endRecord').textContent = endRecord;
    document.getElementById('totalRecords').textContent = totalProducts;
    
    // Generate pagination buttons
    const paginationControls = document.getElementById('paginationControls');
    paginationControls.innerHTML = '';
    
    // Previous button
    const prevItem = document.createElement('li');
    prevItem.className = 'page-item' + (currentPage === 1 ? ' disabled' : '');
    prevItem.innerHTML = '<span class="page-link" onclick="goToPage(' + (currentPage - 1) + ')" ' + (currentPage === 1 ? 'style="pointer-events: none;"' : '') + '>Trước</span>';
    paginationControls.appendChild(prevItem);
    
    // Page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        const firstItem = document.createElement('li');
        firstItem.className = 'page-item';
        firstItem.innerHTML = '<span class="page-link" onclick="goToPage(1)">1</span>';
        paginationControls.appendChild(firstItem);
        
        if (startPage > 2) {
            const dotsItem = document.createElement('li');
            dotsItem.className = 'page-item disabled';
            dotsItem.innerHTML = '<span class="page-link">...</span>';
            paginationControls.appendChild(dotsItem);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageItem = document.createElement('li');
        pageItem.className = 'page-item' + (i === currentPage ? ' active' : '');
        pageItem.innerHTML = '<span class="page-link" onclick="goToPage(' + i + ')">' + i + '</span>';
        paginationControls.appendChild(pageItem);
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dotsItem = document.createElement('li');
            dotsItem.className = 'page-item disabled';
            dotsItem.innerHTML = '<span class="page-link">...</span>';
            paginationControls.appendChild(dotsItem);
        }
        
        const lastItem = document.createElement('li');
        lastItem.className = 'page-item';
        lastItem.innerHTML = '<span class="page-link" onclick="goToPage(' + totalPages + ')">' + totalPages + '</span>';
        paginationControls.appendChild(lastItem);
    }
    
    // Next button
    const nextItem = document.createElement('li');
    nextItem.className = 'page-item' + (currentPage === totalPages ? ' disabled' : '');
    nextItem.innerHTML = '<span class="page-link" onclick="goToPage(' + (currentPage + 1) + ')" ' + (currentPage === totalPages ? 'style="pointer-events: none;"' : '') + '>Sau</span>';
    paginationControls.appendChild(nextItem);
}

// ============================================
// GO TO PAGE FUNCTION
// ============================================

function goToPage(pageNumber) {
    const filteredProducts = allProducts.filter(product => {
        if (!currentSearchQuery) return true;
        return product.title.toLowerCase().includes(currentSearchQuery.toLowerCase());
    });
    
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    
    if (pageNumber >= 1 && pageNumber <= totalPages) {
        currentPage = pageNumber;
        filterAndDisplayProducts();
        
        // Scroll to top of table
        document.getElementById('tableSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ============================================
// CALCULATE AND DISPLAY STATISTICS
// ============================================

function calculateStats(products) {
    // Total products
    document.getElementById('totalProducts').textContent = products.length;

    // Unique categories
    const categories = new Set();
    products.forEach(product => {
        if (product.category && product.category.name) {
            categories.add(product.category.name);
        }
    });
    document.getElementById('totalCategories').textContent = categories.size;

    // Average price
    const totalPrice = products.reduce((sum, product) => sum + product.price, 0);
    const avgPrice = (totalPrice / products.length).toFixed(2);
    document.getElementById('avgPrice').textContent = '$' + avgPrice;
}

// ============================================
// SHOW ERROR MESSAGE
// ============================================

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    document.getElementById('loadingSection').style.display = 'none';
}

// ============================================
// UPDATE LAST REFRESH TIME
// ============================================

function updateLastRefreshTime() {
    const now = new Date();
    lastUpdateTime = now;
    const timeString = now.toLocaleTimeString('vi-VN');
    const lastRefreshEl = document.getElementById('lastRefreshTime');
    if (lastRefreshEl) {
        lastRefreshEl.textContent = 'Cập nhật lần cuối: ' + timeString;
    }
}

// ============================================
// SETUP AUTO-REFRESH
// ============================================

function startAutoRefresh() {
    // Fetch immediately
    fetchProducts();
    
    // Then set up interval to refresh every 30 seconds
    refreshIntervalId = setInterval(fetchProducts, REFRESH_INTERVAL);
    console.log('Auto-refresh started. Interval: ' + REFRESH_INTERVAL / 1000 + ' seconds');
    
    // Setup search functionality
    setupSearchListener();
}

// ============================================
// SETUP SEARCH LISTENER
// ============================================

function setupSearchListener() {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const createProductBtn = document.getElementById('createProductBtn');
    const editToggleBtn = document.getElementById('editToggleBtn');
    const saveBtn = document.getElementById('saveBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const submitCreateBtn = document.getElementById('submitCreateBtn');
    
    // Search input event
    searchInput.addEventListener('input', function() {
        currentSearchQuery = this.value.trim();
        
        // Show/hide clear button
        if (currentSearchQuery) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        
        // Filter and display products
        filterAndDisplayProducts();
    });
    
    // Clear search button event
    clearSearchBtn.addEventListener('click', function() {
        searchInput.value = '';
        currentSearchQuery = '';
        clearSearchBtn.style.display = 'none';
        filterAndDisplayProducts();
    });
    
    // Items per page change event
    itemsPerPageSelect.addEventListener('change', function() {
        itemsPerPage = parseInt(this.value);
        currentPage = 1; // Reset to page 1
        filterAndDisplayProducts();
    });
    
    // Export CSV button event
    exportCsvBtn.addEventListener('click', exportToCSV);
    
    // Modal edit/save events
    editToggleBtn.addEventListener('click', toggleEditMode);
    saveBtn.addEventListener('click', saveProductChanges);
    cancelEditBtn.addEventListener('click', resetModalToViewMode);
    
    // Create product button event
    createProductBtn.addEventListener('click', function() {
        document.getElementById('createProductForm').reset();
        document.getElementById('createError').style.display = 'none';
        document.getElementById('createSuccess').style.display = 'none';
        const modal = new bootstrap.Modal(document.getElementById('createProductModal'));
        modal.show();
    });
    
    // Submit create product button event
    submitCreateBtn.addEventListener('click', createNewProduct);
}

function stopAutoRefresh() {
    if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = null;
        console.log('Auto-refresh stopped');
    }
}

// ============================================
// INITIALIZE ON PAGE LOAD
// ============================================

document.addEventListener('DOMContentLoaded', startAutoRefresh);

// Stop refresh when page is unloaded
window.addEventListener('beforeunload', stopAutoRefresh);

// ============================================
// EXPORT TO CSV FUNCTION
// ============================================

function exportToCSV() {
    // Get the displayed products (after filter and sort)
    const productsToExport = window.currentDisplayedProducts || allProducts;
    
    if (productsToExport.length === 0) {
        alert('Không có dữ liệu để export!');
        return;
    }
    
    // CSV Header
    const headers = ['ID', 'Tiêu Đề', 'Giá', 'Danh Mục', 'Hình Ảnh', 'Mô Tả'];
    
    // CSV Rows
    const rows = productsToExport.map(product => {
        const categoryName = product.category && product.category.name ? product.category.name : 'N/A';
        const imageUrl = product.images && product.images.length > 0 ? product.images[0] : '';
        const description = product.description ? product.description.replace(/"/g, '""') : '';
        
        return [
            product.id,
            `"${product.title.replace(/"/g, '""')}"`,
            product.price.toFixed(2),
            `"${categoryName}"`,
            `"${imageUrl}"`,
            `"${description}"`
        ];
    });
    
    // Combine headers and rows
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create Blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Generate filename with current date and time
    const now = new Date();
    const fileName = `products_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`Exported ${productsToExport.length} products to CSV`);
}
