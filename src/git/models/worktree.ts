import { Uri, workspace, WorkspaceFolder } from 'vscode';
import { Container } from '../../container';
import { memoize } from '../../system/decorators/memoize';
import { normalizePath, relative } from '../../system/path';
import { GitRevision } from './reference';
import type { GitStatus } from './status';

export class GitWorktree {
	static is(worktree: any): worktree is GitWorktree {
		return worktree instanceof GitWorktree;
	}

	constructor(
		public readonly main: boolean,
		public readonly type: 'bare' | 'branch' | 'detached',
		public readonly repoPath: string,
		public readonly uri: Uri,
		public readonly locked: boolean | string,
		public readonly prunable: boolean | string,
		public readonly sha?: string,
		public readonly branch?: string,
	) {}

	get opened(): boolean {
		return this.workspaceFolder?.uri.toString() === this.uri.toString();
	}

	get name(): string {
		switch (this.type) {
			case 'bare':
				return '(bare)';
			case 'detached':
				return GitRevision.shorten(this.sha);
			default:
				return this.branch || this.friendlyPath;
		}
	}

	@memoize()
	get friendlyPath(): string {
		const path = GitWorktree.getFriendlyPath(this.uri);
		return path;
	}

	@memoize()
	get workspaceFolder(): WorkspaceFolder | undefined {
		return workspace.getWorkspaceFolder(this.uri);
	}

	private _status: Promise<GitStatus | undefined> | undefined;
	getStatus(options?: { force?: boolean }): Promise<GitStatus | undefined> {
		if (this.type === 'bare') return Promise.resolve(undefined);

		if (this._status == null || options?.force) {
			this._status = Container.instance.git.getStatusForRepo(this.uri.fsPath);
		}
		return this._status;
	}

	static getFriendlyPath(uri: Uri): string {
		const folder = workspace.getWorkspaceFolder(uri);
		if (folder == null) return normalizePath(uri.fsPath);

		const relativePath = normalizePath(relative(folder.uri.fsPath, uri.fsPath));
		return relativePath.length === 0 ? folder.name : relativePath;
	}
}
