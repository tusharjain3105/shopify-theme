/**
 * Shared Cart Handler
 * Handles "Add to Cart" functionality for product cards and forms.
 */

if (!window.CartHandler) {
    window.CartHandler = (function () {
        const selectors = {
            cartDrawer: 'cart-drawer',
            cartBadge: '[data-cart-open] .absolute',
            addToCartBtn: '.product-card-btn, .add-to-cart-btn',
            hiddenForm: '.product-card-form'
        };

        function init() {
            if (window.CartHandlerInitialized) return;
            window.CartHandlerInitialized = true;

            document.addEventListener('click', function (e) {
                const btn = e.target.closest(selectors.addToCartBtn);
                if (!btn || btn.disabled) return;

                // Check if this button is part of a product card (has data attributes)
                // or if it's a standard form submit button
                if (btn.hasAttribute('data-product-id')) {
                    const variants = Number(btn.getAttribute('data-variants'));
                    if(variants === 1) {
                        handleProductCardClick(e, btn);
                    } else {
                        // Open variant picker
                        const handle = btn.getAttribute('data-handle');
                        if (window.VariantPicker && handle) {
                            e.preventDefault();
                            e.stopPropagation();
                            window.VariantPicker.open(handle);
                        } else {
                            // Fallback if no picker / handle, try adding default variant
                            handleProductCardClick(e, btn); 
                        }
                    }
                }
            });
        }

        function handleProductCardClick(e, btn) {
            e.preventDefault();
            e.stopPropagation();

            const productId = btn.getAttribute('data-product-id');
            const available = btn.getAttribute('data-product-available') === 'true';

            if (!available) return;

            // Find associated hidden form if it exists, or create data manually
            const formId = btn.getAttribute('form');
            let formData;

            if (formId) {
                const form = document.getElementById(formId);
                if (form) {
                    formData = new FormData(form);
                }
            }

            // Fallback if no form found
            if (!formData) {
                formData = new FormData();
                formData.append('id', productId);
                formData.append('quantity', 1);
            }

            addToCart(btn, formData);
        }

        function addToCart(btn, formData) {
            // Set loading state
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.classList.add('loading');
            // Optional: Change icon to spinner if you have one, or just opacity change handled by CSS

            fetch('/cart/add.js', {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
                .then(async response => {
                    const data = await response.json();
                    if (!response.ok) {
                        throw new Error(data.description || data.message || 'Network response was not ok');
                    }
                    return data;
                })
                .then(item => {
                    // Success
                    updateCartState();

                    // Show success state briefly
                    btn.classList.add('success');

                    // Open drawer
                    if (window.CartDrawer && typeof window.CartDrawer.open === 'function') {
                        window.CartDrawer.open();
                    } else {
                        // Fallback to redirect if no drawer
                        window.location.href = '/cart';
                    }
                })
                .catch(error => {
                    console.error('Error adding to cart:', error);
                    btn.classList.add('error');
                    // Show error toast if available
                    if (window.Toast && typeof window.Toast.error === 'function') {
                        window.Toast.error(error.message || 'Failed to add to cart');
                    }
                })
                .finally(() => {
                    // Reset button state after delay
                    setTimeout(() => {
                        btn.disabled = false;
                        btn.classList.remove('loading', 'success', 'error');
                        btn.innerHTML = originalText;
                    }, 1000);
                });
        }

        function updateCartState() {
            fetch('/cart.js')
                .then(response => response.json())
                .then(cart => {
                    // Update badges
                    const badges = document.querySelectorAll(selectors.cartBadge);
                    badges.forEach(badge => {
                        badge.textContent = cart.item_count;
                        badge.style.display = cart.item_count > 0 ? 'block' : 'none';
                    });

                    // If there are other cart UI elements to update, trigger event
                    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
                });
        }

        // Initialize on load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }

        return {
            init: init,
            addToCart: addToCart
        };
    })();
}
