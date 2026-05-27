#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Copy full repo so commands can reference helper scripts
PLUGIN_DIR="$HOME/.claude/plugins/codescape"
echo "Copying plugin to $PLUGIN_DIR..."
rm -rf "$PLUGIN_DIR"
cp -r "$SCRIPT_DIR" "$PLUGIN_DIR"

# Install as user-level commands (~/.claude/commands/*.md)
# These become /codescape and /codescape-dashboard in every Claude Code session
COMMANDS_DIR="$HOME/.claude/commands"
mkdir -p "$COMMANDS_DIR"
cp "$SCRIPT_DIR/skills/codescape/SKILL.md"           "$COMMANDS_DIR/codescape.md"
cp "$SCRIPT_DIR/skills/codescape-dashboard/SKILL.md" "$COMMANDS_DIR/codescape-dashboard.md"

echo ""
echo "Done! /codescape and /codescape-dashboard are now available in Claude Code."
echo "(No reload needed — commands are picked up automatically.)"
