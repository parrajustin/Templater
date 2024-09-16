import type { App, FuzzyMatch } from "obsidian";
import { FuzzySuggestModal } from "obsidian";
import type { StatusError } from "../../../../lib/status_error";
import { AbortedError } from "../../../../lib/status_error";

export class SuggesterModal<T> extends FuzzySuggestModal<T> {
    private _resolve: (value: T) => void;
    private _reject: (reason?: StatusError) => void;
    private _submitted = false;

    constructor(
        app: App,
        private _textItems: string[] | ((item: T) => string),
        private _items: T[],
        placeholder: string
    ) {
        super(app);
        this.setPlaceholder(placeholder);
    }

    public getItems(): T[] {
        return this._items;
    }

    public onClose(): void {
        if (!this._submitted) {
            this._reject(AbortedError("Cancelled prompt"));
        }
    }

    public selectSuggestion(value: FuzzyMatch<T>, evt: MouseEvent | KeyboardEvent): void {
        this._submitted = true;
        this.close();
        this.onChooseSuggestion(value, evt);
    }

    public getItemText(item: T): string {
        if (this._textItems instanceof Function) {
            return this._textItems(item);
        }
        return this._textItems[this._items.indexOf(item)] ?? "Undefined Text Item";
    }

    public onChooseItem(item: T): void {
        this._resolve(item);
    }

    public openAndGetValue(resolve: (value: T) => void, reject: (reason?: StatusError) => void) {
        this._resolve = resolve;
        this._reject = reject;
        this.open();
    }
}
