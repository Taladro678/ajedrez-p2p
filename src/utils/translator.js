// Translation service using MyMemory API (Free, no key required for small usage)
const MYMEMORY_API = 'https://api.mymemory.translated.net/get';

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
 * Translate text using MyMemory API
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code (e.g., 'en', 'es', 'fr')
 * @param {string} sourceLang - Source language code (optional, 'auto' for auto-detect)
 * @returns {Promise<string>} Translated text
 */
export const translateText = async (text, targetLang, sourceLang = 'auto') => {
    // MyMemory uses 'source|target' format, e.g., 'en|es'
    // If source is auto, we can just supply target, but MyMemory prefers pairs.
    // However, MyMemory auto-detects if you don't specify perfectly, but strict pairing is better.
    // Let's assume auto detection for source if not provided.

    // Normalize source (MyMemory doesn't use 'auto' keyword explicitly in pair, usually just text)
    // But we can try just sending the pair.

    const langPair = `${sourceLang === 'auto' ? '' : sourceLang}|${targetLang}`;

    // Create cache key
    const cacheKey = `${text}_${langPair}`;

    // Check cache first
    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey);
    }

    try {
        const response = await fetch(`${MYMEMORY_API}?q=${encodeURIComponent(text)}&langpair=${sourceLang === 'auto' ? 'Autodetect' : sourceLang}|${targetLang}`);

        if (!response.ok) {
            throw new Error(`Translation failed: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.responseStatus !== 200) {
            throw new Error(data.responseDetails);
        }

        const translatedText = data.responseData.translatedText;

        // Cache the translation
        translationCache.set(cacheKey, translatedText);

        return translatedText;
    } catch (error) {
        console.error('Translation error:', error);
        return text; // Fallback to original text on error
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
