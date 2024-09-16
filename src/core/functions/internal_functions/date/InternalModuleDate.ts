import { Ok, type StatusResult } from "../../../../lib/result";
import type { StatusError } from "../../../../lib/status_error";
import { InvalidArgumentError } from "../../../../lib/status_error";
import { InternalModule } from "../internalModule";
import type { ModuleName } from "editor/tpDocumentation";

export class InternalModuleDate extends InternalModule {
    public name: ModuleName = "date";

    public override async createStaticTemplates(): Promise<StatusResult<StatusError>> {
        this.staticFunctions.set("now", this.generateNow());
        this.staticFunctions.set("tomorrow", this.generateTomorrow());
        this.staticFunctions.set("weekday", this.generateWeekday());
        this.staticFunctions.set("yesterday", this.generateYesterday());
        return Ok();
    }

    public override async createDynamicTemplates(): Promise<StatusResult<StatusError>> {
        return Ok();
    }

    public override async teardown(): Promise<void> {}

    private generateNow(): (
        format?: string,
        offset?: number | string,
        reference?: string,
        referenceFormat?: string
    ) => string {
        return (
            format = "YYYY-MM-DD",
            offset?: number | string,
            reference?: string,
            referenceFormat?: string
        ) => {
            if (reference !== undefined && !window.moment(reference, referenceFormat).isValid()) {
                throw InvalidArgumentError(
                    `Invalid reference date format, try specifying one with the argument 'referenceFormat'`
                );
            }
            let duration;
            if (typeof offset === "string") {
                duration = window.moment.duration(offset);
            } else if (typeof offset === "number") {
                duration = window.moment.duration(offset, "days");
            }

            return window.moment(reference, referenceFormat).add(duration).format(format);
        };
    }

    private generateTomorrow(): (format?: string) => string {
        return (format = "YYYY-MM-DD") => {
            return window.moment().add(1, "days").format(format);
        };
    }

    private generateWeekday(): (
        format: string,
        weekday: number,
        reference?: string,
        reference_format?: string
    ) => string {
        return (
            format = "YYYY-MM-DD",
            weekday: number,
            reference?: string,
            referenceFormat?: string
        ) => {
            if (reference !== undefined && !window.moment(reference, referenceFormat).isValid()) {
                throw InvalidArgumentError(
                    "Invalid reference date format, try specifying one with the argument 'referenceFormat'"
                );
            }
            return window.moment(reference, referenceFormat).weekday(weekday).format(format);
        };
    }

    private generateYesterday(): (format?: string) => string {
        return (format = "YYYY-MM-DD") => {
            return window.moment().add(-1, "days").format(format);
        };
    }
}
