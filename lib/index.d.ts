// Type definitions for gstore-node v5.0.0
// Project: [gstore-node]
// Definitions by: [Sébastien Loix] <[http://s.loix.me]>

/// <reference types="node" />

import { Datastore } from "@google-cloud/datastore";
import { entity } from "@google-cloud/datastore/build/src/entity";
import {
    Query as GoogleDatastoreQuery,
    Operator
} from "@google-cloud/datastore/build/src/query";
import { Transaction } from "@google-cloud/datastore/build/src/transaction";

/**
 * gstore-node Instance
 *
 * @class Gstore
 */
export class Gstore {
    constructor(config?: GstoreConfig);

    /**
     * The unerlying google-cloud Datastore instance
     */
    ds: any;

    /**
     * The underlying gstore-cache instance
     *
     * @type {GstoreCache}
     */
    cache: GstoreCache.Cache;

    Schema: typeof Schema;

    /**
     * Default Values helpers for Schemas
     *
     * @type {{ NOW: string }}
     */
    defaultValues: { NOW: string };

    errors: {
        codes: ErrorCodes;
        GstoreError: typeof GstoreError;
        ValidationError: typeof ValidationError;
        TypeError: typeof TypeError;
        ValueError: typeof ValueError;
    };

    /**
     * Initialize a @google-cloud/datastore Transaction
     */
    transaction(): any;

    /**
     * Connect gstore node to the Datastore instance
     *
     * @param {Datastore} datastore A Datastore instance
     */
    connect(datastore: Datastore): void;

    /**
     * Initalize a gstore-node Model
     *
     * @param {string} entityKind The Google Entity Kind
     * @returns {Model} A gstore Model
     */
    model<T = { [propName: string]: any }>(
        entityKind: string,
        schema?: Schema<T>
    ): Model<T>;

    /**
     * Create a DataLoader instance
     *
     * @returns {DataLoader} The DataLoader instance
     * @link https://sebelga.gitbooks.io/gstore-node/content/dataloader.html#dataloader
     */
    createDataLoader(): DataLoader;

    /**
     * This method is an alias of the underlying @google-cloud/datastore save() method, with the exception that you can pass it an Entity instance or an Array of entities instances and this method will first convert the instances to the correct Datastore format before saving.
     *
     * @param {(Entity | Entity[])} entity The entity(ies) to delete (any Entity Kind). Can be one or many (Array).
     * @param {Transaction} [transaction] An Optional transaction to save the entities into
     * @returns {Promise<any>}
     */
    save(
        entity: Entity | Entity[],
        transaction?: Transaction,
        options?: {
            validate?: boolean;
            method?: "insert" | "update" | "upsert";
        }
    ): Promise<any>;
}

/**
 * gstore-node Schema
 *
 * @class Schema
 */
export class Schema<T = { [key: string]: any }> {
    constructor(
        properties: { [P in keyof T]: SchemaPathDefinition },
        options?: SchemaOptions
    );

    /**
     * Custom Schema Types
     */
    static Types: {
        Double: "double";
        GeoPoint: "geoPoint";
        Key: "entityKey";
    };

    /**
     * Schema paths
     *
     * @type {{ [propName: string]: SchemaPathDefinition }}
     */
    readonly paths: { [P in keyof T]: SchemaPathDefinition };
    /**
 * Add custom methods to entities.
 * @link https://sebelga.gitbooks.io/gstore-node/content/schema/custom-methods.html
 *
 * @example
 * ```
 * schema.methods.profilePict = function() {
     return this.model('Image').get(this.imgIdx)
    * }
    * ```
    */
    readonly methods: { [propName: string]: (...args: any[]) => any };

    /**
     * Getter / Setter for Schema paths.
     *
     * @param {string} propName The entity property
     * @param {SchemaPathDefinition} [definition] The property definition
     * @link https://sebelga.gitbooks.io/gstore-node/content/schema/schema-methods/path.html
     */
    path(propName: string, definition?: SchemaPathDefinition): void;

