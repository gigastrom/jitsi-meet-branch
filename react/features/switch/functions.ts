import { IReduxState } from '../app/types';
import { IUserProfile } from './api';

/**
 * Interface for Jitsi user info format, compatible with JitsiMeeting component.
 */
export interface IJitsiUserInfo {
    avatarURL: string;
    displayName: string;
    email: string;
    userId?: string;
}

/**
 * Returns the Switch feature state.
 *
 * @param {IReduxState} state - The redux state.
 * @returns {Object} The Switch feature state.
 */
export function getSwitch(state: IReduxState) {
    return state['features/switch'];
}

/**
 * Returns whether a token validation is in progress.
 *
 * @param {IReduxState} state - The redux state.
 * @returns {boolean} Whether validation is in progress.
 */
export function isTokenValidationInProgress(state: IReduxState): boolean {
    return getSwitch(state)?.isValidating ?? false;
}

/**
 * Returns the validated user, if any.
 *
 * @param {IReduxState} state - The redux state.
 * @returns {IUserProfile|undefined} The validated user, if any.
 */
export function getValidatedUser(state: IReduxState): IUserProfile | undefined {
    return getSwitch(state)?.user;
}

/**
 * Returns the validation error, if any.
 *
 * @param {IReduxState} state - The redux state.
 * @returns {Error|undefined} The validation error, if any.
 */
export function getValidationError(state: IReduxState): Error | undefined {
    return getSwitch(state)?.validationError;
}

/**
 * Returns whether the user is authenticated.
 *
 * @param {IReduxState} state - The redux state.
 * @returns {boolean} Whether the user is authenticated.
 */
export function isAuthenticated(state: IReduxState): boolean {
    return !!getValidatedUser(state);
}

/**
 * Checks if the user has a specific permission.
 * 
 * @param {IReduxState} state - The redux state.
 * @param {string} permission - The permission to check.
 * @returns {boolean} Whether the user has the specified permission.
 */
export function hasPermission(state: IReduxState, permission: string): boolean {
    const user = getValidatedUser(state);
    return user?.permissions?.includes(permission) ?? false;
}

/**
 * Returns whether the user is a moderator based on their role or permissions.
 *
 * @param {IReduxState} state - The redux state.
 * @returns {boolean} Whether the user is a moderator.
 */
export function isModerator(state: IReduxState): boolean {
    const user = getValidatedUser(state);
    
    if (!user) {
        return false;
    }
    
    // Check based on role
    if (user.role === 'moderator' || user.role === 'admin') {
        return true;
    }
    
    // Check if the user is the creator of the room
    if (user.creator_user_id || user.parent_id) {
        return true;
    }
    
    // Check if active and not a bot
    if (user.active && !user.is_bot) {
        // Additional role check based on permissions
        if (user.permissions?.includes('moderator') || user.permissions?.includes('admin')) {
            return true;
        }
    }
    
    return false;
}

/**
 * Returns the user's display name from the Switch profile.
 *
 * @param {IReduxState} state - The redux state.
 * @returns {string} The user's display name.
 */
export function getDisplayName(state: IReduxState): string {
    const user = getValidatedUser(state);
    return user?.displayName || user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '';
}

/**
 * Returns the user's avatar URL from the Switch profile.
 *
 * @param {IReduxState} state - The redux state.
 * @returns {string} The user's avatar URL.
 */
export function getAvatarUrl(state: IReduxState): string {
    const user = getValidatedUser(state);
    return user?.avatarUrl || user?.imageurl || '';
}

/**
 * Returns the user's ID from the Switch profile.
 *
 * @param {IReduxState} state - The redux state.
 * @returns {string} The user's ID.
 */
export function getUserId(state: IReduxState): string {
    const user = getValidatedUser(state);
    return user?.id?.toString() || '';
}

/**
 * Returns the auth token from settings.
 *
 * @param {IReduxState} state - The redux state.
 * @returns {string|undefined} The auth token if it exists.
 */
export function getAuthTokenFromSettings(state: IReduxState): string | undefined {
    return state['features/base/settings']?.authToken;
}

/**
 * Converts a Switch user profile to Jitsi's user info format.
 * This is useful for passing user data to the JitsiMeeting component.
 *
 * @param {IUserProfile} user - The Switch user profile.
 * @returns {IJitsiUserInfo} The Jitsi user info object.
 */
export function convertToJitsiUserInfo(user: IUserProfile): IJitsiUserInfo {
    if (!user) {
        return {
            avatarURL: '',
            displayName: '',
            email: ''
        };
    }

    return {
        avatarURL: user.imageurl || user.avatarUrl || '',
        displayName: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email || '',
        userId: user.id?.toString()
    };
} 