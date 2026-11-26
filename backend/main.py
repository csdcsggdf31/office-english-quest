import json
import os
import sqlite3
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
DB_PATH = "/workspace/data/app.db"
def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
def add_column(conn, name, definition):
    columns = [row[1] for row in conn.execute("PRAGMA table_info(games)").fetchall()]
    if name not in columns:
        conn.execute(f"ALTER TABLE games ADD COLUMN {name} {definition}")
def init_db():
    with get_db() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player TEXT NOT NULL, score INTEGER NOT NULL DEFAULT 0,
            grade INTEGER NOT NULL DEFAULT 100, completed INTEGER NOT NULL DEFAULT 0,
            current_scene INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP)""")
        for name, definition in [
            ("affinity", "INTEGER NOT NULL DEFAULT 0"), ("trust", "INTEGER NOT NULL DEFAULT 50"),
            ("coins", "INTEGER NOT NULL DEFAULT 0"), ("sophie_affinity", "INTEGER NOT NULL DEFAULT 0"),
            ("colleague_1_affinity", "INTEGER NOT NULL DEFAULT 0"), ("colleague_2_affinity", "INTEGER NOT NULL DEFAULT 0"),
            ("colleague_3_affinity", "INTEGER NOT NULL DEFAULT 0"), ("colleague_4_affinity", "INTEGER NOT NULL DEFAULT 0"),
            ("colleague_5_affinity", "INTEGER NOT NULL DEFAULT 0"), ("boss_affinity", "INTEGER NOT NULL DEFAULT 0"),
            ("buyer_affinity", "INTEGER NOT NULL DEFAULT 0"), ("day", "INTEGER NOT NULL DEFAULT 1"),
            ("flags", "TEXT NOT NULL DEFAULT '{}'"), ("learned", "TEXT NOT NULL DEFAULT '[]'"),
        ]:
            add_column(conn, name, definition)
        conn.execute("""CREATE TABLE IF NOT EXISTS answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT, game_id INTEGER NOT NULL REFERENCES games(id),
            scene_index INTEGER NOT NULL, choice_index INTEGER NOT NULL, correct INTEGER NOT NULL,
            points INTEGER NOT NULL, question_index INTEGER NOT NULL DEFAULT 0,
            quiz_id TEXT NOT NULL DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP)""")
        answer_columns = [row[1] for row in conn.execute("PRAGMA table_info(answers)").fetchall()]
        if "question_index" not in answer_columns:
            conn.execute("ALTER TABLE answers ADD COLUMN question_index INTEGER NOT NULL DEFAULT 0")
        if "quiz_id" not in answer_columns:
            conn.execute("ALTER TABLE answers ADD COLUMN quiz_id TEXT NOT NULL DEFAULT ''")
app = FastAPI()
init_db()
class StartGame(BaseModel):
    player: str
class AnswerInput(BaseModel):
    scene_index: int
    choice_index: int
    question_index: int = 0
    quiz_id: str = ""
    correct: bool
    points: int
    grade_delta: int
    affinity_delta: int = 0
    trust_delta: int = 0
    coins_delta: int = 0
    relationship_key: str = "sophie_affinity"
    relationship_delta: int = 0
    current_scene: int = 0
    day: int = 1
    flags: dict = {}
    learned: list = []
    completed: bool = False
@app.get("/api/health")
def health():
    return {"ok": True}
@app.post("/api/games")
def create_game(body: StartGame):
    player = body.player.strip()
    if not player or len(player) > 24:
        raise HTTPException(400, "이름은 1~24자로 입력해 주세요.")
    with get_db() as conn:
        cur = conn.execute("INSERT INTO games(player) VALUES (?)", (player,))
        return dict(conn.execute("SELECT * FROM games WHERE id=?", (cur.lastrowid,)).fetchone())
@app.get("/api/games/{game_id}")
def game_detail(game_id: int):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM games WHERE id=?", (game_id,)).fetchone()
        if not row:
            raise HTTPException(404, "게임 기록을 찾을 수 없습니다.")
        answers = conn.execute("SELECT scene_index, choice_index, question_index, quiz_id, correct, points FROM answers WHERE game_id=? ORDER BY id", (game_id,)).fetchall()
        return {**dict(row), "answers": [dict(answer) for answer in answers]}
@app.post("/api/games/{game_id}/answers")
def save_answer(game_id: int, body: AnswerInput):
    allowed = {"sophie_affinity", "colleague_1_affinity", "colleague_2_affinity", "colleague_3_affinity", "colleague_4_affinity", "colleague_5_affinity", "boss_affinity", "buyer_affinity"}
    relation = body.relationship_key if body.relationship_key in allowed else "sophie_affinity"
    with get_db() as conn:
        if not conn.execute("SELECT id FROM games WHERE id=?", (game_id,)).fetchone():
            raise HTTPException(404, "게임 기록을 찾을 수 없습니다.")
        conn.execute("INSERT INTO answers(game_id,scene_index,choice_index,question_index,quiz_id,correct,points) VALUES(?,?,?,?,?,?,?)", (game_id, body.scene_index, body.choice_index, body.question_index, body.quiz_id, int(body.correct), body.points))
        conn.execute(f"""UPDATE games SET score=score+?, grade=MAX(0, grade+?),
          affinity=MAX(0, affinity+?), trust=MIN(100,MAX(0,trust+?)), coins=MAX(0,coins+?),
          {relation}=MIN(100,MAX(0,{relation}+?)), current_scene=?, day=?, flags=?, learned=?,
          completed=?, updated_at=CURRENT_TIMESTAMP WHERE id=?""", (
          body.points, body.grade_delta, body.affinity_delta, body.trust_delta, body.coins_delta,
          body.relationship_delta, body.current_scene, body.day, json.dumps(body.flags, ensure_ascii=False),
          json.dumps(body.learned, ensure_ascii=False), int(body.completed), game_id))
        return dict(conn.execute("SELECT * FROM games WHERE id=?", (game_id,)).fetchone())
class AdvanceDay(BaseModel):
    day: int

@app.post("/api/games/{game_id}/advance-day")
def advance_day(game_id: int, body: AdvanceDay):
    if body.day not in (1, 2, 3):
        raise HTTPException(400, "올바른 날짜가 아닙니다.")
    with get_db() as conn:
        if not conn.execute("SELECT id FROM games WHERE id=?", (game_id,)).fetchone():
            raise HTTPException(404, "게임 기록을 찾을 수 없습니다.")
        conn.execute("UPDATE games SET day=?, current_scene=0, completed=0, updated_at=CURRENT_TIMESTAMP WHERE id=?", (body.day, game_id))
        return dict(conn.execute("SELECT * FROM games WHERE id=?", (game_id,)).fetchone())

@app.get("/api/leaderboard")
def leaderboard():
    with get_db() as conn:
        rows = conn.execute("""SELECT player, MAX(score) AS score, MAX(grade) AS grade, MAX(affinity) AS affinity,
          MAX(trust) AS trust, MAX(coins) AS coins, MAX(sophie_affinity) AS sophie_affinity,
          MAX(completed) AS completed, MAX(updated_at) AS updated_at FROM games
          GROUP BY player ORDER BY score DESC, grade DESC, updated_at ASC LIMIT 50""").fetchall()
        return [dict(row, rank=index + 1) for index, row in enumerate(rows)]
@app.get("/api/games")
def recent_games():
    with get_db() as conn:
        return [dict(row) for row in conn.execute("SELECT * FROM games ORDER BY updated_at DESC LIMIT 30").fetchall()]
