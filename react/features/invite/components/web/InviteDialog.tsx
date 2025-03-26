import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { makeStyles } from '@material-ui/core/styles';
import { Tabs } from '@material-ui/core';
import { Icon } from '@jitsi/react-sdk';
import { IconClose } from '@jitsi/react-sdk';

const useStyles = makeStyles()(theme => {
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

const InviteDialog = ({ onClose, conferenceID, conferenceURL, copyToClipboard, handleSendInvites }) => {
    const { t } = useTranslation();
    const classes = useStyles();
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
                    <Icon src={IconClose} size={24} />
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
                            accessibilityLabel={t('invite.tabs.accessibility')}
                            onChange={tab => setActiveTab(tab as InviteTab)}
                            selected={activeTab}
                            tabs={[
                                {
                                    id: InviteTab.EMAIL,
                                    label: t('invite.tabs.email'),
                                    accessibilityLabel: t('invite.tabs.email'),
                                    controlsId: 'invite-email-tab'
                                },
                                {
                                    id: InviteTab.PHONE,
                                    label: t('invite.tabs.phone'),
                                    accessibilityLabel: t('invite.tabs.phone'),
                                    controlsId: 'invite-phone-tab'
                                }
                            ]}
                        />
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