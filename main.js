// Product Data - Will be loaded from JSON
let allProducts = [];

// State
let cart = [];
let wishlist = [];
let currentView = 'grid';
let filteredProducts = [];

// Detect which page we're on
const isShopPage = document.getElementById('shopProductsGrid') !== null;
const isHomePage = document.getElementById('productsGrid') !== null;
const isProductPage = document.getElementById('mainProductImage') !== null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Load products from JSON
    await loadProducts();

    loadCartFromStorage();
    loadWishlistFromStorage();

    // Setup sidebars on all pages
    setupCartSidebar();
    setupFavouritesSidebar();
    setupMobileMenu();

    if (isHomePage) {
        initHomePage();
    }
    if (isShopPage) {
        initShopPage();
    }
    if (isProductPage) {
        initProductPage();
    }
});

// Load products from JSON file
async function loadProducts() {
    try {
        const response = await fetch('data/products.json');
        const data = await response.json();
        allProducts = data.products;
        filteredProducts = [...allProducts];
    } catch (error) {
        console.error('Error loading products:', error);
        // Fallback to empty array if JSON fails to load
        allProducts = [];
        filteredProducts = [];
    }
}

// ==================== HOME PAGE ====================
function initHomePage() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const newsletterForm = document.getElementById('newsletterForm');

    // Render featured products (first 8)
    renderHomeProducts('all');

    // Filter buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderHomeProducts(btn.dataset.filter);
        });
    });

    // Newsletter form
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = e.target.querySelector('input').value;
            showNotification(`Thank you for subscribing with ${email}!`);
            e.target.reset();
        });
    }

    // Setup search
    setupSearch(false);
}

function renderHomeProducts(filter) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;

    const homeProducts = allProducts.slice(0, 8); // First 8 products for home page
    const filtered = filter === 'all'
        ? homeProducts
        : homeProducts.filter(p => p.filter === filter);

    productsGrid.innerHTML = filtered.map(product => createProductCard(product)).join('');
}

// ==================== SHOP PAGE ====================
function initShopPage() {
    const shopProductsGrid = document.getElementById('shopProductsGrid');
    const sortSelect = document.getElementById('sortSelect');
    const viewBtns = document.querySelectorAll('.view-btn');
    const priceSlider = document.getElementById('priceSlider');
    const maxPriceLabel = document.getElementById('maxPriceLabel');
    const applyFiltersBtn = document.getElementById('applyFilters');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const filterToggle = document.getElementById('filterToggle');
    const shopSidebar = document.getElementById('shopSidebar');
    const closeSidebar = document.getElementById('closeSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    // Render all products — honour incoming ?q= search param
    const urlQ = new URLSearchParams(window.location.search).get('q');
    if (urlQ) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = urlQ;
        filteredProducts = allProducts.filter(p =>
            p.name.toLowerCase().includes(urlQ.toLowerCase()) ||
            p.category.toLowerCase().includes(urlQ.toLowerCase())
        );
    } else {
        filteredProducts = [...allProducts];
    }
    renderShopProducts(filteredProducts);

    // Filter sidebar toggle
    if (filterToggle) {
        filterToggle.addEventListener('click', () => {
            shopSidebar.classList.add('open');
            sidebarOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    if (closeSidebar) {
        closeSidebar.addEventListener('click', closeFilterSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeFilterSidebar);
    }

    // Sort
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            const sortValue = sortSelect.value;
            let sorted = [...filteredProducts];

            switch (sortValue) {
                case 'price-low':
                    sorted.sort((a, b) => a.price - b.price);
                    break;
                case 'price-high':
                    sorted.sort((a, b) => b.price - a.price);
                    break;
                case 'newest':
                    sorted.sort((a, b) => b.id - a.id);
                    break;
                case 'rating':
                    sorted.sort((a, b) => b.rating - a.rating);
                    break;
            }
            renderShopProducts(sorted);
        });
    }

    // View toggle
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            shopProductsGrid.classList.toggle('list-view', currentView === 'list');
        });
    });

    // Price slider
    if (priceSlider) {
        priceSlider.addEventListener('input', (e) => {
            maxPriceLabel.textContent = `£${e.target.value}`;
        });
    }

    // Apply filters
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            applyFilters();
            closeFilterSidebar();
        });
    }

    // Clear filters
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }

    // Setup search
    setupSearch(true);

    function closeFilterSidebar() {
        shopSidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    function applyFilters() {
        const maxPrice = parseInt(priceSlider.value);
        const checkedCategories = Array.from(document.querySelectorAll('.filter-list input[type="checkbox"][value]:not([value="all"]):not([value="instock"]):not([value="sale"]):checked'))
            .map(cb => cb.value);
        const onSale = document.querySelector('input[value="sale"]')?.checked;
        const selectedRating = document.querySelector('input[name="rating"]:checked')?.value;

        filteredProducts = allProducts.filter(product => {
            if (product.price > maxPrice) return false;
            if (checkedCategories.length > 0 && !checkedCategories.includes(product.category)) return false;
            if (onSale && !product.badge?.includes('sale')) return false;
            if (selectedRating && product.rating < parseInt(selectedRating)) return false;
            return true;
        });

        renderShopProducts(filteredProducts);
        showNotification(`Found ${filteredProducts.length} products`);
    }

    function clearFilters() {
        document.querySelectorAll('.filter-list input[type="checkbox"]').forEach(cb => {
            cb.checked = cb.value === 'all' || cb.value === 'instock';
        });
        document.querySelectorAll('input[name="rating"]').forEach(rb => {
            rb.checked = false;
        });
        priceSlider.value = 500;
        maxPriceLabel.textContent = '£500';
        filteredProducts = [...allProducts];
        renderShopProducts(filteredProducts);
        showNotification('Filters cleared');
    }
}

