import json
from pathlib import Path


def clear_database():
    database_path = Path(__file__).resolve().parent / "../src/lib/data/database.json"

    with database_path.open("r", encoding="utf-8") as file:
        data = json.load(file)

    data["languages"] = []
    data["references"] = []
    data["separatingFunctions"] = []
    data["adjacencyMatrix"] = {
        "languageIds": [],
        "matrix": []
    }

    with database_path.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)

    print("Database cleared.")


if __name__ == "__main__":
    clear_database()