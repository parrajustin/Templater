import {
    App,
    MarkdownPostProcessorContext,
    MarkdownView,
    normalizePath,
    TAbstractFile,
    TFile,
    TFolder,
} from "obsidian";
import {
    delay,
    generate_dynamic_command_regex,
    GetActiveFile,
    get_folder_path_from_file_path,
    resolve_tfile,
} from "utils/Utils";
import TemplaterPlugin from "main";
import {
    FunctionsGenerator,
    FunctionsMode,
} from "./functions/functionsGenerator";
import { ErrorWrapper, ErrorWrapperSync, TemplaterError } from "utils/Error";
import { Parser } from "./parser/parser";
import { log_error } from "utils/Log";
import { InvalidArgumentError, StatusError } from "../lib/status_error";
import { Err, Ok, Result } from "../lib/result";

export enum RunMode {
    CreateNewFromTemplate,
    AppendActiveFile,
    OverwriteFile,
    OverwriteActiveFile,
    DynamicProcessor,
    StartupTemplate,
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
};

export class Templater {
    /** The template parser. */
    public parser: Parser;
    /** Context generator for the parser. */
    public functionsGenerator: FunctionsGenerator;
    public currentFunctionsObject: Record<string, unknown>;
    public filesWithPendingTemplates: Set<string>;

    constructor(private app: App, private plugin: TemplaterPlugin) {
        this.functionsGenerator = new FunctionsGenerator(this.plugin);
        this.parser = new Parser();
    }

    async setup(): Promise<void> {
        this.filesWithPendingTemplates = new Set();
        await this.parser.init();
        await this.functionsGenerator.init();
        this.plugin.registerMarkdownPostProcessor((el, ctx) =>
            this.process_dynamic_templates(el, ctx)
        );
    }

    /** Creates the parser running config based on the input. */
    private createRunningConfig(
        templateFile: TFile | undefined,
        targetFile: TFile,
        runMode: RunMode
    ): RunningConfig {
        const activeFile = GetActiveFile(this.app);

        return {
            templateFile,
            targetFile,
            runMode,
            activeFile: activeFile.valueOr(undefined),
        };
    }

    /** Reads and parses the template returning the evaluated text content. */
    private async readAndParseTemplate(config: RunningConfig): Promise<Result<string, StatusError>> {
        const templateFile = config.templateFile;
        if (templateFile === undefined) {
            return Err(InvalidArgumentError("`readAndParseTemplate` requires `templateFile` input."));
        }
        const templateContent = await this.app.vault.read(
            templateFile
        );
        return Ok(await this.parseTemplate(config, templateContent));
    }

    /** Parses the template and returns the evaluated text content. */
    private async parseTemplate(
        config: RunningConfig,
        templateContent: string
    ): Promise<string> {
        const functions_object = await this.functionsGenerator.generateObject(
            config,
            FunctionsMode.USER_INTERNAL
        );
        this.currentFunctionsObject = functions_object;
        const content = await this.parser.parseCommands(
            templateContent,
            functions_object
        );
        return content;
    }

    private startTemplaterTask(path: string) {
        this.filesWithPendingTemplates.add(path);
    }

    private async end_templater_task(path: string) {
        this.filesWithPendingTemplates.delete(path);
        if (this.filesWithPendingTemplates.size === 0) {
            this.app.workspace.trigger("templater:all-templates-executed");
            await this.functionsGenerator.teardown();
        }
    }

    async createNewNoteFromTemplate(
        template: TFile | string,
        folder?: TFolder | string,
        filename?: string,
        open_new_note = true
    ): Promise<TFile | undefined> {
        // TODO: Maybe there is an obsidian API function for that
        if (!folder) {
            const new_file_location = this.app.vault.getConfig("newFileLocation");
            switch (new_file_location) {
                case "current": {
                    const active_file = GetActiveFile(this.app);
                    if (active_file) {
                        folder = active_file.parent;
                    }
                    break;
                }
                case "folder":
                    folder = this.app.fileManager.getNewFileParent("");
                    break;
                case "root":
                    folder = this.app.vault.getRoot();
                    break;
                default:
                    break;
            }
        }

        const extension =
            template instanceof TFile ? template.extension || "md" : "md";
        const created_note = await ErrorWrapper(async () => {
            const folderPath = folder instanceof TFolder ? folder.path : folder;
            const path = app.vault.getAvailablePath(
                normalizePath(`${folderPath ?? ""}/${filename || "Untitled"}`),
                extension
            );
            const folder_path = get_folder_path_from_file_path(path);
            if (
                folder_path &&
                !app.vault.getAbstractFileByPathInsensitive(folder_path)
            ) {
                await app.vault.createFolder(folder_path);
            }
            return app.vault.create(path, "");
        }, `Couldn't create ${extension} file.`);

        if (created_note == null) {
            return;
        }

        const { path } = created_note;
        this.startTemplaterTask(path);
        let running_config: RunningConfig;
        let output_content: string;
        if (template instanceof TFile) {
            running_config = this.createRunningConfig(
                template,
                created_note,
                RunMode.CreateNewFromTemplate
            );
            output_content = await ErrorWrapper(
                async () => this.readAndParseTemplate(running_config),
                "Template parsing error, aborting."
            );
        } else {
            running_config = this.createRunningConfig(
                undefined,
                created_note,
                RunMode.CreateNewFromTemplate
            );
            output_content = await ErrorWrapper(
                async () => this.parseTemplate(running_config, template),
                "Template parsing error, aborting."
            );
        }

        if (output_content == null) {
            await app.vault.delete(created_note);
            await this.end_templater_task(path);
            return;
        }

        await app.vault.modify(created_note, output_content);

        app.workspace.trigger("templater:new-note-from-template", {
            file: created_note,
            content: output_content,
        });

        if (open_new_note) {
            const active_leaf = app.workspace.getLeaf(false);
            if (!active_leaf) {
                log_error(new TemplaterError("No active leaf"));
                return;
            }
            await active_leaf.openFile(created_note, {
                state: { mode: "source" },
            });

            await this.plugin.editor_handler.jump_to_next_cursor_location(
                created_note,
                true
            );

            active_leaf.setEphemeralState({
                rename: "all",
            });
        }

        await this.end_templater_task(path);
        return created_note;
    }

