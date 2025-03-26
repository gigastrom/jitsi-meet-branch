import React, { ReactNode } from 'react';
import { makeStyles } from 'tss-react/mui';

import { isMobileBrowser } from '../../../environment/utils';
import Icon from '../../../icons/components/Icon';

export interface IProps {

    /**
     * Accessibility label.
     */
    accessibilityLabel: string;

    /**
     * Whether the element is disabled or not.
     */
    disabled?: boolean;

    /**
     * Class name for additional styles.
     */
    className?: string;

    /**
     * Click handler.
     */
    onClick?: (e?: React.MouseEvent) => void;

    /**
     * Keydown handler.
     */
    onKeyDown?: (e?: React.KeyboardEvent) => void;

    /**
     * Keypress handler.
     */
    onKeyPress?: (e?: React.KeyboardEvent) => void;

    /**
     * The icon to be rendered.
     */
    icon: Function;

    /**
     * Unique identifier for the element.
     */
    id?: string;
}

const useStyles = makeStyles()(() => {
    return {
        container: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-color, #fff)',
            transition: 'color 0.2s ease',

            '&:hover': {
                color: 'var(--text-color-hover, rgba(255, 255, 255, 0.8))'
            },

            '&.disabled': {
                cursor: 'default',
                opacity: 0.5
            }
        }
    };
});

const ClickableIcon = ({ accessibilityLabel, className, icon, id, onClick }: IProps) => {
    const { classes: styles, cx } = useStyles();
    const isMobile = isMobileBrowser();

    return (
        <button
            aria-label = { accessibilityLabel }
            className = { cx(styles.container, isMobile && 'is-mobile', className) }
            id = { id }
            onClick = { onClick }>
            <Icon
                size = { 24 }
                src = { icon } />
        </button>
    );
};

export default ClickableIcon;
