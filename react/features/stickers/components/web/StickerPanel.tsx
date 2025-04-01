import React, { useEffect, useRef, useState } from 'react';
import { WithTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import { SearchComponent } from 'stipop-react-sdk';

import { IReduxState } from '../../../app/types';
import { translate } from '../../../base/i18n/functions';
import Icon from '../../../base/icons/components/Icon';
import { IconCloseLarge, IconSearch } from '../../../base/icons/svg';
import { hideDialog } from '../../../base/dialog/actions';
import Tabs from '../../../base/ui/components/web/Tabs';
import Input from '../../../base/ui/components/web/Input';
import Button from '../../../base/ui/components/web/Button';
import { BUTTON_TYPES } from '../../../base/ui/constants.any';
import { getCurrentConference } from '../../../base/conference/functions';
import { getLocalParticipant } from '../../../base/participants/functions';
import { 
    initBackgroundSync,
    isParticipantAdmin,
    hasBackgroundPermission,
    broadcastStickerAdd,
    broadcastStickerMove,
    broadcastStickerResize,
    broadcastStickerDelete
} from '../../../virtual-background/components/web/BackgroundPermissions';

interface IProps extends WithTranslation {
    /**
     * The redux dispatch function.
     */
    dispatch: Function;

    /**
     * The current conference object.
     */
    conference: any;

    /**
     * The local participant.
     */
    localParticipant: any;

    /**
     * Whether the user is an admin.
     */
    isAdmin: boolean;

    /**
     * Whether the user has permission to add stickers.
     */
    hasPermission: boolean;
}

// Sticker categories and their stickers
const STICKER_CATEGORIES = {
    emoji: ['😀', '😂', '😍', '🥳', '😎', '🤩', '🔥', '💯', '👍', '❤️', '🎉', '🌟', '🤔', '👋', '🙏', '👏', '🙌', '👀', '🤣', '😭'],
    animals: ['🐶', '🐱', '🐼', '🦊', '🦁', '🐯', '🐨', '🐮', '🐷', '🐸', '🐵', '🐔', '🦄', '🦋', '🐬', '🦈', '🐙', '🦜', '🦢', '🦥'],
    food: ['🍕', '🍔', '🍟', '🌭', '🍿', '🧁', '🍩', '🍦', '🍓', '🍉', '🍍', '🥑', '🍜', '🍣', '🍱', '🥤', '🍷', '🍸', '☕', '🍹'],
    activities: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎮', '🎯', '🎨', '🎬', '🎤', '🎸', '🎹', '🧩', '🎲', '🎭', '🚴', '🏄', '🏂', '🧗'],
    objects: ['💻', '📱', '⌚', '📷', '🎁', '🔑', '💡', '🔍', '📚', '✏️', '📌', '📎', '💼', '🧸', '👓', '👔', '👗', '👠', '🧢', '💍'],
    symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💯', '✨', '💫', '💥', '🔥', '⭐', '🌟', '✅']
};

// Sticker pack URLs - each pack is an array of image URLs
const STICKER_PACKS = {
    cute: [
        'https://cdn-icons-png.flaticon.com/512/6104/6104408.png',
        'https://cdn-icons-png.flaticon.com/512/6104/6104406.png',
        'https://cdn-icons-png.flaticon.com/512/6103/6103642.png',
        'https://cdn-icons-png.flaticon.com/512/6103/6103855.png',
        'https://cdn-icons-png.flaticon.com/512/6103/6103857.png',
        'https://cdn-icons-png.flaticon.com/512/6103/6103866.png',
        'https://cdn-icons-png.flaticon.com/512/6103/6103869.png',
        'https://cdn-icons-png.flaticon.com/512/6104/6104438.png'
    ],
    meme: [
        'https://cdn-icons-png.flaticon.com/512/742/742751.png',
        'https://cdn-icons-png.flaticon.com/512/742/742784.png',
        'https://cdn-icons-png.flaticon.com/512/742/742760.png',
        'https://cdn-icons-png.flaticon.com/512/742/742750.png',
        'https://cdn-icons-png.flaticon.com/512/742/742770.png',
        'https://cdn-icons-png.flaticon.com/512/742/742756.png',
        'https://cdn-icons-png.flaticon.com/512/742/742921.png',
        'https://cdn-icons-png.flaticon.com/512/742/742914.png'
    ],
    animated: [
        'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDF5OGd0a2EwNXhvZXl4YWFreTBlOWtqZWZnZ2QxZGU5bHRrbGdrZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/aagOTIq5QUvrO/200w.gif',
        'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGEyMG15MW5sMmJra2Zocnp0b3ZoeWh2Z3l3eXNxMTZ5cTVmbzl1MCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/5xtDarKaxbNRjKhGe2c/200w.gif',
        'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWEybTJ3NW1hcTFydDBkcjl5NjM1dGx3cGJiZ2R3cnNyeGpnc2FnaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/S9oNGC1E42VT2JRysv/200w.gif',
        'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzZkbnJpbWlqNGxpZXZxaWdjaHBldnQzYjdsZG00bGl1eWVqd204bCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/26FPqAHtgCBzKG9mo/200w.gif'
    ]
};

// Add Stipop SDK configuration
const STIPOP_CONFIG = {
    userId: '3f44775f69675def8957970deff659e5',
    language: 'en',
    countryCode: 'US',
    packageId: '3f44775f69675def8957970deff659e5',
    onStickerClick: (sticker: any) => {
        console.log('Sticker clicked:', sticker);
        // Handle sticker click
    }
};

// Available tabs for the sticker panel
enum StickersTab {
    EMOJI = 'emoji',
    GIPHY = 'giphy',
    STIPOP = 'stipop'
}

const useStyles = makeStyles()(theme => {
    return {
        panelContainer: {
            position: 'absolute',
            zIndex: 1001,
            width: '350px',
            top: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(42, 58, 75, 0.95)',
            borderRadius: '12px',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.5)',
            padding: '0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid rgba(255, 255, 255, 0.1)'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: 'rgba(30, 43, 58, 0.95)',
            color: 'white',
            fontWeight: 'bold',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            cursor: 'move'
        },
        closeButton: {
            color: 'white',
            cursor: 'pointer',
            padding: '4px',
            backgroundColor: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            transition: 'transform 0.2s',
            '&:hover': {
                transform: 'scale(1.1)'
            }
        },
        tabsContainer: {
            width: '100%',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        },
        contentContainer: {
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '16px',
            // Custom scrollbar styling
            '&::-webkit-scrollbar': {
                width: '6px'
            },
            '&::-webkit-scrollbar-track': {
                background: 'transparent'
            },
            '&::-webkit-scrollbar-thumb': {
                background: 'rgba(255, 255, 255, 0.3)',
                borderRadius: '3px'
            }
        },
        searchContainer: {
            display: 'flex',
            marginBottom: '12px',
            gap: '8px'
        },
        searchInput: {
            flex: 1,
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            padding: '8px 12px',
            fontSize: '14px',
            outline: 'none',
            '&:focus': {
                borderColor: 'rgba(255, 255, 255, 0.4)'
            }
        },
        categoriesRow: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '12px'
        },
        categoryButton: {
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 10px',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
                background: 'rgba(255, 255, 255, 0.2)'
            },
            '&.active': {
                background: 'rgba(73, 143, 225, 0.6)',
                fontWeight: 'bold'
            }
        },
        stickersContainer: {
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px'
        },
        stickerItem: {
            fontSize: '24px',
            width: '100%',
            aspectRatio: '1/1',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            '&:hover': {
                transform: 'scale(1.1)',
                background: 'rgba(255, 255, 255, 0.15)'
            }
        },
        giphyContainer: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px'
        },
        giphyItem: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(61, 76, 92, 0.5)',
            borderRadius: '8px',
            cursor: 'pointer',
            overflow: 'hidden',
            aspectRatio: '1/1',
            transition: 'transform 0.2s',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative',
            '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
            },
            '& img': {
                width: '100%',
                height: '100%',
                objectFit: 'cover'
            }
        },
        loadingContainer: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: 'white',
            padding: '20px'
        },
        stipopContainer: {
            height: '400px',
            overflow: 'hidden'
        },
        // New classes for the updated emoji tab layout
        emojiContainer: {
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto',
            maxHeight: '400px'
        },
        emojiCategory: {
            marginBottom: '12px'
        },
        categoryTitle: {
            fontSize: '14px',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: 'rgba(255, 255, 255, 0.8)'
        },
        emojiGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px'
        },
        emojiItem: {
            fontSize: '24px',
            width: '100%',
            aspectRatio: '1/1',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            '&:hover': {
                transform: 'scale(1.1)',
                background: 'rgba(255, 255, 255, 0.15)'
            }
        }
    };
});

