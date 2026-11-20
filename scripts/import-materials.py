#!/usr/bin/env python3
"""Build the public catalog from the reviewed, hash-pinned source manifest.

The manifest contains editorial metadata and explicit, reciprocal pairings. This
tool deliberately does not infer an answer key from a filename or publish PDF
text. Run --inventory when reviewing new files, then update the manifest before
importing. See docs/catalog-data.md for the maintenance workflow.
"""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import sys
import tempfile
from typing import Any


DEFAULT_SOURCE_ROOT = Path("/mnt/d/Desktop/tutor")
COLLECTION_IDS = ("junior", "senior", "competition")
ROLES = ("questions", "solutions", "notes")
TOPIC_FIELDS = (
    "id", "subjectId", "collectionId", "title", "category", "summary", "tags",
    "prerequisites", "difficulty", "order", "relatedIds", "reportId",
)


class ImportFailure(Exception):
    """An actionable inventory, metadata, or integrity error."""


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ImportFailure(message)


def read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        raise ImportFailure(f"Cannot read JSON {path}: {error}") from error


def json_text(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2) + "\n"


def safe_relative(value: str, label: str) -> PurePosixPath:
    require(isinstance(value, str) and bool(value), f"{label}: empty path")
    path = PurePosixPath(value)
    require(
        not path.is_absolute() and ".." not in path.parts
        and "\\" not in value and ":" not in value
        and path.as_posix() == value and value != ".",
        f"{label}: expected a normalized relative POSIX path: {value}",
    )
    return path


def inside(root: Path, relative: str, label: str) -> Path:
    path = root.joinpath(*safe_relative(relative, label).parts).resolve()
    require(path.is_relative_to(root.resolve()), f"{label}: path escapes its root")
    return path


def digest(path: Path) -> str:
    result = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def topic_id(collection_id: str, key: str) -> str:
    return f"{collection_id}-{hashlib.sha256(key.encode('utf-8')).hexdigest()[:12]}"


def pdf_info(path: Path, verify_text: bool = False) -> dict[str, Any]:
    try:
        import pymupdf
    except ImportError as error:
        raise ImportFailure(
            "PyMuPDF is required to check PDF page counts. Run this tool with a "
            "Python environment that provides pymupdf; see docs/catalog-data.md."
        ) from error
    try:
        with path.open("rb") as stream:
            require(stream.read(5) == b"%PDF-", f"Not a PDF: {path.name}")
        with pymupdf.open(path) as document:
            require(not document.needs_pass, f"Encrypted PDF: {path.name}")
            require(document.page_count > 0, f"Empty PDF: {path.name}")
            info = {
                "pages": document.page_count,
                "bytes": path.stat().st_size,
                "sha256": digest(path),
            }
            if verify_text:
                info["answerMarkers"] = sum(
                    page.get_text().count("【答案】") for page in document
                )
        return info
    except (OSError, RuntimeError, ValueError) as error:
        raise ImportFailure(f"Cannot inspect PDF {path.name}: {error}") from error


