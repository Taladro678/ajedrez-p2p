import { useState, useEffect, useRef } from 'react';
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

    const [position, setPosition] = useState({ x: window.innerWidth - 420, y: window.innerHeight - 320 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const dragRef = useRef(null);

    // Initial position adjustment for mobile
    useEffect(() => {
        if (window.innerWidth < 768) {
            setPosition({ x: window.innerWidth - 150, y: window.innerHeight - 200 });
        }
    }, []);

    const handleStart = (clientX, clientY) => {
        setIsDragging(true);
        const rect = dragRef.current.getBoundingClientRect();
        setDragOffset({
            x: clientX - rect.left,
            y: clientY - rect.top
        });
    };

    const handleMove = (clientX, clientY) => {
        if (isDragging) {
            setPosition({
                x: clientX - dragOffset.x,
                y: clientY - dragOffset.y
            });
        }
    };

    const handleEnd = () => {
        setIsDragging(false);
    };

    // Global event listeners for drag
    useEffect(() => {
        const handleWindowMouseMove = (e) => handleMove(e.clientX, e.clientY);
        const handleWindowTouchMove = (e) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
        const handleWindowUp = () => handleEnd();

        if (isDragging) {
            window.addEventListener('mousemove', handleWindowMouseMove);
            window.addEventListener('mouseup', handleWindowUp);
            window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
            window.addEventListener('touchend', handleWindowUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowUp);
            window.removeEventListener('touchmove', handleWindowTouchMove);
            window.removeEventListener('touchend', handleWindowUp);
        };
    }, [isDragging, dragOffset]);

    if (isMinimized) {
        return (
            <div className="video-chat-minimized" onClick={onToggleMinimize}>
                <span>📹 Video Chat</span>
                <button onClick={(e) => { e.stopPropagation(); onClose(); }}>✕</button>
            </div>
        );
    }

    return (
        <div
            ref={dragRef}
            className="video-chat-container"
            style={{
                left: position.x,
                top: position.y,
                bottom: 'auto',
                right: 'auto',
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction: 'none' // Prevent scrolling while dragging
            }}
            onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
            onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
        >
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
                            <p>Esperando video...</p>
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
            <div
                className="video-controls"
                onMouseDown={(e) => e.stopPropagation()} // Prevent drag on controls
                onTouchStart={(e) => e.stopPropagation()}
            >
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
