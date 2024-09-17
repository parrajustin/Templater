import type { App, MarkdownPostProcessorContext, TAbstractFile } from "obsidian";
import { MarkdownView, normalizePath, TFile, TFolder } from "obsidian";
import {
    Delay,
    GenerateDynamicCommandRegex,
    GetActiveFile,
    GetFolderPathFromFilePath,
    ResolveTfile
} from "utils/utils";
import type TemplaterPlugin from "main";
import { FunctionsGenerator, FunctionsMode } from "./functions/functionsGenerator";
import { Parser } from "./parser/parser";
import { LogError } from "utils/log";
import type { StatusError } from "../lib/status_error";
import {
    InternalError,
    InvalidArgumentError,
    NotFoundError,
    PermissionDeniedError
} from "../lib/status_error";
import type { Result, StatusResult } from "../lib/result";
import { Err, Ok } from "../lib/result";
import { WrapPromise } from "../lib/wrap_promise";

export enum RunMode {
    CREATE_NEW_FROM_TEMPLATE,
    APPEND_ACTIVE_FILE,
    OVERWRITE_FILE,
    OVERWRITE_ACTIVE_FILE,
    DYNAMIC_PROCESSOR,
    STARTUP_TEMPLATE
}

/**
 * Templater config for running data.
 */
export interface RunningConfig {
    /** The template origin file. */
    templateFile?: TFile;
    /** Output target file. */
    targetFile: TFile;
    /** Run mode for the templater. */
    runMode: RunMode;
    /** Active obsidian file if any. */
    activeFile?: TFile;
}

export class Templater {
    /** The template parser. */
    public parser: Parser;
    /** Context generator for the parser. */
    public functionsGenerator: FunctionsGenerator;
    public currentFunctionsObject: Record<string, unknown>;
    public filesWithPendingTemplates: Set<string>;

    constructor(
        private _app: App,
        private _plugin: TemplaterPlugin
    ) {
        this.functionsGenerator = new FunctionsGenerator(_app, this._plugin);
        this.parser = new Parser();
    }

    public static async onFileCreation(
        templater: Templater,
        file: TAbstractFile
    ): Promise<StatusResult<StatusError>> {
        if (!(file instanceof TFile) || file.extension !== "md") {
            return Err(InvalidArgumentError("Not a markdown file."));
        }

        // Avoids template replacement when syncing template files
        const templateFolder = normalizePath(templater._plugin.settings.templatesFolder);
        if (file.path.includes(templateFolder) && templateFolder !== "/") {
            return Err(PermissionDeniedError("Avoid template files"));
        }

        // TODO: find a better way to do this
        // Currently, I have to wait for the note extractor plugin to add the file content before replacing
        await Delay(300);

        // Avoids template replacement when creating file from template without content before delay
        if (templater.filesWithPendingTemplates.has(file.path)) {
            return Err(InternalError("File "));
        }

        if (file.stat.size == 0 && templater._plugin.settings.enable_folder_templates) {
            const folderTemplateMatch = templater.getNewFileTemplateForFolder(file.parent);
            if (folderTemplateMatch === undefined || folderTemplateMatch === "") {
                return Err(
                    InvalidArgumentError(`Invalid file match for template "${folderTemplateMatch}"`)
                );
            }
            const resultFileResult = ResolveTfile(templater._app, folderTemplateMatch);
            if (!resultFileResult.ok) {
                return resultFileResult;
            }
            const templateFile: TFile = resultFileResult.safeUnwrap();
            return templater.writeTemplateToFile(templateFile, file);
        } else {
            if (file.stat.size <= 100000) {
                //https://github.com/SilentVoid13/Templater/issues/873
                await templater.overwriteFileCommands(file);
            } else {
                console.log(
                    `Templater skipped parsing ${file.path} because file size exceeds 10000`
                );
            }
        }

        return Ok();
    }

    public async setup(): Promise<void> {
        this.filesWithPendingTemplates = new Set();
        await this.parser.init();
        await this.functionsGenerator.init();
        this._plugin.registerMarkdownPostProcessor((el, ctx) =>
            this.processDynamicTemplates(el, ctx)
        );
    }

