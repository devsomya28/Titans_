import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

PDF_PATH = os.path.join(os.path.dirname(__file__), "VideoGuard_AI_Architecture_and_Flow.pdf")

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Running header (pages 2+)
        if self._pageNumber > 1:
            self.drawString(36, 810, "VideoGuard AI — Technical Architecture & AIML Flow")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(36, 804, 559, 804)

        # Running footer
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(36, 32, 559, 32)
        self.drawString(36, 22, "CONFIDENTIAL & PROPRIETARY — VideoGuard AI Architecture Whitepaper")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(559, 22, page_str)
        self.restoreState()


def build_pdf():
    doc = SimpleDocTemplate(
        PDF_PATH,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=46,
        bottomMargin=46,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.white,
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#c7d2fe"),
    )
    tag_style = ParagraphStyle(
        'DocTag',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#a5b4fc"),
    )
    h1_style = ParagraphStyle(
        'SecHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=14,
        spaceAfter=6,
    )
    h2_style = ParagraphStyle(
        'SubSecHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=13,
        textColor=colors.HexColor("#334155"),
        spaceBefore=8,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12.5,
        textColor=colors.HexColor("#334155"),
        spaceAfter=4,
    )
    body_bold = ParagraphStyle(
        'BodyDarkBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12.5,
        textColor=colors.HexColor("#0f172a"),
    )
    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1e1b4b"),
    )
    code_style = ParagraphStyle(
        'CodeSnippet',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#38bdf8"),
    )
    formula_style = ParagraphStyle(
        'FormulaText',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#581c87"),
        alignment=1,
    )
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#1e293b"),
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#0f172a"),
    )
    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
    )

    story = []

    # ── HEADER BANNER ──────────────────────────────────────────────────────────
    banner_data = [
        [
            Paragraph("TECHNICAL SPECIFICATION & WHITEPAPER", tag_style),
        ],
        [
            Paragraph("VideoGuard AI — Autonomous Anti-Piracy Swarm", title_style),
        ],
        [
            Paragraph("End-to-End System Architecture, AI/ML Deep Dive & Multi-Agent Data Pipeline", subtitle_style),
        ]
    ]
    banner_table = Table(banner_data, colWidths=[523])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#0f172a")),
        ('PADDING', (0,0), (-1,-1), 14),
        ('BOTTOMPADDING', (0,0), (-1,0), 3),
        ('TOPPADDING', (0,1), (-1,1), 0),
        ('BOTTOMPADDING', (0,1), (-1,1), 4),
        ('TOPPADDING', (0,2), (-1,2), 0),
        ('LINELEFT', (0,0), (0,-1), 4.5, colors.HexColor("#6366f1")),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 10))

    # ── SECTION 1: ELEVATOR PITCH ──────────────────────────────────────────────
    story.append(Paragraph("1. Executive Summary & The 30-Second Pitch", h1_style))
    pitch_text = (
        "<b>The 30-Second Pitch:</b> <i>\"VideoGuard AI is an autonomous, multi-agent anti-piracy swarm. "
        "When a copyright holder registers a master broadcast or video, our ML engine creates multi-modal neural "
        "fingerprints across vision and audio. Six autonomous agents crawl 13+ social platforms, detect unauthorized streams "
        "or clips even if they are cropped, mirrored, or pitch-shifted, legally classify Fair Use vs. Piracy under "
        "17 U.S.C. § 107, and either auto-dispatch cryptographic DMCA notices or broker on-chain revenue-sharing contracts.\"</i>"
    )
    callout_table = Table([[Paragraph(pitch_text, callout_style)]], colWidths=[523])
    callout_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('LINELEFT', (0,0), (0,-1), 3.5, colors.HexColor("#4f46e5")),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(callout_table)
    story.append(Spacer(1, 10))

    # ── SECTION 2: 3-TIER ARCHITECTURE ─────────────────────────────────────────
    story.append(Paragraph("2. High-Level 3-Tier System Architecture", h1_style))
    arch_snippet = (
        "<b>TIER 1: REACT 19 + VITE FRONTEND (Port 5173)</b>\n"
        "  • Real-Time Threat Intelligence Dashboard (COBE 3D WebGL Globe)\n"
        "  • Interactive Swarm Propagation & Sankey Graphs (ECharts & Recharts)\n"
        "  • Live Socket.IO Event Stream (Zero polling, real-time threat alert push)\n"
        "  • Evidence Vault, Link Resolver & Manual Inspection Sandbox\n"
        "       │\n"
        "       ▼ (REST API calls & WebSocket bidirectional streaming)\n"
        "<b>TIER 2: NODE.JS ORCHESTRATOR & GATEWAY (Port 8000)</b>\n"
        "  • Express.js API Gateway, CORS Management, Joi Request Validation\n"
        "  • Socket.IO Real-Time Broadcast Server (pub/sub threat distribution)\n"
        "  • In-Memory & MongoDB Persistence (Incidents, Contracts, Audit Logs)\n"
        "  • Fast-fail Reverse Proxy to Python ML engine\n"
        "       │\n"
        "       ▼ (Synchronous JSON RPC over HTTP)\n"
        "<b>TIER 3: PYTHON FASTAPI ML SWARM ENGINE (Port 8001)</b>\n"
        "  • Vision: OpenAI CLIP ViT-B/32 ONNX Runtime (512-dim normalized vectors)\n"
        "  • Audio: AcoustID Chromaprint + pyacoustid frequency constellation\n"
        "  • Vector Database: Dual FAISS Indices (Vision IndexFlatIP + Audio Index)\n"
        "  • Perceptual Hashing: pHash, dHash, aHash with 64-bit Hamming distance\n"
        "  • Compression Forensics: DCT noise & JPEG/MPEG Q-table estimation\n"
        "  • Swarm Agents: Archivist ➔ Spider ➔ Sentinel ➔ Adjudicator ➔ Enforcer ➔ Broker"
    )
    arch_table = Table([[Paragraph(arch_snippet.replace('\n', '<br/>'), code_style)]], colWidths=[523])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#0f172a")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#334155")),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(arch_table)
    story.append(Spacer(1, 10))

    # ── SECTION 3: 6 SWARM AGENTS ──────────────────────────────────────────────
    story.append(Paragraph("3. The 6 Autonomous Swarm Agents", h1_style))
    agent_data = [
        [Paragraph("Agent", table_header), Paragraph("Role", table_header), Paragraph("Underlying Technologies", table_header), Paragraph("Core Output", table_header)],
        [Paragraph("<b>1. Archivist</b>", table_cell), Paragraph("Master Ingestion & Vectorization", table_cell), Paragraph("CLIP ONNX (ViT-B/32), FAISS FlatIP, AcoustID Chromaprint", table_cell), Paragraph("Vector Vault Index", table_cell_bold)],
        [Paragraph("<b>2. Spider</b>", table_cell), Paragraph("Multi-Platform OSINT Crawler", table_cell), Paragraph("ThreadPoolExecutor (8 workers), X API v2, yt-dlp, REST APIs", table_cell), Paragraph("Suspect Lead Nodes", table_cell_bold)],
        [Paragraph("<b>3. Sentinel</b>", table_cell), Paragraph("Multi-Modal Forensic Verification", table_cell), Paragraph("CLIP Cosine Sim, Audio FAISS, pHash, DCT Q-Table Forensics", table_cell), Paragraph("Confidence Score (0-100%)", table_cell_bold)],
        [Paragraph("<b>4. Adjudicator</b>", table_cell), Paragraph("Fair Use Legal Triage", table_cell), Paragraph("17 U.S.C. § 107 Statutory 4-Factor Heuristic & LLM Prompts", table_cell), Paragraph("Legal Classification", table_cell_bold)],
        [Paragraph("<b>5. Enforcer</b>", table_cell), Paragraph("Automated DMCA Notices", table_cell), Paragraph("17 U.S.C. § 512(c) Engine + Cryptographic Hash Proof", table_cell), Paragraph("Formal DMCA Notice", table_cell_bold)],
        [Paragraph("<b>6. Broker</b>", table_cell), Paragraph("Web3 Micro-Licensing Deal", table_cell), Paragraph("Platform CPM Yield Modeling, Polygon Smart Contract Specs", table_cell), Paragraph("Smart Contract Agreement", table_cell_bold)],
    ]
    agent_table = Table(agent_data, colWidths=[80, 130, 193, 120])
    agent_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    story.append(agent_table)

    story.append(PageBreak())

    # ── SECTION 4: PIPELINE WALKTHROUGH ────────────────────────────────────────
    story.append(Paragraph("4. Step-by-Step Data & Machine Learning Pipeline", h1_style))

    story.append(Paragraph("Step 1: Master Video Ingestion & Fingerprinting (Archivist)", h2_style))
    p1 = (
        "When an official sports broadcast or video is registered:<br/>"
        "• <b>Video Keyframing:</b> FFmpeg samples keyframes every 2.0s.<br/>"
        "• <b>Neural Embeddings:</b> Each frame passes through <code>CLIP ONNX (ViT-B/32)</code> yielding a 512-dimensional vector.<br/>"
        "• <b>Audio Fingerprinting:</b> The audio stream is isolated and converted into an acoustic constellation hash via Chromaprint.<br/>"
        "• <b>FAISS Commit:</b> Vectors are committed into in-memory FAISS indices (<code>IndexFlatIP</code>) enabling sub-millisecond similarity search."
    )
    story.append(Paragraph(p1, body_style))
    story.append(Spacer(1, 4))

    story.append(Paragraph("Step 2: Autonomous Threat Discovery (Spider)", h2_style))
    p2 = (
        "The Spider derives search keywords from the ingested video's title and launches parallel crawlers across <b>13 platforms</b>:<br/>"
        "• <b>Live Direct APIs:</b> YouTube (ytsearch5), X/Twitter (official API v2 Recent Search), Vimeo API, Dailymotion REST, Archive.org REST.<br/>"
        "• <b>Protected Networks:</b> Instagram Reels & Facebook Watch (via session cookies), Twitch, TikTok, Telegram Piracy Channels, ThePirateBay.<br/>"
        "• <b>Output:</b> Discovered suspect candidate nodes with real URLs, preview thumbnails, view counts, and uploader geolocation."
    )
    story.append(Paragraph(p2, body_style))
    story.append(Spacer(1, 4))

    story.append(Paragraph("Step 3: Forensic Inspection & Multi-Modal Confidence Fusion (Sentinel)", h2_style))
    p3 = (
        "Sentinel downloads the first 15–20s snippet of suspect videos and calculates a unified multi-modal confidence score:"
    )
    story.append(Paragraph(p3, body_style))

    # Formula Box
    formula_text = "Confidence = (0.40 × S_clip) + (0.25 × S_audio) + (0.20 × S_phash) + (0.10 × S_temporal) + (0.05 × S_forensics)"
    formula_table = Table([[Paragraph(formula_text, formula_style)]], colWidths=[523])
    formula_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#faf5ff")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#d8b4fe")),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(formula_table)
    story.append(Spacer(1, 6))

    math_data = [
        [Paragraph("Component", table_header), Paragraph("Weight", table_header), Paragraph("Mathematical Technique & Invariance", table_header)],
        [Paragraph("<b>CLIP Vision</b>", table_cell), Paragraph("40%", table_cell_bold), Paragraph("Inner Product / Cosine Similarity across 512-dim ViT-B/32 embeddings. Highly invariant to cropping, mirroring, color grading, and aspect ratio changes.", table_cell)],
        [Paragraph("<b>Audio Chromaprint</b>", table_cell), Paragraph("25%", table_cell_bold), Paragraph("AcoustID frequency constellation hash matching. Matches crowd noise, commentary, and music even if video is mirrored or visually obscured.", table_cell)],
        [Paragraph("<b>Perceptual Hash (pHash)</b>", table_cell), Paragraph("20%", table_cell_bold), Paragraph("Discrete Cosine Transform (DCT) 64-bit frame hashes compared via Hamming distance. Rapid filter for bit-level image duplicates.", table_cell)],
        [Paragraph("<b>Temporal Sequence</b>", table_cell), Paragraph("10%", table_cell_bold), Paragraph("Chronological sequence alignment verifying matching keyframes follow the correct temporal sequence of the master broadcast.", table_cell)],
        [Paragraph("<b>Compression Forensics</b>", table_cell), Paragraph("5%", table_cell_bold), Paragraph("Analyzes JPEG/MPEG quantization tables (e.g., Twitter Q~75, Instagram Q~78) and spatial DCT noise to detect platform re-encoding signatures.", table_cell)],
    ]
    math_table = Table(math_data, colWidths=[110, 50, 363])
    math_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    story.append(math_table)
    story.append(Spacer(1, 6))

    story.append(Paragraph("Step 4: Fair Use Legal Classification (Adjudicator)", h2_style))
    p4 = (
        "The Adjudicator evaluates the 4 statutory factors under <b>17 U.S.C. § 107</b>:<br/>"
        "• <b>Confidence ≥ 75%:</b> Blatant uncredited re-broadcast → <b>COMMERCIAL PIRACY</b> (Triggers Enforcer Takedown).<br/>"
        "• <b>Confidence 40% – 74%:</b> Partial clip with commentary, critique, or transformative audio → <b>FAIR USE / FAN CONTENT</b> (Triggers Broker Monetization).<br/>"
        "• <b>Confidence < 40%:</b> Coincidental similarity or independent footage → <b>CLEARED</b>."
    )
    story.append(Paragraph(p4, body_style))

    story.append(PageBreak())

    # ── SECTION 5: ENFORCEMENT & MONETIZATION ──────────────────────────────────
    story.append(Paragraph("5. Autonomous Enforcement & Monetization Actions", h1_style))
    story.append(Paragraph(
        "Depending on the Adjudicator's verdict, the system routes the incident to one of two autonomous pathways:",
        body_style
    ))

    dual_actions = [
        [
            Paragraph("<b>ROUTE A: ENFORCEMENT (Enforcer Agent)</b>", ParagraphStyle('HRed', parent=h2_style, textColor=colors.HexColor("#b91c1c"))),
            Paragraph("<b>ROUTE B: MONETIZATION (Broker Agent)</b>", ParagraphStyle('HGreen', parent=h2_style, textColor=colors.HexColor("#15803d"))),
        ],
        [
            Paragraph(
                "When verified as commercial piracy:<br/>"
                "• <b>17 U.S.C. § 512(c) Compliance:</b> Generates a formal statutory takedown notice.<br/>"
                "• <b>Cryptographic Evidence:</b> Embeds SHA-256 suspect clip hash, master video hash, and FAISS vector proof.<br/>"
                "• <b>Platform Routing:</b> Dispatches directly to registered copyright agent emails:<br/>"
                "  - YouTube: <code>copyright@youtube.com</code><br/>"
                "  - X / Twitter: <code>copyright@twitter.com</code><br/>"
                "  - Instagram: <code>ip@instagram.com</code><br/>"
                "  - Facebook: <code>ip@fb.com</code><br/>"
                "  - Telegram: <code>dmca@telegram.org</code>",
                table_cell
            ),
            Paragraph(
                "When classified as transformative fan content / fair use:<br/>"
                "• <b>Audience Goodwill:</b> Avoids alienating fans with legal strikes while preserving revenue.<br/>"
                "• <b>Platform CPM Yield Modeling:</b><br/>"
                "  - YouTube: $0.60 per 1k views<br/>"
                "  - Instagram: $0.20 per 1k views<br/>"
                "  - Facebook: $0.15 per 1k views<br/>"
                "  - Twitter/X: $0.08 per 1k views<br/>"
                "• <b>Revenue Split:</b> Automatically splits ad pool (70% IP Holder / 30% Creator).<br/>"
                "• <b>Smart Contract:</b> Prepares a Polygon smart contract receipt with cryptographic terms.",
                table_cell
            ),
        ]
    ]
    dual_table = Table(dual_actions, colWidths=[256, 257])
    dual_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor("#fef2f2")),
        ('BACKGROUND', (1,0), (1,-1), colors.HexColor("#f0fdf4")),
        ('BOX', (0,0), (0,-1), 1, colors.HexColor("#fca5a5")),
        ('BOX', (1,0), (1,-1), 1, colors.HexColor("#86efac")),
        ('LINELEFT', (0,0), (0,-1), 3.5, colors.HexColor("#ef4444")),
        ('LINELEFT', (1,0), (1,-1), 3.5, colors.HexColor("#10b981")),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(dual_table)
    story.append(Spacer(1, 10))

    # ── SECTION 6: EVIDENCE VAULT ──────────────────────────────────────────────
    story.append(Paragraph("6. Evidence Vault & Chain of Custody (Legal Admissibility)", h1_style))
    p6 = (
        "Every detection produces an immutable audit record in <code>chain_of_custody.jsonl</code>. "
        "This records the exact UTC timestamp, SHA-256 hashes of master and suspect clips, uploader handle, "
        "GPS server coordinates, and vector similarity scores—providing court-admissible proof under standard DMCA dispute procedures."
    )
    story.append(Paragraph(p6, body_style))
    story.append(Spacer(1, 8))

    # ── SECTION 7: INTERVIEW CHEATSHEET ────────────────────────────────────────
    story.append(Paragraph("7. Interview & Presentation Cheatsheet (Top 4 Questions)", h1_style))

    qa_list = [
        ("Q1: Why do you have a dual-backend architecture (Node.js and Python)?",
         "<b>Separation of Concerns:</b> Python (FastAPI) handles heavy numerical compute, tensor operations, FAISS vector indexing, and ONNX inference. Node.js (Express) handles WebSocket pub/sub streaming to the browser, REST gateway routing, and client state without blocking the Python ML event loop."),
        ("Q2: How does the system handle video mirroring, cropping, and pitch modifications?",
         "<b>Dual-Vector Invariance:</b> CLIP embeddings operate on high-level visual semantic tokens rather than raw pixels, making them resilient to cropping, flipping, and color adjustments. For severe visual degradation, AcoustID Chromaprint matches the acoustic frequency constellation of stadium sounds and commentary even under pitch shifts."),
        ("Q3: How do you prevent false positives on memes and fan reactions?",
         "<b>Adjudicator Agent:</b> Sentinel flags statistical similarity, but the Adjudicator agent applies the statutory 4-factor Fair Use doctrine (17 U.S.C. § 107). If a clip is transformative or represents fan commentary, it is routed to monetization instead of a legal strike."),
        ("Q4: How fast is the vector search at scale?",
         "<b>Sub-millisecond FAISS:</b> Using FAISS <code>IndexFlatIP</code> (Inner Product on L2-normalized 512-dim vectors), similarity search across tens of thousands of video keyframes executes in under 2 milliseconds on CPU.")
    ]

    for q, a in qa_list:
        qa_data = [
            [Paragraph(f"<b>{q}</b>", table_cell_bold)],
            [Paragraph(a, table_cell)]
        ]
        t = Table(qa_data, colWidths=[523])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
            ('PADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,0), 2),
        ]))
        story.append(t)
        story.append(Spacer(1, 5))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated at: {PDF_PATH}")

if __name__ == "__main__":
    build_pdf()
