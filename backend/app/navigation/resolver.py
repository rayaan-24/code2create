import re
from typing import Optional, List, Tuple, Dict
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.navigation import NavigationNode
from app.models.location import Location


COMMON_ALIASES: Dict[str, List[str]] = {
    "library": ["central library", "lib", "library commons", "library entrance", "reading room", "learning resource centre"],
    "student services": ["student services center", "sjt g12", "room g12", "id card office", "id office", "g12", "student affairs"],
    "sjt": ["silver jubilee tower", "sjt tower", "sjt lobby", "sjt main entrance"],
    "it support": ["it help desk", "help desk", "it department", "cat 204", "room 204", "computer support"],
    "health clinic": ["medical center", "campus clinic", "infirmary", "health center", "doctor", "hwc"],
    "emergency exit": ["fire exit", "stair exit", "exit east", "emergency evacuation"],
}


from pydantic import BaseModel

class ResolveResult(BaseModel):
    matched: bool
    node: Optional[NavigationNode] = None
    confidence: float = 0.0
    is_ambiguous: bool = False

    class Config:
        arbitrary_types_allowed = True


class LocationResolver:
    """
    Resolves natural language queries, abbreviations, room codes,
    and conversational references to concrete NavigationNode entities.
    """

    def __init__(self, db: Optional[Session] = None, community_id: Optional[str] = None):
        self.db = db
        self.community_id = community_id

    def resolve(self, query: str) -> ResolveResult:
        """Resolve query using the bound db and community_id."""
        if not self.db or not self.community_id:
            raise ValueError("db and community_id required for instance resolution")
        node, conf, ambig = self.resolve_node(self.db, self.community_id, query)
        return ResolveResult(
            matched=(node is not None),
            node=node,
            confidence=conf,
            is_ambiguous=ambig,
        )

    @classmethod
    def resolve_node(
        cls,
        db: Session,
        community_id: str,
        query: str,
    ) -> Tuple[Optional[NavigationNode], float, bool]:
        """
        Returns: (matched_node, confidence_score, is_ambiguous)
        """
        if not query or not query.strip():
            return None, 0.0, False

        clean_q = query.lower().strip()
        # Strip common prepositions
        clean_q = re.sub(r"^(near|at|to|in|towards|take me to|where is|navigate to)\s+", "", clean_q)
        clean_q = clean_q.strip(".,!?\"' ")

        nodes = db.query(NavigationNode).filter(NavigationNode.community_id == community_id).all()
        if not nodes:
            return None, 0.0, False

        # 1. Exact Name Match
        for n in nodes:
            if n.name.lower() == clean_q:
                return n, 1.0, False

        # 2. Check Alias Map
        for canonical_key, aliases in COMMON_ALIASES.items():
            if clean_q == canonical_key or clean_q in aliases or any(alias in clean_q for alias in aliases):
                # Search node whose name contains canonical_key or aliases
                for n in nodes:
                    n_low = n.name.lower()
                    if canonical_key in n_low or any(a in n_low for a in aliases):
                        return n, 0.95, False

        # 3. Check Location Table Link
        loc_match = db.query(Location).filter(
            Location.community_id == community_id,
            or_(
                Location.name.ilike(f"%{clean_q}%"),
                Location.room_number.ilike(f"%{clean_q}%"),
            )
        ).first()

        if loc_match:
            # Check if there is a node explicitly linked to this location
            linked_node = db.query(NavigationNode).filter(
                NavigationNode.community_id == community_id,
                NavigationNode.location_id == loc_match.id,
            ).first()
            if linked_node:
                return linked_node, 0.9, False

            # Or node with matching name
            for n in nodes:
                if loc_match.name.lower() in n.name.lower():
                    return n, 0.85, False

        # 4. Partial / Substring Match across all nodes
        candidates = [n for n in nodes if clean_q in n.name.lower() or n.name.lower() in clean_q]
        if len(candidates) == 1:
            return candidates[0], 0.8, False
        elif len(candidates) > 1:
            # Ambiguous match
            return candidates[0], 0.6, True

        # 5. Token Overlap Heuristic
        q_tokens = set(re.findall(r"\w+", clean_q))
        best_node = None
        best_overlap = 0

        for n in nodes:
            n_tokens = set(re.findall(r"\w+", n.name.lower()))
            overlap = len(q_tokens.intersection(n_tokens))
            if overlap > best_overlap:
                best_overlap = overlap
                best_node = n

        if best_node and best_overlap >= 1:
            return best_node, 0.7, False

        return None, 0.0, False
