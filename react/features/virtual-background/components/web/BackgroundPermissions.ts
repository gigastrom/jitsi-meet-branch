import { IParticipant } from '../../../base/participants/types';
import { isParticipantModerator } from '../../../base/participants/functions';

// Constants for background message types
export const BACKGROUND_MESSAGE_TYPE = 'jitsi-background-sync';

// Define message action types
export const BACKGROUND_ACTION = {
    UPDATE: 'update',
    GRANT_PERMISSION: 'grant-permission',
    REVOKE_PERMISSION: 'revoke-permission',
    REQUEST_PERMISSION: 'request-permission',
    DRAWING_UPDATE: 'drawing-update', // New action for drawing sync
    DRAWING_CLEAR: 'drawing-clear',    // New action to clear all drawings
    STICKER_ADD: 'sticker-add',       // New action for adding stickers
    STICKER_MOVE: 'sticker-move',     // New action for moving stickers
    STICKER_DELETE: 'sticker-delete', // New action for deleting stickers
    STICKER_RESIZE: 'sticker-resize'  // New action for resizing stickers
};

// Define the interface for the global backgroundSync object
declare global {
    interface Window {
        backgroundSync?: {
            activeCollaboration: boolean;
            currentBackground: string | null;
            owner: string | null;
            ownerName: string | null;
            participants: Set<string>;
            isAdmin: boolean;
            adminId: string | null;
            permissionList: Set<string>;
            permissionRequests: Map<string, {id: string, name: string, timestamp: number}>;
            lastDrawingSender: string | null;
            lastStickerSender: string | null; // New property to track sticker changes
        };
    }
}

/**
 * Initialize the global background sync object if it doesn't exist
 */
export const initBackgroundSync = (): void => {
    if (!window.backgroundSync) {
        window.backgroundSync = {
            activeCollaboration: false,
            currentBackground: null,
            owner: null,
            ownerName: null,
            participants: new Set(),
            isAdmin: false,
            adminId: null,
            permissionList: new Set(),
            permissionRequests: new Map(),
            lastDrawingSender: null,
            lastStickerSender: null
        };
    }
};

/**
 * Check if a participant is an admin based on their moderator status
 * 
 * @param participant - The participant to check
 * @returns boolean - Whether the participant is an admin
 */
export const isParticipantAdmin = (participant: IParticipant | undefined): boolean => {
    return !!participant && isParticipantModerator(participant);
};

/**
 * Check if a participant has permission to change backgrounds
 * 
 * @param participantId - The participant ID to check
 * @returns boolean - Whether the participant has permission
 */
export const hasBackgroundPermission = (participantId: string | undefined): boolean => {
    if (!participantId || !window.backgroundSync) return false;
    
    // Admins always have permission
    if (participantId === window.backgroundSync.adminId) return true;
    
    // Check permission list
    return window.backgroundSync.permissionList.has(participantId);
};

/**
 * Grant permission to a participant to change backgrounds
 * 
 * @param participantId - The ID of the participant to grant permission to
 * @param conference - The Jitsi conference object
 * @param localParticipant - The local participant
 * @returns Promise<void>
 */
export const grantBackgroundPermission = async (
    participantId: string,
    conference: any,
    localParticipant: IParticipant
): Promise<void> => {
    if (!window.backgroundSync || !conference || !localParticipant) {
        throw new Error('Required context is missing');
    }
    
    // Only admins can grant permission
    if (!isParticipantAdmin(localParticipant)) {
        throw new Error('Only moderators can grant permission');
    }
    
    // Update global state
    window.backgroundSync.permissionList.add(participantId);
    
    // Remove from requests if it was a request
    window.backgroundSync.permissionRequests.delete(participantId);
    
    // Send permission grant message
    const messageData = {
        type: BACKGROUND_MESSAGE_TYPE,
        action: BACKGROUND_ACTION.GRANT_PERMISSION,
        sender: localParticipant.id,
        senderName: localParticipant.name || 'Moderator',
        targetId: participantId,
        timestamp: Date.now()
    };
    
    await conference.sendTextMessage(JSON.stringify(messageData));
};

/**
 * Revoke permission from a participant to change backgrounds
 * 
 * @param participantId - The ID of the participant to revoke permission from
 * @param conference - The Jitsi conference object
 * @param localParticipant - The local participant
 * @returns Promise<void>
 */
export const revokeBackgroundPermission = async (
    participantId: string,
    conference: any,
    localParticipant: IParticipant
): Promise<void> => {
    if (!window.backgroundSync || !conference || !localParticipant) {
        throw new Error('Required context is missing');
    }
    
    // Only admins can revoke permission
    if (!isParticipantAdmin(localParticipant)) {
        throw new Error('Only moderators can revoke permission');
    }
    
    // Update global state
    window.backgroundSync.permissionList.delete(participantId);
    
    // Send permission revoke message
    const messageData = {
        type: BACKGROUND_MESSAGE_TYPE,
        action: BACKGROUND_ACTION.REVOKE_PERMISSION,
        sender: localParticipant.id,
        senderName: localParticipant.name || 'Moderator',
        targetId: participantId,
        timestamp: Date.now()
    };
    
    await conference.sendTextMessage(JSON.stringify(messageData));
};

