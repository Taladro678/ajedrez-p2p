import { useEffect, useRef } from 'react';
import './VideoChat.css';

export default function VideoChat({
    localStream,
    remoteStream,
    onToggleVideo,
    onToggleAudio,
    onClose,
    isVideoEnabled,
    isAudioEnabled,
    isMinimized = false,
    onToggleMinimize
}) {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    // Set local video stream
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Set remote video stream
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    if (isMinimized) {
        return (
            <div className="video-chat-minimized" onClick={onToggleMinimize}>
                <span>📹 Video Chat</span>
                <button onClick={(e) => { e.stopPropagation(); onClose(); }}>✕</button>
            </div>
        );
    }

    return (
        <div className="video-chat-container">
            {/* Remote video (main) */}
            <div className="video-remote">
                {remoteStream ? (
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="video-element"
                    />
                ) : (
                    <div className="video-placeholder">
                        <div className="placeholder-content">
                            <span className="placeholder-icon">👤</span>
                            <p>Esperando video del oponente...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Local video (picture-in-picture) */}
            <div className="video-local">
                {localStream ? (
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="video-element"
                    />
                ) : (
                    <div className="video-placeholder-small">
                        <span>📷</span>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="video-controls">
                <button
                    className={`control-btn ${!isVideoEnabled ? 'disabled' : ''}`}
                    onClick={onToggleVideo}
                    title={isVideoEnabled ? 'Desactivar cámara' : 'Activar cámara'}
                >
                    {isVideoEnabled ? '📹' : '📹❌'}
                </button>

                <button
                    className={`control-btn ${!isAudioEnabled ? 'disabled' : ''}`}
                    onClick={onToggleAudio}
                    title={isAudioEnabled ? 'Silenciar micrófono' : 'Activar micrófono'}
                >
                    {isAudioEnabled ? '🎤' : '🎤❌'}
                </button>

                {onToggleMinimize && (
                    <button
                        className="control-btn"
                        onClick={onToggleMinimize}
                        title="Minimizar"
                    >
                        ⬇️
                    </button>
                )}

                <button
                    className="control-btn close-btn"
                    onClick={onClose}
                    title="Cerrar video chat"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
