import { InternalModule } from "../internalModule";
import { LogError } from "utils/log";
import type { TFolder } from "obsidian";
import {
    FileSystemAdapter,
    getAllTags,
    normalizePath,
    parseLinktext,
    Platform,
    resolveSubpath,
    TFile
} from "obsidian";
import type { ModuleName } from "editor/tpDocumentation";
import { Ok, type StatusResult } from "../../../../lib/result";
import {
    InternalError,
    InvalidArgumentError,
    NotFoundError,
    type StatusError
} from "../../../../lib/status_error";

export const DEPTH_LIMIT = 10;

export class InternalModuleFile extends InternalModule {
    public name: ModuleName = "file";
    private _includeDepth = 0;
    private _createNewDepth = 0;
    private _linkpathRegex = new RegExp("^\\[\\[(.*)\\]\\]$");

    public async teardown(): Promise<void> {}

    public override async createStaticTemplates(): Promise<StatusResult<StatusError>> {
        this.staticFunctions.set("creationDate", this.generateCreationDate());
        this.staticFunctions.set("createNew", this.generateCreateNew());
        this.staticFunctions.set("cursor", this.generateCursor());
        this.staticFunctions.set("cursorAppend", this.generateCursorAppend());
        this.staticFunctions.set("exists", this.generateExists());
        this.staticFunctions.set("findTfile", this.generateFindTfile());
        this.staticFunctions.set("folder", this.generateFolder());
        this.staticFunctions.set("include", this.generateInclude());
        this.staticFunctions.set("lastModifiedDate", this.generateLastModifiedDate());
        this.staticFunctions.set("move", this.generateMove());
        this.staticFunctions.set("path", this.generatePath());
        this.staticFunctions.set("rename", this.generateRename());
        this.staticFunctions.set("selection", this.generateSelection());
        return Ok();
    }

    public override async createDynamicTemplates(): Promise<StatusResult<StatusError>> {
        this.dynamicFunctions.set("content", await this.generateContent());
        this.dynamicFunctions.set("tags", this.generateTags());
        this.dynamicFunctions.set("title", this.generateTitle());
        return Ok();
    }

    private async generateContent(): Promise<string> {
        return this.app.vault.read(this.config.targetFile);
    }

    private generateCreateNew(): (
        template: TFile | string,
        filename: string,
        openNew: boolean,
        folder?: TFolder | string
    ) => Promise<TFile | undefined> {
        return async (
            template: TFile | string,
            filename: string,
            openNew = false,
            folder?: TFolder | string
        ) => {
            this._createNewDepth += 1;
            if (this._createNewDepth > DEPTH_LIMIT) {
                this._createNewDepth = 0;
                throw InvalidArgumentError("Reached create_new depth limit (max = 10)");
            }

            const newFile = await this.plugin.templater.createNewNoteFromTemplate(
                template,
                folder,
                filename,
                openNew
            );
            if (!newFile.ok) {
                throw newFile.err;
            }

            this._createNewDepth -= 1;

            return newFile.safeUnwrap();
        };
    }

    private generateCreationDate(): (format?: string) => string {
        return (format = "YYYY-MM-DD HH:mm") => {
            return window.moment(this.config.targetFile.stat.ctime).format(format);
        };
    }

    private generateCursor(): (order?: number) => string {
        return (order?: number) => {
            // Hack to prevent empty output
            return `<% tp.file.cursor(${order ?? ""}) %>`;
        };
    }

    private generateCursorAppend(): (content: string) => void {
        return (content: string): string | undefined => {
            const activeEditor = this.app.workspace.activeEditor;
            if (!activeEditor || !activeEditor.editor) {
                LogError(NotFoundError("No active editor, can't append to cursor."));
                return;
            }

            const editor = activeEditor.editor;
            const doc = editor.getDoc();
            doc.replaceSelection(content);
            return "";
        };
    }

    private generateExists(): (filepath: string) => Promise<boolean> {
        return async (filepath: string) => {
            const path = normalizePath(filepath);
            return this.app.vault.exists(path);
        };
    }

    private generateFindTfile(): (filename: string) => TFile | null {
        return (filename: string) => {
            const path = normalizePath(filename);
            return this.app.metadataCache.getFirstLinkpathDest(path, "");
        };
    }

    private generateFolder(): (relative?: boolean) => string | undefined {
        return (relative = false) => {
            const parent = this.config.targetFile.parent;
            if (parent === null) {
                return undefined;
            }

            let folder;

            if (relative) {
                folder = parent.path;
            } else {
                folder = parent.name;
            }

            return folder;
        };
    }