    /**
     * Getter / Setter of a virtual property.
     * Virtual properties are created dynamically and not saved in the Datastore.
     *
     * @param {string} propName The virtual property name
     * @link https://sebelga.gitbooks.io/gstore-node/content/schema/schema-methods/virtual.html
     */
    virtual(
        propName: string
    ): {
        get(cb: () => any): void;
        set(cb: (propName: string) => void): void;
    };

    queries(shortcutQuery: "list", options: QueryListOptions): void;

    /**
     * Register a middleware to be executed before "save()", "delete()", "findOne()" or any of your custom method. The callback will receive the original argument(s) passed to the target method. You can modify them in your resolve passing an object with an __override property containing the new parameter(s) for the target method.
     *
     * @param {string} method The target method to add the hook to
     * @param {(...args: any[]) => Promise<any>} callback Function to execute before the target method. It must return a Promise
     * @link https://sebelga.gitbooks.io/gstore-node/content/middleware-hooks/pre-hooks.html
     */
    pre(
        method: string,
        callback: funcReturningPromise | funcReturningPromise[]
    ): void;

    /**
     * Register a "post" middelware to execute after a target method.
     *
     * @param {string} method The target method to add the hook to
     * @param {(response: any) => Promise<any>} callback Function to execute after the target method. It must return a Promise
     * @link https://sebelga.gitbooks.io/gstore-node/content/middleware-hooks/post-hooks.html
     */
    post(
        method: string,
        callback: funcReturningPromise | funcReturningPromise[]
    ): void;

    /**
     * Executes joi.validate on given data. If schema does not have a joi config object data is returned
     * 
     * @param {*} data The data to sanitize
     * @returns {*} The data sanitized
     */
    validateJoi(data: { [propName: string]: any }): Validation<{ [P in keyof T]: T[P] }>;

    /**
     * Checks if the schema has a joi config object.
     */
    readonly isJoi: boolean;
}

export interface Model<T = { [propName: string]: any }> {
    /**
     * gstore-node instance
     *
     * @static
     * @type {Gstore}
     */
    gstore: Gstore;

    /**
     * The Model Schema
     *
     * @static
     * @type {Schema}
     */
    schema: Schema;

    /**
     * The Model Datastore Entity Kind
     *
     * @static
     * @type {string}
     */
    entityKind: string;

    /**
     * Creates an entity, instance of the Model.
     * @param {{ [propName: string]: any }} data The entity data
     * @param {(string | number)} [id] An optional entity id or name. If not provided it will be automatically generated.
     * @param {(Array<string | number>)} [ancestors] The entity Ancestors
     * @param {string} [namespace] The entity Namespace
     */
    new (
        data: { [P in keyof T]: T[P] },
        id?: string | number,
        ancestors?: Array<string | number>,
        namespace?: string
    ): Entity<T>;

