#!/usr/bin/env python3
"""Extract a Supabase-compatible restore SQL from a cluster text dump."""

from __future__ import annotations

import re
import sys
from pathlib import Path

PUBLIC_TABLES = [
    "reminders",
    "medication_logs",
    "medications",
    "prescriptions",
    "appointments",
    "ai_conversations",
    "conversation_notes",
    "conversations",
    "health_records",
    "profiles",
]

COPY_ORDER = [
    "COPY auth.users ",
    "COPY auth.identities ",
    "COPY storage.buckets ",
    "COPY public.profiles ",
    "COPY public.prescriptions ",
    "COPY public.medications ",
    "COPY public.appointments ",
    "COPY public.ai_conversations ",
    "COPY public.conversation_notes ",
    "COPY public.conversations ",
    "COPY public.health_records ",
    "COPY public.medication_logs ",
    "COPY public.reminders ",
    "COPY storage.objects ",
]


def extract_create_public_tables(content: str) -> str:
    pattern = re.compile(
        r"(CREATE TABLE public\.\w+[\s\S]*?^ALTER TABLE public\.\w+ OWNER TO postgres;)",
        re.MULTILINE,
    )
    return "\n\n".join(match.group(1) for match in pattern.finditer(content))


def extract_copy_blocks(content: str) -> str:
    lines = content.splitlines()
    blocks_by_prefix: dict[str, str] = {}
    i = 0
    while i < len(lines):
        line = lines[i]
        matched_prefix = next((prefix for prefix in COPY_ORDER if line.startswith(prefix)), None)
        if matched_prefix:
            block = [line]
            i += 1
            while i < len(lines):
                block.append(lines[i])
                if lines[i].strip() == r"\.":
                    break
                i += 1
            blocks_by_prefix[matched_prefix] = "\n".join(block)
        i += 1

    ordered_blocks = [blocks_by_prefix[prefix] for prefix in COPY_ORDER if prefix in blocks_by_prefix]
    normalized_blocks = [
        normalize_storage_objects_copy(block) if block.startswith("COPY storage.objects ") else block
        for block in ordered_blocks
    ]
    return "\n\n".join(normalized_blocks)


def normalize_storage_objects_copy(block: str) -> str:
    lines = block.splitlines()
    header = lines[0].replace(", level", "").replace(
        "(id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata, level)",
        "(id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata)",
    )
    data_lines = [header]
    for line in lines[1:]:
        if line.strip() == r"\.":
            data_lines.append(line)
            break
        parts = line.split("\t")
        if parts:
            data_lines.append("\t".join(parts[:-1]))
    return "\n".join(data_lines)


def extract_public_constraints(content: str) -> str:
    patterns = [
        r"ALTER TABLE ONLY public\.[\s\S]*?;",
        r"CREATE INDEX idx_profiles_user_id[\s\S]*?;",
    ]
    chunks: list[str] = []
    for pattern in patterns:
        chunks.extend(re.findall(pattern, content, re.MULTILINE))
    return "\n\n".join(chunks)


def extract_public_policies(content: str) -> str:
    pattern = re.compile(
        r'CREATE POLICY "[^"]+" ON public\.[\s\S]*?;',
        re.MULTILINE,
    )
    return "\n\n".join(match.group(0) for match in pattern.finditer(content))


def extract_storage_policies(content: str) -> str:
    pattern = re.compile(
        r'CREATE POLICY "[^"]+" ON storage\.objects[\s\S]*?;',
        re.MULTILINE,
    )
    return "\n\n".join(match.group(0) for match in pattern.finditer(content))


def extract_enable_rls(content: str) -> str:
    pattern = re.compile(r"ALTER TABLE public\.\w+ ENABLE ROW LEVEL SECURITY;", re.MULTILINE)
    return "\n".join(match.group(0) for match in pattern.finditer(content))


def build_restore_sql(content: str) -> str:
    drop_statements = "\n".join(
        f"DROP TABLE IF EXISTS public.{table} CASCADE;" for table in PUBLIC_TABLES
    )

    policy_names = re.findall(
        r'CREATE POLICY "([^"]+)" ON (public\.\w+|storage\.objects)',
        content,
    )
    drop_policies = "\n".join(
        f'DROP POLICY IF EXISTS "{name}" ON {table};' for name, table in policy_names
    )

    sections = [
        "SET client_encoding = 'UTF8';",
        "SET standard_conforming_strings = on;",
        "SET session_replication_role = replica;",
        "",
        "-- Clean existing app schema",
        drop_statements,
        "",
        "-- Remove storage metadata for app buckets",
        "DELETE FROM storage.objects WHERE bucket_id IN ('profile-pics', 'reports');",
        "DELETE FROM storage.buckets WHERE id IN ('profile-pics', 'reports');",
        "",
        "-- Remove auth rows that will be restored",
        "DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'aronfernando39@gmail.com');",
        "DELETE FROM auth.users WHERE email = 'aronfernando39@gmail.com';",
        "",
        "-- Create tables",
        extract_create_public_tables(content),
        "",
        "-- Load data",
        extract_copy_blocks(content),
        "",
        "-- Constraints and indexes",
        extract_public_constraints(content),
        "",
        "-- Row level security",
        drop_policies,
        extract_enable_rls(content),
        "",
        extract_public_policies(content),
        "",
        extract_storage_policies(content),
        "",
        "SET session_replication_role = DEFAULT;",
    ]
    return "\n".join(section for section in sections if section)


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: extract_supabase_restore.py <input.backup> <output.sql>", file=sys.stderr)
        return 1

    source = Path(sys.argv[1])
    target = Path(sys.argv[2])
    content = source.read_text(encoding="utf-8", errors="replace")
    target.write_text(build_restore_sql(content), encoding="utf-8")
    print(f"Wrote restore SQL to {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