function renderShopProducts(products) {
    const shopProductsGrid = document.getElementById('shopProductsGrid');
    const resultsCount = document.getElementById('resultsCount');

    if (!shopProductsGrid) return;

    if (resultsCount) {
        resultsCount.textContent = products.length;
    }

    if (products.length === 0) {
        shopProductsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <h3 style="color: var(--text-dark); margin-bottom: 10px;">No products found</h3>
                <p style="color: var(--text-light);">Try adjusting your filters or search terms</p>
            </div>
        `;
        return;
    }

    shopProductsGrid.innerHTML = products.map(product => createProductCard(product)).join('');
}

// ==================== PRODUCT PAGE ====================
function initProductPage() {
    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = parseInt(urlParams.get('id'));

    if (!productId) {
        window.location.href = 'shop.html';
        return;
    }

    const product = allProducts.find(p => p.id === productId);

    if (!product) {
        window.location.href = 'shop.html';
        return;
    }

    // Update page title
    document.title = `${product.name} - ShopHub`;

    // Populate product details
    populateProductPage(product);

    // Setup quantity controls
    setupQuantityControls(product);

    // Setup add to cart
    setupAddToCart(product);

    // Setup wishlist
    setupProductWishlist(product);

    // Setup tabs
    setupTabs();

    // Load related products
    loadRelatedProducts(product);

}

function populateProductPage(product) {
    // Breadcrumb
    const breadcrumbProduct = document.getElementById('breadcrumbProduct');
    if (breadcrumbProduct) breadcrumbProduct.textContent = product.name;

    // Main image
    const mainImage = document.getElementById('mainProductImage');
    if (mainImage) {
        mainImage.src = product.image;
        mainImage.alt = product.name;
    }

    // Hide thumbnails container since we only have one image
    const thumbnailContainer = document.getElementById('thumbnailImages');
    if (thumbnailContainer) {
        thumbnailContainer.style.display = 'none';
    }

    // Badge
    const productBadge = document.getElementById('productBadge');
    if (productBadge && product.badge) {
        productBadge.textContent = product.badge;
        productBadge.className = `product-badge-large badge-${product.badge}`;
        productBadge.style.display = 'inline-block';
    } else if (productBadge) {
        productBadge.style.display = 'none';
    }

    // Title
    const productTitle = document.getElementById('productTitle');
    if (productTitle) productTitle.textContent = product.name;

    // Category
    const productCategory = document.getElementById('productCategory');
    if (productCategory) productCategory.textContent = product.category;

    // Rating
    updateStarDisplay(product.rating);
    const ratingValue = document.getElementById('ratingValue');
    if (ratingValue) ratingValue.textContent = product.rating.toFixed(1);
    const reviewCount = document.getElementById('reviewCount');
    if (reviewCount) reviewCount.textContent = `(${product.reviews} reviews)`;

    // Price
    const currentPrice = document.getElementById('currentPrice');
    if (currentPrice) currentPrice.textContent = `£${product.price.toFixed(2)}`;

    const originalPrice = document.getElementById('originalPrice');
    if (originalPrice) {
        if (product.originalPrice) {
            originalPrice.textContent = `£${product.originalPrice.toFixed(2)}`;
            originalPrice.style.display = 'inline';
        } else {
            originalPrice.style.display = 'none';
        }
    }

    const discountBadge = document.getElementById('discountBadge');
    if (discountBadge && product.originalPrice) {
        const discount = Math.round((1 - product.price / product.originalPrice) * 100);
        discountBadge.textContent = `Save ${discount}%`;
        discountBadge.style.display = 'inline-block';
    } else if (discountBadge) {
        discountBadge.style.display = 'none';
    }

    // Description
    const productDescription = document.getElementById('productDescription');
    if (productDescription) productDescription.textContent = product.description || 'No description available.';

    // Features
    const productFeatures = document.getElementById('productFeatures');
    if (productFeatures && product.features) {
        productFeatures.innerHTML = product.features.map(f => `<li>${f}</li>`).join('');
    }

    // Stock
    const stockStatus = document.getElementById('stockStatus');
    const stockCount = document.getElementById('stockCount');
    if (stockStatus && product.stock !== undefined) {
        if (product.stock > 10) {
            stockStatus.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                In Stock
            `;
            stockStatus.className = 'stock-status in-stock';
        } else if (product.stock > 0) {
            stockStatus.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                Low Stock
            `;
            stockStatus.className = 'stock-status low-stock';
        } else {
            stockStatus.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                Out of Stock
            `;
            stockStatus.className = 'stock-status out-of-stock';
        }
        if (stockCount) stockCount.textContent = `(${product.stock} available)`;
    }

    // SKU
    const productSku = document.getElementById('productSku');
    if (productSku) productSku.textContent = product.sku || 'N/A';

    // Category Meta
    const productCategoryMeta = document.getElementById('productCategoryMeta');
    if (productCategoryMeta) productCategoryMeta.textContent = product.category;

    // Specifications
    const specsTable = document.getElementById('specsTable');
    if (specsTable && product.specifications) {
        specsTable.innerHTML = Object.entries(product.specifications).map(([key, value]) => `
            <tr>
                <td>${key}</td>
                <td>${value}</td>
            </tr>
        `).join('');
    }

    // Reviews display
    const avgRatingDisplay = document.getElementById('avgRatingDisplay');
    if (avgRatingDisplay) avgRatingDisplay.textContent = product.rating.toFixed(1);

    const avgStarsDisplay = document.getElementById('avgStarsDisplay');
    if (avgStarsDisplay) avgStarsDisplay.innerHTML = getStarsHTML(product.rating);

    const totalReviewsDisplay = document.getElementById('totalReviewsDisplay');
    if (totalReviewsDisplay) totalReviewsDisplay.textContent = `${product.reviews} reviews`;

    // Update wishlist button state
    updateWishlistButtonState(product.id);
}

