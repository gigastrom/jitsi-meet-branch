import React, { ReactNode } from 'react';
import { makeStyles } from 'tss-react/mui';

import ContextMenuItem, { IProps as ItemProps } from './ContextMenuItem';


interface IProps {

    /**
     * List of actions in this group.
     */
    actions?: Array<ItemProps>;

    /**
     * The children of the component.
     */
    children: ReactNode;

    /**
     * Additional CSS class names.
     */
    className?: string;
}

const useStyles = makeStyles()(() => {
    return {
        group: {
            margin: '8px 0',
            position: 'relative',
            
            '&:not(:last-child)': {
                paddingBottom: '8px',
                
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: '16px',
                    right: '16px',
                    height: '1px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
            },
            
            '&:first-child': {
                marginTop: '4px'
            },
            
            '&:last-child': {
                marginBottom: '4px'
            }
        }
    };
});

const ContextMenuItemGroup = ({
    actions,
    children,
    className
}: IProps) => {
    const { classes, cx } = useStyles();

    return (
        <div className = { cx(classes.group, className) }>
            {children}
            {actions?.map(actionProps => (
                <ContextMenuItem
                    key = { actionProps.text }
                    { ...actionProps } />
            ))}
        </div>
    );
};

export default ContextMenuItemGroup;
