/**
 * Adds drag functionality to Jitsi video bubbles
 */
(function() {
    // Initialize after the page has loaded
    document.addEventListener('DOMContentLoaded', initDraggableBubbles);

    // Store the current dragging state
    let isDragging = false;
    let currentBubble = null;
    let offsetX = 0;
    let offsetY = 0;

    /**
     * Initialize the draggable functionality
     */
    function initDraggableBubbles() {
        console.log('Initializing draggable bubbles');

        // Run initial setup after a delay to ensure Jitsi components are loaded
        setTimeout(() => {
            setupDragHandlers();

            // Watch for DOM changes to handle dynamically added videos
            const observer = new MutationObserver(mutations => {
                for (const mutation of mutations) {
                    if (mutation.addedNodes.length) {
                        setupDragHandlers();
                    }
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Setup background selector
            initBackgroundSelector();

            // Hide the large video container
            const largeVideo = document.getElementById('largeVideoContainer');
            if (largeVideo) {
                largeVideo.style.display = 'none';
            }

            // Make sure we can click through overlays
            const overlays = document.querySelectorAll('#largeVideoElementsContainer, #videoNotAvailableScreen');
            overlays.forEach(overlay => {
                if (overlay) {
                    overlay.style.pointerEvents = 'none';
                }
            });
        }, 3000);

        // Continue checking periodically to make sure everything is set up
        setInterval(setupDragHandlers, 5000);
    }

    /**
     * Set up drag handlers for all video containers
     */
    function setupDragHandlers() {
        console.log('Setting up drag handlers');

        // Find all video containers
        const containers = document.querySelectorAll('.videocontainer');

        containers.forEach(container => {
            // Skip if already set up
            if (container.getAttribute('data-draggable') === 'true') {
                return;
            }

            console.log('Making container draggable:', container.id);

            // Mark as draggable
            container.setAttribute('data-draggable', 'true');

            // Ensure proper styling
            container.style.position = 'absolute';
            container.style.zIndex = '1000';
            container.style.cursor = 'move';
            container.style.pointerEvents = 'auto';

            // Get ID for position tracking
            const id = container.id || `video-${Math.random().toString(36).substring(2, 9)}`;

            // Restore or set initial position
            const savedPosition = getSavedPosition(id);
            if (savedPosition) {
                container.style.left = `${savedPosition.left}px`;
                container.style.top = `${savedPosition.top}px`;
            } else {
                // Random position
                const maxX = window.innerWidth - 150;
                const maxY = window.innerHeight - 150;
                const randomX = 50 + Math.random() * (maxX - 100);
                const randomY = 50 + Math.random() * (maxY - 100);

                container.style.left = `${randomX}px`;
                container.style.top = `${randomY}px`;

                // Save initial position
                savePosition(id, randomX, randomY);
            }

            // Add mouse event listeners
            container.addEventListener('mousedown', handleMouseDown);

            // Add touch event listeners for mobile
            container.addEventListener('touchstart', handleTouchStart, { passive: false });
            container.addEventListener('touchmove', handleTouchMove, { passive: false });
            container.addEventListener('touchend', handleTouchEnd);
        });
    }

    /**
     * Handle mouse down event to start dragging
     */
    function handleMouseDown(event) {
        // Don't interfere with clicks on buttons within the container
        if (event.target.tagName === 'BUTTON' ||
            event.target.tagName === 'A' ||
            event.target.closest('button') ||
            event.target.closest('a')) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const container = this;
        currentBubble = container;

        // Calculate offset
        const rect = container.getBoundingClientRect();
        offsetX = event.clientX - rect.left;
        offsetY = event.clientY - rect.top;

        isDragging = true;

        // Add dragging class for visual feedback
        container.classList.add('dragging');

        // Add move and end event listeners
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    /**
     * Handle mouse move event during dragging
     */
    function handleMouseMove(event) {
        if (!isDragging || !currentBubble) return;

        event.preventDefault();

        // Calculate new position
        const x = event.clientX - offsetX;
        const y = event.clientY - offsetY;

        // Update position
        moveElementWithinBounds(currentBubble, x, y);
    }

    /**
     * Handle mouse up event to end dragging
     */
    function handleMouseUp() {
        if (!isDragging || !currentBubble) return;

        isDragging = false;

        // Remove dragging class
        currentBubble.classList.remove('dragging');

        // Save final position
        const id = currentBubble.id || `video-${Math.random().toString(36).substring(2, 9)}`;
        savePosition(id, parseInt(currentBubble.style.left), parseInt(currentBubble.style.top));

        currentBubble = null;

        // Remove event listeners
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }

    /**
     * Handle touch start event for mobile
     */
    function handleTouchStart(event) {
        // Don't interfere with buttons/links
        if (event.target.tagName === 'BUTTON' ||
            event.target.tagName === 'A' ||
            event.target.closest('button') ||
            event.target.closest('a')) {
            return;
        }

        if (event.touches.length === 1) {
            event.preventDefault();
            event.stopPropagation();

            const container = this;
            currentBubble = container;

            const touch = event.touches[0];
            const rect = container.getBoundingClientRect();

            offsetX = touch.clientX - rect.left;
            offsetY = touch.clientY - rect.top;

            isDragging = true;
            container.classList.add('dragging');
        }
    }

    /**
     * Handle touch move event for mobile
     */
    function handleTouchMove(event) {
        if (!isDragging || !currentBubble) return;

        if (event.touches.length === 1) {
            event.preventDefault();

            const touch = event.touches[0];

            // Calculate new position
            const x = touch.clientX - offsetX;
            const y = touch.clientY - offsetY;

            // Update position
            moveElementWithinBounds(currentBubble, x, y);
        }
    }

    /**
     * Handle touch end event for mobile
     */
    function handleTouchEnd() {
        if (!isDragging || !currentBubble) return;

        isDragging = false;

        // Remove dragging class
        currentBubble.classList.remove('dragging');

        // Save final position
        const id = currentBubble.id || `video-${Math.random().toString(36).substring(2, 9)}`;
        savePosition(id, parseInt(currentBubble.style.left), parseInt(currentBubble.style.top));

        currentBubble = null;
    }

    /**
     * Move an element while keeping it within viewport bounds
     */
    function moveElementWithinBounds(element, x, y) {
        // Get element dimensions
        const width = element.offsetWidth;
        const height = element.offsetHeight;

        // Calculate bounds
        const maxX = window.innerWidth - width;
        const maxY = window.innerHeight - height;

        // Constrain position to viewport
        const boundedX = Math.max(0, Math.min(x, maxX));
        const boundedY = Math.max(0, Math.min(y, maxY));

        // Apply position
        element.style.left = `${boundedX}px`;
        element.style.top = `${boundedY}px`;
    }

    /**
     * Save position to localStorage
     */
    function savePosition(id, x, y) {
        try {
            const positions = JSON.parse(localStorage.getItem('bubblePositions') || '{}');
            positions[id] = { left: x, top: y };
            localStorage.setItem('bubblePositions', JSON.stringify(positions));
        } catch (e) {
            console.error('Failed to save position', e);
        }
    }

    /**
     * Get saved position from localStorage
     */
    function getSavedPosition(id) {
        try {
            const positions = JSON.parse(localStorage.getItem('bubblePositions') || '{}');
            return positions[id];
        } catch (e) {
            console.error('Failed to get saved position', e);
            return null;
        }
    }

    /**
     * Initialize the background selector
     */
    function initBackgroundSelector() {
        console.log('Initializing background selector');

        // Create background selector if it doesn't exist
        if (!document.querySelector('.background-selector')) {
            const selector = document.createElement('div');
            selector.className = 'background-selector';

            selector.innerHTML = `
                <h3>Background</h3>
                <div class="background-options">
                    <div class="background-option" style="background-color: white;" data-background="white"></div>
                    <div class="background-option" style="background-color: #e6f7ff;" data-background="#e6f7ff"></div>
                    <div class="background-option" style="background-color: #e6ffe6;" data-background="#e6ffe6"></div>
                    <div class="background-option" style="background-color: #f9e6ff;" data-background="#f9e6ff"></div>
                    <div class="background-option" style="background-color: #fff5e6;" data-background="#fff5e6"></div>
                    <div class="background-option" style="background-color: #ff9999;" data-background="#ff9999"></div>
                    <div class="background-option" style="background-color: #99ccff;" data-background="#99ccff"></div>
                    <div class="background-option" style="background-color: #cccccc;" data-background="#cccccc"></div>
                </div>
            `;

            document.body.appendChild(selector);

            // Add event listeners for background selection
            selector.querySelectorAll('.background-option').forEach(option => {
                option.addEventListener('click', function() {
                    const bgValue = this.getAttribute('data-background');
                    
                    // Apply to the entire page (html and body)
                    document.documentElement.style.backgroundColor = bgValue;
                    document.body.style.backgroundColor = bgValue;
                    
                    // Make sure all container elements are transparent
                    const containers = document.querySelectorAll('#videospace, #largeVideoContainer, .videocontainer');
                    containers.forEach(container => {
                        if (container) {
                            container.style.backgroundColor = 'transparent';
                        }
                    });

                    // Save selection
                    localStorage.setItem('selectedBackground', bgValue);
                });
            });

            // Load saved background
            const savedBg = localStorage.getItem('selectedBackground');
            if (savedBg) {
                // Apply to the entire page (html and body)
                document.documentElement.style.backgroundColor = savedBg;
                document.body.style.backgroundColor = savedBg;
                
                // Make sure all container elements are transparent
                const containers = document.querySelectorAll('#videospace, #largeVideoContainer, .videocontainer');
                containers.forEach(container => {
                    if (container) {
                        container.style.backgroundColor = 'transparent';
                    }
                });
            }
        }
    }
})();