/**
 * Request permission from a moderator to change backgrounds
 * 
 * @param conference - The Jitsi conference object
 * @param localParticipant - The local participant
 * @returns Promise<void>
 */
export const requestBackgroundPermission = async (
    conference: any,
    localParticipant: IParticipant
): Promise<void> => {
    if (!conference || !localParticipant) {
        throw new Error('Required context is missing');
    }
    
    // Send permission request message
    const messageData = {
        type: BACKGROUND_MESSAGE_TYPE,
        action: BACKGROUND_ACTION.REQUEST_PERMISSION,
        sender: localParticipant.id,
        senderName: localParticipant.name || 'Participant',
        timestamp: Date.now()
    };
    
    await conference.sendTextMessage(JSON.stringify(messageData));
};

/**
 * Handle a background message from a remote participant
 * 
 * @param message - The message data
 * @param participantId - The ID of the participant who sent the message
 * @param localParticipant - The local participant
 * @param participants - The map of all participants
 * @param showNotification - Function to show a notification
 * @param onPermissionChange - Function to call when permission changes
 * @param onPermissionRequest - Function to call when there's a permission request
 */
export const handleBackgroundMessage = (
    message: any,
    participantId: string,
    localParticipant: IParticipant | undefined,
    participants: Map<string, IParticipant>,
    showNotification: (message: string) => void,
    onPermissionChange: (hasPermission: boolean) => void,
    onPermissionRequest?: (request: {id: string, name: string, timestamp: number}) => void
): void => {
    if (participantId === localParticipant?.id) {
        // Don't process our own messages
        return;
    }
    
    const { action, sender, senderName, targetId } = message;
    
    // Find the sender participant to check if they're a moderator
    const senderParticipant = Array.from(participants.values())
        .find((p: IParticipant) => p.id === sender);
    const isSenderModerator = senderParticipant ? isParticipantModerator(senderParticipant) : false;
    
    switch (action) {
        case BACKGROUND_ACTION.GRANT_PERMISSION:
            // Only moderators can grant permission
            if (!isSenderModerator) {
                console.log('Non-moderator tried to grant permission:', sender);
                return;
            }
            
            // Check if we're getting permission
            if (targetId === localParticipant?.id && window.backgroundSync && localParticipant) {
                window.backgroundSync.permissionList.add(localParticipant.id);
                onPermissionChange(true);
                showNotification(`🟢 ${senderName || 'Moderator'} gave you permission to change backgrounds`);
            }
            break;
            
        case BACKGROUND_ACTION.REVOKE_PERMISSION:
            // Only moderators can revoke permission
            if (!isSenderModerator) {
                return;
            }
            
            // Check if our permission is being revoked
            if (targetId === localParticipant?.id && window.backgroundSync && localParticipant) {
                window.backgroundSync.permissionList.delete(localParticipant.id);
                onPermissionChange(false);
                showNotification(`⚠️ ${senderName || 'Moderator'} revoked your permission to change backgrounds`);
            }
            break;
            
        case BACKGROUND_ACTION.REQUEST_PERMISSION:
            // Only process requests if we're a moderator
            if (!isParticipantAdmin(localParticipant) || !window.backgroundSync) {
                return;
            }
            
            const request = {
                id: sender,
                name: senderName || 'Someone',
                timestamp: Date.now()
            };
            
            // Store the request
            window.backgroundSync.permissionRequests.set(sender, request);
            
            // Notify about the request
            showNotification(`🔵 ${senderName || 'Someone'} requested permission to change backgrounds`);
            
            // Call the callback if provided
            if (onPermissionRequest) {
                onPermissionRequest(request);
            }
            break;
    }
};

/**
 * Set the initial admin based on participant status
 * 
 * @param localParticipant - The local participant
 * @param participantCount - The number of participants
 * @param setAdminState - Function to update component admin state
 */
export const initializeAdminStatus = (
    localParticipant: IParticipant | undefined,
    participantCount: number,
    setAdminState: (isAdmin: boolean) => void,
    setPermissionState: (hasPermission: boolean) => void
): void => {
    if (participantCount === 1 && localParticipant) {
        const isAdmin = isParticipantAdmin(localParticipant);
        
        if (window.backgroundSync) {
            window.backgroundSync.isAdmin = isAdmin;
            window.backgroundSync.adminId = localParticipant.id;
        }
        
        setAdminState(isAdmin);
        setPermissionState(true); // First participant always has permission
    }
};

