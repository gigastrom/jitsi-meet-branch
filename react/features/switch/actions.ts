import { IStore } from '../app/types';
import { updateSettings } from '../base/settings/actions';
import { jitsiLocalStorage } from '@jitsi/js-utils';

import {
    SET_VALIDATED_USER,
    CLEAR_VALIDATED_USER,
    VALIDATING_TOKEN,
    VALIDATION_FAILED
} from './actionTypes';
import { validateAuthToken, IUserProfile } from './api';
import logger from './logger';

/**
 * Sets the validated user in the Redux store.
 *
 * @param {IUserProfile} user - The validated user profile.
 * @returns {Object}
 */
export function setValidatedUser(user: IUserProfile) {
    return {
        type: SET_VALIDATED_USER,
        user
    };
}

/**
 * Clears the validated user from the Redux store.
 *
 * @returns {Object}
 */
export function clearValidatedUser() {
    return {
        type: CLEAR_VALIDATED_USER
    };
}

/**
 * Indicates validation is in progress.
 *
 * @returns {Object}
 */
export function validatingToken() {
    return {
        type: VALIDATING_TOKEN
    };
}

/**
 * Indicates validation has failed.
 *
 * @param {Error} error - The validation error.
 * @returns {Object}
 */
export function validationFailed(error: Error) {
    return {
        type: VALIDATION_FAILED,
        error
    };
}

/**
 * Sets an auth token and validates it with the Switch API.
 *
 * @param {string} token - The auth token to set and validate.
 * @returns {Function}
 */
export function setAndValidateToken(token: string) {
    return async (dispatch: IStore['dispatch']) => {
        try {
            // Indicate validation is in progress
            dispatch(validatingToken());
            
            // Save the token to settings and localStorage
            if (token) {
                jitsiLocalStorage.setItem('authToken', token);
            } else {
                jitsiLocalStorage.removeItem('authToken');
            }
            
            dispatch(updateSettings({
                authToken: token
            }));
            
            if (!token) {
                dispatch(clearValidatedUser());
                return;
            }
            
            // Validate the token
            const userData = await validateAuthToken(token);
            
            // Store the validated user
            dispatch(setValidatedUser(userData));
            
            return userData;
        } catch (error) {
            logger.error('Error validating token:', error);
            dispatch(validationFailed(error as Error));
            throw error;
        }
    };
} 