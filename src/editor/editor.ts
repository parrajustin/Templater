/* eslint-disable @typescript-eslint/no-explicit-any */
import type { App, TFile } from "obsidian";
import { Platform } from "obsidian";
import type TemplaterPlugin from "main";
import { CursorJumper } from "editor/CursorJumper";
import { LogError } from "utils/log";
import { GetActiveFile } from "utils/utils";
import { Autocomplete } from "editor/autocomplete";

import "editor/mode/javascript";
import "editor/mode/custom_overlay";
import { StreamLanguage } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { Prec } from "@codemirror/state";
import { NotFoundError } from "../lib/status_error";
//import "editor/mode/show-hint";

const TEMPLATER_MODE_NAME = "templater";

const TP_CMD_TOKEN_CLASS = "templater-command";
const TP_INLINE_CLASS = "templater-inline";

const TP_OPENING_TAG_TOKEN_CLASS = "templater-opening-tag";
const TP_CLOSING_TAG_TOKEN_CLASS = "templater-closing-tag";

const TP_INTERPOLATION_TAG_TOKEN_CLASS = "templater-interpolation-tag";
const TP_EXEC_TAG_TOKEN_CLASS = "templater-execution-tag";

export class Editor {
    private _cursorJumper: CursorJumper;
    private _activeEditorExtensions: Extension[];

    // Note that this is `undefined` until `setup` has run.
    private _templaterLanguage: Extension | undefined;

    constructor(
        private _app: App,
        private _plugin: TemplaterPlugin
    ) {
        this._cursorJumper = new CursorJumper(_app);
        this._activeEditorExtensions = [];
    }

    public desktopShouldHighlight(): boolean {
        return Platform.isDesktopApp && this._plugin.settings.syntaxHighlighting;
    }

    public mobileShouldHighlight(): boolean {
        return Platform.isMobileApp && this._plugin.settings.syntaxHighlightingMobile;
    }

    public async setup(): Promise<void> {
        this._plugin.registerEditorSuggest(new Autocomplete(this._app, this._plugin.settings));

        // We define our overlay as a stand-alone extension and keep a reference
        // to it around. This lets us dynamically turn it on and off as needed.
        await this.registerCodeMirrorMode();
        this._templaterLanguage = Prec.high(
            StreamLanguage.define(window.CodeMirror.getMode({}, TEMPLATER_MODE_NAME) as any)
        );
        // if (this._templaterLanguage === undefined) {
        //     log_error(
        //         new TemplaterError(
        //             "Unable to enable syntax highlighting. Could not define language."
        //         )
        //     );
        // }

        // Dynamic reconfiguration is now done by passing an array. If we modify
        // that array and then call `Workspace.updateOptions` the new extension
        // will be picked up.
        this._plugin.registerEditorExtension(this._activeEditorExtensions);

        // Selectively enable syntax highlighting via per-platform preferences.
        if (this.desktopShouldHighlight() || this.mobileShouldHighlight()) {
            await this.enableHighlighter();
        }
    }

    public async enableHighlighter(): Promise<void> {
        // Make sure it is idempotent
        if (this._activeEditorExtensions.length === 0 && this._templaterLanguage) {
            // There should only ever be this one extension if the array is not
            // empty.
            this._activeEditorExtensions.push(this._templaterLanguage);
            // This is expensive
            this._plugin.app.workspace.updateOptions();
        }
    }

    public async disableHighlighter(): Promise<void> {
        // Make sure that it is idempotent.
        if (this._activeEditorExtensions.length > 0) {
            // There should only ever be one extension if the array is not empty.
            this._activeEditorExtensions.pop();
            // This is expensive
            this._plugin.app.workspace.updateOptions();
        }
    }

    public async jumpToNextCursorLocation(
        file: TFile | null = null,
        autoJump = false
    ): Promise<void> {
        if (autoJump && !this._plugin.settings.autoJumpToCursor) {
            return;
        }
        const acitveFile = GetActiveFile(this._plugin.app);
        if (file && acitveFile.some && acitveFile.safeValue() !== file) {
            return;
        }
        await this._cursorJumper.jumpToNextCursorLocation();
    }