def validate_manifest(manifest: dict[str, Any]) -> None:
    require(manifest.get("schemaVersion") == 1, "Unsupported manifest schemaVersion")
    require(bool(manifest.get("generatedAt")), "Manifest generatedAt is required")
    require(set(manifest.get("sourceRoots", {})) == set(COLLECTION_IDS), "Invalid sourceRoots")
    subjects = manifest.get("subjects", [])
    require(len(subjects) == 1 and subjects[0].get("id") == "math", "Expected the math subject")
    collections = manifest.get("collections", [])
    require(
        Counter(row.get("id") for row in collections) == Counter(COLLECTION_IDS),
        "Every collection must appear exactly once",
    )
    for row in collections:
        require(row.get("subjectId") == "math", f"Unknown subject in {row.get('id')}")
    for collection_id, path in manifest["sourceRoots"].items():
        safe_relative(path, f"{collection_id} source root")

    topics = manifest.get("topics", [])
    files = manifest.get("files", [])
    require(bool(topics) and bool(files), "The reviewed manifest is empty")
    topics_by_id: dict[str, dict[str, Any]] = {}
    orders: set[tuple[str, int]] = set()
    for row in topics:
        ident = row.get("id")
        collection_id = row.get("collectionId")
        require(collection_id in COLLECTION_IDS, f"Unknown collection for topic {ident}")
        require(row.get("subjectId") == "math", f"Unknown subject for topic {ident}")
        require(ident not in topics_by_id, f"Duplicate topic id: {ident}")
        require(
            isinstance(row.get("key"), str) and bool(row["key"])
            and ident == topic_id(collection_id, row["key"]),
            f"Topic {ident}: id must match its persistent key",
        )
        for field in ("title", "category", "summary", "difficulty", "summaryBasis", "editorialBasis"):
            require(isinstance(row.get(field), str) and bool(row[field].strip()), f"{ident}: missing {field}")
        for field in ("tags", "prerequisites"):
            require(
                isinstance(row.get(field), list)
                and all(isinstance(item, str) and item.strip() for item in row[field]),
                f"{ident}: invalid {field}",
            )
            require(len(row[field]) == len(set(row[field])), f"{ident}: duplicate {field}")
        require(type(row.get("order")) is int and row["order"] > 0, f"{ident}: invalid order")
        order = (collection_id, row["order"])
        require(order not in orders, f"Duplicate topic order: {order}")
        orders.add(order)
        topics_by_id[ident] = row
    for row in topics:
        related = row.get("relatedIds", [])
        require(isinstance(related, list) and len(related) == len(set(related)), f"{row['id']}: invalid relatedIds")
        for related_id in related:
            require(related_id in topics_by_id and related_id != row["id"], f"{row['id']}: dangling related topic {related_id}")

    files_by_key: dict[tuple[str, str], dict[str, Any]] = {}
    prefix_hashes: dict[str, str] = {}
    for row in files:
        key = (row.get("collectionId"), row.get("originalPath"))
        require(key not in files_by_key, f"Duplicate source entry: {key}")
        require(key[0] in COLLECTION_IDS, f"Unknown collection: {key}")
        require(safe_relative(key[1], "originalPath").suffix.lower() == ".pdf", f"Not a PDF source: {key}")
        require(row.get("topicId") in topics_by_id, f"Unknown topic for source: {key}")
        require(topics_by_id[row["topicId"]]["collectionId"] == key[0], f"Wrong topic collection: {key}")
        require(row.get("role") in ROLES, f"Invalid document role: {key}")
        require(isinstance(row.get("label"), str) and bool(row["label"].strip()), f"Missing label: {key}")
        for field in ("pages", "bytes"):
            require(type(row.get(field)) is int and row[field] > 0, f"Invalid {field}: {key}")
        sha = row.get("sha256", "")
        require(isinstance(sha, str) and re.fullmatch(r"[0-9a-f]{64}", sha) is not None, f"Invalid SHA-256: {key}")
        require(row.get("url") == f"materials/{sha[:16]}.pdf", f"Invalid material URL: {key}")
        require(prefix_hashes.get(sha[:16], sha) == sha, f"16-character hash collision: {key}")
        prefix_hashes[sha[:16]] = sha
        files_by_key[key] = row

    canonical_by_topic: dict[str, dict[str, dict[str, Any]]] = defaultdict(dict)
    for key, row in files_by_key.items():
        duplicate = row.get("duplicateOf")
        if duplicate:
            original = files_by_key.get((key[0], duplicate))
            require(original is not None and not original.get("duplicateOf"), f"Invalid duplicate target: {key}")
            for field in ("sha256", "pages", "bytes", "url", "topicId", "role"):
                require(row[field] == original[field], f"Duplicate {field} differs: {key}")
        else:
            role = row["role"]
            require(role not in canonical_by_topic[row["topicId"]], f"Multiple canonical {role}: {row['topicId']}")
            canonical_by_topic[row["topicId"]][role] = row
        paired_path = row.get("pairedPath")
        if paired_path:
            pair = files_by_key.get((key[0], paired_path))
            require(pair is not None, f"Missing paired PDF: {key}")
            require(pair.get("pairedPath") == key[1], f"Pair is not reciprocal: {key}")
            require(pair["topicId"] == row["topicId"], f"Pair belongs to another topic: {key}")
            require({pair["role"], row["role"]} == {"questions", "solutions"}, f"Pair roles do not complement: {key}")
            require(pair["sha256"] != row["sha256"], f"Question and solution are identical: {key}")
            evidence = row.get("pairingEvidence", {})
            require(bool(evidence.get("method")), f"Missing pairing evidence: {key}")
            require(type(evidence.get("answerMarkers")) is int and evidence["answerMarkers"] >= 0, f"Missing answer marker audit: {key}")
            require(evidence.get("pairedAnswerMarkers") == pair.get("pairingEvidence", {}).get("answerMarkers"), f"Pair evidence is not reciprocal: {key}")
            if row["role"] == "solutions":
                require(evidence["answerMarkers"] > evidence["pairedAnswerMarkers"], f"Answer-key role conflicts with the reviewed answer markers: {key}")
        else:
            require(row["role"] != "solutions", f"An answer key has no question: {key}")
            require(bool(row.get("unpairedReason")), f"Missing reason for unpaired source: {key}")
    for ident, topic in topics_by_id.items():
        documents = canonical_by_topic[ident]
        require(bool(documents), f"Topic has no canonical PDFs: {ident}")
        require("questions" in documents or "notes" in documents, f"Topic lacks reading material: {ident}")
        has_solutions = "solutions" in documents
        require(topic.get("hasSolutions") is has_solutions, f"Incorrect hasSolutions: {ident}")
        if has_solutions:
            require(documents["questions"].get("pairedPath") == documents["solutions"]["originalPath"], f"Canonical pair differs: {ident}")


