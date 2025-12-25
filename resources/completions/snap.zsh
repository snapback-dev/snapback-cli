#compdef snap snapback
# SnapBack CLI zsh completion
# Install: source ~/.snapback/completions/snap.zsh
# Or add to ~/.zshrc: source <(snap completion zsh)

_snap() {
    local -a commands
    commands=(
        'login:Login to SnapBack'
        'logout:Logout from SnapBack'
        'whoami:Show current user'
        'init:Initialize SnapBack for this workspace'
        'status:Show workspace health and status'
        'fix:Auto-fix detected issues'
        'protect:Manage file protection'
        'session:Manage development sessions'
        'context:Get relevant context before starting work'
        'validate:Run validation pipeline'
        'stats:Show learning engine statistics'
        'learn:Record learnings'
        'patterns:Manage patterns and violations'
        'watch:Watch for file changes'
        'tools:Configure AI tools'
        'mcp:Run MCP server'
        'config:Manage configuration'
        'doctor:Diagnose SnapBack configuration'
        'upgrade:Check for and install updates'
        'wizard:Interactive setup wizard'
        'undo:Undo last operation'
        'alias:Manage command aliases'
        'analyze:Analyze file risk'
        'snapshot:Create a snapshot'
        'list:List snapshots'
        'check:Pre-commit check for risky changes'
        'interactive:Interactive mode'
    )

    local -a protect_commands
    protect_commands=(
        'add:Add file or pattern to protection'
        'remove:Remove file or pattern from protection'
        'list:List protected files'
        'env:Protect all .env files'
        'config:Protect configuration files'
    )

    local -a session_commands
    session_commands=(
        'start:Start a new session'
        'status:Show session status'
        'end:End current session'
        'history:Show session history'
    )

    local -a tools_commands
    tools_commands=(
        'configure:Configure AI tools'
        'status:Show tool status'
    )

    local -a mcp_commands
    mcp_commands=(
        'serve:Start MCP server'
        'status:Show MCP status'
    )

    local -a config_commands
    config_commands=(
        'list:List all configuration'
        'get:Get a configuration value'
        'set:Set a configuration value'
        'unset:Remove a configuration value'
        'path:Show configuration paths'
        'keys:Show available configuration keys'
    )

    local -a alias_commands
    alias_commands=(
        'list:List all aliases'
        'set:Set an alias'
        'delete:Delete an alias'
    )

    _arguments -C \
        '1: :->command' \
        '2: :->subcommand' \
        '*::arg:->args'

    case $state in
        command)
            _describe -t commands 'snap commands' commands
            ;;
        subcommand)
            case $words[2] in
                protect)
                    _describe -t commands 'protect commands' protect_commands
                    ;;
                session)
                    _describe -t commands 'session commands' session_commands
                    ;;
                tools)
                    _describe -t commands 'tools commands' tools_commands
                    ;;
                mcp)
                    _describe -t commands 'mcp commands' mcp_commands
                    ;;
                config)
                    _describe -t commands 'config commands' config_commands
                    ;;
                alias)
                    _describe -t commands 'alias commands' alias_commands
                    ;;
                analyze|check)
                    _files
                    ;;
            esac
            ;;
        args)
            case $words[2] in
                init)
                    _arguments \
                        '-f[Reinitialize even if already initialized]' \
                        '--force[Reinitialize even if already initialized]' \
                        '--no-sync[Do not sync with server]'
                    ;;
                status)
                    _arguments \
                        '--json[Output as JSON]'
                    ;;
                fix)
                    _arguments \
                        '--dry-run[Show what would be fixed]' \
                        '--all[Fix all issues]' \
                        '--list[List available fixes]'
                    ;;
                doctor)
                    _arguments \
                        '--fix[Attempt to auto-fix issues]' \
                        '--json[Output as JSON]' \
                        '--verbose[Show detailed information]'
                    ;;
                upgrade)
                    _arguments \
                        '--check[Only check for updates]' \
                        '--force[Force reinstall]' \
                        '--canary[Install canary version]'
                    ;;
                wizard)
                    _arguments \
                        '--force[Run wizard even if already completed]'
                    ;;
                undo)
                    _arguments \
                        '--list[List undoable operations]' \
                        '--dry-run[Show what would be undone]'
                    ;;
                check)
                    _arguments \
                        '-s[Create snapshot if risky]' \
                        '--snapshot[Create snapshot if risky]' \
                        '-q[Quiet mode]' \
                        '--quiet[Quiet mode]' \
                        '-a[Check all files]' \
                        '--all[Check all files]'
                    ;;
                snapshot)
                    _arguments \
                        '-m[Snapshot message]:message:' \
                        '--message[Snapshot message]:message:' \
                        '-f[Files to include]:files:_files' \
                        '--files[Files to include]:files:_files'
                    ;;
            esac
            ;;
    esac
}

_snap "$@"
