import React from 'react';
import { connect } from 'react-redux';

import { IReduxState } from '../../../app/types';
import { translate } from '../../../base/i18n/functions';
import { IconFaceSmile } from '../../../base/icons/svg';
import AbstractButton, { IProps as AbstractButtonProps } from '../../../base/toolbox/components/AbstractButton';
import { setOverflowMenuVisible } from '../../../toolbox/actions.web';
import { openDialog } from '../../../base/dialog/actions';

import { StickerPanel } from './';

/**
 * Component that renders a toolbar button for stickers.
 */
class StickerButton extends AbstractButton<AbstractButtonProps> {
    override accessibilityLabel = 'toolbar.accessibilityLabel.stickers';
    override icon = IconFaceSmile;
    override label = 'toolbar.stickers';
    override tooltip = 'toolbar.stickers';

    /**
     * Handles clicking / pressing the button.
     *
     * @private
     * @returns {void}
     */
    override _handleClick() {
        const { dispatch } = this.props;

        // Close overflow menu if open
        dispatch(setOverflowMenuVisible(false));
        
        // Open sticker panel dialog
        dispatch(openDialog(StickerPanel));
    }
}

/**
 * Maps part of the Redux state to the props of this component.
 *
 * @param {Object} state - The Redux state.
 * @private
 * @returns {IProps}
 */
function _mapStateToProps(state: IReduxState) {
    return {
        // Always visible
        visible: true
    };
}

export default translate(connect(_mapStateToProps)(StickerButton)); 