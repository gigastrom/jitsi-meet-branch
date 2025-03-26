import React from 'react';
import { makeStyles } from 'tss-react/mui';

import { IconDotsHorizontal } from '../../../base/icons/svg';
import Button from '../../../base/ui/components/web/Button';

const useStyles = makeStyles()((theme: any) => {
    return {
        actionButton: {
            width: '32px',
            height: '32px',
            padding: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--button-background, rgba(255, 255, 255, 0.1))',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(4px)',
            color: 'var(--icon-color, #fff)',

            '&:hover': {
                backgroundColor: 'var(--button-background-hover, rgba(255, 255, 255, 0.2))',
                transform: 'scale(1.05)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            },

            '&:active': {
                transform: 'scale(0.95)'
            },

            '& svg': {
                width: '16px',
                height: '16px',
                fill: 'currentColor'
            }
        }
    };
});

interface IProps {

    /**
     * Label used for accessibility.
     */
    accessibilityLabel: string;

    /**
     * Click handler function.
     */
    onClick: () => void;

    participantID?: string;
}

const ParticipantActionEllipsis = ({ accessibilityLabel, onClick, participantID }: IProps) => {
    const { classes } = useStyles();

    return (
        <Button
            accessibilityLabel={accessibilityLabel}
            className={classes.actionButton}
            icon={IconDotsHorizontal}
            onClick={onClick}
            size='small'
            testId={participantID ? `participant-more-options-${participantID}` : undefined} />
    );
};

export default ParticipantActionEllipsis;
