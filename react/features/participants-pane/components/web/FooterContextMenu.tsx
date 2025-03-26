import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../../app/types';
import {
    requestDisableAudioModeration,
    requestDisableVideoModeration,
    requestEnableAudioModeration,
    requestEnableVideoModeration
} from '../../../av-moderation/actions';
import {
    isEnabled as isAvModerationEnabled,
    isSupported as isAvModerationSupported
} from '../../../av-moderation/functions';
import { openDialog } from '../../../base/dialog/actions';
import {
    IconCheck,
    IconDotsHorizontal,
    IconVideoOff
} from '../../../base/icons/svg';
import { MEDIA_TYPE } from '../../../base/media/constants';
import { getRaiseHandsQueue } from '../../../base/participants/functions';
import { withPixelLineHeight } from '../../../base/styles/functions.web';
import ContextMenu from '../../../base/ui/components/web/ContextMenu';
import ContextMenuItemGroup from '../../../base/ui/components/web/ContextMenuItemGroup';
import { isInBreakoutRoom } from '../../../breakout-rooms/functions';
import { openSettingsDialog } from '../../../settings/actions.web';
import { SETTINGS_TABS } from '../../../settings/constants';
import { shouldShowModeratorSettings } from '../../../settings/functions.web';
import LowerHandButton from '../../../video-menu/components/web/LowerHandButton';
import MuteEveryonesVideoDialog from '../../../video-menu/components/web/MuteEveryonesVideoDialog';

const useStyles = makeStyles()((theme: any) => {
    return {
        contextMenu: {
            bottom: 'auto',
            margin: '0',
            right: 0,
            top: '-8px',
            transform: 'translateY(-100%)',
            width: '283px',
            backgroundColor: 'var(--surface-color, rgba(28, 32, 37, 0.3))',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.2s ease',

            '&:hover': {
                backgroundColor: 'var(--surface-hover-color, rgba(28, 32, 37, 0.4))',
                transform: 'translateY(-100%) translateX(-4px)'
            }
        },

        text: {
            ...withPixelLineHeight(theme.typography.bodyShortRegular),
            color: 'var(--text-color, #fff)',
            padding: '10px 16px',
            height: '40px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            boxSizing: 'border-box',
            fontSize: '14px',
            fontWeight: 500
        },

        indentedLabel: {
            '& > span': {
                marginLeft: '36px',
                color: 'var(--text-color, #fff)',
                opacity: 0.8
            }
        },

        menuItem: {
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: 'var(--text-color, #fff)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            borderRadius: '8px',
            margin: '0 4px',

            '&:hover': {
                backgroundColor: 'var(--item-hover-color, rgba(255, 255, 255, 0.1))',
                transform: 'translateX(4px)'
            },

            '& svg': {
                fill: 'currentColor',
                width: '20px',
                height: '20px'
            }
        },

        separator: {
            height: '1px',
            backgroundColor: 'var(--border-color, rgba(255, 255, 255, 0.1))',
            margin: '8px 0'
        },

        moderationSection: {
            padding: '8px 0',
            backgroundColor: 'var(--surface-color, rgba(28, 32, 37, 0.3))',
            backdropFilter: 'blur(8px)',
            borderRadius: '8px',
            margin: '8px',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
            transition: 'all 0.2s ease',

            '&:hover': {
                backgroundColor: 'var(--surface-hover-color, rgba(28, 32, 37, 0.4))',
                transform: 'translateX(4px)'
            },

            '& $text': {
                color: 'var(--text-secondary-color, rgba(255, 255, 255, 0.7))'
            }
        },

        icon: {
            color: 'var(--icon-color, #fff)',
            width: '20px',
            height: '20px',
            transition: 'all 0.2s ease',

            '&:hover': {
                color: 'var(--icon-hover-color, #fff)',
                transform: 'scale(1.1)'
            }
        },

        activeItem: {
            backgroundColor: 'var(--active-item-background, rgba(36, 111, 229, 0.1))',
            color: 'var(--accent-color, #246FE5)',

            '&:hover': {
                backgroundColor: 'var(--active-item-background-hover, rgba(36, 111, 229, 0.2))'
            },

            '& svg': {
                fill: 'var(--accent-color, #246FE5)'
            }
        }
    };
});

interface IProps {
    isOpen: boolean;
    onDrawerClose: (e?: React.MouseEvent) => void;
    onMouseLeave?: (e?: React.MouseEvent) => void;
}

