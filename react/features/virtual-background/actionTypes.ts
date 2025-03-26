/**
 * The type of redux action dispatched which represents that the background
 * effect is enabled or not.
 *
 * @returns {{
 *     type: BACKGROUND_ENABLED,
 *     backgroundEffectEnabled: boolean
 * }}
 */
export const BACKGROUND_ENABLED = 'BACKGROUND_ENABLED';

/**
 * The type of the action which enables or disables virtual background
 *
 * @returns {{
 *     type: SET_VIRTUAL_BACKGROUND,
 *     virtualSource: string,
 *     blurValue: number,
 *     backgroundType: string,
 *     selectedThumbnail: string
 * }}
 */
export const SET_VIRTUAL_BACKGROUND = 'SET_VIRTUAL_BACKGROUND';

/**
 * The type of redux action dispatched when a shared background event occurs.
 *
 * @returns {{
 *     type: SHARED_BACKGROUND_EVENT,
 *     backgroundId: string,
 *     enabled: boolean
 * }}
 */
export const SHARED_BACKGROUND_EVENT = 'SHARED_BACKGROUND_EVENT';
