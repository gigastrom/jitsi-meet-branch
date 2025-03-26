import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { beginAddPeople } from '../../../invite/actions.any';
import Button from '../../../base/ui/components/web/Button';
import { BUTTON_TYPES } from '../../../base/ui/constants.web';

const useStyles = makeStyles()(theme => {
    return {
        inviteButton: {
            width: '100%',
            marginBottom: theme.spacing(2),
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.16)',
            fontWeight: 600,
            transition: 'all 0.2s',
            borderRadius: '999px',
            padding: '10px 16px',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: 'var(--accent-color, #246FE5)',
            color: 'var(--button-text-color, #fff)',
            
            '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(to right, rgba(255,255,255,0.1), rgba(255,255,255,0))',
                transform: 'translateX(-100%)',
                transition: 'transform 0.6s ease',
                zIndex: 0
            },
            
            '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                backgroundColor: 'var(--accent-hover-color, #1a5bbf)',
                
                '&::before': {
                    transform: 'translateX(100%)'
                }
            },
            
            '&:active': {
                transform: 'translateY(0)',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                backgroundColor: 'var(--accent-active-color, #134a9e)'
            }
        }
    };
});

export const InviteButton = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const { classes } = useStyles();

    const onInvite = useCallback(() => {
        dispatch(beginAddPeople());
    }, [ dispatch ]);

    return (
        <Button
            accessibilityLabel = { t('participantsPane.actions.invite') }
            className = { classes.inviteButton }
            fullWidth = { true }
            labelKey = { 'participantsPane.actions.invite' }
            onClick = { onInvite }
            type = { BUTTON_TYPES.PRIMARY } />
    );
};
