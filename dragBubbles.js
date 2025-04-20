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

    // Track the last positioned container
    let lastTopPosition = 20; // Initial top margin
    const CONTAINER_MARGIN = 10; // Margin between containers

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

            // Hide the large video container and set up new container
            const newLargeVideoContainer = document.getElementById('newLargeVideoContainer');
            if (newLargeVideoContainer) {
                newLargeVideoContainer.style.display = 'none';
            }

            // Make sure we can click through overlays
            const overlays = document.querySelectorAll('#videoElementsContainer, #videoNotAvailableScreen');
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

            // Restore saved position or set initial position in top right
            const savedPosition = getSavedPosition(id);
            if (savedPosition) {
                container.style.left = `${savedPosition.left}px`;
                container.style.top = `${savedPosition.top}px`;
            } else {
                // Position in top right with stacking
                const containerWidth = container.offsetWidth || 150; // Default width if not set
                const rightPosition = window.innerWidth - containerWidth - 20; // 20px margin from right

                container.style.right = '20px'; // Fixed right margin
                container.style.left = `${rightPosition}px`;
                container.style.top = `${lastTopPosition}px`;

                // Update the top position for the next container
                lastTopPosition += (container.offsetHeight || 150) + CONTAINER_MARGIN;

                // Save initial position
                savePosition(id, rightPosition, lastTopPosition);
            }

            // Reset lastTopPosition if it gets too low
            if (lastTopPosition > window.innerHeight - 200) {
                lastTopPosition = 20;
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

        // Get the videospace element for boundaries
        const videospace = document.getElementById('videospace');
        const videospaceRect = videospace ? videospace.getBoundingClientRect() : null;

        // If videospace exists, use its boundaries
        if (videospaceRect) {
            const boundedX = Math.max(videospaceRect.left, Math.min(x, videospaceRect.right - width));
            const boundedY = Math.max(videospaceRect.top, Math.min(y, videospaceRect.bottom - height));
            element.style.left = `${boundedX}px`;
            element.style.top = `${boundedY}px`;
        } else {
            // Fallback to viewport bounds
            const boundedX = Math.max(0, Math.min(x, maxX));
            const boundedY = Math.max(0, Math.min(y, maxY));
            element.style.left = `${boundedX}px`;
            element.style.top = `${boundedY}px`;
        }
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

            // Insert the selector into the videospace
            const videospace = document.getElementById('videospace');
            if (videospace) {
                videospace.appendChild(selector);
            } else {
                document.body.appendChild(selector);
            }

            // Add event listeners for background selection
            selector.querySelectorAll('.background-option').forEach(option => {
                option.addEventListener('click', function() {
                    const bgValue = this.getAttribute('data-background');
                    
                    // Apply to the videospace
                    const videospace = document.getElementById('videospace');
                    if (videospace) {
                        videospace.style.backgroundColor = bgValue;
                    }
                    
                    // Make sure all container elements are transparent
                    const containers = document.querySelectorAll('#newLargeVideoContainer, .videocontainer');
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
                // Apply to the videospace
                const videospace = document.getElementById('videospace');
                if (videospace) {
                    videospace.style.backgroundColor = savedBg;
                }
                
                // Make sure all container elements are transparent
                const containers = document.querySelectorAll('#newLargeVideoContainer, .videocontainer');
                containers.forEach(container => {
                    if (container) {
                        container.style.backgroundColor = 'transparent';
                    }
                });
            }
        }
    }

    /**
     * Reset the position tracking when window is resized
     */
    window.addEventListener('resize', () => {
        lastTopPosition = 20;
        setupDragHandlers();
    });
})();