/* eslint-disable lines-around-comment */
import { Theme } from '@mui/material';
import React, { useCallback, useEffect } from 'react';
import { WithTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { createDeepLinkingPageEvent } from '../../analytics/AnalyticsEvents';
import { sendAnalytics } from '../../analytics/functions';
import { IReduxState } from '../../app/types';
import { IDeeplinkingConfig } from '../../base/config/configType';
import { translate } from '../../base/i18n/functions';
import { withPixelLineHeight } from '../../base/styles/functions.web';
import Button from '../../base/ui/components/web/Button';
import DialInSummary from '../../invite/components/dial-in-summary/web/DialInSummary';
import { openWebApp } from '../actions';
import { _TNS } from '../constants';

const PADDINGS = {
    topBottom: 24,
    leftRight: 40
};

const useStyles = makeStyles()((theme: Theme) => {
    return {
        container: {
            background: '#1E1E1E',
            width: '100vw',
            height: '100dvh',
            overflowX: 'hidden',
            overflowY: 'auto',
            justifyContent: 'center',
            display: 'flex',
            '& a': {
                textDecoration: 'none'
            }
        },
        contentPane: {
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'column',
            padding: `${PADDINGS.topBottom}px ${PADDINGS.leftRight}px`,
            maxWidth: 410,
            color: theme.palette.text01
        },
        launchingMeetingLabel: {
            marginTop: 24,
            textAlign: 'center',
            marginBottom: 32,
            ...withPixelLineHeight(theme.typography.heading5)
        },
        roomNameLabel: {
            ...withPixelLineHeight(theme.typography.bodyLongRegularLarge)
        },
        joinMeetWrapper: {
            marginTop: 24,
            width: '100%'
        },
        separator: {
            marginTop: '32px',
            height: 1,
            width: `calc(100% + ${2 * PADDINGS.leftRight}px)`,
            background: theme.palette.ui03
        }
    };
});

const DeepLinkingMobilePage: React.FC<WithTranslation> = ({ t }) => {
    const deeplinkingCfg = useSelector((state: IReduxState) =>
        state['features/base/config']?.deeplinking || {} as IDeeplinkingConfig);
    const { hideLogo } = deeplinkingCfg;
    const room = useSelector((state: IReduxState) => decodeURIComponent(state['features/base/conference'].room || ''));
    const url = useSelector((state: IReduxState) => state['features/base/connection'] || {});
    const dispatch = useDispatch();
    const { classes: styles } = useStyles();

    const onLaunchWeb = useCallback(() => {
        sendAnalytics(
            createDeepLinkingPageEvent(
                'clicked', 'launchWebButton', { isMobileBrowser: true }));
        dispatch(openWebApp());
    }, [dispatch]);

    useEffect(() => {
        // Auto-launch web version
        onLaunchWeb();
    }, [onLaunchWeb]);

    return (
        <div className = { styles.container }>
            <div className = { styles.contentPane }>
                {!hideLogo && (<img
                    alt = { t('welcomepage.logo.logoDeepLinking') }
                    src = 'images/logo-deep-linking-mobile.png' />
                )}

                <div className = { styles.launchingMeetingLabel }>{ t(`${_TNS}.launchMeetingLabel`) }</div>
                <div className = { styles.roomNameLabel }>{room}</div>
                <Button
                    className = { styles.joinMeetWrapper }
                    fullWidth = { true }
                    label = { t(`${_TNS}.joinInBrowser`) }
                    onClick = { onLaunchWeb } />
                <div className = { styles.separator } />
                <DialInSummary
                    className = 'deep-linking-dial-in'
                    clickableNumbers = { true }
                    hideError = { true }
                    room = { room }
                    url = { url } />
            </div>
        </div>
    );
};

export default translate(DeepLinkingMobilePage);