function updateStarDisplay(rating) {
    const stars = document.querySelectorAll('#starsDisplay .star');
    stars.forEach((star, index) => {
        const starRating = index + 1;
        if (rating >= starRating) {
            star.classList.add('filled');
            star.classList.remove('half');
        } else if (rating >= starRating - 0.5) {
            star.classList.add('half');
            star.classList.remove('filled');
        } else {
            star.classList.remove('filled', 'half');
        }
    });
}

function setupQuantityControls(product) {
    const qtyMinus = document.getElementById('qtyMinus');
    const qtyPlus = document.getElementById('qtyPlus');
    const quantityInput = document.getElementById('quantityInput');

    if (qtyMinus) {
        qtyMinus.addEventListener('click', () => {
            let qty = parseInt(quantityInput.value);
            if (qty > 1) {
                quantityInput.value = qty - 1;
            }
        });
    }

    if (qtyPlus) {
        qtyPlus.addEventListener('click', () => {
            let qty = parseInt(quantityInput.value);
            if (qty < (product.stock || 99)) {
                quantityInput.value = qty + 1;
            }
        });
    }

    if (quantityInput) {
        quantityInput.addEventListener('change', () => {
            let qty = parseInt(quantityInput.value);
            if (qty < 1) quantityInput.value = 1;
            if (qty > (product.stock || 99)) quantityInput.value = product.stock || 99;
        });
    }
}