    /**
     * Fetch an Entity by KEY from the Datastore
     *
     * @param {(string | number | string[] | number[])} id The entity ID
     * @param {(Array<string | number>)} [ancestors] The entity Ancestors
     * @param {string} [namespace] The entity Namespace
     * @param {*} [transaction] The current Datastore Transaction (if any)
     * @param {({ preserveOrder: boolean, dataloader: any, cache: boolean, ttl: number | { [propName: string] : number } })} [options] Additional configuration
     * @returns {Promise<any>} The entity fetched from the Datastore
     * @link https://sebelga.gitbooks.io/gstore-node/content/model/get.html
     */
    get<U extends string | number | Array<string | number>>(
        id: U,
        ancestors?: Array<string | number>,
        namespace?: string,
        transaction?: Transaction,
        options?: {
            /**
             * If you have provided an Array of ids, the order returned by the Datastore is not guaranteed. If you need the entities back in the same order of the IDs provided, then set `preserveOrder: true`
             *
             * @type {boolean}
             * @default false
             */
            preserveOrder?: boolean;
            /**
             * An optional Dataloader instance.
             *
             * @type {*}
             * @link https://sebelga.gitbooks.io/gstore-node/content/dataloader.html#dataloader
             */
            dataloader?: any;
            /**
             * Only if the cache has been activated.
             * Fetch the entity from the cache first. If you want to bypass the cache and go to the Datastore directly, set `cache: false`.
             *
             * @type {boolean}
             * @default The "global" cache configuration
             * @link https://sebelga.gitbooks.io/gstore-node/content/cache.html
             */
            cache?: boolean;
            /**
             * Only if the cache has been activated.
             * After the entty has been fetched from the Datastore it will be added to the cache. You can specify here a custom ttl (Time To Live) for the entity.
             *
             * @type {(number | { [propName: string] : number })}
             * @default The "ttl.keys" cache configuration
             * @link https://sebelga.gitbooks.io/gstore-node/content/cache.html
             */
            ttl?: number | { [propName: string]: number };
        }
    ): PromiseWithPopulate<
        U extends Array<string | number> ? Entity<T>[] : Entity<T>
    >;

    /**
     * Update an Entity in the Datastore
     *
     * @static
     * @param {(string | number)} id Entity id or name
     * @param {*} data The data to update (it will be merged with the data in the Datastore unless options.replace is set to "true")
     * @param {(Array<string | number>)} [ancestors] The entity Ancestors
     * @param {string} [namespace] The entity Namespace
     * @param {*} [transaction] The current transaction (if any)
     * @param {{ dataloader?: any, replace?: boolean }} [options] Additional configuration
     * @returns {Promise<any>} The entity updated in the Datastore
     * @link https://sebelga.gitbooks.io/gstore-node/content/model/update-method.html
     */
    update(
        id: string | number,
        data: any,
        ancestors?: Array<string | number>,
        namespace?: string,
        transaction?: Transaction,
        options?: {
            /**
             * An optional Dataloader instance.
             *
             * @type {*}
             * @link https://sebelga.gitbooks.io/gstore-node/content/dataloader.html#dataloader
             */
            dataloader?: any;

            /**
             * By default, gstore-node update en entity in 3 steps (inside a Transaction): fetch the entity in the Datastore, merge the data with the existing entity data and then save the entiy back to the Datastore. If you don't need to merge the data and want to replace whatever is in the Datastore, set `replace: true`.
             *
             * @type {boolean}
             * @default false
             */
            replace?: boolean;
        }
    ): Promise<Entity<T>>;

    /**
     * Delete an Entity from the Datastore
     *
     * @static
     * @param {(string | number)} id Entity id or name
     * @param {(Array<string | number>)} [ancestors] The entity Ancestors
     * @param {string} [namespace] The entity Namespace
     * @param {*} [transaction] The current transaction (if any)
     * @param {(entity.Key | entity.Key[])} [keys] If you already know the Key, you can provide it instead of passing an id/ancestors/namespace. You might then as well just call "gstore.ds.delete(Key)" but then you would not have the "hooks" triggered in case you have added some in your Schema.
     * @returns {Promise<{ success: boolean, key: entity.Key, apiResponse: any }>}
     * @link https://sebelga.gitbooks.io/gstore-node/content/model/delete.html
     */
    delete(
        id?: string | number | (number | string)[],
        ancestors?: Array<string | number>,
        namespace?: string,
        transaction?: Transaction,
        keys?: entity.Key | entity.Key[]
    ): Promise<DeleteResult>;

    /**
     * Dynamically remove a property from indexes. If you have set "explicityOnly: false" in your Schema options, then all the properties not declared in the Schema will be included in the indexes. This method allows you to dynamically exclude from indexes certain properties."
     *
     * @static
     * @param {(string | string[])} propName Property name (can be one or an Array of properties)
     * @link https://sebelga.gitbooks.io/gstore-node/content/model/other-methods.html
     */
    excludeFromIndexes(propName: string | string[]): void;

