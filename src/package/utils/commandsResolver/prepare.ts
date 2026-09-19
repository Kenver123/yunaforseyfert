import { type Command, SubCommand } from "seyfert";
import type { BaseClient } from "seyfert/lib/client/base";
import { ApplicationCommandType } from "seyfert/lib/types";
import { type AvailableClients, type Instantiable, Keys, type YunaCommandUsable, type YunaGroupType } from "../../things";
import { type YunaResolverResult, baseResolver } from "./base";
import { getFallbackCommandName } from "./decorators";
import type { YunaCommandsResolverConfig } from "./resolver";

export interface YunaCommandsMetadata<ClientType extends BaseClient = BaseClient> {
    shortcuts: (SubCommand | GroupLink)[];
    commands: Command[];
    config?: YunaCommandsResolverConfig<ClientType>;
}

export type UseYunaCommandsClient<ClientType extends BaseClient = BaseClient> = ClientType & {
    [Keys.clientResolverMetadata]?: YunaCommandsMetadata<ClientType>;
};

export const ShortcutType = {
    // biome-ignore lint/style/useNamingConvention: i want
    Group: Symbol(),
    Prefix: Symbol(),
};
export type YunaGroup = YunaGroupType & {
    [Keys.resolverFallbackSubCommand]?: string;
};

export interface GroupLink {
    name: string;
    parent: Command;
    aliases?: string[];
    description?: string[];
    fallbackSubCommandName?: string;
    fallbackSubCommand?: Instantiable<SubCommand> | null | string;
    type: typeof ShortcutType.Group;
}

export interface PrefixLink {
    /**
     * The fused name, e.g. "account-create" (parentName + separator + subName).
     * This is the primary alias used to match the command.
     */
    name: string;
    /**
     * All additional fused aliases, generated from every combination of
     * parent aliases × sub aliases (e.g. ["acc-create", "account-cr", "acc-cr"]).
     */
    aliases?: string[];
    parent: Command;
    subCommand: SubCommand;
    type: typeof ShortcutType.Prefix;
}

export const addCommandsEvents = <ClientType extends BaseClient>(client: ClientType) => {
    const self = client as AvailableClients & {
        commands: AvailableClients["commands"] & { [Keys.clientResolverAlreadyModdedEvents]?: true };
    };
    if (!client.commands) return client.logger.warn("[Yuna.resolver] Client.commands is undefined");
    if (self.commands[Keys.clientResolverAlreadyModdedEvents] === true) return;

    for (const event of ["load", "reloadAll"]) {
        const def = client.commands[event as "load"];
        if (!def) continue;

        Object.defineProperty(client.commands, event, {
            async value(...args: Parameters<typeof def>) {
                const val = await def.apply(this, args);
                prepareCommands(client);
                return val;
            },
        });
    }

    self.commands[Keys.clientResolverAlreadyModdedEvents] = true;
};

export const getCommandsMetadata = <ClientType extends BaseClient>(client: ClientType): YunaCommandsMetadata<ClientType> => {
    const self = client as UseYunaCommandsClient<ClientType>;

    // biome-ignore lint/suspicious/noAssignInExpressions: penguin
    return (self[Keys.clientResolverMetadata] ??= {
        shortcuts: [],
        commands: [],
    });
};

