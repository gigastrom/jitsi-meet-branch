import React, { Component } from 'react';
import { connect } from 'react-redux';

// @ts-expect-error
import VideoLayout from '../../../../modules/UI/videolayout/VideoLayout';
import { IReduxState, IStore } from '../../app/types';
import { isDisplayNameVisible } from '../../base/config/functions.web';
import { VIDEO_TYPE } from '../../base/media/constants';
import { getLocalParticipant } from '../../base/participants/functions';
import Watermarks from '../../base/react/components/web/Watermarks';
import { getHideSelfView } from '../../base/settings/functions.any';
import { getVideoTrackByParticipant } from '../../base/tracks/functions.web';
import { setColorAlpha } from '../../base/util/helpers';
import StageParticipantNameLabel from '../../display-name/components/web/StageParticipantNameLabel';
import { FILMSTRIP_BREAKPOINT } from '../../filmstrip/constants';
import { getVerticalViewMaxWidth, isFilmstripResizable } from '../../filmstrip/functions.web';
import SharedVideo from '../../shared-video/components/web/SharedVideo';
import Captions from '../../subtitles/components/web/Captions';
import { setTileView } from '../../video-layout/actions.web';
import Whiteboard from '../../whiteboard/components/web/Whiteboard';
import { isWhiteboardEnabled } from '../../whiteboard/functions';
import { setSeeWhatIsBeingShared } from '../actions.web';
import { getLargeVideoParticipant } from '../functions';

import ScreenSharePlaceholder from './ScreenSharePlaceholder.web';

// Hack to detect Spot.
const SPOT_DISPLAY_NAME = 'Meeting Room';

interface IProps {

    /**
     * The alpha(opacity) of the background.
     */
    _backgroundAlpha?: number;

    /**
     * The user selected background color.
     */
    _customBackgroundColor: string;

    /**
     * The user selected background image url.
     */
    _customBackgroundImageUrl: string;

    /**
     * Whether the screen-sharing placeholder should be displayed or not.
     */
    _displayScreenSharingPlaceholder: boolean;

    /**
     * Whether or not the hideSelfView is enabled.
     */
    _hideSelfView: boolean;

    /**
     * Prop that indicates whether the chat is open.
     */
    _isChatOpen: boolean;

    /**
     * Whether or not the display name is visible.
     */
    _isDisplayNameVisible: boolean;

    /**
     * Whether or not the local screen share is on large-video.
     */
    _isScreenSharing: boolean;

    /**
     * The large video participant id.
     */
    _largeVideoParticipantId: string;

    /**
     * Local Participant id.
     */
    _localParticipantId: string;

    /**
     * Used to determine the value of the autoplay attribute of the underlying
     * video element.
     */
    _noAutoPlayVideo: boolean;

    /**
     * Whether or not the filmstrip is resizable.
     */
    _resizableFilmstrip: boolean;

    /**
     * Whether or not the screen sharing is visible.
     */
    _seeWhatIsBeingShared: boolean;

    /**
     * Whether or not to show dominant speaker badge.
     */
    _showDominantSpeakerBadge: boolean;

    /**
     * The width of the vertical filmstrip (user resized).
     */
    _verticalFilmstripWidth?: number | null;

    /**
     * The max width of the vertical filmstrip.
     */
    _verticalViewMaxWidth: number;

    /**
     * Whether or not the filmstrip is visible.
     */
    _visibleFilmstrip: boolean;

    /**
     * Whether or not the whiteboard is ready to be used.
     */
    _whiteboardEnabled: boolean;

    /**
     * The Redux dispatch function.
     */
    dispatch: IStore['dispatch'];
}

interface IState {
    isDragging: boolean;
    currentX: number;
    currentY: number;
    initialX: number;
    initialY: number;
    lastX: number;
    lastY: number;
    velocity: {
        x: number;
        y: number;
    };
}

/** .
 * Implements a React {@link Component} which represents the large video (a.k.a.
 * The conference participant who is on the local stage) on Web/React.
 *
 * @augments Component
 */
class LargeVideo extends Component<IProps, IState> {
    _tappedTimeout: number | undefined;
    _containerRef: React.RefObject<HTMLDivElement>;
    _wrapperRef: React.RefObject<HTMLDivElement>;
    _animationFrame: number | undefined;
    _lastTimestamp: number;

