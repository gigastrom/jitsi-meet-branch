import { AnyAction } from 'redux';

import { IStore } from '../app/types';
import { APP_WILL_MOUNT } from '../base/app/actionTypes';
import { APP_PROPS_CHANGED } from '../app/actionTypes.native';
import { participantUpdated } from '../base/participants/actions';
import { getLocalParticipant } from '../base/participants/functions';
import { SET_JWT } from '../base/jwt/actionTypes';
import { SETTINGS_UPDATED } from '../base/settings/actionTypes';
import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';

import { validateAuthToken } from './api';
import logger from './logger';
import { setValidatedUser, clearValidatedUser } from './actions';
import { SET_VALIDATED_USER } from './actionTypes';

/**
 * The middleware for the Switch feature.
 *
 * @param {IStore} store - The redux store.
 * @returns {Function}
 */
MiddlewareRegistry.register(store => next => async (action: AnyAction) => {
    const result = next(action);
    
    switch (action.type) {
    case APP_WILL_MOUNT:
        // Check if we have a saved token and validate it on app start
        _validateSavedToken(store);
        break;
        
    case SET_JWT:
        // When a JWT token is set, we don't need to do anything
        // as the base/jwt middleware will update the settings
        break;
        
    case SETTINGS_UPDATED:
        // If the auth token was updated in settings, validate it
        if (action.settings?.authToken !== undefined) {
            _handleAuthTokenChange(store, action.settings.authToken);
        }
        break;
        
    case SET_VALIDATED_USER:
        // When a user is validated, update the local participant data
        _syncUserWithLocalParticipant(store, action.user);
        break;
        
    case APP_PROPS_CHANGED:
        // Handle authToken property from React Native SDK
        if (action.props?.authToken !== undefined) {
            _handleAuthTokenChange(store, action.props.authToken);
        }
        break;
        
    // Handle setAuthToken command from external API
    case 'SET_AUTH_TOKEN_FROM_API':
        if (action.token !== undefined) {
            _handleAuthTokenChange(store, action.token);
        }
        break;
    }
    
    return result;
});

/**
 * Validates a saved auth token when the application starts.
 *
 * @param {IStore} store - The redux store.
 * @private
 * @returns {void}
 */
async function _validateSavedToken({ dispatch, getState }: IStore) {
    try {
        const authToken = getState()['features/base/settings']?.authToken;
        
        if (authToken) {
            logger.info('Validating saved auth token');
            await _handleAuthTokenChange({ dispatch, getState }, authToken);
        }
    } catch (error) {
        logger.error('Error validating saved token:', error);
        dispatch(clearValidatedUser());
    }
}

/**
 * Handles changes to the auth token.
 *
 * @param {IStore} store - The redux store.
 * @param {string|undefined} authToken - The new auth token.
 * @private
 * @returns {void}
 */
async function _handleAuthTokenChange({ dispatch }: IStore, authToken?: string) {
    try {
        if (!authToken) {
            // If token was cleared, clear the validated user
            dispatch(clearValidatedUser());
            return;
        }
        
        // Validate the token with the Switch API
        const userData = await validateAuthToken(authToken);
        
        // Store the validated user in Redux
        dispatch(setValidatedUser(userData));
        
        logger.info('Auth token successfully validated');
    } catch (error) {
        logger.error('Auth token validation failed:', error);
        dispatch(clearValidatedUser());
    }
}

/**
 * Synchronizes the Switch user data with the local participant.
 *
 * @param {IStore} store - The redux store.
 * @param {Object} user - The validated user data.
 * @private
 * @returns {void}
 */
function _syncUserWithLocalParticipant({ dispatch, getState }: IStore, user: any) {
    if (!user) {
        return;
    }
    
    const localParticipant = getLocalParticipant(getState());
    if (!localParticipant) {
        return;
    }
    
    // Prepare participant properties based on the Switch user data
    const participantProperties = {
        id: localParticipant.id,
        local: true,
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email || '',
        avatarURL: user.imageurl || user.avatarUrl || '',
        // Set jwtId with the user's ID from Switch
        jwtId: user.id?.toString(),
        // If the user is a moderator based on Switch criteria, set moderator flag
        role: user.role === 'moderator' || user.role === 'admin' ? 'moderator' : undefined
    };
    
    // Update the local participant
    dispatch(participantUpdated(participantProperties));
} 