/**
 * ============================================================================
 * Pro Image Slider - High-Performance, Accessible & Secure Slider Logic
 * ============================================================================
 * 
 * Security Highlights:
 * 1. Zero unsanitized innerHTML: All DOM elements and text nodes are created
 *    strictly via safe DOM methods (createElement, textContent, setAttribute).
 * 2. Strict MIME Type & Extension Whitelisting: Rejects non-image files and
 *    potentially harmful SVG scripts.
 * 3. Memory Leak Prevention: All Object URLs created via URL.createObjectURL are
 *    tracked in a Set and systematically revoked on deletion and window unload.
 * 4. ReDoS Immunity: Search filters use plain substring matching (String#includes)
 *    rather than dynamic Regular Expressions.
 * 5. Safe Link / Download handling: Validates protocol schemes before navigation.
 * 6. Resource Limits: Caps file count and individual file sizes to prevent DoS.
 */

'use strict';

// IIFE to prevent global namespace pollution
(function () {
    // --- Configuration & Constants ---
    const CONFIG = {
        AUTOPLAY_INTERVAL: 4500, // 4.5 seconds per slide
        MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024, // 25 MB max per file
        MAX_TOTAL_SLIDES: 50,
        ALLOWED_MIME_TYPES: new Set([
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'image/avif'
        ]),
        ALLOWED_EXTENSIONS: new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']),
        DEFAULT_TRANSITION: 'slide', // 'slide' | 'fade' | 'zoom'
        FALLBACK_IMAGE: 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22600%22%20height%3D%22400%22%20viewBox%3D%220%200%20600%20400%22%3E%3Crect%20fill%3D%22%231f2937%22%20width%3D%22600%22%20height%3D%22400%22%2F%3E%3Ctext%20fill%3D%22%2394a3b8%22%20font-family%3D%22sans-serif%22%20font-size%3D%2220%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%3EImage%20Unavailable%3C%2Ftext%3E%3C%2Fsvg%3E'
    };

    // Curated high quality sample photography (Unsplash optimized CDN URLs)
    const SAMPLE_IMAGES = [
        {
            title: 'Alpine Lake & Serene Peaks',
            url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&auto=format&fit=crop&q=80',
            source: 'Unsplash Curated',
            isBlob: false
        },
        {
            title: 'Golden Sunset at Tropical Beach',
            url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80',
            source: 'Unsplash Curated',
            isBlob: false
        },
        {
            title: 'Misty Evergreen Pine Forest',
            url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&auto=format&fit=crop&q=80',
            source: 'Unsplash Curated',
            isBlob: false
        },
        {
            title: 'Dancing Emerald Aurora Borealis',
            url: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?w=1600&auto=format&fit=crop&q=80',
            source: 'Unsplash Curated',
            isBlob: false
        },
        {
            title: 'Endless Golden Sahara Dunes',
            url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1600&auto=format&fit=crop&q=80',
            source: 'Unsplash Curated',
            isBlob: false
        }
    ];

    // --- Application State ---
    let slides = [];
    let currentIndex = 0;
    let transitionEffect = CONFIG.DEFAULT_TRANSITION;
    let isAutoplayPlaying = false;
    let autoplayTimer = null;
    let progressStartTime = 0;
    let progressAnimationId = null;
    let isHovering = false;
    let createdBlobUrls = new Set();
    let searchQuery = '';

    // Drag / Touch gesture state
    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;
    let mouseStartX = 0;
    let isMouseDown = false;

    // --- DOM Elements ---
    const elements = {
        // Navbar
        searchInput: document.getElementById('searchInput'),
        clearSearchBtn: document.getElementById('clearSearchBtn'),
        loadSamplesBtn: document.getElementById('loadSamplesBtn'),
        shortcutsBtn: document.getElementById('shortcutsBtn'),
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        themeIcon: document.getElementById('themeIcon'),

        // Upload
        dropZone: document.getElementById('dropZone'),
        fileInput: document.getElementById('fileInput'),

        // Slider Toolbar
        currentSlideTitle: document.getElementById('currentSlideTitle'),
        currentSlideDetails: document.getElementById('currentSlideDetails'),
        transitionSelect: document.getElementById('transitionSelect'),
        autoplayToggleBtn: document.getElementById('autoplayToggleBtn'),
        autoplayIcon: document.getElementById('autoplayIcon'),
        autoplayText: document.getElementById('autoplayText'),
        fullscreenBtn: document.getElementById('fullscreenBtn'),
        fullscreenIcon: document.getElementById('fullscreenIcon'),
        downloadBtn: document.getElementById('downloadBtn'),
        deleteBtn: document.getElementById('deleteBtn'),

        // Slider Viewport & Controls
        sliderWrapper: document.getElementById('sliderWrapper'),
        sliderViewport: document.getElementById('sliderViewport'),
        sliderTrack: document.getElementById('sliderTrack'),
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        slideCounter: document.getElementById('slideCounter'),
        progressBar: document.getElementById('progressBar'),
        sliderDots: document.getElementById('sliderDots'),
        thumbnailsTrack: document.getElementById('thumbnailsTrack'),
        emptyState: document.getElementById('emptyState'),
        reloadSamplesEmptyBtn: document.getElementById('reloadSamplesEmptyBtn'),

        // Toast & Modals
        toastContainer: document.getElementById('toastContainer'),
        shortcutsModal: document.getElementById('shortcutsModal'),
        closeModalBtn: document.getElementById('closeModalBtn'),
        modalOkBtn: document.getElementById('modalOkBtn')
    };

    // --- Utility: Safe Toast Notifications ---
    function showToast(message, type = 'info', duration = 3500) {
        if (!elements.toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');

        // Safe icon creation
        const iconSpan = document.createElement('span');
        iconSpan.className = 'toast-icon';
        const icon = document.createElement('i');
        
        if (type === 'error') {
            icon.setAttribute('data-lucide', 'alert-circle');
        } else if (type === 'success') {
            icon.setAttribute('data-lucide', 'check-circle-2');
        } else {
            icon.setAttribute('data-lucide', 'info');
        }
        iconSpan.appendChild(icon);
        toast.appendChild(iconSpan);

        // Safe text assignment (never innerHTML)
        const textSpan = document.createElement('span');
        textSpan.textContent = String(message);
        toast.appendChild(textSpan);

        elements.toastContainer.appendChild(toast);
        refreshLucideIcons();

        // Animate out and remove
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    // --- Lucide Icons Refresh Helper ---
    function refreshLucideIcons() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    // --- Security Helper: Sanitize & Validate URLs ---
    function isSafeUrl(url) {
        if (typeof url !== 'string') return false;
        const trimmed = url.trim().toLowerCase();
        return (
            trimmed.startsWith('https://') ||
            trimmed.startsWith('http://') ||
            trimmed.startsWith('blob:') ||
            trimmed.startsWith('data:image/')
        );
    }

    // --- Security Helper: Validate File ---
    function validateFile(file) {
        if (!file || !(file instanceof File)) {
            return { valid: false, reason: 'Invalid file object.' };
        }

        // Check MIME type
        if (!CONFIG.ALLOWED_MIME_TYPES.has(file.type)) {
            return { 
                valid: false, 
                reason: `Unsupported format (${file.type || 'unknown'}). Supported: JPG, PNG, WEBP, GIF, AVIF.` 
            };
        }

        // Check file extension
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!ext || !CONFIG.ALLOWED_EXTENSIONS.has(ext)) {
            return { valid: false, reason: `Disallowed extension (.${ext}).` };
        }

        // Check file size limit
        if (file.size > CONFIG.MAX_FILE_SIZE_BYTES) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
            return { valid: false, reason: `File "${file.name}" (${sizeMB}MB) exceeds 25MB limit.` };
        }

        return { valid: true };
    }

    // --- Memory Cleanup: Revoke Blob URLs ---
    function revokeBlobUrl(url) {
        if (createdBlobUrls.has(url)) {
            try {
                URL.revokeObjectURL(url);
                createdBlobUrls.delete(url);
            } catch (err) {
                console.warn('Error revoking ObjectURL:', err);
            }
        }
    }

    function revokeAllBlobUrls() {
        createdBlobUrls.forEach(url => {
            try {
                URL.revokeObjectURL(url);
            } catch (err) {}
        });
        createdBlobUrls.clear();
    }

    // --- Search Filter Helper (ReDoS Safe) ---
    function getFilteredSlides() {
        if (!searchQuery) return slides;
        const query = searchQuery.toLowerCase();
        return slides.filter(slide => slide.title.toLowerCase().includes(query));
    }

    // --- Render Slider DOM Safely ---
    function render() {
        const filtered = getFilteredSlides();
        const hasSlides = filtered.length > 0;

        // Toggle Empty State Visibility
        if (elements.emptyState) {
            elements.emptyState.hidden = hasSlides;
        }
        if (elements.sliderWrapper) {
            elements.sliderWrapper.style.display = hasSlides ? 'block' : 'none';
        }
        if (elements.thumbnailsTrack) {
            elements.thumbnailsTrack.parentElement.style.display = hasSlides ? 'block' : 'none';
        }

        // Disable toolbar buttons when empty
        [elements.autoplayToggleBtn, elements.downloadBtn, elements.deleteBtn, elements.fullscreenBtn]
            .forEach(btn => {
                if (btn) btn.disabled = !hasSlides;
            });

        if (!hasSlides) {
            if (elements.currentSlideTitle) elements.currentSlideTitle.textContent = searchQuery ? 'No matching images' : 'No images';
            if (elements.currentSlideDetails) elements.currentSlideDetails.textContent = searchQuery ? 'Try another search query' : 'Upload images to start';
            if (elements.sliderTrack) elements.sliderTrack.replaceChildren();
            if (elements.sliderDots) elements.sliderDots.replaceChildren();
            if (elements.thumbnailsTrack) elements.thumbnailsTrack.replaceChildren();
            pauseAutoplay();
            return;
        }

        // Bounds check on currentIndex
        if (currentIndex >= filtered.length) {
            currentIndex = 0;
        } else if (currentIndex < 0) {
            currentIndex = filtered.length - 1;
        }

        // Render Slides into Slider Track
        elements.sliderTrack.replaceChildren();
        elements.sliderTrack.className = `slider-track mode-${transitionEffect}`;

        filtered.forEach((item, index) => {
            const slideEl = document.createElement('div');
            slideEl.className = 'slide';
            slideEl.setAttribute('role', 'group');
            slideEl.setAttribute('aria-roledescription', 'slide');
            slideEl.setAttribute('aria-label', `${index + 1} of ${filtered.length}`);

            if (index === currentIndex) {
                slideEl.classList.add('active');
            }

            const img = document.createElement('img');
            img.className = 'slide-img';
            img.src = isSafeUrl(item.url) ? item.url : CONFIG.FALLBACK_IMAGE;
            img.alt = item.title || `Slide ${index + 1}`;
            img.loading = index === 0 ? 'eager' : 'lazy';
            img.decoding = 'async';
            img.draggable = false;

            // Safe fallback on load error
            img.addEventListener('error', function () {
                if (this.src !== CONFIG.FALLBACK_IMAGE) {
                    this.src = CONFIG.FALLBACK_IMAGE;
                }
            });

            // Slide Caption Overlay
            const caption = document.createElement('div');
            caption.className = 'slide-caption-overlay';

            const capTitle = document.createElement('h4');
            capTitle.className = 'slide-caption-title';
            capTitle.textContent = item.title;

            const capSub = document.createElement('span');
            capSub.className = 'slide-caption-subtitle';
            capSub.textContent = item.source || 'Gallery Image';

            caption.appendChild(capTitle);
            caption.appendChild(capSub);

            slideEl.appendChild(img);
            slideEl.appendChild(caption);
            elements.sliderTrack.appendChild(slideEl);
        });

        // Apply slide transition translation if in slide mode
        if (transitionEffect === 'slide') {
            elements.sliderTrack.style.transform = `translateX(-${currentIndex * 100}%)`;
        } else {
            elements.sliderTrack.style.transform = '';
        }

        // Render Dots Pagination
        renderDots(filtered.length);

        // Render Thumbnails Strip
        renderThumbnails(filtered);

        // Update Meta and Counters
        updateMetadata(filtered);
    }

    // --- Render Pagination Dots ---
    function renderDots(totalCount) {
        if (!elements.sliderDots) return;
        elements.sliderDots.replaceChildren();

        for (let i = 0; i < totalCount; i++) {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = `dot-btn ${i === currentIndex ? 'active' : ''}`;
            dot.setAttribute('role', 'tab');
            dot.setAttribute('aria-selected', i === currentIndex ? 'true' : 'false');
            dot.setAttribute('aria-label', `Go to slide ${i + 1}`);

            dot.addEventListener('click', () => {
                goToSlide(i);
                resetAutoplayTimer();
            });

            elements.sliderDots.appendChild(dot);
        }
    }

    // --- Render Thumbnails Strip ---
    function renderThumbnails(filteredList) {
        if (!elements.thumbnailsTrack) return;
        elements.thumbnailsTrack.replaceChildren();

        filteredList.forEach((item, index) => {
            const thumb = document.createElement('div');
            thumb.className = `thumb-item ${index === currentIndex ? 'active' : ''}`;
            thumb.setAttribute('role', 'tab');
            thumb.setAttribute('aria-selected', index === currentIndex ? 'true' : 'false');
            thumb.setAttribute('aria-label', `Thumbnail ${index + 1}: ${item.title}`);
            thumb.tabIndex = 0;

            const thumbImg = document.createElement('img');
            thumbImg.src = isSafeUrl(item.url) ? item.url : CONFIG.FALLBACK_IMAGE;
            thumbImg.alt = '';
            thumbImg.loading = 'lazy';

            thumbImg.addEventListener('error', function () {
                if (this.src !== CONFIG.FALLBACK_IMAGE) {
                    this.src = CONFIG.FALLBACK_IMAGE;
                }
            });

            thumb.appendChild(thumbImg);

            // Click & keyboard activation
            const selectThumbnail = () => {
                goToSlide(index);
                resetAutoplayTimer();
            };

            thumb.addEventListener('click', selectThumbnail);
            thumb.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectThumbnail();
                }
            });

            elements.thumbnailsTrack.appendChild(thumb);
        });

        // Center active thumbnail in scroll view
        const activeThumb = elements.thumbnailsTrack.children[currentIndex];
        if (activeThumb && typeof activeThumb.scrollIntoView === 'function') {
            activeThumb.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest'
            });
        }
    }

    // --- Update Metadata & Header Titles ---
    function updateMetadata(filteredList) {
        const currentItem = filteredList[currentIndex];
        if (!currentItem) return;

        if (elements.currentSlideTitle) {
            elements.currentSlideTitle.textContent = currentItem.title;
        }

        if (elements.currentSlideDetails) {
            const detailsText = currentItem.fileDetails 
                ? `${currentItem.fileDetails} • Slide ${currentIndex + 1} of ${filteredList.length}`
                : `${currentItem.source || 'Curated'} • Slide ${currentIndex + 1} of ${filteredList.length}`;
            elements.currentSlideDetails.textContent = detailsText;
        }

        if (elements.slideCounter) {
            elements.slideCounter.textContent = `${currentIndex + 1} / ${filteredList.length}`;
        }
    }

    // --- Navigation Actions ---
    function goToSlide(newIndex) {
        const filtered = getFilteredSlides();
        if (filtered.length <= 1) return;

        currentIndex = (newIndex + filtered.length) % filtered.length;

        // Apply slide changes with minimal DOM churn
        if (transitionEffect === 'slide') {
            elements.sliderTrack.style.transform = `translateX(-${currentIndex * 100}%)`;
        } else {
            // Fade or Zoom: Toggle active class
            Array.from(elements.sliderTrack.children).forEach((child, i) => {
                child.classList.toggle('active', i === currentIndex);
            });
        }

        // Update Dots
        if (elements.sliderDots) {
            Array.from(elements.sliderDots.children).forEach((dot, i) => {
                dot.classList.toggle('active', i === currentIndex);
                dot.setAttribute('aria-selected', i === currentIndex ? 'true' : 'false');
            });
        }

        // Update Thumbnails
        if (elements.thumbnailsTrack) {
            Array.from(elements.thumbnailsTrack.children).forEach((thumb, i) => {
                thumb.classList.toggle('active', i === currentIndex);
                thumb.setAttribute('aria-selected', i === currentIndex ? 'true' : 'false');
            });

            const activeThumb = elements.thumbnailsTrack.children[currentIndex];
            if (activeThumb) {
                activeThumb.scrollIntoView({
                    behavior: 'smooth',
                    inline: 'center',
                    block: 'nearest'
                });
            }
        }

        updateMetadata(filtered);
    }

    function nextSlide() {
        goToSlide(currentIndex + 1);
    }

    function prevSlide() {
        goToSlide(currentIndex - 1);
    }

    // --- Autoplay & Progress Bar Engine ---
    function startAutoplay() {
        if (isAutoplayPlaying) return;
        const filtered = getFilteredSlides();
        if (filtered.length <= 1) return;

        isAutoplayPlaying = true;
        updateAutoplayUI(true);
        resetProgressBar();

        autoplayTimer = setInterval(() => {
            if (!isHovering) {
                nextSlide();
                resetProgressBar();
            }
        }, CONFIG.AUTOPLAY_INTERVAL);

        startProgressAnimation();
    }

    function pauseAutoplay() {
        isAutoplayPlaying = false;
        updateAutoplayUI(false);

        if (autoplayTimer) {
            clearInterval(autoplayTimer);
            autoplayTimer = null;
        }

        if (progressAnimationId) {
            cancelAnimationFrame(progressAnimationId);
            progressAnimationId = null;
        }

        if (elements.progressBar) {
            elements.progressBar.style.width = '0%';
        }
    }

    function toggleAutoplay() {
        if (isAutoplayPlaying) {
            pauseAutoplay();
            showToast('Autoplay paused', 'info', 2000);
        } else {
            startAutoplay();
            showToast('Autoplay started', 'success', 2000);
        }
    }

    function resetAutoplayTimer() {
        if (isAutoplayPlaying) {
            clearInterval(autoplayTimer);
            autoplayTimer = setInterval(() => {
                if (!isHovering) {
                    nextSlide();
                    resetProgressBar();
                }
            }, CONFIG.AUTOPLAY_INTERVAL);
            resetProgressBar();
        }
    }

    function resetProgressBar() {
        progressStartTime = performance.now();
        if (elements.progressBar) {
            elements.progressBar.style.width = '0%';
        }
    }

    function startProgressAnimation() {
        progressStartTime = performance.now();

        function frame(now) {
            if (!isAutoplayPlaying) return;

            if (!isHovering) {
                const elapsed = now - progressStartTime;
                const percentage = Math.min(100, (elapsed / CONFIG.AUTOPLAY_INTERVAL) * 100);
                if (elements.progressBar) {
                    elements.progressBar.style.width = `${percentage}%`;
                }
            } else {
                // Keep progress start time offset when hovering
                progressStartTime = now;
            }

            progressAnimationId = requestAnimationFrame(frame);
        }

        progressAnimationId = requestAnimationFrame(frame);
    }

    function updateAutoplayUI(isPlaying) {
        if (elements.autoplayToggleBtn) {
            elements.autoplayToggleBtn.classList.toggle('active', isPlaying);
        }
        if (elements.autoplayText) {
            elements.autoplayText.textContent = isPlaying ? 'Pause' : 'Play';
        }
        if (elements.autoplayIcon) {
            elements.autoplayIcon.setAttribute('data-lucide', isPlaying ? 'pause' : 'play');
            refreshLucideIcons();
        }
    }

    // --- Safe File Ingestion ---
    function handleFiles(fileList) {
        if (!fileList || fileList.length === 0) return;

        const incomingFiles = Array.from(fileList);
        let acceptedCount = 0;
        let rejectedReasons = [];

        // Capacity check
        if (slides.length + incomingFiles.length > CONFIG.MAX_TOTAL_SLIDES) {
            const allowCount = CONFIG.MAX_TOTAL_SLIDES - slides.length;
            if (allowCount <= 0) {
                showToast(`Slider capacity reached (max ${CONFIG.MAX_TOTAL_SLIDES} images). Delete some before uploading more.`, 'error');
                return;
            }
            showToast(`Adding only ${allowCount} file(s) to stay within the limit of ${CONFIG.MAX_TOTAL_SLIDES}.`, 'warning');
            incomingFiles.splice(allowCount);
        }

        incomingFiles.forEach(file => {
            const validation = validateFile(file);
            if (!validation.valid) {
                rejectedReasons.push(validation.reason);
                return;
            }

            // Create memory-managed Blob URL
            const blobUrl = URL.createObjectURL(file);
            createdBlobUrls.add(blobUrl);

            // Clean, friendly title from sanitized filename
            const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            const fileSizeStr = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

            slides.push({
                title: cleanTitle || 'Uploaded Image',
                url: blobUrl,
                source: 'User Upload',
                fileDetails: `${file.type.split('/')[1].toUpperCase()} • ${fileSizeStr}`,
                isBlob: true
            });

            acceptedCount++;
        });

        if (rejectedReasons.length > 0) {
            showToast(rejectedReasons[0], 'error', 4500);
        }

        if (acceptedCount > 0) {
            showToast(`Successfully added ${acceptedCount} image${acceptedCount > 1 ? 's' : ''}!`, 'success');
            // Jump to first newly added slide
            currentIndex = slides.length - acceptedCount;
            render();
            resetAutoplayTimer();
        }
    }

    // --- Delete Current Slide ---
    function deleteCurrentSlide() {
        const filtered = getFilteredSlides();
        if (filtered.length === 0) return;

        const targetSlide = filtered[currentIndex];
        if (!targetSlide) return;

        // Revoke ObjectURL to free RAM
        if (targetSlide.isBlob) {
            revokeBlobUrl(targetSlide.url);
        }

        // Remove from master slides list
        const masterIndex = slides.indexOf(targetSlide);
        if (masterIndex !== -1) {
            slides.splice(masterIndex, 1);
        }

        // Update currentIndex if needed
        const newFiltered = getFilteredSlides();
        if (currentIndex >= newFiltered.length) {
            currentIndex = Math.max(0, newFiltered.length - 1);
        }

        showToast(`Slide removed`, 'info', 2000);
        render();
        resetAutoplayTimer();
    }

    // --- Download Current Slide Safely ---
    function downloadCurrentSlide() {
        const filtered = getFilteredSlides();
        if (filtered.length === 0) return;

        const current = filtered[currentIndex];
        if (!current || !isSafeUrl(current.url)) {
            showToast('Unable to download this image.', 'error');
            return;
        }

        try {
            const safeName = current.title.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
            const a = document.createElement('a');
            a.href = current.url;
            a.download = `${safeName || 'slider-image'}.jpg`;
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showToast('Download started', 'success', 2000);
        } catch (err) {
            showToast('Download failed. Image might be protected by CORS.', 'error');
        }
    }

    // --- Fullscreen Toggle ---
    function toggleFullscreen() {
        const elem = elements.sliderViewport;
        if (!elem) return;

        if (!document.fullscreenElement) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen().catch(err => {
                    showToast('Fullscreen mode blocked: ' + err.message, 'error');
                });
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    // --- Load Sample Images ---
    function loadSamples() {
        // Cleanup old blob URLs if any
        revokeAllBlobUrls();

        slides = SAMPLE_IMAGES.map(img => ({ ...img }));
        currentIndex = 0;
        searchQuery = '';
        if (elements.searchInput) elements.searchInput.value = '';
        if (elements.clearSearchBtn) elements.clearSearchBtn.hidden = true;

        showToast('Sample gallery loaded!', 'success', 2500);
        render();
        resetAutoplayTimer();
    }

    // --- Theme Management ---
    function initTheme() {
        const savedTheme = localStorage.getItem('slider_theme') || 
            (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
        
        applyTheme(savedTheme);
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            localStorage.setItem('slider_theme', theme);
        } catch (e) {}

        if (elements.themeIcon) {
            elements.themeIcon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
            refreshLucideIcons();
        }
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    }

    // --- Gesture & Swipe Listeners ---
    function setupGestureHandlers() {
        const vp = elements.sliderViewport;
        if (!vp) return;

        // Touch handling (Mobile)
        vp.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                isSwiping = true;
            }
        }, { passive: true });

        vp.addEventListener('touchend', (e) => {
            if (!isSwiping) return;
            isSwiping = false;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;

            // Ensure horizontal swipe is dominant
            if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX < 0) {
                    nextSlide();
                } else {
                    prevSlide();
                }
                resetAutoplayTimer();
            }
        }, { passive: true });

        // Mouse drag handling (Desktop)
        vp.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Left click only
            isMouseDown = true;
            mouseStartX = e.clientX;
        });

        window.addEventListener('mouseup', (e) => {
            if (!isMouseDown) return;
            isMouseDown = false;
            const diffX = e.clientX - mouseStartX;
            if (Math.abs(diffX) > 60) {
                if (diffX < 0) {
                    nextSlide();
                } else {
                    prevSlide();
                }
                resetAutoplayTimer();
            }
        });

        // Hover pause logic
        vp.addEventListener('mouseenter', () => {
            isHovering = true;
        });

        vp.addEventListener('mouseleave', () => {
            isHovering = false;
        });
    }

    // --- Drag & Drop Upload Zone Setup ---
    function setupDropZone() {
        const dropZone = elements.dropZone;
        const fileInput = elements.fileInput;
        if (!dropZone || !fileInput) return;

        // Click to browse
        dropZone.addEventListener('click', () => fileInput.click());

        // Keyboard Enter / Space
        dropZone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput.click();
            }
        });

        // Change event
        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
            // Reset input value so same file can be re-uploaded if desired
            fileInput.value = '';
        });

        // Drag & Drop events on DropZone
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('dragover');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt && dt.files && dt.files.length > 0) {
                handleFiles(dt.files);
            }
        });

        // Also allow dropping directly on the slider viewport
        const vp = elements.sliderViewport;
        if (vp) {
            ['dragenter', 'dragover'].forEach(evt => {
                vp.addEventListener(evt, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });
            vp.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer && e.dataTransfer.files) {
                    handleFiles(e.dataTransfer.files);
                }
            });
        }
    }

    // --- Search Setup (ReDoS Safe) ---
    function setupSearch() {
        const searchInput = elements.searchInput;
        const clearBtn = elements.clearSearchBtn;
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            if (clearBtn) {
                clearBtn.hidden = searchQuery.length === 0;
            }
            currentIndex = 0;
            render();
            resetAutoplayTimer();
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                searchQuery = '';
                clearBtn.hidden = true;
                currentIndex = 0;
                render();
                resetAutoplayTimer();
                searchInput.focus();
            });
        }
    }

    // --- Keyboard Shortcuts Setup ---
    function setupKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            // Ignore when typing inside input elements or select boxes
            const targetTag = e.target.tagName.toLowerCase();
            if (targetTag === 'input' || targetTag === 'select' || targetTag === 'textarea') {
                if (e.key === 'Escape' && elements.searchInput) {
                    elements.searchInput.blur();
                }
                return;
            }

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    prevSlide();
                    resetAutoplayTimer();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    nextSlide();
                    resetAutoplayTimer();
                    break;
                case ' ':
                    e.preventDefault();
                    toggleAutoplay();
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'Home':
                    e.preventDefault();
                    goToSlide(0);
                    resetAutoplayTimer();
                    break;
                case 'End':
                    e.preventDefault();
                    const filtered = getFilteredSlides();
                    goToSlide(filtered.length - 1);
                    resetAutoplayTimer();
                    break;
                case 'Delete':
                    e.preventDefault();
                    deleteCurrentSlide();
                    break;
                case '/':
                    e.preventDefault();
                    if (elements.searchInput) {
                        elements.searchInput.focus();
                        elements.searchInput.select();
                    }
                    break;
                case 'Escape':
                    if (elements.shortcutsModal && elements.shortcutsModal.open) {
                        elements.shortcutsModal.close();
                    }
                    break;
            }
        });
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // Prev / Next Arrows
        if (elements.prevBtn) {
            elements.prevBtn.addEventListener('click', () => {
                prevSlide();
                resetAutoplayTimer();
            });
        }

        if (elements.nextBtn) {
            elements.nextBtn.addEventListener('click', () => {
                nextSlide();
                resetAutoplayTimer();
            });
        }

        // Toolbar Buttons
        if (elements.autoplayToggleBtn) {
            elements.autoplayToggleBtn.addEventListener('click', toggleAutoplay);
        }

        if (elements.fullscreenBtn) {
            elements.fullscreenBtn.addEventListener('click', toggleFullscreen);
        }

        if (elements.downloadBtn) {
            elements.downloadBtn.addEventListener('click', downloadCurrentSlide);
        }

        if (elements.deleteBtn) {
            elements.deleteBtn.addEventListener('click', deleteCurrentSlide);
        }

        if (elements.loadSamplesBtn) {
            elements.loadSamplesBtn.addEventListener('click', loadSamples);
        }

        if (elements.reloadSamplesEmptyBtn) {
            elements.reloadSamplesEmptyBtn.addEventListener('click', loadSamples);
        }

        if (elements.themeToggleBtn) {
            elements.themeToggleBtn.addEventListener('click', toggleTheme);
        }

        // Transition Effect Selector
        if (elements.transitionSelect) {
            elements.transitionSelect.addEventListener('change', (e) => {
                transitionEffect = e.target.value;
                render();
            });
        }

        // Modal Dialog handlers
        if (elements.shortcutsBtn && elements.shortcutsModal) {
            elements.shortcutsBtn.addEventListener('click', () => {
                elements.shortcutsModal.showModal();
            });
        }

        if (elements.closeModalBtn && elements.shortcutsModal) {
            elements.closeModalBtn.addEventListener('click', () => {
                elements.shortcutsModal.close();
            });
        }

        if (elements.modalOkBtn && elements.shortcutsModal) {
            elements.modalOkBtn.addEventListener('click', () => {
                elements.shortcutsModal.close();
            });
        }

        // Close modal when clicking backdrop
        if (elements.shortcutsModal) {
            elements.shortcutsModal.addEventListener('click', (e) => {
                if (e.target === elements.shortcutsModal) {
                    elements.shortcutsModal.close();
                }
            });
        }

        // Fullscreen change listener to sync icon
        document.addEventListener('fullscreenchange', () => {
            const isFull = !!document.fullscreenElement;
            if (elements.fullscreenIcon) {
                elements.fullscreenIcon.setAttribute('data-lucide', isFull ? 'minimize' : 'maximize');
                refreshLucideIcons();
            }
        });

        // Visibility Change Listener: Pause autoplay when tab is inactive to save CPU
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (isAutoplayPlaying) {
                    pauseAutoplay();
                }
            }
        });

        // Window Unload: Clean up all created ObjectURLs to eliminate memory leaks
        window.addEventListener('beforeunload', () => {
            revokeAllBlobUrls();
        });

        // Setup sub-systems
        setupDropZone();
        setupGestureHandlers();
        setupSearch();
        setupKeyboardShortcuts();
    }

    // --- App Initialization ---
    function init() {
        initTheme();
        setupEventListeners();
        loadSamples(); // Populates with curated samples on startup
        refreshLucideIcons();
    }

    // Run on DOM Ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