    /**
     * Constructor of the component.
     *
     * @inheritdoc
     */
    constructor(props: IProps) {
        super(props);

        this.state = {
            isDragging: false,
            currentX: 0,
            currentY: 0,
            initialX: 0,
            initialY: 0,
            lastX: 0,
            lastY: 0,
            velocity: {
                x: 0,
                y: 0
            }
        };

        this._containerRef = React.createRef<HTMLDivElement>();
        this._wrapperRef = React.createRef<HTMLDivElement>();
        this._lastTimestamp = 0;

        this._clearTapTimeout = this._clearTapTimeout.bind(this);
        this._onDoubleTap = this._onDoubleTap.bind(this);
        this._updateLayout = this._updateLayout.bind(this);
        this._handleDragStart = this._handleDragStart.bind(this);
        this._handleDragEnd = this._handleDragEnd.bind(this);
        this._handleDrag = this._handleDrag.bind(this);
        this._updatePosition = this._updatePosition.bind(this);
    }

    override componentDidUpdate(prevProps: IProps) {
        const {
            _visibleFilmstrip,
            _isScreenSharing,
            _seeWhatIsBeingShared,
            _largeVideoParticipantId,
            _hideSelfView,
            _localParticipantId } = this.props;

        if (prevProps._visibleFilmstrip !== _visibleFilmstrip) {
            this._updateLayout();
        }

        if (prevProps._isScreenSharing !== _isScreenSharing && !_isScreenSharing) {
            this.props.dispatch(setSeeWhatIsBeingShared(false));
        }

        if (_isScreenSharing && _seeWhatIsBeingShared) {
            VideoLayout.updateLargeVideo(_largeVideoParticipantId, true, true);
        }

        if (_largeVideoParticipantId === _localParticipantId
            && prevProps._hideSelfView !== _hideSelfView) {
            VideoLayout.updateLargeVideo(_largeVideoParticipantId, true, false);
        }
    }