    /**
     * Generates one or several entity key(s) for the Model.
     *
     * @static
     * @param {(string | number)} id Entity id or name
     * @param {(Array<string | number>)} [ancestors] The entity Ancestors
     * @param {string} [namespace] The entity Namespace
     * @returns {entity.Key}
     * @link https://sebelga.gitbooks.io/gstore-node/content/model/key.html
     */
    key(
        id: string | number,
        ancestors?: Array<string | number>,
        namespace?: string
    ): entity.Key;

    /**
     * Sanitize the data. It will remove all the properties marked as "write: false" and convert "null" (string) to Null.
     *
     * @param {*} data The data to sanitize
     * @returns {*} The data sanitized
     * @link https://sebelga.gitbooks.io/gstore-node/content/model/sanitize.html
     */
    sanitize(data: { [propName: string]: any }): { [P in keyof T]: T[P] };

    /**
     * Clear all the Queries from the cache *linked* to the Model Entity Kind. You can also pass one or several keys to delete from the cache.
     * You normally don't have to call this method as gstore-node does it for you automatically each time you add/edit or delete an entity.
     *
     * @static
     * @param {(entity.Key | entity.Key[])} [keys] Optional entity Keys to remove from the cache with the Queries
     * @returns {Promise<void>}
     * @link https://sebelga.gitbooks.io/gstore-node/content/model/clearcache.html
     */
    clearCache(keys?: entity.Key | entity.Key[]): Promise<void>;

    /**
     * Initialize a Datastore Query for the Model's entity Kind
     *
     * @static
     * @param {string} [namespace] Optional namespace for the Query
     * @param {Transaction} [transaction] Optional Transaction to run the query into
     * @returns {GoogleDatastoreQuery} A Datastore Query instance
     * @link https://sebelga.gitbooks.io/gstore-node/content/queries/google-cloud-queries.html
     */
    query(namespace?: string, transaction?: Transaction): Query<T>;

    /**
     * Shortcut for listing entities from a Model. List queries are meant to quickly list entities with predefined settings without having to create Query instances.
     *
     * @static
     * @param {QueryListOptions} [options]
     * @returns {Promise<any>}
     * @link https://sebelga.gitbooks.io/gstore-node/content/queries/list.html
     */
    list<U extends QueryListOptions>(
        options?: U
    ): PromiseWithPopulate<QueryResult<T, U>>;

    /**
 * Quickly find an entity by passing key/value pairs.
 *
 * @static
 * @param {{ [propName: string]: any }} keyValues Key / Values pairs
 * @param {(Array<string | number>)} [ancestors] Optional Ancestors to add to the Query
 * @param {string} [namespace] Optional Namespace to run the Query into
 * @param {({cache?: boolean; ttl?: number | { [propName: string]: number }})} [options] Additional configuration
 * @example
 ```
    UserModel.findOne({ email: 'john[at]snow.com' }).then(...);
    ```
    * @returns {Promise<any>}
    * @link https://sebelga.gitbooks.io/gstore-node/content/queries/findone.html
    */
    findOne(
        keyValues: { [propName: string]: any },
        ancestors?: Array<string | number>,
        namespace?: string,
        options?: {
            cache?: boolean;
            ttl?: number | { [propName: string]: number };
        }
    ): PromiseWithPopulate<Entity<T>>;

    /**
     * Delete all the entities of a Model. It queries the entitites by batches of 500 (maximum set by the Datastore) and delete them. It then repeat the operation until no more entities are found.
     *
     * @static
     * @param {(Array<string | number>)} [ancestors] Optional Ancestors to add to the Query
     * @param {string} [namespace] Optional Namespace to run the Query into
     * @returns {Promise<{ success: boolean; message: 'string' }>}
     * @link https://sebelga.gitbooks.io/gstore-node/content/queries/deleteall.html
     */
    deleteAll(
        ancestors?: Array<string | number>,
        namespace?: string
    ): Promise<{ success: boolean; message: "string" }>;

