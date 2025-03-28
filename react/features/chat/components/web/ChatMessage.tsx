import { Theme } from '@mui/material';
import React, { useCallback, useMemo, useState } from 'react';
import { connect } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../../app/types';
import { translate } from '../../../base/i18n/functions';
import { getParticipantDisplayName } from '../../../base/participants/functions';
import Popover from '../../../base/popover/components/Popover.web';
import Message from '../../../base/react/components/web/Message';
import { withPixelLineHeight } from '../../../base/styles/functions.web';
import { getFormattedTimestamp, getMessageText, getPrivateNoticeMessage } from '../../functions';
import { IChatMessageProps } from '../../types';

import MessageMenu from './MessageMenu';
import ReactButton from './ReactButton';

interface IProps extends IChatMessageProps {
    shouldDisplayChatMessageMenu: boolean;
    state?: IReduxState;
    type: string;
    showDisplayName: boolean;
    showTimestamp: boolean;
    knocking: boolean;
}

const useStyles = makeStyles()((theme: Theme) => {
    return {
        chatMessageFooter: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'center',
            marginTop: theme.spacing(1)
        },
        chatMessageFooterLeft: {
            display: 'flex',
            flexGrow: 1,
            overflow: 'hidden'
        },
        chatMessageWrapper: {
            maxWidth: '100%',
            marginBottom: '8px'
        },
        chatMessage: {
            display: 'inline-flex',
            padding: '12px',
            backgroundColor: 'var(--accent-color, linear-gradient(45deg, #396afc 0%, #2948ff 100%))',
            borderRadius: '18px',
            maxWidth: '100%',
            boxSizing: 'border-box' as const,
            color: '#ffffff',

            '&.privatemessage': {
                backgroundColor: 'var(--accent-color, linear-gradient(45deg, #396afc 0%, #2948ff 100%))'
            },
            '&.local': {
                backgroundImage: 'var(--accent-color, linear-gradient(45deg, #834d9b 0%, #d04ed6 100%))',
                backgroundColor: 'transparent',
                
                '&.privatemessage': {
                    backgroundImage: 'var(--accent-color, linear-gradient(45deg, #834d9b 0%, #d04ed6 100%))',
                    backgroundColor: 'transparent'
                },
                '&.local': {
                    backgroundImage: 'var(--accent-color, linear-gradient(45deg, #834d9b 0%, #d04ed6 100%))',
                    backgroundColor: 'transparent',
                    
                    '&.privatemessage': {
                        backgroundImage: 'var(--accent-color, linear-gradient(45deg, #834d9b 0%, #d04ed6 100%))',
                        backgroundColor: 'transparent'
                    }
                },

                '&.error': {
                    backgroundColor: theme.palette.actionDanger,
                    backgroundImage: 'none',
                    borderRadius: '8px',
                    fontWeight: 100
                },

                '&.lobbymessage': {
                    backgroundImage: 'var(--accent-color, linear-gradient(45deg, #396afc 0%, #2948ff 100%))',
                    backgroundColor: 'transparent'
                }
            },
            '&.error': {
                backgroundColor: theme.palette.actionDanger,
                backgroundImage: 'none',
                borderRadius: '8px',
                fontWeight: 100
            },
            '&.lobbymessage': {
                backgroundImage: 'var(--accent-color, linear-gradient(45deg, #396afc 0%, #2948ff 100%))',
                backgroundColor: 'transparent'
            }
        },
        sideBySideContainer: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'left',
            alignItems: 'center',
            marginLeft: theme.spacing(1)
        },
        reactionBox: {
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing(1),
            backgroundColor: theme.palette.grey[800],
            borderRadius: theme.shape.borderRadius,
            padding: theme.spacing(0, 1),
            cursor: 'pointer'
        },
        reactionCount: {
            fontSize: '0.8rem',
            color: theme.palette.grey[400]
        },
        replyButton: {
            padding: '2px'
        },
        replyWrapper: {
            display: 'flex',
            flexDirection: 'row' as const,
            alignItems: 'center',
            maxWidth: '100%'
        },
        messageContent: {
            maxWidth: '100%',
            overflow: 'hidden',
            flex: 1
        },
        optionsButtonContainer: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: theme.spacing(1),
            minWidth: '32px',
            minHeight: '32px'
        },
        displayName: {
            ...withPixelLineHeight(theme.typography.labelBold),
            color: '#ffffff',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            marginBottom: theme.spacing(1),
            maxWidth: '130px'
        },
        userMessage: {
            ...withPixelLineHeight(theme.typography.bodyShortRegular),
            color: '#ffffff',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
        },
        privateMessageNotice: {
            ...withPixelLineHeight(theme.typography.labelRegular),
            color: '#eeeeee',
            marginTop: theme.spacing(1)
        },
        timestamp: {
            ...withPixelLineHeight(theme.typography.labelRegular),
            color: '#dddddd',
            fontSize: '11px',
            marginTop: '4px'
        },
        reactionsPopover: {
            padding: theme.spacing(2),
            backgroundColor: theme.palette.ui03,
            borderRadius: theme.shape.borderRadius,
            maxWidth: '150px',
            maxHeight: '400px',
            overflowY: 'auto',
            color: theme.palette.text01
        },
        reactionItem: {
            display: 'flex',
            alignItems: 'center',
            marginBottom: theme.spacing(1),
            gap: theme.spacing(1),
            borderBottom: `1px solid ${theme.palette.common.white}`,
            paddingBottom: theme.spacing(1),
            '&:last-child': {
                borderBottom: 'none',
                paddingBottom: 0
            }
        },
        participantList: {
            marginLeft: theme.spacing(1),
            fontSize: '0.8rem',
            maxWidth: '120px'
        },
        participant: {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
        }
    };
});