def statistics(files: list[dict[str, Any]], topics: list[dict[str, Any]]) -> dict[str, Any]:
    unique = {row["sha256"]: row for row in files}
    return {
        "sourceFiles": len(files),
        "uniqueFiles": len(unique),
        "topics": len(topics),
        "sourcePages": sum(row["pages"] for row in files),
        "pages": sum(row["pages"] for row in unique.values()),
        "sourceBytes": sum(row["bytes"] for row in files),
        "bytes": sum(row["bytes"] for row in unique.values()),
        "duplicates": len(files) - len(unique),
        "pairedTopics": sum(row["hasSolutions"] for row in topics),
        "unpairedTopics": sum(not row["hasSolutions"] for row in topics),
    }


def make_catalog(manifest: dict[str, Any]) -> dict[str, Any]:
    documents_by_topic: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in manifest["files"]:
        if row.get("duplicateOf"):
            continue
        documents_by_topic[row["topicId"]].append({
            "id": f"doc-{row['sha256'][:16]}",
            "role": row["role"],
            "label": row["label"],
            "filename": PurePosixPath(row["originalPath"]).name,
            **{field: row[field] for field in ("originalPath", "url", "pages", "bytes", "sha256")},
        })
    topics = []
    for row in sorted(manifest["topics"], key=lambda item: (COLLECTION_IDS.index(item["collectionId"]), item["order"])):
        topic = {field: row[field] for field in TOPIC_FIELDS if field in row}
        topic["documents"] = sorted(documents_by_topic[row["id"]], key=lambda item: ROLES.index(item["role"]))
        topics.append(topic)
    stats = statistics(manifest["files"], manifest["topics"])
    return {
        "schemaVersion": 1,
        "generatedAt": manifest["generatedAt"],
        "subjects": manifest["subjects"],
        "collections": manifest["collections"],
        "topics": topics,
        "stats": {field: stats[field] for field in ("sourceFiles", "uniqueFiles", "topics", "pages", "bytes")},
    }


def compare_info(row: dict[str, Any], info: dict[str, Any], label: str, verify_text: bool) -> None:
    for field in ("sha256", "bytes", "pages"):
        require(row[field] == info[field], f"{label}: {field} changed; review the source before updating its manifest fingerprint")
    if verify_text and row.get("pairedPath"):
        require(
            info["answerMarkers"] == row["pairingEvidence"]["answerMarkers"],
            f"{label}: answer marker audit differs from the reviewed manifest",
        )


def source_inventory(manifest: dict[str, Any], source_root: Path, verify_text: bool) -> dict[tuple[str, str], tuple[Path, dict[str, Any]]]:
    inventory = {}
    for collection_id in COLLECTION_IDS:
        root = inside(source_root, manifest["sourceRoots"][collection_id], "source root")
        require(root.is_dir(), f"Source folder is missing: {root}")
        for path in sorted(root.rglob("*")):
            if not path.is_file() or path.suffix.lower() != ".pdf":
                continue
            relative = path.relative_to(root).as_posix()
            resolved = inside(root, relative, "source PDF")
            inventory[(collection_id, relative)] = (resolved, pdf_info(resolved, verify_text))
    return inventory


def check_sources(manifest: dict[str, Any], inventory: dict, verify_text: bool) -> None:
    expected = {(row["collectionId"], row["originalPath"]): row for row in manifest["files"]}
    missing = sorted(set(expected) - set(inventory))
    added = sorted(set(inventory) - set(expected))
    require(not missing, f"Missing source PDFs: {missing[:12]}")
    require(not added, f"Unreviewed source PDFs: {added[:12]}. Run --inventory and curate their metadata and pairings first.")
    for key, row in expected.items():
        compare_info(row, inventory[key][1], f"{key[0]}/{key[1]}", verify_text)


def atomic_text(path: Path, content: str) -> None:
    if path.exists() and path.read_text(encoding="utf-8") == content:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    staging = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, delete=False) as stream:
            staging = Path(stream.name)
            stream.write(content)
            stream.flush()
        staging.replace(path)
    finally:
        if staging is not None:
            staging.unlink(missing_ok=True)


