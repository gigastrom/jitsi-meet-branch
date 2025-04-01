import React, { useEffect, useState, useRef } from 'react';
import { makeStyles } from 'tss-react/mui';
import { useDispatch, useSelector } from 'react-redux';

import { setAudioMuted, setVideoMuted } from '../../../base/media/actions';
import { MEDIA_TYPE, VIDEO_MUTISM_AUTHORITY } from '../../../base/media/constants';
import { IReduxState } from '../../../app/types';
import { isLocalTrackMuted } from '../../../base/tracks/functions.any';
import { beginAddPeople } from '../../../invite/actions.any';
import StickerPanel from '../../../stickers/components/web/StickerPanel';
import { openDialog } from '../../../base/dialog/actions';
// Import hangup function for the back button
import { hangup } from '../../../base/connection/actions.web';
// Import analytics for tracking button click
import { sendAnalytics } from '../../../analytics/functions';
import { createToolbarEvent } from '../../../analytics/AnalyticsEvents';
// Import participant-related functions
import { 
    getLocalParticipant, 
    getParticipantCount, 
    isParticipantModerator
} from '../../../base/participants/functions';
import { PARTICIPANT_ROLE } from '../../../base/participants/constants';
// Import Avatar component for participant thumbnails
import Avatar from '../../../base/avatar/components/Avatar';
// Import required action creators for collaborative backgrounds
import { createSharedBackgroundEvent } from '../../actions';
import { getCurrentConference } from '../../../base/conference/functions';
import { JitsiConferenceEvents } from '../../../base/lib-jitsi-meet';
// Import participants pane action
// import { open as openParticipantsPane } from '../../../participants-pane/actions.web';

// Import the chat components
import MessageContainer from '../../../chat/components/web/MessageContainer';
import ChatInput from '../../../chat/components/web/ChatInput';
import { sendMessage } from '../../../chat/actions.web';
import { IMessage } from '../../../chat/types';

// Define a constant for the command name
const SHARED_BACKGROUND_COMMAND = 'shared-background';

// Define a constant for background message type
const BACKGROUND_MESSAGE_TYPE = 'jitsi-background-sync';
// Define message action types
const BACKGROUND_ACTION = {
    UPDATE: 'update',
    GRANT_PERMISSION: 'grant-permission',
    REVOKE_PERMISSION: 'revoke-permission',
    REQUEST_PERMISSION: 'request-permission',
    DRAWING_UPDATE: 'drawing-update',
    DRAWING_CLEAR: 'drawing-clear',
    TEXT_UPDATE: 'text-update',
    STICKER_ADD: 'sticker-add',
    STICKER_MOVE: 'sticker-move',
    STICKER_DELETE: 'sticker-delete',
    STICKER_RESIZE: 'sticker-resize'
};

// Add a TextIcon component along with other icons
const TextIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 5.5C5 4.67157 5.67157 4 6.5 4H17.5C18.3284 4 19 4.67157 19 5.5V7.5C19 8.32843 18.3284 9 17.5 9H16.5V18C16.5 18.8284 15.8284 19.5 15 19.5H13C12.1716 19.5 11.5 18.8284 11.5 18V9H7.5C6.67157 9 6 8.32843 6 7.5V5.5C6 4.67157 6.67157 4 7.5 4H5Z" fill="currentColor"/>
    </svg>
);

// TypeScript declaration for the global APP object
declare global {
    interface Window {
        APP?: {
            conference: {
                toggleVideoMuted: (showUI?: boolean) => void;
                toggleAudioMuted: (showUI?: boolean) => void;
                hangup?: (shouldExit: boolean) => void; // Fix parameter type
            };
        };
        backgroundSync?: {
            activeCollaboration: boolean;
            currentBackground: string | null;
            owner: string | null;
            ownerName: string | null;
            participants: Set<string>;
            // New permission system properties
            isAdmin: boolean;
            adminId: string | null;
            permissionList: Set<string>; // List of participant IDs who can change backgrounds
            permissionRequests: Map<string, {id: string, name: string, timestamp: number}>;
            // Drawing related property
            lastDrawingSender: string | null;
            // Sticker related property
            lastStickerSender: string | null;
        };
    }
}

// Make the APP variable available
const APP = typeof window !== 'undefined' ? window.APP : undefined;

// SVG icons for buttons
const MicIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" fill="white"/>
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" fill="white"/>
    </svg>
);

const MicOffIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" fill="white"/>
    </svg>
);

const VideoIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="white"/>
    </svg>
);

const VideoOffIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z" fill="white"/>
    </svg>
);

const SettingsIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" fill="white"/>
    </svg>
);

// Add the InviteIcon component
const InviteIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
    </svg>
);

// Add a BackgroundIcon component
const BackgroundIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z" fill="white"/>
        <path d="M6 7h5v5H6z" fill="white"/>
        <path d="M14 7h4v3h-4z" fill="white"/>
        <path d="M6 14h9v3H6z" fill="white"/>
    </svg>
);

// Add a new UploadIcon component
const UploadIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" fill="white"/>
    </svg>
);

// Add a DeleteIcon component
const DeleteIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="white"/>
    </svg>
);

// Add PencilIcon for the drawing feature
const PencilIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="white"/>
    </svg>
);

const EraserIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15.14 3c-.51 0-1.02.2-1.41.59L2.59 14.73c-.78.77-.78 2.03 0 2.8L5.03 20h7.66l8.72-8.72c.79-.78.79-2.03 0-2.82l-4.84-4.86C16.15 3.2 15.65 3 15.14 3zM7.12 18l-1.41-1.41 6.36-6.36 1.41 1.41L7.12 18z" fill="white"/>
    </svg>
);

const ColorIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5h1.77c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4c-.83 0-1.5-.67-1.5-1.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="white"/>
    </svg>
);

const ClearIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="white"/>
    </svg>
);

const COLORS = [
    { id: 'black', value: '#000000' },
    { id: 'red', value: '#ff0000' },
    { id: 'green', value: '#00ff00' },
    { id: 'blue', value: '#0000ff' },
    { id: 'yellow', value: '#ffff00' },
    { id: 'orange', value: '#ff9900' },
    { id: 'purple', value: '#9900ff' },
    { id: 'white', value: '#ffffff' },
];

// Add GIF icon component
const GifIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.5 9H13v6h-1.5V9zM9 9H6c-.6 0-1 .5-1 1v4c0 .5.4 1 1 1h3c.6 0 1-.5 1-1v-2H8.5v1.5h-2v-3H10V10c0-.5-.4-1-1-1zM19 10.5V9h-4.5v6H16v-2h2v-1.5h-2v-1h3z" fill="white"/>
    </svg>
);

// Add a ThemeIcon component
const ThemeIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4c-.83 0-1.5-.67-1.5-1.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="white"/>
    </svg>
);

// Add CloudUploadIcon component
const CloudUploadIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4C9.11 4 6.6 5.64 5.35 8.04C2.34 8.36 0 10.91 0 14C0 17.31 2.69 20 6 20H19C21.76 20 24 17.76 24 15C24 12.36 21.95 10.22 19.35 10.04ZM14 13V17H10V13H7L12 8L17 13H14Z" fill="white"/>
    </svg>
);

// Add a SharedIcon component to indicate shared backgrounds
const SharedIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 16.08C17.24 16.08 16.56 16.38 16.04 16.85L8.91 12.7C8.96 12.47 9 12.24 9 12C9 11.76 8.96 11.53 8.91 11.3L15.96 7.19C16.5 7.69 17.21 8 18 8C19.66 8 21 6.66 21 5C21 3.34 19.66 2 18 2C16.34 2 15 3.34 15 5C15 5.24 15.04 5.47 15.09 5.7L8.04 9.81C7.5 9.31 6.79 9 6 9C4.34 9 3 10.34 3 12C3 13.66 4.34 15 6 15C6.79 15 7.5 14.69 8.04 14.19L15.16 18.34C15.11 18.55 15.08 18.77 15.08 19C15.08 20.61 16.39 21.91 18 21.91C19.61 21.91 20.92 20.61 20.92 19C20.92 17.39 19.61 16.08 18 16.08Z" fill="white"/>
    </svg>
);

// Add a CollaborativeIcon component for the collaboration button
const CollaborativeIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" fill="white"/>
    </svg>
);

// Add necessary icons for the permission system

// Add a PermissionIcon component
// Import permissions icons from the PermissionsPanel module
import { PermissionIcon, AdminIcon } from './PermissionsPanel';

// Add these icon components at the top with the other icon components
const FontIncreaseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 4V7H13V19H16V7H20V4H9Z" fill="currentColor"/>
        <path d="M4 12H2V14H4V16H6V14H8V12H6V10H4V12Z" fill="currentColor"/>
    </svg>
);

const FontDecreaseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 4V7H13V19H16V7H20V4H9Z" fill="currentColor"/>
        <path d="M4 12H2V14H8V12H4Z" fill="currentColor"/>
    </svg>
);

// Add a MembersIcon component along with the other icon components
const MembersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
);

// Add MoreOptionsIcon component
const MoreOptionsIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 8C13.1 8 14 7.1 14 6C14 4.9 13.1 4 12 4C10.9 4 10 4.9 10 6C10 7.1 10.9 8 12 8ZM12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10ZM12 16C10.9 16 10 16.9 10 18C10 19.1 10.9 20 12 20C13.1 20 14 19.1 14 18C14 16.9 13.1 16 12 16Z" fill="white"/>
    </svg>
);

