import type {
    App,
    Editor,
    EditorPosition,
    EditorSuggestContext,
    EditorSuggestTriggerInfo,
    TFile
} from "obsidian";
import { EditorSuggest } from "obsidian";
import type { Settings } from "settings/settings";
import type {
    ModuleName,
    TpFunctionDocumentation,
    TpSuggestDocumentation
} from "./tpDocumentation";
import { Documentation, IsFunctionDocumentation, IsModuleName } from "./tpDocumentation";

export class Autocomplete extends EditorSuggest<TpSuggestDocumentation> {
    //private in_command = false;
    // https://regex101.com/r/ocmHzR/1
    private _tpKeywordRegex = /tp\.(?<module>[a-z]*)?(?<fn_trigger>\.(?<fn>[a-z_]*)?)?$/;
    private _documentation: Documentation;
    private _latestTriggerInfo: EditorSuggestTriggerInfo;
    private _moduleName: ModuleName | string;
    private _functionTrigger: boolean;
    private _functionName: string;

    constructor(
        private _app: App,
        settings: Settings
    ) {
        super(_app);
        this._documentation = new Documentation(_app, settings);
    }

    public onTrigger(
        cursor: EditorPosition,
        editor: Editor,
        _file: TFile
    ): EditorSuggestTriggerInfo | null {
        const range = editor.getRange(
            { line: cursor.line, ch: 0 },
            { line: cursor.line, ch: cursor.ch }
        );
        const match = this._tpKeywordRegex.exec(range);
        if (!match) {
            return null;
        }

        let query: string;
        const moduleName =
            match.groups && match.groups["module"] !== undefined ? match.groups["module"] : "";
        this._moduleName = moduleName;

        if (match.groups && match.groups["fn_trigger"] !== undefined) {
            if (moduleName == "" || !IsModuleName(moduleName)) {
                return null;
            }
            this._functionTrigger = true;
            this._functionName = match.groups["fn"] !== undefined ? match.groups["fn"] : "";
            query = this._functionName;
        } else {
            this._functionTrigger = false;
            query = this._moduleName;
        }

        const triggerInfo: EditorSuggestTriggerInfo = {
            start: { line: cursor.line, ch: cursor.ch - query.length },
            end: { line: cursor.line, ch: cursor.ch },
            query: query
        };
        this._latestTriggerInfo = triggerInfo;
        return triggerInfo;
    }

    public getSuggestions(context: EditorSuggestContext): TpSuggestDocumentation[] {
        let suggestions: TpSuggestDocumentation[] | undefined;
        if (this._moduleName && this._functionTrigger) {
            suggestions = this._documentation.getAllFunctionsDocumentation(
                this._moduleName as ModuleName
            ) as TpFunctionDocumentation[];
        } else {
            suggestions = this._documentation.getAllModulesDocumentation();
        }
        return suggestions.filter((s) => s.name.startsWith(context.query));
    }

    public renderSuggestion(value: TpSuggestDocumentation, el: HTMLElement): void {
        el.createEl("b", { text: value.name });
        el.createEl("br");
        if (this._functionTrigger && IsFunctionDocumentation(value)) {
            el.createEl("code", { text: value.definition });
        }
        if (value.description) {
            el.createEl("div", { text: value.description });
        }
    }

    public selectSuggestion(value: TpSuggestDocumentation, _evt: MouseEvent | KeyboardEvent): void {
        const activeEditor = this._app.workspace.activeEditor;
        if (!activeEditor || !activeEditor.editor) {
            // TODO: Error msg
            return;
        }
        activeEditor.editor.replaceRange(
            value.name,
            this._latestTriggerInfo.start,
            this._latestTriggerInfo.end
        );
        if (this._latestTriggerInfo.start.ch == this._latestTriggerInfo.end.ch) {
            // Dirty hack to prevent the cursor being at the
            // beginning of the word after completion,
            // Not sure what's the cause of this bug.
            const cursorPos = this._latestTriggerInfo.end;
            cursorPos.ch += value.name.length;
            activeEditor.editor.setCursor(cursorPos);
        }
    }
}
