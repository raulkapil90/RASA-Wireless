"""
ARKS NetOps AI - Multi-Agent Reasoning System
===============================================
Three specialised agents collaborate to answer queries:

 Agent A  –  The Librarian     : Finds exact technical references / Bug IDs.
 Agent B  –  The Troubleshooter: Correlates symptoms with retrieved data.
 Agent C  –  The Reviewer      : Validates CLI recommendations against best-practices.

Anti-hallucination guardrail:
  If no relevant source is found, the system replies:
  "No official documentation found; escalating to human SME."
"""

import logging
from dataclasses import dataclass, field
from typing import Optional

from .database import VectorDB

logger = logging.getLogger(__name__)

# ── Confidence threshold ──────────────────────────────────────────────────
# ChromaDB cosine distance: 0 = identical, 2 = opposite.
# We accept anything with distance ≤ THRESHOLD as a valid match.
RELEVANCE_THRESHOLD = 1.2

NO_MATCH_RESPONSE = (
    "No official documentation found; escalating to human SME."
)


# ── Data structures ───────────────────────────────────────────────────────

@dataclass
class SourceReference:
    """A citation link returned alongside every answer."""
    title: str
    url: str
    doc_type: str
    chunk_preview: str  # first 200 chars of the matching chunk
    relevance_score: float  # lower is better (cosine distance)


@dataclass
class AgentResponse:
    """Unified response format used by all agents."""
    agent_name: str
    answer: str
    sources: list[SourceReference] = field(default_factory=list)
    confidence: float = 0.0  # 0-1 scale
    escalate: bool = False


# ── Agent A: The Librarian ────────────────────────────────────────────────

class Librarian:
    """
    Retrieves the most relevant documents / bug IDs from the vector store.
    """

    NAME = "Librarian"

    def __init__(self, db: VectorDB):
        self.db = db

    def search(
        self,
        query: str,
        n_results: int = 5,
        doc_type: Optional[str] = None,
    ) -> AgentResponse:
        where_filter = {"type": doc_type} if doc_type else None
        results = self.db.query_documents(
            query_text=query,
            n_results=n_results,
            where=where_filter,
        )

        sources: list[SourceReference] = []
        if results and results["documents"] and results["documents"][0]:
            for doc, meta, dist in zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0],
            ):
                if dist <= RELEVANCE_THRESHOLD:
                    sources.append(
                        SourceReference(
                            title=meta.get("title", "Unknown"),
                            url=meta.get("source_url", ""),
                            doc_type=meta.get("type", "doc"),
                            chunk_preview=doc[:200],
                            relevance_score=round(dist, 4),
                        )
                    )

        if not sources:
            return AgentResponse(
                agent_name=self.NAME,
                answer=NO_MATCH_RESPONSE,
                escalate=True,
            )

        best = sources[0]
        return AgentResponse(
            agent_name=self.NAME,
            answer=f"Found {len(sources)} relevant reference(s). "
                   f"Best match: \"{best.title}\" (score {best.relevance_score}).",
            sources=sources,
            confidence=max(0.0, 1.0 - best.relevance_score),
        )


# ── Agent B: The Troubleshooter ──────────────────────────────────────────

class Troubleshooter:
    """
    Takes a user-reported symptom string, retrieves related documents via the
    Librarian, and synthesises a root-cause analysis with step-by-step
    remediation.
    """

    NAME = "Troubleshooter"

    # Common symptom → refined-search-term mappings
    SYMPTOM_MAP: dict[str, str] = {
        "client disconnect": "client deauthentication reason code 9800",
        "slow throughput": "low throughput performance wireless 9800",
        "ap not joining": "AP join failure catalyst 9800 WLC",
        "high cpu": "high CPU utilization IOS-XE wireless",
        "radius timeout": "RADIUS server timeout authentication failure",
        "roaming issue": "fast roaming 802.11r 9800 client roam failure",
        "channel change": "DCA channel change catalyst 9800 RRM",
        "dhcp failure": "DHCP scope exhaustion wireless client",
    }

    def __init__(self, db: VectorDB):
        self.db = db
        self.librarian = Librarian(db)

    def _refine_query(self, symptom: str) -> str:
        """Map common symptom phrases to more precise search queries."""
        symptom_lower = symptom.lower()
        for trigger, refined in self.SYMPTOM_MAP.items():
            if trigger in symptom_lower:
                return refined
        return symptom

    def diagnose(self, symptom: str) -> AgentResponse:
        refined = self._refine_query(symptom)
        lib_resp = self.librarian.search(refined, n_results=8)

        if lib_resp.escalate:
            return AgentResponse(
                agent_name=self.NAME,
                answer=NO_MATCH_RESPONSE,
                escalate=True,
            )

        # Build a structured diagnosis from the retrieved chunks
        diagnosis_parts: list[str] = []
        diagnosis_parts.append(f"**Symptom reported:** {symptom}")
        diagnosis_parts.append(f"**Refined search:** {refined}")
        diagnosis_parts.append("")
        diagnosis_parts.append("### Relevant Documentation")

        for idx, src in enumerate(lib_resp.sources, 1):
            diagnosis_parts.append(
                f"{idx}. [{src.title}]({src.url}) "
                f"(type: {src.doc_type}, score: {src.relevance_score})"
            )
            diagnosis_parts.append(f"   > {src.chunk_preview}…")
            diagnosis_parts.append("")

        diagnosis_parts.append("### Recommended Next Steps")
        diagnosis_parts.append(
            "Review the referenced documentation above. "
            "If CLI commands are suggested, validate them with Agent C (Reviewer) "
            "before applying to production."
        )

        return AgentResponse(
            agent_name=self.NAME,
            answer="\n".join(diagnosis_parts),
            sources=lib_resp.sources,
            confidence=lib_resp.confidence,
        )


