import React, { Component, createRef } from 'react';
import { connect } from 'react-redux';

import { IReduxState } from '../../../app/types';
import { FakeParticipant } from '../../../base/participants/types';
import { getVerticalViewMaxWidth } from '../../../filmstrip/functions.web';
import { getLargeVideoParticipant } from '../../../large-video/functions';
import { isSharedVideoEnabled, isVideoPlaying } from '../../functions';
import { setVideoLink } from '../../actions';

import VideoManager from './VideoManager';
import YoutubeVideoManager from './YoutubeVideoManager';

import './shared-video-controls.css';

interface IProps {

    /**
     * The available client width.
     */
    clientHeight: number;

    /**
     * The available client width.
     */
    clientWidth: number;

    /**
     * Whether the (vertical) filmstrip is visible or not.
     */
    filmstripVisible: boolean;

    /**
     * The width of the vertical filmstrip.
     */
    filmstripWidth: number;

    /**
     * Whether the shared video is enabled or not.
     */
    isEnabled: boolean;

    /**
     * Whether the user is actively resizing the filmstrip.
     */
    isResizing: boolean;

    /**
     * Whether the shared video is currently playing.
     */
    isVideoShared: boolean;

    /**
     * Whether the shared video should be shown on stage.
     */
    onStage: boolean;

    /**
     * The shared video url.
     */
    videoUrl?: string;

    /**
     * Action to set the video link.
     */
    setVideoLink: Function;

    /**
     * Whether the local participant is the owner of the shared video.
     */
    _isOwner: boolean;
}

interface IState {
    /**
     * Whether the video is currently being dragged.
     */
    isDragging: boolean;

    /**
     * Custom position after dragging.
     */
    position: {
        x: number;
        y: number;
    };

    /**
     * Custom size after resizing.
     */
    size: {
        width: number;
        height: number;
    };

    /**
     * Whether control buttons are visible.
     */
    showControls: boolean;

    /**
     * Whether search bar is visible.
     */
    showSearch: boolean;

    /**
     * Current search query.
     */
    searchQuery: string;

    /**
     * Search results.
     */
    searchResults: Array<{
        id: string;
        title: string;
        thumbnail: string;
    }>;

    /**
     * Whether search is in progress.
     */
    isSearching: boolean;
}

/** .
 * Implements a React {@link Component} which represents the large video (a.k.a.
 * The conference participant who is on the local stage) on Web/React.
 *
 * @augments Component
 */
class SharedVideo extends Component<IProps, IState> {
    /**
     * Reference to the video container.
     */
    videoRef = createRef<HTMLDivElement>();

    /**
     * Drag starting position.
     */
    dragStart = { x: 0, y: 0 };

    /**
     * API key for YouTube.
     */
    YOUTUBE_API_KEY = 'AIzaSyC_U1wsgIFcbgwfeLu6Fd7gGlJWSVrQmMQ'; // YouTube Data API v3 key

    /**
     * Initial component state.
     */
    state = {
        isDragging: false,
        position: { x: 0, y: 0 },
        size: { width: 0, height: 0 },
        showControls: false,
        showSearch: false,
        searchQuery: '',
        searchResults: [],
        isSearching: false
    };

    /**
     * Initialize component after mount.
     * 
     * @returns {void}
     */
    componentDidMount() {
        // Add event listeners for dragging
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
        
        // Initialize PiP mode with position and size
        this.initializePiPMode();
    }

    /**
     * Initialize PiP mode with default position and size.
     * 
     * @returns {void}
     */
    initializePiPMode() {
        const { clientWidth, clientHeight } = this.props;
        
        // Set initial size and position for PiP mode
        const width = Math.min(clientWidth / 3, 400);
        const height = Math.min(clientHeight / 3, 225);
        
        this.setState({
            size: {
                width,
                height
            },
            position: {
                x: clientWidth - width - 20,
                y: clientHeight - height - 20
            }
        });
    }

