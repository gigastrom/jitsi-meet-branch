import React, { useCallback } from 'react';
import { makeStyles } from 'tss-react/mui';

import Icon from '../../../base/icons/components/Icon';
import { IconDotsHorizontal } from '../../../base/icons/svg';
import Tooltip from '../../../base/tooltip/components/Tooltip';

interface IProps {
    /**
     * Label used for accessibility.
     */
    accessibilityLabel: string;

    /**
     * Additional class names to add to the button.
     */
    className?: string;

    /**
     * Whether button is disabled or not.
     */
    disabled?: boolean;

    /**
     * Whether the button is toggled or not.
     */
    isOpen?: boolean;

    /**
     * Click handler.
     */
    onClick?: (e?: React.MouseEvent) => void;

    /**
     * Keydown handler.
     */
    onKeyDown?: (e?: React.KeyboardEvent) => void;

    /**
     * The tooltip to display when hovering over the button.
     */
    tooltip?: string;
}

const useStyles = makeStyles()(theme => {
    return {
        button: {
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '8px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'rgba(42, 44, 53, 0.3)',
            backdropFilter: 'blur(8px)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            width: '40px',
            height: '40px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
            
            '&:hover': {
                backgroundColor: 'rgba(42, 44, 53, 0.7)',
                transform: 'translateY(-2px)'
            },
            
            '&:active': {
                transform: 'translateY(0px) scale(0.95)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
            },
            
            '&.toggled': {
                backgroundColor: 'rgba(42, 80, 196, 0.7)',
                boxShadow: '0 0 0 2px rgba(42, 80, 196, 0.5), 0 2px 6px rgba(0, 0, 0, 0.2)'
            },
            
            '&.disabled': {
                opacity: 0.5,
                cursor: 'not-allowed',
                pointerEvents: 'none'
            }
        },
        icon: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease',
            
            '& svg': {
                fill: theme.palette.icon01 || '#FFFFFF',
                width: '20px',
                height: '20px'
            }
        }
    };
});

/**
 * A React component for the modern overflow menu button.
 *
 * @param {IProps} props - The props of the component.
 * @returns {JSX.Element}
 */
const ModernOverflowButton = ({
    accessibilityLabel,
    className = '',
    disabled = false,
    isOpen = false,
    onClick,
    onKeyDown,
    tooltip = ''
}: IProps) => {
    const { classes, cx } = useStyles();

    const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick?.(undefined);
        }
        
        onKeyDown?.(event);
    }, [onClick, onKeyDown]);

    const buttonClasses = cx(
        classes.button,
        isOpen && 'toggled',
        disabled && 'disabled',
        className
    );

    return (
        <Tooltip
            content={tooltip || accessibilityLabel}
            position="top">
            <div
                aria-disabled={disabled}
                aria-label={accessibilityLabel}
                aria-pressed={isOpen}
                className={buttonClasses}
                onClick={disabled ? undefined : onClick}
                onKeyDown={disabled ? undefined : handleKeyPress}
                role="button"
                tabIndex={0}>
                <div className={classes.icon}>
                    <Icon src={IconDotsHorizontal} />
                </div>
            </div>
        </Tooltip>
    );
};

export default ModernOverflowButton; 