# ── Agent C: The Reviewer ────────────────────────────────────────────────

class Reviewer:
    """
    Validates that any CLI commands in a proposed answer align with
    Cisco Best Practices for the Catalyst 9800.

    It cross-references the best-practices collection and flags commands
    that have no backing documentation.
    """

    NAME = "Reviewer"

    # Known-safe command prefixes (IOS-XE)
    SAFE_PREFIXES = [
        "show ",
        "debug ",
        "test ",
        "ping ",
        "traceroute ",
        "terminal ",
        "more ",
    ]

    def __init__(self, db: VectorDB):
        self.db = db
        self.librarian = Librarian(db)

    def _extract_cli_commands(self, text: str) -> list[str]:
        """
        Extracts lines that look like Cisco CLI commands from markdown
        code blocks or lines starting with # / (config)#.
        """
        import re
        commands: list[str] = []

        # Match fenced code blocks
        code_blocks = re.findall(r"```[\w]*\n(.*?)```", text, re.DOTALL)
        for block in code_blocks:
            for line in block.strip().splitlines():
                line = line.strip()
                if line and not line.startswith("!") and not line.startswith("//"):
                    commands.append(line)

        # Match inline CLI patterns  (e.g., Router# show version)
        inline = re.findall(
            r"(?:^|\n)\s*\S+[#>]\s*(.+)", text
        )
        commands.extend(inline)

        return commands

    def _is_safe_readonly(self, cmd: str) -> bool:
        return any(cmd.lower().startswith(p) for p in self.SAFE_PREFIXES)

    def review(self, proposed_answer: str) -> AgentResponse:
        """
        Reviews a proposed answer for CLI safety.
        """
        commands = self._extract_cli_commands(proposed_answer)

        if not commands:
            return AgentResponse(
                agent_name=self.NAME,
                answer="No CLI commands detected — no review needed.",
                confidence=1.0,
            )

        review_notes: list[str] = []
        flagged = 0

        for cmd in commands:
            if self._is_safe_readonly(cmd):
                review_notes.append(f"✅ `{cmd}` — read-only / safe")
                continue

            # Search best-practices docs for this command pattern
            result = self.librarian.search(
                f"best practice {cmd}",
                n_results=3,
                doc_type="doc",
            )

            if result.escalate or result.confidence < 0.3:
                review_notes.append(
                    f"⚠️ `{cmd}` — **NOT verified** against Cisco Best Practices. "
                    f"Manual SME review recommended before applying."
                )
                flagged += 1
            else:
                ref = result.sources[0]
                review_notes.append(
                    f"✅ `{cmd}` — verified via [{ref.title}]({ref.url})"
                )

        overall = (
            "All commands verified."
            if flagged == 0
            else f"{flagged} command(s) require manual SME review."
        )

        return AgentResponse(
            agent_name=self.NAME,
            answer=f"### CLI Review Report\n\n{overall}\n\n"
                   + "\n".join(review_notes),
            confidence=max(0.0, 1.0 - (flagged / max(len(commands), 1))),
            escalate=flagged > 0,
        )


# ── Orchestrator ──────────────────────────────────────────────────────────

class AgentOrchestrator:
    """
    Coordinates the three agents to produce a single, complete response
    with source citations.
    """

    def __init__(self, db: Optional[VectorDB] = None):
        self.db = db or VectorDB()
        self.librarian = Librarian(self.db)
        self.troubleshooter = Troubleshooter(self.db)
        self.reviewer = Reviewer(self.db)

    def process_query(self, query: str) -> dict:
        """
        Full pipeline:
        1. Librarian retrieves references.
        2. Troubleshooter correlates symptoms.
        3. Reviewer validates any CLI in the answer.

        Returns a dict ready to serialise as JSON for the Rasa front-end.
        """

        # Step 1 – Retrieve
        lib_response = self.librarian.search(query)

        # Step 2 – Diagnose
        ts_response = self.troubleshooter.diagnose(query)

        # Step 3 – Review the troubleshooter's answer
        review_response = self.reviewer.review(ts_response.answer)

        # ── Assemble final answer ─────────────────────────────────────
        escalate = lib_response.escalate and ts_response.escalate

        if escalate:
            final_answer = NO_MATCH_RESPONSE
        else:
            final_answer = ts_response.answer
            if review_response.escalate:
                final_answer += (
                    "\n\n---\n\n"
                    + review_response.answer
                )

        # Build unique source list
        seen_urls: set[str] = set()
        unique_sources: list[dict] = []
        for src in ts_response.sources + lib_response.sources:
            if src.url not in seen_urls:
                seen_urls.add(src.url)
                unique_sources.append(
                    {
                        "title": src.title,
                        "url": src.url,
                        "type": src.doc_type,
                        "relevance": src.relevance_score,
                    }
                )

        return {
            "answer": final_answer,
            "sources": unique_sources,
            "confidence": round(
                (lib_response.confidence + ts_response.confidence) / 2, 3
            ),
            "escalated": escalate,
            "review": {
                "status": "passed" if not review_response.escalate else "flagged",
                "details": review_response.answer,
            },
        }
