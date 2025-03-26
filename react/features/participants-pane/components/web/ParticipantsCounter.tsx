import React from 'react';
import { useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { getParticipantCount } from '../../../base/participants/functions';

const useStyles = makeStyles()((theme: any) => {
    return {
        badge: {
            backgroundColor: 'var(--accent-color, #246FE5)',
            borderRadius: '16px',
            color: 'var(--text-color-accent, #FFFFFF)',
            fontSize: '12px',
            fontWeight: 600,
            lineHeight: '16px',
            minWidth: '16px',
            padding: '0 4px',
            position: 'absolute',
            right: '-4px',
            top: '-4px',
            textAlign: 'center',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',

            '&:hover': {
                transform: 'scale(1.1)',
                boxShadow: '0 3px 6px rgba(0, 0, 0, 0.2)'
            }
        }
    };
});

/**
 * Component that renders the participant count badge.
 *
 * @returns {ReactElement}
 */
const ParticipantsCounter = () => {
    const count = useSelector(getParticipantCount);
    const { classes } = useStyles();

    if (count < 2) {
        return null;
    }

    return (
        <span className={classes.badge}>
            {count}
        </span>
    );
};

export default ParticipantsCounter;