/**
 * Component for selecting and adding stickers to the meeting.
 *
 * @returns {React$Element<any>}
 */
function StickerPanel(props: IProps) {
    const { t, dispatch, conference, localParticipant, isAdmin, hasPermission } = props;
    const { classes, cx } = useStyles();
    const panelRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<StickersTab>(StickersTab.EMOJI);
    const [currentEmojiCategory, setCurrentEmojiCategory] = useState<string>('emoji');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [giphyResults, setGiphyResults] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Allow dragging the panel
    useEffect(() => {
        if (!panelRef.current) {
            return;
        }

        const panel = panelRef.current;
        let isDragging = false;
        let startX = 0, startY = 0;
        let offsetX = 0, offsetY = 0;

        const handleMouseDown = (e: MouseEvent) => {
            if (e.target === panel || (e.target as Element).closest(`.${classes.header}`)) {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                
                const rect = panel.getBoundingClientRect();
                offsetX = startX - rect.left;
                offsetY = startY - rect.top;
                
                e.preventDefault();
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            
            panel.style.left = `${e.clientX - offsetX}px`;
            panel.style.top = `${e.clientY - offsetY}px`;
            panel.style.transform = 'none';
        };

        const handleMouseUp = () => {
            isDragging = false;
        };

        panel.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            panel.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    /**
     * Adds a sticker to the meeting.
     * 
     * @param {string} content - The content to add (emoji, sticker URL, or GIF URL).
     * @param {string} type - The type of content (emoji, sticker, or gif).
     * @returns {void}
     */
    const addSticker = (content: string, type: 'emoji' | 'sticker' | 'gif') => {
        console.log(`Adding ${type} sticker: ${content}`); // Debug log
        
        try {
            // Find the actual video container - try different selectors to find the most specific container
            const backgroundContainer = document.querySelector(
                '#largeVideoContainer, #filmstripRemoteVideosContainer, .videocontainer, .filmstrip, #videospace'
            );
            
            if (!backgroundContainer) {
                console.error('Could not find background container');
                return;
            }
            
            console.log('Found background container:', backgroundContainer);
            
            // Make sure the container has relative or absolute positioning for child positioning to work
            const containerStyles = window.getComputedStyle(backgroundContainer);
            if (containerStyles.position === 'static') {
                (backgroundContainer as HTMLElement).style.position = 'relative';
            }
            
            // Generate a unique sticker ID
            const stickerId = `sticker-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            
            // Create a new sticker element
            const stickerElement = document.createElement('div');
            stickerElement.className = 'sticker-item on-screen';
            stickerElement.id = stickerId;
            
            // Set styles directly to ensure they're applied - use absolute positioning relative to the background
            stickerElement.style.position = 'absolute';
            stickerElement.style.zIndex = '9999';
            stickerElement.style.left = '50%'; // Start in the center horizontally
            stickerElement.style.top = '50%'; // Start in the center vertically
            stickerElement.style.transform = 'translate(-50%, -50%)';
            stickerElement.style.padding = '5px';
            stickerElement.style.borderRadius = '4px';
            stickerElement.style.cursor = 'move';
            stickerElement.style.userSelect = 'none';
            
            // Create the content element (emoji or image)
            let contentElement: HTMLSpanElement | HTMLImageElement;
            
            if (type === 'emoji') {
                contentElement = document.createElement('span');
                contentElement.textContent = content;
                contentElement.style.fontSize = '8vmin';
                contentElement.style.transform = 'scale(1)';
                contentElement.style.transformOrigin = 'center';
                contentElement.style.transition = 'transform 0.2s, font-size 0.2s';
                contentElement.style.display = 'flex';
                contentElement.style.alignItems = 'center';
                contentElement.style.justifyContent = 'center';
            } else {
                // Create and properly type the image element
                const imgElement = document.createElement('img');
                imgElement.src = content;
                imgElement.alt = 'Sticker';
                imgElement.style.width = '25%';
                imgElement.style.maxWidth = '25vw';
                imgElement.style.height = 'auto';
                imgElement.style.borderRadius = '4px';
                imgElement.style.transform = 'scale(1)';
                imgElement.style.transformOrigin = 'center';
                imgElement.style.transition = 'transform 0.2s, width 0.2s';
                contentElement = imgElement;
            }
            stickerElement.appendChild(contentElement);
            
            // Add control buttons container
            const controlsContainer = document.createElement('div');
            controlsContainer.className = 'sticker-controls';
            controlsContainer.style.position = 'absolute';
            controlsContainer.style.bottom = '-30px';
            controlsContainer.style.left = '50%';
            controlsContainer.style.transform = 'translateX(-50%)';
            controlsContainer.style.display = 'none';
            controlsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
            controlsContainer.style.borderRadius = '15px';
            controlsContainer.style.padding = '5px 10px';
            controlsContainer.style.zIndex = '10000';
            
            // Add size buttons
            const decreaseSizeBtn = document.createElement('button');
            decreaseSizeBtn.textContent = '−';
            decreaseSizeBtn.style.backgroundColor = 'transparent';
            decreaseSizeBtn.style.border = 'none';
            decreaseSizeBtn.style.color = 'white';
            decreaseSizeBtn.style.fontSize = '16px';
            decreaseSizeBtn.style.cursor = 'pointer';
            decreaseSizeBtn.style.padding = '2px 5px';
            decreaseSizeBtn.title = 'Decrease size';
            
            const increaseSizeBtn = document.createElement('button');
            increaseSizeBtn.textContent = '+';
            increaseSizeBtn.style.backgroundColor = 'transparent';
            increaseSizeBtn.style.border = 'none';
            increaseSizeBtn.style.color = 'white';
            increaseSizeBtn.style.fontSize = '16px';
            increaseSizeBtn.style.cursor = 'pointer';
            increaseSizeBtn.style.padding = '2px 5px';
            increaseSizeBtn.title = 'Increase size';
            
            // Add move left/right buttons
            const moveLeftBtn = document.createElement('button');
            moveLeftBtn.textContent = '◀';
            moveLeftBtn.style.backgroundColor = 'transparent';
            moveLeftBtn.style.border = 'none';
            moveLeftBtn.style.color = 'white';
            moveLeftBtn.style.fontSize = '16px';
            moveLeftBtn.style.cursor = 'pointer';
            moveLeftBtn.style.padding = '2px 5px';
            moveLeftBtn.title = 'Move left';
            
            const moveRightBtn = document.createElement('button');
            moveRightBtn.textContent = '▶';
            moveRightBtn.style.backgroundColor = 'transparent';
            moveRightBtn.style.border = 'none';
            moveRightBtn.style.color = 'white';
            moveRightBtn.style.fontSize = '16px';
            moveRightBtn.style.cursor = 'pointer';
            moveRightBtn.style.padding = '2px 5px';
            moveRightBtn.title = 'Move right';
            
            // Add buttons to controls container
            controlsContainer.appendChild(moveLeftBtn);
            controlsContainer.appendChild(decreaseSizeBtn);
            controlsContainer.appendChild(increaseSizeBtn);
            controlsContainer.appendChild(moveRightBtn);
            
            // Add delete button
            const deleteBtn = document.createElement('div');
            deleteBtn.className = 'sticker-delete';
            deleteBtn.textContent = '×';
            deleteBtn.style.position = 'absolute';
            deleteBtn.style.top = '-8px';
            deleteBtn.style.right = '-8px';
            deleteBtn.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
            deleteBtn.style.color = 'white';
            deleteBtn.style.borderRadius = '50%';
            deleteBtn.style.width = '20px';
            deleteBtn.style.height = '20px';
            deleteBtn.style.lineHeight = '18px';
            deleteBtn.style.textAlign = 'center';
            deleteBtn.style.fontSize = '16px';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.style.display = 'none';
            deleteBtn.style.zIndex = '10000';
            
            // Add elements to sticker
            stickerElement.appendChild(deleteBtn);
            stickerElement.appendChild(controlsContainer);
            
            // Event handlers for size and position controls
            let currentScale = 1;
            const scaleStep = 0.2;
            
            // Listen for container resizing to adjust sticker size proportionally
            const resizeObserver = new ResizeObserver(entries => {
                // Maintain size relative to container
                if (type === 'emoji') {
                    // Adjust font size based on container width
                    const containerWidth = backgroundContainer.clientWidth;
                    const baseFontSize = Math.max(containerWidth / 20, 20); // Base size relative to container
                    contentElement.style.fontSize = `${baseFontSize * currentScale}px`;
                }
            });
            
            // Observe size changes on the background container
            resizeObserver.observe(backgroundContainer);
            
            decreaseSizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentScale > 0.4) {
                    currentScale -= scaleStep;
                    if (type === 'emoji') {
                        // Get the computed font size as a base
                        const computedStyle = window.getComputedStyle(contentElement);
                        const currentFontSize = parseFloat(computedStyle.fontSize);
                        // Apply scale to font size directly rather than transform
                        contentElement.style.fontSize = `${currentFontSize * (1 - scaleStep)}px`;
                    } else {
                        // For images, adjust width percentage
                        const currentWidth = parseFloat(contentElement.style.width || '15');
                        contentElement.style.width = `${currentWidth * (1 - scaleStep)}%`;
                    }
                    
                    // Broadcast the resize if we have permission
                    const { conference, localParticipant, isAdmin, hasPermission } = props;
                    
                    if (conference && localParticipant && (isAdmin || hasPermission)) {
                        // Broadcast resize
                        broadcastStickerResize(
                            conference,
                            localParticipant,
                            {
                                id: stickerId,
                                scale: currentScale
                            }
                        );
                    }
                }
            });
            
            increaseSizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentScale < 2.5) {
                    currentScale += scaleStep;
                    if (type === 'emoji') {
                        // Get the computed font size as a base
                        const computedStyle = window.getComputedStyle(contentElement);
                        const currentFontSize = parseFloat(computedStyle.fontSize);
                        // Apply scale to font size directly rather than transform
                        contentElement.style.fontSize = `${currentFontSize * (1 + scaleStep)}px`;
                    } else {
                        // For images, adjust width percentage
                        const currentWidth = parseFloat(contentElement.style.width || '15');
                        contentElement.style.width = `${currentWidth * (1 + scaleStep)}%`;
                    }
                    
                    // Broadcast the resize if we have permission
                    const { conference, localParticipant, isAdmin, hasPermission } = props;
                    
                    if (conference && localParticipant && (isAdmin || hasPermission)) {
                        // Broadcast resize
                        broadcastStickerResize(
                            conference,
                            localParticipant,
                            {
                                id: stickerId,
                                scale: currentScale
                            }
                        );
                    }
                }
            });
            
            moveLeftBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Get current position as percentage of container width
                const containerWidth = backgroundContainer.clientWidth;
                const currentLeftPx = parseInt(stickerElement.style.left, 10);
                const currentLeftPercent = (currentLeftPx / containerWidth) * 100;
                
                // Move left by 5% of container width
                const newLeftPercent = Math.max(0, currentLeftPercent - 5);
                stickerElement.style.left = `${newLeftPercent}%`;
            });
            
            moveRightBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Get current position as percentage of container width
                const containerWidth = backgroundContainer.clientWidth;
                const currentLeftPx = parseInt(stickerElement.style.left, 10);
                const currentLeftPercent = (currentLeftPx / containerWidth) * 100;
                
                // Move right by 5% of container width, but don't go beyond 95%
                const newLeftPercent = Math.min(95, currentLeftPercent + 5);
                stickerElement.style.left = `${newLeftPercent}%`;
            });
            
            // Show controls and delete button on hover
            stickerElement.addEventListener('mouseenter', () => {
                deleteBtn.style.display = 'block';
                controlsContainer.style.display = 'flex';
            });
            
            stickerElement.addEventListener('mouseleave', () => {
                deleteBtn.style.display = 'none';
                controlsContainer.style.display = 'none';
            });
            
            // Handle deletion with broadcasting
            deleteBtn.addEventListener('click', () => {
                const { conference, localParticipant, isAdmin, hasPermission } = props;
                
                // Broadcast deletion before removing the element
                if (conference && localParticipant && (isAdmin || hasPermission)) {
                    broadcastStickerDelete(conference, localParticipant, stickerId);
                }
                
                stickerElement.remove();
            });
            
            // Make sticker draggable
            let isDragging = false;
            let offsetX = 0, offsetY = 0;
            
            stickerElement.addEventListener('mousedown', (e) => {
                // Don't start drag if clicking a control button
                if ((e.target as Element).tagName === 'BUTTON' || 
                    (e.target as Element).classList.contains('sticker-delete') ||
                    (e.target as Element).closest('.sticker-controls')) {
                    return;
                }
                
                isDragging = true;
                const rect = stickerElement.getBoundingClientRect();
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;
                e.preventDefault();
            });
            
            const handleMouseMove = (e: MouseEvent) => {
                if (isDragging) {
                    // Calculate position relative to the background container
                    const containerRect = backgroundContainer.getBoundingClientRect();
                    
                    // Calculate the position within the container
                    const newLeft = e.clientX - containerRect.left - offsetX;
                    const newTop = e.clientY - containerRect.top - offsetY;
                    
                    // Convert to percentages for responsive positioning
                    const leftPercent = (newLeft / containerRect.width) * 100;
                    const topPercent = (newTop / containerRect.height) * 100;
                    
                    // Ensure sticker stays within the container boundaries (0% to 95%)
                    const maxXPercent = 95;
                    const maxYPercent = 95;
                    
                    // Apply the new position as percentages
                    const boundedLeftPercent = Math.max(0, Math.min(leftPercent, maxXPercent));
                    const boundedTopPercent = Math.max(0, Math.min(topPercent, maxYPercent));
                    
                    stickerElement.style.left = `${boundedLeftPercent}%`;
                    stickerElement.style.top = `${boundedTopPercent}%`;
                    // Remove transform to prevent interference with positioning
                    stickerElement.style.transform = 'none';
                }
            };
            
            const handleMouseUp = () => {
                if (isDragging) {
                    isDragging = false;
                    
                    // Get the current position and broadcast it
                    const { conference, localParticipant, isAdmin, hasPermission } = props;
                    
                    if (conference && localParticipant && (isAdmin || hasPermission)) {
                        // Get the sticker position as percentages
                        const leftPercent = parseFloat(stickerElement.style.left);
                        const topPercent = parseFloat(stickerElement.style.top);
                        
                        // Broadcast the move
                        broadcastStickerMove(
                            conference,
                            localParticipant,
                            {
                                id: stickerId,
                                position: { x: leftPercent, y: topPercent }
                            }
                        );
                    }
                }
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            
            // Add cleanup when sticker is removed
            stickerElement.addEventListener('remove', () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                resizeObserver.disconnect(); // Stop observing when removing sticker
            });
            
            // Add to background container instead of body
            backgroundContainer.appendChild(stickerElement);
            
            // Broadcast the sticker addition if we have permission
            if (conference && localParticipant && (isAdmin || hasPermission)) {
                // Get the initial position
                const containerRect = backgroundContainer.getBoundingClientRect();
                
                // Position is defaulted to center (50%, 50%)
                broadcastStickerAdd(
                    conference,
                    localParticipant,
                    {
                        id: stickerId,
                        type: type === 'gif' ? 'sticker' : type, // Treat GIFs as stickers for simplicity
                        content,
                        position: { x: 50, y: 50 }, // Start in center
                        scale: 1
                    }
                );
            }
            
            // Close the sticker panel
            closeStickerPanel();
            
            console.log('Sticker added successfully with controls:', stickerElement);
        } catch (error) {
            console.error('Error adding sticker:', error);
        }
    };

    /**
     * Searches for GIFs using the GIPHY API.
     * 
     * @param {string} query - The search query.
     * @returns {Promise<void>}
     */
    const searchGiphy = async (query: string) => {
        if (!query) {
            return;
        }

        setIsLoading(true);
        
        try {
            // Using the public GIPHY API key for demo purposes
            // In production, you should use your own API key
            const apiKey = 'Gc7131jiJuvI7IdN0HZ1D7nh0ow5BU6g';
            const response = await fetch(
                `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=8`
            );
            
            const data = await response.json();
            const urls = data.data.map((gif: any) => gif.images.fixed_height.url);
            setGiphyResults(urls);
        } catch (error) {
            console.error('Error fetching GIFs:', error);
            // Use some fallback GIFs in case of error
            setGiphyResults(STICKER_PACKS.animated);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleSearchSubmit = () => {
        if (activeTab === StickersTab.GIPHY) {
            searchGiphy(searchQuery);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearchSubmit();
        }
    };

    /**
     * Closes the sticker panel.
     */
    const closeStickerPanel = () => {
        dispatch(hideDialog());
    };

    // Use the component-bound addSticker function
    const handleAddSticker = (content: string, type: 'emoji' | 'sticker' | 'gif') => {
        addSticker(content, type);
    };

    /**
     * Renders the emoji tab content.
     * 
     * @returns {ReactElement}
     */
    const renderEmojiTab = () => (
        <>
            <div className={classes.categoriesRow}>
                {Object.keys(STICKER_CATEGORIES).map(category => (
                    <button
                        key={category}
                        className={cx(
                            classes.categoryButton,
                            currentEmojiCategory === category && 'active'
                        )}
                        onClick={() => setCurrentEmojiCategory(category)}>
                        {t(`stickers.categories.${category}`)}
                    </button>
                ))}
            </div>
            <div className={classes.stickersContainer}>
                {STICKER_CATEGORIES[currentEmojiCategory as keyof typeof STICKER_CATEGORIES].map((emoji, index) => (
                            <div
                                key={index}
                        className={classes.stickerItem}
                        onClick={() => {
                            console.log('Emoji clicked:', emoji);
                            addSticker(emoji, 'emoji');
                        }}>
                                {emoji}
                            </div>
                        ))}
                    </div>
        </>
    );

    /**
     * Renders the GIPHY tab content.
     * 
     * @returns {ReactElement}
     */
    const renderGiphyTab = () => (
        <>
            <div className={classes.searchContainer}>
                <input
                    className={classes.searchInput}
                    type="text"
                    placeholder={t('stickers.searchGiphy')}
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    onKeyDown={handleKeyDown}
                />
                <Button
                    accessibilityLabel={t('stickers.search')}
                    labelKey="stickers.search"
                    onClick={handleSearchSubmit}
                    type={BUTTON_TYPES.PRIMARY}
                />
            </div>
            <div className={classes.giphyContainer}>
                {isLoading ? (
                    <div className={classes.loadingContainer}>
                        {t('stickers.loading')}
                    </div>
                ) : giphyResults.length > 0 ? (
                    giphyResults.map((gif, index) => (
                        <div
                            key={index}
                            className={classes.giphyItem}
                            onClick={() => {
                                console.log('GIF clicked:', gif);
                                handleAddSticker(gif, 'gif');
                            }}>
                            <img src={gif} alt={`GIF ${index + 1}`} />
                        </div>
                    ))
                ) : (
                    <div className={classes.loadingContainer}>
                        {t('stickers.searchForGifs')}
                    </div>
                )}
            </div>
        </>
    );

    /**
     * Renders the Stipop tab content.
     * 
     * @returns {ReactElement}
     */
    const renderStipopTab = () => (
        <div className={classes.stipopContainer}>
            <SearchComponent
                params={{
                    userId: '3f44775f69675def8957970deff659e5',
                    lang: 'en',
                    countryCode: 'US',
                    apikey: '3f44775f69675def8957970deff659e5'
                }}
                stickerClick={(sticker: { url: string }) => {
                    console.log('Stipop sticker clicked:', sticker);
                    handleAddSticker(sticker.url, 'sticker');
                }}
            />
        </div>
    );

    /**
     * Renders the active tab content.
     * 
     * @returns {ReactElement}
     */
    const renderTabContent = () => {
        switch (activeTab) {
            case StickersTab.EMOJI:
                return renderEmojiTab();
            case StickersTab.GIPHY:
                return renderGiphyTab();
            case StickersTab.STIPOP:
                return renderStipopTab();
            default:
                return null;
        }
    };

    return (
        <div className={classes.panelContainer} ref={panelRef}>
            <div className={classes.header}>
                <span>{t('stickers.panelTitle')}</span>
                <button 
                    className={classes.closeButton}
                    onClick={closeStickerPanel}
                    aria-label={t('dialog.close')}>
                    <Icon src={IconCloseLarge} size={20} />
                </button>
            </div>
            <div className={classes.tabsContainer}>
                <Tabs
                    accessibilityLabel={t('stickers.tabs.accessibility')}
                    onChange={tab => setActiveTab(tab as StickersTab)}
                    selected={activeTab}
                    tabs={[
                        {
                            id: StickersTab.EMOJI,
                            label: t('stickers.tabs.emoji'),
                            accessibilityLabel: t('stickers.tabs.emoji'),
                            controlsId: 'stickers-emoji-tab'
                        },
                        {
                            id: StickersTab.GIPHY,
                            label: t('stickers.tabs.giphy'),
                            accessibilityLabel: t('stickers.tabs.giphy'),
                            controlsId: 'stickers-giphy-tab'
                        },
                        {
                            id: StickersTab.STIPOP,
                            label: t('stickers.tabs.stipop'),
                            accessibilityLabel: t('stickers.tabs.stipop'),
                            controlsId: 'stickers-stipop-tab'
                        }
                    ]}
                />
            </div>
            <div className={classes.contentContainer}>
                {renderTabContent()}
            </div>
        </div>
    );
}

/**
 * Maps part of the Redux state to the props of this component.
 *
 * @param {Object} state - The Redux state.
 * @private
 * @returns {IProps}
 */
function _mapStateToProps(state: IReduxState) {
    const conference = getCurrentConference(state);
    const localParticipant = getLocalParticipant(state);
    
    // Initialize background sync object if needed
    initBackgroundSync();
    
    // Check if user is admin or has permission
    const isAdmin = window.backgroundSync?.isAdmin || false;
    const hasPermission = window.backgroundSync?.permissionList.has(localParticipant?.id || '') || false;
    
    return {
        conference,
        localParticipant,
        isAdmin,
        hasPermission
    };
}

export default translate(connect(_mapStateToProps)(StickerPanel)); 