    public async registerCodeMirrorMode(): Promise<void> {
        // cm-editor-syntax-highlight-obsidian plugin
        // https://codemirror.net/doc/manual.html#modeapi
        // https://codemirror.net/mode/diff/diff.js
        // https://codemirror.net/demo/mustache.html
        // https://marijnhaverbeke.nl/blog/codemirror-mode-system.html

        // If no configuration requests highlighting we should bail.
        if (!this.desktopShouldHighlight() && !this.mobileShouldHighlight()) {
            return;
        }

        const jsMode = window.CodeMirror.getMode({}, "javascript");
        if (jsMode.name === "null") {
            LogError(
                NotFoundError(
                    "Javascript syntax mode couldn't be found, can't enable syntax highlighting."
                )
            );
            return;
        }

        // Custom overlay mode used to handle edge cases
        // @ts-expect-error using some code mirror ref.
        const overlayMode = window.CodeMirror.customOverlayMode;
        if (overlayMode == null) {
            LogError(
                NotFoundError("Couldn't find customOverlayMode, can't enable syntax highlighting.")
            );
            return;
        }

        window.CodeMirror.defineMode(TEMPLATER_MODE_NAME, function (config) {
            const templaterOverlay = {
                startState: function () {
                    const jsState = window.CodeMirror.startState(jsMode) as object;
                    return {
                        ...jsState,
                        inCommand: false,
                        tagClass: "",
                        freeLine: false
                    };
                },
                copyState: function (state: any) {
                    const jsState = window.CodeMirror.startState(jsMode) as object;
                    const newState = {
                        ...jsState,
                        inCommand: state.inCommand,
                        tagClass: state.tagClass,
                        freeLine: state.freeLine
                    };
                    return newState;
                },
                blankLine: function (state: any) {
                    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
                    if (state.inCommand) {
                        return `line-background-templater-command-bg`;
                    }
                    return null;
                },
                token: function (stream: any, state: any) {
                    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
                    if (stream.sol() && state.inCommand) {
                        state.freeLine = true;
                    }

                    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
                    if (state.inCommand) {
                        let keywords = "";
                        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
                        if (stream.match(/[-_]{0,1}%>/, true)) {
                            state.inCommand = false;
                            state.freeLine = false;
                            const tagClass = state.tagClass;
                            state.tagClass = "";

                            return `line-${TP_INLINE_CLASS} ${TP_CMD_TOKEN_CLASS} ${TP_CLOSING_TAG_TOKEN_CLASS} ${tagClass}`;
                        }

                        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
                        const jsResult = jsMode.token && jsMode.token(stream, state);
                        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
                        if (stream.peek() == null && state.freeLine) {
                            keywords += ` line-background-templater-command-bg`;
                        }
                        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
                        if (!state.freeLine) {
                            keywords += ` line-${TP_INLINE_CLASS}`;
                        }

                        return `${keywords} ${TP_CMD_TOKEN_CLASS} ${jsResult}`;
                    }

                    const match = stream.match(/<%[-_]{0,1}\s*([*+]{0,1})/, true);
                    if (match != null) {
                        switch (match[1]) {
                            case "*":
                                state.tagClass = TP_EXEC_TAG_TOKEN_CLASS;
                                break;
                            default:
                                state.tagClass = TP_INTERPOLATION_TAG_TOKEN_CLASS;
                                break;
                        }
                        state.inCommand = true;
                        return `line-${TP_INLINE_CLASS} ${TP_CMD_TOKEN_CLASS} ${TP_OPENING_TAG_TOKEN_CLASS} ${state.tagClass}`;
                    }

                    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
                    while (stream.next() != null && !stream.match(/<%/, false));
                    return null;
                }
            };
            return overlayMode(window.CodeMirror.getMode(config, "hypermd"), templaterOverlay);
        });
    }
}
