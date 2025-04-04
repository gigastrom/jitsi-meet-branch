import React from 'react';
import { connect } from 'react-redux';

import { IReduxState } from '../../app/types';
import { getValidatedUser, getDisplayName, getAvatarUrl, isModerator } from '../functions';
import { IUserProfile } from '../api';

import './SwitchUserInfo.css';

interface ISwitchUserInfoProps {
    /**
     * The current validated user profile.
     */
    user?: IUserProfile;

    /**
     * The user's display name.
     */
    displayName: string;

    /**
     * The user's avatar URL.
     */
    avatarUrl: string;

    /**
     * Whether the user is a moderator.
     */
    isModerator: boolean;
}

/**
 * Component that displays the current Switch user's information.
 *
 * @param {Object} props - The component's props.
 * @returns {ReactElement}
 */
function SwitchUserInfo({ user, displayName, avatarUrl, isModerator: isUserModerator }: ISwitchUserInfoProps) {
    if (!user) {
        return (
            <div className='switch-user-info switch-user-info--not-authenticated'>
                <div className='switch-user-info__message'>
                    Not authenticated with Switch
                </div>
            </div>
        );
    }

    return (
        <div className='switch-user-info'>
            <div className='switch-user-info__header'>
                <img 
                    src={avatarUrl || '/images/avatar.png'} 
                    alt={displayName}
                    className='switch-user-info__avatar'
                />
                <div className='switch-user-info__name-container'>
                    <div className='switch-user-info__name'>{displayName}</div>
                    <div className='switch-user-info__email'>{user.email}</div>
                    {isUserModerator && (
                        <div className='switch-user-info__badge switch-user-info__badge--moderator'>
                            Moderator
                        </div>
                    )}
                </div>
            </div>
            
            <div className='switch-user-info__details'>
                <div className='switch-user-info__detail'>
                    <span className='switch-user-info__detail-label'>ID:</span>
                    <span className='switch-user-info__detail-value'>{user.id}</span>
                </div>
                {user.user_name && (
                    <div className='switch-user-info__detail'>
                        <span className='switch-user-info__detail-label'>Username:</span>
                        <span className='switch-user-info__detail-value'>{user.user_name}</span>
                    </div>
                )}
                {user.role && (
                    <div className='switch-user-info__detail'>
                        <span className='switch-user-info__detail-label'>Role:</span>
                        <span className='switch-user-info__detail-value'>{user.role}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Maps redux state to component props.
 *
 * @param {IReduxState} state - The redux state.
 * @returns {Object}
 */
function mapStateToProps(state: IReduxState) {
    return {
        user: getValidatedUser(state),
        displayName: getDisplayName(state),
        avatarUrl: getAvatarUrl(state),
        isModerator: isModerator(state)
    };
}

export default connect(mapStateToProps)(SwitchUserInfo); 