    /**
 * Find entities before or after an entity based on a property and a value.
 *
 * @static
 * @param {string} propName The property to look around
 * @param {*} value The property value
 * @param {({ before: number, readAll?:boolean, format?: 'JSON' | 'ENTITY', showKey?: boolean } | { after: number, readAll?:boolean, format?: 'JSON' | 'ENTITY', showKey?: boolean } & QueryOptions)} options Additional configuration
 * @returns {Promise<any>}
 * @example
 ```
    // Find the next 20 post after March 1st 2018
    BlogPost.findAround('publishedOn', '2018-03-01', { after: 20 })
    ```
    * @link https://sebelga.gitbooks.io/gstore-node/content/queries/findaround.html
    */
    findAround<U extends QueryFindAroundOptions>(
        propName: string,
        value: any,
        options: U
    ): PromiseWithPopulate<{
        entities: U["format"] extends EntityFormatType
            ? Array<Entity<T>>
            : Array<T>;
    }>;
}

declare class EntityKlass<T> {
    /**
     * gstore-node instance
     *
     * @type {Gstore}
     */
    gstore: Gstore;

    /**
     * The Entity Model Schema
     *
     * @type {Schema}
     */
    schema: Schema;

    /**
     * The Entity Datastore Entity Kind
     *
     * @type {string}
     */
    entityKind: string;

    /**
     * The entity KEY
     *
     * @type {entity.Key}
     */
    entityKey: entity.Key;

    /**
     * The entity data
     *
     * @type {*}
     */
    entityData: { [P in keyof T]: T[P] };

    /**
     * The entity Key id name or number
     *
     * @type {(number | string)}
     */
    id: number | string;

    /**
     * Entity context object to store custom data
     *
     * @type {*}
     */
    context: any;

    /**
     * Save the entity in the Datastore
     *
     * @param {Transaction} [transaction] The current Transaction (if any)
     * @param {({ method?: 'upsert' | 'insert' | 'update' })} [options] Additional configuration
     * @returns {Promise<any>}
     * @link https://sebelga.gitbooks.io/gstore-node/content/entity/methods/save.html
     */
    save(
        transaction?: Transaction,
        options?: {
            /**
             * The saving method. "upsert" will update the entity *or* create it if it does not exist. "insert" will only save the entity if it *does not* exist. "update" will only save the entity if it *does* exist.
             *
             * @type {('upsert' | 'insert' | 'update')}
             * @default 'upsert'
             */
            method?: "upsert" | "insert" | "update";
        }
    ): Promise<Entity<T>>;

    /**
     * Return the entity data object with the entity id.  The properties on the Schema where "read" has been set to "false" won't be included unless you set "readAll" to "true" in the options.
     *
     * @param {{ readAll?: boolean, virtuals?: boolean, showKey?: boolean }} options Additional configuration
     * @returns {*}
     * @link https://sebelga.gitbooks.io/gstore-node/content/entity/methods/plain.html
     */
    plain(options?: {
        /**
         * Output all the entity data properties, regardless of the Schema "read" setting
         *
         * @type {boolean}
         * @default false
         */
        readAll?: boolean;
        /**
         * Add the virtual properties defined on the Schema
         *
         * @type {boolean}
         * @default false
         */
        virtuals?: boolean;
        /**
         * Add the full entity KEY object in a "__key" property
         *
         * @type {boolean}
         * @default false
         */
        showKey?: boolean;
    }): T & { [propName: string]: any };

