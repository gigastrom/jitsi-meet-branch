import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../../app/types';
import Avatar from '../../../base/avatar/components/Avatar';
import Icon from '../../../base/icons/components/Icon';
import { IconCheck, IconCloseLarge } from '../../../base/icons/svg';
import { withPixelLineHeight } from '../../../base/styles/functions.web';
import { admitMultiple } from '../../../lobby/actions.web';
import { getKnockingParticipants, getLobbyEnabled } from '../../../lobby/functions';
import Drawer from '../../../toolbox/components/web/Drawer';
import JitsiPortal from '../../../toolbox/components/web/JitsiPortal';
import { showOverflowDrawer } from '../../../toolbox/functions.web';
import { useLobbyActions, useParticipantDrawer } from '../../hooks';

import LobbyParticipantItems from './LobbyParticipantItems';

const useStyles = makeStyles()((theme: any) => {
    return {
        drawerActions: {
            listStyleType: 'none',
            margin: 0,
            padding: 0
        },
        drawerItem: {
            alignItems: 'center',
            color: theme.palette.text01,
            display: 'flex',
            padding: '12px 16px',
            ...withPixelLineHeight(theme.typography.bodyShortRegularLarge),

            '&:first-child': {
                marginTop: '15px'
            },

            '&:hover': {
                cursor: 'pointer',
                background: theme.palette.action02
            }
        },
        icon: {
            marginRight: 16
        },
        headingContainer: {
            marginTop: theme.spacing(3),
            position: 'relative'
        },
        heading: {
            color: 'var(--text-color, #fff)',
            margin: 0,
            padding: 0,
            fontSize: '16px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
        },
        
        headingCount: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--accent-color, #246FE5)',
            color: 'var(--button-text-color, #fff)',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold',
            padding: '2px 8px',
            marginLeft: '8px',
            minWidth: '20px'
        },

        link: {
            ...withPixelLineHeight(theme.typography.labelBold),
            color: theme.palette.link01,
            cursor: 'pointer',
            display: 'inline-block',
            marginTop: theme.spacing(1),
            textDecoration: 'none',

            '&:hover': {
                textDecoration: 'underline'
            },

            '&:focus': {
                textDecoration: 'underline'
            }
        },

        emptyMessage: {
            color: theme.palette.text02,
            position: 'relative',
            padding: theme.spacing(2),
            background: `${theme.palette.ui04}20`,
            borderRadius: '6px',
            textAlign: 'center',
            fontSize: '14px',
            marginBottom: theme.spacing(2)
        },
        
        participantsContainer: {
            borderRadius: '8px',
            overflow: 'hidden',
            background: 'var(--surface-color, rgba(28, 32, 37, 0.3))',
            padding: theme.spacing(1),
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            transition: 'background-color 0.2s ease',
            
            '&:hover': {
                backgroundColor: 'var(--surface-hover-color, rgba(28, 32, 37, 0.4))'
            }
        }
    };
});

interface IProps {
    lobbyEnabled?: boolean;
    participants?: Array<Object>;
}

const LobbyParticipants = () => {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const { classes: styles } = useStyles();
    
    const lobbyEnabled = useSelector(getLobbyEnabled);
    const participants = useSelector(getKnockingParticipants);
    
    const admitAll = useCallback(() => {
        if (participants) {
            dispatch(admitMultiple(participants));
        }
    }, [dispatch, participants]);

    if (!lobbyEnabled || !participants?.length) {
        return null;
    }

    const showAdmitAll = participants.length > 1;

    return (
        <div>
            <div className = { styles.headingContainer }>
                <div className = { styles.heading }>
                    <span>{t('participantsPane.headings.lobby', { count: participants.length })}</span>
                    <span className = { styles.headingCount }>{participants.length}</span>
                </div>
            </div>
            
            {showAdmitAll && (
                <a
                    className = { styles.link }
                    onClick = { admitAll }>
                    {t('participantsPane.actions.admitAll')}
                </a>
            )}
            
            {participants.length === 0 ? (
                <div className = { styles.emptyMessage }>
                    {t('participantsPane.lobby.empty')}
                </div>
            ) : (
                <div className = { styles.participantsContainer }>
                    <LobbyParticipantItems 
                        participants = { participants }
                        overflowDrawer = { false }
                        openDrawerForParticipant = { () => {} } />
                </div>
            )}
        </div>
    );
};

export default LobbyParticipants;
