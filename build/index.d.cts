import { ChoiceableTypes, ChoiceableValues, Command, CommandContext, CommandOption, LimitedCollection, Message, OnOptionsReturnObject, OptionsRecord, ReturnOptionsTypes, SeyfertAttachmentOption, SeyfertChoice, SubCommand, UsingClient } from "seyfert";
import { BaseClient } from "seyfert/lib/client/base.js";
import { APIMessage, ApplicationCommandOptionType, GatewayDispatchPayload, GatewayMessageUpdateDispatchData, LocaleString } from "seyfert/lib/types/index.js";
import { Awaitable, MakeRequired } from "seyfert/lib/common/index.js";
import { CommandFromContent, HandleCommand } from "seyfert/lib/commands/handle.js";
//#region src/package/utils/parser/configTypes.d.ts
type ValidLongTextTags = "'" | '"' | "`";
type ValidNamedOptionSyntax = "-" | "--" | ":";
type CommandOptionWithType = CommandOption & {
  type: ApplicationCommandOptionType;
};
interface YunaParserCreateOptions {
  /**
   * this only show console.log with the options parsed.
   * @defaulst false */
  logResult?: boolean;
  /** syntaxes enabled */
  syntax?: {
    /** especify what longText tags you want
     *
     * ` " ` => `"penguin life"`
     *
     * ` ' ` => `'beautiful sentence'`
     *
     * **&#96;** => **\`Eve『Insomnia』 is a good song\`**
     *
     * @default 🐧 all enabled
     */
    longTextTags?: [ValidLongTextTags?, ValidLongTextTags?, ValidLongTextTags?];
    /** especify what named syntax you want
     *
     * ` - ` -option content value
     *
     * ` -- ` --option content value
     *
     * ` : ` option: content value
     *
     * @default 🐧 all enabled
     */
    namedOptions?: [ValidNamedOptionSyntax?, ValidNamedOptionSyntax?, ValidNamedOptionSyntax?];
  };
  /**
   * Turning it on can be useful for when once all the options are obtained,
   * the last one can take all the remaining content, ignoring any other syntax.
   * @default {false}
   */
  breakSearchOnConsumeAllOptions?: boolean;
  /**
   * Limit that you can't use named syntax "-" and ":" at the same time,
   * but only the first one used, sometimes it's useful to avoid confusion.
   * @default {false}
   */
  useUniqueNamedSyntaxAtSameTime?: boolean;
  /**
   * This disables the use of longTextTags in the last option
   * @default {false}
   */
  disableLongTextTagsInLastOption?: boolean | {
    /**
     * @default {false}
     */
    excludeCodeBlocks?: boolean;
  };
  /** Use Yuna's choice resolver instead of the default one, put null if you don't want it,
   *
   * YunaChoiceResolver allows you to search through choices regardless of case or lowercase,
   * as well as allowing direct use of an choice's value,
   * and not being forced to use only the name.
   *
   * @default enabled
   */
  resolveCommandOptionsChoices?: {
    /** Allow you to use the value of a choice directly, not necessarily search by name
     * @default {true}
     */
    canUseDirectlyValue?: boolean;
  } | null;
  /** If the first option is of the 'User' type,
   *  it can be taken as the user to whom the message is replying.
   *  @default {null} (not enabled)
   */
  useRepliedUserAsAnOption?: {
    /** need to have the mention enabled (@PING) */
    requirePing: boolean;
  } | null;
  /**
   *  Allow the use of code block's language as an option
   *
   *  This will always use two options for every code block
   *  The first option is the language (Although it is not specified)
   *  The second option is the code
   *  For this reason, it's not recommended to set this globally
   *  Use it only where needed
   *
   * @default {false}
   */
  useCodeBlockLangAsAnOption?: boolean;
  /**
   * This will cause options with the named syntax to only accept one value instead of all the remaining content.
   * which can be useful with flags at the start.
   * For example:
   * ```sh
   * --named its value
   * ```
   * named option only take "its", and "value" will be taken whichever option is next in the count.
   * @default {false}
   */
  useNamedWithSingleValue?: boolean;
  /**
   * This will cause a longTextTag (`, ", ') to only be initialized if it is NOT preceded by a value.
   *
   * For example:
   *
   * ```ts
   * console.log("yes")
   * ```
   *
   * The above will be parsed only as `console.log("yes")` in a single option.
   *
   * Otherwise, `console.log(` will be one option and `yes` will be the next. Since the `"` will start a new option.
   *
   * In other words, with this configuration, to initialize a longTextTag
   * it must be preceded by a space, line break, another longTextTag, or the beginning of the text.
   *
   * This configuration is enabled by default in `ParserRecommendedConfig.Eval`.
   *
   * @default {false}
   */
  useNonValueLongTextTagStart?: boolean;
}
//#endregion
//#region src/package/utils/parser/createConfig.d.ts
type EscapeModeType = Record<string, RegExp | undefined>;
declare const createRegexes: ({ syntax }: YunaParserCreateOptions) => {
  elementsRegex: RegExp;
  escapeModes: EscapeModeType;
  checkNextChar: RegExp | undefined;
};
declare function DeclareParserConfig(config?: YunaParserCreateOptions): <T extends {
  new (...args: any[]): {};
}>(target: T) => T;
declare const mergeConfig: <T extends YunaParserCreateOptions, A extends YunaParserCreateOptions>(target: T, assing: A) => T & A;
//#endregion
//#region src/package/utils/parser/CommandMetaData.d.ts
type DecoredChoice = [rawName: string, name: string, value: string];
type ValidNamedOptionSyntaxes = Partial<Record<ValidNamedOptionSyntax, true>>;
declare class YunaParserCommandMetaData {
  #private;
  readonly command: YunaCommandUsable;
  readonly iterableOptions: CommandOption[];
  readonly flagOptions: Map<string, CommandOption>;
  regexes?: ReturnType<typeof createRegexes>;
  globalConfig?: YunaParserCreateOptions;
  readonly choices?: [optionName: string, choices: DecoredChoice[]][];
  readonly options: Map<string, CommandOptionWithType>;
  readonly baseConfig?: YunaParserCreateOptions;
  /** ValidNamedOptionSyntaxes */
  vns?: ValidNamedOptionSyntaxes;
  constructor(command: YunaCommandUsable);
  getConfig(globalConfig: YunaParserCreateOptions): YunaParserCreateOptions;
  static from(command: YunaCommandUsable): YunaParserCommandMetaData;
  static getValidNamedOptionSyntaxes(config: YunaParserCreateOptions): ValidNamedOptionSyntaxes;
}
//#endregion
//#region src/package/things.d.ts
declare class Keys {
  static readonly parserMetadata: unique symbol;
  static readonly parserConfig: unique symbol;
  static readonly resolverSubCommands: unique symbol;
  static readonly resolverIsShortcut: unique symbol;
  static readonly resolverIsSubCommandPrefix: unique symbol;
  static readonly resolverSubCommandPrefixSeparator: unique symbol;
  static readonly resolverSubCommandPrefixName: unique symbol;
  /** fallbackSubcommandName */
  static readonly resolverFallbackSubCommand: unique symbol;
  static readonly clientResolverMetadata: unique symbol;
  static readonly clientResolverAlreadyModdedEvents: unique symbol;
  static readonly clientWatcherController: unique symbol;
  static readonly watcherRawCommandRun: unique symbol;
  static readonly watcherStop: unique symbol;
  static readonly messageArgsResult: unique symbol;
  static readonly handleCommandModifiedByYunaPlugin: unique symbol;
}
type Instantiable<C> = {
  new (...args: any[]): C;
};
type AvailableClients = BaseClient;
type ArgPosition = [number, number];
type ArgsResultPositions = Record<string, ArgPosition>;
type ArgsResult = Record<string, string>;
interface ArgsResultMetadata {
  content: string;
  result: ArgsResult;
  positions: ArgsResultPositions;
}
type CommandUsable = (Command | SubCommand) & {
  [Keys.watcherRawCommandRun]?: (Command | SubCommand)["run"];
};
type YunaCommandUsable<T extends CommandUsable = CommandUsable> = T & {
  [Keys.watcherRawCommandRun]?: T["run"];
  [Keys.parserConfig]?: YunaParserCreateOptions;
  [Keys.resolverSubCommands]?: {
    fallback?: Instantiable<SubCommand> | null;
    fallbackName?: string;
  } | null;
  [Keys.resolverIsShortcut]?: boolean;
  [Keys.resolverIsSubCommandPrefix]?: boolean;
  [Keys.resolverSubCommandPrefixSeparator]?: string;
  [Keys.resolverSubCommandPrefixName]?: string;
  constructor: {
    prototype: {
      [Keys.parserMetadata]?: YunaParserCommandMetaData;
    };
  };
};
interface YunaGroupType {
  name?: [language: LocaleString, value: string][];
  description?: [language: LocaleString, value: string][];
  defaultDescription?: string;
  aliases?: string[];
  /**
   * ### Yuna's Text Shortcuts
   * They allow you to access to a group more easily,
   * as if it were a normal command.
   * @example
   * ```
   *  // normal way to access
   *  fun music play
   *  // can now be accessed as
   *  music play
   * ```
   * @requires Yuna.resolver to work.
   */
  shortcut?: boolean;
  /**
   * Allows you to set a subcommand that will be used when one is not found.
   * if not set the first subcommand of this group will be used.
   *
   * use `null` to disable this option for this group.
   * @requires  Yuna.resolver to work.
   */
  fallbackSubCommand?: Instantiable<SubCommand> | string | null;
}
//#endregion
//#region src/package/utils/messageWatcher/types.d.ts
type WatcherOptions = {
  idle?: number;
  time?: number;
};
type RawMessageUpdated = MakeRequired<GatewayMessageUpdateDispatchData, "content">;
type WatcherOnChangeEvent<M extends MessageWatcher, O extends OptionsRecord> = (this: M, ctx: CommandContext<O>, rawMessage: RawMessageUpdated) => any;
type WatcherOnResponseDelete<M extends MessageWatcher> = (this: M, message: Pick<Message, "id" | "channelId">) => any;
type WatcherOnStopEvent<M extends MessageWatcher> = (this: M, reason: string) => any;
type WatcherOnOptionsErrorEvent<M extends MessageWatcher> = (this: M, data: OnOptionsReturnObject) => any;
interface WatcherUsageErrorEvents {
  UnspecifiedPrefix: [];
  CommandChanged: [newCommand: Command | SubCommand | undefined];
}
type WatcherOnUsageErrorEvent<M extends MessageWatcher> = <E extends keyof WatcherUsageErrorEvents>(this: M, reason: E, ...params: WatcherUsageErrorEvents[E]) => any;
interface DecoratorWatchOptions<C extends YunaCommandUsable, O extends OptionsRecord, Context, M extends MessageWatcher<O, Context, C> = MessageWatcher<O, Context, C>> extends WatcherOptions {
  /**
   * It will be emitted before creating the watcher,
   * if you return `false` it will not be created.
   */
  beforeCreate?(this: C, ctx: CommandContext<O>): Awaitable<boolean> | void;
  /** filters the execution of the `onChange` event */
  filter?(...args: Parameters<WatcherOnChangeEvent<MessageWatcher<O>, O>>): boolean;
  onStop?: WatcherOnStopEvent<M>;
  /** set this event will override the default onChange, and NOT execute command run if you not do it manually,
   *  and Watcher.context or Watcher.stop not work if you not return it.  */
  onChange?: WatcherOnChangeEvent<M, O>;
  onUsageError?: WatcherOnUsageErrorEvent<M>;
  onOptionsError?: WatcherOnOptionsErrorEvent<M>;
  onResponseDelete?: WatcherOnResponseDelete<M>;
}
type InferCommandOptions<C extends YunaCommandUsable> = Parameters<NonNullable<C["run"]>>[0] extends CommandContext<infer O> ? O : never;
type InferWatcher<C extends YunaCommandUsable> = MessageWatcher<InferCommandOptions<C>, InferWatcherContext<C>, C>;
type InferWatcherManager<C extends YunaCommandUsable> = MessageWatcherManager<InferCommandOptions<C>, InferWatcherContext<C>, C>;
//#endregion
//#region src/package/utils/messageWatcher/Manager.d.ts
type MessageResolvable = Pick<Message, "id" | "channelId"> | Pick<APIMessage, "id" | "channel_id"> | string;
type MakeCommand<C> = {
  command: C;
};
declare class MessageWatcherManager<const O extends OptionsRecord = any, Context = any, __Command extends CommandUsable = any> {
  #private;
  message: Message;
  /** key where this is stored */
  readonly id: string;
  controller: WatchersController;
  client: UsingClient;
  command: __Command;
  shardId: number;
  context: Context;
  originCtx?: CommandContext<O> & MakeCommand<__Command>;
  ctx?: CommandContext<O> & MakeCommand<__Command>;
  watchers: Set<MessageWatcher<O, Context, __Command>>;
  constructor(controller: WatchersController, client: UsingClient, message: Message, command: Command | SubCommand, shardId?: number, ctx?: CommandContext<O>);
  endReason?: string;
  /** Original command.run without being modified by @Watch decorator **/
  get commandRun(): __Command["run"];
  /** stop this and all watchers in this manager */
  stop(reason: string): void;
  responses: Map<string, boolean>;
  watchResponseDelete(message: MessageResolvable): void;
  createId(messageId: string, channelId?: string): string;
  watch(options?: WatcherOptions): MessageWatcher<O, any, any>;
}
//#endregion
//#region src/package/utils/messageWatcher/Watcher.d.ts
declare class MessageWatcher<const O extends OptionsRecord = any, Context = any, __Command extends CommandUsable = any> {
  #private;
  readonly options: WatcherOptions;
  message: Message;
  controller: WatchersController;
  manager: MessageWatcherManager<O, Context, __Command>;
  client: UsingClient;
  command: __Command;
  shardId: number;
  /** context of the watcher manager */
  get context(): Context;
  constructor(manager: MessageWatcherManager<O>, options?: WatcherOptions);
  /** key where the watcher is stored */
  get id(): string;
  get position(): number | null;
  get remainingTime(): {
    readonly idle: number;
    readonly timeout: number;
  };
  /** Original command.run without being modified by @Watch decorator **/
  get commandRun(): __Command["run"];
  get ctx(): (import("seyfert").CommandContext<O, never> & MakeCommand<__Command>) | undefined;
  get originCtx(): (import("seyfert").CommandContext<O, never> & MakeCommand<__Command>) | undefined;
  refreshTimers(all?: boolean): void;
  resetTimers(): void;
  stopTimers(): void;
  onOptionsError(callback: WatcherOnOptionsErrorEvent<this>): this;
  onChange(callback: WatcherOnChangeEvent<this, O>): this;
  onUsageError(callback: WatcherOnUsageErrorEvent<this>): this;
  onResponseDelete(callback: WatcherOnResponseDelete<this>): this;
  get responses(): Map<string, boolean>;
  get watchResponseDelete(): (message: string | Pick<import("seyfert").APIMessage, "channel_id" | "id"> | Pick<Message, "channelId" | "id">) => void;
  get createId(): (messageId: string, channelId?: string) => string;
  onStop(callback: WatcherOnStopEvent<this>): this;
  endReason?: string;
  /** stop this watcher */
  stop(reason: string): void;
  /** literally stop, but without emitting the `onStop` event */
  break(): void;
  setContext<C extends Context>(context: C): MessageWatcher<O, C, __Command>;
}
//#endregion
//#region src/package/utils/messageWatcher/Controller.d.ts
type WatchersManagersCacheAdapter = Map<string, MessageWatcherManager> | LimitedCollection<string, MessageWatcherManager>;
interface YunaMessageWatcherControllerConfig {
  client: BaseClient;
  cache?: WatchersManagersCacheAdapter;
}
type BaseFindWatcherQuery = {
  messageId?: string;
  channelId?: string;
  guildId?: string;
  userId?: string;
  command?: Command | SubCommand;
};
type WatcherSearchFn = (watcher: MessageWatcherManager) => boolean;
type FindWatcherQuery = BaseFindWatcherQuery | WatcherSearchFn;
type InferCommandCtx<C extends YunaCommandUsable> = C extends YunaCommandUsable ? Parameters<NonNullable<C["run"]>>[0] : never;
type InferCommandOptionsFromCtx<C> = C extends CommandContext<infer R> ? R : never;
type InferWatcherFromQuery<Query extends FindWatcherQuery, C = Query extends BaseFindWatcherQuery ? Query["command"] : null, O = C extends Command ? InferCommandOptionsFromCtx<InferCommandCtx<C>> : null> = O extends OptionsRecord ? C extends Command ? MessageWatcherManager<O, InferWatcherContext<C>, C> : MessageWatcherManager<O> : MessageWatcherManager<any>;
type WatcherCreateData = Pick<CommandContext, "client" | "command" | "message" | "shardId">;
type InferWatcherContext<C extends YunaCommandUsable | undefined> = C extends YunaCommandUsable ? Extract<Awaited<ReturnType<NonNullable<C["run"]>>>, WatcherContext<any>> extends WatcherContext<infer V> ? V : never : never;
type InferWatcherManagerFromCtx<C, Command extends YunaCommandUsable> = MessageWatcherManager<InferCommandOptionsFromCtx<C>, InferWatcherContext<Command>, Command>;
declare class WatchersController {
  #private;
  /** watchers managers cache */
  managers: WatchersManagersCacheAdapter;
  responsesManagers: WatchersManagersCacheAdapter;
  watching: boolean;
  client: BaseClient;
  constructor({ cache, client }: YunaMessageWatcherControllerConfig);
  usePluginEvents(enabled?: boolean): this;
  handleRawEvent({ t: event, d: data }: GatewayDispatchPayload): void;
  init(): void;
  create<const O extends OptionsRecord | undefined = undefined, const C extends WatcherCreateData = WatcherCreateData>(ctx: C, options?: WatcherOptions): MessageWatcher<O extends undefined ? C extends CommandContext<infer R extends OptionsRecord, never> ? R : {} : O, any, any>;
  getWatcherFromContext<const Ctx extends CommandContext, const Command extends YunaCommandUsable>({ message }: Ctx, _commandType?: Command): InferWatcherManagerFromCtx<Ctx, Command> | undefined;
  findWatcher<Query extends FindWatcherQuery>(query: Query): InferWatcherFromQuery<Query> | undefined;
  findManyWatchers<Query extends FindWatcherQuery>(query: Query): InferWatcherFromQuery<Query>[];
}
//#endregion
//#region src/package/utils/messageWatcher/controllerUtils.d.ts
declare const createController: ({ client, cache }: YunaMessageWatcherControllerConfig) => WatchersController;
declare const getController: (client: AvailableClients) => WatchersController | undefined;
declare const createWatcher: <const O extends OptionsRecord | undefined = undefined, const C extends WatcherCreateData = WatcherCreateData>(ctx: C, options?: WatcherOptions) => MessageWatcher<O extends undefined ? C extends import("seyfert").CommandContext<infer R extends OptionsRecord, never> ? R : {} : O, any, any>;
//#endregion
//#region src/package/utils/messageWatcher/watcherUtils.d.ts
declare function DecoratorWatcher<const C extends YunaCommandUsable, O extends InferCommandOptions<C>, Context = InferWatcherContext<C>>(options: DecoratorWatchOptions<C, O, Context>): (_target: C, _propertyKey: "run", descriptor: PropertyDescriptor) => any;
declare class WatcherContext<const V> {
  readonly value: V;
  constructor(value: V);
}
interface WatcherStopPayload {
  [Keys.watcherStop]: true;
  reason?: string;
}
interface WatchUtils {
  create: typeof createWatcher;
  createController: typeof createController;
  getController: typeof getController;
  /**  Get `MessageWatcherManager` associated to a `CommandContext`. */
  getFromContext<Ctx extends CommandContext, Command extends YunaCommandUsable>(ctx: Ctx, command?: Command): InferWatcherManagerFromCtx<Ctx, Command> | undefined;
  /**
   * Find an `MessageWatcherManager` from a query.
   */
  find<Query extends FindWatcherQuery>(client: AvailableClients, query: Query): InferWatcherFromQuery<Query> | undefined;
  /** Similar to `find` but this one will filter through all, it is used in the same way, but it will return all matches */
  findMany<Query extends FindWatcherQuery>(client: AvailableClients, query: Query): InferWatcherFromQuery<Query>[] | undefined;
  /**
   * Use it to know when a `CommandContext` is being watched.
   */
  isWatching(ctx: CommandContext): boolean;
  context<V>(value: V): WatcherContext<V>;
  stop(reason?: string): WatcherStopPayload;
}
declare const Watch: typeof DecoratorWatcher & WatchUtils;
//#endregion
//#region src/package/lib/utils.d.ts
declare const fullNameOf: (command: Command | SubCommand) => string;
//#endregion
//#region src/package/seyfert.d.ts
interface BaseExtendedOption {
  /**
   * with this, you can only use this option as a namedOption and not in a normal way
   *
   * @requires {YunaParser}
   */
  flag?: boolean;
  /**
   * This will cause options with the named syntax to only accept one value instead of all the remaining content.
   * which can be useful with flags at the start.
   * For example:
   * ```sh
   * --named its value
   * ```
   * named option only take "its", and "value" will be taken whichever option is next in the count.
   * @default {false}
   */
  useNamedWithSingleValue?: boolean;
}
declare module "seyfert" {
  interface SubCommand {
    /** This property is part of Yuna.resolver, without using it, it may not be available. */
    parent?: Command;
  }
  interface SeyfertBasicOption<T extends keyof ReturnOptionsTypes, R = true | false> extends BaseExtendedOption {}
  interface SeyfertBaseChoiceableOption<T extends keyof ReturnOptionsTypes, C = T extends ChoiceableTypes ? readonly SeyfertChoice<ChoiceableValues[T]>[] : never, R = true | false, VC = never> extends BaseExtendedOption {}
  function createAttachmentOption<R extends boolean, T extends Omit<SeyfertAttachmentOption<R>, keyof BaseExtendedOption> = Omit<SeyfertAttachmentOption<R>, keyof BaseExtendedOption>>(data: T): T & {
    readonly type: ApplicationCommandOptionType.Attachment;
  };
  function Groups(groups: Record<string, YunaGroupType>): <T extends Instantiable<any>>(target: T) => T;
  interface Message {
    [Keys.messageArgsResult]?: ArgsResultMetadata;
  }
}
//#endregion
//#region src/package/utils/commandsResolver/resolver.d.ts
interface SearchPlugin {
  findShortcut?(shortcutName: string, shortcuts?: (SubCommand | GroupLink)[]): (SubCommand | GroupLink) | undefined;
  findCommand?(commandName: string): Command | undefined;
  findGroupName?(possiblyGroup: string, command: Command): string | undefined;
  findSubCommand?(query: string, command: Command, groupName?: string): SubCommand | undefined;
}
interface YunaCommandsResolverConfig<ClientType extends BaseClient = BaseClient> {
  /**
   * It will allow that in case an unrecognized subcommand is used,
   * use a specified default one or the first one you have.
   */
  useFallbackSubCommand?: boolean;
  logResult?: boolean;
  afterPrepare?(this: ClientType, metadata: YunaCommandsMetadata<ClientType>): any;
  whilePreparing?(this: ClientType, metadata: YunaCommandsMetadata<ClientType>): Awaitable<{
    onCommand?(command: Command): any;
    onSubCommand?(subCommand: SubCommand): any;
  } | null>;
  mapResult?(result: MakeRequired<CommandFromContent, "parent">): CommandFromContent;
  /** @experimental
   * extend search functions if not found
   */
  extendSearch?(): SearchPlugin;
}
declare function YunaCommandsResolver<ClientType extends BaseClient>({ client, useFallbackSubCommand, logResult, afterPrepare, whilePreparing, mapResult, extendSearch }: YunaCommandsResolverConfig<ClientType> & {
  client: ClientType;
}): (this: HandleCommand, content: string) => {
  command?: Command | SubCommand;
  parent?: Command;
  fullCommandName: string;
  argsContent: string;
};
//#endregion
//#region src/package/utils/commandsResolver/base.d.ts
type UseableCommand = Command | SubCommand;
interface YunaResolverResult {
  parent?: Command;
  group?: YunaGroupType;
  command: UseableCommand;
  endPad?: number;
}
//#endregion
//#region src/package/utils/commandsResolver/prepare.d.ts
interface YunaCommandsMetadata<ClientType extends BaseClient = BaseClient> {
  shortcuts: (SubCommand | GroupLink)[];
  commands: Command[];
  config?: YunaCommandsResolverConfig<ClientType>;
}
type UseYunaCommandsClient<ClientType extends BaseClient = BaseClient> = ClientType & {
  [Keys.clientResolverMetadata]?: YunaCommandsMetadata<ClientType>;
};
declare const ShortcutType: {
  Group: symbol;
  Prefix: symbol;
};
interface GroupLink {
  name: string;
  parent: Command;
  aliases?: string[];
  description?: string[];
  fallbackSubCommandName?: string;
  fallbackSubCommand?: Instantiable<SubCommand> | null | string;
  type: typeof ShortcutType.Group;
}
declare const getCommandsMetadata: <ClientType extends BaseClient>(client: ClientType) => YunaCommandsMetadata<ClientType>;
declare function prepareCommands<ClientType extends BaseClient>(client: ClientType): Promise<void>;
declare function resolve<ClientType extends BaseClient>(client: UseYunaCommandsClient<ClientType>, query: string | string[], config?: YunaCommandsResolverConfig<ClientType> | undefined, raw?: true): YunaResolverResult | undefined;
declare function resolve<ClientType extends BaseClient>(client: UseYunaCommandsClient<ClientType>, query: string | string[], config?: YunaCommandsResolverConfig<ClientType> | undefined, raw?: false | undefined): Command | SubCommand | undefined;
//#endregion
//#region src/package/utils/parser/parser.d.ts
declare const YunaParser: (config?: YunaParserCreateOptions) => (this: HandleCommand, content: string, command: Command | SubCommand, message?: Message) => Record<string, string>;
//#endregion
//#region src/package/utils/commandsResolver/decorators.d.ts
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
declare function Shortcut(): <T extends Instantiable<SubCommand>>(target: T) => {
  new (...args: any[]): {
    [Keys.resolverIsShortcut]: boolean;
    run: SubCommand["run"];
    middlewares: readonly (keyof import("seyfert").ResolvedRegisteredMiddlewares)[];
    __filePath?: string;
    __t?: {
      name: string | undefined;
      description: string | undefined;
    };
    __autoload?: true;
    guildId?: string[];
    name: string;
    nsfw?: boolean;
    description: string;
    defaultMemberPermissions?: bigint;
    integrationTypes: import("seyfert").ApplicationIntegrationType[];
    contexts: import("seyfert").InteractionContextType[];
    botPermissions?: bigint;
    name_localizations?: Partial<Record<import("seyfert").LocaleString, string>>;
    description_localizations?: Partial<Record<import("seyfert").LocaleString, string>>;
    ignore?: import("seyfert").IgnoreCommand;
    aliases?: string[];
    props: import("seyfert").ExtraProps;
    reload(): Promise<void>;
    onBeforeMiddlewares?(context: import("seyfert").CommandContext): any;
    onBeforeOptions?(context: import("seyfert").CommandContext): any;
    onAfterRun?(context: import("seyfert").CommandContext, error: unknown | undefined): any;
    onRunError?(context: import("seyfert").CommandContext, error: unknown): any;
    onOptionsError?(context: import("seyfert").CommandContext, metadata: import("seyfert").OnOptionsReturnObject): any;
    onMiddlewaresError?(context: import("seyfert").CommandContext, error: string, metadata: import("seyfert").PluginMiddlewareDenialMetadata): any;
    onBotPermissionsFail?(context: import("seyfert").CommandContext, permissions: import("seyfert").PermissionStrings): any;
    onPermissionsFail?(context: import("seyfert").CommandContext, permissions: import("seyfert").PermissionStrings): any;
    onInternalError?(client: import("seyfert/lib/commands").UsingClient, command: Command | SubCommand, error?: unknown): any;
    type: import("seyfert").ApplicationCommandOptionType;
    group?: string;
    options?: import("seyfert/lib/commands/handle").CommandOptionWithType[];
    toJSON(): {
      options: import("seyfert").APIApplicationCommandBasicOption[];
      name: import("seyfert").BaseCommand["name"];
      type: import("seyfert").BaseCommand["type"];
      nsfw: import("seyfert").BaseCommand["nsfw"];
      description: import("seyfert").BaseCommand["description"];
      name_localizations: import("seyfert").BaseCommand["name_localizations"];
      description_localizations: import("seyfert").BaseCommand["description_localizations"];
      guild_id: import("seyfert").BaseCommand["guildId"];
      default_member_permissions: string;
      contexts: import("seyfert").BaseCommand["contexts"];
      integration_types: import("seyfert").BaseCommand["integrationTypes"];
    };
    parent?: Command;
  };
} & T;
interface SubCommandPrefixOptions {
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
declare function SubCommandPrefix(options?: SubCommandPrefixOptions): <T extends Instantiable<SubCommand>>(target: T) => {
  new (...args: any[]): {
    [Keys.resolverIsSubCommandPrefix]: boolean;
    [Keys.resolverSubCommandPrefixSeparator]: string;
    [Keys.resolverSubCommandPrefixName]: string | undefined;
    run: SubCommand["run"];
    middlewares: readonly (keyof import("seyfert").ResolvedRegisteredMiddlewares)[];
    __filePath?: string;
    __t?: {
      name: string | undefined;
      description: string | undefined;
    };
    __autoload?: true;
    guildId?: string[];
    name: string;
    nsfw?: boolean;
    description: string;
    defaultMemberPermissions?: bigint;
    integrationTypes: import("seyfert").ApplicationIntegrationType[];
    contexts: import("seyfert").InteractionContextType[];
    botPermissions?: bigint;
    name_localizations?: Partial<Record<import("seyfert").LocaleString, string>>;
    description_localizations?: Partial<Record<import("seyfert").LocaleString, string>>;
    ignore?: import("seyfert").IgnoreCommand;
    aliases?: string[];
    props: import("seyfert").ExtraProps;
    reload(): Promise<void>;
    onBeforeMiddlewares?(context: import("seyfert").CommandContext): any;
    onBeforeOptions?(context: import("seyfert").CommandContext): any;
    onAfterRun?(context: import("seyfert").CommandContext, error: unknown | undefined): any;
    onRunError?(context: import("seyfert").CommandContext, error: unknown): any;
    onOptionsError?(context: import("seyfert").CommandContext, metadata: import("seyfert").OnOptionsReturnObject): any;
    onMiddlewaresError?(context: import("seyfert").CommandContext, error: string, metadata: import("seyfert").PluginMiddlewareDenialMetadata): any;
    onBotPermissionsFail?(context: import("seyfert").CommandContext, permissions: import("seyfert").PermissionStrings): any;
    onPermissionsFail?(context: import("seyfert").CommandContext, permissions: import("seyfert").PermissionStrings): any;
    onInternalError?(client: import("seyfert/lib/commands").UsingClient, command: Command | SubCommand, error?: unknown): any;
    type: import("seyfert").ApplicationCommandOptionType;
    group?: string;
    options?: import("seyfert/lib/commands/handle").CommandOptionWithType[];
    toJSON(): {
      options: import("seyfert").APIApplicationCommandBasicOption[];
      name: import("seyfert").BaseCommand["name"];
      type: import("seyfert").BaseCommand["type"];
      nsfw: import("seyfert").BaseCommand["nsfw"];
      description: import("seyfert").BaseCommand["description"];
      name_localizations: import("seyfert").BaseCommand["name_localizations"];
      description_localizations: import("seyfert").BaseCommand["description_localizations"];
      guild_id: import("seyfert").BaseCommand["guildId"];
      default_member_permissions: string;
      contexts: import("seyfert").BaseCommand["contexts"];
      integration_types: import("seyfert").BaseCommand["integrationTypes"];
    };
    parent?: Command;
  };
} & T;
/**
 * Allows you to set a subcommand that will be used when one is not found.
 * if not set the first subcommand will be used.
 * use `null` to disable this option for this command.
 * @requires  Yuna.resolver to work.
 */
declare function DeclareFallbackSubCommand(command: Instantiable<SubCommand> | null | string): <T extends Instantiable<Command>>(target: T) => {
  new (...args: any[]): {
    [Keys.resolverSubCommands]: {
      fallback: string | Instantiable<SubCommand> | null;
      fallbackName: string | undefined;
    };
    middlewares: readonly (keyof import("seyfert").ResolvedRegisteredMiddlewares)[];
    __filePath?: string;
    __t?: {
      name: string | undefined;
      description: string | undefined;
    };
    __autoload?: true;
    guildId?: string[];
    name: string;
    nsfw?: boolean;
    description: string;
    defaultMemberPermissions?: bigint;
    integrationTypes: import("seyfert").ApplicationIntegrationType[];
    contexts: import("seyfert").InteractionContextType[];
    botPermissions?: bigint;
    name_localizations?: Partial<Record<import("seyfert").LocaleString, string>>;
    description_localizations?: Partial<Record<import("seyfert").LocaleString, string>>;
    options?: import("seyfert/lib/commands/handle").CommandOptionWithType[] | SubCommand[];
    ignore?: import("seyfert").IgnoreCommand;
    aliases?: string[];
    props: import("seyfert").ExtraProps;
    reload(): Promise<void>;
    onBeforeMiddlewares?(context: import("seyfert").CommandContext): any;
    onBeforeOptions?(context: import("seyfert").CommandContext): any;
    run?(context: import("seyfert").CommandContext): any;
    onAfterRun?(context: import("seyfert").CommandContext, error: unknown | undefined): any;
    onRunError?(context: import("seyfert").CommandContext, error: unknown): any;
    onOptionsError?(context: import("seyfert").CommandContext, metadata: import("seyfert").OnOptionsReturnObject): any;
    onMiddlewaresError?(context: import("seyfert").CommandContext, error: string, metadata: import("seyfert").PluginMiddlewareDenialMetadata): any;
    onBotPermissionsFail?(context: import("seyfert").CommandContext, permissions: import("seyfert").PermissionStrings): any;
    onPermissionsFail?(context: import("seyfert").CommandContext, permissions: import("seyfert").PermissionStrings): any;
    onInternalError?(client: import("seyfert/lib/commands").UsingClient, command: Command | SubCommand, error?: unknown): any;
    type: import("seyfert").ApplicationCommandType;
    groups?: Parameters<typeof import("seyfert").Groups>[0];
    groupsAliases?: Record<string, string>;
    __tGroups?: Record<string, {
      name: string | undefined;
      description: string | undefined;
      defaultDescription: string;
    }>;
    toJSON(): {
      options: import("seyfert").APIApplicationCommandOption[];
      name: import("seyfert").BaseCommand["name"];
      type: import("seyfert").BaseCommand["type"];
      nsfw: import("seyfert").BaseCommand["nsfw"];
      description: import("seyfert").BaseCommand["description"];
      name_localizations: import("seyfert").BaseCommand["name_localizations"];
      description_localizations: import("seyfert").BaseCommand["description_localizations"];
      guild_id: import("seyfert").BaseCommand["guildId"];
      default_member_permissions: string;
      contexts: import("seyfert").BaseCommand["contexts"];
      integration_types: import("seyfert").BaseCommand["integrationTypes"];
    };
  };
} & T;
//#endregion
//#region src/package/index.d.ts
declare const ParserRecommendedConfig: {
  /** things that I consider necessary in an Eval command. */
  Eval: {
    breakSearchOnConsumeAllOptions: true;
    disableLongTextTagsInLastOption: {
      excludeCodeBlocks: true;
    };
    useNonValueLongTextTagStart: true;
  };
};
declare const yunaGetArgsResult: (resolvable?: CommandContext | Message) => ArgsResultMetadata | undefined;
interface YunaPluginOptions {
  parser?: YunaParserCreateOptions | true;
  resolver?: Omit<YunaCommandsResolverConfig, "client"> | true;
  watcher?: Omit<YunaMessageWatcherControllerConfig, "client">;
}
declare const createYunaPlugin: ({ parser, resolver, watcher }?: YunaPluginOptions) => Omit<import("seyfert").SeyfertPlugin<{
  yuna: BaseYuna;
}, {
  yuna: BaseYuna;
}, readonly [], {}>, "meta"> & {
  readonly name: "yunaforseyfert";
  readonly instanceId?: string;
  readonly imports?: readonly [] | undefined;
  readonly requires?: readonly import("seyfert").PluginRequirementInput[];
  readonly client?: import("seyfert").PluginClientMap<{
    yuna: BaseYuna;
  }, readonly []> | undefined;
  readonly ctx?: import("seyfert").PluginContextMap<{
    yuna: BaseYuna;
  }, readonly [], {
    yuna: BaseYuna;
  }> | undefined;
  readonly middlewares?: {} | undefined;
  readonly globalMiddlewares?: readonly never[] | undefined;
} & {
  readonly parser: typeof YunaParser;
  readonly resolver: typeof YunaCommandsResolver;
  readonly mergeParserConfig: typeof mergeConfig;
  readonly commands: {
    prepare: typeof prepareCommands;
    resolve: typeof resolve;
    /**
     * if it is a subcommand,
     * it will need to have the `parent` property (using Yuna.resolver will be added)
     */
    fullNameOf: typeof fullNameOf;
    getMetadata: typeof getCommandsMetadata;
    isParent(command: Command | SubCommand): command is Command & {
      options: SubCommand[];
    };
  };
  readonly getArgsResult: typeof yunaGetArgsResult;
  readonly watchers: WatchUtils;
};
declare class BaseYuna {
  /**
   * 🐧
   * @example
   *
   * ```ts
   * import { Client, definePlugins } from "seyfert";
   * import { Yuna } from "yunaforseyfert";
   *
   * const client = new Client({
   *     plugins: definePlugins(
   *          Yuna.plugin({
   *              parser: {
   *              // parser options
   *              }, // or simply parser: true, to enable it with default settings,
   *
   *              resolver: {
   *              // resolver options
   *              }, // or simply resolver: true, to enable it with default settings,
   *
   *              // also the settings for `Yuna.watchers.createController` should be placed here
   *              watcher: { // example (optional)
   *                  cache: new LimitedCollection(your settings)
   *              }
   *          }),
   *      ),
   *  });
   * ```
   */
  plugin: typeof createYunaPlugin;
  /**
   * 🐧
   * @example
   * ```ts
   * import { HandleCommand } from "seyfert/lib/commands/handle";
   * import { Yuna } from "yunaforseyfert";
   *
   * class YourHandleCommand extends HandleCommand {
   *     argsParser = Yuna.parser(); // Here are the settings
   * }
   * // your bot's client
   * client.setServices({
   *     handleCommand: YourHandleCommand,
   * });
   * ```
   */
  parser: typeof YunaParser;
  /**
   * 🐧
   * @example
   * ```ts
   * import { HandleCommand } from "seyfert/lib/commands/handle";
   * import { Yuna } from "yunaforseyfert";
   *
   * class YourHandleCommand extends HandleCommand {
   *      resolveCommandFromContent = Yuna.resolver({
   *          // You need to pass the client in order to prepare the commands that the resolver will use.
   *          client: this.client,
   *          // Event to be emitted each time the commands are prepared.
   *          afterPrepare: (metadata) => {
   *              this.client.logger.debug(`Ready to use ${metadata.commands.length} commands !`);
   *          },
   *      });
   * }
   * // your bot's client
   * client.setServices({
   *     handleCommand: YourHandleCommand,
   * });
   * ```
   */
  resolver: typeof YunaCommandsResolver;
  mergeParserConfig: typeof mergeConfig;
  commands: {
    prepare: typeof prepareCommands;
    resolve: typeof resolve;
    /**
     * if it is a subcommand,
     * it will need to have the `parent` property (using Yuna.resolver will be added)
     */
    fullNameOf: typeof fullNameOf;
    getMetadata: typeof getCommandsMetadata;
    isParent(command: Command | SubCommand): command is Command & {
      options: SubCommand[];
    };
  };
  getArgsResult: typeof yunaGetArgsResult;
  watchers: WatchUtils;
}
declare const Yuna: BaseYuna;
//#endregion
export { type ArgPosition, type ArgsResult, type ArgsResultMetadata, DeclareFallbackSubCommand, DeclareParserConfig, type DecoratorWatchOptions, type YunaGroupType as GroupType, type InferWatcher, type InferWatcherContext, type InferWatcherManager, type MessageWatcher, type MessageWatcherManager, ParserRecommendedConfig, Shortcut, SubCommandPrefix, Watch, type WatcherOnChangeEvent, type WatcherOnOptionsErrorEvent, type WatcherOnStopEvent, type WatcherOnUsageErrorEvent, type WatcherOptions, Yuna, YunaPluginOptions, type YunaResolverResult, createWatcher, createYunaPlugin };