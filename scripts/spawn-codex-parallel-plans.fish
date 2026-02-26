#!/usr/bin/env fish

set -g DEFAULT_PROFILE regression-hotfix
set -g DEFAULT_LAYOUT tiled
set -g DEFAULT_MODE interactive
set -g DEFAULT_PLAN_IDS 067 068 069 070 071 072 073 074 075 076 077 078 079 080
set -g DATAMATRIX_PROFILE datamatrix-v2
set -g DATAMATRIX_SHARD_FILE scripts/tmux/datamatrix-v2-shards.tsv

function print_usage
    set -l script_name (status filename)
    echo "Usage: $script_name [options] [PLAN_ID ...]"
    echo
    echo "Create a tmux session with one pane per plan and launch Codex workers."
    echo
    echo "Options:"
    echo "  -h, --help                   Show help"
    echo "  -d, --dry-run                Print actions without creating tmux/worktrees"
    echo "  -n, --no-attach              Do not attach to tmux session"
    echo "  -s, --session NAME           Override tmux session name"
    echo "  -p, --profile NAME           Profile: regression-hotfix | datamatrix-v2"
    echo "  -m, --mode MODE              Worker mode: interactive | exec (default: interactive)"
    echo "  -l, --layout LAYOUT          tmux layout (default: tiled)"
    echo "      --plans ID [ID ...]      Optional explicit plan ids (also accepts positional IDs)"
    echo
    echo "Examples:"
    echo "  $script_name"
    echo "  $script_name --profile datamatrix-v2"
    echo "  $script_name --profile datamatrix-v2 --plans 081 082 --dry-run"
    echo "  $script_name --mode exec 067 070 075"
end

function fail --argument-names msg
    echo "$msg"
    exit 1
end

function regression_plan_slug --argument-names id
    switch $id
        case 067
            echo runtime-recovery
        case 068
            echo plugin-studio-tests
        case 069
            echo admin-route-tabs
        case 070
            echo autoform-record
        case 071
            echo navigation-link
        case 072
            echo chat-hook
        case 073
            echo inline-citation
        case 074
            echo tiptap-link-bubble
        case 075
            echo autokanban-status
        case 076
            echo derive-row
        case 077
            echo order-kanban
        case 078
            echo admin-finance-compat
        case 079
            echo v0-chat-wizard
        case 080
            echo plugin-schema-contract
        case '*'
            return 1
    end
end

function load_profile_rows --argument-names profile repo_root
    switch $profile
        case regression-hotfix
            for id in $DEFAULT_PLAN_IDS
                set -l slug (regression_plan_slug $id)
                if test $status -ne 0
                    continue
                end
                set -l plan_file (find "$repo_root/PLANS" -maxdepth 1 -type f -name "$id-*.md" | sort | head -n 1)
                if test -z "$plan_file"
                    continue
                end
                set -l plan_basename (basename "$plan_file")
                echo "$id\t$slug\t$plan_basename\tcodex/plan-$id-$slug\t.parallel/$id\toutput/parallel/$id-$slug.md\t"
            end
        case $DATAMATRIX_PROFILE
            set -l shard_file "$repo_root/$DATAMATRIX_SHARD_FILE"
            if not test -f "$shard_file"
                fail "Missing shard registry: $DATAMATRIX_SHARD_FILE"
            end
            while read -l line
                if test -z "$line"
                    continue
                end
                if string match -qr '^\s*#' -- "$line"
                    continue
                end
                if string match -qr '^plan_id\t' -- "$line"
                    continue
                end
                echo "$line"
            end < "$shard_file"
        case '*'
            fail "Unsupported profile: $profile"
    end
end

function find_row_by_plan_id --argument-names plan_id
    for row in $argv[2..-1]
        set -l cols (string split \t -- "$row")
        if test (count $cols) -lt 7
            continue
        end
        if test "$cols[1]" = "$plan_id"
            echo "$row"
            return 0
        end
    end
    return 1
end

