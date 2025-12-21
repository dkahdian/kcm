import json
from pathlib import Path


def build_empty_adjacency(language_ids: list[str]) -> dict:
    """Return a well-typed empty adjacency matrix sized to the language list."""
    size = len(language_ids)
    matrix = [[None for _ in range(size)] for _ in range(size)]
    return {"languageIds": language_ids, "matrix": matrix}


def clear_adjacency_matrix():
    database_path = Path(__file__).resolve().parent / "../src/lib/data/database.json"

    with database_path.open("r", encoding="utf-8") as file:
        data = json.load(file)

    languages = data.get("languages", [])
    language_ids = [lang.get("id") or lang.get("name") for lang in languages]

    data["adjacencyMatrix"] = build_empty_adjacency(language_ids)

    with database_path.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)

    print("Database cleared: adjacencyMatrix rebuilt with null entries for all languages.")


if __name__ == "__main__":
    clear_adjacency_matrix()