    /**
     * Clean up event listeners.
     * 
     * @returns {void}
     */
    componentWillUnmount() {
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
    }

    /**
     * Handle mouse down event to start dragging.
     * 
     * @param {React.MouseEvent} e - The mouse event.
     * @returns {void}
     */
    handleMouseDown = (e: React.MouseEvent) => {
        // Skip if clicking on controls
        if ((e.target as HTMLElement).closest('.shared-video-controls') || 
            (e.target as HTMLElement).closest('.shared-video-search')) {
            return;
        }

        this.setState({ isDragging: true });
        this.dragStart = {
            x: e.clientX - this.state.position.x,
            y: e.clientY - this.state.position.y
        };
        e.preventDefault();
    };

    /**
     * Handle mouse move event for dragging.
     * 
     * @param {MouseEvent} e - The mouse event.
     * @returns {void}
     */
    handleMouseMove = (e: MouseEvent) => {
        if (!this.state.isDragging) {
            return;
        }

        this.setState({
            position: {
                x: e.clientX - this.dragStart.x,
                y: e.clientY - this.dragStart.y
            }
        });
    };

    /**
     * Handle mouse up event to stop dragging.
     * 
     * @returns {void}
     */
    handleMouseUp = () => {
        this.setState({ isDragging: false });
    };

    /**
     * Handle mouse enter to show controls.
     * 
     * @returns {void}
     */
    handleMouseEnter = () => {
        this.setState({ showControls: true });
    };

    /**
     * Handle mouse leave to hide controls.
     * 
     * @returns {void}
     */
    handleMouseLeave = () => {
        this.setState({ 
            showControls: false,
            // Don't hide search if it's active
            showSearch: this.state.showSearch && (this.state.searchQuery !== '' || this.state.searchResults.length > 0)
        });
    };

    /**
     * Resize the video.
     * 
     * @param {string} direction - Direction to resize: 'increase' or 'decrease'.
     * @returns {void}
     */
    resizeVideo = (direction: 'increase' | 'decrease') => {
        const { size } = this.state;
        const { clientWidth, clientHeight } = this.props;
        const scaleFactor = direction === 'increase' ? 1.1 : 0.9;

        this.setState({
            size: {
                width: Math.min(Math.max(size.width * scaleFactor, 200), clientWidth),
                height: Math.min(Math.max(size.height * scaleFactor, 112), clientHeight)
            }
        });
    };

    /**
     * Get styles for PiP mode.
     *
     * @returns {Object} Style object for PiP mode
     */
    getPiPStyles() {
        const { size, position } = this.state;

        return {
            width: `${size.width}px`,
            height: `${size.height}px`,
            position: 'fixed' as const,
            top: `${position.y}px`,
            left: `${position.x}px`,
            zIndex: 1000,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
            borderRadius: '8px',
            overflow: 'hidden'
        };
    }

    /**
     * Toggle search bar visibility.
     * 
     * @returns {void}
     */
    toggleSearch = () => {
        this.setState(state => ({
            showSearch: !state.showSearch,
            searchResults: !state.showSearch ? state.searchResults : []
        }));
    };

