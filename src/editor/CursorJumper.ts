import type { App, EditorPosition, EditorRangeOrCaret, EditorTransaction } from "obsidian";
import { MarkdownView } from "obsidian";
import { EscapeRegExp } from "utils/utils";

export class CursorJumper {
    constructor(private _app: App) {}

    public async jumpToNextCursorLocation(): Promise<void> {
        const activeEditor = this._app.workspace.activeEditor;
        if (!activeEditor || !activeEditor.editor) {
            return;
        }
        const content = activeEditor.editor.getValue();

        const { newContent, positions } = this.replaceAndGetCursorPositions(content);
        if (positions) {
            const foldInfo =
                activeEditor instanceof MarkdownView
                    ? activeEditor.currentMode.getFoldInfo()
                    : null;
            activeEditor.editor.setValue(newContent as string);
            // only expand folds that have a cursor placed within it's bounds
            if (foldInfo && Array.isArray(foldInfo.folds)) {
                positions.forEach((position) => {
                    foldInfo.folds = foldInfo.folds.filter(
                        (fold) => fold.from > position.line || fold.to < position.line
                    );
                });
                if (activeEditor instanceof MarkdownView) {
                    activeEditor.currentMode.applyFoldInfo(foldInfo);
                }
            }
            this.setCursorLocation(positions);
        }

        // enter insert mode for vim users
        if (this._app.vault.getConfig("vimMode")) {
            // @ts-expect-error Doing some weird stuff with active editor.
            const cm = activeEditor.editor.cm.cm;
            // @ts-expect-error Doing some weird stuff with window.
            window.CodeMirrorAdapter.Vim.handleKey(cm, "i", "mapping");
        }
    }

    public getEditorPositionFromIndex(content: string, index: number): EditorPosition {
        const substr = content.slice(0, index);

        let l = 0;
        let offset = -1;
        let r = -1;
        for (; (r = substr.indexOf("\n", r + 1)) !== -1; l++, offset = r);
        offset += 1;

        const ch = content.slice(offset, index).length;

        return { line: l, ch: ch };
    }

    public replaceAndGetCursorPositions(content: string): {
        newContent?: string;
        positions?: EditorPosition[];
    } {
        let cursorMatches = [];
        let match;
        const cursorRegex = new RegExp("<%\\s*tp.file.cursor\\((?<order>[0-9]*)\\)\\s*%>", "g");

        while ((match = cursorRegex.exec(content)) != null) {
            cursorMatches.push(match);
        }
        if (cursorMatches.length === 0) {
            return {};
        }

        cursorMatches.sort((m1, m2) => {
            return (
                Number(m1.groups && m1.groups["order"]) - Number(m2.groups && m2.groups["order"])
            );
        });
        const matchStr = (cursorMatches[0] as RegExpExecArray)[0];

        cursorMatches = cursorMatches.filter((m) => {
            return m[0] === matchStr;
        });

        const positions = [];
        let indexOffset = 0;
        for (const cursorMatch of cursorMatches) {
            const index = cursorMatch.index - indexOffset;
            positions.push(this.getEditorPositionFromIndex(content, index));

            content = content.replace(new RegExp(EscapeRegExp(cursorMatch[0])), "");
            indexOffset += cursorMatch[0].length;

            // For tp.file.cursor(), we keep the default top to bottom
            if (cursorMatch[1] === "") {
                break;
            }
        }

        return { newContent: content, positions: positions };
    }

    public setCursorLocation(positions: EditorPosition[]): void {
        const activeEditor = this._app.workspace.activeEditor;
        if (!activeEditor || !activeEditor.editor) {
            return;
        }

        const editor = activeEditor.editor;

        const selections: EditorRangeOrCaret[] = [];
        for (const pos of positions) {
            selections.push({ from: pos });
        }

        const transaction: EditorTransaction = {
            selections: selections
        };
        editor.transaction(transaction);
    }
}
