import type { Command, SubCommand } from "seyfert";
import { type Instantiable, Keys } from "../../things";

/**
 * ### Yuna's Text Shortcuts
 * They allow you to access a subcommand more easily,
 * as if it were a normal command.
 * @example
 * ```
 *  // normal way to access
 *  music play
 *  // can now be accessed as
 *  play
 * ```
 * @requires Yuna.resolver to work.
 */
export function Shortcut() {
    return <T extends Instantiable<SubCommand>>(target: T) => {
        return class extends target {
            [Keys.resolverIsShortcut] = true;
            declare run: SubCommand["run"];
        };
    };
}

export interface SubCommandPrefixOptions {
    /**
     * A fully custom name for the prefix shortcut.
     * When provided, this exact name is used instead of the auto-generated
     * `parentName + separator + subName` (or `parentName + separator + groupName + separator + subName`).
     * @example
     * ```ts
     * @SubCommandPrefix({ name: "acc-create" })
     * // "acc-create" is the only prefix alias used
     * ```
     */
    name?: string;
    /**
     * The separator placed between name parts when auto-generating the prefix.
     * Ignored when `name` is provided.
     * @default "-"
     * @example
     * // parent "account" + group "pengu" + sub "create" → "account-pengu-create"
     */
    separator?: string;
}

/**
 * ### Yuna's SubCommand Prefix Shortcuts
 * Fuses the parent command name (+ optional group name) and the subcommand
 * name into a single prefix alias, so the subcommand can be accessed without
 * a space between them.
 *
 * Unlike `@Shortcut()` (which collapses to just the subcommand name),
 * this keeps all name parts joined by a separator.
 *
 * @example
 * ```ts
 * // Auto-generated (parent + group + sub):
 * @SubCommandPrefix()
 * // "account-pengu-create", "pinwino-pengu-create", "account-pengu-cr" …
 *
 * // Custom name:
 * @SubCommandPrefix({ name: "acc-create" })
 * // only "acc-create" is registered as the prefix alias
 * ```
 * @requires Yuna.resolver to work.
 */
export function SubCommandPrefix(options?: SubCommandPrefixOptions) {
    return <T extends Instantiable<SubCommand>>(target: T) => {
        return class extends target {
            [Keys.resolverIsSubCommandPrefix] = true;
            [Keys.resolverSubCommandPrefixSeparator] = options?.separator ?? "-";
            [Keys.resolverSubCommandPrefixName] = options?.name;
            declare run: SubCommand["run"];
        };
    };
}

export const getFallbackCommandName = (command: Instantiable<SubCommand> | null | string) => {
    if (!command) return;
    if (typeof command === "string") return command;
    return new command().name;
};

/**
 * Allows you to set a subcommand that will be used when one is not found.
 * if not set the first subcommand will be used.
 * use `null` to disable this option for this command.
 * @requires  Yuna.resolver to work.
 */
export function DeclareFallbackSubCommand(command: Instantiable<SubCommand> | null | string) {
    return <T extends Instantiable<Command>>(target: T) => {
        return class extends target {
            [Keys.resolverSubCommands] = { fallback: command, fallbackName: getFallbackCommandName(command) };
        };
    };
}
