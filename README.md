# Saks-Abbigliamento — demo concept

Homepage scroll-driven per **Saks Abiti da Cerimonia**, Via T. Scaraviglia 16, Chieti Scalo.
Statica: `index.html` + `style.css` + `main.js`, librerie da CDN (Three.js 0.160, GSAP 3.12.5 + ScrollTrigger, Lenis 1.1.13). Nessuna build.

```bash
python3 -m http.server 5173
```

## Direzione
- **Riferimento:** verostudio.com (serif con corsivi alternati, ritmo editoriale lento); Awwwards: Sartoria Vinci Uomo, LuceSposa, Maison Augé.
- **Coerenza col sito attuale:** logo blackletter "man Saks woman", foto reali dei clienti, marchi (Cautieri, Musani…), "su misura fino alla taglia 75", WhatsApp come CTA.
- **Palette:** bone `#F2EEE8` · inchiostro `#14161D` · notte `#1B2440` (blu Cautieri) · cipria `#E8CDD0` · ottone `#B39062` (solo dettagli).
- **Font:** Cormorant Garamond (display, corsivi) + Hanken Grotesk (testo/UI).
- **3D/WebGL:** un solo telo di seta (shader) dietro la pagina: le pieghe si muovono con lo scroll e diventa "notte" nelle sezioni scure. Fallback CSS senza WebGL, `prefers-reduced-motion` rispettato.

## Sezioni
Hero · Manifesto (parole che si accendono) · Occasioni (scroll orizzontale fissato) · Processo su misura (arco sticky) · Taglia 75 · Maison + marquee marchi · Testimonianza · Atelier/contatti.

## Da verificare col cliente
- Orari (presi da matrimonio.com, potrebbero essere vecchi).
- Uso della citazione di Paola (testimonianza pubblicata sul loro sito).