    async append_template_to_active_file(template_file: TFile): Promise<void> {
        const active_view = app.workspace.getActiveViewOfType(MarkdownView);
        const active_editor = app.workspace.activeEditor;
        if (!active_editor || !active_editor.file || !active_editor.editor) {
            log_error(
                new TemplaterError("No active editor, can't append templates.")
            );
            return;
        }
        const { path } = active_editor.file;
        this.startTemplaterTask(path);
        const running_config = this.createRunningConfig(
            template_file,
            active_editor.file,
            RunMode.AppendActiveFile
        );
        const output_content = await ErrorWrapper(
            async () => this.readAndParseTemplate(running_config),
            "Template parsing error, aborting."
        );
        // errorWrapper failed
        if (output_content == null) {
            await this.end_templater_task(path);
            return;
        }

        const editor = active_editor.editor;
        const doc = editor.getDoc();
        const oldSelections = doc.listSelections();
        doc.replaceSelection(output_content);
        // Refresh editor to ensure properties widget shows after inserting template in blank file
        if (active_editor.file) {
            await app.vault.append(active_editor.file, "");
        }
        app.workspace.trigger("templater:template-appended", {
            view: active_view,
            editor: active_editor,
            content: output_content,
            oldSelections,
            newSelections: doc.listSelections(),
        });

        await this.plugin.editor_handler.jump_to_next_cursor_location(
            active_editor.file,
            true
        );
        await this.end_templater_task(path);
    }

