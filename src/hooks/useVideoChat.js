import { useState, useEffect, useRef, useCallback } from 'react';

export function useVideoChat(conn, isConnected) {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [videoError, setVideoError] = useState(null);
    const [isInitializing, setIsInitializing] = useState(false);
    const callRef = useRef(null);

    // Initialize media (camera and microphone)
    const initializeMedia = useCallback(async () => {
        if (isInitializing || localStream) return;

        setIsInitializing(true);
        setVideoError(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            setLocalStream(stream);
            setIsInitializing(false);
            return stream;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            setVideoError(error.name === 'NotAllowedError'
                ? 'Permisos de cámara/micrófono denegados'
                : 'No se pudo acceder a la cámara/micrófono');
            setIsInitializing(false);
            return null;
        }
    }, [isInitializing, localStream]);

    // Toggle video track
    const toggleVideo = useCallback(() => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoEnabled(videoTrack.enabled);
            }
        }
    }, [localStream]);

    // Toggle audio track
    const toggleAudio = useCallback(() => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioEnabled(audioTrack.enabled);
            }
        }
    }, [localStream]);

    // Cleanup streams
    const cleanup = useCallback(() => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        if (remoteStream) {
            remoteStream.getTracks().forEach(track => track.stop());
            setRemoteStream(null);
        }
        if (callRef.current) {
            callRef.current.close();
            callRef.current = null;
        }
    }, [localStream, remoteStream]);

    // Initialize media when connected
    useEffect(() => {
        if (isConnected && !localStream && conn) {
            initializeMedia();
        }
    }, [isConnected, localStream, conn, initializeMedia]);

    // Handle incoming and outgoing calls via PeerJS
    useEffect(() => {
        if (!conn || !conn.peer || !localStream) return;

        // Make a call with local stream
        if (conn.peer.call) {
            const call = conn.peer.call(conn.peer, localStream);
            callRef.current = call;

            call.on('stream', (stream) => {
                console.log('Received remote stream');
                setRemoteStream(stream);
            });

            call.on('close', () => {
                console.log('Call closed');
                setRemoteStream(null);
            });

            call.on('error', (err) => {
                console.error('Call error:', err);
            });
        }

        // Answer incoming calls
        if (conn.peer.on) {
            conn.peer.on('call', (call) => {
                console.log('Answering incoming call');
                call.answer(localStream);
                callRef.current = call;

                call.on('stream', (stream) => {
                    console.log('Received remote stream from incoming call');
                    setRemoteStream(stream);
                });

                call.on('close', () => {
                    console.log('Incoming call closed');
                    setRemoteStream(null);
                });
            });
        }
    }, [conn, localStream]);

    // Cleanup on unmount or disconnect
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    return {
        localStream,
        remoteStream,
        isVideoEnabled,
        isAudioEnabled,
        videoError,
        isInitializing,
        toggleVideo,
        toggleAudio,
        initializeMedia,
        cleanup
    };
}