def copy_materials(manifest: dict[str, Any], inventory: dict, repo_root: Path) -> None:
    copied = set()
    for row in manifest["files"]:
        if row["sha256"] in copied:
            continue
        destination = inside(repo_root / "public", row["url"], "material output")
        destination.parent.mkdir(parents=True, exist_ok=True)
        if not destination.is_file() or digest(destination) != row["sha256"]:
            source = inventory[(row["collectionId"], row["originalPath"])][0]
            with tempfile.NamedTemporaryFile(dir=destination.parent, delete=False) as stream:
                staging = Path(stream.name)
            try:
                shutil.copyfile(source, staging)
                require(digest(staging) == row["sha256"], f"Source changed during copy: {row['originalPath']}")
                staging.replace(destination)
            finally:
                staging.unlink(missing_ok=True)
        copied.add(row["sha256"])


def check_published(manifest: dict[str, Any], repo_root: Path, verify_text: bool) -> None:
    expected = {row["url"]: row for row in manifest["files"]}
    material_root = repo_root / "public" / "materials"
    actual = {
        path.relative_to(repo_root / "public").as_posix()
        for path in material_root.rglob("*") if path.is_file() and path.suffix.lower() == ".pdf"
    }
    require(set(expected) == actual, f"Published PDF inventory differs: missing={sorted(set(expected) - actual)[:8]}, extra={sorted(actual - set(expected))[:8]}")
    for url, row in expected.items():
        path = inside(repo_root / "public", url, "published PDF")
        require(path.is_file(), f"Missing published PDF: {url}")
        compare_info(row, pdf_info(path, verify_text), url, verify_text)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--source-root", type=Path, default=DEFAULT_SOURCE_ROOT, help="Common parent of 初中数学 and 高中数学")
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parent.parent, help="Repository containing content/source-manifest.json")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="Read-only check of manifest, source files, public PDFs, and catalog")
    mode.add_argument("--inventory", action="store_true", help="Print measured source metadata for editorial review, without changing any file")
    parser.add_argument("--published-only", action="store_true", help="With --check, verify committed PDFs without the original source drive")
    parser.add_argument("--verify-text", action="store_true", help="Also recompute the reviewed answer-marker counts; PDF text is never saved")
    args = parser.parse_args()
    if args.published_only and not args.check:
        parser.error("--published-only requires --check")
    repo_root = args.repo_root.resolve()
    source_root = args.source_root.resolve()
    manifest = read_json(repo_root / "content" / "source-manifest.json")
    if args.inventory:
        inventory = source_inventory(manifest, source_root, args.verify_text)
        print(json_text([
            {"collectionId": key[0], "originalPath": key[1], **info}
            for key, (_, info) in inventory.items()
        ]), end="")
        return 0
    validate_manifest(manifest)
    total_stats = statistics(manifest["files"], manifest["topics"])
    require(manifest.get("stats") == total_stats, "Manifest statistics are stale; recalculate the source and unique-file totals")
    for collection_id in COLLECTION_IDS:
        stats = statistics(
            [row for row in manifest["files"] if row["collectionId"] == collection_id],
            [row for row in manifest["topics"] if row["collectionId"] == collection_id],
        )
        require(manifest.get("collectionStats", {}).get(collection_id) == stats, f"{collection_id}: manifest statistics are stale")
    catalog = make_catalog(manifest)
    catalog_path = repo_root / "src" / "data" / "learning" / "catalog.json"
    if not args.published_only:
        inventory = source_inventory(manifest, source_root, args.verify_text)
        check_sources(manifest, inventory, args.verify_text)
        if not args.check:
            copy_materials(manifest, inventory, repo_root)
            atomic_text(catalog_path, json_text(catalog))
    check_published(manifest, repo_root, args.verify_text)
    require(read_json(catalog_path) == catalog, "catalog.json differs from its reviewed source manifest; rerun the importer")
    verb = "Verified" if args.check else "Imported"
    print(f"{verb} {total_stats['sourceFiles']} sources → {total_stats['uniqueFiles']} unique PDFs; "
          f"{total_stats['topics']} topics; {total_stats['pages']} unique-file pages; "
          f"{total_stats['bytes']} bytes; {total_stats['pairedTopics']} reciprocal pairs; "
          f"{total_stats['unpairedTopics']} topics without a separate solution.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ImportFailure, OSError, KeyError, TypeError) as error:
        print(f"Material import failed: {error}", file=sys.stderr)
        raise SystemExit(1)
