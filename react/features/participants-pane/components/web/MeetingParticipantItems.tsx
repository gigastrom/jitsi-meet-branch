import React from 'react';
import { makeStyles } from 'tss-react/mui';

import MeetingParticipantItem from './MeetingParticipantItem';

const useStyles = makeStyles()((theme: any) => {
    return {
        participantsList: {
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '8px 0',
            backgroundColor: 'var(--background-color, rgba(28, 32, 37, 0.95))',
            borderRadius: '12px',
            margin: '8px 0',
            transition: 'all 0.3s ease',

            '&:hover': {
                backgroundColor: 'var(--background-hover, rgba(28, 32, 37, 0.98))'
            }
        }
    };
});

interface IProps {

    /**
     * The translated ask unmute text for the quick action buttons.
     */
    askUnmuteText?: string;

    /**
     * Whether or not the local participant is in a breakout room.
     */
    isInBreakoutRoom: boolean;

    /**
     * Callback for the mouse leaving this item.
     */
    lowerMenu: Function;

    /**
     * Callback used to open a confirmation dialog for audio muting.
     */
    muteAudio: Function;

    /**
     * The translated text for the mute participant button.
     */
    muteParticipantButtonText?: string;

    /**
     * Callback used to open an actions drawer for a participant.
     */
    openDrawerForParticipant: Function;

    /**
     * True if an overflow drawer should be displayed.
     */
    overflowDrawer?: boolean;

    /**
     * The aria-label for the ellipsis action.
     */
    participantActionEllipsisLabel: string;

    /**
     * The meeting participants.
     */
    participantIds: Array<string>;

    /**
     * The if of the participant for which the context menu should be open.
     */
    raiseContextId?: string;

    /**
     * Current search string.
     */
    searchString?: string;

    /**
     * Callback used to stop a participant's video.
     */
    stopVideo: Function;

    /**
     * Callback for the activation of this item's context menu.
     */
    toggleMenu: Function;

    /**
     * The translated "you" text.
     */
    youText: string;
}

/**
 * Component used to display a list of meeting participants.
 *
 * @returns {ReactNode}
 */
function MeetingParticipantItems({
    isInBreakoutRoom,
    lowerMenu,
    toggleMenu,
    muteAudio,
    participantIds,
    openDrawerForParticipant,
    overflowDrawer,
    raiseContextId,
    participantActionEllipsisLabel,
    searchString,
    stopVideo,
    youText
}: IProps) {
    const { classes } = useStyles();

    const renderParticipant = (id: string) => (
        <MeetingParticipantItem
            isHighlighted = { raiseContextId === id }
            isInBreakoutRoom = { isInBreakoutRoom }
            key = { id }
            muteAudio = { muteAudio }
            onContextMenu = { toggleMenu(id) }
            onLeave = { lowerMenu }
            openDrawerForParticipant = { openDrawerForParticipant }
            overflowDrawer = { overflowDrawer }
            participantActionEllipsisLabel = { participantActionEllipsisLabel }
            participantID = { id }
            searchString = { searchString }
            stopVideo = { stopVideo }
            youText = { youText } />
    );

    return (
        <div className={classes.participantsList}>
            {participantIds.map(renderParticipant)}
        </div>
    );
}

// Memoize the component in order to avoid rerender on drawer open/close.
export default React.memo<IProps>(MeetingParticipantItems);
