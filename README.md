# Saks-Abbigliamento — demo concept

Homepage scroll-driven per **Saks Abiti da Cerimonia**, Via T. Scaraviglia 16, Chieti Scalo.
Statica: `index.html` + `style.css` + `main.js`, librerie da CDN (Three.js 0.160, GSAP 3.12.5 + ScrollTrigger, Lenis 1.1.13). Nessuna build.

```bash
python3 -m http.server 5173
```

## Direzione
- **Riferimento:** verostudio.com (serif con corsivi alternati, ritmo editoriale lento); Awwwards: Sartoria Vinci Uomo, LuceSposa, Maison Augé.
- **Coerenza col sito attuale:** logo blackletter "man Saks woman", foto reali dei clienti, marchi (Cautieri, Musani…), "su misura fino alla taglia 75", WhatsApp come CTA.
- **Palette:** latte `#F3EEE6` · espresso `#231A15` · vino `#4A1822` · champagne `#D8C2A0` · moka `#7A5E4C`.
- **Font:** Cormorant Garamond (display, corsivi) + Hanken Grotesk (testo/UI).
- **3D/WebGL:** un solo telo di seta (shader) dietro la pagina: le pieghe si muovono con lo scroll e diventa "vino" nelle sezioni scure. Fallback CSS senza WebGL, `prefers-reduced-motion` rispettato.

## Sezioni (scroll-driven, stile Vero)
1. Hero: foto a tutto schermo che si richiude in un arco da atelier, il titolo si stringe negli angoli.
2. Essenza: la piccola foto sotto il titolo cresce fino a coprire lo schermo.
3. Sequenza fissata: "Dalla scelta, alle misure, al tuo giorno" — le foto scorrono a tendina mentre si accendono le parole.
4. Occasioni: scroll orizzontale fissato.
5. Collage: foto in parallasse a profondità diverse + testo che si accende parola per parola.
6. Taglia 75 · Maison + marquee che accelera con lo scroll · Testimonianza · Atelier/contatti.

## Da verificare col cliente
- Orari (presi da matrimonio.com, potrebbero essere vecchi).
- Uso della citazione di Paola (testimonianza pubblicata sul loro sito).

## Pagina Servizi (`servizi.html`)
Pagina semplice, senza animazioni pesanti: indice fisso, servizi per persona (sposo, donna, bambino, feste, su misura, taglia 75) ognuno con link WhatsApp precompilato, "come funziona" in 3 passi, testimonianza, FAQ.
Riferimenti: Janine Atelier (servizi per persona + WhatsApp), Carlo Pignatelli boutique Milano (percorso in 3 passi), Alan David NYC (processo, FAQ, CTA ripetute).
Da verificare col cliente: servizio bambino (età/occasioni), tempi di consegna, eventuale noleggio o accessori.
