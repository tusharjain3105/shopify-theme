/**
 * Variant Picker Logic
 * Handles opening the picker, fetching product data, and adding to cart.
 */

if (!window.VariantPicker) {
    window.VariantPicker = (function () {
        const refs = {
            dialog: document.getElementById('variant-picker-dialog'),
            closeBtn: document.querySelector('[data-close-picker]'),
            loader: document.querySelector('[data-loader]'),
            mainImage: document.querySelector('[data-main-image]'),
            prevImageBtn: document.querySelector('[data-prev-image]'),
            nextImageBtn: document.querySelector('[data-next-image]'),
            dotsContainer: document.querySelector('[data-dots]'),
            title: document.querySelector('[data-title]'),
            price: document.querySelector('[data-price]'),
            variantsContainer: document.querySelector('[data-variants-container]'),
            addToCartBtn: document.querySelector('[data-add-to-cart]'),
            optionNameLabel: document.querySelector('[data-option-name]'),
            sizeChartTrigger: document.querySelector('[data-size-chart-trigger]')
        };

        let currentProduct = null;
        let selectedVariantId = null;
        let activeImageIndex = 0;
        let images = [];

        function init() {
            if (refs.closeBtn) {
                refs.closeBtn.addEventListener('click', close);
            }
            if (refs.dialog) {
                refs.dialog.addEventListener('click', (e) => {
                    if (e.target === refs.dialog) close();
                });
            }

            if (refs.addToCartBtn) {
                refs.addToCartBtn.addEventListener('click', handleAddToCart);
            }

            if (refs.prevImageBtn) refs.prevImageBtn.addEventListener('click', () => changeImage(-1));
            if (refs.nextImageBtn) refs.nextImageBtn.addEventListener('click', () => changeImage(1));
            
            if (refs.sizeChartTrigger) {
                refs.sizeChartTrigger.addEventListener('click', (e) => {
                    e.preventDefault();
                    // trigger global size chart
                    const chart = document.getElementById('size-chart-modal');
                    if(chart) chart.showModal();
                    else console.warn('Size chart modal not found');
                });
            }
        }

        function open(handle) {
            if (!refs.dialog) return;
            
            // Reset state
            resetUI();
            refs.dialog.showModal();
            document.body.style.overflow = 'hidden';

            // Fetch Data
            fetch(`/products/${handle}.js`)
                .then(res => res.json())
                .then(product => {
                    currentProduct = product;
                    renderProduct(product);
                })
                .catch(err => {
                    console.error('Error fetching product:', err);
                    close();
                });
        }

        function close() {
            if (!refs.dialog) return;
            refs.dialog.close();
            document.body.style.overflow = '';
            currentProduct = null;
        }

        function resetUI() {
            refs.loader.classList.remove('hidden');
            refs.mainImage.classList.add('opacity-0');
            refs.title.textContent = '';
            refs.price.textContent = '';
            refs.variantsContainer.innerHTML = '';
            refs.addToCartBtn.disabled = true;
            refs.addToCartBtn.textContent = 'Select Option';
            images = [];
        }

        function renderProduct(product) {
            refs.loader.classList.add('hidden');
            
            // Info
            refs.title.textContent = product.title;
            refs.price.textContent = formatMoney(product.price);
            
            // Check for tags to show/hide size chart
            const tags = (product.tags || []).map(t => t.toLowerCase());
            const looksLikeRing = tags.some(t => t.includes('ring'));
            if(refs.sizeChartTrigger) {
                refs.sizeChartTrigger.style.display = looksLikeRing ? 'inline-block' : 'none';
            }
            
            // Images
            images = product.images;
            activeImageIndex = 0;
            updateImage();

            // Variants
            // Assuming single option (Size) as per design references usually
            // but we should handle if there are multiple.
            // For simplicity/requirement "variants > 1", we just list all variants.
            // If there's 1 option, we display values. 
            // If multiple options, we might need complex selectors. 
            // Design shows "Size: M, L, XL". Let's assume Option 1 is the main one to pick.
            
            const option1Base = product.options[0]?.name || 'Option';
            refs.optionNameLabel.textContent = option1Base;

            refs.variantsContainer.innerHTML = '';
            
            let firstAvailableBtn = null;

            product.variants.forEach((variant, index) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `border border-gray-300 rounded px-3 py-2 text-sm font-medium hover:border-black transition-colors ${!variant.available ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`;
                btn.textContent = variant.title; 
                
                if (!variant.available) {
                  // btn.disabled = true; // Allow clicking out of stock to see price? Design choice. usually disabled for simple flow.
                  // Keeping disabled as per original code, but finding first available.
                  // If all unavailable, we might want to select first one anyway or keep unselected.
                  // Let's stick to user request "select a variant by default".
                }

                btn.addEventListener('click', () => {
                    if(!variant.available) return; // Prevent selection if disabled behavior desired
                    selectVariant(variant, btn);
                });
                
                refs.variantsContainer.appendChild(btn);

                // Track first available
                if (variant.available && !firstAvailableBtn) {
                    firstAvailableBtn = { variant, btn };
                }
            });

            // Auto-select first available variant
            if (firstAvailableBtn) {
                selectVariant(firstAvailableBtn.variant, firstAvailableBtn.btn);
            } else if (product.variants.length > 0) {
                 // Fallback: if all out of stock, maybe select first one just to show info? 
                 // Or leave blank. Let's select first one but button will be disabled effectively if we didn't disable strictly.
                 // Actually, in the loop above I removed the strict `btn.disabled = true` logic to allow custom handling, 
                 // but let's restore it or handle it. 
                 // User said "select a variant by default". 
                 // Let's assume there is at least one available. 
                 // If NOT, we select the first one anyway so UI isn't empty.
                 const firstBtn = refs.variantsContainer.firstChild;
                 selectVariant(product.variants[0], firstBtn);
            }
        }

        function selectVariant(variant, btn) {
            selectedVariantId = variant.id;
            
            // Update UI
            document.querySelectorAll('[data-variants-container] button').forEach(b => {
                b.classList.remove('bg-black', 'text-white', 'border-black');
                b.classList.add('bg-white', 'text-gray-900', 'border-gray-300');
            });
            btn.classList.remove('bg-white', 'text-gray-900', 'border-gray-300');
            btn.classList.add('bg-black', 'text-white', 'border-black');

            // Update Price
            refs.price.textContent = formatMoney(variant.price);
            
            // Update Image if variant has one logic?
            // Usually variants are linked to images. But simple array logic for now.

            refs.addToCartBtn.disabled = false;
            refs.addToCartBtn.textContent = 'Add to Cart';
        }

        function updateImage() {
            if (images.length === 0) return;
            const src = images[activeImageIndex];
            refs.mainImage.src = src;
            refs.mainImage.classList.remove('opacity-0');
            
            // Update dots
            // Simplified dots
            refs.dotsContainer.innerHTML = '';
            if (images.length > 1) {
                images.forEach((_, idx) => {
                    const dot = document.createElement('div');
                    dot.className = `w-2 h-2 rounded-full transition-colors ${idx === activeImageIndex ? 'bg-black' : 'bg-gray-300'}`;
                    refs.dotsContainer.appendChild(dot);
                });
            }
        }

        function changeImage(dir) {
            if (images.length === 0) return;
            activeImageIndex = (activeImageIndex + dir + images.length) % images.length;
            updateImage();
        }

        function handleAddToCart() {
            if (!selectedVariantId) return;
            
            // Use existing CartHandler logic via triggering a fake click or calling directly?
            // CartHandler.addToCart expects a button and FormData.
            const formData = new FormData();
            formData.append('id', selectedVariantId);
            formData.append('quantity', 1);

            // Fake button for visual feedback logic inside Handler if we reuse it
            // Or implementing custom here.
            // Let's implement custom simple fetch here and leverage CartHandler.updateCartState if exposed
            // OR reuse CartHandler.addToCart by creating a proxy object that mimics the button interface.
            
            // Reusing CartHandler.addToCart is safest to sync with drawer opener.
            // Mock button
            const mockBtn = refs.addToCartBtn; 
            
            // We need to ensure CartHandler is globally available. It is defined in 'cart-handler.js'.
            if (window.CartHandler) {
                window.CartHandler.addToCart(mockBtn, formData);
                // Close picker after short delay? Usually CartHandler opens drawer.
                // We should close picker immediately or after success.
                // CartHandler success callback isn't exposed.
                // But CartHandler opens drawer. Having both open is messy on mobile (stacked).
                // Let's listen for 'cart:updated' event or similar if it exists/we add it.
                // Or just close immediately.
                close(); 
            } else {
                console.error('CartHandler not found');
            }
        }

        function formatMoney(cents) {
            return 'Rs. ' + (cents / 100).toFixed(2);
        }

        // Auto init
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }

        return {
            open: open,
            close: close
        };
    })();
}