    public async createNewNoteFromTemplate(
        template: TFile | string,
        folder?: TFolder | string,
        filename?: string,
        openNewNote = true
    ): Promise<Result<TFile | undefined, StatusError>> {
        // TODO: Maybe there is an obsidian API function for that
        if (folder === undefined) {
            const newFileLocation = this._app.vault.getConfig("newFileLocation");
            switch (newFileLocation) {
                case "current": {
                    const activeFile = GetActiveFile(this._app);
                    if (activeFile.some) {
                        folder = activeFile.safeValue().parent ?? undefined;
                    }
                    break;
                }
                case "folder":
                    folder = this._app.fileManager.getNewFileParent("");
                    break;
                case "root":
                    folder = this._app.vault.getRoot();
                    break;
                default:
                    break;
            }
        }

        const extension = template instanceof TFile ? template.extension || "md" : "md";

        const possibleFolderPath = (folder instanceof TFolder ? folder.path : folder) ?? "";
        const folderCheckedPath = this._app.vault.getAvailablePath(
            normalizePath(`${possibleFolderPath}/${filename ?? "Untitled"}`),
            extension
        );
        const folderPath = GetFolderPathFromFilePath(folderCheckedPath);
        if (folderPath && !this._app.vault.getAbstractFileByPathInsensitive(folderPath)) {
            await this._app.vault.createFolder(folderPath);
        }
        const createdNoteResult = await WrapPromise<TFile>(
            this._app.vault.create(folderCheckedPath, "")
        );

        if (!createdNoteResult.ok) {
            return Err(InternalError(`Failed to create a new file in "${folderCheckedPath}".`));
        }
        const createdNote = createdNoteResult.safeUnwrap();

        const { path } = createdNote;
        this.startTemplaterTask(path);
        let runningConfig: RunningConfig;
        let outputContent: string | undefined = undefined;
        if (template instanceof TFile) {
            runningConfig = this.createRunningConfig(
                template,
                createdNote,
                RunMode.CREATE_NEW_FROM_TEMPLATE
            );
            const readAndParseResult = await this.readAndParseTemplate(runningConfig);
            if (!readAndParseResult.ok) {
                return readAndParseResult;
            }
            outputContent = readAndParseResult.safeUnwrap();
        } else {
            runningConfig = this.createRunningConfig(
                undefined,
                createdNote,
                RunMode.CREATE_NEW_FROM_TEMPLATE
            );
            const parseTemplateResult = await this.parseTemplate(runningConfig, template);
            if (!parseTemplateResult.ok) {
                return parseTemplateResult;
            }
            outputContent = parseTemplateResult.safeUnwrap();
        }
        await this._app.vault.modify(createdNote, outputContent);

        this._app.workspace.trigger("templater:new-note-from-template", {
            file: createdNote,
            content: outputContent
        });

        if (openNewNote) {
            const activeLeaf = this._app.workspace.getLeaf(false);
            await activeLeaf.openFile(createdNote, {
                state: { mode: "source" }
            });

            await this._plugin.editorHandler.jump_to_next_cursor_location(createdNote, true);

            activeLeaf.setEphemeralState({
                rename: "all"
            });
        }

        await this.endTemplaterTask(path);
        return Ok(createdNote);
    }

    public async appendTemplateToActiveFile(
        templateFile: TFile
    ): Promise<StatusResult<StatusError>> {
        const activeView = this._app.workspace.getActiveViewOfType(MarkdownView);
        const activeEditor = this._app.workspace.activeEditor;
        if (!activeEditor || !activeEditor.file || !activeEditor.editor) {
            return Err(NotFoundError("No active editor found!"));
        }
        const { path } = activeEditor.file;
        this.startTemplaterTask(path);
        const runningConfig = this.createRunningConfig(
            templateFile,
            activeEditor.file,
            RunMode.APPEND_ACTIVE_FILE
        );
        const readAndParseResult = await this.readAndParseTemplate(runningConfig);
        if (!readAndParseResult.ok) {
            return readAndParseResult;
        }
        const outputContent = readAndParseResult.safeUnwrap();

        const editor = activeEditor.editor;
        const doc = editor.getDoc();
        const oldSelections = doc.listSelections();
        doc.replaceSelection(outputContent);
        // Refresh editor to ensure properties widget shows after inserting template in blank file
        await this._app.vault.append(activeEditor.file, "");
        this._app.workspace.trigger("templater:template-appended", {
            view: activeView,
            editor: activeEditor,
            content: outputContent,
            oldSelections,
            newSelections: doc.listSelections()
        });

        await this._plugin.editorHandler.jump_to_next_cursor_location(activeEditor.file, true);
        await this.endTemplaterTask(path);
        return Ok();
    }