    async write_template_to_file(
        template_file: TFile,
        file: TFile
    ): Promise<void> {
        const { path } = file;
        this.startTemplaterTask(path);
        const active_editor = app.workspace.activeEditor;
        const active_file = GetActiveFile(app);
        const running_config = this.createRunningConfig(
            template_file,
            file,
            RunMode.OverwriteFile
        );
        const output_content = await ErrorWrapper(
            async () => this.readAndParseTemplate(running_config),
            "Template parsing error, aborting."
        );
        // errorWrapper failed
        if (output_content == null) {
            await this.end_templater_task(path);
            return;
        }
        await app.vault.modify(file, output_content);
        // Set cursor to first line of editor (below properties)
        // https://github.com/SilentVoid13/Templater/issues/1231
        if (
            active_file?.path === file.path &&
            active_editor &&
            active_editor.editor
        ) {
            const editor = active_editor.editor;
            editor.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 0 });
        }
        app.workspace.trigger("templater:new-note-from-template", {
            file,
            content: output_content,
        });
        await this.plugin.editor_handler.jump_to_next_cursor_location(
            file,
            true
        );
        await this.end_templater_task(path);
    }

    overwrite_active_file_commands(): void {
        const active_editor = app.workspace.activeEditor;
        if (!active_editor || !active_editor.file) {
            log_error(
                new TemplaterError(
                    "Active editor is null, can't overwrite content"
                )
            );
            return;
        }
        this.overwrite_file_commands(active_editor.file, true);
    }

    async overwrite_file_commands(
        file: TFile,
        active_file = false
    ): Promise<void> {
        const { path } = file;
        this.startTemplaterTask(path);
        const running_config = this.createRunningConfig(
            file,
            file,
            active_file ? RunMode.OverwriteActiveFile : RunMode.OverwriteFile
        );
        const output_content = await ErrorWrapper(
            async () => this.readAndParseTemplate(running_config),
            "Template parsing error, aborting."
        );
        // errorWrapper failed
        if (output_content == null) {
            await this.end_templater_task(path);
            return;
        }
        await app.vault.modify(file, output_content);
        app.workspace.trigger("templater:overwrite-file", {
            file,
            content: output_content,
        });
        await this.plugin.editor_handler.jump_to_next_cursor_location(
            file,
            true
        );
        await this.end_templater_task(path);
    }

    async process_dynamic_templates(
        el: HTMLElement,
        ctx: MarkdownPostProcessorContext
    ): Promise<void> {
        const dynamic_command_regex = generate_dynamic_command_regex();

        const walker = document.createNodeIterator(el, NodeFilter.SHOW_TEXT);
        let node;
        let pass = false;
        let functions_object: Record<string, unknown>;
        while ((node = walker.nextNode())) {
            let content = node.nodeValue;
            if (content !== null) {
                let match = dynamic_command_regex.exec(content);
                if (match !== null) {
                    const file = app.metadataCache.getFirstLinkpathDest(
                        "",
                        ctx.sourcePath
                    );
                    if (!file || !(file instanceof TFile)) {
                        return;
                    }
                    if (!pass) {
                        pass = true;
                        const config = this.createRunningConfig(
                            file,
                            file,
                            RunMode.DynamicProcessor
                        );
                        functions_object =
                            await this.functionsGenerator.generateObject(
                                config,
                                FunctionsMode.USER_INTERNAL
                            );
                        this.currentFunctionsObject = functions_object;
                    }
                }

                while (match != null) {
                    // Not the most efficient way to exclude the '+' from the command but I couldn't find something better
                    const complete_command = match[1] + match[2];
                    const command_output: string = await ErrorWrapper(
                        async () => {
                            return await this.parser.parse_commands(
                                complete_command,
                                functions_object
                            );
                        },
                        `Command Parsing error in dynamic command '${complete_command}'`
                    );
                    if (command_output == null) {
                        return;
                    }
                    const start =
                        dynamic_command_regex.lastIndex - match[0].length;
                    const end = dynamic_command_regex.lastIndex;
                    content =
                        content.substring(0, start) +
                        command_output +
                        content.substring(end);

                    dynamic_command_regex.lastIndex +=
                        command_output.length - match[0].length;
                    match = dynamic_command_regex.exec(content);
                }
                node.nodeValue = content;
            }
        }
    }

    get_new_file_template_for_folder(folder: TFolder): string | undefined {
        do {
            const match = this.plugin.settings.folder_templates.find(
                (e) => e.folder == folder.path
            );

            if (match && match.template) {
                return match.template;
            }

            folder = folder.parent;
        } while (folder);
    }

    static async on_file_creation(
        templater: Templater,
        file: TAbstractFile
    ): Promise<void> {
        if (!(file instanceof TFile) || file.extension !== "md") {
            return;
        }

        // Avoids template replacement when syncing template files
        const template_folder = normalizePath(
            templater.plugin.settings.templatesFolder
        );
        if (file.path.includes(template_folder) && template_folder !== "/") {
            return;
        }

        // TODO: find a better way to do this
        // Currently, I have to wait for the note extractor plugin to add the file content before replacing
        await delay(300);

        // Avoids template replacement when creating file from template without content before delay
        if (templater.filesWithPendingTemplates.has(file.path)) {
            return;
        }

        if (
            file.stat.size == 0 &&
            templater.plugin.settings.enable_folder_templates
        ) {
            const folder_template_match =
                templater.get_new_file_template_for_folder(file.parent);
            if (!folder_template_match) {
                return;
            }
            const template_file: TFile = await ErrorWrapper(
                async (): Promise<TFile> => {
                    return resolve_tfile(folder_template_match);
                },
                `Couldn't find template ${folder_template_match}`
            );
            // errorWrapper failed
            if (template_file == null) {
                return;
            }
            await templater.write_template_to_file(template_file, file);
        } else {
            if (file.stat.size <= 100000) {
                //https://github.com/SilentVoid13/Templater/issues/873
                await templater.overwrite_file_commands(file);
            } else {
                console.log(
                    `Templater skipped parsing ${file.path} because file size exceeds 10000`
                );
            }
        }
    }

    public async executeStartupScripts(): Promise<void> {
        for (const template of this.plugin.settings.startup_templates) {
            if (!template) {
                continue;
            }
            const file = ErrorWrapperSync(
                () => resolve_tfile(template),
                `Couldn't find startup template "${template}"`
            );
            if (!file) {
                continue;
            }
            const { path } = file;
            this.startTemplaterTask(path);
            const running_config = this.createRunningConfig(
                file,
                file,
                RunMode.StartupTemplate
            );
            await ErrorWrapper(
                async () => this.readAndParseTemplate(running_config),
                `Startup Template parsing error, aborting.`
            );
            await this.end_templater_task(path);
        }
    }
}