const ChatMessage = ({
    message,
    state,
    showDisplayName,
    showTimestamp,
    type,
    shouldDisplayChatMessageMenu,
    knocking,
    t
}: IProps) => {
    const { classes, cx } = useStyles();
    const [ isHovered, setIsHovered ] = useState(false);
    const [ isReactionsOpen, setIsReactionsOpen ] = useState(false);

    const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
    }, []);

    const handleReactionsOpen = useCallback(() => {
        setIsReactionsOpen(true);
    }, []);

    const handleReactionsClose = useCallback(() => {
        setIsReactionsOpen(false);
    }, []);

    /**
     * Renders the display name of the sender.
     *
     * @returns {React$Element<*>}
     */
    function _renderDisplayName() {
        return (
            <div
                aria-hidden = { true }
                className = { cx('display-name', classes.displayName) }>
                {message.displayName}
            </div>
        );
    }

    /**
     * Renders the message privacy notice.
     *
     * @returns {React$Element<*>}
     */
    function _renderPrivateNotice() {
        return (
            <div className = { classes.privateMessageNotice }>
                {getPrivateNoticeMessage(message)}
            </div>
        );
    }

    /**
     * Renders the time at which the message was sent.
     *
     * @returns {React$Element<*>}
     */
    function _renderTimestamp() {
        return (
            <div className = { cx('timestamp', classes.timestamp) }>
                <p>
                    {getFormattedTimestamp(message)}
                </p>
            </div>
        );
    }

    /**
     * Renders the reactions for the message.
     *
     * @returns {React$Element<*>}
     */
    const renderReactions = useMemo(() => {
        if (!message.reactions || message.reactions.size === 0) {
            return null;
        }

        const reactionsArray = Array.from(message.reactions.entries())
            .map(([ reaction, participants ]) => {
                return { reaction,
                    participants };
            })
            .sort((a, b) => b.participants.size - a.participants.size);

        const totalReactions = reactionsArray.reduce((sum, { participants }) => sum + participants.size, 0);
        const numReactionsDisplayed = 3;

        const reactionsContent = (
            <div className = { classes.reactionsPopover }>
                {reactionsArray.map(({ reaction, participants }) => (
                    <div
                        className = { classes.reactionItem }
                        key = { reaction }>
                        <p>
                            <span>{reaction}</span>
                            <span>{participants.size}</span>
                        </p>
                        <div className = { classes.participantList }>
                            {Array.from(participants).map(participantId => (
                                <p
                                    className = { classes.participant }
                                    key = { participantId }>
                                    {state && getParticipantDisplayName(state, participantId)}
                                </p>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );

        return (
            <Popover
                content = { reactionsContent }
                onPopoverClose = { handleReactionsClose }
                onPopoverOpen = { handleReactionsOpen }
                position = 'top'
                trigger = 'hover'
                visible = { isReactionsOpen }>
                <div className = { classes.reactionBox }>
                    {reactionsArray.slice(0, numReactionsDisplayed).map(({ reaction }, index) =>
                        <p key = { index }>{reaction}</p>
                    )}
                    {reactionsArray.length > numReactionsDisplayed && (
                        <p className = { classes.reactionCount }>
                            +{totalReactions - numReactionsDisplayed}
                        </p>
                    )}
                </div>
            </Popover>
        );
    }, [ message?.reactions, isHovered, isReactionsOpen ]);

    return (
        <div 
            className={classes.chatMessageWrapper}
            id={message.messageId}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}>
            {showDisplayName && message.displayName && (
                <div className={classes.displayName}>
                    {message.displayName}
                </div>
            )}
            <div
                className={cx(
                    classes.chatMessage,
                    type,
                    message.privateMessage && 'privatemessage',
                    message.lobbyChat && !knocking && 'lobbymessage'
                )}>
                <div className={classes.messageContent}>
                    <div className={classes.userMessage}>
                        <Message
                            screenReaderHelpText={message.displayName === message.recipient
                                ? t('chat.messageAccessibleTitleMe')
                                : t('chat.messageAccessibleTitle', {
                                    user: message.displayName
                                })}
                            text={getMessageText(message)} />
                    </div>
                </div>
            </div>
            
            {message.privateMessage && (
                <div className={classes.privateMessageNotice}>
                    {getPrivateNoticeMessage(message)}
                </div>
            )}
            
            {showTimestamp && (
                <div className={classes.timestamp}>
                    {getFormattedTimestamp(message)}
                </div>
            )}
            
            {message.reactions && message.reactions.size > 0 && (
                <div className={classes.chatMessageFooter}>
                    <div className={classes.chatMessageFooterLeft}>
                        {renderReactions}
                    </div>
                </div>
            )}
            
            {/* Menu options for messages */}
            {isHovered && shouldDisplayChatMessageMenu && (
                <div className={classes.sideBySideContainer}>
                    {!message.privateMessage && !message.lobbyChat && (
                        <div className={classes.optionsButtonContainer}>
                            <ReactButton
                                messageId={message.messageId}
                                receiverId={''} />
                        </div>
                    )}
                    <div className={classes.optionsButtonContainer}>
                        <MessageMenu
                            isLobbyMessage={message.lobbyChat}
                            message={message.message}
                            participantId={message.participantId}
                            shouldDisplayChatMessageMenu={shouldDisplayChatMessageMenu} />
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Maps part of the Redux store to the props of this component.
 *
 * @param {Object} state - The Redux state.
 * @returns {IProps}
 */
function _mapStateToProps(state: IReduxState, { message }: IProps) {
    const { knocking } = state['features/lobby'];
    const localParticipantId = state['features/base/participants'].local?.id;

    return {
        shouldDisplayChatMessageMenu: message.participantId !== localParticipantId,
        knocking,
        state
    };
}

export default translate<IProps>(connect(_mapStateToProps)(ChatMessage));