function parse_args
    set -g _arg_help 0
    set -g _arg_dry_run 0
    set -g _arg_attach 1
    set -g _arg_profile $DEFAULT_PROFILE
    set -g _arg_mode $DEFAULT_MODE
    set -g _arg_layout $DEFAULT_LAYOUT
    set -g _arg_session ""
    set -g _arg_plan_ids
    set -g _arg_positional_plan_ids

    set -l i 1
    while test $i -le (count $argv)
        set -l token $argv[$i]
        switch $token
            case -h --help
                set -g _arg_help 1
            case -d --dry-run
                set -g _arg_dry_run 1
            case -n --no-attach
                set -g _arg_attach 0
            case -s --session
                set i (math $i + 1)
                if test $i -gt (count $argv)
                    fail "--session requires a value"
                end
                set -g _arg_session $argv[$i]
            case -p --profile
                set i (math $i + 1)
                if test $i -gt (count $argv)
                    fail "--profile requires a value"
                end
                set -g _arg_profile $argv[$i]
            case -m --mode
                set i (math $i + 1)
                if test $i -gt (count $argv)
                    fail "--mode requires a value"
                end
                set -g _arg_mode $argv[$i]
            case -l --layout
                set i (math $i + 1)
                if test $i -gt (count $argv)
                    fail "--layout requires a value"
                end
                set -g _arg_layout $argv[$i]
            case --plans
                set i (math $i + 1)
                if test $i -gt (count $argv)
                    fail "--plans requires at least one id"
                end
                while test $i -le (count $argv)
                    set -l plan_token $argv[$i]
                    if string match -qr '^-' -- "$plan_token"
                        set i (math $i - 1)
                        break
                    end
                    set -a _arg_plan_ids $plan_token
                    set i (math $i + 1)
                end
                if test (count $_arg_plan_ids) -eq 0
                    fail "--plans requires at least one id"
                end
            case --profile=* --session=* --mode=* --layout=*
                set -l pair (string split -m1 '=' -- "$token")
                set -l key $pair[1]
                set -l value $pair[2]
                switch $key
                    case --profile
                        set -g _arg_profile $value
                    case --session
                        set -g _arg_session $value
                    case --mode
                        set -g _arg_mode $value
                    case --layout
                        set -g _arg_layout $value
                end
            case -\*
                fail "Unknown option: $token"
            case '*'
                set -a _arg_positional_plan_ids $token
        end
        set i (math $i + 1)
    end
end

parse_args $argv

if test $_arg_help -eq 1
    print_usage
    exit 0
end

if not contains -- $_arg_mode interactive exec
    fail "--mode must be one of: interactive, exec"
end

if not contains -- $_arg_profile regression-hotfix $DATAMATRIX_PROFILE
    fail "--profile must be one of: regression-hotfix, $DATAMATRIX_PROFILE"
end

if test $_arg_profile = $DATAMATRIX_PROFILE
    if test "$_arg_layout" != tiled
        fail "--layout must be tiled for profile $DATAMATRIX_PROFILE"
    end
end

if not type -q codex
    fail "codex CLI not found in PATH"
end

if not type -q tmux
    fail "tmux not found in PATH"
end

set -l repo_root (git rev-parse --show-toplevel 2>/dev/null)
if test -z "$repo_root"
    fail "Run this script inside a git repository"
end

cd "$repo_root"

set -l available_rows (load_profile_rows "$_arg_profile" "$repo_root")
if test (count $available_rows) -eq 0
    fail "No shards found for profile $_arg_profile"
end

set -l requested_ids
if test (count $_arg_plan_ids) -gt 0
    set requested_ids $_arg_plan_ids
else if test (count $_arg_positional_plan_ids) -gt 0
    set requested_ids $_arg_positional_plan_ids
else
    for row in $available_rows
        set -l cols (string split \t -- "$row")
        set -a requested_ids $cols[1]
    end
end

set -l filtered_rows
for id in $requested_ids
    set -l row (find_row_by_plan_id "$id" $available_rows)
    if test $status -ne 0
        set -l supported_ids
        for available_row in $available_rows
            set -l parts (string split \t -- "$available_row")
            set -a supported_ids $parts[1]
        end
        fail "Unsupported plan id for profile $_arg_profile: $id (supported: $supported_ids)"
    end
    set -a filtered_rows "$row"
end

set -l integration_branch codex/regression-integration
if test $_arg_profile = $DATAMATRIX_PROFILE
    set integration_branch codex/dm2-integration
end

if not git show-ref --verify --quiet "refs/heads/$integration_branch"
    if test $_arg_dry_run -eq 1
        echo "[DRY RUN] would create branch $integration_branch from current HEAD"
    else
        git branch "$integration_branch" >/dev/null 2>&1
        if test $status -ne 0
            fail "Failed to create local branch: $integration_branch"
        end
    end
end