    private generateInclude(): (include_link: string | TFile) => Promise<string> {
        return async (includeLink: string | TFile) => {
            // TODO: Add mutex for this, this may currently lead to a race condition.
            // While not very impactful, that could still be annoying.
            this._includeDepth += 1;
            if (this._includeDepth > DEPTH_LIMIT) {
                this._includeDepth -= 1;
                throw InvalidArgumentError("Reached inclusion depth limit (max = 10)");
            }

            let incFileContent: string;

            if (includeLink instanceof TFile) {
                incFileContent = await this.app.vault.read(includeLink);
            } else {
                const match = this._linkpathRegex.exec(includeLink);
                if (match === null) {
                    this._includeDepth -= 1;
                    throw InvalidArgumentError(
                        "Invalid file format, provide an obsidian link between quotes."
                    );
                }
                if (match.length < 2) {
                    throw InternalError("Not enough entries in regex match.");
                }
                const { path, subpath } = parseLinktext(match[1] as string);

                const incFile = this.app.metadataCache.getFirstLinkpathDest(path, "");
                if (!incFile) {
                    this._includeDepth -= 1;
                    throw NotFoundError(`File ${includeLink} doesn't exist`);
                }
                incFileContent = await this.app.vault.read(incFile);

                if (subpath) {
                    const cache = this.app.metadataCache.getFileCache(incFile);
                    if (cache) {
                        const result = resolveSubpath(cache, subpath);
                        if (result) {
                            incFileContent = incFileContent.slice(
                                result.start.offset,
                                result.end?.offset
                            );
                        }
                    }
                }
            }

            const parsedContent = await this.plugin.templater.parser.wrapParseAndEvaluateTemplate(
                incFileContent,
                this.plugin.templater.currentFunctionsObject
            );
            this._includeDepth -= 1;
            if (parsedContent.ok) {
                return parsedContent.val;
            }
            throw parsedContent.val;
        };
    }

    private generateLastModifiedDate(): (format?: string) => string {
        return (format = "YYYY-MM-DD HH:mm"): string => {
            return window.moment(this.config.targetFile.stat.mtime).format(format);
        };
    }

    private generateMove(): (path: string, file_to_move?: TFile) => Promise<string> {
        return async (path: string, fileToMove?: TFile) => {
            const file = fileToMove || this.config.targetFile;
            const newPath = normalizePath(`${path}.${file.extension}`);
            const dirs = newPath.replace(/\\/g, "/").split("/");
            dirs.pop(); // remove basename
            if (dirs.length) {
                const dir = dirs.join("/");
                const parentFolder = this.app.vault.getAbstractFileByPath(dir);
                if (parentFolder === null) {
                    await this.app.vault.createFolder(dir);
                }
            }
            await this.app.fileManager.renameFile(file, newPath);
            return "";
        };
    }

    private generatePath(): (relative: boolean) => string {
        return (relative = false) => {
            let vaultPath = "";
            if (Platform.isMobileApp) {
                const vaultAdapter = this.app.vault.adapter.fs.uri;
                const vaultBase = this.app.vault.adapter.basePath;
                vaultPath = `${vaultAdapter}/${vaultBase}`;
            } else {
                if (this.app.vault.adapter instanceof FileSystemAdapter) {
                    vaultPath = this.app.vault.adapter.getBasePath();
                } else {
                    throw InternalError("app.vault is not a FileSystemAdapter instance");
                }
            }

            if (relative) {
                return this.config.targetFile.path;
            }
            return `${vaultPath}/${this.config.targetFile.path}`;
        };
    }

    private generateRename(): (new_title: string) => Promise<string> {
        return async (newTitle: string) => {
            if (newTitle.match(/[\\/:]+/g)) {
                throw InvalidArgumentError(
                    "File name cannot contain any of these characters: \\ / :"
                );
            }
            const newPath = normalizePath(
                `${this.config.targetFile.parent?.path}/${newTitle}.${this.config.targetFile.extension}`
            );
            await this.app.fileManager.renameFile(this.config.targetFile, newPath);
            return "";
        };
    }

    private generateSelection(): () => string {
        return () => {
            const activeEditor = this.app.workspace.activeEditor;
            if (!activeEditor || !activeEditor.editor) {
                throw NotFoundError("Active editor is null, can't read selection.");
            }

            const editor = activeEditor.editor;
            return editor.getSelection();
        };
    }

    // TODO: Turn this into a function
    private generateTags(): string[] | null {
        const cache = this.app.metadataCache.getFileCache(this.config.targetFile);

        if (cache) {
            return getAllTags(cache);
        }
        return null;
    }

    // TODO: Turn this into a function
    private generateTitle(): string {
        return this.config.targetFile.basename;
    }
}
