# SnapBack CLI fish completion
# Install: cp snap.fish ~/.config/fish/completions/
# Or: snap completion fish > ~/.config/fish/completions/snap.fish

# Disable file completion by default
complete -c snap -f
complete -c snapback -f

# Main commands
complete -c snap -n __fish_use_subcommand -a login -d 'Login to SnapBack'
complete -c snap -n __fish_use_subcommand -a logout -d 'Logout from SnapBack'
complete -c snap -n __fish_use_subcommand -a whoami -d 'Show current user'
complete -c snap -n __fish_use_subcommand -a init -d 'Initialize SnapBack for this workspace'
complete -c snap -n __fish_use_subcommand -a status -d 'Show workspace health and status'
complete -c snap -n __fish_use_subcommand -a fix -d 'Auto-fix detected issues'
complete -c snap -n __fish_use_subcommand -a protect -d 'Manage file protection'
complete -c snap -n __fish_use_subcommand -a session -d 'Manage development sessions'
complete -c snap -n __fish_use_subcommand -a context -d 'Get relevant context'
complete -c snap -n __fish_use_subcommand -a validate -d 'Run validation pipeline'
complete -c snap -n __fish_use_subcommand -a stats -d 'Show learning statistics'
complete -c snap -n __fish_use_subcommand -a learn -d 'Record learnings'
complete -c snap -n __fish_use_subcommand -a patterns -d 'Manage patterns'
complete -c snap -n __fish_use_subcommand -a watch -d 'Watch for file changes'
complete -c snap -n __fish_use_subcommand -a tools -d 'Configure AI tools'
complete -c snap -n __fish_use_subcommand -a mcp -d 'Run MCP server'
complete -c snap -n __fish_use_subcommand -a config -d 'Manage configuration'
complete -c snap -n __fish_use_subcommand -a doctor -d 'Diagnose configuration'
complete -c snap -n __fish_use_subcommand -a upgrade -d 'Check for updates'
complete -c snap -n __fish_use_subcommand -a wizard -d 'Interactive setup wizard'
complete -c snap -n __fish_use_subcommand -a undo -d 'Undo last operation'
complete -c snap -n __fish_use_subcommand -a alias -d 'Manage command aliases'
complete -c snap -n __fish_use_subcommand -a analyze -d 'Analyze file risk'
complete -c snap -n __fish_use_subcommand -a snapshot -d 'Create a snapshot'
complete -c snap -n __fish_use_subcommand -a list -d 'List snapshots'
complete -c snap -n __fish_use_subcommand -a check -d 'Pre-commit check'
complete -c snap -n __fish_use_subcommand -a interactive -d 'Interactive mode'

# protect subcommands
complete -c snap -n '__fish_seen_subcommand_from protect' -a add -d 'Add to protection'
complete -c snap -n '__fish_seen_subcommand_from protect' -a remove -d 'Remove from protection'
complete -c snap -n '__fish_seen_subcommand_from protect' -a list -d 'List protected files'
complete -c snap -n '__fish_seen_subcommand_from protect' -a env -d 'Protect .env files'
complete -c snap -n '__fish_seen_subcommand_from protect' -a config -d 'Protect config files'

# session subcommands
complete -c snap -n '__fish_seen_subcommand_from session' -a start -d 'Start session'
complete -c snap -n '__fish_seen_subcommand_from session' -a status -d 'Session status'
complete -c snap -n '__fish_seen_subcommand_from session' -a end -d 'End session'
complete -c snap -n '__fish_seen_subcommand_from session' -a history -d 'Session history'

# tools subcommands
complete -c snap -n '__fish_seen_subcommand_from tools' -a configure -d 'Configure AI tools'
complete -c snap -n '__fish_seen_subcommand_from tools' -a status -d 'Show tool status'

# mcp subcommands
complete -c snap -n '__fish_seen_subcommand_from mcp' -a serve -d 'Start MCP server'
complete -c snap -n '__fish_seen_subcommand_from mcp' -a status -d 'Show MCP status'

# config subcommands
complete -c snap -n '__fish_seen_subcommand_from config' -a list -d 'List all config'
complete -c snap -n '__fish_seen_subcommand_from config' -a get -d 'Get config value'
complete -c snap -n '__fish_seen_subcommand_from config' -a set -d 'Set config value'
complete -c snap -n '__fish_seen_subcommand_from config' -a unset -d 'Unset config value'
complete -c snap -n '__fish_seen_subcommand_from config' -a path -d 'Show config paths'
complete -c snap -n '__fish_seen_subcommand_from config' -a keys -d 'Show config keys'

# alias subcommands
complete -c snap -n '__fish_seen_subcommand_from alias' -a list -d 'List all aliases'
complete -c snap -n '__fish_seen_subcommand_from alias' -a set -d 'Set an alias'
complete -c snap -n '__fish_seen_subcommand_from alias' -a delete -d 'Delete an alias'

# Options for init
complete -c snap -n '__fish_seen_subcommand_from init' -s f -l force -d 'Reinitialize'
complete -c snap -n '__fish_seen_subcommand_from init' -l no-sync -d 'No server sync'

# Options for status
complete -c snap -n '__fish_seen_subcommand_from status' -l json -d 'JSON output'

# Options for fix
complete -c snap -n '__fish_seen_subcommand_from fix' -l dry-run -d 'Show what would be fixed'
complete -c snap -n '__fish_seen_subcommand_from fix' -l all -d 'Fix all issues'
complete -c snap -n '__fish_seen_subcommand_from fix' -l list -d 'List available fixes'

# Options for doctor
complete -c snap -n '__fish_seen_subcommand_from doctor' -l fix -d 'Auto-fix issues'
complete -c snap -n '__fish_seen_subcommand_from doctor' -l json -d 'JSON output'
complete -c snap -n '__fish_seen_subcommand_from doctor' -l verbose -d 'Verbose output'

# Options for upgrade
complete -c snap -n '__fish_seen_subcommand_from upgrade' -l check -d 'Only check'
complete -c snap -n '__fish_seen_subcommand_from upgrade' -l force -d 'Force reinstall'
complete -c snap -n '__fish_seen_subcommand_from upgrade' -l canary -d 'Canary version'

# Options for wizard
complete -c snap -n '__fish_seen_subcommand_from wizard' -l force -d 'Run even if completed'

# Options for undo
complete -c snap -n '__fish_seen_subcommand_from undo' -l list -d 'List undoable operations'
complete -c snap -n '__fish_seen_subcommand_from undo' -l dry-run -d 'Show what would be undone'

# Options for check
complete -c snap -n '__fish_seen_subcommand_from check' -s s -l snapshot -d 'Create snapshot'
complete -c snap -n '__fish_seen_subcommand_from check' -s q -l quiet -d 'Quiet mode'
complete -c snap -n '__fish_seen_subcommand_from check' -s a -l all -d 'Check all files'

# Options for snapshot
complete -c snap -n '__fish_seen_subcommand_from snapshot' -s m -l message -d 'Snapshot message'
complete -c snap -n '__fish_seen_subcommand_from snapshot' -s f -l files -d 'Files to include'

# Options for analyze (file completion)
complete -c snap -n '__fish_seen_subcommand_from analyze' -F

# Alias completions
complete -c snapback -w snap
