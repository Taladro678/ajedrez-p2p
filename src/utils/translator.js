// Translation service using LibreTranslate API
const LIBRETRANSLATE_API = 'https://libretranslate.com/translate';

// Cache for translations to avoid repeated API calls
const translationCache = new Map();

/**
 * Detect user's preferred language from browser
 */
export const getUserLanguage = () => {
    const browserLang = navigator.language || navigator.userLanguage;
    // Extract language code (e.g., "en-US" -> "en")
    return browserLang.split('-')[0].toLowerCase();
};

/**
 * Translate text using LibreTranslate API
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code (e.g., 'en', 'es', 'fr')
 * @param {string} sourceLang - Source language code (optional, 'auto' for auto-detect)
 * @returns {Promise<string>} Translated text
 */
export const translateText = async (text, targetLang, sourceLang = 'auto') => {
    // Create cache key
    const cacheKey = `${text}_${sourceLang}_${targetLang}`;

    // Check cache first
    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey);
    }

    try {
        const response = await fetch(LIBRETRANSLATE_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: text,
                source: sourceLang,
                target: targetLang,
                format: 'text'
            })
        });

        if (!response.ok) {
            throw new Error(`Translation failed: ${response.statusText}`);
        }

        const data = await response.json();
        const translatedText = data.translatedText;

        // Cache the translation
        translationCache.set(cacheKey, translatedText);

        return translatedText;
    } catch (error) {
        console.error('Translation error:', error);
        throw error;
    }
};

/**
 * Get list of supported languages
 */
export const getSupportedLanguages = () => {
    return [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Español' },
        { code: 'fr', name: 'Français' },
        { code: 'de', name: 'Deutsch' },
        { code: 'it', name: 'Italiano' },
        { code: 'pt', name: 'Português' },
        { code: 'ru', name: 'Русский' },
        { code: 'zh', name: '中文' },
        { code: 'ja', name: '日本語' },
        { code: 'ko', name: '한국어' },
        { code: 'ar', name: 'العربية' },
        { code: 'hi', name: 'हिन्दी' }
    ];
};