    public async overwriteActiveFileCommands(): Promise<StatusResult<StatusError>> {
        const activeEditor = this._app.workspace.activeEditor;
        if (!activeEditor || !activeEditor.file) {
            return Err(NotFoundError("Active editor is null, can't overwrite content"));
        }
        return this.overwriteFileCommands(activeEditor.file, true);
    }

    public async overwriteFileCommands(
        file: TFile,
        activeFile = false
    ): Promise<StatusResult<StatusError>> {
        const { path } = file;
        this.startTemplaterTask(path);
        const runningConfig = this.createRunningConfig(
            file,
            file,
            activeFile ? RunMode.OVERWRITE_ACTIVE_FILE : RunMode.OVERWRITE_FILE
        );
        const readAndParseResult = await this.readAndParseTemplate(runningConfig);
        if (!readAndParseResult.ok) {
            return readAndParseResult;
        }
        const outputContent = readAndParseResult.safeUnwrap();
        await this._app.vault.modify(file, outputContent);
        this._app.workspace.trigger("templater:overwrite-file", {
            file,
            content: outputContent
        });
        await this._plugin.editorHandler.jump_to_next_cursor_location(file, true);
        await this.endTemplaterTask(path);
        return Ok();
    }

    public async processDynamicTemplates(
        el: HTMLElement,
        ctx: MarkdownPostProcessorContext
    ): Promise<StatusResult<StatusError>> {
        const dynamicCommandRegex = GenerateDynamicCommandRegex();

        const walker = document.createNodeIterator(el, NodeFilter.SHOW_TEXT);
        let node;
        let pass = false;
        let functionsObject: Record<string, unknown> = {};
        while ((node = walker.nextNode())) {
            let content = node.nodeValue;
            if (content === null) {
                continue;
            }
            let match = dynamicCommandRegex.exec(content);
            if (match === null) {
                continue;
            }
            const file = this._app.metadataCache.getFirstLinkpathDest("", ctx.sourcePath);
            if (!file || !(file instanceof TFile)) {
                return Err(InvalidArgumentError("No markdown context found."));
            }
            if (!pass) {
                pass = true;
                const config = this.createRunningConfig(file, file, RunMode.DYNAMIC_PROCESSOR);
                const generateResult = await this.functionsGenerator.generateObject(
                    config,
                    FunctionsMode.USER_INTERNAL
                );
                if (!generateResult.ok) {
                    return generateResult;
                }
                functionsObject = generateResult.safeUnwrap();
                this.currentFunctionsObject = functionsObject;
            }

            while (match != null) {
                // Not the most efficient way to exclude the '+' from the command but I couldn't find something better
                const completeCommand = (match[1] as string) + (match[2] as string);
                const commandResult = await this.parser.parseCommands(
                    completeCommand,
                    functionsObject
                );
                if (!commandResult.ok) {
                    return commandResult;
                }
                const commandOutput: string = commandResult.safeUnwrap();
                const start = dynamicCommandRegex.lastIndex - match[0].length;
                const end = dynamicCommandRegex.lastIndex;
                content = content.substring(0, start) + commandOutput + content.substring(end);

                dynamicCommandRegex.lastIndex += commandOutput.length - match[0].length;
                match = dynamicCommandRegex.exec(content);
            }
            node.nodeValue = content;
        }
        return Ok();
    }

    public getNewFileTemplateForFolder(folder: TFolder | null): string | undefined {
        const f: TFolder | null = folder;
        while (f !== null) {
            const match = this._plugin.settings.folder_templates.find((e) => e.folder == f.path);

            if (match && match.template) {
                return match.template;
            }

            folder = f.parent;
        }
        return undefined;
    }

