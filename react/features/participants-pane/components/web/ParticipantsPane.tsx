import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../../app/types';
import participantsPaneTheme from '../../../base/components/themes/participantsPaneTheme.json';
import { openDialog } from '../../../base/dialog/actions';
import { IconCloseLarge, IconDotsHorizontal } from '../../../base/icons/svg';
import { isLocalParticipantModerator } from '../../../base/participants/functions';
import Button from '../../../base/ui/components/web/Button';
import ClickableIcon from '../../../base/ui/components/web/ClickableIcon';
import { BUTTON_TYPES } from '../../../base/ui/constants.web';
import { findAncestorByClass } from '../../../base/ui/functions.web';
import { isAddBreakoutRoomButtonVisible } from '../../../breakout-rooms/functions';
import MuteEveryoneDialog from '../../../video-menu/components/web/MuteEveryoneDialog';
import { close } from '../../actions.web';
import {
    getParticipantsPaneOpen,
    isMoreActionsVisible,
    isMuteAllVisible
} from '../../functions';
import { AddBreakoutRoomButton } from '../breakout-rooms/components/web/AddBreakoutRoomButton';
import { RoomList } from '../breakout-rooms/components/web/RoomList';

import { FooterContextMenu } from './FooterContextMenu';
import LobbyParticipants from './LobbyParticipants';
import MeetingParticipants from './MeetingParticipants';
import VisitorsList from './VisitorsList';

const useStyles = makeStyles()((theme: any) => {
    return {
        participantsPane: {
            backgroundColor: 'var(--background-color, rgba(28, 32, 37, 0.95))',
            backdropFilter: 'blur(25px)',
            flexShrink: 0,
            overflow: 'hidden',
            position: 'relative',
            transition: 'all 0.3s ease-in-out',
            width: '315px',
            zIndex: 0,
            display: 'flex',
            flexDirection: 'column',
            fontWeight: 600,
            height: '100%',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
            borderRadius: '12px',

            [[ '& > *:first-child', '& > *:last-child' ] as any]: {
                flexShrink: 0
            },

            '@media (max-width: 580px)': {
                height: '100dvh',
                position: 'fixed',
                left: 0,
                right: 0,
                top: 0,
                width: '100%',
                borderRadius: 0
            }
        },

        container: {
            boxSizing: 'border-box',
            flex: 1,
            overflowY: 'auto',
            position: 'relative',
            padding: `0 ${participantsPaneTheme.panePadding}px`,
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--scroll-thumb-color, rgba(255, 255, 255, 0.2)) transparent',

            '&::-webkit-scrollbar': {
                width: '4px'
            },

            '&::-webkit-scrollbar-track': {
                background: 'transparent'
            },

            '&::-webkit-scrollbar-thumb': {
                background: 'var(--scroll-thumb-color, rgba(255, 255, 255, 0.2))',
                borderRadius: '4px'
            },

            '&::-webkit-scrollbar-thumb:hover': {
                background: 'var(--scroll-thumb-hover-color, rgba(255, 255, 255, 0.3))'
            }
        },

        closeButton: {
            alignItems: 'center',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            padding: '8px',
            borderRadius: '50%',
            transition: 'all 0.2s ease',
            backgroundColor: 'var(--button-background, rgba(255, 255, 255, 0.1))',
            color: 'var(--text-color, #fff)',

            '&:hover': {
                backgroundColor: 'var(--button-background-hover, rgba(255, 255, 255, 0.2))',
                transform: 'scale(1.05)'
            },
            
            '& svg': {
                fill: 'currentColor'
            }
        },

        header: {
            alignItems: 'center',
            boxSizing: 'border-box',
            display: 'flex',
            height: '60px',
            padding: `0 ${participantsPaneTheme.panePadding}px`,
            justifyContent: 'flex-end',
            borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
            backgroundColor: 'var(--surface-color, rgba(28, 32, 37, 0.3))',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease'
        },

        antiCollapse: {
            fontSize: 0,

            '&:first-child': {
                display: 'none'
            },

            '&:first-child + *': {
                marginTop: 0
            }
        },

        footer: {
            display: 'flex',
            justifyContent: 'flex-end',
            padding: `${theme.spacing(4)} ${participantsPaneTheme.panePadding}px`,
            borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
            backgroundColor: 'var(--surface-color, rgba(28, 32, 37, 0.3))',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease',

            '& > *:not(:last-child)': {
                marginRight: theme.spacing(3)
            },

            '& button': {
                borderRadius: '24px',
                transition: 'all 0.2s ease',
                
                '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                }
            }
        },

        footerMoreContainer: {
            position: 'relative',

            '& button': {
                width: '40px',
                height: '40px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                backgroundColor: 'var(--button-background, rgba(255, 255, 255, 0.1))',

                '&:hover': {
                    backgroundColor: 'var(--button-background-hover, rgba(255, 255, 255, 0.2))'
                }
            }
        }
    };
});

