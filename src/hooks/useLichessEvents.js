import { useState, useEffect, useRef } from 'react';
import { lichessApi } from '../services/lichess';

export function useLichessEvents() {
    const [challenges, setChallenges] = useState([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState(null);
    const readerRef = useRef(null);
    const abortControllerRef = useRef(null);

    const startStream = async () => {
        if (isStreaming) return;

        setIsStreaming(true);
        setError(null);
        abortControllerRef.current = new AbortController();

        try {
            const stream = await lichessApi.streamEvents();
            const reader = stream.getReader();
            readerRef.current = reader;

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const event = JSON.parse(line);
                            handleEvent(event);
                        } catch (e) {
                            console.error('Error parsing event:', e);
                        }
                    }
                }
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Stream error:', err);
                setError(err.message);
            }
        } finally {
            setIsStreaming(false);
        }
    };

    const handleEvent = (event) => {
        console.log('Lichess event:', event);

        if (event.type === 'challenge') {
            setChallenges(prev => {
                // Avoid duplicates
                if (prev.some(c => c.id === event.challenge.id)) {
                    return prev;
                }
                return [...prev, event.challenge];
            });
        } else if (event.type === 'challengeDeclined' || event.type === 'challengeCanceled') {
            setChallenges(prev => prev.filter(c => c.id !== event.challenge.id));
        }
    };

    const stopStream = () => {
        if (readerRef.current) {
            readerRef.current.cancel();
            readerRef.current = null;
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsStreaming(false);
    };

    const acceptChallenge = async (challengeId) => {
        try {
            await lichessApi.acceptChallenge(challengeId);
            setChallenges(prev => prev.filter(c => c.id !== challengeId));
            return true;
        } catch (err) {
            console.error('Error accepting challenge:', err);
            return false;
        }
    };

    const declineChallenge = async (challengeId) => {
        try {
            await lichessApi.declineChallenge(challengeId);
            setChallenges(prev => prev.filter(c => c.id !== challengeId));
        } catch (err) {
            console.error('Error declining challenge:', err);
        }
    };

    useEffect(() => {
        return () => {
            stopStream();
        };
    }, []);

    return {
        challenges,
        isStreaming,
        error,
        startStream,
        stopStream,
        acceptChallenge,
        declineChallenge
    };
}