/**
 * Update admin status based on moderator role changes
 * 
 * @param localParticipant - The local participant
 * @param currentIsAdmin - Current admin state
 * @param setAdminState - Function to update component admin state
 * @param setPermissionState - Function to update component permission state
 */
export const updateAdminStatus = (
    localParticipant: IParticipant | undefined,
    currentIsAdmin: boolean,
    setAdminState: (isAdmin: boolean) => void,
    setPermissionState: (hasPermission: boolean) => void
): void => {
    if (localParticipant) {
        const isModerator = isParticipantModerator(localParticipant);
        
        if (isModerator && !currentIsAdmin) {
            setAdminState(true);
            setPermissionState(true);
            
            if (window.backgroundSync) {
                window.backgroundSync.isAdmin = true;
                window.backgroundSync.adminId = localParticipant.id;
            }
        }
    }
};

// Add functions to handle drawing sync
export function handleDrawingMessage(
    message: any,
    conference: any,
    localParticipant: any
) {
    // Only participants with permission should process drawing messages
    const hasPermissionOrAdmin = isParticipantAdmin(localParticipant) || 
                                hasBackgroundPermission(localParticipant?.id);
    
    if (!hasPermissionOrAdmin) {
        return;
    }
    
    // Update the lastDrawingSender
    if (window.backgroundSync) {
        window.backgroundSync.lastDrawingSender = message.sender;
    }
    
    // Drawing messages can be processed by the main component
    return message;
}

// Function to broadcast drawing updates
export function broadcastDrawingUpdate(
    conference: any,
    localParticipant: any,
    drawingData: {
        points: {x: number, y: number}[],
        color: string,
        lineWidth: number,
        tool: 'pencil' | 'eraser'
    }
) {
    if (!conference || !localParticipant) {
        console.error('Cannot broadcast drawing: conference or localParticipant not available');
        return;
    }
    
    // Only users with permission can broadcast drawing updates
    const hasPermissionOrAdmin = isParticipantAdmin(localParticipant) || 
                              hasBackgroundPermission(localParticipant.id);
    
    if (!hasPermissionOrAdmin) {
        console.log('No permission to broadcast drawing');
        return;
    }
    
    try {
        // Create the message payload
        const messageData = {
            type: BACKGROUND_MESSAGE_TYPE,
            action: BACKGROUND_ACTION.DRAWING_UPDATE,
            drawingData,
            sender: localParticipant.id,
            senderName: localParticipant.name || 'You',
            timestamp: Date.now()
        };
        
        // Send the text message to the conference
        conference.sendTextMessage(JSON.stringify(messageData));
        
        // Update lastDrawingSender
        if (window.backgroundSync) {
            window.backgroundSync.lastDrawingSender = localParticipant.id;
        }
    } catch (error) {
        console.error('Error broadcasting drawing update:', error);
    }
}

// Function to broadcast drawing clear command
export function broadcastDrawingClear(
    conference: any,
    localParticipant: any
) {
    if (!conference || !localParticipant) {
        console.error('Cannot broadcast drawing clear: conference or localParticipant not available');
        return;
    }
    
    // Only users with permission can broadcast drawing updates
    const hasPermissionOrAdmin = isParticipantAdmin(localParticipant) || 
                              hasBackgroundPermission(localParticipant.id);
    
    if (!hasPermissionOrAdmin) {
        console.log('No permission to clear drawing');
        return;
    }
    
    try {
        // Create the message payload
        const messageData = {
            type: BACKGROUND_MESSAGE_TYPE,
            action: BACKGROUND_ACTION.DRAWING_CLEAR,
            sender: localParticipant.id,
            senderName: localParticipant.name || 'You',
            timestamp: Date.now()
        };
        
        // Send the text message to the conference
        conference.sendTextMessage(JSON.stringify(messageData));
    } catch (error) {
        console.error('Error broadcasting drawing clear:', error);
    }
}

// Function to handle sticker message
export function handleStickerMessage(
    message: any,
    conference: any,
    localParticipant: any
) {
    // Only participants with permission should process sticker messages
    const hasPermissionOrAdmin = isParticipantAdmin(localParticipant) || 
                                hasBackgroundPermission(localParticipant?.id);
    
    if (!hasPermissionOrAdmin) {
        return;
    }
    
    // Update the lastStickerSender
    if (window.backgroundSync) {
        window.backgroundSync.lastStickerSender = message.sender;
    }
    
    // Sticker messages can be processed by the main component
    return message;
}