    /**
 * Access a Model from an entity
 *
 * @param {string} entityKind The entity Kind
 * @returns {Model} The Model
 * @example
 ```
    const user = new User({ name: 'john', pictId: 123});
    const ImageModel = user.model('Image');
    ImageModel.get(user.pictId).then(...);
    ```
    * @link https://sebelga.gitbooks.io/gstore-node/content/entity/methods/model.html
    */
    model<T = { [propName: string]: any }>(entityKind: string): Model<T>;

    /**
     * Fetch the entity data from the Datastore and merge it in the entity.
     *
     * @returns {Promise<any>}
     */
    datastoreEntity(): Promise<Entity<T>>;

    /**
     * Validate the entity data. It returns an object with "error" and "value" properties.  If the error is null, it is valid. The value returned is the entityData sanitized (unknown properties removed).
     *
     * @returns {({ error: ValidationError, value: any } | Promise<any>)}
     */
    validate(): Validation | Promise<any>;

    /**
     * Populate entity references (whose properties are an entity Key) and merge them on the entity
     *
     * @param refs The entity references to fetch from the Datastore. Can be one or multiple (Array)
     * @param properties The properties to return from the reference entities. If not specified, all properties will be returned
     */
    populate<U extends string | string[]>(
        refs?: U,
        properties?: U extends Array<string> ? undefined : string | string[]
    ): PromiseWithPopulate<EntityKlass<T>>;
}

export const instances: InstancesManager;

// -----------------------------------------------------------------------
// -- INTERFACES
// -----------------------------------------------------------------------

type EntityFormatType = "ENTITY";
type JSONFormatType = "JSON";

export type Entity<T = { [propName: string]: any }> = EntityKlass<T> & T;

type funcReturningPromise = (...args: any[]) => Promise<any>;
interface PromiseWithPopulate<T> extends Promise<T> {
    populate: <U extends string | string[]>(
        refs?: U,
        properties?: U extends Array<string> ? undefined : string | string[]
    ) => PromiseWithPopulate<T>;
}

interface InstancesManager {
  set(id: string, instance: Gstore): void
  get(id: string): Gstore
}

export interface QueryResult<T, U extends QueryOptions> {
    entities: U["format"] extends EntityFormatType
        ? Array<Entity<T>>
        : Array<T & { id: string | number }>;
    nextPageCursor?: string;
}

export type DeleteResult = { key: entity.Key; success?: boolean; apiResponse?: any };

export type PropType =
    | "string"
    | "int"
    | "double"
    | "boolean"
    | "datetime"
    | "array"
    | "object"
    | "geoPoint"
    | "buffer"
    | "entityKey"
    | NumberConstructor
    | StringConstructor
    | ObjectConstructor
    | ArrayConstructor
    | BooleanConstructor
    | DateConstructor
    | typeof Buffer;

/**
 * gstore-node instance configuration
 *
 * @interface GstoreConfig
 */
export interface GstoreConfig {
    namespace?: string;
    cache?: Boolean | CacheConfig;
    /**
 * If set to "true" (defaut), when fetching an entity by key and the entity is not found in the Datastore,
     gstore will throw a "ERR_ENTITY_NOT_FOUND" error. If set to "false", "null" will be returned.
    */
    errorOnEntityNotFound?: Boolean;
}

/**
 * Cache configuration
 * All the properties are optional.
 *
 * @interface CacheConfig
 */
export interface CacheConfig {
    stores?: Array<any>;
    config?: CacheConfigOptions;
}

export interface CacheConfigOptions {
    ttl: {
        keys: number;
        queries: number;
        memory?: {
            keys: number;
            queries: number;
        };
        redis?: {
            keys: number;
            queries: number;
        };
        [key: string]:
            | {
                  keys: number;
                  queries: number;
              }
            | number
            | void;
    };
    cachePrefix?: {
        keys: string;
        queries: string;
    };
    global?: boolean;
}

