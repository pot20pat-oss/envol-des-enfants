"""Vérifie la migration des verdicts sans toucher à la base D1 distante."""
import pathlib
import sqlite3
import tempfile

migration = pathlib.Path("drizzle/0015_cms_duplicate_verdicts.sql").read_text(encoding="utf-8")
with tempfile.TemporaryDirectory() as directory:
    database_path = pathlib.Path(directory) / "duplicate-verdicts.sqlite3"
    db = sqlite3.connect(database_path)
db.execute("CREATE TABLE products (id TEXT PRIMARY KEY)")
db.executemany("INSERT INTO products(id) VALUES (?)", [("a",), ("b",)])
db.executescript(migration)
db.executescript(migration)  # migration réexécutable
db.execute(
    "INSERT INTO cms_duplicate_verdicts(pair_key,product_a,product_b,verdict,decided_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
    ('["a","b"]', "a", "b", "confirmed", "admin", "now", "now"),
)
assert db.execute("SELECT verdict FROM cms_duplicate_verdicts").fetchone()[0] == "confirmed"
db.execute(
    "UPDATE cms_duplicate_verdicts SET verdict='rejected',updated_at='later' WHERE pair_key=?",
    ('["a","b"]',),
)
assert db.execute("SELECT verdict FROM cms_duplicate_verdicts").fetchone()[0] == "rejected"
db.execute(
    "INSERT INTO cms_duplicate_verdict_events(id,pair_key,product_a,product_b,previous_verdict,next_verdict,decided_by,created_at) VALUES (?,?,?,?,?,?,?,?)",
    ("event", '["a","b"]', "a", "b", "confirmed", "rejected", "admin", "later"),
)
assert db.execute("SELECT COUNT(*) FROM cms_duplicate_verdict_events").fetchone()[0] == 1
for invalid in [
    ('["b","a"]', "b", "a", "confirmed"),
    ('["a","c"]', "a", "c", "maybe"),
]:
    try:
        db.execute(
            "INSERT INTO cms_duplicate_verdicts(pair_key,product_a,product_b,verdict,decided_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
            (*invalid, "admin", "now", "now"),
        )
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError(f"Contrainte non appliquée : {invalid}")
# Vérifier la persistance réelle après fermeture et réouverture de la base.
db.commit()
db.close()
db = sqlite3.connect(database_path)
assert db.execute("SELECT verdict FROM cms_duplicate_verdicts WHERE pair_key=?", ('["a","b"]',)).fetchone()[0] == "rejected"
assert db.execute("SELECT previous_verdict,next_verdict FROM cms_duplicate_verdict_events").fetchone() == ("confirmed", "rejected")
db.execute("DELETE FROM cms_duplicate_verdicts WHERE pair_key=?", ('["a","b"]',))
assert db.execute("SELECT COUNT(*) FROM cms_duplicate_verdicts").fetchone()[0] == 0
assert db.execute("SELECT COUNT(*) FROM cms_duplicate_verdict_events").fetchone()[0] == 1
print("Migration SQLite : création, réexécution, verdicts, contraintes, persistance après réouverture et historique OK")