// Function to broadcast sticker add
export function broadcastStickerAdd(
    conference: any,
    localParticipant: any,
    stickerData: {
        id: string,
        type: 'emoji' | 'sticker' | 'gif',
        content: string,
        position: { x: number, y: number },
        scale: number
    }
) {
    if (!conference || !localParticipant) {
        console.error('Cannot broadcast sticker: conference or localParticipant not available');
        return;
    }
    
    // Only users with permission can broadcast sticker updates
    const hasPermissionOrAdmin = isParticipantAdmin(localParticipant) || 
                              hasBackgroundPermission(localParticipant.id);
    
    if (!hasPermissionOrAdmin) {
        console.log('No permission to broadcast stickers');
        return;
    }
    
    try {
        // Create the message payload
        const messageData = {
            type: BACKGROUND_MESSAGE_TYPE,
            action: BACKGROUND_ACTION.STICKER_ADD,
            stickerData,
            sender: localParticipant.id,
            senderName: localParticipant.name || 'You',
            timestamp: Date.now()
        };
        
        // Send the text message to the conference
        conference.sendTextMessage(JSON.stringify(messageData));
        
        // Update lastStickerSender
        if (window.backgroundSync) {
            window.backgroundSync.lastStickerSender = localParticipant.id;
        }
    } catch (error) {
        console.error('Error broadcasting sticker add:', error);
    }
}

// Function to broadcast sticker move
export function broadcastStickerMove(
    conference: any,
    localParticipant: any,
    stickerData: {
        id: string,
        position: { x: number, y: number }
    }
) {
    if (!conference || !localParticipant) {
        console.error('Cannot broadcast sticker move: conference or localParticipant not available');
        return;
    }
    
    // Only users with permission can broadcast sticker updates
    const hasPermissionOrAdmin = isParticipantAdmin(localParticipant) || 
                              hasBackgroundPermission(localParticipant.id);
    
    if (!hasPermissionOrAdmin) {
        console.log('No permission to move stickers');
        return;
    }
    
    try {
        // Create the message payload
        const messageData = {
            type: BACKGROUND_MESSAGE_TYPE,
            action: BACKGROUND_ACTION.STICKER_MOVE,
            stickerData,
            sender: localParticipant.id,
            senderName: localParticipant.name || 'You',
            timestamp: Date.now()
        };
        
        // Send the text message to the conference
        conference.sendTextMessage(JSON.stringify(messageData));
        
        // Update lastStickerSender
        if (window.backgroundSync) {
            window.backgroundSync.lastStickerSender = localParticipant.id;
        }
    } catch (error) {
        console.error('Error broadcasting sticker move:', error);
    }
}

// Function to broadcast sticker resize
export function broadcastStickerResize(
    conference: any,
    localParticipant: any,
    stickerData: {
        id: string,
        scale: number
    }
) {
    if (!conference || !localParticipant) {
        console.error('Cannot broadcast sticker resize: conference or localParticipant not available');
        return;
    }
    
    // Only users with permission can broadcast sticker updates
    const hasPermissionOrAdmin = isParticipantAdmin(localParticipant) || 
                              hasBackgroundPermission(localParticipant.id);
    
    if (!hasPermissionOrAdmin) {
        console.log('No permission to resize stickers');
        return;
    }
    
    try {
        // Create the message payload
        const messageData = {
            type: BACKGROUND_MESSAGE_TYPE,
            action: BACKGROUND_ACTION.STICKER_RESIZE,
            stickerData,
            sender: localParticipant.id,
            senderName: localParticipant.name || 'You',
            timestamp: Date.now()
        };
        
        // Send the text message to the conference
        conference.sendTextMessage(JSON.stringify(messageData));
        
        // Update lastStickerSender
        if (window.backgroundSync) {
            window.backgroundSync.lastStickerSender = localParticipant.id;
        }
    } catch (error) {
        console.error('Error broadcasting sticker resize:', error);
    }
}

// Function to broadcast sticker delete
export function broadcastStickerDelete(
    conference: any,
    localParticipant: any,
    stickerId: string
) {
    if (!conference || !localParticipant) {
        console.error('Cannot broadcast sticker delete: conference or localParticipant not available');
        return;
    }
    
    // Only users with permission can broadcast sticker updates
    const hasPermissionOrAdmin = isParticipantAdmin(localParticipant) || 
                              hasBackgroundPermission(localParticipant.id);
    
    if (!hasPermissionOrAdmin) {
        console.log('No permission to delete stickers');
        return;
    }
    
    try {
        // Create the message payload
        const messageData = {
            type: BACKGROUND_MESSAGE_TYPE,
            action: BACKGROUND_ACTION.STICKER_DELETE,
            stickerId,
            sender: localParticipant.id,
            senderName: localParticipant.name || 'You',
            timestamp: Date.now()
        };
        
        // Send the text message to the conference
        conference.sendTextMessage(JSON.stringify(messageData));
        
        // Update lastStickerSender
        if (window.backgroundSync) {
            window.backgroundSync.lastStickerSender = localParticipant.id;
        }
    } catch (error) {
        console.error('Error broadcasting sticker delete:', error);
    }
} 