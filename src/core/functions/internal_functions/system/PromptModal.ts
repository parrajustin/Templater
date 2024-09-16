import type { App } from "obsidian";
import { ButtonComponent, Modal, Platform, TextAreaComponent, TextComponent } from "obsidian";
import type { StatusError } from "../../../../lib/status_error";
import { AbortedError } from "../../../../lib/status_error";

export class PromptModal extends Modal {
    private _resolve: (value: string) => void;
    private _reject: (reason?: StatusError) => void;
    private _submitted = false;
    private _value: string;

    constructor(
        app: App,
        private _promptText: string,
        private _defaultValue: string,
        private _multiLine: boolean
    ) {
        super(app);
    }

    public onOpen(): void {
        this.titleEl.setText(this._promptText);
        this.createForm();
    }

    public onClose(): void {
        this.contentEl.empty();
        if (!this._submitted) {
            this._reject(AbortedError("Cancelled prompt"));
        }
    }

    public createForm(): void {
        const div = this.contentEl.createDiv();
        div.addClass("templater-prompt-div");
        let textInput;
        if (this._multiLine) {
            textInput = new TextAreaComponent(div);

            // Add submit button since enter needed for multiline input on mobile
            const buttonDiv = this.contentEl.createDiv();
            buttonDiv.addClass("templater-button-div");
            const submitButton = new ButtonComponent(buttonDiv);
            submitButton.buttonEl.addClass("mod-cta");
            submitButton.setButtonText("Submit").onClick((evt: Event) => {
                this.resolveAndClose(evt);
            });
        } else {
            textInput = new TextComponent(div);
        }

        this._value = this._defaultValue;
        textInput.inputEl.addClass("templater-prompt-input");
        textInput.setPlaceholder("Type text here");
        textInput.setValue(this._value);
        textInput.onChange((value) => (this._value = value));
        textInput.inputEl.addEventListener("keydown", (evt: KeyboardEvent) => {
            this.enterCallback(evt);
        });
    }

    public openAndGetValue(
        resolve: (value: string) => void,
        reject: (reason?: StatusError) => void
    ) {
        this._resolve = resolve;
        this._reject = reject;
        this.open();
    }

    private enterCallback(evt: KeyboardEvent) {
        // Fix for Korean inputs https://github.com/SilentVoid13/Templater/issues/1284
        if (evt.isComposing || evt.keyCode === 229) return;

        if (this._multiLine) {
            if (Platform.isDesktop && evt.key === "Enter" && !evt.shiftKey) {
                this.resolveAndClose(evt);
            }
        } else {
            if (evt.key === "Enter") {
                this.resolveAndClose(evt);
            }
        }
    }

    private resolveAndClose(evt: Event | KeyboardEvent) {
        this._submitted = true;
        evt.preventDefault();
        this._resolve(this._value);
        this.close();
    }
}
