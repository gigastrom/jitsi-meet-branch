/**
 * API services for Switch integration.
 */

import { jitsiLocalStorage } from '@jitsi/js-utils';
import logger from './logger';

/**
 * The base URL for Switch API endpoints.
 */
const SWITCH_API_BASE_URL = 'https://gateway.switch.pe';

/**
 * User Service API endpoint for validating tokens.
 */
const USER_SERVICE_ENDPOINT = '/user-service/api/user';

/**
 * Interface for the user profile data returned by the API.
 */
export interface IUserProfile {
    id: number;
    email: string;
    name: string;
    creator_name?: string;
    creator_user_id?: number;
    verifyEmail?: boolean;
    switchx_user?: boolean;
    user_name?: string;
    privacy?: string;
    social_login_type?: string;
    social_login_id?: string;
    is_bot?: boolean;
    bot_privacy?: string;
    profile_colour?: string;
    otp?: string;
    otpExpiry?: string;
    bio?: string;
    link?: string;
    imageurl?: string;
    private_imageurl?: string;
    gender?: string;
    date_of_birth?: string;
    media1?: string;
    media2?: string;
    media3?: string;
    media4?: string;
    media5?: string;
    more_about_this?: string;
    bg_colour?: string;
    box_colour?: string;
    box_outline_colour?: string;
    mini_box_colour?: string;
    default_text_colour?: string;
    primary_text_colour?: string;
    secondary_text_colour?: string;
    mini_box_text_colour?: string;
    hobbies?: string[];
    favourite_miniapps?: string[];
    watching?: string[];
    listening?: string[];
    active?: boolean;
    parent_id?: number;
    ai?: boolean;
    ai_character_id?: number;
    context?: string;
    recommended?: boolean;
    category?: string;
    is_game?: boolean;
    is_app?: boolean;
    consent_for_nfsw?: boolean;
    app_callback?: string;
    cover_image?: string;
    user_link?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    telegram?: string;
    website?: string;
    contact_email?: string;
    chat_theme?: string;
    createdAt?: string;
    updatedAt?: string;
    
    // Fields we'll add for compatibility with our Jitsi integration
    firstName?: string;
    lastName?: string;
    displayName?: string;
    avatarUrl?: string;
    role?: string;
    permissions?: string[];
    tenantId?: string;
}

/**
 * Validates an authentication token with the Switch API.
 *
 * @param {string} authToken - The authentication token to validate.
 * @returns {Promise<IUserProfile>} - A promise that resolves with the user profile if validation is successful.
 */
export async function validateAuthToken(authToken: string): Promise<IUserProfile> {
    try {
        if (!authToken) {
            throw new Error('No auth token provided');
        }

        const response = await fetch(`${SWITCH_API_BASE_URL}${USER_SERVICE_ENDPOINT}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
                'authtoken': authToken
            }
        });

        if (!response.ok) {
            throw new Error(`Token validation failed with status: ${response.status}`);
        }

        const userData = await response.json();
        
        // Process the user data to ensure it has the fields we need
        const processedData = processUserData(userData);
        
        // Store the validated user data
        jitsiLocalStorage.setItem('switchUserData', JSON.stringify(processedData));
        
        return processedData;
    } catch (error) {
        console.error('Error validating auth token:', error);
        throw error;
    }
}

/**
 * Processes the user data to ensure it has all required fields.
 *
 * @param {any} userData - The raw user data from the API.
 * @returns {IUserProfile} - Processed user profile data.
 */
function processUserData(userData: any): IUserProfile {
    // Extract first and last name from the name field if present
    let firstName = '';
    let lastName = '';
    
    if (userData.name) {
        const nameParts = userData.name.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
    }
    
    // Combine the raw data with our additional fields
    return {
        ...userData,
        firstName,
        lastName,
        displayName: userData.name || `${firstName} ${lastName}`.trim(),
        avatarUrl: userData.imageurl || '',
        // Default role to 'user' unless otherwise specified
        role: userData.role || (userData.is_bot ? 'bot' : 'user'),
        // Permissions can be added as needed
        permissions: [],
        // Can use creator_user_id or parent_id as tenantId if needed
        tenantId: userData.creator_user_id?.toString() || userData.parent_id?.toString() || ''
    };
}

/**
 * Gets the currently authenticated user profile from localStorage.
 *
 * @returns {IUserProfile|null} - The user profile or null if not authenticated.
 */
export function getCurrentUserProfile(): IUserProfile | null {
    try {
        const userData = jitsiLocalStorage.getItem('switchUserData');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error getting current user profile:', error);
        return null;
    }
}

/**
 * Checks if there is a valid user authentication token.
 *
 * @returns {boolean} - True if a valid token exists, false otherwise.
 */
export function hasValidAuthToken(): boolean {
    const authToken = jitsiLocalStorage.getItem('authToken');
    return !!authToken;
}

/**
 * Fetches the current authentication token from localStorage.
 *
 * @returns {string|null} - The auth token or null if not found.
 */
export function getAuthToken(): string | null {
    return jitsiLocalStorage.getItem('authToken');
} 