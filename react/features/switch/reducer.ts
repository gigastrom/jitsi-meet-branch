import { AnyAction } from 'redux';

import { IUserProfile } from './api';
import {
    SET_VALIDATED_USER,
    CLEAR_VALIDATED_USER,
    VALIDATING_TOKEN,
    VALIDATION_FAILED
} from './actionTypes';
import ReducerRegistry from '../base/redux/ReducerRegistry';
import PersistenceRegistry from '../base/redux/PersistenceRegistry';

export interface ISwitchState {
    isValidating: boolean;
    validationError?: Error;
    user?: IUserProfile;
}

const DEFAULT_STATE: ISwitchState = {
    isValidating: false
};

// Register this feature with the persistence registry
// Only persist the user data, not the transient validation state
PersistenceRegistry.register('features/switch', {
    user: true
});

/**
 * Reducer for the Switch feature.
 */
ReducerRegistry.register<ISwitchState>('features/switch', (state = DEFAULT_STATE, action: AnyAction) => {
    switch (action.type) {
    case SET_VALIDATED_USER:
        return {
            ...state,
            isValidating: false,
            validationError: undefined,
            user: action.user
        };
        
    case CLEAR_VALIDATED_USER:
        return {
            ...state,
            isValidating: false,
            validationError: undefined,
            user: undefined
        };
        
    case VALIDATING_TOKEN:
        return {
            ...state,
            isValidating: true,
            validationError: undefined
        };
        
    case VALIDATION_FAILED:
        return {
            ...state,
            isValidating: false,
            validationError: action.error,
            user: undefined
        };
        
    default:
        return state;
    }
}); 