export interface SchemaPathDefinition {
    type?: PropType;
    validate?:
        | string
        | { rule: string | ((...args: any[]) => boolean); args: any[] };
    optional?: boolean;
    default?: any;
    excludeFromIndexes?: boolean | string | string[];
    read?: boolean;
    excludeFromRead?: string[];
    write?: boolean;
    required?: boolean;
    joi?: any;
    ref?: string;
}

export interface SchemaOptions {
    validateBeforeSave?: boolean;
    explicitOnly?: boolean;
    queries?: {
        readAll?: boolean;
        format?: JSONFormatType | EntityFormatType;
        showKey?: string;
    };
    keyType?: "id" | "name" | "auto";
    joi?: boolean | { extra?: any; options?: any };
}

export interface QueryOptions {
    /**
     * Specify either strong or eventual. If not specified, default values are chosen by Datastore for the operation. Learn more about strong and eventual consistency in the link below
     *
     * @type {('strong' | 'eventual')}
     * @link https://cloud.google.com/datastore/docs/articles/balancing-strong-and-eventual-consistency-with-google-cloud-datastore
     */
    consistency?: "strong" | "eventual";
    /**
     * If set to true will return all the properties of the entity, regardless of the *read* parameter defined in the Schema
     *
     * @type {boolean}
     * @default false
     */
    readAll?: boolean;
    /**
     * Response format for the entities. Either plain object or entity instances
     *
     * @type {string}
     * @default 'JSON'
     */
    format?: JSONFormatType | EntityFormatType;
    /**
     * Add a "__key" property to the entity data with the complete Key from the Datastore.
     *
     * @type {boolean}
     * @default false
     */
    showKey?: boolean;
    /**
     * If set to true, it will read from the cache and prime the cache with the response of the query.
     *
     * @type {boolean}
     * @default The "global" cache configuration.
     */
    cache?: boolean;
    /**
     * Custom TTL value for the cache. For multi-store it can be an object of ttl values
     *
     * @type {(number | { [propName: string]: number })}
     * @default The cache.ttl.queries value
     */
    ttl?: number | { [propName: string]: number };
}

export interface QueryListOptions extends QueryOptions {
    /**
     * Optional namespace for the Query
     *
     * @type {string}
     */
    namespace?: string;
    /**
     * @type {number}
     */
    limit?: number;
    /**
     * Descending is optional and default to "false"
     *
     * @example ```{ property: 'userName', descending: true }```
     * @type {({ property: 'string', descending?: boolean } | { property: 'string', descending?: boolean }[])}
     */
    order?:
        | { property: string; descending?: boolean }
        | { property: string; descending?: boolean }[];
    /**
     * @type {(string | string[])}
     */
    select?: string | string[];
    /**
     * @type {([string, any] | [string, string, any] | (any)[][])}
     */
    filters?: [string, any] | [string, Operator, any] | (any)[][];
    /**
     * @type {Array<any>}
     */
    ancestors?: Array<string | number>;
    /**
     * @type {string}
     */
    start?: string;
    /**
     * @type {number}
     */
    offset?: number;
}

export interface QueryFindAroundOptions extends QueryOptions {
    before?: number;
    after?: number;
    readAll?: boolean;
    format?: JSONFormatType | EntityFormatType;
    showKey?: boolean;
}

export interface Validation<T = any> {
    error: ValidationError;
    value: T;
}

declare class GstoreError extends Error {
    name: string;
    message: string;
    stack: string;
    code: keyof ErrorCodes;
}

declare class ValidationError extends GstoreError {}

declare class TypeError extends GstoreError {}

declare class ValueError extends GstoreError {}

interface ErrorCodes {
    ERR_ENTITY_NOT_FOUND: "ERR_ENTITY_NOT_FOUND";
    ERR_GENERIC: "ERR_GENERIC";
    ERR_VALIDATION: "ERR_VALIDATION";
    ERR_PROP_TYPE: "ERR_PROP_TYPE";
    ERR_PROP_VALUE: "ERR_PROP_VALUE";
    ERR_PROP_NOT_ALLOWED: "ERR_PROP_NOT_ALLOWED";
    ERR_PROP_REQUIRED: "ERR_PROP_REQUIRED";
    ERR_PROP_IN_RANGE: "ERR_PROP_IN_RANGE";
}

