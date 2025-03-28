import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { makeStyles } from 'tss-react/mui';
import { Tabs, Tab } from '@mui/material';
import Icon from '../../../base/icons/components/Icon';
import { IconCloseLarge } from '../../../base/icons/svg';

enum InviteTab {
    EMAIL = 'email',
    PHONE = 'phone'
}

interface IProps {
    /**
     * Callback to close the dialog
     */
    onClose: () => void;
    
    /**
     * ID of the conference
     */
    conferenceID: string;
    
    /**
     * URL of the conference
     */
    conferenceURL: string;
    
    /**
     * Callback to copy the conference URL to clipboard
     */
    copyToClipboard: () => void;
    
    /**
     * Callback to handle sending invites
     */
    handleSendInvites: () => void;
}

const useStyles = makeStyles()((theme: any) => {
    return {
        container: {
            backgroundColor: theme.palette.ui01,
            borderRadius: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            maxHeight: '600px',
            maxWidth: '400px',
            width: '100%',
            overflow: 'hidden'
        },
        header: {
            alignItems: 'center',
            borderBottom: `1px solid ${theme.palette.divider01}`,
            display: 'flex',
            justifyContent: 'space-between',
            padding: '20px 28px',
            backgroundColor: theme.palette.ui02,
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px'
        },
        title: {
            color: theme.palette.text01,
            fontSize: '22px',
            fontWeight: 600,
            lineHeight: '30px',
            margin: 0
        },
        closeButton: {
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            padding: '10px',
            transition: 'all 0.2s ease',
            '&:hover': {
                backgroundColor: theme.palette.ui03,
                transform: 'scale(1.05)'
            }
        },
        content: {
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            overflow: 'hidden',
            padding: '28px'
        },
        mainContent: {
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            overflow: 'hidden'
        },
        infoContainer: {
            backgroundColor: theme.palette.ui02,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '20px'
        },
        infoRow: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            '&:last-child': {
                marginBottom: 0
            }
        },
        infoLabel: {
            color: theme.palette.text02,
            fontSize: '15px',
            fontWeight: 500
        },
        infoValue: {
            color: theme.palette.text01,
            fontSize: '15px',
            fontWeight: 600
        },
        copyButton: {
            backgroundColor: theme.palette.action01,
            border: 'none',
            borderRadius: '12px',
            color: theme.palette.text01,
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            padding: '10px 20px',
            transition: 'all 0.2s ease',
            '&:hover': {
                backgroundColor: theme.palette.action01Hover,
                transform: 'translateY(-1px)'
            }
        },
        tabsContainer: {
            marginBottom: '20px'
        },
        tabContent: {
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            overflow: 'hidden'
        },
        footer: {
            alignItems: 'center',
            borderTop: `1px solid ${theme.palette.divider01}`,
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '20px 28px',
            backgroundColor: theme.palette.ui02,
            borderBottomLeftRadius: '24px',
            borderBottomRightRadius: '24px'
        },
        cancelButton: {
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '12px',
            color: theme.palette.text01,
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            marginRight: '16px',
            padding: '10px 20px',
            transition: 'all 0.2s ease',
            '&:hover': {
                backgroundColor: theme.palette.ui03,
                transform: 'translateY(-1px)'
            }
        }
    };
});

const InviteDialog = ({ onClose, conferenceID, conferenceURL, copyToClipboard, handleSendInvites }: IProps) => {
    const { t } = useTranslation();
    const { classes } = useStyles();
    const [activeTab, setActiveTab] = useState(InviteTab.EMAIL);

    const renderTabContent = () => {
        // Implementation of renderTabContent
    };

    return (
        <div className={classes.container}>
            <div className={classes.header}>
                <h2 className={classes.title}>{t('invite.title')}</h2>
                <button
                    className={classes.closeButton}
                    onClick={onClose}
                    aria-label={t('dialog.close')}>
                    <Icon src={IconCloseLarge} size={24} />
                </button>
            </div>
            <div className={classes.content}>
                <div className={classes.mainContent}>
                    <div className={classes.infoContainer}>
                        <div className={classes.infoRow}>
                            <span className={classes.infoLabel}>{t('invite.meetingId')}</span>
                            <span className={classes.infoValue}>{conferenceID}</span>
                        </div>
                        <div className={classes.infoRow}>
                            <span className={classes.infoLabel}>{t('invite.meetingURL')}</span>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span className={classes.infoValue}>{conferenceURL}</span>
                                <button
                                    className={classes.copyButton}
                                    onClick={copyToClipboard}
                                    style={{ marginLeft: '12px' }}>
                                    {t('dialog.copy')}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className={classes.tabsContainer}>
                        <Tabs
                            value={activeTab}
                            onChange={(_, tab) => setActiveTab(tab as InviteTab)}
                            aria-label={t('invite.tabs.accessibility')}>
                            <Tab 
                                value={InviteTab.EMAIL}
                                label={t('invite.tabs.email')}
                                aria-label={t('invite.tabs.email')}
                                id="invite-email-tab" />
                            <Tab
                                value={InviteTab.PHONE}
                                label={t('invite.tabs.phone')}
                                aria-label={t('invite.tabs.phone')}
                                id="invite-phone-tab" />
                        </Tabs>
                    </div>
                    <div className={classes.tabContent}>
                        {renderTabContent()}
                    </div>
                </div>
            </div>
            <div className={classes.footer}>
                <button
                    className={classes.cancelButton}
                    onClick={onClose}>
                    {t('dialog.cancel')}
                </button>
                <button
                    className={classes.copyButton}
                    onClick={handleSendInvites}>
                    {t('invite.send')}
                </button>
            </div>
        </div>
    );
};

export default InviteDialog; 