"""Vérifie la migration des verdicts sans toucher à la base D1 distante."""
import pathlib
import sqlite3
import tempfile

migration = pathlib.Path("drizzle/0015_cms_duplicate_verdicts.sql").read_text(encoding="utf-8")
temporary_directory = tempfile.TemporaryDirectory()
database_path = pathlib.Path(temporary_directory.name) / "duplicate-verdicts.sqlite3"
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
# La lecture API ignore une paire si l'un de ses produits a été supprimé.
active_verdicts = "SELECT v.pair_key,v.verdict FROM cms_duplicate_verdicts v INNER JOIN products a ON a.id=v.product_a INNER JOIN products b ON b.id=v.product_b"
assert db.execute(active_verdicts).fetchall() == [('["a","b"]', "rejected")]
db.execute("DELETE FROM products WHERE id=?", ("b",))
assert db.execute(active_verdicts).fetchall() == []
# La décision historique reste disponible pour audit même après suppression du produit.
assert db.execute("SELECT COUNT(*) FROM cms_duplicate_verdict_events").fetchone()[0] == 1
db.execute("DELETE FROM cms_duplicate_verdicts WHERE pair_key=?", ('["a","b"]',))
assert db.execute("SELECT COUNT(*) FROM cms_duplicate_verdicts").fetchone()[0] == 0
assert db.execute("SELECT COUNT(*) FROM cms_duplicate_verdict_events").fetchone()[0] == 1
db.close()
temporary_directory.cleanup()
print("Migration SQLite : création, réexécution, verdicts, contraintes, persistance après réouverture, filtrage des produits supprimés et historique OK")