    override componentWillUnmount() {
        if (this._animationFrame) {
            cancelAnimationFrame(this._animationFrame);
        }
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {React$Element}
     */
    override render() {
        const {
            _displayScreenSharingPlaceholder,
            _isChatOpen,
            _isDisplayNameVisible,
            _noAutoPlayVideo,
            _showDominantSpeakerBadge,
            _whiteboardEnabled,
            _visibleFilmstrip
        } = this.props;
        
        const customStyles = this._getCustomStyles();
        const bubbleStyles = {
            ...customStyles,
            position: 'fixed' as const,
            top: '20px',
            right: '20px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            overflow: 'hidden',
            cursor: 'move',
            zIndex: 9999,
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
            transition: this.state.isDragging ? 'none' : 'box-shadow 0.3s ease',
            transform: `translate3d(${this.state.currentX}px, ${this.state.currentY}px, 0)`,
            touchAction: 'none',
            userSelect: 'none' as const,
            willChange: 'transform',
            backgroundColor: customStyles.backgroundColor || '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        };

        const videoStyles = {
            width: '100%',
            height: '100%',
            objectFit: 'cover' as const,
            borderRadius: '50%',
            transition: 'transform 0.3s ease',
            minWidth: '100%',
            minHeight: '100%',
            transform: 'translate(-50%, -50%)',
            border: '4px solid transparent',
            backgroundImage: 'linear-gradient(white, white), linear-gradient(45deg, #ff6b6b, #4ecdc4)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'content-box, border-box'
        };

        const containerStyles = {
            position: 'relative' as const,
            width: '100%',
            height: '100%',
            zIndex: 9999,
            overflow: 'hidden',
            borderRadius: '50%'
        };

        const videoWrapperStyles = {
            position: 'relative' as const,
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        };

        return (
            <div
                style={bubbleStyles}
                id = 'newlargeVideoContainer'
                ref = { this._containerRef }
                onMouseDown = { this._handleDragStart }
                onMouseMove = { this._handleDrag }
                onMouseUp = { this._handleDragEnd }
                onMouseLeave = { this._handleDragEnd }
                onTouchStart = { this._handleDragStart }
                onTouchMove = { this._handleDrag }
                onTouchEnd = { this._handleDragEnd }>
                <div style={containerStyles}>
                    <SharedVideo />
                    {_whiteboardEnabled && <Whiteboard />}
                    <div id = 'etherpad' />
                    <Watermarks />

                    <div
                        id = 'dominantSpeaker'
                        onTouchEnd = { this._onDoubleTap }
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
                        <div className = 'dynamic-shadow' />
                        <div id = 'dominantSpeakerAvatarContainer' />
                    </div>
                    
                    <div id = 'remotePresenceMessage' style={{ position: 'absolute', zIndex: 2 }} />
                    <span id = 'remoteConnectionMessage' style={{ position: 'absolute', zIndex: 2 }} />
                    
                    <div id = 'largeVideoElementsContainer' style={videoWrapperStyles}>
                        <div id = 'largeVideoBackgroundContainer' style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                        { _displayScreenSharingPlaceholder ? <ScreenSharePlaceholder /> : <></>}
                        <div
                            id = ''
                            onTouchEnd = { this._onDoubleTap }
                            ref = { this._wrapperRef }
                            role = 'figure'
                            style={videoWrapperStyles}>
                            <video
                                style={videoStyles}
                                autoPlay = { !_noAutoPlayVideo }
                                id = 'largeVideo'
                                muted = { true }
                                playsInline = { true } />
                        </div>
                    </div>
                    
                    { interfaceConfig.DISABLE_TRANSCRIPTION_SUBTITLES
                        || <Captions /> }
                    {
                        _isDisplayNameVisible
                        && (
                            _showDominantSpeakerBadge && <StageParticipantNameLabel />
                        )
                    }
                </div>
            </div>
        );
    }

    /**
     * Refreshes the video layout to determine the dimensions of the stage view.
     * If the filmstrip is toggled it adds CSS transition classes and removes them
     * when the transition is done.
     *
     * @returns {void}
     */
    _updateLayout() {
        const { _verticalFilmstripWidth, _resizableFilmstrip } = this.props;

        if (_resizableFilmstrip && Number(_verticalFilmstripWidth) >= FILMSTRIP_BREAKPOINT) {
            this._containerRef.current?.classList.add('transition');
            this._wrapperRef.current?.classList.add('transition');
            VideoLayout.refreshLayout();

            setTimeout(() => {
                this._containerRef?.current && this._containerRef.current.classList.remove('transition');
                this._wrapperRef?.current && this._wrapperRef.current.classList.remove('transition');
            }, 1000);
        } else {
            VideoLayout.refreshLayout();
        }
    }

    /**
     * Clears the '_tappedTimout'.
     *
     * @private
     * @returns {void}
     */
    _clearTapTimeout() {
        clearTimeout(this._tappedTimeout);
        this._tappedTimeout = undefined;
    }

    /**
     * Creates the custom styles object.
     *
     * @private
     * @returns {Object}
     */
    _getCustomStyles() {
        const styles: any = {};
        const {
            _customBackgroundColor,
            _customBackgroundImageUrl,
            _verticalFilmstripWidth,
            _verticalViewMaxWidth,
            _visibleFilmstrip
        } = this.props;

        styles.backgroundColor = _customBackgroundColor || interfaceConfig.DEFAULT_BACKGROUND;

        if (this.props._backgroundAlpha !== undefined) {
            const alphaColor = setColorAlpha(styles.backgroundColor, this.props._backgroundAlpha);

            styles.backgroundColor = alphaColor;
        }

        if (_customBackgroundImageUrl) {
            styles.backgroundImage = `url(${_customBackgroundImageUrl})`;
            styles.backgroundSize = 'cover';
        }

        if (_visibleFilmstrip && Number(_verticalFilmstripWidth) >= FILMSTRIP_BREAKPOINT) {
            styles.width = `calc(100% - ${_verticalViewMaxWidth || 0}px)`;
        }

        return styles;
    }

    /**
     * Sets view to tile view on double tap.
     *
     * @param {Object} e - The event.
     * @private
     * @returns {void}
     */
    _onDoubleTap(e: React.TouchEvent) {
        e.stopPropagation();
        e.preventDefault();

        if (this._tappedTimeout) {
            this._clearTapTimeout();
            this.props.dispatch(setTileView(true));
        } else {
            this._tappedTimeout = window.setTimeout(this._clearTapTimeout, 300);
        }
    }

    _updatePosition(timestamp: number) {
        if (!this.state.isDragging && (this.state.velocity.x !== 0 || this.state.velocity.y !== 0)) {
            const deltaTime = timestamp - this._lastTimestamp;
            const friction = 0.95;

            const newVelocity = {
                x: this.state.velocity.x * friction,
                y: this.state.velocity.y * friction
            };

            const newX = this.state.currentX + newVelocity.x * deltaTime / 16;
            const newY = this.state.currentY + newVelocity.y * deltaTime / 16;

            // Stop animation when velocity is very small
            if (Math.abs(newVelocity.x) < 0.01 && Math.abs(newVelocity.y) < 0.01) {
                this.setState({
                    velocity: { x: 0, y: 0 }
                });
            } else {
                this.setState({
                    currentX: newX,
                    currentY: newY,
                    velocity: newVelocity
                });
                this._animationFrame = requestAnimationFrame(this._updatePosition);
            }
        }
        this._lastTimestamp = timestamp;
    }

    _handleDragStart(e: React.TouchEvent | React.MouseEvent) {
        if (this._animationFrame) {
            cancelAnimationFrame(this._animationFrame);
        }

        let clientX, clientY;
        if (e.type === 'mousedown') {
            const mouseEvent = e as React.MouseEvent;
            clientX = mouseEvent.clientX;
            clientY = mouseEvent.clientY;
        } else {
            const touchEvent = e as React.TouchEvent;
            clientX = touchEvent.touches[0].clientX;
            clientY = touchEvent.touches[0].clientY;
        }

        this.setState({
            isDragging: true,
            initialX: clientX - this.state.currentX,
            initialY: clientY - this.state.currentY,
            lastX: this.state.currentX,
            lastY: this.state.currentY,
            velocity: { x: 0, y: 0 }
        });
    }

    _handleDragEnd() {
        const deltaTime = 16; // Assuming 60fps
        const velocityX = (this.state.currentX - this.state.lastX) / deltaTime;
        const velocityY = (this.state.currentY - this.state.lastY) / deltaTime;

        this.setState({
            isDragging: false,
            velocity: {
                x: velocityX,
                y: velocityY
            }
        }, () => {
            this._lastTimestamp = performance.now();
            this._animationFrame = requestAnimationFrame(this._updatePosition);
        });
    }

    _handleDrag(e: React.TouchEvent | React.MouseEvent) {
        if (this.state.isDragging) {
            e.preventDefault();

            let clientX, clientY;
            if ((e as React.MouseEvent).clientX !== undefined) {
                const mouseEvent = e as React.MouseEvent;
                clientX = mouseEvent.clientX;
                clientY = mouseEvent.clientY;
            } else {
                const touchEvent = e as React.TouchEvent;
                clientX = touchEvent.touches[0].clientX;
                clientY = touchEvent.touches[0].clientY;
            }

            const newX = clientX - this.state.initialX;
            const newY = clientY - this.state.initialY;

            this.setState({
                currentX: newX,
                currentY: newY,
                lastX: this.state.currentX,
                lastY: this.state.currentY
            });
        }
    }
}


/**
 * Maps (parts of) the Redux state to the associated LargeVideo props.
 *
 * @param {Object} state - The Redux state.
 * @private
 * @returns {IProps}
 */
function _mapStateToProps(state: IReduxState) {
    const testingConfig = state['features/base/config'].testing;
    const { backgroundColor, backgroundImageUrl } = state['features/dynamic-branding'];
    const { isOpen: isChatOpen } = state['features/chat'];
    const { width: verticalFilmstripWidth, visible } = state['features/filmstrip'];
    const { defaultLocalDisplayName, hideDominantSpeakerBadge } = state['features/base/config'];
    const { seeWhatIsBeingShared } = state['features/large-video'];
    const localParticipantId = getLocalParticipant(state)?.id;
    const largeVideoParticipant = getLargeVideoParticipant(state);
    const videoTrack = getVideoTrackByParticipant(state, largeVideoParticipant);
    const isLocalScreenshareOnLargeVideo = largeVideoParticipant?.id?.includes(localParticipantId ?? '')
        && videoTrack?.videoType === VIDEO_TYPE.DESKTOP;
    const isOnSpot = defaultLocalDisplayName === SPOT_DISPLAY_NAME;

    return {
        _backgroundAlpha: state['features/base/config'].backgroundAlpha,
        _customBackgroundColor: backgroundColor,
        _customBackgroundImageUrl: backgroundImageUrl,
        _displayScreenSharingPlaceholder: Boolean(isLocalScreenshareOnLargeVideo && !seeWhatIsBeingShared && !isOnSpot),
        _hideSelfView: getHideSelfView(state),
        _isChatOpen: isChatOpen,
        _isDisplayNameVisible: isDisplayNameVisible(state),
        _isScreenSharing: Boolean(isLocalScreenshareOnLargeVideo),
        _largeVideoParticipantId: largeVideoParticipant?.id ?? '',
        _localParticipantId: localParticipantId ?? '',
        _noAutoPlayVideo: Boolean(testingConfig?.noAutoPlayVideo),
        _resizableFilmstrip: isFilmstripResizable(state),
        _seeWhatIsBeingShared: Boolean(seeWhatIsBeingShared),
        _showDominantSpeakerBadge: !hideDominantSpeakerBadge,
        _verticalFilmstripWidth: verticalFilmstripWidth.current,
        _verticalViewMaxWidth: getVerticalViewMaxWidth(state),
        _visibleFilmstrip: visible,
        _whiteboardEnabled: isWhiteboardEnabled(state)
    };
}

export default connect(_mapStateToProps)(LargeVideo);