const useStyles = makeStyles()(() => {
    return {
        container: {
            position: 'absolute',
            top: '70px',  // Position below the control bar
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'white',
            borderRadius: '8px',
            padding: '10px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            zIndex: 99, // Lower than the control bar
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '350px',
            width: '90%'
        },
        buttonContainer: {
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
            zIndex: 100,
            alignItems: 'center',
            background: 'transparent', // Changed from dark background to transparent
            borderRadius: '20px',
            padding: '4px 15px 4px 8px',
        },
        toggleButton: {
            background: 'transparent', // Changed from dark background to transparent
            borderRadius: '8px', // Changed from circular to slightly rounded
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            transition: 'all 0.2s',
            border: 'none',
            color: 'white',
            marginLeft: '3px',
            '&:hover': {
                background: 'rgba(255, 255, 255, 0.2)', // Light hover effect
                transform: 'scale(1.05)'
            },
            '&:active': {
                transform: 'scale(0.95)'
            }
        },
        mediaButton: {
            background: 'transparent', // Changed from dark background to transparent
            borderRadius: '8px', // Changed from circular to slightly rounded
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            transition: 'all 0.2s',
            border: 'none',
            color: 'white',
            '&:hover': {
                background: 'rgba(255, 255, 255, 0.2)', // Light hover effect
                transform: 'scale(1.05)'
            },
            '&:active': {
                transform: 'scale(0.95)'
            }
        },
        activeMediaButton: {
            background: 'transparent', // Changed from dark background to transparent
            color: 'white',
            '&:hover': {
                background: 'rgba(255, 255, 255, 0.2)' // Light hover effect
            }
        },
        inactiveMediaButton: {
            color: '#e73446', // Changed to just red text color without background
            '&:hover': {
                background: 'rgba(255, 255, 255, 0.2)' // Light hover effect
            }
        },
        buttonIcon: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'scale(0.85)'
        },
        titleBar: {
            fontWeight: 'bold',
            color: 'white',
            fontSize: '14px',
            marginRight: '8px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '120px',
            display: 'flex',
            alignItems: 'center'
        },
        dropdownArrow: {
            marginLeft: '8px',
            width: '10px',
            height: '10px',
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid white',
            display: 'inline-block'
        },
        title: {
            fontSize: '14px',
            fontWeight: 'bold',
            marginBottom: '8px',
            textAlign: 'center'
        },
        options: {
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: '320px'
        },
        option: {
            width: '60px',
            height: '40px',
            margin: '5px',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            '&:hover': {
                transform: 'scale(1.05)'
            }
        },
        active: {
            border: '2px solid #4c9aff'
        },
        inviteButton: {
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#FF5F6D', // Default color that will be overridden by theme
            color: '#fff',
            borderRadius: '32px',
            padding: '8px 20px 8px 16px',
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            border: 'none',
            fontWeight: 'bold',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.2s ease',
            zIndex: 100,
            '&:hover': {
                transform: 'scale(1.05)',
                filter: 'brightness(0.9)'  // This will work with any background color
            }
        },
        plusSign: {
            fontSize: '20px', // Make the plus sign bigger
            marginRight: '6px',
            fontWeight: 'bold'
        },
        inviteIcon: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
        backgroundButton: {
            background: 'transparent', // Changed from dark background to transparent
            borderRadius: '8px', // Changed from circular to slightly rounded
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            transition: 'all 0.2s',
            border: 'none',
            color: 'white',
            marginLeft: '3px',
            '&:hover': {
                background: 'rgba(255, 255, 255, 0.2)', // Light hover effect
                transform: 'scale(1.05)'
            },
            '&:active': {
                transform: 'scale(0.95)'
            }
        },
        uploadOption: {
            width: '60px',
            height: '40px',
            margin: '5px',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: 'rgba(83, 83, 83, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            border: '1px dashed rgba(255, 255, 255, 0.5)',
            '&:hover': {
                transform: 'scale(1.05)',
                background: 'rgba(83, 83, 83, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.8)',
            }
        },
        uploadInput: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
        },
        uploadIcon: {
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
        customBackgrounds: {
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: '8px',
            padding: '8px 0',
            borderTop: '1px solid rgba(0, 0, 0, 0.1)',
        },
        customBgTitle: {
            fontSize: '12px',
            color: '#666',
            width: '100%',
            textAlign: 'center',
            marginBottom: '5px',
        },
        customOption: {
            position: 'relative',
            overflow: 'hidden',
        },
        deleteButton: {
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: 'rgba(255, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            opacity: 0,
            transition: 'opacity 0.2s',
            zIndex: 1,
            '&:hover': {
                background: 'rgba(255, 0, 0, 0.9)',
            }
        },
        customBackgroundOption: {
            '&:hover $deleteButton': {
                opacity: 1,
            }
        },
        uploadsSection: {
            marginTop: '12px',
            borderTop: '1px solid rgba(0, 0, 0, 0.1)',
            paddingTop: '8px',
        },
        uploadLabel: {
            position: 'absolute',
            bottom: '3px',
            left: 0,
            right: 0,
            fontSize: '8px',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.8)',
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '1px 0',
        },
        drawingToolbar: {
            position: 'absolute',
            top: 'auto', // Remove top positioning
            right: 'auto', // Remove right positioning
            bottom: '20px', // Position at bottom
            left: '50%', // Center horizontally
            transform: 'translateX(-50%)', // Center adjustment
            background: 'rgba(0, 0, 0, 0.7)', // Add slightly darker background for visibility
            borderRadius: '20px',
            padding: '8px 16px', // Add more horizontal padding
            display: 'flex',
            flexDirection: 'row', // Change to row for horizontal layout
            gap: '8px',
            zIndex: 100,
            alignItems: 'center',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)', // Add shadow for better visibility
        },
        drawingButton: {
            width: '40px',
            height: '40px',
            borderRadius: '8px', // Changed from circular to slightly rounded
            background: 'transparent', // Removed dark background
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: 'none',
            transition: 'all 0.2s',
            color: '#ffffff', // Added white color for icon visibility
            '&:hover': {
                background: 'rgba(255, 255, 255, 0.2)', // Light hover effect
                transform: 'scale(1.05)'
            },
            '&:active': {
                transform: 'scale(0.95)'
            }
        },
        activeDrawingTool: {
            background: 'rgba(255, 255, 255, 0.2)', // Light background for active state
            '&:hover': {
                background: 'rgba(255, 255, 255, 0.3)',
            }
        },
        colorGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '4px',
            padding: '8px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
            margin: '4px 0',
        },
        colorOption: {
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            cursor: 'pointer',
            border: '2px solid rgba(255, 255, 255, 0.5)',
            transition: 'transform 0.2s',
            '&:hover': {
                transform: 'scale(1.1)'
            }
        },
        activeColor: {
            border: '2px solid white',
            boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.3)'
        },
        canvas: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 50,
            pointerEvents: 'none',
        },
        canvasDraw: {
            pointerEvents: 'auto',
            cursor: 'crosshair',
        },
        canvasErase: {
            pointerEvents: 'auto',
            cursor: 'cell',
        },
        stickerPanel: {
            position: 'absolute',
            top: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            zIndex: 99,
            width: '320px',
            maxHeight: '400px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
        },
        stickerGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            marginTop: '10px',
        },
        stickerItem: {
            width: '60px',
            height: '60px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.05)',
            transition: 'transform 0.2s, background 0.2s',
            '&:hover': {
                transform: 'scale(1.05)',
                background: 'rgba(0, 0, 0, 0.1)',
            }
        },
        stickerImage: {
            maxWidth: '85%',
            maxHeight: '85%',
            objectFit: 'contain',
        },
        stickerTitle: {
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: '8px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
            paddingBottom: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        stickerClose: {
            cursor: 'pointer',
            fontSize: '18px',
            opacity: 0.7,
            '&:hover': {
                opacity: 1,
            }
        },
        stickerCategories: {
            display: 'flex',
            overflowX: 'auto',
            gap: '8px',
            marginBottom: '8px',
            paddingBottom: '8px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
            '&::-webkit-scrollbar': {
                height: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '4px',
            }
        },
        categoryButton: {
            padding: '4px 10px',
            borderRadius: '16px',
            background: 'rgba(0, 0, 0, 0.1)',
            border: 'none',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'background 0.2s',
            '&:hover': {
                background: 'rgba(0, 0, 0, 0.2)',
            }
        },
        activeCategory: {
            background: 'rgba(77, 99, 255, 0.9)',
            color: 'white',
            '&:hover': {
                background: 'rgba(77, 99, 255, 0.8)',
            }
        },
        gifButton: {
            background: 'rgba(28, 28, 45, 0.9)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            transition: 'all 0.2s',
            border: 'none',
            color: 'white',
            marginLeft: '3px',
            '&:hover': {
                background: 'rgba(40, 40, 60, 0.95)',
                transform: 'scale(1.05)'
            },
            '&:active': {
                transform: 'scale(0.95)'
            }
        },
        stickerOnScreen: {
            position: 'absolute',
            zIndex: 51,
            userSelect: 'none',
            cursor: 'move',
            transformOrigin: 'center center',
        },
        stickerDeleteButton: {
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: 'rgba(231, 52, 70, 0.95)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            cursor: 'pointer',
            opacity: 0,
            transition: 'opacity 0.2s',
            border: '1px solid white',
            '&:hover': {
                transform: 'scale(1.1)',
            }
        },
        stickerContainer: {
            '&:hover $stickerDeleteButton': {
                opacity: 1,
            }
        },
        themePopover: {
            position: 'absolute',
            top: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(28, 28, 45, 0.85)',
            borderRadius: '10px',
            padding: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            zIndex: 100,
        },
        themeTitle: {
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            marginBottom: '5px',
            textAlign: 'center',
        },
        themesContainer: {
            display: 'flex',
            gap: '8px',
            justifyContent: 'center',
        },
        themeOption: {
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            cursor: 'pointer',
            border: '2px solid transparent',
            transition: 'transform 0.2s, border 0.2s',
            '&:hover': {
                transform: 'scale(1.1)',
            }
        },
        activeTheme: {
            border: '2px solid white',
            boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.3)'
        },
        settingsPopover: {
            position: 'absolute',
            top: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(28, 28, 45, 0.9)',
            borderRadius: '10px',
            padding: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            zIndex: 100,
            minWidth: '120px',
        },
        settingsMenuItem: {
            display: 'flex',
            alignItems: 'center',
            padding: '8px 10px',
            cursor: 'pointer',
            borderRadius: '6px',
            transition: 'background 0.2s',
            color: 'white',
            '&:hover': {
                background: 'rgba(255, 255, 255, 0.1)',
            }
        },
        settingsMenuIcon: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '10px',
            transform: 'scale(0.85)',
        },
        settingsMenuText: {
            fontSize: '14px',
        },
        uploadedImagesPanel: {
            position: 'absolute',
            right: '60px',
            top: 0,
            background: 'rgba(28, 28, 45, 0.85)',
            borderRadius: '10px',
            padding: '10px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
            maxWidth: '200px',
            maxHeight: '300px',
            overflowY: 'auto',
        },
        uploadedImagesTitle: {
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            marginBottom: '8px',
            textAlign: 'center',
        },
        uploadedImagesGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
        },
        uploadedImageItem: {
            position: 'relative',
            width: '80px',
            height: '80px',
            borderRadius: '6px',
            overflow: 'hidden',
            cursor: 'pointer',
            '&:hover': {
                transform: 'scale(1.05)',
                transition: 'transform 0.2s',
            },
            '&:hover $deleteButton': {
                opacity: 1,
            }
        },
        uploadedImageThumb: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
        },
        // Add styles for collaborative mode
        collaborativeButton: {
            background: 'transparent', // Changed from dark background to transparent
            borderRadius: '8px', // Changed from circular to slightly rounded
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            transition: 'all 0.2s',
            border: 'none',
            color: 'white',
            marginLeft: '3px',
            '&:hover': {
                background: 'rgba(255, 255, 255, 0.2)', // Light hover effect
                transform: 'scale(1.05)'
            },
            '&:active': {
                transform: 'scale(0.95)'
            }
        },
        activeCollaborativeButton: {
            color: '#4CAF50', // Changed to just green text color
            '&:hover': {
                background: 'rgba(255, 255, 255, 0.2)' // Light hover effect
            }
        },
        sharedIndicator: {
            position: 'absolute',
            top: '0',
            right: '0',
            background: 'rgba(46, 125, 50, 0.9)',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1
        },
        collaborativeBadge: {
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            background: 'rgba(46, 125, 50, 0.9)',
            color: 'white',
            borderRadius: '10px',
            padding: '2px 8px',
            fontSize: '10px',
            fontWeight: 'bold',
            zIndex: 100,
        },
        disabledCollaborativeButton: {
            color: '#9e9e9e', // Changed to just grey text color
            '&:hover': {
                background: 'rgba(255, 255, 255, 0.2)' // Light hover effect
            }
        },
        drawingIndicator: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '10px',
            padding: '5px 10px',
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            zIndex: 100,
        },
        drawingIndicatorDot: {
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.8)',
            marginRight: '5px',
        },
        fontSizeControls: {
            display: 'flex',
            alignItems: 'center',
            marginLeft: '5px',
        },
        fontSizeDisplay: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '40px',
            height: '40px',
            background: 'transparent',
            color: 'white',
            borderRadius: '4px',
            margin: '0 4px',
            fontSize: '12px',
            fontWeight: 'bold'
        },
        chatContainer: {
            position: 'fixed',
            right: '20px',
            bottom: '20px',
            transform: 'none',
            backgroundColor: 'var(--background-color, rgba(28, 32, 37, 0.8))',
            backdropFilter: 'blur(8px)',
            width: '300px',
            maxHeight: '70vh',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 100
        },
        chatHeader: {
            padding: '15px',
            background: 'var(--accent-color, linear-gradient(45deg, #834d9b 0%, #d04ed6 100%))',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 'bold'
        },
        chatMessages: {
            flex: 1,
            overflow: 'auto',
            padding: '10px',
            backgroundColor: 'var(--background-color, rgba(28, 32, 37, 0.8))'
        },
        chatInputContainer: {
            padding: '8px 12px',
            backgroundColor: 'var(--background-color, rgba(28, 32, 37, 0.8))',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px',
            position: 'relative'
        },
        chatInput: {
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '18px',
            padding: '8px 12px',
            width: '100%',
            fontSize: '14px',
            outline: 'none',
            '&::placeholder': {
                color: 'rgba(255, 255, 255, 0.6)'
            }
        },
        chatInputActions: {
            display: 'flex',
            marginLeft: '8px',
        },
        chatInputButton: {
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(255, 255, 255, 0.7)',
            padding: '4px',
            marginLeft: '4px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff'
            }
        },
        collapsedChatContainer: {
            position: 'fixed',
            right: '20px',
            bottom: '20px',
            width: '300px',
            backgroundColor: 'var(--background-color, rgba(28, 32, 37, 0.8))',
            borderRadius: '12px',
            zIndex: 1000,
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
        },
        chatToggleButton: {
            position: 'absolute',
            right: '10px',
            top: '10px',
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer'
        },
        closeButton: {
            background: 'none',
            border: 'none',
            color: '#ffffff',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0 5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }
        },
        chatHint: {
            fontSize: '9px',
            color: 'rgba(255, 255, 255, 0.4)',
            textAlign: 'center',
            padding: '2px 0',
            position: 'absolute',
            bottom: '0px',
            left: '0',
            right: '0',
            opacity: 0.7,
            pointerEvents: 'none'
        },
        participantsList: {
            position: 'fixed',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            zIndex: 100,
            padding: '8px 4px',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            backdropFilter: 'blur(8px)',
            borderRadius: '24px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
        },
        
        participantItem: {
            position: 'relative',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            transition: 'all 0.2s ease',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            overflow: 'hidden',
            
            '&:hover': {
                transform: 'scale(1.05)',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                zIndex: 2
            }
        },
        
        activeParticipant: {
            border: '2px solid var(--accent-color, #246FE5)'
        },
        
        participantName: {
            position: 'absolute',
            left: '50px',
            top: '50%',
            transform: 'translateY(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            opacity: 0,
            transition: 'opacity 0.2s ease',
            pointerEvents: 'none',
            
            '$participantItem:hover &': {
                opacity: 1
            }
        },
        
        adminBadge: {
            position: 'absolute',
            right: '-2px',
            bottom: '-2px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-color, #246FE5)',
            border: '2px solid black',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '8px',
            color: 'white',
            fontWeight: 'bold'
        },
        addParticipantButton: {
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#4CAF50',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px',
            padding: 0,
            transition: 'all 0.2s ease',
            marginTop: '4px',
            
            '&:hover': {
                transform: 'scale(1.05)',
                backgroundColor: '#45a049'
            }
        },
        backButton: {
            position: 'fixed',
            top: '20px',
            left: '20px',
            backgroundColor: 'var(--background-color, rgba(28, 32, 37, 0.85))',
            backdropFilter: 'blur(8px)',
            color: 'white',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            transition: 'all 0.2s ease',
            '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.3)',
                borderColor: 'rgba(255, 255, 255, 0.4)'
            },
            '&:active': {
                transform: 'scale(0.95)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }
        },
        templatePanel: {
            position: 'absolute',
            right: '60px',
            top: 0,
            background: 'rgba(28, 28, 45, 0.95)',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
            width: '280px',
            maxHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            zIndex: 1000,
        },
        templateHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: 'white',
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: '8px',
            
            '& button': {
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px',
                '&:hover': {
                    opacity: 0.8,
                }
            }
        },
        templateList: {
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        },
        templateItem: {
            display: 'flex',
            gap: '12px',
            padding: '8px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            transition: 'transform 0.2s',
            
            '&:hover': {
                transform: 'scale(1.02)',
            }
        },
        templatePreview: {
            width: '60px',
            height: '60px',
            borderRadius: '6px',
            overflow: 'hidden',
            
            '& img': {
                width: '100%',
                height: '100%',
                objectFit: 'cover',
            }
        },
        templateInfo: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            color: 'white',
            
            '& span': {
                fontSize: '14px',
                fontWeight: 500, // Change from string '500' to number 500
            }
        },
        templateActions: {
            display: 'flex',
            gap: '8px',
            
            '& button': {
                padding: '4px 8px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                transition: 'all 0.2s',
                
                '&:first-child': {
                    background: '#4CAF50',
                    color: 'white',
                    '&:hover': {
                        background: '#45a049',
                    }
                },
                
                '&:last-child': {
                    background: '#f44336',
                    color: 'white',
                    '&:hover': {
                        background: '#da190b',
                    }
                }
            }
        },
        saveTemplate: {
            display: 'flex',
            gap: '8px',
            padding: '8px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            
            '& input': {
                flex: 1,
                padding: '8px',
                border: 'none',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                
                '&::placeholder': {
                    color: 'rgba(255, 255, 255, 0.5)',
                }
            },
            
            '& button': {
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                background: '#2196F3',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
                
                '&:hover': {
                    background: '#1976D2',
                }
            }
        },
        titleInput: {
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            padding: '2px 4px',
            width: '100%',
            outline: 'none',
            borderBottom: '1px solid rgba(255, 255, 255, 0.5)',
            
            '&:focus': {
                borderBottom: '1px solid white',
            }
        }
    };
});

// Array of background colors and gradients
const BACKGROUNDS = [
    { id: 'default', value: '#f5f5f5', type: 'color', name: 'Light Gray' },
    { id: 'blue', value: '#e6f2ff', type: 'color', name: 'Light Blue' },
    { id: 'green', value: '#e6fff2', type: 'color', name: 'Light Green' },
    { id: 'purple', value: '#f2e6ff', type: 'color', name: 'Light Purple' },
    { id: 'yellow', value: '#fffde6', type: 'color', name: 'Light Yellow' },
    { id: 'gradient1', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', type: 'gradient', name: 'Pink Gradient' },
    { id: 'gradient2', value: 'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)', type: 'gradient', name: 'Teal Gradient' },
    { id: 'gradient3', value: 'linear-gradient(135deg, #c3cfe2 0%, #c3cfe2 100%)', type: 'gradient', name: 'Blue Gray' },
    { 
        id: 'forest', 
        value: 'url(https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1953&q=80)', 
        type: 'image',
        name: 'Forest'
    },
    { 
        id: 'beach', 
        value: 'url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1953&q=80)', 
        type: 'image',
        name: 'Beach'
    },
];

// Add theme colors
const THEMES = [
    { id: 'default', mainColor: 'rgba(28, 28, 45, 0.85)', accentColor: 'linear-gradient(45deg, #FF5F6D 0%, #FFC371 100%)', name: 'Default' },
    { id: 'blue', mainColor: 'rgba(25, 55, 109, 0.85)', accentColor: 'linear-gradient(45deg, #396afc 0%, #2948ff 100%)', name: 'Blue' },
    { id: 'green', mainColor: 'rgba(25, 75, 56, 0.85)', accentColor: 'linear-gradient(45deg, #11998e 0%, #38ef7d 100%)', name: 'Green' },
    { id: 'purple', mainColor: 'rgba(75, 25, 109, 0.85)', accentColor: 'linear-gradient(45deg, #834d9b 0%, #d04ed6 100%)', name: 'Purple' },
];

// Simplify the SettingsMenu component
const SettingsMenu = ({ onThemeClick }: { onThemeClick: () => void }) => {
    const { classes } = useStyles();
    
    return (
        <div className={classes.settingsPopover}>
            <div className={classes.settingsMenuItem} onClick={onThemeClick}>
                <span className={classes.settingsMenuIcon}>
                    <ThemeIcon />
                </span>
                <span className={classes.settingsMenuText}>Themes</span>
            </div>
        </div>
    );
};

// Import the permission modules
import {
    initBackgroundSync,
    isParticipantAdmin,
    hasBackgroundPermission,
    grantBackgroundPermission,
    revokeBackgroundPermission,
    requestBackgroundPermission,
    handleBackgroundMessage,
    initializeAdminStatus,
    updateAdminStatus,
    // New drawing collaboration functions
    handleDrawingMessage,
    broadcastDrawingUpdate,
    broadcastDrawingClear,
    // New sticker collaboration functions
    handleStickerMessage
} from './BackgroundPermissions';

import PermissionsPanel from './PermissionsPanel';

// Helper function to determine brightness of a color (to decide text color)
const getBrightness = (hexColor: string): number => {
    // Remove the # if present
    hexColor = hexColor.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hexColor.substr(0, 2), 16);
    const g = parseInt(hexColor.substr(2, 2), 16);
    const b = parseInt(hexColor.substr(4, 2), 16);
    
    // Calculate brightness (perceived brightness formula)
    return (r * 299 + g * 587 + b * 114) / 1000;
};

/**
 * Component for selecting the background color or gradient in a here.fm style UI.
 *
 * @returns {ReactElement}
 */