function setupAddToCart(product) {
    const addToCartBtn = document.getElementById('addToCartBtn');
    const quantityInput = document.getElementById('quantityInput');

    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            const quantity = parseInt(quantityInput.value) || 1;
            addToCartWithQuantity(product.id, quantity);
        });
    }
}

function setupProductWishlist(product) {
    const wishlistBtnLarge = document.getElementById('wishlistBtnLarge');
    const addToWishlistBtn = document.getElementById('addToWishlistBtn');

    const updateBtns = () => {
        const isInWishlist = wishlist.includes(product.id);

        if (wishlistBtnLarge) {
            wishlistBtnLarge.classList.toggle('active', isInWishlist);
            const svg = wishlistBtnLarge.querySelector('svg');
            if (svg) svg.setAttribute('fill', isInWishlist ? 'currentColor' : 'none');
        }

        if (addToWishlistBtn) {
            addToWishlistBtn.classList.toggle('active', isInWishlist);
            const btnText = addToWishlistBtn.childNodes[addToWishlistBtn.childNodes.length - 1];
            if (btnText) btnText.textContent = isInWishlist ? ' Remove from Favourites' : ' Add to Favourites';
        }
    };

    updateBtns();

    if (wishlistBtnLarge) {
        wishlistBtnLarge.addEventListener('click', () => {
            toggleWishlist(product.id);
            updateBtns();
        });
    }

    if (addToWishlistBtn) {
        addToWishlistBtn.addEventListener('click', () => {
            toggleWishlist(product.id);
            updateBtns();
        });
    }
}

function updateWishlistButtonState(productId) {
    const isInWishlist = wishlist.includes(productId);
    const wishlistBtnLarge = document.getElementById('wishlistBtnLarge');
    const addToWishlistBtn = document.getElementById('addToWishlistBtn');

    if (wishlistBtnLarge) {
        wishlistBtnLarge.classList.toggle('active', isInWishlist);
        const svg = wishlistBtnLarge.querySelector('svg');
        if (svg) svg.setAttribute('fill', isInWishlist ? 'currentColor' : 'none');
    }

    if (addToWishlistBtn) {
        addToWishlistBtn.classList.toggle('active', isInWishlist);
    }
}

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const tabId = btn.dataset.tab;
            document.getElementById(tabId).classList.add('active');
        });
    });
}

function loadRelatedProducts(currentProduct) {
    const relatedContainer = document.getElementById('relatedProducts');
    if (!relatedContainer) return;

    // Get products from same category, excluding current product
    const related = allProducts
        .filter(p => p.category === currentProduct.category && p.id !== currentProduct.id)
        .slice(0, 4);

    // If not enough from same category, add some others
    if (related.length < 4) {
        const others = allProducts
            .filter(p => p.id !== currentProduct.id && !related.includes(p))
            .slice(0, 4 - related.length);
        related.push(...others);
    }

    relatedContainer.innerHTML = related.map(product => createProductCard(product)).join('');
}

// ==================== SHARED FUNCTIONS ====================

function createProductCard(product) {
    const isInWishlist = wishlist.includes(product.id);

    return `
        <div class="product-card" data-id="${product.id}">
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}" loading="lazy">
                ${product.badge ? `<span class="product-badge badge-${product.badge}">${product.badge}</span>` : ''}
                <div class="product-actions">
                    <button class="action-btn wishlist-btn ${isInWishlist ? 'active' : ''}"
                            onclick="toggleWishlist(${product.id})"
                            title="${isInWishlist ? 'Remove from Favourites' : 'Add to Favourites'}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="${isInWishlist ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                    </button>
                    <button class="action-btn" onclick="window.location.href='product.html?id=${product.id}'" title="Quick View">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="product-info">
                <span class="product-category">${product.category}</span>
                <h3 class="product-name">${product.name}</h3>
                <div class="product-price">
                    <span class="current-price">£${product.price.toFixed(2)}</span>
                    ${product.originalPrice ? `<span class="original-price">£${product.originalPrice.toFixed(2)}</span>` : ''}
                </div>
                <div class="product-rating">
                    <span class="stars">${getStarsHTML(product.rating)}</span>
                    <span class="rating-count">(${product.reviews})</span>
                </div>
                <button class="add-to-cart" onclick="addToCart(${product.id})">Add to Cart</button>
                <a href="product.html?id=${product.id}" class="view-product-btn">View Product</a>
            </div>
        </div>
    `;
}

function getStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '';
    for (let i = 0; i < fullStars; i++) stars += '★';
    if (hasHalfStar) stars += '☆';
    while (stars.length < 5) stars += '☆';
    return stars.substring(0, 5);
}

function getStarsHTML(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let html = '';

    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            html += '<span class="star-filled">★</span>';
        } else if (i === fullStars && hasHalfStar) {
            html += '<span class="star-half">★</span>';
        } else {
            html += '<span class="star-empty">☆</span>';
        }
    }
    return html;
}

function setupCartSidebar() {
    const cartBtn = document.getElementById('cartBtn');
    const cartSidebar = document.getElementById('cartSidebar');
    const closeCart = document.getElementById('closeCart');
    const overlay = document.getElementById('overlay');

    if (cartBtn) {
        cartBtn.addEventListener('click', () => {
            cartSidebar.classList.add('open');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    if (closeCart) {
        closeCart.addEventListener('click', closeCartSidebar);
    }

    if (overlay) {
        overlay.addEventListener('click', closeAllSidebars);
    }

    function closeCartSidebar() {
        cartSidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function setupFavouritesSidebar() {
    const wishlistBtn = document.getElementById('wishlistBtn');
    const favouritesSidebar = document.getElementById('favouritesSidebar');
    const closeFavourites = document.getElementById('closeFavourites');
    const overlay = document.getElementById('overlay');
    const addAllToCartBtn = document.getElementById('addAllToCartBtn');

    if (wishlistBtn) {
        wishlistBtn.addEventListener('click', () => {
            updateFavouritesDisplay();
            favouritesSidebar.classList.add('open');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    if (closeFavourites) {
        closeFavourites.addEventListener('click', closeFavouritesSidebar);
    }

    if (addAllToCartBtn) {
        addAllToCartBtn.addEventListener('click', addAllFavouritesToCart);
    }

    function closeFavouritesSidebar() {
        favouritesSidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function closeAllSidebars() {
    const cartSidebar = document.getElementById('cartSidebar');
    const favouritesSidebar = document.getElementById('favouritesSidebar');
    const overlay = document.getElementById('overlay');

    if (cartSidebar) cartSidebar.classList.remove('open');
    if (favouritesSidebar) favouritesSidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');

    // Create mobile menu if it doesn't exist
    if (!document.getElementById('mobileMenu')) {
        const mobileMenuHTML = `
            <div class="mobile-menu" id="mobileMenu">
                <div class="mobile-menu-header">
                    <a href="index.html" class="logo">ShopHub</a>
                    <button class="mobile-menu-close" id="mobileMenuClose">&times;</button>
                </div>
                <nav class="mobile-menu-nav">
                    <ul>
                        <li>
                            <a href="index.html" class="${window.location.pathname.includes('index') || window.location.pathname.endsWith('/') ? 'active' : ''}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                </svg>
                                Home
                            </a>
                        </li>
                        <li>
                            <a href="shop.html" class="${window.location.pathname.includes('shop') ? 'active' : ''}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                                    <line x1="3" y1="6" x2="21" y2="6"></line>
                                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                                </svg>
                                Shop
                            </a>
                        </li>
                        <li>
                            <a href="categories.html" class="${window.location.pathname.includes('categories') ? 'active' : ''}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="14" width="7" height="7"></rect>
                                    <rect x="3" y="14" width="7" height="7"></rect>
                                </svg>
                                Categories
                            </a>
                        </li>
                        <li>
                            <a href="deals.html" class="${window.location.pathname.includes('deals') ? 'active' : ''}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                                    <line x1="7" y1="7" x2="7.01" y2="7"></line>
                                </svg>
                                Deals
                            </a>
                        </li>
                        <li>
                            <a href="contact.html" class="${window.location.pathname.includes('contact') ? 'active' : ''}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                                </svg>
                                Contact
                            </a>
                        </li>
                        <li>
                            <a href="login.html" class="${window.location.pathname.includes('login') ? 'active' : ''}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                Login / Account
                            </a>
                        </li>
                    </ul>
                </nav>
                <div class="mobile-menu-footer">
                    <div class="social-links">
                        <a href="#" aria-label="Facebook">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                            </svg>
                        </a>
                        <a href="#" aria-label="Twitter">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                            </svg>
                        </a>
                        <a href="#" aria-label="Instagram">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                            </svg>
                        </a>
                    </div>
                    <p>&copy; 2026 ShopHub</p>
                </div>
            </div>
            <div class="mobile-menu-overlay" id="mobileMenuOverlay"></div>
        `;
        document.body.insertAdjacentHTML('beforeend', mobileMenuHTML);
    }

    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuClose = document.getElementById('mobileMenuClose');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.add('open');
            mobileMenuOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    if (mobileMenuClose) {
        mobileMenuClose.addEventListener('click', closeMobileMenu);
    }

    if (mobileMenuOverlay) {
        mobileMenuOverlay.addEventListener('click', closeMobileMenu);
    }

    function closeMobileMenu() {
        mobileMenu.classList.remove('open');
        mobileMenuOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function updateFavouritesDisplay() {
    const favouritesItems = document.getElementById('favouritesItems');
    if (!favouritesItems) return;

    if (wishlist.length === 0) {
        favouritesItems.innerHTML = '<p class="empty-favourites">Your favourites list is empty</p>';
    } else {
        const favouriteProducts = wishlist.map(id => allProducts.find(p => p.id === id)).filter(p => p);
        favouritesItems.innerHTML = favouriteProducts.map(item => `
            <div class="favourites-item">
                <div class="favourites-item-image">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="favourites-item-details">
                    <h4 class="favourites-item-name">${item.name}</h4>
                    <p class="favourites-item-price">£${item.price.toFixed(2)}</p>
                    <div class="favourites-item-actions">
                        <button class="add-to-cart-btn" onclick="addToCartFromFavourites(${item.id})">Add to Cart</button>
                        <button class="remove-favourite-btn" onclick="removeFromFavourites(${item.id})">Remove</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

function addToCartFromFavourites(productId) {
    addToCart(productId);
}

function removeFromFavourites(productId) {
    const index = wishlist.indexOf(productId);
    if (index !== -1) {
        const product = allProducts.find(p => p.id === productId);
        wishlist.splice(index, 1);
        saveWishlistToStorage();

        const wishlistCount = document.getElementById('wishlistCount');
        if (wishlistCount) wishlistCount.textContent = wishlist.length;

        updateFavouritesDisplay();
        showNotification(`${product.name} removed from favourites!`);

        // Re-render products on page
        if (isShopPage) {
            renderShopProducts(filteredProducts);
        } else if (isHomePage) {
            const activeFilter = document.querySelector('.filter-btn.active');
            renderHomeProducts(activeFilter ? activeFilter.dataset.filter : 'all');
        }
    }
}

function addAllFavouritesToCart() {
    if (wishlist.length === 0) {
        showNotification('No items in favourites to add!');
        return;
    }

    wishlist.forEach(productId => {
        const product = allProducts.find(p => p.id === productId);
        const existingItem = cart.find(item => item.id === productId);

        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({ ...product, quantity: 1 });
        }
    });

    updateCart();
    saveCartToStorage();
    showNotification(`${wishlist.length} item(s) added to cart!`);
}

function setupSearch(isShop) {
    const searchInput = document.getElementById('searchInput');
    const searchBtn   = document.querySelector('.search-btn');
    if (!searchInput) return;

    // ── Live dropdown ──────────────────────────────────────────────
    const dropdown = document.createElement('div');
    dropdown.className = 'search-dropdown';
    searchInput.parentElement.appendChild(dropdown);

    function matchProducts(term) {
        if (!term || term.length < 2) return [];
        return allProducts.filter(p =>
            p.name.toLowerCase().includes(term) ||
            p.category.toLowerCase().includes(term)
        ).slice(0, 6);
    }

    function renderDropdown(term) {
        const results = matchProducts(term);
        if (!results.length) {
            dropdown.innerHTML = '';
            dropdown.classList.remove('open');
            return;
        }
        dropdown.innerHTML = results.map(p => `
            <a class="search-result-item" href="product.html?id=${p.id}">
                <img src="${p.image}" alt="${p.name}">
                <div class="result-text">
                    <span class="result-name">${p.name}</span>
                    <span class="result-cat">${p.category}</span>
                </div>
                <span class="result-price">£${p.price.toFixed(2)}</span>
            </a>
        `).join('');
        dropdown.classList.add('open');
    }

    // ── Commit search (Enter / button) ─────────────────────────────
    function commitSearch() {
        const term = searchInput.value.trim().toLowerCase();
        dropdown.classList.remove('open');
        if (!term) return;

        if (isShop) {
            filteredProducts = allProducts.filter(p =>
                p.name.toLowerCase().includes(term) ||
                p.category.toLowerCase().includes(term)
            );
            renderShopProducts(filteredProducts);
        } else if (isHomePage) {
            const results = allProducts.filter(p =>
                p.name.toLowerCase().includes(term) ||
                p.category.toLowerCase().includes(term)
            );
            const grid = document.getElementById('productsGrid');
            grid.innerHTML = results.length
                ? results.slice(0, 8).map(p => createProductCard(p)).join('')
                : '<p style="text-align:center;padding:40px;color:var(--text-light)">No products found.</p>';
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        } else {
            window.location.href = `shop.html?q=${encodeURIComponent(term)}`;
        }
    }

    // ── Events ─────────────────────────────────────────────────────
    searchInput.addEventListener('input', () =>
        renderDropdown(searchInput.value.trim().toLowerCase())
    );
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') commitSearch();
        if (e.key === 'Escape') dropdown.classList.remove('open');
    });
    if (searchBtn) searchBtn.addEventListener('click', commitSearch);

    document.addEventListener('click', (e) => {
        if (!searchInput.parentElement.contains(e.target))
            dropdown.classList.remove('open');
    });
}

// Cart Functions
function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    updateCart();
    saveCartToStorage();
    showNotification(`${product.name} added to cart!`);
}

function addToCartWithQuantity(productId, quantity) {
    const product = allProducts.find(p => p.id === productId);
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ ...product, quantity: quantity });
    }

    updateCart();
    saveCartToStorage();
    showNotification(`${quantity} x ${product.name} added to cart!`);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCart();
    saveCartToStorage();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            updateCart();
            saveCartToStorage();
        }
    }
}

function updateCart() {
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const cartTotal = document.getElementById('cartTotal');

    if (!cartItems) return;

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (cartCount) cartCount.textContent = totalItems;
    if (cartTotal) cartTotal.textContent = `£${totalPrice.toFixed(2)}`;

    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-image">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="cart-item-details">
                    <h4 class="cart-item-name">${item.name}</h4>
                    <p class="cart-item-price">£${item.price.toFixed(2)}</p>
                    <div class="cart-item-quantity">
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                        <button class="remove-item" onclick="removeFromCart(${item.id})">Remove</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// Wishlist Functions
function toggleWishlist(productId) {
    const index = wishlist.indexOf(productId);
    const product = allProducts.find(p => p.id === productId);

    if (index === -1) {
        wishlist.push(productId);
        showNotification(`${product.name} added to favourites!`);
    } else {
        wishlist.splice(index, 1);
        showNotification(`${product.name} removed from favourites!`);
    }

    const wishlistCount = document.getElementById('wishlistCount');
    if (wishlistCount) wishlistCount.textContent = wishlist.length;

    saveWishlistToStorage();

    // Re-render products
    if (isShopPage) {
        renderShopProducts(filteredProducts);
    } else if (isHomePage) {
        const activeFilter = document.querySelector('.filter-btn.active');
        renderHomeProducts(activeFilter ? activeFilter.dataset.filter : 'all');
    }
}

function quickView(productId) {
    window.location.href = `product.html?id=${productId}`;
}

// Notification System
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #e91e63 0%, #81c784 100%);
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(233, 30, 99, 0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Local Storage
function saveCartToStorage() {
    localStorage.setItem('shophub-cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    const savedCart = localStorage.getItem('shophub-cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCart();
    }
}

function saveWishlistToStorage() {
    localStorage.setItem('shophub-wishlist', JSON.stringify(wishlist));
}

function loadWishlistFromStorage() {
    const savedWishlist = localStorage.getItem('shophub-wishlist');
    if (savedWishlist) {
        wishlist = JSON.parse(savedWishlist);
        const wishlistCount = document.getElementById('wishlistCount');
        if (wishlistCount) wishlistCount.textContent = wishlist.length;
    }
}