type FunctionPropertiesNames<T> = {
    [K in keyof T]: T[K] extends Function ? K : never
}[keyof T];
type FunctionProperties<T> = Pick<T, FunctionPropertiesNames<T>>;

interface GoogleDatastoreQueryMethods<T> {
    filter(property: string, operator: Operator, value: any): Query<T>;
    filter(property: string, value: any): Query<T>;

    hasAncestor(key: entity.Key): Query<T>;

    order(property: string, options?: { descending: boolean }): Query<T>;

    groupBy(properties: string | ReadonlyArray<string>): Query<T>;

    select(properties: string | ReadonlyArray<string>): Query<T>;

    start(cursorToken: string): Query<T>;

    end(cursorToken: string): Query<T>;

    limit(n: number): Query<T>;

    offset(n: number): Query<T>;

    runStream(): NodeJS.ReadableStream;
}

export interface Query<T> extends GoogleDatastoreQueryMethods<T> {
    run<U extends QueryOptions>(
        options?: U
    ): PromiseWithPopulate<QueryResult<T, U>>;
}

interface DataLoader {}

declare namespace GstoreCache {
    /**
     * gstore-cache Instance
     *
     * @class Cache
     */
    class Cache {
        keys: {
            read(
                keys: entity.Key | entity.Key[],
                options?: { ttl: number | { [propName: string]: number } },
                fetchHandler?: (keys: entity.Key | entity.Key[]) => Promise<any>
            ): Promise<any>;
            get(key: entity.Key): Promise<any>;
            mget(...keys: entity.Key[]): Promise<any>;
            set(
                key: entity.Key,
                data: any,
                options?: { ttl: number | { [propName: string]: number } }
            ): Promise<any>;
            mset(...args: any[]): Promise<any>;
            del(...keys: entity.Key[]): Promise<any>;
        };

        queries: {
            read(
                query: GoogleDatastoreQuery,
                options?: { ttl: number | { [propName: string]: number } },
                fetchHandler?: (query: GoogleDatastoreQuery) => Promise<any>
            ): Promise<any>;
            get(query: GoogleDatastoreQuery): Promise<any>;
            mget(...queries: GoogleDatastoreQuery[]): Promise<any>;
            set(
                query: GoogleDatastoreQuery,
                data: any,
                options?: { ttl: number | { [propName: string]: number } }
            ): Promise<any>;
            mset(...args: any[]): Promise<any>;
            kset(
                key: string,
                data: any,
                entityKinds: string | string[],
                options?: { ttl: number }
            ): Promise<any>;
            clearQueriesByKind(entityKinds: string | string[]): Promise<any>;
            del(...queries: GoogleDatastoreQuery[]): Promise<any>;
        };

        /**
         * Retrieve an element from the cache
         *
         * @param {string} key The cache key
         */
        get(key: string): Promise<any>;

        /**
         * Retrieve multiple elements from the cache
         *
         * @param {...string[]} keys Unlimited number of keys
         */
        mget(...keys: string[]): Promise<any[]>;

        /**
         * Add an element to the cache
         *
         * @param {string} key The cache key
         * @param {*} value The data to save in the cache
         */
        set(key: string, value: any): Promise<any>;

        /**
         * Add multiple elements into the cache
         *
         * @param {...any[]} args Key Value pairs (key1, data1, key2, data2...)
         */
        mset(...args: any[]): Promise<any>;

        /**
         * Remove one or multiple elements from the cache
         *
         * @param {string[]} keys The keys to remove
         */
        del(keys: string[]): Promise<any>;

        /**
         * Clear the cache
         */
        reset(): Promise<void>;
    }
}
