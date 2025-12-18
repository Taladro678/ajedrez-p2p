// Voice Player Component
import { useRef, useState, useEffect } from 'react';

export default function VoicePlayer({ audioUrl, duration }) {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const handleEnded = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem',
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '8px',
            maxWidth: '250px'
        }}>
            <audio ref={audioRef} src={audioUrl} preload="metadata" />

            <button
                onClick={togglePlay}
                style={{
                    background: 'var(--primary-color)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {isPlaying ? '⏸️' : '▶️'}
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    height: '4px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    marginBottom: '0.25rem'
                }}>
                    <div style={{
                        height: '100%',
                        background: 'var(--primary-color)',
                        width: `${(currentTime / (duration || 1)) * 100}%`,
                        transition: 'width 0.1s'
                    }} />
                </div>
                <div style={{
                    fontSize: '0.7rem',
                    color: '#94a3b8',
                    display: 'flex',
                    justifyContent: 'space-between'
                }}>
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration || 0)}</span>
                </div>
            </div>

            <span style={{ fontSize: '1.2rem' }}>🎤</span>
        </div>
    );
}