const BackgroundSelector = () => {
    const { classes, cx } = useStyles();
    const dispatch = useDispatch();
    const [selectedBackground, setSelectedBackground] = useState('default');
    const [showOptions, setShowOptions] = useState(false);
    const [customBackgrounds, setCustomBackgrounds] = useState<Array<{id: string, value: string, type: string, name: string, thumbnail?: string}>>([]);
    const [showThemeSelector, setShowThemeSelector] = useState(false);
    const [selectedTheme, setSelectedTheme] = useState('default');
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    
    // Add stickers state
    const [stickers, setStickers] = useState<Array<{
        type: 'emoji' | 'image';
        content: string;
        position: { x: number; y: number };
        size: number;
        rotation: number;
    }>>([]);
    
    // Add chat visibility state
    // Replace the showChat state with isChatCollapsed
    // const [showChat, setShowChat] = useState(false);
    const [isChatCollapsed, setIsChatCollapsed] = useState(false);
    const [lastTapTime, setLastTapTime] = useState(0);
    const _messages = useSelector((state: IReduxState) => state['features/chat'].messages);
    
    // Permission-based collaborative mode
    const [collaborativeMode, setCollaborativeMode] = useState(true);
    const [sharedBackground, setSharedBackground] = useState<string | null>(null);
    const [sharedBackgroundOwner, setSharedBackgroundOwner] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);
    const [permissionRequests, setPermissionRequests] = useState<Map<string, {name: string, timestamp: number}>>(new Map());
    // Add a state to track who is currently drawing
    const [currentDrawer, setCurrentDrawer] = useState<string | null>(null);
    
    // Get the current conference and local participant
    const conference = useSelector(getCurrentConference);
    const localParticipant = useSelector(getLocalParticipant);
    const participants = useSelector((state: IReduxState) => state['features/base/participants'].remote);
    const participantCount = useSelector(getParticipantCount);

    // Add state for uploaded images
    const [uploadedImages, setUploadedImages] = useState<Array<{id: string, url: string, name: string}>>([]);
    
    // Drawing-related state and refs
    const [drawingTool, setDrawingTool] = useState<'pencil' | 'eraser' | 'none'>('none');
    const [drawingColor, setDrawingColor] = useState('#FF5733');
    const [lineWidth, setLineWidth] = useState(5);
    const [isDrawing, setIsDrawing] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showMoreOptions, setShowMoreOptions] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const lastPosRef = useRef<{x: number, y: number}>({x: 0, y: 0});
    
    // Media state
    const tracks = useSelector((state: IReduxState) => state['features/base/tracks']);
    const isVideoOn = !isLocalTrackMuted(tracks, MEDIA_TYPE.VIDEO);
    const isMuted = isLocalTrackMuted(tracks, MEDIA_TYPE.AUDIO);
    
    // Owner status for permissions
    const isOwner = sharedBackgroundOwner === localParticipant?.id;
    
    // Show a temporary indicator when background changes (Miro-like feedback)
    const showBackgroundChangeIndicator = (senderName?: string, message?: string) => {
        const indicator = document.createElement('div');
        indicator.style.position = 'fixed';
        indicator.style.bottom = '20px';
        indicator.style.left = '50%';
        indicator.style.transform = 'translateX(-50%)';
        indicator.style.backgroundColor = 'rgba(46, 125, 50, 0.85)';
        indicator.style.color = 'white';
        indicator.style.padding = '8px 16px';
        indicator.style.borderRadius = '20px';
        indicator.style.fontWeight = 'bold';
        indicator.style.zIndex = '1000';
        
        if (message) {
            indicator.textContent = message;
        } else if (isAdmin && sharedBackgroundOwner === localParticipant?.id) {
            indicator.textContent = 'You changed the background for everyone';
        } else if (senderName) {
            indicator.textContent = `Background changed by ${senderName}`;
        } else {
            const ownerName = window.backgroundSync?.ownerName || 'Another participant';
            indicator.textContent = `Background changed by ${ownerName}`;
        }
        
        document.body.appendChild(indicator);
        
        // Fade in
        indicator.style.opacity = '0';
        indicator.style.transition = 'opacity 0.3s ease-in-out';
        setTimeout(() => { indicator.style.opacity = '1'; }, 10);
        
        // Remove after 3 seconds with fade out
        setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => { 
                if (indicator.parentNode) {
                    indicator.parentNode.removeChild(indicator);
                }
            }, 300);
        }, 3000);
    };

    // Add event listeners for collaborative backgrounds
    useEffect(() => {
        if (!conference) {
            return;
        }

        // Initialize the background sync object
        initBackgroundSync();
        
        // Set initial admin status when first participant joins
        initializeAdminStatus(
            localParticipant,
            participantCount,
            setIsAdmin,
            setHasPermission
        );
        
        // Function to find background data by ID
        const findBackgroundById = (backgroundId: string): {
            id: string;
            value: string;
            type: string;
            name: string;
            thumbnail?: string;
        } => {
            // First check in built-in backgrounds
            const builtInBg = BACKGROUNDS.find(bg => bg.id === backgroundId);
            if (builtInBg) {
                return {
                    ...builtInBg,
                    thumbnail: builtInBg.type === 'image' 
                        ? builtInBg.value.replace('url(', '').replace(')', '') 
                        : undefined
                };
            }
            
            // Then check in custom backgrounds
            const customBg = customBackgrounds.find(bg => bg.id === backgroundId);
            if (customBg) {
                return {
                    ...customBg,
                    thumbnail: customBg.type === 'image' 
                        ? customBg.value.replace('url(', '').replace(')', '') 
                        : undefined
                };
            }
            
            // Default fallback
            return {
                ...BACKGROUNDS[0],
                thumbnail: undefined
            };
        };
        
        // Function to forcefully apply a background to everyone
        const forceApplyBackground = (backgroundId: string, senderId: string, senderName: string) => {
            console.log(`Force applying background: ${backgroundId} from ${senderId}`);
            
            // Update UI state
            setSharedBackground(backgroundId || null);
            setSharedBackgroundOwner(backgroundId ? senderId : null);
            setCollaborativeMode(!!backgroundId);
            
            // Store sender name for notifications
            if (window.backgroundSync) {
                window.backgroundSync.ownerName = senderName;
            }
            
            // Apply the background visually
            if (backgroundId) {
                setSelectedBackground(backgroundId);
                
                // Apply in a more direct way with DOM manipulation
                const background = findBackgroundById(backgroundId);
                if (background) {
                    // Get all possible video containers - very aggressive to ensure it works
                    const videoContainers = document.querySelectorAll('.videocontainer, #largeVideoContainer, .large-video-container');
                    videoContainers.forEach(container => {
                        const el = container as HTMLElement;
                        if (background.type === 'image') {
                            el.style.backgroundImage = background.value;
                            el.style.backgroundSize = 'cover';
                            el.style.backgroundPosition = 'center';
                            el.style.backgroundRepeat = 'no-repeat';
                        } else {
                            el.style.background = background.value;
                        }
                    });
                }
                
                // Show a visual indicator for background change (like Miro's indicator)
                showBackgroundChangeIndicator(senderName);
            }
            
            // Update global state
            if (window.backgroundSync) {
                window.backgroundSync.activeCollaboration = !!backgroundId;
                window.backgroundSync.currentBackground = backgroundId;
                window.backgroundSync.owner = senderId;
            }
        };

        // Message handler wrapper for the imported function
        const messageHandlerWrapper = (id: string, text: string, timestamp: Date) => {
            try {
                const parsedMessage = JSON.parse(text);
                
                // Only process messages of our custom type
                if (parsedMessage.type !== BACKGROUND_MESSAGE_TYPE) {
                    return;
                }
                
                // If it's an update message, apply the background
                if (parsedMessage.action === BACKGROUND_ACTION.UPDATE) {
                    const { backgroundId, sender, senderName } = parsedMessage;
                    
                    // Check if sender has permission to change backgrounds
                    const senderParticipant = Array.from(participants.values())
                        .find((p: any) => p.id === sender);
                    
                    const senderIsAdmin = isParticipantAdmin(senderParticipant);
                    const senderHasPermission = hasBackgroundPermission(sender);
                    
                    if (senderIsAdmin || senderHasPermission) {
                        forceApplyBackground(backgroundId, sender, senderName);
                    }
                } 
                // Handle drawing update messages
                else if (parsedMessage.action === BACKGROUND_ACTION.DRAWING_UPDATE) {
                    // Only process if sender is not self to avoid duplicate drawing
                    if (parsedMessage.sender !== localParticipant?.id) {
                        const drawingData = parsedMessage.drawingData;
                        
                        // Check if sender has permission to draw
                        const senderParticipant = Array.from(participants.values())
                            .find((p: any) => p.id === parsedMessage.sender);
                        
                        const senderIsAdmin = isParticipantAdmin(senderParticipant);
                        const senderHasPermission = hasBackgroundPermission(parsedMessage.sender);
                        
                        if (senderIsAdmin || senderHasPermission) {
                            // Apply the drawing to our canvas
                            if (contextRef.current && canvasRef.current) {
                                const ctx = contextRef.current;
                                const remotePoints = drawingData.points;
                                
                                // Start a new path for this remote stroke
                                ctx.beginPath();
                                
                                // Apply the remote drawing properties
                                ctx.strokeStyle = drawingData.color;
                                ctx.lineWidth = drawingData.lineWidth;
                                
                                if (drawingData.tool === 'eraser') {
                                    ctx.globalCompositeOperation = 'destination-out';
                                } else {
                                    ctx.globalCompositeOperation = 'source-over';
                                }
                                
                                // Move to the first point
                                if (remotePoints.length > 0) {
                                    ctx.moveTo(remotePoints[0].x, remotePoints[0].y);
                                    
                                    // Draw lines to each subsequent point
                                    for (let i = 1; i < remotePoints.length; i++) {
                                        ctx.lineTo(remotePoints[i].x, remotePoints[i].y);
                                    }
                                    
                                    // Actually draw the stroke
                                    ctx.stroke();
                                    ctx.closePath();
                                }
                                
                                // Show who is drawing
                                setCurrentDrawer(parsedMessage.sender);
                                const drawerName = parsedMessage.senderName || 'Someone';
                                showBackgroundChangeIndicator(drawerName, `${drawerName} is drawing`);
                                
                                // Reset after a short delay
                                setTimeout(() => {
                                    setCurrentDrawer(null);
                                }, 2000);
                            }
                        }
                    }
                }
                // Handle drawing clear message
                else if (parsedMessage.action === BACKGROUND_ACTION.DRAWING_CLEAR) {
                    // Check if sender has permission
                    const senderParticipant = Array.from(participants.values())
                        .find((p: any) => p.id === parsedMessage.sender);
                    
                    const senderIsAdmin = isParticipantAdmin(senderParticipant);
                    const senderHasPermission = hasBackgroundPermission(parsedMessage.sender);
                    
                    // Only apply if sender has permission
                    if (senderIsAdmin || senderHasPermission) {
                        // Clear the canvas
                        if (contextRef.current && canvasRef.current) {
                            contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                            
                            // Show who cleared the canvas
                            const clearerName = parsedMessage.senderName || 'Someone';
                            showBackgroundChangeIndicator(clearerName, `${clearerName} cleared the canvas`);
                        }
                    }
                }
                // Handle text update messages
                else if (parsedMessage.action === BACKGROUND_ACTION.TEXT_UPDATE) {
                    // Only process if sender is not self to avoid duplicate text
                    if (parsedMessage.sender !== localParticipant?.id) {
                        const textData = parsedMessage.textData;
                        
                        // Check if sender has permission to add text
                        const senderParticipant = Array.from(participants.values())
                            .find((p: any) => p.id === parsedMessage.sender);
                        
                        const senderIsAdmin = isParticipantAdmin(senderParticipant);
                        const senderHasPermission = hasBackgroundPermission(parsedMessage.sender);
                        
                        // Only apply if sender has permission
                        if (senderIsAdmin || senderHasPermission) {
                            // Add the text to our state
                            setTexts(prev => {
                                // If text already exists, update it
                                const existingIndex = prev.findIndex(t => t.id === textData.id);
                                if (existingIndex >= 0) {
                                    const newTexts = [...prev];
                                    newTexts[existingIndex] = textData;
                                    return newTexts;
                                }
                                // Otherwise add as new
                                return [...prev, textData];
                            });
                            
                            // Redraw the text on the canvas
                            if (contextRef.current) {
                                const ctx = contextRef.current;
                                ctx.font = `${textData.fontSize}px Arial`;
                                ctx.fillStyle = textData.color;
                                ctx.fillText(textData.text, textData.position.x, textData.position.y);
                            }
                            
                            // Show who added text
                            const textAdderName = parsedMessage.senderName || 'Someone';
                            showBackgroundChangeIndicator(textAdderName, `${textAdderName} added text`);
                        }
                    }
                }
                // Handle sticker messages (add, move, resize, delete)
                else if (parsedMessage.action === BACKGROUND_ACTION.STICKER_ADD ||
                        parsedMessage.action === BACKGROUND_ACTION.STICKER_MOVE ||
                        parsedMessage.action === BACKGROUND_ACTION.STICKER_RESIZE ||
                        parsedMessage.action === BACKGROUND_ACTION.STICKER_DELETE) {
                    
                    // Process the sticker message through our handler
                    const stickerMessage = handleStickerMessage(parsedMessage, conference, localParticipant);
                    
                    if (!stickerMessage) {
                        return; // No permission or other issue
                    }
                    
                    // Only process if sender is not self to avoid duplicates
                    if (parsedMessage.sender !== localParticipant?.id) {
                        // Check if sender has permission
                        const senderParticipant = Array.from(participants.values())
                            .find((p: any) => p.id === parsedMessage.sender);
                        
                        const senderIsAdmin = isParticipantAdmin(senderParticipant);
                        const senderHasPermission = hasBackgroundPermission(parsedMessage.sender);
                        
                        // Only apply if sender has permission
                        if (senderIsAdmin || senderHasPermission) {
                            const senderName = parsedMessage.senderName || 'Someone';
                            
                            // Handle sticker add
                            if (parsedMessage.action === BACKGROUND_ACTION.STICKER_ADD) {
                                const { stickerData } = parsedMessage;
                                const backgroundContainer = document.querySelector(
                                    '#largeVideoContainer, #filmstripRemoteVideosContainer, .videocontainer, .filmstrip, #videospace'
                                );
                                
                                if (backgroundContainer) {
                                    // Create the sticker element
                                    const stickerElement = document.createElement('div');
                                    stickerElement.className = 'sticker-item on-screen';
                                    stickerElement.id = stickerData.id;
                                    
                                    // Apply styles
                                    stickerElement.style.position = 'absolute';
                                    stickerElement.style.zIndex = '9999';
                                    stickerElement.style.left = `${stickerData.position.x}%`;
                                    stickerElement.style.top = `${stickerData.position.y}%`;
                                    stickerElement.style.padding = '5px';
                                    stickerElement.style.borderRadius = '4px';
                                    stickerElement.style.cursor = 'move';
                                    stickerElement.style.userSelect = 'none';
                                    
                                    // Create the content
                                    let contentElement;
                                    if (stickerData.type === 'emoji') {
                                        contentElement = document.createElement('span');
                                        contentElement.textContent = stickerData.content;
                                        contentElement.style.fontSize = '8vmin';
                                        contentElement.style.transform = `scale(${stickerData.scale})`;
                                        contentElement.style.transformOrigin = 'center';
                                        contentElement.style.display = 'flex';
                                        contentElement.style.alignItems = 'center';
                                        contentElement.style.justifyContent = 'center';
                                    } else {
                                        contentElement = document.createElement('img');
                                        (contentElement as HTMLImageElement).src = stickerData.content;
                                        (contentElement as HTMLImageElement).alt = 'Sticker';
                                        contentElement.style.width = '25%';
                                        contentElement.style.maxWidth = '25vw';
                                        contentElement.style.height = 'auto';
                                        contentElement.style.transform = `scale(${stickerData.scale})`;
                                        contentElement.style.transformOrigin = 'center';
                                    }
                                    
                                    stickerElement.appendChild(contentElement);
                                    backgroundContainer.appendChild(stickerElement);
                                    
                                    // Show who added the sticker
                                    showBackgroundChangeIndicator(senderName, `${senderName} added a sticker`);
                                }
                            }
                            // Handle sticker move
                            else if (parsedMessage.action === BACKGROUND_ACTION.STICKER_MOVE) {
                                const { stickerData } = parsedMessage;
                                const stickerElement = document.getElementById(stickerData.id);
                                
                                if (stickerElement) {
                                    stickerElement.style.left = `${stickerData.position.x}%`;
                                    stickerElement.style.top = `${stickerData.position.y}%`;
                                    
                                    // Remove transform that might interfere with positioning
                                    stickerElement.style.transform = 'none';
                                    
                                    // Show who moved the sticker
                                    showBackgroundChangeIndicator(senderName, `${senderName} moved a sticker`);
                                }
                            }
                            // Handle sticker resize
                            else if (parsedMessage.action === BACKGROUND_ACTION.STICKER_RESIZE) {
                                const { stickerData } = parsedMessage;
                                const stickerElement = document.getElementById(stickerData.id);
                                
                                if (stickerElement && stickerElement.firstChild) {
                                    const contentElement = stickerElement.firstChild as HTMLElement;
                                    contentElement.style.transform = `scale(${stickerData.scale})`;
                                    
                                    // Show who resized the sticker
                                    showBackgroundChangeIndicator(senderName, `${senderName} resized a sticker`);
                                }
                            }
                            // Handle sticker delete
                            else if (parsedMessage.action === BACKGROUND_ACTION.STICKER_DELETE) {
                                const stickerId = parsedMessage.stickerId;
                                const stickerElement = document.getElementById(stickerId);
                                
                                if (stickerElement) {
                                    stickerElement.remove();
                                    
                                    // Show who deleted the sticker
                                    showBackgroundChangeIndicator(senderName, `${senderName} removed a sticker`);
                                }
                            }
                        }
                    }
                }
                else {
                    // For all other message types, use the imported handler
                    handleBackgroundMessage(
                        parsedMessage,
                        id,
                        localParticipant,
                        new Map(Array.from(participants.values()).map(p => [p.id, p])),
                        showBackgroundChangeIndicator,
                        (hasPermission) => setHasPermission(hasPermission),
                        (request) => {
                            // Update permission requests state for UI
                            const updatedRequests = new Map(permissionRequests);
                            updatedRequests.set(request.id, {
                                name: request.name,
                                timestamp: request.timestamp
                            });
                            setPermissionRequests(updatedRequests);
                        }
                    );
                }
            } catch (error) {
                console.error('Error handling background message:', error);
            }
        };

        // Function to broadcast background change to all participants
        const broadcastBackgroundChange = (backgroundId: string) => {
            if (!conference || !localParticipant) {
                console.log('Cannot broadcast background: conference or localParticipant not available');
                return;
            }
            
            // Update global state first
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
            
            window.backgroundSync.activeCollaboration = !!backgroundId;
            window.backgroundSync.currentBackground = backgroundId;
            window.backgroundSync.owner = backgroundId ? localParticipant.id : null;
            window.backgroundSync.ownerName = localParticipant.name || 'You';
            
            try {
                // Create the message payload
                const messageData = {
                    type: BACKGROUND_MESSAGE_TYPE,
                    action: BACKGROUND_ACTION.UPDATE,
                    backgroundId,
                    sender: localParticipant.id,
                    senderName: localParticipant.name || 'You',
                    timestamp: Date.now()
                };
                
                // Send the text message to the conference - this is how Jitsi chat works
                conference.sendTextMessage(JSON.stringify(messageData));
                
                console.log('Sent background message:', messageData);
            } catch (error) {
                console.error('Error sending background message:', error);
            }
            
            // Also apply locally - we are the owner
            setSharedBackground(backgroundId);
            setSharedBackgroundOwner(localParticipant.id);
            showBackgroundChangeIndicator(localParticipant.name || 'You');
            
            // Dispatch Redux action to track collaborative background
            dispatch(createSharedBackgroundEvent({
                backgroundId,
                enabled: !!backgroundId
            }));
        };
        
        // Join event
        const handleParticipantJoined = (id: string, participant: any) => {
            if (window.backgroundSync) {
                window.backgroundSync.participants.add(id);
            }
            
            // If we're the admin, announce the current background and admin status to new participants
            if (window.backgroundSync && isAdmin && window.backgroundSync.currentBackground && localParticipant) {
                // Small delay to ensure their connection is ready
                setTimeout(() => {
                    if (window.backgroundSync?.currentBackground) {
                        broadcastBackgroundChange(window.backgroundSync.currentBackground);
                    }
                }, 2000);
            }
        };
        
        // Leave event
        const handleParticipantLeft = (id: string) => {
            if (!window.backgroundSync) return;
            
            window.backgroundSync.participants.delete(id);
            
            // If participant had permission, remove them
            window.backgroundSync.permissionList.delete(id);
            
            // Remove any pending permission requests
            if (window.backgroundSync.permissionRequests.has(id)) {
                window.backgroundSync.permissionRequests.delete(id);
                // Update state for admin UI
                if (isAdmin) {
                    setPermissionRequests(new Map(window.backgroundSync.permissionRequests));
                }
            }
            
            // If the admin left, promote the next person to admin
            if (window.backgroundSync.adminId === id) {
                // Find the next participant to be admin
                if (window.backgroundSync.participants.size > 0) {
                    let newAdminId: string | null = null;
                    
                    // First try to find someone with permission
                    for (const participantId of window.backgroundSync.participants) {
                        if (window.backgroundSync.permissionList.has(participantId)) {
                            newAdminId = participantId;
                            break;
                        }
                    }
                    
                    // If no one has permission, use the first participant
                    if (!newAdminId) {
                        const participants = Array.from(window.backgroundSync.participants);
                        if (participants.length > 0) {
                            newAdminId = participants[0];
                        }
                    }
                    
                    if (newAdminId) {
                        window.backgroundSync.adminId = newAdminId;
                        
                        // If we are that next person, make ourselves admin
                        if (newAdminId === localParticipant?.id) {
                            window.backgroundSync.isAdmin = true;
                            setIsAdmin(true);
                            setHasPermission(true);
                            
                            // Broadcast that we're the new admin
                            try {
                                const adminMessage = {
                                    type: BACKGROUND_MESSAGE_TYPE,
                                    action: BACKGROUND_ACTION.GRANT_PERMISSION,
                                    sender: localParticipant?.id,
                                    senderName: localParticipant?.name || 'New Admin',
                                    targetId: localParticipant?.id, 
                                    timestamp: Date.now()
                                };
                                
                                if (conference && localParticipant) {
                                    conference.sendTextMessage(JSON.stringify(adminMessage));
                                }
                                
                                showBackgroundChangeIndicator(undefined, 'You are now the admin for collaborative backgrounds');
                            } catch (error) {
                                console.error('Error sending new admin announcement:', error);
                            }
                        }
                    }
                }
            }
        };

        // Subscribe to text messages - this is how Jitsi's chat system works too
        conference.on(JitsiConferenceEvents.MESSAGE_RECEIVED, messageHandlerWrapper);
        conference.on('participantJoined', handleParticipantJoined);
        conference.on('participantLeft', handleParticipantLeft);
        
        // If there's an active collaboration and we're not the owner, apply it
        if (window.backgroundSync && 
            window.backgroundSync.activeCollaboration && 
            window.backgroundSync.owner !== localParticipant?.id &&
            window.backgroundSync.currentBackground) {
            
            // Force apply the background that was previously set
            forceApplyBackground(
                window.backgroundSync.currentBackground,
                window.backgroundSync.owner || '',
                window.backgroundSync.ownerName || 'Another participant'
            );
        }
        
        // Check if we should be admin or have permission
        if (window.backgroundSync) {
            // Set admin status
            if (window.backgroundSync.adminId === localParticipant?.id) {
                window.backgroundSync.isAdmin = true;
                setIsAdmin(true);
                setHasPermission(true);
            }
            
            // Set permission status
            if (window.backgroundSync.permissionList.has(localParticipant?.id || '')) {
                setHasPermission(true);
            }
            
            // If we're admin, load pending requests
            if (isAdmin && window.backgroundSync.permissionRequests.size > 0) {
                setPermissionRequests(new Map(window.backgroundSync.permissionRequests));
            }
        }

        return () => {
            // Clean up event listeners
            try {
                conference.off(JitsiConferenceEvents.MESSAGE_RECEIVED, messageHandlerWrapper);
                conference.off('participantJoined', handleParticipantJoined);
                conference.off('participantLeft', handleParticipantLeft);
            } catch (e) {
                console.error('Error cleaning up listeners:', e);
            }
        };
    }, [conference, localParticipant, participantCount, participants, isAdmin, permissionRequests]);

    // Track admin status changes based on moderator role (moved outside)
    useEffect(() => {
        if (!localParticipant) return;
        
        updateAdminStatus(
            localParticipant,
            isAdmin,
            setIsAdmin,
            setHasPermission
        );
    }, [localParticipant, isAdmin]);

    // Function to find background data by ID
    const findBackgroundById = (backgroundId: string): {
        id: string;
        value: string;
        type: string;
        name: string;
        thumbnail?: string;
    } => {
        // First check in built-in backgrounds
        const builtInBg = BACKGROUNDS.find(bg => bg.id === backgroundId);
        if (builtInBg) {
            return {
                ...builtInBg,
                thumbnail: builtInBg.type === 'image' 
                    ? builtInBg.value.replace('url(', '').replace(')', '') 
                    : undefined
            };
        }
        
        // Then check in custom backgrounds
        const customBg = customBackgrounds.find(bg => bg.id === backgroundId);
        if (customBg) {
            return {
                ...customBg,
                thumbnail: customBg.type === 'image' 
                    ? customBg.value.replace('url(', '').replace(')', '') 
                    : undefined
            };
        }
        
        // Default fallback
        return {
            ...BACKGROUNDS[0],
            thumbnail: undefined
        };
    };

    // Apply background to video container
    const applyBackground = (backgroundId: string) => {
        const background = findBackgroundById(backgroundId);
        
        if (background) {
            const largeVideoContainer = document.getElementById('largeVideoContainer');
            
            if (largeVideoContainer) {
                // For images, ensure no-repeat and proper sizing
                if (background.type === 'image') {
                    largeVideoContainer.style.backgroundImage = background.value;
                    largeVideoContainer.style.backgroundSize = 'cover';
                    largeVideoContainer.style.backgroundPosition = 'center center';
                    largeVideoContainer.style.backgroundRepeat = 'no-repeat';
                } else {
                    // For colors and gradients
                    largeVideoContainer.style.background = background.value;
                }
            }
        }
    };

    // Update the handleImageUpload function to add images directly to the background
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        // Process each file
        Array.from(files).forEach(file => {
            // Check if file is an image
            if (!file.type.startsWith('image/')) {
                alert('Please select image files only');
                return;
            }

            // Check file size (limit to 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert(`File ${file.name} is too large (max 5MB)`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                if (dataUrl) {
                    // Add image directly to the background like a sticker
                    addImageToBackground(dataUrl);
                }
            };
            reader.readAsDataURL(file);
        });

        // Reset the input
        event.target.value = '';
    };

    // Add a function to place images on the background like stickers
    const addImageToBackground = (imageUrl: string) => {
        console.log(`Adding image: ${imageUrl}`); // Debug log
        
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
            
            // Create a new image element
            const imageElement = document.createElement('div');
            imageElement.className = 'sticker-item on-screen';
            
            // Set styles directly to ensure they're applied - use absolute positioning relative to the background
            imageElement.style.position = 'absolute';
            imageElement.style.zIndex = '9999';
            imageElement.style.display = 'flex';
            imageElement.style.justifyContent = 'center';
            imageElement.style.alignItems = 'center';
            imageElement.style.cursor = 'move';
            imageElement.style.pointerEvents = 'auto';
            
            // Position randomly within the background container using percentages
            const randomXPercent = Math.floor(Math.random() * 80); // 0-80% of container width
            const randomYPercent = Math.floor(Math.random() * 80); // 0-80% of container height
            
            imageElement.style.left = `${randomXPercent}%`;
            imageElement.style.top = `${randomYPercent}%`;
            
            // Add the image
            const contentElement = document.createElement('img');
            contentElement.src = imageUrl;
            contentElement.alt = 'Uploaded Image';
            contentElement.style.width = '15%'; // Percentage of parent container
            contentElement.style.maxWidth = '15vw'; // Viewport-relative max width
            contentElement.style.height = 'auto'; // Maintain aspect ratio
            contentElement.style.borderRadius = '4px';
            contentElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
            contentElement.style.transform = 'scale(1)';
            contentElement.style.transformOrigin = 'center';
            contentElement.style.transition = 'transform 0.2s, width 0.2s';
            
            imageElement.appendChild(contentElement);
            
            // Add resize handles at all four corners
            const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
            const resizeHandles: {[key: string]: HTMLDivElement} = {};
            
            corners.forEach(corner => {
                const handle = document.createElement('div');
                handle.className = `resize-handle ${corner}`;
                handle.style.position = 'absolute';
                handle.style.width = '16px';
                handle.style.height = '16px';
                handle.style.background = 'rgba(255, 255, 255, 0.8)';
                handle.style.border = '1px solid rgba(0, 0, 0, 0.5)';
                handle.style.borderRadius = '50%';
                handle.style.cursor = `${corner}-resize`;
                handle.style.zIndex = '10001';
                handle.style.display = 'none'; // Initially hidden, show on hover
                
                // Position the handles
                if (corner.includes('top')) {
                    handle.style.top = '-8px';
                } else {
                    handle.style.bottom = '-8px';
                }
                
                if (corner.includes('left')) {
                    handle.style.left = '-8px';
                } else {
                    handle.style.right = '-8px';
                }
                
                imageElement.appendChild(handle);
                resizeHandles[corner] = handle;
            });
            
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
            
            // Add 3D rotate buttons
            const rotate3DBtn = document.createElement('button');
            rotate3DBtn.textContent = '3D';
            rotate3DBtn.style.backgroundColor = 'transparent';
            rotate3DBtn.style.border = 'none';
            rotate3DBtn.style.color = 'white';
            rotate3DBtn.style.fontSize = '16px';
            rotate3DBtn.style.cursor = 'pointer';
            rotate3DBtn.style.padding = '2px 5px';
            rotate3DBtn.title = 'Toggle 3D effect';
            
            // Add buttons to controls container
            controlsContainer.appendChild(moveLeftBtn);
            controlsContainer.appendChild(decreaseSizeBtn);
            controlsContainer.appendChild(increaseSizeBtn);
            controlsContainer.appendChild(moveRightBtn);
            controlsContainer.appendChild(rotate3DBtn);
            
            // Add delete button
            const deleteBtn = document.createElement('div');
            deleteBtn.className = 'sticker-delete';
            deleteBtn.textContent = '×';
            deleteBtn.style.position = 'absolute';
            deleteBtn.style.top = '-10px';
            deleteBtn.style.right = '-10px';
            deleteBtn.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
            deleteBtn.style.color = 'white';
            deleteBtn.style.borderRadius = '50%';
            deleteBtn.style.width = '20px';
            deleteBtn.style.height = '20px';
            deleteBtn.style.lineHeight = '20px';
            deleteBtn.style.textAlign = 'center';
            deleteBtn.style.fontSize = '14px';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.style.display = 'none';
            deleteBtn.style.zIndex = '10000';
            
            // Add elements to image container
            imageElement.appendChild(deleteBtn);
            imageElement.appendChild(controlsContainer);
            
            // Event handlers for size and position controls
            let currentScale = 1;
            const scaleStep = 0.2;
            let is3DActive = false;
            
            // Listen for container resizing to adjust sticker size proportionally
            const resizeObserver = new ResizeObserver(entries => {
                // Maintain size relative to container
                const containerWidth = backgroundContainer.clientWidth;
                const baseSizePercent = 15; // Base width as percentage of container
                contentElement.style.width = `${baseSizePercent * currentScale}%`;
            });
            
            // Observe size changes on the background container
            resizeObserver.observe(backgroundContainer);
            
            decreaseSizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentScale > 0.4) {
                    currentScale -= scaleStep;
                    // For images, adjust width percentage
                    const currentWidth = parseFloat(contentElement.style.width || '15');
                    contentElement.style.width = `${currentWidth * (1 - scaleStep)}%`;
                    // Also apply transform for 3D effect if active
                    contentElement.style.transform = is3DActive ? 'rotateY(15deg)' : 'none';
                }
            });
            
            increaseSizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentScale < 3) {
                    currentScale += scaleStep;
                    // For images, adjust width percentage
                    const currentWidth = parseFloat(contentElement.style.width || '15');
                    contentElement.style.width = `${currentWidth * (1 + scaleStep)}%`;
                    // Also apply transform for 3D effect if active
                    contentElement.style.transform = is3DActive ? 'rotateY(15deg)' : 'none';
                }
            });
            
            moveLeftBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Get current position as percentage of container width
                const containerWidth = backgroundContainer.clientWidth;
                const currentLeftPx = parseInt(imageElement.style.left, 10);
                const currentLeftPercent = (currentLeftPx / containerWidth) * 100;
                
                // Move left by 5% of container width
                const newLeftPercent = Math.max(0, currentLeftPercent - 5);
                imageElement.style.left = `${newLeftPercent}%`;
            });
            
            moveRightBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Get current position as percentage of container width
                const containerWidth = backgroundContainer.clientWidth;
                const currentLeftPx = parseInt(imageElement.style.left, 10);
                const currentLeftPercent = (currentLeftPx / containerWidth) * 100;
                
                // Move right by 5% of container width, but don't go beyond 95%
                const newLeftPercent = Math.min(95, currentLeftPercent + 5);
                imageElement.style.left = `${newLeftPercent}%`;
            });
            
            rotate3DBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                is3DActive = !is3DActive;
                
                if (is3DActive) {
                    contentElement.style.transform = 'rotateY(15deg)';
                    contentElement.style.boxShadow = '5px 0 15px rgba(0, 0, 0, 0.3)';
                    rotate3DBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                } else {
                    contentElement.style.transform = 'none';
                    contentElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
                    rotate3DBtn.style.backgroundColor = 'transparent';
                }
            });
            
            // Show controls, resize handles and delete button on hover
            imageElement.addEventListener('mouseenter', () => {
                deleteBtn.style.display = 'block';
                controlsContainer.style.display = 'flex';
                // Show resize handles
                Object.values(resizeHandles).forEach(handle => {
                    handle.style.display = 'block';
                });
            });
            
            imageElement.addEventListener('mouseleave', () => {
                deleteBtn.style.display = 'none';
                controlsContainer.style.display = 'none';
                // Hide resize handles
                Object.values(resizeHandles).forEach(handle => {
                    handle.style.display = 'none';
                });
            });
            
            // Handle deletion
            deleteBtn.addEventListener('click', () => {
                imageElement.remove();
            });
            
            // Make image draggable
            let isDragging = false;
            let offsetX = 0, offsetY = 0;
            
            imageElement.addEventListener('mousedown', (e) => {
                // Don't start drag if clicking a control button, resize handle, or delete button
                if ((e.target as Element).tagName === 'BUTTON' || 
                    (e.target as Element).classList.contains('sticker-delete') ||
                    (e.target as Element).classList.contains('resize-handle') ||
                    (e.target as Element).closest('.sticker-controls')) {
                    return;
                }
                
                isDragging = true;
                const rect = imageElement.getBoundingClientRect();
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
                    
                    // Ensure image stays within the container boundaries (0% to 95%)
                    const maxXPercent = 95;
                    const maxYPercent = 95;
                    
                    // Apply the new position as percentages
                    imageElement.style.left = `${Math.max(0, Math.min(leftPercent, maxXPercent))}%`;
                    imageElement.style.top = `${Math.max(0, Math.min(topPercent, maxYPercent))}%`;
                }
            };
            
            const handleMouseUp = () => {
                isDragging = false;
                isResizing = false;
                activeHandle = null;
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            
            // Handle corner resize functionality
            let isResizing = false;
            let activeHandle: string | null = null;
            let startWidth = 0;
            let startHeight = 0;
            let startX = 0;
            let startY = 0;
            
            // Add resize event listeners to each handle
            Object.entries(resizeHandles).forEach(([corner, handle]) => {
                handle.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    isResizing = true;
                    activeHandle = corner;
                    
                    // Get starting dimensions
                    const rect = contentElement.getBoundingClientRect();
                    startWidth = rect.width;
                    startHeight = rect.height;
                    
                    // Get starting mouse position
                    startX = e.clientX;
                    startY = e.clientY;
                    
                    // Prevent default to avoid text selection
                    e.preventDefault();
                });
            });
            
            // Add resize handling to document mousemove
            const handleResize = (e: MouseEvent) => {
                if (!isResizing || !activeHandle) return;
                
                // Calculate amount of movement
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                // Get the current dimensions and position
                const rect = contentElement.getBoundingClientRect();
                const aspectRatio = rect.width / rect.height;
                const containerRect = backgroundContainer.getBoundingClientRect();
                
                // Determine which direction to scale based on which corner is being dragged
                let scaleFactor = 1;
                
                // Calculate scale factor based on corner drag direction - INVERTED logic
                // When dragging outward, we want to increase size, and when dragging inward, decrease size
                if (activeHandle === 'top-left') {
                    // For top-left, dragging up-left (negative deltaX) should INCREASE size
                    scaleFactor = startWidth / (startWidth + deltaX);
                } else if (activeHandle === 'top-right') {
                    // For top-right, dragging up-right (positive deltaX) should INCREASE size
                    scaleFactor = (startWidth + deltaX) / startWidth;
                } else if (activeHandle === 'bottom-left') {
                    // For bottom-left, dragging down-left (negative deltaX) should INCREASE size
                    scaleFactor = startWidth / (startWidth + deltaX);
                } else if (activeHandle === 'bottom-right') {
                    // For bottom-right, dragging down-right (positive deltaX) should INCREASE size
                    scaleFactor = (startWidth + deltaX) / startWidth;
                }
                
                // Ensure minimum and maximum scale
                if (scaleFactor < 0.2) scaleFactor = 0.2;
                if (scaleFactor > 5) scaleFactor = 5; // Allow larger maximum
                
                // Set a minimum absolute size of 50px to prevent too small images
                let newWidth = startWidth * scaleFactor;
                if (newWidth < 50) {
                    scaleFactor = 50 / startWidth;
                    newWidth = 50;
                }
                
                // Get current width in pixels and convert to percentage
                const currentWidthPercent = (parseFloat(contentElement.style.width) || 15);
                
                // Apply the scale factor to get new width percentage
                const newWidthPercent = currentWidthPercent * scaleFactor;
                
                // Apply new size as percentage
                contentElement.style.width = `${newWidthPercent}%`;
                
                // Update current scale for other functions
                currentScale = newWidthPercent / 15; // 15 is the base percentage
                
                // Log for debugging
                console.log(`Resizing: corner=${activeHandle}, delta=${deltaX}, scaleFactor=${scaleFactor.toFixed(2)}, width=${newWidthPercent.toFixed(2)}%`);
            };
            
            document.addEventListener('mousemove', handleResize);
            
            // Add cleanup when image is removed
            imageElement.addEventListener('remove', () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('mousemove', handleResize);
                resizeObserver.disconnect(); // Stop observing when removing image
            });
            
            // Add to background container instead of body
            backgroundContainer.appendChild(imageElement);
            
            console.log('Image added successfully with controls:', imageElement);
        } catch (error) {
            console.error('Error adding image:', error);
        }
    };

    // Remove the now-unused canvas functions since we're adding images directly to the background
    const addImageToCanvas = (imageUrl: string) => {
        // Now we'll just use the addImageToBackground function instead
        addImageToBackground(imageUrl);
    };

    // Apply the selected background to the large video container
    useEffect(() => {
        // If collaborative mode is active and we're not the owner,
        // don't apply local background changes
        if (collaborativeMode && sharedBackground && !isOwner) {
            return;
        }

        applyBackground(selectedBackground);
        
        // Only save to localStorage if not in collaborative mode
        if (!collaborativeMode) {
                localStorage.setItem('hereFmBackground', selectedBackground);
            }
    }, [selectedBackground, customBackgrounds, collaborativeMode, sharedBackground, isOwner]);

    // Load the previously selected background from localStorage on component mount
    useEffect(() => {
        // Only load from localStorage if not in collaborative mode
        if (!collaborativeMode && !sharedBackground) {
        const savedBackground = localStorage.getItem('hereFmBackground');
        if (savedBackground) {
            setSelectedBackground(savedBackground);
            }
        }

        // Load custom backgrounds
        const savedCustomBgs = localStorage.getItem('hereFmCustomBackgrounds');
        if (savedCustomBgs) {
            try {
                const parsedBgs = JSON.parse(savedCustomBgs);
                setCustomBackgrounds(parsedBgs);
            } catch (e) {
                console.error('Error parsing custom backgrounds:', e);
            }
        }
    }, [collaborativeMode, sharedBackground]);

    // Modified handler for background changes - respect permissions
    const handleBackgroundChange = (backgroundId: string) => {
        setSelectedBackground(backgroundId);
        
        // Only broadcast changes if we're admin or have permission
        if ((isAdmin || hasPermission) && conference && localParticipant) {
            // Send the background change to all participants
            try {
                // Create the message payload
                const messageData = {
                    type: BACKGROUND_MESSAGE_TYPE,
                    action: BACKGROUND_ACTION.UPDATE,
                    backgroundId,
                    sender: localParticipant.id,
                    senderName: localParticipant.name || 'You',
                    timestamp: Date.now()
                };
                
                // Send the text message to the conference
                conference.sendTextMessage(JSON.stringify(messageData));
                
                // Update shared state
                setSharedBackground(backgroundId);
                setSharedBackgroundOwner(localParticipant.id);
                showBackgroundChangeIndicator(localParticipant.name || 'You');
                
                // Update global state
                if (window.backgroundSync) {
                    window.backgroundSync.activeCollaboration = true;
                    window.backgroundSync.currentBackground = backgroundId;
                    window.backgroundSync.owner = localParticipant.id;
                    window.backgroundSync.ownerName = localParticipant.name || 'You';
                }
                
                // Dispatch Redux action
                dispatch(createSharedBackgroundEvent({
                    backgroundId,
                    enabled: true
                }));
            } catch (error) {
                console.error('Error broadcasting background change:', error);
            }
        } else if (!hasPermission && collaborativeMode && conference && localParticipant) {
            // If not admin and no permission, show indicator and apply only locally
            applyBackground(backgroundId);
            showBackgroundChangeIndicator(undefined, 'Background changed only for you - ask for permission to change for everyone');
        }
    };

    // Initialize collaborative mode when component mounts
    useEffect(() => {
        if (conference && localParticipant && isAdmin && selectedBackground && selectedBackground !== 'default') {
            // Broadcast the current background when joining if admin
            try {
                // Create the message payload
                const messageData = {
                    type: BACKGROUND_MESSAGE_TYPE,
                    action: BACKGROUND_ACTION.UPDATE,
                    backgroundId: selectedBackground,
                    sender: localParticipant.id,
                    senderName: localParticipant.name || 'You',
                    timestamp: Date.now()
                };
                
                // Send the text message to the conference
                conference.sendTextMessage(JSON.stringify(messageData));
                
                // Update shared state
                setSharedBackground(selectedBackground);
                setSharedBackgroundOwner(localParticipant.id);
                
                // Update global state
                if (window.backgroundSync) {
                    window.backgroundSync.activeCollaboration = true;
                    window.backgroundSync.currentBackground = selectedBackground;
                    window.backgroundSync.owner = localParticipant.id;
                    window.backgroundSync.ownerName = localParticipant.name || 'You';
                }
                
                // Dispatch Redux action
                dispatch(createSharedBackgroundEvent({
                    backgroundId: selectedBackground,
                    enabled: true
                }));
            } catch (error) {
                console.error('Error initializing collaborative mode:', error);
            }
        }
    }, [conference, localParticipant, selectedBackground, isAdmin]);

    const toggleOptionsVisibility = () => {
        setShowOptions(!showOptions);
    };

    // Get the currently selected background name
    const getSelectedBackgroundName = (): string => {
        // First check predefined backgrounds
        const predefinedBg = BACKGROUNDS.find(bg => bg.id === selectedBackground);
        if (predefinedBg) {
            return predefinedBg.name;
        }
        
        // Then check custom backgrounds
        const customBg = customBackgrounds.find(bg => bg.id === selectedBackground);
        if (customBg) {
            return `Custom: ${customBg.name}`;
        }
        
        return 'Default';
    };

    // Get name of shared background owner
    const getBackgroundOwnerName = (): string => {
        if (!sharedBackgroundOwner) {
            return '';
        }
        
        if (sharedBackgroundOwner === localParticipant?.id) {
            return 'You';
        }
        
        // In a real implementation, you would look up the participant name
        // This is simplified for this example
        return 'Another participant';
    };

    const selectedBackgroundName = getSelectedBackgroundName();

    // Log the state of APP to help with debugging
    useEffect(() => {
        // Check if we can detect APP in various contexts
        console.warn('Checking for APP object availability:');
        console.warn('- Direct window.APP:', typeof window.APP !== 'undefined' ? 'Available' : 'Not available');
        console.warn('- APP constant:', typeof APP !== 'undefined' ? 'Available' : 'Not available');
        
        if (typeof window.APP !== 'undefined') {
            console.warn('- APP.conference:', typeof window.APP.conference !== 'undefined' ? 'Available' : 'Not available');
            
            if (typeof window.APP.conference !== 'undefined') {
                console.warn('- APP.conference.toggleVideoMuted:', 
                    typeof window.APP.conference.toggleVideoMuted === 'function' ? 'Available' : 'Not available');
            }
        }
        
        // Also try to find and log the video buttons in DOM
        const videoButtons = document.querySelectorAll('button');
        const potentialVideoButtons = Array.from(videoButtons).filter(button => {
            const text = button.textContent?.toLowerCase() || '';
            const className = button.className || '';
            const ariaLabel = button.getAttribute('aria-label') || '';
            
            return text.includes('camera') || 
                   text.includes('video') || 
                   className.includes('video') || 
                   ariaLabel.includes('camera');
        });
        
        console.warn('Potential video buttons found:', potentialVideoButtons.length);
        potentialVideoButtons.forEach((button, index) => {
            console.warn(`Button ${index}:`, {
                text: button.textContent,
                className: button.className,
                ariaLabel: button.getAttribute('aria-label')
            });
        });
    }, []);

    /**
     * Helper function to find a button in the DOM
     * @param {Array<string>} selectors - CSS selectors to try
     * @param {Array<string>} keywords - Keywords to look for in button text/class/data attributes
     * @returns {HTMLElement|null} - Found button or null
     */
    const findButton = (selectors: string[], keywords: string[]): HTMLElement | null => {
        // Try direct selectors first
        for (const selector of selectors) {
            const button = document.querySelector(selector);
            if (button) {
                return button as HTMLElement;
            }
        }
        
        // Try to find by data attributes
        const allElements = document.querySelectorAll('[data-testid], [data-role], [data-action]');
        // Convert NodeList to Array for iteration
        const elementsArray = Array.from(allElements);
        for (const element of elementsArray) {
            const testId = element.getAttribute('data-testid') || '';
            const role = element.getAttribute('data-role') || '';
            const action = element.getAttribute('data-action') || '';
            
            for (const keyword of keywords) {
                if (testId.includes(keyword) || role.includes(keyword) || action.includes(keyword)) {
                    return element as HTMLElement;
                }
            }
        }
        
        // Try to find by class name
        const allButtons = document.querySelectorAll('button, .button, [role="button"]');
        // Convert NodeList to Array for iteration
        const buttonsArray = Array.from(allButtons);
        for (const button of buttonsArray) {
            const className = button.className || '';
            const text = button.textContent?.toLowerCase() || '';
            
            for (const keyword of keywords) {
                if (className.includes(keyword) || text.includes(keyword)) {
                    return button as HTMLElement;
                }
            }
        }
        
        return null;
    };

    // Handle video on/off using direct DOM manipulation for reliability
    const toggleVideo = () => {
        try {
            console.warn('Attempting to toggle video with current state:', { isVideoOn });
            
            // Try to use window.APP directly first (most reliable if available)
            if (typeof window.APP !== 'undefined' && 
                typeof window.APP.conference !== 'undefined' && 
                typeof window.APP.conference.toggleVideoMuted === 'function') {
                
                console.warn('Using window.APP.conference.toggleVideoMuted()');
                window.APP.conference.toggleVideoMuted(true);
                return;
            }
            
            // Continue with the existing function...
            // Use the helper function to find the video button
            const videoButton = findButton(
                ['#videoButton', '.toolbox-button-video', '[aria-label="Stop camera"]', '[aria-label="Start camera"]'],
                ['video', 'camera', 'webcam']
            );
            
            if (videoButton) {
                console.warn('Found video button, clicking it directly:', videoButton);
                videoButton.click();
            } else {
                // Last resort: use the Redux action
                console.warn('No video button found, trying Redux action');
                dispatch(setVideoMuted(!isVideoOn, VIDEO_MUTISM_AUTHORITY.USER, true));
            }
        } catch (e) {
            console.error('Error toggling video:', e);
            
            // Final fallback
            try {
                dispatch(setVideoMuted(!isVideoOn, VIDEO_MUTISM_AUTHORITY.USER, true));
            } catch (error) {
                console.error('Final fallback failed:', error);
            }
        }
    };

    // Handle audio mute/unmute using similar direct approach
    const toggleAudio = () => {
        try {
            // Try to use window.APP directly first (most reliable if available)
            if (typeof window.APP !== 'undefined' && 
                typeof window.APP.conference !== 'undefined' && 
                typeof window.APP.conference.toggleAudioMuted === 'function') {
                
                console.warn('Using window.APP.conference.toggleAudioMuted()');
                window.APP.conference.toggleAudioMuted(true);
                return;
            }
            
            // Continue with the existing function...
            // Use the helper function to find the audio button
            const audioButton = findButton(
                ['#audioButton', '.toolbox-button-audio', '[aria-label="Mute"]', '[aria-label="Unmute"]'],
                ['audio', 'mute', 'mic', 'microphone']
            );
            
            if (audioButton) {
                console.warn('Found audio button, clicking it directly:', audioButton);
                audioButton.click();
            } else {
                // Last resort: use the Redux action
                console.warn('No audio button found, trying Redux action');
                dispatch(setAudioMuted(!isMuted));
            }
        } catch (e) {
            console.error('Error toggling audio:', e);
            
            // Final fallback
            try {
                dispatch(setAudioMuted(!isMuted));
            } catch (error) {
                console.error('Final fallback failed:', error);
            }
        }
    };

    const handleInvite = () => {
        // Use the built-in invite dialog action
        dispatch(beginAddPeople());
    };

    // Add a new function for settings
    const toggleSettingsMenu = () => {
        setShowSettingsMenu(!showSettingsMenu);
        
        // Close theme selector if it's open
        if (showThemeSelector) {
            setShowThemeSelector(false);
        }
    };
    
    const openThemeSelector = () => {
        setShowThemeSelector(true);
        setShowSettingsMenu(false);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        // Check if file is an image
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Check file size (limit to 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size too large (max 5MB)');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (dataUrl) {
                // Create unique id for the custom background
                const customId = `custom-${Date.now()}`;
                const newCustomBg = {
                    id: customId,
                    value: `url(${dataUrl})`,
                    type: 'image',
                    name: file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name
                };
                
                // Add to custom backgrounds and select it
                setCustomBackgrounds([...customBackgrounds, newCustomBg]);
                setSelectedBackground(customId);
                
                // Reset the input to allow selecting the same file again
                event.target.value = '';
            }
        };
        reader.readAsDataURL(file);
    };

    const handleDeleteBackground = (event: React.MouseEvent, backgroundId: string) => {
        // Stop the click event from bubbling up to the parent
        event.stopPropagation();
        
        // Remove the background from the custom backgrounds
        const updatedBackgrounds = customBackgrounds.filter(bg => bg.id !== backgroundId);
        setCustomBackgrounds(updatedBackgrounds);
        
        // If the deleted background is currently selected, switch to default
        if (selectedBackground === backgroundId) {
            setSelectedBackground('default');
        }
        
        // Update localStorage
        if (updatedBackgrounds.length > 0) {
            localStorage.setItem('hereFmCustomBackgrounds', JSON.stringify(updatedBackgrounds));
        } else {
            localStorage.removeItem('hereFmCustomBackgrounds');
        }
    };

    useEffect(() => {
        // Initialize the canvas for drawing
        const canvas = canvasRef.current;
        if (canvas) {
            // Set canvas size to match window
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            // Get drawing context
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = drawingColor;
                ctx.lineWidth = lineWidth;
                contextRef.current = ctx;
            }
        }
        
        // Add resize handler
        const handleResize = () => {
            if (canvas && contextRef.current) {
                // Create a temporary canvas to store the current drawing
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tempCtx = tempCanvas.getContext('2d');
                if (tempCtx) {
                    tempCtx.drawImage(canvas, 0, 0);
                    
                    // Resize the main canvas
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                    
                    // Restore the drawing
                    contextRef.current.drawImage(tempCanvas, 0, 0);
                    
                    // Reset context properties after resize
                    contextRef.current.lineCap = 'round';
                    contextRef.current.lineJoin = 'round';
                    contextRef.current.strokeStyle = drawingColor;
                    contextRef.current.lineWidth = lineWidth;
                }
            }
        };
        
        window.addEventListener('resize', handleResize);
        
        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);
    
    // Update context when drawing color or line width changes
    useEffect(() => {
        if (contextRef.current) {
            contextRef.current.strokeStyle = drawingColor;
            contextRef.current.lineWidth = lineWidth;
        }
    }, [drawingColor, lineWidth]);
    
    // Store points for the current stroke
    const [currentStrokePoints, setCurrentStrokePoints] = useState<Array<{x: number, y: number}>>([]);

    // Drawing functions with collaboration
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
        if (drawingTool !== 'none' && contextRef.current) {
            const canvas = canvasRef.current;
            if (!canvas) return;
            
            setIsDrawing(true);
            
            // Get mouse position relative to canvas
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Set starting point
            lastPosRef.current = { x, y };
            
            // Reset current stroke points and add first point
            setCurrentStrokePoints([{ x, y }]);
            
            if (drawingTool === 'pencil') {
                contextRef.current.globalCompositeOperation = 'source-over';
                contextRef.current.strokeStyle = drawingColor;
            } else if (drawingTool === 'eraser') {
                contextRef.current.globalCompositeOperation = 'destination-out';
                contextRef.current.strokeStyle = 'rgba(0,0,0,1)';
            }
            
            // Start new path
            contextRef.current.beginPath();
            contextRef.current.moveTo(x, y);
        }
    };
    
    const draw = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
        if (!isDrawing || !contextRef.current) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Get current mouse position
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Draw line from last position to current position
        contextRef.current.lineTo(x, y);
        contextRef.current.stroke();
        
        // Update last position
        lastPosRef.current = { x, y };
        
        // Add point to current stroke
        setCurrentStrokePoints(prev => [...prev, { x, y }]);
    };
    
    const stopDrawing = () => {
        if (isDrawing && contextRef.current) {
            contextRef.current.closePath();
            setIsDrawing(false);
            
            // Only broadcast if we have permission
            if ((isAdmin || hasPermission) && conference && localParticipant && currentStrokePoints.length > 0) {
                // Broadcast the drawing to other participants
                broadcastDrawingUpdate(
                    conference,
                    localParticipant,
                    {
                        points: currentStrokePoints,
                        color: drawingColor,
                        lineWidth: lineWidth,
                        tool: drawingTool as 'pencil' | 'eraser'
                    }
                );
            }
            
            // Reset stroke points
            setCurrentStrokePoints([]);
        }
    };
    
    const clearCanvas = () => {
        if (contextRef.current && canvasRef.current) {
            contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            
            // Broadcast canvas clear to other participants
            if ((isAdmin || hasPermission) && conference && localParticipant) {
                broadcastDrawingClear(conference, localParticipant);
            }
        }
    };
    
    const toggleDrawingTool = (tool: 'pencil' | 'eraser') => {
        // If selecting a drawing tool, deactivate text tool
        if (textToolActive) {
            setTextToolActive(false);
        }
        
        // Toggle the tool off if it's already selected
        if (drawingTool === tool) {
            setDrawingTool('none');
            console.log(`Deactivating ${tool} tool`);
        } else {
            setDrawingTool(tool);
            console.log(`Activating ${tool} tool`);
        }
    };

    // Add a new explicit function to handle text tool toggle
    const toggleTextTool = () => {
        console.log("%c TEXT TOOL TOGGLE", "background: #ff5733; color: white; padding: 2px;");
        console.log("Current text tool state:", textToolActive);
        console.log("Current drawing tool:", drawingTool);
        
        // If text tool is being activated, deactivate other drawing tools
        if (!textToolActive) {
            setDrawingTool('none');
        }
        
        setTextToolActive(!textToolActive);
        console.log("New text tool state:", !textToolActive);
    };
    
    const toggleColorPicker = () => {
        setShowColorPicker(!showColorPicker);
    };
    
    const selectColor = (color: string) => {
        setDrawingColor(color);
        setShowColorPicker(false);
    };

    // Open the sticker panel dialog
    const openStickerPanel = () => {
        dispatch(openDialog(StickerPanel));
    };

    // Get current theme colors
    const getCurrentTheme = () => {
        return THEMES.find(theme => theme.id === selectedTheme) || THEMES[0];
    };

    // Load the previously selected theme from localStorage on component mount
    useEffect(() => {
        const savedTheme = localStorage.getItem('selectedTheme');
        
        if (savedTheme) {
            setSelectedTheme(savedTheme);
        }
    }, []);

    useEffect(() => {
        if (!selectedTheme) return;
        
        // Get the selected theme
        const theme = THEMES.find(t => t.id === selectedTheme);
        if (!theme) return;
        
        // Apply theme to various elements
        document.body.style.setProperty('--background-color', theme.mainColor);
        document.body.style.setProperty('--accent-color', theme.accentColor);
        
        // Update button container background
        const buttonContainer = document.querySelector(`.${classes.buttonContainer}`);
        if (buttonContainer) {
            (buttonContainer as HTMLElement).style.background = theme.mainColor;
        }
        
        // Update drawing toolbar
        const drawingToolbar = document.querySelector(`.${classes.drawingToolbar}`);
        if (drawingToolbar) {
            (drawingToolbar as HTMLElement).style.background = theme.mainColor;
        }
        
        // Update invite button with theme's accent color
        const inviteButton = document.querySelector(`.${classes.inviteButton}`);
        if (inviteButton) {
            (inviteButton as HTMLElement).style.background = theme.accentColor;
            // Also update text color based on accent color brightness
            const brightness = getBrightness(theme.accentColor);
            (inviteButton as HTMLElement).style.color = brightness > 128 ? '#000' : '#fff';
        }
        
        // Store the selection in localStorage for persistence
        localStorage.setItem('selectedTheme', selectedTheme);
    }, [selectedTheme, classes.buttonContainer, classes.drawingToolbar, classes.inviteButton]);

    // Add a new function for theme settings
    const handleThemeChange = (themeId: string) => {
        setSelectedTheme(themeId);
        setShowThemeSelector(false);
    };

    // Function to grant permission to a participant
    const grantPermission = (participantId: string) => {
        if (!isAdmin || !conference || !localParticipant) return;
        
        try {
            // Update global state
            if (window.backgroundSync) {
                window.backgroundSync.permissionList.add(participantId);
                // Remove from requests if it was a request
                window.backgroundSync.permissionRequests.delete(participantId);
                if (isAdmin) {
                    setPermissionRequests(new Map(window.backgroundSync.permissionRequests));
                }
            }
            
            // Send permission grant message
            const messageData = {
                type: BACKGROUND_MESSAGE_TYPE,
                action: BACKGROUND_ACTION.GRANT_PERMISSION,
                sender: localParticipant.id,
                senderName: localParticipant.name || 'Admin',
                targetId: participantId,
                timestamp: Date.now()
            };
            
            conference.sendTextMessage(JSON.stringify(messageData));
            
            // Show feedback to admin that permission was granted
            const participantName = Array.from(participants.values())
                .find((p: any) => p.id === participantId)?.name || 'Participant';
            showBackgroundChangeIndicator(undefined, `Granted background control to ${participantName}`);
            
            console.log('Granted permission to:', participantId);
            
        } catch (error) {
            console.error('Error granting permission:', error);
        }
    };

    // Function to revoke permission from a participant
    const revokePermission = (participantId: string) => {
        if (!isAdmin || !conference || !localParticipant) return;
        
        try {
            // Update global state
            if (window.backgroundSync) {
                window.backgroundSync.permissionList.delete(participantId);
            }
            
            // Send permission revoke message
            const messageData = {
                type: BACKGROUND_MESSAGE_TYPE,
                action: BACKGROUND_ACTION.REVOKE_PERMISSION,
                sender: localParticipant.id,
                senderName: localParticipant.name || 'Admin',
                targetId: participantId,
                timestamp: Date.now()
            };
            
            conference.sendTextMessage(JSON.stringify(messageData));
            
            // Show feedback to admin that permission was revoked
            const participantName = Array.from(participants.values())
                .find((p: any) => p.id === participantId)?.name || 'Participant';
            showBackgroundChangeIndicator(undefined, `Revoked background control from ${participantName}`);
            
            console.log('Revoked permission from:', participantId);
            
        } catch (error) {
            console.error('Error revoking permission:', error);
        }
    };

    // Function to request permission from admin
    const requestPermission = async () => {
        if (!conference || !localParticipant) {
            console.error('Cannot request permission: conference or localParticipant not available');
            return;
        }
        
        try {
            await requestBackgroundPermission(conference, localParticipant);
            showBackgroundChangeIndicator(undefined, '🔵 Permission request sent to moderator');
        } catch (error) {
            console.error('Error requesting permission:', error);
        }
    };

    // Handle permission requests update
    const handlePermissionUpdate = (updatedRequests: Map<string, {name: string, timestamp: number}>) => {
        setPermissionRequests(updatedRequests);
    };

    // In the BackgroundSelector component, add a new state for the text tool and text input
    const [textToolActive, setTextToolActive] = useState(false);
    const [textInput, setTextInput] = useState("");
    const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
    const [texts, setTexts] = useState<Array<{id: string, text: string, position: {x: number, y: number}, color: string, fontSize: number}>>([]);

    // Add a new state variable to track the selected text for resizing
    const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

    // Update the text structure to include position for controls
    const addTextToCanvas = (text: string, position: {x: number, y: number}) => {
        if (!text.trim()) return;
        
        const newTextId = `text-${Date.now()}`;
        const newText = {
            id: newTextId,
            text,
            position,
            color: drawingColor,
            fontSize: textFontSize
        };
        
        // Add to local state
        setTexts(prev => [...prev, newText]);
        
        // Render to canvas
        if (contextRef.current && canvasRef.current) {
            const ctx = contextRef.current;
            ctx.font = `${textFontSize}px Arial`;
            ctx.fillStyle = drawingColor;
            ctx.fillText(text, position.x, position.y);
            
            // Set this as the selected text
            setSelectedTextId(newTextId);
            
            // Add controls below the text
            renderTextControls(newText);
        }
        
        // Broadcast to others if we have permission
        if ((isAdmin || hasPermission) && conference && localParticipant) {
            const messageData = {
                type: BACKGROUND_MESSAGE_TYPE,
                action: BACKGROUND_ACTION.TEXT_UPDATE,
                textData: newText,
                sender: localParticipant.id,
                senderName: localParticipant.name || 'You',
                timestamp: Date.now()
            };
            
            try {
                conference.sendTextMessage(JSON.stringify(messageData));
                
                // Show indicator for who added text
                showBackgroundChangeIndicator(
                    'You', 
                    'You added text to the background'
                );
            } catch (error) {
                console.error('Error broadcasting text update:', error);
            }
        }
        
        // Reset text input
        setTextInput("");
        setTextToolActive(false);
    };

    // Add a function to render the font size controls below the text
    const renderTextControls = (textItem: {id: string, text: string, position: {x: number, y: number}, color: string, fontSize: number}) => {
        if (!contextRef.current || !canvasRef.current) return;
        
        const ctx = contextRef.current;
        const { position, fontSize } = textItem;
        const controlsY = position.y + 25; // Position below the text
        
        // Create container for controls
        const controlsContainer = document.createElement('div');
        controlsContainer.id = `text-controls-${textItem.id}`;
        controlsContainer.style.position = 'absolute';
        controlsContainer.style.left = `${position.x}px`;
        controlsContainer.style.top = `${controlsY}px`;
        controlsContainer.style.display = 'flex';
        controlsContainer.style.alignItems = 'center';
        controlsContainer.style.zIndex = '100';
        controlsContainer.style.background = 'rgba(0, 0, 0, 0.7)';
        controlsContainer.style.borderRadius = '4px';
        controlsContainer.style.padding = '2px';
        
        // Create decrease button
        const decreaseBtn = document.createElement('button');
        decreaseBtn.innerHTML = '-';
        decreaseBtn.style.width = '24px';
        decreaseBtn.style.height = '24px';
        decreaseBtn.style.background = '#e74c3c';
        decreaseBtn.style.color = 'white';
        decreaseBtn.style.border = 'none';
        decreaseBtn.style.borderRadius = '4px';
        decreaseBtn.style.margin = '0 2px';
        decreaseBtn.style.cursor = 'pointer';
        
        // Create size display
        const sizeDisplay = document.createElement('span');
        sizeDisplay.textContent = `${fontSize}px`;
        sizeDisplay.style.color = 'white';
        sizeDisplay.style.padding = '0 5px';
        sizeDisplay.style.fontSize = '12px';
        
        // Create increase button
        const increaseBtn = document.createElement('button');
        increaseBtn.innerHTML = '+';
        increaseBtn.style.width = '24px';
        increaseBtn.style.height = '24px';
        increaseBtn.style.background = '#e74c3c';
        increaseBtn.style.color = 'white';
        increaseBtn.style.border = 'none';
        increaseBtn.style.borderRadius = '4px';
        increaseBtn.style.margin = '0 2px';
        increaseBtn.style.cursor = 'pointer';
        
        // Add event listeners
        decreaseBtn.onclick = (e) => {
            e.stopPropagation();
            updateTextSize(textItem.id, Math.max(8, fontSize - 2));
        };
        
        increaseBtn.onclick = (e) => {
            e.stopPropagation();
            updateTextSize(textItem.id, Math.min(72, fontSize + 2));
        };
        
        // Assemble and add to document
        controlsContainer.appendChild(decreaseBtn);
        controlsContainer.appendChild(sizeDisplay);
        controlsContainer.appendChild(increaseBtn);
        
        // Remove any existing controls
        const existingControls = document.getElementById(`text-controls-${textItem.id}`);
        if (existingControls) {
            existingControls.remove();
        }
        
        // Add to the canvas parent container
        if (canvasRef.current.parentElement) {
            canvasRef.current.parentElement.appendChild(controlsContainer);
            
            // Auto-hide controls after 3 seconds
            setTimeout(() => {
                if (document.getElementById(`text-controls-${textItem.id}`)) {
                    document.getElementById(`text-controls-${textItem.id}`)?.remove();
                }
            }, 3000);
        }
    };

    // Add a function to update text size
    const updateTextSize = (textId: string, newSize: number) => {
        // Update the text in local state
        const updatedTexts = texts.map(text => {
            if (text.id === textId) {
                return { ...text, fontSize: newSize };
            }
            return text;
        });
        
        setTexts(updatedTexts);
        
        // Clear and redraw all texts
        if (contextRef.current && canvasRef.current) {
            const ctx = contextRef.current;
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            
            // Redraw all texts
            updatedTexts.forEach(text => {
                ctx.font = `${text.fontSize}px Arial`;
                ctx.fillStyle = text.color;
                ctx.fillText(text.text, text.position.x, text.position.y);
            });
            
            // Render controls for the updated text
            const updatedText = updatedTexts.find(t => t.id === textId);
            if (updatedText) {
                renderTextControls(updatedText);
                
                // Broadcast the update if we have permission
                if ((isAdmin || hasPermission) && conference && localParticipant) {
                    const messageData = {
                        type: BACKGROUND_MESSAGE_TYPE,
                        action: BACKGROUND_ACTION.TEXT_UPDATE,
                        textData: updatedText,
                        sender: localParticipant.id,
                        senderName: localParticipant.name || 'You',
                        timestamp: Date.now()
                    };
                    
                    try {
                        conference.sendTextMessage(JSON.stringify(messageData));
                    } catch (error) {
                        console.error('Error broadcasting text update:', error);
                    }
                }
            }
        }
    };

    // Update canvas click to handle text selection
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        // Don't process clicks when we're dragging text
        if (isDraggingText) return;
        
        // Rest of the function remains the same
        console.log("%c CANVAS CLICKED", "background: #3498db; color: white; padding: 2px; font-size: 16px;");
        
        if (textToolActive && canvasRef.current) {
            e.stopPropagation();
            
            const rect = canvasRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            setTimeout(() => {
                const text = window.prompt("Enter text to add:", "");
                if (text && text.trim()) {
                    addTextToCanvas(text, {x, y});
                }
            }, 10);
        } else if (!isDraggingText) {
            // Check if we clicked on any existing text for showing controls
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect && contextRef.current) {
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                // Check all texts to see if we clicked on one
                for (const text of texts) {
                    contextRef.current.font = `${text.fontSize}px Arial`;
                    const textWidth = contextRef.current.measureText(text.text).width;
                    const textHeight = text.fontSize;
                    
                    if (
                        x >= text.position.x && 
                        x <= text.position.x + textWidth && 
                        y >= text.position.y - textHeight && 
                        y <= text.position.y
                    ) {
                        setSelectedTextId(text.id);
                        renderTextControls(text);
                        break;
                    }
                }
            }
        }
    };

    // Add a useEffect to alert when text tool is active
    useEffect(() => {
        if (textToolActive) {
            // Make it visually obvious that text tool is active
            console.log("%c TEXT TOOL ACTIVE - CLICK ON CANVAS", "background: #e74c3c; color: white; font-size: 14px; padding: 5px;");
            alert("Text tool is active! Click on the canvas to add text.");
        }
    }, [textToolActive]);

    // Add fontSize state to the component
    const [textFontSize, setTextFontSize] = useState(18);

    // Add drag state tracking variables
    const [isDraggingText, setIsDraggingText] = useState(false);
    const [draggedTextId, setDraggedTextId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Add the editTextInPlace function to handle double-click editing
    const editTextInPlace = (textItem: {id: string, text: string, position: {x: number, y: number}, color: string, fontSize: number}, x: number, y: number) => {
        if (!canvasRef.current) return;
        
        // Create an input element positioned at the text location
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = textItem.text;
        textInput.style.position = 'absolute';
        textInput.style.left = `${textItem.position.x}px`;
        textInput.style.top = `${textItem.position.y - textItem.fontSize}px`;
        textInput.style.font = `${textItem.fontSize}px Arial`;
        textInput.style.color = textItem.color;
        textInput.style.background = 'rgba(255, 255, 255, 0.8)';
        textInput.style.border = `1px solid ${textItem.color}`;
        textInput.style.borderRadius = '3px';
        textInput.style.padding = '2px 5px';
        textInput.style.zIndex = '1000';
        textInput.style.width = `${Math.max(200, contextRef.current?.measureText(textItem.text).width || 0) + 20}px`;
        
        // Add the input to the canvas parent
        if (canvasRef.current.parentElement) {
            canvasRef.current.parentElement.appendChild(textInput);
            textInput.focus();
            textInput.select();
            
            // Handle input confirmation
            const confirmEdit = () => {
                if (textInput.value.trim()) {
                    // Update the text
                    updateTextContent(textItem.id, textInput.value);
                }
                
                // Remove the input
                if (canvasRef.current?.parentElement) {
                    canvasRef.current.parentElement.removeChild(textInput);
                }
            };
            
            // Confirm on Enter or blur
            textInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    confirmEdit();
                } else if (e.key === 'Escape') {
                    if (canvasRef.current?.parentElement) {
                        canvasRef.current.parentElement.removeChild(textInput);
                    }
                }
            };
            
            textInput.onblur = () => {
                confirmEdit();
            };
        }
    };

    // Add the updateTextContent function to update text and sync changes
    const updateTextContent = (textId: string, newContent: string) => {
        // Update the text in local state
        const updatedTexts = texts.map(text => {
            if (text.id === textId) {
                return { ...text, text: newContent };
            }
            return text;
        });
        
        setTexts(updatedTexts);
        
        // Clear and redraw all texts
        if (contextRef.current && canvasRef.current) {
            const ctx = contextRef.current;
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            
            // Redraw all texts
            updatedTexts.forEach(text => {
                ctx.font = `${text.fontSize}px Arial`;
                ctx.fillStyle = text.color;
                ctx.fillText(text.text, text.position.x, text.position.y);
            });
            
            // Find the updated text
            const updatedText = updatedTexts.find(t => t.id === textId);
            if (updatedText) {
                // Broadcast the update if we have permission
                if ((isAdmin || hasPermission) && conference && localParticipant) {
                    const messageData = {
                        type: BACKGROUND_MESSAGE_TYPE,
                        action: BACKGROUND_ACTION.TEXT_UPDATE,
                        textData: updatedText,
                        sender: localParticipant.id,
                        senderName: localParticipant.name || 'You',
                        timestamp: Date.now()
                    };
                    
                    try {
                        conference.sendTextMessage(JSON.stringify(messageData));
                        showBackgroundChangeIndicator('You', 'You edited text');
                    } catch (error) {
                        console.error('Error broadcasting text update:', error);
                    }
                }
            }
        }
    };

    // Replace the toggleChat function with a handleChatInputTap function
    // const toggleChat = () => {
    //     setShowChat(!showChat);
    // };
    const handleChatInputTap = () => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;
        
        // Detect double tap (if tap happened within 300ms of last tap)
        if (tapLength < 300 && tapLength > 0) {
            setIsChatCollapsed(!isChatCollapsed);
        }
        
        setLastTapTime(currentTime);
    };

    // Add a ChatIcon component near the other icon components
    const ChatIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
    );

    // Replace the chat toggle button with the icon
    // <button 
    //     className={classes.chatToggleButton}
    //     onClick={handleChatInputTap}
    //     title="Toggle Chat">
    //     <ChatIcon />
    // </button>

    // Add a state for chat input text
    const [chatInputText, setChatInputText] = useState('');

    // Add emoji and GIF icon components
    const EmojiIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
            <line x1="9" y1="9" x2="9.01" y2="9"></line>
            <line x1="15" y1="9" x2="15.01" y2="9"></line>
        </svg>
    );

    const GifIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M10 8H6V16H8V12H10V16H12V8H10Z" fill="currentColor"/>
            <path d="M16 8H14V16H16V8Z" fill="currentColor"/>
            <path d="M21 5H3C1.89543 5 1 5.89543 1 7V17C1 18.1046 1.89543 19 3 19H21C22.1046 19 23 18.1046 23 17V7C23 5.89543 22.1046 5 21 5Z" stroke="currentColor" strokeWidth="2"/>
        </svg>
    );

    // Create a function to send chat messages
    const sendChatMessage = () => {
        if (chatInputText.trim()) {
            dispatch(sendMessage(chatInputText));
            setChatInputText('');
        }
    };

    // Handle Enter key press in chat input
    const handleChatKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    };

    // Add a useEffect to hide the Jitsi logo when the component mounts
    useEffect(() => {
        // Hide the Jitsi watermark logo
        const watermark = document.querySelector('.watermark');
        if (watermark) {
            (watermark as HTMLElement).style.display = 'none';
        }

        // Also try to find it by ID
        const watermarkById = document.getElementById('jitsiLogo');
        if (watermarkById) {
            watermarkById.style.display = 'none';
        }
        
        // Try to hide any other potential logo elements
        const logoElements = document.querySelectorAll('.jitsi-logo, .jitsi-watermark, #watermark');
        logoElements.forEach(el => {
            (el as HTMLElement).style.display = 'none';
        });

        // Return cleanup function to restore logo if needed
        return () => {
            if (watermark) {
                (watermark as HTMLElement).style.display = '';
            }
            if (watermarkById) {
                watermarkById.style.display = '';
            }
            logoElements.forEach(el => {
                (el as HTMLElement).style.display = '';
            });
        };
    }, []);

    // Remove the @global style and useEffect we added before, and add this simple useEffect instead
    useEffect(() => {
        // Create a style element
        const style = document.createElement('style');
        style.innerHTML = `
            .watermark, #jitsiLogo, .jitsi-logo, .watermark-image, .leftwatermark, .rightwatermark {
                display: none !important;
            }
            
            /* Hide the local video container on the left side */
            #filmstripLocalVideo, #filmstripLocalVideoContainer, #filmstripLocalVideoThumbnail, 
            #localVideoContainer, #localVideoWrapper {
                display: none !important;
            }
        `;
        style.id = 'hide-jitsi-logo';
        
        // Append it to head
        document.head.appendChild(style);
        
        // Clean up function to remove the style when component unmounts
        return () => {
            const styleElement = document.getElementById('hide-jitsi-logo');
            if (styleElement) {
                styleElement.remove();
            }
        };
    }, []);

    // Add a function to handle the Members button click
    const handleMembersClick = () => {
        // Dispatch the action to open the participants pane
        dispatch({ type: 'PARTICIPANTS_PANE_OPEN' });
    };

    // Add this component somewhere after the other icon components
    /**
     * ParticipantsList Component - Displays all participants in small avatars on the side
     */
    const ParticipantsList = ({ 
        participants, 
        localParticipant, 
        isAdmin, 
        adminId, 
        permissionList, 
        currentDrawer 
    }: { 
        participants: Array<any>,
        localParticipant: any,
        isAdmin: boolean,
        adminId: string | null,
        permissionList: Set<string>,
        currentDrawer: string | null
    }) => {
        const { classes, cx } = useStyles();
        const dispatch = useDispatch();
        
        // Function to handle inviting new people
        const handleInvite = () => {
            dispatch(beginAddPeople());
        };
        
        // Combine local participant with remote participants
        const allParticipants = localParticipant ? [localParticipant, ...participants] : [...participants];
        
        return (
            <div className={classes.participantsList}>
                {allParticipants.map(participant => {
                    const isLocal = participant.id === localParticipant?.id;
                    const isParticipantAdmin = participant.id === adminId;
                    const hasPermission = permissionList.has(participant.id);
                    const isActiveDrawer = participant.id === currentDrawer;
                    
                    return (
                        <div 
                            key={participant.id} 
                            className={cx(
                                classes.participantItem,
                                { [classes.activeParticipant]: isActiveDrawer }
                            )}
                            title={`${participant.name}${isLocal ? ' (You)' : ''}`}
                        >
                            <Avatar 
                                participantId={participant.id}
                                size={36}
                            />
                            
                            <div className={classes.participantName}>
                                {participant.name}{isLocal ? ' (You)' : ''}
                            </div>
                            
                            {isParticipantAdmin && (
                                <div className={classes.adminBadge} title="Admin">
                                    A
                                </div>
                            )}
                        </div>
                    );
                })}
                
                {/* Add participant button */}
                <button 
                    className={classes.addParticipantButton}
                    onClick={handleInvite}
                    title="Invite people"
                >
                    <PlusIcon />
                </button>
            </div>
        );
    };

    // Define a PlusIcon component
    const PlusIcon = () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
        </svg>
    );

    // Add a BackIcon component for the back button
    const BackIcon = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z" fill="white"/>
        </svg>
    );

    // Add a handler function for the back button
    const handleBackClick = () => {
        // Use APP.conference directly to leave the meeting
        sendAnalytics(createToolbarEvent('hangup'));
        
        if (typeof APP !== 'undefined' && APP.conference && typeof APP.conference.hangup === 'function') {
            // Use optional chaining and type checking for safety
            APP.conference.hangup?.(false);
        } else {
            // Fallback if APP is not available
            window.history.back();
        }
    };

    // Add new interfaces for templates
    interface Template {
        id: string;
        name: string;
        backgroundId: string;
        stickers: Array<{
            type: 'emoji' | 'image';
            content: string;
            position: { x: number; y: number };
            size: number;
            rotation: number;
        }>;
        createdAt: number;
    }

    // Add new state variables
    const [templates, setTemplates] = useState<Template[]>([]);
    const [showTemplates, setShowTemplates] = useState(false);
    const [templateName, setTemplateName] = useState('');

    // Add new functions for template management
    const saveAsTemplate = () => {
        if (!templateName.trim()) return;
        
        // Use selectedBackground instead of currentBackground
        // and check if stickers is defined before using it
        const newTemplate: Template = {
            id: Date.now().toString(),
            name: templateName.trim(),
            backgroundId: selectedBackground || 'default', // Use selectedBackground state variable
            stickers: Array.isArray(stickers) ? stickers.map(sticker => ({
                type: sticker.type,
                content: sticker.content,
                position: sticker.position,
                size: sticker.size,
                rotation: sticker.rotation
            })) : [], // Add a check if stickers exists
            createdAt: Date.now()
        };

        setTemplates(prev => [...prev, newTemplate]);
        setTemplateName('');
        setShowTemplates(false);
        
        // Save to localStorage
        const savedTemplates = JSON.parse(localStorage.getItem('backgroundTemplates') || '[]');
        localStorage.setItem('backgroundTemplates', JSON.stringify([...savedTemplates, newTemplate]));
    };

    const loadTemplate = (template: Template) => {
        // Apply background
        handleBackgroundChange(template.backgroundId);
        
        // Clear existing stickers
        setStickers([]);
        
        // Add template stickers safely
        if (Array.isArray(template.stickers)) {
            template.stickers.forEach(sticker => {
                addSticker(
                    sticker.type, 
                    sticker.content, 
                    sticker.position, 
                    sticker.size, 
                    sticker.rotation
                );
            });
        }
        
        setShowTemplates(false);
    };

    const deleteTemplate = (templateId: string) => {
        setTemplates(prev => prev.filter(t => t.id !== templateId));
        
        // Update localStorage
        const savedTemplates = JSON.parse(localStorage.getItem('backgroundTemplates') || '[]');
        localStorage.setItem('backgroundTemplates', JSON.stringify(savedTemplates.filter((t: Template) => t.id !== templateId)));
    };

    // Add useEffect to load templates from localStorage
    useEffect(() => {
        const savedTemplates = localStorage.getItem('backgroundTemplates');
        if (savedTemplates) {
            setTemplates(JSON.parse(savedTemplates));
        }
    }, []);

    // Add template icon component
    const TemplateIcon = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 7H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 12H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 17H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );

    // Add template button to the drawing toolbar
    <button 
        className={classes.drawingButton}
        onClick={() => setShowTemplates(!showTemplates)}
        title="Templates">
        <TemplateIcon />
    </button>

    // Add template panel component
    {showTemplates && (
        <div className={classes.templatePanel}>
            <div className={classes.templateHeader}>
                <h3>Templates</h3>
                <button onClick={() => setShowTemplates(false)}>×</button>
            </div>
            
            <div className={classes.templateList}>
                {templates.map(template => (
                    <div key={template.id} className={classes.templateItem}>
                        <div className={classes.templatePreview}>
                            <img 
                                src={findBackgroundById(template.backgroundId)?.thumbnail ?? ''}
                                alt={template.name}
                            />
                        </div>
                        <div className={classes.templateInfo}>
                            <span>{template.name}</span>
                            <div className={classes.templateActions}>
                                <button onClick={() => loadTemplate(template)}>Load</button>
                                <button onClick={() => deleteTemplate(template.id)}>Delete</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className={classes.saveTemplate}>
                <input
                    type="text"
                    placeholder="Template name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                />
                <button onClick={saveAsTemplate}>Save Current as Template</button>
            </div>
        </div>
    )}

    // Add new state for editing
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [roomTitle, setRoomTitle] = useState('Yarashii Room');

    // Add new function to handle title update
    const handleTitleUpdate = () => {
        setIsEditingTitle(false);
        // Here you can add logic to update the room name in your backend if needed
    };

    // Add sticker helper function
    const addSticker = (
        type: 'emoji' | 'image',
        content: string,
        position: { x: number; y: number },
        size: number,
        rotation: number
    ) => {
        setStickers(prev => [...prev, {
            type,
            content,
            position,
            size,
            rotation
        }]);
    };

    return (
        <>
            {/* Back button */}
            <div 
                className={classes.backButton}
                onClick={handleBackClick}
                role="button"
                tabIndex={0}
                aria-label="Go back">
                <BackIcon />
            </div>
        
            <div className={classes.buttonContainer}>
                <span className={classes.titleBar}>
                    {isEditingTitle ? (
                        <input
                            type="text"
                            value={roomTitle}
                            onChange={(e) => setRoomTitle(e.target.value)}
                            onBlur={handleTitleUpdate}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleTitleUpdate();
                                }
                            }}
                            autoFocus
                            className={classes.titleInput}
                        />
                    ) : (
                        <span onDoubleClick={() => setIsEditingTitle(true)}>
                            {roomTitle}
                        </span>
                    )}
                </span>
                
                <button 
                    className={cx(
                        classes.mediaButton,
                        isMuted ? classes.inactiveMediaButton : classes.activeMediaButton
                    )} 
                    onClick={toggleAudio}
                    title={isMuted ? "Unmute" : "Mute"}>
                    <span className={classes.buttonIcon}>
                        {isMuted ? <MicOffIcon /> : <MicIcon />}
                    </span>
                </button>
                
                <button 
                    className={cx(
                        classes.mediaButton,
                        isVideoOn ? classes.activeMediaButton : classes.inactiveMediaButton
                    )} 
                    onClick={toggleVideo}
                    title={isVideoOn ? "Turn off camera" : "Turn on camera"}>
                    <span className={classes.buttonIcon}>
                        {isVideoOn ? <VideoIcon /> : <VideoOffIcon />}
                    </span>
                </button>
                
                <button 
                    className={classes.backgroundButton} 
                    onClick={toggleOptionsVisibility}
                    title="Change background">
                    <span className={classes.buttonIcon}>
                        <BackgroundIcon />
                    </span>
                    {sharedBackground && (
                        <div className={classes.collaborativeBadge}>
                            Shared
                        </div>
                    )}
                </button>

                {/* Add the Members button right here */}
                <button 
                    className={classes.mediaButton} 
                    onClick={handleMembersClick}
                    title="Members">
                    <span className={classes.buttonIcon}>
                        <MembersIcon />
                    </span>
                </button>

                {/* Add collaborative mode indicator instead of toggle button */}
                {participantCount > 1 && (
                    <button 
                        className={cx(
                            classes.collaborativeButton,
                            {
                                [classes.activeCollaborativeButton]: isAdmin || hasPermission,
                                [classes.disabledCollaborativeButton]: !isAdmin && !hasPermission
                            }
                        )} 
                        onClick={!isAdmin && !hasPermission ? requestPermission : undefined}
                        title={isAdmin ? "You are the admin" : hasPermission ? "You can change backgrounds for everyone" : "Request permission to change backgrounds"}>
                        <span className={classes.buttonIcon}>
                            {isAdmin ? <AdminIcon /> : <PermissionIcon />}
                        </span>
                    </button>
                )}
                
                <button 
                    className={classes.toggleButton} 
                    onClick={toggleSettingsMenu}
                    title="Settings">
                    <span className={classes.buttonIcon}>
                        <SettingsIcon />
                    </span>
                </button>
            </div>
            
            {/* Simplified Settings Menu */}
            {showSettingsMenu && (
                <SettingsMenu onThemeClick={openThemeSelector} />
            )}
            
            {/* Simplified Theme selector popover */}
            {showThemeSelector && (
                <div className={classes.themePopover}>
                    <div className={classes.themeTitle}>Select Theme</div>
                    <div className={classes.themesContainer}>
                        {THEMES.map(theme => (
                            <div
                                key={theme.id}
                                className={cx(
                                    classes.themeOption,
                                    { [classes.activeTheme]: selectedTheme === theme.id }
                                )}
                                style={{ background: theme.mainColor }}
                                onClick={() => handleThemeChange(theme.id)}
                                title={theme.name}
                            />
                        ))}
                    </div>
                </div>
            )}
            
            <button 
                className={classes.inviteButton}
                onClick={handleInvite}
                title="Invite others">
                <span className={classes.plusSign}>+</span>
                Invite
            </button>

            {/* Drawing tools toolbar with additional CloudUpload button */}
            <div className={classes.drawingToolbar}>
                <button 
                    className={cx(
                        classes.drawingButton,
                        { [classes.activeDrawingTool]: drawingTool === 'pencil' }
                    )}
                    onClick={() => toggleDrawingTool('pencil')}
                    title="Pencil">
                    <PencilIcon />
                </button>
                
                <button 
                    className={cx(
                        classes.drawingButton,
                        { [classes.activeDrawingTool]: drawingTool === 'eraser' }
                    )}
                    onClick={() => toggleDrawingTool('eraser')}
                    title="Eraser">
                    <EraserIcon />
                </button>
                
                <button 
                    className={cx(
                        classes.drawingButton,
                        { [classes.activeDrawingTool]: textToolActive }
                    )}
                    onClick={toggleTextTool}
                    title="Add Text"
                    style={{ 
                        border: textToolActive ? '2px solid #e74c3c' : 'none',
                        boxShadow: textToolActive ? '0 0 5px #e74c3c' : 'none' 
                    }}>
                    <TextIcon />
                </button>
                
                {/* Add font size controls right after text button */}
                {textToolActive && (
                    <>
                        <button 
                            className={classes.drawingButton}
                            onClick={() => setTextFontSize(prev => Math.max(8, prev - 2))}
                            title="Decrease font size">
                            <FontDecreaseIcon />
                        </button>
                        <div className={classes.fontSizeDisplay} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            minWidth: '40px',
                            height: '40px',
                            background: 'transparent',
                            color: 'white',
                            borderRadius: '4px',
                            margin: '0 4px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}>
                            {textFontSize}px
                        </div>
                        <button 
                            className={classes.drawingButton}
                            onClick={() => setTextFontSize(prev => Math.min(72, prev + 2))}
                            title="Increase font size">
                            <FontIncreaseIcon />
                        </button>
                    </>
                )}
                
                <button 
                    className={classes.drawingButton}
                    onClick={toggleColorPicker}
                    title="Color">
                    <span style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        position: 'relative' 
                    }}>
                        <ColorIcon />
                        <span style={{ 
                            position: 'absolute', 
                            bottom: '-5px', 
                            right: '-5px', 
                            width: '10px', 
                            height: '10px', 
                            borderRadius: '50%', 
                            background: drawingColor,
                            border: '1px solid white'
                        }}></span>
                    </span>
                </button>
                
                <button 
                    className={classes.drawingButton}
                    onClick={openStickerPanel}
                    title="Add stickers and GIFs">
                    <GifIcon />
                </button>

                <label className={classes.drawingButton} title="Upload and add images">
                    <CloudUploadIcon />
                    <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={handleImageUpload}
                        multiple
                    />
                </label>
                
                <button 
                    className={classes.drawingButton}
                    onClick={clearCanvas}
                    title="Clear Canvas">
                    <ClearIcon />
                </button>
                
                {/* Add More Options button */}
                <button 
                    className={classes.drawingButton}
                    onClick={() => setShowMoreOptions(!showMoreOptions)}
                    title="More Options">
                    <MoreOptionsIcon />
                </button>
                
                {showColorPicker && (
                    <div className={classes.colorGrid}>
                        {COLORS.map(color => (
                            <div
                                key={color.id}
                                className={cx(
                                    classes.colorOption,
                                    { [classes.activeColor]: drawingColor === color.value }
                                )}
                                style={{ background: color.value }}
                                onClick={() => selectColor(color.value)}
                                title={color.id}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Canvas for drawing */}
            <canvas
                ref={canvasRef}
                className={cx(
                    classes.canvas,
                    { 
                        [classes.canvasDraw]: drawingTool === 'pencil',
                        [classes.canvasErase]: drawingTool === 'eraser' 
                        // Remove the canvasText class since it's not defined
                    }
                )}
                style={{
                    cursor: isDraggingText ? 'move' : (textToolActive ? 'text' : (drawingTool === 'none' ? 'default' : 'crosshair')),
                    pointerEvents: 'auto', // Ensure clicks are captured
                    zIndex: textToolActive ? 100 : 5 // Increase z-index when text tool is active
                }}
                onMouseDown={(e) => {
                    // First check if we're clicking on text for dragging
                    const rect = canvasRef.current?.getBoundingClientRect();
                    if (rect && contextRef.current && drawingTool === 'none' && !textToolActive) {
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        
                        // Check all texts to see if we clicked on one
                        for (const text of texts) {
                            contextRef.current.font = `${text.fontSize}px Arial`;
                            const textWidth = contextRef.current.measureText(text.text).width;
                            const textHeight = text.fontSize;
                            
                            if (
                                x >= text.position.x && 
                                x <= text.position.x + textWidth && 
                                y >= text.position.y - textHeight && 
                                y <= text.position.y
                            ) {
                                setIsDraggingText(true);
                                setDraggedTextId(text.id);
                                setDragOffset({
                                    x: x - text.position.x,
                                    y: y - text.position.y
                                });
                                e.preventDefault();
                                return;
                            }
                        }
                    }
                    
                    // If not dragging text, proceed with normal drawing
                    if (drawingTool !== 'none') {
                        startDrawing(e);
                    }
                }}
                onMouseMove={(e) => {
                    if (isDraggingText && draggedTextId) {
                        e.preventDefault();
                        const rect = canvasRef.current?.getBoundingClientRect();
                        if (rect && contextRef.current) {
                            const x = e.clientX - rect.left;
                            const y = e.clientY - rect.top;
                            
                            // Update text position
                            const updatedTexts = texts.map(text => {
                                if (text.id === draggedTextId) {
                                    return {
                                        ...text,
                                        position: {
                                            x: x - dragOffset.x,
                                            y: y - dragOffset.y
                                        }
                                    };
                                }
                                return text;
                            });
                            
                            // Redraw all texts
                            if (contextRef.current && canvasRef.current) {
                                const ctx = contextRef.current;
                                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                                
                                updatedTexts.forEach(text => {
                                    ctx.font = `${text.fontSize}px Arial`;
                                    ctx.fillStyle = text.color;
                                    ctx.fillText(text.text, text.position.x, text.position.y);
                                });
                            }
                            
                            // Update state
                            setTexts(updatedTexts);
                        }
                    } else if (isDrawing) {
                        draw(e);
                    }
                }}
                onMouseUp={(e) => {
                    if (isDraggingText && draggedTextId) {
                        e.preventDefault();
                        
                        // Get the updated text after dragging
                        const updatedText = texts.find(text => text.id === draggedTextId);
                        if (updatedText && (isAdmin || hasPermission) && conference && localParticipant) {
                            // Broadcast text position update
                            const messageData = {
                                type: BACKGROUND_MESSAGE_TYPE,
                                action: BACKGROUND_ACTION.TEXT_UPDATE,
                                textData: updatedText,
                                sender: localParticipant.id,
                                senderName: localParticipant.name || 'You',
                                timestamp: Date.now()
                            };
                            
                            try {
                                conference.sendTextMessage(JSON.stringify(messageData));
                                showBackgroundChangeIndicator('You', 'You moved text');
                            } catch (error) {
                                console.error('Error broadcasting text update:', error);
                            }
                        }
                        
                        // Reset drag state
                        setIsDraggingText(false);
                        setDraggedTextId(null);
                        
                        // Show controls for the text we just dragged
                        if (updatedText) {
                            setSelectedTextId(draggedTextId);
                            renderTextControls(updatedText);
                        }
                    } else if (isDrawing) {
                        stopDrawing();
                    }
                }}
                onMouseLeave={(e) => {
                    if (isDraggingText) {
                        // Treat like a mouse up but directly implement the logic here
                        if (draggedTextId) {
                            e.preventDefault();
                            
                            // Get the updated text after dragging
                            const updatedText = texts.find(text => text.id === draggedTextId);
                            if (updatedText && (isAdmin || hasPermission) && conference && localParticipant) {
                                // Broadcast text position update
                                const messageData = {
                                    type: BACKGROUND_MESSAGE_TYPE,
                                    action: BACKGROUND_ACTION.TEXT_UPDATE,
                                    textData: updatedText,
                                    sender: localParticipant.id,
                                    senderName: localParticipant.name || 'You',
                                    timestamp: Date.now()
                                };
                                
                                try {
                                    conference.sendTextMessage(JSON.stringify(messageData));
                                    showBackgroundChangeIndicator('You', 'You moved text');
                                } catch (error) {
                                    console.error('Error broadcasting text update:', error);
                                }
                            }
                            
                            // Reset drag state
                            setIsDraggingText(false);
                            setDraggedTextId(null);
                            
                            // Show controls for the text we just dragged
                            if (updatedText) {
                                setSelectedTextId(draggedTextId);
                                renderTextControls(updatedText);
                            }
                        }
                    } else if (isDrawing) {
                        stopDrawing();
                    }
                }}
                onClick={handleCanvasClick}
                onDoubleClick={(e) => {
                    // Check if we double-clicked on any text to edit it
                    const rect = canvasRef.current?.getBoundingClientRect();
                    if (rect && contextRef.current) {
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        
                        // Check all texts to see if we clicked on one
                        for (const text of texts) {
                            contextRef.current.font = `${text.fontSize}px Arial`;
                            const textWidth = contextRef.current.measureText(text.text).width;
                            const textHeight = text.fontSize;
                            
                            if (
                                x >= text.position.x && 
                                x <= text.position.x + textWidth && 
                                y >= text.position.y - textHeight && 
                                y <= text.position.y
                            ) {
                                // Found the text to edit - handle double-click for editing
                                editTextInPlace(text, x, y);
                                e.preventDefault();
                                e.stopPropagation();
                                return;
                            }
                        }
                    }
                }}
            />

            {showOptions && (
                <div className={classes.container}>
                    <div className={classes.title}>
                        <span onClick={toggleOptionsVisibility} style={{ cursor: 'pointer' }}>
                            Background: {selectedBackgroundName} 
                            {sharedBackground && (
                                <span style={{ marginLeft: '5px', color: '#2e7d32' }}>
                                    (Shared by {getBackgroundOwnerName()})
                                </span>
                            )}
                            <span style={{ marginLeft: '5px' }}>✕</span>
                        </span>
                    </div>
                    
                    {/* Show message when someone else is controlling the background */}
                    {sharedBackground && sharedBackgroundOwner !== localParticipant?.id && (
                        <div style={{ 
                            padding: '5px 10px', 
                            background: 'rgba(46, 125, 50, 0.1)',
                            color: '#2e7d32',
                            borderRadius: '4px',
                            marginBottom: '10px',
                            fontSize: '12px',
                            textAlign: 'center'
                        }}>
                            Background is being shared by another participant
                        </div>
                    )}
                    
                    <div className={classes.options}>
                        {BACKGROUNDS.map(background => (
                            <div
                                key={background.id}
                                className={cx(
                                    classes.option,
                                    { [classes.active]: selectedBackground === background.id }
                                )}
                                style={{ 
                                    background: background.type === 'image' 
                                        ? background.value.replace('url(', 'url(') 
                                        : background.value,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    position: 'relative'
                                }}
                                onClick={() => handleBackgroundChange(background.id)}
                                role="button"
                                title={background.name}
                                tabIndex={0}
                            >
                                {/* Show shared indicator if this background is being shared */}
                                {sharedBackground === background.id && (
                                    <div className={classes.sharedIndicator}>
                                        <SharedIcon />
                                    </div>
                                )}
                            </div>
                        ))}
                        
                        <div className={classes.uploadOption} title="Upload custom background">
                            <input 
                                type="file" 
                                accept="image/*" 
                                className={classes.uploadInput} 
                                onChange={handleFileUpload} 
                                title="Upload custom background"
                            />
                            <div className={classes.uploadIcon}>
                                <UploadIcon />
                            </div>
                            <div className={classes.uploadLabel}>Upload</div>
                        </div>
                    </div>
                    
                    {customBackgrounds.length > 0 && (
                        <div className={classes.customBackgrounds}>
                            <div className={classes.customBgTitle}>Your uploads</div>
                            {customBackgrounds.map(background => (
                                <div
                                    key={background.id}
                                    className={cx(
                                        classes.option,
                                        classes.customBackgroundOption,
                                        { [classes.active]: selectedBackground === background.id }
                                    )}
                                    style={{ 
                                        background: background.value,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        position: 'relative'
                                    }}
                                    onClick={() => handleBackgroundChange(background.id)}
                                    role="button"
                                    title={background.name}
                                    tabIndex={0}
                                >
                                    {/* Show shared indicator if this background is being shared */}
                                    {sharedBackground === background.id && (
                                        <div className={classes.sharedIndicator}>
                                            <SharedIcon />
                                        </div>
                                    )}
                                    
                                    <div 
                                        className={classes.deleteButton}
                                        onClick={(e) => handleDeleteBackground(e, background.id)}
                                        title={`Delete ${background.name}`}
                                    >
                                        <DeleteIcon />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Show collaborative mode status in the panel */}
                    {participantCount > 1 && (
                        <div style={{ 
                            marginTop: '15px', 
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: '8px 0'
                        }}>
                            <div 
                                style={{
                                    background: 'rgba(46, 125, 50, 0.9)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '6px 12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '12px'
                                }}
                            >
                                <CollaborativeIcon />
                                Collaborative Mode Active
                            </div>
                </div>
                    )}
                    
                    {/* Permission managemenst panel */}
                    {participantCount > 1 && (
                        <PermissionsPanel
                            isAdmin={isAdmin}
                            hasPermission={hasPermission}
                            permissionRequests={permissionRequests}
                            participants={new Map(Array.from(participants.values()).map(p => [p.id, p]))}
                            localParticipant={localParticipant}
                            conference={conference}
                            onRequestPermission={requestPermission}
                            onPermissionUpdate={handlePermissionUpdate}
                        />
                    )}
                </div>
            )}
            
            {/* Add text tool to sidebar */}
            <div className={`sidebar-tool ${textToolActive ? 'active' : ''}`} onClick={() => setTextToolActive(!textToolActive)}>
                <TextIcon />
                <span>Text</span>
            </div>
            
            {/* Drawing indicator when someone else is drawing or adding text */}
            {currentDrawer && (
                <div className={classes.drawingIndicator}>
                    <span className={classes.drawingIndicatorDot}></span>
                    <span>{currentDrawer} is editing...</span>
                </div>
            )}

            {/* Add font size control buttons when text tool is active */}
            {textToolActive && (
                <>
                    <div className={classes.fontSizeControls} style={{ display: 'flex', alignItems: 'center', marginLeft: '5px' }}>
                        <button 
                            className={classes.drawingButton}
                            onClick={() => setTextFontSize(prev => Math.max(8, prev - 2))}
                            title="Decrease font size">
                            <FontDecreaseIcon />
                        </button>
                        <span style={{ margin: '0 5px', fontSize: '12px' }}>{textFontSize}px</span>
                        <button 
                            className={classes.drawingButton}
                            onClick={() => setTextFontSize(prev => Math.min(72, prev + 2))}
                            title="Increase font size">
                            <FontIncreaseIcon />
                        </button>
                    </div>
                </>
            )}

            {/* Chat Container - Always visible but can be collapsed */}
            {isChatCollapsed ? (
                <div className={classes.collapsedChatContainer}>
                    <div 
                        className={classes.chatInputContainer}
                        onClick={handleChatInputTap}
                        style={{ 
                            backgroundColor: 'var(--background-color, rgba(28, 32, 37, 0.8))',
                            borderTop: 'none', 
                            marginTop: '0', 
                            borderRadius: '12px' 
                        }}>
                        <input 
                            type="text" 
                            placeholder="Say something..." 
                            className={classes.chatInput}
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                            readOnly
                        />
                        <div className={classes.chatInputActions}>
                            <button className={classes.chatInputButton}>
                                <EmojiIcon />
                            </button>
                            <button className={classes.chatInputButton}>
                                <GifIcon />
                            </button>
                        </div>
                        <div className={classes.chatHint}>Double-tap to expand</div>
                    </div>
                </div>
            ) : (
                <div className={classes.chatContainer}>
                    <div className={classes.chatHeader}>
                        <span>Chat</span>
                    </div>
                    <div className={classes.chatMessages}>
                        <MessageContainer messages={_messages} />
                    </div>
                    <div 
                        className={classes.chatInputContainer}
                        onClick={handleChatInputTap}>
                        <input 
                            type="text" 
                            placeholder="Say something..." 
                            className={classes.chatInput}
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                            value={chatInputText}
                            onChange={(e) => setChatInputText(e.target.value)}
                            onKeyPress={handleChatKeyPress}
                        />
                        <div className={classes.chatInputActions}>
                            <button className={classes.chatInputButton}>
                                <EmojiIcon />
                            </button>
                            <button className={classes.chatInputButton}>
                                <GifIcon />
                            </button>
                        </div>
                        <div className={classes.chatHint}>Double-tap to collapse</div>
                    </div>
                </div>
            )}

            {/* Add this right after the opening div of the main component return (inside the main container) */}
            <ParticipantsList 
                participants={Array.from(participants)}
                localParticipant={localParticipant}
                isAdmin={isAdmin}
                adminId={window.backgroundSync?.adminId || null}
                permissionList={window.backgroundSync?.permissionList || new Set()}
                currentDrawer={currentDrawer}
            />
        </>
    );
};

export default BackgroundSelector; 