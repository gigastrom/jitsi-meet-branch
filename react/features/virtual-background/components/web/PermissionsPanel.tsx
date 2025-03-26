import React from 'react';
import { IParticipant } from '../../../base/participants/types';
import { isParticipantModerator } from '../../../base/participants/functions';
import { 
    grantBackgroundPermission, 
    revokeBackgroundPermission,
    isParticipantAdmin
} from './BackgroundPermissions';

// Icon components
export const PermissionIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" fill="white"/>
    </svg>
);

export const AdminIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="white"/>
    </svg>
);

interface PermissionsPanelProps {
    isAdmin: boolean;
    hasPermission: boolean;
    permissionRequests: Map<string, {name: string, timestamp: number}>;
    participants: Map<string, IParticipant>;
    localParticipant?: IParticipant;
    conference: any;
    onRequestPermission: () => void;
    onPermissionUpdate: (requests: Map<string, {name: string, timestamp: number}>) => void;
}

/**
 * Component for displaying and managing permissions
 */
const PermissionsPanel: React.FC<PermissionsPanelProps> = ({
    isAdmin,
    hasPermission,
    permissionRequests,
    participants,
    localParticipant,
    conference,
    onRequestPermission,
    onPermissionUpdate
}) => {
    // Handle granting permission
    const handleGrantPermission = async (participantId: string) => {
        if (!isAdmin || !conference || !localParticipant) return;
        
        try {
            await grantBackgroundPermission(participantId, conference, localParticipant);
            
            // Update UI state
            const updatedRequests = new Map(permissionRequests);
            updatedRequests.delete(participantId);
            onPermissionUpdate(updatedRequests);
        } catch (error) {
            console.error('Error granting permission:', error);
        }
    };
    
    // Handle revoking permission
    const handleRevokePermission = async (participantId: string) => {
        if (!isAdmin || !conference || !localParticipant) return;
        
        try {
            await revokeBackgroundPermission(participantId, conference, localParticipant);
        } catch (error) {
            console.error('Error revoking permission:', error);
        }
    };
    
    // Handle denying a permission request
    const handleDenyRequest = (id: string) => {
        const updatedRequests = new Map(permissionRequests);
        updatedRequests.delete(id);
        onPermissionUpdate(updatedRequests);
        
        if (window.backgroundSync) {
            window.backgroundSync.permissionRequests.delete(id);
        }
    };
    
    return (
        <div style={{ 
            marginTop: '15px', 
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '8px 0',
            gap: '10px'
        }}>
            {/* Status indicator */}
            <div 
                style={{
                    background: isAdmin 
                        ? 'rgba(33, 150, 243, 0.9)'  // Blue for admin
                        : hasPermission 
                            ? 'rgba(46, 125, 50, 0.9)'  // Green for permission
                            : 'rgba(158, 158, 158, 0.9)', // Grey for no permission
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    width: 'fit-content'
                }}
            >
                {isAdmin ? <AdminIcon /> : <PermissionIcon />}
                <span>
                    {isAdmin 
                        ? 'Moderator - You can manage all backgrounds' 
                        : hasPermission 
                            ? 'Granted - You can change backgrounds for everyone' 
                            : 'Limited - You can only change your own background'}
                </span>
                {isAdmin && (
                    <span style={{
                        background: 'rgba(255,255,255,0.3)',
                        padding: '2px 4px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        marginLeft: '4px'
                    }}>
                        MODERATOR
                    </span>
                )}
                {!isAdmin && hasPermission && (
                    <span style={{
                        background: 'rgba(255,255,255,0.3)',
                        padding: '2px 4px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        marginLeft: '4px'
                    }}>
                        GRANTED
                    </span>
                )}
            </div>
            
            {/* Permission request button (for non-admin, non-privileged users) */}
            {!isAdmin && !hasPermission && (
                <button 
                    onClick={onRequestPermission}
                    style={{
                        background: 'rgba(33, 150, 243, 0.9)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px'
                    }}
                >
                    <PermissionIcon />
                    Request Permission from Moderator
                </button>
            )}
            
            {/* Permission management for admin */}
            {isAdmin && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    gap: '8px'
                }}>
                    <div style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        marginBottom: '4px'
                    }}>
                        Manage Permissions
                    </div>
                    
                    {/* Permission requests */}
                    {permissionRequests.size > 0 && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            marginBottom: '8px'
                        }}>
                            <div style={{
                                fontSize: '11px',
                                fontWeight: 'bold',
                                color: '#999'
                            }}>
                                Pending Requests:
                            </div>
                            {Array.from(permissionRequests.entries()).map(([id, request]) => (
                                <div key={id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '4px 8px',
                                    background: 'rgba(0,0,0,0.1)',
                                    borderRadius: '4px'
                                }}>
                                    <span style={{ fontSize: '12px' }}>
                                        {request.name}
                                    </span>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                            onClick={() => handleGrantPermission(id)}
                                            style={{
                                                background: 'rgba(46, 125, 50, 0.9)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                padding: '2px 6px',
                                                fontSize: '11px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Grant
                                        </button>
                                        <button
                                            onClick={() => handleDenyRequest(id)}
                                            style={{
                                                background: 'rgba(211, 47, 47, 0.9)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                padding: '2px 6px',
                                                fontSize: '11px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Deny
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* List of participants with permissions */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                    }}>
                        <div style={{
                            fontSize: '11px',
                            fontWeight: 'bold',
                            color: '#999'
                        }}>
                            Participants:
                        </div>
                        {Array.from(participants.values()).map((participant: IParticipant) => {
                            const participantId = participant.id;
                            // Skip ourselves
                            if (participantId === localParticipant?.id) return null;
                            
                            const hasParticipantPermission = window.backgroundSync?.permissionList.has(participantId);
                            
                            return (
                                <div key={participantId} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '4px 8px',
                                    background: 'rgba(0,0,0,0.1)',
                                    borderRadius: '4px'
                                }}>
                                    <span style={{ 
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        {hasParticipantPermission && (
                                            <PermissionIcon />
                                        )}
                                        {isParticipantModerator(participant) && (
                                            <span style={{
                                                background: 'rgba(33, 150, 243, 0.5)',
                                                padding: '1px 3px',
                                                borderRadius: '2px',
                                                fontSize: '9px',
                                                marginRight: '4px'
                                            }}>
                                                MOD
                                            </span>
                                        )}
                                        {participant.name || 'Participant'}
                                    </span>
                                    <button
                                        onClick={() => hasParticipantPermission 
                                            ? handleRevokePermission(participantId) 
                                            : handleGrantPermission(participantId)
                                        }
                                        style={{
                                            background: hasParticipantPermission 
                                                ? 'rgba(211, 47, 47, 0.9)' // Red for revoke
                                                : 'rgba(46, 125, 50, 0.9)', // Green for grant
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '2px 6px',
                                            fontSize: '11px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {hasParticipantPermission ? 'Revoke' : 'Grant'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PermissionsPanel; 