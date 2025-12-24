/**
 * Shared Wishlist Handler
 * Handles "Add to Wishlist" functionality for product cards.
 */

if (!window.WishlistHandler) {
    window.WishlistHandler = (function () {
        const selectors = {
            wishlistToggle: '.wishlist-toggle',
            productCard: '.product-card, .product-image-carousel, [data-product-handle]'
        };

        function init() {
            if (window.WishlistHandlerInitialized) return;
            window.WishlistHandlerInitialized = true;

            // Ensure wishlist exists in localStorage
            if (!localStorage.getItem('wishlistItems')) {
                localStorage.setItem('wishlistItems', JSON.stringify([]));
            }

            // Handle wishlist toggle from any product card
            document.addEventListener('click', handleWishlistClick);

            // Initialize buttons on load
            initWishlistButtons();

            // Re-initialize when dynamic content loads
            document.addEventListener('shopify:section:load', initWishlistButtons);

            // Listen for updates from other tabs/windows or components
            window.addEventListener('storage', (e) => {
                if (e.key === 'wishlistItems') {
                    initWishlistButtons();
                    dispatchUpdateEvent();
                }
            });
        }

        function handleWishlistClick(e) {
            const btn = e.target.closest(selectors.wishlistToggle);
            if (!btn) return;

            e.preventDefault();
            e.stopPropagation();

            try {
                const productData = extractProductData(btn);
                console.log('Toggling wishlist item:', productData);
                toggleWishlistItem(btn, productData);
            } catch (error) {
                console.error('Error handling wishlist toggle:', error);
                showToast('Error updating wishlist', 'error');
            }
        }

        function extractProductData(btn) {
            // Get the product card that contains this button
            const productCard = btn.closest(selectors.productCard);

            // Get product data from the button's data attributes first, then fall back to the product card
            const productId = btn.getAttribute('data-product-id') ||
                (productCard && productCard.getAttribute('data-product-id'));

            const productHandle = btn.getAttribute('data-product-handle') ||
                (productCard && productCard.getAttribute('data-product-handle')) ||
                '';

            // Get the product title
            let productTitle = 'Product';
            const titleElement = productCard && productCard.querySelector('[data-product-title], .product-title, h3');
            if (titleElement) {
                productTitle = btn.getAttribute('data-product-title') || titleElement.textContent.trim();
            }
            productTitle = productTitle || btn.getAttribute('data-product-title') || 'Product';

            // Get price information
            let productPrice = '0';
            let formattedPrice = '0';

            const priceElement = productCard && productCard.querySelector('[data-product-price], .price, .product-price');
            if (priceElement) {
                const priceText = priceElement.getAttribute('data-product-price') || priceElement.textContent.trim();
                formattedPrice = parseFloat(priceText); // This might be NaN if currency symbol is present, but we use formatted_price for display mostly
                // Extract numeric value
                const numericValue = priceText.replace(/[^0-9.,]+/g, '').replace(',', '.');
                productPrice = parseFloat(numericValue) || 0;
            } else {
                productPrice = btn.getAttribute('data-product-price') || '0';
                formattedPrice = btn.getAttribute('data-product-formatted-price') || '0';
            }

            // Get product URL and image
            let productUrl = btn.getAttribute('data-product-url') ||
                (productCard && productCard.getAttribute('data-product-url')) ||
                `/products/${productHandle}`;

            let productImage = btn.getAttribute('data-product-image') || '';

            if (!productImage && productCard) {
                const imgElement = productCard.querySelector('img[src*="shopify"], [data-product-image]');
                if (imgElement) {
                    productImage = imgElement.src || imgElement.getAttribute('data-src') || '';
                }
            }

            // Normalize URL
            if (productUrl && !productUrl.startsWith('http') && !productUrl.startsWith('/')) {
                productUrl = `/${productUrl.replace(/^\/+/, '')}`;
            }

            // Normalize Image URL
            if (productImage && !productImage.startsWith('http') && !productImage.startsWith('//')) {
                productImage = `/${productImage.replace(/^\/+/, '')}`;
            }

            // Get variant ID
            let variantId = btn.getAttribute('data-variant-id') ||
                (productCard && productCard.getAttribute('data-variant-id')) ||
                productId;

            return {
                id: productId,
                handle: productHandle,
                title: productTitle,
                price: productPrice,
                formatted_price: formattedPrice,
                url: productUrl,
                image: productImage,
                variant_id: variantId
            };
        }

        function getWishlist() {
            try {
                return JSON.parse(localStorage.getItem('wishlistItems') || '[]');
            } catch (e) {
                return [];
            }
        }

        function toggleWishlistItem(button, productData) {
            const wishlist = getWishlist();
            const existingIndex = wishlist.findIndex(item => item.id === productData.id);

            if (existingIndex >= 0) {
                // Remove
                wishlist.splice(existingIndex, 1);
                updateButtonState(button, false);
                showToast('Removed from wishlist');
            } else {
                // Add
                wishlist.push(productData);
                updateButtonState(button, true);
                showToast('Added to wishlist');
            }

            localStorage.setItem('wishlistItems', JSON.stringify(wishlist));

            // Update all other buttons for this product on the page
            syncButtons(productData.id, existingIndex < 0);

            dispatchUpdateEvent(wishlist.length);
        }

        function updateButtonState(btn, isInWishlist) {
            btn.classList.toggle('text-black', isInWishlist);
            btn.classList.toggle('text-gray-400', !isInWishlist);

            // Handle data-active attribute for custom styling
            if (isInWishlist) {
                btn.setAttribute('data-active', 'true');
            } else {
                btn.removeAttribute('data-active');
            }

            btn.setAttribute('aria-label', isInWishlist ? 'Remove from wishlist' : 'Add to wishlist');
            if (btn.title) btn.title = isInWishlist ? 'Remove from wishlist' : 'Add to wishlist';
        }

        function syncButtons(productId, isInWishlist) {
            document.querySelectorAll(`${selectors.wishlistToggle}[data-product-id="${productId}"]`).forEach(btn => {
                updateButtonState(btn, isInWishlist);
            });
        }

        function initWishlistButtons() {
            const wishlist = getWishlist();
            document.querySelectorAll(selectors.wishlistToggle).forEach(btn => {
                // Try to find ID on button or parent card
                let productId = btn.dataset.productId;
                if (!productId) {
                    const card = btn.closest(selectors.productCard);
                    if (card) productId = card.dataset.productId;
                }

                if (productId) {
                    const isInWishlist = wishlist.some(item => item.id === productId);
                    updateButtonState(btn, isInWishlist);
                }
            });
        }

        function dispatchUpdateEvent(count) {
            const wishlist = getWishlist();
            const event = new CustomEvent('wishlist:updated', { detail: { count: count !== undefined ? count : wishlist.length } });
            document.dispatchEvent(event);
        }

        function showToast(message, type = 'success') {
            if (typeof window.Toast === 'object' && window.Toast.show) {
                window.Toast.show(message);
            } else if (window.Toast && typeof window.Toast === 'function') {
                window.Toast(message);
            } else {
                console.log(`[Wishlist] ${message}`);
            }
        }

        // Initialize on load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }

        return {
            init: init,
            getWishlist: getWishlist,
            toggle: toggleWishlistItem
        };
    })();
}