    /** Execute the startup templates that don't render any template. */
    public async executeStartupScripts(): Promise<void[]> {
        const startupPromises: Promise<void>[] = [];
        for (const template of this._plugin.settings.startup_templates) {
            if (!template) {
                continue;
            }
            const fileResult = ResolveTfile(this._app, template);
            if (!fileResult.ok) {
                continue;
            }
            const file = fileResult.safeUnwrap();
            const { path } = file;
            this.startTemplaterTask(path);
            const runningConfig = this.createRunningConfig(file, file, RunMode.STARTUP_TEMPLATE);
            startupPromises.push(
                this.readAndParseTemplate(runningConfig).then((parsedTemplate) => {
                    if (parsedTemplate.ok) {
                        return this.endTemplaterTask(path);
                    }
                    LogError(parsedTemplate.val);
                    return;
                })
            );
        }

        return Promise.all(startupPromises);
    }

    /**
     * Writes the evaluated data from the `templateFile` to overwrite `file` content.
     * @param templateFile the template file to apply
     * @param file the file to overwrite with the evaluated content
     * @returns void when doen writing
     */
    private async writeTemplateToFile(
        templateFile: TFile,
        file: TFile
    ): Promise<StatusResult<StatusError>> {
        const { path } = file;
        this.startTemplaterTask(path);
        const activeEditor = this._app.workspace.activeEditor;
        const activeFile = GetActiveFile(this._app);
        const runningConfig = this.createRunningConfig(templateFile, file, RunMode.OVERWRITE_FILE);
        const outputContent = await this.readAndParseTemplate(runningConfig);
        // errorWrapper failed
        if (outputContent.err) {
            await this.endTemplaterTask(path);
            return outputContent;
        }
        await this._app.vault.modify(file, outputContent.safeUnwrap());
        // Set cursor to first line of editor (below properties)
        // https://github.com/SilentVoid13/Templater/issues/1231
        if (
            activeFile.some &&
            activeFile.safeValue().path === file.path &&
            activeEditor &&
            activeEditor.editor
        ) {
            const editor = activeEditor.editor;
            editor.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 0 });
        }
        this._app.workspace.trigger("templater:new-note-from-template", {
            file,
            content: outputContent
        });
        await this._plugin.editorHandler.jump_to_next_cursor_location(file, true);
        await this.endTemplaterTask(path);
        return Ok();
    }

    /** Creates the parser running config based on the input. */
    private createRunningConfig(
        templateFile: TFile | undefined,
        targetFile: TFile,
        runMode: RunMode
    ): RunningConfig {
        const activeFile = GetActiveFile(this._app);

        return {
            templateFile,
            targetFile,
            runMode,
            activeFile: activeFile.valueOr(undefined)
        };
    }

    /** Reads and parses the template returning the evaluated text content. */
    private async readAndParseTemplate(
        config: RunningConfig
    ): Promise<Result<string, StatusError>> {
        const templateFile = config.templateFile;
        if (templateFile === undefined) {
            return Err(
                InvalidArgumentError("`readAndParseTemplate` requires `templateFile` input.")
            );
        }
        const templateContent = await this._app.vault.read(templateFile);
        return this.parseTemplate(config, templateContent);
    }

    /** Parses the template and returns the evaluated text content. */
    private async parseTemplate(
        config: RunningConfig,
        templateContent: string
    ): Promise<Result<string, StatusError>> {
        const functionsObject = await this.functionsGenerator.generateObject(
            config,
            FunctionsMode.USER_INTERNAL
        );
        if (!functionsObject.ok) {
            return functionsObject;
        }
        this.currentFunctionsObject = functionsObject.safeUnwrap();
        const content = await this.parser.parseCommands(
            templateContent,
            this.currentFunctionsObject
        );
        return content;
    }

    private startTemplaterTask(path: string) {
        this.filesWithPendingTemplates.add(path);
    }

    private async endTemplaterTask(path: string) {
        this.filesWithPendingTemplates.delete(path);
        if (this.filesWithPendingTemplates.size === 0) {
            this._app.workspace.trigger("templater:all-templates-executed");
            await this.functionsGenerator.teardown();
        }
    }
}
