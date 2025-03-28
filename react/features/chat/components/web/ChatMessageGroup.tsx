import React from 'react';
import { makeStyles } from 'tss-react/mui';
import Avatar from '../../../base/avatar/components/Avatar';

import { IMessage } from '../../types';

import ChatMessage from './ChatMessage';

interface IProps {

    /**
     * Additional CSS classes to apply to the root element.
     */
    className: string;

    /**
     * The messages to display as a group.
     */
    messages: IMessage[];
}

const useStyles = makeStyles()((theme) => {
    return {
        messageGroup: {
            display: 'flex',
            flexDirection: 'row',
            margin: '10px 16px',
            alignItems: 'flex-start'
        },
        avatar: {
            marginRight: '10px',
            marginTop: '4px',
            flexShrink: 0
        },
        messagesContainer: {
            display: 'flex',
            flexDirection: 'column',
            maxWidth: 'calc(100% - 40px)'
        }
    };
});

/**
 * Component that renders a group of consecutive chat messages.
 *
 * @returns {React$Element<any>}
 */
export default function ChatMessageGroup(props: IProps) {
    const { classes } = useStyles();
    const { className, messages } = props;

    // If there are no messages, don't render anything
    if (!messages.length) {
        return null;
    }

    return (
        <div className={classes.messageGroup}>
            <Avatar
                className={classes.avatar}
                participantId={messages[0].participantId}
                size={32} />
            <div className={classes.messagesContainer}>
                {messages.map((message, i) => {
                    const showDisplayName = i === 0;
                    const showTimestamp = i === messages.length - 1;

                    return (
                        <ChatMessage
                            key={i}
                            message={message}
                            showDisplayName={showDisplayName}
                            showTimestamp={showTimestamp}
                            knocking={false}
                            shouldDisplayChatMessageMenu={true}
                            type={className} />
                    );
                })}
            </div>
        </div>
    );
}
