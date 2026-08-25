"""
The overall leaderboard: one best total per player, ranked.

Scores are posted by the game and kept here. The number itself is taken at the
client's word for now — proving a score by replaying the run is a later step —
but the table only ever keeps a player's best, and only players whose email is
verified and whose name is set appear on the board.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Score, User
from ..schemas import LeaderboardEntry, ScoreResponse, ScoreSubmitRequest
from .auth import get_current_user

router = APIRouter(tags=["Leaderboard"])

# A board is a ladder, not a ledger of everyone: the top is all anyone reads.
TOP = 100


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
def leaderboard(db: Session = Depends(get_db)):
    rows = db.execute(
        select(User.username, Score.total)
        .join(Score, Score.user_id == User.id)
        .where(User.is_verified.is_(True), User.username.is_not(None))
        .order_by(Score.total.desc(), Score.updated_at.asc())
        .limit(TOP)
    ).all()

    return [
        LeaderboardEntry(rank=at + 1, username=username, total=total)
        for at, (username, total) in enumerate(rows)
    ]


@router.post("/scores", response_model=ScoreResponse)
def submit_score(
    request: ScoreSubmitRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    score = db.get(Score, user.id)
    if score is None:
        score = Score(user_id=user.id, total=request.total)
        db.add(score)
    elif request.total > score.total:
        score.total = request.total

    db.commit()
    return ScoreResponse(total=score.total)