set -l profile_safe (string replace -a '/' '-' -- "$_arg_profile")
set -l session_name "codex-$profile_safe-"(date +%Y%m%d-%H%M%S)
if test -n "$_arg_session"
    set session_name $_arg_session
end

mkdir -p \
    "$repo_root/.parallel" \
    "$repo_root/.parallel/logs" \
    "$repo_root/.parallel/logs/$profile_safe" \
    "$repo_root/.parallel/prompts" \
    "$repo_root/.parallel/prompts/$profile_safe" \
    "$repo_root/output/parallel"

if test $_arg_profile = $DATAMATRIX_PROFILE
    mkdir -p "$repo_root/output/parallel/datamatrix-v2"
end

set -l plan_ids
set -l plan_slugs
set -l plan_branches
set -l plan_worktrees
set -l plan_files
set -l plan_prompt_files
set -l plan_log_files
set -l plan_artifacts
set -l plan_depends_on

for row in $filtered_rows
    set -l cols (string split \t -- "$row")
    if test (count $cols) -lt 7
        echo "Skipping malformed shard row: $row"
        continue
    end

    set -l id $cols[1]
    set -l slug $cols[2]
    set -l plan_file_rel $cols[3]
    set -l branch $cols[4]
    set -l worktree_rel $cols[5]
    set -l artifact_rel $cols[6]
    set -l depends_on $cols[7]

    set -l plan_file "$repo_root/PLANS/$plan_file_rel"
    if not test -f "$plan_file"
        echo "[$id] missing plan file: PLANS/$plan_file_rel; skipping"
        continue
    end

    set -l worktree "$repo_root/$worktree_rel"
    if not test -d "$worktree"
        if git show-ref --verify --quiet "refs/heads/$branch"
            if test $_arg_dry_run -eq 1
                echo "[$id] [DRY RUN] would create worktree from existing branch $branch"
            else
                echo "[$id] creating worktree from existing branch $branch"
                git worktree add "$worktree" "$branch" >/dev/null
            end
        else
            if test $_arg_dry_run -eq 1
                echo "[$id] [DRY RUN] would create worktree $branch from $integration_branch"
            else
                echo "[$id] creating worktree $branch from $integration_branch"
                git worktree add "$worktree" -b "$branch" "$integration_branch" >/dev/null
            end
        end

        if test $status -ne 0
            echo "[$id] failed to create worktree; skipping"
            continue
        end
    end

    if test $_arg_dry_run -eq 0
        if not test -e "$worktree/output"
            ln -s "$repo_root/output" "$worktree/output"
        end
        mkdir -p "$worktree/PLANS"
        cp "$plan_file" "$worktree/PLANS/"(basename "$plan_file")
    end

    set -l plan_basename (basename "$plan_file")
    set -l worker_plan "$worktree/PLANS/$plan_basename"
    set -l prompt_file "$repo_root/.parallel/prompts/$profile_safe/$id.prompt.txt"
    set -l log_file "$repo_root/.parallel/logs/$profile_safe/$id.log"

    printf "%s\n" \
        "Execute $worker_plan end-to-end." \
        "" \
        "Rules:" \
        "- Follow Exclusive Write Scope only." \
        "- Keep changes small, non-breaking, and reversible." \
        "- Run verification commands listed in the plan." \
        "- Write progress continuously to $artifact_rel." \
        "- Record blockers and integration risks in that artifact." \
        "- Respect dependency hints: $depends_on." \
        "- End by writing status=merged/pending_merge plus verification summary." \
        > "$prompt_file"

    set -a plan_ids $id
    set -a plan_slugs $slug
    set -a plan_branches $branch
    set -a plan_worktrees $worktree
    set -a plan_files $plan_file
    set -a plan_prompt_files $prompt_file
    set -a plan_log_files $log_file
    set -a plan_artifacts $artifact_rel
    set -a plan_depends_on $depends_on
end

if test (count $plan_ids) -eq 0
    fail "No runnable plans found for profile $_arg_profile"
end

set -l manifest "$repo_root/output/parallel/codex-workers.tsv"
if test $_arg_profile = $DATAMATRIX_PROFILE
    set manifest "$repo_root/output/parallel/datamatrix-v2-workers.tsv"
end

if test $_arg_dry_run -eq 0
    printf "plan_id\tpane_id\tbranch\tworktree\tplan\tmode\tlog\tartifact\tdepends_on\n" > "$manifest"
