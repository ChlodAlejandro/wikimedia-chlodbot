interface CacheObject {
    stored: Date;
    lastAccessed: Date;

    content: any;
}

/**
 * Quick and easy caching class.
 */
export default class ZoomiebotCache {

    /**
     * Local cache map.
     */
    private map: Map<string, CacheObject> = new Map();

    /**
     * Check if the cache contains a given key.
     *
     * @param key The key of the object
     */
    has(key: string): boolean {
        return this.map.has(key);
    }

    /**
     * Get an object from the cache. This automatically updates the object's
     * `lastAccessed` value.
     *
     * @param key The key of the object
     * @return The object, if cached. `null` if the key does not have an object.
     */
    get<T>(key: string): T|null {
        const cacheObject = this.map.get(key);

        if (cacheObject == null) {
            return null;
        }

        // This is a pointer access, since `cacheObject` is an object.
        cacheObject.lastAccessed = new Date();

        return cacheObject.content;
    }

    /**
     * Puts an object in the cache.
     *
     * @param key The key of the object
     * @param value The value of the object
     */
    put<T>(key: string, value: T): void {
        this.map.set(key, {
            stored: new Date(),
            lastAccessed: new Date(),
            content: value
        });
    }

    /**
     * Deletes an object from the cache.
     *
     * @param key
     */
    delete(key: string): void {
        this.map.delete(key);
    }

    /**
     * Flushes (clears) the entire cache.
     */
    flush(): void {
        this.map.clear();
    }

    /**
     * Prunes cache objects based on a given condition.
     *
     * @param willPrune A callback that checks if an object should be pruned.
     */
    prune(willPrune: (object: CacheObject) => boolean): number {
        let pruned = 0;
        this.map.forEach((value, key) => {
            if (willPrune(value)) {
                this.map.delete(key);
                pruned++;
            }
        });
        return pruned;
    }

    /**
     * Prunes cache objects
     * @param age The minimum age of objects to prune in milliseconds
     */
    pruneOld(age: number): number {
        const baseTime = Date.now();
        return this.prune(
            (v) => baseTime - v.lastAccessed.getTime() > age
        );
    }

}
