"""
Seed every level's leaderboard with random verified players.
Run from backend/:  env/bin/python scripts/seed-leaderboard.py
"""

import random
import string
import sys
from pathlib import Path

# so `app` imports when run as a script
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal
from app.models import Score, User
from sqlalchemy import select

LEVEL_COUNT = 51  # keep in sync with src/domain/levels.ts
USERS = 40
PER_LEVEL = 10

# fun, pattern-safe usernames  ^[A-Za-z0-9_\-]{3,30}$
ADJECTIVES = [
    "ash", "brook", "cinder", "ember", "frost", "gale", "haven", "iris",
    "jade", "kestrel", "lark", "moss", "nova", "onyx", "peregrine", "quill",
    "river", "sage", "terra", "vale", "wren", "zephyr", "crimson", "azure",
    "verdant", "amber", "violet", "pearl", "saffron", "indigo",
]

def random_username() -> str:
    adj = random.choice(ADJECTIVES)
    num = random.randint(11, 999)
    # e.g. ember_742, nova-19
    sep = random.choice(["_", "-"])
    return f"{adj}{sep}{num}"

def level_worth(level_id: int) -> int:
    return 1000 * level_id

def main():
    random.seed(0xC0FFEE)  # deterministic so every seed looks the same
    with SessionLocal() as db:
        # --- build / reuse a pool of verified players ---
        pool: list[User] = []
        existing_usernames = {r[0] for r in db.execute(select(User.username)).all() if r[0]}
        tries = 0
        while len(pool) < USERS and tries < USERS * 10:
            tries += 1
            name = random_username()
            if name in existing_usernames:
                continue
            email = f"{name.lower().replace('-','_')}@seed.local"
            if db.scalar(select(User).where(User.email == email)):
                continue
            user = User(
                username=name,
                email=email,
                auth_provider="local",
                is_verified=True,
            )
            db.add(user)
            # flush so we get an id without committing the whole batch
            try:
                db.flush()
            except Exception:
                db.rollback()
                continue
            existing_usernames.add(name)
            pool.append(user)

        db.commit()
        print(f"pool: {len(pool)} users (plus any pre-existing)")

        # include pre-existing verified users so they also appear
        preexisting = db.scalars(select(User).where(User.is_verified.is_(True), User.username.is_not(None))).all()
        # dedupe by id
        by_id = {u.id: u for u in pool}
        for u in preexisting:
            by_id.setdefault(u.id, u)
        all_verified = list(by_id.values())
        print(f"total verified players available to seed: {len(all_verified)}")

        # --- per level, sprinkle scores ---
        created = 0
        for level_id in range(1, LEVEL_COUNT + 1):
            worth = level_worth(level_id)
            # pick a random subset for this level
            chosen = random.sample(all_verified, k=min(PER_LEVEL, len(all_verified)))
            for user in chosen:
                # keep each player's best — don't clobber a higher score already there
                existing = db.get(Score, (user.id, level_id))
                total = random.randint(int(worth * 0.55), worth)
                # round to a clean number like the real game does
                total = (total // 25) * 25
                if existing is None:
                    db.add(Score(user_id=user.id, level_id=level_id, total=total))
                    created += 1
                elif total > existing.total:
                    existing.total = total

        db.commit()
        print(f"seeded {created} new level scores")

        # summary
        from sqlalchemy import func
        counts = db.execute(select(Score.level_id, func.count()).group_by(Score.level_id).order_by(Score.level_id)).all()
        print("per-level counts (level: rows):")
        for level_id, cnt in counts:
            print(f"  {level_id:2d}: {cnt}")

if __name__ == "__main__":
    main()
