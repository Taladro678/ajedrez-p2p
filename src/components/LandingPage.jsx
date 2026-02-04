import React from 'react';
import Auth from './Auth';

const LandingPage = ({ onGuestPlay }) => {
    return (
        <div className="landing-container">
            {/* HERO SECTION */}
            <header className="landing-hero">
                <div className="hero-content">
                    <div className="hero-icon">♞</div>
                    <h1>Ajedrez P2P</h1>
                    <p className="hero-tagline">
                        La forma más rápida de jugar ajedrez online.
                        <br />Sin registros complicados. Sin lag. Puro Ajedrez.
                    </p>

                    <div className="hero-actions">
                        <div className="auth-wrapper">
                            <Auth />
                        </div>
                        <div className="divider">
                            <span>o</span>
                        </div>
                        <button className="btn-guest" onClick={onGuestPlay}>
                            Jugar como Invitado
                        </button>
                    </div>
                </div>
            </header>

            {/* FEATURES GRID */}
            <section className="features-section">
                <div className="feature-card">
                    <div className="feature-icon">⚡</div>
                    <h3>P2P Directo</h3>
                    <p>Conexión directa peer-to-peer. Tus jugadas viajan a la velocidad de la luz sin pasar por servidores centrales.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon">🤖</div>
                    <h3>Stockfish Local</h3>
                    <p>Entrena contra el motor de ajedrez más potente del mundo directamente en tu navegador.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon">⚔️</div>
                    <h3>Lichess.org</h3>
                    <p>¿Tus amigos no están? Conéctate a Lichess para encontrar oponentes de todo el mundo al instante.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon">📹</div>
                    <h3>Video Chat</h3>
                    <p>Mira y habla con tu oponente mientras juegas. La experiencia social definitiva.</p>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="landing-footer">
                <p>&copy; 2025 Ajedrez P2P. Código Abierto.</p>
            </footer>

            <style>{`
                .landing-container {
                    min-height: 100dvh;
                    display: flex;
                    flex-direction: column;
                    background: var(--bg-color);
                    color: var(--on-background);
                    font-family: 'Inter', sans-serif;
                    overflow-x: hidden;
                    overflow-y: auto;
                    width: 100%;
                }

                .landing-hero {
                    flex: 1;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 2rem;
                    background: radial-gradient(circle at top right, #1e293b 0%, #0f172a 100%);
                    text-align: center;
                }

                .hero-content {
                    max-width: 600px;
                    animation: fadeIn 0.8s ease-out;
                }

                .hero-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                    color: var(--primary-color);
                    text-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
                }

                .landing-hero h1 {
                    font-size: 3rem;
                    font-weight: 800;
                    margin-bottom: 1rem;
                    background: linear-gradient(to right, #fff, #94a3b8);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .hero-tagline {
                    font-size: 1.1rem;
                    color: var(--secondary-color);
                    line-height: 1.6;
                    margin-bottom: 2.5rem;
                }

                .hero-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    align-items: center;
                    width: 100%;
                    max-width: 300px;
                    margin: 0 auto;
                }

                /* Reuse Auth component styling but contain it */
                .auth-wrapper {
                    width: 100%;
                }
                
                /* Override Auth styles locally to fit */
                .auth-wrapper > div {
                    height: auto !important;
                    background: transparent !important;
                    gap: 0 !important;
                }
                .auth-wrapper h1, .auth-wrapper p {
                    display: none; /* Hide Auth's internal title */
                }

                .divider {
                    display: flex;
                    align-items: center;
                    width: 100%;
                    color: rgba(255,255,255,0.2);
                    font-size: 0.8rem;
                }
                .divider::before, .divider::after {
                    content: '';
                    flex: 1;
                    height: 1px;
                    background: rgba(255,255,255,0.1);
                }
                .divider span {
                    padding: 0 10px;
                }

                .btn-guest {
                    width: 100%;
                    padding: 0.8rem;
                    background: transparent;
                    border: 1px solid rgba(255,255,255,0.2);
                    color: var(--on-surface);
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-guest:hover {
                    border-color: var(--on-surface);
                    background: rgba(255,255,255,0.05);
                }

                .features-section {
                    padding: 4rem 2rem;
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 2rem;
                    max-width: 1200px;
                    margin: 0 auto;
                    width: 100%;
                }

                .feature-card {
                    background: rgba(255, 255, 255, 0.03);
                    padding: 1.5rem;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    transition: transform 0.2s;
                }
                .feature-card:hover {
                    transform: translateY(-5px);
                    background: rgba(255, 255, 255, 0.05);
                }

                .feature-icon {
                    font-size: 2rem;
                    margin-bottom: 1rem;
                }

                .feature-card h3 {
                    font-size: 1.1rem;
                    margin-bottom: 0.5rem;
                    color: var(--on-surface);
                }

                .feature-card p {
                    font-size: 0.9rem;
                    color: var(--secondary-color);
                    line-height: 1.5;
                }

                .landing-footer {
                    padding: 2rem;
                    text-align: center;
                    color: rgba(255,255,255,0.2);
                    font-size: 0.8rem;
                    border-top: 1px solid rgba(255,255,255,0.05);
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @media (max-width: 768px) {
                    .landing-hero {
                        padding: 1rem;
                    }

                    .hero-icon {
                        font-size: 3rem;
                    }

                    .landing-hero h1 {
                        font-size: 1.5rem;
                    }

                    .hero-tagline {
                        font-size: 0.95rem;
                        margin-bottom: 1.5rem;
                    }

                    .hero-actions {
                        max-width: 100%;
                        padding: 0 0.5rem;
                    }

                    .features-section {
                        padding: 1.5rem 0.75rem;
                        gap: 1.5rem;
                    }

                    .feature-card {
                        padding: 1.25rem;
                    }
                }

                @media (max-width: 480px) {
                    .landing-hero {
                        padding: 0.75rem;
                    }

                    .hero-icon {
                        font-size: 2.5rem;
                    }

                    .landing-hero h1 {
                        font-size: 1.25rem;
                    }

                    .hero-tagline {
                        font-size: 0.85rem;
                    }

                    .features-section {
                        padding: 1rem 0.5rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default LandingPage;