end

if tmux has-session -t "$session_name" >/dev/null 2>&1
    fail "tmux session already exists: $session_name (choose a different --session)"
end

if test $_arg_dry_run -eq 1
    echo
    echo "[DRY RUN] profile: $_arg_profile"
    echo "[DRY RUN] mode: $_arg_mode"
    echo "[DRY RUN] layout: $_arg_layout"
    echo "[DRY RUN] session: $session_name"
    echo "[DRY RUN] panes: "(count $plan_ids)
    for i in (seq (count $plan_ids))
        set -l id $plan_ids[$i]
        set -l branch $plan_branches[$i]
        set -l worktree $plan_worktrees[$i]
        set -l prompt_file $plan_prompt_files[$i]
        set -l log_file $plan_log_files[$i]
        set -l artifact $plan_artifacts[$i]
        if test "$_arg_mode" = interactive
            set -l kickoff_prompt (string replace -a '\n' ' ' -- (string collect < "$prompt_file"))
            echo "[$id] branch=$branch"
            echo "  codex --dangerously-bypass-approvals-and-sandbox --search --no-alt-screen -C '$worktree' \"$kickoff_prompt\""
        else
            echo "[$id] branch=$branch"
            echo "  codex exec --dangerously-bypass-approvals-and-sandbox --search -C '$worktree' - < '$prompt_file' 2>&1 | tee '$log_file'"
        end
        echo "  artifact: $artifact"
    end
    exit 0
end

tmux new-session -d -s "$session_name" -c "$repo_root"
tmux set-option -t "$session_name" remain-on-exit on >/dev/null

set -l pane_ids (tmux list-panes -t "$session_name:0" -F '#{pane_id}')
while test (count $pane_ids) -lt (count $plan_ids)
    set -l new_pane (tmux split-window -d -t "$session_name:0" -c "$repo_root" -P -F '#{pane_id}')
    set -a pane_ids $new_pane
end

tmux select-layout -t "$session_name:0" "$_arg_layout" >/dev/null

for i in (seq (count $plan_ids))
    set -l id $plan_ids[$i]
    set -l pane_id $pane_ids[$i]
    set -l branch $plan_branches[$i]
    set -l worktree $plan_worktrees[$i]
    set -l prompt_file $plan_prompt_files[$i]
    set -l log_file $plan_log_files[$i]
    set -l artifact $plan_artifacts[$i]
    set -l plan_file $plan_files[$i]
    set -l depends_on $plan_depends_on[$i]

    printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n" \
        "$id" "$pane_id" "$branch" "$worktree" "$plan_file" "$_arg_mode" "$log_file" "$repo_root/$artifact" "$depends_on" >> "$manifest"

    tmux send-keys -t "$pane_id" "cd '$repo_root'" C-m
    tmux send-keys -t "$pane_id" "echo '[$id] branch=$branch'" C-m
    tmux send-keys -t "$pane_id" "echo '[$id] plan=$plan_file'" C-m

    if test "$_arg_mode" = interactive
        set -l kickoff_prompt (string replace -a '\n' ' ' -- (string collect < "$prompt_file"))
        tmux send-keys -t "$pane_id" "cd '$worktree'" C-m
        tmux send-keys -t "$pane_id" "codex --dangerously-bypass-approvals-and-sandbox --search --no-alt-screen -C '$worktree' \"$kickoff_prompt\"" C-m
    else
        : > "$log_file"
        tmux pipe-pane -o -t "$pane_id" "cat >> '$log_file'"
        tmux send-keys -t "$pane_id" "codex exec --dangerously-bypass-approvals-and-sandbox --search -C '$worktree' - < '$prompt_file' 2>&1 | tee '$log_file'" C-m
        tmux send-keys -t "$pane_id" "echo ''" C-m
        tmux send-keys -t "$pane_id" "echo '[$id] finished. Artifact: $artifact'" C-m
    end
end

echo "tmux session created: $session_name"
echo "Profile: $_arg_profile"
echo "Workers started: "(count $plan_ids)
echo "Mode: $_arg_mode"
echo "Manifest: $manifest"
echo "Browser output dir: $repo_root/output/parallel"

if test $_arg_attach -eq 1
    if set -q TMUX
        tmux switch-client -t "$session_name"
    else
        tmux attach-session -t "$session_name"
    end
else
    echo "Attach later with: tmux attach -t $session_name"
end
