import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import Button from '../../../../../base/ui/components/web/Button';
import { BUTTON_TYPES } from '../../../../../base/ui/constants.web';
import { createBreakoutRoom } from '../../../../../breakout-rooms/actions';

const useStyles = makeStyles()(theme => {
    return {
        button: {
            marginTop: theme.spacing(3),
            borderRadius: '999px',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.16)',
            fontWeight: 600,
            position: 'relative',
            overflow: 'hidden',
            
            '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
            },
            
            '&:active': {
                transform: 'translateY(0)',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
            }
        }
    };
});

export const AddBreakoutRoomButton = () => {
    const { classes } = useStyles();
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const onAdd = useCallback(() =>
        dispatch(createBreakoutRoom())
    , [ dispatch ]);

    return (
        <Button
            accessibilityLabel = { t('breakoutRooms.actions.add') }
            className = { classes.button }
            fullWidth = { true }
            labelKey = { 'breakoutRooms.actions.add' }
            onClick = { onAdd }
            type = { BUTTON_TYPES.SECONDARY } />
    );
};