export const FooterContextMenu = ({ isOpen, onDrawerClose, onMouseLeave }: IProps) => {
    const dispatch = useDispatch();
    const isModerationSupported = useSelector((state: IReduxState) => isAvModerationSupported()(state));
    const raisedHandsQueue = useSelector(getRaiseHandsQueue);
    const isModeratorSettingsTabEnabled = useSelector(shouldShowModeratorSettings);
    const isAudioModerationEnabled = useSelector(isAvModerationEnabled(MEDIA_TYPE.AUDIO));
    const isVideoModerationEnabled = useSelector(isAvModerationEnabled(MEDIA_TYPE.VIDEO));
    const isBreakoutRoom = useSelector(isInBreakoutRoom);

    const { t } = useTranslation();
    const { classes, cx } = useStyles();

    const disableAudioModeration = useCallback(() => dispatch(requestDisableAudioModeration()), [dispatch]);
    const disableVideoModeration = useCallback(() => dispatch(requestDisableVideoModeration()), [dispatch]);
    const enableAudioModeration = useCallback(() => dispatch(requestEnableAudioModeration()), [dispatch]);
    const enableVideoModeration = useCallback(() => dispatch(requestEnableVideoModeration()), [dispatch]);
    const muteAllVideo = useCallback(() => dispatch(openDialog(MuteEveryonesVideoDialog)), [dispatch]);
    const openModeratorSettings = () => dispatch(openSettingsDialog(SETTINGS_TABS.MODERATOR));

    const actions = [
        {
            accessibilityLabel: t('participantsPane.actions.audioModeration'),
            className: cx(classes.menuItem, {
                [classes.activeItem]: isAudioModerationEnabled,
                [classes.indentedLabel]: isAudioModerationEnabled
            }),
            id: isAudioModerationEnabled
                ? 'participants-pane-context-menu-stop-audio-moderation'
                : 'participants-pane-context-menu-start-audio-moderation',
            icon: !isAudioModerationEnabled && IconCheck,
            onClick: isAudioModerationEnabled ? disableAudioModeration : enableAudioModeration,
            text: t('participantsPane.actions.audioModeration')
        },
        {
            accessibilityLabel: t('participantsPane.actions.videoModeration'),
            className: cx(classes.menuItem, {
                [classes.activeItem]: isVideoModerationEnabled,
                [classes.indentedLabel]: isVideoModerationEnabled
            }),
            id: isVideoModerationEnabled
                ? 'participants-pane-context-menu-stop-video-moderation'
                : 'participants-pane-context-menu-start-video-moderation',
            icon: !isVideoModerationEnabled && IconCheck,
            onClick: isVideoModerationEnabled ? disableVideoModeration : enableVideoModeration,
            text: t('participantsPane.actions.videoModeration')
        }
    ];

    return (
        <ContextMenu
            activateFocusTrap={true}
            className={classes.contextMenu}
            hidden={!isOpen}
            isDrawerOpen={isOpen}
            onDrawerClose={onDrawerClose}
            onMouseLeave={onMouseLeave}>
            <ContextMenuItemGroup
                actions={[{
                    accessibilityLabel: t('participantsPane.actions.stopEveryonesVideo'),
                    className: classes.menuItem,
                    id: 'participants-pane-context-menu-stop-video',
                    icon: IconVideoOff,
                    onClick: muteAllVideo,
                    text: t('participantsPane.actions.stopEveryonesVideo')
                }]} />
            {raisedHandsQueue.length !== 0 && (
                <>
                    <div className={classes.separator} />
                    <LowerHandButton />
                </>
            )}
            {!isBreakoutRoom && isModerationSupported && (
                <div className={classes.moderationSection}>
                    <div className={classes.text}>
                        <span>{t('participantsPane.actions.allow')}</span>
                    </div>
                    <ContextMenuItemGroup actions={actions} />
                </div>
            )}
            {isModeratorSettingsTabEnabled && (
                <>
                    <div className={classes.separator} />
                    <ContextMenuItemGroup
                        actions={[{
                            accessibilityLabel: t('participantsPane.actions.moreModerationControls'),
                            className: classes.menuItem,
                            id: 'participants-pane-open-moderation-control-settings',
                            icon: IconDotsHorizontal,
                            onClick: openModeratorSettings,
                            text: t('participantsPane.actions.moreModerationControls')
                        }]} />
                </>
            )}
        </ContextMenu>
    );
};
