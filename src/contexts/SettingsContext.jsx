import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../utils/settingsManager';

const SettingsContext = createContext();

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within SettingsProvider');
    }
    return context;
};

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState(getSettings());

    const updateSettings = (newSettings) => {
        const updated = { ...settings, ...newSettings };
        setSettings(updated);
        saveSettings(updated);
    };

    const updateSoundSettings = (soundSettings) => {
        updateSettings({ sounds: { ...settings.sounds, ...soundSettings } });
    };

    const updateGameplaySettings = (gameplaySettings) => {
        updateSettings({ gameplay: { ...settings.gameplay, ...gameplaySettings } });
    };

    const updateBoardSettings = (boardSettings) => {
        updateSettings({ board: { ...settings.board, ...boardSettings } });
    };

    const updateAnalysisSettings = (analysisSettings) => {
        updateSettings({ analysis: { ...settings.analysis, ...analysisSettings } });
    };

    const updateAntiCheatSettings = (antiCheatSettings) => {
        updateSettings({ antiCheat: { ...settings.antiCheat, ...antiCheatSettings } });
    };

    const value = {
        settings,
        updateSettings,
        updateSoundSettings,
        updateGameplaySettings,
        updateBoardSettings,
        updateAnalysisSettings,
        updateAntiCheatSettings
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};