const ParticipantsPane = () => {
    const { classes, cx } = useStyles();
    const paneOpen = useSelector(getParticipantsPaneOpen);
    const isBreakoutRoomsSupported = useSelector((state: IReduxState) => state['features/base/conference'])
        .conference?.getBreakoutRooms()?.isSupported();
    const showAddRoomButton = useSelector(isAddBreakoutRoomButtonVisible);
    const showFooter = useSelector(isLocalParticipantModerator);
    const showMuteAllButton = useSelector(isMuteAllVisible);
    const showMoreActionsButton = useSelector(isMoreActionsVisible);
    const dispatch = useDispatch();
    const { t } = useTranslation();

    const [ contextOpen, setContextOpen ] = useState(false);
    const [ searchString, setSearchString ] = useState('');

    const onWindowClickListener = useCallback((e: any) => {
        if (contextOpen && !findAncestorByClass(e.target, classes.footerMoreContainer)) {
            setContextOpen(false);
        }
    }, [ contextOpen ]);

    useEffect(() => {
        window.addEventListener('click', onWindowClickListener);

        return () => {
            window.removeEventListener('click', onWindowClickListener);
        };
    }, []);

    const onClosePane = useCallback(() => {
        dispatch(close());
    }, []);

    const onDrawerClose = useCallback(() => {
        setContextOpen(false);
    }, []);

    const onMuteAll = useCallback(() => {
        dispatch(openDialog(MuteEveryoneDialog));
    }, []);

    const onToggleContext = useCallback(() => {
        setContextOpen(open => !open);
    }, []);

    if (!paneOpen) {
        return null;
    }

    return (
        <div className = { cx('participants_pane', classes.participantsPane) }>
            <div className = { classes.header }>
                <div className = { classes.closeButton }>
                    <ClickableIcon
                        accessibilityLabel = { t('participantsPane.close', 'Close') }
                        icon = { IconCloseLarge }
                        onClick = { onClosePane } />
                </div>
            </div>
            <div className = { classes.container }>
                <VisitorsList />
                <br className = { classes.antiCollapse } />
                <LobbyParticipants />
                <br className = { classes.antiCollapse } />
                <MeetingParticipants
                    searchString = { searchString }
                    setSearchString = { setSearchString } />
                {isBreakoutRoomsSupported && <RoomList searchString = { searchString } />}
                {showAddRoomButton && <AddBreakoutRoomButton />}
            </div>
            {showFooter && (
                <div className = { classes.footer }>
                    {showMuteAllButton && (
                        <Button
                            accessibilityLabel = { t('participantsPane.actions.muteAll') }
                            labelKey = { 'participantsPane.actions.muteAll' }
                            onClick = { onMuteAll }
                            type = { BUTTON_TYPES.SECONDARY } />
                    )}
                    {showMoreActionsButton && (
                        <div className = { classes.footerMoreContainer }>
                            <Button
                                accessibilityLabel = { t('participantsPane.actions.moreModerationActions') }
                                icon = { IconDotsHorizontal }
                                id = 'participants-pane-context-menu'
                                onClick = { onToggleContext }
                                type = { BUTTON_TYPES.SECONDARY } />
                            <FooterContextMenu
                                isOpen = { contextOpen }
                                onDrawerClose = { onDrawerClose }
                                onMouseLeave = { onToggleContext } />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ParticipantsPane;