export async function prepareCommands<ClientType extends BaseClient>(client: ClientType) {
    const metadata = getCommandsMetadata(client);

    metadata.shortcuts = [];
    metadata.commands = [];

    if (!client.commands?.values.length)
        return client.logger.warn("[Yuna.commands.prepare] The commands have not been loaded yet or there are none at all.");

    const whilePreparing = await metadata.config?.whilePreparing?.call(client, metadata);

    const onCommand = whilePreparing?.onCommand;
    const onSubCommand = whilePreparing?.onSubCommand;

    for (const command of client.commands.values) {
        if (command.type !== ApplicationCommandType.ChatInput) continue;

        metadata.commands.push(command);

        if (command.groups)
            for (const [name, group] of Object.entries(command.groups) as [string, YunaGroup][]) {
                if (!group.shortcut) continue;

                const fallbackSubName = group.fallbackSubCommand ? getFallbackCommandName(group.fallbackSubCommand) : undefined;

                group[Keys.resolverFallbackSubCommand] = fallbackSubName;

                metadata.shortcuts.push({
                    name,
                    parent: command,
                    aliases: group.aliases,
                    type: ShortcutType.Group,
                    fallbackSubCommand: group.fallbackSubCommand,
                    fallbackSubCommandName: fallbackSubName,
                });
            }

        let hasSubCommands = false;

        onCommand?.call(client, command);

        for (const sub of command.options ?? []) {
            if (!(sub instanceof SubCommand)) continue;
            hasSubCommands = true;
            sub.parent = command;

            const yunaSubCommand = sub as YunaCommandUsable;

            if (yunaSubCommand[Keys.resolverIsShortcut] === true) metadata.shortcuts.push(sub);

            if (yunaSubCommand[Keys.resolverIsSubCommandPrefix] === true) {
                const separator = yunaSubCommand[Keys.resolverSubCommandPrefixSeparator] ?? "-";
                const customName = yunaSubCommand[Keys.resolverSubCommandPrefixName];

                let primaryName: string;
                let aliases: string[] | undefined;

                if (customName) {
                    // Custom name provided — use it exactly, no alias cross-products
                    primaryName = customName;
                } else {
                    // Auto-generate: parentName + [groupName +] subName cross-product
                    const parentNames = [command.name, ...(command.aliases ?? [])];
                    const subNames = [sub.name, ...(sub.aliases ?? [])];

                    // If the subcommand belongs to a group, include its name + group aliases
                    const groupName = sub.group;
                    const groupAliases = groupName ? [groupName, ...(command.groups?.[groupName]?.aliases ?? [])] : undefined;

                    const buildFused = (pName: string, sName: string, gName?: string) =>
                        gName ? `${pName}${separator}${gName}${separator}${sName}` : `${pName}${separator}${sName}`;

                    primaryName = buildFused(command.name, sub.name, groupName);

                    // Generate all other cross-product combinations as aliases
                    const allAliases: string[] = [];
                    for (const pName of parentNames) {
                        if (groupAliases) {
                            for (const gName of groupAliases) {
                                for (const sName of subNames) {
                                    const fused = buildFused(pName, sName, gName);
                                    if (fused !== primaryName) allAliases.push(fused);
                                }
                            }
                        } else {
                            for (const sName of subNames) {
                                const fused = buildFused(pName, sName);
                                if (fused !== primaryName) allAliases.push(fused);
                            }
                        }
                    }
                    aliases = allAliases.length ? allAliases : undefined;
                }

                const prefixLink: PrefixLink = {
                    name: primaryName,
                    aliases,
                    parent: command,
                    subCommand: sub,
                    type: ShortcutType.Prefix,
                };

                metadata.shortcuts.push(prefixLink as unknown as SubCommand);
            }

            onSubCommand?.call(client, sub);
        }

        if (!hasSubCommands) (command as YunaCommandUsable)[Keys.resolverSubCommands] = null;
    }

    metadata.config?.afterPrepare?.call(client, metadata);
}

export function resolve<ClientType extends BaseClient>(
    client: UseYunaCommandsClient<ClientType>,
    query: string | string[],
    config?: YunaCommandsResolverConfig<ClientType> | undefined,
    raw?: true,
): YunaResolverResult | undefined;
export function resolve<ClientType extends BaseClient>(
    client: UseYunaCommandsClient<ClientType>,
    query: string | string[],
    config?: YunaCommandsResolverConfig<ClientType> | undefined,
    raw?: false | undefined,
): Command | SubCommand | undefined;
export function resolve<ClientType extends BaseClient>(
    client: UseYunaCommandsClient<ClientType>,
    query: string | string[],
    config?: YunaCommandsResolverConfig<ClientType> | undefined,
    raw?: boolean | undefined,
): Command | SubCommand | undefined | YunaResolverResult {
    const gConfig = getCommandsMetadata(client).config ?? {};
    const result = baseResolver(client, query, config ? { ...gConfig, ...config } : gConfig);
    if (raw) return result;
    return result?.command;
}