    /**
     * Handle search input change.
     * 
     * @param {React.ChangeEvent<HTMLInputElement>} e - The input change event.
     * @returns {void}
     */
    handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ searchQuery: e.target.value });
    };

    /**
     * Provides fallback search results for demo purposes when the API key doesn't work.
     * 
     * @param {string} query - The search query.
     * @returns {Array<{id: string, title: string, thumbnail: string}>} - Mock search results.
     */
    getFallbackSearchResults(query: string) {
        // Common YouTube videos
        const demoVideos = [
            {
                id: 'dQw4w9WgXcQ',
                title: 'Rick Astley - Never Gonna Give You Up',
                thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg'
            },
            {
                id: '9bZkp7q19f0',
                title: 'PSY - GANGNAM STYLE',
                thumbnail: 'https://i.ytimg.com/vi/9bZkp7q19f0/default.jpg'
            },
            {
                id: 'kJQP7kiw5Fk',
                title: 'Luis Fonsi - Despacito ft. Daddy Yankee',
                thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/default.jpg'
            },
            {
                id: 'JGwWNGJdvx8',
                title: 'Ed Sheeran - Shape of You',
                thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/default.jpg'
            },
            {
                id: 'OPf0YbXqDm0',
                title: 'Mark Ronson - Uptown Funk ft. Bruno Mars',
                thumbnail: 'https://i.ytimg.com/vi/OPf0YbXqDm0/default.jpg'
            }
        ];

        // Filter based on query if provided
        if (query) {
            const lowerQuery = query.toLowerCase();
            return demoVideos.filter(video => 
                video.title.toLowerCase().includes(lowerQuery)
            );
        }
        
        return demoVideos;
    }

    /**
     * Handle search form submission.
     * 
     * @param {React.FormEvent} e - The form event.
     * @returns {void}
     */
    handleSearchSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const { searchQuery } = this.state;
        if (!searchQuery.trim()) {
            return;
        }

        this.setState({ isSearching: true });
        
        console.log('Searching for:', searchQuery);
        
        try {
            const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(searchQuery)}&type=video&key=${this.YOUTUBE_API_KEY}`;
            console.log('API URL:', apiUrl);
            
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('YouTube API error:', errorData);
                console.log('Using fallback search results');
                // Use fallback demo results
                const fallbackResults = this.getFallbackSearchResults(searchQuery);
                this.setState({ searchResults: fallbackResults, isSearching: false });
                return;
            }
            
            const data = await response.json();
            console.log('Search results:', data);
            
            if (data.items && data.items.length > 0) {
                interface YouTubeSearchItem {
                    id: {
                        videoId: string;
                    };
                    snippet: {
                        title: string;
                        thumbnails: {
                            default: {
                                url: string;
                            };
                        };
                    };
                }
                
                const formattedResults = data.items.map((item: YouTubeSearchItem) => ({
                    id: item.id.videoId,
                    title: item.snippet.title,
                    thumbnail: item.snippet.thumbnails.default.url
                }));
                
                console.log('Formatted results:', formattedResults);
                this.setState({ searchResults: formattedResults });
            } else {
                console.log('No results found');
                this.setState({ searchResults: [] });
            }
        } catch (error) {
            console.error('Error searching YouTube:', error);
            // Use fallback demo results
            console.log('Using fallback search results after error');
            const fallbackResults = this.getFallbackSearchResults(searchQuery);
            this.setState({ searchResults: fallbackResults });
        } finally {
            this.setState({ isSearching: false });
        }
    };

    /**
     * Play a YouTube video from search results.
     * 
     * @param {string} videoId - The YouTube video ID.
     * @returns {void}
     */
    playVideo = (videoId: string) => {
        const { setVideoLink } = this.props;
        
        console.log('Playing video with ID:', videoId);
        
        try {
            // Set the new video URL
            setVideoLink(videoId);
            
            // Close the search panel
            this.setState({ 
                showSearch: false,
                searchResults: [],
                searchQuery: ''
            });
            
            console.log('Video playback initiated');
        } catch (error) {
            console.error('Error playing video:', error);
        }
    };

    /**
     * Retrieves the manager to be used for playing the shared video.
     *
     * @returns {Component}
     */
    getManager() {
        const { videoUrl } = this.props;

        if (!videoUrl) {
            return null;
        }

        if (videoUrl.match(/http/)) {
            return <VideoManager videoId = { videoUrl } />;
        }

        return <YoutubeVideoManager videoId = { videoUrl } />;
    }

    /**
     * Renders the search bar and results.
     * 
     * @returns {ReactElement|null}
     */
    renderSearch() {
        const { showSearch, searchQuery, searchResults, isSearching } = this.state;
        
        if (!showSearch) {
            return null;
        }
        
        return (
            <div className="shared-video-search">
                <form onSubmit={this.handleSearchSubmit}>
                    <input
                        type="text"
                        placeholder="Search YouTube..."
                        value={searchQuery}
                        onChange={this.handleSearchInputChange}
                    />
                    <button type="submit" disabled={isSearching}>
                        {isSearching ? '...' : '🔍'}
                    </button>
                </form>
                
                {searchResults.length > 0 && (
                    <div className="search-results">
                        {searchResults.map((result: {
                            id: string;
                            title: string;
                            thumbnail: string;
                        }) => (
                            <div 
                                key={result.id} 
                                className="search-result-item"
                                onClick={() => this.playVideo(result.id)}>
                                <img src={result.thumbnail} alt={result.title} />
                                <div className="search-result-title">{result.title}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    /**
     * Renders video controls for PiP mode.
     *
     * @returns {ReactElement|null}
     */
    renderControls() {
        const { showControls } = this.state;
        const { _isOwner } = this.props;

        if (!showControls) {
            return null;
        }

        return (
            <div className="shared-video-controls">
                <button
                    className="shared-video-control-button"
                    onClick={() => this.resizeVideo('decrease')}
                    title="Decrease size">
                    <span>-</span>
                </button>
                <button
                    className="shared-video-control-button"
                    onClick={() => this.resizeVideo('increase')}
                    title="Increase size">
                    <span>+</span>
                </button>
                {_isOwner && (
                    <button
                        className="shared-video-control-button search-button"
                        onClick={this.toggleSearch}
                        title="Search YouTube">
                        <span>🔍</span>
                    </button>
                )}
                <button
                    className="shared-video-control-button"
                    onClick={() => this.setState({ position: { x: 0, y: 0 } })}
                    title="Reset position">
                    <span>⤢</span>
                </button>
                <button
                    className="shared-video-control-button"
                    onClick={() => this.initializePiPMode()}
                    title="Default size and position">
                    <span>↺</span>
                </button>
            </div>
        );
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {React$Element}
     */
    override render() {
        const { isEnabled, isResizing, isVideoShared } = this.props;

        if (!isEnabled || !isVideoShared) {
            return null;
        }

        const style = this.getPiPStyles();

        return (
            <div
                className={`shared-video-container pip-mode ${isResizing || this.state.isDragging ? 'disable-pointer' : ''}`}
                id="sharedVideo"
                style={style}
                ref={this.videoRef}
                onMouseDown={this.handleMouseDown}
                onMouseEnter={this.handleMouseEnter}
                onMouseLeave={this.handleMouseLeave}>
                {this.renderSearch()}
                {this.renderControls()}
                {this.getManager()}
            </div>
        );
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
    const { videoUrl, ownerId } = state['features/shared-video'];
    const { clientHeight, clientWidth } = state['features/base/responsive-ui'];
    const { visible, isResizing } = state['features/filmstrip'];
    const onStage = getLargeVideoParticipant(state)?.fakeParticipant === FakeParticipant.SharedVideo;
    const isVideoShared = isVideoPlaying(state);
    const localParticipantId = state['features/base/participants'].local?.id;

    return {
        clientHeight,
        clientWidth,
        filmstripVisible: visible,
        filmstripWidth: getVerticalViewMaxWidth(state),
        isEnabled: isSharedVideoEnabled(state),
        isResizing,
        isVideoShared,
        onStage,
        videoUrl,
        _isOwner: ownerId === localParticipantId
    };
}

/**
 * Maps dispatching of some action to React component props.
 *
 * @param {Function} dispatch - Redux action dispatcher.
 * @returns {IProps}
 */
const mapDispatchToProps = {
    setVideoLink
};

export default connect(_mapStateToProps, mapDispatchToProps)(SharedVideo);
