import React from 'react';
import { connect } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../../app/types';
import { translate } from '../../../base/i18n/functions';
import Icon from '../../../base/icons/components/Icon';
import { IconUsers } from '../../../base/icons/svg';
import { getParticipantCount } from '../../../base/participants/functions';
import AbstractButton, { IProps as AbstractButtonProps } from '../../../base/toolbox/components/AbstractButton';
import {
    close as closeParticipantsPane,
    open as openParticipantsPane
} from '../../../participants-pane/actions.web';
import { closeOverflowMenuIfOpen } from '../../../toolbox/actions.web';
import { isParticipantsPaneEnabled } from '../../functions';

import ParticipantsCounter from './ParticipantsCounter';

const useStyles = makeStyles()(theme => {
    return {
        buttonWithBadge: {
            position: 'relative',
            transition: 'all 0.2s ease',
            padding: '6px',
            
            '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)'
            }
        },
        active: {
            backgroundColor: 'var(--accent-color, #246FE5)',
            borderRadius: '6px',
            
            '&:hover': {
                backgroundColor: 'var(--accent-hover-color, #1a5bbf)'
            }
        }
    };
});

/**
 * The type of the React {@code Component} props of {@link ParticipantsPaneButton}.
 */
interface IProps extends AbstractButtonProps {

    /**
     * Whether or not the participants pane is open.
     */
    _isOpen: boolean;

    /**
     * Whether participants feature is enabled or not.
     */
    _isParticipantsPaneEnabled: boolean;

    /**
     * Participants count.
     */
    _participantsCount: number;
}

/**
 * Implementation of a button for accessing participants pane.
 */
const ParticipantsPaneButton = ({
    _isOpen,
    _isParticipantsPaneEnabled,
    _participantsCount,
    dispatch,
    t
}: IProps) => {
    const { classes, cx } = useStyles();

    if (!_isParticipantsPaneEnabled) {
        return null;
    }

    const handleClick = () => {
        dispatch(closeOverflowMenuIfOpen());
        if (_isOpen) {
            dispatch(closeParticipantsPane());
        } else {
            dispatch(openParticipantsPane());
        }
    };

    const getAccessibilityLabel = () => {
        if (_isOpen) {
            return t('toolbar.accessibilityLabel.closeParticipantsPane');
        }

        return t('toolbar.accessibilityLabel.participants', {
            participantsCount: _participantsCount
        });
    };

    return (
        <div
            className={cx(classes.buttonWithBadge, {
                [classes.active]: _isOpen
            })}>
            <div
                accessibilityLabel={getAccessibilityLabel()}
                onClick={handleClick}
                role="button"
                tabIndex={0}>
                <Icon src={IconUsers} />
                <span>{t('toolbar.participants')}</span>
            </div>
            <ParticipantsCounter />
        </div>
    );
};

/**
 * Maps part of the Redux state to the props of this component.
 *
 * @param {Object} state - The Redux state.
 * @returns {IProps}
 */
function mapStateToProps(state: IReduxState) {
    const { isOpen } = state['features/participants-pane'];

    return {
        _isOpen: isOpen,
        _isParticipantsPaneEnabled: isParticipantsPaneEnabled(state),
        _participantsCount: getParticipantCount(state)
    };
}

export default translate(connect(mapStateToProps)(ParticipantsPaneButton));
